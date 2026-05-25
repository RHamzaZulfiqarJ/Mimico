export async function publishMastodonPost(input: { instanceUrl: string | null; accessToken: string; content: string }) {
    if (!input.instanceUrl) {
        throw new Error("Mastodon instance URL is missing");
    }

    const res = await fetch(`${input.instanceUrl}/api/v1/statuses`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${input.accessToken}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            status: input.content,
        }),
    });

    const text = await res.text();

    if (!res.ok) {
        throw new Error(text || "Mastodon publishing failed");
    }

    return JSON.parse(text);
}
