// Cache-first dla całej apki — po pierwszym wejściu działa bez sieci.
const CACHE = 'kosci-v53';
const PLIKI = [
  './',
  'index.html',
  'styles.css',
  'js/app.js',
  'js/scoring.js',
  'js/state.js',
  'manifest.webmanifest',
  'icons/icon.svg',
  'icons/icon-180.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PLIKI)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((klucze) => Promise.all(klucze.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then((trafienie) => trafienie || fetch(e.request).then((odp) => {
      const kopia = odp.clone();
      caches.open(CACHE).then((c) => c.put(e.request, kopia)).catch(() => {});
      return odp;
    }).catch(() => caches.match('index.html'))),
  );
});
