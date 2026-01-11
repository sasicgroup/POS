
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

    const [salesData, setSalesData] = useState<any[]>([]);

    useEffect(() => {
        if (activeStore) {
            fetchDashboardData();
        }
    }, [activeStore]);

    const fetchDashboardData = async () => {
        // Fetch Sales & Revenue (Total)
        const { data: sales } = await supabase.from('sales').select('*').eq('store_id', activeStore?.id);
        const totalRevenue = sales?.reduce((acc, curr) => acc + (curr.total_amount || 0), 0) || 0;
        const totalOrders = sales?.length || 0;

        if (sales) setSalesData(sales);

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

    // Helper to generate REAL chart data based on range
    const getChartData = () => {
        if (!salesData.length) return [];

        const now = new Date();
        const dataMap = new Map<string, number>();
        let labels: string[] = [];
        let formatKey: (date: Date) => string = (d) => d.toISOString(); // Default

        if (dateRange === '1d') {
            // Today Hourly (0-23)
            // Filter for today
            const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const todaySales = salesData.filter(s => new Date(s.created_at) >= startOfDay);

            // Initialize all hours with 0
            for (let i = 8; i <= 20; i++) { // Show business hours mostly
                const hourLabel = i > 12 ? `${i - 12} PM` : (i === 12 ? '12 PM' : `${i} AM`);
                dataMap.set(hourLabel, 0);
                labels.push(hourLabel);
            }

            todaySales.forEach(sale => {
                const d = new Date(sale.created_at);
                const h = d.getHours();
                if (h >= 8 && h <= 20) {
                    const hourLabel = h > 12 ? `${h - 12} PM` : (h === 12 ? '12 PM' : `${h} AM`);
                    dataMap.set(hourLabel, (dataMap.get(hourLabel) || 0) + sale.total_amount);
                }
            });

            return labels.map(label => ({ label, value: dataMap.get(label) || 0 }));
        }
        else if (dateRange === '7d') {
            // Last 7 days
            for (let i = 6; i >= 0; i--) {
                const d = new Date(now);
                d.setDate(now.getDate() - i);
                const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
                dataMap.set(dayName, 0); // Init
                labels.push(dayName);
            }

            const cutoff = new Date(now);
            cutoff.setDate(now.getDate() - 7);

            salesData.filter(s => new Date(s.created_at) >= cutoff).forEach(sale => {
                const d = new Date(sale.created_at);
                const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
                if (dataMap.has(dayName)) {
                    dataMap.set(dayName, (dataMap.get(dayName) || 0) + sale.total_amount);
                }
            });
            return labels.map(label => ({ label, value: dataMap.get(label) || 0 }));
        }
        else if (dateRange === '1m') {
            // Last 30 Days (Group by week or every 5 days to save space?) Let's do weeks or simple days
            // Let's do 4 weeks
            for (let i = 3; i >= 0; i--) {
                // This is rough "Week X" logic, or we can just show last 4 weeks
                const label = i === 0 ? 'This Week' : `${i} Week${i > 1 ? 's' : ''} Ago`;
                dataMap.set(label, 0);
                labels.push(label);
            }

            // Simple week bucketing
            const oneWeek = 7 * 24 * 60 * 60 * 1000;
            salesData.forEach(sale => {
                const diff = now.getTime() - new Date(sale.created_at).getTime();
                if (diff <= oneWeek * 4) {
                    const weekIdx = Math.floor(diff / oneWeek);
                    const label = weekIdx === 0 ? 'This Week' : `${weekIdx} Week${weekIdx > 1 ? 's' : ''} Ago`;
                    if (dataMap.has(label)) {
                        dataMap.set(label, (dataMap.get(label) || 0) + sale.total_amount);
                    }
                }
            });
            // Reverse labels to show oldest to newest? No, "3 Weeks Ago" -> "This Week"
            return labels.reverse().map(label => ({ label, value: dataMap.get(label) || 0 }));
        }
        else {
            // Months (3m, 6m, 1y)
            const monthCount = dateRange === '3m' ? 3 : dateRange === '6m' ? 6 : 12;

            for (let i = monthCount - 1; i >= 0; i--) {
                const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                const monthName = d.toLocaleDateString('en-US', { month: 'short' });
                const key = `${monthName}-${d.getFullYear()}`; // Unique key
                dataMap.set(key, 0);
                labels.push(key);
            }

            const cutoff = new Date(now);
            cutoff.setMonth(now.getMonth() - monthCount);

            salesData.filter(s => new Date(s.created_at) >= cutoff).forEach(sale => {
                const d = new Date(sale.created_at);
                const monthName = d.toLocaleDateString('en-US', { month: 'short' });
                const key = `${monthName}-${d.getFullYear()}`;
                if (dataMap.has(key)) {
                    dataMap.set(key, (dataMap.get(key) || 0) + sale.total_amount);
                }
            });

            return labels.map(key => ({ label: key.split('-')[0], value: dataMap.get(key) || 0 }));
        }
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

