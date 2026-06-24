const publicKey = import.meta.env.VITE_WEB_PUSH_PUBLIC_KEY as string | undefined

function base64UrlToUint8Array(value: string) {
  const padding = '='.repeat((4 - (value.length % 4)) % 4)
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(base64)
  return Uint8Array.from([...raw].map((char) => char.charCodeAt(0)))
}

export function pushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

export function pushConfigured() {
  return !!publicKey
}

export async function getPushSubscription() {
  const registration = await navigator.serviceWorker.ready
  return registration.pushManager.getSubscription()
}

export async function subscribeToPush() {
  if (!publicKey) throw new Error('VITE_WEB_PUSH_PUBLIC_KEY is not configured')
  if (!pushSupported()) throw new Error('Push notifications are not supported in this browser')

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('Notification permission was not granted')

  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: base64UrlToUint8Array(publicKey),
  })

  const res = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(subscription),
  })
  if (!res.ok) throw new Error(await res.text())
  return subscription
}

export async function unsubscribeFromPush() {
  const subscription = await getPushSubscription()
  if (!subscription) return
  await fetch('/api/push/unsubscribe', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ endpoint: subscription.endpoint }),
  })
  await subscription.unsubscribe()
}
