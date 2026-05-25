export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(req: Request) {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
        return NextResponse.redirect(new URL("/login", req.url));
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    const clientId = process.env.THREADS_CLIENT_ID;

    if (!appUrl || !clientId) {
        return NextResponse.redirect(new URL("/threads?error=threads_config", req.url));
    }

    const state = crypto.randomUUID();
    const redirectUri = `${appUrl}/api/auth/oauth/threads/callback`;

    const authUrl = new URL("https://threads.net/oauth/authorize");

    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("scope", "threads_basic,threads_content_publish");
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("state", state);

    const response = NextResponse.redirect(authUrl.toString());

    response.cookies.set("threads_oauth_state", state, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 10,
    });

    return response;
}
