'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from './supabase';
import { useAuth } from './auth-context';

interface Notification {
    id: string;
    store_id: string;
    type: 'order' | 'low_stock' | 'report' | 'custom';
    title: string;
    message: string;
    is_read: boolean;
    metadata?: any;
    created_at: string;
}

interface NotificationsContextType {
    notifications: Notification[];
    unreadCount: number;
    isLoading: boolean;
    markAsRead: (id: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    createNotification: (notification: Omit<Notification, 'id' | 'store_id' | 'created_at' | 'is_read'>) => Promise<void>;
    refreshNotifications: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
    const { activeStore, businessId } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (activeStore?.id || businessId) {
            fetchNotifications();
            subscribeToNotifications();
        } else {
            setNotifications([]);
            setIsLoading(false);
        }
    }, [activeStore?.id, businessId]);

    const fetchNotifications = async () => {
        // We now prioritize businessId for wider context or activeStore.id for specific context
        if (!businessId && !activeStore?.id) return;

        setIsLoading(true);
        try {
            let query = supabase
                .from('notifications')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(50);

            if (activeStore?.id) {
                query = query.eq('store_id', activeStore.id);
            } else if (businessId) {
                // Only filter by business_id if we have it and no store is active
                query = query.eq('business_id', businessId);
            }

            const { data, error } = await query;

            if (error) {
                if (error.code === '42703' && !activeStore?.id) {
                    console.warn('[Notifications] business_id column missing; skipping unscoped fetch to avoid cross-tenant leakage. Run SUPABASE_ISOLATION_REINFORCEMENT.sql.');
                    setNotifications([]);
                } else if (error.code === '42P01') {
                    console.warn('[Notifications] Table does not exist yet.');
                    setNotifications([]);
                } else if (error.code === 'PGRST116') {
                    console.warn('[Notifications] RLS policy denying access - this is expected during initial setup.');
                    setNotifications([]);
                } else {
                    console.error('[Notifications] Error fetching:', error.message || error);
                }
            } else if (data) {
                setNotifications(data);
            }
        } catch (err) {
            console.error('[Notifications] Unexpected error:', (err instanceof Error ? err.message : err));
        } finally {
            setIsLoading(false);
        }
    };

    const subscribeToNotifications = () => {
        if (!activeStore?.id) return;

        const channel = supabase
            .channel(`notifications:${activeStore.id}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'notifications',
                    filter: `store_id=eq.${activeStore.id}`
                },
                (payload) => {
                    console.log('[Notifications] Real-time update:', payload);
                    if (payload.eventType === 'INSERT') {
                        setNotifications(prev => [payload.new as Notification, ...prev]);
                    } else if (payload.eventType === 'UPDATE') {
                        setNotifications(prev =>
                            prev.map(n => n.id === payload.new.id ? payload.new as Notification : n)
                        );
                    } else if (payload.eventType === 'DELETE') {
                        setNotifications(prev => prev.filter(n => n.id !== payload.old.id));
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    };

    const markAsRead = async (id: string) => {
        // Optimistic update
        setNotifications(prev =>
            prev.map(n => n.id === id ? { ...n, is_read: true } : n)
        );

        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', id);

        if (error) {
            console.error('[Notifications] Error marking as read:', error);
            // Revert on error
            fetchNotifications();
        }
    };

    const markAllAsRead = async () => {
        if (!activeStore?.id) return;

        // Optimistic update
        setNotifications(prev =>
            prev.map(n => ({ ...n, is_read: true }))
        );

        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('store_id', activeStore.id)
            .eq('is_read', false);

        if (error) {
            console.error('[Notifications] Error marking all as read:', error);
            // Revert on error
            fetchNotifications();
        }
    };

    const createNotification = async (notification: Omit<Notification, 'id' | 'store_id' | 'created_at' | 'is_read'>) => {
        if (!activeStore?.id) return;

        const row: Record<string, unknown> = {
            store_id: activeStore.id,
            ...notification
        };
        if (businessId) row.business_id = businessId;

        const { error } = await supabase.from('notifications').insert(row as any);

        if (error) {
            console.error('[Notifications] Error creating notification:', error);
        }
    };

    const unreadCount = notifications.filter(n => !n.is_read).length;

    return (
        <NotificationsContext.Provider value={{
            notifications,
            unreadCount,
            isLoading,
            markAsRead,
            markAllAsRead,
            createNotification,
            refreshNotifications: fetchNotifications
        }}>
            {children}
        </NotificationsContext.Provider>
    );
}

export function useNotifications() {
    const context = useContext(NotificationsContext);
    if (context === undefined) {
        throw new Error('useNotifications must be used within a NotificationsProvider');
    }
    return context;
}
