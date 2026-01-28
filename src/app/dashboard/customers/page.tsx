'use client';

import { useState, useEffect } from 'react';
import { Search, Plus, User, Phone, ShoppingBag, Calendar, ArrowUpRight, MoreHorizontal, Mail, MapPin, Pencil, Check, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/lib/toast-context';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

// Define Customer Interface
// Supabase naming convention usually snake_case, but I will map or assume TS matches if allowed 
// or I will adjust map below.
interface Customer {
    id: any;
    name: string;
    phone: string;
    total_spent: number;
    points: number;
    last_visit: string;
    location?: string; // Optional if not in DB schema yet
}

import { useAuth } from '@/lib/auth-context';

// ... interface ...

export default function CustomersPage() {
    const { activeStore, user } = useAuth();
    const { showToast } = useToast();
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [resetPointsConfirm, setResetPointsConfirm] = useState(false);

    // Add Customer State
    const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
    const [newCustomer, setNewCustomer] = useState({ name: '', phone: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Edit State
    const [editingField, setEditingField] = useState<'name' | 'phone' | 'points' | null>(null);
    const [editName, setEditName] = useState('');
    const [editPhone, setEditPhone] = useState('');
    const [editPoints, setEditPoints] = useState(0);
    const [showOptions, setShowOptions] = useState(false);

    // History State
    const [customerHistory, setCustomerHistory] = useState<any[]>([]);
    const [loyaltyHistory, setLoyaltyHistory] = useState<any[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historyTab, setHistoryTab] = useState<'purchases' | 'loyalty'>('purchases');

    useEffect(() => {
        if (selectedCustomer) {
            fetchHistory(selectedCustomer.id);
        } else {
            setCustomerHistory([]);
        }
    }, [selectedCustomer]);

    const fetchHistory = async (customerId: string) => {
        setHistoryLoading(true);
        // Sales
        const { data: sales } = await supabase
            .from('sales')
            .select(`
                id,
                created_at,
                total_amount,
                sale_items (
                    quantity,
                    price_at_sale,
                    product:products (name)
                )
            `)
            .eq('customer_id', customerId)
            .order('created_at', { ascending: false });

        if (sales) setCustomerHistory(sales);

        // Loyalty Logs
        const { data: logs } = await supabase
            .from('loyalty_logs')
            .select('*')
            .eq('customer_id', customerId)
            .order('created_at', { ascending: false });

        if (logs) setLoyaltyHistory(logs);

        setHistoryLoading(false);
    };

    // Reset edit state when customer changes
    useEffect(() => {
        setEditingField(null);
        setShowOptions(false);
        setEditName('');
        setEditPhone('');
        setEditPoints(0);
    }, [selectedCustomer]);

    const handleUpdateName = async () => {
        if (!selectedCustomer || !activeStore?.id || !editName.trim()) return;

        const { error } = await supabase
            .from('customers')
            .update({ name: editName })
            .eq('id', selectedCustomer.id);

        if (error) {
            console.error('Error updating customer', error);
            showToast('error', 'Failed to update name');
        } else {
            const updated = { ...selectedCustomer, name: editName };
            setSelectedCustomer(updated);
            setCustomers(prev => prev.map(c => c.id === updated.id ? updated : c));
            setEditingField(null);
        }
    };

    const handleUpdatePhone = async () => {
        if (!selectedCustomer || !activeStore?.id || !editPhone.trim()) return;

        const { error } = await supabase
            .from('customers')
            .update({ phone: editPhone })
            .eq('id', selectedCustomer.id);

        if (error) {
            console.error('Error updating phone', error);
            showToast('error', 'Failed to update phone');
        } else {
            const updated = { ...selectedCustomer, phone: editPhone };
            setSelectedCustomer(updated);
            setCustomers(prev => prev.map(c => c.id === updated.id ? updated : c));
            setEditingField(null);
        }
    };

    const handleUpdatePoints = async () => {
        if (!selectedCustomer || !activeStore?.id) return;

        // Calculate difference
        const oldPoints = selectedCustomer.points || 0;
        const newPoints = editPoints;
        const difference = newPoints - oldPoints;

        if (difference === 0) {
            setEditingField(null);
            return;
        }

        // Update Customer Points
        const { error } = await supabase
            .from('customers')
            .update({ points: newPoints })
            .eq('id', selectedCustomer.id);

        if (error) {
            console.error('Error updating points', error);
            showToast('error', 'Failed to update points');
        } else {
            // Log to Loyalty History
            await supabase.from('loyalty_logs').insert({
                store_id: activeStore.id,
                customer_id: selectedCustomer.id,
                points: Math.abs(difference),
                type: difference > 0 ? 'earned' : 'redeemed', // or 'manual_adjustment' if we want to be specific, but strictly 'earned'/'redeemed' usually fits schema
                description: `Manual adjustment: ${difference > 0 ? 'Added' : 'Removed'} ${Math.abs(difference)} points`,
                created_at: new Date().toISOString()
            });

            // Update Local State
            const updated = { ...selectedCustomer, points: newPoints };
            setSelectedCustomer(updated);
            setCustomers(prev => prev.map(c => c.id === updated.id ? updated : c));
            setEditingField(null);

            // Refresh history to show new log
            fetchHistory(selectedCustomer.id);
        }
    };

    const handleResetPointsClick = () => {
        setResetPointsConfirm(true);
    }

    const confirmResetPoints = async () => {
        if (!selectedCustomer || !activeStore?.id) return;

        const oldPoints = selectedCustomer.points || 0;
        if (oldPoints === 0) {
            setResetPointsConfirm(false);
            return;
        }

        const { error } = await supabase
            .from('customers')
            .update({ points: 0 })
            .eq('id', selectedCustomer.id);

        if (error) {
            console.error('Error resetting points', error);
            showToast('error', 'Failed to reset points');
        } else {
            // Log to Loyalty History
            await supabase.from('loyalty_logs').insert({
                store_id: activeStore.id,
                customer_id: selectedCustomer.id,
                points: oldPoints,
                type: 'redeemed',
                description: `Manual reset: Removed ${oldPoints} points`,
                created_at: new Date().toISOString()
            });

            const updated = { ...selectedCustomer, points: 0 };
            setSelectedCustomer(updated);
            setCustomers(prev => prev.map(c => c.id === updated.id ? updated : c));
            setShowOptions(false);
            fetchHistory(selectedCustomer.id);
            setResetPointsConfirm(false);
            showToast('success', 'Points reset successfully');
        }
    };

    useEffect(() => {
        if (activeStore?.id) fetchCustomers();
    }, [activeStore?.id]);

    const fetchCustomers = async () => {
        if (!activeStore?.id) return;
        const { data, error } = await supabase
            .from('customers')
            .select('*')
            .eq('store_id', activeStore.id);

        if (error) {
            console.error('Error fetching customers', error);
        } else if (data) {
            setCustomers(data);
        }
    };

    const handleAddCustomer = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeStore?.id) return;
        setIsSubmitting(true);

        const { data, error } = await supabase.from('customers').insert({
            store_id: activeStore.id,
            name: newCustomer.name,
            phone: newCustomer.phone,
            total_spent: 0,
            points: 0
        }).select().single();

        if (error) {
            console.error("Error adding customer:", error);
            showToast('error', "Failed to add customer.");
        } else if (data) {
            setCustomers(prev => [data, ...prev]);
            setIsAddCustomerOpen(false);
            setNewCustomer({ name: '', phone: '' });
        }
        setIsSubmitting(false);
    };

    const filteredCustomers = customers.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.phone && c.phone.includes(searchQuery))
    );

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Customers</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Manage your loyal customer base and view history.</p>
                </div>
                <button
                    onClick={() => setIsAddCustomerOpen(true)}
                    className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 active:bg-indigo-800 shadow-lg shadow-indigo-500/30"
                >
                    <Plus className="h-4 w-4" />
                    New Customer
                </button>
            </div>

            <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <Search className="h-5 w-5 text-slate-400" />
                <input
                    type="text"
                    placeholder="Search by name or phone..."
                    className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400 dark:text-white"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                {/* Customer List */}
                <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden flex flex-col">
                    <div className="border-b border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-slate-800/50">
                        <h3 className="font-semibold text-slate-900 dark:text-slate-100">All Customers</h3>
                    </div>
                    {filteredCustomers.length === 0 ? (
                        <div className="p-10 text-center text-slate-500">
                            No customers found. Start adding some!
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                            {filteredCustomers.map((customer) => (
                                <div
                                    key={customer.id}
                                    onClick={() => setSelectedCustomer(customer)}
                                    className={`flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors ${selectedCustomer?.id === customer.id ? 'bg-indigo-50 dark:bg-indigo-900/10' : ''}`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 font-bold">
                                            {customer.name.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="font-medium text-slate-900 dark:text-slate-100">{customer.name}</p>
                                            <p className="text-xs text-slate-500 flex items-center gap-2">
                                                <Phone className="h-3 w-3" /> {customer.phone}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right hidden sm:block">
                                        <p className="text-sm font-bold text-slate-900 dark:text-slate-100">GHS {customer.total_spent?.toFixed(2) || '0.00'}</p>
                                        <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">{customer.points || 0} pts</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Customer Details Sidebar */}
                <div className="lg:col-span-1 space-y-6">
                    {selectedCustomer ? (
                        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sticky top-6">
                            <div className="flex items-center justify-between mb-6 relative">
                                <h3 className="font-bold text-lg text-slate-900 dark:text-white">Customer Profile</h3>
                                <div className="relative">
                                    <button
                                        onClick={() => setShowOptions(!showOptions)}
                                        className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
                                    >
                                        <MoreHorizontal className="h-5 w-5" />
                                    </button>

                                    {showOptions && (
                                        <div className="absolute right-0 top-8 w-48 bg-white rounded-lg shadow-xl border border-slate-200 py-1 z-10 dark:bg-slate-800 dark:border-slate-700 animate-in fade-in zoom-in-95 duration-200">
                                            <button
                                                onClick={() => {
                                                    setEditingField('name');
                                                    setEditName(selectedCustomer.name);
                                                    setShowOptions(false);
                                                }}
                                                className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 dark:text-slate-300 dark:hover:bg-slate-700"
                                            >
                                                <Pencil className="h-3.5 w-3.5" /> Edit Name
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setEditingField('phone');
                                                    setEditPhone(selectedCustomer.phone);
                                                    setShowOptions(false);
                                                }}
                                                className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 dark:text-slate-300 dark:hover:bg-slate-700"
                                            >
                                                <Phone className="h-3.5 w-3.5" /> Edit Phone
                                            </button>

                                            {/* Protected Actions */}
                                            {(user?.role === 'owner' || user?.role === 'manager') && (
                                                <>
                                                    <div className="my-1 border-t border-slate-100 dark:border-slate-700"></div>
                                                    <button
                                                        onClick={() => {
                                                            setEditingField('points');
                                                            setEditPoints(selectedCustomer.points || 0);
                                                            setShowOptions(false);
                                                        }}
                                                        className="w-full text-left px-4 py-2 text-sm text-indigo-600 hover:bg-indigo-50 flex items-center gap-2 dark:text-indigo-400 dark:hover:bg-indigo-900/20"
                                                    >
                                                        <Pencil className="h-3.5 w-3.5" /> Edit Points
                                                    </button>
                                                    <button
                                                        onClick={handleResetPointsClick}
                                                        className="w-full text-left px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 flex items-center gap-2 dark:text-rose-400 dark:hover:bg-rose-900/20"
                                                    >
                                                        <X className="h-3.5 w-3.5" /> Reset Points
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="text-center mb-8">
                                <div className="mx-auto h-20 w-20 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 mb-4 dark:bg-slate-800">
                                    <User className="h-10 w-10" />
                                </div>
                                {editingField === 'name' ? (
                                    <div className="flex items-center justify-center gap-2 mb-1">
                                        <input
                                            type="text"
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            className="text-center font-bold text-xl bg-white border border-indigo-200 rounded-md px-2 py-1 w-full max-w-[200px] focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                                            autoFocus
                                        />
                                        <button onClick={handleUpdateName} className="p-1.5 bg-indigo-100 text-indigo-600 rounded-md hover:bg-indigo-200 dark:bg-indigo-900/50 dark:text-indigo-400">
                                            <Check className="h-4 w-4" />
                                        </button>
                                        <button onClick={() => setEditingField(null)} className="p-1.5 bg-slate-100 text-slate-600 rounded-md hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400">
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">{selectedCustomer.name}</h2>
                                )}

                                {editingField === 'phone' ? (
                                    <div className="flex items-center justify-center gap-2">
                                        <input
                                            type="tel"
                                            value={editPhone}
                                            onChange={(e) => setEditPhone(e.target.value)}
                                            className="text-center text-sm bg-white border border-indigo-200 rounded-md px-2 py-1 w-full max-w-[180px] focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                                            autoFocus
                                        />
                                        <button onClick={handleUpdatePhone} className="p-1 bg-indigo-100 text-indigo-600 rounded-md hover:bg-indigo-200 dark:bg-indigo-900/50 dark:text-indigo-400">
                                            <Check className="h-3 w-3" />
                                        </button>
                                        <button onClick={() => setEditingField(null)} className="p-1 bg-slate-100 text-slate-600 rounded-md hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400">
                                            <X className="h-3 w-3" />
                                        </button>
                                    </div>
                                ) : (
                                    <p className="text-sm text-slate-500">{selectedCustomer.phone || 'No Phone'}</p>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-8">
                                <div className="rounded-lg bg-indigo-50 p-4 text-center dark:bg-indigo-900/20">
                                    <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium uppercase">Points</p>
                                    {editingField === 'points' ? (
                                        <div className="flex items-center justify-center gap-1 mt-1">
                                            <input
                                                type="number"
                                                value={editPoints}
                                                onChange={(e) => setEditPoints(parseInt(e.target.value) || 0)}
                                                className="text-center text-lg font-bold bg-white border border-indigo-200 rounded-md px-2 py-1 w-20 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                                                autoFocus
                                            />
                                            <button onClick={handleUpdatePoints} className="p-1 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
                                                <Check className="h-3 w-3" />
                                            </button>
                                            <button onClick={() => setEditingField(null)} className="p-1 bg-slate-300 text-slate-600 rounded-md hover:bg-slate-400">
                                                <X className="h-3 w-3" />
                                            </button>
                                        </div>
                                    ) : (
                                        <p className="text-xl font-bold text-indigo-700 dark:text-indigo-300">{selectedCustomer.points || 0}</p>
                                    )}
                                </div>
                                <div className="rounded-lg bg-emerald-50 p-4 text-center dark:bg-emerald-900/20">
                                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium uppercase">Spent</p>
                                    <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300">GHS {selectedCustomer.total_spent?.toFixed(2) || '0.00'}</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                                    <Phone className="h-4 w-4" /> {selectedCustomer.phone}
                                </div>
                                <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                                    <Calendar className="h-4 w-4" /> Last Visit: {selectedCustomer.last_visit ? new Date(selectedCustomer.last_visit).toLocaleDateString() : 'Never'}
                                </div>
                            </div>

                            <div className="mt-8 border-t border-slate-100 pt-6 dark:border-slate-800">
                                <div className="flex items-center gap-4 mb-4">
                                    <button
                                        onClick={() => setHistoryTab('purchases')}
                                        className={`text-sm font-semibold pb-1 border-b-2 transition-colors ${historyTab === 'purchases' ? 'text-indigo-600 border-indigo-600' : 'text-slate-500 border-transparent hover:text-slate-700'}`}
                                    >
                                        Purchases
                                    </button>
                                    <button
                                        onClick={() => setHistoryTab('loyalty')}
                                        className={`text-sm font-semibold pb-1 border-b-2 transition-colors ${historyTab === 'loyalty' ? 'text-indigo-600 border-indigo-600' : 'text-slate-500 border-transparent hover:text-slate-700'}`}
                                    >
                                        Loyalty History
                                    </button>
                                </div>

                                {historyLoading ? (
                                    <div className="text-center py-4 text-sm text-slate-500">Loading history...</div>
                                ) : historyTab === 'purchases' ? (
                                    customerHistory.length === 0 ? (
                                        <div className="text-center py-4 text-sm text-slate-500 bg-slate-50 rounded-lg dark:bg-slate-800/50">
                                            No purchase history found.
                                        </div>
                                    ) : (
                                        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                            {customerHistory.map((sale: any) => (
                                                <div key={sale.id} className="rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/50 text-sm">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div>
                                                            <p className="font-medium text-slate-900 dark:text-white">
                                                                {new Date(sale.created_at).toLocaleDateString()}
                                                            </p>
                                                            <p className="text-xs text-slate-500">
                                                                {new Date(sale.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </p>
                                                        </div>
                                                        <p className="font-bold text-indigo-600 dark:text-indigo-400">
                                                            {activeStore?.currency || 'GHS'} {sale.total_amount.toFixed(2)}
                                                        </p>
                                                    </div>
                                                    <div className="space-y-1">
                                                        {sale.sale_items?.map((item: any, idx: number) => (
                                                            <div key={idx} className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
                                                                <span>
                                                                    {item.quantity}x {item.product?.name || 'Unknown Item'}
                                                                </span>
                                                                <span>
                                                                    {(item.price_at_sale * item.quantity).toFixed(2)}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )
                                ) : (
                                    loyaltyHistory.length === 0 ? (
                                        <div className="text-center py-4 text-sm text-slate-500 bg-slate-50 rounded-lg dark:bg-slate-800/50">
                                            No loyalty history found.
                                        </div>
                                    ) : (
                                        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                            {loyaltyHistory.map((log: any) => (
                                                <div key={log.id} className="rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/50 text-sm">
                                                    <div className="flex justify-between items-center mb-1">
                                                        <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${log.type === 'earned' ? 'bg-green-100 text-green-700' :
                                                            log.type === 'redeemed' ? 'bg-pink-100 text-pink-700' : 'bg-slate-100 text-slate-700'
                                                            }`}>
                                                            {log.type}
                                                        </span>
                                                        <span className={`font-bold ${log.points > 0 ? 'text-green-600' : 'text-pink-600'}`}>
                                                            {log.points > 0 ? '+' : ''}{log.points} pts
                                                        </span>
                                                    </div>
                                                    <p className="text-slate-700 dark:text-slate-300 font-medium">{log.description}</p>
                                                    <p className="text-xs text-slate-500 mt-1">
                                                        {new Date(log.created_at).toLocaleString()}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    )
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-12 text-center dark:border-slate-700 dark:bg-slate-800/50 flex flex-col items-center justify-center h-full">
                            <User className="h-12 w-12 text-slate-300 mb-4" />
                            <p className="text-slate-500 font-medium">Select a customer to view details</p>
                        </div>
                    )}
                </div>

                <ConfirmDialog
                    isOpen={resetPointsConfirm}
                    onClose={() => setResetPointsConfirm(false)}
                    onConfirm={confirmResetPoints}
                    title="Reset Customer Points"
                    description="Are you sure you want to reset all points for this customer? This action cannot be undone."
                    confirmText="Reset Points"
                    variant="danger"
                />
            </div>
        </div>

    );
}
