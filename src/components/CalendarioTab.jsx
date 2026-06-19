import React, { useEffect, useRef, useState } from 'react'
import { subscribeGymStats, markGymSession, getBloquesOnce, markBloquesMigrated } from '../firebase/db'
import { gcalListarEventos, gcalCrearEvento, gcalActualizarEvento, gcalEliminarEvento, gcalEventToBloque } from '../utils/gcalApi'
import { requestCalendarAccess } from '../hooks/useGCalToken'

// ── Constantes ─────────────────────────────────────────────────────────────────

const HOUR_H  = 64
const TOTAL_H = 24 * HOUR_H

const DIAS_CORTO = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

const TIPOS = ['clase', 'estudio', 'paes', 'libre', 'ejercicio', 'otro']
const TIPO_META = {
  clase:     { label: 'Clase',     color: '#5b9cf6', bg: 'rgba(91,156,246,.18)',  border: 'rgba(91,156,246,.38)'  },
  estudio:   { label: 'Estudio',   color: '#c084fc', bg: 'rgba(192,132,252,.18)', border: 'rgba(192,132,252,.38)' },
  paes:      { label: 'PAES',      color: '#3ec97e', bg: 'rgba(62,201,126,.18)',  border: 'rgba(62,201,126,.38)'  },
  libre:     { label: 'Libre',     color: '#9e99ba', bg: 'rgba(158,153,186,.12)', border: 'rgba(158,153,186,.28)' },
  ejercicio: { label: 'Ejercicio', color: '#f0a740', bg: 'rgba(240,167,64,.18)',  border: 'rgba(240,167,64,.38)'  },
  otro:      { label: 'Otro',      color: '#625e7c', bg: 'rgba(98,94,124,.16)',   border: 'rgba(98,94,124,.32)'   },
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function getMonday(weekOffset = 0) {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  const dow = d.getDay()
  d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1) + weekOffset * 7)
  return d
}

function getWeekDays(weekOffset = 0) {
  const mon = getMonday(weekOffset)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon)
    d.setDate(mon.getDate() + i)
    return d
  })
}

function getWeekKey(weekOffset = 0) {
  const m = getMonday(weekOffset)
  return `${m.getFullYear()}-${String(m.getMonth()+1).padStart(2,'0')}-${String(m.getDate()).padStart(2,'0')}`
}

function toDateStr(date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
}

function todayStr() { return toDateStr(new Date()) }

function timeToMin(t) {
  const [h, m] = (t || '00:00').split(':').map(Number)
  return h * 60 + m
}

function minToTime(min) {
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`
}

// ── Componente principal ───────────────────────────────────────────────────────

export default function CalendarioTab({ uid, gcalToken, onGcalToken, gcalNeedsReconnect, gcalSilentPending, onGcalExpired }) {
  const [bloques,    setBloques]  = useState([])
  const [loading,    setLoading]  = useState(false)
  const [apiError,   setApiError] = useState(null)
  const [weekOffset, setWeekOff]  = useState(0)
  const [form,         setForm]         = useState(null)
  const [saving,       setSaving]       = useState(false)
  const [gymStats,     setGymStats]     = useState({ streak: 0, lastGymDate: null, totalSessions: 0 })
  const [gymSaving,    setGymSaving]    = useState(false)
  const [showMigr,     setShowMigr]     = useState(false)
  const scrollRef                       = useRef(null)

  // Gym stats siguen en Firestore
  useEffect(() => {
    if (!uid) return
    return subscribeGymStats(uid, setGymStats)
  }, [uid])

  // Cargar eventos de Google Calendar para la semana actual
  useEffect(() => {
    if (!gcalToken) { setBloques([]); return }
    const weekDays = getWeekDays(weekOffset)
    const timeMax  = new Date(weekDays[6])
    timeMax.setDate(timeMax.getDate() + 1)

    let cancelled = false
    setLoading(true)
    setApiError(null)

    gcalListarEventos(gcalToken, weekDays[0], timeMax)
      .then(items => {
        if (cancelled) return
        const mapped = items
          .map(e => gcalEventToBloque(e, weekDays))
          .filter(b => b !== null && b.dia >= 0)
        setBloques(mapped)
        setLoading(false)
      })
      .catch(err => {
        if (cancelled) return
        if (err.code === 'token_expired') onGcalExpired?.()
        else setApiError(err.message)
        setLoading(false)
      })

    return () => { cancelled = true }
  }, [weekOffset, gcalToken])

  // Mostrar modal de migración la primera vez que hay token válido
  useEffect(() => {
    if (!gcalToken) return
    if (localStorage.getItem('cd_gcal_migration')) return
    setShowMigr(true)
  }, [gcalToken])

  // Auto-scroll a la hora actual
  useEffect(() => {
    if (!loading && weekOffset === 0 && scrollRef.current) {
      const h = new Date().getHours()
      scrollRef.current.scrollTop = Math.max(0, (h - 1.5) * HOUR_H)
    }
  }, [loading, weekOffset])

  async function handleMarkGym() {
    if (gymSaving || gymStats.lastGymDate === todayStr()) return
    setGymSaving(true)
    await markGymSession(uid, gymStats)
    setGymSaving(false)
  }

  async function reloadEventos() {
    if (!gcalToken) return
    const weekDays = getWeekDays(weekOffset)
    const timeMax  = new Date(weekDays[6])
    timeMax.setDate(timeMax.getDate() + 1)
    const items = await gcalListarEventos(gcalToken, weekDays[0], timeMax)
    const mapped = items
      .map(e => gcalEventToBloque(e, weekDays))
      .filter(b => b !== null && b.dia >= 0)
    setBloques(mapped)
  }

  const weekDays = getWeekDays(weekOffset)
  const weekKey  = getWeekKey(weekOffset)
  const today    = todayStr()
  const todayIdx = weekDays.findIndex(d => toDateStr(d) === today)

  const now    = new Date()
  const nowTop = ((now.getHours() * 60 + now.getMinutes()) / 60) * HOUR_H

  function bloquesDelDia(di) {
    return bloques
      .filter(b => b.dia === di)
      .sort((a, b) => timeToMin(a.horaInicio) - timeToMin(b.horaInicio))
  }

  function handleDayClick(e, di) {
    if (e.target !== e.currentTarget) return
    const rect   = e.currentTarget.getBoundingClientRect()
    const y      = e.clientY - rect.top
    const snap   = Math.round((y / HOUR_H * 60) / 30) * 30
    const clamp  = Math.max(0, Math.min(23 * 60 + 30, snap))
    const endMin = Math.min(clamp + 60, 24 * 60)
    setForm({
      mode: 'new', dia: di,
      titulo: '', descripcion: '', tipo: 'estudio', recurrente: true,
      horaInicio: minToTime(clamp),
      horaFin:    minToTime(endMin),
    })
  }

  function openEdit(b) {
    setForm({
      mode:        'edit',
      id:          b.id,
      titulo:      b.titulo || '',
      descripcion: b.descripcion || '',
      tipo:        b.tipo || 'estudio',
      dia:         b.dia ?? 0,
      horaInicio:  b.horaInicio || '08:00',
      horaFin:     b.horaFin   || '09:00',
      recurrente:  b.semana === null,
    })
  }

  function setField(key, val) {
    setForm(f => f ? { ...f, [key]: val } : f)
  }

  async function handleSave() {
    if (!form || !form.titulo.trim() || !gcalToken) return
    setSaving(true)
    try {
      const dayDate = weekDays[form.dia]
      if (form.mode === 'new') {
        await gcalCrearEvento(gcalToken, form, dayDate)
      } else {
        await gcalActualizarEvento(gcalToken, form.id, form, dayDate)
      }
      await reloadEventos()
      setForm(null)
    } catch (err) {
      if (err.code === 'token_expired') onGcalExpired?.()
      else setApiError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!form?.id || !gcalToken) return
    setSaving(true)
    try {
      await gcalEliminarEvento(gcalToken, form.id)
      await reloadEventos()
      setForm(null)
    } catch (err) {
      if (err.code === 'token_expired') onGcalExpired?.()
      else setApiError(err.message)
    } finally {
      setSaving(false)
    }
  }

  function handleReconnect() {
    requestCalendarAccess(
      (at) => { onGcalToken(at) },
      (err) => { setApiError(`No se pudo conectar Google Calendar: ${err}`) }
    )
  }

  const weekStart    = weekDays[0].toLocaleDateString('es-CL', { day: 'numeric', month: 'long' })
  const weekEnd      = weekDays[6].toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })
  // Mostrar banner cuando no hay token y no está en curso un refresh silencioso
  const needsConnect = !gcalToken && !gcalSilentPending
  const everConnected = !!localStorage.getItem('gcal_connected_once')

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', position:'relative' }}>

      {/* ── Migración one-shot ── */}
      {showMigr && (
        <MigracionModal
          uid={uid}
          gcalToken={gcalToken}
          onDone={() => setShowMigr(false)}
        />
      )}

      {/* ── Header ── */}
      <div style={{ padding:'22px 28px 14px', flexShrink:0, borderBottom:'1px solid var(--border)' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'3px' }}>
              <h1 style={{ fontSize:'22px', fontWeight:700, color:'var(--text0)', letterSpacing:'-.4px' }}>
                Calendario
              </h1>
              <div style={{
                display:'inline-flex', alignItems:'center', gap:'5px',
                padding:'2px 8px', borderRadius:'20px',
                background: needsConnect ? 'rgba(240,114,114,.1)' : 'rgba(62,201,126,.1)',
                border: `1px solid ${needsConnect ? 'rgba(240,114,114,.3)' : 'rgba(62,201,126,.3)'}`,
                fontSize:'10px', fontWeight:600, letterSpacing:'.3px',
                color: needsConnect ? '#f07272' : 'var(--green)',
              }}>
                <span style={{ width:'5px', height:'5px', borderRadius:'50%', background: needsConnect ? '#f07272' : 'var(--green)' }} />
                {needsConnect ? 'Desconectado' : 'Google Calendar'}
              </div>
            </div>
            <p style={{ fontSize:'12px', color:'var(--text2)', textTransform:'capitalize' }}>
              {weekOffset === 0 ? 'Esta semana · ' : weekOffset === -1 ? 'Semana pasada · ' : weekOffset === 1 ? 'Próxima semana · ' : ''}
              {weekStart} — {weekEnd}
            </p>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
            <GymWidget gymStats={gymStats} saving={gymSaving} onMark={handleMarkGym} />
            <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
              <NavBtn onClick={() => setWeekOff(w => w - 1)} title="Semana anterior">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
              </NavBtn>
              {weekOffset !== 0 && (
                <button onClick={() => setWeekOff(0)} style={{
                  padding:'5px 12px', borderRadius:'7px', border:'1px solid var(--border)',
                  background:'none', color:'var(--text1)', fontSize:'12px', fontWeight:500,
                  fontFamily:'Inter, sans-serif', cursor:'pointer', transition:'all .12s',
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor='var(--border-hi)'; e.currentTarget.style.color='var(--text0)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.color='var(--text1)' }}
                >Hoy</button>
              )}
              <NavBtn onClick={() => setWeekOff(w => w + 1)} title="Semana siguiente">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
              </NavBtn>
            </div>
          </div>
        </div>

        {/* Banner de error de API */}
        {apiError && (
          <div style={{
            marginTop:'10px', padding:'8px 12px', borderRadius:'7px',
            background:'rgba(240,114,114,.1)', border:'1px solid rgba(240,114,114,.3)',
            display:'flex', alignItems:'center', gap:'8px',
          }}>
            <span style={{ fontSize:'12px', color:'#f07272', flex:1 }}>Error: {apiError}</span>
            <button onClick={() => setApiError(null)} style={{
              background:'none', border:'none', color:'#f07272', cursor:'pointer', fontSize:'14px', lineHeight:1,
            }}>×</button>
          </div>
        )}
      </div>

      {/* ── Banner si no hay token ── */}
      {needsConnect && (
        <div style={{
          margin:'16px 28px', padding:'16px 20px', borderRadius:'10px',
          background:'var(--bg1)', border:'1px solid var(--border)',
          display:'flex', alignItems:'center', gap:'14px',
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2"/>
            <path d="M16 2v4M8 2v4M3 10h18"/>
          </svg>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:'14px', fontWeight:600, color:'var(--text0)', marginBottom:'3px' }}>
              {everConnected ? 'Sesión de Google Calendar expirada' : 'Conectá tu Google Calendar'}
            </div>
            <div style={{ fontSize:'12px', color:'var(--text2)' }}>
              {everConnected
                ? 'No se pudo renovar la sesión automáticamente. Reconectá para continuar.'
                : 'Para ver y editar tus eventos, necesitás autorizar el acceso a Google Calendar.'}
            </div>
          </div>
          <button
            onClick={handleReconnect}
            style={{
              padding:'8px 16px', borderRadius:'8px', border:'none',
              background:'var(--accent)', color:'#fff',
              fontSize:'13px', fontWeight:500, fontFamily:'Inter, sans-serif',
              cursor:'pointer', whiteSpace:'nowrap',
            }}
          >
            {everConnected ? 'Reconectar' : 'Conectar Google Calendar'}
          </button>
        </div>
      )}

      {/* ── Grid scrollable ── */}
      <div ref={scrollRef} style={{ flex:1, overflowY:'auto', overflowX:'auto', opacity: needsConnect ? .35 : 1, pointerEvents: needsConnect ? 'none' : 'auto' }}>
        <div style={{ minWidth:'580px' }}>

          {/* Cabecera días */}
          <div style={{
            display:'flex', position:'sticky', top:0, zIndex:20,
            background:'var(--bg0)', borderBottom:'1px solid var(--border)',
          }}>
            <div style={{ width:'52px', flexShrink:0, borderRight:'1px solid var(--border)' }} />
            {weekDays.map((day, di) => {
              const isHoy = di === todayIdx
              return (
                <div key={di} style={{
                  flex:1, padding:'8px 0 10px', textAlign:'center',
                  borderRight: di < 6 ? '1px solid var(--border)' : 'none',
                  background: isHoy ? 'rgba(124,110,245,.05)' : 'none',
                }}>
                  <div style={{ fontSize:'10px', fontWeight:600, color: isHoy ? 'var(--accent)' : 'var(--text2)', textTransform:'uppercase', letterSpacing:'.6px', marginBottom:'4px' }}>
                    {DIAS_CORTO[di]}
                  </div>
                  <div style={{
                    display:'inline-flex', alignItems:'center', justifyContent:'center',
                    width:'28px', height:'28px', borderRadius:'50%',
                    background: isHoy ? 'var(--accent)' : 'none',
                    fontSize:'14px', fontWeight: isHoy ? 700 : 400,
                    color: isHoy ? '#fff' : 'var(--text0)',
                  }}>
                    {day.getDate()}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Grilla de tiempo */}
          <div style={{ display:'flex' }}>
            <div style={{ width:'52px', flexShrink:0, position:'relative', height:`${TOTAL_H}px`, borderRight:'1px solid var(--border)' }}>
              {Array.from({ length: 24 }, (_, h) => (
                <div key={h} style={{
                  position:'absolute', top:`${h * HOUR_H - 7}px`, right:'7px',
                  fontSize:'10px', color:'var(--text2)', fontFamily:"'IBM Plex Mono', monospace",
                  lineHeight:1, pointerEvents:'none', userSelect:'none',
                }}>
                  {String(h).padStart(2,'0')}:00
                </div>
              ))}
            </div>

            <div style={{ flex:1, position:'relative', display:'flex', height:`${TOTAL_H}px` }}>
              {/* Líneas de horas */}
              <div style={{ position:'absolute', inset:0, pointerEvents:'none', zIndex:0 }}>
                {Array.from({ length: 24 }, (_, h) => (
                  <React.Fragment key={h}>
                    <div style={{ position:'absolute', top:`${h * HOUR_H}px`, left:0, right:0, height:'1px', background:'var(--border)' }} />
                    <div style={{ position:'absolute', top:`${h * HOUR_H + HOUR_H/2}px`, left:0, right:0, height:'1px', background:'var(--border)', opacity:.28 }} />
                  </React.Fragment>
                ))}
              </div>

              {/* Columnas */}
              {weekDays.map((day, di) => {
                const isHoy = di === todayIdx
                return (
                  <div key={di} onClick={e => handleDayClick(e, di)} style={{
                    flex:1, position:'relative',
                    borderRight: di < 6 ? '1px solid var(--border)' : 'none',
                    background: isHoy ? 'rgba(124,110,245,.022)' : 'none',
                    cursor:'cell', userSelect:'none', zIndex:1,
                  }}>
                    {isHoy && weekOffset === 0 && (
                      <div style={{
                        position:'absolute', left:0, right:0, top:`${nowTop}px`,
                        height:'2px', background:'#f07272', zIndex:8, pointerEvents:'none',
                      }}>
                        <div style={{
                          position:'absolute', left:'-5px', top:'-4px',
                          width:'10px', height:'10px', borderRadius:'50%', background:'#f07272',
                        }} />
                      </div>
                    )}
                    {loading
                      ? null
                      : bloquesDelDia(di).map(b => (
                          <BloqueCard key={b.id} bloque={b} onEdit={() => openEdit(b)} />
                        ))
                    }
                  </div>
                )
              })}
            </div>
          </div>

          {/* Spinner de carga */}
          {loading && (
            <div style={{
              position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center',
              background:'rgba(0,0,0,.06)', zIndex:10, pointerEvents:'none',
            }}>
              <span style={{ color:'var(--text2)', fontSize:'13px' }}>Cargando eventos...</span>
            </div>
          )}
        </div>
      </div>

      {/* Overlay para cerrar panel */}
      {form && (
        <div style={{ position:'fixed', inset:0, zIndex:40 }} onClick={() => setForm(null)} />
      )}

      {/* Panel lateral */}
      <BloquePanel
        form={form}
        setField={setField}
        onSave={handleSave}
        onCancel={() => setForm(null)}
        onDelete={handleDelete}
        saving={saving}
      />
    </div>
  )
}

// ── Modal de migración one-shot ────────────────────────────────────────────────

function MigracionModal({ uid, gcalToken, onDone }) {
  const [step,      setStep]   = useState('check')  // 'check' | 'confirm' | 'importing' | 'done'
  const [bloques,   setBloques] = useState([])
  const [resultado, setResult]  = useState(null)

  useEffect(() => {
    getBloquesOnce(uid).then(all => {
      const pending = all.filter(b => !b._migrated)
      setBloques(pending)
      if (pending.length === 0) {
        localStorage.setItem('cd_gcal_migration', 'done')
        onDone()
      } else {
        setStep('confirm')
      }
    }).catch(() => {
      localStorage.setItem('cd_gcal_migration', 'done')
      onDone()
    })
  }, [uid])

  async function handleImportar() {
    setStep('importing')
    let ok = 0, failed = 0
    const monday = getMonday(0)

    for (const b of bloques) {
      try {
        let dayDate
        if (!b.semana) {
          dayDate = new Date(monday)
          dayDate.setDate(monday.getDate() + (b.dia ?? 0))
        } else {
          const [y, m, d] = b.semana.split('-').map(Number)
          const wmon = new Date(y, m - 1, d)
          dayDate = new Date(wmon)
          dayDate.setDate(wmon.getDate() + (b.dia ?? 0))
        }
        await gcalCrearEvento(gcalToken, {
          titulo:      b.titulo      || '(sin título)',
          descripcion: b.descripcion || '',
          tipo:        b.tipo        || 'otro',
          dia:         b.dia         ?? 0,
          horaInicio:  b.horaInicio  || '08:00',
          horaFin:     b.horaFin     || '09:00',
          recurrente:  !b.semana,
        }, dayDate)
        ok++
      } catch { failed++ }
    }

    await markBloquesMigrated(uid)
    localStorage.setItem('cd_gcal_migration', 'done')
    setResult({ ok, failed })
    setStep('done')
  }

  function handleDescartar() {
    localStorage.setItem('cd_gcal_migration', 'dismissed')
    onDone()
  }

  if (step === 'check') return null

  return (
    <div style={{
      position:'fixed', inset:0, zIndex:100,
      background:'rgba(0,0,0,.55)', backdropFilter:'blur(3px)',
      display:'flex', alignItems:'center', justifyContent:'center',
    }}>
      <div style={{
        width:'100%', maxWidth:'420px', margin:'0 20px',
        background:'var(--bg1)', border:'1px solid var(--border)',
        borderRadius:'14px', padding:'28px 26px', boxShadow:'0 20px 60px rgba(0,0,0,.4)',
      }}>
        {step === 'confirm' && (
          <>
            <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'18px' }}>
              <div style={{
                width:'40px', height:'40px', borderRadius:'10px', flexShrink:0,
                background:'var(--accent-dim)', display:'flex', alignItems:'center', justifyContent:'center',
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2"/>
                  <path d="M16 2v4M8 2v4M3 10h18"/>
                </svg>
              </div>
              <div>
                <h3 style={{ fontSize:'15px', fontWeight:700, color:'var(--text0)', marginBottom:'2px' }}>
                  Importar eventos existentes
                </h3>
                <p style={{ fontSize:'12px', color:'var(--text2)' }}>
                  {bloques.length} evento{bloques.length !== 1 ? 's' : ''} encontrado{bloques.length !== 1 ? 's' : ''} en la app
                </p>
              </div>
            </div>
            <p style={{ fontSize:'13px', color:'var(--text1)', lineHeight:1.6, marginBottom:'10px' }}>
              Tenés {bloques.length} evento{bloques.length !== 1 ? 's' : ''} guardado{bloques.length !== 1 ? 's' : ''} en la app. ¿Querés importarlos a tu Google Calendar?
            </p>
            <p style={{ fontSize:'11px', color:'var(--text2)', lineHeight:1.5, marginBottom:'22px',
              padding:'8px 10px', background:'var(--bg2)', borderRadius:'7px', border:'1px solid var(--border)',
            }}>
              Los originales quedarán en Firestore como respaldo (marcados como migrados). No se van a borrar.
            </p>
            <div style={{ display:'flex', gap:'8px' }}>
              <button onClick={handleDescartar} style={{
                flex:1, padding:'9px', borderRadius:'8px', border:'1px solid var(--border)',
                background:'none', color:'var(--text1)', fontSize:'13px', fontWeight:500,
                fontFamily:'Inter, sans-serif', cursor:'pointer',
              }}>
                No, ignorar
              </button>
              <button onClick={handleImportar} style={{
                flex:2, padding:'9px', borderRadius:'8px', border:'none',
                background:'var(--accent)', color:'#fff', fontSize:'13px', fontWeight:600,
                fontFamily:'Inter, sans-serif', cursor:'pointer',
              }}>
                Importar {bloques.length} evento{bloques.length !== 1 ? 's' : ''}
              </button>
            </div>
          </>
        )}

        {step === 'importing' && (
          <div style={{ textAlign:'center', padding:'12px 0' }}>
            <div style={{ fontSize:'14px', color:'var(--text0)', fontWeight:600, marginBottom:'8px' }}>
              Importando...
            </div>
            <div style={{ fontSize:'12px', color:'var(--text2)' }}>
              Creando eventos en tu Google Calendar
            </div>
          </div>
        )}

        {step === 'done' && (
          <>
            <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'16px' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5"/>
              </svg>
              <span style={{ fontSize:'15px', fontWeight:700, color:'var(--text0)' }}>Importación completada</span>
            </div>
            <p style={{ fontSize:'13px', color:'var(--text1)', marginBottom: resultado?.failed > 0 ? '8px' : '22px' }}>
              {resultado?.ok} evento{resultado?.ok !== 1 ? 's' : ''} importado{resultado?.ok !== 1 ? 's' : ''} exitosamente.
            </p>
            {resultado?.failed > 0 && (
              <p style={{ fontSize:'12px', color:'var(--amber)', marginBottom:'22px' }}>
                {resultado.failed} evento{resultado.failed !== 1 ? 's' : ''} no se pudieron importar.
              </p>
            )}
            <button onClick={onDone} style={{
              width:'100%', padding:'9px', borderRadius:'8px', border:'none',
              background:'var(--accent)', color:'#fff', fontSize:'13px', fontWeight:600,
              fontFamily:'Inter, sans-serif', cursor:'pointer',
            }}>
              Cerrar
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ── Widget de racha de gym ─────────────────────────────────────────────────────

function GymWidget({ gymStats, saving, onMark }) {
  const marcadoHoy = gymStats.lastGymDate === todayStr()
  return (
    <div style={{
      display:'flex', alignItems:'center', gap:'8px',
      padding:'5px 10px', borderRadius:'8px',
      border:`1px solid ${marcadoHoy ? 'rgba(240,167,64,.35)' : 'var(--border)'}`,
      background: marcadoHoy ? 'rgba(240,167,64,.08)' : 'var(--bg2)',
    }}>
      <span style={{ fontSize:'14px' }}>🏋️</span>
      <div>
        <div style={{ display:'flex', alignItems:'baseline', gap:'3px' }}>
          <span style={{
            fontFamily:"'IBM Plex Mono', monospace", fontSize:'15px', fontWeight:700,
            color:'var(--amber)', lineHeight:1,
          }}>{gymStats.streak}</span>
          <span style={{ fontSize:'10px', color:'var(--text2)' }}>días</span>
        </div>
        <div style={{ fontSize:'9px', color:'var(--text2)', lineHeight:1, marginTop:'1px' }}>Racha gym</div>
      </div>
      {!marcadoHoy ? (
        <button onClick={onMark} disabled={saving} title="Marcar sesión de hoy" style={{
          padding:'4px 10px', borderRadius:'6px', border:'1px solid var(--amber)',
          background:'rgba(240,167,64,.12)', color:'var(--amber)',
          fontSize:'11px', fontWeight:600, fontFamily:'Inter, sans-serif',
          cursor: saving ? 'wait' : 'pointer', opacity: saving ? .7 : 1, transition:'background .12s',
        }}
          onMouseEnter={e => { if (!saving) e.currentTarget.style.background='rgba(240,167,64,.22)' }}
          onMouseLeave={e => { e.currentTarget.style.background='rgba(240,167,64,.12)' }}
        >+ Sesión</button>
      ) : (
        <span style={{ fontSize:'11px', color:'var(--amber)', fontWeight:600, display:'flex', alignItems:'center', gap:'3px' }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5"/>
          </svg>
          Hoy ✓
        </span>
      )}
    </div>
  )
}

// ── Botón de navegación ────────────────────────────────────────────────────────

function NavBtn({ onClick, title, children }) {
  const [hov, setHov] = useState(false)
  return (
    <button onClick={onClick} title={title}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        width:'30px', height:'30px', display:'flex', alignItems:'center', justifyContent:'center',
        borderRadius:'7px', border:`1px solid ${hov ? 'var(--border-hi)' : 'var(--border)'}`,
        background:'none', color: hov ? 'var(--text0)' : 'var(--text1)',
        cursor:'pointer', transition:'all .12s',
      }}
    >{children}</button>
  )
}

// ── Tarjeta de bloque ──────────────────────────────────────────────────────────

function BloqueCard({ bloque, onEdit }) {
  const [hov, setHov] = useState(false)
  const t        = TIPO_META[bloque.tipo] || TIPO_META.otro
  const startMin = timeToMin(bloque.horaInicio)
  const endMin   = timeToMin(bloque.horaFin)
  const top      = (startMin / 60) * HOUR_H
  const height   = Math.max(((endMin - startMin) / 60) * HOUR_H, 22)
  const compact  = height < 46
  const showDesc = !compact && height >= 80 && bloque.descripcion

  return (
    <div
      onClick={e => { e.stopPropagation(); onEdit() }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        position:'absolute',
        top:`${top + 2}px`,
        height:`${height - 3}px`,
        left:'2px', right:'2px',
        borderRadius:'5px',
        background: t.bg,
        borderTop:    `1px solid ${t.border}`,
        borderRight:  `1px solid ${t.border}`,
        borderBottom: `1px solid ${t.border}`,
        borderLeft:   `3px solid ${t.color}`,
        padding: compact ? '2px 5px' : '5px 7px',
        overflow:'hidden',
        cursor:'pointer', zIndex:2,
        boxShadow: hov ? '0 3px 10px rgba(0,0,0,.3)' : '0 1px 4px rgba(0,0,0,.18)',
        transform: hov ? 'scaleX(.98)' : 'scaleX(1)',
        transition:'box-shadow .12s, transform .12s',
        userSelect:'none',
      }}
    >
      {/* Punto = evento único (no recurrente) */}
      {bloque.semana && (
        <div style={{
          position:'absolute', top:'4px', right:'5px',
          width:'5px', height:'5px', borderRadius:'50%',
          background: t.color, opacity:.55,
        }} />
      )}
      <div style={{
        fontSize: compact ? '10px' : '11px', fontWeight:700, color: t.color,
        lineHeight:1.3, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
      }}>
        {bloque.titulo}
      </div>
      {!compact && (
        <div style={{
          fontSize:'10px', color: t.color, opacity:.72,
          fontFamily:"'IBM Plex Mono', monospace", lineHeight:1.2, marginTop:'2px',
        }}>
          {bloque.horaInicio}–{bloque.horaFin}
        </div>
      )}
      {showDesc && (
        <div style={{
          fontSize:'10px', color: t.color, opacity:.6, lineHeight:1.4, marginTop:'4px',
          overflow:'hidden', display:'-webkit-box',
          WebkitLineClamp: 2, WebkitBoxOrient:'vertical',
        }}>
          {bloque.descripcion}
        </div>
      )}
    </div>
  )
}

// ── Panel lateral de formulario ────────────────────────────────────────────────

function BloquePanel({ form, setField, onSave, onCancel, onDelete, saving }) {
  return (
    <div style={{
      position:'fixed', top:0, right:0, bottom:0, width:'300px',
      background:'var(--bg1)', borderLeft:'1px solid var(--border)',
      boxShadow:'-10px 0 40px rgba(0,0,0,.28)',
      zIndex:50, display:'flex', flexDirection:'column',
      transform: form ? 'translateX(0)' : 'translateX(100%)',
      transition:'transform .22s ease',
    }}>
      {form && (
        <PanelContent
          form={form}
          setField={setField}
          onSave={onSave}
          onCancel={onCancel}
          onDelete={onDelete}
          saving={saving}
        />
      )}
    </div>
  )
}

function PanelContent({ form, setField, onSave, onCancel, onDelete, saving }) {
  const isEdit  = form.mode === 'edit'
  const canSave = !!form.titulo.trim() && !saving

  function handleStartChange(val) {
    setField('horaInicio', val)
    if (timeToMin(val) >= timeToMin(form.horaFin)) {
      setField('horaFin', minToTime(Math.min(timeToMin(val) + 60, 24 * 60)))
    }
  }

  return (
    <div style={{ flex:1, overflowY:'auto', padding:'22px 20px 24px', display:'flex', flexDirection:'column', gap:'20px' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <h3 style={{ fontSize:'15px', fontWeight:700, color:'var(--text0)', letterSpacing:'-.2px' }}>
          {isEdit ? 'Editar evento' : 'Nuevo evento'}
        </h3>
        <button onClick={onCancel} style={{
          width:'26px', height:'26px', display:'flex', alignItems:'center', justifyContent:'center',
          background:'none', border:'none', color:'var(--text2)', fontSize:'18px',
          cursor:'pointer', borderRadius:'5px', lineHeight:1, transition:'color .1s',
        }}
          onMouseEnter={e => e.currentTarget.style.color='var(--text0)'}
          onMouseLeave={e => e.currentTarget.style.color='var(--text2)'}
        >×</button>
      </div>

      <div>
        <FieldLabel>Título</FieldLabel>
        <input
          autoFocus
          value={form.titulo}
          onChange={e => setField('titulo', e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); onSave() } }}
          placeholder="Ej: Matemáticas, Gym, Estudio PAES..."
          style={{
            width:'100%', background:'var(--bg2)', border:'1px solid var(--border)',
            borderRadius:'8px', padding:'9px 11px', outline:'none',
            color:'var(--text0)', fontSize:'13px', fontWeight:500,
            fontFamily:'Inter, sans-serif', transition:'border-color .12s',
          }}
          onFocus={e => e.currentTarget.style.borderColor='var(--accent-border)'}
          onBlur={e => e.currentTarget.style.borderColor='var(--border)'}
        />
      </div>

      <div>
        <FieldLabel>Descripción <span style={{ fontWeight:400, textTransform:'none', letterSpacing:0, opacity:.6 }}>· opcional</span></FieldLabel>
        <textarea
          value={form.descripcion || ''}
          onChange={e => setField('descripcion', e.target.value)}
          placeholder="Notas, sala, link..."
          rows={2}
          style={{
            width:'100%', background:'var(--bg2)', border:'1px solid var(--border)',
            borderRadius:'8px', padding:'9px 11px', outline:'none', resize:'vertical',
            color:'var(--text1)', fontSize:'12px', lineHeight:1.6,
            fontFamily:'Inter, sans-serif', transition:'border-color .12s',
          }}
          onFocus={e => e.currentTarget.style.borderColor='var(--accent-border)'}
          onBlur={e => e.currentTarget.style.borderColor='var(--border)'}
        />
      </div>

      <div>
        <FieldLabel>Tipo</FieldLabel>
        <div style={{ display:'flex', flexWrap:'wrap', gap:'5px' }}>
          {TIPOS.map(tp => {
            const tm = TIPO_META[tp]
            const active = form.tipo === tp
            return (
              <button key={tp} onClick={() => setField('tipo', tp)} style={{
                display:'flex', alignItems:'center', gap:'5px',
                padding:'5px 10px', borderRadius:'20px',
                border:`1px solid ${active ? tm.color : 'var(--border)'}`,
                background: active ? tm.bg : 'none',
                color: active ? tm.color : 'var(--text2)',
                fontSize:'11px', fontWeight: active ? 600 : 400,
                fontFamily:'Inter, sans-serif', cursor:'pointer', transition:'all .1s',
              }}>
                <span style={{ width:'6px', height:'6px', borderRadius:'50%', background: tm.color, flexShrink:0 }} />
                {tm.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Día — solo en modo nuevo */}
      {!isEdit && (
        <div>
          <FieldLabel>Día</FieldLabel>
          <div style={{ display:'flex', gap:'4px' }}>
            {DIAS_CORTO.map((d, i) => {
              const active = form.dia === i
              return (
                <button key={i} onClick={() => setField('dia', i)} style={{
                  flex:1, padding:'6px 0', borderRadius:'6px', textAlign:'center',
                  border:`1px solid ${active ? 'var(--accent-border)' : 'var(--border)'}`,
                  background: active ? 'var(--accent-dim)' : 'none',
                  color: active ? 'var(--accent)' : 'var(--text2)',
                  fontSize:'11px', fontWeight: active ? 600 : 400,
                  fontFamily:'Inter, sans-serif', cursor:'pointer', transition:'all .1s',
                }}>{d}</button>
              )
            })}
          </div>
        </div>
      )}

      <div>
        <FieldLabel>Horario</FieldLabel>
        <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
          <TimeInput value={form.horaInicio} onChange={handleStartChange} />
          <span style={{ color:'var(--text2)', fontSize:'12px' }}>→</span>
          <TimeInput value={form.horaFin} onChange={v => setField('horaFin', v)} />
        </div>
      </div>

      {/* Recurrencia — solo en modo nuevo */}
      {!isEdit && (
        <div>
          <FieldLabel>Recurrencia</FieldLabel>
          <div style={{ display:'flex', gap:'6px' }}>
            {[
              { val: true,  label: 'Recurrente',  desc: 'Todas las semanas' },
              { val: false, label: 'Esta semana',  desc: 'Solo esta semana'  },
            ].map(op => {
              const active = form.recurrente === op.val
              return (
                <button key={String(op.val)} onClick={() => setField('recurrente', op.val)} style={{
                  flex:1, padding:'8px 6px', borderRadius:'8px', textAlign:'center',
                  border:`1px solid ${active ? 'var(--accent-border)' : 'var(--border)'}`,
                  background: active ? 'var(--accent-dim)' : 'none',
                  color: active ? 'var(--accent)' : 'var(--text2)',
                  fontFamily:'Inter, sans-serif', cursor:'pointer', transition:'all .12s',
                }}>
                  <div style={{ fontSize:'12px', fontWeight: active ? 600 : 400, marginBottom:'2px' }}>{op.label}</div>
                  <div style={{ fontSize:'10px', opacity:.7 }}>{op.desc}</div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Indicador recurrente en modo edición */}
      {isEdit && (
        <div style={{ padding:'7px 10px', borderRadius:'7px', background:'var(--bg2)', border:'1px solid var(--border)' }}>
          <span style={{ fontSize:'11px', color:'var(--text2)' }}>
            {form.recurrente ? '↻ Evento recurrente — edita solo esta ocurrencia' : '◉ Evento único'}
          </span>
        </div>
      )}

      <div style={{ marginTop:'auto', display:'flex', flexDirection:'column', gap:'8px' }}>
        {isEdit && (
          <button onClick={onDelete} disabled={saving} style={{
            padding:'8px', borderRadius:'7px',
            border:'1px solid rgba(240,114,114,.3)',
            background:'rgba(240,114,114,.08)', color:'#f07272',
            fontSize:'12px', fontWeight:500,
            fontFamily:'Inter, sans-serif', cursor:'pointer', transition:'all .12s',
          }}
            onMouseEnter={e => { e.currentTarget.style.background='rgba(240,114,114,.15)'; e.currentTarget.style.borderColor='rgba(240,114,114,.5)' }}
            onMouseLeave={e => { e.currentTarget.style.background='rgba(240,114,114,.08)'; e.currentTarget.style.borderColor='rgba(240,114,114,.3)' }}
          >
            Eliminar evento
          </button>
        )}
        <div style={{ display:'flex', gap:'8px' }}>
          <button onClick={onCancel} style={{
            flex:1, padding:'9px', borderRadius:'7px', border:'1px solid var(--border)',
            background:'none', color:'var(--text1)', fontSize:'13px', fontWeight:500,
            fontFamily:'Inter, sans-serif', cursor:'pointer', transition:'border-color .12s',
          }}
            onMouseEnter={e => e.currentTarget.style.borderColor='var(--border-hi)'}
            onMouseLeave={e => e.currentTarget.style.borderColor='var(--border)'}
          >Cancelar</button>
          <button onClick={onSave} disabled={!canSave} style={{
            flex:2, padding:'9px', borderRadius:'7px', border:'none',
            background: canSave ? 'var(--accent)' : 'var(--bg3)',
            color: canSave ? '#fff' : 'var(--text2)',
            fontSize:'13px', fontWeight:600, fontFamily:'Inter, sans-serif',
            cursor: canSave ? 'pointer' : 'not-allowed',
            opacity: saving ? .7 : 1, transition:'all .12s',
          }}>
            {saving ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Agregar evento'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Sub-componentes de formulario ──────────────────────────────────────────────

function FieldLabel({ children }) {
  return (
    <div style={{
      fontSize:'11px', fontWeight:600, color:'var(--text2)',
      textTransform:'uppercase', letterSpacing:'.5px', marginBottom:'8px',
    }}>
      {children}
    </div>
  )
}

function TimeInput({ value, onChange }) {
  return (
    <input
      type="time"
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        flex:1, background:'var(--bg2)', border:'1px solid var(--border)',
        borderRadius:'8px', padding:'8px 10px', outline:'none',
        color:'var(--text0)', fontSize:'13px', fontFamily:"'IBM Plex Mono', monospace",
        cursor:'pointer', transition:'border-color .12s',
        colorScheme: document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light',
      }}
      onFocus={e => e.currentTarget.style.borderColor='var(--accent-border)'}
      onBlur={e => e.currentTarget.style.borderColor='var(--border)'}
    />
  )
}
