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
    borrar_evento_calendario:  'Eliminando evento de Calendar…',
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
        console.log('[GCal] DELETE URL:', `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(toolInput.eventId)}`)
        try {
          await gcalEliminarEvento(gcalToken, toolInput.eventId)
          return 'Evento eliminado del calendario'
        } catch (e) {
          // 404 = no existe, 410 = ya fue borrado → el objetivo (que no esté) ya se cumple
          if (e.message?.includes('404') || e.message?.includes('410') ||
              e.message?.includes('notFound') || e.message?.includes('deleted')) {
            return 'Evento eliminado del calendario'
          }
          throw e
        }
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

  async function send() {
    if (!input.trim() || loading) return
    const text = input.trim()
    setInput('')
    setLoading(true)

    pushUi({ id: `u-${Date.now()}`, role: 'user', text })

    const newApiMsgs = [...apiMsgsRef.current, { role: 'user', content: text }]

    try {
      const context   = buildContext()
      const gcalToken = getGcalToken()

      const r1 = await fetch('/api/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ messages: newApiMsgs, context, gcal_token: gcalToken }),
      })
      const d1 = await parseResponse(r1)
      checkError(d1)

      if (d1.stop_reason === 'tool_use') {
        const textBefore = d1.content.find(b => b.type === 'text')?.text
        if (textBefore) pushUi({ id: `a-${Date.now()}`, role: 'assistant', text: textBefore })

        const toolBlocks = d1.content.filter(b => b.type === 'tool_use')
        const toolResults = []
        const seenBorrar = new Set()  // evita doble DELETE del mismo eventId en un turno

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
              result = await executeTool(block.name, block.input)
            }
          } else {
            result = await executeTool(block.name, block.input)
          }
          replaceUi(chipId, { text: toolResultUiText(block.name, result), pending: false })
          toolResults.push({ tool_use_id: block.id, result })
        }

        // Si el turno fue solo borrado(s) exitosos, el mensaje de cierre se genera
        // localmente para evitar la llamada extra que topa el rate limit.
        const soloBorradosExitosos =
          toolBlocks.length > 0 &&
          toolBlocks.every(b => b.name === 'borrar_evento_calendario') &&
          toolResults.every(tr => tr.result.includes('eliminado'))

        let finalText = ''
        if (soloBorradosExitosos) {
          finalText = 'Listo, el evento fue eliminado del calendario.'
          pushUi({ id: `a2-${Date.now()}`, role: 'assistant', text: finalText })
        } else {
          const r2 = await fetch('/api/chat', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({
              messages:          newApiMsgs,
              context,
              assistant_content: d1.content,
              tool_results:      toolResults,
              gcal_token:        gcalToken,
            }),
          })
          const d2 = await parseResponse(r2)
          checkError(d2)
          finalText = d2.content?.find(b => b.type === 'text')?.text || ''
          if (finalText) pushUi({ id: `a2-${Date.now()}`, role: 'assistant', text: finalText })
        }

        apiMsgsRef.current = [
          ...newApiMsgs,
          { role: 'assistant', content: d1.content },
          {
            role:    'user',
            content: toolResults.map(tr => ({
              type:        'tool_result',
              tool_use_id: tr.tool_use_id,
              content:     String(tr.result),
            })),
          },
          { role: 'assistant', content: finalText },
        ]
      } else {
        const reply = d1.content?.find(b => b.type === 'text')?.text || '...'
        pushUi({ id: `a-${Date.now()}`, role: 'assistant', text: reply })
        apiMsgsRef.current = [...newApiMsgs, { role: 'assistant', content: reply }]
      }
    } catch (err) {
      pushUi({ id: `err-${Date.now()}`, role: 'assistant', text: `Error: ${err.message}`, isError: true })
    }

    setLoading(false)
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  return { uiMessages, input, setInput, send, loading, handleKey }
}
