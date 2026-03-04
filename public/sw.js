// sw.js - Service Worker Básico para permitir instalación PWA
const CACHE_NAME = 'een-admin-cache-v1';

// Al instalar, no guardamos en caché archivos pesados de momento, 
// solo lo necesario para que el navegador apruebe la instalación PWA.
self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
});

// Interceptar peticiones de red (por ahora, simplemente las deja pasar, 
// pero es requisito para que Chrome muestre el botón de "Instalar App")
self.addEventListener('fetch', (event) => {
    event.respondWith(
        fetch(event.request).catch(() => {
            return caches.match(event.request);
        })
    );
});
