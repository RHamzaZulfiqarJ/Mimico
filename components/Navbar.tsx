"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
    AlertTriangle,
    Bell,
    CalendarClock,
    CheckCircle2,
    ChevronDown,
    Command,
    LayoutDashboard,
    Loader2,
    LogOut,
    MessageCircle,
    RefreshCw,
    Search,
    Send,
    UserCircle,
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { whatsappClient, type WhatsAppScheduledMessage, type WhatsAppTemplate } from "@/libs/whatsapp/client";

type User = {
    firstName: string;
    lastName: string;
    email?: string;
};

type SocialPost = {
    id: string;
    content: string;
    scheduledAt: string | null;
    postedAt: string | null;
    status: string;
    createdAt: string;
    errorMessage?: string | null;
    socialAccount?: {
        platform: string;
        accountUsername: string;
    };
};

type NavNotification = {
    id: string;
    title: string;
    message: string;
    time: string;
    timestamp: number;
    level: "danger" | "warning" | "info" | "success";
    href: string;
    source: "publishing" | "whatsapp" | "system";
};

const pageTitles: Record<string, string> = {
    "/dashboard": "Dashboard",
    "/publishing": "Publishing",
    "/twitter": "Twitter / X",
    "/mastodon": "Mastodon",
    "/threads": "Threads",
    "/whatsapp": "WhatsApp",
    "/analytics": "Analytics",
};

const readStorageKey = "mimico-read-notifications";

const formatDateTime = (value?: string | null) => {
    if (!value) {
        return "N/A";
    }

    return new Date(value).toLocaleString();
};

const getPostTime = (post: SocialPost) => {
    return post.postedAt || post.scheduledAt || post.createdAt;
};

const normalizePlatform = (platform?: string) => {
    const value = platform?.toLowerCase();

    if (value === "twitter") {
        return "Twitter / X";
    }

    if (value === "mastodon") {
        return "Mastodon";
    }

    if (value === "threads") {
        return "Threads";
    }

    return platform || "Social";
};

const getReadIds = () => {
    try {
        return JSON.parse(localStorage.getItem(readStorageKey) || "[]") as string[];
    } catch {
        return [];
    }
};

export default function Navbar() {
    const router = useRouter();
    const pathname = usePathname();
    const profileRef = useRef<HTMLDivElement | null>(null);
    const notificationRef = useRef<HTMLDivElement | null>(null);

    const [user, setUser] = useState<User | null>(null);
    const [loadingUser, setLoadingUser] = useState(true);
    const [profileOpen, setProfileOpen] = useState(false);
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const [notifications, setNotifications] = useState<NavNotification[]>([]);
    const [notificationsLoading, setNotificationsLoading] = useState(false);
    const [notificationError, setNotificationError] = useState("");
    const [readNotificationIds, setReadNotificationIds] = useState<string[]>([]);

    const pageTitle = useMemo(() => {
        const matchedRoute = Object.keys(pageTitles)
            .sort((a, b) => b.length - a.length)
            .find((route) => pathname === route || pathname.startsWith(`${route}/`));

        return matchedRoute ? pageTitles[matchedRoute] : "Workspace";
    }, [pathname]);

    const initials = useMemo(() => {
        if (!user) {
            return "AM";
        }

        return `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase() || "AM";
    }, [user]);

    const unreadCount = useMemo(() => {
        return notifications.filter((item) => !readNotificationIds.includes(item.id)).length;
    }, [notifications, readNotificationIds]);

    const buildSocialNotifications = (posts: SocialPost[]) => {
        const now = Date.now();
        const nextDay = now + 24 * 60 * 60 * 1000;

        const failed = posts
            .filter((post) => post.status === "failed")
            .slice(0, 5)
            .map((post) => ({
                id: `post-failed-${post.id}`,
                title: "Post failed",
                message: `${normalizePlatform(post.socialAccount?.platform)} post failed${post.errorMessage ? `: ${post.errorMessage}` : "."}`,
                time: formatDateTime(getPostTime(post)),
                timestamp: new Date(getPostTime(post)).getTime(),
                level: "danger" as const,
                href: "/publishing",
                source: "publishing" as const,
            }));

        const processing = posts
            .filter((post) => post.status === "processing")
            .slice(0, 3)
            .map((post) => ({
                id: `post-processing-${post.id}`,
                title: "Post processing",
                message: `${normalizePlatform(post.socialAccount?.platform)} post is currently being processed.`,
                time: formatDateTime(getPostTime(post)),
                timestamp: new Date(getPostTime(post)).getTime(),
                level: "info" as const,
                href: "/publishing",
                source: "publishing" as const,
            }));

        const upcoming = posts
            .filter((post) => {
                if (post.status !== "pending" || !post.scheduledAt) {
                    return false;
                }

                const scheduledTime = new Date(post.scheduledAt).getTime();

                return scheduledTime >= now && scheduledTime <= nextDay;
            })
            .slice(0, 5)
            .map((post) => ({
                id: `post-upcoming-${post.id}`,
                title: "Post scheduled soon",
                message: `${normalizePlatform(post.socialAccount?.platform)} post is scheduled within 24 hours.`,
                time: formatDateTime(post.scheduledAt),
                timestamp: new Date(post.scheduledAt || post.createdAt).getTime(),
                level: "warning" as const,
                href: "/publishing",
                source: "publishing" as const,
            }));

        return [...failed, ...processing, ...upcoming];
    };

    const buildWhatsAppNotifications = (
        failedMessages: WhatsAppScheduledMessage[],
        queuedMessages: WhatsAppScheduledMessage[],
        templates: WhatsAppTemplate[],
    ) => {
        const now = Date.now();
        const nextDay = now + 24 * 60 * 60 * 1000;

        const failed = failedMessages.slice(0, 5).map((message) => ({
            id: `wa-failed-${message.id}`,
            title: "WhatsApp message failed",
            message:
                message.errorMessage || `${message.templateName || "Template"} failed for ${message.recipientPhone}.`,
            time: formatDateTime(message.updatedAt || message.scheduledAt),
            timestamp: new Date(message.updatedAt || message.scheduledAt || message.createdAt).getTime(),
            level: "danger" as const,
            href: "/whatsapp",
            source: "whatsapp" as const,
        }));

        const queued = queuedMessages
            .filter((message) => {
                const scheduledTime = new Date(message.scheduledAt).getTime();

                return scheduledTime >= now && scheduledTime <= nextDay;
            })
            .slice(0, 5)
            .map((message) => ({
                id: `wa-queued-${message.id}`,
                title: "WhatsApp scheduled soon",
                message: `${message.templateName || "Template"} will be sent to ${message.recipientPhone}.`,
                time: formatDateTime(message.scheduledAt),
                timestamp: new Date(message.scheduledAt).getTime(),
                level: "warning" as const,
                href: "/whatsapp",
                source: "whatsapp" as const,
            }));

        const pendingTemplates = templates
            .filter((template) => {
                const status = template.status?.toUpperCase();

                return status === "PENDING" || status === "IN_REVIEW";
            })
            .slice(0, 5)
            .map((template) => ({
                id: `wa-template-${template.id}`,
                title: "Template waiting approval",
                message: `${template.name} is still waiting for Meta approval.`,
                time: formatDateTime(template.updatedAt || template.createdAt),
                timestamp: new Date(template.updatedAt || template.createdAt || Date.now()).getTime(),
                level: "info" as const,
                href: "/whatsapp",
                source: "whatsapp" as const,
            }));

        return [...failed, ...queued, ...pendingTemplates];
    };

    const loadNotifications = async () => {
        try {
            setNotificationsLoading(true);
            setNotificationError("");

            const items: NavNotification[] = [];

            const postsRes = await fetch("/api/posts");

            if (postsRes.ok) {
                const data = await postsRes.json();
                items.push(...buildSocialNotifications(data.posts || []));
            }

            try {
                const accountData = await whatsappClient.listAccounts();

                const whatsappData = await Promise.all(
                    accountData.accounts.map(async (account) => {
                        const [failed, queued, templates] = await Promise.all([
                            whatsappClient.listScheduledMessages(account.id, { limit: 5, status: "FAILED" }),
                            whatsappClient.listScheduledMessages(account.id, { limit: 5, status: "QUEUED" }),
                            whatsappClient.listTemplates(account.id, { limit: 20 }),
                        ]);

                        return {
                            failed: failed.items,
                            queued: queued.items,
                            templates: templates.items,
                        };
                    }),
                );

                whatsappData.forEach((data) => {
                    items.push(...buildWhatsAppNotifications(data.failed, data.queued, data.templates));
                });
            } catch {
                items.push({
                    id: "whatsapp-sync-warning",
                    title: "WhatsApp notifications unavailable",
                    message: "WhatsApp data could not be loaded right now.",
                    time: "Now",
                    timestamp: Date.now(),
                    level: "warning",
                    href: "/whatsapp",
                    source: "system",
                });
            }

            const sortedItems = items.sort((a, b) => b.timestamp - a.timestamp).slice(0, 20);

            setNotifications(sortedItems);
        } catch {
            setNotificationError("Could not load notifications");
        } finally {
            setNotificationsLoading(false);
        }
    };

    const markAllAsRead = () => {
        const ids = notifications.map((item) => item.id);

        localStorage.setItem(readStorageKey, JSON.stringify(ids));
        setReadNotificationIds(ids);
    };

    const openNotification = (item: NavNotification) => {
        const ids = Array.from(new Set([...readNotificationIds, item.id]));

        localStorage.setItem(readStorageKey, JSON.stringify(ids));
        setReadNotificationIds(ids);
        setNotificationsOpen(false);
        router.push(item.href);
    };

    const handleLogout = async () => {
        await fetch("/api/auth/logout", {
            method: "POST",
        });

        window.location.href = "/login";
    };

    useEffect(() => {
        let active = true;

        async function loadUser() {
            try {
                const res = await fetch("/api/auth/user");

                if (!res.ok) {
                    router.push("/login");
                    return;
                }

                const data = await res.json();

                if (active) {
                    setUser(data.user);
                }
            } finally {
                if (active) {
                    setLoadingUser(false);
                }
            }
        }

        loadUser();

        return () => {
            active = false;
        };
    }, [router]);

    useEffect(() => {
        setReadNotificationIds(getReadIds());
        loadNotifications();

        const interval = window.setInterval(() => {
            loadNotifications();
        }, 60000);

        return () => {
            window.clearInterval(interval);
        };
    }, []);

    useEffect(() => {
        const closeMenus = (event: MouseEvent) => {
            const target = event.target as Node;

            if (profileRef.current && !profileRef.current.contains(target)) {
                setProfileOpen(false);
            }

            if (notificationRef.current && !notificationRef.current.contains(target)) {
                setNotificationsOpen(false);
            }
        };

        document.addEventListener("mousedown", closeMenus);

        return () => {
            document.removeEventListener("mousedown", closeMenus);
        };
    }, []);

    return (
        <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-4 md:px-6">
            <div className="flex min-w-0 items-center gap-4">
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <h1 className="truncate text-sm font-semibold tracking-[-0.02em] text-[var(--text)]">
                            {pageTitle}
                        </h1>

                        <span className="hidden h-1 w-1 rounded-full bg-[var(--text-muted)] sm:block" />

                        <span className="hidden text-xs font-medium text-[var(--text-muted)] sm:block">
                            Account Manager
                        </span>
                    </div>

                    <p className="hidden text-xs text-[var(--text-muted)] md:block">
                        Manage accounts, publishing queues, and platform workflows.
                    </p>
                </div>
            </div>

            <div className="mx-4 hidden max-w-xl flex-1 lg:block">
                <div className="group relative">
                    <Search
                        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--accent)]"
                        strokeWidth={1.5}
                    />

                    <input
                        type="text"
                        placeholder="Search posts, contacts, accounts..."
                        className="linear-input h-9 pl-9 pr-20"
                    />

                    <div className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 items-center gap-1 xl:flex">
                        <kbd>
                            <Command className="h-3 w-3" strokeWidth={1.5} />
                        </kbd>
                        <kbd>K</kbd>
                    </div>
                </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
                <ThemeToggle />

                <div ref={notificationRef} className="relative">
                    <button
                        type="button"
                        onClick={() => setNotificationsOpen((current) => !current)}
                        className="linear-button-secondary relative h-9 w-9 p-0"
                        aria-label="Notifications"
                    >
                        <Bell className="h-4 w-4" strokeWidth={1.5} />

                        {unreadCount > 0 && (
                            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--accent)] px-1 text-[10px] font-semibold text-white">
                                {unreadCount > 9 ? "9+" : unreadCount}
                            </span>
                        )}
                    </button>

                    {notificationsOpen && (
                        <div className="linear-popover absolute right-0 top-11 w-[360px] overflow-hidden">
                            <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
                                <div>
                                    <h3 className="text-sm font-semibold text-[var(--text)]">Notifications</h3>
                                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                                        {unreadCount} unread item(s)
                                    </p>
                                </div>

                                <div className="flex items-center gap-1">
                                    <button
                                        type="button"
                                        onClick={loadNotifications}
                                        disabled={notificationsLoading}
                                        className="linear-button-secondary h-8 w-8 p-0"
                                    >
                                        {notificationsLoading ? (
                                            <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
                                        ) : (
                                            <RefreshCw className="h-4 w-4" strokeWidth={1.5} />
                                        )}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={markAllAsRead}
                                        disabled={notifications.length === 0}
                                        className="linear-button-secondary h-8 px-3 text-xs"
                                    >
                                        Mark read
                                    </button>
                                </div>
                            </div>

                            <div className="custom-scrollbar max-h-[420px] overflow-y-auto">
                                {notificationError ? (
                                    <div className="p-4 text-sm text-red-300">{notificationError}</div>
                                ) : notificationsLoading && notifications.length === 0 ? (
                                    <div className="flex items-center justify-center gap-3 px-4 py-10">
                                        <Loader2
                                            className="h-4 w-4 animate-spin text-[var(--accent)]"
                                            strokeWidth={1.5}
                                        />
                                        <span className="text-sm font-medium text-[var(--text-soft)]">
                                            Loading notifications
                                        </span>
                                    </div>
                                ) : notifications.length === 0 ? (
                                    <div className="px-6 py-10 text-center">
                                        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--canvas)] text-[var(--success)]">
                                            <CheckCircle2 className="h-5 w-5" strokeWidth={1.5} />
                                        </div>

                                        <h4 className="text-sm font-semibold text-[var(--text)]">All clear</h4>

                                        <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">
                                            No failed posts, upcoming scheduled work, or pending WhatsApp alerts.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-[var(--border)]">
                                        {notifications.map((item) => {
                                            const unread = !readNotificationIds.includes(item.id);

                                            return (
                                                <button
                                                    key={item.id}
                                                    type="button"
                                                    onClick={() => openNotification(item)}
                                                    className="flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--surface-hover)]"
                                                >
                                                    <div
                                                        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border ${
                                                            item.level === "danger"
                                                                ? "border-[rgba(239,68,68,0.25)] bg-[rgba(239,68,68,0.08)] text-red-300"
                                                                : item.level === "warning"
                                                                  ? "border-[rgba(245,158,11,0.25)] bg-[rgba(245,158,11,0.08)] text-[var(--warning)]"
                                                                  : item.source === "whatsapp"
                                                                    ? "border-[rgba(34,197,94,0.22)] bg-[rgba(34,197,94,0.08)] text-[var(--success)]"
                                                                    : "border-[rgba(94,106,210,0.28)] bg-[rgba(94,106,210,0.09)] text-[var(--accent)]"
                                                        }`}
                                                    >
                                                        {item.level === "danger" ? (
                                                            <AlertTriangle className="h-4 w-4" strokeWidth={1.5} />
                                                        ) : item.source === "whatsapp" ? (
                                                            <MessageCircle className="h-4 w-4" strokeWidth={1.5} />
                                                        ) : (
                                                            <CalendarClock className="h-4 w-4" strokeWidth={1.5} />
                                                        )}
                                                    </div>

                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <h4 className="truncate text-sm font-medium text-[var(--text)]">
                                                                {item.title}
                                                            </h4>

                                                            {unread && (
                                                                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
                                                            )}
                                                        </div>

                                                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--text-soft)]">
                                                            {item.message}
                                                        </p>

                                                        <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                                                            {item.time}
                                                        </p>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="mx-1 hidden h-6 w-px bg-[var(--border)] sm:block" />

                <div ref={profileRef} className="relative">
                    <button
                        type="button"
                        onClick={() => setProfileOpen((current) => !current)}
                        className="group flex h-9 items-center gap-2 rounded-md border border-transparent px-1.5 transition-colors hover:border-[var(--border)] hover:bg-[var(--surface-hover)]"
                    >
                        <span className="flex h-7 w-7 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface-3)] text-xs font-semibold text-[var(--text)] shadow-[var(--shadow-line)]">
                            {loadingUser ? "..." : initials}
                        </span>

                        <span className="hidden min-w-0 text-left md:block">
                            <span className="block max-w-[130px] truncate text-xs font-medium text-[var(--text)]">
                                {loadingUser ? "Loading..." : user ? `${user.firstName} ${user.lastName}` : "Account"}
                            </span>

                            <span className="block max-w-[130px] truncate text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--text-muted)]">
                                Operator
                            </span>
                        </span>

                        <ChevronDown
                            className={`hidden h-4 w-4 text-[var(--text-muted)] transition-transform group-hover:text-[var(--text-soft)] md:block ${profileOpen ? "rotate-180" : ""}`}
                            strokeWidth={1.5}
                        />
                    </button>

                    {profileOpen && (
                        <div className="linear-popover absolute right-0 top-11 w-[280px] overflow-hidden">
                            <div className="border-b border-[var(--border)] p-4">
                                <div className="flex items-center gap-3">
                                    <span className="flex h-10 w-10 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface-3)] text-sm font-semibold text-[var(--text)]">
                                        {initials}
                                    </span>

                                    <div className="min-w-0">
                                        <h3 className="truncate text-sm font-semibold text-[var(--text)]">
                                            {user ? `${user.firstName} ${user.lastName}` : "Account"}
                                        </h3>

                                        <p className="truncate text-xs text-[var(--text-muted)]">
                                            {user?.email || "Signed in user"}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setProfileOpen(false);
                                        router.push("/dashboard");
                                    }}
                                    className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-medium text-[var(--text-soft)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
                                >
                                    <LayoutDashboard className="h-4 w-4" strokeWidth={1.5} />
                                    Dashboard
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setProfileOpen(false);
                                        router.push("/publishing");
                                    }}
                                    className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-medium text-[var(--text-soft)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
                                >
                                    <Send className="h-4 w-4" strokeWidth={1.5} />
                                    Publishing
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setProfileOpen(false);
                                        router.push("/analytics");
                                    }}
                                    className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-medium text-[var(--text-soft)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
                                >
                                    <UserCircle className="h-4 w-4" strokeWidth={1.5} />
                                    Analytics
                                </button>
                            </div>

                            <div className="border-t border-[var(--border)] p-2">
                                <button
                                    type="button"
                                    onClick={handleLogout}
                                    className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-medium text-red-300 hover:bg-[rgba(239,68,68,0.08)] hover:text-red-200"
                                >
                                    <LogOut className="h-4 w-4" strokeWidth={1.5} />
                                    Logout
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
