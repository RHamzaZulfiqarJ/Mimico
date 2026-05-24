export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/libs/prisma";
import { verifyToken } from "@/libs/jwt";
import { publishSocialPost } from "@/libs/social-publisher";

const getErrorMessage = (error: unknown) => {
    if (error instanceof Error) {
        return error.message;
    }

    return "Something went wrong";
};

export async function POST(req: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("token")?.value;

        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const payload = verifyToken(token);
        const body = await req.json();
        const { content, scheduledAt, accountIds } = body;

        if (!content || !Array.isArray(accountIds) || accountIds.length === 0) {
            return NextResponse.json({ error: "Invalid request data" }, { status: 400 });
        }

        const accounts = await prisma.socialAccount.findMany({
            where: {
                id: { in: accountIds },
                userId: payload.id,
                platform: { in: ["twitter", "mastodon"] },
            },
        });

        if (accounts.length !== accountIds.length) {
            return NextResponse.json({ error: "One or more accounts invalid" }, { status: 403 });
        }

        if (scheduledAt) {
            const scheduleDate = new Date(scheduledAt);

            if (Number.isNaN(scheduleDate.getTime()) || scheduleDate.getTime() <= Date.now()) {
                return NextResponse.json({ error: "Schedule time must be in the future" }, { status: 400 });
            }

            await prisma.scheduledPost.createMany({
                data: accounts.map((account) => ({
                    content,
                    scheduledAt: scheduleDate,
                    status: "pending",
                    socialAccountId: account.id,
                })),
            });

            return NextResponse.json({
                success: true,
                mode: "scheduled",
                created: accounts.length,
            });
        }

        const results = await Promise.all(
            accounts.map(async (account) => {
                const post = await prisma.scheduledPost.create({
                    data: {
                        content,
                        scheduledAt: new Date(),
                        status: "processing",
                        socialAccountId: account.id,
                        lastAttemptAt: new Date(),
                    },
                });

                try {
                    await publishSocialPost(account, content);

                    await prisma.scheduledPost.update({
                        where: { id: post.id },
                        data: {
                            status: "posted",
                            postedAt: new Date(),
                            errorMessage: null,
                        },
                    });

                    return {
                        id: post.id,
                        success: true,
                        accountUsername: account.accountUsername,
                        platform: account.platform,
                    };
                } catch (error) {
                    const message = getErrorMessage(error);

                    await prisma.scheduledPost.update({
                        where: { id: post.id },
                        data: {
                            status: "failed",
                            errorMessage: message,
                            retryCount: { increment: 1 },
                        },
                    });

                    return {
                        id: post.id,
                        success: false,
                        accountUsername: account.accountUsername,
                        platform: account.platform,
                        error: message,
                    };
                }
            }),
        );

        const posted = results.filter((result) => result.success).length;
        const failed = results.length - posted;

        if (posted === 0) {
            return NextResponse.json(
                {
                    success: false,
                    mode: "immediate",
                    posted,
                    failed,
                    results,
                    error: results[0]?.error || "Failed to publish post",
                },
                { status: 500 },
            );
        }

        return NextResponse.json(
            {
                success: failed === 0,
                mode: "immediate",
                created: results.length,
                posted,
                failed,
                results,
            },
            { status: failed > 0 ? 207 : 200 },
        );
    } catch (error) {
        return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
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
                        id: true,
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
