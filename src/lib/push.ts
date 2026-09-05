// Utility for Web Push Subscriptions and Service Worker Registration

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }
  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    return reg;
  } catch (err) {
    console.error('Error registrando Service Worker:', err);
    return null;
  }
}

export async function subscribeUserToPush(silent: boolean = false): Promise<boolean> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    if (!silent) console.warn('Tu navegador o dispositivo no soporta notificaciones Push en segundo plano.');
    return false;
  }

  try {
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') {
      if (!silent) console.warn('Permiso de notificaciones no concedido.');
      return false;
    }

    const reg = await registerServiceWorker();
    if (!reg) throw new Error('No se pudo obtener el registro del Service Worker.');

    // 3. Pedir la public key del VAPID
    const resKey = await fetch('/api/proxy/push/public-key');
    if (!resKey.ok) {
      console.warn('No se pudo obtener VAPID public key');
      return false;
    }
    const { publicKey } = await resKey.json();

    const convertedKey = urlBase64ToUint8Array(publicKey);
    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: convertedKey as unknown as BufferSource,
    });

    // 3. Enviar subscripción al backend (el proxy maneja el token)
    const resSub = await fetch('/api/proxy/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subscription),
    });

    if (!resSub.ok) throw new Error('Falló el registro de suscripción Push en el servidor.');

    return true;
  } catch (err) {
    console.error('Error suscribiendo a notificaciones Push:', err);
    return false;
  }
}

export async function sendTestPushNotification(): Promise<boolean> {
  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE}/api/push/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: token ? `Bearer ${token}` : '',
      },
    });
    return res.ok;
  } catch {
    return false;
  }
}
