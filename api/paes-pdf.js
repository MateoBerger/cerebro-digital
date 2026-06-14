// Vercel Serverless — /api/paes-pdf
// Extracts PAES questions from uploaded PDFs using Gemini

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const key = process.env.GEMINI_API_KEY
  if (!key) return res.status(500).json({ error: 'GEMINI_API_KEY no configurada' })

  const { pdfBase64, guideLabel = 'Guía' } = req.body
  if (!pdfBase64) return res.status(400).json({ error: 'pdfBase64 requerido' })

  const prompt = `Analiza este PDF de guía PAES chilena ("${guideLabel}") y extrae TODAS las preguntas de selección múltiple.
Para cada pregunta devuelve un objeto JSON con:
- stem: texto de la pregunta
- options: array de 4 alternativas (sin la letra, solo el texto)
- correct: índice 0-3 de la respuesta correcta (si está disponible, si no usa 0)
- explanation: explicación breve (si está disponible, si no usa "")
- topic: tema inferido ("comprension-lectora", "matematica-m1", "matematica-m2", "ciencias", "historia" u otro relevante)

Devuelve SOLO un JSON válido con la estructura: {"questions": [...], "count": N}
Sin texto adicional ni markdown.`

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inline_data: { mime_type: 'application/pdf', data: pdfBase64 } },
            ],
          }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 8192 },
        }),
      }
    )

    const data = await response.json()
    if (!response.ok) {
      const msg = data?.error?.message || JSON.stringify(data)
      return res.status(response.status).json({ error: msg })
    }

    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}'
    let parsed = { questions: [], count: 0 }
    try {
      const clean = raw.replace(/```json|```/g, '').trim()
      parsed = JSON.parse(clean)
    } catch (_) {}

    res.json({ questions: parsed.questions || [], count: parsed.count || (parsed.questions || []).length })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
