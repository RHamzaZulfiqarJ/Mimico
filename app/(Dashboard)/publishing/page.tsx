"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
    AlertTriangle,
    Calendar,
    CheckCircle2,
    Clock,
    Filter,
    List,
    Loader2,
    MoreHorizontal,
    Plus,
    Send,
} from "lucide-react";
import ComposeModal from "@/app/(Dashboard)/publishing/ComposeModal";
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

const getPostTime = (post: Post) => {
    return post.postedAt || post.scheduledAt || post.createdAt;
};

export default function PublishingPage() {
    const [view, setView] = useState<"list" | "calendar">("list");
    const [isComposeOpen, setIsComposeOpen] = useState(false);
    const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
    const [posts, setPosts] = useState<Post[]>([]);
    const [loadingPosts, setLoadingPosts] = useState(true);
    const [error, setError] = useState<string | null>(null);

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

    const totalPosts = posts.length;
    const pendingPosts = posts.filter((post) => post.status === "pending").length;
    const postedPosts = posts.filter((post) => post.status === "posted").length;
    const failedPosts = posts.filter((post) => post.status === "failed").length;

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
        >
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
                <div>
                    <h1 className="text-3xl font-bold text-white">Publishing</h1>
                    <p className="text-gray-400 mt-1">Create, schedule, and track Twitter/X and Mastodon posts.</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex p-1 bg-gray-900/50 rounded-xl border border-white/5">
                        <button
                            type="button"
                            onClick={() => setView("list")}
                            className={`p-2 rounded-lg transition-all ${
                                view === "list"
                                    ? "bg-purple-600 text-white shadow-md"
                                    : "text-gray-500 hover:text-white"
                            }`}
                        >
                            <List className="w-4 h-4" />
                        </button>

                        <button
                            type="button"
                            onClick={() => setView("calendar")}
                            className={`p-2 rounded-lg transition-all ${
                                view === "calendar"
                                    ? "bg-purple-600 text-white shadow-md"
                                    : "text-gray-500 hover:text-white"
                            }`}
                        >
                            <Calendar className="w-4 h-4" />
                        </button>
                    </div>

                    <button
                        type="button"
                        onClick={() => setIsComposeOpen(true)}
                        className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-purple-600/20 active:scale-95 transition-all"
                    >
                        <Plus className="w-5 h-5" />
                        Compose
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="glass rounded-2xl border border-white/5 p-5">
                    <p className="text-sm text-gray-400">Total Posts</p>
                    <h3 className="text-2xl font-bold text-white mt-2">{totalPosts}</h3>
                </div>

                <div className="glass rounded-2xl border border-white/5 p-5">
                    <p className="text-sm text-gray-400">Pending</p>
                    <h3 className="text-2xl font-bold text-amber-300 mt-2">{pendingPosts}</h3>
                </div>

                <div className="glass rounded-2xl border border-white/5 p-5">
                    <p className="text-sm text-gray-400">Posted</p>
                    <h3 className="text-2xl font-bold text-emerald-300 mt-2">{postedPosts}</h3>
                </div>

                <div className="glass rounded-2xl border border-white/5 p-5">
                    <p className="text-sm text-gray-400">Failed</p>
                    <h3 className="text-2xl font-bold text-red-300 mt-2">{failedPosts}</h3>
                </div>
            </div>

            <div className="glass rounded-2xl border border-white/5 overflow-hidden">
                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
                    <div>
                        <h3 className="font-bold text-white">
                            {view === "list" ? "All Publishing Posts" : "Publishing Calendar"}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                            Immediate posts and scheduled posts are shown here.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={loadPosts}
                        className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
                    >
                        <Filter className="w-4 h-4" />
                        Refresh
                    </button>
                </div>

                {error && (
                    <div className="m-6 rounded-2xl bg-red-500/10 border border-red-500/20 p-4 flex items-start gap-3 text-red-200">
                        <AlertTriangle className="w-5 h-5 mt-0.5" />
                        <p className="text-sm font-semibold">{error}</p>
                    </div>
                )}

                {loadingPosts ? (
                    <div className="p-14 flex justify-center">
                        <Loader2 className="w-7 h-7 animate-spin text-purple-400" />
                    </div>
                ) : posts.length === 0 ? (
                    <div className="p-14 text-center">
                        <div className="w-14 h-14 mx-auto rounded-2xl bg-purple-600/10 border border-purple-500/20 flex items-center justify-center">
                            <Send className="w-7 h-7 text-purple-300" />
                        </div>
                        <h3 className="text-white font-bold mt-5">No posts yet</h3>
                        <p className="text-gray-400 text-sm mt-2">Compose your first Twitter/X or Mastodon post.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-white/5">
                        {posts.map((post, index) => {
                            const platform = PLATFORMS[post.socialAccount.platform];
                            const Icon = platform?.icon || Send;
                            const postTime = getPostTime(post);

                            return (
                                <motion.div
                                    key={post.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.03 }}
                                    className="p-6 flex flex-col xl:flex-row xl:items-center gap-5 hover:bg-white/[0.03] transition-colors group"
                                >
                                    <div className="flex items-start gap-4 flex-1">
                                        <div className="p-3 rounded-xl bg-gray-900 border border-white/5">
                                            <Icon className={`w-6 h-6 ${platform?.color || "text-purple-300"}`} />
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex flex-wrap items-center gap-3">
                                                <h4 className="font-bold text-white group-hover:text-purple-300 transition-colors">
                                                    @{post.socialAccount.accountUsername}
                                                </h4>

                                                <span className="text-xs px-2 py-1 rounded-lg bg-white/5 border border-white/5 text-gray-400">
                                                    {platform?.name || post.socialAccount.platform}
                                                </span>
                                            </div>

                                            <p className="text-sm text-gray-300 mt-3 leading-relaxed break-words">
                                                {post.content}
                                            </p>

                                            <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-gray-500">
                                                <span className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {post.status === "posted"
                                                        ? "Posted"
                                                        : post.scheduledAt
                                                          ? "Scheduled"
                                                          : "Queued"}{" "}
                                                    {new Date(postTime).toLocaleString()}
                                                </span>

                                                {!post.scheduledAt && post.status === "pending" && (
                                                    <span className="flex items-center gap-1 text-emerald-300">
                                                        <CheckCircle2 className="w-3 h-3" />
                                                        Immediate publishing
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between xl:justify-end gap-4">
                                        <span
                                            className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest ${
                                                post.status === "posted"
                                                    ? "bg-emerald-500/10 text-emerald-400"
                                                    : post.status === "pending"
                                                      ? "bg-amber-500/10 text-amber-400"
                                                      : post.status === "processing"
                                                        ? "bg-purple-500/10 text-purple-300"
                                                        : "bg-red-500/10 text-red-400"
                                            }`}
                                        >
                                            {post.status}
                                        </span>

                                        <button
                                            type="button"
                                            className="p-2 text-gray-500 hover:text-white transition-colors"
                                        >
                                            <MoreHorizontal className="w-5 h-5" />
                                        </button>
                                    </div>
                                </motion.div>
                            );
                        })}
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
