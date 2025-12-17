// Service Worker para PWA e Push Notifications
const CACHE_NAME = 'fastpay-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/icon-192.png',
  '/icon-512.png',
  '/manifest.json'
];

// Cache de assets estáticos na instalação
self.addEventListener('install', function(event) {
  console.log('[SW] Instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Cacheando assets estáticos');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Limpar caches antigos na ativação
self.addEventListener('activate', function(event) {
  console.log('[SW] Ativando...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Removendo cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => clients.claim())
  );
});

// Estratégia Network First com fallback para cache
self.addEventListener('fetch', function(event) {
  // Ignorar requisições de API e websocket
  if (event.request.url.includes('/api/') || 
      event.request.url.includes('ws://') ||
      event.request.url.includes('wss://')) {
    return;
  }
  
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Cachear resposta válida
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Fallback para cache se offline
        return caches.match(event.request);
      })
  );
});

// Push Notifications
self.addEventListener('push', function(event) {
  console.log('[SW] Push recebido:', event);
  
  let data = { title: 'Nova Notificação', body: 'Você tem uma nova notificação' };
  
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }
  
  const options = {
    body: data.body,
    icon: data.icon || '/logo192.png',
    badge: data.badge || '/logo192.png',
    vibrate: [200, 100, 200],
    data: data.data || {},
    actions: [
      { action: 'open', title: 'Abrir' },
      { action: 'close', title: 'Fechar' }
    ],
    requireInteraction: true
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  console.log('[SW] Notificação clicada:', event);
  
  event.notification.close();
  
  if (event.action === 'close') {
    return;
  }
  
  // Abre o app ou foca na janela existente
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(function(clientList) {
        // Se já tem uma janela aberta, foca nela
        for (let client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            // Navega para a página de transferências se for notificação de transferência
            if (event.notification.data?.type === 'transfer_received') {
              client.navigate('/transfers');
            }
            return client.focus();
          }
        }
        // Se não tem janela aberta, abre uma nova
        if (clients.openWindow) {
          const url = event.notification.data?.type === 'transfer_received' 
            ? '/transfers' 
            : '/';
          return clients.openWindow(url);
        }
      })
  );
});

// Service Worker ready
