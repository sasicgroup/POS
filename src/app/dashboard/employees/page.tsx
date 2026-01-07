'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Plus, Search, MoreVertical, Shield, User as UserIcon, Mail, X } from 'lucide-react';

interface Employee {
    id: any;
    name: string;
    role: string;
    email: string;
    pin?: string;
    salary?: number;
    avatar?: string;
    status?: string;
    joinDate?: string;
}

export default function EmployeesPage() {
    const { activeStore } = useAuth();
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

    const [isAddEmployeeOpen, setIsAddEmployeeOpen] = useState(false);
    const [newEmployee, setNewEmployee] = useState({
        name: '', role: 'associate', pin: '', email: '', salary: 0
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (activeStore?.id) fetchEmployees();
    }, [activeStore?.id]);

    const fetchEmployees = async () => {
        if (!activeStore?.id) return;
        const { data, error } = await supabase
            .from('employees')
            .select('*')
            .eq('store_id', activeStore.id);

        if (error) console.error(error);
        if (data) setEmployees(data);
    };

    const handleAddEmployee = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeStore?.id) return;
        setIsSubmitting(true);

        const { data, error } = await supabase.from('employees').insert({
            store_id: activeStore.id,
            name: newEmployee.name,
            role: newEmployee.role,
            pin: newEmployee.pin,
            email: newEmployee.email,
            salary: newEmployee.salary
        }).select().single();

        if (error) {
            console.error("Error adding employee:", error);
            alert("Failed to add employee");
        } else if (data) {
            setEmployees(prev => [data, ...prev]);
            setIsAddEmployeeOpen(false);
            setNewEmployee({ name: '', role: 'associate', pin: '', email: '', salary: 0 });
        }
        setIsSubmitting(false);
    }

    const filteredEmployees = employees.filter(e =>
        e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.role.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Team Members</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Manage access and roles for your store staff.</p>
                </div>
                <button
                    onClick={() => setIsAddEmployeeOpen(true)}
                    className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 active:bg-indigo-800 shadow-lg shadow-indigo-500/30"
                >
                    <Plus className="h-4 w-4" />
                    Add Employee
                </button>
            </div>

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
                        <div className="absolute top-4 right-4">
                            <button className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                                <MoreVertical className="h-5 w-5" />
                            </button>
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
                            <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                                <Mail className="h-4 w-4" /> {employee.email || 'No email'}
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-500">Status</span>
                                <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
                                    Active
                                </span>
                            </div>
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

            {/* Scale-up Add Employee Modal */}
            {isAddEmployeeOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 animate-in zoom-in-95 duration-200">
                        <div className="mb-6 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Add Team Member</h2>
                            <button onClick={() => setIsAddEmployeeOpen(false)} className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-slate-800">
                                <X className="h-5 w-5 text-slate-500" />
                            </button>
                        </div>
                        <form onSubmit={handleAddEmployee} className="space-y-4">
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
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Role</label>
                                    <select
                                        className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                                        value={newEmployee.role}
                                        onChange={e => setNewEmployee({ ...newEmployee, role: e.target.value })}
                                    >
                                        <option value="associate">Associate</option>
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
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
                                <input
                                    type="email"
                                    className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                                    value={newEmployee.email}
                                    onChange={e => setNewEmployee({ ...newEmployee, email: e.target.value })}
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 disabled:opacity-50"
                            >
                                {isSubmitting ? 'Saving...' : 'Add Member'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
