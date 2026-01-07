'use client';

import { useAuth } from '@/lib/auth-context';
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

export default function DashboardPage() {
    const { activeStore } = useAuth();

    if (!activeStore) return <div>Loading...</div>;

    // Mock data that changes based on store ID slightly to show "switch" effect
    const modifier = activeStore.id === '1' ? 1 : activeStore.id === '2' ? 0.6 : 0.8;

    const stats = [
        {
            name: 'Total Revenue',
            value: `GHS ${(124500 * modifier).toFixed(2)}`,
            change: '+12.5%',
            trend: 'up',
            icon: DollarSign,
            color: 'from-emerald-400 to-teal-500'
        },
        {
            name: 'Total Orders',
            value: Math.floor(1450 * modifier).toString(),
            change: '+8.2%',
            trend: 'up',
            icon: ShoppingBag,
            color: 'from-blue-400 to-indigo-500'
        },
        {
            name: 'New Customers',
            value: Math.floor(350 * modifier).toString(),
            change: '-2.1%',
            trend: 'down',
            icon: Users,
            color: 'from-orange-400 to-rose-500'
        },
        {
            name: 'Products Sold',
            value: Math.floor(890 * modifier).toString(),
            change: '+5.4%',
            trend: 'up',
            icon: TrendingUp,
            color: 'from-violet-400 to-purple-500'
        },
    ];

    const recentOrders = [
        { id: '#ORD-7752', customer: 'Sarah Willis', total: 'GHS 120.50', status: 'Completed', time: '2 mins ago' },
        { id: '#ORD-7751', customer: 'James Wright', total: 'GHS 75.20', status: 'Processing', time: '15 mins ago' },
        { id: '#ORD-7750', customer: 'Robert Doe', total: 'GHS 340.00', status: 'Completed', time: '32 mins ago' },
        { id: '#ORD-7749', customer: 'Emily Clark', total: 'GHS 55.00', status: 'Pending', time: '1 hour ago' },
        { id: '#ORD-7748', customer: 'Michael Chen', total: 'GHS 890.00', status: 'Cancelled', time: '2 hours ago' },
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
                {stats.map((stat) => (
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
                            {stat.trend === 'up' ? (
                                <ArrowUpRight className="mr-1 h-4 w-4 text-emerald-500" />
                            ) : (
                                <ArrowDownRight className="mr-1 h-4 w-4 text-rose-500" />
                            )}
                            <span className={stat.trend === 'up' ? 'text-emerald-500' : 'text-rose-500'}>
                                {stat.change}
                            </span>
                            <span className="ml-2 text-slate-400">vs last month</span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                {/* Main Chart Area Placeholder */}
                <div className="lg:col-span-2 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                    <div className="mb-6 flex items-center justify-between">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Revenue Analytics</h3>
                        <select className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1 text-sm outline-none dark:border-slate-700 dark:bg-slate-900">
                            <option>Last 7 Days</option>
                            <option>Last 30 Days</option>
                            <option>This Year</option>
                        </select>
                    </div>

                    <div className="flex h-80 items-end gap-2 sm:gap-4">
                        {/* CSS Bar Chart */}
                        {[40, 65, 45, 80, 55, 90, 70, 85, 60, 75, 50, 95].map((height, i) => (
                            <div key={i} className="group relative flex-1 flex flex-col justify-end gap-2 group cursor-pointer">
                                <div
                                    className="w-full rounded-t-lg bg-indigo-100 transition-all group-hover:bg-indigo-500 dark:bg-indigo-900/30 dark:group-hover:bg-indigo-500"
                                    style={{ height: `${height}%` }}
                                ></div>
                                <div className="opacity-0 group-hover:opacity-100 absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs py-1 px-2 rounded pointer-events-none transition-opacity">
                                    GHS {height * 100}
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-4 flex justify-between text-xs text-slate-400">
                        <span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span><span>Jul</span><span>Aug</span><span>Sep</span><span>Oct</span><span>Nov</span><span>Dec</span>
                    </div>
                </div>

                {/* Recent Activity */}
                <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                    <div className="mb-6 flex items-center justify-between">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Recent Orders</h3>
                        <Link href="/dashboard/sales" className="text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">View All</Link>
                    </div>

                    <div className="space-y-6">
                        {recentOrders.map((order) => (
                            <div key={order.id} className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                                        <ShoppingBag className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-slate-900 dark:text-white">{order.customer}</p>
                                        <p className="text-xs text-slate-500">{order.id} • {order.time}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-bold text-slate-900 dark:text-white">{order.total}</p>
                                    <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${order.status === 'Completed' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                                        order.status === 'Processing' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                            order.status === 'Pending' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                                                'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                                        }`}>
                                        {order.status}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>

                    <Link href="/dashboard/sales/history" className="mt-6 w-full rounded-lg border border-slate-200 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 flex items-center justify-center gap-2">
                        <Clock className="w-4 h-4" /> View Transactions History
                    </Link>
                </div>
            </div>
        </div>
    );
}
