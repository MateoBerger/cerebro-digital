import { useState } from 'react'

const TOKEN_KEY  = 'gcal_token'
const EXPIRY_KEY = 'gcal_token_exp'
const TTL_MS     = 55 * 60 * 1000 // tokens GIS duran 60 min, refrescamos a 55

function loadToken() {
  const t   = sessionStorage.getItem(TOKEN_KEY)
  const exp = Number(sessionStorage.getItem(EXPIRY_KEY) || 0)
  return t && Date.now() < exp ? t : null
}

// Persiste el token — se llama desde LoginPage (login inicial) y desde el callback GIS
export function saveGCalToken(accessToken) {
  sessionStorage.setItem(TOKEN_KEY, accessToken)
  sessionStorage.setItem(EXPIRY_KEY, String(Date.now() + TTL_MS))
}

/**
 * Abre el selector de permisos de Google Identity Services para el scope Calendar.
 * Evita COOP/CORS: GIS maneja su propio popup sin depender de Firebase.
 * onToken(accessToken) se llama al completar con exito.
 */
const GCAL_CLIENT_ID =
  import.meta.env.VITE_GCAL_CLIENT_ID ||
  '110455411680-knlcvcneqpk25bfjo25ogcjkur93mu2n.apps.googleusercontent.com'

export function requestCalendarAccess(onToken) {
  const gis = window.google?.accounts?.oauth2

  if (!gis) {
    console.error('[GCal] Script de GIS aun no cargado (accounts.google.com/gsi/client)')
    return
  }

  const client = gis.initTokenClient({
    client_id: GCAL_CLIENT_ID,
    scope: 'https://www.googleapis.com/auth/calendar',
    callback: (resp) => {
      if (resp.error || !resp.access_token) {
        console.error('[GCal] Error GIS:', resp.error ?? 'sin access_token')
        return
      }
      onToken(resp.access_token)
    },
  })

  client.requestAccessToken()
}

export function useGCalToken() {
  const [token, setToken] = useState(loadToken)

  function save(accessToken) {
    saveGCalToken(accessToken)
    setToken(accessToken)
  }

  return { token, saveToken: save }
}
