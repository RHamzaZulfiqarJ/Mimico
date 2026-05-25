export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/libs/prisma";
import { verifyToken } from "@/libs/jwt";

export async function DELETE(_req: Request, context: { params: Promise<{ postId: string }> }) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("token")?.value;

        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { postId } = await context.params;

        if (!postId) {
            return NextResponse.json({ error: "Post ID is required" }, { status: 400 });
        }

        const payload = verifyToken(token);

        const post = await prisma.scheduledPost.findFirst({
            where: {
                id: postId,
                socialAccount: {
                    userId: payload.id,
                },
            },
            select: {
                id: true,
                status: true,
            },
        });

        if (!post) {
            return NextResponse.json({ error: "Post not found" }, { status: 404 });
        }

        if (post.status === "processing") {
            return NextResponse.json(
                { error: "This post is currently being processed and cannot be deleted" },
                { status: 409 },
            );
        }

        await prisma.scheduledPost.delete({
            where: {
                id: post.id,
            },
        });

        return NextResponse.json({
            success: true,
            message: "Post deleted successfully",
        });
    } catch (error) {
        console.error("DELETE POST ERROR:", error);

        return NextResponse.json({ error: "Failed to delete post" }, { status: 500 });
    }
}
