import { Prisma, WhatsAppMessageDirection, WhatsAppScheduledMessageStatus } from "@prisma/client";
import { prisma } from "@/libs/prisma";
import {
    connectWhatsAppAccountSchema,
    createWhatsAppContactSchema,
    updateWhatsAppContactSchema,
    importWhatsAppContactsSchema,
    scheduleWhatsAppTemplateMessageSchema,
    bulkScheduleWhatsAppTemplateMessagesSchema,
    sendWhatsAppTextReplySchema,
    createWhatsAppTemplateSchema,
    sendNowWhatsAppTemplateMessageSchema,
    bulkSendNowWhatsAppTemplateMessagesSchema,
    whatsAppPaginationSchema,
    type ConnectWhatsAppAccountInput,
    type CreateWhatsAppContactInput,
    type UpdateWhatsAppContactInput,
    type ImportWhatsAppContactsInput,
    type ScheduleWhatsAppTemplateMessageInput,
    type BulkScheduleWhatsAppTemplateMessagesInput,
    type SendWhatsAppTextReplyInput,
    type CreateWhatsAppTemplateInput,
    type SendNowWhatsAppTemplateMessageInput,
    type BulkSendNowWhatsAppTemplateMessagesInput,
} from "@/libs/whatsapp/validation";

import {
    createWhatsAppTemplate as createMetaWhatsAppTemplate,
    fetchWhatsAppTemplates,
    getWhatsAppContactWaId,
    getWhatsAppMessageId,
    sendWhatsAppTemplateMessage,
    sendWhatsAppTextMessage,
    verifyWhatsAppPhoneNumber,
    WhatsAppApiError,
} from "@/libs/whatsapp/api";

const WHATSAPP_PLATFORM = "whatsapp";
const MAX_RETRY_COUNT = 3;

type PaginationInput = {
    page?: unknown;
    limit?: unknown;
    q?: unknown;
    status?: unknown;
};

type ServiceErrorPayload = {
    message: string;
    statusCode: number;
    code?: number;
    subcode?: number;
    fbtraceId?: string;
    payload?: unknown;
};

export class WhatsAppServiceError extends Error {
    statusCode: number;
    code?: number;
    subcode?: number;
    fbtraceId?: string;
    payload?: unknown;

    constructor(input: ServiceErrorPayload) {
        super(input.message);
        this.name = "WhatsAppServiceError";
        this.statusCode = input.statusCode;
        this.code = input.code;
        this.subcode = input.subcode;
        this.fbtraceId = input.fbtraceId;
        this.payload = input.payload;
    }
}

const fail = (message: string, statusCode = 400) => {
    throw new WhatsAppServiceError({ message, statusCode });
};

const normalizeError = (error: unknown) => {
    if (error instanceof WhatsAppServiceError) {
        return error;
    }

    if (error instanceof WhatsAppApiError) {
        return new WhatsAppServiceError({
            message: error.message,
            statusCode: error.statusCode,
            code: error.code,
            subcode: error.subcode,
            fbtraceId: error.fbtraceId,
            payload: error.payload,
        });
    }

    if (error instanceof Error) {
        return new WhatsAppServiceError({
            message: error.message,
            statusCode: 500,
        });
    }

    return new WhatsAppServiceError({
        message: "Something went wrong",
        statusCode: 500,
    });
};

const toJson = (value: unknown): Prisma.InputJsonValue | undefined => {
    if (value === undefined) {
        return undefined;
    }

    return value as Prisma.InputJsonValue;
};

const buildStoredTemplateComponents = (input: {
    headerText?: string;
    bodyText: string;
    footerText?: string;
    bodyExamples?: string[];
}) => {
    const components = [];

    if (input.headerText) {
        components.push({
            type: "HEADER",
            format: "TEXT",
            text: input.headerText,
        });
    }

    const bodyComponent: Record<string, unknown> = {
        type: "BODY",
        text: input.bodyText,
    };

    if (input.bodyExamples && input.bodyExamples.length > 0) {
        bodyComponent.example = {
            body_text: [input.bodyExamples],
        };
    }

    components.push(bodyComponent);

    if (input.footerText) {
        components.push({
            type: "FOOTER",
            text: input.footerText,
        });
    }

    return components;
};

const getPagination = (input: PaginationInput = {}) => {
    const parsed = whatsAppPaginationSchema.parse(input);
    const skip = (parsed.page - 1) * parsed.limit;

    return {
        ...parsed,
        skip,
    };
};

const assertWhatsAppAccountOwner = async (userId: string, socialAccountId: string) => {
    const account = await prisma.socialAccount.findFirst({
        where: {
            id: socialAccountId,
            userId,
            platform: WHATSAPP_PLATFORM,
            isActive: true,
        },
    });

    if (!account) {
        fail("WhatsApp account not found", 404);
    }

    if (!account.phoneNumberId || !account.businessAccountId || !account.accessToken) {
        fail("WhatsApp account is not configured properly", 400);
    }

    return account;
};

const createMessageLog = async (input: {
    scheduledMessageId?: string;
    socialAccountId: string;
    direction: WhatsAppMessageDirection;
    recipientPhone?: string;
    metaMessageId?: string;
    payload?: unknown;
    response?: unknown;
    statusCode?: number;
    success: boolean;
    errorMessage?: string;
    webhookEventId?: string;
}) => {
    return prisma.whatsAppMessageLog.create({
        data: {
            scheduledMessageId: input.scheduledMessageId,
            socialAccountId: input.socialAccountId,
            direction: input.direction,
            recipientPhone: input.recipientPhone,
            metaMessageId: input.metaMessageId,
            payload: toJson(input.payload),
            response: toJson(input.response),
            statusCode: input.statusCode,
            success: input.success,
            errorMessage: input.errorMessage,
            webhookEventId: input.webhookEventId,
        },
    });
};

export const connectWhatsAppAccount = async (userId: string, body: ConnectWhatsAppAccountInput) => {
    const input = connectWhatsAppAccountSchema.parse(body);

    const existingAccount = await prisma.socialAccount.findFirst({
        where: {
            platform: WHATSAPP_PLATFORM,
            accountId: input.phoneNumberId,
        },
    });

    if (existingAccount && existingAccount.userId !== userId) {
        fail("This WhatsApp number is already connected with another user", 409);
    }

    let verifiedPhone;

    try {
        verifiedPhone = await verifyWhatsAppPhoneNumber({
            phoneNumberId: input.phoneNumberId,
            accessToken: input.accessToken,
        });
    } catch (error) {
        throw normalizeError(error);
    }

    const data = {
        platform: WHATSAPP_PLATFORM,
        accountId: input.phoneNumberId,
        accountUsername: verifiedPhone.verified_name || input.businessName,
        accessToken: input.accessToken,
        businessAccountId: input.businessAccountId,
        phoneNumberId: input.phoneNumberId,
        phoneNumberDisplay: verifiedPhone.display_phone_number || input.phoneNumberDisplay,
        businessName: input.businessName,
        userId,
        instanceUrl: null,
        refreshToken: null,
        tokenExpiry: null,
        expiresAt: null,
        isActive: true,
    };

    if (existingAccount) {
        return prisma.socialAccount.update({
            where: {
                id: existingAccount.id,
            },
            data,
        });
    }

    return prisma.socialAccount.create({
        data,
    });
};

export const listWhatsAppAccounts = async (userId: string) => {
    return prisma.socialAccount.findMany({
        where: {
            userId,
            platform: WHATSAPP_PLATFORM,
            isActive: true,
        },
        orderBy: {
            createdAt: "desc",
        },
        select: {
            id: true,
            accountId: true,
            accountUsername: true,
            businessAccountId: true,
            phoneNumberId: true,
            phoneNumberDisplay: true,
            businessName: true,
            createdAt: true,
            updatedAt: true,
        },
    });
};

export const disconnectWhatsAppAccount = async (userId: string, socialAccountId: string) => {
    const account = await assertWhatsAppAccountOwner(userId, socialAccountId);

    return prisma.socialAccount.update({
        where: {
            id: account.id,
        },
        data: {
            isActive: false,
        },
    });
};

export const syncWhatsAppTemplates = async (userId: string, socialAccountId: string) => {
    const account = await assertWhatsAppAccountOwner(userId, socialAccountId);

    let response;

    try {
        response = await fetchWhatsAppTemplates({
            businessAccountId: account.businessAccountId as string,
            accessToken: account.accessToken,
            limit: 100,
        });
    } catch (error) {
        throw normalizeError(error);
    }

    const templates = [];

    for (const template of response.data || []) {
        const savedTemplate = await prisma.whatsAppTemplate.upsert({
            where: {
                socialAccountId_name_language: {
                    socialAccountId: account.id,
                    name: template.name,
                    language: template.language,
                },
            },
            create: {
                socialAccountId: account.id,
                name: template.name,
                language: template.language,
                category: template.category,
                status: template.status,
                components: toJson(template.components),
            },
            update: {
                category: template.category,
                status: template.status,
                components: toJson(template.components),
            },
        });

        templates.push(savedTemplate);
    }

    return templates;
};

export const createCustomWhatsAppTemplate = async (userId: string, body: CreateWhatsAppTemplateInput) => {
    const input = createWhatsAppTemplateSchema.parse(body);
    const account = await assertWhatsAppAccountOwner(userId, input.socialAccountId);

    let response;

    try {
        response = await createMetaWhatsAppTemplate({
            businessAccountId: account.businessAccountId as string,
            accessToken: account.accessToken,
            name: input.name,
            category: input.category,
            language: input.language,
            headerText: input.headerText,
            bodyText: input.bodyText,
            footerText: input.footerText,
            bodyExamples: input.bodyExamples,
        });
    } catch (error) {
        throw normalizeError(error);
    }

    const components = buildStoredTemplateComponents({
        headerText: input.headerText,
        bodyText: input.bodyText,
        footerText: input.footerText,
        bodyExamples: input.bodyExamples,
    });

    const template = await prisma.whatsAppTemplate.upsert({
        where: {
            socialAccountId_name_language: {
                socialAccountId: account.id,
                name: input.name,
                language: input.language,
            },
        },
        create: {
            socialAccountId: account.id,
            name: input.name,
            language: input.language,
            category: response.category || input.category,
            status: response.status || "PENDING",
            components: toJson(components),
        },
        update: {
            category: response.category || input.category,
            status: response.status || "PENDING",
            components: toJson(components),
        },
    });

    return {
        template,
        meta: response,
    };
};

export const listWhatsAppTemplates = async (
    userId: string,
    socialAccountId: string,
    paginationInput: PaginationInput = {},
) => {
    const account = await assertWhatsAppAccountOwner(userId, socialAccountId);
    const pagination = getPagination(paginationInput);

    const where: Prisma.WhatsAppTemplateWhereInput = {
        socialAccountId: account.id,
    };

    if (pagination.q) {
        where.name = {
            contains: pagination.q,
            mode: "insensitive",
        };
    }

    if (pagination.status) {
        where.status = pagination.status;
    }

    const [items, total] = await Promise.all([
        prisma.whatsAppTemplate.findMany({
            where,
            orderBy: {
                updatedAt: "desc",
            },
            skip: pagination.skip,
            take: pagination.limit,
        }),
        prisma.whatsAppTemplate.count({
            where,
        }),
    ]);

    return {
        items,
        total,
        page: pagination.page,
        limit: pagination.limit,
        pages: Math.ceil(total / pagination.limit),
    };
};

export const createWhatsAppContact = async (userId: string, body: CreateWhatsAppContactInput) => {
    const input = createWhatsAppContactSchema.parse(body);
    const account = await assertWhatsAppAccountOwner(userId, input.socialAccountId);

    try {
        return await prisma.whatsAppContact.create({
            data: {
                userId,
                socialAccountId: account.id,
                name: input.name,
                phoneNumber: input.phoneNumber,
            },
        });
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
            fail("This WhatsApp contact already exists for this number", 409);
        }

        throw error;
    }
};

export const updateWhatsAppContact = async (userId: string, contactId: string, body: UpdateWhatsAppContactInput) => {
    const input = updateWhatsAppContactSchema.parse(body);

    const contact = await prisma.whatsAppContact.findFirst({
        where: {
            id: contactId,
            userId,
        },
    });

    if (!contact) {
        fail("WhatsApp contact not found", 404);
    }

    await assertWhatsAppAccountOwner(userId, contact.socialAccountId);

    try {
        return await prisma.whatsAppContact.update({
            where: {
                id: contact.id,
            },
            data: input,
        });
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
            fail("Another contact already uses this phone number", 409);
        }

        throw error;
    }
};

export const deleteWhatsAppContact = async (userId: string, contactId: string) => {
    const contact = await prisma.whatsAppContact.findFirst({
        where: {
            id: contactId,
            userId,
        },
    });

    if (!contact) {
        fail("WhatsApp contact not found", 404);
    }

    await assertWhatsAppAccountOwner(userId, contact.socialAccountId);

    return prisma.whatsAppContact.delete({
        where: {
            id: contact.id,
        },
    });
};

export const importWhatsAppContacts = async (userId: string, body: ImportWhatsAppContactsInput) => {
    const input = importWhatsAppContactsSchema.parse(body);
    const account = await assertWhatsAppAccountOwner(userId, input.socialAccountId);

    const existingContacts = await prisma.whatsAppContact.findMany({
        where: {
            userId,
            socialAccountId: account.id,
            phoneNumber: {
                in: input.contacts.map((contact) => contact.phoneNumber),
            },
        },
        select: {
            phoneNumber: true,
        },
    });

    const existingPhones = new Set(existingContacts.map((contact) => contact.phoneNumber));

    const newContacts = input.contacts.filter((contact) => {
        return !existingPhones.has(contact.phoneNumber);
    });

    if (newContacts.length === 0) {
        return {
            created: 0,
            skipped: input.contacts.length,
        };
    }

    await prisma.whatsAppContact.createMany({
        data: newContacts.map((contact) => ({
            userId,
            socialAccountId: account.id,
            name: contact.name,
            phoneNumber: contact.phoneNumber,
        })),
        skipDuplicates: true,
    });

    return {
        created: newContacts.length,
        skipped: input.contacts.length - newContacts.length,
    };
};

export const listWhatsAppContacts = async (
    userId: string,
    socialAccountId: string,
    paginationInput: PaginationInput = {},
) => {
    const account = await assertWhatsAppAccountOwner(userId, socialAccountId);
    const pagination = getPagination(paginationInput);

    const where: Prisma.WhatsAppContactWhereInput = {
        userId,
        socialAccountId: account.id,
    };

    if (pagination.q) {
        where.OR = [
            {
                name: {
                    contains: pagination.q,
                    mode: "insensitive",
                },
            },
            {
                phoneNumber: {
                    contains: pagination.q,
                    mode: "insensitive",
                },
            },
        ];
    }

    const [items, total] = await Promise.all([
        prisma.whatsAppContact.findMany({
            where,
            orderBy: {
                createdAt: "desc",
            },
            skip: pagination.skip,
            take: pagination.limit,
        }),
        prisma.whatsAppContact.count({
            where,
        }),
    ]);

    return {
        items,
        total,
        page: pagination.page,
        limit: pagination.limit,
        pages: Math.ceil(total / pagination.limit),
    };
};

const validateTemplateForSending = async (socialAccountId: string, templateName: string, templateLanguage: string) => {
    const template = await prisma.whatsAppTemplate.findFirst({
        where: {
            socialAccountId,
            name: templateName,
            language: templateLanguage,
        },
    });

    if (template && template.status && template.status.toUpperCase() !== "APPROVED") {
        fail("Selected WhatsApp template is not approved", 400);
    }

    return template;
};

export const scheduleWhatsAppTemplateMessage = async (userId: string, body: ScheduleWhatsAppTemplateMessageInput) => {
    const input = scheduleWhatsAppTemplateMessageSchema.parse(body);
    const account = await assertWhatsAppAccountOwner(userId, input.socialAccountId);

    let contact = null;

    if (input.contactId) {
        contact = await prisma.whatsAppContact.findFirst({
            where: {
                id: input.contactId,
                userId,
                socialAccountId: account.id,
            },
        });

        if (!contact) {
            fail("WhatsApp contact not found", 404);
        }

        if (contact.isBlocked) {
            fail("This contact is blocked", 400);
        }
    }

    await validateTemplateForSending(account.id, input.templateName, input.templateLanguage);

    return prisma.whatsAppScheduledMessage.create({
        data: {
            userId,
            socialAccountId: account.id,
            contactId: contact?.id,
            recipientPhone: input.recipientPhone,
            templateName: input.templateName,
            templateLanguage: input.templateLanguage,
            templateParams: toJson(input.templateParams),
            scheduledAt: input.scheduledAt,
            status: WhatsAppScheduledMessageStatus.QUEUED,
        },
    });
};

export const bulkScheduleWhatsAppTemplateMessages = async (
    userId: string,
    body: BulkScheduleWhatsAppTemplateMessagesInput,
) => {
    const input = bulkScheduleWhatsAppTemplateMessagesSchema.parse(body);
    const account = await assertWhatsAppAccountOwner(userId, input.socialAccountId);

    await validateTemplateForSending(account.id, input.templateName, input.templateLanguage);

    const contacts =
        input.contactIds.length > 0
            ? await prisma.whatsAppContact.findMany({
                  where: {
                      id: {
                          in: input.contactIds,
                      },
                      userId,
                      socialAccountId: account.id,
                      isBlocked: false,
                  },
              })
            : [];

    const fromContacts = contacts.map((contact) => ({
        contactId: contact.id,
        recipientPhone: contact.phoneNumber,
    }));

    const fromPhones = input.recipientPhones.map((phone) => ({
        contactId: null,
        recipientPhone: phone,
    }));

    const merged = [...fromContacts, ...fromPhones];
    const seen = new Set<string>();
    const recipients = merged.filter((recipient) => {
        if (seen.has(recipient.recipientPhone)) {
            return false;
        }

        seen.add(recipient.recipientPhone);
        return true;
    });

    if (recipients.length === 0) {
        fail("No valid recipients found", 400);
    }

    await prisma.whatsAppScheduledMessage.createMany({
        data: recipients.map((recipient) => ({
            userId,
            socialAccountId: account.id,
            contactId: recipient.contactId,
            recipientPhone: recipient.recipientPhone,
            templateName: input.templateName,
            templateLanguage: input.templateLanguage,
            templateParams: toJson(input.templateParams),
            scheduledAt: input.scheduledAt,
            status: WhatsAppScheduledMessageStatus.QUEUED,
        })),
    });

    return {
        scheduled: recipients.length,
    };
};

export const sendNowWhatsAppTemplateMessage = async (userId: string, body: SendNowWhatsAppTemplateMessageInput) => {
    const input = sendNowWhatsAppTemplateMessageSchema.parse(body);
    const account = await assertWhatsAppAccountOwner(userId, input.socialAccountId);

    let contact = null;

    if (input.contactId) {
        contact = await prisma.whatsAppContact.findFirst({
            where: {
                id: input.contactId,
                userId,
                socialAccountId: account.id,
            },
        });

        if (!contact) {
            fail("WhatsApp contact not found", 404);
        }

        if (contact.isBlocked) {
            fail("This contact is blocked", 400);
        }
    }

    await validateTemplateForSending(account.id, input.templateName, input.templateLanguage);

    const message = await prisma.whatsAppScheduledMessage.create({
        data: {
            userId,
            socialAccountId: account.id,
            contactId: contact?.id,
            recipientPhone: input.recipientPhone,
            templateName: input.templateName,
            templateLanguage: input.templateLanguage,
            templateParams: toJson(input.templateParams),
            scheduledAt: new Date(),
            status: WhatsAppScheduledMessageStatus.QUEUED,
        },
    });

    try {
        const sentMessage = await sendOneScheduledWhatsAppMessage(message.id);

        return {
            success: true,
            message: sentMessage,
        };
    } catch (error) {
        const normalized = normalizeError(error);

        const failedMessage = await prisma.whatsAppScheduledMessage.findUnique({
            where: {
                id: message.id,
            },
        });

        return {
            success: false,
            message: failedMessage,
            error: normalized.message,
            statusCode: normalized.statusCode,
            code: normalized.code,
            subcode: normalized.subcode,
            fbtraceId: normalized.fbtraceId,
        };
    }
};

export const bulkSendNowWhatsAppTemplateMessages = async (
    userId: string,
    body: BulkSendNowWhatsAppTemplateMessagesInput,
) => {
    const input = bulkSendNowWhatsAppTemplateMessagesSchema.parse(body);
    const account = await assertWhatsAppAccountOwner(userId, input.socialAccountId);

    await validateTemplateForSending(account.id, input.templateName, input.templateLanguage);

    const contacts =
        input.contactIds.length > 0
            ? await prisma.whatsAppContact.findMany({
                  where: {
                      id: {
                          in: input.contactIds,
                      },
                      userId,
                      socialAccountId: account.id,
                      isBlocked: false,
                  },
              })
            : [];

    const fromContacts = contacts.map((contact) => ({
        contactId: contact.id,
        recipientPhone: contact.phoneNumber,
    }));

    const fromPhones = input.recipientPhones.map((phone) => ({
        contactId: null,
        recipientPhone: phone,
    }));

    const merged = [...fromContacts, ...fromPhones];
    const seen = new Set<string>();

    const recipients = merged.filter((recipient) => {
        if (seen.has(recipient.recipientPhone)) {
            return false;
        }

        seen.add(recipient.recipientPhone);
        return true;
    });

    if (recipients.length === 0) {
        fail("No valid recipients found", 400);
    }

    const results = [];

    for (const recipient of recipients) {
        const message = await prisma.whatsAppScheduledMessage.create({
            data: {
                userId,
                socialAccountId: account.id,
                contactId: recipient.contactId,
                recipientPhone: recipient.recipientPhone,
                templateName: input.templateName,
                templateLanguage: input.templateLanguage,
                templateParams: toJson(input.templateParams),
                scheduledAt: new Date(),
                status: WhatsAppScheduledMessageStatus.QUEUED,
            },
        });

        try {
            const sentMessage = await sendOneScheduledWhatsAppMessage(message.id);

            results.push({
                id: message.id,
                recipientPhone: recipient.recipientPhone,
                success: true,
                status: sentMessage.status,
                error: null,
            });
        } catch (error) {
            const normalized = normalizeError(error);

            const failedMessage = await prisma.whatsAppScheduledMessage.findUnique({
                where: {
                    id: message.id,
                },
                select: {
                    status: true,
                },
            });

            results.push({
                id: message.id,
                recipientPhone: recipient.recipientPhone,
                success: false,
                status: failedMessage?.status || "FAILED",
                error: normalized.message,
                statusCode: normalized.statusCode,
                code: normalized.code,
                subcode: normalized.subcode,
                fbtraceId: normalized.fbtraceId,
            });
        }
    }

    const sent = results.filter((result) => result.success).length;
    const failed = results.length - sent;

    return {
        success: failed === 0,
        total: results.length,
        sent,
        failed,
        results,
    };
};

export const listWhatsAppScheduledMessages = async (
    userId: string,
    socialAccountId: string,
    paginationInput: PaginationInput = {},
) => {
    const account = await assertWhatsAppAccountOwner(userId, socialAccountId);
    const pagination = getPagination(paginationInput);

    const where: Prisma.WhatsAppScheduledMessageWhereInput = {
        userId,
        socialAccountId: account.id,
    };

    if (pagination.status) {
        where.status = pagination.status as WhatsAppScheduledMessageStatus;
    }

    if (pagination.q) {
        where.OR = [
            {
                recipientPhone: {
                    contains: pagination.q,
                    mode: "insensitive",
                },
            },
            {
                templateName: {
                    contains: pagination.q,
                    mode: "insensitive",
                },
            },
        ];
    }

    const [items, total] = await Promise.all([
        prisma.whatsAppScheduledMessage.findMany({
            where,
            include: {
                contact: true,
            },
            orderBy: {
                scheduledAt: "desc",
            },
            skip: pagination.skip,
            take: pagination.limit,
        }),
        prisma.whatsAppScheduledMessage.count({
            where,
        }),
    ]);

    return {
        items,
        total,
        page: pagination.page,
        limit: pagination.limit,
        pages: Math.ceil(total / pagination.limit),
    };
};

export const cancelWhatsAppScheduledMessage = async (userId: string, messageId: string) => {
    const message = await prisma.whatsAppScheduledMessage.findFirst({
        where: {
            id: messageId,
            userId,
        },
    });

    if (!message) {
        fail("WhatsApp scheduled message not found", 404);
    }

    await assertWhatsAppAccountOwner(userId, message.socialAccountId);

    if (
        message.status !== WhatsAppScheduledMessageStatus.DRAFT &&
        message.status !== WhatsAppScheduledMessageStatus.QUEUED &&
        message.status !== WhatsAppScheduledMessageStatus.FAILED
    ) {
        fail("This message cannot be cancelled now", 400);
    }

    return prisma.whatsAppScheduledMessage.update({
        where: {
            id: message.id,
        },
        data: {
            status: WhatsAppScheduledMessageStatus.CANCELLED,
        },
    });
};

export const sendWhatsAppTextReply = async (userId: string, body: SendWhatsAppTextReplyInput) => {
    const input = sendWhatsAppTextReplySchema.parse(body);
    const account = await assertWhatsAppAccountOwner(userId, input.socialAccountId);

    const payload = {
        to: input.recipientPhone,
        body: input.content,
    };

    try {
        const response = await sendWhatsAppTextMessage({
            phoneNumberId: account.phoneNumberId as string,
            accessToken: account.accessToken,
            to: input.recipientPhone,
            body: input.content,
        });

        const metaMessageId = getWhatsAppMessageId(response);

        await createMessageLog({
            socialAccountId: account.id,
            direction: WhatsAppMessageDirection.OUTBOUND,
            recipientPhone: input.recipientPhone,
            metaMessageId: metaMessageId || undefined,
            payload,
            response,
            success: true,
            statusCode: 200,
        });

        return {
            success: true,
            metaMessageId,
            response,
        };
    } catch (error) {
        const normalized = normalizeError(error);

        await createMessageLog({
            socialAccountId: account.id,
            direction: WhatsAppMessageDirection.OUTBOUND,
            recipientPhone: input.recipientPhone,
            payload,
            response: normalized.payload,
            success: false,
            statusCode: normalized.statusCode,
            errorMessage: normalized.message,
        });

        throw normalized;
    }
};

export const sendOneScheduledWhatsAppMessage = async (messageId: string) => {
    const message = await prisma.whatsAppScheduledMessage.findUnique({
        where: {
            id: messageId,
        },
        include: {
            socialAccount: true,
        },
    });

    if (!message) {
        fail("WhatsApp scheduled message not found", 404);
    }

    if (message.status === WhatsAppScheduledMessageStatus.SENT) {
        return message;
    }

    if (message.status === WhatsAppScheduledMessageStatus.CANCELLED) {
        return message;
    }

    if (!message.templateName || !message.templateLanguage) {
        fail("Scheduled WhatsApp message is missing template details", 400);
    }

    const account = message.socialAccount;

    if (!account.isActive || account.platform !== WHATSAPP_PLATFORM || !account.phoneNumberId || !account.accessToken) {
        fail("WhatsApp account is not ready for sending", 400);
    }

    await prisma.whatsAppScheduledMessage.update({
        where: {
            id: message.id,
        },
        data: {
            status: WhatsAppScheduledMessageStatus.PROCESSING,
            lastAttemptAt: new Date(),
            retryCount: {
                increment: 1,
            },
            errorMessage: null,
        },
    });

    const payload = {
        to: message.recipientPhone,
        templateName: message.templateName,
        templateLanguage: message.templateLanguage,
        templateParams: message.templateParams,
    };

    try {
        const response = await sendWhatsAppTemplateMessage({
            phoneNumberId: account.phoneNumberId,
            accessToken: account.accessToken,
            to: message.recipientPhone,
            templateName: message.templateName,
            languageCode: message.templateLanguage,
            params: message.templateParams as never,
        });

        const metaMessageId = getWhatsAppMessageId(response);
        const waId = getWhatsAppContactWaId(response);

        const updatedMessage = await prisma.whatsAppScheduledMessage.update({
            where: {
                id: message.id,
            },
            data: {
                status: WhatsAppScheduledMessageStatus.SENT,
                sentAt: new Date(),
                metaMessageId,
                errorMessage: null,
            },
        });

        if (message.contactId && waId) {
            await prisma.whatsAppContact.update({
                where: {
                    id: message.contactId,
                },
                data: {
                    waId,
                },
            });
        }

        await createMessageLog({
            scheduledMessageId: message.id,
            socialAccountId: account.id,
            direction: WhatsAppMessageDirection.OUTBOUND,
            recipientPhone: message.recipientPhone,
            metaMessageId: metaMessageId || undefined,
            payload,
            response,
            success: true,
            statusCode: 200,
        });

        return updatedMessage;
    } catch (error) {
        const normalized = normalizeError(error);

        const failedStatus =
            message.retryCount + 1 >= MAX_RETRY_COUNT
                ? WhatsAppScheduledMessageStatus.FAILED
                : WhatsAppScheduledMessageStatus.QUEUED;

        const updatedMessage = await prisma.whatsAppScheduledMessage.update({
            where: {
                id: message.id,
            },
            data: {
                status: failedStatus,
                errorMessage: normalized.message,
            },
        });

        await createMessageLog({
            scheduledMessageId: message.id,
            socialAccountId: account.id,
            direction: WhatsAppMessageDirection.OUTBOUND,
            recipientPhone: message.recipientPhone,
            payload,
            response: normalized.payload,
            success: false,
            statusCode: normalized.statusCode,
            errorMessage: normalized.message,
        });

        throw normalized;
    }
};

export const processDueWhatsAppMessages = async (limit = 20) => {
    const messages = await prisma.whatsAppScheduledMessage.findMany({
        where: {
            status: WhatsAppScheduledMessageStatus.QUEUED,
            scheduledAt: {
                lte: new Date(),
            },
            retryCount: {
                lt: MAX_RETRY_COUNT,
            },
        },
        orderBy: {
            scheduledAt: "asc",
        },
        take: limit,
        select: {
            id: true,
        },
    });

    const results = [];

    for (const message of messages) {
        try {
            const sent = await sendOneScheduledWhatsAppMessage(message.id);

            results.push({
                id: message.id,
                success: true,
                status: sent.status,
            });
        } catch (error) {
            const normalized = normalizeError(error);

            results.push({
                id: message.id,
                success: false,
                error: normalized.message,
                statusCode: normalized.statusCode,
            });
        }
    }

    return {
        processed: results.length,
        results,
    };
};

export const retryWhatsAppScheduledMessage = async (userId: string, messageId: string) => {
    const message = await prisma.whatsAppScheduledMessage.findFirst({
        where: {
            id: messageId,
            userId,
        },
    });

    if (!message) {
        fail("WhatsApp scheduled message not found", 404);
    }

    await assertWhatsAppAccountOwner(userId, message.socialAccountId);

    if (message.status !== WhatsAppScheduledMessageStatus.FAILED) {
        fail("Only failed messages can be retried manually", 400);
    }

    return prisma.whatsAppScheduledMessage.update({
        where: {
            id: message.id,
        },
        data: {
            status: WhatsAppScheduledMessageStatus.QUEUED,
            retryCount: 0,
            errorMessage: null,
            lastAttemptAt: null,
        },
    });
};
