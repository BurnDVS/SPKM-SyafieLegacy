const CACHE    = 'spkm-v4';
const GAS_ORIGIN = 'https://script.google.com';
const GAS_CDN    = 'https://script.googleusercontent.com';

self.addEventListener('install', function(e) {
  // Jangan pre-cache shell — elak SW stuck dengan versi lama
  e.waitUntil(self.skipWaiting());
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

  // GAS & CDN — jangan intercept langsung, biar browser handle terus
  if (url.origin === GAS_ORIGIN || url.origin === GAS_CDN) return;

  // Google Fonts — cache
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(
      caches.match(e.request).then(function(cached) {
        if (cached) return cached;
        return fetch(e.request).then(function(resp) {
          var clone = resp.clone();
          caches.open(CACHE).then(function(c) { c.put(e.request, clone); });
          return resp;
        });
      })
    );
    return;
  }

  // Shell & assets — network first, cache fallback
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
