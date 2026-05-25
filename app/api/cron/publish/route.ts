export const runtime = "nodejs";

import { prisma } from "@/libs/prisma";
import { NextResponse } from "next/server";
import { publishToAccount } from "@/libs/publishers";

export async function GET(req: Request) {
    const auth = req.headers.get("authorization");

    if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const posts = await prisma.scheduledPost.findMany({
        where: {
            status: "pending",
            scheduledAt: {
                lte: new Date(),
            },
        },
        include: {
            socialAccount: true,
        },
        take: 25,
        orderBy: {
            scheduledAt: "asc",
        },
    });

    const results = [];

    for (const post of posts) {
        const locked = await prisma.scheduledPost.updateMany({
            where: {
                id: post.id,
                status: "pending",
            },
            data: {
                status: "processing",
                lastAttemptAt: new Date(),
            },
        });

        if (locked.count === 0) continue;

        try {
            await publishToAccount(post.socialAccount, post.content);

            await prisma.scheduledPost.update({
                where: { id: post.id },
                data: {
                    status: "posted",
                    postedAt: new Date(),
                    errorMessage: null,
                },
            });

            results.push({
                id: post.id,
                platform: post.socialAccount.platform,
                status: "posted",
            });
        } catch (err: any) {
            const retryCount = post.retryCount + 1;
            const shouldRetry = retryCount < 3;

            await prisma.scheduledPost.update({
                where: { id: post.id },
                data: {
                    status: shouldRetry ? "pending" : "failed",
                    retryCount,
                    errorMessage: err.message || "Publishing failed",
                },
            });

            results.push({
                id: post.id,
                platform: post.socialAccount.platform,
                status: shouldRetry ? "retrying" : "failed",
                error: err.message || "Publishing failed",
            });
        }
    }

    return NextResponse.json({
        processed: results.length,
        results,
    });
}
