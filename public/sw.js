// Service Worker Oficial — Checador Vía Gourmet (Push & Offline Cache)

const CACHE_NAME = 'via-gourmet-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Manejo de Notificaciones Push cuando la app/pantalla está cerrada
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const title = data.title || 'Vía Gourmet 🔔';
    const options = {
      body: data.body || 'Nueva notificación de asistencia',
      icon: data.icon || '/logo.png',
      badge: data.badge || '/icons/icon-192x192.png',
      data: { url: data.url || '/' },
      vibrate: [200, 100, 200, 100, 200],
      tag: 'via-gourmet-push-' + Date.now(),
      renotify: true,
      requireInteraction: false,
    };

    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  } catch (err) {
    console.error('Error procesando payload de Push:', err);
  }
});

// Al tocar la notificación emergente en el celular / PC
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
