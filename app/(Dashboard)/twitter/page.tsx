"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
    AlertTriangle,
    CalendarClock,
    CheckCircle2,
    Clock,
    ExternalLink,
    Loader2,
    PlusCircle,
    Power,
    RefreshCw,
    Send,
    XCircle,
} from "lucide-react";
import { BsTwitterX } from "react-icons/bs";
import { useRouter } from "next/navigation";

type SocialAccount = {
    id: string;
    platform: string;
    accountUsername: string;
    createdAt: string;
};

type ScheduledPost = {
    id: string;
    content: string;
    scheduledAt: string;
    postedAt: string | null;
    status: string;
    retryCount: number;
    errorMessage: string | null;
    createdAt: string;
    socialAccount: {
        accountUsername: string;
        platform: string;
    };
};

type Notice = {
    type: "success" | "error";
    message: string;
} | null;

const formatDateTime = (value?: string | null) => {
    if (!value) {
        return "N/A";
    }

    return new Date(value).toLocaleString();
};

const getStatusClass = (status: string) => {
    const value = status.toLowerCase();

    if (value === "posted") {
        return "border-[rgba(34,197,94,0.22)] bg-[rgba(34,197,94,0.08)] text-[var(--success)]";
    }

    if (value === "pending" || value === "processing") {
        return "border-[rgba(245,158,11,0.25)] bg-[rgba(245,158,11,0.08)] text-[var(--warning)]";
    }

    if (value === "failed") {
        return "border-[rgba(239,68,68,0.25)] bg-[rgba(239,68,68,0.08)] text-red-300";
    }

    return "border-[rgba(94,106,210,0.28)] bg-[rgba(94,106,210,0.09)] text-[var(--accent)]";
};

const getErrorMessage = (error: unknown) => {
    if (error instanceof Error) {
        return error.message;
    }

    return "Something went wrong";
};

const getTwitterOAuthErrorMessage = (error: string) => {
    const messages: Record<string, string> = {
        twitter_config: "Twitter client ID is missing in .env",
        missing_code: "Twitter did not return an authorization code",
        missing_code_verifier: "Twitter login session expired. Try connecting again.",
        invalid_state: "Twitter authorization state mismatch. Try connecting again.",
        token_exchange_failed: "Twitter token exchange failed. Check callback URL, client ID, and client secret.",
        profile_fetch_failed: "Twitter profile fetch failed.",
        account_in_use: "This Twitter account is already connected to another user.",
        twitter_callback_failed: "Twitter connection failed. Check your X developer app settings.",
        access_denied: "Twitter authorization was cancelled.",
    };

    return messages[error] || "Twitter connection failed";
};

export default function TwitterPage() {
    const router = useRouter();
    const [accounts, setAccounts] = useState<SocialAccount[]>([]);
    const [posts, setPosts] = useState<ScheduledPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState("");
    const [notice, setNotice] = useState<Notice>(null);

    const twitterPosts = useMemo(() => {
        return posts.filter((post) => {
            return post.socialAccount.platform.toLowerCase() === "twitter";
        });
    }, [posts]);

    const stats = useMemo(() => {
        return {
            accounts: accounts.length,
            pending: twitterPosts.filter((post) => post.status === "pending").length,
            processing: twitterPosts.filter((post) => post.status === "processing").length,
            posted: twitterPosts.filter((post) => post.status === "posted").length,
            failed: twitterPosts.filter((post) => post.status === "failed").length,
        };
    }, [accounts, twitterPosts]);

    const showNotice = (type: "success" | "error", message: string) => {
        setNotice({ type, message });

        window.setTimeout(() => {
            setNotice(null);
        }, 3500);
    };

    const loadData = async () => {
        try {
            setActionLoading("refresh");

            const [accountsRes, postsRes] = await Promise.all([fetch("/api/accounts"), fetch("/api/posts")]);

            if (!accountsRes.ok) {
                throw new Error("Failed to load accounts");
            }

            if (!postsRes.ok) {
                throw new Error("Failed to load posts");
            }

            const accountsData = await accountsRes.json();
            const postsData = await postsRes.json();

            const twitterAccounts = (accountsData.accounts || []).filter((account: SocialAccount) => {
                return account.platform.toLowerCase() === "twitter";
            });

            setAccounts(twitterAccounts);
            setPosts(postsData.posts || []);
        } catch (error) {
            showNotice("error", getErrorMessage(error));
        } finally {
            setLoading(false);
            setActionLoading("");
        }
    };

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const connected = params.get("connected");
        const error = params.get("error");

        loadData();

        if (connected === "true") {
            showNotice("success", "Twitter account connected");
            router.replace("/twitter");
        }

        if (error) {
            showNotice("error", getTwitterOAuthErrorMessage(error));
            router.replace("/twitter");
        }
    }, []);

    const handleConnectTwitter = () => {
        window.location.href = "/api/auth/oauth/twitter";
    };

    const handleDisconnect = async (account: SocialAccount) => {
        const confirmed = window.confirm(`Disconnect Twitter account @${account.accountUsername}?`);

        if (!confirmed) {
            return;
        }

        try {
            setActionLoading(account.id);

            const res = await fetch(`/api/accounts/${account.id}`, {
                method: "DELETE",
            });

            if (!res.ok) {
                const data = await res.json().catch(() => null);
                throw new Error(data?.error || "Failed to disconnect account");
            }

            await loadData();
            showNotice("success", "Twitter account disconnected");
        } catch (error) {
            showNotice("error", getErrorMessage(error));
        } finally {
            setActionLoading("");
        }
    };

    if (loading) {
        return (
            <div className="flex min-h-[65vh] items-center justify-center">
                <div className="linear-card flex items-center gap-3 px-4 py-3">
                    <Loader2 className="h-4 w-4 animate-spin text-[var(--accent)]" strokeWidth={1.5} />
                    <span className="text-sm font-medium text-[var(--text-soft)]">Loading Twitter workspace</span>
                </div>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-5"
        >
            <div className="linear-panel overflow-hidden">
                <div className="border-b border-[var(--border)] px-5 py-4">
                    <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
                        <div className="flex min-w-0 items-center gap-4">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface-3)] text-[var(--text)] shadow-[var(--shadow-line)]">
                                <BsTwitterX className="h-5 w-5" />
                            </div>

                            <div className="min-w-0">
                                <div className="mb-2 flex items-center gap-2">
                                    <span className="linear-badge border-[rgba(94,106,210,0.28)] bg-[rgba(94,106,210,0.09)] text-[var(--accent)]">
                                        Platform page
                                    </span>
                                    <span className="hidden text-xs text-[var(--text-muted)] sm:block">
                                        Twitter-specific management
                                    </span>
                                </div>

                                <h1 className="linear-title text-2xl md:text-3xl">Twitter / X</h1>

                                <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-soft)]">
                                    Manage Twitter connections and track scheduled, posted, processing, and failed X
                                    posts.
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2 sm:flex-row">
                            <button type="button" onClick={handleConnectTwitter} className="linear-button-primary h-9">
                                <PlusCircle className="h-4 w-4" strokeWidth={1.5} />
                                Connect Twitter
                            </button>

                            <button
                                type="button"
                                onClick={() => router.push("/publishing?platform=twitter")}
                                className="linear-button-secondary h-9"
                            >
                                <Send className="h-4 w-4" strokeWidth={1.5} />
                                Compose Post
                            </button>

                            <button
                                type="button"
                                onClick={loadData}
                                disabled={actionLoading === "refresh"}
                                className="linear-button-secondary h-9"
                            >
                                {actionLoading === "refresh" ? (
                                    <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
                                ) : (
                                    <RefreshCw className="h-4 w-4" strokeWidth={1.5} />
                                )}
                                Refresh
                            </button>
                        </div>
                    </div>
                </div>

                <div className="grid border-b border-[var(--border)] md:grid-cols-5">
                    <HeaderMetric label="Accounts" value={stats.accounts} />
                    <HeaderMetric label="Pending" value={stats.pending} />
                    <HeaderMetric label="Processing" value={stats.processing} />
                    <HeaderMetric label="Posted" value={stats.posted} />
                    <HeaderMetric label="Failed" value={stats.failed} />
                </div>

                {notice && (
                    <div
                        className={`mx-5 my-4 flex items-center gap-3 rounded-md border px-3 py-2 text-sm font-medium ${
                            notice.type === "success"
                                ? "border-[rgba(34,197,94,0.24)] bg-[rgba(34,197,94,0.08)] text-[var(--success)]"
                                : "border-[rgba(239,68,68,0.28)] bg-[rgba(239,68,68,0.08)] text-red-300"
                        }`}
                    >
                        {notice.type === "success" ? (
                            <CheckCircle2 className="h-4 w-4" strokeWidth={1.5} />
                        ) : (
                            <XCircle className="h-4 w-4" strokeWidth={1.5} />
                        )}
                        {notice.message}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
                <MetricCard title="Accounts" value={stats.accounts} icon={BsTwitterX} />
                <MetricCard title="Pending" value={stats.pending} icon={Clock} warning={stats.pending > 0} />
                <MetricCard
                    title="Processing"
                    value={stats.processing}
                    icon={CalendarClock}
                    warning={stats.processing > 0}
                />
                <MetricCard title="Posted" value={stats.posted} icon={CheckCircle2} success />
                <MetricCard title="Failed" value={stats.failed} icon={AlertTriangle} danger={stats.failed > 0} />
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                <div className="linear-card overflow-hidden xl:col-span-1">
                    <SectionHeader title="Twitter Accounts" text="Only Twitter / X accounts are shown here." />

                    <div className="divide-y divide-[var(--border)]">
                        {accounts.length === 0 ? (
                            <EmptyState
                                title="No Twitter account connected"
                                text="Connect Twitter to publish or schedule X posts."
                            />
                        ) : (
                            accounts.map((account) => (
                                <div key={account.id} className="space-y-4 p-4">
                                    <div className="flex items-start gap-3">
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface-3)] text-[var(--text)]">
                                            <BsTwitterX className="h-4 w-4" />
                                        </div>

                                        <div className="min-w-0 flex-1">
                                            <h3 className="truncate text-sm font-semibold text-[var(--text)]">
                                                @{account.accountUsername}
                                            </h3>
                                            <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
                                                Connected {formatDateTime(account.createdAt)}
                                            </p>
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => handleDisconnect(account)}
                                        disabled={actionLoading === account.id}
                                        className="linear-button-danger w-full"
                                    >
                                        {actionLoading === account.id ? (
                                            <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
                                        ) : (
                                            <Power className="h-4 w-4" strokeWidth={1.5} />
                                        )}
                                        Disconnect
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="linear-card overflow-hidden xl:col-span-2">
                    <SectionHeader
                        title="Twitter Posts"
                        text="Scheduled, posted, processing, and failed Twitter posts."
                    />

                    <div className="divide-y divide-[var(--border)]">
                        {twitterPosts.length === 0 ? (
                            <EmptyState
                                title="No Twitter posts yet"
                                text="Create a post from Publishing Hub and select a Twitter account."
                            />
                        ) : (
                            twitterPosts.map((post) => (
                                <div
                                    key={post.id}
                                    className="space-y-3 p-4 transition-colors hover:bg-[var(--surface-hover)]"
                                >
                                    <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                                        <div className="min-w-0">
                                            <h3 className="text-sm font-semibold text-[var(--text)]">
                                                @{post.socialAccount.accountUsername}
                                            </h3>

                                            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--text-soft)]">
                                                {post.content}
                                            </p>

                                            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-[var(--text-muted)]">
                                                <span>Scheduled: {formatDateTime(post.scheduledAt)}</span>
                                                {post.postedAt && <span>Posted: {formatDateTime(post.postedAt)}</span>}
                                                {post.retryCount > 0 && <span>Retries: {post.retryCount}</span>}
                                            </div>
                                        </div>

                                        <span
                                            className={`linear-badge shrink-0 uppercase ${getStatusClass(post.status)}`}
                                        >
                                            {post.status}
                                        </span>
                                    </div>

                                    {post.errorMessage && (
                                        <div className="rounded-md border border-[rgba(239,68,68,0.25)] bg-[rgba(239,68,68,0.08)] p-3 text-sm leading-6 text-red-200">
                                            {post.errorMessage}
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            <div className="linear-card p-4">
                <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[rgba(94,106,210,0.28)] bg-[rgba(94,106,210,0.09)] text-[var(--accent)]">
                        <ExternalLink className="h-4 w-4" strokeWidth={1.5} />
                    </div>

                    <div>
                        <h3 className="text-sm font-semibold text-[var(--text)]">Twitter page rule</h3>
                        <p className="mt-1 text-sm leading-6 text-[var(--text-soft)]">
                            This page only manages Twitter/X accounts and Twitter posts. Mastodon, Threads, and WhatsApp
                            stay separate.
                        </p>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

function HeaderMetric({ label, value }: { label: string; value: number }) {
    return (
        <div className="border-r border-[var(--border)] px-5 py-4 last:border-r-0">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--text-muted)]">{label}</p>
            <p className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-[var(--text)]">{value}</p>
        </div>
    );
}

function MetricCard({
    title,
    value,
    icon: Icon,
    danger = false,
    warning = false,
    success = false,
}: {
    title: string;
    value: number;
    icon: React.ElementType;
    danger?: boolean;
    warning?: boolean;
    success?: boolean;
}) {
    const colorClass = danger
        ? "border-[rgba(239,68,68,0.25)] bg-[rgba(239,68,68,0.08)] text-red-300"
        : warning
          ? "border-[rgba(245,158,11,0.25)] bg-[rgba(245,158,11,0.08)] text-[var(--warning)]"
          : success
            ? "border-[rgba(34,197,94,0.22)] bg-[rgba(34,197,94,0.08)] text-[var(--success)]"
            : "border-[rgba(94,106,210,0.28)] bg-[rgba(94,106,210,0.09)] text-[var(--accent)]";

    return (
        <motion.div
            whileHover={{ y: -1 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="linear-card p-4"
        >
            <div className="flex items-center justify-between gap-4">
                <div>
                    <p className="text-sm font-medium text-[var(--text-soft)]">{title}</p>
                    <h3 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-[var(--text)]">{value}</h3>
                </div>

                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md border ${colorClass}`}>
                    <Icon className="h-5 w-5" strokeWidth={1.5} />
                </div>
            </div>
        </motion.div>
    );
}

function SectionHeader({ title, text }: { title: string; text: string }) {
    return (
        <div className="border-b border-[var(--border)] bg-[var(--surface-hover)] px-4 py-3">
            <h2 className="text-sm font-semibold text-[var(--text)]">{title}</h2>
            <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">{text}</p>
        </div>
    );
}

function EmptyState({ title, text }: { title: string; text: string }) {
    return (
        <div className="px-6 py-12 text-center">
            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--canvas)] text-[var(--text-muted)]">
                <BsTwitterX className="h-5 w-5" />
            </div>

            <h3 className="text-sm font-semibold text-[var(--text)]">{title}</h3>

            <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-[var(--text-muted)]">{text}</p>
        </div>
    );
}
