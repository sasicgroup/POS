'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
    Building2, Store, Users, DollarSign, Activity, 
    ChevronRight, ArrowUpRight, TrendingUp, Globe
} from 'lucide-react';
import Link from 'next/link';

export default function PerformanceMapPage() {
    const [map, setMap] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const res = await fetch('/api/super-admin/performance', { credentials: 'include' });
                if (res.ok) {
                    const data = await res.json();
                    setMap(data.performance || []);
                }
            } catch (e) {
                console.error('Failed to map infrastructure');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    if (loading) return <div className="animate-pulse text-slate-500 py-32 text-center text-sm font-bold uppercase tracking-widest">Mapping Platform Infrastructure...</div>;

    return (
        <div className="space-y-10 animate-in fade-in zoom-in-95 duration-700">
            <div>
                <h1 className="text-2xl font-black text-white mb-1">Infrastructure Performance Map</h1>
                <p className="text-sm text-slate-500">Global hierarchy of businesses, branches, and their financial health.</p>
            </div>

            <div className="grid grid-cols-1 gap-12">
                {map.map(biz => (
                    <div key={biz.id} className="relative">
                        <div className="flex items-center gap-6 mb-8 group">
                            <div className="h-16 w-16 rounded-3xl bg-indigo-600/10 border-2 border-indigo-500/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-500 shadow-2xl shadow-indigo-500/10">
                                <Building2 className="h-8 w-8 text-indigo-400" />
                            </div>
                            <div className="flex-1">
                                <Link href={`/super-admin/businesses/${biz.id}`} className="block group/link">
                                    <h2 className="text-2xl font-black text-white flex items-center gap-2 group-hover/link:text-indigo-400 transition-colors">
                                        {biz.name}
                                        <ArrowUpRight className="h-5 w-5 opacity-0 group-hover/link:opacity-100 transition-all -translate-y-1" />
                                    </h2>
                                </Link>
                                <div className="flex items-center gap-4 text-xs text-slate-500 mt-1 uppercase font-bold tracking-tighter">
                                    <span className="flex items-center gap-1.5"><Globe className="h-3 w-3" /> /{biz.slug}</span>
                                    <span>·</span>
                                    <span className="px-2 py-0.5 rounded bg-white/5 text-slate-400">{biz.plan} Plan</span>
                                    <span>·</span>
                                    <span className="text-emerald-400 flex items-center gap-1"><TrendingUp className="h-3 w-3" /> Total Yield: GHS {biz.total_revenue.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>

                        <div className="absolute left-8 top-16 bottom-16 w-1 bg-gradient-to-b from-indigo-500/20 via-indigo-500/10 to-transparent rounded-full" />

                        <div className="ml-20 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative">
                            {biz.stores.map((store: any) => (
                                <div key={store.id} className="relative bg-slate-900/50 border border-white/5 rounded-2xl p-5 hover:border-indigo-500/30 transition-all group/store">
                                    <div className="absolute -left-12 top-1/2 -translate-y-1/2 w-12 h-px bg-indigo-500/20" />
                                    
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-400 group-hover/store:text-indigo-400 transition-colors">
                                            <Store className="h-5 w-5" />
                                        </div>
                                        <div className="text-right">
                                            <div className="text-[10px] text-slate-500 uppercase font-black">Location</div>
                                            <div className="text-xs text-slate-300 truncate max-w-[100px]">{store.location || 'Central'}</div>
                                        </div>
                                    </div>
                                    <h4 className="font-bold text-white mb-4 group-hover/store:translate-x-1 transition-transform">{store.name}</h4>
                                    
                                    <div className="flex items-center justify-between pt-4 border-t border-white/5 text-xs">
                                        <div>
                                            <div className="text-[10px] text-slate-500 uppercase font-bold">Revenue</div>
                                            <div className="font-black text-emerald-400">GHS {store.sales?.reduce((a: any, b: any) => a + parseFloat(b.amount || 0), 0).toLocaleString()}</div>
                                        </div>
                                        <Users className="h-4 w-4 text-slate-700" />
                                    </div>
                                </div>
                            ))}

                            {biz.stores.length === 0 && (
                                <div className="col-span-full py-8 px-8 bg-white/5 border border-white/5 border-dashed rounded-3xl text-slate-600 text-sm italic">
                                    No branch infrastructure detected for this tenant.
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
