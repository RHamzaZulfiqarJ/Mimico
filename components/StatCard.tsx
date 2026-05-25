"use client";

import { motion } from "framer-motion";
import { CheckCircle2, PlugZap, Trash2 } from "lucide-react";
import { PLATFORMS } from "@/libs/platform";

interface AccountCardProps {
    platform: string;
    username: string;
    connectedAt?: string;
    loadingDelete?: boolean;
    onDisconnect?: () => void;
}

export default function StatCard({ platform, username, connectedAt, loadingDelete, onDisconnect }: AccountCardProps) {
    const platformInfo = PLATFORMS[platform as keyof typeof PLATFORMS];
    const Icon = platformInfo?.icon;

    return (
        <motion.div
            initial={{ y: 8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            whileHover={{ y: -1 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="linear-card group overflow-hidden"
        >
            <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface-3)] text-[var(--text)] shadow-[var(--shadow-line)]">
                        {Icon ? <Icon className="h-4 w-4" /> : <PlugZap className="h-4 w-4" strokeWidth={1.5} />}
                    </div>

                    <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[var(--text)]">
                            {platformInfo?.name || platform}
                        </p>
                        <p className="truncate text-xs text-[var(--text-muted)]">Connected account</p>
                    </div>
                </div>

                <span className="linear-badge border-[rgba(34,197,94,0.22)] bg-[rgba(34,197,94,0.08)] text-[var(--success)]">
                    <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                    Live
                </span>
            </div>

            <div className="px-4 py-4">
                <h3 className="mb-1 truncate text-lg font-semibold tracking-[-0.03em] text-[var(--text)]">
                    @{username}
                </h3>

                <p className="text-xs leading-5 text-[var(--text-muted)]">
                    {connectedAt
                        ? `Connected on ${new Date(connectedAt).toLocaleDateString()}`
                        : "Ready for publishing and account actions."}
                </p>
            </div>

            <div className="border-t border-[var(--border)] px-4 py-3">
                <button
                    type="button"
                    onClick={onDisconnect}
                    disabled={loadingDelete}
                    className="linear-button-secondary w-full text-[var(--text-soft)] hover:border-[rgba(239,68,68,0.28)] hover:bg-[rgba(239,68,68,0.08)] hover:text-red-300"
                >
                    <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                    {loadingDelete ? "Disconnecting..." : "Disconnect"}
                </button>
            </div>
        </motion.div>
    );
}
