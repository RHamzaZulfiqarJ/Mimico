"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Calendar, CheckCircle2, Clock, Loader2, Send, X } from "lucide-react";
import { PLATFORMS } from "@/libs/platform";

type SocialAccount = {
    id: string;
    platform: keyof typeof PLATFORMS;
    accountUsername: string;
};

type ComposeModalProps = {
    selectedAccounts: string[];
    setSelectedAccounts: (accounts: string[] | ((prev: string[]) => string[])) => void;
    isOpen: boolean;
    onClose: () => void;
    defaultPlatform?: "twitter" | "mastodon" | "all";
};

const MAX_TWITTER_LENGTH = 280;
const MAX_MASTODON_LENGTH = 500;

const getPlatformLimit = (platforms: string[]) => {
    if (platforms.includes("twitter")) {
        return MAX_TWITTER_LENGTH;
    }

    if (platforms.includes("mastodon")) {
        return MAX_MASTODON_LENGTH;
    }

    return MAX_MASTODON_LENGTH;
};

const getErrorMessage = (error: unknown) => {
    if (error instanceof Error) {
        return error.message;
    }

    return "Something went wrong";
};

const getMinScheduleDateTime = () => {
    const date = new Date(Date.now() + 60_000);
    const offset = date.getTimezoneOffset();
    const local = new Date(date.getTime() - offset * 60_000);

    return local.toISOString().slice(0, 16);
};

export default function ComposeModal({
    selectedAccounts,
    setSelectedAccounts,
    isOpen,
    onClose,
    defaultPlatform = "all",
}: ComposeModalProps) {
    const [content, setContent] = useState("");
    const [accounts, setAccounts] = useState<SocialAccount[]>([]);
    const [scheduleAt, setScheduleAt] = useState("");
    const [showScheduler, setShowScheduler] = useState(false);
    const [loading, setLoading] = useState(false);
    const [loadingAccounts, setLoadingAccounts] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successText, setSuccessText] = useState<string | null>(null);

    const filteredAccounts = useMemo(() => {
        const socialAccounts = accounts.filter((account) => {
            return account.platform === "twitter" || account.platform === "mastodon";
        });

        if (defaultPlatform === "twitter") {
            return socialAccounts.filter((account) => account.platform === "twitter");
        }

        if (defaultPlatform === "mastodon") {
            return socialAccounts.filter((account) => account.platform === "mastodon");
        }

        return socialAccounts;
    }, [accounts, defaultPlatform]);

    const selectedAccountObjects = useMemo(() => {
        return filteredAccounts.filter((account) => selectedAccounts.includes(account.id));
    }, [filteredAccounts, selectedAccounts]);

    const selectedPlatforms = useMemo(() => {
        return Array.from(new Set(selectedAccountObjects.map((account) => account.platform)));
    }, [selectedAccountObjects]);

    const characterLimit = useMemo(() => {
        return getPlatformLimit(selectedPlatforms);
    }, [selectedPlatforms]);

    const remainingCharacters = characterLimit - content.length;
    const isOverLimit = remainingCharacters < 0;

    const minScheduleDateTime = useMemo(() => {
        return getMinScheduleDateTime();
    }, [isOpen]);

    const loadAccounts = async () => {
        try {
            setLoadingAccounts(true);

            const res = await fetch("/api/accounts");

            if (!res.ok) {
                throw new Error("Failed to load accounts");
            }

            const data = await res.json();

            const socialOnly = (data.accounts || []).filter((account: SocialAccount) => {
                return account.platform === "twitter" || account.platform === "mastodon";
            });

            setAccounts(socialOnly);
        } catch (error) {
            setError(getErrorMessage(error));
        } finally {
            setLoadingAccounts(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            loadAccounts();
        }
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        setError(null);
        setSuccessText(null);
    }, [isOpen]);

    const toggleAccount = (id: string) => {
        setError(null);

        setSelectedAccounts((previous) => {
            if (previous.includes(id)) {
                return previous.filter((accountId) => accountId !== id);
            }

            return [...previous, id];
        });
    };

    const resetForm = () => {
        setContent("");
        setScheduleAt("");
        setShowScheduler(false);
        setSelectedAccounts([]);
        setError(null);
        setSuccessText(null);
    };

    const validatePost = (requiresSchedule: boolean) => {
        if (!content.trim()) {
            throw new Error("Post content is required");
        }

        if (selectedAccounts.length === 0) {
            throw new Error("Select at least one Twitter or Mastodon account");
        }

        if (isOverLimit) {
            throw new Error(`Post is too long. Limit is ${characterLimit} characters.`);
        }

        if (requiresSchedule && !scheduleAt) {
            throw new Error("Select schedule date and time");
        }

        if (requiresSchedule && new Date(scheduleAt).getTime() <= Date.now()) {
            throw new Error("Schedule time must be in the future");
        }
    };

    const createPost = async (scheduledAt: string | null) => {
        const res = await fetch("/api/posts", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                content: content.trim(),
                accountIds: selectedAccounts,
                scheduledAt,
            }),
        });

        const data = await res.json().catch(() => null);

        if (!res.ok) {
            throw new Error(data?.error || "Failed to create post");
        }

        return data;
    };

    const handlePostNow = async () => {
        try {
            setLoading(true);
            setError(null);
            setSuccessText(null);

            validatePost(false);

            const data = await createPost(null);

            if (data.failed > 0) {
                setSuccessText(`${data.posted} post(s) published, ${data.failed} failed`);
            } else {
                setSuccessText(`${data.posted || selectedAccounts.length} post(s) published instantly`);
            }

            resetForm();
            onClose();
        } catch (error) {
            setError(getErrorMessage(error));
        } finally {
            setLoading(false);
        }
    };

    const handleSchedule = async () => {
        try {
            setLoading(true);
            setError(null);
            setSuccessText(null);

            validatePost(true);

            const data = await createPost(new Date(scheduleAt).toISOString());

            setSuccessText(`${data.created || selectedAccounts.length} post(s) scheduled`);
            resetForm();
            onClose();
        } catch (error) {
            setError(getErrorMessage(error));
        } finally {
            setLoading(false);
        }
    };

    const closeSafely = () => {
        if (loading) {
            return;
        }

        resetForm();
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={closeSafely}
                        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100]"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.94, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.94, y: 20 }}
                        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-3xl max-h-[92vh] overflow-y-auto glass rounded-3xl z-[101] shadow-2xl border border-white/10"
                    >
                        <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/[0.03]">
                            <div>
                                <h2 className="text-xl font-bold text-white flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-purple-600 flex items-center justify-center">
                                        <Send className="w-4 h-4 text-white" />
                                    </div>
                                    Compose Social Post
                                </h2>
                                <p className="text-sm text-gray-400 mt-1">Publish to Twitter/X and Mastodon only.</p>
                            </div>

                            <button
                                onClick={closeSafely}
                                disabled={loading}
                                className="p-2 text-gray-400 hover:text-white disabled:opacity-50 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {error && (
                                <div className="rounded-2xl bg-red-500/10 border border-red-500/20 p-4 flex items-start gap-3 text-red-200">
                                    <AlertTriangle className="w-5 h-5 mt-0.5" />
                                    <p className="text-sm font-semibold">{error}</p>
                                </div>
                            )}

                            {successText && (
                                <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-4 flex items-start gap-3 text-emerald-200">
                                    <CheckCircle2 className="w-5 h-5 mt-0.5" />
                                    <p className="text-sm font-semibold">{successText}</p>
                                </div>
                            )}

                            <div>
                                <div className="flex items-center justify-between gap-3 mb-3">
                                    <h3 className="font-bold text-white">Select accounts</h3>

                                    {selectedAccounts.length > 0 && (
                                        <span className="text-xs px-3 py-1 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-300 font-bold">
                                            {selectedAccounts.length} selected
                                        </span>
                                    )}
                                </div>

                                {loadingAccounts ? (
                                    <div className="rounded-2xl bg-gray-950/40 border border-white/5 p-6 flex items-center justify-center">
                                        <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
                                    </div>
                                ) : filteredAccounts.length === 0 ? (
                                    <div className="rounded-2xl bg-amber-500/10 border border-amber-500/20 p-5">
                                        <p className="font-bold text-amber-200">No social publishing account found</p>
                                        <p className="text-sm text-amber-100/80 mt-1">
                                            Connect Twitter or Mastodon from their platform pages first.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {filteredAccounts.map((account) => {
                                            const platform = PLATFORMS[account.platform];
                                            const Icon = platform?.icon || Send;
                                            const isSelected = selectedAccounts.includes(account.id);

                                            return (
                                                <button
                                                    key={account.id}
                                                    type="button"
                                                    onClick={() => toggleAccount(account.id)}
                                                    className={`p-4 border rounded-2xl text-left transition-all w-full ${
                                                        isSelected
                                                            ? "bg-purple-600 border-purple-400 text-white shadow-lg shadow-purple-600/20"
                                                            : "bg-white/5 border-white/5 text-gray-400 hover:text-white hover:bg-white/10"
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <Icon
                                                            className={`w-5 h-5 ${platform?.color || "text-purple-300"}`}
                                                        />
                                                        <div>
                                                            <p className="font-semibold">
                                                                {platform?.name || account.platform}
                                                            </p>
                                                            <p className="text-xs opacity-70">
                                                                @{account.accountUsername}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            <div>
                                <div className="flex items-center justify-between gap-3 mb-3">
                                    <h3 className="font-bold text-white">Post content</h3>

                                    <span
                                        className={`text-xs font-bold ${
                                            isOverLimit
                                                ? "text-red-400"
                                                : remainingCharacters < 40
                                                  ? "text-amber-300"
                                                  : "text-gray-500"
                                        }`}
                                    >
                                        {remainingCharacters} characters left
                                    </span>
                                </div>

                                <textarea
                                    value={content}
                                    onChange={(event) => {
                                        setContent(event.target.value);
                                        setError(null);
                                    }}
                                    placeholder="Write your post content here..."
                                    className="w-full h-48 bg-gray-950/70 border border-white/10 rounded-2xl p-5 text-gray-100 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500/20 resize-none leading-relaxed"
                                />

                                <div className="flex flex-wrap items-center gap-2 mt-3 text-xs text-gray-500">
                                    <span>Twitter limit: {MAX_TWITTER_LENGTH}</span>
                                    <span>•</span>
                                    <span>Mastodon limit: {MAX_MASTODON_LENGTH}</span>
                                </div>
                            </div>

                            {showScheduler && (
                                <div>
                                    <label className="block text-sm font-bold text-gray-300 mb-2">
                                        Schedule date and time
                                    </label>

                                    <input
                                        type="datetime-local"
                                        min={minScheduleDateTime}
                                        value={scheduleAt}
                                        onChange={(event) => {
                                            setScheduleAt(event.target.value);
                                            setError(null);
                                        }}
                                        className="w-full bg-gray-950/70 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                                    />
                                </div>
                            )}

                            <div className="rounded-2xl bg-gray-950/40 border border-white/5 p-4">
                                <div className="flex items-start gap-3">
                                    <Clock className="w-5 h-5 text-purple-300 mt-0.5" />
                                    <div>
                                        <p className="font-bold text-white">How posting works</p>
                                        <p className="text-sm text-gray-400 mt-1">
                                            Post Now queues the post for immediate cron processing. Schedule saves it
                                            for future publishing.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                                <button
                                    type="button"
                                    disabled={loading}
                                    onClick={() => {
                                        setShowScheduler((current) => !current);
                                        setError(null);
                                    }}
                                    className="flex items-center justify-center gap-3 bg-white/5 hover:bg-white/10 text-white font-bold py-4 rounded-2xl border border-white/5 transition-all disabled:opacity-60"
                                >
                                    <Calendar className="w-5 h-5" />
                                    {showScheduler ? "Hide Schedule" : "Schedule"}
                                </button>

                                {showScheduler ? (
                                    <button
                                        type="button"
                                        disabled={loading || !scheduleAt}
                                        onClick={handleSchedule}
                                        className="flex items-center justify-center gap-3 bg-purple-600 hover:bg-purple-500 text-white font-bold py-4 rounded-2xl shadow-xl shadow-purple-600/20 disabled:opacity-50 transition-all"
                                    >
                                        {loading ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <Calendar className="w-5 h-5" />
                                        )}
                                        Confirm Schedule
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        disabled={loading}
                                        onClick={handlePostNow}
                                        className="flex items-center justify-center gap-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-2xl shadow-xl shadow-emerald-600/20 disabled:opacity-50 transition-all"
                                    >
                                        {loading ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <Send className="w-5 h-5" />
                                        )}
                                        Post Now
                                    </button>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
