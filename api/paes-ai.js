// Vercel Serverless — POST /api/paes-ai
// Chat tutor PAES + definición de palabras. La key nunca sale al navegador.
// Body: { system?: string, messages: [{role,content}], mode?: 'word_def' }
// Response: { text } | { def, examples }  (mode=word_def devuelve JSON)

const CEREBRAS_URL   = 'https://api.cerebras.ai/v1/chat/completions'
const CEREBRAS_MODEL = 'gpt-oss-120b'

// Reglas de formato que se inyectan en TODOS los mensajes del chat tutor.
const FORMAT_RULES = `

REGLAS DE FORMATO OBLIGATORIAS — NUNCA IGNORAR:
- PROHIBIDO: \\( \\) \\[ \\] $ $$ \\frac \\sqrt y cualquier comando LaTeX.
- PROHIBIDO: ### ## # para títulos.
- Fracciones: a/b (ej: 1/2). NUNCA \\frac{a}{b}.
- Potencias: a^n (ej: x^2). NUNCA x^{n}.
- Raíces: raiz(x) o √x. NUNCA \\sqrt{x}.
- OBLIGATORIO: Cada paso o punto en su PROPIA línea, separado por un salto de línea real (Enter).
- NUNCA pongas todos los pasos en una sola línea separados por " - " o por punto y seguido.
- Comienza cada paso con "- " seguido del contenido del paso.
- Puedes usar **negrita** para marcar palabras o conceptos clave.
- El texto resultante debe leerse bien sin ningún procesador adicional.`

// Prompt para word_def — JSON puro sin texto alrededor.
// El modelo a veces ignora la instrucción cuando la palabra tiene tildes o mayúsculas:
// se refuerza aquí y se usa un fallback a texto plano en el servidor si falla.
const WORD_DEF_SYSTEM = `Eres un asistente de vocabulario para estudiantes chilenos preparando la PAES.
INSTRUCCIÓN CRÍTICA: tu respuesta debe ser ÚNICAMENTE un objeto JSON válido. Sin texto antes. Sin texto después. Sin bloques de código (no uses \`\`\`). Sin explicaciones.
La palabra puede tener tildes, mayúsculas o ser un concepto compuesto — defínela normalmente.
Formato JSON EXACTO (comillas dobles, sin trailing comma):
{"def":"definición clara en 2-3 oraciones","examples":["oración ejemplo 1 completa","oración ejemplo 2 completa"]}`

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
      const wordHint = messages[0]?.content?.match(/"([^"]+)"/)?.[1] || '?'
      console.log('[paes-ai word_def] word:', wordHint)
      console.log('[paes-ai word_def] raw:', content.slice(0, 600))

      let parsed = { def: '', examples: [] }

      // Estrategia 1: extraer el mayor bloque {...} que haya (greedy)
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        try { parsed = JSON.parse(jsonMatch[0]) }
        catch (e) { console.error('[paes-ai word_def] s1 parse error:', e.message) }
      }

      // Estrategia 2: quitar code fences y parsear el contenido completo
      if (!parsed.def) {
        try {
          const raw = content.replace(/```json|```/g, '').trim()
          parsed = JSON.parse(raw)
        } catch (_) {}
      }

      // Estrategia 3 (fallback): el modelo devolvió texto plano — usarlo como definición
      if (!parsed.def && content.trim().length > 10) {
        console.log('[paes-ai word_def] fallback: usando texto plano como def')
        parsed = { def: content.replace(/```/g, '').trim().slice(0, 500), examples: [] }
      }

      return res.status(200).json(parsed)
    }

    return res.status(200).json({ text: content })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
