// Firebase Messaging — background push notification handler
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey:            'AIzaSyDstUwfbD0jlhrt5S0KyoHA0n7F8tIeaE0',
  projectId:         'spkm-syafielegacy',
  messagingSenderId: '812576273769',
  appId:             '1:812576273769:web:ded036c7553d4b8e1bb9f8'
});

var _messaging = firebase.messaging();

_messaging.onBackgroundMessage(function(payload) {
  var notif = payload.notification || {};
  self.registration.showNotification(notif.title || 'SPKM', {
    body:               notif.body || '',
    icon:               'https://i.ibb.co/93rXrkZq/LOGO-SL.png',
    badge:              'https://i.ibb.co/93rXrkZq/LOGO-SL.png',
    data:               payload.data || {},
    tag:                'spkm-notif',
    requireInteraction: false
  });
});

// ============================================================
// Cache logic (kekalkan asal, bump version untuk SW baru)
// ============================================================
const CACHE = 'spkm-v9';

self.addEventListener('install', function(e) {
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
  if (new URL(e.request.url).origin !== self.location.origin) return;

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
