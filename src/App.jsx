import React, { useEffect, useRef, useState } from 'react'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { auth } from './firebase/config'
import { useGCalToken } from './hooks/useGCalToken'
import { useChat } from './hooks/useChat'
import LoginPage      from './pages/LoginPage'
import InicioTab      from './components/InicioTab'
import DashboardTab   from './components/DashboardTab'
import TareasTab      from './components/TareasTab'
import CalendarioTab  from './components/CalendarioTab'
import PAESTab        from './components/PAESTab'
import DiagramTab     from './components/DiagramTab'
import DictTab        from './components/DictTab'
import ChatUI         from './components/ChatUI'
import FloatingChat   from './components/FloatingChat'
import NotifPrompt    from './components/NotifPrompt'
import IntroAnimation from './components/IntroAnimation'
import LoadingScreen  from './components/LoadingScreen'

// ── Constantes ────────────────────────────────────────────────────────────────
const SCREENS       = ['left', 'center', 'right']
const SCREEN_LABELS = ['Dashboard & Tareas', 'Diario', 'Calendario']
const SCREEN_SHORT  = ['Dashboard', 'Diario', 'Calendario']

// ── Separador dorado entre secciones ─────────────────────────────────────────
function SectionDivider({ label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '6px 24px 22px' }}>
      <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, transparent, rgba(224,189,107,.28))' }} />
      {label && (
        <span style={{
          fontSize: '9px', fontWeight: 700, color: 'var(--text2)',
          letterSpacing: '1.8px', textTransform: 'uppercase',
          padding: '0 4px', whiteSpace: 'nowrap',
        }}>
          {label}
        </span>
      )}
      <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, rgba(224,189,107,.28), transparent)' }} />
    </div>
  )
}

// ── Acción rápida del asistente embebido ─────────────────────────────────────
function QuickBar({ chat }) {
  const [hov, setHov] = useState(false)
  const dis = chat.loading
  return (
    <div style={{ display: 'flex', gap: '6px' }}>
      <button
        onClick={() => !dis && chat.sendQuick(chat.buildPriorizarPrompt(), '¿Qué hago primero?')}
        disabled={dis}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        style={{
          display: 'flex', alignItems: 'center', gap: '5px',
          padding: '3px 10px', borderRadius: '20px',
          border: `1px solid ${hov && !dis ? 'var(--accent)' : 'var(--accent-border)'}`,
          background: hov && !dis ? 'var(--accent)' : 'var(--accent-dim)',
          color: hov && !dis ? '#1a1608' : 'var(--accent)',
          fontSize: '11px', fontWeight: 600, fontFamily: 'Inter, sans-serif',
          cursor: dis ? 'not-allowed' : 'pointer',
          opacity: dis ? .5 : 1, transition: 'all .15s',
        }}
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
        ¿Qué hago primero?
      </button>
    </div>
  )
}

// ── Asistente embebido ─────────────────────────────────────────────────────────
function EmbeddedAsistente({ uid }) {
  const chat = useChat(uid)
  return (
    <div style={{ padding: '0 24px 8px' }}>
      <div style={{
        borderRadius: 'var(--radius)',
        border: '1px solid var(--border)',
        overflow: 'hidden',
        boxShadow: '0 16px 40px -12px rgba(0,0,0,.75), 0 0 0 1px rgba(224,189,107,.07), 0 0 32px -10px rgba(224,189,107,.1)',
        background: 'var(--bg1)',
      }}>
        {/* Línea de acento dorado */}
        <div style={{
          height: '2px',
          background: 'linear-gradient(90deg, transparent 0%, var(--accent) 40%, var(--accent) 60%, transparent 100%)',
          opacity: .7,
        }} />
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '11px 16px 10px',
          borderBottom: '1px solid var(--border)',
          background: 'linear-gradient(180deg, var(--bg3) 0%, var(--bg2) 100%)',
        }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </svg>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text0)' }}>Asistente IA</span>
          <span style={{ fontSize: '10px', color: 'var(--text2)', marginLeft: '2px' }}>· tiempo real</span>
        </div>
        {/* Chat */}
        <div style={{ height: '400px', display: 'flex', flexDirection: 'column', background: 'var(--bg0)' }}>
          <ChatUI {...chat} compact extraToolbar={<QuickBar chat={chat} />} />
        </div>
      </div>
    </div>
  )
}

// ── Botones de acceso rápido ──────────────────────────────────────────────────
function BigBtn({ label, sub, icon, onClick, disabled, accent }) {
  const [hov, setHov] = useState(false)
  const active = hov && !disabled
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      onMouseEnter={() => !disabled && setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px',
        padding: '22px 16px', borderRadius: 'var(--radius)',
        border: `1px solid ${active
          ? 'var(--accent)'
          : accent && !disabled
            ? 'rgba(224,189,107,.35)'
            : 'var(--border)'}`,
        background: active
          ? 'linear-gradient(160deg, var(--bg3) 0%, rgba(224,189,107,.06) 100%)'
          : accent && !disabled
            ? 'linear-gradient(160deg, var(--bg3) 0%, rgba(224,189,107,.03) 100%)'
            : 'var(--bg2)',
        color: disabled ? 'var(--text2)' : active ? 'var(--accent)' : 'var(--text0)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? .42 : 1,
        transition: 'all .2s ease',
        fontFamily: 'Inter, sans-serif',
        boxShadow: active
          ? '0 0 0 1px var(--accent-border), 0 10px 30px -8px rgba(224,189,107,.25), 0 4px 12px rgba(0,0,0,.4)'
          : accent && !disabled
            ? '0 0 0 1px rgba(224,189,107,.1), 0 6px 20px -8px rgba(0,0,0,.55), 0 0 16px rgba(224,189,107,.06)'
            : '0 2px 8px rgba(0,0,0,.2)',
        transform: active ? 'translateY(-3px)' : 'none',
        width: '100%',
        position: 'relative', overflow: 'hidden',
      }}
    >
      {/* Top accent line for accent buttons */}
      {accent && !disabled && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '1.5px',
          background: 'linear-gradient(90deg, transparent, var(--accent), transparent)',
          opacity: active ? .9 : .5,
        }} />
      )}
      <div style={{ color: disabled ? 'var(--text2)' : active ? 'var(--accent)' : accent ? 'var(--accent)' : 'var(--text1)' }}>
        {icon}
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '3px' }}>{label}</div>
        {sub && <div style={{ fontSize: '11px', color: 'var(--text2)', fontWeight: 400 }}>{sub}</div>}
      </div>
    </button>
  )
}

function SmallBtn({ label, icon, onClick }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '11px 14px', borderRadius: 'var(--radius-sm)',
        border: `1px solid ${hov ? 'var(--accent-border)' : 'var(--border)'}`,
        background: hov ? 'var(--accent-dim)' : 'var(--bg2)',
        color: hov ? 'var(--accent)' : 'var(--text1)',
        cursor: 'pointer', transition: 'all .15s ease',
        fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 500,
        textAlign: 'left', width: '100%',
        boxShadow: hov ? '0 0 0 1px var(--accent-border)' : 'none',
      }}
    >
      {icon}
      {label}
    </button>
  )
}

function QuickLaunchers({ onOpen }) {
  return (
    <div style={{ padding: '0 24px 40px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <BigBtn
          label="PAES"
          sub="Ejercicios y ensayos"
          accent
          icon={
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <circle cx="12" cy="12" r="6"/>
              <circle cx="12" cy="12" r="2"/>
            </svg>
          }
          onClick={() => onOpen('paes')}
        />
        <BigBtn
          label="Próximamente"
          sub="En construcción"
          icon={
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          }
          disabled
        />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <SmallBtn
          label="Mapa del sistema"
          icon={
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98"/>
              <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
            </svg>
          }
          onClick={() => onOpen('diagram')}
        />
        <SmallBtn
          label="Diccionario"
          icon={
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/>
              <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/>
            </svg>
          }
          onClick={() => onOpen('dict')}
        />
      </div>
    </div>
  )
}

// ── Overlay: PAES / Mapa / Diccionario ────────────────────────────────────────
const OVERLAY_META = {
  paes:    { label: 'PAES' },
  diagram: { label: 'Mapa del sistema' },
  dict:    { label: 'Diccionario' },
}

function OverlayPanel({ overlay, onClose, uid, onInfo }) {
  if (!overlay) return null
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 150,
      background: 'var(--bg0)', display: 'flex', flexDirection: 'column',
      animation: 'slideUp .2s ease',
    }}>
      <div style={{
        height: '48px', display: 'flex', alignItems: 'center', gap: '12px',
        padding: '0 14px', borderBottom: '1px solid var(--border)',
        background: 'var(--bg1)', flexShrink: 0,
        boxShadow: '0 1px 0 rgba(224,189,107,.08)',
      }}>
        <button
          onClick={onClose}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: 'none', border: 'none', color: 'var(--text1)',
            cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: '13px',
            padding: '5px 8px', borderRadius: '6px', transition: 'all .15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg3)'; e.currentTarget.style.color = 'var(--text0)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text1)' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Volver
        </button>
        <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text0)' }}>
          {OVERLAY_META[overlay]?.label}
        </span>
      </div>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {overlay === 'paes'    && <PAESTab    uid={uid} />}
        {overlay === 'diagram' && <DiagramTab uid={uid} onInfo={onInfo} />}
        {overlay === 'dict'    && <DictTab    uid={uid} onInfo={onInfo} />}
      </div>
    </div>
  )
}

// ── Barra superior ────────────────────────────────────────────────────────────
function TopBar({ user, theme, onThemeToggle, onLogout, screenIdx }) {
  const initials = user.displayName
    ? user.displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : (user.email?.[0] || '?').toUpperCase()

  return (
    <div className="topbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <img src="/logo.png" alt="SMGV" style={{ width: '22px', height: '22px', objectFit: 'contain' }} />
        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text0)', letterSpacing: '.2px' }}>SMGV</span>
        <span style={{ fontSize: '11px', color: 'var(--text2)' }}>· {SCREEN_LABELS[screenIdx]}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <div title={user.displayName || user.email} style={{
          width: '26px', height: '26px', borderRadius: '7px',
          background: 'var(--accent)', color: '#1a1608',
          fontSize: '10px', fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {initials}
        </div>
        <button onClick={onThemeToggle} title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'} className="topbar-icon-btn">
          {theme === 'dark'
            ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
                <circle cx="12" cy="12" r="5"/>
              </svg>
            : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
              </svg>
          }
        </button>
        <button onClick={onLogout} title="Cerrar sesión" className="topbar-icon-btn topbar-icon-btn--danger">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
        </button>
      </div>
    </div>
  )
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function InfoToast({ msg, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2800)
    return () => clearTimeout(t)
  }, [msg])
  return (
    <div style={{
      position: 'fixed', bottom: '32px', left: '50%', transform: 'translateX(-50%)',
      zIndex: 300, background: 'var(--bg3)', border: '1px solid var(--border)',
      borderRadius: '10px', padding: '9px 20px', fontSize: '13px',
      color: 'var(--text0)', boxShadow: 'var(--shadow)',
      animation: 'slideUp .2s ease', pointerEvents: 'none', whiteSpace: 'nowrap',
    }}>
      {msg}
    </div>
  )
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser]               = useState(undefined)
  const [showLoading, setShowLoading] = useState(true)
  const [screen, setScreen]           = useState('center')
  const [overlay, setOverlay]         = useState(null)
  const [theme, setTheme]             = useState(() => localStorage.getItem('cd-theme') || 'dark')
  const [info, setInfo]               = useState('')
  const { token: gcalToken, saveToken: saveGcalToken, handleTokenExpired: onGcalExpired } = useGCalToken()

  const screenIdx   = SCREENS.indexOf(screen)
  const touchStartX = useRef(null)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('cd-theme', theme)
  }, [theme])

  useEffect(() => {
    return onAuthStateChanged(auth, u => {
      setUser(u)
      setTimeout(() => setShowLoading(false), 380)
    })
  }, [])

  function navigate(dir) {
    const next = screenIdx + dir
    if (next >= 0 && next < SCREENS.length) setScreen(SCREENS[next])
  }

  function onTouchStart(e) { touchStartX.current = e.targetTouches[0].clientX }
  function onTouchEnd(e) {
    if (touchStartX.current === null) return
    const delta = e.changedTouches[0].clientX - touchStartX.current
    if (Math.abs(delta) > 55) navigate(delta < 0 ? 1 : -1)
    touchStartX.current = null
  }

  if (showLoading) return <LoadingScreen fading={user !== undefined} />
  if (!user) return <LoginPage onGcalToken={saveGcalToken} />

  return (
    <>
      <IntroAnimation user={user} />

      <TopBar
        user={user} theme={theme}
        onThemeToggle={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
        onLogout={() => signOut(auth)}
        screenIdx={screenIdx}
      />

      {/* Carrusel */}
      <div className="carousel-viewport" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <div className="carousel-track" style={{ transform: `translateX(${-screenIdx * 33.333}%)` }}>

          {/* IZQUIERDA: Dashboard + Tareas */}
          <div className="carousel-panel">
            <DashboardTab uid={user.uid} user={user} onInfo={setInfo} />
            <SectionDivider label="Tareas" />
            <TareasTab uid={user.uid} />
          </div>

          {/* CENTRO: Diario + Asistente + Accesos */}
          <div className="carousel-panel">
            <div className="center-panel-wrap">
              <InicioTab
                uid={user.uid}
                gcalToken={gcalToken}
                onGcalExpired={onGcalExpired}
                onTabChange={t => { if (t === 'tareas') setScreen('left') }}
              />
              <SectionDivider label="Asistente IA" />
              <EmbeddedAsistente uid={user.uid} />
              <SectionDivider label="Accesos" />
              <QuickLaunchers onOpen={setOverlay} />
            </div>
          </div>

          {/* DERECHA: Calendario */}
          <div className="carousel-panel carousel-panel--flex">
            <CalendarioTab
              uid={user.uid}
              gcalToken={gcalToken}
              onGcalToken={saveGcalToken}
              onGcalExpired={onGcalExpired}
            />
          </div>
        </div>
      </div>

      {/* Flechas de navegación — píldoras con label */}
      {screenIdx > 0 && (
        <button className="screen-arrow screen-arrow--left" onClick={() => navigate(-1)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          <span className="screen-arrow-label">{SCREEN_SHORT[screenIdx - 1]}</span>
        </button>
      )}
      {screenIdx < 2 && (
        <button className="screen-arrow screen-arrow--right" onClick={() => navigate(1)}>
          <span className="screen-arrow-label">{SCREEN_SHORT[screenIdx + 1]}</span>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      )}

      {/* Indicador de posición */}
      <div className="dots-indicator">
        {SCREENS.map((s, i) => (
          <button
            key={s}
            className={`dot${i === screenIdx ? ' dot--active' : ''}`}
            onClick={() => setScreen(SCREENS[i])}
            title={SCREEN_LABELS[i]}
          />
        ))}
      </div>

      {/* Overlay */}
      <OverlayPanel overlay={overlay} onClose={() => setOverlay(null)} uid={user.uid} onInfo={setInfo} />

      <FloatingChat uid={user.uid} />
      <NotifPrompt uid={user.uid} />
      {info && <InfoToast key={info} msg={info} onDone={() => setInfo('')} />}
    </>
  )
}
