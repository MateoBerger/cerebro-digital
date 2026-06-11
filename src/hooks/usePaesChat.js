import { useState, useRef, useEffect } from 'react'
import {
  subscribePaesStats,   updatePaesStats,
  subscribePaesProfile, updatePaesProfile,
  subscribePaesHistory, addPaesHistory,
  subscribePaesErrors,  addPaesError,
  addPaesEjercicio,
} from '../firebase/db'

function getLocalDate() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function toolLabel(name) {
  const labels = {
    registrar_ensayo:        'Registrando ensayo…',
    registrar_error:         'Registrando error…',
    actualizar_perfil_paes:  'Actualizando perfil PAES…',
    guardar_ejercicio:       'Guardando ejercicio…',
  }
  return labels[name] || 'Ejecutando acción…'
}

export function usePaesChat(uid) {
  const [stats,       setStats]       = useState(null)
  const [profile,     setProfile]     = useState(null)
  const [history,     setHistory]     = useState([])
  const [errors,      setErrors]      = useState([])

  const [uiMessages, setUiMessages] = useState(() => {
    const h = new Date().getHours()
    const s = h < 12 ? 'Buenos días' : h < 20 ? 'Buenas tardes' : 'Buenas noches'
    return [{
      id:   'init',
      role: 'assistant',
      text: `${s}, Mateo. Soy tu asistente PAES. Puedo explicarte contenidos, generar ejercicios, registrar tus ensayos y ayudarte a calibrar tu nivel. ¿En qué trabajamos hoy?`,
    }]
  })
  const [input,   setInput]   = useState('')
  const [loading, setLoading] = useState(false)
  const [file,    setFile]    = useState(null)

  // Historial en formato nativo Gemini: [{role:'user'|'model', parts:[...]}]
  const geminiMsgsRef = useRef([])

  useEffect(() => {
    if (!uid) return
    const unsubs = [
      subscribePaesStats(uid,   setStats),
      subscribePaesProfile(uid, setProfile),
      subscribePaesHistory(uid, setHistory),
      subscribePaesErrors(uid,  setErrors),
    ]
    return () => unsubs.forEach(u => u())
  }, [uid])

  function buildContext() {
    const today = new Date()
    const fecha = today.toLocaleDateString('es-CL', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    })

    const statsStr = stats
      ? `Racha: ${stats.streak || 0} días | Correctas: ${stats.correctAnswers || 0}/${stats.totalAnswers || 0} | Ensayos: ${stats.essaysCount || 0}`
      : 'Sin estadísticas aún'

    const perfilStr = profile
      ? `Nivel: ${profile.nivel || 'sin calibrar'} | Dificultad: ${profile.dificultad || 'media'}\nPuntajes estimados: CL ${profile.puntajeEstimado?.cl || '?'} | M1 ${profile.puntajeEstimado?.m1 || '?'} | M2 ${profile.puntajeEstimado?.m2 || '?'} | Ciencias ${profile.puntajeEstimado?.ciencias || '?'}\nÁreas débiles CL: ${(profile.areasDebiles?.cl || []).join(', ') || 'sin datos'}\nÁreas débiles M1: ${(profile.areasDebiles?.m1 || []).join(', ') || 'sin datos'}\nÁreas débiles M2: ${(profile.areasDebiles?.m2 || []).join(', ') || 'sin datos'}\nÁreas débiles Ciencias: ${(profile.areasDebiles?.ciencias || []).join(', ') || 'sin datos'}${profile.tendencias ? `\nTendencias: ${profile.tendencias}` : ''}`
      : 'Perfil sin calibrar aún'

    const pendingErrors = errors.filter(e => !e.resolved).slice(0, 5)
    const erroresStr = pendingErrors.length
      ? pendingErrors.map(e => `- [${e.materia?.toUpperCase()}] ${e.tema} (${e.prioridad}): ${e.descripcion}`).join('\n')
      : 'Sin errores pendientes de reforzar'

    const historialStr = history.slice(0, 5).length
      ? history.slice(0, 5).map(h =>
          `${h.date} | ${h.materia?.toUpperCase() || h.subject || '?'} | ${h.tipo} | ${h.correctas ?? h.correct ?? '?'}/${h.total ?? '?'} correctas${h.puntaje ? ` | ${h.puntaje} pts` : ''}`
        ).join('\n')
      : 'Sin ensayos registrados aún'

    return { fecha, stats: statsStr, perfil: perfilStr, errores: erroresStr, historial: historialStr }
  }

  async function executeTool(name, input) {
    switch (name) {
      case 'registrar_ensayo': {
        const pct = input.total > 0 ? Math.round((input.correctas / input.total) * 100) : 0
        await addPaesHistory(uid, {
          tipo:         input.tipo,
          materia:      input.materia,
          subject:      input.materia,
          correctas:    input.correctas,
          correct:      input.correctas,
          total:        input.total,
          pct,
          puntaje:      input.puntaje || null,
          temasErrados: input.temas_errados || '',
          observaciones: input.observaciones || '',
          date:         getLocalDate(),
        })
        await updatePaesStats(uid, {
          essaysCount:    (stats?.essaysCount || 0) + 1,
          totalAnswers:   (stats?.totalAnswers || 0) + (input.total || 0),
          correctAnswers: (stats?.correctAnswers || 0) + (input.correctas || 0),
          lastEssayDate:  getLocalDate(),
        })
        const puntStr = input.puntaje ? ` | ${input.puntaje} pts` : ''
        return `Ensayo registrado: ${input.materia?.toUpperCase()} ${input.correctas}/${input.total} (${pct}%)${puntStr}`
      }

      case 'registrar_error': {
        await addPaesError(uid, {
          materia:     input.materia,
          tema:        input.tema,
          descripcion: input.descripcion,
          prioridad:   input.prioridad,
        })
        return `Error registrado: [${input.materia?.toUpperCase()}] ${input.tema} (${input.prioridad})`
      }

      case 'actualizar_perfil_paes': {
        const updates = {}
        if (input.nivel)     updates.nivel = input.nivel
        if (input.dificultad) updates.dificultad = input.dificultad
        if (input.tendencias) updates.tendencias = input.tendencias

        const puntajeEstimado = {}
        if (input.puntaje_cl)       puntajeEstimado.cl       = input.puntaje_cl
        if (input.puntaje_m1)       puntajeEstimado.m1       = input.puntaje_m1
        if (input.puntaje_m2)       puntajeEstimado.m2       = input.puntaje_m2
        if (input.puntaje_ciencias) puntajeEstimado.ciencias = input.puntaje_ciencias
        if (Object.keys(puntajeEstimado).length) updates.puntajeEstimado = puntajeEstimado

        const areasDebiles = {}
        if (input.areas_debiles_cl)       areasDebiles.cl       = input.areas_debiles_cl.split(',').map(s => s.trim()).filter(Boolean)
        if (input.areas_debiles_m1)       areasDebiles.m1       = input.areas_debiles_m1.split(',').map(s => s.trim()).filter(Boolean)
        if (input.areas_debiles_m2)       areasDebiles.m2       = input.areas_debiles_m2.split(',').map(s => s.trim()).filter(Boolean)
        if (input.areas_debiles_ciencias) areasDebiles.ciencias = input.areas_debiles_ciencias.split(',').map(s => s.trim()).filter(Boolean)
        if (Object.keys(areasDebiles).length) updates.areasDebiles = areasDebiles

        await updatePaesProfile(uid, updates)
        return `Perfil PAES actualizado: nivel ${input.nivel || '—'} | dificultad ${input.dificultad || '—'}`
      }

      case 'guardar_ejercicio': {
        const opciones = input.opciones.split('|').map(s => s.trim())
        await addPaesEjercicio(uid, {
          stem:        input.enunciado,
          options:     opciones,
          correct:     input.correcta,
          explanation: input.explicacion,
          materia:     input.materia,
          tema:        input.tema,
          dificultad:  input.dificultad,
        })
        return `Ejercicio guardado: [${input.materia?.toUpperCase()}] ${input.tema} (${input.dificultad})`
      }

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
    if ((!input.trim() && !file) || loading) return
    const text    = input.trim()
    const fileRef = file
    setInput('')
    setFile(null)
    setLoading(true)

    // Mostrar mensaje del usuario en la UI
    const uiText = [text, fileRef ? `📎 ${fileRef.name}` : ''].filter(Boolean).join('\n')
    pushUi({ id: `u-${Date.now()}`, role: 'user', text: uiText })

    // Construir partes Gemini para el mensaje del usuario
    const userParts = []
    if (text) userParts.push({ text })
    if (fileRef) {
      userParts.push({ inlineData: { mimeType: fileRef.mimeType, data: fileRef.base64 } })
    }

    const newGeminiMsgs = [
      ...geminiMsgsRef.current,
      { role: 'user', parts: userParts },
    ]

    try {
      const context = buildContext()

      const r1 = await fetch('/api/paes-chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ messages: newGeminiMsgs, context }),
      })
      const d1 = await r1.json()
      if (d1.error) throw new Error(d1.error)

      if (d1.stop_reason === 'tool_use') {
        const textBefore = d1.content.find(b => b.type === 'text')?.text
        if (textBefore) pushUi({ id: `a-${Date.now()}`, role: 'assistant', text: textBefore })

        const toolBlocks  = d1.content.filter(b => b.type === 'tool_use')
        const toolResults = []

        for (const block of toolBlocks) {
          const chipId = `chip-${block.id}`
          pushUi({ id: chipId, role: 'action', text: toolLabel(block.name), pending: true })
          const result = await executeTool(block.name, block.input)
          replaceUi(chipId, { text: result, pending: false })
          toolResults.push({ tool_use_id: block.id, name: block.name, result })
        }

        const r2 = await fetch('/api/paes-chat', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            messages:          newGeminiMsgs,
            context,
            assistant_content: d1.content,
            tool_results:      toolResults,
          }),
        })
        const d2 = await r2.json()
        const finalText = d2.content?.find(b => b.type === 'text')?.text || ''
        if (finalText) pushUi({ id: `a2-${Date.now()}`, role: 'assistant', text: finalText })

        // Actualizar historial Gemini con el intercambio completo
        const modelParts = []
        for (const b of d1.content) {
          if (b.type === 'text' && b.text)  modelParts.push({ text: b.text })
          if (b.type === 'tool_use') modelParts.push({ functionCall: { name: b.name, args: b.input } })
        }
        const toolResponseParts = toolResults.map(tr => ({
          functionResponse: { name: tr.name, response: { result: String(tr.result) } },
        }))
        const finalModelParts = finalText ? [{ text: finalText }] : []

        geminiMsgsRef.current = [
          ...newGeminiMsgs,
          { role: 'model',  parts: modelParts },
          { role: 'user',   parts: toolResponseParts },
          { role: 'model',  parts: finalModelParts.length ? finalModelParts : [{ text: '' }] },
        ]
      } else {
        const reply = d1.content?.find(b => b.type === 'text')?.text || '…'
        pushUi({ id: `a-${Date.now()}`, role: 'assistant', text: reply })
        geminiMsgsRef.current = [
          ...newGeminiMsgs,
          { role: 'model', parts: [{ text: reply }] },
        ]
      }
    } catch (err) {
      pushUi({ id: `err-${Date.now()}`, role: 'assistant', text: `Error: ${err.message}`, isError: true })
    }

    setLoading(false)
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  function handleFileSelect(e) {
    const f = e.target.files?.[0]
    if (!f) return
    const reader = new FileReader()
    reader.onload = ev => {
      const dataUrl = ev.target.result
      const base64  = dataUrl.split(',')[1]
      setFile({ name: f.name, mimeType: f.type, base64 })
    }
    reader.readAsDataURL(f)
    e.target.value = ''
  }

  return { uiMessages, input, setInput, send, loading, handleKey, file, setFile, handleFileSelect, stats, profile, history, errors }
}
