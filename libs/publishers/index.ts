import type { SocialAccount } from "@prisma/client";
import { prisma } from "@/libs/prisma";
import { refreshTwitterToken, isTokenExpired } from "@/libs/twitter";
import { publishMastodonPost } from "@/libs/publishers/mastodon";
import { isThreadsTokenExpiring, publishThreadsPost, refreshThreadsToken } from "@/libs/publishers/threads";

async function parseApiResponse(res: Response) {
    const text = await res.text();

    let data: any = null;

    try {
        data = text ? JSON.parse(text) : null;
    } catch {
        data = text;
    }

    if (!res.ok) {
        const message = data?.error?.message || data?.detail || data?.title || text || "Publishing failed";

        throw new Error(message);
    }

    return data;
}

async function publishTwitterPost(account: SocialAccount, content: string) {
    let accessToken = account.accessToken;

    if (isTokenExpired(account.expiresAt)) {
        if (!account.refreshToken) {
            throw new Error("Twitter authorization expired. Reconnect this account.");
        }

        const refreshed = await refreshTwitterToken(account.refreshToken);

        accessToken = refreshed.access_token;

        await prisma.socialAccount.update({
            where: { id: account.id },
            data: {
                accessToken,
                refreshToken: refreshed.refresh_token || account.refreshToken,
                expiresAt: new Date(Date.now() + Number(refreshed.expires_in) * 1000),
            },
        });
    }

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

    return parseApiResponse(res);
}

async function publishThreads(account: SocialAccount, content: string) {
    let accessToken = account.accessToken;

    if (isThreadsTokenExpiring(account.expiresAt)) {
        const refreshed = await refreshThreadsToken(account.accessToken);

        accessToken = refreshed.accessToken;

        await prisma.socialAccount.update({
            where: { id: account.id },
            data: {
                accessToken,
                expiresAt: refreshed.expiresAt,
            },
        });
    }

    return publishThreadsPost({
        accessToken,
        content,
    });
}

export async function publishToAccount(account: SocialAccount, content: string) {
    if (account.platform === "twitter") {
        return publishTwitterPost(account, content);
    }

    if (account.platform === "mastodon") {
        return publishMastodonPost({
            instanceUrl: account.instanceUrl,
            accessToken: account.accessToken,
            content,
        });
    }

    if (account.platform === "threads") {
        return publishThreads(account, content);
    }

    throw new Error(`Unsupported platform: ${account.platform}`);
}
