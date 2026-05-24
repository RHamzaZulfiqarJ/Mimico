export const runtime = "nodejs";

import { prisma } from "@/libs/prisma";
import { NextResponse } from "next/server";
import { publishSocialPost } from "@/libs/social-publisher";

const getErrorMessage = (error: unknown) => {
    if (error instanceof Error) {
        return error.message;
    }

    return "Something went wrong";
};

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
        take: 20,
        orderBy: {
            scheduledAt: "asc",
        },
    });

    let posted = 0;
    let failed = 0;

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

        if (locked.count === 0) {
            continue;
        }

        try {
            await publishSocialPost(post.socialAccount, post.content);

            await prisma.scheduledPost.update({
                where: { id: post.id },
                data: {
                    status: "posted",
                    postedAt: new Date(),
                    errorMessage: null,
                },
            });

            posted++;
        } catch (error) {
            await prisma.scheduledPost.update({
                where: { id: post.id },
                data: {
                    status: "failed",
                    errorMessage: getErrorMessage(error),
                    retryCount: { increment: 1 },
                },
            });

            failed++;
        }
    }

    return NextResponse.json({
        processed: posts.length,
        posted,
        failed,
    });
}
