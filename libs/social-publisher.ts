import { prisma } from "@/libs/prisma";

type PublishAccount = {
    id: string;
    platform: string;
    accessToken: string;
    refreshToken: string | null;
    expiresAt: Date | null;
    instanceUrl: string | null;
};

const readApiError = async (res: Response) => {
    const text = await res.text();

    try {
        const json = JSON.parse(text);
        return json.error_description || json.detail || json.error || JSON.stringify(json);
    } catch {
        return text || "Request failed";
    }
};

const refreshTwitterAccessToken = async (account: PublishAccount) => {
    if (!account.refreshToken) {
        throw new Error("Twitter token expired. Reconnect this Twitter account.");
    }

    const basicAuth = Buffer.from(`${process.env.TWITTER_CLIENT_ID}:${process.env.TWITTER_CLIENT_SECRET}`).toString(
        "base64",
    );

    const res = await fetch("https://api.x.com/2/oauth2/token", {
        method: "POST",
        headers: {
            Authorization: `Basic ${basicAuth}`,
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
            grant_type: "refresh_token",
            refresh_token: account.refreshToken,
        }),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
        throw new Error(data?.error_description || data?.error || "Failed to refresh Twitter token");
    }

    await prisma.socialAccount.update({
        where: { id: account.id },
        data: {
            accessToken: data.access_token,
            refreshToken: data.refresh_token || account.refreshToken,
            expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : account.expiresAt,
        },
    });

    return data.access_token as string;
};

const getTwitterAccessToken = async (account: PublishAccount) => {
    if (!account.expiresAt) {
        return account.accessToken;
    }

    if (new Date(account.expiresAt).getTime() > Date.now() + 60_000) {
        return account.accessToken;
    }

    return refreshTwitterAccessToken(account);
};

const publishToTwitter = async (account: PublishAccount, content: string) => {
    const accessToken = await getTwitterAccessToken(account);

    const res = await fetch("https://api.x.com/2/tweets", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            text: content,
        }),
    });

    if (!res.ok) {
        throw new Error(await readApiError(res));
    }

    return res.json();
};

const publishToMastodon = async (account: PublishAccount, content: string) => {
    if (!account.instanceUrl) {
        throw new Error("Mastodon instance URL is missing");
    }

    const res = await fetch(`${account.instanceUrl}/api/v1/statuses`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${account.accessToken}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            status: content,
        }),
    });

    if (!res.ok) {
        throw new Error(await readApiError(res));
    }

    return res.json();
};

export const publishSocialPost = async (account: PublishAccount, content: string) => {
    if (account.platform === "twitter") {
        return publishToTwitter(account, content);
    }

    if (account.platform === "mastodon") {
        return publishToMastodon(account, content);
    }

    throw new Error("Unsupported platform");
};
