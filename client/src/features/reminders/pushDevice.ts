// This device's push subscription, through the service worker of the installed app

export type PushSupport =
  | 'supported'
  | 'ios-needs-install' // iPhone/iPad: only an app added to the Home screen can get push
  | 'no-service-worker' // development server, or a very old browser
  | 'unsupported';

export function pushSupport(): PushSupport {
  const isIos = /iPhone|iPad|iPod/.test(navigator.userAgent);
  const installed = window.matchMedia?.('(display-mode: standalone)').matches;
  if (!('serviceWorker' in navigator)) return 'unsupported';
  if (!('PushManager' in window)) return isIos && !installed ? 'ios-needs-install' : 'unsupported';
  return 'supported';
}

async function registration() {
  const existing = await navigator.serviceWorker.getRegistration();
  return existing ? navigator.serviceWorker.ready : null;
}

export async function currentSubscription(): Promise<PushSubscription | null> {
  const reg = await registration();
  return reg ? reg.pushManager.getSubscription() : null;
}

// The server's public key arrives as base64url; the browser wants raw bytes
function keyBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const base64 = (base64url + '='.repeat((4 - (base64url.length % 4)) % 4))
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const raw = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

// Asks permission (once) and subscribes this device. Returns null if refused.
export async function subscribeDevice(publicKey: string): Promise<PushSubscription | null> {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return null;
  const reg = await registration();
  if (!reg) return null;
  return (
    (await reg.pushManager.getSubscription()) ??
    reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) })
  );
}
