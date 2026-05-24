"use client";

import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
    Activity,
    AlertTriangle,
    CheckCircle2,
    Clock,
    FileText,
    Loader2,
    MessageCircle,
    Phone,
    Plus,
    Power,
    RefreshCw,
    Search,
    Send,
    Trash2,
    Users,
    XCircle,
} from "lucide-react";
import {
    whatsappClient,
    ApiClientError,
    buildTemplatePreview,
    extractTemplateVariables,
    normalizeTemplateName,
    type WhatsAppAccount,
    type WhatsAppContact,
    type WhatsAppMessageLog,
    type WhatsAppScheduledMessage,
    type WhatsAppTemplate,
    type WhatsAppTemplateCategory,
} from "@/libs/whatsapp/client";

type Tab = "overview" | "contacts" | "templates" | "scheduled" | "logs";

type Notice = {
    type: "success" | "error";
    message: string;
};

const emptyConnectForm = {
    businessName: "",
    businessAccountId: "",
    phoneNumberId: "",
    phoneNumberDisplay: "",
    accessToken: "",
};

const emptyContactForm = {
    name: "",
    phoneNumber: "",
};

const emptyScheduleForm = {
    recipientPhone: "",
    contactId: "",
    templateName: "",
    templateLanguage: "en_US",
    scheduledAt: "",
};

const emptyTemplateForm = {
    name: "",
    category: "UTILITY" as WhatsAppTemplateCategory,
    language: "en_US",
    headerText: "",
    bodyText: "",
    footerText: "",
};

const tabs: { id: Tab; label: string; icon: typeof Activity }[] = [
    { id: "overview", label: "Overview", icon: Activity },
    { id: "contacts", label: "Contacts", icon: Users },
    { id: "templates", label: "Templates", icon: FileText },
    { id: "scheduled", label: "Scheduled", icon: Clock },
    { id: "logs", label: "Logs", icon: MessageCircle },
];

const getErrorMessage = (error: unknown) => {
    if (error instanceof ApiClientError) {
        return error.message;
    }

    if (error instanceof Error) {
        return error.message;
    }

    return "Something went wrong";
};

const getStatusClass = (status?: string | null) => {
    const value = status?.toUpperCase();

    if (value === "APPROVED" || value === "SENT") {
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    }

    if (value === "QUEUED" || value === "PROCESSING") {
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    }

    if (value === "FAILED" || value === "REJECTED") {
        return "bg-red-500/10 text-red-400 border-red-500/20";
    }

    if (value === "CANCELLED") {
        return "bg-gray-500/10 text-gray-400 border-gray-500/20";
    }

    return "bg-purple-500/10 text-purple-300 border-purple-500/20";
};

const formatDate = (value?: string | null) => {
    if (!value) {
        return "N/A";
    }

    return new Date(value).toLocaleString();
};

const extractBodyTextFromComponents = (components: unknown) => {
    if (!Array.isArray(components)) {
        return "";
    }

    const body = components.find((component) => {
        if (!component || typeof component !== "object") {
            return false;
        }

        return "type" in component && String(component.type).toUpperCase() === "BODY";
    });

    if (!body || typeof body !== "object" || !("text" in body)) {
        return "";
    }

    return String(body.text || "");
};

const normalizeExampleValues = (values: string[]) => {
    return values.map((value) => value.trim()).filter(Boolean);
};

const formatPayload = (value: unknown) => {
    if (!value) {
        return "";
    }

    try {
        return JSON.stringify(value, null, 2);
    } catch {
        return String(value);
    }
};

export default function WhatsAppDashboardPage() {
    const [activeTab, setActiveTab] = useState<Tab>("overview");
    const [accounts, setAccounts] = useState<WhatsAppAccount[]>([]);
    const [selectedAccountId, setSelectedAccountId] = useState("");
    const [contacts, setContacts] = useState<WhatsAppContact[]>([]);
    const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
    const [scheduledMessages, setScheduledMessages] = useState<WhatsAppScheduledMessage[]>([]);
    const [logs, setLogs] = useState<WhatsAppMessageLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState("");
    const [notice, setNotice] = useState<Notice | null>(null);
    const [searchContacts, setSearchContacts] = useState("");
    const [searchLogs, setSearchLogs] = useState("");
    const [connectForm, setConnectForm] = useState(emptyConnectForm);
    const [contactForm, setContactForm] = useState(emptyContactForm);
    const [scheduleForm, setScheduleForm] = useState(emptyScheduleForm);
    const [templateForm, setTemplateForm] = useState(emptyTemplateForm);
    const [templateExampleValues, setTemplateExampleValues] = useState<string[]>([]);
    const [scheduleParamValues, setScheduleParamValues] = useState<string[]>([]);

    const selectedAccount = useMemo(() => {
        return accounts.find((account) => account.id === selectedAccountId) || null;
    }, [accounts, selectedAccountId]);

    const approvedTemplates = useMemo(() => {
        return templates.filter((template) => template.status?.toUpperCase() === "APPROVED");
    }, [templates]);

    const selectedScheduleTemplate = useMemo(() => {
        return (
            templates.find((template) => {
                return (
                    template.name === scheduleForm.templateName && template.language === scheduleForm.templateLanguage
                );
            }) || null
        );
    }, [templates, scheduleForm.templateName, scheduleForm.templateLanguage]);

    const selectedTemplateBodyText = useMemo(() => {
        return extractBodyTextFromComponents(selectedScheduleTemplate?.components);
    }, [selectedScheduleTemplate]);

    const selectedTemplateVariables = useMemo(() => {
        return extractTemplateVariables(selectedTemplateBodyText);
    }, [selectedTemplateBodyText]);

    const schedulePreview = useMemo(() => {
        if (!selectedTemplateBodyText) {
            return "";
        }

        return buildTemplatePreview(selectedTemplateBodyText, scheduleParamValues);
    }, [selectedTemplateBodyText, scheduleParamValues]);

    const createTemplateVariables = useMemo(() => {
        return extractTemplateVariables(templateForm.bodyText);
    }, [templateForm.bodyText]);

    const createTemplatePreview = useMemo(() => {
        return buildTemplatePreview(templateForm.bodyText, templateExampleValues);
    }, [templateForm.bodyText, templateExampleValues]);

    const stats = useMemo(() => {
        return {
            accounts: accounts.length,
            contacts: contacts.length,
            templates: templates.length,
            scheduled: scheduledMessages.filter((message) => message.status === "QUEUED").length,
            failed: scheduledMessages.filter((message) => message.status === "FAILED").length,
            logs: logs.length,
        };
    }, [accounts, contacts, templates, scheduledMessages, logs]);

    const showNotice = (type: Notice["type"], message: string) => {
        setNotice({ type, message });
        window.setTimeout(() => {
            setNotice(null);
        }, 3500);
    };

    const loadAccounts = async () => {
        const data = await whatsappClient.listAccounts();
        setAccounts(data.accounts);

        if (data.accounts.length > 0 && !selectedAccountId) {
            setSelectedAccountId(data.accounts[0].id);
        }

        if (data.accounts.length === 0) {
            setSelectedAccountId("");
        }
    };

    const loadAccountData = async (accountId: string) => {
        const [contactsData, templatesData, scheduledData, logsData] = await Promise.all([
            whatsappClient.listContacts(accountId, { limit: 20, q: searchContacts || undefined }),
            whatsappClient.listTemplates(accountId, { limit: 20 }),
            whatsappClient.listScheduledMessages(accountId, { limit: 20 }),
            whatsappClient.listLogs(accountId, { limit: 20, q: searchLogs || undefined }),
        ]);

        setContacts(contactsData.items);
        setTemplates(templatesData.items);
        setScheduledMessages(scheduledData.items);
        setLogs(logsData.items);
    };

    const refreshAll = async () => {
        try {
            setLoading(true);
            await loadAccounts();
        } catch (error) {
            showNotice("error", getErrorMessage(error));
        } finally {
            setLoading(false);
        }
    };

    const refreshSelectedAccountData = async () => {
        if (!selectedAccountId) {
            setContacts([]);
            setTemplates([]);
            setScheduledMessages([]);
            setLogs([]);
            return;
        }

        try {
            setActionLoading("refresh");
            await loadAccountData(selectedAccountId);
        } catch (error) {
            showNotice("error", getErrorMessage(error));
        } finally {
            setActionLoading("");
        }
    };

    useEffect(() => {
        refreshAll();
    }, []);

    useEffect(() => {
        if (!selectedAccountId) {
            return;
        }

        loadAccountData(selectedAccountId).catch((error) => {
            showNotice("error", getErrorMessage(error));
        });
    }, [selectedAccountId]);

    useEffect(() => {
        setTemplateExampleValues((current) => {
            return createTemplateVariables.map((_, index) => current[index] || "");
        });
    }, [createTemplateVariables.length]);

    useEffect(() => {
        setScheduleParamValues((current) => {
            return selectedTemplateVariables.map((_, index) => current[index] || "");
        });
    }, [selectedTemplateVariables.length]);

    const handleConnectAccount = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        try {
            setActionLoading("connect");

            const result = await whatsappClient.connectAccount(connectForm);

            setConnectForm(emptyConnectForm);
            await loadAccounts();
            setSelectedAccountId(result.account.id);
            showNotice("success", "WhatsApp account connected successfully");
        } catch (error) {
            showNotice("error", getErrorMessage(error));
        } finally {
            setActionLoading("");
        }
    };

    const handleDisconnectAccount = async () => {
        if (!selectedAccountId) {
            return;
        }

        const confirmed = window.confirm("Disconnect this WhatsApp account? History will stay saved.");

        if (!confirmed) {
            return;
        }

        try {
            setActionLoading("disconnect");
            await whatsappClient.disconnectAccount(selectedAccountId);
            await loadAccounts();
            setContacts([]);
            setTemplates([]);
            setScheduledMessages([]);
            setLogs([]);
            showNotice("success", "WhatsApp account disconnected");
        } catch (error) {
            showNotice("error", getErrorMessage(error));
        } finally {
            setActionLoading("");
        }
    };

    const handleCreateContact = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!selectedAccountId) {
            showNotice("error", "Select a WhatsApp account first");
            return;
        }

        try {
            setActionLoading("contact");

            await whatsappClient.createContact({
                socialAccountId: selectedAccountId,
                name: contactForm.name,
                phoneNumber: contactForm.phoneNumber,
            });

            setContactForm(emptyContactForm);
            await loadAccountData(selectedAccountId);
            showNotice("success", "Contact added successfully");
        } catch (error) {
            showNotice("error", getErrorMessage(error));
        } finally {
            setActionLoading("");
        }
    };

    const handleDeleteContact = async (id: string) => {
        const confirmed = window.confirm("Delete this WhatsApp contact?");

        if (!confirmed) {
            return;
        }

        try {
            setActionLoading(id);
            await whatsappClient.deleteContact(id);

            if (selectedAccountId) {
                await loadAccountData(selectedAccountId);
            }

            showNotice("success", "Contact deleted");
        } catch (error) {
            showNotice("error", getErrorMessage(error));
        } finally {
            setActionLoading("");
        }
    };

    const handleCreateTemplate = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!selectedAccountId) {
            showNotice("error", "Select a WhatsApp account first");
            return;
        }

        try {
            setActionLoading("createTemplate");

            const result = await whatsappClient.createTemplate({
                socialAccountId: selectedAccountId,
                name: normalizeTemplateName(templateForm.name),
                category: templateForm.category,
                language: templateForm.language,
                headerText: templateForm.headerText || undefined,
                bodyText: templateForm.bodyText,
                footerText: templateForm.footerText || undefined,
                bodyExamples: normalizeExampleValues(templateExampleValues),
            });

            setTemplateForm(emptyTemplateForm);
            setTemplateExampleValues([]);
            await loadAccountData(selectedAccountId);
            showNotice("success", `Template created with status ${result.template.status || "PENDING"}`);
        } catch (error) {
            showNotice("error", getErrorMessage(error));
        } finally {
            setActionLoading("");
        }
    };

    const handleSyncTemplates = async () => {
        if (!selectedAccountId) {
            showNotice("error", "Select a WhatsApp account first");
            return;
        }

        try {
            setActionLoading("syncTemplates");
            const result = await whatsappClient.syncTemplates(selectedAccountId);
            await loadAccountData(selectedAccountId);
            showNotice("success", `${result.synced} templates synced`);
        } catch (error) {
            showNotice("error", getErrorMessage(error));
        } finally {
            setActionLoading("");
        }
    };

    const getTemplateMessagePayload = () => {
        if (!selectedAccountId) {
            throw new Error("Select a WhatsApp account first");
        }

        if (!scheduleForm.recipientPhone.trim()) {
            throw new Error("Recipient phone number is required");
        }

        if (!scheduleForm.templateName.trim()) {
            throw new Error("Select an approved template first");
        }

        const hasMissingValues =
            selectedTemplateVariables.length > 0 && scheduleParamValues.some((value) => !value.trim());

        if (hasMissingValues) {
            throw new Error("Fill all template values");
        }

        return {
            socialAccountId: selectedAccountId,
            contactId: scheduleForm.contactId || undefined,
            recipientPhone: scheduleForm.recipientPhone,
            templateName: scheduleForm.templateName,
            templateLanguage: scheduleForm.templateLanguage || "en_US",
            templateParams: selectedTemplateVariables.length > 0 ? scheduleParamValues : undefined,
        };
    };

    const handleScheduleMessage = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        try {
            if (!scheduleForm.scheduledAt) {
                throw new Error("Schedule time is required");
            }

            setActionLoading("schedule");

            const payload = {
                ...getTemplateMessagePayload(),
                scheduledAt: new Date(scheduleForm.scheduledAt).toISOString(),
            };

            await whatsappClient.scheduleMessage(payload);
            setScheduleForm(emptyScheduleForm);
            setScheduleParamValues([]);
            await loadAccountData(selectedAccountId);
            showNotice("success", "Message scheduled successfully");
        } catch (error) {
            showNotice("error", getErrorMessage(error));
        } finally {
            setActionLoading("");
        }
    };

    const handleSendNowMessage = async () => {
        try {
            setActionLoading("sendNow");

            const payload = {
                ...getTemplateMessagePayload(),
                scheduledAt: new Date().toISOString(),
            };

            const result = await whatsappClient.sendNowMessage(payload);

            if (!result.success) {
                throw new Error(result.error || "Message could not be sent");
            }

            setScheduleForm(emptyScheduleForm);
            setScheduleParamValues([]);
            await loadAccountData(selectedAccountId);
            showNotice("success", "Message sent successfully");
        } catch (error) {
            showNotice("error", getErrorMessage(error));
        } finally {
            setActionLoading("");
        }
    };

    const handleCancelMessage = async (id: string) => {
        const confirmed = window.confirm("Cancel this scheduled WhatsApp message?");

        if (!confirmed) {
            return;
        }

        try {
            setActionLoading(id);
            await whatsappClient.cancelScheduledMessage(id);

            if (selectedAccountId) {
                await loadAccountData(selectedAccountId);
            }

            showNotice("success", "Message cancelled");
        } catch (error) {
            showNotice("error", getErrorMessage(error));
        } finally {
            setActionLoading("");
        }
    };

    const handleRetryMessage = async (id: string) => {
        try {
            setActionLoading(id);
            await whatsappClient.retryScheduledMessage(id);

            if (selectedAccountId) {
                await loadAccountData(selectedAccountId);
            }

            showNotice("success", "Message queued again");
        } catch (error) {
            showNotice("error", getErrorMessage(error));
        } finally {
            setActionLoading("");
        }
    };

    const handleContactSearch = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!selectedAccountId) {
            return;
        }

        try {
            setActionLoading("searchContacts");
            const data = await whatsappClient.listContacts(selectedAccountId, {
                limit: 20,
                q: searchContacts || undefined,
            });
            setContacts(data.items);
        } catch (error) {
            showNotice("error", getErrorMessage(error));
        } finally {
            setActionLoading("");
        }
    };

    const handleLogSearch = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!selectedAccountId) {
            return;
        }

        try {
            setActionLoading("searchLogs");
            const data = await whatsappClient.listLogs(selectedAccountId, {
                limit: 20,
                q: searchLogs || undefined,
            });
            setLogs(data.items);
        } catch (error) {
            showNotice("error", getErrorMessage(error));
        } finally {
            setActionLoading("");
        }
    };

    const handleContactSelectForSchedule = (contactId: string) => {
        const contact = contacts.find((item) => item.id === contactId);

        setScheduleForm((current) => ({
            ...current,
            contactId,
            recipientPhone: contact?.phoneNumber || current.recipientPhone,
        }));
    };

    const handleTemplateSelectForSchedule = (templateId: string) => {
        const template = templates.find((item) => item.id === templateId);

        setScheduleForm((current) => ({
            ...current,
            templateName: template?.name || "",
            templateLanguage: template?.language || "en_US",
        }));

        const bodyText = extractBodyTextFromComponents(template?.components);
        const variables = extractTemplateVariables(bodyText);

        setScheduleParamValues(variables.map(() => ""));
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            className="space-y-6"
        >
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                            <MessageCircle className="w-6 h-6 text-emerald-400" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-white">WhatsApp Business</h1>
                            <p className="text-gray-400">
                                Manage accounts, contacts, templates, scheduled messages, and logs.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                    <select
                        value={selectedAccountId}
                        onChange={(event) => setSelectedAccountId(event.target.value)}
                        className="bg-gray-950/70 border border-white/10 text-white rounded-xl px-4 py-3 outline-none focus:border-purple-500 min-w-[260px]"
                    >
                        <option value="">Select WhatsApp account</option>
                        {accounts.map((account) => (
                            <option key={account.id} value={account.id}>
                                {account.businessName || account.accountUsername}{" "}
                                {account.phoneNumberDisplay ? `(${account.phoneNumberDisplay})` : ""}
                            </option>
                        ))}
                    </select>

                    <button
                        onClick={refreshSelectedAccountData}
                        disabled={!selectedAccountId || actionLoading === "refresh"}
                        className="flex items-center justify-center gap-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-3 text-sm font-semibold text-white transition-all"
                    >
                        {actionLoading === "refresh" ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <RefreshCw className="w-4 h-4" />
                        )}
                        Refresh
                    </button>

                    <button
                        onClick={handleDisconnectAccount}
                        disabled={!selectedAccountId || actionLoading === "disconnect"}
                        className="flex items-center justify-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-3 text-sm font-semibold text-red-300 transition-all"
                    >
                        {actionLoading === "disconnect" ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Power className="w-4 h-4" />
                        )}
                        Disconnect
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
                    <span className="text-sm font-medium">{notice.message}</span>
                </div>
            )}

            {accounts.length === 0 && (
                <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-300 mt-0.5" />
                    <div>
                        <h3 className="font-bold text-amber-200">No WhatsApp account connected</h3>
                        <p className="text-sm text-amber-100/80">
                            Connect your WhatsApp Business phone number first. Your current Twitter, Mastodon, and
                            Google OAuth functionality will remain untouched.
                        </p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-4">
                <StatCard title="Accounts" value={stats.accounts} icon={Phone} />
                <StatCard title="Contacts" value={stats.contacts} icon={Users} />
                <StatCard title="Templates" value={stats.templates} icon={FileText} />
                <StatCard title="Queued" value={stats.scheduled} icon={Clock} />
                <StatCard title="Failed" value={stats.failed} icon={AlertTriangle} />
                <StatCard title="Logs" value={stats.logs} icon={Activity} />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-1 glass rounded-2xl border border-white/5 p-6">
                    <h2 className="text-xl font-bold text-white mb-1">Connect WhatsApp Number</h2>
                    <p className="text-sm text-gray-400 mb-5">Use your Meta WhatsApp Business details.</p>

                    <form onSubmit={handleConnectAccount} className="space-y-4">
                        <Input
                            label="Business Name"
                            value={connectForm.businessName}
                            onChange={(value) => setConnectForm((current) => ({ ...current, businessName: value }))}
                            placeholder="Hamza Business"
                            required
                        />

                        <Input
                            label="WABA ID"
                            value={connectForm.businessAccountId}
                            onChange={(value) =>
                                setConnectForm((current) => ({ ...current, businessAccountId: value }))
                            }
                            placeholder="4383963308557925"
                            required
                        />

                        <Input
                            label="Phone Number ID"
                            value={connectForm.phoneNumberId}
                            onChange={(value) => setConnectForm((current) => ({ ...current, phoneNumberId: value }))}
                            placeholder="1108178919047639"
                            required
                        />

                        <Input
                            label="Display Number"
                            value={connectForm.phoneNumberDisplay}
                            onChange={(value) =>
                                setConnectForm((current) => ({ ...current, phoneNumberDisplay: value }))
                            }
                            placeholder="+1 555-656-8440"
                            required
                        />

                        <Textarea
                            label="Access Token"
                            value={connectForm.accessToken}
                            onChange={(value) => setConnectForm((current) => ({ ...current, accessToken: value }))}
                            placeholder="Paste Meta access token"
                            rows={4}
                            required
                        />

                        <button
                            type="submit"
                            disabled={actionLoading === "connect"}
                            className="w-full flex items-center justify-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-60 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-purple-600/20 transition-all"
                        >
                            {actionLoading === "connect" ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Plus className="w-4 h-4" />
                            )}
                            Connect Account
                        </button>
                    </form>
                </div>

                <div className="xl:col-span-2 glass rounded-2xl border border-white/5 overflow-hidden">
                    <div className="p-6 border-b border-white/5 flex items-center justify-between gap-3">
                        <div>
                            <h2 className="text-xl font-bold text-white">Connected Numbers</h2>
                            <p className="text-sm text-gray-400">Numbers connected to this user account.</p>
                        </div>
                    </div>

                    <div className="divide-y divide-white/5">
                        {accounts.length === 0 ? (
                            <EmptyState
                                title="No connected WhatsApp numbers"
                                text="Connect your first WhatsApp Business number using the form."
                            />
                        ) : (
                            accounts.map((account) => (
                                <button
                                    key={account.id}
                                    onClick={() => setSelectedAccountId(account.id)}
                                    className={`w-full text-left p-5 hover:bg-white/5 transition-all ${
                                        selectedAccountId === account.id ? "bg-purple-500/10" : ""
                                    }`}
                                >
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                                        <div className="flex items-center gap-4">
                                            <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                                                <Phone className="w-5 h-5 text-emerald-400" />
                                            </div>

                                            <div>
                                                <h3 className="font-bold text-white">
                                                    {account.businessName || account.accountUsername}
                                                </h3>
                                                <p className="text-sm text-gray-400">
                                                    {account.phoneNumberDisplay || account.phoneNumberId}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="text-left md:text-right">
                                            <p className="text-xs text-gray-500">Phone Number ID</p>
                                            <p className="text-sm text-gray-300">{account.phoneNumberId}</p>
                                        </div>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            </div>

            <div className="glass rounded-2xl border border-white/5 overflow-hidden">
                <div className="border-b border-white/5 overflow-x-auto">
                    <div className="flex min-w-max">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            const active = activeTab === tab.id;

                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2 px-5 py-4 text-sm font-semibold border-b-2 transition-all ${
                                        active
                                            ? "border-purple-500 text-white bg-purple-500/10"
                                            : "border-transparent text-gray-400 hover:text-white hover:bg-white/5"
                                    }`}
                                >
                                    <Icon className="w-4 h-4" />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {activeTab === "overview" && (
                    <div className="p-6 space-y-6">
                        {selectedAccount ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <InfoBox label="Business Name" value={selectedAccount.businessName || "N/A"} />
                                <InfoBox label="Account Username" value={selectedAccount.accountUsername} />
                                <InfoBox
                                    label="Business Account ID"
                                    value={selectedAccount.businessAccountId || "N/A"}
                                />
                                <InfoBox label="Phone Number ID" value={selectedAccount.phoneNumberId || "N/A"} />
                                <InfoBox label="Display Number" value={selectedAccount.phoneNumberDisplay || "N/A"} />
                                <InfoBox label="Connected At" value={formatDate(selectedAccount.createdAt)} />
                            </div>
                        ) : (
                            <EmptyState
                                title="Select an account"
                                text="Choose a connected WhatsApp number to view its details."
                            />
                        )}
                    </div>
                )}

                {activeTab === "contacts" && (
                    <div className="p-6 grid grid-cols-1 xl:grid-cols-3 gap-6">
                        <div className="xl:col-span-1 rounded-2xl bg-gray-950/40 border border-white/5 p-5">
                            <h3 className="font-bold text-white mb-4">Add Contact</h3>

                            <form onSubmit={handleCreateContact} className="space-y-4">
                                <Input
                                    label="Name"
                                    value={contactForm.name}
                                    onChange={(value) => setContactForm((current) => ({ ...current, name: value }))}
                                    placeholder="Ali Customer"
                                    required
                                />

                                <Input
                                    label="Phone Number"
                                    value={contactForm.phoneNumber}
                                    onChange={(value) =>
                                        setContactForm((current) => ({ ...current, phoneNumber: value }))
                                    }
                                    placeholder="923001234567"
                                    required
                                />

                                <button
                                    type="submit"
                                    disabled={!selectedAccountId || actionLoading === "contact"}
                                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-60 px-4 py-3 text-sm font-bold text-white transition-all"
                                >
                                    {actionLoading === "contact" ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Plus className="w-4 h-4" />
                                    )}
                                    Add Contact
                                </button>
                            </form>
                        </div>

                        <div className="xl:col-span-2 rounded-2xl bg-gray-950/40 border border-white/5 overflow-hidden">
                            <div className="p-5 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-3">
                                <h3 className="font-bold text-white">Contacts</h3>

                                <form onSubmit={handleContactSearch} className="flex gap-2">
                                    <input
                                        value={searchContacts}
                                        onChange={(event) => setSearchContacts(event.target.value)}
                                        placeholder="Search contacts"
                                        className="bg-gray-950/70 border border-white/10 text-white rounded-xl px-4 py-2 outline-none focus:border-purple-500"
                                    />
                                    <button
                                        type="submit"
                                        className="rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 px-3 py-2 text-white"
                                    >
                                        <Search className="w-4 h-4" />
                                    </button>
                                </form>
                            </div>

                            <div className="divide-y divide-white/5">
                                {contacts.length === 0 ? (
                                    <EmptyState
                                        title="No contacts found"
                                        text="Add contacts manually or import them later."
                                    />
                                ) : (
                                    contacts.map((contact) => (
                                        <div
                                            key={contact.id}
                                            className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
                                        >
                                            <div>
                                                <h4 className="font-bold text-white">{contact.name}</h4>
                                                <p className="text-sm text-gray-400">{contact.phoneNumber}</p>
                                                {contact.isBlocked && (
                                                    <span className="inline-block mt-2 text-xs px-2 py-1 rounded-lg bg-red-500/10 text-red-300 border border-red-500/20">
                                                        Blocked
                                                    </span>
                                                )}
                                            </div>

                                            <button
                                                onClick={() => handleDeleteContact(contact.id)}
                                                disabled={actionLoading === contact.id}
                                                className="flex items-center justify-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 disabled:opacity-60 px-3 py-2 text-sm font-semibold text-red-300"
                                            >
                                                {actionLoading === contact.id ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <Trash2 className="w-4 h-4" />
                                                )}
                                                Delete
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === "templates" && (
                    <div className="p-6 grid grid-cols-1 xl:grid-cols-3 gap-6">
                        <div className="xl:col-span-1 rounded-2xl bg-gray-950/40 border border-white/5 p-5">
                            <h3 className="font-bold text-white mb-1">Create Template</h3>
                            <p className="text-sm text-gray-400 mb-5">
                                Create a simple text template and submit it to Meta for approval.
                            </p>

                            <form onSubmit={handleCreateTemplate} className="space-y-4">
                                <Input
                                    label="Template Name"
                                    value={templateForm.name}
                                    onChange={(value) => setTemplateForm((current) => ({ ...current, name: value }))}
                                    placeholder="appointment reminder"
                                    required
                                />

                                <div className="rounded-xl bg-gray-950/70 border border-white/10 px-4 py-3">
                                    <p className="text-xs text-gray-500 mb-1">Final Template Name</p>
                                    <p className="text-sm font-semibold text-purple-300">
                                        {normalizeTemplateName(templateForm.name) || "template_name"}
                                    </p>
                                </div>

                                <Select
                                    label="Category"
                                    value={templateForm.category}
                                    onChange={(value) =>
                                        setTemplateForm((current) => ({
                                            ...current,
                                            category: value as WhatsAppTemplateCategory,
                                        }))
                                    }
                                    required
                                >
                                    <option value="UTILITY">Utility</option>
                                    <option value="MARKETING">Marketing</option>
                                    <option value="AUTHENTICATION">Authentication</option>
                                </Select>

                                <Input
                                    label="Language"
                                    value={templateForm.language}
                                    onChange={(value) =>
                                        setTemplateForm((current) => ({ ...current, language: value }))
                                    }
                                    placeholder="en_US"
                                    required
                                />

                                <Input
                                    label="Header Text"
                                    value={templateForm.headerText}
                                    onChange={(value) =>
                                        setTemplateForm((current) => ({ ...current, headerText: value }))
                                    }
                                    placeholder="Appointment Reminder"
                                />

                                <Textarea
                                    label="Body Text"
                                    value={templateForm.bodyText}
                                    onChange={(value) =>
                                        setTemplateForm((current) => ({ ...current, bodyText: value }))
                                    }
                                    placeholder="Hello {{1}}, your appointment is confirmed for {{2}}."
                                    rows={5}
                                    required
                                />

                                {createTemplateVariables.length > 0 && (
                                    <div className="space-y-3">
                                        <p className="text-sm font-semibold text-gray-300">Example Values</p>

                                        {createTemplateVariables.map((variable, index) => (
                                            <Input
                                                key={variable}
                                                label={`Example for {{${variable}}}`}
                                                value={templateExampleValues[index] || ""}
                                                onChange={(value) => {
                                                    setTemplateExampleValues((current) => {
                                                        const next = [...current];
                                                        next[index] = value;
                                                        return next;
                                                    });
                                                }}
                                                placeholder={index === 0 ? "Hamza" : "Monday 5 PM"}
                                                required
                                            />
                                        ))}
                                    </div>
                                )}

                                <Input
                                    label="Footer Text"
                                    value={templateForm.footerText}
                                    onChange={(value) =>
                                        setTemplateForm((current) => ({ ...current, footerText: value }))
                                    }
                                    placeholder="Thank you"
                                />

                                {templateForm.bodyText && (
                                    <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-4">
                                        <p className="text-xs font-semibold text-emerald-300 mb-2">Preview</p>
                                        <p className="text-sm text-white whitespace-pre-wrap">
                                            {createTemplatePreview}
                                        </p>
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={!selectedAccountId || actionLoading === "createTemplate"}
                                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-60 px-4 py-3 text-sm font-bold text-white transition-all"
                                >
                                    {actionLoading === "createTemplate" ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Plus className="w-4 h-4" />
                                    )}
                                    Create Template
                                </button>
                            </form>
                        </div>

                        <div className="xl:col-span-2 space-y-5">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                                <div>
                                    <h3 className="font-bold text-white">WhatsApp Templates</h3>
                                    <p className="text-sm text-gray-400">
                                        Sync after creating templates to get latest approval status.
                                    </p>
                                </div>

                                <button
                                    onClick={handleSyncTemplates}
                                    disabled={!selectedAccountId || actionLoading === "syncTemplates"}
                                    className="flex items-center justify-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-60 px-4 py-3 text-sm font-bold text-white transition-all"
                                >
                                    {actionLoading === "syncTemplates" ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <RefreshCw className="w-4 h-4" />
                                    )}
                                    Sync Templates
                                </button>
                            </div>

                            <div className="rounded-2xl bg-gray-950/40 border border-white/5 overflow-hidden">
                                <div className="divide-y divide-white/5">
                                    {templates.length === 0 ? (
                                        <EmptyState
                                            title="No templates found"
                                            text="Create a template or sync existing templates from Meta."
                                        />
                                    ) : (
                                        templates.map((template) => {
                                            const bodyText = extractBodyTextFromComponents(template.components);

                                            return (
                                                <div key={template.id} className="p-5 space-y-3">
                                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                        <div>
                                                            <h4 className="font-bold text-white">{template.name}</h4>
                                                            <p className="text-sm text-gray-400">
                                                                {template.language}{" "}
                                                                {template.category ? `• ${template.category}` : ""}
                                                            </p>
                                                        </div>

                                                        <span
                                                            className={`text-xs px-3 py-1 rounded-lg border font-bold ${getStatusClass(template.status)}`}
                                                        >
                                                            {template.status || "UNKNOWN"}
                                                        </span>
                                                    </div>

                                                    {bodyText && (
                                                        <div className="rounded-xl bg-black/30 border border-white/5 p-3">
                                                            <p className="text-xs text-gray-500 mb-1">Body</p>
                                                            <p className="text-sm text-gray-300 whitespace-pre-wrap">
                                                                {bodyText}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === "scheduled" && (
                    <div className="p-6 grid grid-cols-1 xl:grid-cols-3 gap-6">
                        <div className="xl:col-span-1 rounded-2xl bg-gray-950/40 border border-white/5 p-5">
                            <h3 className="font-bold text-white mb-4">Schedule Template Message</h3>

                            <form onSubmit={handleScheduleMessage} className="space-y-4">
                                <Select
                                    label="Contact"
                                    value={scheduleForm.contactId}
                                    onChange={handleContactSelectForSchedule}
                                >
                                    <option value="">Manual number</option>
                                    {contacts.map((contact) => (
                                        <option key={contact.id} value={contact.id}>
                                            {contact.name} - {contact.phoneNumber}
                                        </option>
                                    ))}
                                </Select>

                                <Input
                                    label="Recipient Phone"
                                    value={scheduleForm.recipientPhone}
                                    onChange={(value) =>
                                        setScheduleForm((current) => ({ ...current, recipientPhone: value }))
                                    }
                                    placeholder="923001234567"
                                    required
                                />

                                <Select
                                    label="Template"
                                    value={selectedScheduleTemplate?.id || ""}
                                    onChange={handleTemplateSelectForSchedule}
                                    required
                                >
                                    <option value="">Select template</option>
                                    {approvedTemplates.map((template) => (
                                        <option key={template.id} value={template.id}>
                                            {template.name} - {template.language}
                                        </option>
                                    ))}
                                </Select>

                                <Input
                                    label="Language"
                                    value={scheduleForm.templateLanguage}
                                    onChange={(value) =>
                                        setScheduleForm((current) => ({ ...current, templateLanguage: value }))
                                    }
                                    placeholder="en_US"
                                    required
                                />

                                {selectedTemplateVariables.length > 0 && (
                                    <div className="space-y-3">
                                        <p className="text-sm font-semibold text-gray-300">Template Values</p>

                                        {selectedTemplateVariables.map((variable, index) => (
                                            <Input
                                                key={variable}
                                                label={`Value for {{${variable}}}`}
                                                value={scheduleParamValues[index] || ""}
                                                onChange={(value) => {
                                                    setScheduleParamValues((current) => {
                                                        const next = [...current];
                                                        next[index] = value;
                                                        return next;
                                                    });
                                                }}
                                                placeholder={index === 0 ? "Hamza" : "Monday 5 PM"}
                                                required
                                            />
                                        ))}
                                    </div>
                                )}

                                {schedulePreview && (
                                    <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-4">
                                        <p className="text-xs font-semibold text-emerald-300 mb-2">Message Preview</p>
                                        <p className="text-sm text-white whitespace-pre-wrap">{schedulePreview}</p>
                                    </div>
                                )}

                                <Input
                                    label="Schedule Time"
                                    type="datetime-local"
                                    value={scheduleForm.scheduledAt}
                                    onChange={(value) =>
                                        setScheduleForm((current) => ({ ...current, scheduledAt: value }))
                                    }
                                    required
                                />

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={handleSendNowMessage}
                                        disabled={!selectedAccountId || actionLoading === "sendNow"}
                                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 px-4 py-3 text-sm font-bold text-white transition-all"
                                    >
                                        {actionLoading === "sendNow" ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Send className="w-4 h-4" />
                                        )}
                                        Send Now
                                    </button>

                                    <button
                                        type="submit"
                                        disabled={!selectedAccountId || actionLoading === "schedule"}
                                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-60 px-4 py-3 text-sm font-bold text-white transition-all"
                                    >
                                        {actionLoading === "schedule" ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Clock className="w-4 h-4" />
                                        )}
                                        Schedule
                                    </button>
                                </div>
                            </form>
                        </div>

                        <div className="xl:col-span-2 rounded-2xl bg-gray-950/40 border border-white/5 overflow-hidden">
                            <div className="p-5 border-b border-white/5">
                                <h3 className="font-bold text-white">Scheduled Messages</h3>
                            </div>

                            <div className="divide-y divide-white/5">
                                {scheduledMessages.length === 0 ? (
                                    <EmptyState
                                        title="No scheduled messages"
                                        text="Schedule a template message to see it here."
                                    />
                                ) : (
                                    scheduledMessages.map((message) => (
                                        <div key={message.id} className="p-5 space-y-4">
                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                <div>
                                                    <h4 className="font-bold text-white">
                                                        {message.templateName || "Template Message"}
                                                    </h4>
                                                    <p className="text-sm text-gray-400">
                                                        To {message.contact?.name ? `${message.contact.name} • ` : ""}
                                                        {message.recipientPhone}
                                                    </p>
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        Scheduled: {formatDate(message.scheduledAt)}
                                                    </p>
                                                </div>

                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span
                                                        className={`text-xs px-3 py-1 rounded-lg border font-bold ${getStatusClass(message.status)}`}
                                                    >
                                                        {message.status}
                                                    </span>

                                                    {(message.status === "QUEUED" ||
                                                        message.status === "FAILED" ||
                                                        message.status === "DRAFT") && (
                                                        <button
                                                            onClick={() => handleCancelMessage(message.id)}
                                                            disabled={actionLoading === message.id}
                                                            className="rounded-xl bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 disabled:opacity-60 px-3 py-2 text-xs font-bold text-red-300"
                                                        >
                                                            Cancel
                                                        </button>
                                                    )}

                                                    {message.status === "FAILED" && (
                                                        <button
                                                            onClick={() => handleRetryMessage(message.id)}
                                                            disabled={actionLoading === message.id}
                                                            className="rounded-xl bg-purple-500/10 border border-purple-500/20 hover:bg-purple-500/20 disabled:opacity-60 px-3 py-2 text-xs font-bold text-purple-300"
                                                        >
                                                            Retry
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {message.errorMessage && (
                                                <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-200">
                                                    {message.errorMessage}
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === "logs" && (
                    <div className="p-6 space-y-5">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                            <div>
                                <h3 className="font-bold text-white">Message Logs</h3>
                                <p className="text-sm text-gray-400">
                                    Inbound messages, outbound sends, statuses, and errors.
                                </p>
                            </div>

                            <form onSubmit={handleLogSearch} className="flex gap-2">
                                <input
                                    value={searchLogs}
                                    onChange={(event) => setSearchLogs(event.target.value)}
                                    placeholder="Search logs"
                                    className="bg-gray-950/70 border border-white/10 text-white rounded-xl px-4 py-2 outline-none focus:border-purple-500"
                                />
                                <button
                                    type="submit"
                                    className="rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 px-3 py-2 text-white"
                                >
                                    <Search className="w-4 h-4" />
                                </button>
                            </form>
                        </div>

                        <div className="rounded-2xl bg-gray-950/40 border border-white/5 overflow-hidden">
                            <div className="divide-y divide-white/5">
                                {logs.length === 0 ? (
                                    <EmptyState
                                        title="No logs found"
                                        text="Send messages or receive webhooks to see logs here."
                                    />
                                ) : (
                                    logs.map((log) => (
                                        <details key={log.id} className="group">
                                            <summary className="list-none cursor-pointer p-5 hover:bg-white/5 transition-all">
                                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <h4 className="font-bold text-white">{log.direction}</h4>
                                                            {log.success ? (
                                                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                                            ) : (
                                                                <XCircle className="w-4 h-4 text-red-400" />
                                                            )}
                                                        </div>
                                                        <p className="text-sm text-gray-400">
                                                            {log.recipientPhone || "No recipient"}{" "}
                                                            {log.metaMessageId ? `• ${log.metaMessageId}` : ""}
                                                        </p>
                                                        <p className="text-xs text-gray-500 mt-1">
                                                            {formatDate(log.createdAt)}
                                                        </p>
                                                    </div>

                                                    <span
                                                        className={`text-xs px-3 py-1 rounded-lg border font-bold ${
                                                            log.success
                                                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                                                : "bg-red-500/10 text-red-400 border-red-500/20"
                                                        }`}
                                                    >
                                                        {log.success ? "SUCCESS" : "FAILED"}
                                                    </span>
                                                </div>
                                            </summary>

                                            <div className="px-5 pb-5 space-y-3">
                                                {log.errorMessage && (
                                                    <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-200">
                                                        {log.errorMessage}
                                                    </div>
                                                )}

                                                <pre className="max-h-80 overflow-auto rounded-xl bg-black/40 border border-white/10 p-4 text-xs text-gray-300 custom-scrollbar">
                                                    {formatPayload({
                                                        payload: log.payload,
                                                        response: log.response,
                                                        scheduledMessage: log.scheduledMessage,
                                                    })}
                                                </pre>
                                            </div>
                                        </details>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </motion.div>
    );
}

function StatCard({ title, value, icon: Icon }: { title: string; value: number; icon: typeof Activity }) {
    return (
        <div className="glass rounded-2xl border border-white/5 p-5">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-gray-400">{title}</p>
                    <h3 className="text-2xl font-bold text-white mt-1">{value}</h3>
                </div>
                <div className="w-11 h-11 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-purple-300" />
                </div>
            </div>
        </div>
    );
}

function InfoBox({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-2xl bg-gray-950/40 border border-white/5 p-5">
            <p className="text-sm text-gray-500">{label}</p>
            <p className="font-semibold text-white mt-1 break-all">{value}</p>
        </div>
    );
}

function EmptyState({ title, text }: { title: string; text: string }) {
    return (
        <div className="p-8 text-center">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-3">
                <MessageCircle className="w-5 h-5 text-gray-500" />
            </div>
            <h3 className="font-bold text-white">{title}</h3>
            <p className="text-sm text-gray-400 mt-1">{text}</p>
        </div>
    );
}

function Input({
    label,
    value,
    onChange,
    placeholder,
    type = "text",
    required = false,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    type?: string;
    required?: boolean;
}) {
    return (
        <label className="block">
            <span className="block text-sm font-semibold text-gray-300 mb-2">{label}</span>
            <input
                type={type}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                placeholder={placeholder}
                required={required}
                className="w-full bg-gray-950/70 border border-white/10 text-white rounded-xl px-4 py-3 outline-none focus:border-purple-500 placeholder:text-gray-600"
            />
        </label>
    );
}

function Textarea({
    label,
    value,
    onChange,
    placeholder,
    rows = 3,
    required = false,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    rows?: number;
    required?: boolean;
}) {
    return (
        <label className="block">
            <span className="block text-sm font-semibold text-gray-300 mb-2">{label}</span>
            <textarea
                value={value}
                onChange={(event) => onChange(event.target.value)}
                placeholder={placeholder}
                rows={rows}
                required={required}
                className="w-full bg-gray-950/70 border border-white/10 text-white rounded-xl px-4 py-3 outline-none focus:border-purple-500 placeholder:text-gray-600 resize-none"
            />
        </label>
    );
}

function Select({
    label,
    value,
    onChange,
    children,
    required = false,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    children: ReactNode;
    required?: boolean;
}) {
    return (
        <label className="block">
            <span className="block text-sm font-semibold text-gray-300 mb-2">{label}</span>
            <select
                value={value}
                onChange={(event) => onChange(event.target.value)}
                required={required}
                className="w-full bg-gray-950/70 border border-white/10 text-white rounded-xl px-4 py-3 outline-none focus:border-purple-500"
            >
                {children}
            </select>
        </label>
    );
}
