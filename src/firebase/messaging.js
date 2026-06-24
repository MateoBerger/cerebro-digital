import { getMessaging, getToken, onMessage } from 'firebase/messaging'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from './config'

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY

export function notificationsSupported() {
  return (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window
  )
}

// Llamar SIEMPRE desde un handler de clic (iOS exige user gesture).
// requestPermission() debe ser la primera await en la cadena de llamadas.
export async function registerAndGetToken(uid) {
  if (!notificationsSupported()) return { status: 'unsupported' }
  if (Notification.permission === 'denied') return { status: 'denied' }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return { status: permission }

  try {
    const reg = await navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/' })
    await navigator.serviceWorker.ready

    const token = await getToken(getMessaging(), {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: reg,
    })

    if (!token) return { status: 'no_token' }

    if (uid) {
      const tokenId = token.slice(-40)
      await setDoc(doc(db, 'users', uid, 'tokens', tokenId), {
        token,
        platform: /iphone|ipad|ipod/i.test(navigator.userAgent) ? 'ios' : 'web',
        updatedAt: serverTimestamp(),
      })
    }

    return { status: 'granted', token }
  } catch (err) {
    console.error('[FCM]', err.message)
    return { status: 'error', error: err.message }
  }
}

export function onForegroundMessage(callback) {
  if (!notificationsSupported()) return () => {}
  try {
    return onMessage(getMessaging(), callback)
  } catch {
    return () => {}
  }
}
