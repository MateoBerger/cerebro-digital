// Vercel Serverless — GET /api/groq-test
// Diagnóstico completo: key, modelo, llamada mínima sin tools, luego con tools.
// Abrir desde el browser: https://TU-APP.vercel.app/api/groq-test

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const MODEL    = 'llama-3.1-8b-instant'

export default async function handler(req, res) {
  const key = process.env.GROQ_API_KEY

  const diag = {
    key_present: !!key,
    key_length:  key?.length ?? 0,
    key_prefix:  key ? key.slice(0, 8) + '...' : null,
    model:       MODEL,
  }

  if (!key) {
    return res.status(200).json({ ...diag, verdict: 'ERROR: GROQ_API_KEY no configurada' })
  }

  async function callGroq(body) {
    const r = await fetch(GROQ_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body:    JSON.stringify(body),
    })
    const text = await r.text()
    let data
    try { data = JSON.parse(text) } catch { data = { raw: text } }
    return { status: r.status, ok: r.ok, data }
  }

  // ── Paso 1: llamada mínima sin tools ────────────────────────
  let step1
  try {
    const { status, ok, data } = await callGroq({
      model:    MODEL,
      messages: [
        { role: 'system',  content: 'Sos un asistente de prueba.' },
        { role: 'user',    content: 'Di solo "OK".' },
      ],
      max_tokens: 5,
      temperature: 0,
    })
    step1 = {
      http_status: status,
      ok,
      reply: ok ? data.choices?.[0]?.message?.content : null,
      error: ok ? null : data?.error || data,
    }
  } catch (err) {
    step1 = { fetch_error: err.message }
  }

  // ── Paso 2: llamada con tools simples ────────────────────────
  let step2
  try {
    const { status, ok, data } = await callGroq({
      model:    MODEL,
      messages: [
        { role: 'system', content: 'Sos un asistente de prueba.' },
        { role: 'user',   content: 'Creá una tarea llamada "test".' },
      ],
      max_tokens:  50,
      temperature: 0,
      tools: [
        {
          type: 'function',
          function: {
            name: 'add_tarea',
            description: 'Crea una tarea',
            parameters: {
              type: 'object',
              properties: {
                titulo:    { type: 'string' },
                prioridad: { type: 'string', enum: ['alta', 'media', 'baja'] },
                dia:       { type: 'integer', description: '0-6' },
                activa:    { type: 'boolean' },
              },
              required: ['titulo', 'prioridad'],
            },
          },
        },
      ],
      tool_choice: 'auto',
    })
    step2 = {
      http_status: status,
      ok,
      finish_reason: ok ? data.choices?.[0]?.finish_reason : null,
      tool_calls:    ok ? data.choices?.[0]?.message?.tool_calls : null,
      error:         ok ? null : data?.error || data,
    }
  } catch (err) {
    step2 = { fetch_error: err.message }
  }

  const verdict = step1.ok && step2.ok
    ? 'OK — key, modelo y tools funcionan'
    : step1.ok
      ? `PARCIAL — sin tools OK (${step1.http_status}), CON tools ERROR (${step2.http_status})`
      : `ERROR — sin tools falló (${step1.http_status})`

  return res.status(200).json({ ...diag, step1_sin_tools: step1, step2_con_tools: step2, verdict })
}
