import { useState, useEffect } from 'react'

const TOKEN_KEY     = 'gcal_token'
const EXPIRY_KEY    = 'gcal_token_exp'
const CONNECTED_KEY = 'gcal_connected_once'
const TTL_MS        = 55 * 60 * 1000  // tokens GIS duran 60 min

const GCAL_CLIENT_ID =
  import.meta.env.VITE_GCAL_CLIENT_ID ||
  '110455411680-knlcvcneqpk25bfjo25ogcjkur93mu2n.apps.googleusercontent.com'

function loadToken() {
  const t   = sessionStorage.getItem(TOKEN_KEY)
  const exp = Number(sessionStorage.getItem(EXPIRY_KEY) || 0)
  return t && Date.now() < exp ? t : null
}

export function saveGCalToken(accessToken) {
  sessionStorage.setItem(TOKEN_KEY, accessToken)
  sessionStorage.setItem(EXPIRY_KEY, String(Date.now() + TTL_MS))
  localStorage.setItem(CONNECTED_KEY, '1')
}

function clearStoredToken() {
  sessionStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem(EXPIRY_KEY)
}

// Conexión/reconexión — siempre iniciada por clic del usuario, NUNCA automáticamente.
// GIS abre un popup OAuth; onToken se llama con el access_token si el usuario autoriza.
export function requestCalendarAccess(onToken, onError) {
  const gis = window.google?.accounts?.oauth2
  if (!gis) {
    const msg = 'GIS script no disponible — recargá la página'
    console.error('[GCal]', msg)
    onError?.(msg)
    return
  }

  const client = gis.initTokenClient({
    client_id: GCAL_CLIENT_ID,
    scope:     'https://www.googleapis.com/auth/calendar',
    callback: (resp) => {
      console.log('[GCal] callback recibido:', JSON.stringify(resp))
      if (resp.error || !resp.access_token) {
        const msg = resp.error ?? 'sin access_token en la respuesta'
        console.error('[GCal] error en callback:', msg)
        onError?.(msg)
        return
      }
      console.log('[GCal] token OK:', resp.access_token.slice(0, 16) + '…')
      onToken(resp.access_token)
    },
    error_callback: (err) => {
      // GIS invoca error_callback (no callback) para errores de flujo: popup bloqueado, etc.
      console.error('[GCal] error_callback:', JSON.stringify(err))
      if (err?.type !== 'popup_closed_by_user') {
        onError?.(err?.type ?? 'error desconocido de GIS')
      }
    },
  })
  console.log('[GCal] requestAccessToken → abriendo popup OAuth')
  client.requestAccessToken()
}

export function useGCalToken() {
  const [token, setToken] = useState(loadToken)

  // Limpia el token pasivamente cuando vence; no intenta renovarlo automáticamente.
  // El usuario ve el banner "Reconectar" y hace clic para volver a conectar.
  useEffect(() => {
    if (!token) return
    const exp   = Number(sessionStorage.getItem(EXPIRY_KEY) || 0)
    const delay = exp - Date.now()
    if (delay <= 0) { clearStoredToken(); setToken(null); return }
    const tid = setTimeout(() => { clearStoredToken(); setToken(null) }, delay)
    return () => clearTimeout(tid)
  }, [token])

  function save(accessToken) {
    saveGCalToken(accessToken)
    setToken(accessToken)
  }

  // Llamar cuando la Calendar API devuelva 401
  function handleTokenExpired() {
    clearStoredToken()
    setToken(null)
  }

  return { token, saveToken: save, handleTokenExpired }
}
