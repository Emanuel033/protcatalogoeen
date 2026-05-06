// BUMP DE VERSIÓN: Cambiamos a v3 para forzar la actualización
const CACHE_NAME = 'een-sistema-react-v3'; 

const urlsToCache = [
  '/',
  '/rutas',
  '/chofer',
  '/inventario', 
  '/catalogo_completo.json', 
  '/manifest-inventario.json', // <-- Agregamos el manifest
  '/icons/icono-inventario-192.png', // <-- Agregamos los íconos
  '/icons/icono-inventario-512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css'
  
];

self.addEventListener('install', event => {
  self.skipWaiting(); 
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('activate', event => {
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

// Estrategia PASIVA: Intenta ir a internet, si falla (offline), saca de caché
self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request).catch(() => {
        return caches.match(event.request);
    })
  );
});
