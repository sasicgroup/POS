'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, ShieldCheck, Zap, BarChart3, ChevronRight, Globe, Layers, Sparkles } from 'lucide-react';

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
            <div className="min-h-screen flex items-center justify-center bg-[#09090b]">
                <div className="relative">
                    <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
                    <div className="absolute inset-0 bg-indigo-500/20 blur-xl rounded-full animate-pulse"></div>
                </div>
            </div>
        );
    }

    const safeContent = content || {};
    const primaryColor = safeContent.primary_color || '#6366f1';
    const accentColor = safeContent.accent_color || '#a855f7';
    const companyName = safeContent.company_name || 'Nova OS';
    const heroTag = safeContent.hero_tag || '🚀 The Next Generation Retail Engine';
    const heroTitle = safeContent.hero_title || 'Manage Your Entire Business in One Beautiful Place';
    const heroSubtitle = safeContent.hero_subtitle || 'A complete, enterprise-grade operating system for modern retail and services. Stop juggling apps and start scaling.';
    const heroCta = safeContent.hero_cta_label || 'Start Your Journey';
    
    // Rich fallback features to ensure it always looks amazing
    const features = safeContent.features && safeContent.features.length > 0 ? safeContent.features : [
        { icon: '⚡', title: 'Lightning Fast POS', description: 'Process transactions in milliseconds with our ultra-optimized, offline-capable point of sale system.' },
        { icon: '📊', title: 'Deep Analytics', description: 'Understand your growth trajectory with beautiful, real-time revenue dashboards and intelligent alerts.' },
        { icon: '🛡️', title: 'Enterprise Security', description: 'Your data is military-grade encrypted, totally isolated per tenant, and continuously backed up.' },
        { icon: '📱', title: 'Omnichannel Ready', description: 'Manage inventory and sales seamlessly across web, tablet, and mobile devices natively.' },
        { icon: '💬', title: 'Smart CRM', description: 'Build lasting relationships with automated SMS reminders for installments and loyalty rewards.' },
        { icon: '🧩', title: 'Ecosystem Integrations', description: 'Connects directly with mobile money, banking gateways, and accounting ledgers flawlessly.' },
    ];
    
    const pricing = safeContent.pricing && safeContent.pricing.length > 0 ? safeContent.pricing : [
        { name: 'Starter', price: 'Free', period: '/forever', features: ['1 Retail Location', 'Basic POS Checkout', 'Up to 500 Inventory Items', 'Community Support'], highlighted: false },
        { name: 'Professional', price: 'GHS 150', period: '/month', features: ['Unlimited Locations', 'Advanced Analytics Suite', 'SMS Payment Reminders', 'Role-Based Access Control', '24/7 Priority Support'], highlighted: true },
        { name: 'Enterprise', price: 'Custom', period: '', features: ['Custom Domain Mapping', 'White-labeled Interface', 'Dedicated Database', 'SLA Guarantee', 'Personal Account Manager'], highlighted: false }
    ];

    return (
        <div className="min-h-screen bg-[#09090b] text-slate-300 font-sans selection:bg-indigo-500/30 overflow-hidden relative pb-20">
            {/* Massive Glowing Ambient Background Shapes */}
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full blur-[150px] opacity-20 pointer-events-none mix-blend-screen animate-pulse" style={{ background: primaryColor }}></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full blur-[150px] opacity-20 pointer-events-none mix-blend-screen" style={{ background: accentColor, animationDelay: '2s' }}></div>

            {/* Dynamic Glass Navbar */}
            <nav className="fixed w-full top-0 z-50 transition-all duration-300 bg-[#09090b]/40 backdrop-blur-xl border-b border-white/5">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="font-black text-2xl text-white flex items-center gap-3 tracking-tight">
                        <div className="h-10 w-10 rounded-xl flex items-center justify-center text-white shadow-lg overflow-hidden relative group">
                            <div className="absolute inset-0 opacity-80 group-hover:scale-125 transition-transform duration-500" style={{ background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})` }}></div>
                            <span className="relative z-10">{companyName.charAt(0).toUpperCase()}</span>
                        </div>
                        {companyName}
                    </div>
                    <div className="flex items-center gap-6">
                        <Link href="/super-admin/login" className="hidden sm:flex text-sm font-semibold text-slate-400 hover:text-white transition-colors items-center gap-2">
                            <ShieldCheck className="w-4 h-4" /> Admin Access
                        </Link>
                        <button className="px-6 py-2.5 rounded-full text-white font-bold text-sm shadow-xl hover:scale-105 hover:shadow-indigo-500/25 transition-all relative overflow-hidden group">
                            <div className="absolute inset-0 transition-transform duration-300 group-hover:scale-110" style={{ background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})` }}></div>
                            <span className="relative z-10 flex items-center gap-2">Get Started <ArrowRight className="w-4 h-4" /></span>
                        </button>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative pt-40 pb-20 px-6 sm:pt-48 sm:pb-32 lg:pb-40 z-10">
                <div className="max-w-5xl mx-auto text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border mb-8 text-sm font-bold text-white shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-4 duration-700" 
                         style={{ borderColor: `${primaryColor}40`, backgroundColor: `${primaryColor}15` }}>
                        <Sparkles className="w-4 h-4" style={{ color: accentColor }} />
                        {heroTag}
                    </div>
                    
                    <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white via-slate-200 to-slate-500 leading-[1.1] tracking-tighter mb-8 animate-in slide-in-from-bottom-6 duration-700 delay-100">
                        {heroTitle}
                    </h1>
                    
                    <p className="text-lg sm:text-xl text-slate-400 mb-12 max-w-2xl mx-auto leading-relaxed animate-in slide-in-from-bottom-8 duration-700 delay-200">
                        {heroSubtitle}
                    </p>
                    
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-5 animate-in slide-in-from-bottom-10 duration-700 delay-300">
                        <button className="w-full sm:w-auto px-8 py-4 rounded-2xl text-white font-black text-lg shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all relative overflow-hidden group flex items-center justify-center gap-3"
                                style={{ boxShadow: `0 20px 40px -10px ${primaryColor}50` }}>
                            <div className="absolute inset-0 transition-transform duration-500 group-hover:scale-110" style={{ background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})` }}></div>
                            <span className="relative z-10 flex items-center gap-2">{heroCta} <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></span>
                        </button>
                        <button className="w-full sm:w-auto px-8 py-4 rounded-2xl text-white font-bold text-lg bg-white/5 border border-white/10 hover:bg-white/10 backdrop-blur-md transition-all flex items-center justify-center gap-2">
                             View Demo <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Dashboard Preview Mockup */}
                    <div className="mt-24 relative max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-500">
                        <div className="absolute inset-0 rounded-3xl bg-gradient-to-b from-white/10 to-transparent p-[10px] -m-[10px] opacity-50 blur-lg pointer-events-none"></div>
                        <div className="rounded-[2.5rem] border border-white/10 bg-[#09090b]/80 backdrop-blur-3xl shadow-2xl p-2 relative overflow-hidden ring-1 ring-white/5">
                            <div className="absolute top-0 inset-x-0 h-px w-full" style={{ background: `linear-gradient(90deg, transparent, ${primaryColor}, transparent)` }}></div>
                            <div className="bg-[#18181b] rounded-[2rem] border border-white/5 overflow-hidden aspect-[16/9] sm:aspect-[21/9] flex flex-col">
                                {/* Mock Window Header */}
                                <div className="h-12 bg-white/5 border-b border-white/5 flex items-center px-6 gap-2">
                                    <div className="w-3 h-3 rounded-full bg-rose-500/80"></div>
                                    <div className="w-3 h-3 rounded-full bg-amber-500/80"></div>
                                    <div className="w-3 h-3 rounded-full bg-emerald-500/80"></div>
                                </div>
                                {/* Mock Window Body */}
                                <div className="flex-1 p-6 sm:p-10 flex flex-col gap-6 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-opacity-5">
                                    <div className="flex justify-between items-center">
                                        <div className="w-1/3 h-8 bg-white/5 rounded-lg animate-pulse"></div>
                                        <div className="w-12 h-12 bg-white/5 rounded-full animate-pulse"></div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-6">
                                        <div className="h-24 bg-white/5 rounded-2xl border border-white/5 animate-pulse"></div>
                                        <div className="h-24 bg-white/5 rounded-2xl border border-white/5 animate-pulse"></div>
                                        <div className="h-24 bg-white/5 rounded-2xl border border-white/5 animate-pulse delay-75"></div>
                                    </div>
                                    <div className="flex-1 bg-white/5 rounded-2xl border border-white/5 animate-pulse delay-100"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Bento Grid Features */}
            <section className="py-24 px-6 relative z-10">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-20">
                        <h2 className="text-4xl sm:text-5xl font-black text-white mb-6 tracking-tight">Built for Performance</h2>
                        <p className="text-lg text-slate-400 max-w-2xl mx-auto">A seamless orchestration of tools designed to make your daily operations incredibly fluid and visually stunning.</p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {features.map((f: any, i: number) => (
                            <div key={i} className="group relative bg-white/[0.02] border border-white/5 p-8 rounded-3xl hover:bg-white/[0.04] transition-all duration-500 overflow-hidden hover:-translate-y-1">
                                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                <div className="h-16 w-16 rounded-2xl bg-white/5 flex items-center justify-center text-3xl mb-6 shadow-inner ring-1 ring-white/10 group-hover:scale-110 transition-transform duration-500 group-hover:rotate-6">
                                    {f.icon}
                                </div>
                                <h3 className="text-xl font-bold text-white mb-3 tracking-wide">{f.title}</h3>
                                <p className="text-slate-400 leading-relaxed font-medium">{f.description}</p>
                                
                                {/* Hover Glow Line */}
                                <div className="absolute bottom-0 inset-x-0 h-1 scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" style={{ background: `linear-gradient(90deg, ${primaryColor}, transparent)` }}></div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Premium Pricing Cards */}
            <section className="py-24 px-6 relative z-10">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-20">
                        <h2 className="text-4xl sm:text-5xl font-black text-white mb-6 tracking-tight">Transparent Pricing</h2>
                        <p className="text-lg text-slate-400 max-w-2xl mx-auto">Zero hidden fees. Unrestricted growth. Choose the plan that aligns with your scale.</p>
                    </div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center max-w-6xl mx-auto">
                        {pricing.map((p: any, i: number) => (
                            <div key={i} className={`relative rounded-[2.5rem] p-10 transition-all duration-500 hover:-translate-y-2 ${p.highlighted ? 'bg-[#18181b] border-white/10 shadow-2xl py-14 ring-1 ring-white/10 z-10' : 'bg-white/[0.02] border-white/5 border hover:bg-white/[0.04]'}`}>
                                {p.highlighted && (
                                    <>
                                        <div className="absolute -inset-px rounded-[2.5rem] p-px opacity-50" style={{ background: `linear-gradient(180deg, ${primaryColor}, transparent, transparent)` }}></div>
                                        <div className="absolute -top-5 left-1/2 -translate-x-1/2 px-6 py-2 rounded-full text-white text-xs font-black tracking-widest uppercase shadow-xl" style={{ background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})` }}>
                                            Most Popular
                                        </div>
                                    </>
                                )}
                                
                                <h3 className="text-2xl font-bold text-white mb-4">{p.name}</h3>
                                <div className="mb-8 flex items-end gap-2">
                                    <span className="text-5xl font-black text-white tracking-tighter">{p.price}</span>
                                    <span className="text-slate-500 font-medium mb-1">{p.period}</span>
                                </div>
                                
                                <ul className="space-y-5 mb-10">
                                    {(p.features || []).map((feat: string, j: number) => (
                                        <li key={j} className="flex items-start gap-3 text-slate-300 font-medium">
                                            <div className="mt-0.5 rounded-full p-1 bg-white/5 text-emerald-400">
                                                <CheckCircle2 className="w-4 h-4" />
                                            </div>
                                            {feat}
                                        </li>
                                    ))}
                                </ul>
                                
                                <button className={`w-full py-4 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 group ${p.highlighted ? 'text-white shadow-xl hover:scale-105' : 'bg-white/5 text-white hover:bg-white/10 border border-white/5'}`} 
                                        style={p.highlighted ? { background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})`, boxShadow: `0 10px 30px -10px ${primaryColor}80` } : {}}>
                                    {heroCta} {p.highlighted && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-[#09090b] border-t border-white/5 pt-20 px-6 relative z-10 mt-20">
                <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-12 lg:gap-8 mb-16">
                    <div className="md:col-span-5">
                        <div className="font-black text-2xl text-white flex items-center gap-3 mb-6">
                            <div className="h-10 w-10 rounded-xl flex items-center justify-center shadow-lg text-white" style={{ background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})` }}>
                                {companyName.charAt(0).toUpperCase()}
                            </div>
                            {companyName}
                        </div>
                        <p className="text-slate-400 mb-8 max-w-sm text-lg leading-relaxed">{safeContent.tagline || 'Elevating the future of modern commerce.'}</p>
                        <div className="flex gap-4">
                            {[1,2,3].map((_, i) => (
                                <div key={i} className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 transition-colors flex items-center justify-center cursor-pointer border border-white/5 text-slate-400 hover:text-white">
                                    <Globe className="w-4 h-4" />
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    <div className="md:col-span-3">
                        <h4 className="text-white font-bold mb-6 text-lg">Contact & Connect</h4>
                        <ul className="space-y-4 font-medium text-slate-400">
                            <li className="flex items-center gap-3 hover:text-white transition-colors cursor-pointer"><div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-slate-300">📞</div> {safeContent.contact_phone || '+233 00 000 0000'}</li>
                            <li className="flex items-center gap-3 hover:text-white transition-colors cursor-pointer"><div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-slate-300">✉️</div> {safeContent.contact_email || 'hello@company.com'}</li>
                            {safeContent.contact_whatsapp && <li className="flex items-center gap-3 hover:text-white transition-colors cursor-pointer"><div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-slate-300">💬</div> {safeContent.contact_whatsapp}</li>}
                        </ul>
                    </div>
                    
                    <div className="md:col-span-4">
                        <h4 className="text-white font-bold mb-6 text-lg">Stay Updated</h4>
                        <p className="text-slate-400 mb-4 font-medium">Join our newsletter for the latest product updates and ecosystem news.</p>
                        <div className="flex gap-2">
                            <input type="email" placeholder="Your email address" className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 flex-1 text-white outline-none focus:border-white/30 focus:bg-white/10 transition-all" />
                            <button className="px-6 rounded-xl font-bold text-white transition-all hover:opacity-90" style={{ background: primaryColor }}>Subscribe</button>
                        </div>
                    </div>
                </div>
                
                <div className="max-w-7xl mx-auto border-t border-white/5 py-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm font-medium text-slate-500">
                    <p>{safeContent.footer_text || `© ${new Date().getFullYear()} ${companyName}. All rights reserved.`}</p>
                    <div className="flex gap-6">
                        <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
                        <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
                        <a href="#" className="hover:text-white transition-colors">System Status</a>
                    </div>
                </div>
            </footer>
        </div>
    );
}
