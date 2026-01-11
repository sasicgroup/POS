'use client';

import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { useState, useEffect } from 'react';
import {
    Receipt,
    Plus,
    Trash2,
    Calendar,
    Search,
    Filter,
    ArrowUpRight,
    ArrowDownRight,
    DollarSign,
    MoreHorizontal,
    TrendingUp
} from 'lucide-react';

export default function IncomeExpensesPage() {
    const { activeStore } = useAuth();
    const [expenses, setExpenses] = useState<any[]>([]);
    const [sales, setSales] = useState<any[]>([]);
    const [otherIncomeList, setOtherIncomeList] = useState<any[]>([]);
    const [salesIncome, setSalesIncome] = useState(0); // Gross Profit from Sales
    const [loading, setLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [modalType, setModalType] = useState<'expense' | 'income'>('expense');
    const [searchQuery, setSearchQuery] = useState('');
    const [view, setView] = useState<'expenses' | 'income' | 'other_income'>('expenses');

    // Form State
    const [formData, setFormData] = useState({
        category: '',
        amount: '',
        description: '',
        date: new Date().toISOString().split('T')[0]
    });

    const EXPENSE_CATEGORIES = ['Rent', 'Utilities', 'Salary', 'Maintenance', 'Inventory', 'Marketing', 'Other'];
    const INCOME_SOURCES = ['Service Revenue', 'Consultation', 'Delivery Fees', 'Investment', 'Tips', 'Refund', 'Other'];

    useEffect(() => {
        if (activeStore?.id) {
            fetchData();
        }
    }, [activeStore]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // 1. Fetch Expenses
            const { data: expensesData } = await supabase
                .from('expenses')
                .select('*')
                .eq('store_id', activeStore?.id)
                .order('date', { ascending: false });

            if (expensesData) setExpenses(expensesData);

            // 2. Fetch Sales & Calculate Sales Income (Gross Profit)
            const { data: salesData } = await supabase
                .from('sales')
                .select(`
                    id,
                    created_at,
                    total_amount,
                    payment_method,
                    sale_items (
                        quantity,
                        price_at_sale,
                        product:products ( cost_price, name )
                    )
                `)
                .eq('store_id', activeStore?.id)
                .order('created_at', { ascending: false });

            if (salesData) {
                let totalProfit = 0;
                const processedSales = salesData.map((sale: any) => {
                    let saleProfit = 0;
                    sale.sale_items?.forEach((item: any) => {
                        const quantity = item.quantity || 0;
                        const sellingPrice = item.price_at_sale || 0;
                        const costPrice = item.product?.cost_price || 0;
                        saleProfit += (sellingPrice - costPrice) * quantity;
                    });
                    totalProfit += saleProfit;
                    return { ...sale, profit: saleProfit };
                });
                setSales(processedSales);
                setSalesIncome(totalProfit);
            }

            // 3. Fetch Other Income
            const { data: incomeData } = await supabase
                .from('other_income')
                .select('*')
                .eq('store_id', activeStore?.id)
                .order('date', { ascending: false });

            if (incomeData) setOtherIncomeList(incomeData);

        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!activeStore) return;
        if (!formData.amount || !formData.category) return;

        const table = modalType === 'expense' ? 'expenses' : 'other_income';
        const payload = {
            store_id: activeStore.id,
            [modalType === 'expense' ? 'category' : 'source']: formData.category,
            amount: parseFloat(formData.amount),
            description: formData.description,
            date: formData.date
        };

        const { error } = await supabase.from(table).insert(payload);

        if (!error) {
            setIsAddModalOpen(false);
            setFormData({
                category: '',
                amount: '',
                description: '',
                date: new Date().toISOString().split('T')[0]
            });
            fetchData();
        } else {
            alert(`Failed to add ${modalType}`);
        }
    };

    const handleDelete = async (id: string, type: 'expense' | 'income') => {
        if (!confirm('Are you sure you want to delete this record?')) return;
        const table = type === 'expense' ? 'expenses' : 'other_income';
        const { error } = await supabase.from(table).delete().eq('id', id);
        if (!error) {
            if (type === 'expense') setExpenses(prev => prev.filter(e => e.id !== id));
            else setOtherIncomeList(prev => prev.filter(i => i.id !== id));
        }
    };

    const filteredExpenses = expenses.filter(e =>
        e.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.category.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredSales = sales.filter(s =>
        s.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.payment_method.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredOtherIncome = otherIncomeList.filter(i =>
        i.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        i.source.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const totalExpenses = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const totalOtherIncome = otherIncomeList.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
    const totalGrossIncome = salesIncome + totalOtherIncome;
    const netProfit = totalGrossIncome - totalExpenses;

    const openAddModal = (type: 'expense' | 'income') => {
        setModalType(type);
        setFormData({ ...formData, category: type === 'expense' ? 'Rent' : 'Service Revenue' });
        setIsAddModalOpen(true);
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Income & Expenses</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Track profits, sales, and operational costs.</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => openAddModal('income')}
                        className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 active:bg-emerald-800 shadow-lg shadow-emerald-500/30"
                    >
                        <Plus className="h-4 w-4" />
                        Add Income
                    </button>
                    <button
                        onClick={() => openAddModal('expense')}
                        className="flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-rose-700 active:bg-rose-800 shadow-lg shadow-rose-500/30"
                    >
                        <Plus className="h-4 w-4" />
                        Add Expense
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid gap-4 sm:grid-cols-3">
                {/* Total Income Card */}
                <div onClick={() => setView('income')} className={`cursor-pointer transition-all rounded-xl border p-6 ${view === 'income' || view === 'other_income' ? 'ring-2 ring-emerald-500 bg-emerald-50 dark:bg-emerald-900/30' : 'border-emerald-100 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-900/20'}`}>
                    <div className="flex items-center gap-4">
                        <div className="rounded-full bg-emerald-100 p-3 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400">
                            <TrendingUp className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Total Income (Profit + Other)</p>
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                                {activeStore?.currency} {totalGrossIncome.toFixed(2)}
                            </h3>
                            <p className="text-xs text-emerald-600/70 mt-1">Sales: {salesIncome.toFixed(2)} | Other: {totalOtherIncome.toFixed(2)}</p>
                        </div>
                    </div>
                </div>

                {/* Expenses Card */}
                <div onClick={() => setView('expenses')} className={`cursor-pointer transition-all rounded-xl border p-6 ${view === 'expenses' ? 'ring-2 ring-rose-500 bg-rose-50 dark:bg-rose-900/30' : 'border-rose-100 bg-rose-50 dark:border-rose-900/50 dark:bg-rose-900/20'}`}>
                    <div className="flex items-center gap-4">
                        <div className="rounded-full bg-rose-100 p-3 text-rose-600 dark:bg-rose-900/50 dark:text-rose-400">
                            <ArrowDownRight className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-rose-600 dark:text-rose-400">Total Expenses</p>
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                                {activeStore?.currency} {totalExpenses.toFixed(2)}
                            </h3>
                        </div>
                    </div>
                </div>

                {/* Net Profit Card */}
                <div className={`rounded-xl border p-6 ${netProfit >= 0
                    ? 'border-indigo-100 bg-indigo-50 dark:border-indigo-900/50 dark:bg-indigo-900/20'
                    : 'border-orange-100 bg-orange-50 dark:border-orange-900/50 dark:bg-orange-900/20'}`}>
                    <div className="flex items-center gap-4">
                        <div className={`rounded-full p-3 ${netProfit >= 0
                            ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400'
                            : 'bg-orange-100 text-orange-600 dark:bg-orange-900/50 dark:text-orange-400'}`}>
                            <DollarSign className="h-6 w-6" />
                        </div>
                        <div>
                            <p className={`text-sm font-medium ${netProfit >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-orange-600 dark:text-orange-400'}`}>
                                Net Profit
                            </p>
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                                {activeStore?.currency} {netProfit.toFixed(2)}
                            </h3>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex flex-col sm:flex-row items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800 gap-4">
                    <div className="flex gap-4 overflow-x-auto w-full sm:w-auto">
                        <button onClick={() => setView('expenses')} className={`pb-2 text-sm font-medium transition-colors whitespace-nowrap ${view === 'expenses' ? 'border-b-2 border-rose-600 text-rose-600 dark:text-rose-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}>Expenses</button>
                        <button onClick={() => setView('income')} className={`pb-2 text-sm font-medium transition-colors whitespace-nowrap ${view === 'income' ? 'border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}>Sales Revenue</button>
                        <button onClick={() => setView('other_income')} className={`pb-2 text-sm font-medium transition-colors whitespace-nowrap ${view === 'other_income' ? 'border-b-2 border-emerald-600 text-emerald-600 dark:text-emerald-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}>Other Income</button>
                    </div>
                    <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-800 w-full sm:w-auto">
                        <Search className="h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-transparent text-sm outline-none placeholder:text-slate-400 dark:text-slate-200 w-full sm:w-48"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    {/* EXPENSES TABLE */}
                    {view === 'expenses' && (
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
                                <tr>
                                    <th className="px-6 py-3 font-medium">Date</th>
                                    <th className="px-6 py-3 font-medium">Category</th>
                                    <th className="px-6 py-3 font-medium">Description</th>
                                    <th className="px-6 py-3 font-medium text-right">Amount</th>
                                    <th className="px-6 py-3 font-medium text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                {loading ? <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">Loading data...</td></tr> :
                                    filteredExpenses.length === 0 ? <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">No expenses found.</td></tr> :
                                        filteredExpenses.map((expense) => (
                                            <tr key={expense.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                                <td className="px-6 py-4 dark:text-slate-300">{new Date(expense.date).toLocaleDateString()}</td>
                                                <td className="px-6 py-4"><span className="inline-flex items-center rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-medium text-rose-700 dark:bg-rose-900/20 dark:text-rose-300">{expense.category}</span></td>
                                                <td className="px-6 py-4 dark:text-slate-300">{expense.description || '-'}</td>
                                                <td className="px-6 py-4 text-right font-medium text-rose-600 dark:text-rose-400">-{activeStore?.currency} {Number(expense.amount).toFixed(2)}</td>
                                                <td className="px-6 py-4 text-right">
                                                    <button onClick={() => handleDelete(expense.id, 'expense')} className="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-rose-600 transition-all"><Trash2 className="h-4 w-4" /></button>
                                                </td>
                                            </tr>
                                        ))}
                            </tbody>
                        </table>
                    )}

                    {/* SALES REVENUE TABLE */}
                    {view === 'income' && (
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
                                <tr>
                                    <th className="px-6 py-3 font-medium">Date & Time</th>
                                    <th className="px-6 py-3 font-medium">Payment</th>
                                    <th className="px-6 py-3 font-medium">Items</th>
                                    <th className="px-6 py-3 font-medium text-right">Revenue</th>
                                    <th className="px-6 py-3 font-medium text-right">Profit</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                {loading ? <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">Loading data...</td></tr> :
                                    filteredSales.length === 0 ? <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">No sales found.</td></tr> :
                                        filteredSales.map((sale) => (
                                            <tr key={sale.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                                <td className="px-6 py-4 dark:text-slate-300">
                                                    <div className="flex flex-col">
                                                        <span>{new Date(sale.created_at).toLocaleDateString()}</span>
                                                        <span className="text-xs text-slate-500">{new Date(sale.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4"><span className="capitalize inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">{sale.payment_method}</span></td>
                                                <td className="px-6 py-4 dark:text-slate-300"><div className="text-xs max-w-[200px] truncate" title={sale.sale_items?.map((i: any) => `${i.quantity}x ${i.product?.name}`).join(', ')}>{sale.sale_items?.length || 0} items</div></td>
                                                <td className="px-6 py-4 text-right font-medium text-slate-900 dark:text-white">{activeStore?.currency} {Number(sale.total_amount).toFixed(2)}</td>
                                                <td className="px-6 py-4 text-right font-medium text-emerald-600 dark:text-emerald-400">+{activeStore?.currency} {Number(sale.profit).toFixed(2)}</td>
                                            </tr>
                                        ))}
                            </tbody>
                        </table>
                    )}

                    {/* OTHER INCOME TABLE */}
                    {view === 'other_income' && (
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
                                <tr>
                                    <th className="px-6 py-3 font-medium">Date</th>
                                    <th className="px-6 py-3 font-medium">Source</th>
                                    <th className="px-6 py-3 font-medium">Description</th>
                                    <th className="px-6 py-3 font-medium text-right">Amount</th>
                                    <th className="px-6 py-3 font-medium text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                {loading ? <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">Loading data...</td></tr> :
                                    filteredOtherIncome.length === 0 ? <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">No other income records found.</td></tr> :
                                        filteredOtherIncome.map((income) => (
                                            <tr key={income.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                                <td className="px-6 py-4 dark:text-slate-300">{new Date(income.date).toLocaleDateString()}</td>
                                                <td className="px-6 py-4"><span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">{income.source}</span></td>
                                                <td className="px-6 py-4 dark:text-slate-300">{income.description || '-'}</td>
                                                <td className="px-6 py-4 text-right font-medium text-emerald-600 dark:text-emerald-400">+{activeStore?.currency} {Number(income.amount).toFixed(2)}</td>
                                                <td className="px-6 py-4 text-right">
                                                    <button onClick={() => handleDelete(income.id, 'income')} className="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-emerald-600 transition-all"><Trash2 className="h-4 w-4" /></button>
                                                </td>
                                            </tr>
                                        ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Add Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900 animate-in zoom-in-95 duration-200">
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
                            {modalType === 'expense' ? 'Add New Expense' : 'Add Other Income'}
                        </h2>
                        <div className="space-y-4">
                            <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Date</label>
                                <input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-indigo-500" />
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">{modalType === 'expense' ? 'Category' : 'Source'}</label>
                                <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-indigo-500">
                                    {modalType === 'expense'
                                        ? EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)
                                        : INCOME_SOURCES.map(c => <option key={c} value={c}>{c}</option>)
                                    }
                                </select>
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Amount</label>
                                <input type="number" placeholder="0.00" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-indigo-500" />
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Description</label>
                                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-indigo-500" rows={3} />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button onClick={() => setIsAddModalOpen(false)} className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">Cancel</button>
                                <button onClick={handleSave} className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium text-white ${modalType === 'expense' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
                                    Save {modalType === 'expense' ? 'Expense' : 'Income'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
