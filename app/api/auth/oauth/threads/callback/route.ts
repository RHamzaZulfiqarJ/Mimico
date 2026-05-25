export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/libs/prisma";
import { verifyToken } from "@/libs/jwt";
import { exchangeThreadsLongLivedToken, getThreadsProfile } from "@/libs/publishers/threads";

async function parseResponse(res: Response) {
    const text = await res.text();

    let data: any = null;

    try {
        data = text ? JSON.parse(text) : null;
    } catch {
        data = text;
    }

    if (!res.ok) {
        const message = data?.error_message || data?.error?.message || data?.message || text || "Threads OAuth failed";

        throw new Error(message);
    }

    return data;
}

function redirectWithError(req: Request, error: string) {
    return NextResponse.redirect(new URL(`/threads?error=${error}`, req.url));
}

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const code = searchParams.get("code");
        const state = searchParams.get("state");

        if (!code || !state) {
            return redirectWithError(req, "threads_missing_code");
        }

        const cookieStore = await cookies();
        const savedState = cookieStore.get("threads_oauth_state")?.value;
        const token = cookieStore.get("token")?.value;

        if (!token) {
            return NextResponse.redirect(new URL("/login", req.url));
        }

        if (!savedState || savedState !== state) {
            return redirectWithError(req, "threads_state_mismatch");
        }

        const payload = verifyToken(token);
        const appUrl = process.env.NEXT_PUBLIC_APP_URL;
        const clientId = process.env.THREADS_CLIENT_ID;
        const clientSecret = process.env.THREADS_CLIENT_SECRET;

        if (!appUrl || !clientId || !clientSecret) {
            return redirectWithError(req, "threads_config");
        }

        const redirectUri = `${appUrl}/api/auth/oauth/threads/callback`;

        const tokenRes = await fetch("https://graph.threads.net/oauth/access_token", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
                client_id: clientId,
                client_secret: clientSecret,
                grant_type: "authorization_code",
                redirect_uri: redirectUri,
                code,
            }),
        });

        const shortTokenData = await parseResponse(tokenRes);
        const longToken = await exchangeThreadsLongLivedToken(shortTokenData.access_token);
        const profile = await getThreadsProfile(longToken.accessToken);

        const existing = await prisma.socialAccount.findUnique({
            where: {
                platform_accountId: {
                    platform: "threads",
                    accountId: profile.id,
                },
            },
        });

        if (existing && existing.userId !== payload.id) {
            return redirectWithError(req, "threads_account_in_use");
        }

        if (existing) {
            await prisma.socialAccount.update({
                where: { id: existing.id },
                data: {
                    accountUsername: profile.username || profile.name || existing.accountUsername,
                    accessToken: longToken.accessToken,
                    expiresAt: longToken.expiresAt,
                },
            });
        } else {
            await prisma.socialAccount.create({
                data: {
                    platform: "threads",
                    accountId: profile.id,
                    accountUsername: profile.username || profile.name || "threads_user",
                    accessToken: longToken.accessToken,
                    expiresAt: longToken.expiresAt,
                    userId: payload.id,
                },
            });
        }

        const response = NextResponse.redirect(new URL("/threads?connected=threads", req.url));
        response.cookies.delete("threads_oauth_state");

        return response;
    } catch (err) {
        console.error("THREADS CALLBACK ERROR:", err);
        return redirectWithError(req, "threads_callback");
    }
}
