// Vercel Serverless — /api/chat
// Asistente general: tareas y calendario via Groq (Llama 3.3 70B)
// Normaliza respuesta al formato {stop_reason, content:[...]} que consume useChat.js

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

// ── Conversión formato normalizado → Groq ──────────────────────
// Los messages en apiMsgsRef (frontend) pueden contener content de tipo array
// con bloques tool_use/tool_result cuando hay historial de tool calls anteriores.
function toGroqMessages(messages) {
  const result = []
  for (const msg of messages) {
    if (typeof msg.content === 'string') {
      result.push({ role: msg.role, content: msg.content })
    } else if (Array.isArray(msg.content)) {
      if (msg.role === 'assistant') {
        const textBlock  = msg.content.find(b => b.type === 'text')
        const toolBlocks = msg.content.filter(b => b.type === 'tool_use')
        const groqMsg = {
          role:    'assistant',
          content: textBlock?.text || null,
        }
        if (toolBlocks.length) {
          groqMsg.tool_calls = toolBlocks.map(b => ({
            id:   b.id,
            type: 'function',
            function: { name: b.name, arguments: JSON.stringify(b.input) },
          }))
        }
        result.push(groqMsg)
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

function buildSystemPrompt(ctx) {
  const DIAS = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo']
  const hoyDia    = typeof ctx.todayDia === 'number' ? ctx.todayDia : 0
  const mañanaDia = (hoyDia + 1) % 7
  const pasadoDia = (hoyDia + 2) % 7

  return `Sos el asistente personal de Mateo Berger, estudiante chileno de 4to medio que se prepara para la PAES 2026.
Podés crear tareas y bloques de calendario. El registro de ensayos PAES lo maneja el asistente especializado de la sección PAES.

Hoy es ${ctx.fecha}.
En el sistema de calendario: hoy = dia ${hoyDia} (${DIAS[hoyDia]}), mañana = dia ${mañanaDia} (${DIAS[mañanaDia]}), pasado mañana = dia ${pasadoDia} (${DIAS[pasadoDia]}).
Referencia completa: 0=Lunes 1=Martes 2=Miércoles 3=Jueves 4=Viernes 5=Sábado 6=Domingo.

# DATOS DEL SISTEMA

## Check-in de hoy
${ctx.checkin}

## Tareas pendientes
${ctx.tareas}

## Bloques de hoy en el calendario
${ctx.calendario}

## Estado PAES (resumen)
${ctx.paes}

## Metas diarias básicas (hoy)
${ctx.metas_diarias || 'Sin metas diarias'}

# CÓMO ACTUAR
- Español rioplatense (vos, tenés, hacés, etc.)
- Respuestas cortas y directas. Sin introducciones.
- Para acciones pequeñas (crear tarea, agregar bloque): ejecutalas directamente.
- Para modificaciones grandes o irreversibles: pedí confirmación breve primero.
- Los IDs de tareas del contexto (tarea_xxx) son necesarios para completarlas.`
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const key = process.env.GROQ_API_KEY
  if (!key) return res.status(500).json({ error: 'GROQ_API_KEY no configurada en Vercel' })

  const { messages, context, assistant_content, tool_results } = req.body

  // Convertir mensajes al formato Groq
  let groqMessages = toGroqMessages(messages)

  // Si viene de una continuación post-tool-use, agregar el intercambio
  if (assistant_content && tool_results?.length) {
    const textBlock  = assistant_content.find(b => b.type === 'text')
    const toolBlocks = assistant_content.filter(b => b.type === 'tool_use')
    const assistantMsg = {
      role:    'assistant',
      content: textBlock?.text || null,
    }
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

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`,
      },
      body: JSON.stringify({
        model:       'llama-3.3-70b-versatile',
        max_tokens:  1024,
        temperature: 0.3,
        messages: [
          { role: 'system', content: buildSystemPrompt(context) },
          ...groqMessages,
        ],
        tools:       TOOLS,
        tool_choice: 'auto',
      }),
    })

    const data = await response.json()
    if (!response.ok) {
      const msg = data?.error?.message || (typeof data?.error === 'string' ? data.error : null) || JSON.stringify(data)
      return res.status(response.status).json({ error: msg })
    }
    res.json(normalizeGroqResponse(data))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
