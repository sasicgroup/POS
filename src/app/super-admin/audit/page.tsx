'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
    Activity, Shield, User, Globe, Search, 
    Calendar, Filter, FileText, Lock, Eye
} from 'lucide-react';

export default function AuditLogsPage() {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const res = await fetch('/api/super-admin/audit', { credentials: 'include' });
                if (res.ok) {
                    const data = await res.json();
                    setLogs(data.logs || []);
                }
            } catch (e) {
                console.error('Failed to load audit trail');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    if (loading) return <div className="animate-pulse text-slate-500 py-32 text-center text-xs font-black tracking-widest uppercase">Deciphering Platform Audit Trail...</div>;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div>
                <h1 className="text-2xl font-black text-white">Security & Integrity Audit</h1>
                <p className="text-sm text-slate-500">Immutable trail of every administrative action taken across the ecosystem.</p>
            </div>

            <div className="bg-slate-900/50 border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead>
                            <tr className="bg-white/5 text-[10px] uppercase font-black tracking-widest text-slate-500 border-b border-white/5">
                                <th className="px-6 py-4">Timestamp</th>
                                <th className="px-6 py-4">Administrator</th>
                                <th className="px-6 py-4">Action</th>
                                <th className="px-6 py-4">Target Business</th>
                                <th className="px-6 py-4">Metadata</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.02]">
                            {logs.map(log => (
                                <tr key={log.id} className="hover:bg-indigo-500/[0.02] transition-colors group">
                                    <td className="px-6 py-5 text-slate-400 font-mono text-xs">
                                        {new Date(log.created_at).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-2">
                                            <div className="h-7 w-7 rounded-lg bg-indigo-600/20 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                                                <Shield size={14}/>
                                            </div>
                                            <div>
                                                <div className="text-white font-bold">{log.super_admins?.name}</div>
                                                <div className="text-[10px] text-slate-500">{log.super_admins?.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <span className={`px-2 py-1 rounded bg-white/5 border border-white/10 text-[10px] font-black tracking-tighter uppercase ${
                                            log.action.includes('VIEW_AS') ? 'text-amber-400 border-amber-500/20' : 
                                            log.action.includes('RENEW') ? 'text-emerald-400 border-emerald-500/20' : 'text-slate-300'
                                        }`}>
                                            {log.action.replace(/_/g, ' ')}
                                        </span>
                                    </td>
                                    <td className="px-6 py-5">
                                        {log.businesses?.name ? (
                                            <div className="flex items-center gap-2 text-slate-300">
                                                <Globe size={12} className="text-slate-500"/>
                                                {log.businesses.name}
                                            </div>
                                        ) : <span className="text-slate-600">—</span>}
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="max-w-[150px] truncate text-[10px] text-slate-500 italic bg-white/5 px-2 py-1 rounded border border-white/5 font-mono group-hover:max-w-none transition-all">
                                            {JSON.stringify(log.details)}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
