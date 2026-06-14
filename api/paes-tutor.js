// Vercel Serverless — /api/paes-tutor
// Groq proxy for the PAES AI tutor

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const key = process.env.GROQ_API_KEY
  if (!key) return res.status(500).json({ error: 'GROQ_API_KEY no configurada' })

  const { message, systemPrompt = '', history = [] } = req.body
  if (!message) return res.status(400).json({ error: 'message requerido' })

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
          ...history,
          { role: 'user', content: message },
        ],
        temperature: 0.6,
        max_tokens: 700,
      }),
    })

    const data = await response.json()
    if (!response.ok) {
      const msg = data?.error?.message || JSON.stringify(data)
      return res.status(response.status).json({ error: msg })
    }

    res.json({ reply: data.choices?.[0]?.message?.content || 'No pude responder.' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
