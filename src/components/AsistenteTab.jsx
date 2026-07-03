import React from 'react'
import { useChat } from '../hooks/useChat'
import ChatUI from './ChatUI'
import AssistantAvatar from './AssistantAvatar'

function QuickActions({ chat }) {
  const [hov, setHov] = React.useState(false)
  const disabled = chat.loading

  return (
    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
      <button
        onClick={() => !disabled && chat.sendQuick(chat.buildPriorizarPrompt(), '¿Qué hago primero?')}
        disabled={disabled}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '5px 14px', borderRadius: '20px',
          border: `1px solid ${hov && !disabled ? 'var(--accent)' : 'var(--accent-border)'}`,
          background: hov && !disabled ? 'var(--accent)' : 'var(--accent-dim)',
          color: hov && !disabled ? '#1a1608' : 'var(--accent)',
          fontSize: '12px', fontWeight: 600,
          cursor: disabled ? 'not-allowed' : 'pointer',
          fontFamily: 'Inter, sans-serif',
          opacity: disabled ? .5 : 1,
          transition: 'all .15s',
          outline: 'none',
        }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
        ¿Qué hago primero?
      </button>
    </div>
  )
}

export default function AsistenteTab({ uid }) {
  const chat = useChat(uid)

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header con avatar pulsante */}
      <div style={{
        padding: '14px 28px',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
        display: 'flex', alignItems: 'center', gap: '14px',
        background: 'var(--bg1)',
      }}>
        <AssistantAvatar pulsing={chat.loading} size={40} />
        <div>
          <h1 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text0)', letterSpacing: '-.01em' }}>
            Asistente
          </h1>
          <p style={{ fontSize: '11px', color: 'var(--text2)', marginTop: '2px' }}>
            Acceso completo a tareas, calendario y progreso PAES · Datos en tiempo real
          </p>
        </div>
        {chat.loading && (
          <span style={{
            marginLeft: 'auto', fontSize: '10px', color: 'var(--accent)',
            fontWeight: 600, letterSpacing: '.8px', textTransform: 'uppercase',
            animation: 'fadeIn .2s ease',
          }}>
            Pensando…
          </span>
        )}
      </div>

      <div style={{ flex: 1, overflow: 'hidden' }}>
        <ChatUI {...chat} extraToolbar={<QuickActions chat={chat} />} />
      </div>
    </div>
  )
}
