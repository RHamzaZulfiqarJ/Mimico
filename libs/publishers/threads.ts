const THREADS_API_BASE = "https://graph.threads.net/v1.0";
const THREADS_AUTH_BASE = "https://graph.threads.net";

async function parseThreadsResponse(res: Response) {
    const text = await res.text();

    let data: any = null;

    try {
        data = text ? JSON.parse(text) : null;
    } catch {
        data = text;
    }

    if (!res.ok) {
        const message = data?.error?.message || data?.message || text || "Threads API request failed";

        throw new Error(message);
    }

    return data;
}

export function isThreadsTokenExpiring(expiresAt: Date | null) {
    if (!expiresAt) return true;
    return Date.now() + 1000 * 60 * 60 * 24 * 7 >= new Date(expiresAt).getTime();
}

export async function exchangeThreadsLongLivedToken(shortToken: string) {
    const url = new URL(`${THREADS_AUTH_BASE}/access_token`);

    url.searchParams.set("grant_type", "th_exchange_token");
    url.searchParams.set("client_secret", process.env.THREADS_CLIENT_SECRET!);
    url.searchParams.set("access_token", shortToken);

    const res = await fetch(url.toString(), {
        method: "GET",
    });

    const data = await parseThreadsResponse(res);

    return {
        accessToken: data.access_token as string,
        expiresAt: new Date(Date.now() + Number(data.expires_in) * 1000),
    };
}

export async function refreshThreadsToken(accessToken: string) {
    const url = new URL(`${THREADS_AUTH_BASE}/refresh_access_token`);

    url.searchParams.set("grant_type", "th_refresh_token");
    url.searchParams.set("access_token", accessToken);

    const res = await fetch(url.toString(), {
        method: "GET",
    });

    const data = await parseThreadsResponse(res);

    return {
        accessToken: data.access_token as string,
        expiresAt: new Date(Date.now() + Number(data.expires_in) * 1000),
    };
}

export async function getThreadsProfile(accessToken: string) {
    const url = new URL(`${THREADS_API_BASE}/me`);

    url.searchParams.set("fields", "id,username,name");
    url.searchParams.set("access_token", accessToken);

    const res = await fetch(url.toString(), {
        method: "GET",
    });

    return parseThreadsResponse(res);
}

export async function publishThreadsPost(input: { accessToken: string; content: string }) {
    const createRes = await fetch(`${THREADS_API_BASE}/me/threads`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${input.accessToken}`,
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
            media_type: "TEXT",
            text: input.content,
        }),
    });

    const container = await parseThreadsResponse(createRes);

    const publishRes = await fetch(`${THREADS_API_BASE}/me/threads_publish`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${input.accessToken}`,
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
            creation_id: container.id,
        }),
    });

    return parseThreadsResponse(publishRes);
}
