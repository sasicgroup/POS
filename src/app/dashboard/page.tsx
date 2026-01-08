
'use client';

import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import {
    TrendingUp,
    Users,
    ShoppingBag,
    DollarSign,
    ArrowUpRight,
    ArrowDownRight,
    Package,
    Clock
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function DashboardPage() {
    const { activeStore, isLoading } = useAuth();
    const [stats, setStats] = useState({
        revenue: 0,
        orders: 0,
        customers: 0,
        productsSold: 0
    });
    const [recentOrders, setRecentOrders] = useState<any[]>([]);

    const [dateRange, setDateRange] = useState('7d'); // 1d, 7d, 1m, 3m, 6m, 1y

    useEffect(() => {
        if (activeStore) {
            fetchDashboardData();
        }
    }, [activeStore]);

    const fetchDashboardData = async () => {
        // Fetch Sales & Revenue (Total)
        const { data: salesData } = await supabase.from('sales').select('*').eq('store_id', activeStore?.id);
        const totalRevenue = salesData?.reduce((acc, curr) => acc + (curr.total_amount || 0), 0) || 0;
        const totalOrders = salesData?.length || 0;

        // Fetch Customers Count
        const { count: customerCount } = await supabase.from('customers').select('*', { count: 'exact', head: true }).eq('store_id', activeStore?.id);

        // Fetch Recent Orders
        const { data: recent } = await supabase
            .from('sales')
            .select('*, customers(name)')
            .eq('store_id', activeStore?.id)
            .order('created_at', { ascending: false })
            .limit(5);

        setStats({
            revenue: totalRevenue,
            orders: totalOrders,
            customers: customerCount || 0,
            productsSold: totalOrders // Proxy
        });

        if (recent) {
            setRecentOrders(recent);
        }
    };

    // Helper to generate mock chart data based on range
    const getChartData = () => {
        // In a real app, this would query the DB with group_by logic
        const data = [];
        const today = new Date();

        if (dateRange === '1d') {
            // Hourly (9am - 6pm)
            for (let i = 9; i <= 18; i++) {
                const hour = i > 12 ? `${i - 12} PM` : `${i} AM`;
                data.push({ label: hour, value: Math.floor(Math.random() * 200) });
            }
        }
        else if (dateRange === '7d') {
            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            for (let i = 6; i >= 0; i--) {
                const d = new Date(today);
                d.setDate(today.getDate() - i);
                data.push({ label: days[d.getDay()], value: Math.floor(Math.random() * 800) + 100 });
            }
        }
        else if (dateRange === '1m') {
            // 4 Weeks
            for (let i = 1; i <= 4; i++) {
                data.push({ label: `Wk ${i}`, value: Math.floor(Math.random() * 3000) + 500 });
            }
        }
        else if (['3m', '6m', '1y'].includes(dateRange)) {
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const count = dateRange === '3m' ? 3 : dateRange === '6m' ? 6 : 12;
            for (let i = count - 1; i >= 0; i--) {
                const d = new Date(today);
                d.setMonth(today.getMonth() - i);
                data.push({ label: months[d.getMonth()], value: Math.floor(Math.random() * 10000) + 2000 });
            }
        }
        return data;
    };

    const chartData = getChartData();

    if (isLoading) return <div className="p-8 text-center text-slate-500 animate-pulse">Loading dashboard...</div>;

    if (!activeStore) return (
        <div className="flex flex-col items-center justify-center p-12 text-center h-[60vh] animate-in fade-in slide-in-from-bottom-4">
            <div className="bg-indigo-50 p-6 rounded-full dark:bg-slate-800 mb-6">
                <ShoppingBag className="w-12 h-12 text-indigo-500" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">No Store Selected</h2>
            <p className="text-slate-500 dark:text-slate-400 max-w-md mb-8">
                You don't have any active stores selected. Please select a store from the dropdown menu in the header, or create a new one to get started.
            </p>
        </div>
    );

    const cards = [
        {
            name: 'Total Revenue',
            value: `GHS ${stats.revenue.toFixed(2)}`,
            change: '+2.5%',
            trend: 'up',
            icon: DollarSign,
            color: 'from-emerald-400 to-teal-500'
        },
        {
            name: 'Total Orders',
            value: stats.orders.toString(),
            change: '+12%',
            trend: 'up',
            icon: ShoppingBag,
            color: 'from-blue-400 to-indigo-500'
        },
        {
            name: 'Total Customers',
            value: stats.customers.toString(),
            change: '+5%',
            trend: 'up',
            icon: Users,
            color: 'from-orange-400 to-rose-500'
        },
        {
            name: 'Products Sold',
            value: stats.productsSold.toString(),
            change: '+8%',
            trend: 'up',
            icon: TrendingUp,
            color: 'from-violet-400 to-purple-500'
        },
    ];

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                    Dashboard Overview
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                    Welcome back. Here's what's happening at <span className="font-semibold text-indigo-600 dark:text-indigo-400">{activeStore.name}</span> today.
                </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {cards.map((stat) => (
                    <div key={stat.name} className="relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm transition-all hover:shadow-md dark:bg-slate-800 border border-slate-100 dark:border-slate-700 group">
                        {/* Background decoration */}
                        <div className={`absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-10 blur-xl bg-gradient-to-br ${stat.color} group-hover:opacity-20 transition-opacity`}></div>

                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{stat.name}</p>
                                <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">{stat.value}</p>
                            </div>
                            <div className={`rounded-xl bg-gradient-to-br ${stat.color} p-3 text-white shadow-lg`}>
                                <stat.icon className="h-6 w-6" />
                            </div>
                        </div>

                        <div className="mt-4 flex items-center text-sm">
                            {/* Placeholder trends */}
                            <ArrowUpRight className="mr-1 h-4 w-4 text-emerald-500" />
                            <span className="text-emerald-500">
                                {stat.change}
                            </span>
                            <span className="ml-2 text-slate-400">vs last month</span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                {/* Main Chart Area */}
                <div className="lg:col-span-2 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                    <div className="mb-6 flex items-center justify-between">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Revenue Analytics</h3>
                        <select
                            value={dateRange}
                            onChange={(e) => setDateRange(e.target.value)}
                            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1 text-sm outline-none dark:border-slate-700 dark:bg-slate-900"
                        >
                            <option value="1d">Today (1d)</option>
                            <option value="7d">Last 7 Days</option>
                            <option value="1m">Last 30 Days</option>
                            <option value="3m">Last 3 Months</option>
                            <option value="6m">Last 6 Months</option>
                            <option value="1y">Last Year</option>
                        </select>
                    </div>

                    <div className="flex h-80 items-end gap-2 sm:gap-4 justify-between pb-2 px-2">
                        {stats.revenue > 0 ? (
                            chartData.map((item, i) => (
                                <div key={i} className="flex flex-col items-center gap-2 group flex-1">
                                    <div className="w-full h-full flex items-end justify-center">
                                        <div
                                            className="w-full max-w-[40px] bg-indigo-100 dark:bg-indigo-900/30 rounded-t-lg relative group-hover:bg-indigo-200 dark:group-hover:bg-indigo-800 transition-all overflow-hidden"
                                            style={{ height: `${(item.value / (Math.max(...chartData.map(d => d.value)) || 1)) * 100}%`, minHeight: '4px' }}
                                        >
                                            <div className="absolute inset-x-0 bottom-0 bg-indigo-500 opacity-80 h-full w-full transform translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
                                        </div>
                                    </div>
                                    <span className="text-[10px] sm:text-xs text-slate-400 font-medium truncate w-full text-center">{item.label}</span>
                                </div>
                            ))
                        ) : (
                            <div className="flex flex-col items-center justify-center text-slate-400 h-full w-full">
                                <TrendingUp className="h-10 w-10 mb-2 opacity-20" />
                                <p>No revenue data available yet.</p>
                                <p className="text-xs opacity-60">Complete a sale in POS to see analytics.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Recent Activity */}
                <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                    <div className="mb-6 flex items-center justify-between">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Recent Orders</h3>
                        <Link href="/dashboard/sales/history" className="text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">View All</Link>
                    </div>

                    <div className="space-y-6">
                        {recentOrders.length === 0 ? (
                            <div className="text-center text-slate-500 py-8">No recent orders found.</div>
                        ) : (
                            recentOrders.map((order) => (
                                <div key={order.id} className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                                            <ShoppingBag className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-slate-900 dark:text-white">{order.customers?.name || 'Guest'}</p>
                                            <p className="text-xs text-slate-500">#{order.id.toString().slice(0, 6)} • {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-slate-900 dark:text-white">GHS {order.total_amount.toFixed(2)}</p>
                                        <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${order.status === 'completed' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                                            'bg-slate-100 text-slate-700'
                                            }`}>
                                            {order.status}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <Link href="/dashboard/sales/history" className="mt-6 w-full rounded-lg border border-slate-200 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 flex items-center justify-center gap-2">
                        <Clock className="w-4 h-4" /> View Transactions History
                    </Link>
                </div>
            </div>
        </div>
    );
}

