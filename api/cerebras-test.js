// Vercel Serverless — GET /api/cerebras-test
// Diagnóstico: key, step1 sin tools, step2 con tools (integer + boolean).
// Abrir en browser: https://TU-APP.vercel.app/api/cerebras-test

const CEREBRAS_URL = 'https://api.cerebras.ai/v1/chat/completions'
const MODEL        = 'gpt-oss-120b'

export default async function handler(req, res) {
  const key = process.env.CEREBRAS_API_KEY

  const diag = {
    key_present: !!key,
    key_length:  key?.length ?? 0,
    key_prefix:  key ? key.slice(0, 8) + '...' : null,
    model:       MODEL,
  }

  if (!key) {
    return res.status(200).json({ ...diag, verdict: 'ERROR: CEREBRAS_API_KEY no configurada' })
  }

  async function callCerebras(body) {
    const r = await fetch(CEREBRAS_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body:    JSON.stringify(body),
    })
    const text = await r.text()
    let data
    try { data = JSON.parse(text) } catch { data = { raw: text } }
    return { status: r.status, ok: r.ok, data }
  }

  // ── Step 1: llamada mínima sin tools ────────────────────────
  let step1
  try {
    const { status, ok, data } = await callCerebras({
      model:       MODEL,
      max_tokens:  5,
      temperature: 0,
      messages: [
        { role: 'system', content: 'Sos un asistente de prueba.' },
        { role: 'user',   content: 'Di solo "OK".' },
      ],
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

  // ── Step 2: llamada con tools (integer + boolean) ────────────
  let step2
  try {
    const { status, ok, data } = await callCerebras({
      model:       MODEL,
      max_tokens:  50,
      temperature: 0,
      messages: [
        { role: 'system', content: 'Sos un asistente de prueba.' },
        { role: 'user',   content: 'Creá una tarea llamada "test" con prioridad alta, día 1, activa true.' },
      ],
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
                dia:       { type: 'integer', description: '0=Lunes … 6=Domingo' },
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
      http_status:   status,
      ok,
      finish_reason: ok ? data.choices?.[0]?.finish_reason : null,
      tool_calls:    ok ? data.choices?.[0]?.message?.tool_calls : null,
      error:         ok ? null : data?.error || data,
    }
  } catch (err) {
    step2 = { fetch_error: err.message }
  }

  const verdict = step1.ok && step2.ok
    ? 'OK — key, modelo y tools funcionan correctamente'
    : step1.ok
      ? `PARCIAL — sin tools OK (${step1.http_status}), con tools ERROR (${step2.http_status}): ${JSON.stringify(step2.error).slice(0, 200)}`
      : `ERROR — sin tools falló (${step1.http_status}): ${JSON.stringify(step1.error).slice(0, 200)}`

  return res.status(200).json({ ...diag, step1_sin_tools: step1, step2_con_tools: step2, verdict })
}
