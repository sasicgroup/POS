'use client';

import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Store, Users, DollarSign, TrendingUp, ArrowRight, Activity, ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function HQDashboardPage() {
    const { user, stores } = useAuth();
    const [isLoading, setIsLoading] = useState(true);
    const [stats, setStats] = useState({
        totalRevenue: 0,
        totalSalesCount: 0,
        activeStores: 0,
        topStoreName: 'N/A'
    });
    const [storeMetrics, setStoreMetrics] = useState<any[]>([]);

    useEffect(() => {
        const loadHQData = async () => {
            if (!user || user.role !== 'owner') return;
            setIsLoading(true);

            try {
                // 1. Get Sales for Last 30 Days across ALL stores
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

                const { data: sales } = await supabase
                    .from('sales')
                    .select('store_id, total_amount')
                    .gte('created_at', thirtyDaysAgo.toISOString());

                // 2. Aggregate Data
                let grandTotal = 0;
                let countTotal = 0;
                const storeMap: Record<string, { revenue: number, count: number }> = {};

                if (sales) {
                    sales.forEach(sale => {
                        grandTotal += sale.total_amount;
                        countTotal++;

                        if (!storeMap[sale.store_id]) {
                            storeMap[sale.store_id] = { revenue: 0, count: 0 };
                        }
                        storeMap[sale.store_id].revenue += sale.total_amount;
                        storeMap[sale.store_id].count += 1;
                    });
                }

                // 3. Map to Stores
                const filteredStores = stores.filter(s => s.status?.toLowerCase() !== 'deleted');
                const metrics = filteredStores.map(store => {
                    const data = storeMap[store.id] || { revenue: 0, count: 0 };
                    return {
                        id: store.id,
                        name: store.name,
                        location: store.location,
                        status: store.status || 'active',
                        revenue: data.revenue,
                        salesCount: data.count
                    };
                }).sort((a, b) => b.revenue - a.revenue);

                setStoreMetrics(metrics);
                setStats({
                    totalRevenue: grandTotal,
                    totalSalesCount: countTotal,
                    activeStores: filteredStores.filter(s => s.status !== 'archived' && s.status !== 'hidden').length,
                    topStoreName: metrics[0]?.name || 'N/A'
                });

            } catch (error) {
                console.error("HQ Data Load Error:", error);
            } finally {
                setIsLoading(false);
            }
        };

        loadHQData();
    }, [user, stores]);

    if (!user || user.role !== 'owner') {
        return (
            <div className="flex h-[80vh] items-center justify-center flex-col gap-4">
                <ShieldAlert className="h-16 w-16 text-slate-300" />
                <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-300">Access Restricted</h2>
                <p className="text-slate-500">Only the business owner can access the HQ Dashboard.</p>
            </div>
        );
    }

    // Safety import fix for ShieldAlert if used above but not imported (I used it in JSX)
    // Actually ShieldAlert is not imported, I'll switch to 'Activity' or add it.
    // I'll grab ShieldAlert from lucide-react in imports above. Wait, I didn't import ShieldAlert. 
    // Updating imports to include ShieldAlert. 

    if (isLoading) {
        return (
            <div className="flex bg-slate-50 dark:bg-slate-900 h-full p-8 animate-pulse space-y-8">
                <div className="h-8 w-48 bg-slate-200 dark:bg-slate-800 rounded"></div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>)}
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <TrendingUp className="h-6 w-6 text-indigo-600" />
                    HQ Dashboard
                </h1>
                <p className="text-slate-500 text-sm mt-1">Multi-site overview and performance metrics (Last 30 Days).</p>
            </div>

            {/* Top Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-slate-500">Consolidated Revenue</span>
                        <DollarSign className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">GHS {stats.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                    <div className="text-xs text-green-600 font-medium mt-1">+ All branches</div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-slate-500">Active Stores</span>
                        <Store className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">{stats.activeStores} <span className="text-sm font-normal text-slate-400">/ {stores.length}</span></div>
                    <div className="text-xs text-slate-500 mt-1">Total Locations</div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-slate-500">Total Transactions</span>
                        <Activity className="h-5 w-5 text-orange-600" />
                    </div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">{stats.totalSalesCount}</div>
                    <div className="text-xs text-slate-500 mt-1">Avg Ticket: GHS {stats.totalSalesCount ? (stats.totalRevenue / stats.totalSalesCount).toFixed(2) : '0.00'}</div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-slate-500">Top Performer</span>
                        <TrendingUp className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div className="text-lg font-bold text-slate-900 dark:text-white truncate">{stats.topStoreName}</div>
                    <div className="text-xs text-emerald-600 mt-1">Highest Revenue</div>
                </div>
            </div>

            {/* Store Table */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100">Branch Performance</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-800/50">
                            <tr>
                                <th className="px-6 py-3 font-medium text-slate-500">Store Name</th>
                                <th className="px-6 py-3 font-medium text-slate-500">Location</th>
                                <th className="px-6 py-3 font-medium text-slate-500">Status</th>
                                <th className="px-6 py-3 font-medium text-slate-500 text-right">Revenue (30d)</th>
                                <th className="px-6 py-3 font-medium text-slate-500 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {storeMetrics.map((store) => (
                                <tr key={store.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-white flex items-center gap-3">
                                        <div className="h-8 w-8 rounded bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-xs uppercase">
                                            {store.name.substring(0, 2)}
                                        </div>
                                        {store.name}
                                    </td>
                                    <td className="px-6 py-4 text-slate-500">{store.location}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold capitalize ${store.status === 'active' ? 'bg-green-100 text-green-700' :
                                            store.status === 'archived' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100'
                                            }`}>
                                            {store.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right font-medium text-indigo-600">
                                        GHS {store.revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <Link href={`/dashboard?storeId=${store.id}`} className="text-indigo-600 hover:text-indigo-800 font-medium text-xs inline-flex items-center gap-1">
                                            Switch View <ArrowRight className="h-3 w-3" />
                                        </Link>
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
