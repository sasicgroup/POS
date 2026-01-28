'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Plus, Search, MoreVertical, Shield, User as UserIcon, X, Edit2, Trash2, BarChart3, TrendingUp, Award, Calendar } from 'lucide-react';
import { useToast } from '@/lib/toast-context';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

// Date Helpers (Native implementation to avoid dependency issues)
const startOfDay = (date: Date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
};

const startOfWeek = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday start
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
};

const startOfMonth = (date: Date) => {
    const d = new Date(date);
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
};

interface Employee {
    id: any;
    name: string;
    username?: string;
    phone?: string;
    role: string;
    pin?: string;
    salary?: number;
    avatar?: string;
    status?: string;
    joinDate?: string;
    is_locked?: boolean;
    failed_attempts?: number;
    otp_enabled?: boolean;
    shift_start?: string;
    shift_end?: string;
    work_days?: string[];
}

export default function EmployeesPage() {
    const { activeStore, unlockAccount } = useAuth();
    const { showToast } = useToast();
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [deleteConfirmId, setDeleteConfirmId] = useState<any>(null);
    const [unlockConfirmId, setUnlockConfirmId] = useState<any>(null);

    const [isAddEmployeeOpen, setIsAddEmployeeOpen] = useState(false);
    const [newEmployee, setNewEmployee] = useState<Partial<Employee>>({
        name: '', username: '', phone: '', role: 'staff', pin: '', salary: 0, otp_enabled: true,
        shift_start: '', shift_end: '', work_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [activeMenu, setActiveMenu] = useState<any>(null);
    const [editingId, setEditingId] = useState<any>(null);

    // Performance Stats State
    const [activeTab, setActiveTab] = useState<'team' | 'performance'>('team');
    const [perfStats, setPerfStats] = useState<any[]>([]);
    const [perfTimeframe, setPerfTimeframe] = useState('month'); // today, week, month

    useEffect(() => {
        if (activeStore?.id) fetchEmployees();
    }, [activeStore?.id]);


    useEffect(() => {
        if (activeStore?.id) {
            fetchEmployees();
            if (activeTab === 'performance') fetchPerformance();
        }
    }, [activeStore?.id, activeTab, perfTimeframe]);

    const fetchEmployees = async () => {
        if (!activeStore?.id) return;
        const { data, error } = await supabase
            .from('employees')
            .select('*')
            .eq('store_id', activeStore.id);

        if (error) console.error(error);
        if (data) setEmployees(data);
    };

    const fetchPerformance = async () => {
        if (!activeStore?.id) return;

        // 1. Fetch all sales for store (optimize later with date range filter in query)
        let query = supabase
            .from('sales')
            .select(`
                total_amount,
                employee_id,
                created_at,
                employees (name, avatar, role)
            `)
            .eq('store_id', activeStore.id);

        // Apply basic date filter at DB level to reduce load
        const now = new Date();
        if (perfTimeframe === 'today') {
            query = query.gte('created_at', startOfDay(now).toISOString());
        } else if (perfTimeframe === 'week') {
            query = query.gte('created_at', startOfWeek(now).toISOString());
        } else if (perfTimeframe === 'month') {
            query = query.gte('created_at', startOfMonth(now).toISOString());
        }

        const { data: sales, error } = await query;

        if (error || !sales) {
            console.error("Error fetching performance", error);
            return;
        }

        // 2. Aggregate in JS
        const statsMap = new Map();

        sales.forEach((sale: any) => {
            const empId = sale.employee_id || 'unknown';
            const empName = sale.employees?.name || 'Unknown Staff';
            const empRole = sale.employees?.role || 'staff';

            if (!statsMap.has(empId)) {
                statsMap.set(empId, {
                    id: empId,
                    name: empName,
                    role: empRole,
                    totalSales: 0,
                    txnCount: 0,
                    lastSale: null
                });
            }

            const stat = statsMap.get(empId);
            stat.totalSales += sale.total_amount;
            stat.txnCount += 1;
            if (!stat.lastSale || new Date(sale.created_at) > new Date(stat.lastSale)) {
                stat.lastSale = sale.created_at;
            }
        });

        const sortedStats = Array.from(statsMap.values()).sort((a, b) => b.totalSales - a.totalSales);
        setPerfStats(sortedStats);
    };

    const handleSaveEmployee = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeStore?.id) return;
        setIsSubmitting(true);

        if (editingId) {
            // Update - only include time fields if they have values
            const updateData: any = {
                name: newEmployee.name,
                username: newEmployee.username,
                phone: newEmployee.phone,
                role: newEmployee.role,
                otp_enabled: newEmployee.otp_enabled,
                pin: newEmployee.pin,
                salary: newEmployee.salary,
                work_days: newEmployee.work_days
            };

            // Only include shift times if they are not empty
            if (newEmployee.shift_start && newEmployee.shift_start.trim() !== '') {
                updateData.shift_start = newEmployee.shift_start;
            } else {
                updateData.shift_start = null;
            }
            if (newEmployee.shift_end && newEmployee.shift_end.trim() !== '') {
                updateData.shift_end = newEmployee.shift_end;
            } else {
                updateData.shift_end = null;
            }

            const { error } = await supabase.from('employees').update(updateData).eq('id', editingId);

            if (error) {
                console.error("Error updating employee:", error);
                showToast('error', "Failed to update employee: " + error.message);
            } else {
                setEmployees(prev => prev.map(e => e.id === editingId ? { ...e, ...newEmployee } : e) as any);
                setIsAddEmployeeOpen(false);
                setEditingId(null);
                setNewEmployee({ name: '', username: '', phone: '', role: 'staff', pin: '', salary: 0, otp_enabled: true, shift_start: '', shift_end: '', work_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] });
            }
        } else {
            // Insert
            const { data, error } = await supabase.from('employees').insert({
                store_id: activeStore.id,
                name: newEmployee.name,
                username: newEmployee.username,
                phone: newEmployee.phone,
                role: newEmployee.role,
                otp_enabled: newEmployee.otp_enabled,
                pin: newEmployee.pin,
                salary: newEmployee.salary,
                shift_start: newEmployee.shift_start || null,
                shift_end: newEmployee.shift_end || null,
                work_days: newEmployee.work_days
            }).select().single();

            if (error) {
                console.error("Error adding employee:", error);
                showToast('error', "Failed to add employee");
            } else if (data) {
                setEmployees(prev => [data, ...prev]);
                setIsAddEmployeeOpen(false);
                setNewEmployee({ name: '', username: '', phone: '', role: 'staff', pin: '', salary: 0, otp_enabled: true, shift_start: '', shift_end: '', work_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] });
            }
        }
        setIsSubmitting(false);
    };

    const handleDeleteEmployee = (id: any) => {
        setDeleteConfirmId(id);
    };

    const confirmDelete = async () => {
        if (!deleteConfirmId) return;
        const { error } = await supabase.from('employees').delete().eq('id', deleteConfirmId);
        if (error) {
            console.error("Error deleting", error);
            showToast('error', "Failed to delete");
        } else {
            setEmployees(prev => prev.filter(e => e.id !== deleteConfirmId));
            showToast('success', "Employee removed");
        }
        setDeleteConfirmId(null);
    };

    const handleUnlock = (id: any) => {
        setUnlockConfirmId(id);
    };

    const confirmUnlock = async () => {
        if (!unlockAccount || !unlockConfirmId) return;
        const success = await unlockAccount(unlockConfirmId);
        if (success) {
            showToast('success', "Account unlocked");
            fetchEmployees(); // Refresh list
        } else {
            showToast('error', "Failed to unlock");
        }
        setUnlockConfirmId(null);
    };

    const filteredEmployees = employees.filter(e =>
        e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.role.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Team Management</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Manage store staff and view performance.</p>
                </div>
                <div className="flex gap-2">
                    <div className="flex bg-slate-100 p-1 rounded-lg dark:bg-slate-800">
                        <button
                            onClick={() => setActiveTab('team')}
                            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'team' ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'}`}
                        >
                            Staff List
                        </button>
                        <button
                            onClick={() => setActiveTab('performance')}
                            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'performance' ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'}`}
                        >
                            Performance
                        </button>
                    </div>
                    {activeTab === 'team' && (
                        <button
                            onClick={() => {
                                setEditingId(null);
                                setNewEmployee({ name: '', username: '', phone: '', role: 'staff', pin: '', salary: 0, otp_enabled: true, shift_start: '', shift_end: '', work_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] });
                                setIsAddEmployeeOpen(true);
                            }}
                            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 active:bg-indigo-800 shadow-lg shadow-indigo-500/30"
                        >
                            <Plus className="h-4 w-4" />
                            <span className="hidden sm:inline">Add Member</span>
                        </button>
                    )}
                </div>
            </div>

            {activeTab === 'team' ? (
                <>
                    <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <Search className="h-5 w-5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search employees..."
                            className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400 dark:text-white"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {filteredEmployees.map((employee) => (
                            <div key={employee.id} className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:border-indigo-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-700">
                                <div className="absolute top-4 right-4 z-10">
                                    <button
                                        onClick={() => setActiveMenu(activeMenu === employee.id ? null : employee.id)}
                                        className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
                                    >
                                        <MoreVertical className="h-5 w-5" />
                                    </button>

                                    {activeMenu === employee.id && (
                                        <>
                                            <div className="fixed inset-0 z-0" onClick={() => setActiveMenu(null)}></div>
                                            <div className="absolute right-0 top-10 w-48 rounded-lg border border-slate-100 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900 z-50 overflow-hidden">
                                                <button
                                                    onClick={() => {
                                                        setEditingId(employee.id);
                                                        setNewEmployee({
                                                            name: employee.name,
                                                            username: employee.username || '',
                                                            phone: employee.phone || '',
                                                            role: employee.role,
                                                            pin: employee.pin,
                                                            salary: employee.salary || 0,
                                                            otp_enabled: employee.otp_enabled,
                                                            shift_start: employee.shift_start || '',
                                                            shift_end: employee.shift_end || '',
                                                            work_days: employee.work_days || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
                                                        });
                                                        setActiveMenu(null);
                                                        setIsAddEmployeeOpen(true);
                                                    }}
                                                    className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                                                >
                                                    <Edit2 className="h-4 w-4" /> Edit Details
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setActiveMenu(null);
                                                        handleDeleteEmployee(employee.id);
                                                    }}
                                                    className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                >
                                                    <Trash2 className="h-4 w-4" /> Remove
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>

                                <div className="flex items-center gap-4 mb-6">
                                    <div className="h-16 w-16 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex items-center justify-center text-slate-400">
                                        {employee.avatar ? (
                                            <img src={employee.avatar} alt={employee.name} className="h-full w-full object-cover" />
                                        ) : (
                                            <UserIcon className="h-8 w-8" />
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-900 dark:text-white">{employee.name}</h3>
                                        <div className="flex items-center gap-1.5 mt-1">
                                            <Shield className={`h-3 w-3 ${employee.role === 'owner' ? 'text-amber-500' : employee.role === 'manager' ? 'text-indigo-500' : 'text-slate-500'}`} />
                                            <span className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">{employee.role}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3 border-t border-slate-100 pt-4 dark:border-slate-800">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-slate-500">Status</span>
                                        <div className="flex items-center gap-2">
                                            {employee.is_locked ? (
                                                <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
                                                    Locked
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
                                                    Active
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    {employee.username && (
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-slate-500">Username</span>
                                            <span className="font-medium text-slate-700 dark:text-slate-300">{employee.username}</span>
                                        </div>
                                    )}

                                    {employee.is_locked && (
                                        <button
                                            onClick={() => handleUnlock(employee.id)}
                                            className="w-full mt-2 rounded bg-amber-100 py-1 text-xs font-bold text-amber-700 hover:bg-amber-200"
                                        >
                                            Unlock Account
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}

                        {/* Empty State Helper to encourage adding */}
                        {filteredEmployees.length === 0 && (
                            <div className="col-span-full py-12 text-center text-slate-500">
                                <p>No employees found. Add your team members here.</p>
                            </div>
                        )}
                    </div>
                </>
            ) : (
                /* Performance View */
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm dark:bg-slate-900 dark:border-slate-800">
                        <div className="flex items-center gap-2 text-slate-900 font-medium dark:text-white">
                            <BarChart3 className="h-5 w-5 text-indigo-500" />
                            <span>Sales Performance</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-slate-500">Timeframe:</span>
                            <select
                                value={perfTimeframe}
                                onChange={(e) => setPerfTimeframe(e.target.value)}
                                className="text-sm bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 outline-none dark:bg-slate-800 dark:border-slate-700"
                            >
                                <option value="today">Today</option>
                                <option value="week">This Week</option>
                                <option value="month">This Month</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid gap-6 md:grid-cols-3">
                        {perfStats.map((stat, index) => (
                            <div key={stat.id} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm relative overflow-hidden dark:bg-slate-900 dark:border-slate-800">
                                {index === 0 && (
                                    <div className="absolute top-0 right-0 bg-yellow-400 text-yellow-900 text-xs font-bold px-3 py-1 rounded-bl-xl flex items-center gap-1 shadow-sm">
                                        <Award className="h-3 w-3" /> Top Performer
                                    </div>
                                )}

                                <div className="flex items-center gap-4 mb-4">
                                    <div className={`h-12 w-12 rounded-full flex items-center justify-center text-lg font-bold border-2 ${index === 0 ? 'bg-yellow-50 border-yellow-200 text-yellow-600' : 'bg-slate-50 border-slate-100 text-slate-500 dark:bg-slate-800 dark:border-slate-700'}`}>
                                        {stat.name.charAt(0)}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-900 dark:text-white">{stat.name}</h3>
                                        <p className="text-xs text-slate-500 uppercase">{stat.role}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4 dark:border-slate-800">
                                    <div>
                                        <p className="text-xs text-slate-500 mb-1">Total Sales</p>
                                        <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400">GHS {stat.totalSales.toFixed(2)}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 mb-1">Transactions</p>
                                        <p className="text-lg font-bold text-slate-900 dark:text-white">{stat.txnCount}</p>
                                    </div>
                                </div>

                                <div className="mt-4 pt-3 border-t border-slate-50 dark:border-slate-800/50 flex items-center gap-2 text-xs text-slate-400">
                                    <TrendingUp className="h-3 w-3" />
                                    <span>Avg. Sale: GHS {(stat.totalSales / (stat.txnCount || 1)).toFixed(2)}</span>
                                </div>
                            </div>
                        ))}

                        {perfStats.length === 0 && (
                            <div className="col-span-full py-12 text-center bg-slate-50 rounded-xl border border-slate-200 border-dashed dark:bg-slate-900 dark:border-slate-700">
                                <BarChart3 className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                                <p className="text-slate-500">No performance data available for this period.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Scale-up Add Employee Modal */}
            {isAddEmployeeOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 animate-in zoom-in-95 duration-200">
                        <div className="mb-6 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{editingId ? 'Edit Team Member' : 'Add Team Member'}</h2>
                            <button onClick={() => setIsAddEmployeeOpen(false)} className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-slate-800">
                                <X className="h-5 w-5 text-slate-500" />
                            </button>
                        </div>
                        <form onSubmit={handleSaveEmployee} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Name</label>
                                <input
                                    type="text"
                                    required
                                    className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                                    value={newEmployee.name}
                                    onChange={e => setNewEmployee({ ...newEmployee, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Username</label>
                                <input
                                    type="text"
                                    required
                                    className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                                    value={newEmployee.username}
                                    onChange={e => setNewEmployee({ ...newEmployee, username: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Phone Number</label>
                                <input
                                    type="tel"
                                    className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                                    value={newEmployee.phone}
                                    onChange={e => setNewEmployee({ ...newEmployee, phone: e.target.value })}
                                    placeholder="e.g. 0244000000"
                                />
                            </div>

                            <div className="border-t border-slate-100 pt-4 dark:border-slate-800">
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Shift Schedule</label>
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="text-xs text-slate-500">Start Time</label>
                                        <input
                                            type="time"
                                            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                                            value={newEmployee.shift_start || ''}
                                            onChange={e => setNewEmployee({ ...newEmployee, shift_start: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-500">End Time</label>
                                        <input
                                            type="time"
                                            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                                            value={newEmployee.shift_end || ''}
                                            onChange={e => setNewEmployee({ ...newEmployee, shift_end: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs text-slate-500 mb-1 block">Working Days</label>
                                    <div className="flex flex-wrap gap-1">
                                        {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                                            <button
                                                key={day}
                                                type="button"
                                                onClick={() => {
                                                    const days = newEmployee.work_days || [];
                                                    if (days.includes(day)) {
                                                        setNewEmployee({ ...newEmployee, work_days: days.filter(d => d !== day) });
                                                    } else {
                                                        setNewEmployee({ ...newEmployee, work_days: [...days, day] });
                                                    }
                                                }}
                                                className={`px-2 py-1 text-xs rounded-full border transition-colors ${(newEmployee.work_days || []).includes(day)
                                                    ? 'bg-indigo-100 border-indigo-200 text-indigo-700 dark:bg-indigo-900/40 dark:border-indigo-800 dark:text-indigo-300'
                                                    : 'bg-slate-50 border-slate-200 text-slate-500 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'
                                                    }`}
                                            >
                                                {day.slice(0, 3)}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Role</label>
                                    <select
                                        className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                                        value={newEmployee.role}
                                        onChange={e => setNewEmployee({ ...newEmployee, role: e.target.value })}
                                    >
                                        <option value="staff">Staff</option>
                                        <option value="manager">Manager</option>
                                        <option value="owner">Owner</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">PIN (Login)</label>
                                    <input
                                        type="text"
                                        required
                                        maxLength={4}
                                        className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                                        value={newEmployee.pin}
                                        onChange={e => setNewEmployee({ ...newEmployee, pin: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="otp_enabled"
                                    checked={newEmployee.otp_enabled}
                                    onChange={e => setNewEmployee({ ...newEmployee, otp_enabled: e.target.checked })}
                                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                <label htmlFor="otp_enabled" className="text-sm text-slate-700 dark:text-slate-300">Enable OTP (Requires Phone Number)</label>
                            </div>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 disabled:opacity-50"
                            >
                                {isSubmitting ? 'Saving...' : (editingId ? 'Save Changes' : 'Add Member')}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmDialog
                isOpen={!!deleteConfirmId}
                onClose={() => setDeleteConfirmId(null)}
                onConfirm={confirmDelete}
                title="Remove Employee"
                description="Are you sure you want to remove this employee? This action cannot be undone."
                confirmText="Remove"
                variant="danger"
            />

            <ConfirmDialog
                isOpen={!!unlockConfirmId}
                onClose={() => setUnlockConfirmId(null)}
                onConfirm={confirmUnlock}
                title="Unlock Account"
                description="Are you sure you want to unlock this account?"
                confirmText="Unlock"
                variant="warning"
            />
        </div>
    )
}
