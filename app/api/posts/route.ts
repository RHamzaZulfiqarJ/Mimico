export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/libs/prisma";
import { verifyToken } from "@/libs/jwt";
import { createPostSchema } from "@/libs/validation";
import { getPlatformLimit, isSupportedPlatform, PLATFORM_RULES } from "@/libs/platform-rules";
import { publishToAccount } from "@/libs/publishers";

export async function POST(req: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("token")?.value;

        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const payload = verifyToken(token);
        const body = await req.json();
        const parsed = createPostSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                {
                    error: "Invalid request data",
                    details: parsed.error.flatten().fieldErrors,
                },
                { status: 400 },
            );
        }

        const { content, scheduledAt } = parsed.data;
        const uniqueAccountIds = [...new Set(parsed.data.accountIds)];

        if (uniqueAccountIds.length !== parsed.data.accountIds.length) {
            return NextResponse.json({ error: "Duplicate accounts selected" }, { status: 409 });
        }

        const accounts = await prisma.socialAccount.findMany({
            where: {
                id: { in: uniqueAccountIds },
                userId: payload.id,
            },
        });

        if (accounts.length !== uniqueAccountIds.length) {
            return NextResponse.json({ error: "One or more selected accounts are invalid" }, { status: 403 });
        }

        const unsupported = accounts.find((account) => !isSupportedPlatform(account.platform));

        if (unsupported) {
            return NextResponse.json(
                { error: `${unsupported.platform} is not supported for publishing yet` },
                { status: 400 },
            );
        }

        const limitErrors = accounts
            .map((account) => {
                const limit = getPlatformLimit(account.platform);

                if (limit && content.length > limit) {
                    return `${PLATFORM_RULES[account.platform as keyof typeof PLATFORM_RULES].label} allows ${limit} characters maximum`;
                }

                return null;
            })
            .filter(Boolean);

        if (limitErrors.length > 0) {
            return NextResponse.json(
                {
                    error: "Content does not match selected platform rules",
                    details: limitErrors,
                },
                { status: 400 },
            );
        }

        const now = new Date();
        const scheduledDate = scheduledAt ? new Date(scheduledAt) : now;
        const shouldPublishNow = !scheduledAt;

        if (scheduledAt && scheduledDate <= new Date(Date.now() + 60 * 1000)) {
            return NextResponse.json(
                { error: "Schedule time must be at least 1 minute in the future" },
                { status: 400 },
            );
        }

        const results = [];

        for (const account of accounts) {
            const post = await prisma.scheduledPost.create({
                data: {
                    content,
                    scheduledAt: scheduledDate,
                    status: shouldPublishNow ? "processing" : "pending",
                    socialAccountId: account.id,
                },
            });

            if (!shouldPublishNow) {
                results.push({
                    id: post.id,
                    platform: account.platform,
                    status: "pending",
                });

                continue;
            }

            try {
                await publishToAccount(account, content);

                await prisma.scheduledPost.update({
                    where: { id: post.id },
                    data: {
                        status: "posted",
                        postedAt: new Date(),
                        lastAttemptAt: new Date(),
                    },
                });

                results.push({
                    id: post.id,
                    platform: account.platform,
                    status: "posted",
                });
            } catch (err: any) {
                await prisma.scheduledPost.update({
                    where: { id: post.id },
                    data: {
                        status: "failed",
                        errorMessage: err.message || "Publishing failed",
                        lastAttemptAt: new Date(),
                    },
                });

                results.push({
                    id: post.id,
                    platform: account.platform,
                    status: "failed",
                    error: err.message || "Publishing failed",
                });
            }
        }

        const failed = results.filter((result) => result.status === "failed");
        const posted = results.filter((result) => result.status === "posted").length;
        const created = results.filter((result) => result.status === "pending").length;

        return NextResponse.json(
            {
                success: failed.length === 0,
                posted,
                failed: failed.length,
                created,
                results,
            },
            { status: failed.length > 0 ? 207 : 200 },
        );
    } catch (error) {
        console.error("CREATE POST ERROR:", error);

        return NextResponse.json({ error: "Failed to create posts" }, { status: 500 });
    }
}

export async function GET() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("token")?.value;

        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const payload = verifyToken(token);

        const posts = await prisma.scheduledPost.findMany({
            where: {
                socialAccount: {
                    userId: payload.id,
                },
            },
            include: {
                socialAccount: {
                    select: {
                        accountUsername: true,
                        platform: true,
                    },
                },
            },
            orderBy: {
                createdAt: "desc",
            },
        });

        return NextResponse.json({ posts });
    } catch {
        return NextResponse.json({ error: "Failed to fetch posts" }, { status: 500 });
    }
}
