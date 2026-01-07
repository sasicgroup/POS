'use client';

import { useAuth } from '@/lib/auth-context';
import { Search, Filter, Plus, MoreHorizontal, Mail, Phone, ShoppingBag, Clock, Star, Sparkles, Award, Trash2, Edit, X, Save, Eye, ChevronDown, ChevronUp } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function CustomersPage() {
    const { activeStore } = useAuth();
    const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<any | null>(null);
    const [selectedHistoryCustomer, setSelectedHistoryCustomer] = useState<any | null>(null);
    const [showAllHistory, setShowAllHistory] = useState(false);
    const [newCustomer, setNewCustomer] = useState({
        name: '',
        phone: '',
        email: '',
        notes: ''
    });

    if (!activeStore) return null;

    // Mock Tiers (In real app, fetch from context or API)
    const getTier = (points: number) => {
        if (points >= 5000) return { name: 'Gold', color: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800' };
        if (points >= 1000) return { name: 'Silver', color: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700' };
        return { name: 'Bronze', color: 'bg-orange-50 text-orange-800 border-orange-100 dark:bg-orange-900/10 dark:text-orange-400 dark:border-orange-900/50' };
    };

    const [customers, setCustomers] = useState([
        {
            id: 1,
            name: 'Emma Thompson',
            phone: '0244123456',
            totalSpent: 1250.50,
            orders: 12,
            lastVisit: '2 days ago',
            points: 1250,
            avatar: 'https://ui-avatars.com/api/?name=Emma+Thompson&background=random'
        },
        {
            id: 2,
            name: 'James Wilson',
            phone: '0501234567',
            totalSpent: 450.00,
            orders: 4,
            lastVisit: '1 week ago',
            points: 450,
            avatar: 'https://ui-avatars.com/api/?name=James+Wilson&background=random'
        },
        {
            id: 3,
            name: 'Sophia Martinez',
            phone: '0204567890',
            totalSpent: 89.99,
            orders: 1,
            lastVisit: '3 weeks ago',
            points: 90,
            avatar: 'https://ui-avatars.com/api/?name=Sophia+Martinez&background=random'
        },
        {
            id: 4,
            name: 'Oliver Brown',
            phone: '0555000000',
            totalSpent: 5200.00,
            orders: 25,
            lastVisit: 'Yesterday',
            points: 5200,
            avatar: 'https://ui-avatars.com/api/?name=Oliver+Brown&background=random'
        },
        {
            id: 5,
            name: 'Lucas Anderson',
            phone: '0277987123',
            totalSpent: 0.00,
            orders: 0,
            lastVisit: 'Never',
            points: 0,
            avatar: 'https://ui-avatars.com/api/?name=Lucas+Anderson&background=random'
        },
    ]);


    const [selectedCustomerInsight, setSelectedCustomerInsight] = useState<any | null>(null);

    const handleAIGuess = (customer: any) => {
        // Mock AI logic
        setSelectedCustomerInsight({
            customer,
            segments: ['High Value', 'Loyal'],
            churnRisk: 'Low',
            recommendation: 'Premium Leather Wallet',
            lastInteractionSentiment: 'Positive',
            nextBestAction: 'Send 10% discount on Accessories'
        });
    };

    const handleAddCustomer = (e: React.FormEvent) => {
        e.preventDefault();

        if (editingCustomer) {
            setCustomers(customers.map(c =>
                c.id === editingCustomer.id
                    ? { ...c, ...newCustomer, avatar: `https://ui-avatars.com/api/?name=${newCustomer.name.replace(' ', '+')}&background=random` }
                    : c
            ));
        } else {
            const customer = {
                id: customers.length + 1,
                name: newCustomer.name,
                phone: newCustomer.phone,
                email: newCustomer.email,
                totalSpent: 0,
                orders: 0,
                lastVisit: 'Never',
                points: 0,
                avatar: `https://ui-avatars.com/api/?name=${newCustomer.name.replace(' ', '+')}&background=random`
            };
            setCustomers([...customers, customer]);
        }

        setIsAddCustomerOpen(false);
        setEditingCustomer(null);
        setNewCustomer({ name: '', phone: '', email: '', notes: '' });
    };

    const handleEditCustomer = (customer: any) => {
        setEditingCustomer(customer);
        setNewCustomer({
            name: customer.name,
            phone: customer.phone,
            email: customer.email || '',
            notes: ''
        });
        setIsAddCustomerOpen(true);
    };

    const handleDeleteCustomer = (id: number) => {
        if (confirm('Are you sure you want to delete this customer?')) {
            setCustomers(customers.filter(c => c.id !== id));
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
            {/* ... Header and Search ... */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Customer Management</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">View and manage customer data.</p>
                </div>
                {/* ... Add Customer Button ... */}
                <button
                    onClick={() => {
                        setEditingCustomer(null);
                        setNewCustomer({ name: '', phone: '', email: '', notes: '' });
                        setIsAddCustomerOpen(true);
                    }}
                    className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 active:bg-indigo-800 shadow-lg shadow-indigo-500/30"
                >
                    <Plus className="h-4 w-4" />
                    Add Customer
                </button>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/50">
                {/* ... Table Header ... */}
                <div className="border-b border-slate-200 p-4 dark:border-slate-800">
                    {/* ... Search Inputs ... */}
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search customers by name or phone..."
                                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-10 pr-4 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                            />
                        </div>
                        <button className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            <Filter className="h-4 w-4" />
                            Filters
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
                            <tr>
                                <th className="px-6 py-4 font-medium">Customer</th>
                                <th className="px-6 py-4 font-medium">Contact</th>
                                <th className="px-6 py-4 font-medium">Loyalty Tier</th>
                                <th className="px-6 py-4 font-medium">Orders</th>
                                <th className="px-6 py-4 font-medium">Total Spent</th>
                                <th className="px-6 py-4 font-medium">Last Visit</th>
                                <th className="px-6 py-4 font-medium"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                            {customers.map((customer) => {
                                const tier = getTier(customer.points);
                                return (
                                    <tr key={customer.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        {/* ... Table Content ... */}
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <img src={customer.avatar} alt={customer.name} className="h-10 w-10 rounded-full bg-slate-100" />
                                                <div>
                                                    <p className="font-medium text-slate-900 dark:text-slate-100">{customer.name}</p>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">ID: #CUST-{customer.id + 1000}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2">
                                                    <Phone className="h-3 w-3" />
                                                    <span className="text-xs">{customer.phone}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                <span className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${tier.color}`}>
                                                    <Award className="h-3 w-3" />
                                                    {tier.name}
                                                </span>
                                                <span className="text-[10px] text-slate-400 ml-1">{customer.points} Points</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-700 dark:text-slate-300">
                                            <div className="flex items-center gap-2">
                                                <ShoppingBag className="h-4 w-4 text-slate-400" />
                                                {customer.orders}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">
                                            {`GHS ${customer.totalSpent.toFixed(2)}`}
                                        </td>
                                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                                            <div className="flex items-center gap-2">
                                                <Clock className="h-4 w-4 text-slate-400" />
                                                {customer.lastVisit}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => {
                                                        setSelectedHistoryCustomer(customer);
                                                        setShowAllHistory(false);
                                                    }}
                                                    className="rounded p-2 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 transition-colors dark:hover:bg-slate-800 dark:hover:text-indigo-400"
                                                    title="View History"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleAIGuess(customer)}
                                                    className="rounded p-2 text-indigo-500 hover:bg-indigo-50 hover:text-indigo-700 transition-colors dark:text-indigo-400 dark:hover:bg-indigo-900/20"
                                                    title="View AI Profile"
                                                >
                                                    <Sparkles className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleEditCustomer(customer)}
                                                    className="rounded p-2 text-slate-400 hover:bg-slate-100 hover:text-blue-600 transition-colors dark:hover:bg-slate-800 dark:hover:text-blue-400"
                                                    title="Edit Customer"
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteCustomer(customer.id)}
                                                    className="rounded p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors dark:hover:bg-slate-800 dark:hover:text-red-400"
                                                    title="Delete Customer"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add Customer Modal */}
            {isAddCustomerOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 animate-in zoom-in-95">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                                {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
                            </h2>
                            <button onClick={() => setIsAddCustomerOpen(false)} className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-slate-800">
                                <X className="h-5 w-5 text-slate-500" />
                            </button>
                        </div>
                        <form onSubmit={handleAddCustomer} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Full Name</label>
                                <input
                                    required
                                    type="text"
                                    className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                                    value={newCustomer.name}
                                    onChange={e => setNewCustomer({ ...newCustomer, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Phone Number</label>
                                <input
                                    required
                                    type="tel"
                                    className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                                    value={newCustomer.phone}
                                    onChange={e => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Email (Optional)</label>
                                <input
                                    type="email"
                                    className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                                    value={newCustomer.email}
                                    onChange={e => setNewCustomer({ ...newCustomer, email: e.target.value })}
                                />
                            </div>
                            <div className="flex justify-end pt-4 gap-3">
                                <button type="button" onClick={() => setIsAddCustomerOpen(false)} className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
                                    Cancel
                                </button>
                                <button type="submit" className="px-4 py-2 rounded-lg bg-indigo-600 text-sm font-medium text-white hover:bg-indigo-700 shadow-sm">
                                    {editingCustomer ? 'Save Changes' : 'Add Customer'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* AI Insight Modal */}
            {selectedCustomerInsight && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 animate-in zoom-in-95 duration-200 scale-100 max-h-[90vh] overflow-y-auto">
                        <div className="mb-6 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Sparkles className="h-5 w-5 text-indigo-600" />
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white">AI Customer Insight</h2>
                            </div>
                            <button onClick={() => setSelectedCustomerInsight(null)} className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-slate-800">
                                <span className="sr-only">Close</span>
                                <svg className="h-5 w-5 text-slate-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                                <img src={selectedCustomerInsight.customer.avatar} className="h-12 w-12 rounded-full" alt="avatar" />
                                <div>
                                    <h3 className="font-bold text-slate-900 dark:text-white">{selectedCustomerInsight.customer.name}</h3>
                                    <div className="flex gap-2 text-xs mt-1">
                                        {selectedCustomerInsight.segments.map((seg: string) => (
                                            <span key={seg} className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 font-medium">
                                                {seg}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Churn Risk</p>
                                    <div className="flex items-center gap-2">
                                        <div className="h-2 flex-1 rounded-full bg-slate-100 overflow-hidden dark:bg-slate-800">
                                            <div className="h-full bg-emerald-500 w-[15%]"></div>
                                        </div>
                                        <span className="text-sm font-bold text-emerald-600">Low</span>
                                    </div>
                                </div>

                                <div className="p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Recommended Product</p>
                                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{selectedCustomerInsight.recommendation}</p>
                                </div>

                                <div className="p-3 rounded-lg bg-indigo-50 border border-indigo-100 dark:bg-indigo-900/20 dark:border-indigo-900/40">
                                    <p className="text-xs font-medium text-indigo-800 dark:text-indigo-300 uppercase tracking-wider mb-1">Next Best Action</p>
                                    <p className="text-sm font-bold text-indigo-900 dark:text-white">{selectedCustomerInsight.nextBestAction}</p>
                                </div>
                            </div>

                            <button className="w-full py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700">
                                Take Action
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Customer History Modal */}
            {selectedHistoryCustomer && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 animate-in zoom-in-95 duration-200 scale-100 max-h-[90vh] overflow-y-auto">
                        <div className="mb-6 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center dark:bg-indigo-900/30">
                                    <ShoppingBag className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Purchase History</h2>
                                    <p className="text-sm text-slate-500">{selectedHistoryCustomer.name}</p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedHistoryCustomer(null)} className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-slate-800">
                                <X className="h-5 w-5 text-slate-500" />
                            </button>
                        </div>

                        <div className="grid grid-cols-3 gap-4 mb-6">
                            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                                <p className="text-xs text-slate-500 mb-1">Total Spent</p>
                                <p className="text-lg font-bold text-slate-900 dark:text-white">GHS {selectedHistoryCustomer.totalSpent.toFixed(2)}</p>
                            </div>
                            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                                <p className="text-xs text-slate-500 mb-1">Total Orders</p>
                                <p className="text-lg font-bold text-slate-900 dark:text-white">{selectedHistoryCustomer.orders}</p>
                            </div>
                            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                                <p className="text-xs text-slate-500 mb-1">Loyalty Points</p>
                                <p className="text-lg font-bold text-amber-600">{selectedHistoryCustomer.points}</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="font-semibold text-slate-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800">Recent Transactions</h3>
                            {/* Mock History Data */}
                            {/* Mock History Data */}
                            {(() => {
                                // Generate mock transactions based on customer order count
                                const totalOrders = selectedHistoryCustomer.orders || 0;
                                const transactions = Array.from({ length: totalOrders }, (_, i) => ({
                                    id: selectedHistoryCustomer.id * 1000 + i,
                                    date: i === 0 ? 'Today' : i === 1 ? 'Yesterday' : `${i + 2} days ago`,
                                    items: Math.floor(Math.random() * 5) + 1,
                                    amount: (Math.random() * 200 + 50).toFixed(2),
                                    status: 'Completed'
                                }));

                                const visibleTransactions = showAllHistory ? transactions : transactions.slice(0, 5);

                                return (
                                    <>
                                        {visibleTransactions.map((tx, i) => (
                                            <div key={tx.id} className="flex items-center justify-between p-4 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors animate-in fade-in slide-in-from-bottom-2 duration-300" style={{ animationDelay: `${i * 50}ms` }}>
                                                <div className="flex items-center gap-4">
                                                    <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center dark:bg-slate-800">
                                                        <ShoppingBag className="h-5 w-5 text-slate-500" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-slate-900 dark:text-white">Order #{tx.id}</p>
                                                        <div className="flex items-center gap-2 text-xs text-slate-500">
                                                            <Clock className="h-3 w-3" />
                                                            <span>{tx.date}</span>
                                                            <span>•</span>
                                                            <span>{tx.items} Items</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-bold text-slate-900 dark:text-white">GHS {tx.amount}</p>
                                                    <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                                                        {tx.status}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}

                                        {totalOrders > 5 && (
                                            <button
                                                onClick={() => setShowAllHistory(!showAllHistory)}
                                                className="w-full py-3 flex items-center justify-center gap-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-xl transition-colors dark:text-slate-400 dark:hover:bg-slate-800"
                                            >
                                                {showAllHistory ? (
                                                    <>
                                                        Show Less
                                                        <ChevronUp className="h-4 w-4" />
                                                    </>
                                                ) : (
                                                    <>
                                                        View All Transactions ({totalOrders})
                                                        <ChevronDown className="h-4 w-4" />
                                                    </>
                                                )}
                                            </button>
                                        )}
                                    </>
                                );
                            })()}
                            {selectedHistoryCustomer.orders === 0 && (
                                <div className="text-center py-8 text-slate-500">
                                    No purchase history available.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
