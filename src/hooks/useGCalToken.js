import { useState } from 'react'
import { reauthenticateWithPopup, GoogleAuthProvider } from 'firebase/auth'
import { auth } from '../firebase/config'

const TOKEN_KEY  = 'gcal_token'
const EXPIRY_KEY = 'gcal_token_exp'
const TTL_MS     = 55 * 60 * 1000 // 55 min (Google tokens expire at 60 min)

function loadToken() {
  const t   = sessionStorage.getItem(TOKEN_KEY)
  const exp = Number(sessionStorage.getItem(EXPIRY_KEY) || 0)
  return t && Date.now() < exp ? t : null
}

// Called from LoginPage (outside React tree)
export function saveGCalToken(accessToken) {
  sessionStorage.setItem(TOKEN_KEY, accessToken)
  sessionStorage.setItem(EXPIRY_KEY, String(Date.now() + TTL_MS))
}

export function useGCalToken() {
  const [token, setToken] = useState(loadToken)

  function save(accessToken) {
    saveGCalToken(accessToken)
    setToken(accessToken)
  }

  async function refresh() {
    try {
      const provider = new GoogleAuthProvider()
      provider.addScope('https://www.googleapis.com/auth/calendar')
      const result = await reauthenticateWithPopup(auth.currentUser, provider)
      const at = result.credential?.accessToken
      if (at) save(at)
      return at || null
    } catch {
      return null
    }
  }

  return { token, saveToken: save, refreshToken: refresh }
}
