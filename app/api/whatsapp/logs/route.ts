export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { Prisma, WhatsAppMessageDirection } from "@prisma/client";
import { verifyToken } from "@/libs/jwt";
import { prisma } from "@/libs/prisma";

const WHATSAPP_PLATFORM = "whatsapp";

const getUserId = async (req: Request) => {
    const cookieToken = (await cookies()).get("token")?.value;
    const authHeader = req.headers.get("authorization");
    const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

    const token = cookieToken || bearerToken;

    if (!token) {
        return null;
    }

    try {
        const payload = verifyToken(token);
        return payload.id;
    } catch {
        return null;
    }
};

const getPagination = (url: URL) => {
    const rawPage = Number(url.searchParams.get("page") || 1);
    const rawLimit = Number(url.searchParams.get("limit") || 20);

    const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;
    const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(Math.floor(rawLimit), 100) : 20;

    return {
        page,
        limit,
        skip: (page - 1) * limit,
    };
};

const isValidDirection = (value: string | null): value is WhatsAppMessageDirection => {
    return (
        value === WhatsAppMessageDirection.OUTBOUND ||
        value === WhatsAppMessageDirection.INBOUND ||
        value === WhatsAppMessageDirection.STATUS
    );
};

const parseSuccess = (value: string | null) => {
    if (value === "true") {
        return true;
    }

    if (value === "false") {
        return false;
    }

    return undefined;
};

const errorResponse = (error: unknown) => {
    if (error instanceof Error) {
        return NextResponse.json(
            {
                error: error.message,
            },
            {
                status: 500,
            },
        );
    }

    return NextResponse.json(
        {
            error: "Something went wrong",
        },
        {
            status: 500,
        },
    );
};

export async function GET(req: Request) {
    try {
        const userId = await getUserId(req);

        if (!userId) {
            return NextResponse.json(
                {
                    error: "Unauthorized",
                },
                {
                    status: 401,
                },
            );
        }

        const url = new URL(req.url);
        const socialAccountId = url.searchParams.get("socialAccountId");

        if (!socialAccountId) {
            return NextResponse.json(
                {
                    error: "socialAccountId is required",
                },
                {
                    status: 400,
                },
            );
        }

        const account = await prisma.socialAccount.findFirst({
            where: {
                id: socialAccountId,
                userId,
                platform: WHATSAPP_PLATFORM,
                isActive: true,
            },
            select: {
                id: true,
            },
        });

        if (!account) {
            return NextResponse.json(
                {
                    error: "WhatsApp account not found",
                },
                {
                    status: 404,
                },
            );
        }

        const pagination = getPagination(url);
        const q = url.searchParams.get("q");
        const direction = url.searchParams.get("direction");
        const success = parseSuccess(url.searchParams.get("success"));

        const where: Prisma.WhatsAppMessageLogWhereInput = {
            socialAccountId: account.id,
        };

        if (isValidDirection(direction)) {
            where.direction = direction;
        }

        if (success !== undefined) {
            where.success = success;
        }

        if (q) {
            where.OR = [
                {
                    recipientPhone: {
                        contains: q,
                        mode: "insensitive",
                    },
                },
                {
                    metaMessageId: {
                        contains: q,
                        mode: "insensitive",
                    },
                },
                {
                    errorMessage: {
                        contains: q,
                        mode: "insensitive",
                    },
                },
            ];
        }

        const [items, total] = await Promise.all([
            prisma.whatsAppMessageLog.findMany({
                where,
                include: {
                    scheduledMessage: {
                        select: {
                            id: true,
                            recipientPhone: true,
                            templateName: true,
                            templateLanguage: true,
                            status: true,
                            scheduledAt: true,
                            sentAt: true,
                        },
                    },
                },
                orderBy: {
                    createdAt: "desc",
                },
                skip: pagination.skip,
                take: pagination.limit,
            }),
            prisma.whatsAppMessageLog.count({
                where,
            }),
        ]);

        return NextResponse.json({
            items,
            total,
            page: pagination.page,
            limit: pagination.limit,
            pages: Math.ceil(total / pagination.limit),
        });
    } catch (error) {
        return errorResponse(error);
    }
}
