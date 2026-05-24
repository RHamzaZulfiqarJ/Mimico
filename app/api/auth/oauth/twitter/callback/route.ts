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
        const state = searchParams.get("state");
        const error = searchParams.get("error");

        if (error) {
            return NextResponse.redirect(`${appUrl}/twitter?error=${encodeURIComponent(error)}`);
        }

        if (!code) {
            return NextResponse.redirect(`${appUrl}/twitter?error=missing_code`);
        }

        const cookieStore = await cookies();
        const codeVerifier = cookieStore.get("twitter_oauth_verifier")?.value;
        const storedState = cookieStore.get("twitter_oauth_state")?.value;
        const token = cookieStore.get("token")?.value;

        if (!token) {
            return NextResponse.redirect(`${appUrl}/login`);
        }

        if (!codeVerifier) {
            return NextResponse.redirect(`${appUrl}/twitter?error=missing_code_verifier`);
        }

        if (!storedState || storedState !== state) {
            return NextResponse.redirect(`${appUrl}/twitter?error=invalid_state`);
        }

        const payload = verifyToken(token);

        const basicAuth = Buffer.from(`${process.env.TWITTER_CLIENT_ID}:${process.env.TWITTER_CLIENT_SECRET}`).toString(
            "base64",
        );

        const tokenRes = await fetch("https://api.x.com/2/oauth2/token", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                Authorization: `Basic ${basicAuth}`,
            },
            body: new URLSearchParams({
                code,
                grant_type: "authorization_code",
                redirect_uri: `${appUrl}/api/auth/oauth/twitter/callback`,
                code_verifier: codeVerifier,
            }),
        });

        const tokenData = await tokenRes.json();

        if (!tokenRes.ok) {
            console.error("TWITTER TOKEN ERROR:", tokenData);
            return NextResponse.redirect(`${appUrl}/twitter?error=token_exchange_failed`);
        }

        const profileRes = await fetch("https://api.x.com/2/users/me", {
            headers: {
                Authorization: `Bearer ${tokenData.access_token}`,
            },
        });

        const profileData = await profileRes.json();

        if (!profileRes.ok) {
            console.error("TWITTER PROFILE ERROR:", profileData);
            return NextResponse.redirect(`${appUrl}/twitter?error=profile_fetch_failed`);
        }

        const twitterUser = profileData.data;

        await prisma.socialAccount.upsert({
            where: {
                platform_accountId: {
                    platform: "twitter",
                    accountId: twitterUser.id,
                },
            },
            update: {
                accountUsername: twitterUser.username,
                accessToken: tokenData.access_token,
                refreshToken: tokenData.refresh_token,
                expiresAt: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000) : null,
                userId: payload.id,
            },
            create: {
                platform: "twitter",
                accountId: twitterUser.id,
                accountUsername: twitterUser.username,
                accessToken: tokenData.access_token,
                refreshToken: tokenData.refresh_token,
                expiresAt: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000) : null,
                userId: payload.id,
            },
        });

        const response = NextResponse.redirect(`${appUrl}/twitter?connected=true`);

        response.cookies.delete("twitter_oauth_verifier");
        response.cookies.delete("twitter_oauth_state");

        return response;
    } catch (error) {
        console.error("TWITTER CALLBACK ERROR:", error);
        return NextResponse.redirect(`${appUrl}/twitter?error=twitter_callback_failed`);
    }
}
