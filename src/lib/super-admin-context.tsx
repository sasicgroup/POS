'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { logAdminAction } from './admin-logger';

import { useToast } from './toast-context';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Business {
    id: string;
    name: string;
    slug: string;
    owner_email?: string;
    owner_phone?: string;
    logo_url?: string;
    primary_color?: string;
    app_name?: string;
    plan: 'monthly' | 'yearly' | 'forever' | 'trial';
    plan_id?: string; // e.g. 'starter', 'pro', 'enterprise'
    custom_price_monthly?: number;
    custom_price_yearly?: number;
    subscription_start?: string;
    subscription_end?: string | null;
    grace_period_days: number;
    is_active: boolean;
    custom_domain?: string;
    custom_subdomain?: string;
    created_at: string;
    notes?: string;
    subscription_status?: 'active' | 'grace' | 'expired' | 'forever';
    days_remaining?: number | null;
    feature_flags?: Record<string, boolean>;
    sms_balance?: number;
}

export interface SuperAdmin {
    id: string;
    name: string;
    email: string;
}

/**
 * SaaS Feature Gating Engine
 * Deterministically merges Plan-level defaults with Business-level manual overrides.
 */
export function getActiveFeatures(business: Business, plans: any[] = []) {
    const plan = plans.find(p => p.id === (business.plan_id || 'starter'));
    const baseFeatures = plan?.included_features || {};
    const manualOverrides = business.feature_flags || {};

    // Final merge (Manual overrides take precedence)
    return {
        ...baseFeatures,
        ...manualOverrides
    };
}

export interface ViewAsSession {
    business_id: string;
    business_name: string;
    business_slug: string;
    mode: 'read_only' | 'full_access';
}

interface SuperAdminContextType {
    superAdmin: SuperAdmin | null;
    businesses: Business[];
    isLoading: boolean;
    viewAsSession: ViewAsSession | null;
    login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
    logout: () => void;
    loadBusinesses: () => Promise<void>;
    createBusiness: (data: CreateBusinessInput) => Promise<{ success: boolean; message?: string; business?: Business }>;
    updateBusiness: (id: string, data: Partial<Business>) => Promise<{ success: boolean; message?: string }>;
    renewSubscription: (id: string, plan: string, endDate: string | null, note?: string) => Promise<{ success: boolean }>;
    toggleBusinessActive: (id: string, isActive: boolean) => Promise<{ success: boolean; message?: string }>;
    deleteBusiness: (id: string) => Promise<{ success: boolean; message?: string }>;
    startViewAs: (business: Business, mode: 'read_only' | 'full_access') => Promise<void>;
    exitViewAs: () => void;
    getBusinessById: (id: string) => Promise<Business | null>;
}

export interface CreateBusinessInput {
    name: string;
    slug: string;
    owner_email?: string;
    owner_phone?: string;
    plan: 'monthly' | 'yearly' | 'forever' | 'trial';
    subscription_end?: string | null;
    primary_color?: string;
    app_name?: string;
    notes?: string;
    owner_name: string;
    owner_username: string;
    owner_pin: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function computeSubscriptionStatus(business: Business): { status: Business['subscription_status']; days_remaining: number | null } {
    if (business.plan === 'forever' || !business.subscription_end) {
        return { status: 'forever', days_remaining: null };
    }
    const now = new Date();
    const end = new Date(business.subscription_end);
    const graceEnd = new Date(end);
    graceEnd.setDate(graceEnd.getDate() + (business.grace_period_days || 7));

    const diffMs = end.getTime() - now.getTime();
    const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (now <= end) return { status: 'active', days_remaining: daysRemaining };
    if (now <= graceEnd) return { status: 'grace', days_remaining: Math.ceil((graceEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) };
    return { status: 'expired', days_remaining: 0 };
}

function enrichBusiness(b: any): Business {
    const business: Business = {
        id: b.id,
        name: b.name,
        slug: b.slug,
        owner_email: b.owner_email,
        owner_phone: b.owner_phone,
        logo_url: b.logo_url,
        primary_color: b.primary_color || '#4f46e5',
        app_name: b.app_name,
        plan: b.plan || 'monthly',
        subscription_start: b.subscription_start,
        subscription_end: b.subscription_end,
        grace_period_days: b.grace_period_days || 7,
        is_active: b.is_active,
        custom_domain: b.custom_domain,
        custom_subdomain: b.custom_subdomain,
        created_at: b.created_at,
        notes: b.notes,
    };
    const { status, days_remaining } = computeSubscriptionStatus(business);
    business.subscription_status = status;
    business.days_remaining = days_remaining;
    return business;
}

async function saFetch(path: string, init?: RequestInit) {
    return fetch(path, {
        ...init,
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            ...(init?.headers || {}),
        },
    });
}

// ─── Context ──────────────────────────────────────────────────────────────────

const SuperAdminContext = createContext<SuperAdminContextType | undefined>(undefined);

export function SuperAdminProvider({ children }: { children: React.ReactNode }) {
    const { showToast } = useToast();
    const [superAdmin, setSuperAdmin] = useState<SuperAdmin | null>(null);
    const [businesses, setBusinesses] = useState<Business[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [viewAsSession, setViewAsSession] = useState<ViewAsSession | null>(null);

    useEffect(() => {
        const vas = localStorage.getItem('sms_viewas_session');
        if (vas) {
            try { setViewAsSession(JSON.parse(vas)); } catch { /* ignore */ }
        }

        (async () => {
            const stored = localStorage.getItem('sms_super_admin_session');
            if (stored) {
                try { setSuperAdmin(JSON.parse(stored)); } catch { /* ignore */ }
            }
            const res = await saFetch('/api/super-admin/session');
            if (res.ok) {
                const { admin } = await res.json();
                setSuperAdmin(admin);
                localStorage.setItem('sms_super_admin_session', JSON.stringify(admin));
            } else {
                setSuperAdmin(null);
                localStorage.removeItem('sms_super_admin_session');
            }
            setIsLoading(false);
        })();
    }, []);

    const login = async (email: string, password: string): Promise<{ success: boolean; message?: string }> => {
        setIsLoading(true);
        try {
            const res = await saFetch('/api/super-admin/login', {
                method: 'POST',
                body: JSON.stringify({ email, password }),
            });
            const data = await res.json();
            if (!res.ok) {
                return { success: false, message: data.error || 'Login failed' };
            }
            const admin = data.admin as SuperAdmin;
            setSuperAdmin(admin);
            localStorage.setItem('sms_super_admin_session', JSON.stringify(admin));
            await logAdminAction(admin.id, 'LOGIN', { email });
            return { success: true };
        } catch (e: any) {
            return { success: false, message: e.message };
        } finally {
            setIsLoading(false);
        }
    };

    const logout = async () => {
        await saFetch('/api/super-admin/logout', { method: 'POST' });
        setSuperAdmin(null);
        localStorage.removeItem('sms_super_admin_session');
        localStorage.removeItem('sms_viewas_session');
        setViewAsSession(null);
        window.location.href = '/super-admin/login';
    };

    const loadBusinesses = useCallback(async () => {
        const res = await saFetch('/api/super-admin/businesses');
        if (!res.ok) return;
        const { businesses: rows } = await res.json();
        if (rows) setBusinesses(rows.map(enrichBusiness));
    }, []);

    useEffect(() => {
        if (superAdmin) loadBusinesses();
    }, [superAdmin, loadBusinesses]);

    const createBusiness = async (input: CreateBusinessInput): Promise<{ success: boolean; message?: string; business?: Business }> => {
        try {
            const res = await saFetch('/api/super-admin/businesses', {
                method: 'POST',
                body: JSON.stringify({
                    ...input,
                    slug: input.slug.toLowerCase().replace(/\s+/g, '-'),
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                return { success: false, message: data.error || 'Failed to create business' };
            }
            await loadBusinesses();
            return { success: true, business: enrichBusiness(data.business) };
        } catch (e: any) {
            return { success: false, message: e.message };
        }
    };

    const updateBusiness = async (id: string, data: Partial<Business>): Promise<{ success: boolean; message?: string }> => {
        try {
            const res = await saFetch(`/api/super-admin/businesses/${id}`, {
                method: 'PATCH',
                body: JSON.stringify(data),
            });
            const errBody = await res.json().catch(() => ({}));
            if (!res.ok) {
                return { success: false, message: errBody.error || 'Update failed' };
            }
            if (superAdmin) await logAdminAction(superAdmin.id, 'UPDATE_BUSINESS', data, id);
            await loadBusinesses();
            return { success: true };
        } catch (e: any) {
            return { success: false, message: e.message };
        }
    };

    const renewSubscription = async (id: string, plan: string, endDate: string | null, note?: string): Promise<{ success: boolean }> => {
        try {
            const res = await saFetch(`/api/super-admin/businesses/${id}/subscription`, {
                method: 'POST',
                body: JSON.stringify({
                    action: 'renew',
                    plan,
                    subscription_end: endDate,
                    note,
                }),
            });
            if (!res.ok) return { success: false };
            if (superAdmin) await logAdminAction(superAdmin.id, 'RENEW_SUBSCRIPTION', { plan, endDate, note }, id);
            await loadBusinesses();
            return { success: true };
        } catch {
            return { success: false };
        }
    };

    const toggleBusinessActive = async (id: string, isActive: boolean): Promise<{ success: boolean; message?: string }> => {
        try {
            const res = await saFetch(`/api/super-admin/businesses/${id}/subscription`, {
                method: 'POST',
                body: JSON.stringify({ action: 'toggle', is_active: isActive }),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                return { success: false, message: data.error || 'Toggle failed' };
            }
            if (superAdmin) await logAdminAction(superAdmin.id, 'TOGGLE_BUSINESS', { isActive }, id);
            await loadBusinesses();
            return { success: true };
        } catch (e: any) {
            return { success: false, message: e.message };
        }
    };

    const deleteBusiness = async (id: string): Promise<{ success: boolean; message?: string }> => {
        try {
            const res = await saFetch(`/api/super-admin/businesses/${id}/delete`, {
                method: 'DELETE',
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                return { success: false, message: data.error || 'Failed to delete business' };
            }
            if (superAdmin) await logAdminAction(superAdmin.id, 'DELETE_BUSINESS', { deleted: data.deleted }, id);
            await loadBusinesses();
            showToast('success', `Business "${data.deleted}" has been permanently deleted.`);
            return { success: true };
        } catch (e: any) {
            return { success: false, message: e.message };
        }
    };

    const startViewAs = async (business: Business, mode: 'read_only' | 'full_access') => {
        const res = await saFetch(`/api/super-admin/businesses/${business.id}/owner`);
        if (!res.ok) {
            showToast('error', 'No owner account found for this business. Please create one first.');
            return;
        }
        const { owner } = await res.json();
        if (!owner) {
            showToast('error', 'No owner account found for this business. Please create one first.');
            return;
        }

        const session: ViewAsSession = {
            business_id: business.id,
            business_name: business.name,
            business_slug: business.slug,
            mode
        };
        if (superAdmin) await logAdminAction(superAdmin.id, 'VIEW_AS', { mode }, business.id);
        setViewAsSession(session);
        localStorage.setItem('sms_viewas_session', JSON.stringify(session));

        const tempUser = {
            id: owner.id,
            name: owner.name,
            username: owner.username,
            role: owner.role,
            pin: owner.pin,
            phone: owner.phone,
            otp_enabled: false,
            business_id: business.id, // ✅ Add business_id to user object
        };
        localStorage.setItem('sms_user', JSON.stringify(tempUser));
        localStorage.setItem('sms_business_id', business.id);
        localStorage.setItem('sms_business_slug', business.slug);
        localStorage.removeItem('sms_active_store_id');

        // ✅ Validate slug format before redirect
        if (!business.slug || business.slug.includes('/')) {
            console.error('[ViewAs] Invalid business slug format:', business.slug);
            showToast('error', 'Invalid business configuration. Cannot proceed.');
            return;
        }

        window.location.href = `/${business.slug}/dashboard`;
    };

    const exitViewAs = () => {
        setViewAsSession(null);
        localStorage.removeItem('sms_viewas_session');
        localStorage.removeItem('sms_user');
        localStorage.removeItem('sms_active_store_id');
        localStorage.removeItem('sms_business_id');
        window.location.href = '/super-admin/dashboard';
    };

    const getBusinessById = async (id: string): Promise<Business | null> => {
        const res = await saFetch(`/api/super-admin/businesses/${id}`);
        if (!res.ok) return null;
        const { business } = await res.json();
        return business ? enrichBusiness(business) : null;
    };

    return (
        <SuperAdminContext.Provider value={{
            superAdmin, businesses, isLoading, viewAsSession,
            login, logout, loadBusinesses,
            createBusiness, updateBusiness, renewSubscription,
            toggleBusinessActive, deleteBusiness, startViewAs, exitViewAs, getBusinessById
        }}>
            {children}
        </SuperAdminContext.Provider>
    );
}

export function useSuperAdmin() {
    const ctx = useContext(SuperAdminContext);
    if (!ctx) throw new Error('useSuperAdmin must be used within SuperAdminProvider');
    return ctx;
}
