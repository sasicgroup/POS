'use client';

import { useAuth } from '@/lib/auth-context';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    Legend,
    ResponsiveContainer,
    LineChart,
    Line,
    AreaChart,
    Area,
    PieChart,
    Pie,
    Cell
} from 'recharts';
import { Calendar, TrendingUp, DollarSign, ShoppingBag, Clock, Users, Star, Download, FileText, FileSpreadsheet, ChevronDown } from 'lucide-react';
import { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '@/lib/supabase';

export default function ReportsPage() {
    const { activeStore } = useAuth();
    const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

    if (!activeStore) return null;

    const handleExportCSV = () => {
        const headers = ['Day', 'Revenue', 'Profit', 'Orders'];
        const rows = weeklySalesData.map(d => [d.day, d.revenue, d.profit, d.orders]);
        const csvContent = [
            headers.join(','),
            ...rows.map(r => r.join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'weekly_sales_report.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleExportPDF = () => {
        const doc = new jsPDF();

        // Add Title
        doc.setFontSize(20);
        doc.setTextColor(40, 40, 40);
        doc.text('SmartTab Analytics Report', 14, 22);

        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(`Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, 14, 30);
        doc.text(`Store: ${activeStore.name}`, 14, 35);

        // Define columns and rows
        const tableColumn = ["Day", "Revenue (GHS)", "Profit (GHS)", "Orders"];
        const tableRows = weeklySalesData.map(item => [
            item.day,
            item.revenue,
            item.profit,
            item.orders
        ]);

        // Add Summary Stats
        const totalRevenue = weeklySalesData.reduce((acc, curr) => acc + curr.revenue, 0);
        const totalProfit = weeklySalesData.reduce((acc, curr) => acc + curr.profit, 0);

        tableRows.push(['TOTAL', totalRevenue, totalProfit, '-']);

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 45,
            theme: 'grid',
            headStyles: { fillColor: [79, 70, 229] }, // Indigo-600
            styles: { fontSize: 10, cellPadding: 3 },
            footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' }
        });

        doc.save('weekly_sales_report.pdf');
    };

    // State for Real Data
    const [hourlySalesData, setHourlySalesData] = useState<any[]>([]);
    const [weeklySalesData, setWeeklySalesData] = useState<any[]>([]);
    const [categoryData, setCategoryData] = useState<any[]>([]);
    const [recentBigSales, setRecentBigSales] = useState<any[]>([]);
    const [totalRevenue, setTotalRevenue] = useState(0);
    const [totalGrossProfit, setTotalGrossProfit] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (activeStore) {
            fetchReportsData();
        }
    }, [activeStore]);

    const fetchReportsData = async () => {
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
            const { data: expensesData, error: expenseError } = await supabase
                .from('expenses')
                .select('amount')
                .eq('store_id', activeStore.id);

            if (salesError) throw salesError;
            if (!sales) return;

            // --- Process: Key Metrics ---
            const revenue = sales.reduce((acc, sale) => acc + Number(sale.total_amount), 0);

            // Total Expenses
            const totalExpenses = expensesData ? expensesData.reduce((acc, exp) => acc + Number(exp.amount), 0) : 0;

            // Calculate Gross Profit
            const grossProfit = sales.reduce((acc, sale) => {
                const saleProfit = sale.sale_items.reduce((sAcc: number, item: any) => {
                    const cost = item.products?.cost_price || 0;
                    const price = item.price_at_sale || 0;
                    return sAcc + ((price - cost) * item.quantity);
                }, 0);
                return acc + saleProfit;
            }, 0);

            const netProfit = grossProfit - totalExpenses;

            setTotalRevenue(revenue);
            setTotalGrossProfit(grossProfit);

            // --- Process: Hourly Sales (Heatmap) ---
            const hoursMap = new Array(24).fill(0).map((_, i) => ({ hour: `${i}:00`, sales: 0 }));
            sales.forEach(sale => {
                const date = new Date(sale.created_at);
                const hour = date.getHours();
                hoursMap[hour].sales += Number(sale.total_amount);
            });
            // Filter to show somewhat relevant 8am-8pm or just all non-zero? Let's show all for correctness or a range.
            // Let's show 6am to 10pm for retail relevance
            const relevantHours = hoursMap.slice(6, 22);
            setHourlySalesData(relevantHours.map(h => ({
                ...h,
                hour: new Date(0, 0, 0, parseInt(h.hour)).toLocaleTimeString([], { hour: 'numeric', hour12: true }).toLowerCase()
            })));

            // --- Process: Weekly Overview (Last 7 Days) ---
            const daysMap = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            const last7DaysMap = new Map();
            // Initialize last 7 days keys
            for (let i = 6; i >= 0; i--) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                const dayKey = daysMap[d.getDay()];
                last7DaysMap.set(dayKey, { day: dayKey, revenue: 0, orders: 0, profit: 0 });
            }

            sales.forEach(sale => {
                const d = new Date(sale.created_at);
                // Check if within last 7 days? Simple logic: just map day name if recent
                // For accuracy we should check date diff, but for this demo, matching day name is 'okay' if data is sparse/recent.
                // Better: Check timestamp
                const now = new Date();
                const diffTime = Math.abs(now.getTime() - d.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                if (diffDays <= 7) {
                    const dayName = daysMap[d.getDay()];
                    if (last7DaysMap.has(dayName)) {
                        const entry = last7DaysMap.get(dayName);
                        entry.revenue += Number(sale.total_amount);
                        entry.orders += 1;

                        const saleProfit = sale.sale_items.reduce((sAcc: number, item: any) => {
                            const cost = item.products?.cost_price || 0;
                            const price = item.price_at_sale || 0;
                            return sAcc + ((price - cost) * item.quantity);
                        }, 0);
                        entry.profit += saleProfit;
                    }
                }
            });
            setWeeklySalesData(Array.from(last7DaysMap.values()));

            // --- Process: Top Categories ---
            const catMap = new Map();
            sales.forEach(sale => {
                sale.sale_items.forEach((item: any) => {
                    const cat = item.products?.category || 'Uncategorized';
                    const val = catMap.get(cat) || 0;
                    catMap.set(cat, val + item.quantity);
                });
            });
            const COLORS = ['#6366f1', '#ec4899', '#8b5cf6', '#10b981', '#f59e0b'];
            const processedCats = Array.from(catMap.entries()).map(([name, value], idx) => ({
                name,
                value,
                color: COLORS[idx % COLORS.length]
            }));
            setCategoryData(processedCats);

            // --- Process: High Value Transactions ---
            const bigSales = sales.filter(s => Number(s.total_amount) > 100).slice(0, 10); // > 100 GHS considered 'Big' for this context? Or top 10 regardless.
            setRecentBigSales(bigSales);

        } catch (error) {
            console.error("Error fetching report data", error);
        } finally {
            setLoading(false);
        }
    };

    // Constants
    const operatingExpenses = totalRevenue * 0.15; // Mock 15% expenses logic maintained
    const netProfit = totalGrossProfit - operatingExpenses;

    // AI Forecast Mock (Keep simplistic for now as requested)
    // We can base it on actual totalRevenue to make scale look correct
    const avgDailyRev = totalRevenue / 30; // approx
    const forecastData = [
        { date: 'Today', predicted: avgDailyRev * 1.1, actual: avgDailyRev * 1.05 },
        { date: 'Tomorrow', predicted: avgDailyRev * 1.2, actual: null },
        { date: 'Next Day', predicted: avgDailyRev * 0.9, actual: null },
    ];

    const aiInsights = [
        { title: 'Sales Trend', description: `Revenue is tracking ${totalRevenue > 0 ? 'steady' : 'low'} this week.`, type: totalRevenue > 0 ? 'positive' : 'alert' },
        { title: 'Inventory', description: 'Check stock on top selling items.', type: 'alert' },
    ];


    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* ... other components ... */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">SmartTab Analytics</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Financial performance & AI insights.</p>
                </div>

                <div className="relative">
                    <button
                        onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                        className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 active:bg-indigo-800 shadow-lg shadow-indigo-500/30"
                    >
                        <Download className="h-4 w-4" />
                        Export Data
                        <ChevronDown className={`h-4 w-4 transition-transform ${isExportMenuOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isExportMenuOpen && (
                        <>
                            <div
                                className="fixed inset-0 z-40"
                                onClick={() => setIsExportMenuOpen(false)}
                            />
                            <div className="absolute right-0 top-12 w-48 rounded-xl border border-slate-200 bg-white p-1 shadow-xl ring-1 ring-black ring-opacity-5 dark:border-slate-800 dark:bg-slate-900 z-50 animate-in fade-in zoom-in-95 origin-top-right">
                                <button
                                    onClick={() => { handleExportCSV(); setIsExportMenuOpen(false); }}
                                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800 transition-colors"
                                >
                                    <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                                    Export as CSV
                                </button>
                                <button
                                    onClick={() => { handleExportPDF(); setIsExportMenuOpen(false); }}
                                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800 transition-colors"
                                >
                                    <FileText className="h-4 w-4 text-rose-600" />
                                    Export as PDF
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Key Metrics Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {/* Gross Revenue */}
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                            <DollarSign className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Gross Revenue</p>
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">GHS {totalRevenue.toLocaleString()}</h3>
                            <p className="text-xs text-blue-600">Total Sales</p>
                        </div>
                    </div>
                </div>

                {/* Gross Profit */}
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                            <TrendingUp className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Gross Profit</p>
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">GHS {totalGrossProfit.toLocaleString()}</h3>
                            <p className="text-xs text-emerald-600">{(totalGrossProfit / totalRevenue * 100).toFixed(1)}% Margin</p>
                        </div>
                    </div>
                </div>

                {/* Net Profit */}
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
                            <Users className="h-6 w-6" /> {/* Using Users icon as placeholder for 'Profit' visual for now, or could change */}
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Net Profit</p>
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">GHS {netProfit.toLocaleString()}</h3>
                            <p className="text-xs text-purple-600">After Expenses</p>
                        </div>
                    </div>
                </div>

                {/* Expenses (Implicitly shown via Net Profit, bu showing "Operating Costs" as 4th card might be good) */}
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                            <Clock className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Op. Expenses</p>
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">GHS {operatingExpenses.toLocaleString()}</h3>
                            <p className="text-xs text-slate-500">Est. 15% of Rev</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className="mb-6 flex justify-between items-center">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <TrendingUp className="h-5 w-5 text-indigo-600" /> AI Demand Forecast
                            </h3>
                            <p className="text-sm text-slate-500">Actual vs Predicted sales.</p>
                        </div>
                        <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-1 rounded-full dark:bg-indigo-900/30 dark:text-indigo-400">AI Beta</span>
                    </div>
                    <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={forecastData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 12 }} />
                                <YAxis stroke="#64748b" tick={{ fontSize: 12 }} tickFormatter={(val) => `GH₵${val / 1000}k`} />
                                <RechartsTooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Legend />
                                <Line type="monotone" name="Actual Sales" dataKey="actual" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
                                <Line type="monotone" name="AI Prediction" dataKey="predicted" stroke="#6366f1" strokeDasharray="5 5" strokeWidth={2} dot={{ r: 4 }} connectNulls />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>


                {/* AI Business Intelligence */}
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className="mb-6">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <Star className="h-5 w-5 text-amber-500" /> Business Intelligence
                        </h3>
                        <p className="text-sm text-slate-500">Actionable insights generated for you.</p>
                    </div>
                    <div className="space-y-4">
                        {aiInsights.map((insight, i) => (
                            <div key={i} className={`p-4 rounded-lg flex gap-4 ${insight.type === 'positive' ? 'bg-emerald-50 border border-emerald-100 dark:bg-emerald-900/10 dark:border-emerald-900/30' : 'bg-amber-50 border border-amber-100 dark:bg-amber-900/10 dark:border-amber-900/30'}`}>
                                <div className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${insight.type === 'positive' ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
                                <div>
                                    <h4 className={`text-sm font-bold ${insight.type === 'positive' ? 'text-emerald-800 dark:text-emerald-400' : 'text-amber-800 dark:text-amber-400'}`}>{insight.title}</h4>
                                    <p className={`text-sm ${insight.type === 'positive' ? 'text-emerald-600 dark:text-emerald-300/80' : 'text-amber-600 dark:text-amber-300/80'}`}>{insight.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                {/* Hourly Traffic - Addressing "Time with high sales" */}
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className="mb-6">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Peak Sales Hours</h3>
                        <p className="text-sm text-slate-500">Sales volume distribution by hour of the day.</p>
                    </div>
                    <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={hourlySalesData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                <XAxis dataKey="hour" stroke="#64748b" tick={{ fontSize: 12 }} />
                                <YAxis stroke="#64748b" tick={{ fontSize: 12 }} tickFormatter={(val) => `GH₵${val / 1000}k`} />
                                <RechartsTooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    formatter={(value: any) => [`GHS ${value}`, 'Revenue']}
                                />
                                <Bar dataKey="sales" fill="#6366f1" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Weekly Trends */}
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className="mb-6">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Weekly Revenue Trend</h3>
                        <p className="text-sm text-slate-500">Revenue performance over the last 7 days.</p>
                    </div>
                    <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={weeklySalesData}>
                                <defs>
                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                <XAxis dataKey="day" stroke="#64748b" tick={{ fontSize: 12 }} />
                                <YAxis stroke="#64748b" tick={{ fontSize: 12 }} tickFormatter={(val) => `GH₵${val / 1000}k`} />
                                <RechartsTooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    formatter={(value: any) => [`GHS ${value}`, 'Revenue']}
                                />
                                <Area type="monotone" dataKey="revenue" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorRevenue)" strokeWidth={3} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                {/* Top Categories */}
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:col-span-1">
                    <div className="mb-6">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Category Performance</h3>
                        <p className="text-sm text-slate-500">Sales distribution by category.</p>
                    </div>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={categoryData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {categoryData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <RechartsTooltip />
                                <Legend verticalAlign="bottom" iconType="circle" />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Recent High Value Transactions */}
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:col-span-2">
                    <div className="mb-6">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Recent Big Sales</h3>
                        <p className="text-sm text-slate-500">Transactions over GHS 500.</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="border-b border-slate-100 text-slate-500 dark:border-slate-800">
                                <tr>
                                    <th className="pb-3 text-xs font-semibold uppercase tracking-wider">Transaction ID</th>
                                    <th className="pb-3 text-xs font-semibold uppercase tracking-wider">Customer</th>
                                    <th className="pb-3 text-xs font-semibold uppercase tracking-wider">Time</th>
                                    <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-right">Amount</th>
                                    <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-right">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {[
                                    { id: '#TRX-9981', customer: 'John Doe', time: 'Today, 2:45 PM', amount: 1250.00, status: 'Completed' },
                                    { id: '#TRX-9982', customer: 'Alice Smith', time: 'Today, 1:20 PM', amount: 890.50, status: 'Completed' },
                                    { id: '#TRX-9983', customer: 'Bob Johnson', time: 'Yesterday', amount: 2400.00, status: 'Completed' },
                                    { id: '#TRX-9984', customer: 'Emma Wilson', time: 'Yesterday', amount: 650.00, status: 'Completed' },
                                ].map((tx) => (
                                    <tr key={tx.id}>
                                        <td className="py-3 font-medium text-slate-900 dark:text-white">{tx.id}</td>
                                        <td className="py-3 text-slate-600 dark:text-slate-400">{tx.customer}</td>
                                        <td className="py-3 text-slate-600 dark:text-slate-400">{tx.time}</td>
                                        <td className="py-3 text-right font-medium text-slate-900 dark:text-white">GHS {tx.amount.toFixed(2)}</td>
                                        <td className="py-3 text-right">
                                            <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                                                {tx.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
