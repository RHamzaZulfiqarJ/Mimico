export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/libs/prisma";
import { verifyToken } from "@/libs/jwt";

async function parseResponse(res: Response) {
    const text = await res.text();

    let data: any = null;

    try {
        data = text ? JSON.parse(text) : null;
    } catch {
        data = text;
    }

    if (!res.ok) {
        const message =
            data?.error_description || data?.error || data?.detail || data?.message || text || "Twitter request failed";

        throw new Error(message);
    }

    return data;
}

function redirectTo(appUrl: string, path: string) {
    return NextResponse.redirect(`${appUrl}${path}`);
}

export async function GET(req: Request) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;

    try {
        const { searchParams } = new URL(req.url);
        const code = searchParams.get("code");
        const state = searchParams.get("state");
        const error = searchParams.get("error");

        if (error) {
            return redirectTo(appUrl, `/twitter?error=${encodeURIComponent(error)}`);
        }

        if (!code || !state) {
            return redirectTo(appUrl, "/twitter?error=missing_code");
        }

        const cookieStore = await cookies();
        const codeVerifier = cookieStore.get("twitter_oauth_verifier")?.value;
        const storedState = cookieStore.get("twitter_oauth_state")?.value;
        const token = cookieStore.get("token")?.value;

        if (!token) {
            return redirectTo(appUrl, "/login");
        }

        if (!codeVerifier) {
            return redirectTo(appUrl, "/twitter?error=missing_code_verifier");
        }

        if (!storedState || storedState !== state) {
            return redirectTo(appUrl, "/twitter?error=invalid_state");
        }

        const clientId = process.env.TWITTER_CLIENT_ID;
        const clientSecret = process.env.TWITTER_CLIENT_SECRET;

        if (!clientId) {
            return redirectTo(appUrl, "/twitter?error=twitter_config");
        }

        const payload = verifyToken(token);

        const body = new URLSearchParams({
            code,
            grant_type: "authorization_code",
            redirect_uri: `${appUrl}/api/auth/oauth/twitter/callback`,
            code_verifier: codeVerifier,
        });

        const headers: Record<string, string> = {
            "Content-Type": "application/x-www-form-urlencoded",
        };

        if (clientSecret) {
            headers.Authorization = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;
        } else {
            body.set("client_id", clientId);
        }

        const tokenRes = await fetch("https://api.x.com/2/oauth2/token", {
            method: "POST",
            headers,
            body,
        });

        const tokenData = await parseResponse(tokenRes);

        const profileRes = await fetch("https://api.x.com/2/users/me", {
            headers: {
                Authorization: `Bearer ${tokenData.access_token}`,
            },
        });

        const profileData = await parseResponse(profileRes);
        const twitterUser = profileData.data;

        if (!twitterUser?.id || !twitterUser?.username) {
            return redirectTo(appUrl, "/twitter?error=profile_fetch_failed");
        }

        const existing = await prisma.socialAccount.findUnique({
            where: {
                platform_accountId: {
                    platform: "twitter",
                    accountId: twitterUser.id,
                },
            },
        });

        if (existing && existing.userId !== payload.id) {
            return redirectTo(appUrl, "/twitter?error=account_in_use");
        }

        if (existing) {
            await prisma.socialAccount.update({
                where: { id: existing.id },
                data: {
                    accountUsername: twitterUser.username,
                    accessToken: tokenData.access_token,
                    refreshToken: tokenData.refresh_token || existing.refreshToken,
                    expiresAt: tokenData.expires_in
                        ? new Date(Date.now() + Number(tokenData.expires_in) * 1000)
                        : existing.expiresAt,
                },
            });
        } else {
            await prisma.socialAccount.create({
                data: {
                    platform: "twitter",
                    accountId: twitterUser.id,
                    accountUsername: twitterUser.username,
                    accessToken: tokenData.access_token,
                    refreshToken: tokenData.refresh_token || null,
                    expiresAt: tokenData.expires_in ? new Date(Date.now() + Number(tokenData.expires_in) * 1000) : null,
                    userId: payload.id,
                },
            });
        }

        const response = NextResponse.redirect(`${appUrl}/twitter?connected=true`);

        response.cookies.delete("twitter_oauth_verifier");
        response.cookies.delete("twitter_oauth_state");

        return response;
    } catch (error) {
        console.error("TWITTER CALLBACK ERROR:", error);
        return redirectTo(appUrl, "/twitter?error=twitter_callback_failed");
    }
}
