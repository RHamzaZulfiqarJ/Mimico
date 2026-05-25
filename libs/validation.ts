import { z } from "zod";

export const signupSchema = z.object({
    firstName: z.string().trim().min(1),
    lastName: z.string().trim().min(1),
    email: z.string().trim().email(),
    password: z.string().min(8),
});

export const loginSchema = z.object({
    email: z.string().trim().email(),
    password: z.string().min(8),
});

export const forgotPasswordSchema = z.object({
    email: z.string().trim().email(),
});

export const resetPasswordSchema = z.object({
    token: z
        .string()
        .trim()
        .length(64)
        .regex(/^[a-f0-9]+$/i),
    password: z.string().min(8),
});

export const createPostSchema = z
    .object({
        content: z.string().trim().min(1).max(10000),
        accountIds: z.array(z.string().uuid()).min(1).max(20),
        scheduledAt: z.string().datetime().nullable().optional(),
    })
    .strict();
