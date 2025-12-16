import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Converte a chave VAPID de base64 para Uint8Array
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Verifica se push notifications são suportadas
export function isPushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

// Verifica o status da permissão
export function getNotificationPermission() {
  if (!isPushSupported()) return 'unsupported';
  return Notification.permission;
}

// Solicita permissão e registra o service worker
export async function requestPushPermission() {
  if (!isPushSupported()) {
    throw new Error('Push notifications não são suportadas neste navegador');
  }
  
  const permission = await Notification.requestPermission();
  
  if (permission !== 'granted') {
    throw new Error('Permissão de notificação negada');
  }
  
  return permission;
}

// Registra o service worker e faz a subscription
export async function subscribeToPush() {
  if (!isPushSupported()) {
    throw new Error('Push notifications não são suportadas');
  }
  
  // Solicita permissão primeiro
  await requestPushPermission();
  
  // Registra o service worker
  const registration = await navigator.serviceWorker.register('/sw.js');
  console.log('Service Worker registrado:', registration);
  
  // Aguarda o SW estar ativo
  await navigator.serviceWorker.ready;
  
  // Busca a chave pública VAPID do backend
  const { data } = await axios.get(`${API}/push/vapid-key`);
  const vapidPublicKey = data.publicKey;
  
  if (!vapidPublicKey) {
    throw new Error('Chave VAPID não configurada no servidor');
  }
  
  // Cria a subscription
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
  });
  
  console.log('Push subscription criada:', subscription);
  
  // Envia a subscription para o backend
  const subJson = subscription.toJSON();
  await axios.post(`${API}/push/subscribe`, {
    endpoint: subJson.endpoint,
    keys: subJson.keys
  });
  
  console.log('Subscription registrada no servidor');
  return true;
}

// Cancela a subscription
export async function unsubscribeFromPush() {
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  
  if (subscription) {
    const endpoint = subscription.endpoint;
    
    // Cancela no navegador
    await subscription.unsubscribe();
    
    // Remove do servidor
    await axios.delete(`${API}/push/unsubscribe?endpoint=${encodeURIComponent(endpoint)}`);
    
    console.log('Unsubscribed from push');
  }
  
  return true;
}

// Verifica se já está inscrito
export async function isSubscribedToPush() {
  if (!isPushSupported()) return false;
  
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return !!subscription;
  } catch {
    return false;
  }
}
