'use client';

import { useState, useEffect } from 'react';
import { useSuperAdmin } from '@/lib/super-admin-context';
import { supabase } from '@/lib/supabase';
import { TrendingUp, DollarSign, Building2, Calendar, ArrowUpRight, ArrowDownRight, RefreshCw, Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

export default function PlatformReportsPage() {
    const { businesses } = useSuperAdmin();
    const [period, setPeriod] = useState<'7d' | '30d' | '3m' | '12m'>('30d');
    const [loading, setLoading] = useState(true);
    const [revenue, setRevenue] = useState<any[]>([]);
    const [totals, setTotals] = useState({ totalSales: 0, totalRevenue: 0, totalBusinesses: 0, activeBusinesses: 0 });
    const [bizRevenue, setBizRevenue] = useState<any[]>([]);

    useEffect(() => { fetchData(); }, [period, businesses]);

    const fetchData = async () => {
        if (!businesses.length) { setLoading(false); return; }
        setLoading(true);

        const now = new Date();
        const start = new Date();
        if (period === '7d') start.setDate(now.getDate() - 7);
        else if (period === '30d') start.setMonth(now.getMonth() - 1);
        else if (period === '3m') start.setMonth(now.getMonth() - 3);
        else start.setFullYear(now.getFullYear() - 1);

        // Fetch all sales across all businesses
        const { data: sales } = await supabase
            .from('sales')
            .select('total_amount, created_at, store_id')
            .gte('created_at', start.toISOString())
            .neq('status', 'Refunded');

        if (sales) {
            const totalRevenue = sales.reduce((a, s) => a + (s.total_amount || 0), 0);
            setTotals({
                totalSales: sales.length,
                totalRevenue,
                totalBusinesses: businesses.length,
                activeBusinesses: businesses.filter(b => b.is_active).length,
            });

            // Group by day
            const byDay: Record<string, number> = {};
            sales.forEach(s => {
                const d = s.created_at.slice(0, 10);
                byDay[d] = (byDay[d] || 0) + (s.total_amount || 0);
            });
            const sorted = Object.entries(byDay).sort((a, b) => a[0].localeCompare(b[0]));
            setRevenue(sorted.map(([date, value]) => ({
                label: new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
                value: Math.round(value * 100) / 100
            })));
        }

        // Per-business revenue
        const biz = businesses.map(b => ({ name: b.name.slice(0, 20), revenue: Math.floor(Math.random() * 50000) })); // placeholder - replace with real per-store query
        setBizRevenue(biz);

        setLoading(false);
    };

    const fmt = (n: number) => `GHS ${n.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Platform Reports</h1>
                    <p className="text-slate-400 text-sm mt-1">Revenue and activity across all businesses</p>
                </div>
                <div className="flex gap-2">
                    {(['7d', '30d', '3m', '12m'] as const).map(p => (
                        <button key={p} onClick={() => setPeriod(p)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${period === p ? 'bg-indigo-600 text-white' : 'bg-white/5 text-slate-400 hover:text-white border border-white/10'}`}>
                            {p}
                        </button>
                    ))}
                </div>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Total Revenue', value: fmt(totals.totalRevenue), icon: DollarSign, color: 'text-emerald-400', bg: 'from-emerald-500/10 to-teal-500/10' },
                    { label: 'Total Sales', value: totals.totalSales.toLocaleString(), icon: TrendingUp, color: 'text-indigo-400', bg: 'from-indigo-500/10 to-violet-500/10' },
                    { label: 'Businesses', value: totals.totalBusinesses.toString(), icon: Building2, color: 'text-blue-400', bg: 'from-blue-500/10 to-cyan-500/10' },
                    { label: 'Active Clients', value: totals.activeBusinesses.toString(), icon: Calendar, color: 'text-amber-400', bg: 'from-amber-500/10 to-orange-500/10' },
                ].map(s => (
                    <div key={s.label} className={`rounded-2xl border border-white/5 bg-gradient-to-br ${s.bg} p-5`}>
                        <s.icon className={`h-5 w-5 ${s.color} mb-3`} />
                        <div className="text-2xl font-bold text-white">{loading ? '...' : s.value}</div>
                        <div className="text-xs text-slate-400 mt-1">{s.label}</div>
                    </div>
                ))}
            </div>

            {/* Revenue Chart */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
                <h2 className="font-semibold text-white mb-5">Revenue Over Time</h2>
                {loading ? (
                    <div className="h-64 flex items-center justify-center text-slate-400 animate-pulse">Loading...</div>
                ) : revenue.length === 0 ? (
                    <div className="h-64 flex items-center justify-center text-slate-500 text-sm">No sales data in this period</div>
                ) : (
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={revenue} margin={{ left: -20 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff08" />
                                <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} interval={Math.floor(revenue.length / 7)} />
                                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                                <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 8 }} formatter={(v: any) => [`GHS ${Number(v).toFixed(2)}`, 'Revenue']} />
                                <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>

            {/* Per-Business Revenue */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
                <h2 className="font-semibold text-white mb-5">Revenue by Business</h2>
                <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={bizRevenue} layout="vertical" margin={{ left: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#ffffff08" />
                            <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                            <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} width={100} />
                            <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 8 }} />
                            <Bar dataKey="revenue" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <p className="text-xs text-slate-600 mt-2">* Revenue by business requires store→business linkage. Showing placeholder data until business_id is fully indexed on sales.</p>
            </div>
        </div>
    );
}
