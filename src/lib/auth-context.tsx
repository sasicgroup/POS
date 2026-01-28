'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

import { supabase } from '@/lib/supabase';
import { loadSMSConfigFromDB, sendDirectMessage } from '@/lib/sms';
import { logActivity } from '@/lib/logger';

// Define Store Type
export interface Store {
    id?: any; // Added ID
    name: string;
    location: string;
    phone?: string; // Store contact phone
    currency: string;
    taxSettings?: {
        enabled: boolean;
        type: 'percentage' | 'fixed';
        value: number;
    };
    receiptPrefix?: string; // e.g., "TRX", "INV", "RCP"
    receiptSuffix?: string; // e.g., "-A", "2024"
    lastTransactionNumber?: number; // Sequential counter
    rolePermissions?: Record<string, Record<string, boolean>>; // { manager: { view_dashboard: true }, staff: { ... } }
    branding?: {
        name?: string;
        logoUrl?: string; // or logo_url if mapped from DB
        color?: string;
    };
    status?: 'active' | 'hidden' | 'deleted' | 'archived';
    deletion_otc?: string;
    deletion_otc_expiry?: string;
    businessTypes?: string[];
    categories?: string[];
}



// Default Permissions
export const DEFAULT_PERMISSIONS: Record<string, Record<string, boolean>> = {
    owner: { all: true },
    manager: {
        view_dashboard: true, view_analytics: true, view_inventory: true,
        add_product: true, edit_product: true, delete_product: false,
        adjust_stock: true, access_pos: true, process_returns: true,
        give_discount: true, view_sales_history: true, view_customers: true,
        manage_customers: true, view_employees: true, manage_employees: false,
        access_settings: false, view_roles: false, manage_roles: false
    },
    staff: {
        view_dashboard: true, view_analytics: false, view_inventory: true,
        add_product: false, edit_product: false, delete_product: false,
        adjust_stock: false, access_pos: true, process_returns: false,
        give_discount: false, view_sales_history: false, view_customers: true,
        manage_customers: true, view_employees: false, manage_employees: false,
        access_settings: false, view_roles: false, manage_roles: false
    }
};

// Define User Type
export interface User {
    id: any;
    name: string;
    username?: string;
    phone?: string;
    role: 'owner' | 'manager' | 'staff';
    pin: string;
    avatar?: string;
    otp_enabled?: boolean;
    is_locked?: boolean;
    failed_attempts?: number;
    shift_start?: string;
    shift_end?: string;
    work_days?: string[];
}

interface AuthContextType {
    user: User | null;
    activeStore: Store | null;
    stores: Store[];
    isLoading: boolean;
    teamMembers: User[];
    login: (username: string, pin: string) => Promise<{ success: boolean; status: 'SUCCESS' | 'OTP_REQUIRED' | 'LOCKED' | 'INVALID_CREDENTIALS' | 'OUTSIDE_SHIFT' | 'ERROR'; message?: string; tempUser?: User }>;
    verifyOTP: (username: string, code: string) => Promise<boolean>;
    resendOTP: (username: string) => Promise<boolean>;
    unlockAccount: (userId: any) => Promise<boolean>;
    logout: () => void;
    switchStore: (storeId: any) => void;
    updateStoreSettings: (settings: Partial<Store>) => Promise<{ success: boolean; error?: any }>;
    createStore: (name: string, location: string) => Promise<void>;
    addTeamMember: (member: Omit<User, 'id'>) => Promise<void>;
    updateTeamMember: (id: any, updates: Partial<User>) => Promise<void>;
    removeTeamMember: (id: any) => Promise<void>;
    hasPermission: (permission: string) => boolean;
    updateRolePermissions: (role: string, permissions: Record<string, boolean>) => Promise<boolean>;
    updateStoreStatus: (storeId: any, status: 'active' | 'hidden' | 'deleted' | 'archived') => Promise<void>;
    requestStoreDeletionOTC: (storeId: any) => Promise<boolean>;
    verifyStoreDeletionOTC: (storeId: any, otc: string) => Promise<boolean>;
    deleteStore: (storeId: any) => Promise<void>;
    globalSettings: GlobalSettings;
    updateGlobalSettings: (settings: Partial<GlobalSettings>) => Promise<void>;
}

export interface GlobalSettings {
    appName: string;
    appLogo?: string;
    primaryColor?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeStore, setActiveStore] = useState<Store | null>(null);
    const [stores, setStores] = useState<Store[]>([]);
    const [globalSettings, setGlobalSettings] = useState<GlobalSettings>({ appName: 'SASIC STORES', primaryColor: '#4f46e5' });

    useEffect(() => {
        const initAuth = async () => {
            try {
                // Load User
                const storedUser = localStorage.getItem('sms_user');
                let currentUser: User | null = null;
                if (storedUser) {
                    currentUser = JSON.parse(storedUser);
                    setUser(currentUser);
                }

                if (!currentUser) {
                    setIsLoading(false);
                    return;
                }

                // Load Global Settings
                const { data: gSettings } = await supabase.from('global_settings').select('*').single();
                if (gSettings) {
                    setGlobalSettings({
                        appName: gSettings.app_name,
                        appLogo: gSettings.app_logo,
                        primaryColor: gSettings.primary_color
                    });
                }

                // Load Stores based on User Access
                let validStores: any[] = [];
                let accessIds: any[] = [];

                if (currentUser.id !== 'owner-1' && currentUser.role !== 'owner') {
                    // 1. Get Access IDs from Junction Table
                    const { data: accessData } = await supabase
                        .from('employee_access')
                        .select('store_id')
                        .eq('employee_id', currentUser.id);

                    if (accessData) accessIds = accessData.map(a => a.store_id);

                    // 2. Also check if they are "home" based in a store
                    const { data: freshEmp } = await supabase.from('employees').select('store_id').eq('id', currentUser.id).single();
                    if (freshEmp?.store_id) accessIds.push(freshEmp.store_id);
                }

                // Fetch Stores
                if (accessIds.length > 0) {
                    const { data: userStores } = await supabase.from('stores').select('*').in('id', accessIds).neq('status', 'deleted').order('created_at', { ascending: true });
                    if (userStores) validStores = userStores;
                } else {
                    if (currentUser.id === 'owner-1' || currentUser.role === 'owner') {
                        const { data: all } = await supabase.from('stores').select('*').neq('status', 'deleted').order('created_at', { ascending: true });
                        if (all) validStores = all;
                    }
                }

                if (validStores.length > 0) {
                    const mappedStores = validStores.map((s: any) => ({
                        ...s,
                        taxSettings: s.tax_settings || { enabled: true, type: 'percentage', value: 12.5 },
                        receiptPrefix: s.receipt_prefix,
                        receiptSuffix: s.receipt_suffix,
                        phone: s.phone,
                        rolePermissions: s.role_permissions,
                        branding: s.branding,
                        lastTransactionNumber: s.last_transaction_number || 0,
                        businessTypes: s.business_types || ["Retail Store", "Pharmacy", "Restaurant", "Electronics", "Grocery", "Fashion", "Other"],
                        categories: s.categories || []
                    }));
                    setStores(mappedStores);

                    // Try to find last active store
                    const storedStoreId = localStorage.getItem('sms_active_store_id');
                    const lastActive = mappedStores.find((s: any) => s.id === storedStoreId);
                    const finalStore = lastActive || mappedStores[0];
                    setActiveStore(finalStore);
                    if (finalStore?.id) {
                        // Don't await this, let it load in background so we don't block Dashboard
                        loadSMSConfigFromDB(finalStore.id).catch(err => console.warn("Failed to load SMS config", err));
                    }
                }
            } catch (error) {
                console.error("Auth init failed", error);
            } finally {
                setIsLoading(false);
            }
        };

        // Safety timeout to prevent infinite loading
        const safetyTimer = setTimeout(() => {
            setIsLoading((prev) => {
                if (prev) {
                    console.warn("Auth init timed out, forcing load completion");
                    return false;
                }
                return prev;
            });
        }, 5000);

        initAuth();

        return () => clearTimeout(safetyTimer);
    }, []);

    const finalizeLogin = async (loggedUser: User): Promise<{ success: boolean; status: 'SUCCESS'; tempUser: User }> => {
        // Load Stores Logic (Shared from old login)
        let validStores: any[] = [];
        let accessIds: any[] = [];

        if (loggedUser.id !== 'owner-1' && loggedUser.role !== 'owner') {
            const { data: accessData } = await supabase.from('employee_access').select('store_id').eq('employee_id', loggedUser.id);
            if (accessData) accessIds = accessData.map(a => a.store_id);

            const { data: freshEmp } = await supabase.from('employees').select('store_id').eq('id', loggedUser.id).single();
            if (freshEmp?.store_id) accessIds.push(freshEmp.store_id);
        }

        if (accessIds.length > 0) {
            const { data: userStores } = await supabase.from('stores').select('*').in('id', accessIds).neq('status', 'deleted').order('created_at', { ascending: true });
            if (userStores) validStores = userStores;
        } else if (loggedUser.id === 'owner-1' || loggedUser.role === 'owner') {
            const { data: all } = await supabase.from('stores').select('*').neq('status', 'deleted').order('created_at', { ascending: true });
            if (all) validStores = all;
        }

        if (validStores.length > 0) {
            const mappedStores = validStores.map((s: any) => ({
                ...s,
                taxSettings: s.tax_settings || { enabled: true, type: 'percentage', value: 12.5 },
                receiptPrefix: s.receipt_prefix,
                receiptSuffix: s.receipt_suffix,
                phone: s.phone,
                lastTransactionNumber: s.last_transaction_number || 0,
                businessTypes: s.business_types || ["Retail Store", "Pharmacy", "Restaurant", "Electronics", "Grocery", "Fashion", "Other"],
                categories: s.categories || []
            }));
            setStores(mappedStores);
            setActiveStore(mappedStores[0]);
            localStorage.setItem('sms_active_store_id', mappedStores[0].id);
            if (mappedStores[0].id) {
                // Background load for SMS config on login
                loadSMSConfigFromDB(mappedStores[0].id).catch(err => console.error(err));
            }
        }

        setUser(loggedUser);
        localStorage.setItem('sms_user', JSON.stringify(loggedUser));
        setUser(loggedUser);
        localStorage.setItem('sms_user', JSON.stringify(loggedUser));

        // Log Login (Only if not just init) - Actually this is initAuth, maybe skip logging here or log 'SESSION_RESTORED'
        // logActivity('SESSION_RESTORED', {}, loggedUser.id, mappedStores?.[0]?.id);

        return { success: true, status: 'SUCCESS', tempUser: loggedUser };
    };

    const login = async (username: string, pin: string): Promise<{ success: boolean; status: 'SUCCESS' | 'OTP_REQUIRED' | 'LOCKED' | 'INVALID_CREDENTIALS' | 'OUTSIDE_SHIFT' | 'ERROR'; message?: string; tempUser?: User }> => {
        setIsLoading(true);
        try {
            // 1. Find Employee by Username (Case Insensitive)
            // Check 'username' OR 'name' (legacy fallback)
            let query = supabase.from('employees').select('*').ilike('username', username).limit(1);
            let { data: employees, error } = await query;


            if (error || !employees || employees.length === 0) {
                // Try searching by name just in case (optional, remove if strict)
                const { data: byName } = await supabase.from('employees').select('*').ilike('name', username).limit(1);
                if (byName && byName.length > 0) employees = byName;
                else return { success: false, status: 'INVALID_CREDENTIALS', message: 'User not found' };
            }

            const employee = employees![0];

            if (employee.is_locked) {
                return { success: false, status: 'LOCKED', message: 'Account is locked due to too many failed attempts. Contact admin.' };
            }

            // 2. Check PIN
            if (employee.pin !== pin) {
                // Increment failed attempts
                const attempts = (employee.failed_attempts || 0) + 1;
                const update: any = { failed_attempts: attempts };
                if (attempts >= 3) {
                    update.is_locked = true;
                }
                await supabase.from('employees').update(update).eq('id', employee.id);

                if (update.is_locked) {
                    return { success: false, status: 'LOCKED', message: 'Account has been locked.' };
                } else {
                    return { success: false, status: 'INVALID_CREDENTIALS', message: `Invalid PIN. ${3 - attempts} attempts remaining.` };
                }
            }

            // 3. Reset attempts on success
            if (employee.failed_attempts > 0) {
                await supabase.from('employees').update({ failed_attempts: 0 }).eq('id', employee.id);
            }

            // --- SHIFT ENFORCEMENT ---
            // Only apply to non-owners (or strict setting?) - For now, owners bypass
            if (employee.role !== 'owner' && employee.shift_start && employee.shift_end && employee.work_days && employee.work_days.length > 0) {
                const now = new Date();
                const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                const currentDay = days[now.getDay()];

                // 1. Check Day
                if (!employee.work_days.includes(currentDay)) {
                    return { success: false, status: 'OUTSIDE_SHIFT', message: `You are not scheduled to work on ${currentDay}.` };
                }

                // 2. Check Time
                const currentTime = now.toTimeString().slice(0, 5); // "HH:MM"
                // Assuming simple same-day shift. IDL (International Date Line) or overnight shifts might need more logic, 
                // but keeping it simple for now as requested.
                // Assuming stored format is HH:MM or HH:MM:SS
                const start = employee.shift_start.slice(0, 5);
                const end = employee.shift_end.slice(0, 5);

                if (currentTime < start || currentTime > end) {
                    return { success: false, status: 'OUTSIDE_SHIFT', message: `Shift hours are ${start} - ${end}. Access denied.` };
                }
            }
            // -------------------------

            const userObj: User = {
                id: employee.id,
                name: employee.name,
                username: employee.username,
                role: employee.role as any,
                pin: employee.pin,
                phone: employee.phone,
                otp_enabled: employee.otp_enabled
            };

            // 4. Check OTP
            if (employee.otp_enabled && employee.phone) {
                const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit OTP
                const expiry = new Date(Date.now() + 5 * 60000); // 5 mins

                // Save OTP to DB
                await supabase.from('employees').update({
                    otp_code: code,
                    otp_expiry: expiry.toISOString()
                }).eq('id', employee.id);

                // Send OTP
                // Need store context for SMS config? We can fetch it based on user's store
                const { data: empStore } = await supabase.from('employee_access').select('store_id').eq('employee_id', employee.id).limit(1).maybeSingle();
                const storeId = empStore?.store_id || employee.store_id;
                if (storeId) {
                    await loadSMSConfigFromDB(storeId);
                    await sendDirectMessage(employee.phone, `Your OTP is ${code}. Valid for 5 minutes.`);
                }

                return { success: true, status: 'OTP_REQUIRED', tempUser: userObj };
            }

            // 5. Finalize Login (Direct)
            await logActivity('LOGIN_SUCCESS', { method: 'PIN' }, userObj.id, employee.store_id);
            return await finalizeLogin(userObj);

        } catch (e: any) {
            console.error("Login unexpected error", e);
            return { success: false, status: 'ERROR', message: e.message };
        } finally {
            setIsLoading(false);
        }
    };

    const verifyOTP = async (username: string, code: string): Promise<boolean> => {
        // 1. Get user (re-fetch to be safe) - use ilike for case-insensitive match
        const { data: employees } = await supabase.from('employees').select('*').ilike('username', username).single();
        if (!employees) {
            console.error('[OTP] User not found for username:', username);
            return false;
        }

        console.log('[OTP] Found user:', employees.username, '| Stored code:', employees.otp_code, '| Entered:', code);

        // 2. Validate Code & Expiry
        if (employees.otp_code === code) {
            const now = new Date();
            const exp = new Date(employees.otp_expiry);
            console.log('[OTP] Expiry:', exp, '| Now:', now, '| Valid:', now <= exp);

            if (now <= exp) {
                // Success
                // Clear OTP fields
                await supabase.from('employees').update({ otp_code: null, otp_expiry: null }).eq('id', employees.id);

                const userObj: User = {
                    id: employees.id,
                    name: employees.name,
                    username: employees.username,
                    role: employees.role as any,
                    pin: employees.pin,
                    phone: employees.phone,
                    otp_enabled: employees.otp_enabled
                };
                await finalizeLogin(userObj);
                await logActivity('LOGIN_SUCCESS', { method: 'OTP' }, userObj.id, employees.store_id);
                console.log('[OTP] Verification successful!');
                return true;
            } else {
                console.error('[OTP] Code expired');
            }
        } else {
            console.error('[OTP] Code mismatch');
        }
        return false;
    };

    const resendOTP = async (username: string): Promise<boolean> => {
        const { data: employee } = await supabase.from('employees').select('*').ilike('username', username).single();
        if (!employee || !employee.phone) {
            console.error('[OTP Resend] User not found or no phone');
            return false;
        }

        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiry = new Date(Date.now() + 5 * 60000);

        await supabase.from('employees').update({
            otp_code: code,
            otp_expiry: expiry.toISOString()
        }).eq('id', employee.id);

        console.log('[OTP Resend] New code sent to', employee.phone, ':', code);
        await sendDirectMessage(employee.phone, `Your new OTP is ${code}. Valid for 5 minutes.`);
        return true;
    };

    const unlockAccount = async (userId: any): Promise<boolean> => {
        // Check permission (User context must be set)
        if (!user) return false;

        const { error } = await supabase.from('employees').update({
            is_locked: false,
            failed_attempts: 0
        }).eq('id', userId);

        if (!error) {
            await logActivity('UNLOCK_ACCOUNT', { target_user_id: userId }, user.id, activeStore?.id);
        }

        return !error;
    };


    const logout = () => {
        if (user) logActivity('LOGOUT', {}, user.id, activeStore?.id);
        setUser(null);
        localStorage.removeItem('sms_user');
        window.location.href = '/';
    };

    const switchStore = (storeId: any) => {
        const found = stores.find(s => s.id === storeId);
        if (found) {
            setActiveStore(found);
            localStorage.setItem('sms_active_store_id', found.id);
            if (found.id) loadSMSConfigFromDB(found.id);
            if (user) logActivity('SWITCH_STORE', { new_store_name: found.name, new_store_id: found.id }, user.id, found.id);
        }
    };

    const [teamMembers, setTeamMembers] = useState<User[]>([]);

    useEffect(() => {
        if (activeStore?.id) {
            fetchTeamMembers();
        }
    }, [activeStore?.id]);

    const fetchTeamMembers = async () => {
        if (!activeStore?.id) return;

        // Skip for legacy/mock
        if (activeStore.id.toString().startsWith('store-')) return;

        // 1. Get employees directly linked via store_id (Simple One-Store Mode)
        const { data: directEmployees } = await supabase
            .from('employees')
            .select('*')
            .eq('store_id', activeStore.id);

        // 2. Get employees linked via employee_access (Multi-Store Mode)
        const { data: accessEmployees } = await supabase
            .from('employee_access')
            .select('employee_id, role, employees(*)')
            .eq('store_id', activeStore.id);

        let mergedMembers: User[] = [];

        if (directEmployees) {
            mergedMembers = [...mergedMembers, ...directEmployees.map((e: any) => ({
                id: e.id,
                name: e.name,
                username: e.username,
                phone: e.phone,
                role: e.role as any,
                pin: e.pin,
                avatar: e.avatar_url,
                otp_enabled: e.otp_enabled,
                is_locked: e.is_locked,
                failed_attempts: e.failed_attempts,
                shift_start: e.shift_start,
                shift_end: e.shift_end,
                work_days: e.work_days
            }))];
        }

        if (accessEmployees) {
            const mappedAccess = accessEmployees.map((a: any) => ({
                id: a.employees.id,
                name: a.employees.name,
                username: a.employees.username,
                phone: a.employees.phone,
                role: a.role as any, // Override role with store-specific role
                pin: a.employees.pin,
                avatar: a.employees.avatar_url,
                otp_enabled: a.employees.otp_enabled,
                is_locked: a.employees.is_locked,
                failed_attempts: a.employees.failed_attempts,
                shift_start: a.employees.shift_start,
                shift_end: a.employees.shift_end,
                work_days: a.employees.work_days
            }));

            // Merge avoiding duplicates (Access table usually overrides)
            const map = new Map();
            mergedMembers.forEach(m => map.set(m.id, m));
            mappedAccess.forEach((m: any) => map.set(m.id, m));
            mergedMembers = Array.from(map.values());
        }

        setTeamMembers(mergedMembers);
    };

    const addTeamMember = async (member: Omit<User, 'id'>) => {
        if (!activeStore?.id) return;

        // 1. Create in 'employees' table
        const { data: newEmp, error: createError } = await supabase.from('employees').insert({
            name: member.name,
            username: member.username,
            phone: member.phone,
            pin: member.pin,
            role: member.role, // Default role
            store_id: activeStore.id, // Set home store
            otp_enabled: member.otp_enabled !== undefined ? member.otp_enabled : true, // Default true
            shift_start: member.shift_start,
            shift_end: member.shift_end,
            work_days: member.work_days
        }).select().single();

        if (createError) throw createError;
        if (!newEmp) return;

        // 2. Create in 'employee_access' for permission handling
        await supabase.from('employee_access').insert({
            employee_id: newEmp.id,
            store_id: activeStore.id,
            role: member.role
        });

        await logActivity('CREATE_EMPLOYEE', { name: member.name, role: member.role, username: member.username }, user?.id, activeStore?.id);
        fetchTeamMembers();
    };

    const updateTeamMember = async (id: any, updates: Partial<User>) => {
        if (!activeStore?.id) return;

        // Update basic info
        if (updates.name || updates.pin || updates.username || updates.phone || updates.otp_enabled !== undefined || updates.shift_start || updates.shift_end || updates.work_days) {
            await supabase.from('employees').update({
                name: updates.name,
                username: updates.username,
                phone: updates.phone,
                pin: updates.pin,
                otp_enabled: updates.otp_enabled,
                shift_start: updates.shift_start,
                shift_end: updates.shift_end,
                work_days: updates.work_days
            }).eq('id', id);
        }

        // Update Role for this store
        if (updates.role) {
            const { data: existingAccess } = await supabase
                .from('employee_access')
                .select('*')
                .eq('employee_id', id)
                .eq('store_id', activeStore.id)
                .maybeSingle();

            if (existingAccess) {
                await supabase.from('employee_access')
                    .update({ role: updates.role })
                    .eq('id', existingAccess.id);
            } else {
                await supabase.from('employee_access').insert({
                    employee_id: id,
                    store_id: activeStore.id,
                    role: updates.role
                });
            }
        }

        await logActivity('UPDATE_EMPLOYEE', { target_user_id: id, updates }, user?.id, activeStore?.id);

        fetchTeamMembers();
    };

    const removeTeamMember = async (id: any) => {
        if (!activeStore?.id) return;

        await supabase.from('employee_access')
            .delete()
            .eq('employee_id', id)
            .eq('store_id', activeStore.id);

        await logActivity('DELETE_EMPLOYEE', { target_user_id: id }, user?.id, activeStore?.id);

        fetchTeamMembers();
    };

    const updateStoreStatus = async (storeId: any, status: 'active' | 'hidden' | 'deleted' | 'archived') => {
        const { error } = await supabase
            .from('stores')
            .update({ status })
            .eq('id', storeId);

        if (error) throw error;

        // Force refresh local stores list
        setStores(prev => prev.map(s => s.id === storeId ? { ...s, status } : s));
        if (activeStore?.id === storeId) {
            setActiveStore(prev => prev ? { ...prev, status } : null);
        }

        await logActivity('UPDATE_STORE_STATUS', { store_id: storeId, new_status: status }, user?.id, storeId);
    };

    const requestStoreDeletionOTC = async (storeId: any): Promise<boolean> => {
        if (!user || user.role !== 'owner') return false;

        const otc = Math.floor(100000 + Math.random() * 900000).toString();
        const expiry = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 mins

        const { error } = await supabase
            .from('stores')
            .update({
                deletion_otc: otc,
                deletion_otc_expiry: expiry
            })
            .eq('id', storeId);

        if (error) return false;

        // In a real app, send OTC via SMS or Email
        if (process.env.NODE_ENV === 'development') {
            console.log(`STORE DELETION OTC for store ${storeId}: ${otc}`);
        }

        // If phone is available, try sending SMS
        if (user.phone) {
            await sendDirectMessage(user.phone, `Your OTC for store deletion is: ${otc}. This code expires in 10 minutes.`);
        }

        return true;
    };

    const verifyStoreDeletionOTC = async (storeId: any, otc: string): Promise<boolean> => {
        const { data, error } = await supabase
            .from('stores')
            .select('deletion_otc, deletion_otc_expiry')
            .eq('id', storeId)
            .single();

        if (error || !data) return false;

        const now = new Date();
        const expiry = new Date(data.deletion_otc_expiry);

        // Robust comparison
        if (String(data.deletion_otc).trim() === String(otc).trim() && now < expiry) {
            return true;
        }

        return false;
    };

    const deleteStore = async (storeId: any) => {
        const { error } = await supabase
            .from('stores')
            .update({ status: 'deleted' })
            .eq('id', storeId);

        if (error) throw error;

        setStores(prev => prev.filter(s => s.id !== storeId));
        if (activeStore?.id === storeId) {
            setActiveStore(stores.find(s => s.id !== storeId) || null);
        }

        await logActivity('DELETE_STORE', { store_id: storeId }, user?.id, storeId);
        if (activeStore?.id === storeId) {
            setActiveStore(stores.find(s => s.id !== storeId) || null);
        }

        await logActivity('DELETE_STORE', { store_id: storeId }, user?.id, storeId);
    };

    const updateGlobalSettings = async (settings: Partial<GlobalSettings>) => {
        const update: any = {};
        if (settings.appName) update.app_name = settings.appName;
        if (settings.appLogo) update.app_logo = settings.appLogo;
        if (settings.primaryColor) update.primary_color = settings.primaryColor;

        const { error } = await supabase.from('global_settings').update(update).eq('id', 1).select();

        if (error) {
            // Fallback insert if not exists (though migration handles it, good for robustness)
            if (error.details?.includes('0 rows')) {
                await supabase.from('global_settings').insert({ id: 1, ...update });
            } else {
                console.error("Failed to update global settings", error);
                return;
            }
        }

        setGlobalSettings(prev => ({ ...prev, ...settings }));
    };

    const updateStoreSettings = async (settings: Partial<Store>): Promise<{ success: boolean; error?: any }> => {
        if (activeStore?.id) {
            // Map camelCase to snake_case for DB
            const dbUpdates: any = { ...settings };

            if (settings.taxSettings) {
                dbUpdates.tax_settings = settings.taxSettings;
                delete dbUpdates.taxSettings;
            }
            if (settings.receiptPrefix !== undefined) {
                dbUpdates.receipt_prefix = settings.receiptPrefix;
                delete dbUpdates.receiptPrefix;
            }
            if (settings.receiptSuffix !== undefined) {
                dbUpdates.receipt_suffix = settings.receiptSuffix;
                delete dbUpdates.receiptSuffix;
            }
            if (settings.phone !== undefined) {
                dbUpdates.phone = settings.phone;
                // do not delete if key is same
            }
            if (settings.rolePermissions) {
                dbUpdates.role_permissions = settings.rolePermissions;
                delete dbUpdates.rolePermissions;
            }
            // Map lastTransactionNumber
            if (settings.lastTransactionNumber !== undefined) {
                dbUpdates.last_transaction_number = settings.lastTransactionNumber;
                delete dbUpdates.lastTransactionNumber;
            }
            if (settings.branding) {
                // Assumes 'branding' column exists (JSONB)
                dbUpdates.branding = settings.branding;
            }
            if (settings.businessTypes) {
                dbUpdates.business_types = settings.businessTypes;
                delete dbUpdates.businessTypes;
            }
            if (settings.categories) {
                dbUpdates.categories = settings.categories;
                // do not delete if key is same
            }

            const { error } = await supabase.from('stores').update(dbUpdates).eq('id', activeStore.id);

            if (error) {
                console.error("Failed to update store settings in DB:", error.message || error);

                // Fallback: If column missing (code 42703), try saving WITHOUT the new columns to at least save other settings
                if (error.code === '42703' || (error.message && error.message.includes('column'))) { // undefined_column
                    console.warn("Attempting fallback save without new columns...");
                    delete dbUpdates.receipt_prefix;
                    delete dbUpdates.receipt_suffix;
                    if (dbUpdates.branding) delete dbUpdates.branding; // Remove branding in fallback if it caused error
                    if (dbUpdates.business_types) delete dbUpdates.business_types;
                    if (dbUpdates.categories) delete dbUpdates.categories;

                    // If there are still properties to update
                    if (Object.keys(dbUpdates).length > 0) {
                        const { error: retryError } = await supabase.from('stores').update(dbUpdates).eq('id', activeStore.id);
                        if (!retryError) {
                            // Update local state even though DB partial save worked
                            setActiveStore(prev => prev ? { ...prev, ...settings } : null);
                            setStores(prev => prev.map(s => s.id === activeStore.id ? { ...s, ...settings } : s));
                            return { success: true, error: "Partial save: New Receipt ID settings require a database update. Please run the migration script." };
                        }
                    }
                }

                return { success: false, error };
            }

            setActiveStore(prev => prev ? { ...prev, ...settings } : null);
            setStores(prev => prev.map(s => s.id === activeStore.id ? { ...s, ...settings } : s));
            return { success: true };
        }
        return { success: false, error: "No active store" };
    };

    const createStore = async (name: string, location: string) => {
        // ... existing implementation
        const tempId = 'temp-' + Date.now();
        const newStore: Store = { id: tempId, name, location, currency: 'GHS' };
        setStores(prev => [...prev, newStore]);
        setActiveStore(newStore);
        const { data } = await supabase.from('stores').insert([{ name, location }]).select().single();
        if (data) {
            // Map the fresh DB data to matching Store interface
            const mappedStore: Store = {
                ...data,
                taxSettings: data.tax_settings || { enabled: true, type: 'percentage', value: 12.5 },
                receiptPrefix: data.receipt_prefix,
                receiptSuffix: data.receipt_suffix,
                phone: data.phone,
                rolePermissions: data.role_permissions,
                branding: data.branding,
                lastTransactionNumber: data.last_transaction_number || 0,
                businessTypes: data.business_types || ["Retail Store", "Pharmacy", "Restaurant", "Electronics", "Grocery", "Fashion", "Other"],
                categories: data.categories || []
            };

            setStores(prev => prev.map(s => s.id === tempId ? mappedStore : s));
            setActiveStore(mappedStore);
            if (user) {
                // Determine user ID correctly
                const userId = user.id;

                // If the user is NOT the hardcoded super-admin, we must grant them explicit access to the new store
                if (userId !== 'owner-1') {
                    const { error: accessError } = await supabase.from('employee_access').insert({
                        employee_id: userId,
                        store_id: data.id,
                        role: 'owner'
                    });
                    if (accessError) console.error("Failed to grant creator access to new store:", accessError);
                }

                logActivity('CREATE_STORE', { store_name: name, store_id: data.id }, userId, data.id);
            }
        }
    };

    const hasPermission = (permission: string) => {
        if (!user) return false;
        if (user.role === 'owner') return true;

        // Get permissions from store settings or defaults
        const currentPermissions = activeStore?.rolePermissions || DEFAULT_PERMISSIONS;

        // If role doesn't exist in config, default to false
        if (!currentPermissions[user.role]) return false;

        return currentPermissions[user.role][permission] === true;
    };

    const updateRolePermissions = async (role: string, permissions: Record<string, boolean>) => {
        if (!activeStore?.id) return false;

        const updatedRolePermissions = {
            ...(activeStore.rolePermissions || DEFAULT_PERMISSIONS),
            [role]: permissions
        };

        const { error } = await supabase
            .from('stores')
            .update({ role_permissions: updatedRolePermissions })
            .eq('id', activeStore.id);

        if (!error) {
            updateStoreSettings({ rolePermissions: updatedRolePermissions });
            return true;
        }
        console.error("Failed to update permissions", error);
        return false;
    };

    return (
        <AuthContext.Provider value={{
            user,
            activeStore,
            stores,
            isLoading,
            teamMembers,
            login,
            logout,
            switchStore,
            updateStoreSettings,
            createStore,
            addTeamMember,
            updateTeamMember,
            removeTeamMember,
            verifyOTP,
            resendOTP,
            unlockAccount,
            hasPermission,
            updateRolePermissions,
            updateStoreStatus,
            requestStoreDeletionOTC,
            verifyStoreDeletionOTC,
            deleteStore,
            globalSettings,
            updateGlobalSettings
        }}>
            {children}
        </AuthContext.Provider>
    );
}


export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
