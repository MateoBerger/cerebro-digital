import React, { useState } from 'react'
import { useChat } from '../hooks/useChat'
import ChatUI from './ChatUI'

function FloatingQuickActions({ chat }) {
  const [hov, setHov] = useState(false)
  const disabled = chat.loading
  return (
    <div style={{ display: 'flex', gap: '5px' }}>
      <button
        onClick={() => !disabled && chat.sendQuick(chat.buildPriorizarPrompt(), '¿Qué hago primero?')}
        disabled={disabled}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        style={{
          display: 'flex', alignItems: 'center', gap: '5px',
          padding: '4px 11px', borderRadius: '20px',
          border: `1px solid ${hov && !disabled ? 'var(--accent)' : 'var(--accent-border)'}`,
          background: hov && !disabled ? 'var(--accent)' : 'var(--accent-dim)',
          color: hov && !disabled ? '#1a1608' : 'var(--accent)',
          fontSize: '11px', fontWeight: 600,
          cursor: disabled ? 'not-allowed' : 'pointer',
          fontFamily: 'Inter, sans-serif',
          opacity: disabled ? .5 : 1,
          transition: 'all .15s', outline: 'none',
        }}
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
        ¿Qué hago primero?
      </button>
    </div>
  )
}

export default function FloatingChat({ uid }) {
  const [open, setOpen] = useState(false)
  const chat = useChat(uid)

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        title={open ? 'Cerrar asistente' : 'Abrir asistente'}
        style={{
          position: 'fixed', bottom: '24px', right: '24px', zIndex: 200,
          width: '52px', height: '52px', borderRadius: '50%',
          background: 'var(--accent)', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(224,189,107,.45)',
          transition: 'transform .15s, box-shadow .15s',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.transform  = 'scale(1.07)'
          e.currentTarget.style.boxShadow  = '0 6px 28px rgba(224,189,107,.6)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform  = 'scale(1)'
          e.currentTarget.style.boxShadow  = '0 4px 20px rgba(224,189,107,.45)'
        }}
      >
        {open ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
            stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6"  x2="6"  y2="18" />
            <line x1="6"  y1="6"  x2="18" y2="18" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
            stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </svg>
        )}
      </button>

      {/* Backdrop (closes panel on outside click) */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 190 }}
        />
      )}

      {/* Chat panel */}
      {open && (
        <div style={{
          position: 'fixed', bottom: '88px', right: '24px', zIndex: 195,
          width: '360px', height: '480px',
          borderRadius: '16px', overflow: 'hidden',
          background: 'var(--bg1)', border: '1px solid var(--border)',
          boxShadow: 'var(--shadow)',
          display: 'flex', flexDirection: 'column',
          animation: 'slideUp .18s ease',
        }}>
          {/* Header */}
          <div style={{
            padding: '12px 14px 11px',
            borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '28px', height: '28px', borderRadius: '8px',
                background: 'var(--accent-dim)', border: '1px solid var(--accent-border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)',
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                </svg>
              </div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text0)' }}>Asistente SMGV</div>
                <div style={{ fontSize: '10px', color: 'var(--text2)', marginTop: '1px' }}>Datos en tiempo real</div>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              style={{
                width: '26px', height: '26px', borderRadius: '6px', border: 'none',
                background: 'var(--bg3)', cursor: 'pointer', color: 'var(--text1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6"  x2="6"  y2="18" />
                <line x1="6"  y1="6"  x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Chat */}
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <ChatUI {...chat} compact extraToolbar={<FloatingQuickActions chat={chat} />} />
          </div>
        </div>
      )}
    </>
  )
}
