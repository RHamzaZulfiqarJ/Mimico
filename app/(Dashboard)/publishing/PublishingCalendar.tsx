"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
    AlertTriangle,
    CalendarDays,
    ChevronLeft,
    ChevronRight,
    Clock,
    Loader2,
    Plus,
    Send,
    Trash2,
} from "lucide-react";
import { PLATFORMS } from "@/libs/platform";

type CalendarPost = {
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

type PublishingCalendarProps = {
    posts: CalendarPost[];
    onCompose: () => void;
    onDelete: (post: CalendarPost) => void;
    deletingPostId: string | null;
};

const getDateKey = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
};

const getStatusClass = (status: CalendarPost["status"]) => {
    if (status === "posted") return "bg-emerald-500/10 text-emerald-300 border-emerald-500/20";
    if (status === "pending") return "bg-amber-500/10 text-amber-300 border-amber-500/20";
    if (status === "processing") return "bg-purple-500/10 text-purple-300 border-purple-500/20";
    return "bg-red-500/10 text-red-300 border-red-500/20";
};

const getDotClass = (status: CalendarPost["status"]) => {
    if (status === "posted") return "bg-emerald-400";
    if (status === "pending") return "bg-amber-400";
    if (status === "processing") return "bg-purple-400";
    return "bg-red-400";
};

export default function PublishingCalendar({ posts, onCompose, onDelete, deletingPostId }: PublishingCalendarProps) {
    const [activeMonth, setActiveMonth] = useState(() => new Date());
    const [selectedDate, setSelectedDate] = useState(() => new Date());

    const scheduledPosts = useMemo(() => {
        return posts
            .filter((post) => Boolean(post.scheduledAt))
            .sort((a, b) => {
                return (
                    new Date(a.scheduledAt || a.createdAt).getTime() - new Date(b.scheduledAt || b.createdAt).getTime()
                );
            });
    }, [posts]);

    const postsByDate = useMemo(() => {
        return scheduledPosts.reduce<Record<string, CalendarPost[]>>((acc, post) => {
            if (!post.scheduledAt) return acc;

            const key = getDateKey(new Date(post.scheduledAt));

            if (!acc[key]) {
                acc[key] = [];
            }

            acc[key].push(post);

            return acc;
        }, {});
    }, [scheduledPosts]);

    const calendarDays = useMemo(() => {
        const year = activeMonth.getFullYear();
        const month = activeMonth.getMonth();
        const firstDay = new Date(year, month, 1);
        const start = new Date(year, month, 1 - firstDay.getDay());

        return Array.from({ length: 42 }, (_, index) => {
            const date = new Date(start);
            date.setDate(start.getDate() + index);
            return date;
        });
    }, [activeMonth]);

    const selectedDateKey = getDateKey(selectedDate);
    const selectedPosts = postsByDate[selectedDateKey] || [];
    const todayKey = getDateKey(new Date());

    const moveMonth = (value: number) => {
        setActiveMonth((current) => {
            const next = new Date(current);
            next.setMonth(current.getMonth() + value);
            return next;
        });
    };

    const goToday = () => {
        const today = new Date();
        setActiveMonth(today);
        setSelectedDate(today);
    };

    return (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6 p-6">
            <div className="rounded-2xl border border-white/5 bg-gray-950/40 overflow-hidden">
                <div className="p-5 border-b border-white/5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h3 className="text-white font-bold flex items-center gap-2">
                            <CalendarDays className="w-5 h-5 text-purple-300" />
                            {activeMonth.toLocaleDateString(undefined, {
                                month: "long",
                                year: "numeric",
                            })}
                        </h3>

                        <p className="text-sm text-gray-500 mt-1">
                            Showing {scheduledPosts.length} scheduled {scheduledPosts.length === 1 ? "post" : "posts"}
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => moveMonth(-1)}
                            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 transition"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>

                        <button
                            type="button"
                            onClick={goToday}
                            className="px-4 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-200 text-sm font-semibold border border-purple-500/20 transition"
                        >
                            Today
                        </button>

                        <button
                            type="button"
                            onClick={() => moveMonth(1)}
                            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 transition"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-7 border-b border-white/5 bg-white/[0.03]">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                        <div
                            key={day}
                            className="p-3 text-center text-xs font-bold text-gray-500 uppercase tracking-widest"
                        >
                            {day}
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-7">
                    {calendarDays.map((date) => {
                        const key = getDateKey(date);
                        const dayPosts = postsByDate[key] || [];
                        const isCurrentMonth = date.getMonth() === activeMonth.getMonth();
                        const isToday = key === todayKey;
                        const isSelected = key === selectedDateKey;

                        return (
                            <button
                                key={key}
                                type="button"
                                onClick={() => setSelectedDate(date)}
                                className={`min-h-32 p-3 text-left border-r border-b border-white/5 transition group ${
                                    isSelected ? "bg-purple-600/15" : "hover:bg-white/[0.04]"
                                } ${!isCurrentMonth ? "bg-black/20 text-gray-700" : "text-gray-300"}`}
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <span
                                        className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold ${
                                            isToday
                                                ? "bg-purple-600 text-white"
                                                : isSelected
                                                  ? "text-purple-200"
                                                  : "text-gray-400"
                                        }`}
                                    >
                                        {date.getDate()}
                                    </span>

                                    {dayPosts.length > 0 && (
                                        <span className="text-[10px] px-2 py-1 rounded-full bg-white/5 border border-white/5 text-gray-400">
                                            {dayPosts.length}
                                        </span>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    {dayPosts.slice(0, 3).map((post) => {
                                        const platform = PLATFORMS[post.socialAccount.platform];
                                        const Icon = platform?.icon || Send;

                                        return (
                                            <div
                                                key={post.id}
                                                className="rounded-lg bg-gray-900/80 border border-white/5 p-2 overflow-hidden"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span
                                                        className={`w-2 h-2 rounded-full ${getDotClass(post.status)}`}
                                                    />
                                                    <Icon
                                                        className={`w-3.5 h-3.5 ${platform?.color || "text-purple-300"}`}
                                                    />
                                                    <span className="text-[11px] text-gray-300 truncate">
                                                        @{post.socialAccount.accountUsername}
                                                    </span>
                                                </div>

                                                <p className="text-[11px] text-gray-500 truncate mt-1">
                                                    {post.content}
                                                </p>
                                            </div>
                                        );
                                    })}

                                    {dayPosts.length > 3 && (
                                        <p className="text-[11px] text-purple-300 font-semibold">
                                            +{dayPosts.length - 3} more
                                        </p>
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="rounded-2xl border border-white/5 bg-gray-950/40 overflow-hidden">
                <div className="p-5 border-b border-white/5 bg-white/[0.03] flex items-center justify-between">
                    <div>
                        <h3 className="text-white font-bold">
                            {selectedDate.toLocaleDateString(undefined, {
                                weekday: "long",
                                month: "short",
                                day: "numeric",
                            })}
                        </h3>

                        <p className="text-sm text-gray-500 mt-1">
                            {selectedPosts.length} scheduled {selectedPosts.length === 1 ? "post" : "posts"}
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onCompose}
                        className="p-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white transition"
                    >
                        <Plus className="w-5 h-5" />
                    </button>
                </div>

                {scheduledPosts.length === 0 ? (
                    <div className="p-8 text-center">
                        <div className="w-14 h-14 mx-auto rounded-2xl bg-purple-600/10 border border-purple-500/20 flex items-center justify-center">
                            <CalendarDays className="w-7 h-7 text-purple-300" />
                        </div>

                        <h3 className="text-white font-bold mt-5">No scheduled posts</h3>
                        <p className="text-sm text-gray-500 mt-2">
                            Scheduled posts matching your filters will appear here.
                        </p>
                    </div>
                ) : selectedPosts.length === 0 ? (
                    <div className="p-8 text-center">
                        <div className="w-14 h-14 mx-auto rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center">
                            <Clock className="w-7 h-7 text-gray-400" />
                        </div>

                        <h3 className="text-white font-bold mt-5">Nothing scheduled here</h3>
                        <p className="text-sm text-gray-500 mt-2">Select another date or schedule a new post.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-white/5">
                        {selectedPosts.map((post, index) => {
                            const platform = PLATFORMS[post.socialAccount.platform];
                            const Icon = platform?.icon || Send;
                            const isDeleting = deletingPostId === post.id;

                            return (
                                <motion.div
                                    key={post.id}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.03 }}
                                    className="p-5 hover:bg-white/[0.03] transition"
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 rounded-xl bg-gray-900 border border-white/5">
                                            <Icon className={`w-5 h-5 ${platform?.color || "text-purple-300"}`} />
                                        </div>

                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h4 className="text-white font-bold truncate">
                                                    @{post.socialAccount.accountUsername}
                                                </h4>

                                                <span
                                                    className={`px-2 py-1 rounded-lg border text-[10px] font-bold uppercase tracking-widest ${getStatusClass(post.status)}`}
                                                >
                                                    {post.status}
                                                </span>
                                            </div>

                                            <p className="text-xs text-gray-500 mt-1">
                                                {platform?.name || post.socialAccount.platform}
                                            </p>

                                            <p className="text-sm text-gray-300 mt-3 leading-relaxed break-words">
                                                {post.content}
                                            </p>

                                            <div className="flex items-center gap-2 text-xs text-gray-500 mt-3">
                                                <Clock className="w-3.5 h-3.5" />
                                                {new Date(post.scheduledAt || post.createdAt).toLocaleString()}
                                            </div>

                                            {post.status === "failed" && (
                                                <div className="mt-3 flex items-start gap-2 rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-red-200">
                                                    <AlertTriangle className="w-4 h-4 mt-0.5" />
                                                    <p className="text-xs">This post failed during publishing.</p>
                                                </div>
                                            )}

                                            <button
                                                type="button"
                                                onClick={() => onDelete(post)}
                                                disabled={isDeleting || post.status === "processing"}
                                                className="mt-4 inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-300 text-xs font-bold transition disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {isDeleting ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <Trash2 className="w-4 h-4" />
                                                )}
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
