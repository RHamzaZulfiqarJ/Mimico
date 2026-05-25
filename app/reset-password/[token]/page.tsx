"use client";

import { FormEvent, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, KeyRound, Loader2, Lock } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import AppLogo from "@/components/AppLogo";

export default function ResetPasswordPage() {
    const router = useRouter();
    const params = useParams();
    const token = typeof params.token === "string" ? params.token : "";
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setLoading(true);
        setMessage("");
        setError("");

        try {
            if (!token) {
                throw new Error("Reset token is missing");
            }

            if (password.length < 8) {
                throw new Error("Password must be at least 8 characters");
            }

            if (password !== confirmPassword) {
                throw new Error("Passwords do not match");
            }

            const res = await fetch("/api/auth/reset-password", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    token,
                    password,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || "Password reset failed");
            }

            setMessage("Password reset successful. Redirecting to login...");
            setPassword("");
            setConfirmPassword("");

            window.setTimeout(() => {
                router.push("/login");
            }, 1500);
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

                    <h1 className="linear-title text-2xl">Create new password</h1>

                    <p className="mt-2 text-sm leading-6 text-[var(--text-soft)]">
                        Your reset link is valid for 15 minutes.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4 px-6 py-6">
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-[var(--text-soft)]">New password</label>

                        <div className="relative">
                            <Lock
                                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]"
                                strokeWidth={1.5}
                            />

                            <input
                                type="password"
                                required
                                minLength={8}
                                value={password}
                                onChange={(event) => setPassword(event.target.value)}
                                placeholder="At least 8 characters"
                                className="linear-input pl-9"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-medium text-[var(--text-soft)]">Confirm password</label>

                        <div className="relative">
                            <KeyRound
                                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]"
                                strokeWidth={1.5}
                            />

                            <input
                                type="password"
                                required
                                minLength={8}
                                value={confirmPassword}
                                onChange={(event) => setConfirmPassword(event.target.value)}
                                placeholder="Repeat new password"
                                className="linear-input pl-9"
                            />
                        </div>
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
                            <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
                        )}
                        Reset password
                    </button>
                </form>
            </motion.section>
        </main>
    );
}
