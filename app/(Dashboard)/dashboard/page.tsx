"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  MessageCircle,
  RefreshCw,
  Send,
  Share2,
  Sparkles,
  TrendingUp,
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

  if (value === "whatsapp") {
    return "WhatsApp";
  }

  return platform;
};

const getStatusClass = (status: string) => {
  const value = status.toLowerCase();

  if (value === "posted" || value === "sent") {
    return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
  }

  if (value === "pending" || value === "queued" || value === "processing") {
    return "bg-amber-500/10 text-amber-300 border-amber-500/20";
  }

  if (value === "failed") {
    return "bg-red-500/10 text-red-400 border-red-500/20";
  }

  return "bg-purple-500/10 text-purple-300 border-purple-500/20";
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
      })
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
        return platform === "twitter" || platform === "mastodon";
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
          subtitle: message.errorMessage || `${message.templateName || "Template"} to ${message.recipientPhone}`,
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
        text: stats.totalAccounts > 0
          ? `${stats.totalAccounts} channel(s) connected`
          : "Connect channels from their own pages",
        done: stats.totalAccounts > 0,
      },
      {
        title: "Content pipeline",
        text: stats.pendingWork > 0
          ? `${stats.pendingWork} item(s) waiting or processing`
          : "No pending content right now",
        done: stats.pendingWork > 0,
      },
      {
        title: "WhatsApp templates",
        text: stats.approvedTemplates > 0
          ? `${stats.approvedTemplates} approved template(s)`
          : "Create/sync templates from WhatsApp page",
        done: stats.approvedTemplates > 0,
      },
      {
        title: "System health",
        text: stats.failedWork > 0
          ? `${stats.failedWork} failed item(s) need attention`
          : "No failed items found",
        done: stats.failedWork === 0,
        danger: stats.failedWork > 0,
      },
    ];
  }, [stats]);

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
        <div>
          <p className="text-sm text-purple-300 font-semibold mb-2">Unified Overview</p>
          <h1 className="text-4xl font-bold text-white mb-2">
            Welcome back, {user?.firstName || "User"}!
          </h1>
          <p className="text-gray-400 max-w-2xl">
            This dashboard shows combined activity across your publishing and messaging system. Account management stays inside each platform page.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => router.push("/publishing")}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold transition-all shadow-lg shadow-purple-600/20"
          >
            <CalendarClock className="w-5 h-5" />
            Publishing Hub
          </button>

          <button
            onClick={() => router.push("/whatsapp")}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-all shadow-lg shadow-emerald-600/20"
          >
            <MessageCircle className="w-5 h-5" />
            WhatsApp
          </button>

          <button
            onClick={loadDashboard}
            disabled={refreshing}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-60 text-white text-sm font-semibold transition-all"
          >
            {refreshing ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
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
          {notice.type === "success" ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          <span className="text-sm font-semibold">{notice.message}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        <MetricCard
          title="Connected Channels"
          value={stats.totalAccounts}
          text={`${stats.twitterAccounts} Twitter, ${stats.mastodonAccounts} Mastodon, ${stats.whatsAppNumbers} WhatsApp`}
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

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 glass rounded-2xl border border-white/5 overflow-hidden">
          <SectionHeader
            title="Combined Activity"
            text="Recent scheduled, sent, queued, and failed content from all supported channels."
          />

          <div className="divide-y divide-white/5">
            {activityItems.length === 0 ? (
              <EmptyState
                title="No activity yet"
                text="Create a social post or send a WhatsApp template message to see activity here."
              />
            ) : (
              activityItems.map((item) => (
                <div key={item.id} className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-white/[0.03] transition-all">
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-11 h-11 rounded-2xl border flex items-center justify-center ${
                        item.type === "whatsapp"
                          ? "bg-emerald-500/10 border-emerald-500/20"
                          : "bg-purple-500/10 border-purple-500/20"
                      }`}
                    >
                      {item.type === "whatsapp" ? (
                        <MessageCircle className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <Share2 className="w-5 h-5 text-purple-300" />
                      )}
                    </div>

                    <div>
                      <h3 className="font-bold text-white">{item.title}</h3>
                      <p className="text-sm text-gray-400 line-clamp-2 mt-1">{item.subtitle}</p>
                      <p className="text-xs text-gray-500 mt-2">{item.time}</p>
                    </div>
                  </div>

                  <span className={`text-xs px-3 py-1 rounded-lg border font-bold uppercase ${getStatusClass(item.status)}`}>
                    {item.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="glass rounded-2xl border border-white/5 overflow-hidden">
          <SectionHeader
            title="System Readiness"
            text="High-level setup and health checks."
          />

          <div className="p-5 space-y-3">
            {readiness.map((item) => (
              <div key={item.title} className="rounded-2xl bg-gray-950/40 border border-white/5 p-4 flex items-start gap-3">
                <div
                  className={`w-9 h-9 rounded-xl border flex items-center justify-center ${
                    item.danger
                      ? "bg-red-500/10 border-red-500/20"
                      : item.done
                        ? "bg-emerald-500/10 border-emerald-500/20"
                        : "bg-amber-500/10 border-amber-500/20"
                  }`}
                >
                  {item.danger ? (
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                  ) : item.done ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <Clock className="w-5 h-5 text-amber-300" />
                  )}
                </div>

                <div>
                  <h3 className="text-sm font-bold text-white">{item.title}</h3>
                  <p className="text-sm text-gray-400 mt-1">{item.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-5">
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
          title="WhatsApp"
          text="Send, schedule, and monitor messages"
          icon={MessageCircle}
          onClick={() => router.push("/whatsapp")}
        />
      </div>

      <div className="glass rounded-2xl border border-white/5 p-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-purple-300" />
          </div>

          <div>
            <h3 className="font-bold text-white">Dashboard rule</h3>
            <p className="text-sm text-gray-400 mt-1">
              This page is only for combined system content and overall health. Twitter, Mastodon, and WhatsApp account actions stay inside their own pages.
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
    ? "bg-red-500/10 border-red-500/20 text-red-400"
    : warning
      ? "bg-amber-500/10 border-amber-500/20 text-amber-300"
      : success
        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
        : "bg-purple-500/10 border-purple-500/20 text-purple-300";

  return (
    <div className="glass rounded-2xl border border-white/5 p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-gray-400">{title}</p>
          <h3 className="text-3xl font-bold text-white mt-1">{value}</h3>
          <p className="text-sm text-gray-500 mt-1">{text}</p>
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
        <FileText className="w-5 h-5 text-gray-500" />
      </div>
      <h3 className="font-bold text-white">{title}</h3>
      <p className="text-sm text-gray-400 mt-1">{text}</p>
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
      onClick={onClick}
      className="text-left glass rounded-2xl border border-white/5 hover:bg-white/[0.05] p-5 transition-all group"
    >
      <div className="w-11 h-11 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-4">
        <Icon className="w-5 h-5 text-purple-300 group-hover:scale-110 transition-transform" />
      </div>

      <h3 className="font-bold text-white">{title}</h3>
      <p className="text-sm text-gray-400 mt-1">{text}</p>
    </button>
  );
}