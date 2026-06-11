import React from 'react'
import { useChat } from '../hooks/useChat'
import ChatUI from './ChatUI'

export default function AsistenteTab({ uid }) {
  const chat = useChat(uid)

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        padding: '20px 28px 16px',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        <h1 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text0)', letterSpacing: '-.01em' }}>
          Asistente
        </h1>
        <p style={{ fontSize: '12px', color: 'var(--text2)', marginTop: '2px' }}>
          Acceso completo a tareas, calendario y progreso PAES · Lee y modifica datos en tiempo real
        </p>
      </div>

      <div style={{ flex: 1, overflow: 'hidden' }}>
        <ChatUI {...chat} />
      </div>
    </div>
  )
}
