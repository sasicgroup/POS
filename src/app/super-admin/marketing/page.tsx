'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/lib/toast-context';
import { 
    Send, Megaphone, MessageCircle, Mail, Users, 
    Filter, Zap, History, CheckCircle, AlertTriangle 
} from 'lucide-react';

export default function MarketingCampaignsPage() {
    const { showToast } = useToast();
    const [campaigns, setCampaigns] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);

    const [form, setForm] = useState({
        title: '',
        message: '',
        channel: 'broadcast' as 'broadcast' | 'sms' | 'email',
        target_plan: 'all'
    });

    useEffect(() => {
        loadCampaigns();
    }, []);

    const loadCampaigns = async () => {
        const { data } = await supabase
            .from('marketing_campaigns')
            .select('*')
            .order('created_at', { ascending: false });
        setCampaigns(data || []);
        setLoading(false);
    };

    const handleSend = async () => {
        if (!form.title || !form.message) return;
        setSending(true);
        
        try {
            // 1. Log the campaign
            const { data: campaign, error: cError } = await supabase
                .from('marketing_campaigns')
                .insert({
                    title: form.title,
                    message: form.message,
                    channel: form.channel,
                    target_criteria: { plan: form.target_plan }
                }).select().single();

            if (cError) throw cError;

            // 2. If channel is 'broadcast', also create a platform broadcast
            if (form.channel === 'broadcast') {
                await supabase.from('broadcasts').insert({
                    title: form.title,
                    message: form.message,
                    type: 'info',
                    display_style: 'toast',
                    target_plan: form.target_plan === 'all' ? null : form.target_plan
                });
            }

            // 3. Simulated SMS/Email logic (in real SaaS would trigger background worker)
            showToast(`Campaign "${form.title}" initiated successfully via ${form.channel}`);
            setForm({ title: '', message: '', channel: 'broadcast', target_plan: 'all' });
            loadCampaigns();
        } catch (e: any) {
            showToast(e.message, 'error');
        } finally {
            setSending(false);
        }
    };

    if (loading) return <div className="animate-pulse text-slate-500 py-32 text-center text-xs font-black uppercase tracking-widest">Warming up marketing engine...</div>;

    return (
        <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in duration-700">
            <div>
                <h1 className="text-2xl font-black text-white">Marketing & Global Outreach</h1>
                <p className="text-sm text-slate-500">Communicate directly with tenant owners across various channels.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Compose Form */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-slate-900 border border-white/5 rounded-3xl p-8 shadow-2xl">
                        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                            <Zap className="text-amber-400 h-5 w-5" /> New Campaign
                        </h3>
                        
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-black text-slate-500 uppercase mb-2">Channel</label>
                                    <div className="flex gap-2">
                                        {[
                                            { id: 'broadcast', icon: Megaphone, color: 'text-indigo-400' },
                                            { id: 'sms', icon: MessageCircle, color: 'text-emerald-400' },
                                            { id: 'email', icon: Mail, color: 'text-amber-400' },
                                        ].map(c => (
                                            <button 
                                                key={c.id}
                                                onClick={() => setForm({...form, channel: c.id as any})}
                                                className={`flex-1 flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all ${form.channel === c.id ? 'bg-white/10 border-indigo-500/50' : 'bg-white/5 border-transparent hover:bg-white/[0.08]'}`}
                                            >
                                                <c.icon className={`h-5 w-5 ${c.color}`} />
                                                <span className="text-[10px] font-black uppercase tracking-tighter text-slate-300">{c.id}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-slate-500 uppercase mb-2">Target Segments</label>
                                    <select 
                                        value={form.target_plan}
                                        onChange={e => setForm({...form, target_plan: e.target.value})}
                                        className="w-full bg-slate-950 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                                    >
                                        <option value="all">All Tenants</option>
                                        <option value="starter">Starter Only</option>
                                        <option value="pro">Pro Only</option>
                                        <option value="enterprise">Enterprise Only</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-black text-slate-500 uppercase mb-2">Subject / Headline</label>
                                <input 
                                    type="text" 
                                    className="w-full bg-slate-950 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                                    placeholder="e.g. Scheduled System Maintenance"
                                    value={form.title}
                                    onChange={e => setForm({...form, title: e.target.value})}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-black text-slate-500 uppercase mb-2">Message Content</label>
                                <textarea 
                                    rows={5}
                                    className="w-full bg-slate-950 border border-white/10 rounded-2xl px-4 py-4 text-sm text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all resize-none"
                                    placeholder="Write your campaign message here..."
                                    value={form.message}
                                    onChange={e => setForm({...form, message: e.target.value})}
                                />
                                <p className="text-[10px] text-slate-500 mt-2">
                                    {form.channel === 'sms' && `${form.message.length} chars (approx ${Math.ceil(form.message.length / 160)} segments)`}
                                </p>
                            </div>

                            <button 
                                onClick={handleSend}
                                disabled={sending || !form.title || !form.message}
                                className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all shadow-xl shadow-indigo-500/20 disabled:opacity-50"
                            >
                                <Send className="h-4 w-4" /> {sending ? 'Transmitting...' : 'Dispatch Campaign'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Sidebar Stats & Tips */}
                <div className="space-y-6">
                    <div className="bg-slate-900 border border-white/5 rounded-3xl p-6">
                        <h4 className="text-xs font-black text-slate-500 uppercase mb-4 flex items-center gap-2"><History size={14}/> Campaign History</h4>
                        <div className="space-y-3">
                            {campaigns.slice(0, 5).map(c => (
                                <div key={c.id} className="p-3 rounded-2xl bg-white/5 border border-white/5">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-[10px] font-black uppercase text-indigo-400">{c.channel}</span>
                                        <span className="text-[9px] text-slate-500 font-mono">{new Date(c.created_at).toLocaleDateString()}</span>
                                    </div>
                                    <div className="text-xs font-bold text-white truncate">{c.title}</div>
                                </div>
                            ))}
                            {campaigns.length === 0 && <p className="text-xs text-slate-600 italic">No previous outreaches.</p>}
                        </div>
                    </div>

                    <div className="bg-amber-500/5 border border-amber-500/10 rounded-3xl p-6">
                        <h4 className="text-xs font-black text-amber-500 uppercase mb-3 flex items-center gap-2"><AlertTriangle size={14}/> Usage Warning</h4>
                        <p className="text-[10px] text-slate-400 leading-relaxed">
                            Mass SMS campaigns deduct credits from the **Platform Global Account**. Use sparingly to avoid excessive overhead. Broadcasts are free and recommended for non-critical updates.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
