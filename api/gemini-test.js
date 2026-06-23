// Vercel Serverless — GET /api/gemini-test
// Diagnóstico: verifica GEMINI_API_KEY y hace una llamada mínima a Gemini.
// Acceder desde el browser: https://TU-APP.vercel.app/api/gemini-test

export default async function handler(req, res) {
  const key = process.env.GEMINI_API_KEY

  const diag = {
    key_present: !!key,
    key_length:  key?.length ?? 0,
    key_prefix:  key ? key.slice(0, 6) + '...' : null,
  }

  if (!key) {
    return res.status(500).json({ ...diag, error: 'GEMINI_API_KEY no está configurada en Vercel' })
  }

  const MODEL = 'gemini-2.5-flash'
  const URL   = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`

  const body = {
    contents: [{ role: 'user', parts: [{ text: 'Di solo "OK".' }] }],
    generation_config: { max_output_tokens: 5, temperature: 0 },
  }

  try {
    const response = await fetch(URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    })

    const rawText = await response.text()
    let data
    try { data = JSON.parse(rawText) } catch { data = { raw: rawText } }

    return res.status(200).json({
      ...diag,
      model:          MODEL,
      http_status:    response.status,
      google_ok:      response.ok,
      google_error:   response.ok ? null : (data?.error ?? data),
      gemini_reply:   response.ok ? (data?.candidates?.[0]?.content?.parts?.[0]?.text ?? data) : null,
    })
  } catch (err) {
    return res.status(500).json({ ...diag, fetch_error: err.message })
  }
}
