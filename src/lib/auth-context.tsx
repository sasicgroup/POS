'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

import { supabase } from '@/lib/supabase';
import { loadSMSConfigFromDB } from '@/lib/sms';

// Define Store Type
export interface Store {
    id?: any; // Added ID
    name: string;
    location: string;
    currency: string;
    taxSettings?: {
        enabled: boolean;
        type: 'percentage' | 'fixed';
        value: number;
    };
}

// Define User Type
export interface User {
    id: number | string;
    name: string;
    role: 'owner' | 'manager' | 'associate';
    pin: string;
}

interface AuthContextType {
    user: User | null;
    activeStore: Store | null;
    stores: Store[];
    isLoading: boolean;
    login: (pin: string) => Promise<boolean>;
    logout: () => void;
    switchStore: (storeId: any) => void;
    updateStoreSettings: (settings: Partial<Store>) => void;
    createStore: (name: string, location: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeStore, setActiveStore] = useState<Store | null>(null);
    const [stores, setStores] = useState<Store[]>([]);

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

                // Load Stores based on User Access
                let validStores: any[] = [];
                let accessIds: any[] = [];

                if (currentUser.id !== 'owner-1') {
                    // 1. Get Access IDs from Junction Table
                    const { data: accessData } = await supabase
                        .from('employee_access')
                        .select('store_id')
                        .eq('employee_id', currentUser.id);

                    if (accessData) accessIds = accessData.map(a => a.store_id);

                    // 2. Also check if they are "home" based in a store (if we knew it)
                    // Ideally we re-fetch the employee to be safe
                    const { data: freshEmp } = await supabase.from('employees').select('store_id').eq('id', currentUser.id).single();
                    if (freshEmp?.store_id) accessIds.push(freshEmp.store_id);
                } else {
                    // It is owner-1 (legacy/dev user), so we skip UUID-based lookups which cause 400 Bad Request
                }

                // Fetch Stores
                if (accessIds.length > 0) {
                    const { data: userStores } = await supabase.from('stores').select('*').in('id', accessIds);
                    if (userStores) validStores = userStores;
                } else {
                    // Fallback: If no access records found, maybe they are owner/super or data gap?
                    // If ID is 'owner-1' (legacy), fetch all
                    if (currentUser.id === 'owner-1') {
                        const { data: all } = await supabase.from('stores').select('*');
                        if (all) validStores = all;
                    }
                }

                if (validStores.length > 0) {
                    const mappedStores = validStores.map((s: any) => ({
                        ...s,
                        taxSettings: s.tax_settings || { enabled: true, type: 'percentage', value: 12.5 }
                    }));
                    setStores(mappedStores);

                    // Try to find last active store
                    const storedStoreId = localStorage.getItem('sms_active_store_id');
                    const lastActive = mappedStores.find((s: any) => s.id === storedStoreId);
                    const finalStore = lastActive || mappedStores[0];
                    setActiveStore(finalStore);
                    if (finalStore?.id) loadSMSConfigFromDB(finalStore.id);
                }
            } catch (error) {
                console.error("Auth init failed", error);
            } finally {
                setIsLoading(false);
            }
        };
        initAuth();
    }, []);

    const login = async (pin: string): Promise<boolean> => {
        setIsLoading(true);
        try {
            // 1. Find Employee by PIN
            const { data: employees, error } = await supabase
                .from('employees')
                .select('*')
                .eq('pin', pin)
                .limit(1);

            if (error || !employees || employees.length === 0) {
                // Fallback for hardcoded owner if DB empty? No, let's rely on DB.
                if (pin === '1234') {
                    // Keep simpler mock fallback just in case DB is broken during demo
                    const fallbackOwner: User = { id: 'owner-1', name: 'Store Owner', role: 'owner', pin: '1234' };
                    setUser(fallbackOwner);
                    localStorage.setItem('sms_user', JSON.stringify(fallbackOwner));

                    // NEW: Ensure we try to find stores for this hardcoded owner too if DB has them
                    const { data: all } = await supabase.from('stores').select('*');
                    if (all && all.length > 0) {
                        const mapped = all.map((s: any) => ({
                            ...s,
                            taxSettings: s.tax_settings || { enabled: true, type: 'percentage', value: 12.5 }
                        }));
                        setStores(mapped);
                        setActiveStore(mapped[0]);
                        localStorage.setItem('sms_active_store_id', mapped[0].id);
                    }
                    return true;
                }
                return false;
            }

            const employee = employees[0];

            // 2. Find Accessible Stores
            // We look for stores in employee_access OR the store_id on the employee record (home store)
            const { data: accessData } = await supabase
                .from('employee_access')
                .select('store_id')
                .eq('employee_id', employee.id);

            const accessStoreIds = accessData ? accessData.map(a => a.store_id) : [];
            if (employee.store_id) accessStoreIds.push(employee.store_id); // Include home store

            // 3. Fetch Store Details
            const { data: userStores } = await supabase
                .from('stores')
                .select('*')
                .in('id', accessStoreIds);

            if (userStores && userStores.length > 0) {
                const mappedStores = userStores.map((s: any) => ({
                    ...s,
                    taxSettings: s.tax_settings || { enabled: true, type: 'percentage', value: 12.5 }
                }));

                setStores(mappedStores);
                // Default to first one or stay on current if valid
                setActiveStore(mappedStores[0]);
                localStorage.setItem('sms_active_store_id', mappedStores[0].id);
                if (mappedStores[0].id) loadSMSConfigFromDB(mappedStores[0].id);
            }

            const newUser: User = {
                id: employee.id,
                name: employee.name,
                role: employee.role as any,
                pin: employee.pin
            };
            setUser(newUser);
            localStorage.setItem('sms_user', JSON.stringify(newUser));
            return true;
        } finally {
            setIsLoading(false);
        }
    };

    const logout = () => {
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
        }
    };

    const updateStoreSettings = async (settings: Partial<Store>) => {
        if (!activeStore) return;

        // Optimistic Update
        const updatedStore = { ...activeStore, ...settings };
        setActiveStore(updatedStore);
        setStores(prev => prev.map(s => s.id === activeStore.id ? updatedStore : s));

        // Supabase Update
        if (activeStore.id && typeof activeStore.id === 'string' && !activeStore.id.startsWith('store-')) {
            const { error } = await supabase
                .from('stores')
                .update({
                    name: settings.name,
                    location: settings.location,
                    currency: settings.currency,
                    tax_settings: settings.taxSettings
                })
                .eq('id', activeStore.id);

            if (error) console.error("Failed to update store settings", error);
        }
    };

    const createStore = async (name: string, location: string) => {
        // Optimistic
        const tempId = 'temp-' + Date.now();
        const newStore: Store = {
            id: tempId,
            name,
            location,
            currency: 'GHS'
        };
        setStores(prev => [...prev, newStore]);
        setActiveStore(newStore);

        // Supabase Insert
        const { data, error } = await supabase.from('stores').insert([{ name, location }]).select().single();
        if (data) {
            // Update logic with real ID
            setStores(prev => prev.map(s => s.id === tempId ? data : s));
            setActiveStore(data);
        } else if (error) {
            console.error("Failed to create store", error);
        }
    };

    return (
        <AuthContext.Provider value={{
            user,
            activeStore,
            stores,
            isLoading,
            login,
            logout,
            switchStore,
            updateStoreSettings,
            createStore
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
