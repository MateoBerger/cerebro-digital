// Vercel Serverless — POST /api/paes-ai
// Chat tutor PAES + definición de palabras. La key nunca sale al navegador.
// Body: { system?: string, messages: [{role,content}], mode?: 'word_def' }
// Response: { text } | { def, examples }  (mode=word_def devuelve JSON)

const CEREBRAS_URL   = 'https://api.cerebras.ai/v1/chat/completions'
const CEREBRAS_MODEL = 'gpt-oss-120b'

// Reglas de formato que se inyectan en TODOS los mensajes del chat tutor.
// Van al final del system prompt para que el modelo no las olvide.
const FORMAT_RULES = `

REGLAS DE FORMATO OBLIGATORIAS — NUNCA IGNORAR:
- Responde SIEMPRE en texto plano, nunca uses LaTeX ni Markdown.
- PROHIBIDO: \\( \\) \\[ \\] $ $$ \\frac \\sqrt \\cdot \\times \\alpha \\beta (ni cualquier comando LaTeX).
- PROHIBIDO: ### ## # para títulos, ** __ * _ para negrita/cursiva.
- Fracciones: escribe a/b (ej: 1/2, 3/4). NUNCA \\frac{a}{b}.
- Potencias: escribe a^n (ej: x^2, 2^10). NUNCA x^{n}.
- Raíces: escribe raiz(x) o √x. NUNCA \\sqrt{x}.
- Explica PASO A PASO, con un salto de línea entre cada paso.
- Usa viñetas simples "- " al inicio de línea si necesitas listar.
- Todo el texto debe ser legible sin ningún procesador de Markdown.`

// Prompt system para word_def — pide JSON puro sin texto alrededor.
const WORD_DEF_SYSTEM = `Eres un asistente de vocabulario para estudiantes chilenos de enseñanza media.
Cuando el usuario pida definir una palabra, responde ÚNICAMENTE con un objeto JSON válido, sin texto antes ni después, sin bloques de código, sin comillas extra. Formato exacto:
{"def":"definición clara en 2-3 oraciones","examples":["oración ejemplo 1","oración ejemplo 2"]}`

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const key = process.env.CEREBRAS_API_KEY
  if (!key) return res.status(500).json({ error: 'Server configuration error' })

  const { system, messages, mode } = req.body || {}
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages[] required' })
  }

  let msgs
  if (mode === 'word_def') {
    msgs = [{ role: 'system', content: WORD_DEF_SYSTEM }, ...messages]
  } else {
    // Inyectar reglas de formato al final del system prompt del tutor
    const sysContent = system ? system + FORMAT_RULES : FORMAT_RULES.trim()
    msgs = [{ role: 'system', content: sysContent }, ...messages]
  }

  try {
    const r = await fetch(CEREBRAS_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model:       CEREBRAS_MODEL,
        messages:    msgs,
        temperature: mode === 'word_def' ? 0.2 : 0.5,
        max_tokens:  mode === 'word_def' ? 350 : 800,
      }),
    })

    if (r.status === 429) {
      return res.status(429).json({ error: 'rate_limit' })
    }
    if (!r.ok) {
      const err = await r.text().catch(() => '')
      return res.status(r.status).json({ error: `AI error ${r.status}`, detail: err.slice(0, 200) })
    }

    const data = await r.json()
    const content = data.choices?.[0]?.message?.content || ''

    if (mode === 'word_def') {
      console.log('[paes-ai word_def] raw content:', content.slice(0, 500))
      let parsed = { def: '', examples: [] }
      try {
        // Extrae el primer objeto JSON que aparezca, tolerando texto alrededor
        const jsonMatch = content.match(/\{[\s\S]*?\}(?=\s*$)/) || content.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0])
        } else {
          // Último recurso: quitar código y parsear directo
          const raw = content.replace(/```json|```/g, '').trim()
          parsed = JSON.parse(raw)
        }
      } catch (e) {
        console.error('[paes-ai word_def] JSON parse error:', e.message, '| raw:', content.slice(0, 200))
      }
      return res.status(200).json(parsed)
    }

    return res.status(200).json({ text: content })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
