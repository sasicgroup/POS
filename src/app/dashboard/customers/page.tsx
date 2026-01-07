'use client';

import { useState, useEffect } from 'react';
import { Search, Plus, User, Phone, ShoppingBag, Calendar, ArrowUpRight, MoreHorizontal, Mail, MapPin } from 'lucide-react';
import { supabase } from '@/lib/supabase';

// Define Customer Interface
// Supabase naming convention usually snake_case, but I will map or assume TS matches if allowed 
// or I will adjust map below.
interface Customer {
    id: any;
    name: string;
    phone: string;
    email: string;
    total_spent: number;
    points: number;
    last_visit: string;
    location?: string; // Optional if not in DB schema yet
}

import { useAuth } from '@/lib/auth-context';

// ... interface ...

export default function CustomersPage() {
    const { activeStore } = useAuth();
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

    // Add Customer State
    const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
    const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', email: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);

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
            email: newCustomer.email,
            total_spent: 0,
            points: 0
        }).select().single();

        if (error) {
            console.error("Error adding customer:", error);
            alert("Failed to add customer.");
        } else if (data) {
            setCustomers(prev => [data, ...prev]);
            setIsAddCustomerOpen(false);
            setNewCustomer({ name: '', phone: '', email: '' });
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
                    placeholder="Search by name, phone or email..."
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
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="font-bold text-lg text-slate-900 dark:text-white">Customer Profile</h3>
                                <button className="text-slate-400 hover:text-slate-600">
                                    <MoreHorizontal className="h-5 w-5" />
                                </button>
                            </div>

                            <div className="text-center mb-8">
                                <div className="mx-auto h-20 w-20 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 mb-4 dark:bg-slate-800">
                                    <User className="h-10 w-10" />
                                </div>
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white">{selectedCustomer.name}</h2>
                                <p className="text-sm text-slate-500">{selectedCustomer.email || 'No Email'}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-8">
                                <div className="rounded-lg bg-indigo-50 p-4 text-center dark:bg-indigo-900/20">
                                    <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium uppercase">Points</p>
                                    <p className="text-xl font-bold text-indigo-700 dark:text-indigo-300">{selectedCustomer.points || 0}</p>
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
                                    <Mail className="h-4 w-4" /> {selectedCustomer.email || 'N/A'}
                                </div>
                                <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                                    <Calendar className="h-4 w-4" /> Last Visit: {selectedCustomer.last_visit ? new Date(selectedCustomer.last_visit).toLocaleDateString() : 'Never'}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-12 text-center dark:border-slate-700 dark:bg-slate-800/50 flex flex-col items-center justify-center h-full">
                            <User className="h-12 w-12 text-slate-300 mb-4" />
                            <p className="text-slate-500 font-medium">Select a customer to view details</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
