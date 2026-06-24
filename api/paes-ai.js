// Vercel Serverless — POST /api/paes-ai
// Chat tutor PAES + definición de palabras. La key nunca sale al navegador.
// Body: { system?: string, messages: [{role,content}], mode?: 'word_def' }
// Response: { text } | { def, examples }  (mode=word_def devuelve JSON)

const CEREBRAS_URL   = 'https://api.cerebras.ai/v1/chat/completions'
const CEREBRAS_MODEL = 'gpt-oss-120b'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const key = process.env.CEREBRAS_API_KEY
  if (!key) return res.status(500).json({ error: 'Server configuration error' })

  const { system, messages, mode } = req.body || {}
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages[] required' })
  }

  const msgs = system
    ? [{ role: 'system', content: system }, ...messages]
    : messages

  try {
    const r = await fetch(CEREBRAS_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model:       CEREBRAS_MODEL,
        messages:    msgs,
        temperature: mode === 'word_def' ? 0.3 : 0.6,
        max_tokens:  mode === 'word_def' ? 300 : 700,
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
      let parsed = { def: '', examples: [] }
      try {
        const raw = content.replace(/```json|```/g, '').trim()
        parsed = JSON.parse(raw)
      } catch (_) {}
      return res.status(200).json(parsed)
    }

    return res.status(200).json({ text: content })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
