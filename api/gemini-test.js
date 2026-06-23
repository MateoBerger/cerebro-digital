// Vercel Serverless — GET /api/gemini-test
// Diagnóstico completo: key, modelo, cuota y detalle del error de Google.
// Abrir desde el browser: https://TU-APP.vercel.app/api/gemini-test

export default async function handler(req, res) {
  const key = process.env.GEMINI_API_KEY

  const diag = {
    key_present: !!key,
    key_length:  key?.length ?? 0,
    key_prefix:  key ? key.slice(0, 6) + '...' : null,
  }

  if (!key) {
    return res.status(200).json({ ...diag, error: 'GEMINI_API_KEY no está configurada en Vercel' })
  }

  const MODEL = 'gemini-2.5-flash-lite'
  const URL   = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`
  const body  = {
    contents: [{ role: 'user', parts: [{ text: 'Di solo "OK".' }] }],
    generation_config: { max_output_tokens: 5, temperature: 0 },
  }

  try {
    const response = await fetch(URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    })

    const rawText    = await response.text()
    const retryAfter = response.headers.get('retry-after') || response.headers.get('Retry-After')
    let data
    try { data = JSON.parse(rawText) } catch { data = { raw: rawText } }

    const result = {
      ...diag,
      model:        MODEL,
      http_status:  response.status,
      google_ok:    response.ok,
      retry_after:  retryAfter ?? null,
    }

    if (response.ok) {
      result.gemini_reply = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? data
      result.verdict      = 'OK — key y modelo funcionan correctamente'
    } else {
      const errMsg    = data?.error?.message || ''
      const errStatus = data?.error?.status  || ''
      const isDaily   = errMsg.toLowerCase().includes('per day') ||
                        errMsg.toLowerCase().includes('daily')   ||
                        errStatus === 'RESOURCE_EXHAUSTED'
      result.google_error  = data?.error ?? data
      result.quota_type    = response.status === 429
        ? (isDaily ? 'DAILY — cuota diaria agotada (esperar hasta 00:00 UTC)' : 'MINUTE — límite por minuto (esperar ~60 s)')
        : null
      result.verdict       = response.status === 429
        ? `RATE LIMIT (${result.quota_type})`
        : `ERROR ${response.status} — ver google_error`
    }

    return res.status(200).json(result)
  } catch (err) {
    return res.status(200).json({ ...diag, fetch_error: err.message, verdict: 'FETCH ERROR' })
  }
}
