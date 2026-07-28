// Vercel Serverless — GET/POST /api/gmail-test
// Diagnóstico de la conexión Gmail (solo lectura). Igual idea que cerebras-test.js,
// pero acá no hay una key de servidor: el access token es el mismo que usa Calendar
// y vive en el navegador (sessionStorage, clave "gcal_token"). Para probar, copiá
// ese valor desde DevTools → Application → Session Storage y pasalo como query param.
//
// Abrir en browser:
//   https://TU-APP.vercel.app/api/gmail-test?token=TU_ACCESS_TOKEN
// o por POST: { "token": "TU_ACCESS_TOKEN" }
//
// NUNCA envía, borra ni modifica nada — solo tokeninfo (verifica el scope) y un
// list de mensajes (cuenta cuántos hay, no lee ni muestra contenido).

const TOKENINFO_URL  = 'https://oauth2.googleapis.com/tokeninfo'
const GMAIL_BASE     = 'https://gmail.googleapis.com/gmail/v1/users/me'
const REQUIRED_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly'

export default async function handler(req, res) {
  const token = req.method === 'POST' ? req.body?.token : req.query?.token

  const diag = { token_present: !!token }
  if (!token) {
    return res.status(200).json({
      ...diag,
      verdict: 'ERROR: falta el token — pasalo como ?token=... (GET) o { "token": "..." } (POST). Es el mismo valor que sessionStorage["gcal_token"] en el navegador logueado.',
    })
  }

  // ── Paso 1: tokeninfo — token válido y qué scopes tiene otorgados ──
  let tokenInfo
  try {
    const r    = await fetch(`${TOKENINFO_URL}?access_token=${encodeURIComponent(token)}`)
    const data = await r.json()
    tokenInfo  = { http_status: r.status, ok: r.ok, data }
  } catch (err) {
    tokenInfo = { fetch_error: err.message }
  }

  if (!tokenInfo.ok) {
    return res.status(200).json({
      ...diag,
      token_info: tokenInfo,
      verdict: 'ERROR: el token no es válido o ya expiró (dura ~55-60 min) — volvé a conectar desde la app y probá de nuevo con el token fresco.',
    })
  }

  const scopesGranted = (tokenInfo.data?.scope || '').split(' ').filter(Boolean)
  const hasGmailScope = scopesGranted.includes(REQUIRED_SCOPE)

  if (!hasGmailScope) {
    return res.status(200).json({
      ...diag,
      scopes_granted:  scopesGranted,
      has_gmail_scope: false,
      verdict: 'ERROR: el token es válido pero NO incluye el scope gmail.readonly — hace falta reconectar (botón "Reconectar Google Calendar" o volver a iniciar sesión) para que Google pida el permiso nuevo.',
    })
  }

  // ── Paso 2: listar mensajes recientes — solo contar, sin leer contenido ──
  let listResult
  try {
    const r    = await fetch(`${GMAIL_BASE}/messages?maxResults=5`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await r.json()
    listResult = {
      http_status:         r.status,
      ok:                  r.ok,
      count_returned:      data.messages?.length ?? 0,
      resultSizeEstimate:  data.resultSizeEstimate ?? null,
      error:               r.ok ? null : data.error,
    }
  } catch (err) {
    listResult = { fetch_error: err.message }
  }

  const verdict = listResult.ok
    ? `OK — token válido, scope gmail.readonly presente, se pudo listar (${listResult.count_returned} de ~${listResult.resultSizeEstimate} correos recientes). Conexión de lectura funcionando.`
    : `ERROR: scope presente pero falló el listado de mensajes (HTTP ${listResult.http_status}): ${JSON.stringify(listResult.error).slice(0, 200)}`

  return res.status(200).json({
    ...diag,
    scopes_granted:  scopesGranted,
    has_gmail_scope: true,
    list_result:     listResult,
    verdict,
  })
}
