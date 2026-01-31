
// Development Service Worker - Self-Destruct
// This file exists to replace any broken Service Worker that might have been registered
// during a build, preventing "bad-precaching-response" errors in development.

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        self.registration.unregister().then(() => {
            console.log('[Dev SW] Service Worker unregistered. Reloading page for fresh dev state.');
            return self.clients.matchAll();
        }).then(clients => {
            clients.forEach(client => client.navigate(client.url));
        })
    );
});
