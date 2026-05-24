export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/libs/jwt";
import {
  disconnectWhatsAppAccount,
  WhatsAppServiceError,
} from "@/libs/whatsapp/service";

const getUserId = async (req: Request) => {
  const cookieToken = (await cookies()).get("token")?.value;
  const authHeader = req.headers.get("authorization");
  const bearerToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

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

const errorResponse = (error: unknown) => {
  if (error instanceof WhatsAppServiceError) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
        subcode: error.subcode,
        fbtraceId: error.fbtraceId,
      },
      {
        status: error.statusCode,
      }
    );
  }

  if (error instanceof Error) {
    return NextResponse.json(
      {
        error: error.message,
      },
      {
        status: 500,
      }
    );
  }

  return NextResponse.json(
    {
      error: "Something went wrong",
    },
    {
      status: 500,
    }
  );
};

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function DELETE(req: Request, context: RouteContext) {
  try {
    const userId = await getUserId(req);

    if (!userId) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        {
          status: 401,
        }
      );
    }

    const { id } = await context.params;

    const account = await disconnectWhatsAppAccount(userId, id);

    return NextResponse.json({
      success: true,
      account: {
        id: account.id,
        platform: account.platform,
        accountId: account.accountId,
        accountUsername: account.accountUsername,
        phoneNumberDisplay: account.phoneNumberDisplay,
        businessName: account.businessName,
        isActive: account.isActive,
        updatedAt: account.updatedAt,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}