'use client';

import { useState, useEffect, useRef } from 'react';

import { Search, Calendar, Filter, ArrowUpRight, ArrowDownRight, Printer, Eye, X, FileText, ChevronDown, Download, Phone, User as UserIcon, Package, Trash2, Undo2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

// Define Sale Interface
// Update Sale Interface
interface Sale {
    id: any;
    total_amount: number;
    payment_method: string;
    status: string;
    created_at: string;
    customers?: { name: string } | null;
    employees?: { name: string } | null; // Added
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

    // Refund State
    const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
    const [refundItems, setRefundItems] = useState<{ [key: string]: number }>({});
    const [refundReason, setRefundReason] = useState('Customer Return');
    const [refundMethod, setRefundMethod] = useState('cash');

    const handleProcessRefund = async () => {
        if (!selectedSale || !activeStore) return;

        // Items with refund Qty > 0
        const itemsToReturn = saleItems.filter(item => (refundItems[item.id] || 0) > 0);
        if (itemsToReturn.length === 0) {
            showToast('error', 'Please select items to refund');
            return;
        }

        const refundAmount = itemsToReturn.reduce((acc, item) => acc + (item.price_at_sale * (refundItems[item.id] || 0)), 0);

        try {
            // 1. Create Return Record
            const { data: returnData, error: returnError } = await supabase.from('returns').insert({
                store_id: activeStore.id,
                original_sale_id: selectedSale.id,
                reason: refundReason,
                refund_amount: refundAmount,
                refund_method: refundMethod,
                status: 'completed',
                processed_by: user?.id
            }).select().single();

            if (returnError) throw returnError;

            // 2. Add Return Items & Restore Stock
            for (const item of itemsToReturn) {
                const qty = refundItems[item.id];

                // Add to return_items
                await supabase.from('return_items').insert({
                    return_id: returnData.id,
                    product_id: item.product_id,
                    quantity: qty,
                    condition: 'sellable'
                });

                // Restore Stock
                const { error: stockError } = await supabase.rpc('increment_stock', {
                    row_id: item.product_id,
                    quantity: qty
                });

                // Fallback for stock update
                if (stockError) {
                    const { data: prod } = await supabase.from('products').select('stock').eq('id', item.product_id).single();
                    if (prod) {
                        await supabase.from('products').update({ stock: prod.stock + qty }).eq('id', item.product_id);
                    }
                }

                // Deduct points using existing logic (simplified)
                if (selectedSale.customers) {
                    // Logic to deduct points for returned value if needed. Omitted for now to keep simple.
                }
            }

            // 3. Update Sale Status
            await supabase.from('sales').update({ status: 'Refunded' }).eq('id', selectedSale.id);

            showToast('success', `Refund processed: GHS ${refundAmount.toFixed(2)}`);
            setIsRefundModalOpen(false);
            setSelectedSale(null);
            setRefundItems({});
            fetchSales();

        } catch (e) {
            console.error(e);
            showToast('error', 'Refund failed');
        }
    };

    useEffect(() => {
        if (activeStore?.id) fetchSales();
    }, [activeStore?.id]);

    const fetchSales = async () => {
        if (!activeStore?.id) return;
        const { data, error } = await supabase
            .from('sales')
            .select(`
                *,
                customers (name),
                employees (name)
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
        // 0. Fetch Sale Details for Points Reversal
        const { data: saleToDelete } = await supabase.from('sales').select('*, customers(id, points)').eq('id', saleId).single();

        if (saleToDelete && saleToDelete.customer_id) {
            // Calculate points to revoke (1 Point = 1 GHS approx, or just use 1:1 rule)
            const pointsToRevoke = Math.floor(saleToDelete.total_amount);

            if (pointsToRevoke > 0) {
                // Deduct points from customer
                const { error: pointsError } = await supabase.rpc('decrement_points', {
                    row_id: saleToDelete.customer_id,
                    amount: pointsToRevoke
                });

                // Fallback if RPC fails or not exists, do manual update
                if (pointsError) {
                    // Fetch current points
                    const { data: customer } = await supabase.from('customers').select('points').eq('id', saleToDelete.customer_id).single();
                    if (customer) {
                        const newPoints = Math.max(0, (customer.points || 0) - pointsToRevoke);
                        await supabase.from('customers').update({ points: newPoints }).eq('id', saleToDelete.customer_id);
                    }
                }

                // Log Loyalty Reversal
                await supabase.from('loyalty_logs').insert({
                    customer_id: saleToDelete.customer_id,
                    points: -pointsToRevoke,
                    type: 'revoked', // or 'refund'
                    description: `Transaction #${saleId.slice(0, 6)} deleted`
                });
            }
        }

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
        const headers = ['Transaction ID', 'Date', 'Customer', 'Sold By', 'Amount', 'Payment', 'Status'];
        const rows = filteredSales.map(s => [
            s.id,
            new Date(s.created_at).toLocaleDateString(),
            s.customers?.name || 'Guest',
            s.employees?.name || 'Unknown', // Added
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

        // Helper to subtract days
        const subDays = (days: number) => {
            const date = new Date();
            date.setDate(date.getDate() - days);
            return date;
        };

        // Helper to subtract months
        const subMonths = (months: number) => {
            const date = new Date();
            date.setMonth(date.getMonth() - months);
            return date;
        };

        if (dateFilter === '1d') return d >= new Date(now.setHours(0, 0, 0, 0));
        if (dateFilter === '7d') return d >= subDays(7);
        if (dateFilter === '1m') return d >= subMonths(1);
        if (dateFilter === '3m') return d >= subMonths(3);
        if (dateFilter === '6m') return d >= subMonths(6);
        if (dateFilter === '1y') return d >= subMonths(12);

        return true;
    };

    const filteredSales = sales.filter(s =>
        (s.id.toString().includes(searchQuery) ||
            s.customers?.name?.toLowerCase().includes(searchQuery.toLowerCase())) &&
        filterByDate(s)
    );

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* ... Header ... */}
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
                                {['all', '1d', '7d', '1m', '3m', '6m', '1y'].map((filter) => (
                                    <button
                                        key={filter}
                                        onClick={() => { setDateFilter(filter); setShowFilterMenu(false); }}
                                        className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm ${dateFilter === filter ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800'}`}
                                    >
                                        <span className="capitalize">
                                            {filter === 'all' ? 'All Time' :
                                                filter === '1d' ? 'Today' :
                                                    filter === '7d' ? 'Last 7 Days' :
                                                        filter === '1m' ? 'Last 30 Days' :
                                                            filter === '3m' ? 'Last 3 Months' :
                                                                filter === '6m' ? 'Last 6 Months' : 'Last Year'}
                                        </span>
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
                    placeholder="Search by ID, customer, employee..."
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
                                <th className="px-6 py-4 font-medium">Sold By</th>
                                <th className="px-6 py-4 font-medium">Amount</th>
                                <th className="px-6 py-4 font-medium">Payment</th>
                                <th className="px-6 py-4 font-medium">Status</th>
                                <th className="px-6 py-4 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {filteredSales.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-8 text-center text-slate-500">
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
                                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-xs font-bold dark:bg-indigo-900/30 dark:text-indigo-400">
                                                    {(sale.employees?.name || 'U').charAt(0)}
                                                </div>
                                                {sale.employees?.name || 'Unknown'}
                                            </div>
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
                            {selectedSale.status !== 'Refunded' && selectedSale.status !== 'Returned' && (
                                <button
                                    onClick={() => setIsRefundModalOpen(true)}
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 font-medium transition-colors dark:bg-red-900/20 dark:border-red-800 dark:text-red-400"
                                >
                                    <Undo2 className="h-4 w-4" /> Refund
                                </button>
                            )}
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

            {/* Delete Standardized Modal */}
            <ConfirmDialog
                isOpen={!!deleteConfirmation}
                onClose={() => setDeleteConfirmation(null)}
                onConfirm={() => {
                    if (deleteConfirmation) {
                        handleDeleteSale(deleteConfirmation.id);
                    }
                }}
                title="Delete Transaction?"
                description={`Are you sure you want to delete transaction ${deleteConfirmation?.id.toString().slice(0, 8)}...? This will also revoke any points earned from this sale.`}
                confirmText="Delete Permanently"
                variant="danger"
            />


            {/* Refund Modal */}
            {isRefundModalOpen && selectedSale && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200 p-4">
                    <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Process Refund</h3>
                        <div className="space-y-4 max-h-[60vh] overflow-y-auto mb-4">
                            <table className="w-full text-sm">
                                <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-800">
                                    <tr>
                                        <th className="p-2 text-left">Item</th>
                                        <th className="p-2 text-center">Sold</th>
                                        <th className="p-2 text-cente">Return</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {saleItems.map(item => (
                                        <tr key={item.id} className="border-b border-slate-100 dark:border-slate-800">
                                            <td className="p-2 font-medium">{item.products?.name}</td>
                                            <td className="p-2 text-center">{item.quantity}</td>
                                            <td className="p-2 text-center">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max={item.quantity}
                                                    className="w-16 p-1 border rounded text-center dark:bg-slate-800 dark:border-slate-700"
                                                    value={refundItems[item.id] || 0}
                                                    onChange={(e) => {
                                                        const val = Math.min(item.quantity, Math.max(0, parseInt(e.target.value) || 0));
                                                        setRefundItems({ ...refundItems, [item.id]: val });
                                                    }}
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            <div>
                                <label className="block text-sm font-medium mb-1">Reason</label>
                                <select
                                    className="w-full p-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                                    value={refundReason}
                                    onChange={(e) => setRefundReason(e.target.value)}
                                >
                                    <option>Customer Return</option>
                                    <option>Defective/Damaged</option>
                                    <option>Mistake in Order</option>
                                    <option>Other</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                            <button onClick={() => setIsRefundModalOpen(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg">Cancel</button>
                            <button onClick={handleProcessRefund} className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg font-bold">Confirm Refund</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
