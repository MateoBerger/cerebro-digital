// Vercel Serverless — /api/chat
// Asistente general: tareas y calendario via Gemini (gemini-2.5-flash)
// Normaliza respuesta al formato {stop_reason, content:[...]} que consume useChat.js

const MAX_HISTORY = 20  // últimos N mensajes del historial de conversación

// ── Declaraciones de herramientas (formato Gemini) ──────────────
const GCAL_TOOL_DECLS = [
  {
    name: 'listar_eventos_calendario',
    description: 'Lista los eventos de Google Calendar en un rango de fechas. Usalo cuando Mateo pregunte qué tiene en el calendario, qué hay esta semana/hoy/mañana, etc. Siempre consultá esta herramienta antes de responder sobre el calendario.',
    parameters: {
      type: 'OBJECT',
      properties: {
        timeMin: { type: 'STRING', description: 'Inicio del rango ISO 8601, ej: "2025-06-22T00:00:00"' },
        timeMax: { type: 'STRING', description: 'Fin del rango ISO 8601, ej: "2025-06-29T23:59:59"' },
      },
      required: ['timeMin', 'timeMax'],
    },
  },
  {
    name: 'crear_evento_calendario',
    description: 'Crea un nuevo evento en Google Calendar',
    parameters: {
      type: 'OBJECT',
      properties: {
        titulo:      { type: 'STRING', description: 'Título del evento' },
        fecha:       { type: 'STRING', description: 'Fecha YYYY-MM-DD' },
        horaInicio:  { type: 'STRING', description: 'Hora de inicio HH:MM (24h)' },
        horaFin:     { type: 'STRING', description: 'Hora de fin HH:MM (24h)' },
        descripcion: { type: 'STRING', description: 'Descripción opcional' },
        tipo:        { type: 'STRING', enum: ['clase', 'estudio', 'paes', 'libre', 'ejercicio', 'otro'] },
      },
      required: ['titulo', 'fecha', 'horaInicio', 'horaFin'],
    },
  },
  {
    name: 'editar_evento_calendario',
    description: 'Edita un evento existente de Google Calendar. Solo incluí los campos que cambian; el resto se conserva. Si no tenés el eventId, primero usá listar_eventos_calendario.',
    parameters: {
      type: 'OBJECT',
      properties: {
        eventId:     { type: 'STRING', description: 'ID del evento (del resultado de listar_eventos_calendario)' },
        titulo:      { type: 'STRING', description: 'Nuevo título (omitir si no cambia)' },
        fecha:       { type: 'STRING', description: 'Nueva fecha YYYY-MM-DD (omitir si no cambia)' },
        horaInicio:  { type: 'STRING', description: 'Nueva hora inicio HH:MM (omitir si no cambia)' },
        horaFin:     { type: 'STRING', description: 'Nueva hora fin HH:MM (omitir si no cambia)' },
        descripcion: { type: 'STRING', description: 'Nueva descripción (omitir si no cambia)' },
      },
      required: ['eventId'],
    },
  },
  {
    name: 'borrar_evento_calendario',
    description: 'Elimina un evento de Google Calendar. Confirmá con Mateo antes de borrar si hay ambigüedad.',
    parameters: {
      type: 'OBJECT',
      properties: {
        eventId: { type: 'STRING', description: 'ID del evento a eliminar' },
      },
      required: ['eventId'],
    },
  },
]

const TASK_TOOL_DECLS = [
  {
    name: 'add_tarea',
    description: 'Crea una nueva tarea en el sistema de Mateo',
    parameters: {
      type: 'OBJECT',
      properties: {
        titulo:      { type: 'STRING',  description: 'Título de la tarea' },
        descripcion: { type: 'STRING',  description: 'Descripción opcional' },
        categoria:   { type: 'STRING',  enum: ['academico', 'paes', 'personal', 'sistema'] },
        prioridad:   { type: 'STRING',  enum: ['alta', 'media', 'baja'] },
        alcance:     { type: 'STRING',  enum: ['diaria', 'semanal', 'general'] },
        fecha:       { type: 'STRING',  description: 'Fecha de vencimiento YYYY-MM-DD (opcional)' },
      },
      required: ['titulo', 'categoria', 'prioridad', 'alcance'],
    },
  },
  {
    name: 'complete_tarea',
    description: 'Marca una tarea existente como completada o pendiente',
    parameters: {
      type: 'OBJECT',
      properties: {
        tarea_id:   { type: 'STRING',  description: 'ID de la tarea (del contexto, empieza con tarea_)' },
        completada: { type: 'BOOLEAN', description: 'true = completar, false = volver a pendiente' },
      },
      required: ['tarea_id', 'completada'],
    },
  },
  {
    name: 'add_bloque_calendario',
    description: 'Agrega un bloque de tiempo al calendario semanal',
    parameters: {
      type: 'OBJECT',
      properties: {
        titulo:     { type: 'STRING',  description: 'Nombre del bloque' },
        tipo:       { type: 'STRING',  enum: ['clase', 'estudio', 'paes', 'libre', 'ejercicio', 'otro'] },
        dia:        { type: 'INTEGER', description: '0=Lunes 1=Martes 2=Miércoles 3=Jueves 4=Viernes 5=Sábado 6=Domingo' },
        horaInicio: { type: 'STRING',  description: 'HH:MM en formato 24 horas' },
        horaFin:    { type: 'STRING',  description: 'HH:MM en formato 24 horas' },
        recurrente: { type: 'BOOLEAN', description: 'true = todas las semanas, false = solo esta semana' },
      },
      required: ['titulo', 'tipo', 'dia', 'horaInicio', 'horaFin', 'recurrente'],
    },
  },
  {
    name: 'add_meta_diaria',
    description: 'Agrega un nuevo ítem a la lista de metas diarias básicas de Mateo',
    parameters: {
      type: 'OBJECT',
      properties: {
        label: { type: 'STRING', description: 'Nombre corto del ítem (ej: "Meditar 5 min", "Leer 30 min")' },
      },
      required: ['label'],
    },
  },
]

// ── Conversión mensajes frontend → Gemini contents ─────────────
// Los mensajes en apiMsgsRef usan el formato interno con bloques tool_use/tool_result.
// Gemini espera contents con roles 'user'/'model' y parts con functionCall/functionResponse.
function toGeminiContents(messages) {
  // Construir mapa tool_use_id → nombre de función (para functionResponse)
  const toolIdToName = {}
  for (const msg of messages) {
    if (msg.role === 'assistant' && Array.isArray(msg.content)) {
      for (const b of msg.content) {
        if (b.type === 'tool_use' && b.id && b.name) toolIdToName[b.id] = b.name
      }
    }
  }

  const contents = []
  for (const msg of messages) {
    if (typeof msg.content === 'string') {
      if (!msg.content.trim()) continue
      const role = msg.role === 'assistant' ? 'model' : 'user'
      contents.push({ role, parts: [{ text: msg.content }] })
    } else if (Array.isArray(msg.content)) {
      if (msg.role === 'assistant') {
        const parts = []
        for (const b of msg.content) {
          if (b.type === 'text' && b.text?.trim()) parts.push({ text: b.text })
          else if (b.type === 'tool_use') {
            parts.push({ functionCall: { name: b.name, args: b.input || {} } })
          }
        }
        if (parts.length) contents.push({ role: 'model', parts })
      } else if (msg.role === 'user') {
        const toolResults = msg.content.filter(b => b.type === 'tool_result')
        if (toolResults.length) {
          const parts = toolResults.map(tr => ({
            functionResponse: {
              name:     toolIdToName[tr.tool_use_id] || 'unknown',
              response: { result: String(tr.content || tr.result || '') },
            },
          }))
          contents.push({ role: 'user', parts })
        }
      }
    }
  }
  return contents
}

// ── Normalización respuesta Gemini → formato interno ───────────
function normalizeGeminiResponse(data) {
  const candidate = data.candidates?.[0]
  if (!candidate) {
    return { stop_reason: 'end_turn', content: [{ type: 'text', text: 'Sin respuesta del modelo.' }] }
  }

  // Filtrar partes de "thinking" que Gemini 2.5 puede incluir
  const parts    = (candidate.content?.parts || []).filter(p => !p.thought)
  const content  = []
  let hasTool    = false
  let idCounter  = 0

  for (const part of parts) {
    if (part.functionCall) {
      hasTool = true
      content.push({
        type:  'tool_use',
        id:    `gcall_${idCounter++}_${part.functionCall.name}`,
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

REGLAS OBLIGATORIAS — editar/borrar:
- NUNCA inventes ni construyas un eventId. Solo podés usar eventIds que hayas recibido en esta conversación como resultado de listar_eventos_calendario.
- Si Mateo pide borrar o editar y no tenés el eventId de un listar previo, llamá listar_eventos_calendario PRIMERO para identificar el evento correcto.
- Usá el valor de eventId EXACTAMENTE como aparece en el resultado (campo eventId="..."), copialo literal sin modificar ni truncar ni un carácter.

CONFIRMACIONES — cómo pedirlas:
- El eventId es un detalle TÉCNICO INTERNO. JAMÁS lo menciones ni lo muestres al usuario.
- Para confirmar un borrado o edición, usá SOLO el título del evento y la fecha/hora en lenguaje natural y legible.
- Ejemplo CORRECTO: "¿Querés que cancele 'Clases de Inglés' del martes 24 de 8:00 a 13:20? (sí/no)"
- Ejemplo INCORRECTO: "¿Confirmar borrar eventId='0odln4u8rfr...'?"` : ''}
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

  const key = process.env.GEMINI_API_KEY
  // Diagnóstico: loguear presencia y longitud de la key (nunca el valor)
  console.log('[chat] GEMINI_API_KEY present:', !!key, '| length:', key?.length ?? 0)
  if (!key) return res.status(500).json({ error: 'GEMINI_API_KEY no configurada en Vercel' })

  const { messages, context, assistant_content, tool_results, gcal_token } = req.body

  // Recortar historial y asegurarse de que empiece en un mensaje de usuario
  const raw          = (messages || []).slice(-MAX_HISTORY)
  const firstUserIdx = raw.findIndex(m => m.role === 'user')
  const trimmed      = firstUserIdx > 0 ? raw.slice(firstUserIdx) : raw

  let contents = toGeminiContents(trimmed)

  // Continuación post-tool-use: agregar turno del modelo + resultados de herramientas
  if (assistant_content && tool_results?.length) {
    const toolIdToName = {}
    for (const b of assistant_content) {
      if (b.type === 'tool_use' && b.id && b.name) toolIdToName[b.id] = b.name
    }

    const modelParts = []
    const textBlock  = assistant_content.find(b => b.type === 'text')
    if (textBlock?.text?.trim()) modelParts.push({ text: textBlock.text })
    for (const b of assistant_content.filter(b => b.type === 'tool_use')) {
      modelParts.push({ functionCall: { name: b.name, args: b.input || {} } })
    }
    if (modelParts.length) contents.push({ role: 'model', parts: modelParts })

    const resultParts = tool_results.map(tr => ({
      functionResponse: {
        name:     toolIdToName[tr.tool_use_id] || tr.tool_use_id,
        response: { result: String(tr.result) },
      },
    }))
    contents.push({ role: 'user', parts: resultParts })
  }

  const toolDecls = gcal_token
    ? [...TASK_TOOL_DECLS, ...GCAL_TOOL_DECLS]
    : TASK_TOOL_DECLS

  const geminiBody = {
    system_instruction: { parts: [{ text: buildSystemPrompt(context, !!gcal_token) }] },
    contents,
    tools: [{ function_declarations: toolDecls }],
    tool_config: { function_calling_config: { mode: 'AUTO' } },
    generation_config: { max_output_tokens: 1024, temperature: 0.3 },
  }

  const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`

  async function callGemini() {
    return fetch(GEMINI_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(geminiBody),
    })
  }

  async function readJson(r) {
    const t = await r.text()
    try { return JSON.parse(t) } catch { return { raw: t } }
  }

  async function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

  // Clasifica el 429: 'daily' si la cuota del día se agotó, 'minute' si es RPM
  function quota429Type(data) {
    const msg = (data?.error?.message || data?.error?.status || '').toLowerCase()
    if (msg.includes('per day') || msg.includes('daily') || msg.includes('quota_exceeded')) return 'daily'
    return 'minute'
  }

  try {
    let response = await callGemini()
    console.log('[chat] status:', response.status)

    if (response.status === 429) {
      // Leer el cuerpo UNA SOLA VEZ para saber qué tipo de límite es
      const data429    = await readJson(response)
      const retryAfter = response.headers.get('retry-after') || response.headers.get('Retry-After')
      console.error('[chat] 429 body:', JSON.stringify(data429).slice(0, 800), '| retry-after:', retryAfter)

      if (quota429Type(data429) === 'daily') {
        // Cuota diaria agotada — no tiene sentido reintentar hasta el día siguiente
        return res.status(200).json({
          stop_reason: 'end_turn',
          content: [{ type: 'text', text: 'Se agotó la cuota diaria de la API de Google. El servicio se restablece a las 00:00 UTC. Mientras tanto podés usar la sección PAES.' }],
          _diag: { quota: 'daily', google_error: data429?.error },
        })
      }

      // Límite por minuto — reintentar: 500 ms → 2 s
      await sleep(500)
      response = await callGemini()
      if (response.status === 429) {
        await sleep(2000)
        response = await callGemini()
      }
      if (response.status === 429) {
        const d = await readJson(response)
        console.error('[chat] 429 persists after retries:', JSON.stringify(d).slice(0, 400))
        return res.status(200).json({
          stop_reason: 'end_turn',
          content: [{ type: 'text', text: 'Estoy un poco saturado en este momento. Esperá unos segundos y volvé a intentarlo.' }],
          _diag: { quota: 'minute', google_error: d?.error },
        })
      }
    }

    const data = await readJson(response)

    if (!response.ok) {
      console.error('[chat] Google error', response.status, JSON.stringify(data).slice(0, 600))
      return res.status(response.status).json({
        error:        `Google ${response.status}`,
        google_error: data?.error || data,
      })
    }
    res.json(normalizeGeminiResponse(data))
  } catch (err) {
    console.error('[chat] fetch error:', err.message)
    res.status(500).json({ error: err.message })
  }
}
