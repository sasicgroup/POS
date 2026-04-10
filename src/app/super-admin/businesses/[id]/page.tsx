'use client';

import { use, useState, useEffect } from 'react';
import { useSuperAdmin, Business, computeSubscriptionStatus } from '@/lib/super-admin-context';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import {
    ArrowLeft, Building2, Calendar, CheckCircle2, Clock, XCircle,
    Eye, EyeOff, RefreshCw, ToggleLeft, ToggleRight, Save,
    History, Pencil, Globe, Palette, DollarSign, ChevronDown, User
} from 'lucide-react';

type Mode = 'view' | 'edit_info' | 'renew';

export default function BusinessDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const { getBusinessById, updateBusiness, renewSubscription, toggleBusinessActive, startViewAs, superAdmin } = useSuperAdmin();
    const router = useRouter();

    const [business, setBusiness] = useState<Business | null>(null);
    const [loading, setLoading] = useState(true);
    const [mode, setMode] = useState<Mode>('view');
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState('');
    const [subLogs, setSubLogs] = useState<any[]>([]);

    // Edit info form state
    const [editForm, setEditForm] = useState<Partial<Business>>({});

    // Renew form state
    const [renewPlan, setRenewPlan] = useState('monthly');
    const [renewEnd, setRenewEnd] = useState('');
    const [renewNote, setRenewNote] = useState('');

    useEffect(() => {
        loadBusiness();
    }, [id]);

    const loadBusiness = async () => {
        setLoading(true);
        const biz = await getBusinessById(id);
        if (!biz) { router.push('/super-admin/businesses'); return; }
        setBusiness(biz);
        setEditForm({
            name: biz.name,
            slug: biz.slug,
            owner_email: biz.owner_email,
            owner_phone: biz.owner_phone,
            app_name: biz.app_name,
            primary_color: biz.primary_color,
            notes: biz.notes,
        });
        setRenewPlan(biz.plan);
        // Load subscription logs
        const { data: logs } = await supabase
            .from('business_subscription_logs')
            .select('*')
            .eq('business_id', id)
            .order('created_at', { ascending: false })
            .limit(10);
        if (logs) setSubLogs(logs);
        setLoading(false);
    };

    const showToast = (msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(''), 3000);
    };

    const handleSaveInfo = async () => {
        if (!business) return;
        setSaving(true);
        const result = await updateBusiness(business.id, editForm);
        setSaving(false);
        if (result.success) {
            showToast('Business updated successfully');
            setMode('view');
            loadBusiness();
        } else {
            showToast(`Error: ${result.message}`);
        }
    };

    const handleRenew = async () => {
        if (!business) return;
        setSaving(true);
        const endDate = renewPlan === 'forever' ? null : renewEnd || null;
        const result = await renewSubscription(business.id, renewPlan, endDate, renewNote);
        setSaving(false);
        if (result.success) {
            showToast('Subscription renewed successfully!');
            setMode('view');
            setRenewNote('');
            loadBusiness();
        } else {
            showToast('Failed to renew subscription');
        }
    };

    const handleToggle = async () => {
        if (!business) return;
        await toggleBusinessActive(business.id, !business.is_active);
        showToast(`Business ${business.is_active ? 'suspended' : 'reactivated'}`);
        loadBusiness();
    };

    if (loading) return (
        <div className="flex items-center justify-center py-32 text-slate-400 animate-pulse">Loading business...</div>
    );

    if (!business) return null;

    const { status, days_remaining } = computeSubscriptionStatus(business);
    const statusConfig = {
        active: { label: 'Active', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', icon: CheckCircle2 },
        forever: { label: 'Forever', color: 'text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/20', icon: CheckCircle2 },
        grace: { label: 'Grace Period', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', icon: Clock },
        expired: { label: 'Expired', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20', icon: XCircle },
    };
    const cfg = statusConfig[status || 'active'];
    const StatusIcon = cfg.icon;

    const inputClass = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm transition-all";

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
            {/* Toast */}
            {toast && (
                <div className="fixed top-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-lg text-sm font-medium animate-in slide-in-from-top-2">
                    {toast}
                </div>
            )}

            {/* Back */}
            <Link href="/super-admin/businesses" className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm transition-colors">
                <ArrowLeft className="h-4 w-4" /> Back to Businesses
            </Link>

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-2xl flex items-center justify-center text-xl font-black border border-white/10"
                        style={{ backgroundColor: `${business.primary_color}20`, color: business.primary_color }}>
                        {business.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white">{business.name}</h1>
                        <code className="text-xs text-slate-500">/{business.slug}/login</code>
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <button
                        onClick={() => startViewAs(business, 'read_only')}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 text-slate-300 hover:text-white hover:border-white/20 text-sm transition-all"
                    >
                        <Eye className="h-4 w-4" /> View As (Read Only)
                    </button>
                    <button
                        onClick={() => startViewAs(business, 'full_access')}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 text-sm transition-all"
                    >
                        <Eye className="h-4 w-4" /> View As (Full Access)
                    </button>
                    <button
                        onClick={handleToggle}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all ${business.is_active
                            ? 'border border-red-500/30 text-red-400 hover:bg-red-500/10'
                            : 'border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10'
                            }`}
                    >
                        {business.is_active ? <><ToggleRight className="h-4 w-4" /> Suspend</> : <><ToggleLeft className="h-4 w-4" /> Reactivate</>}
                    </button>
                </div>
            </div>

            {/* Status Banner */}
            <div className={`rounded-2xl border p-5 flex items-center justify-between ${cfg.bg}`}>
                <div className="flex items-center gap-3">
                    <StatusIcon className={`h-5 w-5 ${cfg.color}`} />
                    <div>
                        <div className={`font-semibold ${cfg.color}`}>
                            {!business.is_active ? 'Suspended' : cfg.label}
                            {days_remaining !== null && status !== 'forever' && ` · ${days_remaining} day${days_remaining !== 1 ? 's' : ''} ${status === 'grace' ? 'in grace period' : 'remaining'}`}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                            Plan: <span className="capitalize font-medium text-slate-300">{business.plan}</span>
                            {business.subscription_end && ` · Expires ${new Date(business.subscription_end).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`}
                            {!business.subscription_end && ' · Never expires'}
                        </div>
                    </div>
                </div>
                <button
                    onClick={() => setMode('renew')}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-all"
                >
                    <RefreshCw className="h-4 w-4" /> Renew / Change Plan
                </button>
            </div>

            {/* Renew Panel */}
            {mode === 'renew' && (
                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 space-y-4 animate-in slide-in-from-top-2">
                    <h3 className="font-semibold text-white flex items-center gap-2"><Calendar className="h-5 w-5 text-indigo-400" /> Renew Subscription</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1.5">New Plan</label>
                            <select className={inputClass} value={renewPlan} onChange={e => setRenewPlan(e.target.value)}>
                                <option value="monthly" className="bg-slate-900">Monthly</option>
                                <option value="yearly" className="bg-slate-900">Yearly</option>
                                <option value="forever" className="bg-slate-900">Forever</option>
                                <option value="trial" className="bg-slate-900">Trial</option>
                            </select>
                        </div>
                        {renewPlan !== 'forever' && (
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1.5">New Expiry Date</label>
                                <input type="date" className={inputClass} value={renewEnd} onChange={e => setRenewEnd(e.target.value)} />
                            </div>
                        )}
                        <div className="sm:col-span-2">
                            <label className="block text-xs font-medium text-slate-400 mb-1.5">Note (optional)</label>
                            <input type="text" className={inputClass} placeholder="e.g. Paid via bank transfer" value={renewNote} onChange={e => setRenewNote(e.target.value)} />
                        </div>
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button onClick={handleRenew} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium disabled:opacity-60 transition-all">
                            <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Confirm Renewal'}
                        </button>
                        <button onClick={() => setMode('view')} className="px-5 py-2.5 rounded-xl border border-white/10 text-slate-400 hover:text-white text-sm transition-all">Cancel</button>
                    </div>
                </div>
            )}

            {/* Two Column Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Business Info */}
                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
                    <div className="flex items-center justify-between mb-5">
                        <h3 className="font-semibold text-white flex items-center gap-2"><Building2 className="h-5 w-5 text-indigo-400" /> Business Info</h3>
                        {mode !== 'edit_info' && (
                            <button onClick={() => setMode('edit_info')} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-indigo-400 transition-colors">
                                <Pencil className="h-3.5 w-3.5" /> Edit
                            </button>
                        )}
                    </div>

                    {mode === 'edit_info' ? (
                        <div className="space-y-3">
                            {[
                                { label: 'Business Name', key: 'name' },
                                { label: 'App Name', key: 'app_name' },
                                { label: 'Owner Email', key: 'owner_email', type: 'email' },
                                { label: 'Owner Phone', key: 'owner_phone' },
                            ].map(f => (
                                <div key={f.key}>
                                    <label className="block text-xs text-slate-400 mb-1">{f.label}</label>
                                    <input
                                        type={f.type || 'text'}
                                        className={inputClass}
                                        value={(editForm as any)[f.key] || ''}
                                        onChange={e => setEditForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                                    />
                                </div>
                            ))}
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Brand Color</label>
                                <div className="flex gap-2">
                                    <input type="color" value={editForm.primary_color || '#4f46e5'} onChange={e => setEditForm(p => ({ ...p, primary_color: e.target.value }))} className="h-10 w-10 rounded-lg border border-white/10 bg-transparent cursor-pointer" />
                                    <input type="text" className={`${inputClass} flex-1`} value={editForm.primary_color || ''} onChange={e => setEditForm(p => ({ ...p, primary_color: e.target.value }))} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Notes</label>
                                <textarea className={`${inputClass} resize-none`} rows={2} value={editForm.notes || ''} onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))} />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button onClick={handleSaveInfo} disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm disabled:opacity-60 transition-all">
                                    <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save Changes'}
                                </button>
                                <button onClick={() => setMode('view')} className="px-4 py-2 rounded-xl border border-white/10 text-slate-400 hover:text-white text-sm transition-all">Cancel</button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3 text-sm">
                            {[
                                { label: 'Business Name', value: business.name },
                                { label: 'App Name', value: business.app_name || '—' },
                                { label: 'Slug', value: `/${business.slug}/login` },
                                { label: 'Owner Email', value: business.owner_email || '—' },
                                { label: 'Owner Phone', value: business.owner_phone || '—' },
                                { label: 'Brand Color', value: business.primary_color },
                                { label: 'Notes', value: business.notes || '—' },
                                { label: 'Created', value: new Date(business.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) },
                            ].map(row => (
                                <div key={row.label} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
                                    <span className="text-slate-400">{row.label}</span>
                                    <span className="text-white font-medium text-right max-w-[200px] truncate flex items-center gap-2">
                                        {row.label === 'Brand Color' && (
                                            <span className="h-3 w-3 rounded-full inline-block border border-white/20" style={{ backgroundColor: business.primary_color }} />
                                        )}
                                        {row.value}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Subscription History */}
                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
                    <h3 className="font-semibold text-white flex items-center gap-2 mb-5">
                        <History className="h-5 w-5 text-indigo-400" /> Subscription History
                    </h3>
                    {subLogs.length === 0 ? (
                        <div className="text-center text-slate-500 py-8 text-sm">No history yet</div>
                    ) : (
                        <div className="space-y-3">
                            {subLogs.map(log => (
                                <div key={log.id} className="flex items-start gap-3 py-2 border-b border-white/5 last:border-0">
                                    <div className={`mt-0.5 h-2 w-2 rounded-full flex-shrink-0 ${log.action === 'created' ? 'bg-indigo-400' :
                                        log.action === 'renewed' ? 'bg-emerald-400' :
                                            log.action === 'suspended' ? 'bg-red-400' :
                                                log.action === 'reactivated' ? 'bg-emerald-400' : 'bg-slate-400'}`} />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium text-white capitalize">{log.action}</span>
                                            <span className="text-xs text-slate-500">{new Date(log.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                        </div>
                                        {log.plan && <div className="text-xs text-slate-400 capitalize">Plan: {log.plan}</div>}
                                        {log.note && <div className="text-xs text-slate-500 mt-0.5">{log.note}</div>}
                                        {log.subscription_end && (
                                            <div className="text-xs text-slate-500">Expires: {new Date(log.subscription_end).toLocaleDateString('en-GB')}</div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
