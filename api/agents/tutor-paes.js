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

import { callCerebras } from './_shared.js'

const SYSTEM_PROMPT = `Eres el Tutor PAES de Mateo, experto en la PAES chilena. Tu trabajo es analizar su progreso, detectar debilidades por materia (M1, M2, Competencia Lectora, Ciencias) y proponer práctica concreta (mini-ensayos, ejercicios, repasos). Conoces su meta: 915 puntos. Responde conciso y accionable.

No ejecutás nada vos mismo — no creás tareas, ensayos ni eventos. Si te parece que hace falta una acción concreta (agendar un mini-ensayo, crear una tarea de repaso), proponela dentro de tu respuesta como sugerencia en texto; quien decide si hacerla y la ejecuta es el asistente que te consultó, no vos.`

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!process.env.CEREBRAS_API_KEY) return res.status(500).json({ error: 'CEREBRAS_API_KEY no configurada en Vercel' })

  const { pregunta, contexto } = req.body || {}
  if (!pregunta) return res.status(400).json({ error: 'pregunta requerida' })

  const userContent = contexto
    ? `Contexto PAES de Mateo:\n${contexto}\n\nPregunta del asistente: ${pregunta}`
    : pregunta

  try {
    const { texto, reason } = await callCerebras({
      systemPrompt: SYSTEM_PROMPT, userContent,
      maxTokens: 500, temperature: 0.4, agentName: 'tutor-paes',
    })
    if (texto) return res.status(200).json({ texto })

    const fallback = reason === 'rate_limit'
      ? 'El Tutor PAES está saturado en este momento — probá de nuevo en unos segundos.'
      : reason === 'server_error'
      ? 'El Tutor PAES tuvo un problema momentáneo — probá de nuevo.'
      : 'El Tutor PAES no tuvo una respuesta esta vez.'
    return res.status(200).json({ texto: fallback })
  } catch (err) {
    console.error('[tutor-paes] error:', err.message)
    return res.status(200).json({ texto: 'No pude consultar al Tutor PAES en este momento.' })
  }
}
