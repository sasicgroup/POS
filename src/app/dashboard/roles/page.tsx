'use client';

import { useAuth, DEFAULT_PERMISSIONS } from '@/lib/auth-context';
import { useState, useEffect } from 'react';
import { Shield, Lock, Save, ShieldCheck, Store, Users, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/lib/toast-context';

export default function RolesPage() {
    const { activeStore, user, updateRolePermissions } = useAuth();
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState<'permissions' | 'access'>('permissions');

    // Permissions State
    const [activeRoleSelector, setActiveRoleSelector] = useState('manager');
    const [rolePermissions, setRolePermissions] = useState<any>(DEFAULT_PERMISSIONS);

    // Load from store on mount/change
    useEffect(() => {
        if (activeStore?.rolePermissions) {
            setRolePermissions(activeStore.rolePermissions);
        } else {
            setRolePermissions(DEFAULT_PERMISSIONS);
        }
    }, [activeStore]);

    // Access Management State
    const [employees, setEmployees] = useState<any[]>([]);
    const [allStores, setAllStores] = useState<any[]>([]);
    const [accessMap, setAccessMap] = useState<Record<string, string[]>>({}); // employeeId -> [storeId, storeId]

    useEffect(() => {
        if (activeTab === 'access') {
            fetchAccessData();
        }
    }, [activeTab]);

    const fetchAccessData = async () => {
        // Fetch All Employees (Assuming Owner/Admin view)
        const { data: empData } = await supabase.from('employees').select('*');
        if (empData) setEmployees(empData);

        // Fetch All Stores
        const { data: storeData } = await supabase.from('stores').select('*');
        if (storeData) setAllStores(storeData);

        // Fetch Access Junction
        const { data: accessData } = await supabase.from('employee_access').select('*');
        if (accessData) {
            const mapping: Record<string, string[]> = {};
            accessData.forEach((row: any) => {
                if (!mapping[row.employee_id]) mapping[row.employee_id] = [];
                mapping[row.employee_id].push(row.store_id);
            });
            setAccessMap(mapping);
        }
    };

    const toggleStoreAccess = async (employeeId: string, storeId: string, hasAccess: boolean) => {
        if (hasAccess) {
            // Remove Access
            const { error } = await supabase
                .from('employee_access')
                .delete()
                .match({ employee_id: employeeId, store_id: storeId });

            if (!error) {
                setAccessMap(prev => ({
                    ...prev,
                    [employeeId]: prev[employeeId].filter(id => id !== storeId)
                }));
            }
        } else {
            // Grant Access
            const { error } = await supabase
                .from('employee_access')
                .insert({ employee_id: employeeId, store_id: storeId, role: 'staff' }); // Default role, could be improved

            if (!error) {
                setAccessMap(prev => ({
                    ...prev,
                    [employeeId]: [...(prev[employeeId] || []), storeId]
                }));
            }
        }
    };

    // ... Keep Permissions Logic ...
    const PERMISSIONS = [
        { module: 'Dashboard', actions: [{ id: 'view_dashboard', label: 'View Dashboard' }, { id: 'view_analytics', label: 'View Analytics & Reports' }] },
        { module: 'Inventory', actions: [{ id: 'view_inventory', label: 'View Inventory' }, { id: 'add_product', label: 'Add Products' }, { id: 'edit_product', label: 'Edit Products' }, { id: 'delete_product', label: 'Delete Products' }, { id: 'adjust_stock', label: 'Adjust Stock Levels' }] },
        { module: 'Sales (POS)', actions: [{ id: 'access_pos', label: 'Access POS' }, { id: 'process_returns', label: 'Process Returns' }, { id: 'give_discount', label: 'Give Discounts' }, { id: 'view_sales_history', label: 'View Sales History' }] },
        { module: 'Customers', actions: [{ id: 'view_customers', label: 'View Customers' }, { id: 'manage_customers', label: 'Add/Edit/Delete Customers' }] },
        { module: 'Employees', actions: [{ id: 'view_employees', label: 'View Employees' }, { id: 'manage_employees', label: 'Manage Employees & Roles' }] },
        { module: 'Settings', actions: [{ id: 'access_settings', label: 'Access Store Settings' }, { id: 'view_roles', label: 'View Roles' }, { id: 'manage_roles', label: 'Manage Roles' }] }
    ];

    const handlePermissionToggle = (role: string, permissionId: string) => {
        setRolePermissions((prev: any) => ({
            ...prev,
            [role]: {
                ...prev[role],
                [permissionId]: !prev[role][permissionId]
            }
        }));
    };

    const handleSavePermissions = async () => {
        if (!updateRolePermissions) return; // Guard

        let success = true;

        // Save Active Role First (Optimization)
        const updated = await updateRolePermissions(activeRoleSelector, rolePermissions[activeRoleSelector]);
        if (!updated) success = false;

        // Optionally save others if changed? For now single save based on active view is safest or loop all.
        // Let's loop all except owner
        const rolesToSave = Object.keys(rolePermissions).filter(r => r !== 'owner' && r !== activeRoleSelector);
        for (const role of rolesToSave) {
            const ok = await updateRolePermissions(role, rolePermissions[role]);
            if (!ok) success = false;
        }

        if (success) {
            showToast('success', 'Permissions saved successfully');
        } else {
            showToast('error', 'Failed to save permissions. Ensure you have the latest database schema.');
        }
    };

    const isPermitted = (role: string, permissionId: string) => {
        if (role === 'owner') return true;
        return rolePermissions[role]?.[permissionId] === true;
    };

    if (!activeStore || !user) return null;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Roles & Permissions</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Manage access levels and multi-store assignments.</p>
                </div>
                {activeTab === 'permissions' && (
                    <button
                        onClick={handleSavePermissions}
                        className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 active:bg-indigo-800 shadow-lg shadow-indigo-500/30">
                        <Save className="h-4 w-4" />
                        Save Changes
                    </button>
                )}
            </div>

            {/* Tabs */}
            <div className="flex gap-4 border-b border-slate-200 dark:border-slate-800">
                <button
                    onClick={() => setActiveTab('access')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'access' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    Store Access
                </button>
                <button
                    onClick={() => setActiveTab('permissions')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'permissions' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    Role Permissions
                </button>
            </div>

            {activeTab === 'access' ? (
                <div className="grid gap-6 md:grid-cols-1">
                    <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
                        <div className="border-b border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-slate-800/50">
                            <h3 className="font-semibold text-slate-900 dark:text-slate-100">Staff Store Assignment</h3>
                        </div>
                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                            {employees.map((emp) => (
                                <div key={emp.id} className="p-6">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                                        <div className="flex items-center gap-4">
                                            <div className="h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 font-bold">
                                                {emp.name.substring(0, 2).toUpperCase()}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-900 dark:text-white">{emp.name}</h4>
                                                <p className="text-sm text-slate-500">{emp.role} • {emp.email || 'No Email'}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="pl-14">
                                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Accessible Stores:</p>
                                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                            {allStores.map(store => {
                                                const hasAccess = accessMap[emp.id]?.includes(store.id);
                                                return (
                                                    <label key={store.id} className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer ${hasAccess ? 'bg-indigo-50 border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-800' : 'bg-slate-50 border-slate-200 dark:bg-slate-800/50 dark:border-slate-700'}`}>
                                                        <input
                                                            type="checkbox"
                                                            checked={!!hasAccess}
                                                            onChange={() => toggleStoreAccess(emp.id, store.id, !!hasAccess)}
                                                            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                                        />
                                                        <span className="text-sm font-medium text-slate-700 dark:text-slate-200 flex-1 truncate">{store.name}</span>
                                                        {hasAccess && <Check className="h-4 w-4 text-indigo-600" />}
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {employees.length === 0 && (
                                <div className="p-8 text-center text-slate-500">No employees found.</div>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex flex-col gap-6 lg:flex-row">
                        {/* Role Selector Sidebar */}
                        <div className="w-full lg:w-64 flex-shrink-0 space-y-2">
                            {/* ... Keep Existing Role Selector ... */}
                            {['super_admin', 'admin', 'manager', 'staff'].map((roleStr) => {
                                const roleId = roleStr; // simplification
                                const labels: any = { super_admin: 'Super Admin', admin: 'Admin', manager: 'Manager', staff: 'Staff' };
                                return (
                                    <button
                                        key={roleId}
                                        onClick={() => setActiveRoleSelector(roleId)}
                                        className={`w-full text-left px-4 py-3 rounded-lg border transition-all ${activeRoleSelector === roleId ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900/20 dark:border-indigo-800' : 'border-transparent hover:bg-slate-50'}`}
                                    >
                                        <div className="font-medium">{labels[roleId]}</div>
                                    </button>
                                )
                            })}
                        </div>
                        {/* Matrix */}
                        <div className="flex-1 bg-slate-50 rounded-xl p-6 border border-slate-100 dark:bg-slate-800/20">
                            <div className="grid gap-6 md:grid-cols-2">
                                {PERMISSIONS.map((moduleItem) => (
                                    <div key={moduleItem.module} className="bg-white rounded-lg border border-slate-200 p-4 dark:bg-slate-900 shadow-sm">
                                        <h4 className="font-semibold mb-3">{moduleItem.module}</h4>
                                        <div className="space-y-2">
                                            {moduleItem.actions.map(action => (
                                                <label key={action.id} className="flex items-center gap-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={isPermitted(activeRoleSelector, action.id)}
                                                        onChange={() => handlePermissionToggle(activeRoleSelector, action.id)}
                                                        disabled={activeRoleSelector === 'owner' || activeRoleSelector === 'super_admin'}
                                                        className="rounded text-indigo-600 cursor-pointer disabled:opacity-50"
                                                    />
                                                    <span className="text-sm">{action.label}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
