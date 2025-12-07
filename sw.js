const CACHE_NAME = 'image-style-transfer-v2';
const urlsToCache = [
  '/paytk/',
  '/paytk/index.html',
  '/paytk/index.css',
  '/paytk/index.js',
  '/paytk/icon.svg',
  '/paytk/manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});