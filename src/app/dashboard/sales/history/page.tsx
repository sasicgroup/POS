'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Search, Filter, Calendar, TrendingUp, Download, Eye, ChevronRight, ArrowUpRight, ArrowDownRight, CreditCard, Banknote, Smartphone, Receipt, X } from 'lucide-react';
import { useState } from 'react';

export default function SalesHistoryPage() {
    const { activeStore } = useAuth();
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [dateFilter, setDateFilter] = useState('all');
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState<any | null>(null);

    // Mock Sales Data
    const transactions = [
        { id: 'TRX-1092', date: '2026-01-06 14:30', customer: 'John Doe', items: 3, total: 450.00, method: 'MoMo', status: 'Completed' },
        { id: 'TRX-1091', date: '2026-01-06 12:15', customer: 'Guest', items: 1, total: 85.00, method: 'Cash', status: 'Completed' },
        { id: 'TRX-1090', date: '2026-01-05 18:45', customer: 'Sarah Smith', items: 5, total: 1250.50, method: 'MoMo', status: 'Completed' },
        { id: 'TRX-1089', date: '2026-01-05 16:20', customer: 'Guest', items: 2, total: 120.00, method: 'Cash', status: 'Refunded' },
        { id: 'TRX-1088', date: '2026-01-05 10:00', customer: 'Mike Jones', items: 8, total: 2400.00, method: 'MoMo', status: 'Completed' },
        { id: 'TRX-1087', date: '2026-01-04 15:30', customer: 'Guest', items: 1, total: 45.00, method: 'Cash', status: 'Completed' },
        { id: 'TRX-1086', date: '2026-01-04 09:15', customer: 'Emma Wilson', items: 4, total: 560.00, method: 'MoMo', status: 'Completed' },
    ];

    if (!activeStore) return null;

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Completed': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
            case 'Refunded': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
            case 'Pending': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
            default: return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400';
        }
    };

    const getMethodIcon = (method: string) => {
        switch (method) {
            case 'MoMo': return <Smartphone className="h-4 w-4" />;
            case 'Cash': return <Banknote className="h-4 w-4" />;
            default: return <CreditCard className="h-4 w-4" />;
        }
    };

    const handleExport = () => {
        const headers = ['Transaction ID', 'Date', 'Customer', 'Items', 'Total', 'Method', 'Status'];
        const rows = transactions.map(t => [t.id, t.date, t.customer, t.items, t.total, t.method, t.status]);

        let csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(",") + "\n"
            + rows.map(e => e.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `sales_history_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleAnalytics = () => {
        router.push('/dashboard/reports');
    };

    const handlePrintReceipt = (trx: any) => {
        const printWindow = window.open('', '_blank', 'width=400,height=600');
        if (!printWindow) return;

        const html = `
            <html>
                <head>
                    <title>Receipt - ${trx.id}</title>
                    <style>
                        body { font-family: 'Courier New', monospace; padding: 20px; font-size: 12px; }
                        .header { text-align: center; margin-bottom: 20px; border-bottom: 1px dashed #000; padding-bottom: 10px; }
                        .item { display: flex; justify-content: space-between; margin-bottom: 5px; }
                        .total { border-top: 1px dashed #000; margin-top: 10px; padding-top: 10px; font-weight: bold; }
                        .footer { margin-top: 20px; text-align: center; font-size: 10px; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h2 style="margin: 0;">${activeStore.name}</h2>
                        <p>Sales Receipt</p>
                        <p>${trx.date}</p>
                        <p>${trx.id}</p>
                    </div>
                    <div>
                        <div class="item">
                            <span>Sold to:</span>
                            <span>${trx.customer}</span>
                        </div>
                        <div class="item">
                            <span>Items Qty:</span>
                            <span>${trx.items}</span>
                        </div>
                        <div class="item">
                            <span>Payment:</span>
                            <span>${trx.method}</span>
                        </div>
                    </div>
                    <div class="item total">
                        <span>TOTAL</span>
                        <span>GHS ${trx.total.toFixed(2)}</span>
                    </div>
                    <div class="footer">
                        <p>Thank you for your business!</p>
                    </div>
                    <script>
                        window.print();
                        window.close();
                    </script>
                </body>
            </html>
        `;
        printWindow.document.write(html);
        printWindow.document.close();
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Sales History</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">View and manage past transactions.</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    >
                        <Download className="h-4 w-4" />
                        Export
                    </button>
                    <button
                        onClick={handleAnalytics}
                        className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
                    >
                        <TrendingUp className="h-4 w-4" />
                        Analytics
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by Transaction ID, Customer..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-10 pr-4 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        />
                    </div>
                    <div className="flex gap-3">
                        <select
                            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value)}
                        >
                            <option value="all">All Dates</option>
                            <option value="today">Today</option>
                            <option value="yesterday">Yesterday</option>
                            <option value="week">This Week</option>
                            <option value="month">This Month</option>
                        </select>
                        <button
                            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                            className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${showAdvancedFilters ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900/30 dark:border-indigo-800 dark:text-indigo-400' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}
                        >
                            <Filter className="h-4 w-4" />
                            Filter
                        </button>
                    </div>
                </div>

                {/* Advanced Filters Section */}
                {showAdvancedFilters && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800 animate-in slide-in-from-top-2">
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Status</label>
                            <select className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                                <option value="">All Statuses</option>
                                <option value="completed">Completed</option>
                                <option value="pending">Pending</option>
                                <option value="refunded">Refunded</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Payment Method</label>
                            <select className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                                <option value="">All Methods</option>
                                <option value="cash">Cash</option>
                                <option value="momo">Mobile Money</option>
                                <option value="card">Card</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Amount Range</label>
                            <div className="flex gap-2">
                                <input type="number" placeholder="Min" className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
                                <input type="number" placeholder="Max" className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Table */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden dark:border-slate-800 dark:bg-slate-900">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
                            <tr>
                                <th className="px-6 py-4 font-medium">Transaction ID</th>
                                <th className="px-6 py-4 font-medium">Date & Time</th>
                                <th className="px-6 py-4 font-medium">Customer</th>
                                <th className="px-6 py-4 font-medium">Items</th>
                                <th className="px-6 py-4 font-medium">Total</th>
                                <th className="px-6 py-4 font-medium">Method</th>
                                <th className="px-6 py-4 font-medium">Status</th>
                                <th className="px-6 py-4 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                            {transactions.map((trx) => (
                                <tr key={trx.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                                        {trx.id}
                                    </td>
                                    <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="h-3 w-3" />
                                            {trx.date}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-700 dark:text-slate-300">
                                        {trx.customer}
                                    </td>
                                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                                        {trx.items} items
                                    </td>
                                    <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">
                                        GHS {trx.total.toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                                            {getMethodIcon(trx.method)}
                                            {trx.method}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(trx.status)}`}>
                                            {trx.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => setSelectedTransaction(trx)}
                                                className="rounded p-2 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 transition-colors dark:hover:bg-slate-800 dark:hover:text-indigo-400"
                                                title="View Details"
                                            >
                                                <Eye className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => handlePrintReceipt(trx)}
                                                className="rounded p-2 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 transition-colors dark:hover:bg-slate-800 dark:hover:text-indigo-400"
                                                title="Print Receipt"
                                            >
                                                <Receipt className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Transaction Details Modal */}
            {selectedTransaction && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
                    <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 animate-in zoom-in-95">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Transaction Details</h2>
                            <button onClick={() => setSelectedTransaction(null)} className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-slate-800">
                                <X className="h-5 w-5 text-slate-500" />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div className="flex justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
                                <span className="text-slate-500">Transaction ID</span>
                                <span className="font-medium text-slate-900 dark:text-white">{selectedTransaction.id}</span>
                            </div>
                            <div className="flex justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
                                <span className="text-slate-500">Date</span>
                                <span className="font-medium text-slate-900 dark:text-white">{selectedTransaction.date}</span>
                            </div>
                            <div className="flex justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
                                <span className="text-slate-500">Customer</span>
                                <span className="font-medium text-slate-900 dark:text-white">{selectedTransaction.customer}</span>
                            </div>
                            <div className="flex justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
                                <span className="text-slate-500">Payment Method</span>
                                <span className="font-medium text-slate-900 dark:text-white">{selectedTransaction.method}</span>
                            </div>
                            <div className="flex justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
                                <span className="text-slate-500">Status</span>
                                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(selectedTransaction.status)}`}>
                                    {selectedTransaction.status}
                                </span>
                            </div>
                            <div className="flex justify-between pt-2">
                                <span className="text-lg font-bold text-slate-900 dark:text-white">Total Amount</span>
                                <span className="text-lg font-bold text-indigo-600">GHS {selectedTransaction.total.toFixed(2)}</span>
                            </div>
                        </div>
                        <div className="mt-8 flex gap-3">
                            <button
                                onClick={() => handlePrintReceipt(selectedTransaction)}
                                className="flex-1 rounded-lg bg-indigo-600 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
                            >
                                Re-print Receipt
                            </button>
                            <button
                                onClick={() => setSelectedTransaction(null)}
                                className="flex-1 rounded-lg border border-slate-200 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
