'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

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
    subscription_start?: string;
    subscription_end?: string | null;
    grace_period_days: number;
    is_active: boolean;
    custom_domain?: string;
    custom_subdomain?: string;
    created_at: string;
    notes?: string;
    // Computed
    subscription_status?: 'active' | 'grace' | 'expired' | 'forever';
    days_remaining?: number | null;
}

export interface SuperAdmin {
    id: string;
    name: string;
    email: string;
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
    toggleBusinessActive: (id: string, isActive: boolean) => Promise<void>;
    startViewAs: (business: Business, mode: 'read_only' | 'full_access') => void;
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
    // Owner account
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

// ─── Context ──────────────────────────────────────────────────────────────────

const SuperAdminContext = createContext<SuperAdminContextType | undefined>(undefined);

export function SuperAdminProvider({ children }: { children: React.ReactNode }) {
    const [superAdmin, setSuperAdmin] = useState<SuperAdmin | null>(null);
    const [businesses, setBusinesses] = useState<Business[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [viewAsSession, setViewAsSession] = useState<ViewAsSession | null>(null);

    // Restore session on mount
    useEffect(() => {
        const stored = localStorage.getItem('sms_super_admin_session');
        if (stored) {
            try { setSuperAdmin(JSON.parse(stored)); } catch {}
        }
        const vas = localStorage.getItem('sms_viewas_session');
        if (vas) {
            try { setViewAsSession(JSON.parse(vas)); } catch {}
        }
        setIsLoading(false);
    }, []);

    const login = async (email: string, password: string): Promise<{ success: boolean; message?: string }> => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('super_admins')
                .select('*')
                .ilike('email', email)
                .eq('is_active', true)
                .single();

            if (error || !data) return { success: false, message: 'Invalid email or password.' };

            // MVP: plaintext comparison — upgrade to bcrypt in production
            if (data.password_hash !== password) return { success: false, message: 'Invalid email or password.' };

            // Update last login
            await supabase.from('super_admins').update({ last_login_at: new Date().toISOString() }).eq('id', data.id);

            const admin: SuperAdmin = { id: data.id, name: data.name, email: data.email };
            setSuperAdmin(admin);
            localStorage.setItem('sms_super_admin_session', JSON.stringify(admin));
            return { success: true };
        } catch (e: any) {
            return { success: false, message: e.message };
        } finally {
            setIsLoading(false);
        }
    };

    const logout = () => {
        setSuperAdmin(null);
        localStorage.removeItem('sms_super_admin_session');
        localStorage.removeItem('sms_viewas_session');
        setViewAsSession(null);
        window.location.href = '/super-admin/login';
    };

    const loadBusinesses = useCallback(async () => {
        const { data, error } = await supabase
            .from('businesses')
            .select('*')
            .order('created_at', { ascending: false });
        if (data) setBusinesses(data.map(enrichBusiness));
    }, []);

    useEffect(() => {
        if (superAdmin) loadBusinesses();
    }, [superAdmin, loadBusinesses]);

    const createBusiness = async (input: CreateBusinessInput): Promise<{ success: boolean; message?: string; business?: Business }> => {
        try {
            // 1. Create the business record
            const { data: biz, error: bizErr } = await supabase
                .from('businesses')
                .insert({
                    name: input.name,
                    slug: input.slug.toLowerCase().replace(/\s+/g, '-'),
                    owner_email: input.owner_email,
                    owner_phone: input.owner_phone,
                    plan: input.plan,
                    subscription_start: new Date().toISOString(),
                    subscription_end: input.subscription_end || null,
                    primary_color: input.primary_color || '#4f46e5',
                    app_name: input.app_name || input.name,
                    notes: input.notes,
                    is_active: true,
                    created_by: superAdmin?.id
                })
                .select()
                .single();

            if (bizErr || !biz) throw bizErr || new Error('Failed to create business');

            // 2. Create the owner employee account
            const { error: empErr } = await supabase
                .from('employees')
                .insert({
                    name: input.owner_name,
                    username: input.owner_username,
                    pin: input.owner_pin,
                    role: 'owner',
                    phone: input.owner_phone,
                    business_id: biz.id,
                    otp_enabled: false,
                });

            if (empErr) throw empErr;

            // 3. Log the subscription creation
            await supabase.from('business_subscription_logs').insert({
                business_id: biz.id,
                action: 'created',
                plan: input.plan,
                subscription_end: input.subscription_end,
                note: 'Initial setup',
                actioned_by: superAdmin?.id
            });

            await loadBusinesses();
            return { success: true, business: enrichBusiness(biz) };
        } catch (e: any) {
            return { success: false, message: e.message };
        }
    };

    const updateBusiness = async (id: string, data: Partial<Business>): Promise<{ success: boolean; message?: string }> => {
        try {
            const { error } = await supabase.from('businesses').update(data).eq('id', id);
            if (error) throw error;
            await loadBusinesses();
            return { success: true };
        } catch (e: any) {
            return { success: false, message: e.message };
        }
    };

    const renewSubscription = async (id: string, plan: string, endDate: string | null, note?: string): Promise<{ success: boolean }> => {
        try {
            await supabase.from('businesses').update({
                plan,
                subscription_end: endDate,
                subscription_start: new Date().toISOString(),
                is_active: true
            }).eq('id', id);

            await supabase.from('business_subscription_logs').insert({
                business_id: id,
                action: 'renewed',
                plan,
                subscription_end: endDate,
                note: note || 'Manual renewal',
                actioned_by: superAdmin?.id
            });

            await loadBusinesses();
            return { success: true };
        } catch {
            return { success: false };
        }
    };

    const toggleBusinessActive = async (id: string, isActive: boolean) => {
        await supabase.from('businesses').update({ is_active: isActive }).eq('id', id);
        await supabase.from('business_subscription_logs').insert({
            business_id: id,
            action: isActive ? 'reactivated' : 'suspended',
            note: `Manually ${isActive ? 'reactivated' : 'suspended'} by super admin`,
            actioned_by: superAdmin?.id
        });
        await loadBusinesses();
    };

    const startViewAs = (business: Business, mode: 'read_only' | 'full_access') => {
        const session: ViewAsSession = {
            business_id: business.id,
            business_name: business.name,
            business_slug: business.slug,
            mode
        };
        setViewAsSession(session);
        localStorage.setItem('sms_viewas_session', JSON.stringify(session));
        // Redirect to the business's dashboard
        window.location.href = `/dashboard?viewas=${business.id}`;
    };

    const exitViewAs = () => {
        setViewAsSession(null);
        localStorage.removeItem('sms_viewas_session');
        window.location.href = '/super-admin/dashboard';
    };

    const getBusinessById = async (id: string): Promise<Business | null> => {
        const { data } = await supabase.from('businesses').select('*').eq('id', id).single();
        return data ? enrichBusiness(data) : null;
    };

    return (
        <SuperAdminContext.Provider value={{
            superAdmin, businesses, isLoading, viewAsSession,
            login, logout, loadBusinesses,
            createBusiness, updateBusiness, renewSubscription,
            toggleBusinessActive, startViewAs, exitViewAs, getBusinessById
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
