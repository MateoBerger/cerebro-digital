// Vercel Serverless — /api/chat
// Asistente general: tareas y calendario via Cerebras (OpenAI-compatible)
// Normaliza respuesta al formato {stop_reason, content:[...]} que consume useChat.js

const PROVIDER_URL  = 'https://api.cerebras.ai/v1/chat/completions'
const PROVIDER_MODEL = 'gpt-oss-120b'
const API_KEY_ENV    = 'CEREBRAS_API_KEY'

// Free tier ~8K tokens: 15 turnos de historial + system prompt largo ≈ 5-6K tokens
const MAX_HISTORY = 15

// ── Herramientas Google Calendar (formato OpenAI-compatible) ───
const GCAL_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'listar_eventos_calendario',
      description: 'Lista los eventos de Google Calendar en un rango de fechas. Usalo cuando Mateo pregunte qué tiene en el calendario, qué hay esta semana/hoy/mañana, etc. Siempre consultá esta herramienta antes de responder sobre el calendario.',
      parameters: {
        type: 'object',
        properties: {
          timeMin: { type: 'string', description: 'Inicio del rango ISO 8601, ej: "2025-06-22T00:00:00"' },
          timeMax: { type: 'string', description: 'Fin del rango ISO 8601, ej: "2025-06-29T23:59:59"' },
        },
        required: ['timeMin', 'timeMax'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'crear_evento_calendario',
      description: 'Crea un nuevo evento en Google Calendar',
      parameters: {
        type: 'object',
        properties: {
          titulo:      { type: 'string', description: 'Título del evento' },
          fecha:       { type: 'string', description: 'Fecha YYYY-MM-DD' },
          horaInicio:  { type: 'string', description: 'Hora de inicio HH:MM (24h)' },
          horaFin:     { type: 'string', description: 'Hora de fin HH:MM (24h)' },
          descripcion: { type: 'string', description: 'Descripción opcional' },
          tipo:        { type: 'string', enum: ['clase', 'estudio', 'paes', 'libre', 'ejercicio', 'otro'] },
        },
        required: ['titulo', 'fecha', 'horaInicio', 'horaFin'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'editar_evento_calendario',
      description: 'Edita un evento existente de Google Calendar. Solo incluí los campos que cambian; el resto se conserva. Si no tenés el eventId, primero usá listar_eventos_calendario.',
      parameters: {
        type: 'object',
        properties: {
          eventId:     { type: 'string', description: 'ID del evento (del resultado de listar_eventos_calendario)' },
          titulo:      { type: 'string', description: 'Nuevo título (omitir si no cambia)' },
          fecha:       { type: 'string', description: 'Nueva fecha YYYY-MM-DD (omitir si no cambia)' },
          horaInicio:  { type: 'string', description: 'Nueva hora inicio HH:MM (omitir si no cambia)' },
          horaFin:     { type: 'string', description: 'Nueva hora fin HH:MM (omitir si no cambia)' },
          descripcion: { type: 'string', description: 'Nueva descripción (omitir si no cambia)' },
        },
        required: ['eventId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'borrar_evento_calendario',
      description: 'Elimina un evento de Google Calendar. Confirmá con Mateo antes de borrar si hay ambigüedad.',
      parameters: {
        type: 'object',
        properties: {
          eventId: { type: 'string', description: 'ID del evento a eliminar' },
        },
        required: ['eventId'],
      },
    },
  },
]

// ── Herramientas de tareas (formato OpenAI-compatible) ─────────
const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'add_tarea',
      description: 'Crea una nueva tarea en el sistema de Mateo',
      parameters: {
        type: 'object',
        properties: {
          titulo:      { type: 'string',  description: 'Título de la tarea' },
          descripcion: { type: 'string',  description: 'Descripción opcional' },
          categoria:   { type: 'string',  enum: ['academico', 'paes', 'personal', 'sistema'] },
          prioridad:   { type: 'string',  enum: ['alta', 'media', 'baja'] },
          alcance:     { type: 'string',  enum: ['diaria', 'semanal', 'general'] },
          fecha:       { type: 'string',  description: 'Fecha de vencimiento YYYY-MM-DD (opcional)' },
        },
        required: ['titulo', 'categoria', 'prioridad', 'alcance'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'complete_tarea',
      description: 'Marca una tarea existente como completada o pendiente',
      parameters: {
        type: 'object',
        properties: {
          tarea_id:   { type: 'string',  description: 'ID de la tarea (del contexto, empieza con tarea_)' },
          completada: { type: 'boolean', description: 'true = completar, false = volver a pendiente' },
        },
        required: ['tarea_id', 'completada'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'add_bloque_calendario',
      description: 'Agrega un bloque de tiempo al calendario semanal',
      parameters: {
        type: 'object',
        properties: {
          titulo:     { type: 'string',  description: 'Nombre del bloque' },
          tipo:       { type: 'string',  enum: ['clase', 'estudio', 'paes', 'libre', 'ejercicio', 'otro'] },
          dia:        { type: 'integer', description: '0=Lunes 1=Martes 2=Miércoles 3=Jueves 4=Viernes 5=Sábado 6=Domingo' },
          horaInicio: { type: 'string',  description: 'HH:MM en formato 24 horas' },
          horaFin:    { type: 'string',  description: 'HH:MM en formato 24 horas' },
          recurrente: { type: 'boolean', description: 'true = todas las semanas, false = solo esta semana' },
        },
        required: ['titulo', 'tipo', 'dia', 'horaInicio', 'horaFin', 'recurrente'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'add_meta_diaria',
      description: 'Agrega un nuevo ítem a la lista de metas diarias básicas de Mateo',
      parameters: {
        type: 'object',
        properties: {
          label: { type: 'string', description: 'Nombre corto del ítem (ej: "Meditar 5 min", "Leer 30 min")' },
        },
        required: ['label'],
      },
    },
  },
]

// ── Conversión mensajes frontend → formato OpenAI-compatible ───
function toProviderMessages(messages) {
  const result = []
  for (const msg of messages) {
    if (typeof msg.content === 'string') {
      if (msg.content.trim()) result.push({ role: msg.role, content: msg.content })
    } else if (Array.isArray(msg.content)) {
      if (msg.role === 'assistant') {
        const textBlock  = msg.content.find(b => b.type === 'text')
        const toolBlocks = msg.content.filter(b => b.type === 'tool_use')
        const aMsg       = { role: 'assistant', content: textBlock?.text || null }
        if (toolBlocks.length) {
          aMsg.tool_calls = toolBlocks.map(b => ({
            id:   b.id,
            type: 'function',
            function: { name: b.name, arguments: JSON.stringify(b.input) },
          }))
        }
        result.push(aMsg)
      } else if (msg.role === 'user') {
        const toolResults = msg.content.filter(b => b.type === 'tool_result')
        for (const tr of toolResults) {
          result.push({
            role:         'tool',
            tool_call_id: tr.tool_use_id,
            content:      String(tr.content || tr.result || ''),
          })
        }
      }
    }
  }
  return result
}

// ── Normalización respuesta → formato interno ──────────────────
function normalizeResponse(data) {
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

function buildSystemPrompt(ctx, hasCalendar = false) {
  const DIAS = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo']
  const hoyDia    = typeof ctx.todayDia === 'number' ? ctx.todayDia : 0
  const mañanaDia = (hoyDia + 1) % 7
  const pasadoDia = (hoyDia + 2) % 7

  return `Sos el asistente personal de Mateo Berger, estudiante chileno de 4to medio que se prepara para la PAES 2026.
Podés crear tareas y bloques de calendario cuando Mateo lo pida explícitamente. El registro de ensayos PAES lo maneja el asistente especializado de la sección PAES.

Hoy es ${ctx.fecha}.
En el sistema de calendario: hoy = dia ${hoyDia} (${DIAS[hoyDia]}), mañana = dia ${mañanaDia} (${DIAS[mañanaDia]}), pasado mañana = dia ${pasadoDia} (${DIAS[pasadoDia]}).
Referencia completa: 0=Lunes 1=Martes 2=Miércoles 3=Jueves 4=Viernes 5=Sábado 6=Domingo.

# DATOS DEL SISTEMA

## Check-in de hoy
${ctx.checkin}

## Tareas pendientes
${ctx.tareas}

## Bloques internos de hoy (sistema Firestore)
${ctx.calendario}
${hasCalendar ? `
## Google Calendar
Conectado. Cuando Mateo pregunte por el calendario usá listar_eventos_calendario con el rango apropiado. No respondas "no tenés nada" sin haber consultado primero.

FLUJO PARA BORRAR O EDITAR (seguilo internamente sin explicarlo al usuario):
1. Ante "borrá X" / "editá X" / "cancelá todo": llamá listar_eventos_calendario de inmediato con el rango correcto. NO digas nada antes de llamar la herramienta.

2. Con los resultados — CONFIRMACIÓN (OBLIGATORIA, diferente según cantidad):
   - 1 evento: pedí confirmación breve. Ej: "¿Cancelo 'Inglés' del sábado 27 de 8:00 a 13:20?"
   - MÚLTIPLES eventos: listá CADA evento con título y horario ANTES de pedir confirmación:
     "¿Cancelo estos N eventos?\n- 'Título 1' — lunes 23/06 08:00–09:00\n- 'Título 2' — martes 24/06 10:00–11:00\n...\n¿Confirmar?"
     NUNCA resumás con "los N eventos de la semana" sin listar cada uno. Mostrá el listado completo.

3. Con el "sí" de Mateo:
   - 1 evento → 1 llamada a borrar_evento_calendario.
   - N eventos → N llamadas a borrar_evento_calendario en la MISMA respuesta (tool calls paralelos).
     Si hay 24 eventos para borrar, tu respuesta debe incluir exactamente 24 tool calls de borrar_evento_calendario, cada una con el eventId de ese evento.
     NUNCA borres solo 1 cuando hay que borrar N. Copiá el eventId EXACTO de cada evento del listado.

REGLAS DE IDs:
- NUNCA inventes ni construyas un eventId. Solo podés usar eventIds recibidos como resultado de listar_eventos_calendario en ese mismo turno.
- Copiá el eventId LITERAL, sin modificar ni truncar ni un carácter.
- El eventId es INTERNO. Jamás lo menciones al usuario.

DESPUÉS DE BORRAR:
- El frontend genera automáticamente el mensaje con el conteo real (ej: "Cancelé 24 de 24 eventos").
- No agregues texto de cierre; la app lo maneja sola.` : ''}
## Estado PAES (resumen)
${ctx.paes}

## Metas diarias básicas (hoy)
${ctx.metas_diarias || 'Sin metas diarias'}

# CÓMO ACTUAR

## Conversación normal (NO usar herramientas)
Respondé de forma conversacional cuando Mateo salude, pregunte algo, cuente algo o charle. Ejemplos:
- "hola", "buenas", "¿cómo estás?" → respondé con un saludo natural, quizás comentando el día o lo que tiene pendiente.
- "¿qué tengo hoy?" → ${hasCalendar ? 'usá listar_eventos_calendario para el día de hoy y respondé con lo que encuentres.' : 'respondé describiendo su agenda y tareas, sin crear nada.'}
- "¿cómo voy con la PAES?" → respondé con un resumen basado en el contexto.
- Preguntas, reflexiones, comentarios → conversá normalmente.

## Acciones con herramientas (SOLO cuando Mateo lo pide explícitamente)
Usá las herramientas ÚNICAMENTE cuando el mensaje contenga una intención clara de acción. Señales claras:
- Verbos de acción directos: "agregá", "creá", "anotá", "poneme", "marcá", "completá", "agendá"
- Pedidos explícitos: "necesito que crees...", "¿podés agregar...?", "agregame una tarea de..."
- Modificaciones concretas: "completá la tarea de X", "moveme el bloque de..."

## Si no estás seguro
Si el mensaje es ambiguo (podría ser conversación o acción), **preguntá primero**: "¿Querés que lo anote como tarea, o solo me lo estás contando?"
Nunca creés nada basándote en suposiciones.

## Estilo
- Español rioplatense (vos, tenés, hacés, etc.)
- Respuestas cortas y directas. Sin introducciones largas.
- Podés hacer preguntas, sugerir cosas y dar contexto útil.
- Los IDs de tareas del contexto (tarea_xxx) son necesarios para completarlas.`
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const key = process.env[API_KEY_ENV]
  console.log(`[chat] ${API_KEY_ENV} present:`, !!key, '| length:', key?.length ?? 0)
  if (!key) return res.status(500).json({ error: `${API_KEY_ENV} no configurada en Vercel` })

  const { messages, context, assistant_content, tool_results, gcal_token } = req.body

  // Recortar historial; asegurarse de empezar en un mensaje de usuario
  const raw          = (messages || []).slice(-MAX_HISTORY)
  const firstUserIdx = raw.findIndex(m => m.role === 'user')
  const trimmed      = firstUserIdx > 0 ? raw.slice(firstUserIdx) : raw

  let providerMessages = toProviderMessages(trimmed)

  // Continuación post-tool-use: agregar turno del modelo + resultados
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
    providerMessages.push(assistantMsg)
    for (const tr of tool_results) {
      providerMessages.push({
        role:         'tool',
        tool_call_id: tr.tool_use_id,
        content:      String(tr.result),
      })
    }
  }

  const requestBody = {
    model:       PROVIDER_MODEL,
    max_tokens:  1024,
    temperature: 0.3,
    messages: [
      { role: 'system', content: buildSystemPrompt(context, !!gcal_token) },
      ...providerMessages,
    ],
    tools:       gcal_token ? [...TOOLS, ...GCAL_TOOLS] : TOOLS,
    tool_choice: 'auto',
  }

  async function callProvider() {
    return fetch(PROVIDER_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body:    JSON.stringify(requestBody),
    })
  }

  async function readJson(r) {
    const t = await r.text()
    try { return JSON.parse(t) } catch { return { raw: t } }
  }

  async function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

  function isDailyLimit(data) {
    const msg = (data?.error?.message || '').toLowerCase()
    return msg.includes('per day') || msg.includes('daily') || (msg.includes('token') && msg.includes('limit'))
  }

  // Log estructura del payload (sin contenido sensible)
  console.log('[chat] request: model=%s | msgs=%d | tools=%d | has_tool_results=%s',
    requestBody.model,
    requestBody.messages.length,
    (requestBody.tools || []).length,
    !!(tool_results?.length)
  )
  console.log('[chat] msg roles:', requestBody.messages.map(m => m.role).join(','))

  try {
    let response = await callProvider()
    console.log('[chat] provider status:', response.status)

    // 429 — rate limit
    if (response.status === 429) {
      const data429    = await readJson(response)
      const retryAfter = response.headers.get('retry-after') || response.headers.get('Retry-After')
      console.error('[chat] 429 body:', JSON.stringify(data429).slice(0, 800), '| retry-after:', retryAfter)

      if (isDailyLimit(data429)) {
        return res.status(200).json({
          stop_reason: 'end_turn',
          content: [{ type: 'text', text: 'Se agotó la cuota diaria de la API. El servicio se restablece a las 00:00 UTC.' }],
          _diag: { quota: 'daily', error: data429?.error },
        })
      }

      await sleep(500)
      response = await callProvider()
      if (response.status === 429) { await sleep(2000); response = await callProvider() }
      if (response.status === 429) {
        const d = await readJson(response)
        console.error('[chat] 429 persists:', JSON.stringify(d).slice(0, 400))
        return res.status(200).json({
          stop_reason: 'end_turn',
          content: [{ type: 'text', text: 'Estoy un poco saturado en este momento. Esperá unos segundos y volvé a intentarlo.' }],
          _diag: { quota: 'minute', error: d?.error },
        })
      }
    }

    // 5xx transitorios — reintentar
    if (response.status === 500 || response.status === 502 || response.status === 503) {
      const snippet = (await response.text()).slice(0, 300)
      console.error(`[chat] ${response.status} transient:`, snippet)
      await sleep(500)
      response = await callProvider()
      if (response.status === 500 || response.status === 502 || response.status === 503) { await sleep(2000); response = await callProvider() }
      if (response.status === 500 || response.status === 502 || response.status === 503) {
        return res.status(200).json({
          stop_reason: 'end_turn',
          content: [{ type: 'text', text: 'Hubo un problema momentáneo. Intentá de nuevo en unos segundos.' }],
        })
      }
    }

    const data = await readJson(response)
    if (!response.ok) {
      const errMsg = data?.error?.message || data?.error?.code || JSON.stringify(data).slice(0, 400)
      console.error('[chat] provider error', response.status, JSON.stringify(data))
      return res.status(200).json({
        stop_reason: 'end_turn',
        content: [{ type: 'text', text: `⚠️ Error ${response.status}: ${errMsg}` }],
        _diag: { status: response.status, provider_error: data?.error || data },
      })
    }
    res.json(normalizeResponse(data))
  } catch (err) {
    console.error('[chat] fetch error:', err.message)
    res.status(500).json({ error: err.message })
  }
}
