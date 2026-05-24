export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import {
  Prisma,
  WhatsAppMessageDirection,
  WhatsAppScheduledMessageStatus,
} from "@prisma/client";
import { prisma } from "@/libs/prisma";

const WHATSAPP_PLATFORM = "whatsapp";

type WhatsAppWebhookStatus = {
  id?: string;
  status?: string;
  timestamp?: string;
  recipient_id?: string;
  errors?: unknown[];
};

type WhatsAppWebhookMessage = {
  id?: string;
  from?: string;
  timestamp?: string;
  type?: string;
  text?: {
    body?: string;
  };
  [key: string]: unknown;
};

type WhatsAppWebhookValue = {
  messaging_product?: string;
  metadata?: {
    display_phone_number?: string;
    phone_number_id?: string;
  };
  contacts?: unknown[];
  messages?: WhatsAppWebhookMessage[];
  statuses?: WhatsAppWebhookStatus[];
  [key: string]: unknown;
};

type WhatsAppWebhookChange = {
  field?: string;
  value?: WhatsAppWebhookValue;
};

type WhatsAppWebhookEntry = {
  id?: string;
  changes?: WhatsAppWebhookChange[];
};

type WhatsAppWebhookPayload = {
  object?: string;
  entry?: WhatsAppWebhookEntry[];
};

const toJson = (value: unknown): Prisma.InputJsonValue | undefined => {
  if (value === undefined) {
    return undefined;
  }

  return value as Prisma.InputJsonValue;
};

const getWebhookVerifyToken = () => {
  return process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
};

const getMetaErrorMessage = (status: WhatsAppWebhookStatus) => {
  const firstError = Array.isArray(status.errors) ? status.errors[0] : null;

  if (!firstError || typeof firstError !== "object") {
    return status.status === "failed" ? "WhatsApp message failed" : null;
  }

  const error = firstError as {
    title?: string;
    message?: string;
    error_data?: {
      details?: string;
    };
  };

  return error.message || error.error_data?.details || error.title || "WhatsApp message failed";
};

const updateScheduledMessageFromStatus = async (
  socialAccountId: string,
  status: WhatsAppWebhookStatus
) => {
  if (!status.id) {
    return null;
  }

  const scheduledMessage = await prisma.whatsAppScheduledMessage.findFirst({
    where: {
      socialAccountId,
      metaMessageId: status.id,
    },
  });

  if (!scheduledMessage) {
    return null;
  }

  if (status.status === "failed") {
    return prisma.whatsAppScheduledMessage.update({
      where: {
        id: scheduledMessage.id,
      },
      data: {
        status: WhatsAppScheduledMessageStatus.FAILED,
        errorMessage: getMetaErrorMessage(status),
      },
    });
  }

  if (status.status === "sent" && scheduledMessage.status !== WhatsAppScheduledMessageStatus.SENT) {
    return prisma.whatsAppScheduledMessage.update({
      where: {
        id: scheduledMessage.id,
      },
      data: {
        status: WhatsAppScheduledMessageStatus.SENT,
        sentAt: scheduledMessage.sentAt || new Date(),
      },
    });
  }

  return scheduledMessage;
};

const saveInboundMessages = async (
  socialAccountId: string,
  messages: WhatsAppWebhookMessage[],
  value: WhatsAppWebhookValue
) => {
  for (const message of messages) {
    await prisma.whatsAppMessageLog.create({
      data: {
        socialAccountId,
        direction: WhatsAppMessageDirection.INBOUND,
        recipientPhone: message.from,
        metaMessageId: message.id,
        payload: toJson(message),
        response: toJson(value),
        success: true,
        statusCode: 200,
      },
    });
  }
};

const saveStatusUpdates = async (
  socialAccountId: string,
  statuses: WhatsAppWebhookStatus[],
  value: WhatsAppWebhookValue
) => {
  for (const status of statuses) {
    const scheduledMessage = await updateScheduledMessageFromStatus(socialAccountId, status);

    await prisma.whatsAppMessageLog.create({
      data: {
        scheduledMessageId: scheduledMessage?.id,
        socialAccountId,
        direction: WhatsAppMessageDirection.STATUS,
        recipientPhone: status.recipient_id,
        metaMessageId: status.id,
        payload: toJson(status),
        response: toJson(value),
        success: status.status !== "failed",
        statusCode: 200,
        errorMessage: status.status === "failed" ? getMetaErrorMessage(status) : null,
      },
    });
  }
};

const processWebhookValue = async (value: WhatsAppWebhookValue) => {
  const phoneNumberId = value.metadata?.phone_number_id;

  if (!phoneNumberId) {
    return;
  }

  const account = await prisma.socialAccount.findFirst({
    where: {
      platform: WHATSAPP_PLATFORM,
      phoneNumberId,
    },
  });

  if (!account) {
    return;
  }

  if (Array.isArray(value.messages) && value.messages.length > 0) {
    await saveInboundMessages(account.id, value.messages, value);
  }

  if (Array.isArray(value.statuses) && value.statuses.length > 0) {
    await saveStatusUpdates(account.id, value.statuses, value);
  }
};

const processWebhookPayload = async (payload: WhatsAppWebhookPayload) => {
  const entries = Array.isArray(payload.entry) ? payload.entry : [];

  for (const entry of entries) {
    const changes = Array.isArray(entry.changes) ? entry.changes : [];

    for (const change of changes) {
      if (change.field === "messages" && change.value) {
        await processWebhookValue(change.value);
      }
    }
  }
};

export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  const verifyToken = getWebhookVerifyToken();

  if (!verifyToken) {
    return NextResponse.json(
      {
        error: "WHATSAPP_WEBHOOK_VERIFY_TOKEN is not configured",
      },
      {
        status: 500,
      }
    );
  }

  if (mode === "subscribe" && token === verifyToken && challenge) {
    return new Response(challenge, {
      status: 200,
      headers: {
        "Content-Type": "text/plain",
      },
    });
  }

  return NextResponse.json(
    {
      error: "Webhook verification failed",
    },
    {
      status: 403,
    }
  );
}

export async function POST(req: Request) {
  try {
    const payload = await req.json();

    await processWebhookPayload(payload);

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
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
  }
}