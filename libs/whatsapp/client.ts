export type WhatsAppAccount = {
    id: string;
    accountId: string;
    accountUsername: string;
    businessAccountId: string | null;
    phoneNumberId: string | null;
    phoneNumberDisplay: string | null;
    businessName: string | null;
    createdAt: string;
    updatedAt: string;
};

export type WhatsAppContact = {
    id: string;
    userId: string;
    socialAccountId: string;
    name: string;
    phoneNumber: string;
    waId: string | null;
    isBlocked: boolean;
    createdAt: string;
    updatedAt: string;
};

export type WhatsAppTemplate = {
    id: string;
    socialAccountId: string;
    name: string;
    language: string;
    category: string | null;
    status: string | null;
    components: unknown;
    createdAt: string;
    updatedAt: string;
};

export type WhatsAppScheduledMessageStatus = "DRAFT" | "QUEUED" | "PROCESSING" | "SENT" | "FAILED" | "CANCELLED";

export type WhatsAppScheduledMessage = {
    id: string;
    userId: string;
    socialAccountId: string;
    contactId: string | null;
    recipientPhone: string;
    content: string | null;
    templateName: string | null;
    templateLanguage: string | null;
    templateParams: unknown;
    scheduledAt: string;
    sentAt: string | null;
    status: WhatsAppScheduledMessageStatus;
    retryCount: number;
    errorMessage: string | null;
    metaMessageId: string | null;
    createdAt: string;
    updatedAt: string;
    lastAttemptAt: string | null;
    contact?: WhatsAppContact | null;
};

export type WhatsAppMessageDirection = "OUTBOUND" | "INBOUND" | "STATUS";

export type WhatsAppMessageLog = {
    id: string;
    scheduledMessageId: string | null;
    socialAccountId: string;
    direction: WhatsAppMessageDirection;
    recipientPhone: string | null;
    metaMessageId: string | null;
    payload: unknown;
    response: unknown;
    statusCode: number | null;
    success: boolean;
    errorMessage: string | null;
    webhookEventId: string | null;
    createdAt: string;
    scheduledMessage?: {
        id: string;
        recipientPhone: string;
        templateName: string | null;
        templateLanguage: string | null;
        status: WhatsAppScheduledMessageStatus;
        scheduledAt: string;
        sentAt: string | null;
    } | null;
};

export type PaginatedResponse<T> = {
    items: T[];
    total: number;
    page: number;
    limit: number;
    pages: number;
};

export type ConnectWhatsAppAccountPayload = {
    businessName: string;
    businessAccountId: string;
    phoneNumberId: string;
    phoneNumberDisplay: string;
    accessToken: string;
};

export type ConnectWhatsAppFacebookPayload = {
    code: string;
    wabaId: string;
    phoneNumberId: string;
    businessId?: string | null;
};

export type CreateWhatsAppContactPayload = {
    socialAccountId: string;
    name: string;
    phoneNumber: string;
};

export type ImportWhatsAppContactsPayload = {
    socialAccountId: string;
    contacts: {
        name: string;
        phoneNumber: string;
    }[];
};

export type UpdateWhatsAppContactPayload = {
    name?: string;
    phoneNumber?: string;
    isBlocked?: boolean;
};

export type ScheduleWhatsAppMessagePayload = {
    socialAccountId: string;
    contactId?: string;
    recipientPhone: string;
    templateName: string;
    templateLanguage?: string;
    templateParams?: string[] | Record<string, string | number | boolean>;
    scheduledAt: string;
};

export type BulkScheduleWhatsAppMessagePayload = {
    socialAccountId: string;
    contactIds?: string[];
    recipientPhones?: string[];
    templateName: string;
    templateLanguage?: string;
    templateParams?: string[] | Record<string, string | number | boolean>;
    scheduledAt: string;
};

export type SendWhatsAppTextReplyPayload = {
    socialAccountId: string;
    recipientPhone: string;
    content: string;
};

export type QueryParams = {
    page?: number;
    limit?: number;
    q?: string;
    status?: string;
    direction?: WhatsAppMessageDirection;
    success?: boolean;
};

export type WhatsAppTemplateCategory = "UTILITY" | "MARKETING" | "AUTHENTICATION";

export type CreateWhatsAppTemplatePayload = {
    socialAccountId: string;
    name: string;
    category: WhatsAppTemplateCategory;
    language: string;
    headerText?: string;
    bodyText: string;
    footerText?: string;
    bodyExamples?: string[];
};

export type CreateWhatsAppTemplateResponse = {
    success: boolean;
    template: WhatsAppTemplate;
    meta: {
        id?: string;
        status?: string;
        category?: string;
    };
};

export type SendNowWhatsAppMessageResponse = {
    success: boolean;
    message: WhatsAppScheduledMessage | null;
    error?: string;
    statusCode?: number;
    code?: number;
    subcode?: number;
    fbtraceId?: string;
};

export type BulkSendNowWhatsAppMessageResponse = {
    success: boolean;
    total: number;
    sent: number;
    failed: number;
    results: {
        id: string;
        recipientPhone: string;
        success: boolean;
        status: string;
        error: string | null;
        statusCode?: number;
        code?: number;
        subcode?: number;
        fbtraceId?: string;
    }[];
};

class ApiClientError extends Error {
    status: number;
    data: unknown;

    constructor(message: string, status: number, data: unknown) {
        super(message);
        this.name = "ApiClientError";
        this.status = status;
        this.data = data;
    }
}

const buildQuery = (params: Record<string, string | number | boolean | undefined | null>) => {
    const searchParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
            searchParams.set(key, String(value));
        }
    });

    const query = searchParams.toString();

    return query ? `?${query}` : "";
};

const apiRequest = async <T>(url: string, options: RequestInit = {}): Promise<T> => {
    const response = await fetch(url, {
        ...options,
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
            ...(options.headers || {}),
        },
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
        const message = data && typeof data === "object" && "error" in data ? String(data.error) : "Request failed";

        throw new ApiClientError(message, response.status, data);
    }

    return data as T;
};

export const normalizeTemplateName = (value: string) => {
    return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_ ]/g, "")
        .replace(/\s+/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_+|_+$/g, "");
};

export const extractTemplateVariables = (text: string) => {
    const matches = Array.from(text.matchAll(/\{\{(\d+)\}\}/g));
    const values = matches.map((match) => Number(match[1]));

    return Array.from(new Set(values)).sort((a, b) => a - b);
};

export const buildTemplatePreview = (bodyText: string, examples: string[]) => {
    let preview = bodyText;

    examples.forEach((value, index) => {
        preview = preview.replaceAll(`{{${index + 1}}}`, value || `{{${index + 1}}}`);
    });

    return preview;
};

export const whatsappClient = {
    listAccounts: () => {
        return apiRequest<{ accounts: WhatsAppAccount[] }>("/api/whatsapp/accounts");
    },

    connectAccount: (payload: ConnectWhatsAppAccountPayload) => {
        return apiRequest<{ success: boolean; account: WhatsAppAccount }>("/api/whatsapp/accounts", {
            method: "POST",
            body: JSON.stringify(payload),
        });
    },

    connectFacebookAccount: (payload: ConnectWhatsAppFacebookPayload) => {
        return apiRequest<{ success: boolean; account: WhatsAppAccount }>("/api/whatsapp/accounts/facebook", {
            method: "POST",
            body: JSON.stringify(payload),
        });
    },

    disconnectAccount: (id: string) => {
        return apiRequest<{ success: boolean; account: WhatsAppAccount }>(`/api/whatsapp/accounts/${id}`, {
            method: "DELETE",
        });
    },

    listContacts: (socialAccountId: string, params: QueryParams = {}) => {
        return apiRequest<PaginatedResponse<WhatsAppContact>>(
            `/api/whatsapp/contacts${buildQuery({
                socialAccountId,
                page: params.page,
                limit: params.limit,
                q: params.q,
            })}`,
        );
    },

    createContact: (payload: CreateWhatsAppContactPayload) => {
        return apiRequest<{ success: boolean; contact: WhatsAppContact }>("/api/whatsapp/contacts", {
            method: "POST",
            body: JSON.stringify(payload),
        });
    },

    importContacts: (payload: ImportWhatsAppContactsPayload) => {
        return apiRequest<{ success: boolean; created: number; skipped: number }>("/api/whatsapp/contacts", {
            method: "POST",
            body: JSON.stringify(payload),
        });
    },

    updateContact: (id: string, payload: UpdateWhatsAppContactPayload) => {
        return apiRequest<{ success: boolean; contact: WhatsAppContact }>(`/api/whatsapp/contacts/${id}`, {
            method: "PATCH",
            body: JSON.stringify(payload),
        });
    },

    deleteContact: (id: string) => {
        return apiRequest<{ success: boolean; contact: WhatsAppContact }>(`/api/whatsapp/contacts/${id}`, {
            method: "DELETE",
        });
    },

    listTemplates: (socialAccountId: string, params: QueryParams = {}) => {
        return apiRequest<PaginatedResponse<WhatsAppTemplate>>(
            `/api/whatsapp/templates${buildQuery({
                socialAccountId,
                page: params.page,
                limit: params.limit,
                q: params.q,
                status: params.status,
            })}`,
        );
    },

    createTemplate: (payload: CreateWhatsAppTemplatePayload) => {
        return apiRequest<CreateWhatsAppTemplateResponse>("/api/whatsapp/templates/create", {
            method: "POST",
            body: JSON.stringify(payload),
        });
    },

    syncTemplates: (socialAccountId: string) => {
        return apiRequest<{ success: boolean; synced: number; templates: WhatsAppTemplate[] }>(
            "/api/whatsapp/templates",
            {
                method: "POST",
                body: JSON.stringify({
                    socialAccountId,
                }),
            },
        );
    },

    listScheduledMessages: (socialAccountId: string, params: QueryParams = {}) => {
        return apiRequest<PaginatedResponse<WhatsAppScheduledMessage>>(
            `/api/whatsapp/scheduled-messages${buildQuery({
                socialAccountId,
                page: params.page,
                limit: params.limit,
                q: params.q,
                status: params.status,
            })}`,
        );
    },

    scheduleMessage: (payload: ScheduleWhatsAppMessagePayload) => {
        return apiRequest<{ success: boolean; message: WhatsAppScheduledMessage }>("/api/whatsapp/scheduled-messages", {
            method: "POST",
            body: JSON.stringify(payload),
        });
    },

    bulkScheduleMessages: (payload: BulkScheduleWhatsAppMessagePayload) => {
        return apiRequest<{ success: boolean; scheduled: number }>("/api/whatsapp/scheduled-messages", {
            method: "POST",
            body: JSON.stringify(payload),
        });
    },

    sendNowMessage: (payload: ScheduleWhatsAppMessagePayload) => {
        return apiRequest<SendNowWhatsAppMessageResponse>("/api/whatsapp/send-now", {
            method: "POST",
            body: JSON.stringify({
                socialAccountId: payload.socialAccountId,
                contactId: payload.contactId,
                recipientPhone: payload.recipientPhone,
                templateName: payload.templateName,
                templateLanguage: payload.templateLanguage,
                templateParams: payload.templateParams,
            }),
        });
    },

    bulkSendNowMessages: (payload: BulkScheduleWhatsAppMessagePayload) => {
        return apiRequest<BulkSendNowWhatsAppMessageResponse>("/api/whatsapp/send-now", {
            method: "POST",
            body: JSON.stringify({
                socialAccountId: payload.socialAccountId,
                contactIds: payload.contactIds,
                recipientPhones: payload.recipientPhones,
                templateName: payload.templateName,
                templateLanguage: payload.templateLanguage,
                templateParams: payload.templateParams,
            }),
        });
    },

    cancelScheduledMessage: (id: string) => {
        return apiRequest<{ success: boolean; message: WhatsAppScheduledMessage }>(
            `/api/whatsapp/scheduled-messages/${id}`,
            {
                method: "DELETE",
            },
        );
    },

    retryScheduledMessage: (id: string) => {
        return apiRequest<{ success: boolean; message: WhatsAppScheduledMessage }>(
            `/api/whatsapp/scheduled-messages/${id}`,
            {
                method: "PATCH",
            },
        );
    },

    sendTextReply: (payload: SendWhatsAppTextReplyPayload) => {
        return apiRequest<{ success: boolean; metaMessageId: string | null; response: unknown }>(
            "/api/whatsapp/text-replies",
            {
                method: "POST",
                body: JSON.stringify(payload),
            },
        );
    },

    listLogs: (socialAccountId: string, params: QueryParams = {}) => {
        return apiRequest<PaginatedResponse<WhatsAppMessageLog>>(
            `/api/whatsapp/logs${buildQuery({
                socialAccountId,
                page: params.page,
                limit: params.limit,
                q: params.q,
                direction: params.direction,
                success: params.success,
            })}`,
        );
    },
};

export { ApiClientError };
