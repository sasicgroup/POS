'use client';

import { use, useState, useEffect } from 'react';
import { useSuperAdmin, Business, computeSubscriptionStatus } from '@/lib/super-admin-context';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft, Building2, Calendar, CheckCircle2, Clock, XCircle,
    Eye, RefreshCw, ToggleLeft, ToggleRight, Save,
    History, Pencil, DollarSign, User, Globe,
    FileText, Plus, Download, BarChart2, MessageSquare, Settings,
    Shield, ExternalLink, Activity, Zap
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/lib/toast-context';
import { createAndSaveInvoice } from '@/lib/invoice-generator';

type Mode = 'view' | 'edit_info' | 'renew';

export default function BusinessDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const { getBusinessById, updateBusiness, renewSubscription, toggleBusinessActive, startViewAs } = useSuperAdmin();
    const router = useRouter();
    const { showToast } = useToast();

    const [business, setBusiness] = useState<Business | null>(null);
    const [plans, setPlans] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [mode, setMode] = useState<Mode>('view');
    const [saving, setSaving] = useState(false);
    const [subLogs, setSubLogs] = useState<any[]>([]);
    const [invoices, setInvoices] = useState<any[]>([]);
    const [actualOwner, setActualOwner] = useState<any>(null);
    const [isSyncing, setIsSyncing] = useState(false);

    // Dynamic Pricing & Domains state
    const [customDomain, setCustomDomain] = useState('');
    const [domainStatus, setDomainStatus] = useState('none');

    // Edit info form state
    const [editForm, setEditForm] = useState<Partial<Business>>({});

    // Renew form state
    const [renewPlan, setRenewPlan] = useState('monthly');
    const [renewEnd, setRenewEnd] = useState('');
    const [renewNote, setRenewNote] = useState('');

    useEffect(() => {
        loadData();
    }, [id]);

    const loadData = async () => {
        setLoading(true);
        const [biz, { data: pData }] = await Promise.all([
            getBusinessById(id),
            supabase.from('platform_plans').select('*')
        ]);

        if (!biz) { router.push('/super-admin/businesses'); return; }
        setBusiness(biz);
        setPlans(pData || []);
        setCustomDomain(biz.custom_domain || '');
        setEditForm({
            name: biz.name,
            slug: biz.slug,
            owner_email: biz.owner_email,
            owner_phone: biz.owner_phone,
            app_name: biz.app_name,
            primary_color: biz.primary_color,
            notes: biz.notes,
            plan_id: biz.plan_id || 'starter',
            custom_price_monthly: biz.custom_price_monthly,
            custom_price_yearly: biz.custom_price_yearly,
        });
        setRenewPlan(biz.plan);

        // Fetch logs, owner, invoices
        const [logsRes, ownerRes, invRes] = await Promise.all([
            fetch(`/api/super-admin/businesses/${id}/logs`, { credentials: 'include' }),
            fetch(`/api/super-admin/businesses/${id}/owner`, { credentials: 'include' }),
            supabase.from('invoices').select('*').eq('business_id', id).order('created_at', { ascending: false })
        ]);

        if (logsRes.ok) {
            const { logs } = await logsRes.json();
            if (logs) setSubLogs(logs);
        }
        if (ownerRes.ok) {
            const { owner } = await ownerRes.json();
            setActualOwner(owner);
        }
        setInvoices(invRes.data || []);
        
        setLoading(false);
    };

    const handleSaveInfo = async () => {
        if (!business) return;
        setSaving(true);
        const result = await updateBusiness(business.id, {
            ...editForm,
            custom_domain: customDomain
        });
        setSaving(false);
        if (result.success) {
            showToast('success', 'SaaS Configuration updated');
            setMode('view');
            loadData();
        } else {
            showToast('error', `Error: ${result.message}`);
        }
    };

    const handleRenew = async () => {
        if (!business) return;
        setSaving(true);
        const endDate = renewPlan === 'forever' ? null : renewEnd || null;
        const result = await renewSubscription(business.id, renewPlan, endDate, renewNote);
        setSaving(false);
        if (result.success) {
            showToast('success', 'Subscription renewed successfully!');
            setMode('view');
            setRenewNote('');
            loadData();
        } else {
            showToast('error', 'Failed to renew subscription');
        }
    };

    const handleToggle = async () => {
        if (!business) return;
        const res = await toggleBusinessActive(business.id, !business.is_active);
        if (res.success) {
            showToast('success', `Business ${business.is_active ? 'suspended' : 'reactivated'}`);
            loadData();
        } else {
            showToast('error', res.message || 'Toggle failed');
        }
    };

    const [depositAmount, setDepositAmount] = useState('');
    const handleDeposit = async () => {
        if (!business || !depositAmount) return;
        setSaving(true);
        try {
            const res = await updateBusiness(business.id, { 
                sms_balance: (parseFloat(business.sms_balance as any) || 0) + parseFloat(depositAmount) 
            });
            if (res.success) {
                showToast('success', `Deposited GHS ${depositAmount} to wallet`);
                setDepositAmount('');
                await loadData();
            } else {
                showToast('error', `Deposit failed: ${res.message}`);
            }
        } finally {
            setSaving(false);
        }
    };

    const handleSyncOwner = async () => {
        if (!business || !actualOwner) return;
        setIsSyncing(true);
        const res = await updateBusiness(business.id, {
            owner_email: actualOwner.email || actualOwner.username,
            owner_phone: actualOwner.phone
        });
        setIsSyncing(false);
        if (res.success) {
            showToast('success', 'Owner details synced with employee record');
            loadData();
        }
    };

    const handleGenerateInvoice = async () => {
        if (!business) return;
        try {
            // Use custom price if available, else fallback
            const amount = business.plan === 'yearly' 
                ? (business.custom_price_yearly || 480) 
                : (business.custom_price_monthly || 50);
            
            const desc = `${business.plan.toUpperCase()} Subscription Renewal (${editForm.plan_id})`;
            const { pdf } = await createAndSaveInvoice(business.id, amount, desc);
            pdf.save(`Invoice_${business.name}_${new Date().getTime()}.pdf`);
            showToast('success', 'Invoice generated and downloaded');
            loadData();
        } catch (e) {
            showToast('error', 'Failed to generate invoice');
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center py-48 text-slate-500 animate-pulse uppercase text-xs font-black tracking-widest">
            Synchronizing SaaS Core...
        </div>
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
        <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 pb-32">
            <Link href="/super-admin/businesses" className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm transition-colors">
                <ArrowLeft className="h-4 w-4" /> Platform Directory
            </Link>

            {/* Premium Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="flex items-center gap-5">
                    <div className="h-20 w-20 rounded-3xl flex items-center justify-center text-3xl font-black border-2 border-white/5 shadow-2xl relative group overflow-hidden"
                        style={{ backgroundColor: `${business.primary_color}20`, color: business.primary_color }}>
                        {business.name.charAt(0).toUpperCase()}
                        <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-3xl font-black text-white">{business.name}</h1>
                            <span className="px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-widest">
                                {editForm.plan_id}
                            </span>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-slate-500 text-xs font-medium uppercase tracking-tighter">
                            <code>/{business.slug}</code>
                            <span>·</span>
                            <span className="flex items-center gap-1"><Shield size={12}/> SaaS Infrastructure</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <button onClick={() => startViewAs(business, 'read_only')} className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 text-sm font-bold transition-all">
                        <Eye size={16}/> Access Store
                    </button>
                    <button onClick={() => startViewAs(business, 'full_access')} className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-amber-500 text-slate-950 hover:bg-amber-400 text-sm font-bold transition-all shadow-lg shadow-amber-500/10">
                        God Mode
                    </button>
                    <button onClick={handleToggle} className={`p-2.5 rounded-2xl border transition-all ${business.is_active ? 'border-red-500/30 text-red-400 hover:bg-red-500/10' : 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10'}`}>
                        {business.is_active ? <ToggleRight size={22}/> : <ToggleLeft size={22}/>}
                    </button>
                </div>
            </div>

            {/* Status & Renewal */}
            <div className={`rounded-3xl border-2 p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 ${cfg.bg}`}>
                <div className="flex items-center gap-4">
                    <div className={`h-12 w-12 rounded-2xl bg-white/5 flex items-center justify-center ${cfg.color} border border-white/5`}>
                        <StatusIcon size={24} />
                    </div>
                    <div>
                        <div className={`text-xl font-black ${cfg.color}`}>
                            {!business.is_active ? 'SUSPENDED' : cfg.label.toUpperCase()}
                        </div>
                        <div className="text-xs text-slate-400 font-medium">
                            {days_remaining !== null && status !== 'forever' ? `${days_remaining} days left in billing cycle` : 'Full Lifecycle Access'}
                            <span className="mx-2">·</span>
                            Expires {business.subscription_end ? new Date(business.subscription_end).toLocaleDateString() : 'Never'}
                        </div>
                    </div>
                </div>
                <button onClick={() => setMode('renew')} className="px-6 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-sm font-black uppercase tracking-widest transition-all">
                    Modify Subscription
                </button>
            </div>
            
            {mode === 'renew' && (
                <div className="rounded-3xl border border-white/5 bg-slate-900 p-8 space-y-6 animate-in slide-in-from-top-4 duration-500 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-5">
                        <Calendar size={120} />
                    </div>
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2"><Calendar className="text-indigo-400" /> Subscription Renewal</h3>
                        <button onClick={() => setMode('view')} className="text-slate-500 hover:text-white transition-colors"><XCircle size={20}/></button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                        <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Billing Cycle</label>
                            <select className={inputClass} value={renewPlan} onChange={e => setRenewPlan(e.target.value)}>
                                <option value="monthly" className="bg-slate-900">Monthly Billing</option>
                                <option value="yearly" className="bg-slate-900">Yearly Billing</option>
                                <option value="forever" className="bg-slate-900">Forever (LTD)</option>
                                <option value="trial" className="bg-slate-900">Trial Period</option>
                            </select>
                        </div>
                        {renewPlan !== 'forever' && (
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Expiry Date Override</label>
                                <input type="date" className={inputClass} value={renewEnd} onChange={e => setRenewEnd(e.target.value)} />
                            </div>
                        )}
                        <div className="md:col-span-2">
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Administrative Note</label>
                            <textarea 
                                className={`${inputClass} resize-none`} rows={2} placeholder="Reason for change..." 
                                value={renewNote} onChange={e => setRenewNote(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="flex gap-3 pt-4">
                        <button 
                            onClick={handleRenew} disabled={saving}
                            className="px-8 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-black uppercase tracking-widest transition-all shadow-xl shadow-indigo-500/20"
                        >
                            {saving ? 'Processing...' : 'Execute Renewal'}
                        </button>
                        <button onClick={() => setMode('view')} className="px-8 py-3 rounded-2xl bg-white/5 border border-white/10 text-slate-400 text-sm font-black uppercase tracking-widest hover:bg-white/10 transition-all">Cancel</button>
                    </div>
                </div>
            )}

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Left Col: Config */}
                <div className="lg:col-span-2 space-y-8">
                    
                    {/* SaaS Gating & Pricing */}
                    <div className="bg-slate-900 border border-white/5 rounded-3xl p-8 shadow-2xl space-y-8">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2"><Zap className="text-indigo-400" /> SaaS Configuration</h3>
                            <button onClick={handleSaveInfo} disabled={saving} className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all">
                                {saving ? 'Syncing...' : 'Save All Changes'}
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Plan Selection */}
                            <div className="space-y-4">
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Base Subscription Plan</label>
                                <div className="grid grid-cols-1 gap-2">
                                    {plans.map(p => (
                                        <button 
                                            key={p.id}
                                            onClick={() => setEditForm({...editForm, plan_id: p.id})}
                                            className={`p-4 rounded-2xl border text-left transition-all relative ${editForm.plan_id === p.id ? 'bg-indigo-600/10 border-indigo-500 shadow-xl shadow-indigo-500/5' : 'bg-white/5 border-transparent hover:bg-white/[0.08]'}`}
                                        >
                                            <div className="flex items-center justify-between mb-1">
                                                <span className={`text-sm font-black ${editForm.plan_id === p.id ? 'text-white' : 'text-slate-400'}`}>{p.name}</span>
                                                {editForm.plan_id === p.id && <CheckCircle2 size={16} className="text-indigo-400" />}
                                            </div>
                                            <div className="text-[10px] text-slate-500">Base Price: GHS {p.base_price_monthly}/mo</div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Custom Pricing */}
                            <div className="space-y-4">
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Dynamic Pricing Overrides</label>
                                <div className="space-y-3">
                                    <div>
                                        <div className="text-[10px] text-slate-500 mb-1.5 flex justify-between">Custom Monthly (GHS) <span>Current: Default</span></div>
                                        <div className="relative">
                                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" />
                                            <input 
                                                type="number" className={`${inputClass} pl-10`} 
                                                value={editForm.custom_price_monthly || ''} 
                                                onChange={e => setEditForm({...editForm, custom_price_monthly: parseFloat(e.target.value) || undefined})}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] text-slate-500 mb-1.5 flex justify-between">Custom Yearly (GHS)</div>
                                        <div className="relative">
                                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" />
                                            <input 
                                                type="number" className={`${inputClass} pl-10`}
                                                value={editForm.custom_price_yearly || ''} 
                                                onChange={e => setEditForm({...editForm, custom_price_yearly: parseFloat(e.target.value) || undefined})}
                                            />
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-slate-500 leading-relaxed italic border-t border-white/5 pt-3">
                                        Overrides will be reflected in automatically generated manual invoices.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Branding & Whitelist Domain */}
                        <div className="pt-8 border-t border-white/5">
                            <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><Globe size={16} className="text-emerald-400"/> White-Label Branding</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Custom Apex Domain</label>
                                    <div className="flex gap-2">
                                        <input 
                                            placeholder="my-shop.com" className={inputClass} 
                                            value={customDomain} onChange={e => setCustomDomain(e.target.value)}
                                        />
                                        <button className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-slate-300 hover:text-white transition-all">Verify</button>
                                    </div>
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className="text-[10px] font-bold text-slate-600 uppercase">Status:</span>
                                        <span className="text-[10px] font-black text-amber-500 uppercase">DNS PENDING</span>
                                    </div>
                                </div>
                                <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between group">
                                    <div>
                                        <div className="text-[10px] text-slate-500 uppercase font-bold">Public URL</div>
                                        <div className="text-xs text-indigo-400 font-bold">https://{business.slug}.sasic.com</div>
                                    </div>
                                    <ExternalLink size={14} className="text-slate-700 group-hover:text-indigo-400 transition-colors" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Billing History */}
                    <div className="bg-slate-900 border border-white/5 rounded-3xl p-8 shadow-2xl">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2"><FileText size={18} className="text-indigo-400"/> Billing Records</h3>
                            <button onClick={handleGenerateInvoice} className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase transition-all shadow-xl shadow-indigo-500/10">
                                <Plus size={16}/> New Invoice
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs text-slate-400">
                                <thead className="border-b border-white/5 uppercase font-black tracking-widest text-slate-500">
                                    <tr><th className="pb-4 px-2">#</th><th className="pb-4">Date</th><th className="pb-4">Amount</th><th className="pb-4 text-right">Download</th></tr>
                                </thead>
                                <tbody>
                                    {invoices.map(inv => (
                                        <tr key={inv.id} className="border-b border-white/[0.02] hover:bg-white/[0.01] transition-colors">
                                            <td className="py-4 px-2 text-white font-bold">{inv.invoice_number}</td>
                                            <td>{new Date(inv.created_at).toLocaleDateString()}</td>
                                            <td className="text-emerald-400 font-black">GHS {inv.amount}</td>
                                            <td className="text-right pr-2"><button className="p-2 hover:text-white transition-colors"><Download size={16}/></button></td>
                                        </tr>
                                    ))}
                                    {invoices.length === 0 && <tr><td colSpan={4} className="py-12 text-center text-slate-600 italic">No historical invoices found.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Right Col: Wallet & Meta */}
                <div className="space-y-8">
                    {/* SMS Wallet */}
                    <div className="bg-slate-900 border border-white/5 rounded-3xl p-6 shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <MessageSquare size={80} />
                        </div>
                        <h3 className="font-bold text-white flex items-center gap-2 mb-6"><DollarSign size={18} className="text-emerald-400"/> SMS Wallet</h3>
                        <div className="text-4xl font-black text-white mb-2">GHS {parseFloat(business.sms_balance as any || 0).toFixed(2)}</div>
                        <div className="text-[10px] text-slate-500 uppercase tracking-widest font-black mb-8">Available Credit Pool</div>
                        
                        <div className="flex gap-2">
                            <input 
                                type="number" 
                                className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none"
                                placeholder="0.00"
                                value={depositAmount}
                                onChange={e => setDepositAmount(e.target.value)}
                            />
                            <button onClick={handleDeposit} className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-lg shadow-emerald-500/10">Deposit</button>
                        </div>
                    </div>

                    {/* Owner Details */}
                    <div className="bg-slate-900 border border-white/5 rounded-3xl p-6 shadow-2xl">
                        <h3 className="font-bold text-white flex items-center gap-2 mb-6"><User size={18} className="text-slate-400"/> Lifecycle Meta</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center py-2 border-b border-white/5">
                                <span className="text-[10px] font-black text-slate-500 uppercase">Administrator</span>
                                <span className="text-xs text-white font-bold">{business.owner_email || '—'}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-white/5">
                                <span className="text-[10px] font-black text-slate-500 uppercase">Direct Contact</span>
                                <span className="text-xs text-white font-bold">{business.owner_phone || '—'}</span>
                            </div>
                            {actualOwner && (business.owner_email !== actualOwner.email) && (
                                <div className="mt-4 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 space-y-3">
                                    <div className="flex items-center gap-2 text-amber-500 text-[10px] font-black uppercase tracking-widest">
                                        <Activity size={12}/> Profile Mismatch
                                    </div>
                                    <p className="text-[10px] text-slate-400 leading-tight">Live employee record differs from business metadata. Synchronization recommended.</p>
                                    <button onClick={handleSyncOwner} className="w-full py-2 rounded-xl bg-amber-500 text-slate-950 text-[10px] font-black uppercase hover:bg-amber-400 transition-all disabled:opacity-50" disabled={isSyncing}>
                                        {isSyncing ? 'Synchronizing...' : 'Force Sync'}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
