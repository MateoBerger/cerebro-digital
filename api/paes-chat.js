// Vercel Serverless — /api/paes-chat
// Asistente PAES: Groq (texto) o Gemini (cuando hay archivo adjunto)
// Normaliza respuesta al formato {stop_reason, content:[...]} que consume usePaesChat.js

// ── Herramientas PAES en formato Gemini (para conversaciones con archivo) ──
const TOOLS_GEMINI = [
  {
    name: 'registrar_ensayo',
    description: 'Registra un ensayo PAES ya revisado con su puntaje y temas en que se equivocó',
    parameters: {
      type: 'OBJECT',
      properties: {
        tipo:         { type: 'STRING', enum: ['mini', 'ensayo_completo', 'practica'] },
        materia:      { type: 'STRING', enum: ['cl', 'm1', 'm2', 'ciencias', 'mixto'], description: 'Materia del ensayo' },
        correctas:    { type: 'INTEGER', description: 'Cantidad de preguntas correctas' },
        total:        { type: 'INTEGER', description: 'Total de preguntas del ensayo' },
        puntaje:      { type: 'INTEGER', description: 'Puntaje estimado PAES (150-1000)' },
        temas_errados: { type: 'STRING', description: 'Temas con errores separados por coma, ej: álgebra,funciones,lectura crítica' },
        observaciones: { type: 'STRING', description: 'Observaciones adicionales del ensayo' },
      },
      required: ['tipo', 'materia', 'correctas', 'total'],
    },
  },
  {
    name: 'registrar_error',
    description: 'Registra un error o debilidad identificada en un tema específico',
    parameters: {
      type: 'OBJECT',
      properties: {
        materia:     { type: 'STRING', enum: ['cl', 'm1', 'm2', 'ciencias'] },
        tema:        { type: 'STRING', description: 'Tema o subtema específico donde se cometió el error' },
        descripcion: { type: 'STRING', description: 'Descripción del error o patrón de error' },
        prioridad:   { type: 'STRING', enum: ['alta', 'media', 'baja'], description: 'Prioridad de trabajo en este tema' },
      },
      required: ['materia', 'tema', 'descripcion', 'prioridad'],
    },
  },
  {
    name: 'actualizar_perfil_paes',
    description: 'Actualiza el perfil PAES de Mateo: nivel, puntaje estimado por materia y áreas débiles',
    parameters: {
      type: 'OBJECT',
      properties: {
        nivel:          { type: 'STRING', enum: ['inicial', 'intermedio', 'avanzado'] },
        puntaje_cl:     { type: 'INTEGER', description: 'Puntaje estimado en Comprensión Lectora (150-1000)' },
        puntaje_m1:     { type: 'INTEGER', description: 'Puntaje estimado en Matemática M1 (150-1000)' },
        puntaje_m2:     { type: 'INTEGER', description: 'Puntaje estimado en Matemática M2 (150-1000)' },
        puntaje_ciencias: { type: 'INTEGER', description: 'Puntaje estimado en Ciencias (150-1000)' },
        areas_debiles_cl:  { type: 'STRING', description: 'Áreas débiles CL separadas por coma' },
        areas_debiles_m1:  { type: 'STRING', description: 'Áreas débiles M1 separadas por coma' },
        areas_debiles_m2:  { type: 'STRING', description: 'Áreas débiles M2 separadas por coma' },
        areas_debiles_ciencias: { type: 'STRING', description: 'Áreas débiles Ciencias separadas por coma' },
        dificultad:     { type: 'STRING', enum: ['facil', 'media', 'dificil', 'mixta'], description: 'Dificultad calibrada para ejercicios' },
        tendencias:     { type: 'STRING', description: 'Observación sobre las tendencias de error de Mateo' },
      },
    },
  },
  {
    name: 'guardar_ejercicio',
    description: 'Guarda un ejercicio PAES generado por el asistente para que Mateo lo practique',
    parameters: {
      type: 'OBJECT',
      properties: {
        materia:    { type: 'STRING', enum: ['cl', 'm1', 'm2', 'ciencias'] },
        tema:       { type: 'STRING', description: 'Tema del ejercicio' },
        dificultad: { type: 'STRING', enum: ['facil', 'media', 'dificil'] },
        enunciado:  { type: 'STRING', description: 'Enunciado completo del ejercicio' },
        opciones:   { type: 'STRING', description: 'Opciones A, B, C, D separadas por | (ej: A) opción|B) opción|C) opción|D) opción)' },
        correcta:   { type: 'INTEGER', description: 'Índice de la opción correcta (0=A, 1=B, 2=C, 3=D)' },
        explicacion: { type: 'STRING', description: 'Explicación de por qué la respuesta es correcta' },
      },
      required: ['materia', 'tema', 'dificultad', 'enunciado', 'opciones', 'correcta', 'explicacion'],
    },
  },
]

// ── Herramientas PAES en formato OpenAI/Groq (texto sin archivo) ──
const TOOLS_GROQ = [
  {
    type: 'function',
    function: {
      name: 'registrar_ensayo',
      description: 'Registra un ensayo PAES ya revisado con su puntaje y temas en que se equivocó',
      parameters: {
        type: 'object',
        properties: {
          tipo:         { type: 'string', enum: ['mini', 'ensayo_completo', 'practica'] },
          materia:      { type: 'string', enum: ['cl', 'm1', 'm2', 'ciencias', 'mixto'] },
          correctas:    { type: 'integer', description: 'Cantidad de preguntas correctas' },
          total:        { type: 'integer', description: 'Total de preguntas del ensayo' },
          puntaje:      { type: 'integer', description: 'Puntaje estimado PAES (150-1000)' },
          temas_errados: { type: 'string', description: 'Temas con errores separados por coma' },
          observaciones: { type: 'string', description: 'Observaciones adicionales' },
        },
        required: ['tipo', 'materia', 'correctas', 'total'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'registrar_error',
      description: 'Registra un error o debilidad identificada en un tema específico',
      parameters: {
        type: 'object',
        properties: {
          materia:     { type: 'string', enum: ['cl', 'm1', 'm2', 'ciencias'] },
          tema:        { type: 'string', description: 'Tema o subtema específico' },
          descripcion: { type: 'string', description: 'Descripción del error o patrón' },
          prioridad:   { type: 'string', enum: ['alta', 'media', 'baja'] },
        },
        required: ['materia', 'tema', 'descripcion', 'prioridad'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'actualizar_perfil_paes',
      description: 'Actualiza el perfil PAES de Mateo: nivel, puntaje estimado por materia y áreas débiles',
      parameters: {
        type: 'object',
        properties: {
          nivel:          { type: 'string', enum: ['inicial', 'intermedio', 'avanzado'] },
          puntaje_cl:     { type: 'integer' },
          puntaje_m1:     { type: 'integer' },
          puntaje_m2:     { type: 'integer' },
          puntaje_ciencias: { type: 'integer' },
          areas_debiles_cl:  { type: 'string' },
          areas_debiles_m1:  { type: 'string' },
          areas_debiles_m2:  { type: 'string' },
          areas_debiles_ciencias: { type: 'string' },
          dificultad:     { type: 'string', enum: ['facil', 'media', 'dificil', 'mixta'] },
          tendencias:     { type: 'string' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'guardar_ejercicio',
      description: 'Guarda un ejercicio PAES generado por el asistente para que Mateo lo practique',
      parameters: {
        type: 'object',
        properties: {
          materia:    { type: 'string', enum: ['cl', 'm1', 'm2', 'ciencias'] },
          tema:       { type: 'string' },
          dificultad: { type: 'string', enum: ['facil', 'media', 'dificil'] },
          enunciado:  { type: 'string' },
          opciones:   { type: 'string', description: 'Opciones A, B, C, D separadas por |' },
          correcta:   { type: 'integer', description: 'Índice 0=A, 1=B, 2=C, 3=D' },
          explicacion: { type: 'string' },
        },
        required: ['materia', 'tema', 'dificultad', 'enunciado', 'opciones', 'correcta', 'explicacion'],
      },
    },
  },
]

function buildSystemPrompt(ctx) {
  return `Sos el asistente PAES de Mateo Berger, especializado exclusivamente en preparación para la PAES 2026 chilena.
Tenés acceso a herramientas para registrar ensayos, errores, actualizar su perfil y guardar ejercicios.

Hoy es ${ctx.fecha}.

# PERFIL DE MATEO

## Stats generales
${ctx.stats}

## Perfil PAES calibrado
${ctx.perfil}

## Errores pendientes de reforzar
${ctx.errores}

## Historial reciente (últimos 5 ensayos)
${ctx.historial}

# CÓMO ACTUAR
- Español rioplatense (vos, tenés, etc.)
- Tu única área de expertise es la PAES: CL, M1, M2 y Ciencias.
- Si Mateo sube un PDF o imagen de un ensayo, leelo y extraé: puntaje, temas con errores, observaciones.
- Podés generar ejercicios calibrados a su nivel y debilidades. Usá la herramienta guardar_ejercicio para guardarlos.
- Después de registrar un ensayo, actualizá el perfil con actualizar_perfil_paes si detectás cambios en su nivel o áreas débiles.
- Sé directo: señalá debilidades sin vueltas, pero con foco en mejora.
- Para contenidos PAES: explicaciones claras, con ejemplos concretos del tipo de pregunta que aparece.
- Calibrá dificultad: si sus ensayos muestran buen nivel en un área, subí la dificultad de los ejercicios.`
}

// ── Detectar si algún mensaje contiene un archivo (imagen/PDF) ──
function hasFile(messages) {
  return (messages || []).some(m =>
    (m.parts || []).some(p => p.inlineData || p.inline_data)
  )
}

// ── Convertir mensajes Gemini-format → Groq format ─────────────
function geminiToGroqMessages(messages) {
  const result  = []
  let callCounter = 0
  let lastFcIds = {}  // name → id, para emparejar functionResponse con functionCall

  for (const m of messages) {
    if (m.role === 'user') {
      const textParts = (m.parts || []).filter(p => p.text)
      const frParts   = (m.parts || []).filter(p => p.functionResponse)

      if (frParts.length) {
        for (const p of frParts) {
          const name   = p.functionResponse.name
          const callId = lastFcIds[name] || `call_${callCounter++}_${name}`
          result.push({
            role:         'tool',
            tool_call_id: callId,
            content:      String(p.functionResponse.response?.result || ''),
          })
        }
      } else if (textParts.length) {
        const text = textParts.map(p => p.text).join('')
        if (text.trim()) result.push({ role: 'user', content: text })
      }
    } else if (m.role === 'model') {
      const textParts = (m.parts || []).filter(p => p.text)
      const fcParts   = (m.parts || []).filter(p => p.functionCall)

      if (fcParts.length) {
        lastFcIds = {}
        const tool_calls = fcParts.map(p => {
          const id = `call_${callCounter++}_${p.functionCall.name}`
          lastFcIds[p.functionCall.name] = id
          return {
            id,
            type:     'function',
            function: { name: p.functionCall.name, arguments: JSON.stringify(p.functionCall.args || {}) },
          }
        })
        result.push({
          role:       'assistant',
          content:    textParts.map(p => p.text).join('') || null,
          tool_calls,
        })
      } else if (textParts.length) {
        const text = textParts.map(p => p.text).join('')
        if (text.trim()) result.push({ role: 'assistant', content: text })
      }
    }
  }
  return result
}

// ── Normalización respuesta Groq → formato interno ─────────────
function normalizeGroqResponse(data) {
  const choice = data.choices?.[0]
  if (!choice) return { stop_reason: 'end_turn', content: [{ type: 'text', text: 'Sin respuesta del modelo.' }] }

  const msg          = choice.message
  const finishReason = choice.finish_reason

  if (finishReason === 'tool_calls' && msg.tool_calls?.length) {
    const content = []
    if (msg.content) content.push({ type: 'text', text: msg.content })
    for (const tc of msg.tool_calls) {
      let input = {}
      try { input = JSON.parse(tc.function.arguments) } catch (_) {}
      content.push({ type: 'tool_use', id: tc.id, name: tc.function.name, input })
    }
    return { stop_reason: 'tool_use', content }
  }

  return { stop_reason: 'end_turn', content: [{ type: 'text', text: msg.content || '' }] }
}

// ── Normalización respuesta Gemini → formato interno ───────────
function normalizeGeminiResponse(data) {
  const candidate = data.candidates?.[0]
  if (!candidate) {
    return { stop_reason: 'end_turn', content: [{ type: 'text', text: 'Sin respuesta del modelo.' }] }
  }

  const parts     = candidate.content?.parts || []
  const content   = []
  let hasTool     = false
  let idCounter   = 0

  for (const part of parts) {
    if (part.thought) continue
    if (part.functionCall) {
      hasTool = true
      content.push({
        type:  'tool_use',
        id:    `gemini-${Date.now()}-${idCounter++}`,
        name:  part.functionCall.name,
        input: part.functionCall.args || {},
      })
    } else if (part.text) {
      content.push({ type: 'text', text: part.text })
    }
  }

  if (!content.length) content.push({ type: 'text', text: '' })

  return { stop_reason: hasTool ? 'tool_use' : 'end_turn', content }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { messages, context, assistant_content, tool_results } = req.body

  async function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }
  async function readJson(r) {
    const t = await r.text()
    try { return JSON.parse(t) } catch { return { raw: t } }
  }

  // ── Ruta GROQ: sin archivo adjunto ──────────────────────────
  if (!hasFile(messages)) {
    const groqKey = process.env.GROQ_API_KEY
    console.log('[paes-chat] GROQ path | GROQ_API_KEY present:', !!groqKey, '| length:', groqKey?.length ?? 0)
    if (!groqKey) return res.status(500).json({ error: 'GROQ_API_KEY no configurada en Vercel' })

    let groqMessages = geminiToGroqMessages(messages || [])

    if (assistant_content && tool_results?.length) {
      const textBlock  = assistant_content.find(b => b.type === 'text')
      const toolBlocks = assistant_content.filter(b => b.type === 'tool_use')
      const assistantMsg = { role: 'assistant', content: textBlock?.text || null }
      if (toolBlocks.length) {
        assistantMsg.tool_calls = toolBlocks.map(b => ({
          id:   b.id,
          type: 'function',
          function: { name: b.name, arguments: JSON.stringify(b.input) },
        }))
      }
      groqMessages.push(assistantMsg)
      for (const tr of tool_results) {
        groqMessages.push({
          role:         'tool',
          tool_call_id: tr.tool_use_id,
          content:      String(tr.result),
        })
      }
    }

    const groqBody = {
      model:       'llama-3.1-8b-instant',
      max_tokens:  2048,
      temperature: 0.4,
      messages: [
        { role: 'system', content: buildSystemPrompt(context) },
        ...groqMessages,
      ],
      tools:       TOOLS_GROQ,
      tool_choice: 'auto',
    }

    async function callGroq() {
      return fetch('https://api.groq.com/openai/v1/chat/completions', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${groqKey}` },
        body:    JSON.stringify(groqBody),
      })
    }

    function isDailyLimit(data) {
      const msg = (data?.error?.message || '').toLowerCase()
      return msg.includes('per day') || msg.includes('daily') || (msg.includes('token') && msg.includes('limit'))
    }

    try {
      let response = await callGroq()
      console.log('[paes-chat] Groq status:', response.status)

      if (response.status === 429) {
        const data429 = await readJson(response)
        console.error('[paes-chat] 429 body:', JSON.stringify(data429).slice(0, 600))
        if (isDailyLimit(data429)) {
          return res.status(200).json({
            stop_reason: 'end_turn',
            content: [{ type: 'text', text: 'Se agotó la cuota diaria de la API. El servicio se restablece a las 00:00 UTC.' }],
          })
        }
        await sleep(500); response = await callGroq()
        if (response.status === 429) { await sleep(2000); response = await callGroq() }
        if (response.status === 429) {
          return res.status(200).json({
            stop_reason: 'end_turn',
            content: [{ type: 'text', text: 'Estoy un poco saturado en este momento. Esperá unos segundos y volvé a intentarlo.' }],
          })
        }
      }

      if (response.status === 500 || response.status === 502 || response.status === 503) {
        const snippet = (await response.text()).slice(0, 300)
        console.error(`[paes-chat] ${response.status} transient:`, snippet)
        await sleep(500); response = await callGroq()
        if (response.status === 500 || response.status === 502 || response.status === 503) { await sleep(2000); response = await callGroq() }
        if (response.status === 500 || response.status === 502 || response.status === 503) {
          return res.status(200).json({
            stop_reason: 'end_turn',
            content: [{ type: 'text', text: 'Hubo un problema momentáneo. Intentá de nuevo en unos segundos.' }],
          })
        }
      }

      const data = await readJson(response)
      if (!response.ok) {
        console.error('[paes-chat] Groq error', response.status, JSON.stringify(data).slice(0, 600))
        return res.status(response.status).json({ error: `Groq ${response.status}`, groq_error: data?.error || data })
      }
      return res.json(normalizeGroqResponse(data))
    } catch (err) {
      console.error('[paes-chat] Groq fetch error:', err.message)
      return res.status(500).json({ error: err.message })
    }
  }

  // ── Ruta GEMINI: hay archivo adjunto (imagen/PDF) ────────────
  const geminiKey = process.env.GEMINI_API_KEY
  console.log('[paes-chat] Gemini path | GEMINI_API_KEY present:', !!geminiKey, '| length:', geminiKey?.length ?? 0)
  if (!geminiKey) return res.status(500).json({ error: 'GEMINI_API_KEY no configurada en Vercel' })

  let contents = [...(messages || [])]

  if (assistant_content && tool_results?.length) {
    const modelParts = []
    for (const block of assistant_content) {
      if (block.type === 'text' && block.text) modelParts.push({ text: block.text })
      else if (block.type === 'tool_use') modelParts.push({ functionCall: { name: block.name, args: block.input } })
    }
    if (modelParts.length) contents.push({ role: 'model', parts: modelParts })

    const userParts = []
    for (const tr of tool_results) {
      userParts.push({
        functionResponse: { name: tr.name, response: { result: String(tr.result) } },
      })
    }
    if (userParts.length) contents.push({ role: 'user', parts: userParts })
  }

  const geminiBody = {
    system_instruction: { parts: [{ text: buildSystemPrompt(context) }] },
    contents,
    tools:       [{ function_declarations: TOOLS_GEMINI }],
    tool_config: { function_calling_config: { mode: 'AUTO' } },
    generation_config: { max_output_tokens: 2048, temperature: 0.4 },
  }

  const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${geminiKey}`

  async function callGemini() {
    return fetch(GEMINI_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(geminiBody),
    })
  }

  try {
    let response = await callGemini()
    console.log('[paes-chat] Gemini status:', response.status)

    if (response.status === 429) {
      await sleep(500); response = await callGemini()
      if (response.status === 429) { await sleep(2000); response = await callGemini() }
      if (response.status === 429) {
        return res.status(200).json({
          stop_reason: 'end_turn',
          content: [{ type: 'text', text: 'Estoy un poco saturado en este momento. Esperá unos segundos y volvé a intentarlo.' }],
        })
      }
    }

    if (response.status === 500 || response.status === 502 || response.status === 503) {
      const snippet = (await response.text()).slice(0, 300)
      console.error(`[paes-chat] Gemini ${response.status}:`, snippet)
      await sleep(500); response = await callGemini()
      if (response.status === 500 || response.status === 502 || response.status === 503) { await sleep(2000); response = await callGemini() }
      if (response.status === 500 || response.status === 502 || response.status === 503) {
        return res.status(200).json({
          stop_reason: 'end_turn',
          content: [{ type: 'text', text: 'Hubo un problema momentáneo. Intentá de nuevo en unos segundos.' }],
        })
      }
    }

    const data = await readJson(response)
    if (!response.ok) {
      console.error('[paes-chat] Gemini error', response.status, JSON.stringify(data).slice(0, 600))
      return res.status(response.status).json({ error: `Google ${response.status}`, google_error: data?.error || data })
    }
    return res.json(normalizeGeminiResponse(data))
  } catch (err) {
    console.error('[paes-chat] Gemini fetch error:', err.message)
    return res.status(500).json({ error: err.message })
  }
}
