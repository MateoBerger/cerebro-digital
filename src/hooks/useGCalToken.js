import { useState, useEffect, useRef, useCallback } from 'react'

const TOKEN_KEY     = 'gcal_token'
const EXPIRY_KEY    = 'gcal_token_exp'
const CONNECTED_KEY = 'gcal_connected_once'
const TTL_MS        = 55 * 60 * 1000  // tokens GIS duran 60 min, renovamos a los 55
const REFRESH_AHEAD =  5 * 60 * 1000  // pedir nuevo token 5 min antes del vencimiento

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

// Espera hasta que el script de GIS esté disponible (máx. 8 s)
function waitForGIS() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) { resolve(); return }
    const deadline = Date.now() + 8000
    const id = setInterval(() => {
      if (window.google?.accounts?.oauth2)  { clearInterval(id); resolve() }
      else if (Date.now() > deadline)        { clearInterval(id); reject()  }
    }, 150)
  })
}

// Intenta obtener un token sin mostrar UI (prompt:'').
// Funciona si el usuario tiene sesión activa de Google y ya concedió los permisos.
async function requestSilentToken() {
  try { await waitForGIS() } catch { return null }

  return new Promise((resolve) => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id:      GCAL_CLIENT_ID,
      scope:          'https://www.googleapis.com/auth/calendar',
      prompt:         '',
      callback:       (resp) => {
        if (resp.error || !resp.access_token) resolve(null)
        else { saveGCalToken(resp.access_token); resolve(resp.access_token) }
      },
      error_callback: () => resolve(null),
    })
    client.requestAccessToken({ prompt: '' })
  })
}

// Reconexión manual — requiere gesto del usuario (clic en botón)
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
      // GIS llama a error_callback (no a callback) para errores de flujo como popup bloqueado
      console.error('[GCal] error_callback:', JSON.stringify(err))
      // 'popup_closed_by_user' es esperado cuando el usuario cierra sin autorizar
      if (err?.type !== 'popup_closed_by_user') {
        onError?.(err?.type ?? 'error desconocido')
      }
    },
  })
  console.log('[GCal] requestAccessToken → abriendo popup OAuth')
  client.requestAccessToken()
}

export function useGCalToken() {
  const [token,          setToken]          = useState(loadToken)
  const [needsReconnect, setNeedsReconnect] = useState(false)
  // true solo mientras hay un intento de refresh silencioso en curso
  const [silentPending,  setSilentPending]  = useState(
    !loadToken() && !!localStorage.getItem(CONNECTED_KEY)
  )
  const refreshing = useRef(false)

  const silentRefresh = useCallback(async () => {
    if (refreshing.current) return
    refreshing.current = true
    setSilentPending(true)
    try {
      const t = await requestSilentToken()
      if (t) {
        setToken(t)
        setNeedsReconnect(false)
      } else {
        setNeedsReconnect(true)
      }
    } finally {
      refreshing.current = false
      setSilentPending(false)
    }
  }, [])

  // Al montar: solo intenta refresh silencioso si el usuario ya conectó antes.
  // Si nunca conectó, muestra el banner directamente sin abrir popups de GIS.
  useEffect(() => {
    if (!loadToken() && localStorage.getItem(CONNECTED_KEY)) silentRefresh()
  }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  // Renovación proactiva 5 min antes del vencimiento
  useEffect(() => {
    if (!token) return
    const exp   = Number(sessionStorage.getItem(EXPIRY_KEY) || 0)
    const delay = exp - Date.now() - REFRESH_AHEAD
    if (delay <= 0) { silentRefresh(); return }
    const tid = setTimeout(silentRefresh, delay)
    return () => clearTimeout(tid)
  }, [token, silentRefresh])

  function save(accessToken) {
    saveGCalToken(accessToken)
    setToken(accessToken)
    setNeedsReconnect(false)
    setSilentPending(false)
  }

  // Llamar cuando la Calendar API devuelva 401
  function handleTokenExpired() {
    clearStoredToken()
    setToken(null)
    silentRefresh()
  }

  return { token, saveToken: save, needsReconnect, silentPending, handleTokenExpired }
}
