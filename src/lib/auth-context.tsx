'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

import { supabase } from '@/lib/supabase';
import { fetchPublicBusiness } from '@/lib/public-business';
import { loadSMSConfigFromDB, sendDirectMessage } from '@/lib/sms';
import { logActivity } from '@/lib/logger';
import { useToast } from '@/lib/toast-context';

/** Resolves tenant UUID from /{slug}/… URL and localStorage; keeps sms_business_* in sync. */
async function resolveTenantBusinessIdFromRoute(): Promise<string | null> {
    if (typeof window === 'undefined') return null;
    const currentSlug = window.location.pathname.split('/')[1] || null;
    let resolved = localStorage.getItem('sms_business_id');
    if (currentSlug && !['dashboard', 'login', 'super-admin'].includes(currentSlug)) {
        const bRow = await fetchPublicBusiness({ slug: currentSlug });
        if (bRow && bRow.id) {
            resolved = String(bRow.id);
            localStorage.setItem('sms_business_id', resolved);
            localStorage.setItem('sms_business_slug', currentSlug);
        }
    }
    return resolved;
}

// Define Store Type
export interface Store {
    id?: any; // Added ID
    business_id?: string; // ✅ Add business_id for data isolation validation
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
    email?: string;
    website?: string;
    socialHandle?: string;
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
    sort_order?: number;
    master_password?: string;
    // toggles and provider info for available payment methods
    paymentSettings?: {
        methods?: {
            cash?: boolean;
            momo?: boolean;
            installment?: boolean;
            susu?: boolean;
        };
        default_provider?: string;
        hubtel?: any;
        paystack?: any;
    };
}



// Default Permissions
export const DEFAULT_PERMISSIONS: Record<string, Record<string, boolean>> = {
    owner: { all: true },
    manager: {
        view_dashboard: false,
        access_tasks: true,
        view_analytics: false,
        view_inventory: true,
        add_product: true,
        edit_product: true,
        delete_product: false,
        adjust_stock: true,
        access_pos: true,
        process_sales: true,
        view_sales_history: true,
        manage_invoices: true,
        manage_installments: true,
        process_returns: true,
        give_discount: true,
        view_customers: true,
        manage_customers: true,
        access_loyalty: true,
        access_referrals: true,
        access_communication: true,
        send_messages: true,
        access_expenses: true,
        view_financials: true,
        access_reports: true,
        access_ai: false,
        access_ai_insights: false,
        access_logs: false,
        view_employees: true,
        manage_employees: false,
        access_settings: false,
        view_roles: false,
        manage_roles: false
    },
    staff: {
        view_dashboard: false, // Changed from true to false by default for security
        access_tasks: true,
        view_analytics: false,
        view_inventory: true,
        add_product: false,
        edit_product: false,
        delete_product: false,
        adjust_stock: false,
        access_pos: true,
        process_sales: true,
        view_sales_history: false,
        manage_invoices: false,
        manage_installments: true,
        process_returns: false,
        give_discount: false,
        view_customers: true,
        manage_customers: true,
        access_loyalty: false,
        access_referrals: false,
        access_communication: true,
        send_messages: true,
        access_expenses: false,
        view_financials: false,
        access_reports: false,
        access_ai: false,
        access_ai_insights: false,
        access_logs: false,
        view_employees: false,
        manage_employees: false,
        access_settings: false,
        view_roles: false,
        manage_roles: false
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
    two_factor_method?: 'sms' | 'masterpass';
    master_password?: string;
    business_id?: string; // ✅ Add business_id for data isolation validation
}

interface AuthContextType {
    user: User | null;
    activeStore: Store | null;
    stores: Store[];
    isLoading: boolean;
    teamMembers: User[];
    login: (username: string, pin: string) => Promise<{ success: boolean; status: 'SUCCESS' | 'CHOICE_REQUIRED' | 'OTP_REQUIRED' | 'MASTERPASS_REQUIRED' | 'LOCKED' | 'INVALID_CREDENTIALS' | 'OUTSIDE_SHIFT' | 'ERROR'; message?: string; tempUser?: User; availableMethods?: string[] }>;
    verifyOTP: (username: string, code: string) => Promise<boolean>;
    verifyMasterpass: (username: string, password: string) => Promise<boolean>;
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
    updateStoreOrder: (updates: { id: any; sort_order: number }[]) => Promise<void>;
    updateUser: (updates: Partial<User>) => void;
    businessId: string | null;
}

export interface GlobalSettings {
    appName: string;
    appLogo?: string;
    primaryColor?: string;
    ownerName?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const { showToast } = useToast();
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeStore, setActiveStore] = useState<Store | null>(null);
    const [stores, setStores] = useState<Store[]>([]);
    const [globalSettings, setGlobalSettings] = useState<GlobalSettings>({ appName: '', primaryColor: '#4f46e5' });
    const [businessId, setBusinessId] = useState<string | null>(null);

    useEffect(() => {
        const initAuth = async () => {
            try {
                // ✅ Load and validate ViewAsSession if present
                const viewAsStr = localStorage.getItem('sms_viewas_session');
                let viewAsSession: any = null;
                if (viewAsStr) {
                    try {
                        viewAsSession = JSON.parse(viewAsStr);
                        // Validate viewAsSession has required fields
                        if (!viewAsSession?.business_id || !viewAsSession?.business_slug) {
                            console.warn('[Auth] Invalid viewAsSession format. Clearing.');
                            localStorage.removeItem('sms_viewas_session');
                            viewAsSession = null;
                        }
                    } catch (e) {
                        console.warn('[Auth] Failed to parse viewAsSession', e);
                        localStorage.removeItem('sms_viewas_session');
                    }
                }

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

                // Load Business Branding/Settings
                const currentSlug = typeof window !== 'undefined' ? window.location.pathname.split('/')[1] : null;
                let businessId = typeof localStorage !== 'undefined' ? localStorage.getItem('sms_business_id') : null;
                let businessSlug = typeof localStorage !== 'undefined' ? localStorage.getItem('sms_business_slug') : null;

                // Sync: If URL slug doesn't match stored slug, we must refresh context FIRST
                if (currentSlug && currentSlug !== businessSlug && !['dashboard', 'login', 'super-admin'].includes(currentSlug)) {
                    console.log(`[Auth] Slug mismatch: URL=${currentSlug}, Storage=${businessSlug}. Fetching correct business...`);
                    const bData = await fetchPublicBusiness({ slug: currentSlug });
                    if (bData && bData.id) {
                        businessId = String(bData.id);
                        businessSlug = String(bData.slug);
                        if (typeof localStorage !== 'undefined') {
                            localStorage.setItem('sms_business_id', businessId);
                            localStorage.setItem('sms_business_slug', businessSlug);
                        }
                    }
                }

                // ✅ Security: Validate user's business_id matches CORRECT business context
                if (currentUser.business_id && businessId && currentUser.business_id !== businessId && currentUser.id !== 'owner-1') {
                    console.error('[Auth] User business_id mismatch! User belongs to:', currentUser.business_id, 'but URL requires:', businessId);
                    // Clear auth to prevent data leakage across businesses
                    localStorage.removeItem('sms_user');
                    localStorage.removeItem('sms_viewas_session');
                    setUser(null);
                    setIsLoading(false);
                    return;
                }

                // If user has business_id but context doesn't, set it
                if (currentUser.business_id && !businessId) {
                    businessId = currentUser.business_id;
                    localStorage.setItem('sms_business_id', businessId);
                }

                if (businessId) {
                    const businessData = await fetchPublicBusiness({ id: businessId });

                    if (businessData) {
                        setBusinessId(businessId);
                        setGlobalSettings({
                            appName: (businessData.app_name as string) || 'Business Portal',
                            appLogo: (businessData.logo_url as string) || '',
                            primaryColor: (businessData.primary_color as string) || '#4f46e5',
                            ownerName: undefined
                        });
                    }
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

                    // 2. Strict Access: Removed the 'store_id' fallback from employees table
                    // to ensure only explicit assignments in 'employee_access' are honored.
                    // This fixes the issue of employees seeing details of a store they weren't assigned to.
                }

                // Fetch Stores
                if (accessIds.length > 0) {
                    const { data: userStores } = await supabase.from('stores').select('*').in('id', accessIds).neq('status', 'deleted').order('sort_order', { ascending: true }).order('created_at', { ascending: true });
                    if (userStores) {
                        validStores = userStores;
                        // Tenant isolation: ignore store rows that do not belong to the URL/session business
                        if (businessId) {
                            validStores = validStores.filter((s: any) => s.business_id === businessId);
                        }
                    }
                } else {
                    if (currentUser.id === 'owner-1' || currentUser.role === 'owner') {
                        // Filter by business_id derived from the current slug to ensure strict isolation
                        const currentSlug = typeof window !== 'undefined' ? window.location.pathname.split('/')[1] : null;
                        let bId = typeof localStorage !== 'undefined' ? localStorage.getItem('sms_business_id') : null;

                        // Priority: If we are in a slugged route, fetch THAT business's stores
                        if (currentSlug && !['dashboard', 'login', 'super-admin'].includes(currentSlug)) {
                            const bData = await fetchPublicBusiness({ slug: currentSlug });
                            if (bData && bData.id) bId = String(bData.id);
                        }

                        let query = supabase.from('stores').select('*').neq('status', 'deleted').order('sort_order', { ascending: true }).order('created_at', { ascending: true });
                        if (bId) {
                            query = (query as any).eq('business_id', bId);
                        } else {
                            // If no business context, return nothing for safety (prevents data leaks)
                            query = (query as any).eq('id', '00000000-0000-0000-0000-000000000000');
                        }
                        const { data: all } = await query;
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
                        categories: s.categories || [],
                        sort_order: s.sort_order || 0,
                        master_password: s.master_password,
                        paymentSettings: s.payment_settings || { methods: { cash: true, momo: true, installment: true, susu: false } }
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
                } else {
                    // Important: Clear state if no stores are found for this user
                    setStores([]);
                    setActiveStore(null);
                    localStorage.removeItem('sms_active_store_id');
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

        const resolvedBusinessId = await resolveTenantBusinessIdFromRoute();
        if (resolvedBusinessId) setBusinessId(resolvedBusinessId);

        if (loggedUser.id !== 'owner-1' && loggedUser.role !== 'owner') {
            const { data: accessData } = await supabase.from('employee_access').select('store_id').eq('employee_id', loggedUser.id);
            if (accessData) accessIds = accessData.map(a => a.store_id);

            // Strict Access: Only stores in employee_access are allowed
        }

        if (accessIds.length > 0) {
            const { data: userStores } = await supabase.from('stores').select('*').in('id', accessIds).neq('status', 'deleted').order('sort_order', { ascending: true }).order('created_at', { ascending: true });
            if (userStores) {
                validStores = userStores;
                if (resolvedBusinessId) {
                    validStores = validStores.filter((s: any) => s.business_id === resolvedBusinessId);
                }
            }
        } else if (loggedUser.id === 'owner-1' || loggedUser.role === 'owner') {
            let query = supabase.from('stores').select('*').neq('status', 'deleted').order('sort_order', { ascending: true }).order('created_at', { ascending: true });
            if (resolvedBusinessId) {
                query = (query as any).eq('business_id', resolvedBusinessId);
            } else {
                query = (query as any).eq('id', '00000000-0000-0000-0000-000000000000');
            }
            const { data: all } = await query;
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
                categories: s.categories || [],
                sort_order: s.sort_order || 0,
                master_password: s.master_password
            }));
            setStores(mappedStores);
            setActiveStore(mappedStores[0]);
            localStorage.setItem('sms_active_store_id', mappedStores[0].id);
            if (mappedStores[0].id) {
                // Background load for SMS config on login
                loadSMSConfigFromDB(mappedStores[0].id).catch(err => console.error(err));
            }
        } else {
            // Important: Clear state if no stores are found
            setStores([]); // Clear previous user stores
            setActiveStore(null);
            localStorage.removeItem('sms_active_store_id');
        }

        setUser(loggedUser);
        // ✅ Store business_id with user for later validation
        if (resolvedBusinessId) {
            loggedUser.business_id = resolvedBusinessId;
        }
        localStorage.setItem('sms_user', JSON.stringify(loggedUser));
        setUser(loggedUser);

        // Log Login (Only if not just init) - Actually this is initAuth, maybe skip logging here or log 'SESSION_RESTORED'
        // logActivity('SESSION_RESTORED', {}, loggedUser.id, mappedStores?.[0]?.id);

        return { success: true, status: 'SUCCESS', tempUser: loggedUser };
    };

    const login = async (username: string, pin: string): Promise<{ success: boolean; status: 'SUCCESS' | 'CHOICE_REQUIRED' | 'OTP_REQUIRED' | 'MASTERPASS_REQUIRED' | 'LOCKED' | 'INVALID_CREDENTIALS' | 'OUTSIDE_SHIFT' | 'ERROR'; message?: string; tempUser?: User; availableMethods?: string[] }> => {
        setIsLoading(true);
        try {
            const tenantBusinessId = await resolveTenantBusinessIdFromRoute();
            const cleanUsername = username.trim();

            // 1. Find Employee by Username (Case Insensitive), scoped to tenant when known
            let query = supabase.from('employees').select('*').ilike('username', cleanUsername).is('deleted_at', null);
            if (tenantBusinessId) query = (query as any).eq('business_id', tenantBusinessId);
            let { data: employees, error } = await query.limit(1);

            if (error || !employees || employees.length === 0) {
                let nameQ = supabase.from('employees').select('*').ilike('name', cleanUsername).is('deleted_at', null);
                if (tenantBusinessId) nameQ = (nameQ as any).eq('business_id', tenantBusinessId);
                const { data: byName } = await nameQ.limit(1);
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
                otp_enabled: employee.otp_enabled,
                two_factor_method: employee.two_factor_method || 'sms'
            };

            // 4. Check 2FA
            if (employee.otp_enabled) {
                const methods: string[] = [];
                if (employee.phone) methods.push('sms');
                if (employee.master_password) methods.push('masterpass');

                // If no methods available but 2FA on, maybe fallback to SMS if phone exists or just error?
                // Assuming phone exists if 2FA is on largely.
                if (methods.length > 0) {
                    return { success: true, status: 'CHOICE_REQUIRED', tempUser: userObj, availableMethods: methods };
                }
            }

            // 5. Finalize Login (Direct - if OTP disabled or no phone/method requires it)
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
        const tenantBid = await resolveTenantBusinessIdFromRoute();
        const cleanUsername = username.trim();
        let empQuery = supabase.from('employees').select('*').ilike('username', cleanUsername).is('deleted_at', null);
        if (tenantBid) empQuery = (empQuery as any).eq('business_id', tenantBid);
        const { data: employees } = await empQuery.maybeSingle();
        if (!employees) {
            console.error('[OTP] User not found for username:', username);
            return false;
        }

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

    const verifyMasterpass = async (username: string, password: string): Promise<boolean> => {
        const tenantBid = await resolveTenantBusinessIdFromRoute();
        const cleanUsername = username.trim();
        let mpQuery = supabase.from('employees').select('master_password, id, name, username, role, pin, phone, otp_enabled, two_factor_method, store_id').ilike('username', cleanUsername).is('deleted_at', null);
        if (tenantBid) mpQuery = (mpQuery as any).eq('business_id', tenantBid);
        const { data: employee } = await mpQuery.maybeSingle();

        if (employee && employee.master_password === password) {
            const userObj: User = {
                id: employee.id,
                name: employee.name,
                username: employee.username,
                role: employee.role as any,
                pin: employee.pin,
                phone: employee.phone,
                otp_enabled: employee.otp_enabled,
                two_factor_method: employee.two_factor_method
                // We don't store master_password in session user object for security
            };
            await finalizeLogin(userObj);
            await logActivity('LOGIN_SUCCESS', { method: 'MASTERPASS' }, userObj.id, employee.store_id);
            return true;
        }
        return false;
    };

    const resendOTP = async (username: string): Promise<boolean> => {
        const tenantBid = await resolveTenantBusinessIdFromRoute();
        const cleanUsername = username.trim();
        let rsQuery = supabase.from('employees').select('*').ilike('username', cleanUsername).is('deleted_at', null);
        if (tenantBid) rsQuery = (rsQuery as any).eq('business_id', tenantBid);
        const { data: employee } = await rsQuery.maybeSingle();
        if (!employee || !employee.phone) {
            console.error('[OTP Resend] User not found or no phone');
            return false;
        }

        const code = Math.floor(100000 + Math.random() * 900000).toString();
        // if (typeof window !== 'undefined') alert(`[DEV] Your new OTP code is: ${code}`); // Dev Helper - REMOVED
        // console.log('[DEV] Resend OTP:', code); // REMOVED
        const expiry = new Date(Date.now() + 5 * 60000);

        await supabase.from('employees').update({
            otp_code: code,
            otp_expiry: expiry.toISOString()
        }).eq('id', employee.id);

        console.log('[OTP Resend] Requesting new code for', employee.phone, 'StoreId:', employee.store_id);

        if (employee.store_id) {
            try {
                const response = await fetch('/api/auth/send-otp', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        phone: employee.phone,
                        message: `Your new OTP is ${code}. Valid for 5 minutes.`,
                        storeId: employee.store_id
                    })
                });

                const result = await response.json();

                if (result.success) {
                    console.log('[OTP Resend] ✅ SMS sent successfully');
                    showToast('success', 'A new OTP has been sent to your phone');
                } else {
                    console.error('[OTP Resend] ❌ SMS send failed:', result.error);
                    showToast('error', `Failed to send SMS: ${result.error}`);
                }
            } catch (err) {
                console.error('[OTP Resend] ❌ Failed to resend OTP via API:', err);
            }
        } else {
            console.error('[OTP Resend] ❌ No store_id found for employee');
        }
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
        
        // Preserve slug for redirect
        let currentSlug = localStorage.getItem('sms_business_slug');
        
        // Fallback: If not in localStorage, check URL
        if (!currentSlug && typeof window !== 'undefined') {
            const urlSlug = window.location.pathname.split('/')[1];
            if (urlSlug && !['dashboard', 'login', 'super-admin', ''].includes(urlSlug)) {
                currentSlug = urlSlug;
            }
        }
        
        setUser(null);
        setBusinessId(null);
        localStorage.removeItem('sms_user');
        localStorage.removeItem('sms_active_store_id');
        localStorage.removeItem('sms_business_id');
        localStorage.removeItem('sms_business_slug');
        localStorage.removeItem('sms_viewas_session'); 
        
        if (currentSlug && !['dashboard', 'login', 'super-admin'].includes(currentSlug)) {
            window.location.href = `/${currentSlug}/login`;
        } else {
            window.location.href = '/';
        }
    };

    const switchStore = (storeId: any) => {
        const found = stores.find(s => s.id === storeId);
        if (found) {
            // ✅ Cross-business validation: Ensure store belongs to current business context
            if (businessId && found.business_id && found.business_id !== businessId) {
                console.error('[Auth] Cannot switch to store from different business!', {
                    attemptedStore: storeId,
                    attemptedBusiness: found.business_id,
                    currentBusiness: businessId
                });
                return;
            }
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

        // Resolve the correct business_id for scoping
        const currentBusinessId = businessId || activeStore.business_id;

        // 1. Prefer fetching by business_id for full business visibility (owners see all staff)
        // Fall back to store_id if business_id unavailable
        let directEmployees: any[] | null = null;
        if (currentBusinessId) {
            const { data } = await supabase
                .from('employees')
                .select('*')
                .eq('business_id', currentBusinessId)
                .is('deleted_at', null); // Use deleted_at, NOT status (status column does not exist)
            directEmployees = data;
        } else {
            const { data } = await supabase
                .from('employees')
                .select('*')
                .eq('store_id', activeStore.id)
                .is('deleted_at', null); // Use deleted_at, NOT status (status column does not exist)
            directEmployees = data;
        }

        // 2. Get employees linked via employee_access (Multi-Store Mode)
        const { data: accessEmployees } = await supabase
            .from('employee_access')
            .select('employee_id, role, employees!inner(*)')
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
                work_days: e.work_days,
                two_factor_method: e.two_factor_method,
                master_password: e.master_password
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
                work_days: a.employees.work_days,
                two_factor_method: a.employees.two_factor_method,
                master_password: a.employees.master_password
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
        const insertData: any = {
            name: member.name,
            username: member.username,
            phone: member.phone,
            pin: member.pin,
            role: member.role, // Default role
            store_id: activeStore.id, // Set home store
            business_id: businessId, // Multi-tenant isolation
            otp_enabled: member.otp_enabled !== undefined ? member.otp_enabled : true, // Default true
            shift_start: member.shift_start,
            shift_end: member.shift_end,
            work_days: member.work_days
        };

        // Only include master_password if it's provided
        if (member.master_password) {
            insertData.master_password = member.master_password;
        }

        const { data: newEmp, error: createError } = await supabase.from('employees').insert(insertData).select().single();

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
        if (updates.name !== undefined || updates.pin !== undefined || updates.username !== undefined || updates.phone !== undefined || updates.otp_enabled !== undefined || updates.shift_start !== undefined || updates.shift_end !== undefined || updates.work_days !== undefined || updates.master_password !== undefined) {
            const updateData: any = {};
            if (updates.name !== undefined) updateData.name = updates.name;
            if (updates.username !== undefined) updateData.username = updates.username;
            if (updates.phone !== undefined) updateData.phone = updates.phone;
            if (updates.pin !== undefined) updateData.pin = updates.pin;
            if (updates.otp_enabled !== undefined) updateData.otp_enabled = updates.otp_enabled;
            if (updates.shift_start !== undefined) updateData.shift_start = updates.shift_start;
            if (updates.shift_end !== undefined) updateData.shift_end = updates.shift_end;
            if (updates.work_days !== undefined) updateData.work_days = updates.work_days;
            if (updates.master_password !== undefined && updates.master_password !== '') updateData.master_password = updates.master_password;

            if (Object.keys(updateData).length > 0) {
                const { error: updateError } = await supabase.from('employees').update(updateData).eq('id', id);
                if (updateError) {
                    console.error(`Failed to update employee basic info! Code: ${updateError?.code}, Message: ${updateError?.message}, Details: ${updateError?.details}`);
                    console.error("Full updateError:", updateError);
                    throw updateError;
                }
            }
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
                const { error: roleUpdateError } = await supabase.from('employee_access')
                    .update({ role: updates.role })
                    .eq('id', existingAccess.id);
                if (roleUpdateError) throw roleUpdateError;
            } else {
                const { error: roleInsertError } = await supabase.from('employee_access').insert({
                    employee_id: id,
                    store_id: activeStore.id,
                    role: updates.role
                });
                if (roleInsertError) throw roleInsertError;
            }
        }

        await logActivity('UPDATE_EMPLOYEE', { target_user_id: id, updates }, user?.id, activeStore?.id);

        fetchTeamMembers();
    };

    const removeTeamMember = async (id: any) => {
        if (!activeStore?.id || !businessId) throw new Error('No active store or business');

        // 1. Remove store access
        const { error: accessError } = await supabase.from('employee_access')
            .delete()
            .eq('employee_id', id)
            .eq('store_id', activeStore.id);

        if (accessError) console.warn('[removeTeamMember] access cleanup:', accessError.message);

        // 2. Soft-delete: use deleted_at column (status column does not exist)
        const { error: deleteError } = await supabase.from('employees')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', id)
            .eq('business_id', businessId);

        if (deleteError) {
            console.error('[removeTeamMember] Failed:', deleteError.message);
            throw new Error(deleteError.message);
        }

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
    };

    const updateGlobalSettings = async (settings: Partial<GlobalSettings>) => {
        const businessId = typeof localStorage !== 'undefined' ? localStorage.getItem('sms_business_id') : null;
        if (!businessId) throw new Error("No business context found");

        const update: any = {};
        if (settings.appName) update.app_name = settings.appName;
        if (settings.appLogo !== undefined) update.logo_url = settings.appLogo;
        if (settings.primaryColor) update.primary_color = settings.primaryColor;

        const { error } = await supabase
            .from('businesses')
            .update(update)
            .eq('id', businessId);

        if (error) throw error;

        setGlobalSettings(prev => ({ ...prev, ...settings }));
    };

    const updateStoreOrder = async (updates: { id: any; sort_order: number }[]) => {
        // Optimistic Update
        setStores(prev => {
            const newStores = [...prev];
            updates.forEach(u => {
                const idx = newStores.findIndex(s => s.id === u.id);
                if (idx !== -1) newStores[idx] = { ...newStores[idx], sort_order: u.sort_order };
            });
            return newStores.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
        });

        // Batch update in Supabase
        for (const update of updates) {
            await supabase.from('stores').update({ sort_order: update.sort_order }).eq('id', update.id);
        }
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
            if (settings.paymentSettings) {
                dbUpdates.payment_settings = settings.paymentSettings;
                delete dbUpdates.paymentSettings;
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
        if (user?.role !== 'owner') return;
        const tempId = 'temp-' + Date.now();
        const newStore: Store = { id: tempId, name, location, currency: 'GHS' };
        setStores(prev => [...prev, newStore]);
        setActiveStore(newStore);
        const { data } = await supabase.from('stores').insert([{ name, location, business_id: businessId }]).select().single();
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
                categories: data.categories || [],
                paymentSettings: data.payment_settings || { methods: { cash: true, momo: true, installment: true, susu: false } }
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

        // 1. Platform Super-admin (Primary Account) or Business owner role bypass
        if (user.id === 'owner-1' || user.role === 'owner') return true;

        // 2. Granular checks require an active store
        if (!activeStore) return false;

        // 3. Get permissions from store config
        const currentPermissions = activeStore.rolePermissions || DEFAULT_PERMISSIONS;
        const role = user.role || 'staff';
        const roleData = currentPermissions[role] || (DEFAULT_PERMISSIONS as any)[role] || {};

        return roleData[permission] === true;
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

    const updateUser = (updates: Partial<User>) => {
        if (!user) return;
        const updatedUser = { ...user, ...updates };
        setUser(updatedUser);
        localStorage.setItem('sms_user', JSON.stringify(updatedUser));
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
            verifyMasterpass,
            resendOTP,
            unlockAccount,
            hasPermission,
            updateRolePermissions,
            updateStoreStatus,
            requestStoreDeletionOTC,
            verifyStoreDeletionOTC,
            deleteStore,
            globalSettings,
            updateGlobalSettings,
            updateStoreOrder,
            updateUser,
            businessId
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
