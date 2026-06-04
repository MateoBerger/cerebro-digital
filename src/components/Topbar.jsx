import React, { useState, useEffect } from 'react'
import { signOut } from 'firebase/auth'
import { auth } from '../firebase/config'

const s = {
  bar: {
    height: '40px',
    background: 'var(--bg1)',
    borderBottom: '1px solid var(--border)',
    display: 'flex',
    alignItems: 'center',
    padding: '0 16px',
    flexShrink: 0,
    gap: '0',
    position: 'relative',
    zIndex: 10,
  },
  brand: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: '12px',
    fontWeight: '500',
    color: 'var(--text0)',
    letterSpacing: '.3px',
    marginRight: '24px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexShrink: 0,
  },
  pulse: {
    width: '6px', height: '6px',
    borderRadius: '50%',
    background: 'var(--blue)',
    boxShadow: '0 0 6px var(--blue)',
    animation: 'blink 2.4s ease-in-out infinite',
    flexShrink: 0,
  },
  tabs: {
    display: 'flex',
    height: '40px',
  },
  right: {
    marginLeft: 'auto',
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: '10px',
    color: 'var(--text2)',
  },
  badge: {
    border: '1px solid rgba(61,186,111,.3)',
    background: 'rgba(61,186,111,.08)',
    color: 'var(--green)',
    padding: '1px 7px',
    borderRadius: '2px',
    fontSize: '10px',
  },
  signout: {
    background: 'none',
    border: '1px solid var(--border)',
    color: 'var(--text2)',
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: '10px',
    padding: '2px 8px',
    borderRadius: '2px',
    cursor: 'pointer',
    transition: 'color .12s, border-color .12s',
  },
}

function Tab({ label, active, onClick }) {
  const ts = {
    height: '40px',
    padding: '0 18px',
    display: 'flex',
    alignItems: 'center',
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: '11px',
    color: active ? 'var(--blue)' : 'var(--text2)',
    cursor: 'pointer',
    borderBottom: active ? '2px solid var(--blue)' : '2px solid transparent',
    transition: 'color .12s, border-color .12s',
    userSelect: 'none',
    whiteSpace: 'nowrap',
  }
  return <div style={ts} onClick={onClick}>{label}</div>
}

export default function Topbar({ activeTab, onTabChange, info }) {
  const [clock, setClock] = useState('')

  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [])

  return (
    <div style={s.bar}>
      <style>{`@keyframes blink{0%,100%{opacity:1;box-shadow:0 0 6px var(--blue)}50%{opacity:.35;box-shadow:0 0 3px var(--blue)}}`}</style>
      <div style={s.brand}>
        <div style={s.pulse} />
        cerebro.digital
      </div>
      <div style={s.tabs}>
        <Tab label="mapa_sistema"          active={activeTab === 'diagram'} onClick={() => onTabChange('diagram')} />
        <Tab label="diccionario_variables" active={activeTab === 'dict'}    onClick={() => onTabChange('dict')} />
      </div>
      <div style={s.right}>
        {info && <span>{info}</span>}
        <span className="badge" style={s.badge}>ACTIVO</span>
        <span>{clock}</span>
        <button
          style={s.signout}
          onClick={() => signOut(auth)}
          onMouseEnter={e => { e.target.style.color = 'var(--text0)'; e.target.style.borderColor = 'var(--border-hi)' }}
          onMouseLeave={e => { e.target.style.color = 'var(--text2)'; e.target.style.borderColor = 'var(--border)' }}
        >
          salir
        </button>
      </div>
    </div>
  )
}
