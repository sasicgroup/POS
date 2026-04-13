'use client';

import { useState, useEffect } from 'react';
import { Megaphone, Plus, Trash2, CheckCircle2, AlertTriangle, Info, Monitor, Bell, Layout } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function BroadcastsPage() {
    const [broadcasts, setBroadcasts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    
    // Form state
    const [formData, setFormData] = useState({
        title: '',
        message: '',
        type: 'info',
        display_style: 'banner',
        ends_at: ''
    });

    useEffect(() => { loadBroadcasts(); }, []);

    async function loadBroadcasts() {
        const { data } = await supabase.from('broadcasts').select('*').order('created_at', { ascending: false });
        setBroadcasts(data || []);
        setLoading(false);
    }

    async function handleCreate() {
        const { error } = await supabase.from('broadcasts').insert({
            ...formData,
            starts_at: new Date().toISOString()
        });
        if (!error) {
            setIsCreating(false);
            setFormData({ title: '', message: '', type: 'info', display_style: 'banner', ends_at: '' });
            loadBroadcasts();
        }
    }

    async function toggleActive(id: string, active: boolean) {
        await supabase.from('broadcasts').update({ is_active: !active }).eq('id', id);
        loadBroadcasts();
    }

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white mb-1 whitespace-nowrap">Platform Broadcasts</h1>
                    <p className="text-sm text-slate-500">Communicate directly with all business owners.</p>
                </div>
                <button onClick={() => setIsCreating(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold transition-all shadow-lg shadow-indigo-500/20">
                    <Plus className="h-4 w-4" /> New Broadcast
                </button>
            </div>

            {isCreating && (
                <div className="bg-slate-900 border border-indigo-500/20 rounded-3xl p-8 animate-in zoom-in-95 duration-200">
                    <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                        <Megaphone className="h-5 w-5 text-indigo-400" /> Create Platform Announcement
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        <div className="md:col-span-2 space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Title / Headline</label>
                            <input 
                                type="text" 
                                className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                                placeholder="e.g. System Maintenance, New Feature Alert"
                                value={formData.title}
                                onChange={e => setFormData({...formData, title: e.target.value})}
                            />
                        </div>
                        <div className="md:col-span-2 space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Message Content</label>
                            <textarea 
                                className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none h-32"
                                placeholder="Describe the announcement detailedly..."
                                value={formData.message}
                                onChange={e => setFormData({...formData, message: e.target.value})}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Severity Type</label>
                            <select 
                                className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none"
                                value={formData.type}
                                onChange={e => setFormData({...formData, type: e.target.value})}
                            >
                                <option value="info">Information (Indigo)</option>
                                <option value="warning">Warning (Amber)</option>
                                <option value="critical">Critical (Red)</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Display Style</label>
                            <div className="grid grid-cols-2 gap-3">
                                <button 
                                    onClick={() => setFormData({...formData, display_style: 'banner'})}
                                    className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-bold transition-all ${formData.display_style === 'banner' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-950 border-white/10 text-slate-400 hover:text-white'}`}
                                >
                                    <Layout className="h-4 w-4" /> Top Banner
                                </button>
                                <button 
                                    onClick={() => setFormData({...formData, display_style: 'toast'})}
                                    className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-bold transition-all ${formData.display_style === 'toast' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-950 border-white/10 text-slate-400 hover:text-white'}`}
                                >
                                    <Bell className="h-4 w-4" /> Floating Toast
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3">
                        <button onClick={() => setIsCreating(false)} className="px-6 py-2.5 rounded-xl text-slate-400 hover:text-white transition-colors text-sm font-bold">Cancel</button>
                        <button onClick={handleCreate} className="px-8 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold transition-all">Publish Broadcast</button>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 gap-4">
                {broadcasts.map(b => (
                    <div key={b.id} className="bg-slate-900 border border-white/5 rounded-2xl p-6 flex items-center justify-between group">
                        <div className="flex items-center gap-4">
                            <div className={`h-12 w-12 rounded-2xl flex items-center justify-center shadow-lg
                                ${b.type === 'critical' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 
                                  b.type === 'warning' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 
                                  'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20'}`}>
                                {b.type === 'critical' ? <AlertTriangle className="h-5 w-5" /> : 
                                 b.display_style === 'banner' ? <Layout className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
                            </div>
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <h4 className="font-bold text-white">{b.title}</h4>
                                    <span className="px-1.5 py-0.5 rounded bg-white/5 text-[10px] text-slate-500 font-bold uppercase">{b.display_style}</span>
                                </div>
                                <p className="text-sm text-slate-500 max-w-xl line-clamp-1">{b.message}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="text-right mr-4">
                                <div className="text-xs font-bold text-slate-400">{new Date(b.created_at).toLocaleDateString()}</div>
                                <div className="text-[10px] text-slate-600 uppercase tracking-tighter">Created At</div>
                            </div>
                            <button 
                                onClick={() => toggleActive(b.id, b.is_active)}
                                className={`px-4 py-1.5 rounded-full text-[10px] font-bold transition-all ${b.is_active ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-500 border border-white/5'}`}
                            >
                                {b.is_active ? 'ACTIVE' : 'INACTIVE'}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
