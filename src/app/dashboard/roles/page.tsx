'use client';

import { useAuth } from '@/lib/auth-context';
import { useState } from 'react';
import { Shield, Lock, Save, ShieldCheck } from 'lucide-react';

export default function RolesPage() {
    const { activeStore, user } = useAuth();
    const [activeRoleSelector, setActiveRoleSelector] = useState('admin'); // 'super_admin' | 'admin' | 'manager' | 'staff'

    // Mock Permissions Data
    const PERMISSIONS = [
        {
            module: 'Dashboard',
            actions: [
                { id: 'view_dashboard', label: 'View Dashboard' },
                { id: 'view_analytics', label: 'View Analytics & Reports' }
            ]
        },
        {
            module: 'Inventory',
            actions: [
                { id: 'view_inventory', label: 'View Inventory' },
                { id: 'add_product', label: 'Add Products' },
                { id: 'edit_product', label: 'Edit Products' },
                { id: 'delete_product', label: 'Delete Products' },
                { id: 'adjust_stock', label: 'Adjust Stock Levels' }
            ]
        },
        {
            module: 'Sales (POS)',
            actions: [
                { id: 'access_pos', label: 'Access POS' },
                { id: 'process_returns', label: 'Process Returns' },
                { id: 'give_discount', label: 'Give Discounts' },
                { id: 'view_sales_history', label: 'View Sales History' }
            ]
        },
        {
            module: 'Customers',
            actions: [
                { id: 'view_customers', label: 'View Customers' },
                { id: 'manage_customers', label: 'Add/Edit/Delete Customers' },
            ]
        },
        {
            module: 'Employees',
            actions: [
                { id: 'view_employees', label: 'View Employees' },
                { id: 'manage_employees', label: 'Manage Employees & Roles' }
            ]
        },
        {
            module: 'Settings',
            actions: [
                { id: 'access_settings', label: 'Access Store Settings' }
            ]
        }
    ];

    const [rolePermissions, setRolePermissions] = useState<any>({
        super_admin: {
            all: true
        },
        admin: {
            view_dashboard: true, view_analytics: true,
            view_inventory: true, add_product: true, edit_product: true, delete_product: true, adjust_stock: true,
            access_pos: true, process_returns: true, give_discount: true, view_sales_history: true,
            view_customers: true, manage_customers: true,
            view_employees: true, manage_employees: true,
            access_settings: true
        },
        manager: {
            view_dashboard: true, view_analytics: true,
            view_inventory: true, add_product: true, edit_product: true, delete_product: false, adjust_stock: true,
            access_pos: true, process_returns: true, give_discount: true, view_sales_history: true,
            view_customers: true, manage_customers: true,
            view_employees: true, manage_employees: false,
            access_settings: false
        },
        staff: {
            view_dashboard: true, view_analytics: false,
            view_inventory: true, add_product: false, edit_product: false, delete_product: false, adjust_stock: false,
            access_pos: true, process_returns: false, give_discount: false, view_sales_history: false,
            view_customers: true, manage_customers: true,
            view_employees: false, manage_employees: false,
            access_settings: false
        }
    });

    const handlePermissionToggle = (role: string, permissionId: string) => {
        if (role === 'super_admin') return;
        setRolePermissions((prev: any) => ({
            ...prev,
            [role]: {
                ...prev[role],
                [permissionId]: !prev[role][permissionId]
            }
        }));
    };

    const isPermitted = (role: string, permissionId: string) => {
        if (role === 'super_admin') return true;
        return rolePermissions[role]?.[permissionId] === true;
    };

    if (!activeStore || !user) return null;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Roles & Permissions</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Manage access levels and permissions for your team members.</p>
                </div>
                <button className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 active:bg-indigo-800 shadow-lg shadow-indigo-500/30">
                    <Save className="h-4 w-4" />
                    Save Changes
                </button>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex flex-col gap-6 lg:flex-row">
                    {/* Role Selector Sidebar */}
                    <div className="w-full lg:w-64 flex-shrink-0 space-y-2">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-4 px-2">Select Role</h3>
                        {[
                            { id: 'super_admin', label: 'Super Admin', desc: 'Full Access' },
                            { id: 'admin', label: 'Admin', desc: 'Store Manager' },
                            { id: 'manager', label: 'Manager', desc: 'Team Lead' },
                            { id: 'staff', label: 'Staff', desc: 'Employee' }
                        ].map((role) => (
                            <button
                                key={role.id}
                                onClick={() => setActiveRoleSelector(role.id)}
                                className={`w-full text-left px-4 py-3 rounded-lg border transition-all ${activeRoleSelector === role.id
                                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900/20 dark:border-indigo-800 dark:text-indigo-400'
                                    : 'border-transparent hover:bg-slate-50 text-slate-600 dark:hover:bg-slate-800 dark:text-slate-400'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-full ${activeRoleSelector === role.id ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                                        <ShieldCheck className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <div className="font-medium">{role.label}</div>
                                        <div className="text-xs opacity-70">{role.desc}</div>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>

                    {/* Permissions Matrix */}
                    <div className="flex-1 bg-slate-50 rounded-xl p-6 border border-slate-100 dark:bg-slate-800/20 dark:border-slate-800">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="font-bold text-slate-900 dark:text-white capitalize flex items-center gap-2">
                                {activeRoleSelector.replace('_', ' ')} Permissions
                            </h3>
                            {activeRoleSelector === 'super_admin' && (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                                    <Lock className="h-3 w-3" />
                                    Full Access Locked
                                </span>
                            )}
                        </div>

                        <div className="grid gap-6 md:grid-cols-2">
                            {PERMISSIONS.map((moduleItem) => (
                                <div key={moduleItem.module} className="bg-white rounded-lg border border-slate-200 p-4 dark:bg-slate-900 dark:border-slate-800 shadow-sm">
                                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                                        <div className="h-1.5 w-1.5 rounded-full bg-indigo-500"></div>
                                        {moduleItem.module}
                                    </h4>
                                    <div className="space-y-3">
                                        {moduleItem.actions.map((action) => {
                                            const isChecked = isPermitted(activeRoleSelector, action.id);
                                            const isLocked = activeRoleSelector === 'super_admin';

                                            return (
                                                <label key={action.id} className={`flex items-start gap-3 p-2 rounded hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${isLocked ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'}`}>
                                                    <div className="relative flex items-center h-5">
                                                        <input
                                                            type="checkbox"
                                                            disabled={isLocked}
                                                            checked={isChecked}
                                                            onChange={() => handlePermissionToggle(activeRoleSelector, action.id)}
                                                            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-50"
                                                        />
                                                    </div>
                                                    <div className="text-sm">
                                                        <span className="font-medium text-slate-700 dark:text-slate-300">
                                                            {action.label}
                                                        </span>
                                                    </div>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
