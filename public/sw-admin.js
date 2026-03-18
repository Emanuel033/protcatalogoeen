const CACHE_NAME = 'een-sistema-v3'; 

// Ya no cacheamos archivos dinámicos, solo lo mínimo para que sea instalable
const urlsToCache = [
  './admin.html',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css'
];

self.addEventListener('install', event => {
  self.skipWaiting(); // Fuerza al nuevo SW a instalarse de inmediato
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('activate', event => {
  // Cuando se activa el nuevo SW, borramos las cachés viejas para limpiar la basura
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Estrategia PASIVA: Todas las peticiones van a internet SIEMPRE.
// Solo si estamos 100% offline, intenta sacar el index de la caché.
self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request).catch(() => {
        // Solo respondemos con caché si falla el internet por completo
        return caches.match(event.request);
    })
  );
});
