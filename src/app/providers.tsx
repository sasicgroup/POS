'use client';

import { AuthProvider } from '../lib/auth-context';
import { InventoryProvider } from '../lib/inventory-context';
import { ToastProvider } from '../lib/toast-context';
export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <AuthProvider>
            <ToastProvider>
                <InventoryProvider>
                    {children}
                </InventoryProvider>
            </ToastProvider>
        </AuthProvider>
    );
}
