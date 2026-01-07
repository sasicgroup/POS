'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export type Role = 'super_admin' | 'admin' | 'manager' | 'staff';

export interface Store {
    id: string;
    name: string;
    location: string;
    currency: string;
    taxSettings?: {
        enabled: boolean;
        type: 'percentage' | 'fixed';
        value: number;
    };
}

export interface User {
    id: string;
    name: string;
    email: string;
    role: Role;
    avatar?: string;
}

interface AuthContextType {
    user: User | null;
    activeStore: Store | null;
    stores: Store[];
    login: (email: string, role: Role) => void;
    logout: () => void;
    switchStore: (storeId: string) => void;
    updateStoreSettings: (settings: Partial<Store>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const MOCK_STORES: Store[] = [
    { id: '1', name: 'SASIC Main Branch', location: 'Accra, GH', currency: 'GHS' },
    { id: '2', name: 'SASIC Outlet', location: 'Kumasi, GH', currency: 'GHS' },
    { id: '3', name: 'SASIC Online', location: 'Online', currency: 'GHS' },
];

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [activeStore, setActiveStore] = useState<Store | null>(null);
    const [stores, setStores] = useState<Store[]>(MOCK_STORES);
    const router = useRouter();

    useEffect(() => {
        // Check local storage for persisted session
        const storedUser = localStorage.getItem('sms_user');
        const storedStoreId = localStorage.getItem('sms_active_store_id');

        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }

        if (storedStoreId) {
            const store = MOCK_STORES.find(s => s.id === storedStoreId);
            if (store) setActiveStore(store);
        } else {
            setActiveStore(MOCK_STORES[0]);
        }
    }, []);

    const login = (email: string, role: Role) => {
        const newUser: User = {
            id: 'u1',
            name: email.split('@')[0],
            email,
            role,
            avatar: `https://ui-avatars.com/api/?name=${email}&background=random`
        };
        setUser(newUser);
        localStorage.setItem('sms_user', JSON.stringify(newUser));
        router.push('/dashboard');
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('sms_user');
        router.push('/');
    };

    const switchStore = (storeId: string) => {
        const store = stores.find(s => s.id === storeId);
        if (store) {
            setActiveStore(store);
            localStorage.setItem('sms_active_store_id', storeId);
        }
    };

    const updateStoreSettings = (settings: Partial<Store>) => {
        if (!activeStore) return;
        const updatedStore = { ...activeStore, ...settings };
        setActiveStore(updatedStore);
        setStores(stores.map(s => s.id === activeStore.id ? updatedStore : s));
    };

    return (
        <AuthContext.Provider value={{ user, activeStore, stores, login, logout, switchStore, updateStoreSettings }}>
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
