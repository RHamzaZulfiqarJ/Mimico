"use client";

import { FormEvent, ReactNode, useEffect, useMemo, useRef, useState, type ElementType } from "react";
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
    ApiClientError,
    buildTemplatePreview,
    extractTemplateVariables,
    normalizeTemplateName,
    whatsappClient,
    type WhatsAppAccount,
    type WhatsAppContact,
    type WhatsAppMessageLog,
    type WhatsAppScheduledMessage,
    type WhatsAppTemplate,
    type WhatsAppTemplateCategory,
} from "@/libs/whatsapp/client";

type Tab = "send" | "contacts" | "templates" | "activity";

type Notice = {
    type: "success" | "error";
    message: string;
};

type FacebookLoginResponse = {
    authResponse?: {
        code?: string;
    };
    status?: string;
};

type FacebookLoginOptions = {
    config_id: string;
    response_type: "code";
    override_default_response_type: boolean;
    extras: {
        feature: "whatsapp_embedded_signup";
        sessionInfoVersion: number;
    };
};

type WhatsAppEmbeddedSignupData = {
    wabaId: string;
    phoneNumberId: string;
    businessId?: string | null;
};

type WhatsAppEmbeddedSignupMessage = {
    type?: string;
    event?: string;
    data?: {
        waba_id?: string;
        phone_number_id?: string;
        business_id?: string;
        error_message?: string;
        current_step?: string;
    };
};

declare global {
    interface Window {
        fbAsyncInit?: () => void;
        FB?: {
            init: (options: { appId: string; cookie: boolean; xfbml: boolean; version: string }) => void;
            login: (callback: (response: FacebookLoginResponse) => void, options: FacebookLoginOptions) => void;
        };
    }
}

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

const tabs: { id: Tab; label: string; icon: ElementType }[] = [
    { id: "send", label: "Send", icon: Send },
    { id: "contacts", label: "Contacts", icon: Users },
    { id: "templates", label: "Templates", icon: FileText },
    { id: "activity", label: "Activity", icon: Activity },
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

const formatDate = (value?: string | null) => {
    if (!value) {
        return "N/A";
    }

    return new Date(value).toLocaleString();
};

const getMinScheduleDateTime = () => {
    const date = new Date(Date.now() + 60_000);
    const offset = date.getTimezoneOffset();
    const local = new Date(date.getTime() - offset * 60_000);

    return local.toISOString().slice(0, 16);
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

const getStatusClass = (status?: string | null) => {
    const value = status?.toUpperCase();

    if (value === "APPROVED" || value === "SENT") {
        return "border-[rgba(34,197,94,0.22)] bg-[rgba(34,197,94,0.08)] text-[var(--success)]";
    }

    if (value === "QUEUED" || value === "PROCESSING") {
        return "border-[rgba(245,158,11,0.25)] bg-[rgba(245,158,11,0.08)] text-[var(--warning)]";
    }

    if (value === "FAILED" || value === "REJECTED") {
        return "border-[rgba(239,68,68,0.25)] bg-[rgba(239,68,68,0.08)] text-red-300";
    }

    if (value === "CANCELLED") {
        return "border-[var(--border)] bg-[var(--surface-3)] text-[var(--text-muted)]";
    }

    return "border-[rgba(94,106,210,0.28)] bg-[rgba(94,106,210,0.09)] text-[var(--accent)]";
};

export default function WhatsAppDashboardPage() {
    const [activeTab, setActiveTab] = useState<Tab>("send");
    const [accounts, setAccounts] = useState<WhatsAppAccount[]>([]);
    const [selectedAccountId, setSelectedAccountId] = useState("");
    const [contacts, setContacts] = useState<WhatsAppContact[]>([]);
    const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
    const [scheduledMessages, setScheduledMessages] = useState<WhatsAppScheduledMessage[]>([]);
    const [logs, setLogs] = useState<WhatsAppMessageLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState("");
    const [notice, setNotice] = useState<Notice | null>(null);
    const [facebookSdkReady, setFacebookSdkReady] = useState(false);
    const embeddedSignupDataRef = useRef<WhatsAppEmbeddedSignupData | null>(null);
    const [searchContacts, setSearchContacts] = useState("");
    const [searchLogs, setSearchLogs] = useState("");
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
            queued: scheduledMessages.filter((message) => message.status === "QUEUED").length,
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
            whatsappClient.listTemplates(accountId, { limit: 50 }),
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

    useEffect(() => {
        const appId = process.env.NEXT_PUBLIC_META_APP_ID;

        if (!appId) {
            return;
        }

        window.fbAsyncInit = () => {
            window.FB?.init({
                appId,
                cookie: true,
                xfbml: false,
                version: process.env.NEXT_PUBLIC_META_GRAPH_API_VERSION || "v25.0",
            });
            setFacebookSdkReady(true);
        };

        if (document.getElementById("facebook-jssdk")) {
            if (window.FB) {
                window.fbAsyncInit();
            }

            return;
        }

        const script = document.createElement("script");
        script.id = "facebook-jssdk";
        script.src = "https://connect.facebook.net/en_US/sdk.js";
        script.async = true;
        script.defer = true;
        document.body.appendChild(script);
    }, []);

    useEffect(() => {
        const allowedOrigins = new Set(["https://www.facebook.com", "https://web.facebook.com"]);

        const handleMessage = (event: MessageEvent) => {
            if (!allowedOrigins.has(event.origin)) {
                return;
            }

            let payload: WhatsAppEmbeddedSignupMessage;

            try {
                payload = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
            } catch {
                return;
            }

            if (payload?.type !== "WA_EMBEDDED_SIGNUP") {
                return;
            }

            if (payload.event === "FINISH") {
                const wabaId = payload.data?.waba_id;
                const phoneNumberId = payload.data?.phone_number_id;

                if (wabaId && phoneNumberId) {
                    embeddedSignupDataRef.current = {
                        wabaId,
                        phoneNumberId,
                        businessId: payload.data?.business_id || null,
                    };
                }
            }

            if (payload.event === "ERROR") {
                showNotice("error", payload.data?.error_message || "WhatsApp Embedded Signup failed");
            }
        };

        window.addEventListener("message", handleMessage);

        return () => {
            window.removeEventListener("message", handleMessage);
        };
    }, []);

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
            setContacts([]);
            setTemplates([]);
            setScheduledMessages([]);
            setLogs([]);
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

    const waitForEmbeddedSignupData = () => {
        return new Promise<WhatsAppEmbeddedSignupData>((resolve, reject) => {
            if (embeddedSignupDataRef.current) {
                resolve(embeddedSignupDataRef.current);
                return;
            }

            const startedAt = Date.now();
            const timer = window.setInterval(() => {
                if (embeddedSignupDataRef.current) {
                    window.clearInterval(timer);
                    resolve(embeddedSignupDataRef.current);
                    return;
                }

                if (Date.now() - startedAt > 15000) {
                    window.clearInterval(timer);
                    reject(new Error("WhatsApp signup finished without account details"));
                }
            }, 250);
        });
    };

    const handleFacebookLoginResponse = async (response: FacebookLoginResponse) => {
        try {
            const code = response.authResponse?.code;

            if (!code) {
                throw new Error("Facebook login was cancelled or did not return a code");
            }

            const signupData = await waitForEmbeddedSignupData();

            const result = await whatsappClient.connectFacebookAccount({
                code,
                wabaId: signupData.wabaId,
                phoneNumberId: signupData.phoneNumberId,
                businessId: signupData.businessId,
            });

            await loadAccounts();
            setSelectedAccountId(result.account.id);
            showNotice("success", "WhatsApp account connected with Facebook");
        } catch (error) {
            showNotice("error", getErrorMessage(error));
        } finally {
            setActionLoading("");
        }
    };

    const handleConnectWithFacebook = () => {
        const configId = process.env.NEXT_PUBLIC_META_WHATSAPP_CONFIG_ID;

        if (window.location.protocol !== "https:") {
            showNotice("error", "Facebook Login requires HTTPS. Use https://localhost:3000, not http://localhost:3000");
            return;
        }

        if (!process.env.NEXT_PUBLIC_META_APP_ID || !configId) {
            showNotice("error", "Meta app configuration is missing");
            return;
        }

        if (!window.FB || !facebookSdkReady) {
            showNotice("error", "Facebook SDK is not ready yet");
            return;
        }

        embeddedSignupDataRef.current = null;
        setActionLoading("connectFacebook");

        try {
            window.FB.login(
                (response) => {
                    void handleFacebookLoginResponse(response);
                },
                {
                    config_id: configId,
                    response_type: "code",
                    override_default_response_type: true,
                    extras: {
                        feature: "whatsapp_embedded_signup",
                        sessionInfoVersion: 3,
                    },
                },
            );
        } catch (error) {
            setActionLoading("");
            showNotice("error", getErrorMessage(error));
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
            showNotice("success", "Contact added");
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

    const handleSendNowMessage = async () => {
        try {
            setActionLoading("sendNow");

            const result = await whatsappClient.sendNowMessage({
                ...getTemplateMessagePayload(),
                scheduledAt: new Date().toISOString(),
            });

            if (!result.success) {
                throw new Error(result.error || "Message could not be sent");
            }

            setScheduleForm(emptyScheduleForm);
            setScheduleParamValues([]);
            await loadAccountData(selectedAccountId);
            showNotice("success", "Message sent");
        } catch (error) {
            showNotice("error", getErrorMessage(error));
        } finally {
            setActionLoading("");
        }
    };

    const handleScheduleMessage = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        try {
            if (!scheduleForm.scheduledAt) {
                throw new Error("Schedule time is required");
            }

            setActionLoading("schedule");

            await whatsappClient.scheduleMessage({
                ...getTemplateMessagePayload(),
                scheduledAt: new Date(scheduleForm.scheduledAt).toISOString(),
            });

            setScheduleForm(emptyScheduleForm);
            setScheduleParamValues([]);
            await loadAccountData(selectedAccountId);
            showNotice("success", "Message scheduled");
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
            <div className="flex min-h-[70vh] items-center justify-center">
                <div className="linear-card flex items-center gap-3 px-4 py-3">
                    <Loader2 className="h-4 w-4 animate-spin text-[var(--accent)]" strokeWidth={1.5} />
                    <span className="text-sm font-medium text-[var(--text-soft)]">Loading WhatsApp workspace</span>
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
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-[rgba(34,197,94,0.22)] bg-[rgba(34,197,94,0.08)] text-[var(--success)]">
                                <MessageCircle className="h-6 w-6" strokeWidth={1.5} />
                            </div>

                            <div className="min-w-0">
                                <div className="mb-2 flex items-center gap-2">
                                    <span className="linear-badge border-[rgba(34,197,94,0.22)] bg-[rgba(34,197,94,0.08)] text-[var(--success)]">
                                        WhatsApp Business
                                    </span>
                                    <span className="hidden text-xs text-[var(--text-muted)] sm:block">
                                        Templates, contacts, sending, and logs
                                    </span>
                                </div>

                                <h1 className="linear-title text-2xl md:text-3xl">WhatsApp</h1>

                                <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-soft)]">
                                    A simplified workspace for connecting a number, sending approved templates, and
                                    tracking activity.
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2 sm:flex-row">
                            <select
                                value={selectedAccountId}
                                onChange={(event) => setSelectedAccountId(event.target.value)}
                                className="linear-input h-9 min-w-[260px]"
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
                                type="button"
                                onClick={refreshSelectedAccountData}
                                disabled={!selectedAccountId || actionLoading === "refresh"}
                                className="linear-button-secondary h-9"
                            >
                                {actionLoading === "refresh" ? (
                                    <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
                                ) : (
                                    <RefreshCw className="h-4 w-4" strokeWidth={1.5} />
                                )}
                                Refresh
                            </button>

                            <button
                                type="button"
                                onClick={handleDisconnectAccount}
                                disabled={!selectedAccountId || actionLoading === "disconnect"}
                                className="linear-button-danger h-9"
                            >
                                {actionLoading === "disconnect" ? (
                                    <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
                                ) : (
                                    <Power className="h-4 w-4" strokeWidth={1.5} />
                                )}
                                Disconnect
                            </button>
                        </div>
                    </div>
                </div>

                <div className="grid border-b border-[var(--border)] md:grid-cols-6">
                    <HeaderMetric label="Accounts" value={stats.accounts} />
                    <HeaderMetric label="Contacts" value={stats.contacts} />
                    <HeaderMetric label="Templates" value={stats.templates} />
                    <HeaderMetric label="Queued" value={stats.queued} />
                    <HeaderMetric label="Failed" value={stats.failed} />
                    <HeaderMetric label="Logs" value={stats.logs} />
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

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[360px_1fr]">
                <div className="space-y-4">
                    <div className="linear-card overflow-hidden">
                        <SectionHeader title="Current Account" text="Selected WhatsApp Business number." />

                        {selectedAccount ? (
                            <div className="space-y-3 p-4">
                                <InfoLine label="Business" value={selectedAccount.businessName || "N/A"} />
                                <InfoLine label="Username" value={selectedAccount.accountUsername} />
                                <InfoLine label="WABA ID" value={selectedAccount.businessAccountId || "N/A"} />
                                <InfoLine label="Phone ID" value={selectedAccount.phoneNumberId || "N/A"} />
                                <InfoLine label="Display" value={selectedAccount.phoneNumberDisplay || "N/A"} />
                            </div>
                        ) : (
                            <EmptyState title="No account selected" text="Connect or select a WhatsApp account." />
                        )}
                    </div>

                    <div className="linear-card overflow-hidden">
                        <SectionHeader
                            title="Connect WhatsApp"
                            text="Use Facebook Login for Business and WhatsApp Embedded Signup."
                        />

                        <div className="space-y-4 p-4">
                            <div className="rounded-lg border border-[rgba(34,197,94,0.22)] bg-[rgba(34,197,94,0.08)] p-4">
                                <div className="flex items-start gap-3">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[rgba(34,197,94,0.22)] bg-[var(--canvas)] text-[var(--success)]">
                                        <MessageCircle className="h-5 w-5" strokeWidth={1.5} />
                                    </div>

                                    <div>
                                        <h3 className="text-sm font-semibold text-[var(--text)]">
                                            Connect without manual credentials
                                        </h3>
                                        <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
                                            Facebook will handle business selection, WABA setup, phone number selection,
                                            and approval.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={handleConnectWithFacebook}
                                disabled={actionLoading === "connectFacebook"}
                                className="linear-button-primary h-10 w-full"
                            >
                                {actionLoading === "connectFacebook" ? (
                                    <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
                                ) : (
                                    <Plus className="h-4 w-4" strokeWidth={1.5} />
                                )}
                                Connect with Facebook
                            </button>

                            {!facebookSdkReady && (
                                <p className="text-xs leading-5 text-[var(--text-muted)]">
                                    Facebook SDK is loading. Make sure your Meta app ID and Embedded Signup
                                    configuration ID are added in env.
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="linear-card overflow-hidden">
                    <div className="border-b border-[var(--border)] bg-[var(--surface-hover)] p-2">
                        <div className="flex flex-wrap gap-1">
                            {tabs.map((tab) => {
                                const Icon = tab.icon;
                                const active = activeTab === tab.id;

                                return (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`linear-tab ${active ? "border-[var(--border)] bg-[var(--surface-3)] text-[var(--text)]" : ""}`}
                                        data-active={active}
                                    >
                                        <Icon className="h-4 w-4" strokeWidth={1.5} />
                                        {tab.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {activeTab === "send" && (
                        <div className="grid grid-cols-1 gap-4 p-4 xl:grid-cols-2">
                            <form
                                onSubmit={handleScheduleMessage}
                                className="space-y-4 rounded-lg border border-[var(--border)] bg-[var(--canvas)] p-4"
                            >
                                <div>
                                    <h3 className="text-sm font-semibold text-[var(--text)]">Send Template Message</h3>
                                    <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
                                        Use an approved template. Send now or schedule for later.
                                    </p>
                                </div>

                                <Select
                                    label="Contact"
                                    value={scheduleForm.contactId}
                                    onChange={handleContactSelectForSchedule}
                                >
                                    <option value="">Manual phone number</option>
                                    {contacts.map((contact) => (
                                        <option key={contact.id} value={contact.id}>
                                            {contact.name} ({contact.phoneNumber})
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
                                    label="Approved Template"
                                    value={selectedScheduleTemplate?.id || ""}
                                    onChange={handleTemplateSelectForSchedule}
                                    required
                                >
                                    <option value="">Select template</option>
                                    {approvedTemplates.map((template) => (
                                        <option key={template.id} value={template.id}>
                                            {template.name} ({template.language})
                                        </option>
                                    ))}
                                </Select>

                                {selectedTemplateVariables.length > 0 && (
                                    <div className="space-y-3">
                                        <p className="text-xs font-medium uppercase tracking-[0.12em] text-[var(--text-muted)]">
                                            Template Values
                                        </p>

                                        {selectedTemplateVariables.map((variable, index) => (
                                            <Input
                                                key={variable}
                                                label={`Value {{${variable}}}`}
                                                value={scheduleParamValues[index] || ""}
                                                onChange={(value) => {
                                                    setScheduleParamValues((current) => {
                                                        const next = [...current];
                                                        next[index] = value;
                                                        return next;
                                                    });
                                                }}
                                                placeholder={`Value for {{${variable}}}`}
                                                required
                                            />
                                        ))}
                                    </div>
                                )}

                                <Input
                                    label="Schedule Time"
                                    type="datetime-local"
                                    value={scheduleForm.scheduledAt}
                                    onChange={(value) =>
                                        setScheduleForm((current) => ({ ...current, scheduledAt: value }))
                                    }
                                    min={getMinScheduleDateTime()}
                                />

                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                    <button
                                        type="button"
                                        onClick={handleSendNowMessage}
                                        disabled={!selectedAccountId || actionLoading === "sendNow"}
                                        className="linear-button-primary h-9"
                                    >
                                        {actionLoading === "sendNow" ? (
                                            <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
                                        ) : (
                                            <Send className="h-4 w-4" strokeWidth={1.5} />
                                        )}
                                        Send Now
                                    </button>

                                    <button
                                        type="submit"
                                        disabled={!selectedAccountId || actionLoading === "schedule"}
                                        className="linear-button-secondary h-9"
                                    >
                                        {actionLoading === "schedule" ? (
                                            <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
                                        ) : (
                                            <Clock className="h-4 w-4" strokeWidth={1.5} />
                                        )}
                                        Schedule
                                    </button>
                                </div>
                            </form>

                            <div className="rounded-lg border border-[var(--border)] bg-[var(--canvas)] p-4">
                                <h3 className="text-sm font-semibold text-[var(--text)]">Preview</h3>

                                <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
                                    The final body after replacing template variables.
                                </p>

                                <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
                                    <div className="mb-3 flex items-center gap-2">
                                        <MessageCircle className="h-4 w-4 text-[var(--success)]" strokeWidth={1.5} />
                                        <span className="text-xs font-medium text-[var(--text-muted)]">
                                            WhatsApp message
                                        </span>
                                    </div>

                                    <p className="whitespace-pre-wrap text-sm leading-6 text-[var(--text-soft)]">
                                        {schedulePreview || "Select an approved template to preview the message."}
                                    </p>
                                </div>

                                <div className="mt-4 rounded-lg border border-[rgba(245,158,11,0.25)] bg-[rgba(245,158,11,0.08)] p-3">
                                    <p className="text-sm font-medium text-[var(--warning)]">Template rule</p>
                                    <p className="mt-1 text-xs leading-5 text-[var(--text-soft)]">
                                        WhatsApp Business requires approved templates for business-initiated messages.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === "contacts" && (
                        <div className="grid grid-cols-1 gap-4 p-4 xl:grid-cols-[320px_1fr]">
                            <form
                                onSubmit={handleCreateContact}
                                className="space-y-4 rounded-lg border border-[var(--border)] bg-[var(--canvas)] p-4"
                            >
                                <h3 className="text-sm font-semibold text-[var(--text)]">Add Contact</h3>

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
                                    className="linear-button-primary h-9 w-full"
                                >
                                    {actionLoading === "contact" ? (
                                        <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
                                    ) : (
                                        <Plus className="h-4 w-4" strokeWidth={1.5} />
                                    )}
                                    Add Contact
                                </button>
                            </form>

                            <div className="rounded-lg border border-[var(--border)] bg-[var(--canvas)]">
                                <div className="flex flex-col justify-between gap-3 border-b border-[var(--border)] p-4 md:flex-row md:items-center">
                                    <div>
                                        <h3 className="text-sm font-semibold text-[var(--text)]">Contacts</h3>
                                        <p className="mt-1 text-xs text-[var(--text-muted)]">
                                            {contacts.length} saved contact(s)
                                        </p>
                                    </div>

                                    <form onSubmit={handleContactSearch} className="flex gap-2">
                                        <input
                                            value={searchContacts}
                                            onChange={(event) => setSearchContacts(event.target.value)}
                                            placeholder="Search contacts"
                                            className="linear-input h-9"
                                        />

                                        <button type="submit" className="linear-button-secondary h-9 w-9 p-0">
                                            <Search className="h-4 w-4" strokeWidth={1.5} />
                                        </button>
                                    </form>
                                </div>

                                <div className="divide-y divide-[var(--border)]">
                                    {contacts.length === 0 ? (
                                        <EmptyState
                                            title="No contacts found"
                                            text="Add contacts manually to reuse them while sending templates."
                                        />
                                    ) : (
                                        contacts.map((contact) => (
                                            <div
                                                key={contact.id}
                                                className="flex flex-col justify-between gap-3 p-4 transition-colors hover:bg-[var(--surface-hover)] sm:flex-row sm:items-center"
                                            >
                                                <div>
                                                    <h4 className="text-sm font-semibold text-[var(--text)]">
                                                        {contact.name}
                                                    </h4>
                                                    <p className="mt-1 text-sm text-[var(--text-muted)]">
                                                        {contact.phoneNumber}
                                                    </p>
                                                    {contact.isBlocked && (
                                                        <span className="linear-badge mt-2 border-[rgba(239,68,68,0.25)] bg-[rgba(239,68,68,0.08)] text-red-300">
                                                            Blocked
                                                        </span>
                                                    )}
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteContact(contact.id)}
                                                    disabled={actionLoading === contact.id}
                                                    className="linear-button-danger h-8 px-3 text-xs"
                                                >
                                                    {actionLoading === contact.id ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
                                                    ) : (
                                                        <Trash2 className="h-4 w-4" strokeWidth={1.5} />
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
                        <div className="grid grid-cols-1 gap-4 p-4 xl:grid-cols-[360px_1fr]">
                            <form
                                onSubmit={handleCreateTemplate}
                                className="space-y-4 rounded-lg border border-[var(--border)] bg-[var(--canvas)] p-4"
                            >
                                <div>
                                    <h3 className="text-sm font-semibold text-[var(--text)]">Create Template</h3>
                                    <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
                                        Submit a simple template to Meta for approval.
                                    </p>
                                </div>

                                <Input
                                    label="Template Name"
                                    value={templateForm.name}
                                    onChange={(value) => setTemplateForm((current) => ({ ...current, name: value }))}
                                    placeholder="order_update"
                                    required
                                />

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
                                    placeholder="Optional header"
                                />

                                <Textarea
                                    label="Body Text"
                                    value={templateForm.bodyText}
                                    onChange={(value) =>
                                        setTemplateForm((current) => ({ ...current, bodyText: value }))
                                    }
                                    placeholder="Hello {{1}}, your order {{2}} is ready."
                                    rows={5}
                                    required
                                />

                                <Input
                                    label="Footer Text"
                                    value={templateForm.footerText}
                                    onChange={(value) =>
                                        setTemplateForm((current) => ({ ...current, footerText: value }))
                                    }
                                    placeholder="Optional footer"
                                />

                                {createTemplateVariables.length > 0 && (
                                    <div className="space-y-3">
                                        <p className="text-xs font-medium uppercase tracking-[0.12em] text-[var(--text-muted)]">
                                            Example Values
                                        </p>

                                        {createTemplateVariables.map((variable, index) => (
                                            <Input
                                                key={variable}
                                                label={`Example {{${variable}}}`}
                                                value={templateExampleValues[index] || ""}
                                                onChange={(value) => {
                                                    setTemplateExampleValues((current) => {
                                                        const next = [...current];
                                                        next[index] = value;
                                                        return next;
                                                    });
                                                }}
                                                placeholder={`Example for {{${variable}}}`}
                                                required
                                            />
                                        ))}
                                    </div>
                                )}

                                {templateForm.bodyText && (
                                    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
                                        <p className="mb-2 text-xs font-medium uppercase tracking-[0.12em] text-[var(--text-muted)]">
                                            Preview
                                        </p>
                                        <p className="whitespace-pre-wrap text-sm leading-6 text-[var(--text-soft)]">
                                            {createTemplatePreview}
                                        </p>
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={!selectedAccountId || actionLoading === "createTemplate"}
                                    className="linear-button-primary h-9 w-full"
                                >
                                    {actionLoading === "createTemplate" ? (
                                        <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
                                    ) : (
                                        <Plus className="h-4 w-4" strokeWidth={1.5} />
                                    )}
                                    Create Template
                                </button>
                            </form>

                            <div className="rounded-lg border border-[var(--border)] bg-[var(--canvas)]">
                                <div className="flex flex-col justify-between gap-3 border-b border-[var(--border)] p-4 md:flex-row md:items-center">
                                    <div>
                                        <h3 className="text-sm font-semibold text-[var(--text)]">Templates</h3>
                                        <p className="mt-1 text-xs text-[var(--text-muted)]">
                                            Sync from Meta after approval or rejection.
                                        </p>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={handleSyncTemplates}
                                        disabled={!selectedAccountId || actionLoading === "syncTemplates"}
                                        className="linear-button-secondary h-9"
                                    >
                                        {actionLoading === "syncTemplates" ? (
                                            <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
                                        ) : (
                                            <RefreshCw className="h-4 w-4" strokeWidth={1.5} />
                                        )}
                                        Sync
                                    </button>
                                </div>

                                <div className="divide-y divide-[var(--border)]">
                                    {templates.length === 0 ? (
                                        <EmptyState
                                            title="No templates found"
                                            text="Create or sync templates from Meta."
                                        />
                                    ) : (
                                        templates.map((template) => (
                                            <div
                                                key={template.id}
                                                className="p-4 transition-colors hover:bg-[var(--surface-hover)]"
                                            >
                                                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                                                    <div className="min-w-0">
                                                        <h4 className="truncate text-sm font-semibold text-[var(--text)]">
                                                            {template.name}
                                                        </h4>
                                                        <p className="mt-1 text-xs text-[var(--text-muted)]">
                                                            {template.language}{" "}
                                                            {template.category ? `• ${template.category}` : ""}
                                                        </p>
                                                    </div>

                                                    <span
                                                        className={`linear-badge uppercase ${getStatusClass(template.status)}`}
                                                    >
                                                        {template.status || "UNKNOWN"}
                                                    </span>
                                                </div>

                                                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[var(--text-soft)]">
                                                    {extractBodyTextFromComponents(template.components) ||
                                                        "No body text available"}
                                                </p>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === "activity" && (
                        <div className="grid grid-cols-1 gap-4 p-4 xl:grid-cols-2">
                            <div className="rounded-lg border border-[var(--border)] bg-[var(--canvas)]">
                                <SectionHeader
                                    title="Scheduled Messages"
                                    text="Queued, sent, cancelled, and failed template messages."
                                />

                                <div className="divide-y divide-[var(--border)]">
                                    {scheduledMessages.length === 0 ? (
                                        <EmptyState
                                            title="No scheduled messages"
                                            text="Send or schedule a template message to see it here."
                                        />
                                    ) : (
                                        scheduledMessages.map((message) => (
                                            <div
                                                key={message.id}
                                                className="space-y-3 p-4 transition-colors hover:bg-[var(--surface-hover)]"
                                            >
                                                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                                                    <div>
                                                        <h4 className="text-sm font-semibold text-[var(--text)]">
                                                            {message.templateName || "Template message"}
                                                        </h4>
                                                        <p className="mt-1 text-sm text-[var(--text-muted)]">
                                                            To {message.recipientPhone}
                                                        </p>
                                                        <p className="mt-1 text-xs text-[var(--text-muted)]">
                                                            Scheduled {formatDate(message.scheduledAt)}
                                                        </p>
                                                        {message.sentAt && (
                                                            <p className="mt-1 text-xs text-[var(--text-muted)]">
                                                                Sent {formatDate(message.sentAt)}
                                                            </p>
                                                        )}
                                                    </div>

                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span
                                                            className={`linear-badge uppercase ${getStatusClass(message.status)}`}
                                                        >
                                                            {message.status}
                                                        </span>

                                                        {(message.status === "QUEUED" ||
                                                            message.status === "FAILED" ||
                                                            message.status === "DRAFT") && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleCancelMessage(message.id)}
                                                                disabled={actionLoading === message.id}
                                                                className="linear-button-danger h-8 px-3 text-xs"
                                                            >
                                                                Cancel
                                                            </button>
                                                        )}

                                                        {message.status === "FAILED" && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRetryMessage(message.id)}
                                                                disabled={actionLoading === message.id}
                                                                className="linear-button-secondary h-8 px-3 text-xs"
                                                            >
                                                                Retry
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                {message.errorMessage && (
                                                    <div className="rounded-md border border-[rgba(239,68,68,0.25)] bg-[rgba(239,68,68,0.08)] p-3 text-sm leading-6 text-red-200">
                                                        {message.errorMessage}
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            <div className="rounded-lg border border-[var(--border)] bg-[var(--canvas)]">
                                <div className="flex flex-col justify-between gap-3 border-b border-[var(--border)] bg-[var(--surface-hover)] p-4 md:flex-row md:items-center">
                                    <div>
                                        <h3 className="text-sm font-semibold text-[var(--text)]">Message Logs</h3>
                                        <p className="mt-1 text-xs text-[var(--text-muted)]">
                                            API responses, errors, and webhook logs.
                                        </p>
                                    </div>

                                    <form onSubmit={handleLogSearch} className="flex gap-2">
                                        <input
                                            value={searchLogs}
                                            onChange={(event) => setSearchLogs(event.target.value)}
                                            placeholder="Search logs"
                                            className="linear-input h-9"
                                        />

                                        <button type="submit" className="linear-button-secondary h-9 w-9 p-0">
                                            <Search className="h-4 w-4" strokeWidth={1.5} />
                                        </button>
                                    </form>
                                </div>

                                <div className="divide-y divide-[var(--border)]">
                                    {logs.length === 0 ? (
                                        <EmptyState
                                            title="No logs found"
                                            text="Logs appear after sends, webhook updates, or failures."
                                        />
                                    ) : (
                                        logs.map((log) => (
                                            <details key={log.id} className="group">
                                                <summary className="list-none p-4 transition-colors hover:bg-[var(--surface-hover)]">
                                                    <div className="flex cursor-pointer flex-col justify-between gap-3 sm:flex-row sm:items-start">
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <h4 className="text-sm font-semibold text-[var(--text)]">
                                                                    {log.direction}
                                                                </h4>
                                                                {log.success ? (
                                                                    <CheckCircle2
                                                                        className="h-4 w-4 text-[var(--success)]"
                                                                        strokeWidth={1.5}
                                                                    />
                                                                ) : (
                                                                    <XCircle
                                                                        className="h-4 w-4 text-red-300"
                                                                        strokeWidth={1.5}
                                                                    />
                                                                )}
                                                            </div>

                                                            <p className="mt-1 text-sm text-[var(--text-muted)]">
                                                                {log.recipientPhone || "No recipient"}
                                                            </p>

                                                            <p className="mt-1 text-xs text-[var(--text-muted)]">
                                                                {formatDate(log.createdAt)}
                                                            </p>
                                                        </div>

                                                        <span
                                                            className={`linear-badge uppercase ${log.success ? "border-[rgba(34,197,94,0.22)] bg-[rgba(34,197,94,0.08)] text-[var(--success)]" : "border-[rgba(239,68,68,0.25)] bg-[rgba(239,68,68,0.08)] text-red-300"}`}
                                                        >
                                                            {log.success ? "Success" : "Failed"}
                                                        </span>
                                                    </div>
                                                </summary>

                                                <div className="px-4 pb-4">
                                                    {log.errorMessage && (
                                                        <div className="mb-3 rounded-md border border-[rgba(239,68,68,0.25)] bg-[rgba(239,68,68,0.08)] p-3 text-sm text-red-200">
                                                            {log.errorMessage}
                                                        </div>
                                                    )}

                                                    <pre className="custom-scrollbar max-h-72 overflow-auto rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 text-xs leading-5 text-[var(--text-soft)]">
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

function SectionHeader({ title, text }: { title: string; text: string }) {
    return (
        <div className="border-b border-[var(--border)] bg-[var(--surface-hover)] px-4 py-3">
            <h2 className="text-sm font-semibold text-[var(--text)]">{title}</h2>
            <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">{text}</p>
        </div>
    );
}

function InfoLine({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-md border border-[var(--border)] bg-[var(--canvas)] p-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--text-muted)]">{label}</p>
            <p className="mt-1 break-all text-sm font-medium text-[var(--text)]">{value}</p>
        </div>
    );
}

function EmptyState({ title, text }: { title: string; text: string }) {
    return (
        <div className="px-6 py-12 text-center">
            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--canvas)] text-[var(--text-muted)]">
                <MessageCircle className="h-5 w-5" strokeWidth={1.5} />
            </div>

            <h3 className="text-sm font-semibold text-[var(--text)]">{title}</h3>

            <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-[var(--text-muted)]">{text}</p>
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
    min,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    type?: string;
    required?: boolean;
    min?: string;
}) {
    return (
        <label className="block">
            <span className="mb-2 block text-xs font-medium text-[var(--text-soft)]">{label}</span>

            <input
                type={type}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                placeholder={placeholder}
                required={required}
                min={min}
                className="linear-input"
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
            <span className="mb-2 block text-xs font-medium text-[var(--text-soft)]">{label}</span>

            <textarea
                value={value}
                onChange={(event) => onChange(event.target.value)}
                placeholder={placeholder}
                rows={rows}
                required={required}
                className="linear-input resize-none"
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
            <span className="mb-2 block text-xs font-medium text-[var(--text-soft)]">{label}</span>

            <select
                value={value}
                onChange={(event) => onChange(event.target.value)}
                required={required}
                className="linear-input"
            >
                {children}
            </select>
        </label>
    );
}
