const META_GRAPH_BASE_URL = "https://graph.facebook.com";

type MetaPrimitive = string | number | boolean;

export type WhatsAppTemplateParams = MetaPrimitive[] | Record<string, MetaPrimitive>;

export type SendWhatsAppTemplateMessageInput = {
    phoneNumberId: string;
    accessToken: string;
    to: string;
    templateName: string;
    languageCode?: string;
    params?: WhatsAppTemplateParams;
};

export type SendWhatsAppTextMessageInput = {
    phoneNumberId: string;
    accessToken: string;
    to: string;
    body: string;
    previewUrl?: boolean;
};

export type FetchWhatsAppTemplatesInput = {
    businessAccountId: string;
    accessToken: string;
    limit?: number;
    after?: string;
};

export type VerifyWhatsAppPhoneNumberInput = {
    phoneNumberId: string;
    accessToken: string;
};

export type FetchWhatsAppBusinessPhoneNumbersInput = {
    businessAccountId: string;
    accessToken: string;
    limit?: number;
    after?: string;
};

export type WhatsAppMessageResponse = {
    messaging_product?: string;
    contacts?: {
        input?: string;
        wa_id?: string;
    }[];
    messages?: {
        id?: string;
        message_status?: string;
    }[];
};

export type WhatsAppTemplate = {
    id?: string;
    name: string;
    language: string;
    status?: string;
    category?: string;
    components?: unknown;
};

export type WhatsAppTemplateListResponse = {
    data: WhatsAppTemplate[];
    paging?: {
        cursors?: {
            before?: string;
            after?: string;
        };
        next?: string;
        previous?: string;
    };
};

export type WhatsAppPhoneNumber = {
    id: string;
    display_phone_number?: string;
    verified_name?: string;
    quality_rating?: string;
    code_verification_status?: string;
};

export type WhatsAppPhoneNumberListResponse = {
    data: WhatsAppPhoneNumber[];
    paging?: {
        cursors?: {
            before?: string;
            after?: string;
        };
        next?: string;
        previous?: string;
    };
};

type MetaErrorPayload = {
    error?: {
        message?: string;
        type?: string;
        code?: number;
        error_subcode?: number;
        fbtrace_id?: string;
        error_data?: unknown;
    };
};

type MetaRequestInput = {
    path: string;
    accessToken: string;
    method?: "GET" | "POST" | "DELETE";
    body?: unknown;
    query?: Record<string, string | number | boolean | undefined | null>;
};

export class WhatsAppApiError extends Error {
    statusCode: number;
    code?: number;
    subcode?: number;
    fbtraceId?: string;
    payload?: unknown;

    constructor(
        message: string,
        statusCode: number,
        code?: number,
        subcode?: number,
        fbtraceId?: string,
        payload?: unknown,
    ) {
        super(message);
        this.name = "WhatsAppApiError";
        this.statusCode = statusCode;
        this.code = code;
        this.subcode = subcode;
        this.fbtraceId = fbtraceId;
        this.payload = payload;
    }
}

export type WhatsAppTemplateCategory = "UTILITY" | "MARKETING" | "AUTHENTICATION";

export type CreateWhatsAppTemplateInput = {
    businessAccountId: string;
    accessToken: string;
    name: string;
    category: WhatsAppTemplateCategory;
    language: string;
    headerText?: string;
    bodyText: string;
    footerText?: string;
    bodyExamples?: string[];
};

export type CreateWhatsAppTemplateResponse = {
    id?: string;
    status?: string;
    category?: string;
};

export const getMetaGraphApiVersion = () => {
    return process.env.META_GRAPH_API_VERSION || "v25.0";
};

const buildMetaUrl = (path: string, query?: Record<string, string | number | boolean | undefined | null>) => {
    const cleanPath = path.replace(/^\/+/, "");
    const url = new URL(`${META_GRAPH_BASE_URL}/${getMetaGraphApiVersion()}/${cleanPath}`);

    if (query) {
        Object.entries(query).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                url.searchParams.set(key, String(value));
            }
        });
    }

    return url.toString();
};

const readJson = async (response: Response) => {
    const text = await response.text();

    if (!text) {
        return null;
    }

    try {
        return JSON.parse(text);
    } catch {
        return text;
    }
};

const metaRequest = async <T>(input: MetaRequestInput): Promise<T> => {
    const response = await fetch(buildMetaUrl(input.path, input.query), {
        method: input.method || "GET",
        headers: {
            Authorization: `Bearer ${input.accessToken}`,
            "Content-Type": "application/json",
        },
        body: input.body === undefined ? undefined : JSON.stringify(input.body),
        cache: "no-store",
    });

    const payload = await readJson(response);

    if (!response.ok) {
        const errorPayload = payload as MetaErrorPayload;
        const metaError = errorPayload?.error;
        const message = metaError?.message || `WhatsApp API request failed with status ${response.status}`;

        throw new WhatsAppApiError(
            message,
            response.status,
            metaError?.code,
            metaError?.error_subcode,
            metaError?.fbtrace_id,
            payload,
        );
    }

    return payload as T;
};

const toText = (value: MetaPrimitive) => {
    return String(value).trim();
};

const buildTemplateCreationComponents = (input: CreateWhatsAppTemplateInput) => {
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

const buildTemplateComponents = (params?: WhatsAppTemplateParams) => {
    if (!params) {
        return undefined;
    }

    if (Array.isArray(params)) {
        const parameters = params.map((value) => ({
            type: "text",
            text: toText(value),
        }));

        if (parameters.length === 0) {
            return undefined;
        }

        return [
            {
                type: "body",
                parameters,
            },
        ];
    }

    const parameters = Object.entries(params).map(([key, value]) => ({
        type: "text",
        parameter_name: key,
        text: toText(value),
    }));

    if (parameters.length === 0) {
        return undefined;
    }

    return [
        {
            type: "body",
            parameters,
        },
    ];
};

export const sendWhatsAppTemplateMessage = async (input: SendWhatsAppTemplateMessageInput) => {
    const components = buildTemplateComponents(input.params);

    return metaRequest<WhatsAppMessageResponse>({
        path: `${input.phoneNumberId}/messages`,
        method: "POST",
        accessToken: input.accessToken,
        body: {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: input.to,
            type: "template",
            template: {
                name: input.templateName,
                language: {
                    code: input.languageCode || "en_US",
                },
                ...(components ? { components } : {}),
            },
        },
    });
};

export const sendWhatsAppTextMessage = async (input: SendWhatsAppTextMessageInput) => {
    return metaRequest<WhatsAppMessageResponse>({
        path: `${input.phoneNumberId}/messages`,
        method: "POST",
        accessToken: input.accessToken,
        body: {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: input.to,
            type: "text",
            text: {
                preview_url: input.previewUrl ?? false,
                body: input.body,
            },
        },
    });
};

export const createWhatsAppTemplate = async (input: CreateWhatsAppTemplateInput) => {
    return metaRequest<CreateWhatsAppTemplateResponse>({
        path: `${input.businessAccountId}/message_templates`,
        method: "POST",
        accessToken: input.accessToken,
        body: {
            name: input.name,
            category: input.category,
            language: input.language,
            components: buildTemplateCreationComponents(input),
        },
    });
};

export const fetchWhatsAppTemplates = async (input: FetchWhatsAppTemplatesInput) => {
    return metaRequest<WhatsAppTemplateListResponse>({
        path: `${input.businessAccountId}/message_templates`,
        accessToken: input.accessToken,
        query: {
            fields: "id,name,language,status,category,components",
            limit: input.limit || 100,
            after: input.after,
        },
    });
};

export const verifyWhatsAppPhoneNumber = async (input: VerifyWhatsAppPhoneNumberInput) => {
    return metaRequest<WhatsAppPhoneNumber>({
        path: input.phoneNumberId,
        accessToken: input.accessToken,
        query: {
            fields: "id,display_phone_number,verified_name,quality_rating,code_verification_status",
        },
    });
};

export const fetchWhatsAppBusinessPhoneNumbers = async (input: FetchWhatsAppBusinessPhoneNumbersInput) => {
    return metaRequest<WhatsAppPhoneNumberListResponse>({
        path: `${input.businessAccountId}/phone_numbers`,
        accessToken: input.accessToken,
        query: {
            fields: "id,display_phone_number,verified_name,quality_rating,code_verification_status",
            limit: input.limit || 100,
            after: input.after,
        },
    });
};

export const getWhatsAppMessageId = (response: WhatsAppMessageResponse) => {
    return response.messages?.[0]?.id || null;
};

export const getWhatsAppContactWaId = (response: WhatsAppMessageResponse) => {
    return response.contacts?.[0]?.wa_id || null;
};
