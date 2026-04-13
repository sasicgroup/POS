'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
    MessageSquare, AlertCircle, CheckCircle2, Search, Filter, 
    ArrowUpRight, Clock, User, Phone, Mail
} from 'lucide-react';

export default function SupportHubPage() {
    const [tickets, setTickets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('all');

    useEffect(() => {
        const load = async () => {
            try {
                const res = await fetch('/api/super-admin/support', { credentials: 'include' });
                if (res.ok) {
                    const data = await res.json();
                    setTickets(data.tickets || []);
                }
            } catch (e) {
                console.error('Support uplink failed');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const solveTicket = async (id: string) => {
        const { error } = await supabase
            .from('support_tickets')
            .update({ status: 'resolved' })
            .eq('id', id);
        
        if (!error) {
            setTickets(prev => prev.map(t => t.id === id ? { ...t, status: 'resolved' } : t));
        }
    };

    if (loading) return <div className="animate-pulse text-slate-500 py-32 text-center text-sm font-bold uppercase">Establishing Support Uplink...</div>;

    const filtered = filterStatus === 'all' ? tickets : tickets.filter(t => t.status === filterStatus);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-white">Support Command Center</h1>
                    <p className="text-sm text-slate-500">Manage business inquiries and platform technical issues.</p>
                </div>
                <div className="flex items-center gap-2 bg-slate-900 border border-white/5 rounded-xl p-1">
                    {['all', 'open', 'resolved'].map(s => (
                        <button 
                            key={s} 
                            onClick={() => setFilterStatus(s)}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all capitalize ${filterStatus === s ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                        >
                            {s}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {filtered.map(ticket => (
                    <div key={ticket.id} className={`bg-slate-900/50 border ${ticket.status === 'open' ? 'border-indigo-500/20 shadow-lg shadow-indigo-500/5' : 'border-white/5'} rounded-2xl p-6 hover:border-indigo-500/30 transition-all`}>
                        <div className="flex flex-col lg:flex-row gap-6">
                            <div className="flex-1 space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${ticket.status === 'open' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                                        {ticket.status}
                                    </div>
                                    <div className="text-xs text-slate-500 flex items-center gap-1">
                                        <Clock size={12}/> {new Date(ticket.created_at).toLocaleString()}
                                    </div>
                                </div>
                                <h3 className="text-lg font-bold text-white">{ticket.subject}</h3>
                                <p className="text-sm text-slate-400 leading-relaxed max-w-2xl">{ticket.message}</p>
                                
                                <div className="flex flex-wrap items-center gap-4 pt-2">
                                    <div className="flex items-center gap-1.5 text-xs text-indigo-400 bg-indigo-500/5 px-2.5 py-1 rounded-lg">
                                        <Mail size={12}/> {ticket.contact_email}
                                    </div>
                                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                        <User size={12}/> {ticket.businesses?.name || 'Unknown Business'}
                                    </div>
                                </div>
                            </div>

                            <div className="lg:w-48 flex flex-col justify-between border-l border-white/5 lg:pl-6 pt-4 lg:pt-0">
                                <div className="space-y-1">
                                    <div className="text-[10px] text-slate-500 uppercase font-black">Ref ID</div>
                                    <div className="text-xs text-slate-300 font-mono break-all">{ticket.id.slice(0, 8)}</div>
                                </div>
                                {ticket.status === 'open' && (
                                    <button 
                                        onClick={() => solveTicket(ticket.id)}
                                        className="mt-4 w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all flex items-center justify-center gap-2"
                                    >
                                        <CheckCircle2 size={14}/> Resolve Ticket
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                ))}

                {filtered.length === 0 && (
                    <div className="py-32 text-center text-slate-600 border-2 border-dashed border-white/5 rounded-3xl">
                        <MessageSquare className="mx-auto h-12 w-12 opacity-10 mb-4" />
                        <p className="text-sm italic">Clean air. No pending support signals found.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
