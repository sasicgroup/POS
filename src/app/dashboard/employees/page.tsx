'use client';

import { useAuth } from '@/lib/auth-context';
import { Search, Filter, Plus, Mail, Phone, MapPin, Shield, X, Edit, Trash2, Ban, Banknote, History, CheckCircle, Clock, Calendar, DollarSign, Wallet, FileText, Download } from 'lucide-react';
import { useState } from 'react';

export default function EmployeesPage() {
    const { activeStore } = useAuth();
    const [activeTab, setActiveTab] = useState('employees'); // 'employees' | 'payroll'
    const [isAddEmployeeOpen, setIsAddEmployeeOpen] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null);
    const [editingEmployee, setEditingEmployee] = useState<any | null>(null);
    const [newEmployee, setNewEmployee] = useState({
        name: '',
        email: '',
        role: 'Staff',
        phone: '',
        location: '',
        password: '',
        salary: '',
    });

    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [employeeToDelete, setEmployeeToDelete] = useState<number | null>(null);

    const [employees, setEmployees] = useState([
        {
            id: 1,
            name: 'Sarah Miller',
            email: 'sarah.m@store.com',
            role: 'Manager',
            status: 'Active',
            phone: '0244123456',
            location: 'New York, NY',
            joinDate: 'Mar 15, 2023',
            avatar: 'https://ui-avatars.com/api/?name=Sarah+Miller&background=random',
            salary: 5000,
            lastPaid: 'Dec 28, 2024'
        },
        {
            id: 2,
            name: 'Michael Chen',
            email: 'm.chen@store.com',
            role: 'Staff',
            status: 'Active',
            phone: '0501123456',
            location: 'Brooklyn, NY',
            joinDate: 'Jun 01, 2023',
            avatar: 'https://ui-avatars.com/api/?name=Michael+Chen&background=random',
            salary: 3000,
            lastPaid: 'Dec 28, 2024'
        },
        {
            id: 3,
            name: 'Jessica Davis',
            email: 'jess.d@store.com',
            role: 'Staff',
            status: 'On Leave',
            phone: '0204123456',
            location: 'New York, NY',
            joinDate: 'Jan 20, 2024',
            avatar: 'https://ui-avatars.com/api/?name=Jessica+Davis&background=random',
            salary: 3000,
            lastPaid: 'Dec 28, 2024'
        },
        {
            id: 4,
            name: 'David Wilson',
            email: 'david.w@store.com',
            role: 'Staff',
            status: 'Active',
            phone: '0555123456',
            location: 'Queens, NY',
            joinDate: 'Nov 12, 2023',
            avatar: 'https://ui-avatars.com/api/?name=David+Wilson&background=random',
            salary: 3200,
            lastPaid: 'Dec 28, 2024'
        },
        {
            id: 5,
            name: 'Emily Taylor',
            email: 'emily.t@store.com',
            role: 'Manager',
            status: 'Active',
            phone: '0277123456',
            location: 'Manhattan, NY',
            joinDate: 'Sep 05, 2022',
            avatar: 'https://ui-avatars.com/api/?name=Emily+Taylor&background=random',
            salary: 5500,
            lastPaid: 'Dec 28, 2024'
        },
    ]);

    // Payroll Mock Data
    const [payrollHistory, setPayrollHistory] = useState([
        { id: 101, month: 'December 2024', employeesPaid: 5, totalAmount: 19700, status: 'Completed', date: 'Dec 28, 2024' },
        { id: 102, month: 'November 2024', employeesPaid: 5, totalAmount: 19700, status: 'Completed', date: 'Nov 28, 2024' },
        { id: 103, month: 'October 2024', employeesPaid: 4, totalAmount: 16500, status: 'Completed', date: 'Oct 28, 2024' },
    ]);

    const handleAddEmployee = (e: React.FormEvent) => {
        e.preventDefault();

        if (editingEmployee) {
            setEmployees(employees.map(emp =>
                emp.id === editingEmployee.id
                    ? {
                        ...emp,
                        ...newEmployee,
                        salary: Number(newEmployee.salary) || 0,
                        avatar: `https://ui-avatars.com/api/?name=${newEmployee.name.replace(' ', '+')}&background=random`
                    }
                    : emp
            ));
        } else {
            const employee = {
                id: employees.length + 1,
                ...newEmployee,
                salary: Number(newEmployee.salary) || 0,
                lastPaid: 'Never',
                status: 'Active',
                joinDate: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
                avatar: `https://ui-avatars.com/api/?name=${newEmployee.name.replace(' ', '+')}&background=random`
            };
            setEmployees([...employees, employee]);
        }

        setIsAddEmployeeOpen(false);
        setEditingEmployee(null);
        setNewEmployee({ name: '', email: '', role: 'Staff', phone: '', location: '', password: '', salary: '' });
    };

    const handleEditEmployee = (employee: any) => {
        setEditingEmployee(employee);
        setNewEmployee({
            name: employee.name,
            email: employee.email,
            role: employee.role,
            phone: employee.phone,
            location: employee.location,
            password: '',
            salary: employee.salary.toString(),
        });
        setIsAddEmployeeOpen(true);
    };

    const confirmDeleteEmployee = (id: number) => {
        setEmployeeToDelete(id);
        setDeleteModalOpen(true);
    };

    const handleDeleteEmployee = () => {
        if (employeeToDelete) {
            setEmployees(employees.filter(e => e.id !== employeeToDelete));
            setDeleteModalOpen(false);
            setEmployeeToDelete(null);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS' }).format(amount);
    };

    if (!activeStore) return null;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Team & Payroll</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Manage employees, track attendance, and process payroll.</p>
                </div>

                <div className="flex gap-3">
                    {/* Tab Switcher */}
                    <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                        <button
                            onClick={() => setActiveTab('employees')}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'employees' ? 'bg-white dark:bg-slate-700 shadow text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'}`}
                        >
                            Employees
                        </button>
                        <button
                            onClick={() => setActiveTab('payroll')}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'payroll' ? 'bg-white dark:bg-slate-700 shadow text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'}`}
                        >
                            Payroll
                        </button>
                    </div>

                    {activeTab === 'employees' && (
                        <button
                            onClick={() => {
                                setEditingEmployee(null);
                                setNewEmployee({ name: '', email: '', role: 'Staff', phone: '', location: '', password: '', salary: '' });
                                setIsAddEmployeeOpen(true);
                            }}
                            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 active:bg-indigo-800 shadow-lg shadow-indigo-500/30"
                        >
                            <Plus className="h-4 w-4" />
                            <span className="hidden sm:inline">Add Employee</span>
                        </button>
                    )}
                    {activeTab === 'payroll' && (
                        <button className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 active:bg-emerald-800 shadow-lg shadow-emerald-500/30">
                            <Banknote className="h-4 w-4" />
                            <span className="hidden sm:inline">Run Payroll</span>
                        </button>
                    )}
                </div>
            </div>

            {activeTab === 'employees' ? (
                // --- EMPLOYEE EMPLOYEES TAB ---
                <>
                    <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/50">
                        <div className="border-b border-slate-200 p-4 dark:border-slate-800">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Search employees by name, email, or role..."
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
                                        <th className="px-6 py-4 font-medium">Employee</th>
                                        <th className="px-6 py-4 font-medium">Role</th>
                                        <th className="px-6 py-4 font-medium">Contact</th>
                                        <th className="px-6 py-4 font-medium">Location</th>
                                        <th className="px-6 py-4 font-medium">Status</th>
                                        <th className="px-6 py-4 font-medium">Salary</th>
                                        <th className="px-6 py-4 font-medium text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                    {employees.map((employee) => (
                                        <tr key={employee.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <img src={employee.avatar} alt={employee.name} className="h-10 w-10 rounded-full bg-slate-100" />
                                                    <div>
                                                        <p className="font-medium text-slate-900 dark:text-slate-100">{employee.name}</p>
                                                        <p className="text-xs text-slate-500">Joined {employee.joinDate}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{employee.role}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1 text-slate-500">
                                                    <div className="flex items-center gap-2">
                                                        <Mail className="h-3 w-3" /> {employee.email}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Phone className="h-3 w-3" /> {employee.phone}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{employee.location}</td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${employee.status === 'Active' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                                                    {employee.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                                                {formatCurrency(employee.salary)}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => setSelectedEmployee(employee)}
                                                        className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-slate-800"
                                                        title="View Profile"
                                                    >
                                                        <Shield className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleEditEmployee(employee)}
                                                        className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-blue-600 dark:hover:bg-slate-800 dark:hover:text-blue-400"
                                                        title="Edit Employee"
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => confirmDeleteEmployee(employee.id)}
                                                        className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-slate-800 dark:hover:text-red-400"
                                                        title="Remove Employee"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            ) : (
                // --- PAYROLL TAB ---
                <div className="space-y-6">
                    {/* Metrics Cards */}
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                            <div className="flex items-center gap-4">
                                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
                                    <Wallet className="h-6 w-6" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Monthly Payload</p>
                                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                                        {formatCurrency(employees.reduce((acc, emp) => acc + emp.salary, 0))}
                                    </h3>
                                </div>
                            </div>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                            <div className="flex items-center gap-4">
                                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                                    <CheckCircle className="h-6 w-6" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Last Pay Run</p>
                                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">Dec 28, 2024</h3>
                                    <p className="text-xs text-emerald-600">Successfully Completed</p>
                                </div>
                            </div>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                            <div className="flex items-center gap-4">
                                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                                    <Clock className="h-6 w-6" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Next Pay Date</p>
                                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">Jan 28, 2025</h3>
                                    <p className="text-xs text-amber-600">21 Days Remaining</p>
                                </div>
                            </div>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                            <div className="flex items-center gap-4">
                                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
                                    <Banknote className="h-6 w-6" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Employees Paid</p>
                                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{employees.length}/{employees.length}</h3>
                                    <p className="text-xs text-slate-500">Last Month</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-6 lg:grid-cols-3">
                        {/* Current Payroll List */}
                        <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                            <div className="border-b border-slate-200 p-6 dark:border-slate-800 flex justify-between items-center">
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Current Payroll (Jan 2025)</h3>
                                <div className="text-sm text-slate-500">Status: <span className="font-medium text-amber-600">Pending</span></div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50 text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
                                        <tr>
                                            <th className="px-6 py-4 font-medium">Employee</th>
                                            <th className="px-6 py-4 font-medium">Base Salary</th>
                                            <th className="px-6 py-4 font-medium">Bonuses</th>
                                            <th className="px-6 py-4 font-medium">Net Pay</th>
                                            <th className="px-6 py-4 font-medium text-right">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {employees.map((employee) => (
                                            <tr key={employee.id}>
                                                <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                                                    <div className="flex items-center gap-3">
                                                        <img src={employee.avatar} alt={employee.name} className="h-8 w-8 rounded-full" />
                                                        {employee.name}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">{formatCurrency(employee.salary)}</td>
                                                <td className="px-6 py-4 text-emerald-600">+ GHS 0.00</td>
                                                <td className="px-6 py-4 font-bold">{formatCurrency(employee.salary)}</td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                                        Pending
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Payroll History */}
                        <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                            <div className="border-b border-slate-200 p-6 dark:border-slate-800">
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <History className="h-5 w-5 text-indigo-500" />
                                    Payroll History
                                </h3>
                            </div>
                            <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                {payrollHistory.map((record) => (
                                    <div key={record.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <div className="flex items-center justify-between mb-2">
                                            <p className="font-semibold text-slate-900 dark:text-white">{record.month}</p>
                                            <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                                                {record.status}
                                            </span>
                                        </div>
                                        <div className="flex justify-between text-sm text-slate-500 dark:text-slate-400">
                                            <span>{record.employeesPaid} Employees Paid</span>
                                            <span className="font-medium text-slate-700 dark:text-slate-300">{formatCurrency(record.totalAmount)}</span>
                                        </div>
                                        <div className="mt-3 flex gap-2">
                                            <button className="flex-1 rounded border border-slate-200 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
                                                View Details
                                            </button>
                                            <button className="rounded border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
                                                <Download className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                <div className="p-4 text-center">
                                    <button className="text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">View All History</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Employee Modal */}
            {isAddEmployeeOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 animate-in zoom-in-95">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                                {editingEmployee ? 'Edit Employee' : 'Add New Employee'}
                            </h2>
                            <button onClick={() => setIsAddEmployeeOpen(false)} className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-slate-800">
                                <X className="h-5 w-5 text-slate-500" />
                            </button>
                        </div>
                        <form onSubmit={handleAddEmployee} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Name</label>
                                <input
                                    required
                                    type="text"
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
                                        <option value="Staff">Staff</option>
                                        <option value="Manager">Manager</option>
                                        <option value="Admin">Admin</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Base Salary (GHS)</label>
                                    <input
                                        required
                                        type="number"
                                        className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                                        value={newEmployee.salary}
                                        placeholder="0.00"
                                        onChange={e => setNewEmployee({ ...newEmployee, salary: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
                                <input
                                    required
                                    type="email"
                                    className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                                    value={newEmployee.email}
                                    onChange={e => setNewEmployee({ ...newEmployee, email: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Phone</label>
                                <input
                                    required
                                    type="tel"
                                    className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                                    value={newEmployee.phone}
                                    onChange={e => setNewEmployee({ ...newEmployee, phone: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Location</label>
                                <input
                                    type="text"
                                    className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                                    value={newEmployee.location}
                                    onChange={e => setNewEmployee({ ...newEmployee, location: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Password</label>
                                <input
                                    type="password"
                                    className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                                    value={newEmployee.password}
                                    placeholder={editingEmployee ? "Leave blank to keep unchanged" : "Enter password"}
                                    onChange={e => setNewEmployee({ ...newEmployee, password: e.target.value })}
                                />
                            </div>
                            <div className="flex justify-end pt-4 gap-3">
                                <button type="button" onClick={() => setIsAddEmployeeOpen(false)} className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
                                    Cancel
                                </button>
                                <button type="submit" className="px-4 py-2 rounded-lg bg-indigo-600 text-sm font-medium text-white hover:bg-indigo-700 shadow-sm">
                                    {editingEmployee ? 'Save Changes' : 'Add Employee'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Employee Details Modal */}
            {selectedEmployee && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900 scale-100 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
                        <div className="relative h-32 bg-gradient-to-r from-indigo-500 to-purple-600">
                            <button
                                onClick={() => setSelectedEmployee(null)}
                                className="absolute right-4 top-4 rounded-full bg-black/20 p-2 text-white hover:bg-black/40 backdrop-blur-sm"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="px-6 pb-6">
                            <div className="relative -mt-16 mb-6 flex justify-between items-end">
                                <img src={selectedEmployee.avatar} alt={selectedEmployee.name} className="h-32 w-32 rounded-full border-4 border-white bg-slate-100 dark:border-slate-900" />
                                <div className="mb-2 flex gap-2">
                                    <button className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">Edit Profile</button>
                                </div>
                            </div>

                            <div className="mb-6">
                                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{selectedEmployee.name}</h2>
                                <p className="text-indigo-600 dark:text-indigo-400 font-medium">{selectedEmployee.role}</p>
                            </div>

                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/50">
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Status</p>
                                        <p className="text-sm font-medium text-slate-900 dark:text-white">{selectedEmployee.status}</p>
                                    </div>
                                    <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/50">
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Salary</p>
                                        <p className="text-sm font-medium text-slate-900 dark:text-white">{formatCurrency(selectedEmployee.salary)}</p>
                                    </div>
                                </div>

                                <div className="space-y-3 pt-2">
                                    <div className="flex items-center gap-3 rounded-lg p-2 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                            <Mail className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">Email Address</p>
                                            <p className="text-sm font-medium text-slate-900 dark:text-white">{selectedEmployee.email}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 rounded-lg p-2 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                            <Phone className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">Phone Mobile</p>
                                            <p className="text-sm font-medium text-slate-900 dark:text-white">{selectedEmployee.phone}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 rounded-lg p-2 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                            <MapPin className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">Location</p>
                                            <p className="text-sm font-medium text-slate-900 dark:text-white">{selectedEmployee.location}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
                    <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 animate-in zoom-in-95">
                        <div className="mb-4 flex flex-col items-center text-center">
                            <div className="mb-4 rounded-full bg-red-100 p-3 text-red-600 dark:bg-red-900/30 dark:text-red-400">
                                <Trash2 className="h-6 w-6" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Delete Employee?</h3>
                            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                                Are you sure you want to delete this employee? This action cannot be undone.
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeleteModalOpen(false)}
                                className="flex-1 rounded-lg border border-slate-200 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteEmployee}
                                className="flex-1 rounded-lg bg-red-600 py-2.5 text-sm font-medium text-white hover:bg-red-700"
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
