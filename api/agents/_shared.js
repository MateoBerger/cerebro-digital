// Helper compartido para los endpoints de especialistas del sistema multiagente
// (api/agents/*.js). Junta el fetch a Cerebras y el mismo criterio de reintento
// ante 429/5xx que ya usa el Supervisor (api/chat.js), para que cada especialista
// solo tenga que aportar su system prompt y armar su propio mensaje de usuario.
//
// La redacción del mensaje de fallback (tono, nombre del especialista) queda a
// cargo de cada endpoint — este helper solo informa el motivo (`reason`) para
// que cada uno elija sus propias palabras.

const CEREBRAS_URL   = 'https://api.cerebras.ai/v1/chat/completions'
const CEREBRAS_MODEL = 'gpt-oss-120b'

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

// Devuelve { texto, reason }. texto es null si no se pudo obtener respuesta;
// en ese caso reason indica por qué ('rate_limit' | 'server_error' | 'error' | 'empty').
export async function callCerebras({ systemPrompt, userContent, maxTokens = 500, temperature = 0.4, agentName = 'agent' }) {
  const key = process.env.CEREBRAS_API_KEY
  if (!key) return { texto: null, reason: 'no_key' }

  async function callProvider() {
    return fetch(CEREBRAS_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model:       CEREBRAS_MODEL,
        max_tokens:  maxTokens,
        temperature,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: userContent },
        ],
      }),
    })
  }

  let response = await callProvider()

  // 429 — mismo criterio de reintento que api/chat.js
  if (response.status === 429) {
    await sleep(500)
    response = await callProvider()
    if (response.status === 429) { await sleep(2000); response = await callProvider() }
    if (response.status === 429) {
      console.error(`[${agentName}] 429 persiste`)
      return { texto: null, reason: 'rate_limit' }
    }
  }

  // 5xx transitorios — reintentar una vez
  if (response.status === 500 || response.status === 502 || response.status === 503) {
    await sleep(500)
    response = await callProvider()
    if (response.status >= 500) {
      console.error(`[${agentName}] 5xx persiste:`, response.status)
      return { texto: null, reason: 'server_error' }
    }
  }

  if (!response.ok) {
    const errText = await response.text().catch(() => '')
    console.error(`[${agentName}] provider error`, response.status, errText.slice(0, 300))
    return { texto: null, reason: 'error' }
  }

  const data  = await response.json()
  const texto = data.choices?.[0]?.message?.content?.trim()
  return texto ? { texto, reason: null } : { texto: null, reason: 'empty' }
}
