'use client';

import { useAuth } from '@/lib/auth-context';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
    LineChart, Line, AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';
import { Calendar, TrendingUp, DollarSign, ShoppingBag, Clock, Users, Star, Download, FileText, FileSpreadsheet, ChevronDown } from 'lucide-react';
import { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '@/lib/supabase';

export default function ReportsPage() {
    const { activeStore } = useAuth();
    const [activeTab, setActiveTab] = useState('financials');
    const [loading, setLoading] = useState(true);
    const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

    // Financial Data State
    const [hourlySalesData, setHourlySalesData] = useState<any[]>([]);
    const [weeklySalesData, setWeeklySalesData] = useState<any[]>([]);
    const [categoryData, setCategoryData] = useState<any[]>([]);
    const [recentBigSales, setRecentBigSales] = useState<any[]>([]);
    const [totalRevenue, setTotalRevenue] = useState(0);
    const [totalGrossProfit, setTotalGrossProfit] = useState(0);
    const [totalExpenses, setTotalExpenses] = useState(0);

    // Inventory Data State
    const [deadStockData, setDeadStockData] = useState<any[]>([]);

    useEffect(() => {
        if (activeStore) {
            fetchFinancialData();
            if (activeTab === 'inventory') fetchInventoryData();
        }
    }, [activeStore, activeTab]);

    const fetchInventoryData = async () => {
        setLoading(true);
        try {
            // 1. Get all products with stock > 0
            const { data: products } = await supabase
                .from('products')
                .select('*')
                .eq('store_id', activeStore.id)
                .gt('stock', 0);

            // 2. Get sales items from last 90 days
            const ninetyDaysAgo = new Date();
            ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

            const { data: salesItems } = await supabase
                .from('sale_items')
                .select('product_id')
                .gte('created_at', ninetyDaysAgo.toISOString());

            if (products && salesItems) {
                const soldProductIds = new Set(salesItems.map(i => i.product_id));
                const dead = products.filter(p => !soldProductIds.has(p.id));
                setDeadStockData(dead);
            }
        } catch (e) {
            console.error("Error fetching inventory data", e);
        } finally {
            setLoading(false);
        }
    };

    const fetchFinancialData = async () => {
        setLoading(true);
        try {
            // 1. Fetch Sales
            const { data: sales, error: salesError } = await supabase
                .from('sales')
                .select(`
                    *,
                    sale_items (
                        quantity,
                        price_at_sale,
                        product_id,
                        products ( name, category, price, cost_price ) 
                    ),
                    customers ( name )
                `)
                .eq('store_id', activeStore.id)
                .order('created_at', { ascending: false });

            // 2. Fetch Expenses
            const { data: expensesData } = await supabase
                .from('expenses')
                .select('amount')
                .eq('store_id', activeStore.id);

            if (salesError || !sales) return;

            // --- Aggregations ---
            const revenue = sales.reduce((acc, sale) => acc + Number(sale.total_amount), 0);
            const expenses = expensesData ? expensesData.reduce((acc, exp) => acc + Number(exp.amount), 0) : 0;

            const grossProfit = sales.reduce((acc, sale) => {
                const saleProfit = sale.sale_items.reduce((sAcc: number, item: any) => {
                    const cost = item.products?.cost_price || 0;
                    const price = item.price_at_sale || 0;
                    return sAcc + ((price - cost) * item.quantity);
                }, 0);
                return acc + saleProfit;
            }, 0);

            setTotalRevenue(revenue);
            setTotalGrossProfit(grossProfit);
            setTotalExpenses(expenses);

            // --- Charts Processing ---

            // Hourly
            const hoursMap = new Array(24).fill(0).map((_, i) => ({ hour: `${i}:00`, sales: 0 }));
            sales.forEach(sale => {
                const h = new Date(sale.created_at).getHours();
                hoursMap[h].sales += Number(sale.total_amount);
            });
            setHourlySalesData(hoursMap.slice(6, 22).map(h => ({
                ...h,
                hour: new Date(0, 0, 0, parseInt(h.hour)).toLocaleTimeString([], { hour: 'numeric', hour12: true }).toLowerCase()
            })));

            // Weekly
            const daysMap = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            const last7DaysMap = new Map();
            for (let i = 6; i >= 0; i--) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                const k = daysMap[d.getDay()];
                last7DaysMap.set(k, { day: k, revenue: 0, profit: 0, orders: 0 });
            }
            const now = new Date();
            sales.forEach(sale => {
                const d = new Date(sale.created_at);
                if ((now.getTime() - d.getTime()) / (1000 * 3600 * 24) <= 7) {
                    const k = daysMap[d.getDay()];
                    if (last7DaysMap.has(k)) {
                        const e = last7DaysMap.get(k);
                        e.revenue += Number(sale.total_amount);
                        e.orders += 1;
                        e.profit += sale.sale_items.reduce((a: number, i: any) => a + ((i.price_at_sale - (i.products?.cost_price || 0)) * i.quantity), 0);
                    }
                }
            });
            setWeeklySalesData(Array.from(last7DaysMap.values()));

            // Categories
            const catMap = new Map();
            sales.forEach(s => s.sale_items.forEach((i: any) => {
                const c = i.products?.category || 'Uncategorized';
                catMap.set(c, (catMap.get(c) || 0) + i.quantity);
            }));
            const COLORS = ['#6366f1', '#ec4899', '#8b5cf6', '#10b981', '#f59e0b'];
            setCategoryData(Array.from(catMap.entries()).map(([name, value], i) => ({ name, value, color: COLORS[i % COLORS.length] })));

            // Big Sales
            setRecentBigSales(sales.filter(s => Number(s.total_amount) > 500).slice(0, 10));

        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleExportCSV = () => {
        // Implementation for CSV export
        const headers = ['Day', 'Revenue', 'Profit', 'Orders'];
        const rows = weeklySalesData.map(d => [d.day, d.revenue, d.profit, d.orders]);
        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'report.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleExportPDF = () => {
        const doc = new jsPDF();
        autoTable(doc, {
            head: [["Day", "Revenue", "Profit", "Orders"]],
            body: weeklySalesData.map(d => [d.day, d.revenue, d.profit, d.orders]),
        });
        doc.save('report.pdf');
    };

    if (!activeStore) return null;
    const netProfit = totalGrossProfit - totalExpenses;
    const avgDailyRev = totalRevenue / 30;
    const forecastData = [
        { date: 'Today', predicted: avgDailyRev * 1.1, actual: avgDailyRev * 1.05 },
        { date: 'Tomorrow', predicted: avgDailyRev * 1.2, actual: null },
    ];
    const aiInsights = [
        { title: 'Sales Trend', description: `Revenue is tracking ${totalRevenue > 0 ? 'steady' : 'low'} this week.`, type: totalRevenue > 0 ? 'positive' : 'alert' },
        { title: 'Inventory', description: 'Check stock on top selling items.', type: 'alert' },
    ];

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Analytics & Reports</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Financial performance, inventory health, and AI insights.</p>
                </div>
                <div className="relative">
                    {activeTab === 'financials' && (
                        <button
                            onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 active:bg-indigo-800 shadow-lg shadow-indigo-500/30"
                        >
                            <Download className="h-4 w-4" /> Export Data <ChevronDown className={`h-4 w-4 ${isExportMenuOpen ? 'rotate-180' : ''}`} />
                        </button>
                    )}
                    {isExportMenuOpen && (
                        <div className="absolute right-0 top-12 w-48 rounded-xl border border-slate-200 bg-white p-1 shadow-xl z-50">
                            <button onClick={() => { handleExportCSV(); setIsExportMenuOpen(false); }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                                <FileSpreadsheet className="h-4 w-4 text-emerald-600" /> CSV
                            </button>
                            <button onClick={() => { handleExportPDF(); setIsExportMenuOpen(false); }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                                <FileText className="h-4 w-4 text-rose-600" /> PDF
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-slate-200 dark:border-slate-800">
                <nav className="-mb-px flex space-x-8">
                    <button onClick={() => setActiveTab('financials')} className={`flex items-center border-b-2 py-4 px-1 text-sm font-medium ${activeTab === 'financials' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500'}`}>
                        <DollarSign className="mr-2 h-5 w-5" /> Financials
                    </button>
                    <button onClick={() => setActiveTab('inventory')} className={`flex items-center border-b-2 py-4 px-1 text-sm font-medium ${activeTab === 'inventory' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500'}`}>
                        <ShoppingBag className="mr-2 h-5 w-5" /> Inventory Health (Dead Stock)
                    </button>
                </nav>
            </div>

            {activeTab === 'inventory' ? (
                <div className="space-y-6">
                    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <div className="mb-4">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Dead Stock Report (90 Days)</h3>
                            <p className="text-sm text-slate-500">Items with stock &gt; 0 that have not sold in the last 90 days.</p>
                        </div>
                        <div className="rounded-lg bg-amber-50 p-4 border border-amber-200 mb-6">
                            <div className="flex gap-3">
                                <TrendingUp className="h-5 w-5 text-amber-600" />
                                <div>
                                    <h4 className="font-bold text-amber-800">Opportunity Cost</h4>
                                    <p className="text-amber-700 text-sm">
                                        You have {deadStockData.length} stagnant items tying up approximately
                                        <span className="font-bold"> GHS {deadStockData.reduce((acc, curr) => acc + (curr.cost_price * curr.stock), 0).toLocaleString()} </span>
                                        in capital.
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 dark:bg-slate-800/50">
                                    <tr>
                                        <th className="px-6 py-3 font-medium text-slate-500">Product</th>
                                        <th className="px-6 py-3 font-medium text-slate-500">Category</th>
                                        <th className="px-6 py-3 font-medium text-slate-500 text-right">Stock</th>
                                        <th className="px-6 py-3 font-medium text-slate-500 text-right">Cost Value</th>
                                        <th className="px-6 py-3 font-medium text-slate-500 text-right">Retail Value</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {deadStockData.length > 0 ? deadStockData.map((item) => (
                                        <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                            <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{item.name}</td>
                                            <td className="px-6 py-4 text-slate-500">{item.category}</td>
                                            <td className="px-6 py-4 text-right">{item.stock}</td>
                                            <td className="px-6 py-4 text-right text-slate-500">GHS {(item.cost_price * item.stock).toFixed(2)}</td>
                                            <td className="px-6 py-4 text-right font-medium text-indigo-600">GHS {(item.price * item.stock).toFixed(2)}</td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan={5} className="p-8 text-center text-slate-500">No dead stock found. Great job!</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Financial Views */}
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <MetricCard title="Gross Revenue" value={`GHS ${totalRevenue.toLocaleString()}`} sub="Total Sales" icon={DollarSign} color="blue" />
                        <MetricCard title="Gross Profit" value={`GHS ${totalGrossProfit.toLocaleString()}`} sub={`${totalRevenue ? (totalGrossProfit / totalRevenue * 100).toFixed(1) : 0}% Margin`} icon={TrendingUp} color="emerald" />
                        <MetricCard title="Net Profit" value={`GHS ${netProfit.toLocaleString()}`} sub="After Expenses" icon={Users} color="purple" />
                        <MetricCard title="Expenses" value={`GHS ${totalExpenses.toLocaleString()}`} sub="Operating Costs" icon={Clock} color="amber" />
                    </div>

                    <div className="grid gap-6 lg:grid-cols-2">
                        {/* Peak Hours */}
                        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                            <h3 className="text-lg font-bold mb-4">Peak Sales Hours</h3>
                            <div className="w-full h-64">
                                <ResponsiveContainer>
                                    <BarChart data={hourlySalesData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="hour" fontSize={12} />
                                        <YAxis fontSize={12} />
                                        <RechartsTooltip />
                                        <Bar dataKey="sales" fill="#6366f1" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Weekly Trend */}
                        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                            <h3 className="text-lg font-bold mb-4">Weekly Trend</h3>
                            <div className="w-full h-64">
                                <ResponsiveContainer>
                                    <AreaChart data={weeklySalesData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="day" fontSize={12} />
                                        <YAxis fontSize={12} />
                                        <RechartsTooltip />
                                        <Area type="monotone" dataKey="revenue" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.2} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* AI & Cats */}
                    <div className="grid gap-6 lg:grid-cols-3">
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 lg:col-span-1">
                            <h3 className="font-bold mb-4">Top Categories</h3>
                            <div className="h-64">
                                <ResponsiveContainer>
                                    <PieChart>
                                        <Pie data={categoryData} dataKey="value" innerRadius={60} outerRadius={80} paddingAngle={5}>
                                            {categoryData.map((e, i) => <Cell key={i} fill={e.color} />)}
                                        </Pie>
                                        <Legend verticalAlign="bottom" />
                                        <RechartsTooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 lg:col-span-2">
                            <h3 className="font-bold mb-4">Recent Big Transactions</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-slate-500 border-b">
                                        <tr><th>ID</th><th>Customer</th><th>Amount</th><th>Status</th></tr>
                                    </thead>
                                    <tbody>
                                        {recentBigSales.map(s => (
                                            <tr key={s.id} className="border-b last:border-0 border-slate-100 dark:border-slate-800">
                                                <td className="py-3">#{s.id.slice(0, 6)}</td>
                                                <td className="py-3">{s.customers?.name || 'Guest'}</td>
                                                <td className="py-3 font-bold">GHS {Number(s.total_amount).toFixed(2)}</td>
                                                <td className="py-3"><span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">Completed</span></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function MetricCard({ title, value, sub, icon: Icon, color }: any) {
    const colorClasses: any = {
        blue: 'bg-blue-100 text-blue-600',
        emerald: 'bg-emerald-100 text-emerald-600',
        purple: 'bg-purple-100 text-purple-600',
        amber: 'bg-amber-100 text-amber-600',
    };
    return (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-4">
                <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${colorClasses[color]}`}>
                    <Icon className="h-6 w-6" />
                </div>
                <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{value}</h3>
                    <p className="text-xs opacity-70">{sub}</p>
                </div>
            </div>
        </div>
    );
}
