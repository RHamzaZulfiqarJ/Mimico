async function parseTwitterResponse(res: Response) {
    const text = await res.text();

    let data: any = null;

    try {
        data = text ? JSON.parse(text) : null;
    } catch {
        data = text;
    }

    if (!res.ok) {
        const message =
            data?.error_description ||
            data?.error ||
            data?.detail ||
            data?.message ||
            text ||
            "Twitter token refresh failed";

        throw new Error(message);
    }

    return data;
}

export async function refreshTwitterToken(refreshToken: string) {
    const clientId = process.env.TWITTER_CLIENT_ID;
    const clientSecret = process.env.TWITTER_CLIENT_SECRET;

    if (!clientId) {
        throw new Error("Twitter client ID is missing");
    }

    const body = new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
    });

    const headers: Record<string, string> = {
        "Content-Type": "application/x-www-form-urlencoded",
    };

    if (clientSecret) {
        headers.Authorization = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;
    } else {
        body.set("client_id", clientId);
    }

    const res = await fetch("https://api.x.com/2/oauth2/token", {
        method: "POST",
        headers,
        body,
    });

    return parseTwitterResponse(res);
}

export function isTokenExpired(expiresAt: Date | null) {
    if (!expiresAt) return true;
    return new Date() >= new Date(expiresAt);
}