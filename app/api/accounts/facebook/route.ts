export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/libs/jwt";
import {
  connectWhatsAppAccountFromEmbeddedSignup,
  WhatsAppServiceError,
} from "@/libs/whatsapp/service";

const getUserId = async () => {
  const token = (await cookies()).get("token")?.value;

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

const readBody = async (req: Request) => {
  try {
    return await req.json();
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

export async function POST(req: Request) {
  try {
    const userId = await getUserId();

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

    const body = await readBody(req);

    if (!body) {
      return NextResponse.json(
        {
          error: "Invalid JSON body",
        },
        {
          status: 400,
        }
      );
    }

    const account = await connectWhatsAppAccountFromEmbeddedSignup(userId, body);

    return NextResponse.json(
      {
        success: true,
        account: {
          id: account.id,
          platform: account.platform,
          accountId: account.accountId,
          accountUsername: account.accountUsername,
          businessAccountId: account.businessAccountId,
          phoneNumberId: account.phoneNumberId,
          phoneNumberDisplay: account.phoneNumberDisplay,
          businessName: account.businessName,
          createdAt: account.createdAt,
          updatedAt: account.updatedAt,
        },
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    return errorResponse(error);
  }
}