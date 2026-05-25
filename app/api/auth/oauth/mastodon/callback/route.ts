export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/libs/prisma";
import { verifyToken } from "@/libs/jwt";

export async function GET(req: Request) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;

  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");

    if (!code) {
      return NextResponse.redirect(`${appUrl}/mastodon?error=missing_code`);
    }

    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      return NextResponse.redirect(`${appUrl}/login`);
    }

    const payload = verifyToken(token);
    const instance = process.env.MASTODON_INSTANCE;

    if (!instance) {
      return NextResponse.redirect(`${appUrl}/mastodon?error=missing_instance`);
    }

    const tokenRes = await fetch(`${instance}/oauth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: process.env.MASTODON_CLIENT_ID!,
        client_secret: process.env.MASTODON_CLIENT_SECRET!,
        redirect_uri: `${appUrl}/api/auth/oauth/mastodon/callback`,
        grant_type: "authorization_code",
        code,
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok) {
      console.error("MASTODON TOKEN ERROR:", tokenData);
      return NextResponse.redirect(`${appUrl}/mastodon?error=token_exchange_failed`);
    }

    const accessToken = tokenData.access_token;

    const profileRes = await fetch(`${instance}/api/v1/accounts/verify_credentials`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const profile = await profileRes.json();

    if (!profileRes.ok) {
      console.error("MASTODON PROFILE ERROR:", profile);
      return NextResponse.redirect(`${appUrl}/mastodon?error=profile_fetch_failed`);
    }

    const existing = await prisma.socialAccount.findUnique({
      where: {
        platform_accountId: {
          platform: "mastodon",
          accountId: profile.id,
        },
      },
    });

    if (existing && existing.userId !== payload.id) {
      return NextResponse.redirect(`${appUrl}/mastodon?error=account_in_use`);
    }

    if (existing) {
      await prisma.socialAccount.update({
        where: { id: existing.id },
        data: {
          accountUsername: profile.username,
          accessToken,
          instanceUrl: instance,
        },
      });
    } else {
      await prisma.socialAccount.create({
        data: {
          platform: "mastodon",
          accountId: profile.id,
          accountUsername: profile.username,
          accessToken,
          instanceUrl: instance,
          userId: payload.id,
        },
      });
    }

    return NextResponse.redirect(`${appUrl}/mastodon?connected=true`);
  } catch (error) {
    console.error("MASTODON CALLBACK ERROR:", error);
    return NextResponse.redirect(`${appUrl}/mastodon?error=mastodon_callback_failed`);
  }
}