'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Megaphone, X, Info, AlertTriangle, Bell } from 'lucide-react';

interface Broadcast {
    id: string;
    title: string;
    message: string;
    type: 'info' | 'warning' | 'critical';
    display_style: 'banner' | 'toast';
}

export default function BroadcastManager() {
    const { businessId } = useAuth();
    const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
    const [dismissed, setDismissed] = useState<string[]>([]);

    useEffect(() => {
        const fetchBroadcasts = async () => {
            try {
                const res = await fetch(`/api/broadcasts?business_id=${businessId}`);
                if (res.ok) {
                    const data = await res.json();
                    setBroadcasts(data.broadcasts);
                }
            } catch (err) {
                console.error('Failed to fetch broadcasts', err);
            }
        };

        fetchBroadcasts();
        // Poll every 5 minutes
        const interval = setInterval(fetchBroadcasts, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, [businessId]);

    const activeBroadcasts = broadcasts.filter(b => !dismissed.includes(b.id));

    if (activeBroadcasts.length === 0) return null;

    const banners = activeBroadcasts.filter(b => b.display_style === 'banner');
    const toasts = activeBroadcasts.filter(b => b.display_style === 'toast');

    return (
        <>
            {/* Top Banners */}
            <div className="fixed top-0 left-0 right-0 z-[100] space-y-px pointer-events-none">
                {banners.map(b => (
                    <div key={b.id} className={`pointer-events-auto flex items-center justify-between px-6 py-3 border-b border-white/10 backdrop-blur-md transition-all animate-in slide-in-from-top duration-500
                        ${b.type === 'critical' ? 'bg-red-600/90 text-white' : 
                          b.type === 'warning' ? 'bg-amber-500/90 text-white' : 
                          'bg-indigo-600/90 text-white'}`}>
                        <div className="flex items-center gap-3">
                            {b.type === 'critical' ? <AlertTriangle className="h-4 w-4" /> : <Megaphone className="h-4 w-4" />}
                            <div className="text-sm font-medium">
                                <span className="font-bold mr-2 uppercase text-[10px] opacity-80">{b.title}:</span>
                                {b.message}
                            </div>
                        </div>
                        <button onClick={() => setDismissed(prev => [...prev, b.id])} className="p-1 hover:bg-black/10 rounded-full transition-colors">
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                ))}
            </div>

            {/* Bottom Toasts */}
            <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none w-full max-w-sm">
                {toasts.map(b => (
                    <div key={b.id} className={`pointer-events-auto p-4 rounded-2xl shadow-2xl border border-white/10 backdrop-blur-xl animate-in slide-in-from-right duration-500
                        ${b.type === 'critical' ? 'bg-red-950/90 border-red-500/50' : 
                          b.type === 'warning' ? 'bg-amber-950/90 border-amber-500/50' : 
                          'bg-slate-900/90 border-indigo-500/50'}`}>
                        <div className="flex gap-4">
                            <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0
                                ${b.type === 'critical' ? 'bg-red-500/20 text-red-400' : 
                                  b.type === 'warning' ? 'bg-amber-500/20 text-amber-400' : 
                                  'bg-indigo-500/20 text-indigo-400'}`}>
                                <Bell className="h-5 w-5" />
                            </div>
                            <div className="flex-1 pt-0.5">
                                <h4 className="text-sm font-bold text-white mb-1">{b.title}</h4>
                                <p className="text-xs text-slate-300 leading-relaxed">{b.message}</p>
                            </div>
                            <button onClick={() => setDismissed(prev => [...prev, b.id])} className="text-slate-500 hover:text-white shrink-0">
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </>
    );
}
