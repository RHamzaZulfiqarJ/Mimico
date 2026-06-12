import { z, type ZodError, type ZodTypeAny } from "zod";

const uuidSchema = z.string().uuid("Invalid ID");
const digitIdSchema = z
    .string()
    .trim()
    .regex(/^\d{5,30}$/, "Invalid Meta ID");
const tokenSchema = z.string().trim().min(20, "Access token is too short").max(1000, "Access token is too long");
const nameSchema = z.string().trim().min(1, "Name is required").max(80, "Name is too long");
const businessNameSchema = z.string().trim().min(1, "Business name is required").max(120, "Business name is too long");
const templateNameSchema = z
    .string()
    .trim()
    .min(1, "Template name is required")
    .max(512, "Template name is too long")
    .regex(/^[a-z0-9_]+$/, "Template name must use lowercase letters, numbers, and underscores only");
const languageSchema = z
    .string()
    .trim()
    .min(2, "Language is required")
    .max(10, "Language is too long")
    .regex(/^[a-z]{2}(_[A-Z]{2})?$/, "Invalid template language code");
const futureDateSchema = z.coerce
    .date()
    .refine((value) => value.getTime() > Date.now() + 60_000, "Schedule time must be at least 1 minute in the future");

export const normalizeWhatsAppPhone = (value: string) => {
    let phone = value.trim().replace(/[\s().-]/g, "");

    if (phone.startsWith("+")) {
        phone = phone.slice(1);
    }

    if (phone.startsWith("00")) {
        phone = phone.slice(2);
    }

    return phone;
};

export const whatsAppPhoneSchema = z
    .string()
    .trim()
    .min(8, "Phone number is too short")
    .max(20, "Phone number is too long")
    .transform(normalizeWhatsAppPhone)
    .pipe(z.string().regex(/^[1-9]\d{7,14}$/, "Phone number must include country code, for example 923001234567"));

export const whatsAppDisplayPhoneSchema = z
    .string()
    .trim()
    .min(8, "Display phone number is too short")
    .max(25, "Display phone number is too long")
    .refine((value) => /^[+\d][\d\s().-]+$/.test(value), "Invalid display phone number");

export const whatsAppTextBodySchema = z
    .string()
    .trim()
    .min(1, "Message is required")
    .max(4096, "Message cannot exceed 4096 characters");

export const whatsAppTemplateParamValueSchema = z
    .union([z.string(), z.number(), z.boolean()])
    .transform((value) => String(value).trim())
    .pipe(z.string().min(1, "Template parameter cannot be empty").max(1024, "Template parameter is too long"));

export const whatsAppTemplateParamsSchema = z
    .union([
        z.array(whatsAppTemplateParamValueSchema).max(50, "Too many template parameters"),
        z.record(
            z
                .string()
                .trim()
                .min(1)
                .max(80)
                .regex(/^[a-zA-Z0-9_]+$/, "Invalid template parameter key"),
            whatsAppTemplateParamValueSchema,
        ),
    ])
    .optional();

export const connectWhatsAppAccountSchema = z.object({
    businessName: businessNameSchema,
    businessAccountId: digitIdSchema,
    phoneNumberId: digitIdSchema,
    phoneNumberDisplay: whatsAppDisplayPhoneSchema,
    accessToken: tokenSchema,
});

export const createWhatsAppContactSchema = z.object({
    socialAccountId: uuidSchema,
    name: nameSchema,
    phoneNumber: whatsAppPhoneSchema,
});

export const updateWhatsAppContactSchema = z
    .object({
        name: nameSchema.optional(),
        phoneNumber: whatsAppPhoneSchema.optional(),
        isBlocked: z.boolean().optional(),
    })
    .refine((value) => Object.keys(value).length > 0, "At least one field is required");

export const importWhatsAppContactsSchema = z
    .object({
        socialAccountId: uuidSchema,
        contacts: z
            .array(
                z.object({
                    name: nameSchema,
                    phoneNumber: whatsAppPhoneSchema,
                }),
            )
            .min(1, "At least one contact is required")
            .max(1000, "You can import maximum 1000 contacts at a time"),
    })
    .transform((value) => {
        const seen = new Set<string>();
        const contacts = value.contacts.filter((contact) => {
            if (seen.has(contact.phoneNumber)) {
                return false;
            }

            seen.add(contact.phoneNumber);
            return true;
        });

        return {
            ...value,
            contacts,
        };
    });

export const upsertWhatsAppTemplateSchema = z.object({
    socialAccountId: uuidSchema,
    name: templateNameSchema,
    language: languageSchema.default("en_US"),
    category: z.string().trim().min(1).max(50).optional(),
    status: z.string().trim().min(1).max(50).optional(),
    components: z.unknown().optional(),
});

export const scheduleWhatsAppTemplateMessageSchema = z.object({
    socialAccountId: uuidSchema,
    contactId: uuidSchema.optional(),
    recipientPhone: whatsAppPhoneSchema,
    templateName: templateNameSchema,
    templateLanguage: languageSchema.default("en_US"),
    templateParams: whatsAppTemplateParamsSchema,
    scheduledAt: futureDateSchema,
});

export const bulkScheduleWhatsAppTemplateMessagesSchema = z
    .object({
        socialAccountId: uuidSchema,
        contactIds: z.array(uuidSchema).max(1000, "Too many contacts selected").default([]),
        recipientPhones: z.array(whatsAppPhoneSchema).max(1000, "Too many phone numbers selected").default([]),
        templateName: templateNameSchema,
        templateLanguage: languageSchema.default("en_US"),
        templateParams: whatsAppTemplateParamsSchema,
        scheduledAt: futureDateSchema,
    })
    .superRefine((value, ctx) => {
        if (value.contactIds.length === 0 && value.recipientPhones.length === 0) {
            ctx.addIssue({
                code: "custom",
                path: ["recipients"],
                message: "Select at least one contact or phone number",
            });
        }

        if (value.contactIds.length + value.recipientPhones.length > 1000) {
            ctx.addIssue({
                code: "custom",
                path: ["recipients"],
                message: "You can schedule maximum 1000 recipients at a time",
            });
        }
    })
    .transform((value) => ({
        ...value,
        contactIds: Array.from(new Set(value.contactIds)),
        recipientPhones: Array.from(new Set(value.recipientPhones)),
    }));

export const sendWhatsAppTextReplySchema = z.object({
    socialAccountId: uuidSchema,
    recipientPhone: whatsAppPhoneSchema,
    content: whatsAppTextBodySchema,
});

export const whatsAppMessageIdSchema = z.object({
    id: uuidSchema,
});

export const cancelWhatsAppScheduledMessageSchema = z.object({
    id: uuidSchema,
});

export const retryWhatsAppScheduledMessageSchema = z.object({
    id: uuidSchema,
});

export const whatsAppWebhookVerifySchema = z.object({
    "hub.mode": z.literal("subscribe"),
    "hub.verify_token": z.string().trim().min(1),
    "hub.challenge": z.string().trim().min(1),
});

export const whatsAppPaginationSchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    q: z.string().trim().max(100).optional(),
    status: z.string().trim().max(50).optional(),
});

export const formatZodError = (error: ZodError) => {
    return error.issues
        .map((issue) => {
            const path = issue.path.length > 0 ? issue.path.join(".") : "body";
            return `${path}: ${issue.message}`;
        })
        .join(", ");
};

export const validateBody = <T extends ZodTypeAny>(schema: T, body: unknown): z.infer<T> => {
    const result = schema.safeParse(body);

    if (!result.success) {
        throw new Error(formatZodError(result.error));
    }

    return result.data;
};

const templateCategorySchema = z.enum(["UTILITY", "MARKETING", "AUTHENTICATION"]);
const templateBodySchema = z.string().trim().min(1, "Template body is required").max(1024, "Template body is too long");
const templateHeaderSchema = z.string().trim().max(60, "Header is too long").optional();
const templateFooterSchema = z.string().trim().max(60, "Footer is too long").optional();

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

export const validateSequentialVariables = (variables: number[]) => {
    return variables.every((value, index) => value === index + 1);
};

export const createWhatsAppTemplateSchema = z
    .object({
        socialAccountId: uuidSchema,
        name: z
            .string()
            .trim()
            .min(1, "Template name is required")
            .max(512, "Template name is too long")
            .transform(normalizeTemplateName)
            .pipe(
                z
                    .string()
                    .min(1, "Template name is required")
                    .regex(/^[a-z0-9_]+$/, "Template name must use lowercase letters, numbers, and underscores only"),
            ),
        category: templateCategorySchema.default("UTILITY"),
        language: languageSchema.default("en_US"),
        headerText: templateHeaderSchema,
        bodyText: templateBodySchema,
        footerText: templateFooterSchema,
        bodyExamples: z.array(z.string().trim().min(1).max(200)).max(20).default([]),
    })
    .superRefine((value, ctx) => {
        const variables = extractTemplateVariables(value.bodyText);

        if (variables.length > 10) {
            ctx.addIssue({
                code: "custom",
                path: ["bodyText"],
                message: "Maximum 10 variables are allowed in one template",
            });
        }

        if (!validateSequentialVariables(variables)) {
            ctx.addIssue({
                code: "custom",
                path: ["bodyText"],
                message: "Template variables must be sequential like {{1}}, {{2}}, {{3}}",
            });
        }

        if (variables.length > 0 && value.bodyExamples.length !== variables.length) {
            ctx.addIssue({
                code: "custom",
                path: ["bodyExamples"],
                message: `This template needs exactly ${variables.length} example value(s)`,
            });
        }

        if (variables.length === 0 && value.bodyExamples.length > 0) {
            ctx.addIssue({
                code: "custom",
                path: ["bodyExamples"],
                message: "Example values are only needed when body has variables",
            });
        }

        if (value.headerText && /\{\{\d+\}\}/.test(value.headerText)) {
            ctx.addIssue({
                code: "custom",
                path: ["headerText"],
                message: "Header variables are not supported in this simple template creator yet",
            });
        }
    });

export const sendNowWhatsAppTemplateMessageSchema = z.object({
    socialAccountId: uuidSchema,
    contactId: uuidSchema.optional(),
    recipientPhone: whatsAppPhoneSchema,
    templateName: templateNameSchema,
    templateLanguage: languageSchema.default("en_US"),
    templateParams: whatsAppTemplateParamsSchema,
});

export const bulkSendNowWhatsAppTemplateMessagesSchema = z
    .object({
        socialAccountId: uuidSchema,
        contactIds: z.array(uuidSchema).max(1000, "Too many contacts selected").default([]),
        recipientPhones: z.array(whatsAppPhoneSchema).max(1000, "Too many phone numbers selected").default([]),
        templateName: templateNameSchema,
        templateLanguage: languageSchema.default("en_US"),
        templateParams: whatsAppTemplateParamsSchema,
    })
    .superRefine((value, ctx) => {
        if (value.contactIds.length === 0 && value.recipientPhones.length === 0) {
            ctx.addIssue({
                code: "custom",
                path: ["recipients"],
                message: "Select at least one contact or phone number",
            });
        }

        if (value.contactIds.length + value.recipientPhones.length > 1000) {
            ctx.addIssue({
                code: "custom",
                path: ["recipients"],
                message: "You can send maximum 1000 recipients at a time",
            });
        }
    })
    .transform((value) => ({
        ...value,
        contactIds: Array.from(new Set(value.contactIds)),
        recipientPhones: Array.from(new Set(value.recipientPhones)),
    }));

export type ConnectWhatsAppAccountInput = z.infer<typeof connectWhatsAppAccountSchema>;
export type CreateWhatsAppContactInput = z.infer<typeof createWhatsAppContactSchema>;
export type UpdateWhatsAppContactInput = z.infer<typeof updateWhatsAppContactSchema>;
export type ImportWhatsAppContactsInput = z.infer<typeof importWhatsAppContactsSchema>;
export type UpsertWhatsAppTemplateInput = z.infer<typeof upsertWhatsAppTemplateSchema>;
export type ScheduleWhatsAppTemplateMessageInput = z.infer<typeof scheduleWhatsAppTemplateMessageSchema>;
export type BulkScheduleWhatsAppTemplateMessagesInput = z.infer<typeof bulkScheduleWhatsAppTemplateMessagesSchema>;
export type SendWhatsAppTextReplyInput = z.infer<typeof sendWhatsAppTextReplySchema>;
export type CreateWhatsAppTemplateInput = z.infer<typeof createWhatsAppTemplateSchema>;
export type SendNowWhatsAppTemplateMessageInput = z.infer<typeof sendNowWhatsAppTemplateMessageSchema>;
export type BulkSendNowWhatsAppTemplateMessagesInput = z.infer<typeof bulkSendNowWhatsAppTemplateMessagesSchema>;