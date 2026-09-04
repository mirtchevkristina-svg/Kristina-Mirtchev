/* Service Worker.
   Kapitel 6: Die aktuelle Lektion und die Tagesfragen müssen offline verfügbar sein -
   Juridicum-Keller, U-Bahn, Datenlimit am Monatsende.

   Strategie:
     - App-Shell (HTML, CSS, JS, Icons): cache first, im Hintergrund erneuern
     - GET-API-Antworten: network first mit Rückfall auf den Cache
     - Alles andere (POST): niemals cachen
*/
const SHELL = 'subsumo-shell-v1';
const DATEN = 'subsumo-daten-v1';
const SHELL_DATEIEN = ['/', '/index.html', '/styles.css', '/app.js',
                       '/manifest.webmanifest', '/icons/icon.svg'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(SHELL_DATEIEN)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) =>
    Promise.all(ks.filter((k) => k !== SHELL && k !== DATEN).map((k) => caches.delete(k)))
  ).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;

  if (url.pathname.startsWith('/api/')) {
    e.respondWith(
      fetch(e.request).then((r) => {
        const kopie = r.clone();
        caches.open(DATEN).then((c) => c.put(e.request, kopie));
        return r;
      }).catch(() => caches.match(e.request).then((c) =>
        c || new Response(JSON.stringify({ error: 'offline' }),
          { status: 503, headers: { 'content-type': 'application/json' } })))
    );
    return;
  }

  e.respondWith(caches.match(e.request).then((treffer) => {
    const netz = fetch(e.request).then((r) => {
      if (r.ok) caches.open(SHELL).then((c) => c.put(e.request, r.clone()));
      return r;
    }).catch(() => treffer);
    return treffer || netz;
  }));
});
