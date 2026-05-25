"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
    AlertTriangle,
    ArrowUpRight,
    BarChart3,
    CalendarClock,
    CheckCircle2,
    Clock,
    FileText,
    Loader2,
    MessageCircle,
    RefreshCw,
    Share2,
    Sparkles,
    Users,
    type LucideIcon,
} from "lucide-react";
import {
    ApiClientError,
    whatsappClient,
    type WhatsAppAccount,
    type WhatsAppScheduledMessage,
} from "@/libs/whatsapp/client";

type User = {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
};

type SocialAccount = {
    id: string;
    platform: string;
    accountUsername: string;
    createdAt: string;
};

type SocialPost = {
    id: string;
    content: string;
    scheduledAt: string;
    postedAt: string | null;
    status: string;
    errorMessage?: string | null;
    createdAt: string;
    socialAccount: {
        accountUsername: string;
        platform: string;
    };
};

type WhatsAppSummary = {
    account: WhatsAppAccount;
    contacts: number;
    templates: number;
    approvedTemplates: number;
    queued: number;
    sent: number;
    failed: number;
    recentQueued: WhatsAppScheduledMessage[];
    recentFailed: WhatsAppScheduledMessage[];
};

type Notice = {
    type: "success" | "error";
    message: string;
} | null;

type ActivityItem = {
    id: string;
    title: string;
    subtitle: string;
    status: string;
    time: string;
    type: "social" | "whatsapp";
    isFailed: boolean;
};

const getErrorMessage = (error: unknown) => {
    if (error instanceof ApiClientError) {
        return error.message;
    }

    if (error instanceof Error) {
        return error.message;
    }

    return "Something went wrong";
};

const formatDateTime = (value?: string | null) => {
    if (!value) {
        return "N/A";
    }

    return new Date(value).toLocaleString();
};

const normalizePlatform = (platform: string) => {
    const value = platform.toLowerCase();

    if (value === "twitter") {
        return "Twitter / X";
    }

    if (value === "mastodon") {
        return "Mastodon";
    }

    if (value === "threads") {
        return "Instagram Threads";
    }

    if (value === "whatsapp") {
        return "WhatsApp";
    }

    return platform;
};

const getStatusClass = (status: string) => {
    const value = status.toLowerCase();

    if (value === "posted" || value === "sent") {
        return "border-[rgba(34,197,94,0.22)] bg-[rgba(34,197,94,0.08)] text-[var(--success)]";
    }

    if (value === "pending" || value === "queued" || value === "processing") {
        return "border-[rgba(245,158,11,0.25)] bg-[rgba(245,158,11,0.08)] text-[var(--warning)]";
    }

    if (value === "failed") {
        return "border-[rgba(239,68,68,0.25)] bg-[rgba(239,68,68,0.08)] text-red-300";
    }

    return "border-[rgba(94,106,210,0.28)] bg-[rgba(94,106,210,0.09)] text-[var(--accent)]";
};

export default function DashboardPage() {
    const router = useRouter();

    const [user, setUser] = useState<User | null>(null);
    const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([]);
    const [socialPosts, setSocialPosts] = useState<SocialPost[]>([]);
    const [whatsAppAccounts, setWhatsAppAccounts] = useState<WhatsAppAccount[]>([]);
    const [whatsAppSummaries, setWhatsAppSummaries] = useState<WhatsAppSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [notice, setNotice] = useState<Notice>(null);

    const showNotice = (type: "success" | "error", message: string) => {
        setNotice({ type, message });

        window.setTimeout(() => {
            setNotice(null);
        }, 3500);
    };

    const loadWhatsAppSummaries = async (accounts: WhatsAppAccount[]) => {
        const summaries = await Promise.all(
            accounts.map(async (account) => {
                try {
                    const [contacts, templates, queued, sent, failed] = await Promise.all([
                        whatsappClient.listContacts(account.id, { limit: 1 }),
                        whatsappClient.listTemplates(account.id, { limit: 100 }),
                        whatsappClient.listScheduledMessages(account.id, { limit: 5, status: "QUEUED" }),
                        whatsappClient.listScheduledMessages(account.id, { limit: 1, status: "SENT" }),
                        whatsappClient.listScheduledMessages(account.id, { limit: 5, status: "FAILED" }),
                    ]);

                    const approvedTemplates = templates.items.filter((template) => {
                        return template.status?.toUpperCase() === "APPROVED";
                    }).length;

                    return {
                        account,
                        contacts: contacts.total,
                        templates: templates.total,
                        approvedTemplates,
                        queued: queued.total,
                        sent: sent.total,
                        failed: failed.total,
                        recentQueued: queued.items,
                        recentFailed: failed.items,
                    };
                } catch {
                    return {
                        account,
                        contacts: 0,
                        templates: 0,
                        approvedTemplates: 0,
                        queued: 0,
                        sent: 0,
                        failed: 0,
                        recentQueued: [],
                        recentFailed: [],
                    };
                }
            }),
        );

        return summaries;
    };

    const loadDashboard = async () => {
        try {
            setRefreshing(true);

            const userRes = await fetch("/api/auth/user");

            if (!userRes.ok) {
                router.push("/login");
                return;
            }

            const userData = await userRes.json();
            setUser(userData.user);

            const [accountsRes, postsRes, whatsAppRes] = await Promise.all([
                fetch("/api/accounts"),
                fetch("/api/posts"),
                whatsappClient.listAccounts(),
            ]);

            const accountsData = accountsRes.ok ? await accountsRes.json() : { accounts: [] };
            const postsData = postsRes.ok ? await postsRes.json() : { posts: [] };

            const socialOnly = (accountsData.accounts || []).filter((account: SocialAccount) => {
                const platform = account.platform.toLowerCase();
                return platform === "twitter" || platform === "mastodon" || platform === "threads";
            });

            const whatsAppSummaryData = await loadWhatsAppSummaries(whatsAppRes.accounts);

            setSocialAccounts(socialOnly);
            setSocialPosts(postsData.posts || []);
            setWhatsAppAccounts(whatsAppRes.accounts);
            setWhatsAppSummaries(whatsAppSummaryData);
        } catch (error) {
            showNotice("error", getErrorMessage(error));
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadDashboard();
    }, []);

    const stats = useMemo(() => {
        const twitterAccounts = socialAccounts.filter((account) => {
            return account.platform.toLowerCase() === "twitter";
        }).length;

        const mastodonAccounts = socialAccounts.filter((account) => {
            return account.platform.toLowerCase() === "mastodon";
        }).length;

        const threadsAccounts = socialAccounts.filter((account) => {
            return account.platform.toLowerCase() === "threads";
        }).length;

        const socialPending = socialPosts.filter((post) => post.status === "pending").length;
        const socialProcessing = socialPosts.filter((post) => post.status === "processing").length;
        const socialPosted = socialPosts.filter((post) => post.status === "posted").length;
        const socialFailed = socialPosts.filter((post) => post.status === "failed").length;

        const whatsappContacts = whatsAppSummaries.reduce((total, item) => total + item.contacts, 0);
        const whatsappTemplates = whatsAppSummaries.reduce((total, item) => total + item.templates, 0);
        const approvedTemplates = whatsAppSummaries.reduce((total, item) => total + item.approvedTemplates, 0);
        const whatsappQueued = whatsAppSummaries.reduce((total, item) => total + item.queued, 0);
        const whatsappSent = whatsAppSummaries.reduce((total, item) => total + item.sent, 0);
        const whatsappFailed = whatsAppSummaries.reduce((total, item) => total + item.failed, 0);

        return {
            totalAccounts: socialAccounts.length + whatsAppAccounts.length,
            twitterAccounts,
            mastodonAccounts,
            threadsAccounts,
            whatsAppNumbers: whatsAppAccounts.length,
            whatsappContacts,
            whatsappTemplates,
            approvedTemplates,
            pendingWork: socialPending + socialProcessing + whatsappQueued,
            completedWork: socialPosted + whatsappSent,
            failedWork: socialFailed + whatsappFailed,
            socialPosts: socialPosts.length,
            whatsappMessages: whatsappQueued + whatsappSent + whatsappFailed,
        };
    }, [socialAccounts, socialPosts, whatsAppAccounts, whatsAppSummaries]);

    const activityItems = useMemo<ActivityItem[]>(() => {
        const socialItems: ActivityItem[] = socialPosts.slice(0, 8).map((post) => ({
            id: post.id,
            title: `${normalizePlatform(post.socialAccount.platform)} post`,
            subtitle: post.content,
            status: post.status,
            time: formatDateTime(post.status === "posted" ? post.postedAt : post.scheduledAt),
            type: "social",
            isFailed: post.status === "failed",
        }));

        const whatsAppItems: ActivityItem[] = whatsAppSummaries
            .flatMap((summary) => {
                const queued = summary.recentQueued.map((message) => ({
                    id: message.id,
                    title: "WhatsApp template message",
                    subtitle: `${message.templateName || "Template"} to ${message.recipientPhone}`,
                    status: message.status,
                    time: formatDateTime(message.scheduledAt),
                    type: "whatsapp" as const,
                    isFailed: false,
                }));

                const failed = summary.recentFailed.map((message) => ({
                    id: message.id,
                    title: "WhatsApp failed message",
                    subtitle:
                        message.errorMessage || `${message.templateName || "Template"} to ${message.recipientPhone}`,
                    status: message.status,
                    time: formatDateTime(message.updatedAt),
                    type: "whatsapp" as const,
                    isFailed: true,
                }));

                return [...failed, ...queued];
            })
            .slice(0, 8);

        return [...whatsAppItems, ...socialItems].slice(0, 10);
    }, [socialPosts, whatsAppSummaries]);

    const readiness = useMemo(() => {
        return [
            {
                title: "Connected channels",
                text:
                    stats.totalAccounts > 0
                        ? `${stats.totalAccounts} channel(s) connected`
                        : "Connect channels from their own pages",
                done: stats.totalAccounts > 0,
            },
            {
                title: "Content pipeline",
                text:
                    stats.pendingWork > 0
                        ? `${stats.pendingWork} item(s) waiting or processing`
                        : "No pending content right now",
                done: stats.pendingWork > 0,
            },
            {
                title: "WhatsApp templates",
                text:
                    stats.approvedTemplates > 0
                        ? `${stats.approvedTemplates} approved template(s)`
                        : "Create or sync templates from WhatsApp page",
                done: stats.approvedTemplates > 0,
            },
            {
                title: "System health",
                text:
                    stats.failedWork > 0
                        ? `${stats.failedWork} failed item(s) need attention`
                        : "No failed items found",
                done: stats.failedWork === 0,
                danger: stats.failedWork > 0,
            },
        ];
    }, [stats]);

    if (loading) {
        return (
            <div className="flex min-h-[70vh] items-center justify-center">
                <div className="linear-card flex items-center gap-3 px-4 py-3">
                    <Loader2 className="h-4 w-4 animate-spin text-[var(--accent)]" strokeWidth={1.5} />
                    <span className="text-sm font-medium text-[var(--text-soft)]">Loading workspace overview</span>
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
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                        <div className="min-w-0">
                            <div className="mb-2 flex items-center gap-2">
                                <span className="linear-badge border-[rgba(94,106,210,0.28)] bg-[rgba(94,106,210,0.09)] text-[var(--accent)]">
                                    Unified overview
                                </span>
                                <span className="hidden text-xs text-[var(--text-muted)] sm:block">
                                    Last synced from platform APIs
                                </span>
                            </div>

                            <h1 className="linear-title text-2xl md:text-3xl">
                                Welcome back, {user?.firstName || "User"}
                            </h1>

                            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-soft)]">
                                Combined activity across publishing and messaging. Account connection controls stay
                                inside each platform page.
                            </p>
                        </div>

                        <div className="flex flex-col gap-2 sm:flex-row">
                            <button
                                type="button"
                                onClick={() => router.push("/publishing")}
                                className="linear-button-primary h-9"
                            >
                                <CalendarClock className="h-4 w-4" strokeWidth={1.5} />
                                Publishing Hub
                            </button>

                            <button
                                type="button"
                                onClick={() => router.push("/whatsapp")}
                                className="linear-button-secondary h-9"
                            >
                                <MessageCircle className="h-4 w-4" strokeWidth={1.5} />
                                WhatsApp
                            </button>

                            <button
                                type="button"
                                onClick={loadDashboard}
                                disabled={refreshing}
                                className="linear-button-secondary h-9"
                            >
                                {refreshing ? (
                                    <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
                                ) : (
                                    <RefreshCw className="h-4 w-4" strokeWidth={1.5} />
                                )}
                                Refresh
                            </button>
                        </div>
                    </div>
                </div>

                <div className="grid border-b border-[var(--border)] md:grid-cols-4">
                    <HeaderMetric label="Social posts" value={stats.socialPosts} />
                    <HeaderMetric label="WhatsApp messages" value={stats.whatsappMessages} />
                    <HeaderMetric label="Contacts" value={stats.whatsappContacts} />
                    <HeaderMetric label="Templates" value={stats.whatsappTemplates} />
                </div>

                {notice && (
                    <div
                        className={`mx-5 my-4 flex items-center gap-3 rounded-md border px-3 py-2 text-sm font-medium ${notice.type === "success" ? "border-[rgba(34,197,94,0.24)] bg-[rgba(34,197,94,0.08)] text-[var(--success)]" : "border-[rgba(239,68,68,0.28)] bg-[rgba(239,68,68,0.08)] text-red-300"}`}
                    >
                        {notice.type === "success" ? (
                            <CheckCircle2 className="h-4 w-4" strokeWidth={1.5} />
                        ) : (
                            <AlertTriangle className="h-4 w-4" strokeWidth={1.5} />
                        )}
                        {notice.message}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                    title="Connected Channels"
                    value={stats.totalAccounts}
                    text={`${stats.twitterAccounts} Twitter, ${stats.mastodonAccounts} Mastodon, ${stats.threadsAccounts} Threads, ${stats.whatsAppNumbers} WhatsApp`}
                    icon={Share2}
                />

                <MetricCard
                    title="Pending Work"
                    value={stats.pendingWork}
                    text="Queued posts and WhatsApp messages"
                    icon={Clock}
                    warning={stats.pendingWork > 0}
                />

                <MetricCard
                    title="Completed"
                    value={stats.completedWork}
                    text="Posted social content and sent WhatsApp messages"
                    icon={CheckCircle2}
                    success
                />

                <MetricCard
                    title="Needs Attention"
                    value={stats.failedWork}
                    text="Failed posts or failed WhatsApp sends"
                    icon={stats.failedWork > 0 ? AlertTriangle : Sparkles}
                    danger={stats.failedWork > 0}
                />
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                <div className="linear-card overflow-hidden xl:col-span-2">
                    <SectionHeader
                        title="Combined Activity"
                        text="Recent scheduled, sent, queued, and failed content from all supported channels."
                    />

                    <div className="divide-y divide-[var(--border)]">
                        {activityItems.length === 0 ? (
                            <EmptyState
                                title="No activity yet"
                                text="Create a social post or send a WhatsApp template message to see activity here."
                            />
                        ) : (
                            activityItems.map((item) => <ActivityRow key={item.id} item={item} />)
                        )}
                    </div>
                </div>

                <div className="linear-card overflow-hidden">
                    <SectionHeader title="System Readiness" text="Setup and health checks for the workspace." />

                    <div className="space-y-2 p-4">
                        {readiness.map((item) => (
                            <ReadinessItem key={item.title} item={item} />
                        ))}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
                <QuickAction
                    title="Publishing Hub"
                    text="Compose and schedule social content"
                    icon={CalendarClock}
                    onClick={() => router.push("/publishing")}
                />

                <QuickAction
                    title="Twitter / X"
                    text="Manage Twitter connection and posts"
                    icon={Share2}
                    onClick={() => router.push("/twitter")}
                />

                <QuickAction
                    title="Mastodon"
                    text="Manage Mastodon connection and posts"
                    icon={Users}
                    onClick={() => router.push("/mastodon")}
                />

                <QuickAction
                    title="Instagram Threads"
                    text="Manage Threads connection and posts"
                    icon={Share2}
                    onClick={() => router.push("/threads")}
                />

                <QuickAction
                    title="WhatsApp"
                    text="Send, schedule, and monitor messages"
                    icon={MessageCircle}
                    onClick={() => router.push("/whatsapp")}
                />
            </div>

            <div className="linear-card p-4">
                <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[rgba(94,106,210,0.28)] bg-[rgba(94,106,210,0.09)] text-[var(--accent)]">
                        <BarChart3 className="h-4 w-4" strokeWidth={1.5} />
                    </div>

                    <div>
                        <h3 className="text-sm font-semibold text-[var(--text)]">Dashboard rule</h3>
                        <p className="mt-1 text-sm leading-6 text-[var(--text-soft)]">
                            This page is only for combined system content and overall health. Twitter, Mastodon,
                            Threads, and WhatsApp account actions stay inside their own pages.
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
    text,
    icon: Icon,
    danger = false,
    warning = false,
    success = false,
}: {
    title: string;
    value: number;
    text: string;
    icon: LucideIcon;
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
            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--text-soft)]">{title}</p>
                    <h3 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-[var(--text)]">{value}</h3>
                    <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">{text}</p>
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

function ActivityRow({ item }: { item: ActivityItem }) {
    return (
        <div className="group flex flex-col justify-between gap-4 px-4 py-3 transition-colors hover:bg-[var(--surface-hover)] lg:flex-row lg:items-center">
            <div className="flex min-w-0 items-start gap-3">
                <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md border ${
                        item.type === "whatsapp"
                            ? "border-[rgba(34,197,94,0.22)] bg-[rgba(34,197,94,0.08)] text-[var(--success)]"
                            : "border-[rgba(94,106,210,0.28)] bg-[rgba(94,106,210,0.09)] text-[var(--accent)]"
                    }`}
                >
                    {item.type === "whatsapp" ? (
                        <MessageCircle className="h-4 w-4" strokeWidth={1.5} />
                    ) : (
                        <Share2 className="h-4 w-4" strokeWidth={1.5} />
                    )}
                </div>

                <div className="min-w-0">
                    <h3 className="truncate text-sm font-medium text-[var(--text)]">{item.title}</h3>
                    <p className="mt-1 line-clamp-2 text-sm leading-5 text-[var(--text-soft)]">{item.subtitle}</p>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">{item.time}</p>
                </div>
            </div>

            <span className={`linear-badge shrink-0 uppercase ${getStatusClass(item.status)}`}>{item.status}</span>
        </div>
    );
}

function ReadinessItem({
    item,
}: {
    item: {
        title: string;
        text: string;
        done: boolean;
        danger?: boolean;
    };
}) {
    return (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--canvas)] p-3">
            <div className="flex items-start gap-3">
                <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md border ${
                        item.danger
                            ? "border-[rgba(239,68,68,0.25)] bg-[rgba(239,68,68,0.08)] text-red-300"
                            : item.done
                              ? "border-[rgba(34,197,94,0.22)] bg-[rgba(34,197,94,0.08)] text-[var(--success)]"
                              : "border-[rgba(245,158,11,0.25)] bg-[rgba(245,158,11,0.08)] text-[var(--warning)]"
                    }`}
                >
                    {item.danger ? (
                        <AlertTriangle className="h-4 w-4" strokeWidth={1.5} />
                    ) : item.done ? (
                        <CheckCircle2 className="h-4 w-4" strokeWidth={1.5} />
                    ) : (
                        <Clock className="h-4 w-4" strokeWidth={1.5} />
                    )}
                </div>

                <div className="min-w-0">
                    <h3 className="text-sm font-medium text-[var(--text)]">{item.title}</h3>
                    <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">{item.text}</p>
                </div>
            </div>
        </div>
    );
}

function EmptyState({ title, text }: { title: string; text: string }) {
    return (
        <div className="px-6 py-12 text-center">
            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--canvas)] text-[var(--text-muted)]">
                <FileText className="h-5 w-5" strokeWidth={1.5} />
            </div>

            <h3 className="text-sm font-semibold text-[var(--text)]">{title}</h3>

            <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-[var(--text-muted)]">{text}</p>
        </div>
    );
}

function QuickAction({
    title,
    text,
    icon: Icon,
    onClick,
}: {
    title: string;
    text: string;
    icon: LucideIcon;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="linear-card group p-4 text-left transition-colors hover:bg-[var(--surface-hover)]"
        >
            <div className="mb-4 flex items-center justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-md border border-[rgba(94,106,210,0.28)] bg-[rgba(94,106,210,0.09)] text-[var(--accent)]">
                    <Icon className="h-4 w-4" strokeWidth={1.5} />
                </div>

                <ArrowUpRight
                    className="h-4 w-4 text-[var(--text-muted)] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[var(--text-soft)]"
                    strokeWidth={1.5}
                />
            </div>

            <h3 className="text-sm font-semibold text-[var(--text)]">{title}</h3>

            <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">{text}</p>
        </button>
    );
}
