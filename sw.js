// ── sw.js — service worker ────────────────────────────────────
const CACHE  = 'shark-quote-v1';
const ASSETS = [ '/', '/index.html', '/app.html', '/css/app.css', '/js/config.js', '/js/db.js', '/js/map.js', '/js/pdf.js', '/js/app.js', '/manifest.json', '/icons/logo.png' ];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE.map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => { if (e.request.url.includes('supabase.co')) { e.respondWith(fetch(e.request).catch(() => new Response('', {status: 503}))); return; } e.respondWith(caches.match(e.request).then(cached => { if (cached) return cached; return fetch(e.request).then(r => { const cl = r.clone(); caches.open(CACHE).then(c => c.put(e.request, cl)); return r; }); })); });
