import React, { useEffect, useState } from 'react'
import { notificationsSupported, registerAndGetToken } from '../firebase/messaging'

const ASKED_KEY = 'cd-notif-asked'

export default function NotifPrompt({ uid }) {
  const [visible, setVisible] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone]       = useState(null) // 'ok' | 'denied' | 'error'

  useEffect(() => {
    if (!uid || !notificationsSupported()) return
    if (Notification.permission !== 'default') return
    if (localStorage.getItem(ASKED_KEY)) return
    const t = setTimeout(() => setVisible(true), 2500)
    return () => clearTimeout(t)
  }, [uid])

  async function handleActivar() {
    setLoading(true)
    const r = await registerAndGetToken(uid)
    setLoading(false)
    localStorage.setItem(ASKED_KEY, '1')
    setDone(r.status === 'granted' ? 'ok' : r.status === 'denied' ? 'denied' : 'error')
    setTimeout(() => setVisible(false), 2500)
  }

  function handleDismiss() {
    localStorage.setItem(ASKED_KEY, '1')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div style={{
      position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
      background: 'var(--bg1)', border: '1px solid var(--border)',
      borderRadius: '14px', padding: '14px 16px',
      display: 'flex', alignItems: 'center', gap: '12px',
      zIndex: 9999, boxShadow: '0 8px 32px rgba(0,0,0,.45)',
      maxWidth: '340px', width: 'calc(100vw - 40px)',
    }}>
      <span style={{ fontSize: '22px', flexShrink: 0 }}>🔔</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        {done === 'ok'
          ? <p style={{ fontSize: '13px', color: 'var(--green)', fontWeight: 600 }}>¡Notificaciones activadas!</p>
          : done
            ? <p style={{ fontSize: '13px', color: 'var(--text2)' }}>No se activaron ({done})</p>
            : <>
                <p style={{ fontSize: '13px', color: 'var(--text0)', fontWeight: 600 }}>Activar notificaciones</p>
                <p style={{ fontSize: '11px', color: 'var(--text2)' }}>Recordatorios de estudio y PAES</p>
              </>
        }
      </div>
      {!done && (
        <>
          <button
            onClick={handleActivar}
            disabled={loading}
            style={{
              padding: '7px 14px', borderRadius: '8px', border: 'none',
              background: 'var(--accent)', color: '#fff', fontSize: '12px',
              fontWeight: 700, cursor: loading ? 'default' : 'pointer', flexShrink: 0,
            }}
          >
            {loading ? '...' : 'Activar'}
          </button>
          <button
            onClick={handleDismiss}
            style={{
              padding: '6px 8px', borderRadius: '8px', border: '1px solid var(--border)',
              background: 'none', color: 'var(--text2)', fontSize: '12px',
              cursor: 'pointer', flexShrink: 0,
            }}
          >✕</button>
        </>
      )}
    </div>
  )
}
