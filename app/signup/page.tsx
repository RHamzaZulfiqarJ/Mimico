"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { FaGoogle } from "react-icons/fa";
import { ArrowLeft, ArrowRight, Check, Lock, Mail, Share2, User } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import AppLogo from "@/components/AppLogo";

export default function SignupPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);
        setError("");

        const form = e.currentTarget;
        const firstName = form.firstName.value;
        const lastName = form.lastName.value;
        const email = form.email.value;
        const password = form.password.value;

        const res = await fetch("/api/auth/signup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ firstName, lastName, email, password }),
        });

        if (!res.ok) {
            const data = await res.json();
            setError(data.message || "Signup failed");
            setLoading(false);
            return;
        }

        setLoading(false);
        router.push("/dashboard");
    }

    const handleOAuth = () => {
        window.location.href = "/api/auth/oauth/google";
    };

    return (
        <main className="linear-page relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
            <div className="pointer-events-none absolute inset-0 linear-grid-bg opacity-40" />

            <div className="fixed left-4 right-4 top-4 z-20 flex items-center justify-between md:left-8 md:right-8">
                <button type="button" onClick={() => router.push("/")} className="linear-button-secondary">
                    <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
                    Home
                </button>

                <ThemeToggle />
            </div>

            <motion.section
                initial={{ opacity: 0, y: 8, scale: 0.985 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                className="linear-panel relative z-10 w-full max-w-[560px] overflow-hidden"
            >
                <div className="border-b border-[var(--border)] px-6 py-6">
                    <button
                        type="button"
                        onClick={() => router.push("/")}
                        className="mb-6 flex items-center gap-3 text-left"
                    >
                        <AppLogo size="lg" />

                        <span>
                            <span className="block text-sm font-semibold tracking-[-0.02em] text-[var(--text)]">
                                MIMICO
                            </span>
                            <span className="block text-xs text-[var(--text-muted)]">Account Manager</span>
                        </span>
                    </button>

                    <h1 className="linear-title text-2xl">Create your workspace</h1>

                    <p className="mt-2 text-sm leading-6 text-[var(--text-soft)]">
                        Start managing connected accounts, scheduled posts, and messaging workflows from one focused
                        dashboard.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4 px-6 py-6">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-[var(--text-soft)]">First name</label>

                            <div className="relative">
                                <input
                                    type="text"
                                    name="firstName"
                                    required
                                    placeholder="Alex"
                                    className="linear-input pl-9"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-medium text-[var(--text-soft)]">Last name</label>

                            <input
                                type="text"
                                name="lastName"
                                required
                                placeholder="Doe"
                                className="linear-input"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-medium text-[var(--text-soft)]">Email address</label>

                        <div className="relative">
                            <input
                                type="email"
                                name="email"
                                required
                                placeholder="you@example.com"
                                className="linear-input pl-9"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-medium text-[var(--text-soft)]">Password</label>

                        <div className="relative">
                            <input
                                type="password"
                                name="password"
                                required
                                placeholder="At least 8 characters"
                                className="linear-input pl-9"
                            />
                        </div>
                    </div>

                    <div className="grid gap-2 rounded-lg border border-[var(--border)] bg-[var(--canvas)] p-3 sm:grid-cols-3">
                        {["Secure auth", "OAuth ready", "Fast setup"].map((item) => (
                            <div key={item} className="flex items-center gap-2 text-xs text-[var(--text-soft)]">
                                <span className="flex h-4 w-4 items-center justify-center rounded-full border border-[rgba(34,197,94,0.24)] bg-[rgba(34,197,94,0.08)] text-[var(--success)]">
                                    <Check className="h-3 w-3" strokeWidth={1.7} />
                                </span>
                                {item}
                            </div>
                        ))}
                    </div>

                    {error && (
                        <div className="rounded-md border border-[rgba(239,68,68,0.28)] bg-[rgba(239,68,68,0.08)] px-3 py-2 text-sm text-red-300">
                            {error}
                        </div>
                    )}

                    <button type="submit" disabled={loading} className="linear-button-primary h-10 w-full">
                        {loading ? (
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        ) : (
                            <>
                                Create account
                                <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
                            </>
                        )}
                    </button>

                    <div className="flex items-center gap-3 py-2">
                        <div className="h-px flex-1 bg-[var(--border)]" />
                        <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--text-muted)]">
                            or
                        </span>
                        <div className="h-px flex-1 bg-[var(--border)]" />
                    </div>

                    <button type="button" onClick={handleOAuth} className="linear-button-secondary h-10 w-full">
                        <FaGoogle className="h-4 w-4" />
                        Continue with Google
                    </button>
                </form>

                <div className="border-t border-[var(--border)] px-6 py-4 text-center">
                    <p className="text-sm text-[var(--text-muted)]">
                        Already have an account?{" "}
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
