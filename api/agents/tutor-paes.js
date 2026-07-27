// Vercel Serverless — POST /api/agents/tutor-paes
// Especialista "Tutor PAES" del sistema multiagente: analiza el progreso PAES de
// Mateo y propone práctica concreta. Es un CONSULTOR, no un ejecutor — no tiene
// tools propias, no toca Firestore, no tiene loop de tool-use. Solo devuelve texto.
//
// Lo llama el Supervisor (api/chat.js) vía la tool consultar_tutor_paes, ejecutada
// en useChat.js. El Supervisor decide qué contexto pasarle; este endpoint no busca
// datos por su cuenta.
//
// Body: { pregunta: string, contexto?: string }
// Response: { texto }

const CEREBRAS_URL   = 'https://api.cerebras.ai/v1/chat/completions'
const CEREBRAS_MODEL = 'gpt-oss-120b'

const SYSTEM_PROMPT = `Eres el Tutor PAES de Mateo, experto en la PAES chilena. Tu trabajo es analizar su progreso, detectar debilidades por materia (M1, M2, Competencia Lectora, Ciencias) y proponer práctica concreta (mini-ensayos, ejercicios, repasos). Conoces su meta: 915 puntos. Responde conciso y accionable.

No ejecutás nada vos mismo — no creás tareas, ensayos ni eventos. Si te parece que hace falta una acción concreta (agendar un mini-ensayo, crear una tarea de repaso), proponela dentro de tu respuesta como sugerencia en texto; quien decide si hacerla y la ejecuta es el asistente que te consultó, no vos.`

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const key = process.env.CEREBRAS_API_KEY
  if (!key) return res.status(500).json({ error: 'CEREBRAS_API_KEY no configurada en Vercel' })

  const { pregunta, contexto } = req.body || {}
  if (!pregunta) return res.status(400).json({ error: 'pregunta requerida' })

  const userContent = contexto
    ? `Contexto PAES de Mateo:\n${contexto}\n\nPregunta del asistente: ${pregunta}`
    : pregunta

  async function callProvider() {
    return fetch(CEREBRAS_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model:       CEREBRAS_MODEL,
        max_tokens:  500,
        temperature: 0.4,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user',   content: userContent },
        ],
      }),
    })
  }

  async function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

  try {
    let response = await callProvider()

    // 429 — mismo criterio de reintento que api/chat.js
    if (response.status === 429) {
      await sleep(500)
      response = await callProvider()
      if (response.status === 429) { await sleep(2000); response = await callProvider() }
      if (response.status === 429) {
        console.error('[tutor-paes] 429 persiste')
        return res.status(200).json({ texto: 'El Tutor PAES está saturado en este momento — probá de nuevo en unos segundos.' })
      }
    }

    // 5xx transitorios — reintentar una vez
    if (response.status === 500 || response.status === 502 || response.status === 503) {
      await sleep(500)
      response = await callProvider()
      if (response.status >= 500) {
        console.error('[tutor-paes] 5xx persiste:', response.status)
        return res.status(200).json({ texto: 'El Tutor PAES tuvo un problema momentáneo — probá de nuevo.' })
      }
    }

    if (!response.ok) {
      const errText = await response.text().catch(() => '')
      console.error('[tutor-paes] provider error', response.status, errText.slice(0, 300))
      return res.status(200).json({ texto: 'No pude consultar al Tutor PAES en este momento.' })
    }

    const data  = await response.json()
    const texto = data.choices?.[0]?.message?.content?.trim()
    return res.status(200).json({ texto: texto || 'El Tutor PAES no tuvo una respuesta esta vez.' })
  } catch (err) {
    console.error('[tutor-paes] error:', err.message)
    return res.status(200).json({ texto: 'No pude consultar al Tutor PAES en este momento.' })
  }
}
