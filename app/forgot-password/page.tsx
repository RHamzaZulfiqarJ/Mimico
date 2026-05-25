"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { AlertTriangle, ArrowLeft, CheckCircle2, Loader2, Send } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import AppLogo from "@/components/AppLogo";

export default function ForgotPasswordPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setLoading(true);
        setMessage("");
        setError("");

        try {
            const res = await fetch("/api/auth/forgot-password", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    email,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || data.message || "Request failed");
            }

            setMessage(data.message);
        } catch (error) {
            setError(error instanceof Error ? error.message : "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="linear-page relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
            <div className="pointer-events-none absolute inset-0 linear-grid-bg opacity-40" />

            <div className="fixed left-4 right-4 top-4 z-20 flex items-center justify-between md:left-8 md:right-8">
                <button type="button" onClick={() => router.push("/login")} className="linear-button-secondary">
                    <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
                    Login
                </button>

                <ThemeToggle />
            </div>

            <motion.section
                initial={{ opacity: 0, y: 8, scale: 0.985 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                className="linear-panel relative z-10 w-full max-w-[430px] overflow-hidden"
            >
                <div className="border-b border-[var(--border)] px-6 py-6">
                    <button
                        type="button"
                        onClick={() => router.push("/")}
                        className="mb-6 flex items-center gap-3 text-left"
                    >
                        <AppLogo size="md" />

                        <span>
                            <span className="block text-sm font-semibold tracking-[-0.02em] text-[var(--text)]">
                                MIMICO
                            </span>
                            <span className="block text-xs text-[var(--text-muted)]">Account Manager</span>
                        </span>
                    </button>

                    <h1 className="linear-title text-2xl">Reset your password</h1>

                    <p className="mt-2 text-sm leading-6 text-[var(--text-soft)]">
                        Enter your account email and we will send a secure reset link.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4 px-6 py-6">
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-[var(--text-soft)]">Email address</label>

                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            placeholder="you@example.com"
                            className="linear-input"
                        />
                    </div>

                    {message && (
                        <div className="flex items-start gap-3 rounded-md border border-[rgba(34,197,94,0.24)] bg-[rgba(34,197,94,0.08)] px-3 py-2 text-sm font-medium text-[var(--success)]">
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.5} />
                            <span>{message}</span>
                        </div>
                    )}

                    {error && (
                        <div className="flex items-start gap-3 rounded-md border border-[rgba(239,68,68,0.28)] bg-[rgba(239,68,68,0.08)] px-3 py-2 text-sm font-medium text-red-300">
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.5} />
                            <span>{error}</span>
                        </div>
                    )}

                    <button type="submit" disabled={loading} className="linear-button-primary h-10 w-full">
                        {loading ? (
                            <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
                        ) : (
                            <Send className="h-4 w-4" strokeWidth={1.5} />
                        )}
                        Send reset link
                    </button>
                </form>

                <div className="border-t border-[var(--border)] px-6 py-4 text-center">
                    <p className="text-sm text-[var(--text-muted)]">
                        Remembered your password?{" "}
                        <button
                            type="button"
                            onClick={() => router.push("/login")}
                            className="font-medium text-[var(--accent)] hover:text-[var(--accent-hover)]"
                        >
                            Sign in
                        </button>
                    </p>
                </div>
            </motion.section>
        </main>
    );
}
