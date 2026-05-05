// BUMP DE VERSIÓN: Cambiamos a v2 para que el navegador actualice el caché
const CACHE_NAME = 'een-sistema-react-v2'; 

const urlsToCache = [
  '/',
  '/rutas',
  '/inventario', // <-- Asegúrate de poner la ruta exacta que usas para el inventario
  '/catalogo_completo.json', // <-- LA MAGIA: El catálogo guardado en el teléfono
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
