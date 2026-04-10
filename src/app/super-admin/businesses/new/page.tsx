'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSuperAdmin } from '@/lib/super-admin-context';
import Link from 'next/link';
import { ArrowLeft, Building2, User, Lock, Calendar, Palette, ChevronRight, Info } from 'lucide-react';

type Plan = 'monthly' | 'yearly' | 'forever' | 'trial';

function planToEndDate(plan: Plan): string | null {
    if (plan === 'forever') return null;
    const d = new Date();
    if (plan === 'monthly') d.setMonth(d.getMonth() + 1);
    else if (plan === 'yearly') d.setFullYear(d.getFullYear() + 1);
    else if (plan === 'trial') d.setDate(d.getDate() + 14);
    return d.toISOString().slice(0, 10);
}

export default function NewBusinessPage() {
    const { createBusiness } = useSuperAdmin();
    const router = useRouter();

    const [form, setForm] = useState({
        name: '',
        slug: '',
        owner_email: '',
        owner_phone: '',
        app_name: '',
        primary_color: '#4f46e5',
        plan: 'monthly' as Plan,
        subscription_end: planToEndDate('monthly'),
        notes: '',
        owner_name: '',
        owner_username: '',
        owner_pin: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [step, setStep] = useState<1 | 2>(1);

    const autoSlug = (name: string) =>
        name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    const set = (field: string, value: string) =>
        setForm(prev => ({
            ...prev,
            [field]: value,
            ...(field === 'name' ? { slug: autoSlug(value) } : {}),
            ...(field === 'plan' ? { subscription_end: planToEndDate(value as Plan) } : {}),
        }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        const result = await createBusiness({
            ...form,
            subscription_end: form.subscription_end || null,
        });
        setLoading(false);
        if (result.success) {
            router.push(`/super-admin/businesses/${result.business?.id}`);
        } else {
            setError(result.message || 'Failed to create business');
        }
    };

    const inputClass = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm";
    const labelClass = "block text-sm font-medium text-slate-300 mb-1.5";

    return (
        <div className="max-w-2xl mx-auto animate-in fade-in duration-300">
            {/* Back */}
            <Link href="/super-admin/businesses" className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-6 transition-colors">
                <ArrowLeft className="h-4 w-4" /> Back to Businesses
            </Link>

            <h1 className="text-2xl font-bold text-white mb-1">Create New Business</h1>
            <p className="text-slate-400 text-sm mb-8">Set up a new isolated client business with its own login, stores, and data.</p>

            {/* Step indicator */}
            <div className="flex items-center gap-3 mb-8">
                {[{ n: 1, label: 'Business Info' }, { n: 2, label: 'Owner Account' }].map(s => (
                    <button key={s.n} onClick={() => s.n === 1 && setStep(1)}
                        className={`flex items-center gap-2 text-sm font-medium transition-colors ${step === s.n ? 'text-white' : 'text-slate-500'}`}>
                        <span className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold ${step === s.n ? 'bg-indigo-600 text-white' : step > s.n ? 'bg-emerald-600 text-white' : 'bg-white/10 text-slate-400'}`}>
                            {step > s.n ? '✓' : s.n}
                        </span>
                        {s.label}
                        {s.n < 2 && <ChevronRight className="h-3 w-3 text-slate-600" />}
                    </button>
                ))}
            </div>

            <form onSubmit={handleSubmit}>
                {/* Step 1: Business Info */}
                {step === 1 && (
                    <div className="space-y-5 rounded-2xl border border-white/5 bg-white/[0.02] p-6">
                        <div className="flex items-center gap-2 text-indigo-400 mb-2">
                            <Building2 className="h-5 w-5" />
                            <span className="font-semibold">Business Details</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <div className="sm:col-span-2">
                                <label className={labelClass}>Business Name *</label>
                                <input className={inputClass} placeholder="e.g. John's Retail Group" value={form.name} onChange={e => set('name', e.target.value)} required />
                            </div>
                            <div>
                                <label className={labelClass}>URL Slug *</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">/</span>
                                    <input className={`${inputClass} pl-6`} placeholder="johns-retail" value={form.slug} onChange={e => set('slug', e.target.value)} required pattern="[a-z0-9\-]+" />
                                </div>
                                <p className="text-xs text-slate-500 mt-1">Login URL: /{form.slug || 'slug'}/login</p>
                            </div>
                            <div>
                                <label className={labelClass}>App Name (optional)</label>
                                <input className={inputClass} placeholder={form.name || 'e.g. Retail Pro'} value={form.app_name} onChange={e => set('app_name', e.target.value)} />
                                <p className="text-xs text-slate-500 mt-1">Shown on their login page</p>
                            </div>
                            <div>
                                <label className={labelClass}>Owner Email</label>
                                <input className={inputClass} type="email" placeholder="owner@business.com" value={form.owner_email} onChange={e => set('owner_email', e.target.value)} />
                            </div>
                            <div>
                                <label className={labelClass}>Owner Phone</label>
                                <input className={inputClass} type="tel" placeholder="+233..." value={form.owner_phone} onChange={e => set('owner_phone', e.target.value)} />
                            </div>
                        </div>

                        <hr className="border-white/5" />

                        <div className="flex items-center gap-2 text-indigo-400 mb-2">
                            <Calendar className="h-5 w-5" />
                            <span className="font-semibold">Subscription</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <div>
                                <label className={labelClass}>Plan *</label>
                                <select className={inputClass} value={form.plan} onChange={e => set('plan', e.target.value)}>
                                    <option value="monthly" className="bg-slate-800">Monthly</option>
                                    <option value="yearly" className="bg-slate-800">Yearly</option>
                                    <option value="forever" className="bg-slate-800">Forever (no expiry)</option>
                                    <option value="trial" className="bg-slate-800">Trial (14 days)</option>
                                </select>
                            </div>
                            {form.plan !== 'forever' && (
                                <div>
                                    <label className={labelClass}>Subscription End Date</label>
                                    <input className={inputClass} type="date" value={form.subscription_end || ''} onChange={e => set('subscription_end', e.target.value)} />
                                </div>
                            )}
                        </div>

                        <div>
                            <label className={labelClass}>Brand Color</label>
                            <div className="flex items-center gap-3">
                                <input type="color" value={form.primary_color} onChange={e => set('primary_color', e.target.value)} className="h-10 w-10 rounded-lg border border-white/10 bg-transparent cursor-pointer" />
                                <input className={`${inputClass} flex-1`} value={form.primary_color} onChange={e => set('primary_color', e.target.value)} placeholder="#4f46e5" />
                            </div>
                        </div>

                        <div>
                            <label className={labelClass}>Notes (internal)</label>
                            <textarea className={`${inputClass} resize-none`} rows={2} placeholder="Payment notes, contact info..." value={form.notes} onChange={e => set('notes', e.target.value)} />
                        </div>
                    </div>
                )}

                {/* Step 2: Owner Account */}
                {step === 2 && (
                    <div className="space-y-5 rounded-2xl border border-white/5 bg-white/[0.02] p-6">
                        <div className="flex items-center gap-2 text-indigo-400 mb-2">
                            <User className="h-5 w-5" />
                            <span className="font-semibold">Owner Account</span>
                        </div>
                        <div className="rounded-xl bg-indigo-500/10 border border-indigo-500/20 p-3 flex items-start gap-2 text-sm text-indigo-300">
                            <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                            This creates the owner login for <strong>{form.name || 'this business'}</strong>. Provide these credentials to your client.
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <div className="sm:col-span-2">
                                <label className={labelClass}>Full Name *</label>
                                <input className={inputClass} placeholder="e.g. John Doe" value={form.owner_name} onChange={e => set('owner_name', e.target.value)} required />
                            </div>
                            <div>
                                <label className={labelClass}>Username *</label>
                                <input className={inputClass} placeholder="e.g. johndoe" value={form.owner_username} onChange={e => set('owner_username', e.target.value.toLowerCase())} required />
                            </div>
                            <div>
                                <label className={labelClass}>PIN (4 digits) *</label>
                                <input className={inputClass} type="password" placeholder="••••" maxLength={4} pattern="\d{4}" value={form.owner_pin} onChange={e => set('owner_pin', e.target.value.replace(/\D/g, '').slice(0, 4))} required />
                            </div>
                        </div>
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div className="mt-4 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
                        {error}
                    </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between mt-6">
                    {step === 2 ? (
                        <button type="button" onClick={() => setStep(1)} className="px-4 py-2 rounded-xl text-slate-400 hover:text-white border border-white/10 hover:border-white/20 text-sm transition-all">
                            ← Back
                        </button>
                    ) : <div />}

                    {step === 1 ? (
                        <button
                            type="button"
                            onClick={() => { if (!form.name || !form.slug) { setError('Business name and slug are required'); return; } setError(''); setStep(2); }}
                            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm transition-all"
                        >
                            Next: Owner Account →
                        </button>
                    ) : (
                        <button
                            type="submit"
                            disabled={loading || !form.owner_name || !form.owner_username || form.owner_pin.length < 4}
                            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-medium text-sm disabled:opacity-60 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-indigo-500/25 transition-all"
                        >
                            {loading ? 'Creating...' : '✓ Create Business'}
                        </button>
                    )}
                </div>
            </form>
        </div>
    );
}
