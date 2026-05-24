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
    return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
  }

  if (value === "pending" || value === "processing") {
    return "bg-amber-500/10 text-amber-300 border-amber-500/20";
  }

  if (value === "failed") {
    return "bg-red-500/10 text-red-400 border-red-500/20";
  }

  return "bg-purple-500/10 text-purple-300 border-purple-500/20";
};

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong";
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

      const [accountsRes, postsRes] = await Promise.all([
        fetch("/api/accounts"),
        fetch("/api/posts"),
      ]);

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
    loadData();
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
      <div className="min-h-[65vh] flex items-center justify-center">
        <Loader2 className="w-9 h-9 animate-spin text-purple-400" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -16 }}
      className="space-y-8"
    >
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
            <BsTwitterX className="w-7 h-7 text-white" />
          </div>

          <div>
            <p className="text-sm text-purple-300 font-semibold mb-1">Platform Page</p>
            <h1 className="text-4xl font-bold text-white">Twitter / X</h1>
            <p className="text-gray-400 mt-1">
              Manage Twitter accounts and Twitter-specific scheduled posts.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleConnectTwitter}
            className="flex items-center justify-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-500 px-4 py-3 text-sm font-bold text-white transition-all shadow-lg shadow-purple-600/20"
          >
            <PlusCircle className="w-5 h-5" />
            Connect Twitter
          </button>

          <button
            onClick={() => router.push("/publishing?platform=twitter")}
            className="flex items-center justify-center gap-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 px-4 py-3 text-sm font-bold text-white transition-all"
          >
            <Send className="w-5 h-5" />
            Compose Post
          </button>

          <button
            onClick={loadData}
            disabled={actionLoading === "refresh"}
            className="flex items-center justify-center gap-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-60 px-4 py-3 text-sm font-bold text-white transition-all"
          >
            {actionLoading === "refresh" ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
            Refresh
          </button>
        </div>
      </div>

      {notice && (
        <div
          className={`rounded-2xl border px-4 py-3 flex items-center gap-3 ${
            notice.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
              : "bg-red-500/10 border-red-500/20 text-red-300"
          }`}
        >
          {notice.type === "success" ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
          <span className="text-sm font-semibold">{notice.message}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-5">
        <MetricCard title="Accounts" value={stats.accounts} icon={BsTwitterX} />
        <MetricCard title="Pending" value={stats.pending} icon={Clock} warning />
        <MetricCard title="Processing" value={stats.processing} icon={CalendarClock} warning={stats.processing > 0} />
        <MetricCard title="Posted" value={stats.posted} icon={CheckCircle2} success />
        <MetricCard title="Failed" value={stats.failed} icon={AlertTriangle} danger={stats.failed > 0} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-1 glass rounded-2xl border border-white/5 overflow-hidden">
          <SectionHeader
            title="Twitter Accounts"
            text="Only Twitter / X accounts are shown here."
          />

          <div className="divide-y divide-white/5">
            {accounts.length === 0 ? (
              <EmptyState
                title="No Twitter account connected"
                text="Connect Twitter to publish or schedule X posts."
              />
            ) : (
              accounts.map((account) => (
                <div key={account.id} className="p-5 space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-11 h-11 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                      <BsTwitterX className="w-5 h-5 text-white" />
                    </div>

                    <div className="flex-1">
                      <h3 className="font-bold text-white">@{account.accountUsername}</h3>
                      <p className="text-sm text-gray-400">
                        Connected {formatDateTime(account.createdAt)}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDisconnect(account)}
                    disabled={actionLoading === account.id}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 disabled:opacity-60 px-4 py-2.5 text-sm font-bold text-red-300 transition-all"
                  >
                    {actionLoading === account.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Power className="w-4 h-4" />}
                    Disconnect
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="xl:col-span-2 glass rounded-2xl border border-white/5 overflow-hidden">
          <SectionHeader
            title="Twitter Posts"
            text="Scheduled, posted, processing, and failed Twitter posts."
          />

          <div className="divide-y divide-white/5">
            {twitterPosts.length === 0 ? (
              <EmptyState
                title="No Twitter posts yet"
                text="Create a post from Publishing Hub and select a Twitter account."
              />
            ) : (
              twitterPosts.map((post) => (
                <div key={post.id} className="p-5 space-y-3 hover:bg-white/[0.03] transition-all">
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                    <div>
                      <h3 className="font-bold text-white">@{post.socialAccount.accountUsername}</h3>
                      <p className="text-sm text-gray-400 mt-1 whitespace-pre-wrap">
                        {post.content}
                      </p>

                      <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-gray-500">
                        <span>
                          Scheduled: {formatDateTime(post.scheduledAt)}
                        </span>

                        {post.postedAt && (
                          <span>
                            Posted: {formatDateTime(post.postedAt)}
                          </span>
                        )}
                      </div>
                    </div>

                    <span className={`text-xs px-3 py-1 rounded-lg border font-bold uppercase ${getStatusClass(post.status)}`}>
                      {post.status}
                    </span>
                  </div>

                  {post.errorMessage && (
                    <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-200">
                      {post.errorMessage}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="glass rounded-2xl border border-white/5 p-5">
        <div className="flex items-start gap-3">
          <ExternalLink className="w-5 h-5 text-purple-300 mt-0.5" />
          <div>
            <h3 className="font-bold text-white">Twitter page rule</h3>
            <p className="text-sm text-gray-400 mt-1">
              This page only manages Twitter/X accounts and Twitter posts. Mastodon and WhatsApp stay separate.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
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
    ? "bg-red-500/10 border-red-500/20 text-red-400"
    : warning
      ? "bg-amber-500/10 border-amber-500/20 text-amber-300"
      : success
        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
        : "bg-purple-500/10 border-purple-500/20 text-purple-300";

  return (
    <div className="glass rounded-2xl border border-white/5 p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-400">{title}</p>
          <h3 className="text-3xl font-bold text-white mt-1">{value}</h3>
        </div>

        <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center ${colorClass}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ title, text }: { title: string; text: string }) {
  return (
    <div className="p-5 border-b border-white/5 bg-white/[0.02]">
      <h2 className="text-xl font-bold text-white">{title}</h2>
      <p className="text-sm text-gray-400 mt-1">{text}</p>
    </div>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="p-8 text-center">
      <div className="w-12 h-12 mx-auto rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-3">
        <BsTwitterX className="w-5 h-5 text-gray-500" />
      </div>
      <h3 className="font-bold text-white">{title}</h3>
      <p className="text-sm text-gray-400 mt-1">{text}</p>
    </div>
  );
}