// Service Worker para Push Notifications

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

self.addEventListener('install', function(event) {
  console.log('[SW] Instalado');
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  console.log('[SW] Ativado');
  event.waitUntil(clients.claim());
});
