import React, { useEffect, useState } from 'react'
import { subscribePomodoroStats, recordPomodoroBlock } from '../firebase/db'
import { playPhaseEndSound } from '../utils/sound'

function chileToday() {
  const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Santiago' }))
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function formatTime(s) {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

const PHASE_META = {
  trabajo:  { label: 'Enfoque',        color: 'var(--accent)' },
  micro:    { label: 'Micro-pausa',    color: 'var(--green)'  },
  descanso: { label: 'Descanso largo', color: 'var(--blue)'   },
}

const RADIUS = 130
const CIRC   = 2 * Math.PI * RADIUS

// Timer de enfoque a pantalla completa. Usa la config de Pomodoro ya
// definida en el Dashboard (bloque / descanso / micro / meta diaria).
export default function FocusMode({ uid, bloque, descanso, micro, metaBloq, onClose }) {
  const bloqueMin   = Math.max(1, bloque   || 25)
  const descansoMin = Math.max(1, descanso || 15)
  const microMin    = Math.max(1, micro    || 5)
  const meta        = Math.max(1, metaBloq || 3)

  const [pomodoroStats, setPomodoroStats] = useState({ date: null, count: 0 })
  const [phase, setPhase]           = useState('trabajo')
  const [totalSec, setTotalSec]     = useState(bloqueMin * 60)
  const [secondsLeft, setSecondsLeft] = useState(bloqueMin * 60)
  const [running, setRunning]       = useState(false)
  const [banner, setBanner]         = useState(null)

  useEffect(() => {
    if (!uid) return
    return subscribePomodoroStats(uid, setPomodoroStats)
  }, [uid])

  // Cuenta regresiva
  useEffect(() => {
    if (!running) return
    const iv = setInterval(() => {
      setSecondsLeft(s => (s > 0 ? s - 1 : 0))
    }, 1000)
    return () => clearInterval(iv)
  }, [running])

  // Fin de fase
  useEffect(() => {
    if (running && secondsLeft === 0) handlePhaseComplete()
  }, [secondsLeft]) // eslint-disable-line react-hooks/exhaustive-deps

  function handlePhaseComplete() {
    setRunning(false)
    playPhaseEndSound()

    if (phase === 'trabajo') {
      const today     = chileToday()
      const prevCount = pomodoroStats?.date === today ? (pomodoroStats.count || 0) : 0
      const newCount  = prevCount + 1
      recordPomodoroBlock(uid, pomodoroStats)

      const isLongBreak = newCount % meta === 0
      const nextMin      = isLongBreak ? descansoMin : microMin
      setBanner(`¡Bloque completado! ${isLongBreak ? 'Descanso largo' : 'Micro-pausa'} de ${nextMin} min.`)
      setPhase(isLongBreak ? 'descanso' : 'micro')
      setTotalSec(nextMin * 60)
      setSecondsLeft(nextMin * 60)
    } else {
      setBanner('¡Descanso terminado! Volvamos al bloque de estudio.')
      setPhase('trabajo')
      setTotalSec(bloqueMin * 60)
      setSecondsLeft(bloqueMin * 60)
    }
    setTimeout(() => setBanner(null), 5000)
  }

  function handleReset() {
    setRunning(false)
    setSecondsLeft(totalSec)
  }

  const blocksToday = pomodoroStats?.date === chileToday() ? (pomodoroStats.count || 0) : 0
  const phaseMeta       = PHASE_META[phase]
  const fraction     = totalSec > 0 ? secondsLeft / totalSec : 0
  const dashOffset   = CIRC * (1 - fraction)

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 250,
      background: 'radial-gradient(circle at 50% 40%, var(--bg2) 0%, var(--bg0) 72%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      animation: 'slideUp .22s ease',
    }}>
      {/* Ruido sutil */}
      <div style={{
        position: 'absolute', inset: 0, opacity: .3, pointerEvents: 'none',
        backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3CfeColorMatrix values='0 0 0 0 0.88 0 0 0 0 0.74 0 0 0 0 0.42 0 0 0 0.02 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
      }} />

      {/* Salir */}
      <button
        onClick={onClose}
        title="Salir del modo enfoque"
        style={{
          position: 'absolute', top: '20px', right: '22px', zIndex: 2,
          display: 'flex', alignItems: 'center', gap: '6px',
          background: 'none', border: '1px solid var(--border)', borderRadius: '8px',
          padding: '7px 14px', color: 'var(--text1)', fontSize: '12px', fontWeight: 500,
          fontFamily: 'Inter, sans-serif', cursor: 'pointer', transition: 'all .15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-hi)'; e.currentTarget.style.color = 'var(--text0)' }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text1)' }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
        Salir
      </button>

      {/* Bloques hoy */}
      <div style={{
        position: 'absolute', top: '24px', left: '26px', zIndex: 2,
        fontSize: '12px', color: 'var(--text2)', fontFamily: 'Inter, sans-serif',
      }}>
        Bloques hoy: <strong style={{ color: 'var(--accent)', fontFamily: "'IBM Plex Mono', monospace" }}>{blocksToday}</strong> / {meta}
      </div>

      {/* Anillo + logo + tiempo */}
      <div style={{ position: 'relative', width: '300px', height: '300px', zIndex: 1 }}>
        <svg width="300" height="300" viewBox="0 0 300 300" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="150" cy="150" r={RADIUS} fill="none" stroke="var(--border)" strokeWidth="10" />
          <circle
            className="focus-ring"
            cx="150" cy="150" r={RADIUS} fill="none"
            stroke={phaseMeta.color} strokeWidth="10" strokeLinecap="round"
            strokeDasharray={CIRC}
            strokeDashoffset={dashOffset}
            style={{ filter: `drop-shadow(0 0 10px ${phaseMeta.color})` }}
          />
        </svg>
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: '10px',
        }}>
          <img
            src="/cerebro-logo.png" alt=""
            style={{ width: '52px', height: '52px', objectFit: 'contain', opacity: .88, filter: `drop-shadow(0 0 14px ${phaseMeta.color})` }}
          />
          <span style={{
            fontFamily: "'IBM Plex Mono', monospace", fontSize: '42px', fontWeight: 700,
            color: 'var(--text0)', letterSpacing: '-1px', lineHeight: 1,
          }}>
            {formatTime(secondsLeft)}
          </span>
          <span style={{
            fontSize: '11px', fontWeight: 700, letterSpacing: '1.6px', textTransform: 'uppercase',
            color: phaseMeta.color,
          }}>
            {phaseMeta.label}
          </span>
        </div>
      </div>

      {/* Controles */}
      <div style={{ display: 'flex', gap: '14px', marginTop: '36px', zIndex: 1 }}>
        <button
          onClick={() => setRunning(r => !r)}
          style={{
            width: '58px', height: '58px', borderRadius: '50%', border: 'none',
            background: 'var(--accent)', color: '#1a1608',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', boxShadow: '0 4px 18px rgba(224,189,107,.4)', transition: 'transform .15s',
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.06)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          title={running ? 'Pausar' : 'Iniciar'}
        >
          {running
            ? <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>
            : <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: '3px' }}><path d="M6 4l15 8-15 8z"/></svg>
          }
        </button>
        <button
          onClick={handleReset}
          title="Reiniciar"
          style={{
            width: '48px', height: '48px', borderRadius: '50%',
            border: '1px solid var(--border)', background: 'var(--bg2)', color: 'var(--text1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', transition: 'all .15s', alignSelf: 'center',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--text0)'; e.currentTarget.style.borderColor = 'var(--border-hi)' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text1)'; e.currentTarget.style.borderColor = 'var(--border)' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 102.13-9.36L1 10" />
          </svg>
        </button>
      </div>

      {/* Aviso de fin de fase */}
      {banner && (
        <div style={{
          position: 'absolute', bottom: '40px', zIndex: 2,
          background: 'var(--bg3)', border: '1px solid var(--accent-border)',
          borderRadius: '10px', padding: '10px 20px', fontSize: '13px', color: 'var(--text0)',
          boxShadow: 'var(--shadow)', animation: 'slideUp .2s ease',
        }}>
          {banner}
        </div>
      )}
    </div>
  )
}
