// Lectura de Gmail — SOLO LECTURA. No hay (ni debe haber) funciones acá que
// envíen, borren o modifiquen correos; el scope autorizado es gmail.readonly.
// Reusa el mismo access token OAuth que ya usa Calendar (ver useGCalToken.js) —
// el popup de conexión ahora pide ambos scopes juntos.

const BASE = 'https://gmail.googleapis.com/gmail/v1/users/me'

async function req(token, url) {
  if (!token) throw Object.assign(new Error('No hay token de Google (Gmail)'), { code: 'no_token' })
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  if (res.status === 401) throw Object.assign(new Error('Token de Google expirado'), { code: 'token_expired' })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Gmail API ${res.status}: ${body.slice(0, 300)}`)
  }
  return res.json()
}

function getHeader(headers, name) {
  return headers?.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value || ''
}

function decodeBase64Url(data) {
  if (!data) return ''
  const base64 = data.replace(/-/g, '+').replace(/_/g, '/')
  try { return decodeURIComponent(escape(atob(base64))) }
  catch { try { return atob(base64) } catch { return '' } }
}

// Busca recursivamente la primera parte text/plain del cuerpo (los correos
// multipart anidan partes: text/plain, text/html, adjuntos, etc.).
function extractPlainText(payload) {
  if (!payload) return ''
  if (payload.mimeType === 'text/plain' && payload.body?.data) {
    return decodeBase64Url(payload.body.data)
  }
  if (payload.parts?.length) {
    const plain = payload.parts.find(p => p.mimeType === 'text/plain')
    if (plain?.body?.data) return decodeBase64Url(plain.body.data)
    for (const part of payload.parts) {
      const nested = extractPlainText(part)
      if (nested) return nested
    }
  }
  if (payload.body?.data) return decodeBase64Url(payload.body.data)
  return ''
}

// ── API functions (solo lectura) ──────────────────────────────

// Busca correos por query de Gmail (ej: "from:profesor@colegio.cl", "subject:PAES",
// "after:2026/07/01"). Devuelve solo { id, threadId } — para leer el contenido de
// alguno, usar gmailLeerCorreo con su id.
export async function gmailBuscarCorreos(token, query, maxResults = 10) {
  const params = new URLSearchParams({ maxResults: String(maxResults) })
  if (query) params.set('q', query)
  const data = await req(token, `${BASE}/messages?${params}`)
  return data.messages || []
}

// Lee el contenido de un correo puntual: asunto, remitente, fecha y cuerpo en texto.
export async function gmailLeerCorreo(token, messageId) {
  const data    = await req(token, `${BASE}/messages/${encodeURIComponent(messageId)}?format=full`)
  const headers = data.payload?.headers || []
  return {
    id:        data.id,
    asunto:    getHeader(headers, 'Subject'),
    remitente: getHeader(headers, 'From'),
    fecha:     getHeader(headers, 'Date'),
    // cap a 5000 caracteres — evita inflar de más el contexto de un LLM más adelante
    cuerpo:    extractPlainText(data.payload).slice(0, 5000),
    snippet:   data.snippet || '',
  }
}
