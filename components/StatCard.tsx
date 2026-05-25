"use client";

import { motion } from "framer-motion";
import { CheckCircle } from "lucide-react";
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
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            whileHover={{ y: -2 }}
            className="glass p-6 rounded-2xl border border-white/10 group"
        >
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                    {Icon && <Icon className={platformInfo.color} />}
                    <p className="text-sm uppercase tracking-wide text-gray-400">{platformInfo?.name || platform}</p>
                </div>

                <CheckCircle className="text-emerald-500 w-5 h-5" />
            </div>

            <h3 className="text-xl font-semibold text-white mb-5 transition">@{username}</h3>

            <button
                onClick={onDisconnect}
                disabled={loadingDelete}
                className="items-center gap-2 px-4 py-2.5 w-full rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold transition-all shadow-lg shadow-purple-600/20 disabled:opacity-60"
            >
                {loadingDelete ? "Disconnecting..." : "Disconnect"}
            </button>

            {connectedAt && (
                <p className="text-sm text-gray-400 mt-4 -mb-3 text-end">
                    Connected on {new Date(connectedAt).toLocaleDateString()}
                </p>
            )}
        </motion.div>
    );
}
