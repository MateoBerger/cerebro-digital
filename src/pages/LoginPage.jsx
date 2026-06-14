import React, { useState } from 'react'
import { signInWithPopup } from 'firebase/auth'
import { auth, googleProvider } from '../firebase/config'

function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  async function handleLogin() {
    setLoading(true)
    setError(null)
    try {
      await signInWithPopup(auth, googleProvider)
    } catch {
      setError('No se pudo iniciar sesión. Intenta de nuevo.')
      setLoading(false)
    }
  }

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg0)',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '360px',
        padding: '44px 40px',
        background: 'var(--bg1)',
        border: '1px solid var(--border)',
        borderRadius: '16px',
        boxShadow: 'var(--shadow)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}>
        {/* Logo */}
        <img
          src="/logo.png"
          alt="SMGV"
          style={{
            width: '72px',
            height: '72px',
            borderRadius: '16px',
            objectFit: 'contain',
            marginBottom: '20px',
          }}
        />

        <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text0)', letterSpacing: '.2px', marginBottom: '5px', textAlign: 'center' }}>
          SMGV
        </h1>
        <p style={{ color: 'var(--text1)', fontSize: '13px', marginBottom: '36px', textAlign: 'center', lineHeight: 1.5 }}>
          Sistema Maestro de Gestión de Vida
        </p>

        <button
          onClick={handleLogin}
          disabled={loading}
          style={{
            width: '100%',
            padding: '12px 20px',
            background: loading ? 'var(--bg3)' : 'var(--accent)',
            border: 'none',
            borderRadius: '9px',
            color: loading ? 'var(--text2)' : '#fff',
            fontSize: '14px',
            fontWeight: 500,
            fontFamily: 'Inter, sans-serif',
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            opacity: loading ? .7 : 1,
            transition: 'opacity .15s, transform .1s',
            marginBottom: '16px',
          }}
          onMouseDown={e => { if (!loading) e.currentTarget.style.transform = 'scale(.98)' }}
          onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
        >
          {loading ? 'Iniciando sesión...' : <><GoogleLogo /> Continuar con Google</>}
        </button>

        {error && (
          <p style={{ color: 'var(--red)', fontSize: '12px', textAlign: 'center', marginBottom: '10px' }}>
            {error}
          </p>
        )}

        <p style={{ color: 'var(--text2)', fontSize: '11px', textAlign: 'center', lineHeight: 1.6 }}>
          Acceso restringido · Solo para Mateo Berger
        </p>
      </div>
    </div>
  )
}
