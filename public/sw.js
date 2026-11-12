// Gainmark's offline support. The page itself is fetched fresh when there's a connection (so
// updates show up), and everything is saved so the app also opens without one. Script and asset
// files have unique names per version, so those can always be served from the saved copy.
const CACHE = 'gainmark';
const BASE = '/Gainmark/';
const PAGE = BASE + 'index.html';

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll([BASE, PAGE])));
});

self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  // The page: the newest from the internet, or the saved one when offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(PAGE, copy));
          return res;
        })
        .catch(() => caches.match(PAGE)),
    );
    return;
  }

  // Everything else: the saved copy, else download it and save it.
  event.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        }),
    ),
  );
});
