export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import {
  processDueWhatsAppMessages,
  WhatsAppServiceError,
} from "@/libs/whatsapp/service";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const isAuthorized = (req: Request) => {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    return false;
  }

  const auth = req.headers.get("authorization");

  return auth === `Bearer ${secret}`;
};

const getLimit = (req: Request) => {
  const url = new URL(req.url);
  const rawLimit = url.searchParams.get("limit");
  const parsed = Number(rawLimit || DEFAULT_LIMIT);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return DEFAULT_LIMIT;
  }

  return Math.min(Math.floor(parsed), MAX_LIMIT);
};

const errorResponse = (error: unknown) => {
  if (error instanceof WhatsAppServiceError) {
    return NextResponse.json(
      {
        success: false,
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
        success: false,
        error: error.message,
      },
      {
        status: 500,
      }
    );
  }

  return NextResponse.json(
    {
      success: false,
      error: "Something went wrong",
    },
    {
      status: 500,
    }
  );
};

const handleCron = async (req: Request) => {
  try {
    if (!process.env.CRON_SECRET) {
      return NextResponse.json(
        {
          success: false,
          error: "CRON_SECRET is not configured",
        },
        {
          status: 500,
        }
      );
    }

    const limit = getLimit(req);
    const result = await processDueWhatsAppMessages(limit);

    return NextResponse.json({
      success: true,
      limit,
      ...result,
    });
  } catch (error) {
    return errorResponse(error);
  }
};

export async function GET(req: Request) {
  return handleCron(req);
}

export async function POST(req: Request) {
  return handleCron(req);
}