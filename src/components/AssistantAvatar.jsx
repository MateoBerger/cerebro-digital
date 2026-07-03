import React from 'react'

export default function AssistantAvatar({ pulsing = false, size = 28 }) {
  const inner = Math.round(size * 0.66)
  return (
    <div
      className={`avatar-ai${pulsing ? ' avatar-ai--pulse' : ''}`}
      style={{
        width: size, height: size, borderRadius: '50%',
        background: 'var(--bg3)',
        border: '1.5px solid var(--accent-border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden', flexShrink: 0,
      }}
    >
      <img
        src="/logo.png"
        alt=""
        aria-hidden="true"
        style={{ width: inner, height: inner, objectFit: 'contain', opacity: .88 }}
      />
    </div>
  )
}
