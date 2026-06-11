// Vercel Serverless — /api/paes-chat
// Asistente PAES: Gemini 2.5 Flash (multimodal: texto + PDF/imagen)
// Normaliza respuesta al formato {stop_reason, content:[...]} que consume usePaesChat.js

const TOOLS = [
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

// Normaliza la respuesta de Gemini al formato interno {stop_reason, content:[...]}
function normalizeGeminiResponse(data) {
  const candidate = data.candidates?.[0]
  if (!candidate) {
    return { stop_reason: 'end_turn', content: [{ type: 'text', text: 'Sin respuesta del modelo.' }] }
  }

  const parts    = candidate.content?.parts || []
  const content  = []
  let hasTool    = false
  let idCounter  = 0

  for (const part of parts) {
    if (part.functionCall) {
      hasTool = true
      const toolId = `gemini-${Date.now()}-${idCounter++}`
      content.push({
        type:  'tool_use',
        id:    toolId,
        name:  part.functionCall.name,
        input: part.functionCall.args || {},
      })
    } else if (part.text) {
      content.push({ type: 'text', text: part.text })
    }
  }

  if (!content.length) {
    content.push({ type: 'text', text: '' })
  }

  return {
    stop_reason: hasTool ? 'tool_use' : 'end_turn',
    content,
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const key = process.env.GEMINI_API_KEY
  if (!key) return res.status(500).json({ error: 'GEMINI_API_KEY no configurada en Vercel' })

  const { messages, context, assistant_content, tool_results } = req.body

  // messages ya están en formato Gemini (desde usePaesChat.js)
  let contents = [...(messages || [])]

  // Si viene de una continuación post-tool-use, agregar el intercambio en formato Gemini
  if (assistant_content && tool_results?.length) {
    const modelParts = []
    for (const block of assistant_content) {
      if (block.type === 'text' && block.text) {
        modelParts.push({ text: block.text })
      } else if (block.type === 'tool_use') {
        modelParts.push({ functionCall: { name: block.name, args: block.input } })
      }
    }
    if (modelParts.length) {
      contents.push({ role: 'model', parts: modelParts })
    }

    const userParts = []
    for (const tr of tool_results) {
      userParts.push({
        functionResponse: {
          name:     tr.name,
          response: { result: String(tr.result) },
        },
      })
    }
    if (userParts.length) {
      contents.push({ role: 'user', parts: userParts })
    }
  }

  const body = {
    system_instruction: {
      parts: [{ text: buildSystemPrompt(context) }],
    },
    contents,
    tools: [{ function_declarations: TOOLS }],
    tool_config: { function_calling_config: { mode: 'AUTO' } },
    generation_config: {
      max_output_tokens: 2048,
      temperature:       0.4,
    },
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      },
    )

    const data = await response.json()
    if (!response.ok) return res.status(response.status).json(data)
    res.json(normalizeGeminiResponse(data))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
