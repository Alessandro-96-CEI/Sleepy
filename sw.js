// Service worker: rende l'app disponibile offline.
// Quando modifichi un file, aumenta la versione qui sotto: il telefono scaricherà i file nuovi.
const CACHE = "sonno-v5";
const FILES = [
  "./",
  "./index.html",
  "./styles.css",
  "./js/app.js",
  "./manifest.webmanifest",
  "./img/koala-saluta.png",
  "./img/koala-dorme.png",
  "./img/koala-caffe.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png",
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Rete prima, cache come riserva: online vedi sempre l'ultima versione, offline l'app funziona lo stesso.
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res.ok && new URL(e.request.url).origin === location.origin) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request).then(r => r || caches.match("./index.html")))
  );
});
