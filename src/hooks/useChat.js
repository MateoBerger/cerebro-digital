import { useState, useRef, useEffect } from 'react'
import {
  subscribeTareas, addTarea, updateTarea,
  subscribeBloques, addBloque,
  subscribePaesStats,
  subscribeCheckin,
} from '../firebase/db'

function getLocalDate() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getWeekKey() {
  const d = new Date()
  const day  = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function toolLabel(name) {
  const labels = {
    add_tarea:             'Creando tarea…',
    complete_tarea:        'Actualizando tarea…',
    add_bloque_calendario: 'Agregando bloque al calendario…',
  }
  return labels[name] || 'Ejecutando acción…'
}

export function useChat(uid) {
  const [tareas,     setTareas]     = useState([])
  const [bloques,    setBloques]    = useState([])
  const [paesStats,  setPaesStats]  = useState(null)
  const [checkinHoy, setCheckinHoy] = useState(null)

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
    ]
    return () => unsubs.forEach(u => u())
  }, [uid])

  function buildContext() {
    const today = new Date()
    const fecha = today.toLocaleDateString('es-CL', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    })

    const checkin = checkinHoy
      ? `Ganas de estudiar: ${checkinHoy.ganas_estudio}/10 | Energía: ${checkinHoy.energia}/10 | Ánimo: ${checkinHoy.animo}/10 | Tiempo libre: ${checkinHoy.tiempo_libre}`
      : 'Sin check-in registrado hoy'

    const pendientes = tareas.filter(t => !t.completada)
    const tareasStr  = pendientes.length
      ? pendientes.map(t =>
          `[${t.id}] [${t.alcance || 'general'}][${t.prioridad}] ${t.titulo}${t.descripcion ? ` — ${t.descripcion}` : ''}${t.fecha ? ` (vence: ${t.fecha})` : ''}`
        ).join('\n')
      : 'Sin tareas pendientes'

    const todayDow   = today.getDay() === 0 ? 6 : today.getDay() - 1
    const weekKey    = getWeekKey()
    const bloquesHoy = bloques
      .filter(b => b.dia === todayDow && (!b.semana || b.semana === null || b.semana === weekKey))
      .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio))
    const calStr = bloquesHoy.length
      ? bloquesHoy.map(b => `${b.horaInicio}–${b.horaFin}: ${b.titulo} (${b.tipo})`).join('\n')
      : 'Sin bloques programados para hoy'

    const paesStr = paesStats
      ? `Racha: ${paesStats.streak || 0} días | Correctas: ${paesStats.correctAnswers || 0}/${paesStats.totalAnswers || 0} | Ensayos registrados: ${paesStats.essaysCount || 0}`
      : 'Sin datos PAES aún (usar sección PAES para registrar ensayos)'

    return { fecha, checkin, tareas: tareasStr, calendario: calStr, paes: paesStr }
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

      default:
        return 'Herramienta no reconocida'
    }
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
      const context = buildContext()

      const r1 = await fetch('/api/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ messages: newApiMsgs, context }),
      })
      const d1 = await r1.json()
      if (d1.error) throw new Error(d1.error)

      if (d1.stop_reason === 'tool_use') {
        const textBefore = d1.content.find(b => b.type === 'text')?.text
        if (textBefore) pushUi({ id: `a-${Date.now()}`, role: 'assistant', text: textBefore })

        const toolBlocks = d1.content.filter(b => b.type === 'tool_use')
        const toolResults = []

        for (const block of toolBlocks) {
          const chipId = `chip-${block.id}`
          pushUi({ id: chipId, role: 'action', text: toolLabel(block.name), pending: true })
          const result = await executeTool(block.name, block.input)
          replaceUi(chipId, { text: result, pending: false })
          toolResults.push({ tool_use_id: block.id, result })
        }

        const r2 = await fetch('/api/chat', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            messages:          newApiMsgs,
            context,
            assistant_content: d1.content,
            tool_results:      toolResults,
          }),
        })
        const d2 = await r2.json()
        const finalText = d2.content?.find(b => b.type === 'text')?.text || ''
        if (finalText) pushUi({ id: `a2-${Date.now()}`, role: 'assistant', text: finalText })

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
