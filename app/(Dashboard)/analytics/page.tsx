"use client";

import { useEffect, useMemo, useState, type ElementType } from "react";
import { motion } from "framer-motion";
import {
    Activity,
    AlertTriangle,
    BarChart3,
    Calendar,
    CheckCircle2,
    Clock,
    Download,
    FileText,
    Layers3,
    Loader2,
    MessageCircle,
    RefreshCw,
    Send,
    TrendingUp,
    Users,
    XCircle,
} from "lucide-react";
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import {
    ApiClientError,
    whatsappClient,
    type WhatsAppAccount,
    type WhatsAppMessageLog,
    type WhatsAppScheduledMessage,
    type WhatsAppTemplate,
} from "@/libs/whatsapp/client";

type SocialAccount = {
    id: string;
    platform: string;
    accountUsername: string;
    createdAt: string;
};

type SocialPost = {
    id: string;
    content: string;
    scheduledAt: string | null;
    postedAt: string | null;
    status: string;
    retryCount?: number;
    errorMessage?: string | null;
    createdAt: string;
    socialAccount: {
        id: string;
        accountUsername: string;
        platform: string;
    };
};

type RangeFilter = "7" | "30" | "90" | "all";

type WhatsAppSummary = {
    account: WhatsAppAccount;
    contacts: number;
    templates: number;
    approvedTemplates: number;
    queued: number;
    processing: number;
    sent: number;
    failed: number;
    cancelled: number;
    successfulLogs: number;
    failedLogs: number;
    recentMessages: WhatsAppScheduledMessage[];
    recentLogs: WhatsAppMessageLog[];
    templateItems: WhatsAppTemplate[];
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
    platform: string;
    time: string;
    rawTime: number;
    danger?: boolean;
};

const chartColors = ["#5e6ad2", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

const rangeOptions: { label: string; value: RangeFilter }[] = [
    { label: "7D", value: "7" },
    { label: "30D", value: "30" },
    { label: "90D", value: "90" },
    { label: "All", value: "all" },
];

const socialPlatforms = ["twitter", "mastodon", "threads"];

const getErrorMessage = (error: unknown) => {
    if (error instanceof ApiClientError) {
        return error.message;
    }

    if (error instanceof Error) {
        return error.message;
    }

    return "Something went wrong";
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

const formatDateTime = (value?: string | null) => {
    if (!value) {
        return "N/A";
    }

    return new Date(value).toLocaleString();
};

const getDateKey = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
};

const getShortDateLabel = (key: string) => {
    const date = new Date(`${key}T00:00:00`);

    return date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
    });
};

const getSocialPostTime = (post: SocialPost) => {
    return post.postedAt || post.scheduledAt || post.createdAt;
};

const getWhatsAppMessageTime = (message: WhatsAppScheduledMessage) => {
    return message.sentAt || message.scheduledAt || message.createdAt;
};

const isInRange = (value: string | null | undefined, range: RangeFilter) => {
    if (!value || range === "all") {
        return true;
    }

    const days = Number(range);
    const time = new Date(value).getTime();
    const min = Date.now() - days * 24 * 60 * 60 * 1000;

    return time >= min;
};

const getStatusClass = (status: string) => {
    const value = status.toLowerCase();

    if (value === "posted" || value === "sent" || value === "approved" || value === "success") {
        return "border-[rgba(34,197,94,0.22)] bg-[rgba(34,197,94,0.08)] text-[var(--success)]";
    }

    if (value === "pending" || value === "queued" || value === "processing") {
        return "border-[rgba(245,158,11,0.25)] bg-[rgba(245,158,11,0.08)] text-[var(--warning)]";
    }

    if (value === "failed" || value === "rejected") {
        return "border-[rgba(239,68,68,0.25)] bg-[rgba(239,68,68,0.08)] text-red-300";
    }

    return "border-[rgba(94,106,210,0.28)] bg-[rgba(94,106,210,0.09)] text-[var(--accent)]";
};

const buildEmptyTrend = (range: RangeFilter) => {
    const days = range === "all" ? 30 : Number(range);

    return Array.from({ length: days }, (_, index) => {
        const date = new Date();
        date.setDate(date.getDate() - (days - 1 - index));

        const key = getDateKey(date);

        return {
            key,
            date: getShortDateLabel(key),
            social: 0,
            whatsapp: 0,
            failures: 0,
        };
    });
};

export default function AnalyticsPage() {
    const [range, setRange] = useState<RangeFilter>("30");
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

    const loadWhatsAppSummary = async (account: WhatsAppAccount): Promise<WhatsAppSummary> => {
        try {
            const [
                contacts,
                templates,
                queued,
                processing,
                sent,
                failed,
                cancelled,
                recentMessages,
                successfulLogs,
                failedLogs,
                recentLogs,
            ] = await Promise.all([
                whatsappClient.listContacts(account.id, { limit: 1 }),
                whatsappClient.listTemplates(account.id, { limit: 100 }),
                whatsappClient.listScheduledMessages(account.id, { limit: 1, status: "QUEUED" }),
                whatsappClient.listScheduledMessages(account.id, { limit: 1, status: "PROCESSING" }),
                whatsappClient.listScheduledMessages(account.id, { limit: 1, status: "SENT" }),
                whatsappClient.listScheduledMessages(account.id, { limit: 1, status: "FAILED" }),
                whatsappClient.listScheduledMessages(account.id, { limit: 1, status: "CANCELLED" }),
                whatsappClient.listScheduledMessages(account.id, { limit: 60 }),
                whatsappClient.listLogs(account.id, { limit: 1, success: true }),
                whatsappClient.listLogs(account.id, { limit: 1, success: false }),
                whatsappClient.listLogs(account.id, { limit: 40 }),
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
                processing: processing.total,
                sent: sent.total,
                failed: failed.total,
                cancelled: cancelled.total,
                successfulLogs: successfulLogs.total,
                failedLogs: failedLogs.total,
                recentMessages: recentMessages.items,
                recentLogs: recentLogs.items,
                templateItems: templates.items,
            };
        } catch {
            return {
                account,
                contacts: 0,
                templates: 0,
                approvedTemplates: 0,
                queued: 0,
                processing: 0,
                sent: 0,
                failed: 0,
                cancelled: 0,
                successfulLogs: 0,
                failedLogs: 0,
                recentMessages: [],
                recentLogs: [],
                templateItems: [],
            };
        }
    };

    const loadAnalytics = async () => {
        try {
            setRefreshing(true);

            const [accountsRes, postsRes, whatsAppAccountData] = await Promise.all([
                fetch("/api/accounts"),
                fetch("/api/posts"),
                whatsappClient.listAccounts().catch(() => ({ accounts: [] as WhatsAppAccount[] })),
            ]);

            if (!accountsRes.ok) {
                throw new Error("Failed to load social accounts");
            }

            if (!postsRes.ok) {
                throw new Error("Failed to load social posts");
            }

            const accountsData = await accountsRes.json();
            const postsData = await postsRes.json();

            const filteredSocialAccounts = (accountsData.accounts || []).filter((account: SocialAccount) => {
                return socialPlatforms.includes(account.platform.toLowerCase());
            });

            const summaries = await Promise.all(
                whatsAppAccountData.accounts.map((account) => loadWhatsAppSummary(account)),
            );

            setSocialAccounts(filteredSocialAccounts);
            setSocialPosts(postsData.posts || []);
            setWhatsAppAccounts(whatsAppAccountData.accounts);
            setWhatsAppSummaries(summaries);
        } catch (error) {
            showNotice("error", getErrorMessage(error));
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadAnalytics();
    }, []);

    const filteredSocialPosts = useMemo(() => {
        return socialPosts.filter((post) => isInRange(getSocialPostTime(post), range));
    }, [socialPosts, range]);

    const filteredWhatsAppMessages = useMemo(() => {
        return whatsAppSummaries
            .flatMap((summary) => summary.recentMessages)
            .filter((message) => isInRange(getWhatsAppMessageTime(message), range));
    }, [whatsAppSummaries, range]);

    const totals = useMemo(() => {
        const socialPending = socialPosts.filter((post) => post.status === "pending").length;
        const socialProcessing = socialPosts.filter((post) => post.status === "processing").length;
        const socialPosted = socialPosts.filter((post) => post.status === "posted").length;
        const socialFailed = socialPosts.filter((post) => post.status === "failed").length;

        const whatsappContacts = whatsAppSummaries.reduce((total, item) => total + item.contacts, 0);
        const whatsappTemplates = whatsAppSummaries.reduce((total, item) => total + item.templates, 0);
        const whatsappApprovedTemplates = whatsAppSummaries.reduce((total, item) => total + item.approvedTemplates, 0);
        const whatsappQueued = whatsAppSummaries.reduce((total, item) => total + item.queued, 0);
        const whatsappProcessing = whatsAppSummaries.reduce((total, item) => total + item.processing, 0);
        const whatsappSent = whatsAppSummaries.reduce((total, item) => total + item.sent, 0);
        const whatsappFailed = whatsAppSummaries.reduce((total, item) => total + item.failed, 0);
        const whatsappCancelled = whatsAppSummaries.reduce((total, item) => total + item.cancelled, 0);
        const successfulLogs = whatsAppSummaries.reduce((total, item) => total + item.successfulLogs, 0);
        const failedLogs = whatsAppSummaries.reduce((total, item) => total + item.failedLogs, 0);

        const totalWhatsAppMessages =
            whatsappQueued + whatsappProcessing + whatsappSent + whatsappFailed + whatsappCancelled;
        const totalFailures = socialFailed + whatsappFailed + failedLogs;
        const totalCompleted = socialPosted + whatsappSent;
        const totalInProgress = socialPending + socialProcessing + whatsappQueued + whatsappProcessing;
        const templateApprovalRate =
            whatsappTemplates > 0 ? Math.round((whatsappApprovedTemplates / whatsappTemplates) * 100) : 0;
        const logSuccessRate =
            successfulLogs + failedLogs > 0 ? Math.round((successfulLogs / (successfulLogs + failedLogs)) * 100) : 0;

        return {
            channels: socialAccounts.length + whatsAppAccounts.length,
            socialPosts: socialPosts.length,
            whatsappMessages: totalWhatsAppMessages,
            whatsappContacts,
            whatsappTemplates,
            whatsappApprovedTemplates,
            socialPending,
            socialProcessing,
            socialPosted,
            socialFailed,
            whatsappQueued,
            whatsappProcessing,
            whatsappSent,
            whatsappFailed,
            whatsappCancelled,
            successfulLogs,
            failedLogs,
            totalFailures,
            totalCompleted,
            totalInProgress,
            templateApprovalRate,
            logSuccessRate,
        };
    }, [socialAccounts, socialPosts, whatsAppAccounts, whatsAppSummaries]);

    const platformData = useMemo(() => {
        const socialRows = socialPlatforms.map((platform) => {
            const accounts = socialAccounts.filter((account) => account.platform.toLowerCase() === platform).length;
            const posts = socialPosts.filter((post) => post.socialAccount.platform.toLowerCase() === platform);
            const posted = posts.filter((post) => post.status === "posted").length;
            const failed = posts.filter((post) => post.status === "failed").length;

            return {
                platform: normalizePlatform(platform),
                accounts,
                total: posts.length,
                completed: posted,
                failed,
            };
        });

        const whatsappMessages = totals.whatsappMessages;

        return [
            ...socialRows,
            {
                platform: "WhatsApp",
                accounts: whatsAppAccounts.length,
                total: whatsappMessages,
                completed: totals.whatsappSent,
                failed: totals.whatsappFailed,
            },
        ];
    }, [socialAccounts, socialPosts, whatsAppAccounts, totals]);

    const statusData = useMemo(() => {
        return [
            { name: "Completed", value: totals.totalCompleted },
            { name: "In progress", value: totals.totalInProgress },
            { name: "Failed", value: totals.totalFailures },
            { name: "Cancelled", value: totals.whatsappCancelled },
        ].filter((item) => item.value > 0);
    }, [totals]);

    const trendData = useMemo(() => {
        const base = buildEmptyTrend(range);
        const map = new Map(base.map((item) => [item.key, item]));

        filteredSocialPosts.forEach((post) => {
            const value = getSocialPostTime(post);
            const key = getDateKey(new Date(value));
            const item = map.get(key);

            if (item) {
                item.social += 1;

                if (post.status === "failed") {
                    item.failures += 1;
                }
            }
        });

        filteredWhatsAppMessages.forEach((message) => {
            const value = getWhatsAppMessageTime(message);
            const key = getDateKey(new Date(value));
            const item = map.get(key);

            if (item) {
                item.whatsapp += 1;

                if (message.status === "FAILED") {
                    item.failures += 1;
                }
            }
        });

        return Array.from(map.values());
    }, [filteredSocialPosts, filteredWhatsAppMessages, range]);

    const recentActivity = useMemo<ActivityItem[]>(() => {
        const socialItems = socialPosts.map((post) => ({
            id: post.id,
            title: `${normalizePlatform(post.socialAccount.platform)} post`,
            subtitle: post.content,
            status: post.status,
            platform: normalizePlatform(post.socialAccount.platform),
            time: formatDateTime(getSocialPostTime(post)),
            rawTime: new Date(getSocialPostTime(post)).getTime(),
            danger: post.status === "failed",
        }));

        const messageItems = whatsAppSummaries.flatMap((summary) => {
            return summary.recentMessages.map((message) => ({
                id: message.id,
                title: "WhatsApp template message",
                subtitle: `${message.templateName || "Template"} to ${message.recipientPhone}`,
                status: message.status,
                platform: "WhatsApp",
                time: formatDateTime(getWhatsAppMessageTime(message)),
                rawTime: new Date(getWhatsAppMessageTime(message)).getTime(),
                danger: message.status === "FAILED",
            }));
        });

        const logItems = whatsAppSummaries.flatMap((summary) => {
            return summary.recentLogs.map((log) => ({
                id: log.id,
                title: `WhatsApp ${log.direction.toLowerCase()} log`,
                subtitle: log.errorMessage || log.recipientPhone || "System log",
                status: log.success ? "success" : "failed",
                platform: "WhatsApp",
                time: formatDateTime(log.createdAt),
                rawTime: new Date(log.createdAt).getTime(),
                danger: !log.success,
            }));
        });

        return [...socialItems, ...messageItems, ...logItems].sort((a, b) => b.rawTime - a.rawTime).slice(0, 12);
    }, [socialPosts, whatsAppSummaries]);

    const nextScheduledItems = useMemo(() => {
        const now = Date.now();

        const socialScheduled = socialPosts
            .filter(
                (post) => post.status === "pending" && post.scheduledAt && new Date(post.scheduledAt).getTime() >= now,
            )
            .map((post) => ({
                id: post.id,
                title: `${normalizePlatform(post.socialAccount.platform)} post`,
                subtitle: `@${post.socialAccount.accountUsername}`,
                time: post.scheduledAt || post.createdAt,
                platform: normalizePlatform(post.socialAccount.platform),
            }));

        const whatsappScheduled = whatsAppSummaries.flatMap((summary) => {
            return summary.recentMessages
                .filter((message) => message.status === "QUEUED" && new Date(message.scheduledAt).getTime() >= now)
                .map((message) => ({
                    id: message.id,
                    title: "WhatsApp message",
                    subtitle: `${message.templateName || "Template"} to ${message.recipientPhone}`,
                    time: message.scheduledAt,
                    platform: "WhatsApp",
                }));
        });

        return [...socialScheduled, ...whatsappScheduled]
            .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())
            .slice(0, 6);
    }, [socialPosts, whatsAppSummaries]);

    const insights = useMemo(() => {
        const busiest = [...platformData].sort((a, b) => b.total - a.total)[0];
        const approvalText =
            totals.whatsappTemplates > 0
                ? `${totals.templateApprovalRate}% template approval rate`
                : "No WhatsApp templates yet";

        return [
            {
                title: "Busiest channel",
                value: busiest?.platform || "N/A",
                text: busiest ? `${busiest.total} tracked item(s)` : "No platform data found",
                icon: TrendingUp,
            },
            {
                title: "Reliability",
                value: `${totals.logSuccessRate}%`,
                text:
                    totals.successfulLogs + totals.failedLogs > 0
                        ? "WhatsApp API log success rate"
                        : "No WhatsApp logs yet",
                icon: CheckCircle2,
            },
            {
                title: "Template health",
                value: `${totals.whatsappApprovedTemplates}/${totals.whatsappTemplates}`,
                text: approvalText,
                icon: FileText,
            },
            {
                title: "Scheduled next",
                value: nextScheduledItems.length,
                text: nextScheduledItems.length > 0 ? "Upcoming queued items detected" : "No upcoming scheduled items",
                icon: Calendar,
            },
        ];
    }, [platformData, totals, nextScheduledItems]);

    const exportCsv = () => {
        const rows = [
            ["Metric", "Value"],
            ["Connected channels", totals.channels],
            ["Social posts", totals.socialPosts],
            ["WhatsApp messages", totals.whatsappMessages],
            ["Completed work", totals.totalCompleted],
            ["In progress work", totals.totalInProgress],
            ["Failures", totals.totalFailures],
            ["WhatsApp contacts", totals.whatsappContacts],
            ["WhatsApp templates", totals.whatsappTemplates],
            ["Approved templates", totals.whatsappApprovedTemplates],
            ["WhatsApp log success rate", `${totals.logSuccessRate}%`],
            [],
            ["Platform", "Accounts", "Total", "Completed", "Failed"],
            ...platformData.map((item) => [item.platform, item.accounts, item.total, item.completed, item.failed]),
        ];

        const csv = rows
            .map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(","))
            .join("\n");

        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = `analytics-${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    if (loading) {
        return (
            <div className="flex min-h-[70vh] items-center justify-center">
                <div className="linear-card flex items-center gap-3 px-4 py-3">
                    <Loader2 className="h-4 w-4 animate-spin text-[var(--accent)]" strokeWidth={1.5} />
                    <span className="text-sm font-medium text-[var(--text-soft)]">Loading analytics workspace</span>
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
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-[rgba(94,106,210,0.28)] bg-[rgba(94,106,210,0.09)] text-[var(--accent)]">
                                <BarChart3 className="h-6 w-6" strokeWidth={1.5} />
                            </div>

                            <div className="min-w-0">
                                <div className="mb-2 flex items-center gap-2">
                                    <span className="linear-badge border-[rgba(94,106,210,0.28)] bg-[rgba(94,106,210,0.09)] text-[var(--accent)]">
                                        Real data
                                    </span>
                                    <span className="hidden text-xs text-[var(--text-muted)] sm:block">
                                        Posts, accounts, WhatsApp messages, templates, contacts, and logs
                                    </span>
                                </div>

                                <h1 className="linear-title text-2xl md:text-3xl">Analytics</h1>

                                <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-soft)]">
                                    Operational analytics from stored platform records. No fake engagement or reach
                                    numbers are shown.
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2 sm:flex-row">
                            <div className="flex rounded-md border border-[var(--border)] bg-[var(--canvas)] p-1">
                                {rangeOptions.map((option) => (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => setRange(option.value)}
                                        className={`h-8 rounded px-3 text-xs font-medium ${
                                            range === option.value
                                                ? "bg-[var(--surface-3)] text-[var(--text)] shadow-[var(--shadow-line)]"
                                                : "text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
                                        }`}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>

                            <button
                                type="button"
                                onClick={loadAnalytics}
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

                            <button type="button" onClick={exportCsv} className="linear-button-primary h-9">
                                <Download className="h-4 w-4" strokeWidth={1.5} />
                                Export CSV
                            </button>
                        </div>
                    </div>
                </div>

                <div className="grid border-b border-[var(--border)] md:grid-cols-6">
                    <HeaderMetric label="Channels" value={totals.channels} />
                    <HeaderMetric label="Social Posts" value={totals.socialPosts} />
                    <HeaderMetric label="WA Messages" value={totals.whatsappMessages} />
                    <HeaderMetric label="Completed" value={totals.totalCompleted} />
                    <HeaderMetric label="In Progress" value={totals.totalInProgress} />
                    <HeaderMetric label="Failures" value={totals.totalFailures} />
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

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                    title="Connected Channels"
                    value={totals.channels}
                    text={`${socialAccounts.length} social, ${whatsAppAccounts.length} WhatsApp`}
                    icon={Layers3}
                />

                <MetricCard
                    title="Tracked Output"
                    value={totals.socialPosts + totals.whatsappMessages}
                    text="Social posts plus WhatsApp scheduled records"
                    icon={Send}
                />

                <MetricCard
                    title="WhatsApp Contacts"
                    value={totals.whatsappContacts}
                    text={`${totals.whatsappTemplates} templates, ${totals.whatsappApprovedTemplates} approved`}
                    icon={Users}
                    success={totals.whatsappContacts > 0}
                />

                <MetricCard
                    title="Failures"
                    value={totals.totalFailures}
                    text="Failed posts, messages, and failed WhatsApp API logs"
                    icon={totals.totalFailures > 0 ? AlertTriangle : CheckCircle2}
                    danger={totals.totalFailures > 0}
                    success={totals.totalFailures === 0}
                />
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
                {insights.map((item) => (
                    <InsightCard
                        key={item.title}
                        title={item.title}
                        value={item.value}
                        text={item.text}
                        icon={item.icon}
                    />
                ))}
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                <div className="linear-card overflow-hidden xl:col-span-2">
                    <SectionHeader
                        title="Activity Trend"
                        text={`Social and WhatsApp activity for ${range === "all" ? "the latest tracked records" : `the last ${range} days`}.`}
                    />

                    <div className="h-[340px] p-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={trendData}>
                                <defs>
                                    <linearGradient id="socialFill" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#5e6ad2" stopOpacity={0.35} />
                                        <stop offset="95%" stopColor="#5e6ad2" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="whatsappFill" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.32} />
                                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                                    </linearGradient>
                                </defs>

                                <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                                <XAxis
                                    dataKey="date"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                                    allowDecimals={false}
                                />
                                <Tooltip content={<ChartTooltip />} />
                                <Area
                                    type="monotone"
                                    dataKey="social"
                                    name="Social posts"
                                    stroke="#5e6ad2"
                                    strokeWidth={2}
                                    fill="url(#socialFill)"
                                />
                                <Area
                                    type="monotone"
                                    dataKey="whatsapp"
                                    name="WhatsApp messages"
                                    stroke="#22c55e"
                                    strokeWidth={2}
                                    fill="url(#whatsappFill)"
                                />
                                <Area
                                    type="monotone"
                                    dataKey="failures"
                                    name="Failures"
                                    stroke="#ef4444"
                                    strokeWidth={2}
                                    fill="transparent"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="linear-card overflow-hidden">
                    <SectionHeader
                        title="Status Distribution"
                        text="Combined social and WhatsApp operational status."
                    />

                    {statusData.length === 0 ? (
                        <EmptyState
                            title="No status data"
                            text="Create posts or WhatsApp messages to see distribution."
                        />
                    ) : (
                        <div className="p-4">
                            <div className="h-[240px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={statusData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={62}
                                            outerRadius={92}
                                            paddingAngle={4}
                                            dataKey="value"
                                        >
                                            {statusData.map((_, index) => (
                                                <Cell key={index} fill={chartColors[index % chartColors.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip content={<ChartTooltip />} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>

                            <div className="space-y-2">
                                {statusData.map((item, index) => (
                                    <div
                                        key={item.name}
                                        className="flex items-center justify-between rounded-md border border-[var(--border)] bg-[var(--canvas)] px-3 py-2"
                                    >
                                        <div className="flex items-center gap-2">
                                            <span
                                                className="h-2.5 w-2.5 rounded-full"
                                                style={{ backgroundColor: chartColors[index % chartColors.length] }}
                                            />
                                            <span className="text-sm font-medium text-[var(--text-soft)]">
                                                {item.name}
                                            </span>
                                        </div>

                                        <span className="text-sm font-semibold text-[var(--text)]">{item.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <div className="linear-card overflow-hidden">
                    <SectionHeader title="Platform Breakdown" text="Actual records grouped by platform." />

                    <div className="h-[320px] p-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={platformData}>
                                <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                                <XAxis
                                    dataKey="platform"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                                    allowDecimals={false}
                                />
                                <Tooltip content={<ChartTooltip />} />
                                <Bar dataKey="total" name="Total records" fill="#5e6ad2" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="completed" name="Completed" fill="#22c55e" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="failed" name="Failed" fill="#ef4444" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="border-t border-[var(--border)]">
                        <table className="w-full">
                            <thead className="bg-[var(--canvas)]">
                                <tr>
                                    <TableHead>Platform</TableHead>
                                    <TableHead>Accounts</TableHead>
                                    <TableHead>Total</TableHead>
                                    <TableHead>Done</TableHead>
                                    <TableHead>Failed</TableHead>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-[var(--border)]">
                                {platformData.map((item) => (
                                    <tr key={item.platform} className="hover:bg-[var(--surface-hover)]">
                                        <td className="px-4 py-3 text-sm font-medium text-[var(--text)]">
                                            {item.platform}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-[var(--text-soft)]">{item.accounts}</td>
                                        <td className="px-4 py-3 text-sm text-[var(--text-soft)]">{item.total}</td>
                                        <td className="px-4 py-3 text-sm text-[var(--success)]">{item.completed}</td>
                                        <td className="px-4 py-3 text-sm text-red-300">{item.failed}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="linear-card overflow-hidden">
                    <SectionHeader
                        title="Recent Activity"
                        text="Latest records from social publishing and WhatsApp operations."
                    />

                    <div className="divide-y divide-[var(--border)]">
                        {recentActivity.length === 0 ? (
                            <EmptyState
                                title="No activity yet"
                                text="Activity appears after publishing posts or sending WhatsApp messages."
                            />
                        ) : (
                            recentActivity.map((item) => <ActivityRow key={item.id} item={item} />)
                        )}
                    </div>
                </div>
            </div>

            <div className="linear-card overflow-hidden">
                <SectionHeader
                    title="Upcoming Scheduled Work"
                    text="The next queued posts and WhatsApp template messages."
                />

                <div className="divide-y divide-[var(--border)]">
                    {nextScheduledItems.length === 0 ? (
                        <EmptyState
                            title="No upcoming scheduled work"
                            text="Schedule social posts or WhatsApp messages to see them here."
                        />
                    ) : (
                        nextScheduledItems.map((item) => (
                            <div
                                key={item.id}
                                className="flex flex-col justify-between gap-3 px-4 py-3 transition-colors hover:bg-[var(--surface-hover)] md:flex-row md:items-center"
                            >
                                <div className="flex items-start gap-3">
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[rgba(94,106,210,0.28)] bg-[rgba(94,106,210,0.09)] text-[var(--accent)]">
                                        <Clock className="h-4 w-4" strokeWidth={1.5} />
                                    </div>

                                    <div>
                                        <h3 className="text-sm font-semibold text-[var(--text)]">{item.title}</h3>
                                        <p className="mt-1 text-sm text-[var(--text-muted)]">{item.subtitle}</p>
                                    </div>
                                </div>

                                <div className="text-left md:text-right">
                                    <span className="linear-badge">{item.platform}</span>
                                    <p className="mt-2 text-xs text-[var(--text-muted)]">{formatDateTime(item.time)}</p>
                                </div>
                            </div>
                        ))
                    )}
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
    success = false,
}: {
    title: string;
    value: number;
    text: string;
    icon: ElementType;
    danger?: boolean;
    success?: boolean;
}) {
    const colorClass = danger
        ? "border-[rgba(239,68,68,0.25)] bg-[rgba(239,68,68,0.08)] text-red-300"
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
                <div>
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

function InsightCard({
    title,
    value,
    text,
    icon: Icon,
}: {
    title: string;
    value: string | number;
    text: string;
    icon: ElementType;
}) {
    return (
        <div className="linear-card p-4">
            <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-md border border-[rgba(94,106,210,0.28)] bg-[rgba(94,106,210,0.09)] text-[var(--accent)]">
                <Icon className="h-4 w-4" strokeWidth={1.5} />
            </div>

            <p className="text-xs font-medium uppercase tracking-[0.12em] text-[var(--text-muted)]">{title}</p>

            <h3 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-[var(--text)]">{value}</h3>

            <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">{text}</p>
        </div>
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

function TableHead({ children }: { children: React.ReactNode }) {
    return (
        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.12em] text-[var(--text-muted)]">
            {children}
        </th>
    );
}

function ActivityRow({ item }: { item: ActivityItem }) {
    return (
        <div className="flex flex-col justify-between gap-3 px-4 py-3 transition-colors hover:bg-[var(--surface-hover)] md:flex-row md:items-center">
            <div className="flex min-w-0 items-start gap-3">
                <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md border ${
                        item.platform === "WhatsApp"
                            ? "border-[rgba(34,197,94,0.22)] bg-[rgba(34,197,94,0.08)] text-[var(--success)]"
                            : "border-[rgba(94,106,210,0.28)] bg-[rgba(94,106,210,0.09)] text-[var(--accent)]"
                    }`}
                >
                    {item.platform === "WhatsApp" ? (
                        <MessageCircle className="h-4 w-4" strokeWidth={1.5} />
                    ) : (
                        <Send className="h-4 w-4" strokeWidth={1.5} />
                    )}
                </div>

                <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold text-[var(--text)]">{item.title}</h3>
                    <p className="mt-1 line-clamp-2 text-sm leading-5 text-[var(--text-soft)]">{item.subtitle}</p>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">{item.time}</p>
                </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
                <span className="linear-badge">{item.platform}</span>

                <span className={`linear-badge uppercase ${getStatusClass(item.status)}`}>{item.status}</span>
            </div>
        </div>
    );
}

function EmptyState({ title, text }: { title: string; text: string }) {
    return (
        <div className="px-6 py-12 text-center">
            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--canvas)] text-[var(--text-muted)]">
                <Activity className="h-5 w-5" strokeWidth={1.5} />
            </div>

            <h3 className="text-sm font-semibold text-[var(--text)]">{title}</h3>

            <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-[var(--text-muted)]">{text}</p>
        </div>
    );
}

function ChartTooltip({
    active,
    payload,
    label,
}: {
    active?: boolean;
    payload?: Array<{
        name?: string;
        value?: number;
        color?: string;
        payload?: {
            name?: string;
        };
    }>;
    label?: string;
}) {
    if (!active || !payload || payload.length === 0) {
        return null;
    }

    return (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-3)] px-3 py-2 shadow-[var(--shadow-panel)]">
            {label && <p className="mb-2 text-xs font-medium text-[var(--text-muted)]">{label}</p>}

            <div className="space-y-1.5">
                {payload.map((item, index) => (
                    <div key={index} className="flex items-center justify-between gap-6">
                        <div className="flex items-center gap-2">
                            <span
                                className="h-2 w-2 rounded-full"
                                style={{ backgroundColor: item.color || chartColors[index % chartColors.length] }}
                            />
                            <span className="text-xs text-[var(--text-soft)]">
                                {item.name || item.payload?.name || "Value"}
                            </span>
                        </div>

                        <span className="text-xs font-semibold text-[var(--text)]">{item.value}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
