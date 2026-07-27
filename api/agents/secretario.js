// Vercel Serverless — POST /api/agents/secretario
// Especialista "Secretario" del sistema multiagente: organiza y planifica el día
// de Mateo. Es un CONSULTOR, no un ejecutor — no tiene tools propias, no toca
// Firestore ni Calendar, no tiene loop de tool-use. Solo devuelve texto.
//
// Lo llama el Supervisor (api/chat.js) vía la tool consultar_secretario, ejecutada
// en useChat.js. El Supervisor decide qué contexto pasarle; este endpoint no busca
// datos por su cuenta.
//
// Body: { pregunta: string, contexto?: string }
// Response: { texto }

import { callCerebras } from './_shared.js'

const SYSTEM_PROMPT = `Eres el Secretario de Mateo. Organizás y planificás su día: revisás su calendario y tareas, detectás conflictos de agenda (cosas que chocan o se enciman), huecos de tiempo, y sobrecarga. Proponés un orden/plan realista para el día. Tenés en cuenta que estudia para la PAES. Respondé conciso y accionable.

No ejecutás acciones vos mismo — no creás ni movés tareas, bloques ni eventos. Si te parece que hace falta reordenar algo o crear un bloque, proponelo dentro de tu respuesta como sugerencia en texto; quien decide si hacerlo y lo ejecuta es el asistente que te consultó, no vos.`

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!process.env.CEREBRAS_API_KEY) return res.status(500).json({ error: 'CEREBRAS_API_KEY no configurada en Vercel' })

  const { pregunta, contexto } = req.body || {}
  if (!pregunta) return res.status(400).json({ error: 'pregunta requerida' })

  const userContent = contexto
    ? `Contexto de agenda de Mateo:\n${contexto}\n\nPregunta del asistente: ${pregunta}`
    : pregunta

  try {
    const { texto, reason } = await callCerebras({
      systemPrompt: SYSTEM_PROMPT, userContent,
      maxTokens: 500, temperature: 0.4, agentName: 'secretario',
    })
    if (texto) return res.status(200).json({ texto })

    const fallback = reason === 'rate_limit'
      ? 'El Secretario está saturado en este momento — probá de nuevo en unos segundos.'
      : reason === 'server_error'
      ? 'El Secretario tuvo un problema momentáneo — probá de nuevo.'
      : 'El Secretario no tuvo una respuesta esta vez.'
    return res.status(200).json({ texto: fallback })
  } catch (err) {
    console.error('[secretario] error:', err.message)
    return res.status(200).json({ texto: 'No pude consultar al Secretario en este momento.' })
  }
}
