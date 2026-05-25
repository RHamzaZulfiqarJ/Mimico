"use client";

import { motion } from "framer-motion";
import { BarChart3, CalendarClock, ChevronRight, LayoutDashboard, MessageCircle, Share2 } from "lucide-react";
import { BsTwitterX } from "react-icons/bs";
import { SiMastodon, SiThreads } from "react-icons/si";
import { usePathname, useRouter } from "next/navigation";

const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/publishing", label: "Publishing", icon: CalendarClock },
    { href: "/twitter", label: "Twitter / X", icon: BsTwitterX },
    { href: "/mastodon", label: "Mastodon", icon: SiMastodon },
    { href: "/threads", label: "Threads", icon: SiThreads },
    { href: "/whatsapp", label: "WhatsApp", icon: MessageCircle },
    { href: "/analytics", label: "Analytics", icon: BarChart3 },
];

export default function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();

    return (
        <motion.aside
            initial={{ x: -16, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="sticky top-0 z-50 hidden h-screen w-[264px] shrink-0 border-r border-[var(--border)] bg-[var(--surface)] md:flex md:flex-col"
        >
            <div className="flex h-14 items-center border-b border-[var(--border)] px-4">
                <button
                    type="button"
                    onClick={() => router.push("/dashboard")}
                    className="group flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left hover:bg-[var(--surface-hover)]"
                >
                    <span className="flex h-8 w-8 items-center justify-center rounded-md border border-[rgba(255,255,255,0.1)] bg-[var(--accent)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.16)]">
                        <Share2 className="h-4 w-4" strokeWidth={1.5} />
                    </span>

                    <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold tracking-[-0.02em] text-[var(--text)]">
                            MIMICO
                        </span>
                        <span className="block truncate text-[11px] font-medium text-[var(--text-muted)]">
                            Account workspace
                        </span>
                    </span>

                    <ChevronRight
                        className="h-4 w-4 text-[var(--text-muted)] opacity-0 transition-opacity group-hover:opacity-100"
                        strokeWidth={1.5}
                    />
                </button>
            </div>

            <div className="custom-scrollbar flex-1 overflow-y-auto px-3 py-4">
                <div className="mb-3 px-2 text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--text-muted)]">
                    Workspace
                </div>

                <nav className="space-y-1">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                        const Icon = item.icon;

                        return (
                            <button
                                key={item.href}
                                type="button"
                                onClick={() => router.push(item.href)}
                                className={`group relative flex h-9 w-full items-center gap-3 rounded-md border px-2.5 text-sm font-medium transition-all duration-150 ${
                                    isActive
                                        ? "border-[rgba(94,106,210,0.32)] bg-[var(--surface-active)] text-[var(--text)]"
                                        : "border-transparent text-[var(--text-soft)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
                                }`}
                            >
                                {isActive && (
                                    <motion.span
                                        layoutId="sidebar-active-indicator"
                                        className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-[var(--accent)]"
                                        transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                                    />
                                )}

                                <Icon
                                    className={`h-4 w-4 shrink-0 ${
                                        isActive
                                            ? "text-[var(--accent)]"
                                            : "text-[var(--text-muted)] group-hover:text-[var(--text-soft)]"
                                    }`}
                                    strokeWidth={1.5}
                                />

                                <span className="truncate">{item.label}</span>
                            </button>
                        );
                    })}
                </nav>
            </div>

            <div className="border-t border-[var(--border)] p-3">
                <div className="mb-3 rounded-lg border border-[var(--border)] bg-[var(--canvas)] p-3">
                    <div className="mb-1 flex items-center justify-between gap-2">
                        <p className="truncate text-xs font-medium text-[var(--text)]">System status</p>
                        <span className="h-1.5 w-1.5 rounded-full bg-[var(--danger)]" />
                    </div>

                    <p className="text-xs leading-5 text-[var(--text-muted)]">
                        Twitter API is not responding.
                    </p>
                </div>
            </div>
        </motion.aside>
    );
}
