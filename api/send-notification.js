// POST /api/send-notification
// Envía una push notification a todos los tokens FCM de un usuario.
// Body: { uid, title, body?, data? }
// Requiere FIREBASE_SERVICE_ACCOUNT (JSON string) como variable de entorno en Vercel.

import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getMessaging }                  from 'firebase-admin/messaging'
import { getFirestore }                  from 'firebase-admin/firestore'

function ensureAdmin() {
  if (getApps().length > 0) return
  initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { uid, title, body, data } = req.body || {}
  if (!uid || !title) return res.status(400).json({ error: 'uid y title son requeridos' })

  try {
    ensureAdmin()
    const db  = getFirestore()
    const fcm = getMessaging()

    const snap   = await db.collection('users').doc(uid).collection('tokens').get()
    const tokens = snap.docs.map(d => d.data().token).filter(Boolean)

    if (tokens.length === 0) return res.status(200).json({ sent: 0, info: 'sin tokens registrados' })

    const dataStr = data
      ? Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)]))
      : {}

    const results = await Promise.allSettled(
      tokens.map(token => fcm.send({
        token,
        notification: { title, body: body || '' },
        data:         dataStr,
        webpush: {
          notification: { icon: '/logo.png', badge: '/logo.png' },
          fcmOptions:   { link: '/' },
        },
      }))
    )

    // Limpiar tokens inválidos (el dispositivo los desregistró)
    const staleDocs = results
      .map((r, i) => ({ r, ref: snap.docs[i]?.ref }))
      .filter(({ r }) =>
        r.status === 'rejected' &&
        r.reason?.errorInfo?.code === 'messaging/registration-token-not-registered'
      )

    if (staleDocs.length > 0) {
      const batch = db.batch()
      staleDocs.forEach(({ ref }) => ref && batch.delete(ref))
      await batch.commit()
    }

    return res.status(200).json({
      sent:   results.filter(r => r.status === 'fulfilled').length,
      failed: results.filter(r => r.status === 'rejected').length,
      stale:  staleDocs.length,
    })
  } catch (err) {
    console.error('[send-notification]', err)
    return res.status(500).json({ error: err.message })
  }
}
