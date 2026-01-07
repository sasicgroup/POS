'use client';

import { AuthProvider } from '../lib/auth-context';

import { InventoryProvider } from '../lib/inventory-context';

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <AuthProvider>
            <InventoryProvider>
                {children}
            </InventoryProvider>
        </AuthProvider>
    );
}
