import React, { useEffect, useState } from 'react'

function chileNow() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Santiago' }))
}

function formatEnMinutos(ms) {
  const totalMin = Math.max(1, Math.round(ms / 60000))
  if (totalMin < 60) return `En ${totalMin} min`
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return `En ${h}h${m > 0 ? ` ${m}min` : ''}`
}

function ClockIcon({ color }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

// Barra compacta siempre visible con el evento en curso o el próximo,
// tomando los eventos de Google Calendar del día. Se refresca cada minuto.
export default function NextEventWidget({ gcalToken, eventosHoy }) {
  const [, forceTick] = useState(0)

  useEffect(() => {
    const iv = setInterval(() => forceTick(t => t + 1), 60000)
    return () => clearInterval(iv)
  }, [])

  const baseStyle = {
    display: 'flex', alignItems: 'center', gap: '10px',
    padding: '10px 16px',
  }

  if (!gcalToken) {
    return (
      <div className="card" style={baseStyle}>
        <ClockIcon color="var(--text2)" />
        <span style={{ fontSize: '12px', color: 'var(--text2)' }}>
          Conectá Google Calendar para ver tu próximo evento.
        </span>
      </div>
    )
  }

  if (eventosHoy === null) {
    return (
      <div className="card" style={baseStyle}>
        <ClockIcon color="var(--text2)" />
        <span style={{ fontSize: '12px', color: 'var(--text2)' }}>Cargando eventos...</span>
      </div>
    )
  }

  const now     = chileNow()
  const current = eventosHoy.find(e => new Date(e.start) <= now && now < new Date(e.end))
  const next    = !current ? eventosHoy.find(e => new Date(e.start) > now) : null

  let label, sub, color
  if (current) {
    label = `Ahora: ${current.titulo}`
    sub   = `hasta ${current.horaFin}`
    color = 'var(--green)'
  } else if (next) {
    label = `${formatEnMinutos(new Date(next.start) - now)}: ${next.titulo}`
    sub   = next.horaInicio
    color = 'var(--accent)'
  } else {
    label = 'Sin eventos próximos'
    sub   = null
    color = 'var(--text2)'
  }

  return (
    <div className="card" style={{ ...baseStyle, borderLeft: `3px solid ${color}` }}>
      <span style={{
        width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0,
        background: color, boxShadow: `0 0 8px ${color}`,
        animation: current ? 'dotPulse 1.6s ease-in-out infinite' : 'none',
      }} />
      <ClockIcon color={color} />
      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text0)', flex: 1 }}>{label}</span>
      {sub && <span style={{ fontSize: '11px', color: 'var(--text2)', flexShrink: 0 }}>{sub}</span>}
    </div>
  )
}
