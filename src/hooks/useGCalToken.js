import { useState } from 'react'
import { reauthenticateWithRedirect, getRedirectResult, GoogleAuthProvider } from 'firebase/auth'
import { auth } from '../firebase/config'

const TOKEN_KEY  = 'gcal_token'
const EXPIRY_KEY = 'gcal_token_exp'
const TTL_MS     = 55 * 60 * 1000 // tokens duran 60 min, refrescamos a los 55

function loadToken() {
  const t   = sessionStorage.getItem(TOKEN_KEY)
  const exp = Number(sessionStorage.getItem(EXPIRY_KEY) || 0)
  return t && Date.now() < exp ? t : null
}

// Escribe en sessionStorage — se llama desde LoginPage y desde App (redirect result)
export function saveGCalToken(accessToken) {
  sessionStorage.setItem(TOKEN_KEY, accessToken)
  sessionStorage.setItem(EXPIRY_KEY, String(Date.now() + TTL_MS))
}

// Inicia el flujo redirect hacia Google para pedir el scope de Calendar.
// La pagina navega completamente; no hay valor de retorno.
export function startCalendarAuthRedirect() {
  const provider = new GoogleAuthProvider()
  provider.addScope('https://www.googleapis.com/auth/calendar')
  reauthenticateWithRedirect(auth.currentUser, provider)
}

// Recupera el resultado de un redirect previo (si existe).
// Retorna el accessToken o null. Firebase limpia el resultado despues de leerlo.
export async function consumeCalendarRedirectResult() {
  try {
    const result = await getRedirectResult(auth)
    const at = result?.credential?.accessToken
    return at || null
  } catch {
    return null
  }
}

export function useGCalToken() {
  const [token, setToken] = useState(loadToken)

  function save(accessToken) {
    saveGCalToken(accessToken)
    setToken(accessToken)
  }

  return { token, saveToken: save }
}
