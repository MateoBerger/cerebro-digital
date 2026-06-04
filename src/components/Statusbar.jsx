import React from 'react'

const s = {
  bar: {
    height: '22px',
    background: 'var(--bg1)',
    borderTop: '1px solid var(--border)',
    display: 'flex',
    alignItems: 'center',
    padding: '0 14px',
    gap: '14px',
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: '10px',
    color: 'var(--text2)',
    flexShrink: 0,
  },
  dot: { color: 'var(--green)' },
  sep: { color: 'var(--border-hi)' },
}

export default function Statusbar({ status, info, user }) {
  return (
    <div style={s.bar}>
      <span style={{ color: status === 'ok' ? 'var(--green)' : status === 'error' ? 'var(--red)' : 'var(--amber)' }}>
        {status === 'ok' ? 'listo' : status === 'error' ? 'error' : 'cargando...'}
      </span>
      <span style={s.sep}>|</span>
      <span>{info || '—'}</span>
      <span style={s.sep}>|</span>
      <span>cerebro.digital v1.0</span>
      {user && (
        <>
          <span style={s.sep}>|</span>
          <span style={{ marginLeft: 'auto' }}>{user}</span>
        </>
      )}
    </div>
  )
}
