'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSuperAdmin } from '@/lib/super-admin-context';
import { supabase } from '@/lib/supabase';
import {
    MessageSquare, Send, Settings, Bell, History,
    CheckCircle2, XCircle, Clock, AlertTriangle, Phone,
    RefreshCw, ChevronRight, Save, Eye, EyeOff, Zap
} from 'lucide-react';

type Tab = 'reminders' | 'compose' | 'settings' | 'logs';

interface ReminderInterval {
    key: string;
    label: string;
    days: number;
    enabled: boolean;
    template: string;
}

interface SMSConfig {
    provider: 'mnotify' | 'hubtel';
    apiKey: string;
    senderId: string;
    clientId?: string;
    clientSecret?: string;
}

const DEFAULT_INTERVALS: ReminderInterval[] = [
    { key: '6m', label: '6 Months Before', days: 180, enabled: true, template: 'Hi {business_name}, your subscription expires in 6 months on {expiry_date}. Plan: {plan}. Contact us to renew early and avoid interruptions.' },
    { key: '3m', label: '3 Months Before', days: 90, enabled: true, template: 'Hi {business_name}, your subscription expires in 3 months on {expiry_date}. Please contact us to renew your {plan} plan.' },
    { key: '1m', label: '1 Month Before', days: 30, enabled: true, template: 'REMINDER: {business_name}, your subscription expires in 30 days on {expiry_date}. Renew now to avoid service interruption. Contact us immediately.' },
    { key: '1w', label: '1 Week Before', days: 7, enabled: true, template: 'URGENT: {business_name}, your subscription expires in 7 days on {expiry_date}! Contact us NOW to renew and maintain access to your POS system.' },
];

const REMINDER_SETTING_KEY = 'super_admin_sms_settings';

export default function SuperAdminSMSPage() {
    const { businesses, superAdmin } = useSuperAdmin();
    const [activeTab, setActiveTab] = useState<Tab>('reminders');

    // SMS Config
    const [smsConfig, setSmsConfig] = useState<SMSConfig>({
        provider: 'mnotify', apiKey: '', senderId: 'SASICBIZ', clientId: '', clientSecret: ''
    });
    const [showKey, setShowKey] = useState(false);
    const [savingConfig, setSavingConfig] = useState(false);

    // Reminder intervals
    const [intervals, setIntervals] = useState<ReminderInterval[]>(DEFAULT_INTERVALS);
    const [savingIntervals, setSavingIntervals] = useState(false);

    // Compose
    const [composePhone, setComposePhone] = useState('');
    const [composeMsg, setComposeMsg] = useState('');
    const [composeBulkBizIds, setComposeBulkBizIds] = useState<string[]>([]);
    const [composeSending, setComposeSending] = useState(false);

    // Logs
    const [logs, setLogs] = useState<any[]>([]);
    const [loadingLogs, setLoadingLogs] = useState(false);

    // Reminder statuses
    const [sendingReminder, setSendingReminder] = useState<string | null>(null);
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

    useEffect(() => {
        loadSettings();
        if (activeTab === 'logs') loadLogs();
    }, [activeTab]);

    const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

    const loadSettings = async () => {
        const { data } = await supabase.from('global_settings').select('super_admin_sms_config').maybeSingle();
        if (data?.super_admin_sms_config) {
            const cfg = data.super_admin_sms_config;
            if (cfg.smsConfig) setSmsConfig(cfg.smsConfig);
            if (cfg.intervals) setIntervals(cfg.intervals);
        }
    };

    const saveSettings = async () => {
        setSavingConfig(true);
        await supabase.from('global_settings').update({
            super_admin_sms_config: { smsConfig, intervals }
        }).neq('id', '00000000-0000-0000-0000-000000000000'); // update all rows (usually 1)
        setSavingConfig(false);
        showToast('SMS settings saved!');
    };

    const saveIntervals = async () => {
        setSavingIntervals(true);
        await supabase.from('global_settings').update({
            super_admin_sms_config: { smsConfig, intervals }
        }).neq('id', '00000000-0000-0000-0000-000000000000');
        setSavingIntervals(false);
        showToast('Reminder settings saved!');
    };

    const loadLogs = async () => {
        setLoadingLogs(true);
        const { data } = await supabase
            .from('super_admin_sms_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);
        if (data) setLogs(data);
        setLoadingLogs(false);
    };

    const formatPhone = (phone: string) => {
        if (!phone) return '';
        let p = phone.replace(/\D/g, '');
        if (p.startsWith('0') && p.length === 10) return '233' + p.substring(1);
        return p;
    };

    const sendSMS = async (phone: string, message: string, businessId?: string, businessName?: string, reminderType?: string): Promise<boolean> => {
        if (!smsConfig.apiKey) { showToast('API key not configured', 'error'); return false; }
        const normalizedPhone = formatPhone(phone);
        let sender = smsConfig.senderId || 'SASICBIZ';
        if (sender.length > 11) sender = sender.substring(0, 11);

        try {
            const res = await fetch(`https://api.mnotify.com/api/sms/quick?key=${smsConfig.apiKey}`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ recipient: [normalizedPhone], sender, message, is_schedule: false, schedule_date: null })
            });
            const data = await res.json();
            const success = data.code === '2000' || data.code === 2000;

            // Log to DB
            await supabase.from('super_admin_sms_logs').insert({
                phone: normalizedPhone, message, status: success ? 'sent' : 'failed',
                business_id: businessId, business_name: businessName,
                reminder_type: reminderType, sent_by: superAdmin?.id, created_at: new Date().toISOString()
            });
            return success;
        } catch {
            return false;
        }
    };

    const sendReminderToAll = async (interval: ReminderInterval) => {
        setSendingReminder(interval.key);
        const now = new Date();
        const eligible = businesses.filter(b => {
            if (b.plan === 'forever' || !b.subscription_end || !b.owner_phone) return false;
            const end = new Date(b.subscription_end);
            const daysLeft = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            return daysLeft >= 0 && daysLeft <= interval.days && daysLeft > (interval.days - 15);
        });

        let sent = 0, failed = 0;
        for (const biz of eligible) {
            const msg = interval.template
                .replace(/{business_name}/g, biz.name)
                .replace(/{expiry_date}/g, biz.subscription_end ? new Date(biz.subscription_end).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '')
                .replace(/{plan}/g, biz.plan);
            const ok = await sendSMS(biz.owner_phone!, msg, biz.id, biz.name, interval.key);
            ok ? sent++ : failed++;
        }
        setSendingReminder(null);
        showToast(`Sent to ${sent} business${sent !== 1 ? 'es' : ''}, ${failed} failed`);
        if (activeTab === 'logs') loadLogs();
    };

    const sendReminderToOne = async (biz: any, interval: ReminderInterval) => {
        if (!biz.owner_phone) { showToast('Business has no phone number', 'error'); return; }
        setSendingReminder(`${biz.id}-${interval.key}`);
        const msg = interval.template
            .replace(/{business_name}/g, biz.name)
            .replace(/{expiry_date}/g, biz.subscription_end ? new Date(biz.subscription_end).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A')
            .replace(/{plan}/g, biz.plan);
        const ok = await sendSMS(biz.owner_phone, msg, biz.id, biz.name, interval.key);
        setSendingReminder(null);
        showToast(ok ? `Reminder sent to ${biz.name}` : `Failed to send to ${biz.name}`, ok ? 'success' : 'error');
    };

    const handleCompose = async () => {
        if (!composeMsg.trim()) return;
        setComposeSending(true);
        if (composeBulkBizIds.length > 0) {
            let sent = 0;
            for (const bizId of composeBulkBizIds) {
                const biz = businesses.find(b => b.id === bizId);
                if (biz?.owner_phone) {
                    const ok = await sendSMS(biz.owner_phone, composeMsg, biz.id, biz.name, 'manual');
                    if (ok) sent++;
                }
            }
            showToast(`Sent to ${sent} of ${composeBulkBizIds.length} businesses`);
        } else if (composePhone) {
            const ok = await sendSMS(composePhone, composeMsg, undefined, undefined, 'manual');
            showToast(ok ? 'Message sent!' : 'Failed to send', ok ? 'success' : 'error');
        }
        setComposeSending(false);
        setComposeMsg('');
        setComposeBulkBizIds([]);
        setComposePhone('');
        if (activeTab === 'logs') loadLogs();
    };

    // Upcoming businesses for reminder tab
    const now = new Date();
    const upcomingByInterval = intervals.map(iv => ({
        ...iv,
        businesses: businesses.filter(b => {
            if (b.plan === 'forever' || !b.subscription_end) return false;
            const daysLeft = Math.ceil((new Date(b.subscription_end).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            return daysLeft >= 0 && daysLeft <= iv.days;
        })
    }));

    const inputClass = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm transition-all";
    const labelClass = "block text-xs font-medium text-slate-400 mb-1.5";

    const tabs = [
        { key: 'reminders', label: 'Reminders', icon: Bell },
        { key: 'compose', label: 'Compose', icon: Send },
        { key: 'settings', label: 'SMS Settings', icon: Settings },
        { key: 'logs', label: 'Message Logs', icon: History },
    ] as const;

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-medium animate-in slide-in-from-top-2 flex items-center gap-2 ${toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
                    {toast.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                    {toast.msg}
                </div>
            )}

            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
                        <MessageSquare className="h-5 w-5 text-indigo-400" />
                    </div>
                    SMS & Notifications
                </h1>
                <p className="text-slate-400 text-sm mt-1">Send renewal reminders and messages to business owners</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 rounded-xl border border-white/5 bg-white/[0.02] p-1">
                {tabs.map(tab => (
                    <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all flex-1 justify-center ${activeTab === tab.key ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                        <tab.icon className="h-4 w-4" /> <span className="hidden sm:inline">{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* ── REMINDERS TAB ─────────────────────────────────────── */}
            {activeTab === 'reminders' && (
                <div className="space-y-6">
                    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="font-semibold text-white flex items-center gap-2"><Zap className="h-4 w-4 text-amber-400" /> Reminder Schedules</h2>
                            <button onClick={saveIntervals} disabled={savingIntervals} className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 text-xs font-medium hover:bg-indigo-600/30 transition-all">
                                <Save className="h-3.5 w-3.5" /> {savingIntervals ? 'Saving...' : 'Save Settings'}
                            </button>
                        </div>
                        <div className="space-y-4">
                            {intervals.map((iv, i) => (
                                <div key={iv.key} className="rounded-xl border border-white/5 bg-white/[0.02] p-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <button onClick={() => {
                                                const updated = [...intervals];
                                                updated[i] = { ...iv, enabled: !iv.enabled };
                                                setIntervals(updated);
                                            }} className={`h-5 w-9 rounded-full transition-all flex items-center px-0.5 ${iv.enabled ? 'bg-indigo-600 justify-end' : 'bg-white/10 justify-start'}`}>
                                                <span className="h-4 w-4 rounded-full bg-white shadow" />
                                            </button>
                                            <span className="text-sm font-medium text-white">{iv.label}</span>
                                            {upcomingByInterval[i].businesses.length > 0 && (
                                                <span className="text-xs bg-amber-500/20 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full">
                                                    {upcomingByInterval[i].businesses.length} due
                                                </span>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => sendReminderToAll(iv)}
                                            disabled={!iv.enabled || sendingReminder === iv.key || upcomingByInterval[i].businesses.length === 0}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 text-xs font-medium hover:bg-indigo-600/40 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                        >
                                            {sendingReminder === iv.key ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                                            Send to All ({upcomingByInterval[i].businesses.length})
                                        </button>
                                    </div>
                                    <div>
                                        <label className={labelClass}>Message Template</label>
                                        <textarea
                                            className={`${inputClass} resize-none font-mono text-xs`}
                                            rows={2}
                                            value={iv.template}
                                            onChange={e => {
                                                const updated = [...intervals];
                                                updated[i] = { ...iv, template: e.target.value };
                                                setIntervals(updated);
                                            }}
                                        />
                                        <p className="text-xs text-slate-600 mt-1">Variables: {'{business_name}'} {'{expiry_date}'} {'{plan}'}</p>
                                    </div>

                                    {/* Businesses in this window */}
                                    {upcomingByInterval[i].businesses.length > 0 && (
                                        <div className="space-y-1.5">
                                            <p className="text-xs font-medium text-slate-400">Businesses in this window:</p>
                                            {upcomingByInterval[i].businesses.map(biz => (
                                                <div key={biz.id} className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.02] border border-white/5">
                                                    <div>
                                                        <div className="text-xs font-medium text-white">{biz.name}</div>
                                                        <div className="text-[10px] text-slate-500 flex items-center gap-2">
                                                            <span>{biz.owner_phone || 'No phone'}</span>
                                                            <span>·</span>
                                                            <span className="text-amber-400">{biz.days_remaining}d left</span>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => sendReminderToOne(biz, iv)}
                                                        disabled={!biz.owner_phone || sendingReminder === `${biz.id}-${iv.key}`}
                                                        className="px-3 py-1 rounded-lg text-xs text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/10 transition-all disabled:opacity-40"
                                                    >
                                                        {sendingReminder === `${biz.id}-${iv.key}` ? '...' : 'Send'}
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ── COMPOSE TAB ─────────────────────────────────────── */}
            {activeTab === 'compose' && (
                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 space-y-5">
                    <h2 className="font-semibold text-white flex items-center gap-2"><Send className="h-4 w-4 text-indigo-400" /> Compose Message</h2>

                    <div>
                        <label className={labelClass}>Send to specific businesses (bulk)</label>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                            {businesses.map(biz => (
                                <label key={biz.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={composeBulkBizIds.includes(biz.id)}
                                        onChange={e => setComposeBulkBizIds(prev => e.target.checked ? [...prev, biz.id] : prev.filter(id => id !== biz.id))}
                                        className="accent-indigo-600"
                                    />
                                    <div>
                                        <div className="text-sm text-white">{biz.name}</div>
                                        <div className="text-xs text-slate-500">{biz.owner_phone || 'No phone number'}</div>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="relative flex items-center gap-3">
                        <div className="flex-1 h-px bg-white/5" />
                        <span className="text-xs text-slate-500">or send to a specific phone number</span>
                        <div className="flex-1 h-px bg-white/5" />
                    </div>

                    <div>
                        <label className={labelClass}>Phone Number (with country code)</label>
                        <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                            <input type="tel" className={`${inputClass} pl-10`} placeholder="e.g. 0241234567 or +233241234567" value={composePhone} onChange={e => setComposePhone(e.target.value)} disabled={composeBulkBizIds.length > 0} />
                        </div>
                    </div>

                    <div>
                        <label className={labelClass}>Message <span className="text-slate-600">({composeMsg.length}/160)</span></label>
                        <textarea className={`${inputClass} resize-none`} rows={4} placeholder="Type your message..." value={composeMsg} onChange={e => setComposeMsg(e.target.value)} />
                    </div>

                    <button
                        onClick={handleCompose}
                        disabled={composeSending || !composeMsg.trim() || (!composePhone && composeBulkBizIds.length === 0)}
                        className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-indigo-500/25 transition-all"
                    >
                        {composeSending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        {composeSending ? 'Sending...' : composeBulkBizIds.length > 0 ? `Send to ${composeBulkBizIds.length} Businesses` : 'Send Message'}
                    </button>
                </div>
            )}

            {/* ── SETTINGS TAB ─────────────────────────────────────── */}
            {activeTab === 'settings' && (
                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 space-y-5">
                    <h2 className="font-semibold text-white flex items-center gap-2"><Settings className="h-4 w-4 text-indigo-400" /> SMS Provider Settings</h2>
                    <p className="text-xs text-slate-500">These credentials are used for sending renewal reminders and manual messages to business owners.</p>

                    <div>
                        <label className={labelClass}>Provider</label>
                        <select className={inputClass} value={smsConfig.provider} onChange={e => setSmsConfig(p => ({ ...p, provider: e.target.value as any }))}>
                            <option value="mnotify" className="bg-slate-900">mNotify (Ghana)</option>
                            <option value="hubtel" className="bg-slate-900">Hubtel</option>
                        </select>
                    </div>

                    {smsConfig.provider === 'mnotify' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>API Key</label>
                                <div className="relative">
                                    <input type={showKey ? 'text' : 'password'} className={`${inputClass} pr-10`} value={smsConfig.apiKey} onChange={e => setSmsConfig(p => ({ ...p, apiKey: e.target.value }))} placeholder="mNotify API key" />
                                    <button onClick={() => setShowKey(!showKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                                        {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className={labelClass}>Sender ID (max 11 chars)</label>
                                <input className={inputClass} maxLength={11} value={smsConfig.senderId} onChange={e => setSmsConfig(p => ({ ...p, senderId: e.target.value }))} placeholder="SASICBIZ" />
                            </div>
                        </div>
                    )}

                    {smsConfig.provider === 'hubtel' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>Client ID</label>
                                <input type="text" className={inputClass} value={smsConfig.clientId} onChange={e => setSmsConfig(p => ({ ...p, clientId: e.target.value }))} />
                            </div>
                            <div>
                                <label className={labelClass}>Client Secret</label>
                                <div className="relative">
                                    <input type={showKey ? 'text' : 'password'} className={`${inputClass} pr-10`} value={smsConfig.clientSecret} onChange={e => setSmsConfig(p => ({ ...p, clientSecret: e.target.value }))} />
                                    <button onClick={() => setShowKey(!showKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                                        {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className={labelClass}>Sender ID (max 11 chars)</label>
                                <input className={inputClass} maxLength={11} value={smsConfig.senderId} onChange={e => setSmsConfig(p => ({ ...p, senderId: e.target.value }))} />
                            </div>
                        </div>
                    )}

                    <div className="flex gap-3">
                        <button onClick={saveSettings} disabled={savingConfig} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium disabled:opacity-60 transition-all">
                            <Save className="h-4 w-4" /> {savingConfig ? 'Saving...' : 'Save Settings'}
                        </button>
                    </div>

                    <div className="rounded-xl bg-amber-500/5 border border-amber-500/20 p-4 text-xs text-amber-400/80 space-y-1">
                        <p className="font-medium text-amber-400">📝 Note on SQL Migration</p>
                        <p>Run <code className="bg-white/10 px-1 py-0.5 rounded">SUPABASE_SUPER_ADMIN_SMS.sql</code> to add the required columns and logs table. This must be done before saving settings.</p>
                    </div>
                </div>
            )}

            {/* ── LOGS TAB ─────────────────────────────────────── */}
            {activeTab === 'logs' && (
                <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
                    <div className="flex items-center justify-between p-5 border-b border-white/5">
                        <h2 className="font-semibold text-white flex items-center gap-2"><History className="h-4 w-4 text-indigo-400" /> Message Logs</h2>
                        <button onClick={loadLogs} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all">
                            <RefreshCw className={`h-4 w-4 ${loadingLogs ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                    {loadingLogs ? (
                        <div className="py-16 text-center text-slate-400 animate-pulse text-sm">Loading logs...</div>
                    ) : logs.length === 0 ? (
                        <div className="py-16 text-center text-slate-500 text-sm">No messages sent yet</div>
                    ) : (
                        <div className="divide-y divide-white/5">
                            {logs.map(log => (
                                <div key={log.id} className="flex items-start gap-4 px-5 py-3.5 hover:bg-white/[0.02] transition-colors">
                                    <div className="mt-0.5">
                                        {log.status === 'sent'
                                            ? <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                                            : <XCircle className="h-4 w-4 text-red-400" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-sm font-medium text-white">{log.business_name || log.phone}</span>
                                            {log.reminder_type && (
                                                <span className="text-[10px] bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded-full capitalize">{log.reminder_type}</span>
                                            )}
                                        </div>
                                        <p className="text-xs text-slate-400 mt-0.5 truncate">{log.message}</p>
                                        <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500">
                                            <Phone className="h-3 w-3" /> {log.phone}
                                            <span>·</span>
                                            {new Date(log.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
