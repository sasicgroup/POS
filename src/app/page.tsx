'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function PublicHomepage() {
    const [content, setContent] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchContent = async () => {
            const { data } = await supabase.from('global_settings').select('homepage_content').maybeSingle();
            if (data?.homepage_content) {
                setContent(data.homepage_content);
            }
            setLoading(false);
        };
        fetchContent();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-950">
                <div className="animate-pulse text-slate-400">Loading...</div>
            </div>
        );
    }

    if (!content) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-950">
                <div className="text-slate-400">No homepage content generated yet. Super Admin should run setup.</div>
            </div>
        );
    }

    const { primary_color, accent_color } = content;

    return (
        <div className="min-h-screen bg-[#0f172a] text-slate-300 font-sans selection:bg-indigo-500/30">
            {/* Nav */}
            <nav className="border-b border-white/5 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
                <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="font-bold text-xl text-white flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: primary_color }}>
                            {content.company_name.charAt(0).toUpperCase()}
                        </div>
                        {content.company_name}
                    </div>
                    <div className="flex gap-4">
                        <Link href="/super-admin/login" className="text-sm text-slate-400 hover:text-white transition-colors py-2 px-3">
                            Super Admin
                        </Link>
                        {/* We don't have a single /login anymore. Users must use their specific /[slug]/login */}
                    </div>
                </div>
            </nav>

            {/* Hero */}
            <section className="py-24 px-6 relative overflow-hidden">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full blur-[120px] opacity-20 pointer-events-none" style={{ backgroundColor: primary_color }} />
                <div className="max-w-3xl mx-auto text-center relative z-10">
                    <div className="inline-block px-3 py-1 rounded-full border mb-6 text-sm font-semibold" style={{ color: primary_color, borderColor: `${primary_color}40`, backgroundColor: `${primary_color}15` }}>
                        {content.hero_tag}
                    </div>
                    <h1 className="text-5xl sm:text-6xl font-black text-white leading-[1.1] tracking-tight mb-6">
                        {content.hero_title}
                    </h1>
                    <p className="text-lg text-slate-400 mb-10 max-w-2xl mx-auto">
                        {content.hero_subtitle}
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <button className="px-8 py-4 rounded-xl text-white font-bold text-sm shadow-xl hover:scale-105 transition-all" style={{ background: `linear-gradient(135deg, ${primary_color}, ${accent_color})`, boxShadow: `0 10px 30px ${primary_color}40` }}>
                            {content.hero_cta_label}
                        </button>
                    </div>
                </div>
            </section>

            {/* Features */}
            <section className="py-24 px-6 bg-slate-900 border-y border-white/5">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold text-white mb-4">Everything You Need</h2>
                        <p className="text-slate-400 max-w-xl mx-auto">A complete toolkit for running your entire operation, wrapped in a beautiful interface.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {(content.features || []).map((f: any, i: number) => (
                            <div key={i} className="bg-[#0f172a] border border-white/5 p-8 rounded-3xl hover:border-white/10 transition-colors group">
                                <span className="text-4xl mb-6 block drop-shadow-xl group-hover:scale-110 transition-transform origin-bottom-left">{f.icon}</span>
                                <h3 className="text-lg font-bold text-white mb-2">{f.title}</h3>
                                <p className="text-sm text-slate-400 leading-relaxed">{f.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Pricing */}
            <section className="py-24 px-6">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold text-white mb-4">Simple, Transparent Pricing</h2>
                        <p className="text-slate-400 max-w-xl mx-auto">Choose the plan that fits your business. No hidden fees or surprises.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
                        {(content.pricing || []).map((p: any, i: number) => (
                            <div key={i} className={`rounded-3xl p-8 relative ${p.highlighted ? 'bg-slate-800 border-2 py-12' : 'bg-white/[0.02] border border-white/5'}`} style={{ borderColor: p.highlighted ? primary_color : undefined }}>
                                {p.highlighted && (
                                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full text-white text-xs font-bold" style={{ backgroundColor: primary_color }}>
                                        Most Popular
                                    </div>
                                )}
                                <h3 className="text-xl font-bold text-white mb-2">{p.name}</h3>
                                <div className="mb-6">
                                    <span className="text-4xl font-black text-white">{p.price}</span>
                                    <span className="text-slate-500 ml-2 text-sm">{p.period}</span>
                                </div>
                                <ul className="space-y-4 mb-8">
                                    {(p.features || []).map((feat: string, j: number) => (
                                        <li key={j} className="flex items-start gap-3 text-sm text-slate-300">
                                            <span className="text-emerald-400 mt-0.5">✓</span>
                                            {feat}
                                        </li>
                                    ))}
                                </ul>
                                <button className={`w-full py-3 rounded-xl font-semibold text-sm transition-all ${p.highlighted ? 'text-white' : 'bg-white/5 text-white hover:bg-white/10'}`} style={{ background: p.highlighted ? `linear-gradient(135deg, ${primary_color}, ${accent_color})` : undefined }}>
                                    {content.hero_cta_label}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Contact Footer */}
            <footer className="bg-slate-900 border-t border-white/5 pt-16 pb-8 px-6">
                <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 mb-12">
                    <div>
                        <div className="font-bold text-xl text-white flex items-center gap-2 mb-4">
                            <div className="h-8 w-8 rounded-lg flex items-center justify-center shadow-lg" style={{ backgroundColor: primary_color }}>
                                {content.company_name.charAt(0).toUpperCase()}
                            </div>
                            {content.company_name}
                        </div>
                        <p className="text-slate-400 mb-6 max-w-sm">{content.tagline}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-8">
                        <div>
                            <h4 className="text-white font-bold mb-4">Contact Us</h4>
                            <ul className="space-y-3 text-sm text-slate-400">
                                <li>📞 {content.contact_phone}</li>
                                <li>✉️ {content.contact_email}</li>
                                {content.contact_whatsapp && <li>💬 WhatsApp: {content.contact_whatsapp}</li>}
                            </ul>
                        </div>
                    </div>
                </div>
                <div className="max-w-6xl mx-auto text-center border-t border-white/5 pt-8 text-sm text-slate-500">
                    {content.footer_text}
                </div>
            </footer>
        </div>
    );
}
