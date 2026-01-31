'use client';

import { useEffect } from 'react';

export function PWARegister() {
    useEffect(() => {
        if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
            // In Production: Register
            if (process.env.NODE_ENV === 'production') {
                navigator.serviceWorker
                    .register('/sw.js')
                    .then((registration) => {
                        console.log('Service Worker registered:', registration);
                    })
                    .catch((error) => {
                        console.log('Service Worker registration failed:', error);
                    });
            }
            // In Development: Unregister aggressively
            else {
                navigator.serviceWorker.getRegistrations().then((registrations) => {
                    for (let registration of registrations) {
                        registration.unregister();
                        console.log('Service Worker unregistered in Dev mode');
                    }
                });
            }
        }
    }, []);

    return null;
}
