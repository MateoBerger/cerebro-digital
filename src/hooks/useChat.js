import { useState, useRef, useEffect } from 'react'
import {
  subscribeTareas, addTarea, updateTarea,
  subscribeBloques, addBloque,
  subscribePaesStats,
  subscribeCheckin,
  subscribeDailyGoalsConfig, subscribeDailyGoalsState, addDailyGoalItem,
} from '../firebase/db'
import {
  gcalListarEventos,
  gcalCrearEvento,
  gcalGetEvento,
  gcalPatchEvento,
  gcalEliminarEvento,
} from '../utils/gcalApi'

// Devuelve el token de GCal si existe y no expiró, null en caso contrario
function getGcalToken() {
  const token = sessionStorage.getItem('gcal_token')
  const exp   = Number(sessionStorage.getItem('gcal_token_exp') || 0)
  return token && Date.now() < exp ? token : null
}

function chileNow() {
  // Devuelve un Date cuyo .getFullYear()/.getMonth()/.getDate()/.getDay()
  // reflejan la hora local de Chile (America/Santiago), independiente del
  // timezone del navegador.
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Santiago' }))
}

function getLocalDate() {
  const d = chileNow()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getWeekKey() {
  const d   = chileNow()
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function toolLabel(name) {
  const labels = {
    add_tarea:                 'Creando tarea…',
    complete_tarea:            'Actualizando tarea…',
    add_bloque_calendario:     'Agregando bloque al calendario…',
    add_meta_diaria:           'Agregando meta diaria…',
    listar_eventos_calendario: 'Consultando Google Calendar…',
    crear_evento_calendario:   'Creando evento en Calendar…',
    editar_evento_calendario:  'Editando evento en Calendar…',
    borrar_evento_calendario:        'Eliminando evento de Calendar…',
    batch_borrar_eventos_calendario: 'Eliminando eventos de Calendar…',
  }
  return labels[name] || 'Ejecutando acción…'
}

// Formatea rango de evento en zona Chile con día de la semana derivado del código (no del modelo)
function fmtEventRange(startIso, endIso) {
  const TZ = 'America/Santiago'
  const isAllDay = startIso && startIso.length === 10  // "YYYY-MM-DD" sin hora

  if (isAllDay) {
    // T12:00:00 evita que DST haga cruzar la medianoche y cambie el día
    const d  = new Date(startIso + 'T12:00:00')
    const wd = d.toLocaleDateString('es-CL', { timeZone: TZ, weekday: 'long' })
    const dt = d.toLocaleDateString('es-CL', { timeZone: TZ, day: '2-digit', month: '2-digit' })
    return `${wd} ${dt} (todo el día)`
  }

  const ds = new Date(startIso)
  const de = endIso ? new Date(endIso) : null
  if (isNaN(ds.getTime())) return startIso

  const wd = ds.toLocaleDateString('es-CL', { timeZone: TZ, weekday: 'long' })
  const dt = ds.toLocaleDateString('es-CL', { timeZone: TZ, day: '2-digit', month: '2-digit' })
  const t1 = ds.toLocaleTimeString('es-CL', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false })
  const t2 = de ? de.toLocaleTimeString('es-CL', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false }) : ''

  return t2 ? `${wd} ${dt} ${t1}–${t2}` : `${wd} ${dt} ${t1}`
}

// Texto amigable para el chip de resultado — nunca expone IDs internos ni texto crudo
function toolResultUiText(name, result) {
  if (name === 'listar_eventos_calendario') {
    const m = result.match(/^(\d+) evento\(s\)/)
    if (m) return `${m[1]} evento(s) encontrado(s)`
    if (result.startsWith('No hay')) return 'Sin eventos en ese rango'
    return 'Calendario consultado'
  }
  return result
}

export function useChat(uid) {
  const [tareas,     setTareas]     = useState([])
  const [bloques,    setBloques]    = useState([])
  const [paesStats,  setPaesStats]  = useState(null)
  const [checkinHoy, setCheckinHoy] = useState(null)
  const [goalItems,  setGoalItems]  = useState([])
  const [goalState,  setGoalState]  = useState({})

  const [uiMessages, setUiMessages] = useState(() => {
    const h = new Date().getHours()
    const s = h < 12 ? 'Buenos días' : h < 20 ? 'Buenas tardes' : 'Buenas noches'
    return [{
      id:   'init',
      role: 'assistant',
      text: `${s}, Mateo. Tengo acceso a tus tareas, calendario y progreso PAES. ¿En qué te ayudo?`,
    }]
  })
  const [input,   setInput]   = useState('')
  const [loading, setLoading] = useState(false)

  const apiMsgsRef = useRef([])

  useEffect(() => {
    if (!uid) return
    const today = getLocalDate()
    const unsubs = [
      subscribeTareas(uid,   setTareas),
      subscribeBloques(uid,  setBloques),
      subscribePaesStats(uid, setPaesStats),
      subscribeCheckin(uid,  today, setCheckinHoy),
      subscribeDailyGoalsConfig(uid, setGoalItems),
      subscribeDailyGoalsState(uid, today, setGoalState),
    ]
    return () => unsubs.forEach(u => u())
  }, [uid])

  function buildPriorizarPrompt() {
    const today = getLocalDate()
    const ctx   = buildContext()

    const pendientes = tareas.filter(t => !t.completada)
    const urgentes   = pendientes.filter(t => t.fecha && t.fecha <= today)
    const altaPrio   = pendientes.filter(t => t.prioridad === 'alta' && (!t.fecha || t.fecha > today))
    const diarias    = pendientes.filter(t =>
      t.alcance === 'diaria' && !urgentes.includes(t) && !altaPrio.includes(t)
    )
    const resto      = pendientes.filter(t =>
      !urgentes.includes(t) && !altaPrio.includes(t) && !diarias.includes(t)
    )

    const fmt = t => {
      let s = `• [${t.prioridad}] ${t.titulo}`
      if (t.paesSubject) s += ` (${t.paesSubject})`
      if (t.fecha && t.fecha < today)  s += ` — VENCIDA (${t.fecha})`
      else if (t.fecha === today)       s += ` — vence HOY`
      else if (t.fecha)                 s += ` — vence ${t.fecha}`
      return s
    }

    const parts = []
    if (urgentes.length)           parts.push(`Urgentes / vencen hoy:\n${urgentes.map(fmt).join('\n')}`)
    if (altaPrio.length)           parts.push(`Alta prioridad:\n${altaPrio.map(fmt).join('\n')}`)
    if (diarias.length)            parts.push(`Tareas del día:\n${diarias.map(fmt).join('\n')}`)
    if (resto.length && resto.length <= 5) parts.push(`Otras pendientes:\n${resto.map(fmt).join('\n')}`)
    else if (resto.length)         parts.push(`Otras pendientes: ${resto.length} tarea(s) más`)

    const tareasStr = parts.length ? parts.join('\n\n') : 'Sin tareas pendientes'

    return [
      `¿Qué hago primero hoy?`,
      ``,
      `Fecha: ${ctx.fecha}`,
      `Mi estado según el check-in de hoy: ${ctx.checkin}`,
      ``,
      `Mi horario de hoy:`,
      ctx.calendario,
      ``,
      `Mis tareas pendientes:`,
      tareasStr,
      ``,
      `Con todo eso, dame un orden sugerido de qué hacer primero hoy. Ten en cuenta mi energía, mi ánimo y el tiempo libre que tengo. Sé breve, claro/a y cercano/a.`,
    ].join('\n')
  }

  function buildContext() {
    const today = new Date()
    const fecha = today.toLocaleDateString('es-CL', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      timeZone: 'America/Santiago',
    })
    // 0=Lun…6=Dom, en zona horaria de Chile
    const chileDate  = new Date(today.toLocaleString('en-US', { timeZone: 'America/Santiago' }))
    const todayDia   = chileDate.getDay() === 0 ? 6 : chileDate.getDay() - 1

    const checkin = checkinHoy
      ? `Ganas de estudiar: ${checkinHoy.ganas_estudio}/10 | Energía: ${checkinHoy.energia}/10 | Ánimo: ${checkinHoy.animo}/10 | Tiempo libre: ${checkinHoy.tiempo_libre}`
      : 'Sin check-in registrado hoy'

    const pendientes = tareas.filter(t => !t.completada)
    const tareasStr  = pendientes.length
      ? pendientes.map(t =>
          `[${t.id}] [${t.alcance || 'general'}][${t.prioridad}] ${t.titulo}${t.descripcion ? ` — ${t.descripcion}` : ''}${t.fecha ? ` (vence: ${t.fecha})` : ''}`
        ).join('\n')
      : 'Sin tareas pendientes'

    const weekKey    = getWeekKey()
    const bloquesHoy = bloques
      .filter(b => b.dia === todayDia && (!b.semana || b.semana === null || b.semana === weekKey))
      .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio))
    const calStr = bloquesHoy.length
      ? bloquesHoy.map(b => `${b.horaInicio}–${b.horaFin}: ${b.titulo} (${b.tipo})`).join('\n')
      : 'Sin bloques programados para hoy'

    const paesStr = paesStats
      ? `Racha: ${paesStats.streak || 0} días | Correctas: ${paesStats.correctAnswers || 0}/${paesStats.totalAnswers || 0} | Ensayos registrados: ${paesStats.essaysCount || 0}`
      : 'Sin datos PAES aún (usar sección PAES para registrar ensayos)'

    const metasDiariasStr = goalItems.length
      ? goalItems.map(g => `${goalState[g.id] ? '[x]' : '[ ]'} ${g.label}`).join('\n')
      : 'Sin metas diarias configuradas'

    return { fecha, todayDia, checkin, tareas: tareasStr, calendario: calStr, paes: paesStr, metas_diarias: metasDiariasStr }
  }

  async function executeTool(name, toolInput) {
    switch (name) {
      case 'add_tarea':
        await addTarea(uid, toolInput)
        return `Tarea "${toolInput.titulo}" creada (${toolInput.alcance}, prioridad ${toolInput.prioridad})`

      case 'complete_tarea':
        await updateTarea(uid, toolInput.tarea_id, { completada: toolInput.completada })
        return `Tarea ${toolInput.completada ? 'marcada como completada' : 'vuelta a pendiente'}`

      case 'add_bloque_calendario':
        await addBloque(uid, { ...toolInput, semana: toolInput.recurrente ? null : getWeekKey() })
        return `Bloque "${toolInput.titulo}" agregado al calendario`

      case 'add_meta_diaria':
        await addDailyGoalItem(uid, toolInput.label)
        return `Meta diaria "${toolInput.label}" agregada`

      case 'listar_eventos_calendario': {
        const gcalToken = getGcalToken()
        if (!gcalToken) return 'Error: Google Calendar no está conectado o el token expiró'
        const events = await gcalListarEventos(
          gcalToken,
          new Date(toolInput.timeMin),
          new Date(toolInput.timeMax),
        )
        if (!events.length) return 'No hay eventos en ese rango de fechas'
        return `${events.length} evento(s):\n` + events.map((e, i) => {
          const startIso = e.start?.dateTime || e.start?.date || ''
          const endIso   = e.end?.dateTime   || e.end?.date   || ''
          // Día de la semana calculado en código, nunca dejado al modelo
          const cuando = fmtEventRange(startIso, endIso)
          const desc   = e.description ? ` | nota: ${e.description}` : ''
          return `${i + 1}. eventId="${e.id}" | "${e.summary || '(sin título)'}" | ${cuando}${desc}`
        }).join('\n')
      }

      case 'crear_evento_calendario': {
        const gcalToken = getGcalToken()
        if (!gcalToken) return 'Error: Google Calendar no está conectado o el token expiró'
        const dayDate = new Date(`${toolInput.fecha}T12:00:00`)
        const dow = dayDate.getDay()
        const dia = dow === 0 ? 6 : dow - 1
        await gcalCrearEvento(gcalToken, {
          titulo:      toolInput.titulo,
          descripcion: toolInput.descripcion || '',
          tipo:        toolInput.tipo || 'otro',
          dia,
          horaInicio:  toolInput.horaInicio,
          horaFin:     toolInput.horaFin,
          recurrente:  false,
        }, dayDate)
        return `Evento "${toolInput.titulo}" creado el ${toolInput.fecha} de ${toolInput.horaInicio} a ${toolInput.horaFin}`
      }

      case 'editar_evento_calendario': {
        const gcalToken = getGcalToken()
        if (!gcalToken) return 'Error: Google Calendar no está conectado o el token expiró'
        console.log('[GCal] editar_evento_calendario → eventId:', toolInput.eventId)
        try {
          const patch = {}
          if (toolInput.titulo      !== undefined) patch.summary     = toolInput.titulo
          if (toolInput.descripcion !== undefined) patch.description = toolInput.descripcion
          if (toolInput.fecha || toolInput.horaInicio || toolInput.horaFin) {
            const existing  = await gcalGetEvento(gcalToken, toolInput.eventId)
            const exStart   = new Date(existing.start?.dateTime || '')
            const exEnd     = new Date(existing.end?.dateTime   || '')
            const pad       = n => String(n).padStart(2, '0')
            const exDate    = `${exStart.getFullYear()}-${pad(exStart.getMonth()+1)}-${pad(exStart.getDate())}`
            const exIni     = `${pad(exStart.getHours())}:${pad(exStart.getMinutes())}`
            const exFin     = `${pad(exEnd.getHours())}:${pad(exEnd.getMinutes())}`
            const date      = toolInput.fecha      ?? exDate
            const horaIni   = toolInput.horaInicio ?? exIni
            const horaFin   = toolInput.horaFin    ?? exFin
            patch.start = { dateTime: `${date}T${horaIni}:00`, timeZone: 'America/Santiago' }
            patch.end   = { dateTime: `${date}T${horaFin}:00`, timeZone: 'America/Santiago' }
          }
          await gcalPatchEvento(gcalToken, toolInput.eventId, patch)
          return 'Evento actualizado correctamente'
        } catch (e) {
          if (e.message?.includes('404') || e.message?.includes('notFound')) {
            return `No encontré el evento con eventId "${toolInput.eventId}". Volvé a listar los eventos para obtener el ID correcto.`
          }
          throw e
        }
      }

      case 'borrar_evento_calendario': {
        const gcalToken = getGcalToken()
        if (!gcalToken) return 'Error: Google Calendar no está conectado o el token expiró'
        console.log('[GCal] borrar_evento_calendario → eventId:', toolInput.eventId)
        try {
          await gcalEliminarEvento(gcalToken, toolInput.eventId)
          return 'Evento eliminado del calendario'
        } catch (e) {
          if (e.message?.includes('404') || e.message?.includes('410') ||
              e.message?.includes('notFound') || e.message?.includes('deleted')) {
            return 'Evento eliminado del calendario'
          }
          throw e
        }
      }

      case 'batch_borrar_eventos_calendario': {
        const gcalToken = getGcalToken()
        if (!gcalToken) return 'Error: Google Calendar no está conectado o el token expiró'
        const ids = (toolInput.eventIds || '').split(',').map(s => s.trim()).filter(Boolean)
        if (!ids.length) return 'No se especificaron eventos para borrar'
        console.log('[GCal] batch borrar:', ids.length, 'eventos')
        let succeeded = 0, failed = 0
        for (const eid of ids) {
          try {
            await gcalEliminarEvento(gcalToken, eid)
            succeeded++
          } catch (e) {
            if (e.message?.includes('404') || e.message?.includes('410') ||
                e.message?.includes('notFound') || e.message?.includes('deleted')) {
              succeeded++  // ya borrado = éxito
            } else {
              console.error('[GCal] Error al borrar', eid, e.message)
              failed++
            }
          }
        }
        const total = ids.length
        if (failed === 0) return `${succeeded} evento${total !== 1 ? 's' : ''} eliminado${total !== 1 ? 's' : ''} del calendario`
        return `Eliminé ${succeeded} de ${total} eventos. ${failed} no se pu${failed === 1 ? 'do' : 'dieron'} borrar.`
      }

      default:
        return 'Herramienta no reconocida'
    }
  }

  async function parseResponse(res) {
    const text = await res.text()
    if (!text) throw new Error(`Respuesta vacía del servidor (HTTP ${res.status})`)
    try {
      return JSON.parse(text)
    } catch {
      throw new Error(`El servidor devolvió una respuesta inesperada (HTTP ${res.status}): ${text.slice(0, 200)}`)
    }
  }

  function checkError(d) {
    if (!d.error) return
    throw new Error(typeof d.error === 'string' ? d.error : d.error?.message || JSON.stringify(d.error))
  }

  function pushUi(msg) {
    setUiMessages(m => [...m, msg])
  }

  function replaceUi(id, updates) {
    setUiMessages(m => m.map(msg => msg.id === id ? { ...msg, ...updates } : msg))
  }

  async function send(quickText, displayText) {
    const text   = (quickText !== undefined ? quickText : input).trim()
    const uiText = displayText || text
    if (!text || loading) return
    if (quickText === undefined) setInput('')
    setLoading(true)

    pushUi({ id: `u-${Date.now()}`, role: 'user', text: uiText })

    const newApiMsgs = [...apiMsgsRef.current, { role: 'user', content: text }]

    try {
      const context   = buildContext()
      const gcalToken = getGcalToken()

      // workingMsgs acumula historial + intercambios de tools de este turno
      let workingMsgs = [...newApiMsgs]

      // Para cierre local de borrados: rastrear a través de TODAS las rondas del turno
      let allBorrarBlocks  = []
      let allBorrarResults = []
      // listar_eventos no cuenta como "non-borrar" (es paso intermedio del flujo de borrado)
      let hasNonBorrar = false

      // ── Primera llamada al modelo ─────────────────────────────
      let d = await parseResponse(await fetch('/api/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ messages: workingMsgs, context, gcal_token: gcalToken }),
      }))
      checkError(d)

      // ── Agentic loop: una ronda por cada tool_use del modelo ──
      for (let round = 0; d.stop_reason === 'tool_use' && round < 10; round++) {
        const toolBlocks  = d.content.filter(b => b.type === 'tool_use')
        const toolResults = []
        const seenBorrar  = new Set()

        console.log(`[chat] ronda ${round + 1}: ${toolBlocks.length} tool_call(s) — ${toolBlocks.map(b => b.name).join(', ')}`)

        const textBefore = d.content.find(b => b.type === 'text')?.text
        if (textBefore) pushUi({ id: `a-${Date.now()}`, role: 'assistant', text: textBefore })

        for (const block of toolBlocks) {
          const chipId = `chip-${block.id}`
          pushUi({ id: chipId, role: 'action', text: toolLabel(block.name), pending: true })
          let result

          if (block.name === 'borrar_evento_calendario') {
            const eid = block.input?.eventId
            if (eid && seenBorrar.has(eid)) {
              result = 'Evento ya eliminado'
            } else {
              if (eid) seenBorrar.add(eid)
              try {
                result = await executeTool(block.name, block.input)
              } catch (borrarErr) {
                console.error('[GCal] Error en borrar_evento_calendario:', eid, borrarErr.message)
                result = `Error al borrar: ${borrarErr.message.slice(0, 80)}`
              }
            }
            allBorrarBlocks.push(block)
            allBorrarResults.push({ tool_use_id: block.id, result })
          } else if (block.name === 'batch_borrar_eventos_calendario') {
            // batch: ejecuta todos los deletes internamente y retorna el resumen
            result = await executeTool(block.name, block.input)
            allBorrarBlocks.push(block)
            allBorrarResults.push({ tool_use_id: block.id, result, isBatch: true, batchResult: result })
          } else {
            if (block.name !== 'listar_eventos_calendario') hasNonBorrar = true
            result = await executeTool(block.name, block.input)
          }

          replaceUi(chipId, { text: toolResultUiText(block.name, result), pending: false })
          toolResults.push({ tool_use_id: block.id, result })
        }

        // Acumular este round en workingMsgs para la próxima llamada
        workingMsgs = [
          ...workingMsgs,
          { role: 'assistant', content: d.content },
          {
            role:    'user',
            content: toolResults.map(tr => ({
              type:        'tool_result',
              tool_use_id: tr.tool_use_id,
              content:     String(tr.result),
            })),
          },
        ]

        // Siguiente llamada — is_continuation evita recortar el contexto intra-turno en el API
        d = await parseResponse(await fetch('/api/chat', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ messages: workingMsgs, context, gcal_token: gcalToken, is_continuation: true }),
        }))
        checkError(d)
      }

      // ── Mensaje final ─────────────────────────────────────────
      let finalText = ''

      if (allBorrarBlocks.length > 0 && !hasNonBorrar) {
        // Turno de solo borrados (con o sin listar previo): mensaje con conteo real
        const hasBatch = allBorrarResults.some(r => r.isBatch)
        if (hasBatch) {
          // batch_borrar ya genera el mensaje completo — usarlo directamente
          const batchMsg = allBorrarResults.find(r => r.isBatch)?.batchResult || 'Eventos eliminados.'
          finalText = `Listo, ${batchMsg.charAt(0).toLowerCase()}${batchMsg.slice(1)}`
        } else {
          // borrar individual (posiblemente múltiples rondas del agentic loop)
          const total     = allBorrarBlocks.length
          const succeeded = allBorrarResults.filter(tr => tr.result.includes('eliminado')).length
          const failed    = total - succeeded
          if (total === 1 && succeeded === 1) {
            finalText = 'Listo, el evento fue eliminado del calendario.'
          } else if (failed === 0) {
            finalText = `Listo, cancelé ${total} evento${total !== 1 ? 's' : ''} del calendario.`
          } else if (succeeded === 0) {
            finalText = `No se pudo borrar ninguno de los ${total} eventos. Revisá la conexión con Google Calendar.`
          } else {
            finalText = `Cancelé ${succeeded} de ${total} eventos. ${failed} no se pu${failed === 1 ? 'do' : 'dieron'} borrar.`
          }
        }
        pushUi({ id: `a2-${Date.now()}`, role: 'assistant', text: finalText })
      } else {
        // Texto final del modelo (del end_turn)
        finalText = d.content?.find(b => b.type === 'text')?.text || ''
        if (finalText) pushUi({ id: `a-${Date.now()}`, role: 'assistant', text: finalText })
      }

      // Actualizar historial persistente con todos los intercambios del turno
      apiMsgsRef.current = [...workingMsgs, { role: 'assistant', content: finalText }]

    } catch (err) {
      pushUi({ id: `err-${Date.now()}`, role: 'assistant', text: `Error: ${err.message}`, isError: true })
    }

    setLoading(false)
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  return {
    uiMessages, input, setInput, send, loading, handleKey,
    sendQuick: (text, displayText) => send(text, displayText),
    buildPriorizarPrompt,
  }
}
