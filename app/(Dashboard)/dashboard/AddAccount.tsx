"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Calendar } from "lucide-react";

interface ComposeModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function AddAccountModal({ isOpen, onClose }: ComposeModalProps) {
    const [content, setContent] = useState("");
    const [platform, setPlatform] = useState("threads");

    const connectionHandler = () => {
        if (platform === "twitter") {
            window.location.href = "/api/auth/oauth/twitter";
            return;
        }

        if (platform === "mastodon") {
            window.location.href = "/api/auth/oauth/mastodon";
            return;
        }

        if (platform === "threads") {
            window.location.href = "/api/auth/oauth/threads";
            return;
        }

        alert("Option Available Soon");
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl glass rounded-3xl z-[101] shadow-2xl border border-white/10 overflow-hidden"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/5">
                            <h2 className="text-xl font-bold flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center">
                                    <Send className="w-4 h-4 text-white" />
                                </div>
                                Add a new Account
                            </h2>

                            <button onClick={onClose} className="p-2 text-gray-400 hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-8 space-y-6">
                            {/* Platforms */}
                            <div className="flex gap-4">
                                {["threads", "twitter", "mastodon"].map((p) => (
                                    <button
                                        key={p}
                                        onClick={() => setPlatform(p)}
                                        className={`w-full px-4 py-2 rounded-xl text-sm font-semibold capitalize transition-all border ${
                                            platform === p
                                                ? "bg-purple-600 border-purple-400 text-white shadow-lg shadow-purple-600/20"
                                                : "bg-white/5 border-white/5 text-gray-400 hover:text-white hover:bg-white/10"
                                        }`}
                                    >
                                        {p}
                                    </button>
                                ))}
                            </div>

                            {/* Footer buttons */}
                            <div className="flex gap-4 pt-4">
                                <button
                                    onClick={connectionHandler}
                                    className="flex-1 bg-purple-600 hover:bg-purple-500 text-white font-bold py-4 rounded-2xl shadow-xl shadow-purple-600/20 active:scale-95 transition-all"
                                >
                                    Connect
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
