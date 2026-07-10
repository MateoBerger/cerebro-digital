import React from 'react'

// Estado vacío ilustrado: logo del cerebro tenue + mensaje.
// size 'sm' para usar dentro de cards angostas, 'md' para espacios más grandes.
export default function EmptyState({ text, hint, size = 'md' }) {
  const logoSize = size === 'sm' ? 34 : 52
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: size === 'sm' ? '14px 0 6px' : '26px 0 10px', textAlign: 'center', gap: '8px',
    }}>
      <img
        src="/cerebro-logo.png"
        alt=""
        aria-hidden="true"
        style={{ width: logoSize, height: logoSize, objectFit: 'contain', opacity: .28 }}
      />
      <p style={{ color: 'var(--text1)', fontSize: size === 'sm' ? '12px' : '13px' }}>{text}</p>
      {hint && <p style={{ color: 'var(--text2)', fontSize: '11px' }}>{hint}</p>}
    </div>
  )
}
