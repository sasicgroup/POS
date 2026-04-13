'use client';

import { AuthProvider } from '../lib/auth-context';
import { InventoryProvider } from '../lib/inventory-context';
import { ToastProvider } from '../lib/toast-context';
import { SuperAdminProvider } from '../lib/super-admin-context';

import { NotificationsProvider } from '../lib/notifications-context';

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <ToastProvider>
            <SuperAdminProvider>
                <AuthProvider>
                    <NotificationsProvider>
                        <InventoryProvider>
                            {children}
                        </InventoryProvider>
                    </NotificationsProvider>
                </AuthProvider>
            </SuperAdminProvider>
        </ToastProvider>
    );
}

