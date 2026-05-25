"use client";

import type { MouseEvent } from "react";
import { motion, useScroll, useSpring, useTransform } from "framer-motion";
import { useRouter } from "next/navigation";
import {
    Activity,
    ArrowRight,
    BarChart3,
    CalendarClock,
    Check,
    ChevronRight,
    ClipboardList,
    Clock,
    Github,
    Layers3,
    Linkedin,
    LockKeyhole,
    Mail,
    MessageCircle,
    RadioTower,
    RefreshCw,
    Send,
    Share2,
    ShieldCheck,
    Smartphone,
    Twitter,
    Workflow,
    type LucideIcon,
} from "lucide-react";
import { BsTwitterX } from "react-icons/bs";
import { SiMastodon, SiThreads, SiWhatsapp } from "react-icons/si";
import AppLogo from "@/components/AppLogo";

type NavItem = {
    label: string;
    id: string;
};

type Metric = {
    value: string;
    label: string;
};

type Feature = {
    icon: LucideIcon;
    title: string;
    description: string;
    points: string[];
};

type WorkflowStep = {
    icon: LucideIcon;
    title: string;
    description: string;
};

type Platform = {
    name: string;
    status: string;
    description: string;
    icon: LucideIcon | typeof BsTwitterX | typeof SiMastodon | typeof SiThreads | typeof SiWhatsapp;
};

const navItems: NavItem[] = [
    { label: "Overview", id: "overview" },
    { label: "Workflow", id: "workflow" },
    { label: "Platforms", id: "platforms" },
    { label: "Security", id: "security" },
];

const metrics: Metric[] = [
    { value: "4", label: "Channel types" },
    { value: "1", label: "Unified workspace" },
    { value: "24/7", label: "Scheduled delivery" },
];

const features: Feature[] = [
    {
        icon: Layers3,
        title: "Unified account control",
        description: "Keep every connected profile organized without mixing platform-specific workflows.",
        points: ["Separate channel pages", "Clean account status", "Fast reconnect actions"],
    },
    {
        icon: CalendarClock,
        title: "Publishing that stays reliable",
        description: "Create, post now, schedule later, and track failures from one operational queue.",
        points: ["Immediate publishing", "Scheduled posts", "Retry-aware status"],
    },
    {
        icon: MessageCircle,
        title: "WhatsApp operations",
        description: "Manage contacts, templates, message logs, and scheduled conversations in a structured way.",
        points: ["Template management", "Contact lists", "Delivery history"],
    },
];

const workflow: WorkflowStep[] = [
    {
        icon: Share2,
        title: "Connect",
        description: "Add social and WhatsApp accounts with the required platform credentials.",
    },
    {
        icon: ClipboardList,
        title: "Prepare",
        description: "Write posts, organize recipients, and select approved WhatsApp templates.",
    },
    {
        icon: Send,
        title: "Publish",
        description: "Send instantly or schedule delivery while keeping every item visible in the queue.",
    },
    {
        icon: BarChart3,
        title: "Review",
        description: "Monitor posted, pending, failed, and processing activity across the workspace.",
    },
];

const platforms: Platform[] = [
    {
        name: "Twitter / X",
        status: "Publishing ready",
        description: "Post publishing and scheduled queue management for connected X accounts.",
        icon: BsTwitterX,
    },
    {
        name: "Threads",
        status: "Integration layer prepared",
        description: "Publisher logic is structured for Threads integration without disturbing existing channels.",
        icon: SiThreads,
    },
    {
        name: "WhatsApp Business",
        status: "Messaging ready",
        description: "Contacts, templates, scheduled messages, logs, and send-now actions.",
        icon: SiWhatsapp,
    },
    {
        name: "Mastodon",
        status: "Publishing ready",
        description: "Instance-aware account connection and scheduled post tracking.",
        icon: SiMastodon,
    },
];

const operations = [
    "Dashboard summaries",
    "Dedicated platform pages",
    "Publishing queue",
    "WhatsApp templates",
    "Message logs",
    "Failure visibility",
];

export default function LandingPage() {
    const router = useRouter();
    const { scrollYProgress } = useScroll();
    const scaleProgress = useSpring(scrollYProgress, {
        stiffness: 100,
        damping: 28,
        restDelta: 0.001,
    });
    const backgroundY = useTransform(scrollYProgress, [0, 1], ["0%", "18%"]);

    const scrollToSection = (e: MouseEvent<HTMLAnchorElement>, id: string) => {
        e.preventDefault();
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    };

    return (
        <main className="relative min-h-screen overflow-hidden bg-gray-950 text-white">
            <motion.div
                className="fixed left-0 right-0 top-0 z-[120] h-1 origin-left bg-purple-500"
                style={{ scaleX: scaleProgress }}
            />

            <motion.div style={{ y: backgroundY }} className="pointer-events-none fixed inset-0 -z-0">
                <div className="absolute left-1/2 top-0 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-purple-600/10 blur-[120px]" />
                <div className="absolute right-[-10%] top-[18%] h-[420px] w-[420px] rounded-full bg-blue-600/10 blur-[110px]" />
                <div className="absolute bottom-[5%] left-[-12%] h-[420px] w-[420px] rounded-full bg-emerald-500/10 blur-[120px]" />
            </motion.div>

            <nav className="fixed left-0 right-0 top-4 z-[100] px-4 md:px-8">
                <div className="mx-auto flex max-w-7xl items-center justify-between rounded-[1.75rem] border border-white/10 bg-gray-950/70 px-4 py-3 shadow-2xl shadow-black/30 backdrop-blur-2xl md:px-5">
                    <button
                        type="button"
                        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                        className="group flex items-center gap-3"
                    >

                        <span className="flex flex-col items-start leading-none">
                            <span className="text-base font-semibold tracking-tight text-white md:text-lg">
                                MIMICO
                            </span>
                            <span className="mt-1 hidden text-[11px] font-medium uppercase tracking-[0.22em] text-gray-500 sm:block">
                                Social Operations
                            </span>
                        </span>
                    </button>

                    <div className="hidden items-center rounded-2xl border border-white/10 bg-white/[0.04] p-1 lg:flex">
                        {navItems.map((item) => (
                            <a
                                key={item.id}
                                href={`#${item.id}`}
                                onClick={(e) => scrollToSection(e, item.id)}
                                className="rounded-xl px-4 py-2 text-sm font-medium text-gray-400 transition-all hover:bg-white/[0.08] hover:text-white"
                            >
                                {item.label}
                            </a>
                        ))}
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => router.push("/login")}
                            className="hidden rounded-2xl px-4 py-2 text-sm font-semibold text-gray-300 transition-all hover:bg-white/[0.06] hover:text-white sm:block"
                        >
                            Log in
                        </button>

                        <button
                            type="button"
                            onClick={() => router.push("/signup")}
                            className="group inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-gray-950 shadow-lg shadow-white/10 transition-all hover:-translate-y-0.5 hover:bg-gray-200 active:translate-y-0 md:px-5"
                        >
                            Create account
                            <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                        </button>
                    </div>
                </div>

                <div className="mx-auto mt-3 flex max-w-7xl items-center gap-2 overflow-x-auto rounded-2xl border border-white/10 bg-gray-950/55 p-2 backdrop-blur-xl lg:hidden">
                    {navItems.map((item) => (
                        <a
                            key={item.id}
                            href={`#${item.id}`}
                            onClick={(e) => scrollToSection(e, item.id)}
                            className="whitespace-nowrap rounded-xl px-4 py-2 text-xs font-medium text-gray-400 transition-all hover:bg-white/[0.08] hover:text-white"
                        >
                            {item.label}
                        </a>
                    ))}
                </div>
            </nav>

            <section className="relative z-10 px-5 pb-24 pt-32 md:px-8 md:pb-32 md:pt-40">
                <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[1fr_0.92fr]">
                    <motion.div
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7 }}
                    >
                        <h1 className="max-w-4xl text-5xl font-semibold tracking-[-0.05em] text-white md:text-7xl md:leading-[0.95]">
                            Manage publishing and messaging without the messy dashboard.
                        </h1>

                        <p className="mt-7 max-w-2xl text-lg leading-8 text-gray-400 md:text-xl">
                            Account Manager brings social publishing, WhatsApp Business workflows, scheduling, and
                            activity tracking into one focused workspace built for real execution.
                        </p>

                        <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                            <button
                                type="button"
                                onClick={() => router.push("/signup")}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-purple-600 px-7 py-4 text-sm font-semibold text-white shadow-2xl shadow-purple-950/40 transition-all hover:bg-purple-500 active:scale-95"
                            >
                                Start managing accounts
                                <ArrowRight className="h-4 w-4" />
                            </button>
                            <a
                                href="#overview"
                                onClick={(e) => scrollToSection(e, "overview")}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-7 py-4 text-sm font-semibold text-white transition-all hover:bg-white/10 active:scale-95"
                            >
                                View product overview
                                <ChevronRight className="h-4 w-4" />
                            </a>
                        </div>

                        <div className="mt-12 grid max-w-xl grid-cols-3 gap-4">
                            {metrics.map((metric) => (
                                <div
                                    key={metric.label}
                                    className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
                                >
                                    <p className="text-2xl font-semibold text-white">{metric.value}</p>
                                    <p className="mt-1 text-xs leading-5 text-gray-500">{metric.label}</p>
                                </div>
                            ))}
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 28, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ duration: 0.8, delay: 0.1 }}
                        className="relative"
                    >
                        <div className="absolute -inset-4 rounded-[2rem] bg-purple-500/10 blur-3xl" />
                        <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gray-900/80 p-4 shadow-2xl shadow-black/40 backdrop-blur-xl">
                            <div className="rounded-[1.5rem] border border-white/10 bg-gray-950/90 p-5">
                                <div className="mb-6 flex items-center justify-between border-b border-white/10 pb-5">
                                    <div>
                                        <p className="text-sm font-semibold text-white">Operations dashboard</p>
                                        <p className="text-xs text-gray-500">Live publishing and messaging queue</p>
                                    </div>
                                    <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
                                        Online
                                    </span>
                                </div>

                                <div className="grid gap-4 md:grid-cols-3">
                                    {[
                                        { label: "Pending", value: "18", icon: Clock },
                                        { label: "Posted", value: "126", icon: Check },
                                        { label: "Failed", value: "03", icon: RefreshCw },
                                    ].map((item) => (
                                        <div
                                            key={item.label}
                                            className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                                        >
                                            <item.icon className="mb-4 h-5 w-5 text-purple-300" />
                                            <p className="text-2xl font-semibold text-white">{item.value}</p>
                                            <p className="text-xs text-gray-500">{item.label}</p>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-5 space-y-3">
                                    {[
                                        { title: "Launch update", channel: "Twitter / X", status: "Ready" },
                                        { title: "Product reminder", channel: "WhatsApp", status: "Queued" },
                                        { title: "Community post", channel: "Threads", status: "Scheduled" },
                                    ].map((item) => (
                                        <div
                                            key={item.title}
                                            className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-300">
                                                    <RadioTower className="h-5 w-5" />
                                                </span>
                                                <div>
                                                    <p className="text-sm font-medium text-white">{item.title}</p>
                                                    <p className="text-xs text-gray-500">{item.channel}</p>
                                                </div>
                                            </div>
                                            <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-gray-300">
                                                {item.status}
                                            </span>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                                    <div className="mb-4 flex items-center justify-between">
                                        <p className="text-sm font-medium text-white">Channel health</p>
                                        <Activity className="h-4 w-4 text-emerald-300" />
                                    </div>
                                    <div className="space-y-3">
                                        {platforms.slice(0, 3).map((platform, index) => (
                                            <div
                                                key={platform.name}
                                                className="grid grid-cols-[110px_1fr_44px] items-center gap-3 text-xs"
                                            >
                                                <span className="text-gray-400">{platform.name}</span>
                                                <span className="h-2 overflow-hidden rounded-full bg-white/5">
                                                    <span
                                                        className="block h-full rounded-full bg-purple-500"
                                                        style={{ width: `${86 - index * 12}%` }}
                                                    />
                                                </span>
                                                <span className="text-right text-gray-500">OK</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>

            <section
                id="overview"
                className="relative z-10 border-y border-white/10 bg-white/[0.02] px-5 py-24 md:px-8"
            >
                <div className="mx-auto max-w-7xl">
                    <div className="mb-12 flex flex-col justify-between gap-5 md:flex-row md:items-end">
                        <div>
                            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.25em] text-purple-300">
                                Product overview
                            </p>
                            <h2 className="max-w-3xl text-4xl font-semibold tracking-[-0.04em] text-white md:text-5xl">
                                A cleaner structure for the work your app already handles.
                            </h2>
                        </div>
                        <p className="max-w-md text-sm leading-6 text-gray-400">
                            The main dashboard stays focused on combined activity, while each channel keeps its own
                            professional management area.
                        </p>
                    </div>

                    <div className="grid gap-5 lg:grid-cols-3">
                        {features.map((feature, index) => (
                            <motion.div
                                key={feature.title}
                                initial={{ opacity: 0, y: 24 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.08 }}
                                className="rounded-[2rem] border border-white/10 bg-gray-900/60 p-7 shadow-xl shadow-black/20"
                            >
                                <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-300">
                                    <feature.icon className="h-6 w-6" />
                                </div>
                                <h3 className="text-xl font-semibold text-white">{feature.title}</h3>
                                <p className="mt-3 min-h-20 text-sm leading-6 text-gray-400">{feature.description}</p>
                                <div className="mt-7 space-y-3">
                                    {feature.points.map((point) => (
                                        <div key={point} className="flex items-center gap-3 text-sm text-gray-300">
                                            <Check className="h-4 w-4 text-emerald-300" />
                                            {point}
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            <section id="workflow" className="relative z-10 px-5 py-24 md:px-8">
                <div className="mx-auto max-w-7xl">
                    <div className="mx-auto mb-14 max-w-3xl text-center">
                        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.25em] text-purple-300">
                            Workflow
                        </p>
                        <h2 className="text-4xl font-semibold tracking-[-0.04em] text-white md:text-5xl">
                            Simple enough for daily use. Structured enough for serious operations.
                        </h2>
                    </div>

                    <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
                        {workflow.map((step, index) => (
                            <motion.div
                                key={step.title}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.08 }}
                                className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.03] p-6"
                            >
                                <span className="absolute right-5 top-4 text-5xl font-semibold text-white/[0.03]">
                                    0{index + 1}
                                </span>
                                <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 text-purple-300">
                                    <step.icon className="h-6 w-6" />
                                </div>
                                <h3 className="text-lg font-semibold text-white">{step.title}</h3>
                                <p className="mt-3 text-sm leading-6 text-gray-400">{step.description}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            <section id="platforms" className="relative z-10 bg-gray-900/40 px-5 py-24 md:px-8">
                <div className="mx-auto max-w-7xl">
                    <div className="mb-12 grid gap-8 lg:grid-cols-[0.75fr_1fr] lg:items-end">
                        <div>
                            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.25em] text-purple-300">
                                Platforms
                            </p>
                            <h2 className="text-4xl font-semibold tracking-[-0.04em] text-white md:text-5xl">
                                Keep each channel professional and separate.
                            </h2>
                        </div>
                        <p className="text-sm leading-6 text-gray-400">
                            The landing page should reflect the real product: a multi-account manager with clear
                            platform boundaries, not a generic AI marketing template.
                        </p>
                    </div>

                    <div className="grid gap-5 md:grid-cols-2">
                        {platforms.map((platform) => (
                            <motion.div
                                key={platform.name}
                                initial={{ opacity: 0, y: 18 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                className="rounded-[2rem] border border-white/10 bg-gray-950/60 p-6"
                            >
                                <div className="flex items-start justify-between gap-5">
                                    <div className="flex items-center gap-4">
                                        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 text-white">
                                            <platform.icon className="h-6 w-6" />
                                        </span>
                                        <div>
                                            <h3 className="font-semibold text-white">{platform.name}</h3>
                                            <p className="mt-1 text-xs font-medium text-emerald-300">
                                                {platform.status}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <p className="mt-5 text-sm leading-6 text-gray-400">{platform.description}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            <section id="security" className="relative z-10 px-5 py-24 md:px-8">
                <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
                    <div>
                        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.25em] text-purple-300">
                            Security and control
                        </p>
                        <h2 className="text-4xl font-semibold tracking-[-0.04em] text-white md:text-5xl">
                            Built around operational clarity, not visual noise.
                        </h2>
                        <p className="mt-6 text-sm leading-7 text-gray-400">
                            The interface gives teams a serious first impression: clear actions, visible account status,
                            safe credential handling expectations, and no fake marketing claims.
                        </p>
                        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                            <button
                                type="button"
                                onClick={() => router.push("/login")}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-4 text-sm font-semibold text-gray-950 transition-all hover:bg-gray-200 active:scale-95"
                            >
                                Open workspace
                                <ArrowRight className="h-4 w-4" />
                            </button>
                            <button
                                type="button"
                                onClick={() => router.push("/signup")}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-sm font-semibold text-white transition-all hover:bg-white/10 active:scale-95"
                            >
                                Create account
                            </button>
                        </div>
                    </div>

                    <div className="grid gap-5 md:grid-cols-2">
                        {[
                            {
                                icon: ShieldCheck,
                                title: "Credential awareness",
                                text: "Platform keys and tokens are treated as operational assets, not UI decoration.",
                            },
                            {
                                icon: LockKeyhole,
                                title: "Controlled access",
                                text: "Authentication pages keep users separate from dashboard workflows.",
                            },
                            {
                                icon: Workflow,
                                title: "Conflict handling",
                                text: "Each platform keeps its own rules, limits, and publishing flow.",
                            },
                            {
                                icon: Smartphone,
                                title: "Responsive workspace",
                                text: "The landing page and dashboard stay usable across common screen sizes.",
                            },
                        ].map((item) => (
                            <div key={item.title} className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-6">
                                <item.icon className="mb-6 h-6 w-6 text-purple-300" />
                                <h3 className="font-semibold text-white">{item.title}</h3>
                                <p className="mt-3 text-sm leading-6 text-gray-400">{item.text}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="relative z-10 px-5 pb-24 md:px-8">
                <div className="mx-auto max-w-7xl overflow-hidden rounded-[2rem] border border-white/10 bg-purple-600/10 p-8 md:p-12">
                    <div className="grid gap-8 lg:grid-cols-[1fr_0.8fr] lg:items-center">
                        <div>
                            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.25em] text-purple-200">
                                Operations included
                            </p>
                            <h2 className="text-3xl font-semibold tracking-[-0.03em] text-white md:text-4xl">
                                A landing page that now matches the real application.
                            </h2>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            {operations.map((item) => (
                                <div
                                    key={item}
                                    className="rounded-2xl border border-white/10 bg-gray-950/40 px-4 py-3 text-sm text-gray-300"
                                >
                                    {item}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            <footer className="relative z-10 border-t border-white/10 bg-gray-950 px-5 py-12 md:px-8">
                <div className="mx-auto flex max-w-7xl flex-col gap-8 md:flex-row md:items-center md:justify-between">
                    <div>
                        <div className="flex items-center gap-3">
                            <AppLogo size="md" />
                            <span className="text-lg font-semibold text-white">MIMICO - Social Account Manager</span>
                        </div>
                        <p className="mt-4 max-w-md text-sm leading-6 text-gray-500">
                            A professional workspace for managing social publishing and WhatsApp Business messaging
                            across multiple accounts.
                        </p>
                    </div>

                    <div className="flex items-center gap-5 text-gray-500">
                        <Twitter className="h-5 w-5 transition-colors hover:text-white" />
                        <Github className="h-5 w-5 transition-colors hover:text-white" />
                        <Linkedin className="h-5 w-5 transition-colors hover:text-white" />
                        <Mail className="h-5 w-5 transition-colors hover:text-white" />
                    </div>
                </div>
            </footer>
        </main>
    );
}
