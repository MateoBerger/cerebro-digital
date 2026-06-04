import React, { useState } from 'react'
import { signInWithPopup } from 'firebase/auth'
import { auth, googleProvider } from '../firebase/config'

const s = {
  root: {
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--bg0)',
    backgroundImage: 'radial-gradient(circle, rgba(37,42,51,.7) 1px, transparent 1px)',
    backgroundSize: '20px 20px',
  },
  card: {
    background: 'var(--bg1)',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    padding: '40px 48px',
    width: '360px',
    display: 'flex',
    flexDirection: 'column',
    gap: '28px',
    boxShadow: '0 8px 40px rgba(0,0,0,.6)',
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  pulse: {
    width: '8px', height: '8px',
    borderRadius: '50%',
    background: 'var(--blue)',
    boxShadow: '0 0 8px var(--blue)',
    marginBottom: '16px',
    animation: 'blink 2.4s ease-in-out infinite',
  },
  title: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: '18px',
    fontWeight: '500',
    color: 'var(--text0)',
    letterSpacing: '-.3px',
  },
  subtitle: {
    fontSize: '12px',
    color: 'var(--text2)',
    fontFamily: "'IBM Plex Mono', monospace",
  },
  divider: {
    height: '1px',
    background: 'var(--border)',
  },
  body: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  desc: {
    fontSize: '12px',
    color: 'var(--text1)',
    lineHeight: '1.6',
  },
  btn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    padding: '10px 16px',
    background: 'rgba(77,156,246,.1)',
    border: '1px solid rgba(77,156,246,.3)',
    borderRadius: '4px',
    color: 'var(--blue)',
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: '12px',
    transition: 'background .12s, border-color .12s',
    width: '100%',
  },
  btnHover: {
    background: 'rgba(77,156,246,.2)',
    borderColor: 'var(--blue)',
  },
  error: {
    fontSize: '11px',
    color: 'var(--red)',
    fontFamily: "'IBM Plex Mono', monospace",
    padding: '8px 10px',
    background: 'rgba(224,92,92,.06)',
    border: '1px solid rgba(224,92,92,.2)',
    borderRadius: '3px',
  },
  footer: {
    fontSize: '10px',
    color: 'var(--text2)',
    fontFamily: "'IBM Plex Mono', monospace",
    textAlign: 'center',
  }
}

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)
  const [hovered, setHovered] = useState(false)

  async function handleLogin() {
    setLoading(true)
    setError(null)
    try {
      await signInWithPopup(auth, googleProvider)
    } catch (e) {
      setError('No se pudo iniciar sesion. Intenta de nuevo.')
      setLoading(false)
    }
  }

  return (
    <div style={s.root}>
      <style>{`@keyframes blink{0%,100%{opacity:1;box-shadow:0 0 8px var(--blue)}50%{opacity:.35;box-shadow:0 0 4px var(--blue)}}`}</style>
      <div style={s.card}>
        <div style={s.header}>
          <div style={s.pulse} />
          <div style={s.title}>cerebro.digital</div>
          <div style={s.subtitle}>Sistema de Vida Integral v1.0</div>
        </div>
        <div style={s.divider} />
        <div style={s.body}>
          <p style={s.desc}>
            Panel de control personal sincronizado entre todos tus dispositivos.
            Inicia sesion con tu cuenta de Google para continuar.
          </p>
          {error && <div style={s.error}>{error}</div>}
          <button
            style={{ ...s.btn, ...(hovered ? s.btnHover : {}) }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onClick={handleLogin}
            disabled={loading}
          >
            {loading ? 'Conectando...' : 'Continuar con Google'}
          </button>
        </div>
        <div style={s.footer}>
          Solo Mateo Berger tiene acceso a estos datos.
        </div>
      </div>
    </div>
  )
}
