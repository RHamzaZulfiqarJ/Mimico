export const runtime = "nodejs";

import crypto from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/libs/prisma";
import { forgotPasswordSchema } from "@/libs/validation";
import { sendPasswordResetEmail } from "@/libs/mail";

const genericMessage =
    "If an account exists with this email, a password reset link has been sent. Please check your inbox, spam, or promotions folder.";

function hashToken(token: string) {
    return crypto.createHash("sha256").update(token).digest("hex");
}

function getAppUrl(req: Request) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;

    if (appUrl) {
        return appUrl.replace(/\/$/, "");
    }

    return new URL(req.url).origin;
}

export async function POST(req: Request) {
    const isProduction = process.env.NODE_ENV === "production";

    try {
        const body = await req.json();
        const parsed = forgotPasswordSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                {
                    message: "Enter a valid email address",
                },
                { status: 400 },
            );
        }

        const email = parsed.data.email.trim().toLowerCase();

        const user = await prisma.user.findFirst({
            where: {
                email: {
                    equals: email,
                    mode: "insensitive",
                },
            },
            select: {
                id: true,
                firstName: true,
                email: true,
                passwordResetRequestedAt: true,
            },
        });

        if (!user) {
            return NextResponse.json(
                {
                    message: isProduction ? genericMessage : "No account exists with this email",
                    userFound: false,
                },
                { status: isProduction ? 200 : 404 },
            );
        }

        const recentlyRequested =
            user.passwordResetRequestedAt && Date.now() - user.passwordResetRequestedAt.getTime() < 60 * 1000;

        if (recentlyRequested) {
            return NextResponse.json(
                {
                    message: isProduction ? genericMessage : "Please wait before requesting another reset email",
                    userFound: true,
                },
                { status: isProduction ? 200 : 429 },
            );
        }

        const token = crypto.randomBytes(32).toString("hex");
        const tokenHash = hashToken(token);
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
        const resetUrl = `${getAppUrl(req)}/reset-password/${token}`;

        await prisma.user.update({
            where: {
                id: user.id,
            },
            data: {
                passwordResetToken: tokenHash,
                passwordResetTokenExpiresAt: expiresAt,
                passwordResetRequestedAt: new Date(),
            },
        });

        await sendPasswordResetEmail({
            to: user.email,
            firstName: user.firstName,
            resetUrl,
        });

        return NextResponse.json(
            {
                message: genericMessage,
                userFound: true,
            },
            { status: 200 },
        );
    } catch (error) {
        console.error("FORGOT PASSWORD ERROR:", error);

        return NextResponse.json(
            {
                message: "Password reset email failed",
                error: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 },
        );
    }
}
