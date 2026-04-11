'use client';

import { useState } from 'react';
import { useSuperAdmin } from '@/lib/super-admin-context';
import { supabase } from '@/lib/supabase';
import { Globe, Monitor, Smartphone, Save, Eye, RefreshCw, Check, Palette, Type, Phone, MessageSquare, Zap, Building2, Star } from 'lucide-react';

interface HomePageContent {
    hero_tag: string;
    hero_title: string;
    hero_subtitle: string;
    hero_cta_label: string;
    contact_phone: string;
    contact_email: string;
    contact_whatsapp: string;
    primary_color: string;
    accent_color: string;
    company_name: string;
    tagline: string;
    features: { icon: string; title: string; description: string }[];
    pricing: { name: string; price: string; period: string; features: string[]; highlighted: boolean }[];
    footer_text: string;
}

const DEFAULT_CONTENT: HomePageContent = {
    hero_tag: 'Modern AI POS',
    hero_title: 'Modern AI POS For Businesses',
    hero_subtitle: 'The all-in-one point of sale system designed to grow your business. Manage inventory, sales, employees and customers from one powerful dashboard.',
    hero_cta_label: 'Get Started Today',
    contact_phone: '+233 XX XXX XXXX',
    contact_email: 'info@yourdomain.com',
    contact_whatsapp: '+233 XX XXX XXXX',
    primary_color: '#4f46e5',
    accent_color: '#7c3aed',
    company_name: 'Sasic Business',
    tagline: 'Powered by Sasic',
    features: [
        { icon: '🛒', title: 'Smart POS', description: 'Fast, intuitive point of sale for any business type' },
        { icon: '📦', title: 'Inventory Management', description: 'Real-time stock tracking with low-stock alerts' },
        { icon: '👥', title: 'Customer Management', description: 'Build loyalty with customer profiles and history' },
        { icon: '📊', title: 'Detailed Reports', description: 'Revenue analytics, P&L and sales insights' },
        { icon: '🔔', title: 'SMS Notifications', description: 'Automated alerts to owners and customers' },
        { icon: '🔒', title: 'Multi-Store Support', description: 'Manage multiple stores from one account' },
    ],
    pricing: [
        { name: 'Monthly', price: 'Contact Us', period: 'per month', features: ['Unlimited sales', 'Up to 3 stores', 'SMS alerts', 'Email support'], highlighted: false },
        { name: 'Yearly', price: 'Contact Us', period: 'per year', features: ['Unlimited sales', 'Unlimited stores', 'SMS alerts', 'Priority support', '2 months free'], highlighted: true },
        { name: 'Forever', price: 'Contact Us', period: 'one time', features: ['Everything included', 'No monthly fees', 'Lifetime updates', 'Dedicated support'], highlighted: false },
    ],
    footer_text: '© 2025 Sasic Business. All rights reserved.',
};

export default function HomepageEditorPage() {
    const [content, setContent] = useState<HomePageContent>(DEFAULT_CONTENT);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState('');
    const [preview, setPreview] = useState(false);
    const [activeSection, setActiveSection] = useState<'hero' | 'features' | 'pricing' | 'contact' | 'branding'>('hero');

    const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

    const set = (field: keyof HomePageContent, value: any) => setContent(p => ({ ...p, [field]: value }));

    const saveContent = async () => {
        setSaving(true);
        const { error } = await supabase.from('global_settings').update({
            homepage_content: content
        }).neq('id', '00000000-0000-0000-0000-000000000000');
        setSaving(false);
        if (error) showToast('Error saving: ' + error.message);
        else showToast('Homepage saved!');
    };

    const inputClass = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm transition-all";
    const labelClass = "block text-xs font-medium text-slate-400 mb-1.5";

    const sections = [
        { key: 'hero', label: 'Hero', icon: Zap },
        { key: 'features', label: 'Features', icon: Star },
        { key: 'pricing', label: 'Pricing', icon: Building2 },
        { key: 'contact', label: 'Contact', icon: Phone },
        { key: 'branding', label: 'Branding', icon: Palette },
    ] as const;

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {toast && (
                <div className="fixed top-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-lg text-sm font-medium animate-in slide-in-from-top-2 flex items-center gap-2">
                    <Check className="h-4 w-4" /> {toast}
                </div>
            )}

            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        <Globe className="h-6 w-6 text-indigo-400" /> Homepage Editor
                    </h1>
                    <p className="text-slate-400 text-sm mt-1">Edit content shown on your public homepage (e.g. yourdomain.com)</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => setPreview(!preview)} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 text-slate-300 hover:text-white text-sm transition-all">
                        <Eye className="h-4 w-4" /> {preview ? 'Editor' : 'Preview'}
                    </button>
                    <button onClick={saveContent} disabled={saving} className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-all disabled:opacity-60">
                        <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>

            {preview ? (
                /* ── LIVE PREVIEW ─────────────────── */
                <div className="rounded-2xl overflow-hidden border border-white/10 shadow-2xl" style={{ background: '#0f172a' }}>
                    {/* Mock browser bar */}
                    <div className="bg-slate-800 px-4 py-2 flex items-center gap-2 border-b border-white/5">
                        <div className="flex gap-1.5"><div className="h-3 w-3 rounded-full bg-red-500/60" /><div className="h-3 w-3 rounded-full bg-amber-500/60" /><div className="h-3 w-3 rounded-full bg-green-500/60" /></div>
                        <div className="flex-1 bg-white/5 rounded-lg px-3 py-1 text-xs text-slate-400">yourdomain.com</div>
                    </div>
                    {/* Hero preview */}
                    <div className="p-12 text-center" style={{ background: `linear-gradient(135deg, ${content.primary_color}15, ${content.accent_color}10)` }}>
                        <span className="text-xs font-semibold px-3 py-1 rounded-full border mb-4 inline-block" style={{ color: content.primary_color, borderColor: `${content.primary_color}40`, background: `${content.primary_color}15` }}>
                            {content.hero_tag}
                        </span>
                        <h1 className="text-3xl font-black text-white mt-3 mb-4 leading-tight">{content.hero_title}</h1>
                        <p className="text-slate-400 max-w-xl mx-auto text-sm mb-6">{content.hero_subtitle}</p>
                        <div className="flex items-center justify-center gap-4 flex-wrap text-sm text-slate-400 mb-6">
                            <span>📞 {content.contact_phone}</span>
                            <span>✉️ {content.contact_email}</span>
                        </div>
                        <button className="px-6 py-2.5 rounded-xl text-white text-sm font-semibold" style={{ background: `linear-gradient(135deg, ${content.primary_color}, ${content.accent_color})` }}>
                            {content.hero_cta_label}
                        </button>
                    </div>
                    {/* Features preview */}
                    <div className="px-8 py-6 grid grid-cols-3 gap-4 border-t border-white/5">
                        {content.features.map((f, i) => (
                            <div key={i} className="rounded-xl bg-white/[0.02] border border-white/5 p-4">
                                <span className="text-2xl">{f.icon}</span>
                                <div className="font-semibold text-white text-sm mt-2">{f.title}</div>
                                <div className="text-xs text-slate-400 mt-1">{f.description}</div>
                            </div>
                        ))}
                    </div>
                    {/* Footer */}
                    <div className="px-8 py-4 border-t border-white/5 text-center text-xs text-slate-600">{content.footer_text}</div>
                </div>
            ) : (
                /* ── EDITOR ─────────────────── */
                <div className="grid grid-cols-[200px_1fr] gap-6">
                    {/* Sidebar */}
                    <div className="space-y-1">
                        {sections.map(s => (
                            <button key={s.key} onClick={() => setActiveSection(s.key)}
                                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${activeSection === s.key ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                                <s.icon className="h-4 w-4" /> {s.label}
                            </button>
                        ))}
                    </div>

                    {/* Editor panel */}
                    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 space-y-5">
                        {activeSection === 'hero' && (
                            <>
                                <h2 className="font-semibold text-white mb-4 flex items-center gap-2"><Zap className="h-4 w-4 text-indigo-400" /> Hero Section</h2>
                                <div><label className={labelClass}>Badge / Tag Line</label><input className={inputClass} value={content.hero_tag} onChange={e => set('hero_tag', e.target.value)} placeholder="Modern AI POS" /></div>
                                <div><label className={labelClass}>Main Headline</label><input className={inputClass} value={content.hero_title} onChange={e => set('hero_title', e.target.value)} /></div>
                                <div><label className={labelClass}>Subtitle / Description</label><textarea className={`${inputClass} resize-none`} rows={3} value={content.hero_subtitle} onChange={e => set('hero_subtitle', e.target.value)} /></div>
                                <div><label className={labelClass}>CTA Button Text</label><input className={inputClass} value={content.hero_cta_label} onChange={e => set('hero_cta_label', e.target.value)} /></div>
                                <div><label className={labelClass}>Footer Text</label><input className={inputClass} value={content.footer_text} onChange={e => set('footer_text', e.target.value)} /></div>
                            </>
                        )}
                        {activeSection === 'contact' && (
                            <>
                                <h2 className="font-semibold text-white mb-4 flex items-center gap-2"><Phone className="h-4 w-4 text-indigo-400" /> Contact Info</h2>
                                <div><label className={labelClass}>Phone Number</label><input className={inputClass} value={content.contact_phone} onChange={e => set('contact_phone', e.target.value)} placeholder="+233 XX XXX XXXX" /></div>
                                <div><label className={labelClass}>Email Address</label><input type="email" className={inputClass} value={content.contact_email} onChange={e => set('contact_email', e.target.value)} /></div>
                                <div><label className={labelClass}>WhatsApp Number</label><input className={inputClass} value={content.contact_whatsapp} onChange={e => set('contact_whatsapp', e.target.value)} /></div>
                                <div><label className={labelClass}>Company Name</label><input className={inputClass} value={content.company_name} onChange={e => set('company_name', e.target.value)} /></div>
                                <div><label className={labelClass}>Footer Tagline</label><input className={inputClass} value={content.tagline} onChange={e => set('tagline', e.target.value)} /></div>
                            </>
                        )}
                        {activeSection === 'branding' && (
                            <>
                                <h2 className="font-semibold text-white mb-4 flex items-center gap-2"><Palette className="h-4 w-4 text-indigo-400" /> Branding & Colors</h2>
                                <div>
                                    <label className={labelClass}>Primary Color</label>
                                    <div className="flex gap-3"><input type="color" value={content.primary_color} onChange={e => set('primary_color', e.target.value)} className="h-10 w-10 rounded-lg border border-white/10 bg-transparent cursor-pointer" /><input className={`${inputClass} flex-1`} value={content.primary_color} onChange={e => set('primary_color', e.target.value)} /></div>
                                </div>
                                <div>
                                    <label className={labelClass}>Accent Color</label>
                                    <div className="flex gap-3"><input type="color" value={content.accent_color} onChange={e => set('accent_color', e.target.value)} className="h-10 w-10 rounded-lg border border-white/10 bg-transparent cursor-pointer" /><input className={`${inputClass} flex-1`} value={content.accent_color} onChange={e => set('accent_color', e.target.value)} /></div>
                                </div>
                            </>
                        )}
                        {activeSection === 'features' && (
                            <>
                                <h2 className="font-semibold text-white mb-4 flex items-center gap-2"><Star className="h-4 w-4 text-indigo-400" /> Features</h2>
                                {content.features.map((f, i) => (
                                    <div key={i} className="rounded-xl border border-white/5 bg-white/[0.02] p-4 space-y-3">
                                        <div className="grid grid-cols-[60px_1fr_2fr] gap-3">
                                            <div><label className={labelClass}>Icon</label><input className={inputClass} value={f.icon} onChange={e => { const upd = [...content.features]; upd[i] = { ...f, icon: e.target.value }; set('features', upd); }} /></div>
                                            <div><label className={labelClass}>Title</label><input className={inputClass} value={f.title} onChange={e => { const upd = [...content.features]; upd[i] = { ...f, title: e.target.value }; set('features', upd); }} /></div>
                                            <div><label className={labelClass}>Description</label><input className={inputClass} value={f.description} onChange={e => { const upd = [...content.features]; upd[i] = { ...f, description: e.target.value }; set('features', upd); }} /></div>
                                        </div>
                                    </div>
                                ))}
                            </>
                        )}
                        {activeSection === 'pricing' && (
                            <>
                                <h2 className="font-semibold text-white mb-4 flex items-center gap-2"><Building2 className="h-4 w-4 text-indigo-400" /> Pricing Plans</h2>
                                <p className="text-xs text-slate-500 mb-4">These are shown on your public homepage. Put "Contact Us" as price if you handle pricing personally.</p>
                                {content.pricing.map((p, i) => (
                                    <div key={i} className={`rounded-xl border p-4 space-y-3 ${p.highlighted ? 'border-indigo-500/30 bg-indigo-500/5' : 'border-white/5 bg-white/[0.02]'}`}>
                                        <div className="grid grid-cols-3 gap-3">
                                            <div><label className={labelClass}>Plan Name</label><input className={inputClass} value={p.name} onChange={e => { const upd = [...content.pricing]; upd[i] = { ...p, name: e.target.value }; set('pricing', upd); }} /></div>
                                            <div><label className={labelClass}>Price</label><input className={inputClass} value={p.price} onChange={e => { const upd = [...content.pricing]; upd[i] = { ...p, price: e.target.value }; set('pricing', upd); }} /></div>
                                            <div><label className={labelClass}>Period</label><input className={inputClass} value={p.period} onChange={e => { const upd = [...content.pricing]; upd[i] = { ...p, period: e.target.value }; set('pricing', upd); }} /></div>
                                        </div>
                                        <div><label className={labelClass}>Features (one per line)</label><textarea className={`${inputClass} resize-none font-mono text-xs`} rows={3} value={p.features.join('\n')} onChange={e => { const upd = [...content.pricing]; upd[i] = { ...p, features: e.target.value.split('\n') }; set('pricing', upd); }} /></div>
                                        <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-300">
                                            <input type="checkbox" checked={p.highlighted} onChange={e => { const upd = [...content.pricing]; upd[i] = { ...p, highlighted: e.target.checked }; set('pricing', upd); }} className="accent-indigo-600" />
                                            Highlight this plan
                                        </label>
                                    </div>
                                ))}
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
