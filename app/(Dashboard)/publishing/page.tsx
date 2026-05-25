"use client";

import { useEffect, useMemo, useState, type ElementType } from "react";
import { motion } from "framer-motion";
import {
    AlertTriangle,
    Calendar,
    CheckCircle2,
    Clock,
    Filter,
    Layers3,
    List,
    Loader2,
    Plus,
    RotateCcw,
    Search,
    Send,
    Trash2,
    X,
} from "lucide-react";
import ComposeModal from "@/app/(Dashboard)/publishing/ComposeModal";
import PublishingCalendar from "@/app/(Dashboard)/publishing/PublishingCalendar";
import { PLATFORMS } from "@/libs/platform";

type Post = {
    id: string;
    content: string;
    status: "pending" | "processing" | "posted" | "failed";
    scheduledAt: string | null;
    postedAt: string | null;
    createdAt: string;
    socialAccount: {
        id: string;
        platform: keyof typeof PLATFORMS;
        accountUsername: string;
    };
};

type StatusFilter = "all" | "pending" | "processing" | "posted" | "failed";
type PlatformFilter = "all" | "twitter" | "mastodon" | "threads";
type TypeFilter = "all" | "scheduled" | "immediate";

const platformOptions: { label: string; value: PlatformFilter }[] = [
    { label: "All", value: "all" },
    { label: "Twitter / X", value: "twitter" },
    { label: "Mastodon", value: "mastodon" },
    { label: "Threads", value: "threads" },
];

const statusOptions: { label: string; value: StatusFilter }[] = [
    { label: "All", value: "all" },
    { label: "Pending", value: "pending" },
    { label: "Processing", value: "processing" },
    { label: "Posted", value: "posted" },
    { label: "Failed", value: "failed" },
];

const typeOptions: { label: string; value: TypeFilter }[] = [
    { label: "All", value: "all" },
    { label: "Scheduled", value: "scheduled" },
    { label: "Immediate / Posted", value: "immediate" },
];

const getPostTime = (post: Post) => {
    return post.postedAt || post.scheduledAt || post.createdAt;
};

const getStatusClass = (status: Post["status"]) => {
    if (status === "posted") {
        return "border-[rgba(34,197,94,0.22)] bg-[rgba(34,197,94,0.08)] text-[var(--success)]";
    }

    if (status === "pending") {
        return "border-[rgba(245,158,11,0.25)] bg-[rgba(245,158,11,0.08)] text-[var(--warning)]";
    }

    if (status === "processing") {
        return "border-[rgba(94,106,210,0.28)] bg-[rgba(94,106,210,0.09)] text-[var(--accent)]";
    }

    return "border-[rgba(239,68,68,0.25)] bg-[rgba(239,68,68,0.08)] text-red-300";
};

const getPostTimingLabel = (post: Post) => {
    if (post.status === "posted") {
        return "Posted";
    }

    if (post.scheduledAt) {
        return "Scheduled";
    }

    return "Queued";
};

export default function PublishingPage() {
    const [view, setView] = useState<"list" | "calendar">("list");
    const [isComposeOpen, setIsComposeOpen] = useState(false);
    const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
    const [posts, setPosts] = useState<Post[]>([]);
    const [loadingPosts, setLoadingPosts] = useState(true);
    const [initialLoading, setInitialLoading] = useState(true);
    const [deletingPostId, setDeletingPostId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
    const [platformFilter, setPlatformFilter] = useState<PlatformFilter>("all");
    const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");

    const loadPosts = async () => {
        try {
            setLoadingPosts(true);
            setError(null);

            const res = await fetch("/api/posts");

            if (!res.ok) {
                throw new Error("Failed to load posts");
            }

            const data = await res.json();
            setPosts(data.posts || []);
        } catch (error) {
            setError(error instanceof Error ? error.message : "Something went wrong");
        } finally {
            setLoadingPosts(false);
            setInitialLoading(false);
        }
    };

    useEffect(() => {
        loadPosts();
    }, []);

    const closeCompose = () => {
        setIsComposeOpen(false);
        setSelectedAccounts([]);
        loadPosts();
    };

    const filteredPosts = useMemo(() => {
        const normalizedSearch = searchQuery.trim().toLowerCase();

        return posts.filter((post) => {
            const platform = post.socialAccount.platform;
            const platformName = PLATFORMS[platform]?.name || platform;

            const matchesSearch =
                !normalizedSearch ||
                post.content.toLowerCase().includes(normalizedSearch) ||
                post.socialAccount.accountUsername.toLowerCase().includes(normalizedSearch) ||
                platformName.toLowerCase().includes(normalizedSearch) ||
                post.status.toLowerCase().includes(normalizedSearch);

            const matchesStatus = statusFilter === "all" || post.status === statusFilter;
            const matchesPlatform = platformFilter === "all" || platform === platformFilter;

            const matchesType =
                typeFilter === "all" ||
                (typeFilter === "scheduled" && Boolean(post.scheduledAt) && post.status !== "posted") ||
                (typeFilter === "immediate" && (!post.scheduledAt || post.status === "posted"));

            return matchesSearch && matchesStatus && matchesPlatform && matchesType;
        });
    }, [posts, searchQuery, statusFilter, platformFilter, typeFilter]);

    const hasActiveFilters =
        searchQuery.trim().length > 0 || statusFilter !== "all" || platformFilter !== "all" || typeFilter !== "all";

    const clearFilters = () => {
        setSearchQuery("");
        setStatusFilter("all");
        setPlatformFilter("all");
        setTypeFilter("all");
    };

    const deletePost = async (post: Post) => {
        if (post.status === "processing") {
            setError("This post is currently being processed and cannot be deleted.");
            return;
        }

        const message =
            post.status === "posted"
                ? "This will remove the post from your app history only. It will not delete it from the social platform. Continue?"
                : "Delete this scheduled post? This action cannot be undone.";

        const confirmed = window.confirm(message);

        if (!confirmed) {
            return;
        }

        try {
            setDeletingPostId(post.id);
            setError(null);

            const res = await fetch(`/api/posts/${post.id}`, {
                method: "DELETE",
            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                throw new Error(data.error || "Failed to delete post");
            }

            setPosts((current) => current.filter((item) => item.id !== post.id));
        } catch (error) {
            setError(error instanceof Error ? error.message : "Failed to delete post");
        } finally {
            setDeletingPostId(null);
        }
    };

    const stats = useMemo(() => {
        return {
            total: posts.length,
            filtered: filteredPosts.length,
            pending: posts.filter((post) => post.status === "pending").length,
            processing: posts.filter((post) => post.status === "processing").length,
            posted: posts.filter((post) => post.status === "posted").length,
            failed: posts.filter((post) => post.status === "failed").length,
            scheduled: posts.filter((post) => post.scheduledAt && post.status !== "posted").length,
        };
    }, [posts, filteredPosts]);

    if (initialLoading) {
        return (
            <div className="flex min-h-[70vh] items-center justify-center">
                <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                    className="linear-card flex items-center gap-3 px-4 py-3"
                >
                    <Loader2 className="h-4 w-4 animate-spin text-[var(--accent)]" strokeWidth={1.5} />
                    <span className="text-sm font-medium text-[var(--text-soft)]">Loading publishing workspace</span>
                </motion.div>
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
                        <div className="min-w-0">
                            <div className="mb-2 flex items-center gap-2">
                                <span className="linear-badge border-[rgba(94,106,210,0.28)] bg-[rgba(94,106,210,0.09)] text-[var(--accent)]">
                                    Publishing control
                                </span>
                                <span className="hidden text-xs text-[var(--text-muted)] sm:block">
                                    Twitter / X, Mastodon, and Instagram Threads
                                </span>
                            </div>

                            <h1 className="linear-title text-2xl md:text-3xl">Publishing</h1>

                            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-soft)]">
                                Create, schedule, search, filter, and manage all social posts from a focused
                                Linear-style workspace.
                            </p>
                        </div>

                        <div className="flex flex-col gap-2 sm:flex-row">
                            <div className="flex rounded-md border border-[var(--border)] bg-[var(--canvas)] p-1">
                                <button
                                    type="button"
                                    onClick={() => setView("list")}
                                    className={`flex h-8 items-center gap-2 rounded px-3 text-xs font-medium ${
                                        view === "list"
                                            ? "bg-[var(--surface-3)] text-[var(--text)] shadow-[var(--shadow-line)]"
                                            : "text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
                                    }`}
                                >
                                    <List className="h-4 w-4" strokeWidth={1.5} />
                                    List
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setView("calendar")}
                                    className={`flex h-8 items-center gap-2 rounded px-3 text-xs font-medium ${
                                        view === "calendar"
                                            ? "bg-[var(--surface-3)] text-[var(--text)] shadow-[var(--shadow-line)]"
                                            : "text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
                                    }`}
                                >
                                    <Calendar className="h-4 w-4" strokeWidth={1.5} />
                                    Calendar
                                </button>
                            </div>

                            <button
                                type="button"
                                onClick={() => setIsComposeOpen(true)}
                                className="linear-button-primary h-9"
                            >
                                <Plus className="h-4 w-4" strokeWidth={1.5} />
                                Compose
                            </button>
                        </div>
                    </div>
                </div>

                <div className="grid border-b border-[var(--border)] md:grid-cols-6">
                    <HeaderMetric label="Total" value={stats.total} />
                    <HeaderMetric label="Filtered" value={stats.filtered} />
                    <HeaderMetric label="Pending" value={stats.pending} />
                    <HeaderMetric label="Processing" value={stats.processing} />
                    <HeaderMetric label="Posted" value={stats.posted} />
                    <HeaderMetric label="Failed" value={stats.failed} />
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard title="Total Posts" value={stats.total} icon={Layers3} />
                <MetricCard title="Scheduled" value={stats.scheduled} icon={Calendar} warning={stats.scheduled > 0} />
                <MetricCard title="Posted" value={stats.posted} icon={CheckCircle2} success />
                <MetricCard title="Failed" value={stats.failed} icon={AlertTriangle} danger={stats.failed > 0} />
            </div>

            <div className="linear-card overflow-hidden">
                <div className="border-b border-[var(--border)] bg-[var(--surface-hover)] px-4 py-3">
                    <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
                        <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[rgba(94,106,210,0.28)] bg-[rgba(94,106,210,0.09)] text-[var(--accent)]">
                                <Filter className="h-4 w-4" strokeWidth={1.5} />
                            </div>

                            <div>
                                <h2 className="text-sm font-semibold text-[var(--text)]">
                                    {view === "list" ? "Publishing Table" : "Publishing Calendar"}
                                </h2>
                                <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
                                    Showing {filteredPosts.length} of {posts.length} posts.
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2 sm:flex-row">
                            {hasActiveFilters && (
                                <button type="button" onClick={clearFilters} className="linear-button-danger h-9">
                                    <RotateCcw className="h-4 w-4" strokeWidth={1.5} />
                                    Clear
                                </button>
                            )}

                            <button type="button" onClick={loadPosts} className="linear-button-secondary h-9">
                                <RotateCcw className="h-4 w-4" strokeWidth={1.5} />
                                Refresh
                            </button>
                        </div>
                    </div>
                </div>

                <div className="border-b border-[var(--border)] p-4">
                    <div className="relative">
                        <Search
                            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]"
                            strokeWidth={1.5}
                        />

                        <input
                            value={searchQuery}
                            onChange={(event) => setSearchQuery(event.target.value)}
                            placeholder="Search by content, username, platform, or status..."
                            className="linear-input h-10 pl-9 pr-10"
                        />

                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery("")}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text)]"
                            >
                                <X className="h-4 w-4" strokeWidth={1.5} />
                            </button>
                        )}
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-3">
                        <FilterGroup title="Platform" subtitle="Channel">
                            {platformOptions.map((option) => {
                                const platformInfo = option.value !== "all" ? PLATFORMS[option.value] : null;
                                const Icon = platformInfo?.icon || Layers3;

                                return (
                                    <FilterButton
                                        key={option.value}
                                        active={platformFilter === option.value}
                                        onClick={() => setPlatformFilter(option.value)}
                                    >
                                        <Icon className="h-4 w-4" />
                                        {option.label}
                                    </FilterButton>
                                );
                            })}
                        </FilterGroup>

                        <FilterGroup title="Status" subtitle="Progress">
                            {statusOptions.map((option) => (
                                <FilterButton
                                    key={option.value}
                                    active={statusFilter === option.value}
                                    onClick={() => setStatusFilter(option.value)}
                                >
                                    {option.label}
                                </FilterButton>
                            ))}
                        </FilterGroup>

                        <FilterGroup title="Post Type" subtitle="Timing">
                            {typeOptions.map((option) => (
                                <FilterButton
                                    key={option.value}
                                    active={typeFilter === option.value}
                                    onClick={() => setTypeFilter(option.value)}
                                >
                                    {option.label}
                                </FilterButton>
                            ))}
                        </FilterGroup>
                    </div>

                    {hasActiveFilters && (
                        <div className="mt-4 flex flex-wrap items-center gap-2">
                            <span className="text-xs font-medium text-[var(--text-muted)]">Active filters:</span>

                            {searchQuery.trim() && <ActiveFilter label={`Search: ${searchQuery}`} />}

                            {platformFilter !== "all" && (
                                <ActiveFilter
                                    label={`Platform: ${PLATFORMS[platformFilter]?.name || platformFilter}`}
                                />
                            )}

                            {statusFilter !== "all" && <ActiveFilter label={`Status: ${statusFilter}`} />}

                            {typeFilter !== "all" && (
                                <ActiveFilter
                                    label={`Type: ${typeFilter === "scheduled" ? "Scheduled" : "Immediate / Posted"}`}
                                />
                            )}
                        </div>
                    )}
                </div>

                {error && (
                    <div className="m-4 flex items-start gap-3 rounded-md border border-[rgba(239,68,68,0.28)] bg-[rgba(239,68,68,0.08)] px-3 py-2 text-sm font-medium text-red-300">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.5} />
                        {error}
                    </div>
                )}

                {loadingPosts ? (
                    <div className="flex items-center justify-center gap-3 px-6 py-16">
                        <Loader2 className="h-4 w-4 animate-spin text-[var(--accent)]" strokeWidth={1.5} />
                        <span className="text-sm font-medium text-[var(--text-soft)]">Refreshing posts</span>
                    </div>
                ) : posts.length === 0 ? (
                    <EmptyState
                        icon={Send}
                        title="No posts yet"
                        text="Compose your first Twitter/X, Mastodon, or Instagram Threads post."
                    />
                ) : filteredPosts.length === 0 ? (
                    <EmptyState icon={Search} title="No matching posts" text="Change your search or filters." />
                ) : view === "calendar" ? (
                    <PublishingCalendar
                        posts={filteredPosts}
                        onCompose={() => setIsComposeOpen(true)}
                        onDelete={deletePost}
                        deletingPostId={deletingPostId}
                    />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[980px]">
                            <thead className="border-b border-[var(--border)] bg-[var(--canvas)]">
                                <tr>
                                    <TableHead>Account</TableHead>
                                    <TableHead>Content</TableHead>
                                    <TableHead>Time</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead align="right">Actions</TableHead>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-[var(--border)]">
                                {filteredPosts.map((post, index) => {
                                    const platform = PLATFORMS[post.socialAccount.platform];
                                    const Icon = platform?.icon || Send;
                                    const postTime = getPostTime(post);
                                    const isDeleting = deletingPostId === post.id;

                                    return (
                                        <motion.tr
                                            key={post.id}
                                            initial={{ opacity: 0, y: 6 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{
                                                delay: index * 0.015,
                                                duration: 0.15,
                                                ease: [0.16, 1, 0.3, 1],
                                            }}
                                            className="transition-colors hover:bg-[var(--surface-hover)]"
                                        >
                                            <td className="px-4 py-3 align-top">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface-3)] text-[var(--text)] shadow-[var(--shadow-line)]">
                                                        <Icon className="h-4 w-4" />
                                                    </div>

                                                    <div className="min-w-0">
                                                        <h4 className="truncate text-sm font-medium text-[var(--text)]">
                                                            @{post.socialAccount.accountUsername}
                                                        </h4>
                                                        <p className="mt-1 text-xs text-[var(--text-muted)]">
                                                            {platform?.name || post.socialAccount.platform}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="max-w-md px-4 py-3 align-top">
                                                <p className="line-clamp-3 text-sm leading-6 text-[var(--text-soft)]">
                                                    {post.content}
                                                </p>
                                            </td>

                                            <td className="px-4 py-3 align-top">
                                                <div className="flex items-start gap-2 text-sm text-[var(--text-soft)]">
                                                    <Clock
                                                        className="mt-0.5 h-4 w-4 text-[var(--text-muted)]"
                                                        strokeWidth={1.5}
                                                    />
                                                    <div>
                                                        <p className="font-medium text-[var(--text-soft)]">
                                                            {getPostTimingLabel(post)}
                                                        </p>

                                                        <p className="mt-1 text-xs text-[var(--text-muted)]">
                                                            {new Date(postTime).toLocaleString()}
                                                        </p>

                                                        {!post.scheduledAt && post.status === "pending" && (
                                                            <span className="mt-2 inline-flex items-center gap-1 text-xs text-[var(--success)]">
                                                                <CheckCircle2 className="h-3 w-3" strokeWidth={1.5} />
                                                                Immediate
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="px-4 py-3 align-top">
                                                <span
                                                    className={`linear-badge uppercase ${getStatusClass(post.status)}`}
                                                >
                                                    {post.status}
                                                </span>
                                            </td>

                                            <td className="px-4 py-3 text-right align-top">
                                                <button
                                                    type="button"
                                                    onClick={() => deletePost(post)}
                                                    disabled={isDeleting || post.status === "processing"}
                                                    className="linear-button-danger h-8 px-3 text-xs"
                                                >
                                                    {isDeleting ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
                                                    ) : (
                                                        <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                                                    )}
                                                    Delete
                                                </button>
                                            </td>
                                        </motion.tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <ComposeModal
                selectedAccounts={selectedAccounts}
                setSelectedAccounts={setSelectedAccounts}
                isOpen={isComposeOpen}
                onClose={closeCompose}
            />
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
    icon: ElementType;
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

function FilterGroup({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
    return (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--canvas)] p-3">
            <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--text-muted)]">{title}</p>

                <span className="text-[11px] text-[var(--text-muted)]">{subtitle}</span>
            </div>

            <div className="flex flex-wrap gap-2">{children}</div>
        </div>
    );
}

function FilterButton({
    active,
    onClick,
    children,
}: {
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`inline-flex h-8 items-center gap-2 rounded border px-3 text-xs font-medium transition-colors ${
                active
                    ? "border-[rgba(94,106,210,0.34)] bg-[var(--surface-active)] text-[var(--text)]"
                    : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-soft)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
            }`}
        >
            {children}
        </button>
    );
}

function ActiveFilter({ label }: { label: string }) {
    return (
        <span className="linear-badge border-[rgba(94,106,210,0.28)] bg-[rgba(94,106,210,0.09)] text-[var(--accent)]">
            {label}
        </span>
    );
}

function TableHead({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
    return (
        <th
            className={`px-4 py-3 text-xs font-medium uppercase tracking-[0.12em] text-[var(--text-muted)] ${
                align === "right" ? "text-right" : "text-left"
            }`}
        >
            {children}
        </th>
    );
}

function EmptyState({ icon: Icon, title, text }: { icon: ElementType; title: string; text: string }) {
    return (
        <div className="px-6 py-16 text-center">
            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--canvas)] text-[var(--text-muted)]">
                <Icon className="h-5 w-5" strokeWidth={1.5} />
            </div>

            <h3 className="text-sm font-semibold text-[var(--text)]">{title}</h3>

            <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-[var(--text-muted)]">{text}</p>
        </div>
    );
}
