'use client';

import { useState, useEffect } from 'react';
import { 
    LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Cell
} from 'recharts';
import { 
    TrendingUp, TrendingDown, Users, CreditCard, DollarSign, Activity,
    Calendar, ArrowUpRight, ArrowDownRight, Briefcase
} from 'lucide-react';

export default function AnalyticsPage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const res = await fetch('/api/super-admin/analytics', { credentials: 'include' });
                if (res.ok) {
                    const json = await res.json();
                    setData(json);
                }
            } catch (e) {
                console.error('Failed to load analytics', e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    if (loading) return <div className="animate-pulse text-slate-500 py-32 text-center">Crunching platform data...</div>;

    const stats = [
        { label: 'Monthly Recurring Revenue', value: `GHS ${data?.stats?.mrr?.toFixed(2) || '0.00'}`, trend: '+12.5%', icon: DollarSign, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
        { label: 'Total Transaction Volume', value: `GHS ${(data?.stats?.totalVolume || 0).toLocaleString()}`, trend: '+8.2%', icon: Activity, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
        { label: 'Active Businesses', value: data?.stats?.totalBusinesses || 0, trend: '+4', icon: Briefcase, color: 'text-amber-400', bg: 'bg-amber-500/10' },
        { label: 'Platform Growth', value: `${((data?.stats?.totalBusinesses || 0) / 10 * 100).toFixed(0)}%`, trend: '+15%', icon: Users, color: 'text-violet-400', bg: 'bg-violet-500/10' },
    ];

    const planData = data?.stats?.planDistribution || {};
    const totalPlans = Object.values(planData).reduce((a: any, b: any) => a + b, 0) as number || 1;

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white mb-1">Platform Analytics</h1>
                    <p className="text-sm text-slate-500 text-balance">Real-time health monitoring of your SaaS ecosystem.</p>
                </div>
                <div className="flex items-center gap-2 bg-slate-900 border border-white/5 rounded-xl p-1">
                    {['24h', '7d', '30d', '6m'].map(t => (
                        <button key={t} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${t === '30d' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}>
                            {t}
                        </button>
                    ))}
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((s, idx) => (
                    <div key={idx} className="bg-slate-900 border border-white/5 rounded-2xl p-6 hover:border-indigo-500/30 transition-all group">
                        <div className="flex items-center justify-between mb-4">
                            <div className={`h-10 w-10 rounded-xl ${s.bg} flex items-center justify-center`}>
                                <s.icon className={`h-5 w-5 ${s.color}`} />
                            </div>
                            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/10 text-[10px] font-bold text-emerald-400">
                                <TrendingUp className="h-3 w-3" /> {s.trend}
                            </div>
                        </div>
                        <div className="text-2xl font-bold text-white mb-1">{s.value}</div>
                        <div className="text-xs text-slate-500">{s.label}</div>
                    </div>
                ))}
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Growth Trend */}
                <div className="lg:col-span-2 bg-slate-900 border border-white/5 rounded-3xl p-8">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-lg font-bold text-white mb-1">Tenant Growth</h3>
                            <p className="text-xs text-slate-500">New business signups over the last 6 months.</p>
                        </div>
                        <div className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-400 hover:text-white cursor-pointer transition-colors">
                            <Calendar className="h-5 w-5" />
                        </div>
                    </div>
                    <div className="h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data?.trends || []}>
                                <defs>
                                    <linearGradient id="colorSignups" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                                <XAxis dataKey="name" stroke="#64748b" fontSize={10} axisLine={false} tickLine={false} dy={10} />
                                <YAxis stroke="#64748b" fontSize={10} axisLine={false} tickLine={false} />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #ffffff10', borderRadius: '12px' }}
                                    itemStyle={{ color: '#fff', fontSize: '12px' }}
                                />
                                <Area type="monotone" dataKey="signups" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorSignups)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Subscriptions Mixed */}
                <div className="bg-gradient-to-br from-indigo-900/20 to-slate-900 border border-white/5 rounded-3xl p-8">
                    <h3 className="text-lg font-bold text-white mb-8">Plan Distribution</h3>
                    <div className="space-y-6">
                        {[
                            { label: 'Monthly', count: planData.monthly || 0, color: 'bg-indigo-500' },
                            { label: 'Yearly', count: planData.yearly || 0, color: 'bg-emerald-500' },
                            { label: 'Forever', count: planData.forever || 0, color: 'bg-amber-500' },
                            { label: 'Trial', count: planData.trial || 0, color: 'bg-slate-600' },
                        ].map((p, i) => (
                            <div key={i} className="space-y-2">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-slate-300 font-medium">{p.label}</span>
                                    <span className="text-white font-bold">{p.count}</span>
                                </div>
                                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                    <div className={`h-full ${p.color} rounded-full transition-all duration-1000`} style={{ width: `${(p.count / totalPlans * 100) || 0}%` }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
