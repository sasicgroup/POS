'use client';

import { useState, useEffect, useRef } from 'react';

import { Search, Calendar, Filter, ArrowUpRight, ArrowDownRight, Printer, Eye, X, FileText, ChevronDown, Download, Phone, User as UserIcon, Package, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';

// Define Sale Interface
interface Sale {
    id: any;
    total_amount: number;
    payment_method: string;
    status: string;
    created_at: string;
    customers?: { name: string } | null; // Joined table data
}



export default function SalesHistoryPage() {
    const { activeStore, user } = useAuth();
    const { showToast } = useToast();
    const [sales, setSales] = useState<Sale[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

    // Delete State
    const [deleteConfirmation, setDeleteConfirmation] = useState<Sale | null>(null);

    // View Modal State
    const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
    const [saleItems, setSaleItems] = useState<any[]>([]);
    const [loadingDetails, setLoadingDetails] = useState(false);

    // Filter State
    const [showFilterMenu, setShowFilterMenu] = useState(false);
    const [dateFilter, setDateFilter] = useState('all'); // all, today, week, month

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

    const fetchSaleDetails = async (saleId: string) => {
        setLoadingDetails(true);
        const { data, error } = await supabase
            .from('sale_items')
            .select(`
                *,
                products (name, sku)
            `)
            .eq('sale_id', saleId);

        if (data) setSaleItems(data);
        setLoadingDetails(false);
    };

    const handleViewSale = (sale: Sale) => {
        setSelectedSale(sale);
        fetchSaleDetails(sale.id);
    };

    const handleDeleteSale = async (saleId: string) => {
        // 1. Delete Items first (to be safe if cascade missing)
        await supabase.from('sale_items').delete().eq('sale_id', saleId);

        // 2. Delete Sale
        const { error } = await supabase.from('sales').delete().eq('id', saleId);

        if (error) {
            console.error(error);
            showToast('error', 'Failed to delete record');
        } else {
            setSales(sales.filter(s => s.id !== saleId));
            showToast('success', 'Transaction record deleted permanently');
            setDeleteConfirmation(null);
        }
    };

    const handleExport = () => {
        const headers = ['Transaction ID', 'Date', 'Customer', 'Amount', 'Payment', 'Status'];
        const rows = filteredSales.map(s => [
            s.id,
            new Date(s.created_at).toLocaleDateString(),
            s.customers?.name || 'Guest',
            s.total_amount,
            s.payment_method,
            s.status
        ]);
        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `sales_history_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const filterByDate = (sale: Sale) => {
        if (dateFilter === 'all') return true;
        const d = new Date(sale.created_at);
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        if (dateFilter === 'today') return d >= startOfDay;
        if (dateFilter === 'week') {
            const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
            return d >= startOfWeek;
        }
        if (dateFilter === 'month') {
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            return d >= startOfMonth;
        }
        return true;
    };

    const filteredSales = sales.filter(s =>
        (s.id.toString().includes(searchQuery) ||
            s.customers?.name?.toLowerCase().includes(searchQuery.toLowerCase())) &&
        filterByDate(s)
    );

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Sales History</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">View and manage past transactions.</p>
                </div>
                <div className="flex gap-2 relative">
                    <button
                        onClick={() => setShowFilterMenu(!showFilterMenu)}
                        className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${showFilterMenu ? 'bg-slate-100 border-slate-300 dark:bg-slate-800' : 'bg-white border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'}`}
                    >
                        <Filter className="h-4 w-4" />
                        {dateFilter === 'all' ? 'Filter' : dateFilter.charAt(0).toUpperCase() + dateFilter.slice(1)}
                    </button>

                    {/* Filter Dropdown */}
                    {showFilterMenu && (
                        <>
                            <div className="fixed inset-0 z-10" onClick={() => setShowFilterMenu(false)} />
                            <div className="absolute top-12 right-0 z-20 w-48 rounded-xl border border-slate-200 bg-white p-1 shadow-xl dark:border-slate-800 dark:bg-slate-900">
                                {['all', 'today', 'week', 'month'].map((filter) => (
                                    <button
                                        key={filter}
                                        onClick={() => { setDateFilter(filter); setShowFilterMenu(false); }}
                                        className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm ${dateFilter === filter ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800'}`}
                                    >
                                        <span className="capitalize">{filter === 'all' ? 'All Time' : `This ${filter.charAt(0).toUpperCase() + filter.slice(1)}`}</span>
                                        {dateFilter === filter && <div className="h-1.5 w-1.5 rounded-full bg-current" />}
                                    </button>
                                ))}
                            </div>
                        </>
                    )}

                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                    >
                        <Download className="h-4 w-4" /> Export
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
                                            <button
                                                onClick={() => handleViewSale(sale)}
                                                className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors bg-slate-100 p-2 rounded-full hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-indigo-900/30"
                                                title="View Details"
                                            >
                                                <Eye className="h-4 w-4" />
                                            </button>
                                            {(user?.role === 'owner' || user?.id === 'owner-1') && (
                                                <button
                                                    onClick={() => setDeleteConfirmation(sale)}
                                                    className="text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors bg-slate-100 p-2 rounded-full hover:bg-red-50 dark:bg-slate-800 dark:hover:bg-red-900/30 ml-2"
                                                    title="Delete Record"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            {/* Sale Details Modal */}
            {selectedSale && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200 p-4">
                    <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl overflow-hidden dark:bg-slate-900 max-h-[90vh] flex flex-col">

                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-6 py-4 dark:border-slate-800 dark:bg-slate-800/50">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <FileText className="h-5 w-5 text-indigo-500" />
                                    Transaction Details
                                </h3>
                                <p className="text-xs text-slate-500 font-mono mt-1">ID: {selectedSale.id}</p>
                            </div>
                            <button
                                onClick={() => setSelectedSale(null)}
                                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 overflow-y-auto flex-1">
                            {/* Meta Info Grid */}
                            <div className="grid grid-cols-2 gap-6 mb-8">
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Customer</label>
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 dark:bg-slate-800">
                                                <UserIcon className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-slate-900 dark:text-white">{selectedSale.customers?.name || 'Guest Customer'}</p>
                                                <p className="text-xs text-slate-500">Retail Customer</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Date & Time</label>
                                        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                                            <Calendar className="h-4 w-4" />
                                            {new Date(selectedSale.created_at).toLocaleString()}
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Payment Info</label>
                                        <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 dark:bg-slate-800/50 dark:border-slate-800">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-sm text-slate-600 dark:text-slate-400">Method</span>
                                                <span className="font-semibold capitalize text-slate-900 dark:text-white">{selectedSale.payment_method}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-slate-600 dark:text-slate-400">Status</span>
                                                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 uppercase">
                                                    {selectedSale.status}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Items Table */}
                            <div>
                                <h4 className="font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                                    <Package className="h-4 w-4" /> Items Purchased
                                </h4>
                                <div className="rounded-xl border border-slate-200 overflow-hidden dark:border-slate-700">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-slate-50 text-slate-500 font-medium dark:bg-slate-800 dark:text-slate-400">
                                            <tr>
                                                <th className="px-4 py-3">Product</th>
                                                <th className="px-4 py-3 text-right">Price</th>
                                                <th className="px-4 py-3 text-center">Qty</th>
                                                <th className="px-4 py-3 text-right">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {loadingDetails ? (
                                                <tr><td colSpan={4} className="p-8 text-center text-slate-500">Loading items...</td></tr>
                                            ) : saleItems.map((item, i) => (
                                                <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                                    <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">
                                                        {item.products?.name || 'Unknown Item'}
                                                        <div className="text-xs text-slate-400 font-mono">{item.products?.sku}</div>
                                                    </td>
                                                    <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400">
                                                        GHS {item.price_at_sale.toFixed(2)}
                                                    </td>
                                                    <td className="px-4 py-3 text-center text-slate-600 dark:text-slate-400">
                                                        {item.quantity}
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-medium text-slate-900 dark:text-white">
                                                        GHS {(item.price_at_sale * item.quantity).toFixed(2)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot className="bg-slate-50 font-bold text-slate-900 dark:bg-slate-800 dark:text-white">
                                            <tr>
                                                <td colSpan={3} className="px-4 py-3 text-right">Total Amount</td>
                                                <td className="px-4 py-3 text-right text-indigo-600 dark:text-indigo-400 text-lg">
                                                    GHS {selectedSale.total_amount.toFixed(2)}
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 dark:border-slate-800 dark:bg-slate-800">
                            <button
                                onClick={() => window.print()}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 font-medium transition-colors dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
                            >
                                <Printer className="h-4 w-4" /> Print Receipt
                            </button>
                            <button
                                onClick={() => setSelectedSale(null)}
                                className="px-6 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Delete Confirmation Modal */}
            {deleteConfirmation && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200 p-4">
                    <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
                            <Trash2 className="h-6 w-6 text-red-600 dark:text-red-400" />
                        </div>
                        <h3 className="text-lg font-bold text-center text-slate-900 dark:text-white mb-2">Delete Transaction?</h3>
                        <p className="text-sm text-center text-slate-500 mb-6">
                            Are you sure you want to delete transaction <span className="font-mono font-medium">{deleteConfirmation.id.toString().slice(0, 8)}...</span>? This action cannot be undone.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeleteConfirmation(null)}
                                className="flex-1 rounded-xl bg-slate-100 py-3 font-medium text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleDeleteSale(deleteConfirmation.id)}
                                className="flex-1 rounded-xl bg-red-600 py-3 font-bold text-white hover:bg-red-700"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
