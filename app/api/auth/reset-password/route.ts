export const runtime = "nodejs";

import crypto from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/libs/prisma";
import { hashPassword } from "@/libs/password";
import { resetPasswordSchema } from "@/libs/validation";

function hashToken(token: string) {
    return crypto.createHash("sha256").update(token).digest("hex");
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const parsed = resetPasswordSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                {
                    message: "Invalid reset request",
                },
                { status: 400 },
            );
        }

        const tokenHash = hashToken(parsed.data.token);

        const user = await prisma.user.findFirst({
            where: {
                passwordResetToken: tokenHash,
                passwordResetTokenExpiresAt: {
                    gt: new Date(),
                },
            },
            select: {
                id: true,
            },
        });

        if (!user) {
            return NextResponse.json(
                {
                    message: "Reset link is invalid or expired",
                },
                { status: 400 },
            );
        }

        const hashedPassword = await hashPassword(parsed.data.password);

        await prisma.user.update({
            where: {
                id: user.id,
            },
            data: {
                password: hashedPassword,
                passwordResetToken: null,
                passwordResetTokenExpiresAt: null,
                passwordResetRequestedAt: null,
            },
        });

        return NextResponse.json(
            {
                message: "Password reset successful",
            },
            { status: 200 },
        );
    } catch (error) {
        console.error("RESET PASSWORD ERROR:", error);

        return NextResponse.json(
            {
                message: "Password reset failed",
                error: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 },
        );
    }
}
