const CACHE_NAME = 'een-sistema-v2'; // Cambia la versión para forzar la actualización
const urlsToCache = [
  './',
  // Archivos del Admin
  './admin.html',
  './manifest-admin.json',
  // Archivos del Chofer
  './chofer.html',
  './manifest-chofer.json',
  // Bibliotecas compartidas (Tailwind, FontAwesome, etc.)
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

// Estrategia: Network First (Intenta buscar en internet, si falla, saca de caché)
self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
