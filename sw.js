const CACHE = 'spkm-v3';
const SHELL = ['./', './manifest.json'];
const GAS_ORIGIN = 'https://script.google.com';
const GAS_CDN    = 'https://script.googleusercontent.com';

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE)
      .then(function(c) { return c.addAll(SHELL); })
      .then(function() { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE; })
            .map(function(k) { return caches.delete(k); })
      );
    })
    .then(function() { return self.clients.claim(); })
    .then(function() {
      // Beritahu semua tab untuk reload supaya dapatkan kod terbaru
      return self.clients.matchAll({ type: 'window' }).then(function(clients) {
        clients.forEach(function(client) {
          client.postMessage({ type: 'SW_UPDATED' });
        });
      });
    })
  );
});

self.addEventListener('fetch', function(e) {
  var url = new URL(e.request.url);

  // GAS API calls (JSONP script tags & fetch) — network only, never cache
  if (url.origin === GAS_ORIGIN || url.origin === GAS_CDN) {
    e.respondWith(fetch(e.request));
    return;
  }

  // Google Fonts — network first, fall back to cache
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(
      fetch(e.request).then(function(resp) {
        var clone = resp.clone();
        caches.open(CACHE).then(function(c) { c.put(e.request, clone); });
        return resp;
      }).catch(function() { return caches.match(e.request); })
    );
    return;
  }

  // Shell (HTML, manifest) — network first supaya sentiasa dapat versi terkini
  e.respondWith(
    fetch(e.request).then(function(resp) {
      if (resp.ok) {
        var clone = resp.clone();
        caches.open(CACHE).then(function(c) { c.put(e.request, clone); });
      }
      return resp;
    }).catch(function() {
      return caches.match(e.request)
        .then(function(cached) { return cached || caches.match('./'); });
    })
  );
});
