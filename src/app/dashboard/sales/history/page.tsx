'use client';

import { useState, useEffect } from 'react';
import { Search, Calendar, Filter, ArrowUpRight, ArrowDownRight, Printer, Eye } from 'lucide-react';
import { supabase } from '@/lib/supabase';

// Define Sale Interface
interface Sale {
    id: any;
    total_amount: number;
    payment_method: string;
    status: string;
    created_at: string;
    customers?: { name: string } | null; // Joined table data
}

import { useAuth } from '@/lib/auth-context';

// ... interface ...

export default function SalesHistoryPage() {
    const { activeStore } = useAuth();
    const [sales, setSales] = useState<Sale[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (activeStore?.id) fetchSales();
    }, [activeStore?.id]);

    const fetchSales = async () => {
        if (!activeStore?.id) return;
        const { data, error } = await supabase
            .from('sales')
            .select(`
                *,
                customers (name)
            `)
            .eq('store_id', activeStore.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error(error);
        } else if (data) {
            setSales(data);
        }
    };

    const filteredSales = sales.filter(s =>
        s.id.toString().includes(searchQuery) ||
        s.customers?.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Sales History</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">View and manage past transactions.</p>
                </div>
                <div className="flex gap-2">
                    <button className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                        <Filter className="h-4 w-4" /> Filter
                    </button>
                    <button className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                        <Printer className="h-4 w-4" /> Report
                    </button>
                </div>
            </div>

            <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <Search className="h-5 w-5 text-slate-400" />
                <input
                    type="text"
                    placeholder="Search by ID, customer name..."
                    className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400 dark:text-white"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden dark:border-slate-800 dark:bg-slate-900">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
                            <tr>
                                <th className="px-6 py-4 font-medium">Transaction ID</th>
                                <th className="px-6 py-4 font-medium">Date & Time</th>
                                <th className="px-6 py-4 font-medium">Customer</th>
                                <th className="px-6 py-4 font-medium">Amount</th>
                                <th className="px-6 py-4 font-medium">Payment</th>
                                <th className="px-6 py-4 font-medium">Status</th>
                                <th className="px-6 py-4 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {filteredSales.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                                        No sales records found.
                                    </td>
                                </tr>
                            ) : (
                                filteredSales.map((sale) => (
                                    <tr key={sale.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                        <td className="px-6 py-4 font-mono text-xs text-slate-500">
                                            {sale.id.toString().slice(0, 8)}...
                                        </td>
                                        <td className="px-6 py-4 text-slate-700 dark:text-slate-300">
                                            {new Date(sale.created_at).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-slate-900 font-medium dark:text-white">
                                            {sale.customers?.name || 'Guest'}
                                        </td>
                                        <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">
                                            GHS {sale.total_amount.toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400 capitalize">
                                            {sale.payment_method}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${sale.status === 'Completed' || sale.status === 'completed'
                                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
                                                : 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'
                                                }`}>
                                                {sale.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                                                <Eye className="h-5 w-5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
