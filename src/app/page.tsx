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
    const companyName = safeContent.company_name || 'SASIC POS';
    const heroTag = safeContent.hero_tag || '🚀 The Next Generation Retail Engine';
    const heroTitle = safeContent.hero_title || 'Manage Your Entire Business in One Beautiful Place';
    const heroSubtitle = safeContent.hero_subtitle || 'A complete, enterprise-grade operating system for modern retail and services. Stop juggling apps and start scaling.';
    const heroCta = safeContent.hero_cta_label || 'Start Your Journey';
    const whatsappLink = safeContent.whatsapp_link || 'https://wa.me/233000000000';
    
    // Rich fallback features to ensure it always looks amazing
    const features = safeContent.features && safeContent.features.length > 0 ? safeContent.features : [
        { icon: '⚡', title: 'Lightning Fast POS', description: 'Process transactions in milliseconds with our ultra-optimized, offline-capable point of sale system.' },
        { icon: '📊', title: 'Deep Analytics', description: 'Understand your growth trajectory with beautiful, real-time revenue dashboards and intelligent alerts.' },
        { icon: '🛡️', title: 'Enterprise Security', description: 'Your data is military-grade encrypted, totally isolated per tenant, and continuously backed up.' },
        { icon: '📱', title: 'Omnichannel Ready', description: 'Manage inventory and sales seamlessly across web, tablet, and mobile devices natively.' },
        { icon: '💬', title: 'Smart CRM', description: 'Build lasting relationships with automated SMS reminders for installments and loyalty rewards.' },
        { icon: '🧩', title: 'Ecosystem Integrations', description: 'Connects directly with mobile money, banking gateways, and accounting ledgers flawlessly.' },
    ];
    
    // Pricing removed

    return (
        <div className="min-h-screen bg-[#09090b] text-slate-300 font-sans selection:bg-indigo-500/30 overflow-hidden relative pb-20">
            {/* Massive Glowing Ambient Background Shapes */}
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full blur-[150px] opacity-20 pointer-events-none mix-blend-screen animate-pulse" style={{ background: primaryColor }}></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full blur-[150px] opacity-20 pointer-events-none mix-blend-screen" style={{ background: accentColor, animationDelay: '2s' }}></div>

            {/* Dynamic Glass Navbar */}
            <div className="flex justify-center mt-12">
                <a
                    href={whatsappLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative inline-flex items-center px-8 py-4 text-lg font-black rounded-2xl shadow-xl transition-all hover:scale-105"
                    style={{ boxShadow: `0 20px 40px -10px ${primaryColor}50`, background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})`, color: '#fff' }}
                >
                    <span className="relative z-10 flex items-center gap-2">{heroCta} <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></span>
                </a>
            </div>

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

            {/* Pricing section removed */}

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
