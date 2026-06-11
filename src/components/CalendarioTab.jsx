import React, { useEffect, useRef, useState } from 'react'
import { subscribeBloques, addBloque, updateBloque, deleteBloque } from '../firebase/db'

// ── Constantes ─────────────────────────────────────────────────────────────────

const HOUR_H  = 64               // px por hora
const TOTAL_H = 24 * HOUR_H      // 1536px total

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

const FORM_DEFAULTS = {
  titulo: '', tipo: 'estudio', dia: 0,
  horaInicio: '08:00', horaFin: '09:00', recurrente: true,
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function getMonday(weekOffset = 0) {
  const d   = new Date()
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

export default function CalendarioTab({ uid }) {
  const [bloques, setBloques]    = useState([])
  const [loading, setLoading]    = useState(true)
  const [weekOffset, setWeekOff] = useState(0)
  const [form, setForm]          = useState(null)
  const [saving, setSaving]      = useState(false)
  const scrollRef                = useRef(null)

  useEffect(() => {
    if (!uid) return
    const unsub = subscribeBloques(uid, data => { setBloques(data); setLoading(false) })
    return unsub
  }, [uid])

  // Auto-scroll a la hora actual al cargar
  useEffect(() => {
    if (!loading && weekOffset === 0 && scrollRef.current) {
      const h = new Date().getHours()
      scrollRef.current.scrollTop = Math.max(0, (h - 1.5) * HOUR_H)
    }
  }, [loading])

  const weekDays = getWeekDays(weekOffset)
  const weekKey  = getWeekKey(weekOffset)
  const today    = todayStr()
  const todayIdx = weekDays.findIndex(d => toDateStr(d) === today)

  const now    = new Date()
  const nowTop = ((now.getHours() * 60 + now.getMinutes()) / 60) * HOUR_H

  const visible = bloques.filter(b => b.semana === null || b.semana === weekKey)

  function bloquesDelDia(di) {
    return visible
      .filter(b => b.dia === di)
      .sort((a, b) => timeToMin(a.horaInicio) - timeToMin(b.horaInicio))
  }

  function handleDayClick(e, di) {
    if (e.target !== e.currentTarget) return
    const rect    = e.currentTarget.getBoundingClientRect()
    const y       = e.clientY - rect.top
    const rawMin  = (y / HOUR_H) * 60
    const snap    = Math.round(rawMin / 30) * 30
    const clamped = Math.max(0, Math.min(23 * 60 + 30, snap))
    const endMin  = Math.min(clamped + 60, 24 * 60)
    setForm({
      mode: 'new', dia: di,
      titulo: '', descripcion: '', tipo: 'estudio', recurrente: true,
      horaInicio: minToTime(clamped),
      horaFin:    minToTime(endMin),
    })
  }

  function openEdit(b) {
    setForm({
      mode:        'edit', id: b.id,
      titulo:      b.titulo || '',
      descripcion: b.descripcion || '',
      tipo:        b.tipo || 'estudio',
      dia:         b.dia ?? 0,
      horaInicio:  b.horaInicio || '08:00',
      horaFin:     b.horaFin || '09:00',
      recurrente:  b.semana === null,
    })
  }

  function setField(key, val) {
    setForm(f => f ? { ...f, [key]: val } : f)
  }

  async function handleSave() {
    if (!form || !form.titulo.trim()) return
    setSaving(true)
    const payload = {
      titulo:      form.titulo.trim(),
      descripcion: (form.descripcion || '').trim(),
      tipo:        form.tipo,
      dia:         form.dia,
      horaInicio:  form.horaInicio,
      horaFin:     form.horaFin,
      semana:      form.recurrente ? null : weekKey,
    }
    if (form.mode === 'new') await addBloque(uid, payload)
    else                      await updateBloque(uid, form.id, payload)
    setSaving(false)
    setForm(null)
  }

  async function handleDelete() {
    if (!form?.id) return
    setSaving(true)
    await deleteBloque(uid, form.id)
    setSaving(false)
    setForm(null)
  }

  const weekStart = weekDays[0].toLocaleDateString('es-CL', { day: 'numeric', month: 'long' })
  const weekEnd   = weekDays[6].toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })

  if (loading) {
    return <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text2)' }}>Cargando...</div>
  }

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', position:'relative' }}>

      {/* ── Header ── */}
      <div style={{ padding:'22px 28px 14px', flexShrink:0, borderBottom:'1px solid var(--border)' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <h1 style={{ fontSize:'22px', fontWeight:700, color:'var(--text0)', letterSpacing:'-.4px', marginBottom:'3px' }}>
              Calendario
            </h1>
            <p style={{ fontSize:'12px', color:'var(--text2)', textTransform:'capitalize' }}>
              {weekOffset === 0 ? 'Esta semana · ' : weekOffset === -1 ? 'Semana pasada · ' : weekOffset === 1 ? 'Próxima semana · ' : ''}
              {weekStart} — {weekEnd}
            </p>
          </div>
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

      {/* ── Grid scrollable ── */}
      <div ref={scrollRef} style={{ flex:1, overflowY:'auto', overflowX:'auto' }}>
        <div style={{ minWidth:'580px' }}>

          {/* ── Cabecera días (sticky) ── */}
          <div style={{
            display:'flex', position:'sticky', top:0, zIndex:20,
            background:'var(--bg0)', borderBottom:'1px solid var(--border)',
          }}>
            <div style={{ width:'52px', flexShrink:0, borderRight:'1px solid var(--border)' }} />
            {weekDays.map((day, di) => {
              const isHoy = di === todayIdx
              const dow   = DIAS_CORTO[di]
              const num   = day.getDate()
              return (
                <div key={di} style={{
                  flex:1, padding:'8px 0 10px', textAlign:'center',
                  borderRight: di < 6 ? '1px solid var(--border)' : 'none',
                  background: isHoy ? 'rgba(124,110,245,.05)' : 'none',
                }}>
                  <div style={{ fontSize:'10px', fontWeight:600, color: isHoy ? 'var(--accent)' : 'var(--text2)', textTransform:'uppercase', letterSpacing:'.6px', marginBottom:'4px' }}>
                    {dow}
                  </div>
                  <div style={{
                    display:'inline-flex', alignItems:'center', justifyContent:'center',
                    width:'28px', height:'28px', borderRadius:'50%',
                    background: isHoy ? 'var(--accent)' : 'none',
                    fontSize:'14px', fontWeight: isHoy ? 700 : 400,
                    color: isHoy ? '#fff' : 'var(--text0)',
                  }}>
                    {num}
                  </div>
                </div>
              )
            })}
          </div>

          {/* ── Grilla de tiempo ── */}
          <div style={{ display:'flex' }}>

            {/* Columna de horas */}
            <div style={{ width:'52px', flexShrink:0, position:'relative', height:`${TOTAL_H}px`, borderRight:'1px solid var(--border)' }}>
              {Array.from({ length: 24 }, (_, h) => (
                <div key={h} style={{
                  position:'absolute', top:`${h * HOUR_H - 7}px`,
                  right:'7px', fontSize:'10px',
                  color:'var(--text2)', fontFamily:"'IBM Plex Mono', monospace",
                  lineHeight:1, pointerEvents:'none', userSelect:'none',
                }}>
                  {String(h).padStart(2,'0')}:00
                </div>
              ))}
            </div>

            {/* Área de columnas de días */}
            <div style={{ flex:1, position:'relative', display:'flex', height:`${TOTAL_H}px` }}>

              {/* Líneas horizontales de horas (fondo) */}
              <div style={{ position:'absolute', inset:0, pointerEvents:'none', zIndex:0 }}>
                {Array.from({ length: 24 }, (_, h) => (
                  <React.Fragment key={h}>
                    <div style={{ position:'absolute', top:`${h * HOUR_H}px`, left:0, right:0, height:'1px', background:'var(--border)' }} />
                    <div style={{ position:'absolute', top:`${h * HOUR_H + HOUR_H/2}px`, left:0, right:0, height:'1px', background:'var(--border)', opacity:.28 }} />
                  </React.Fragment>
                ))}
              </div>

              {/* Columnas de día */}
              {weekDays.map((day, di) => {
                const isHoy = di === todayIdx
                return (
                  <div
                    key={di}
                    onClick={e => handleDayClick(e, di)}
                    style={{
                      flex:1, position:'relative',
                      borderRight: di < 6 ? '1px solid var(--border)' : 'none',
                      background: isHoy ? 'rgba(124,110,245,.022)' : 'none',
                      cursor:'cell', userSelect:'none', zIndex:1,
                    }}
                  >
                    {/* Línea de hora actual */}
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
                    {/* Bloques */}
                    {bloquesDelDia(di).map(b => (
                      <BloqueCard key={b.id} bloque={b} onEdit={() => openEdit(b)} />
                    ))}
                  </div>
                )
              })}
            </div>
          </div>

        </div>
      </div>

      {/* ── Overlay para cerrar panel ── */}
      {form && (
        <div style={{ position:'fixed', inset:0, zIndex:40 }} onClick={() => setForm(null)} />
      )}

      {/* ── Panel lateral de formulario ── */}
      <BloquePanel
        form={form}
        setField={setField}
        onSave={handleSave}
        onCancel={() => setForm(null)}
        onDelete={handleDelete}
        saving={saving}
        weekKey={weekKey}
      />
    </div>
  )
}

// ── Botón de navegación ────────────────────────────────────────────────────────

function NavBtn({ onClick, title, children }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width:'30px', height:'30px', display:'flex', alignItems:'center', justifyContent:'center',
        borderRadius:'7px', border:`1px solid ${hov ? 'var(--border-hi)' : 'var(--border)'}`,
        background:'none', color: hov ? 'var(--text0)' : 'var(--text1)',
        cursor:'pointer', transition:'all .12s',
      }}
    >
      {children}
    </button>
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
  const compact   = height < 46
  const showDesc  = !compact && height >= 80 && bloque.descripcion

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
        boxShadow: hov ? `0 3px 10px rgba(0,0,0,.3)` : `0 1px 4px rgba(0,0,0,.18)`,
        transform: hov ? 'scaleX(.98)' : 'scaleX(1)',
        transition:'box-shadow .12s, transform .12s',
        userSelect:'none',
      }}
    >
      {/* Punto indicador de bloque único (no recurrente) */}
      {bloque.semana && (
        <div style={{
          position:'absolute', top:'4px', right:'5px',
          width:'5px', height:'5px', borderRadius:'50%',
          background: t.color, opacity:.55,
        }} />
      )}
      <div style={{
        fontSize: compact ? '10px' : '11px',
        fontWeight:700, color: t.color, lineHeight:1.3,
        overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
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
          fontSize:'10px', color: t.color, opacity:.6,
          lineHeight:1.4, marginTop:'4px',
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

function BloquePanel({ form, setField, onSave, onCancel, onDelete, saving, weekKey }) {
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

      {/* Encabezado */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <h3 style={{ fontSize:'15px', fontWeight:700, color:'var(--text0)', letterSpacing:'-.2px' }}>
          {isEdit ? 'Editar bloque' : 'Nuevo bloque'}
        </h3>
        <button onClick={onCancel} style={{
          width:'26px', height:'26px', display:'flex', alignItems:'center', justifyContent:'center',
          background:'none', border:'none', color:'var(--text2)', fontSize:'18px',
          cursor:'pointer', borderRadius:'5px', lineHeight:1,
          transition:'color .1s',
        }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--text0)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text2)'}
        >×</button>
      </div>

      {/* Título */}
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
          onFocus={e => e.currentTarget.style.borderColor = 'var(--accent-border)'}
          onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
        />
      </div>

      {/* Descripción */}
      <div>
        <FieldLabel>Descripción <span style={{ fontWeight:400, textTransform:'none', letterSpacing:0, opacity:.6 }}>· opcional</span></FieldLabel>
        <textarea
          value={form.descripcion || ''}
          onChange={e => setField('descripcion', e.target.value)}
          placeholder="Notas, sala, link, lo que quieras..."
          rows={2}
          style={{
            width:'100%', background:'var(--bg2)', border:'1px solid var(--border)',
            borderRadius:'8px', padding:'9px 11px', outline:'none', resize:'vertical',
            color:'var(--text1)', fontSize:'12px', lineHeight:1.6,
            fontFamily:'Inter, sans-serif', transition:'border-color .12s',
          }}
          onFocus={e => e.currentTarget.style.borderColor = 'var(--accent-border)'}
          onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
        />
      </div>

      {/* Tipo */}
      <div>
        <FieldLabel>Tipo</FieldLabel>
        <div style={{ display:'flex', flexWrap:'wrap', gap:'5px' }}>
          {TIPOS.map(tp => {
            const tm     = TIPO_META[tp]
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

      {/* Día */}
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
              }}>
                {d}
              </button>
            )
          })}
        </div>
      </div>

      {/* Horario */}
      <div>
        <FieldLabel>Horario</FieldLabel>
        <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
          <TimeInput value={form.horaInicio} onChange={handleStartChange} />
          <span style={{ color:'var(--text2)', fontSize:'12px' }}>→</span>
          <TimeInput value={form.horaFin}    onChange={v => setField('horaFin', v)} />
        </div>
      </div>

      {/* Recurrencia */}
      <div>
        <FieldLabel>Recurrencia</FieldLabel>
        <div style={{ display:'flex', gap:'6px' }}>
          {[
            { val: true,  label: 'Recurrente',       desc: 'Todas las semanas' },
            { val: false, label: 'Esta semana',       desc: 'Solo esta semana'  },
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

      {/* Acciones */}
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
            Eliminar bloque
          </button>
        )}
        <div style={{ display:'flex', gap:'8px' }}>
          <button onClick={onCancel} style={{
            flex:1, padding:'9px', borderRadius:'7px', border:'1px solid var(--border)',
            background:'none', color:'var(--text1)', fontSize:'13px', fontWeight:500,
            fontFamily:'Inter, sans-serif', cursor:'pointer', transition:'border-color .12s',
          }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-hi)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
          >
            Cancelar
          </button>
          <button onClick={onSave} disabled={!canSave} style={{
            flex:2, padding:'9px', borderRadius:'7px', border:'none',
            background: canSave ? 'var(--accent)' : 'var(--bg3)',
            color: canSave ? '#fff' : 'var(--text2)',
            fontSize:'13px', fontWeight:600,
            fontFamily:'Inter, sans-serif',
            cursor: canSave ? 'pointer' : 'not-allowed',
            opacity: saving ? .7 : 1, transition:'all .12s',
          }}>
            {saving ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Agregar bloque'}
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
      onFocus={e => e.currentTarget.style.borderColor = 'var(--accent-border)'}
      onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
    />
  )
}
