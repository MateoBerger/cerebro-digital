import React, { useEffect, useRef, useState } from 'react'
import {
  subscribeTareas, addTarea, updateTarea, deleteTarea,
  subscribeTaskLabels, saveTaskLabels,
} from '../firebase/db'

// ── Constantes ─────────────────────────────────────────────────────────────────

const ALCANCES = [
  { key: 'diaria',  label: 'Tareas Diarias',  color: '#5b9cf6', bg: 'rgba(91,156,246,.09)',  border: 'rgba(91,156,246,.22)'  },
  { key: 'semanal', label: 'Tareas Semanales', color: '#c084fc', bg: 'rgba(192,132,252,.09)', border: 'rgba(192,132,252,.22)' },
  { key: 'general', label: 'Tareas Generales', color: '#2dd4b2', bg: 'rgba(45,212,178,.09)',  border: 'rgba(45,212,178,.22)'  },
]

const CATS = ['academico', 'paes', 'personal', 'sistema']

const CAT_META = {
  academico: { label: 'Académico', bg: 'rgba(91,156,246,.1)',  color: '#5b9cf6', border: 'rgba(91,156,246,.22)'  },
  paes:      { label: 'PAES',      bg: 'rgba(192,132,252,.1)', color: '#c084fc', border: 'rgba(192,132,252,.22)' },
  personal:  { label: 'Personal',  bg: 'rgba(62,201,126,.1)',  color: '#3ec97e', border: 'rgba(62,201,126,.22)'  },
  sistema:   { label: 'Sistema',   bg: 'rgba(45,212,178,.1)',  color: '#2dd4b2', border: 'rgba(45,212,178,.22)'  },
}

const PRIO_META = {
  alta:  { label: 'Alta',  color: '#f07272', bg: 'rgba(240,114,114,.1)',  order: 0 },
  media: { label: 'Media', color: '#f0a740', bg: 'rgba(240,167,64,.1)',   order: 1 },
  baja:  { label: 'Baja',  color: '#625e7c', bg: 'rgba(98,94,124,.15)',   order: 2 },
}

const PAES_SUBJECTS = [
  { key: 'M1',       label: 'M1',       color: '#5b9cf6', bg: 'rgba(91,156,246,.12)',  border: 'rgba(91,156,246,.3)'  },
  { key: 'M2',       label: 'M2',       color: '#f0a740', bg: 'rgba(240,167,64,.12)',  border: 'rgba(240,167,64,.3)'  },
  { key: 'lectora',  label: 'Lectora',  color: '#c084fc', bg: 'rgba(192,132,252,.12)', border: 'rgba(192,132,252,.3)' },
  { key: 'ciencias', label: 'Ciencias', color: '#2dd4b2', bg: 'rgba(45,212,178,.12)',  border: 'rgba(45,212,178,.3)'  },
]

const SORT_OPTIONS = [
  { key: 'prioridad', label: 'Prioridad' },
  { key: 'fecha',     label: 'Fecha' },
  { key: 'alpha',     label: 'A–Z' },
]

const LABEL_COLORS = [
  '#f07272', '#f0a740', '#e0bd6b', '#3ec97e',
  '#5b9cf6', '#c084fc', '#2dd4b2', '#f472b6',
  '#94a3b8', '#fb923c',
]

const DAYS_ES   = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const CAL_DAYS  = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

const RECURRENCE_TYPES = [
  { key: 'none',    label: 'Sin repetición' },
  { key: 'daily',   label: 'Diaria' },
  { key: 'weekly',  label: 'Semanal' },
  { key: 'monthly', label: 'Mensual' },
]

const EMPTY_FIELDS = {
  titulo: '', descripcion: '', categoria: 'academico', prioridad: 'media',
  fecha: '', paesSubject: '', labelIds: [], recurrence: null,
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function getLocalDate() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function formatFecha(fechaStr) {
  if (!fechaStr) return null
  const today = getLocalDate()
  const d     = new Date(); d.setDate(d.getDate() + 1)
  const tom   = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  if (fechaStr === today) return { label: 'Hoy',    overdue: false }
  if (fechaStr === tom)   return { label: 'Mañana', overdue: false }
  const label = new Date(fechaStr + 'T12:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })
  return { label, overdue: fechaStr < today }
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

function nextRecurrenceDate(rec, currentDateStr) {
  if (!rec || !rec.type || rec.type === 'none') return null
  const base = currentDateStr || getLocalDate()
  const d = new Date(base + 'T12:00:00')
  if (rec.type === 'daily') {
    d.setDate(d.getDate() + 1)
    return d.toISOString().slice(0, 10)
  }
  if (rec.type === 'weekly') {
    const target = rec.dayOfWeek ?? d.getDay()
    let diff = target - d.getDay()
    if (diff <= 0) diff += 7
    d.setDate(d.getDate() + diff)
    return d.toISOString().slice(0, 10)
  }
  if (rec.type === 'monthly') {
    d.setMonth(d.getMonth() + 1)
    return d.toISOString().slice(0, 10)
  }
  return null
}

function sortTareas(list, sortKey) {
  return [...list].sort((a, b) => {
    if (sortKey === 'fecha') return (a.fecha || '9999').localeCompare(b.fecha || '9999')
    if (sortKey === 'alpha') return (a.titulo || '').localeCompare(b.titulo || '', 'es')
    return (PRIO_META[a.prioridad]?.order ?? 1) - (PRIO_META[b.prioridad]?.order ?? 1)
  })
}

// ── Componente principal ───────────────────────────────────────────────────────

export default function TareasTab({ uid }) {
  const [tareas, setTareas]           = useState([])
  const [loading, setLoading]         = useState(true)
  const [form, setForm]               = useState(null)
  const [saving, setSaving]           = useState(false)
  const [verComp, setVerComp]         = useState({})
  const [filterPaes, setFilterPaes]   = useState('')
  const [labels, setLabels]           = useState([])
  const [filterLabel, setFilterLabel] = useState('')
  const [searchText, setSearchText]   = useState('')
  const [showLblMgr, setShowLblMgr]   = useState(false)
  const [sortKey, setSortKey]         = useState(
    () => localStorage.getItem('cd-task-sort') || 'prioridad'
  )
  const [viewMode, setViewMode]       = useState(
    () => localStorage.getItem('cd-task-view') || 'lista'
  )

  useEffect(() => {
    if (!uid) return
    const u1 = subscribeTareas(uid, data => { setTareas(data); setLoading(false) })
    const u2 = subscribeTaskLabels(uid, setLabels)
    return () => { u1(); u2() }
  }, [uid])

  useEffect(() => { localStorage.setItem('cd-task-sort', sortKey) }, [sortKey])
  useEffect(() => { localStorage.setItem('cd-task-view', viewMode) }, [viewMode])

  function openNew(alcance) {
    setForm({ mode: 'new', alcance, ...EMPTY_FIELDS })
  }

  function openEdit(t) {
    setForm({
      mode:        'edit',
      id:          t.id,
      alcance:     t.alcance || 'general',
      titulo:      t.titulo || '',
      descripcion: t.descripcion || '',
      categoria:   t.categoria || 'academico',
      prioridad:   t.prioridad || 'media',
      fecha:       t.fecha || '',
      paesSubject: t.paesSubject || '',
      labelIds:    t.labelIds || [],
      recurrence:  t.recurrence || null,
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
      categoria:   form.categoria,
      prioridad:   form.prioridad,
      alcance:     form.alcance,
      fecha:       form.fecha,
      paesSubject: form.paesSubject || '',
      labelIds:    form.labelIds || [],
      recurrence:  form.recurrence || null,
    }
    if (form.mode === 'new') {
      await addTarea(uid, { ...payload, subtasks: [] })
    } else {
      await updateTarea(uid, form.id, payload)
    }
    setSaving(false)
    setForm(null)
  }

  async function handleToggle(t) {
    const nowDone = !t.completada
    await updateTarea(uid, t.id, { completada: nowDone })
    if (nowDone && t.recurrence?.type && t.recurrence.type !== 'none') {
      const nextFecha = nextRecurrenceDate(t.recurrence, t.fecha)
      if (nextFecha) {
        await addTarea(uid, {
          titulo:      t.titulo,
          descripcion: t.descripcion || '',
          categoria:   t.categoria || 'academico',
          prioridad:   t.prioridad || 'media',
          alcance:     t.alcance || 'general',
          fecha:       nextFecha,
          paesSubject: t.paesSubject || '',
          labelIds:    t.labelIds || [],
          recurrence:  t.recurrence,
          subtasks:    (t.subtasks || []).map(s => ({ ...s, done: false })),
        })
      }
    }
  }

  async function handleDuplicate(t) {
    await addTarea(uid, {
      titulo:      t.titulo + ' (copia)',
      descripcion: t.descripcion || '',
      categoria:   t.categoria || 'academico',
      prioridad:   t.prioridad || 'media',
      alcance:     t.alcance || 'general',
      fecha:       t.fecha || '',
      paesSubject: t.paesSubject || '',
      labelIds:    t.labelIds || [],
      recurrence:  t.recurrence || null,
      subtasks:    (t.subtasks || []).map(s => ({ ...s, done: false })),
    })
  }

  function handleCalEdit(t) {
    openEdit(t)
    setViewMode('lista')
  }

  const hasPaes  = tareas.some(t => t.paesSubject)
  const totalPen = tareas.filter(t => !t.completada).length

  const filteredTareas = tareas
    .filter(t => !filterPaes  || t.paesSubject === filterPaes)
    .filter(t => !filterLabel || (t.labelIds || []).includes(filterLabel))
    .filter(t => {
      if (!searchText.trim()) return true
      const q = searchText.trim().toLowerCase()
      return (t.titulo || '').toLowerCase().includes(q) ||
             (t.descripcion || '').toLowerCase().includes(q)
    })

  if (loading) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text2)' }}>
        Cargando...
      </div>
    )
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '26px 32px 48px' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text0)', letterSpacing: '-.4px', marginBottom: '3px' }}>
            Tareas
          </h1>
          <p style={{ fontSize: '12px', color: 'var(--text2)' }}>
            {totalPen > 0
              ? `${totalPen} pendiente${totalPen !== 1 ? 's' : ''} en total`
              : 'Sin pendientes — ¡todo al día!'}
          </p>
        </div>
        <button
          onClick={() => setShowLblMgr(v => !v)}
          style={{
            display: 'flex', alignItems: 'center', gap: '5px',
            padding: '5px 11px', borderRadius: '7px', marginTop: '2px',
            border: `1px solid ${showLblMgr ? 'var(--accent-border)' : 'var(--border)'}`,
            background: showLblMgr ? 'var(--accent-dim)' : 'none',
            color: showLblMgr ? 'var(--accent)' : 'var(--text1)',
            fontSize: '11px', fontWeight: 500, cursor: 'pointer',
            fontFamily: 'Inter, sans-serif', transition: 'all .12s',
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
            <line x1="7" y1="7" x2="7.01" y2="7" />
          </svg>
          Etiquetas
        </button>
      </div>

      {/* ── Toggle Lista / Calendario ── */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{
          display: 'inline-flex', background: 'var(--bg3)',
          border: '1px solid var(--border)', borderRadius: '10px', padding: '2px', gap: '2px',
        }}>
          {[
            { k: 'lista',      icon: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01', label: 'Lista' },
            { k: 'calendario', icon: 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z', label: 'Calendario' },
          ].map(({ k, icon, label }) => (
            <button
              key={k}
              onClick={() => setViewMode(k)}
              style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                padding: '5px 13px', borderRadius: '8px', border: 'none',
                background: viewMode === k ? 'var(--bg1)' : 'none',
                color: viewMode === k ? 'var(--text0)' : 'var(--text2)',
                fontSize: '11px', fontWeight: viewMode === k ? 600 : 400,
                cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                transition: 'all .15s',
                boxShadow: viewMode === k ? '0 1px 4px rgba(0,0,0,.22)' : 'none',
              }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d={icon} />
              </svg>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Gestor de etiquetas ── */}
      {showLblMgr && (
        <LabelManager
          labels={labels}
          onSave={lbls => saveTaskLabels(uid, lbls)}
          onClose={() => setShowLblMgr(false)}
        />
      )}

      {/* ── Vista Calendario ── */}
      {viewMode === 'calendario' && (
        <CalendarView
          tareas={filteredTareas}
          labels={labels}
          onToggle={handleToggle}
          onEdit={handleCalEdit}
          filterPaes={filterPaes}
          filterLabel={filterLabel}
        />
      )}

      {/* ── Vista Lista ── */}
      {viewMode === 'lista' && (<>

        {/* Barra de búsqueda + ordenar */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', gap: '7px',
            padding: '6px 11px', borderRadius: '8px',
            background: 'var(--bg3)', border: '1px solid var(--border)',
          }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text2)" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <input
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              placeholder="Buscar tareas..."
              style={{
                flex: 1, background: 'none', border: 'none', outline: 'none',
                fontSize: '12px', color: 'var(--text1)', fontFamily: 'Inter, sans-serif',
              }}
            />
            {searchText && (
              <button onClick={() => setSearchText('')} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--text2)', display: 'flex', alignItems: 'center', padding: 0,
              }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          <select
            value={sortKey}
            onChange={e => setSortKey(e.target.value)}
            style={{
              padding: '6px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 500,
              border: '1px solid var(--border)', background: 'var(--bg3)', color: 'var(--text1)',
              cursor: 'pointer', outline: 'none', fontFamily: 'Inter, sans-serif',
            }}
          >
            {SORT_OPTIONS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
          </select>
        </div>

        {/* Filtro materia PAES */}
        {hasPaes && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text2)', fontWeight: 500 }}>Materia:</span>
            <FilterPill active={filterPaes === ''} color="var(--accent)" onClick={() => setFilterPaes('')}>Todas</FilterPill>
            {PAES_SUBJECTS.map(s => (
              <FilterPill key={s.key} active={filterPaes === s.key} color={s.color}
                onClick={() => setFilterPaes(filterPaes === s.key ? '' : s.key)}>
                {s.label}
              </FilterPill>
            ))}
          </div>
        )}

        {/* Filtro etiquetas */}
        {labels.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '20px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text2)', fontWeight: 500 }}>Etiqueta:</span>
            <FilterPill active={filterLabel === ''} color="var(--accent)" onClick={() => setFilterLabel('')}>Todas</FilterPill>
            {labels.map(lbl => (
              <FilterPill key={lbl.id} active={filterLabel === lbl.id} color={lbl.color}
                onClick={() => setFilterLabel(filterLabel === lbl.id ? '' : lbl.id)}>
                {lbl.name}
              </FilterPill>
            ))}
          </div>
        )}

        {/* Tres secciones */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '36px', maxWidth: '740px' }}>
          {ALCANCES.map(alc => (
            <TareaSeccion
              key={alc.key}
              uid={uid}
              alc={alc}
              tareas={filteredTareas.filter(t => (t.alcance || 'general') === alc.key)}
              labels={labels}
              sortKey={sortKey}
              form={form}
              setField={setField}
              onOpenNew={() => openNew(alc.key)}
              onOpenEdit={openEdit}
              onCancelForm={() => setForm(null)}
              onSave={handleSave}
              onToggle={handleToggle}
              onDelete={id => deleteTarea(uid, id)}
              onDuplicate={handleDuplicate}
              saving={saving}
              verComp={!!verComp[alc.key]}
              onToggleComp={() => setVerComp(v => ({ ...v, [alc.key]: !v[alc.key] }))}
            />
          ))}
        </div>

      </>)}
    </div>
  )
}

// ── Pill de filtro reutilizable ────────────────────────────────────────────────

function FilterPill({ active, color, onClick, children }) {
  const bg = active
    ? (color.startsWith('#') ? hexToRgba(color, .12) : 'var(--accent-dim)')
    : 'none'
  return (
    <button onClick={onClick} style={{
      padding: '3px 10px', borderRadius: '20px', fontSize: '11px',
      fontWeight: active ? 600 : 400,
      border: `1px solid ${active ? color : 'var(--border)'}`,
      background: bg,
      color: active ? color : 'var(--text2)',
      cursor: 'pointer', fontFamily: 'Inter, sans-serif', transition: 'all .12s',
    }}>
      {children}
    </button>
  )
}

// ── Vista Calendario ───────────────────────────────────────────────────────────

function CalendarView({ tareas, labels, onToggle, onEdit }) {
  const today = getLocalDate()
  const [calYear, setCalYear]       = useState(() => new Date().getFullYear())
  const [calMonth, setCalMonth]     = useState(() => new Date().getMonth())
  const [selectedDay, setSelectedDay] = useState(null)

  function prevMonth() {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11) }
    else setCalMonth(m => m - 1)
    setSelectedDay(null)
  }
  function nextMonth() {
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0) }
    else setCalMonth(m => m + 1)
    setSelectedDay(null)
  }
  function goToday() {
    const d = new Date()
    setCalYear(d.getFullYear())
    setCalMonth(d.getMonth())
    setSelectedDay(parseInt(today.slice(8, 10)))
  }

  // Build grid (Monday-first)
  const firstDow     = new Date(calYear, calMonth, 1).getDay()
  const startOffset  = (firstDow + 6) % 7  // Mon=0 … Sun=6
  const daysInMonth  = new Date(calYear, calMonth + 1, 0).getDate()
  const cells        = []
  for (let i = 0; i < startOffset; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)

  // Index tasks by date
  const tasksByDay = {}
  tareas.forEach(t => {
    if (!t.fecha) return
    if (!tasksByDay[t.fecha]) tasksByDay[t.fecha] = []
    tasksByDay[t.fecha].push(t)
  })

  function dateStr(day) {
    return `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  function getDayLoad(day) {
    const ds       = dateStr(day)
    const dayTasks = tasksByDay[ds] || []
    if (!dayTasks.length) return null
    const pending  = dayTasks.filter(t => !t.completada)
    const overdue  = pending.filter(() => ds < today)
    if (pending.length === 0) return { count: dayTasks.length, color: '#3ec97e', glow: false }
    if (overdue.length > 0)   return { count: pending.length,  color: '#f07272', glow: true  }
    if (pending.length >= 4)  return { count: pending.length,  color: '#f0a740', glow: false }
    return                           { count: pending.length,  color: '#e0bd6b', glow: false }
  }

  const monthLabel = new Date(calYear, calMonth, 1)
    .toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })
  const monthCap = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)

  const selDateStr = selectedDay ? dateStr(selectedDay) : null
  const selTasks   = selDateStr ? (tasksByDay[selDateStr] || []) : []

  const NavBtn = ({ onClick, children }) => {
    const [hov, setHov] = useState(false)
    return (
      <button onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
        style={{
          width: '30px', height: '30px', borderRadius: '7px', border: '1px solid var(--border)',
          background: hov ? 'var(--bg3)' : 'none', color: hov ? 'var(--text0)' : 'var(--text1)',
          cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: '16px', fontWeight: 400,
          display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .12s',
        }}>
        {children}
      </button>
    )
  }

  return (
    <div style={{ maxWidth: '800px' }}>

      {/* Nav */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <NavBtn onClick={prevMonth}>‹</NavBtn>
        <NavBtn onClick={nextMonth}>›</NavBtn>
        <span style={{ flex: 1, fontSize: '15px', fontWeight: 700, color: 'var(--text0)', letterSpacing: '-.3px' }}>
          {monthCap}
        </span>
        <button onClick={goToday} style={{
          padding: '4px 12px', borderRadius: '7px', border: '1px solid var(--border)',
          background: 'none', color: 'var(--text1)', fontSize: '11px', fontWeight: 500,
          cursor: 'pointer', fontFamily: 'Inter, sans-serif', transition: 'all .12s',
        }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text1)' }}>
          Hoy
        </button>
      </div>

      {/* Day-of-week headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px', marginBottom: '4px' }}>
        {CAL_DAYS.map((d, i) => (
          <div key={d} style={{
            textAlign: 'center', fontSize: '10px', fontWeight: 600, letterSpacing: '.5px',
            color: (i === 5 || i === 6) ? 'var(--text2)' : 'var(--text2)',
            padding: '4px 0',
          }}>
            {d.toUpperCase()}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px' }}>
        {cells.map((day, i) => {
          if (!day) return <div key={`e${i}`} style={{ minHeight: '60px' }} />
          const ds       = dateStr(day)
          const isToday  = ds === today
          const isSel    = selectedDay === day
          const load     = getDayLoad(day)
          const isPast   = ds < today && !isToday

          return (
            <button
              key={day}
              onClick={() => setSelectedDay(isSel ? null : day)}
              style={{
                minHeight: '60px', padding: '7px 5px 8px', borderRadius: '10px',
                border: `2px solid ${isSel ? 'var(--accent)' : isToday ? 'rgba(224,189,107,.45)' : 'transparent'}`,
                background: isSel
                  ? 'var(--accent-dim)'
                  : isToday
                    ? 'rgba(224,189,107,.06)'
                    : 'var(--bg3)',
                cursor: 'pointer', display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: '5px', fontFamily: 'Inter, sans-serif',
                transition: 'background .12s, border-color .12s, transform .1s',
                outline: 'none',
              }}
              onMouseEnter={e => { if (!isSel) { e.currentTarget.style.background = 'var(--bg2)'; e.currentTarget.style.transform = 'translateY(-1px)' } }}
              onMouseLeave={e => { if (!isSel) { e.currentTarget.style.background = isToday ? 'rgba(224,189,107,.06)' : 'var(--bg3)'; e.currentTarget.style.transform = 'none' } }}
            >
              <span style={{
                fontSize: '13px', fontWeight: isToday ? 700 : isPast ? 400 : 500,
                color: isToday ? 'var(--accent)' : isPast ? 'var(--text2)' : 'var(--text1)',
                lineHeight: 1,
              }}>
                {day}
              </span>
              {load && (
                <span style={{
                  fontSize: '11px', fontWeight: 700, lineHeight: 1.3,
                  padding: '1px 6px', borderRadius: '10px',
                  color: load.color,
                  background: hexToRgba(load.color, .14),
                  border: `1px solid ${hexToRgba(load.color, .28)}`,
                  boxShadow: load.glow ? `0 0 7px ${hexToRgba(load.color, .35)}` : 'none',
                }}>
                  {load.count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Day panel */}
      {selectedDay && (
        <CalDayPanel
          dateStr={selDateStr}
          tasks={selTasks}
          labels={labels}
          today={today}
          onToggle={onToggle}
          onEdit={onEdit}
          onClose={() => setSelectedDay(null)}
        />
      )}
    </div>
  )
}

// ── Panel del día seleccionado ─────────────────────────────────────────────────

function CalDayPanel({ dateStr, tasks, labels, today, onToggle, onEdit, onClose }) {
  const date    = new Date(dateStr + 'T12:00:00')
  const title   = date.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })
  const titleCap = title.charAt(0).toUpperCase() + title.slice(1)
  const isOverdue = dateStr < today
  const hasPending = tasks.some(t => !t.completada)
  const sorted  = [...tasks].sort((a, b) =>
    (PRIO_META[a.prioridad]?.order ?? 1) - (PRIO_META[b.prioridad]?.order ?? 1)
  )

  return (
    <div style={{
      marginTop: '16px', padding: '16px 18px',
      background: 'var(--bg3)',
      border: `1px solid ${isOverdue && hasPending ? 'rgba(240,114,114,.3)' : 'var(--accent-border)'}`,
      borderRadius: 'var(--radius)',
      boxShadow: '0 6px 20px -6px rgba(0,0,0,.35)',
      animation: 'slideUp .18s cubic-bezier(.25,.46,.45,.94) both',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text0)' }}>
            {titleCap}
          </span>
          {isOverdue && hasPending && (
            <span style={{
              fontSize: '10px', fontWeight: 700, color: '#f07272',
              background: 'rgba(240,114,114,.1)', padding: '2px 8px', borderRadius: '20px',
              border: '1px solid rgba(240,114,114,.25)',
            }}>
              Vencido
            </span>
          )}
          <span style={{ fontSize: '11px', color: 'var(--text2)' }}>
            {tasks.length === 0 ? '' : `${tasks.length} tarea${tasks.length !== 1 ? 's' : ''}`}
          </span>
        </div>
        <button onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text2)', display: 'flex', alignItems: 'center', padding: '3px', borderRadius: '5px', transition: 'color .1s' }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--text1)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text2)'}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {tasks.length === 0 ? (
        <p style={{ fontSize: '12px', color: 'var(--text2)', fontStyle: 'italic' }}>
          Sin tareas para este día. ¡Día libre!
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {sorted.map(t => (
            <CalTaskRow key={t.id} tarea={t} labels={labels} onToggle={onToggle} onEdit={onEdit} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Fila compacta de tarea en el calendario ────────────────────────────────────

function CalTaskRow({ tarea, labels, onToggle, onEdit }) {
  const [hov, setHov] = useState(false)
  const cat  = CAT_META[tarea.categoria]  || CAT_META.academico
  const prio = PRIO_META[tarea.prioridad] || PRIO_META.media
  const done = tarea.completada
  const paes = PAES_SUBJECTS.find(s => s.key === tarea.paesSubject)
  const taskLabels = (tarea.labelIds || []).map(id => labels.find(l => l.id === id)).filter(Boolean)

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px',
        borderRadius: '9px',
        border: `1px solid ${hov && !done ? 'var(--accent-border)' : 'var(--border)'}`,
        borderLeft: `3px solid ${done ? 'var(--border)' : prio.color}`,
        background: hov ? 'var(--bg2)' : 'var(--bg1)',
        opacity: done ? .52 : 1,
        transition: 'all .12s',
      }}
    >
      {/* Checkbox */}
      <button
        onClick={() => onToggle(tarea)}
        style={{
          width: '18px', height: '18px', borderRadius: '50%', flexShrink: 0,
          border: `2px solid ${done ? '#3ec97e' : 'var(--border-hi)'}`,
          background: done ? 'rgba(62,201,126,.14)' : 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', transition: 'all .15s',
        }}
      >
        {done && (
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#3ec97e" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        )}
      </button>

      {/* Título */}
      <span style={{
        flex: 1, fontSize: '12px', fontFamily: 'Inter, sans-serif', minWidth: 0,
        color: done ? 'var(--text2)' : 'var(--text0)',
        textDecoration: done ? 'line-through' : 'none',
        fontWeight: tarea.prioridad === 'alta' && !done ? 600 : 400,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {tarea.titulo}
      </span>

      {/* Badges */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
        <span style={{
          fontSize: '10px', fontWeight: 600, padding: '1px 7px', borderRadius: '20px',
          background: cat.bg, color: cat.color, border: `1px solid ${cat.border}`,
        }}>
          {cat.label}
        </span>
        {paes && (
          <span style={{
            fontSize: '10px', fontWeight: 700, padding: '1px 7px', borderRadius: '20px',
            background: paes.bg, color: paes.color, border: `1px solid ${paes.border}`,
          }}>
            {paes.label}
          </span>
        )}
        {taskLabels.map(lbl => (
          <span key={lbl.id} style={{
            fontSize: '10px', fontWeight: 600, padding: '1px 7px', borderRadius: '20px',
            background: hexToRgba(lbl.color, .14), color: lbl.color,
            border: `1px solid ${hexToRgba(lbl.color, .32)}`,
          }}>
            {lbl.name}
          </span>
        ))}
      </div>

      {/* Editar */}
      {hov && !done && (
        <button
          onClick={() => onEdit(tarea)}
          title="Editar (vuelve a la vista Lista)"
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text2)', display: 'flex', alignItems: 'center',
            padding: '2px', borderRadius: '4px', flexShrink: 0, transition: 'color .1s',
          }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text2)'}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
      )}
    </div>
  )
}

// ── Sección ────────────────────────────────────────────────────────────────────

function TareaSeccion({ uid, alc, tareas, labels, sortKey, form, setField, onOpenNew, onOpenEdit, onCancelForm, onSave, onToggle, onDelete, onDuplicate, saving, verComp, onToggleComp }) {
  const isNewHere   = form?.mode === 'new' && form.alcance === alc.key
  const pendientes  = sortTareas(tareas.filter(t => !t.completada), sortKey)
  const completadas = tareas.filter(t => t.completada)

  return (
    <section>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '3px', height: '20px', borderRadius: '2px', background: alc.color, flexShrink: 0 }} />
          <h2 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text0)', letterSpacing: '-.2px' }}>
            {alc.label}
          </h2>
          {pendientes.length > 0 && (
            <span style={{
              fontSize: '11px', fontWeight: 600, padding: '1px 7px', borderRadius: '20px',
              background: alc.bg, color: alc.color, border: `1px solid ${alc.border}`,
            }}>
              {pendientes.length}
            </span>
          )}
        </div>
        <SectionBtn active={isNewHere} onClick={isNewHere ? onCancelForm : onOpenNew} />
      </div>

      {isNewHere && (
        <TareaForm value={form} setField={setField} labels={labels}
          onSave={onSave} onCancel={onCancelForm} saving={saving} mode="new" />
      )}

      {pendientes.length === 0 && completadas.length === 0 && !isNewHere && (
        <div style={{ padding: '18px 0 10px', borderTop: '1px dashed var(--border)' }}>
          <span style={{ fontSize: '12px', color: 'var(--text2)' }}>Sin tareas · presioná Agregar para empezar</span>
        </div>
      )}

      {pendientes.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          {pendientes.map(t => {
            if (form?.mode === 'edit' && form.id === t.id) {
              return (
                <TareaForm key={t.id} value={form} setField={setField} labels={labels}
                  onSave={onSave} onCancel={onCancelForm} saving={saving} mode="edit" />
              )
            }
            return (
              <TareaItem key={t.id} uid={uid} tarea={t} labels={labels}
                onToggle={onToggle} onEdit={() => onOpenEdit(t)}
                onDelete={() => onDelete(t.id)} onDuplicate={() => onDuplicate(t)} />
            )
          })}
        </div>
      )}

      {completadas.length > 0 && (
        <div style={{ marginTop: pendientes.length > 0 ? '14px' : '0' }}>
          <button
            onClick={onToggleComp}
            style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              background: 'none', border: 'none', color: 'var(--text2)',
              fontSize: '11px', fontWeight: 500, cursor: 'pointer',
              padding: '4px 0', marginBottom: verComp ? '8px' : '0',
              fontFamily: 'Inter, sans-serif', transition: 'color .12s',
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text1)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text2)'}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
              style={{ transform: verComp ? 'rotate(180deg)' : 'none', transition: 'transform .15s', flexShrink: 0 }}>
              <path d="M6 9l6 6 6-6" />
            </svg>
            {verComp ? 'Ocultar' : 'Ver'} completadas ({completadas.length})
          </button>
          {verComp && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              {completadas.map(t => (
                <TareaItem key={t.id} uid={uid} tarea={t} labels={labels}
                  onToggle={onToggle} onEdit={() => onOpenEdit(t)}
                  onDelete={() => onDelete(t.id)} onDuplicate={() => onDuplicate(t)} />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  )
}

// ── Botón de sección ───────────────────────────────────────────────────────────

function SectionBtn({ active, onClick }) {
  const [hov, setHov] = useState(false)
  return (
    <button onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 12px', borderRadius: '7px',
        border: `1px solid ${active || hov ? 'var(--border-hi)' : 'var(--border)'}`,
        background: active ? 'var(--bg3)' : 'none',
        color: hov ? 'var(--text0)' : 'var(--text1)',
        fontSize: '12px', fontWeight: 500, fontFamily: 'Inter, sans-serif',
        cursor: 'pointer', transition: 'all .12s',
      }}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <path d={active ? 'M18 6L6 18M6 6l12 12' : 'M12 5v14M5 12h14'} />
      </svg>
      {active ? 'Cancelar' : 'Agregar'}
    </button>
  )
}

// ── Tarjeta de tarea ───────────────────────────────────────────────────────────

function TareaItem({ uid, tarea, labels, onToggle, onEdit, onDelete, onDuplicate }) {
  const [hov, setHov]           = useState(false)
  const [removing, setRemoving] = useState(false)
  const [showSubs, setShowSubs] = useState(false)

  function handleDelete() { setRemoving(true); setTimeout(onDelete, 180) }

  const cat      = CAT_META[tarea.categoria]  || CAT_META.academico
  const prio     = PRIO_META[tarea.prioridad] || PRIO_META.media
  const fecha    = formatFecha(tarea.fecha)
  const done     = tarea.completada
  const subs     = tarea.subtasks || []
  const subsDone = subs.filter(s => s.done).length
  const hasSubs  = subs.length > 0
  const paes     = PAES_SUBJECTS.find(s => s.key === tarea.paesSubject)
  const isRecurring = tarea.recurrence?.type && tarea.recurrence.type !== 'none'
  const taskLabels  = (tarea.labelIds || []).map(id => labels.find(l => l.id === id)).filter(Boolean)

  return (
    <div
      className={`task-item${removing ? ' task-item--exit' : ''}`}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: '10px',
        padding: '12px 12px 12px 0', borderRadius: 'var(--radius-sm)',
        borderTop:    `1px solid ${hov && !done ? 'var(--accent-border)' : 'var(--border)'}`,
        borderRight:  `1px solid ${hov && !done ? 'var(--accent-border)' : 'var(--border)'}`,
        borderBottom: `1px solid ${hov && !done ? 'var(--accent-border)' : 'var(--border)'}`,
        borderLeft:   `3px solid ${done ? 'var(--border)' : prio.color}`,
        background:   hov ? 'linear-gradient(160deg, var(--bg3), var(--bg2))' : 'var(--bg1)',
        boxShadow:    hov && !done ? '0 6px 22px rgba(0,0,0,.28), 0 0 0 1px rgba(224,189,107,.1)' : 'var(--shadow-sm)',
        transform:    hov ? 'translateY(-2px)' : 'translateY(0)',
        opacity:      done ? .48 : 1,
        transition:   'background .15s, box-shadow .2s, transform .2s, opacity .2s, border-color .2s',
      }}
    >
      {/* Checkbox */}
      <div style={{ paddingLeft: '14px', paddingTop: '1px', flexShrink: 0 }}>
        <button onClick={() => onToggle(tarea)} title={done ? 'Marcar pendiente' : 'Marcar completada'}
          style={{
            width: '20px', height: '20px', borderRadius: '50%',
            border: `2px solid ${done ? '#3ec97e' : (hov ? 'var(--text1)' : 'var(--border-hi)')}`,
            background: done ? 'rgba(62,201,126,.14)' : 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', transition: 'border-color .18s, background .18s', flexShrink: 0,
          }}
        >
          {done && (
            <svg className="check-pop" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#3ec97e" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          )}
        </button>
      </div>

      {/* Contenido */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{
          display: 'block', fontSize: '13px', lineHeight: '1.45', fontFamily: 'Inter, sans-serif',
          color:          done ? 'var(--text2)' : 'var(--text0)',
          fontWeight:     tarea.prioridad === 'alta' && !done ? 600 : 400,
          textDecoration: done ? 'line-through' : 'none',
          marginBottom:   (tarea.descripcion || hasSubs) ? '5px' : '8px',
        }}>
          {tarea.titulo}
        </span>

        {tarea.descripcion && (
          <p style={{
            fontSize: '12px', color: 'var(--text2)', lineHeight: 1.55,
            marginBottom: hasSubs ? '6px' : '9px',
            display: '-webkit-box', WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {tarea.descripcion}
          </p>
        )}

        {hasSubs ? (
          <button onClick={() => setShowSubs(v => !v)}
            style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'none', border: 'none', cursor: 'pointer', padding: '0', marginBottom: '8px' }}>
            <div style={{ width: '50px', height: '3px', borderRadius: '2px', background: 'var(--border)', overflow: 'hidden', flexShrink: 0 }}>
              <div style={{
                height: '100%', borderRadius: '2px',
                background: subsDone === subs.length ? '#3ec97e' : 'var(--accent)',
                width: `${(subsDone / subs.length) * 100}%`, transition: 'width .3s ease',
              }} />
            </div>
            <span style={{ fontSize: '10px', fontFamily: "'IBM Plex Mono', monospace", color: subsDone === subs.length ? '#3ec97e' : '#e0bd6b', fontWeight: 500 }}>
              {subsDone}/{subs.length}
            </span>
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="var(--text2)" strokeWidth="2.5" strokeLinecap="round"
              style={{ transform: showSubs ? 'rotate(180deg)' : 'none', transition: 'transform .15s', marginLeft: '1px' }}>
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
        ) : (
          <button onClick={() => setShowSubs(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none',
              cursor: 'pointer', padding: '0', marginBottom: '8px',
              color: 'var(--text2)', fontSize: '11px', fontFamily: 'Inter, sans-serif',
              opacity: hov ? 1 : 0, transition: 'opacity .15s',
            }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Subtarea
          </button>
        )}

        {showSubs && <SubtaskPanel uid={uid} tarea={tarea} />}

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <span style={{
            fontSize: '10px', fontWeight: 600, padding: '2px 7px', borderRadius: '20px',
            background: cat.bg, color: cat.color, border: `1px solid ${cat.border}`,
            letterSpacing: '.15px', flexShrink: 0,
          }}>
            {cat.label}
          </span>

          {paes && (
            <span style={{
              fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '20px',
              background: paes.bg, color: paes.color, border: `1px solid ${paes.border}`,
              letterSpacing: '.2px', flexShrink: 0,
            }}>
              {paes.label}
            </span>
          )}

          {taskLabels.map(lbl => (
            <span key={lbl.id} style={{
              fontSize: '10px', fontWeight: 600, padding: '2px 7px', borderRadius: '20px',
              background: hexToRgba(lbl.color, .14), color: lbl.color,
              border: `1px solid ${hexToRgba(lbl.color, .35)}`,
              letterSpacing: '.1px', flexShrink: 0,
            }}>
              {lbl.name}
            </span>
          ))}

          {isRecurring && (
            <span style={{ fontSize: '11px', flexShrink: 0, lineHeight: 1 }}
              title={`Repite: ${tarea.recurrence.type === 'daily' ? 'diaria' : tarea.recurrence.type === 'weekly' ? `cada ${DAYS_ES[tarea.recurrence.dayOfWeek ?? 0]}` : 'mensual'}`}>
              🔁
            </span>
          )}

          {(!done && (tarea.prioridad === 'alta' || hov)) && tarea.prioridad !== 'baja' && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '10px', fontWeight: 600, color: prio.color, flexShrink: 0 }}>
              <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: prio.color }} />
              {prio.label}
            </span>
          )}

          {fecha && (
            <span style={{
              fontSize: '11px', fontFamily: "'IBM Plex Mono', monospace", flexShrink: 0,
              color:      fecha.overdue && !done ? '#f07272' : 'var(--text2)',
              fontWeight: fecha.overdue && !done ? 700 : 400,
            }}>
              {fecha.label}
            </span>
          )}

          <div style={{ marginLeft: 'auto', display: 'flex', gap: '3px', opacity: hov ? 1 : 0, transition: 'opacity .15s' }}>
            <IconBtn onClick={onEdit} title="Editar" hoverColor="var(--accent)" hoverBg="var(--accent-dim)">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </IconBtn>
            <IconBtn onClick={onDuplicate} title="Duplicar" hoverColor="var(--text1)" hoverBg="var(--bg3)">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
              </svg>
            </IconBtn>
            <IconBtn onClick={handleDelete} title="Eliminar" hoverColor="#f07272" hoverBg="rgba(240,114,114,.1)">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2" />
              </svg>
            </IconBtn>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Panel de subtareas ─────────────────────────────────────────────────────────

function SubtaskPanel({ uid, tarea }) {
  const [newText, setNewText]     = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editText, setEditText]   = useState('')
  const inputRef = useRef(null)
  const editRef  = useRef(null)
  const subs     = tarea.subtasks || []

  useEffect(() => { if (inputRef.current) inputRef.current.focus() }, [])
  useEffect(() => { if (editingId && editRef.current) editRef.current.focus() }, [editingId])

  async function toggleSub(sub) {
    await updateTarea(uid, tarea.id, { subtasks: subs.map(s => s.id === sub.id ? { ...s, done: !s.done } : s) })
  }
  async function addSub() {
    const text = newText.trim()
    if (!text) return
    await updateTarea(uid, tarea.id, { subtasks: [...subs, { id: 'sub_' + Date.now(), text, done: false }] })
    setNewText('')
  }
  async function deleteSub(subId) {
    await updateTarea(uid, tarea.id, { subtasks: subs.filter(s => s.id !== subId) })
  }
  async function commitEdit(subId) {
    const text = editText.trim()
    if (!text) { setEditingId(null); return }
    await updateTarea(uid, tarea.id, { subtasks: subs.map(s => s.id === subId ? { ...s, text } : s) })
    setEditingId(null)
  }

  return (
    <div style={{ marginBottom: '8px', padding: '8px 10px 6px', background: 'var(--bg3)', borderRadius: '8px', border: '1px solid var(--border)' }}>
      {subs.map(sub => (
        <SubtaskRow key={sub.id} sub={sub} isEditing={editingId === sub.id} editText={editText} editRef={editRef}
          onToggle={() => toggleSub(sub)} onDelete={() => deleteSub(sub.id)}
          onDoubleClick={() => { setEditingId(sub.id); setEditText(sub.text) }}
          onEditChange={setEditText}
          onEditKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commitEdit(sub.id) } if (e.key === 'Escape') setEditingId(null) }}
          onEditBlur={() => commitEdit(sub.id)} />
      ))}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: subs.length > 0 ? '4px' : '0' }}>
        <div style={{ width: '14px', height: '14px', borderRadius: '4px', border: '1.5px dashed var(--border)', flexShrink: 0 }} />
        <input ref={inputRef} value={newText} onChange={e => setNewText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSub() } }}
          placeholder="Nueva subtarea..."
          style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: '12px', color: 'var(--text1)', fontFamily: 'Inter, sans-serif' }} />
        {newText.trim() && (
          <button onClick={addSub} style={{ background: 'var(--accent)', border: 'none', borderRadius: '5px', color: '#1a1608', fontSize: '11px', fontWeight: 700, padding: '2px 8px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>+</button>
        )}
      </div>
    </div>
  )
}

// ── Fila de subtarea ───────────────────────────────────────────────────────────

function SubtaskRow({ sub, isEditing, editText, editRef, onToggle, onDelete, onDoubleClick, onEditChange, onEditKeyDown, onEditBlur }) {
  const [hov, setHov] = useState(false)
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '3px 0', minHeight: '24px' }}>
      <button onClick={onToggle} style={{
        width: '14px', height: '14px', borderRadius: '4px', flexShrink: 0,
        border: `1.5px solid ${sub.done ? '#e0bd6b' : 'var(--border-hi)'}`,
        background: sub.done ? 'rgba(224,189,107,.18)' : 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', transition: 'all .14s',
      }}>
        {sub.done && (
          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#e0bd6b" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        )}
      </button>
      {isEditing ? (
        <input ref={editRef} value={editText} onChange={e => onEditChange(e.target.value)}
          onKeyDown={onEditKeyDown} onBlur={onEditBlur}
          style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: '12px', color: 'var(--text0)', fontFamily: 'Inter, sans-serif', borderBottom: '1px solid var(--accent)', paddingBottom: '1px' }} />
      ) : (
        <span onDoubleClick={onDoubleClick} title="Doble clic para editar"
          style={{ flex: 1, fontSize: '12px', lineHeight: 1.4, fontFamily: 'Inter, sans-serif', color: sub.done ? 'var(--text2)' : 'var(--text1)', textDecoration: sub.done ? 'line-through' : 'none', cursor: 'text', userSelect: 'none' }}>
          {sub.text}
        </span>
      )}
      {!isEditing && hov && (
        <button onClick={onDelete}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text2)', padding: '2px', borderRadius: '4px', display: 'flex', alignItems: 'center', flexShrink: 0, transition: 'color .1s' }}
          onMouseEnter={e => e.currentTarget.style.color = '#f07272'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text2)'}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  )
}

// ── Botón ícono ────────────────────────────────────────────────────────────────

function IconBtn({ onClick, title, children, hoverColor, hoverBg }) {
  const [hov, setHov] = useState(false)
  return (
    <button onClick={onClick} title={title} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        width: '26px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: hov ? hoverBg : 'none', border: 'none', borderRadius: '6px', cursor: 'pointer',
        color: hov ? hoverColor : 'var(--text2)', transition: 'color .1s, background .1s',
      }}>
      {children}
    </button>
  )
}

// ── Formulario (nuevo + editar) ────────────────────────────────────────────────

function TareaForm({ value, setField, labels, onSave, onCancel, saving, mode }) {
  const canSave = !!value.titulo.trim() && !saving

  function toggleLabel(id) {
    const ids = value.labelIds || []
    setField('labelIds', ids.includes(id) ? ids.filter(i => i !== id) : [...ids, id])
  }

  function setRecType(type) {
    if (type === 'none') return setField('recurrence', null)
    if (type === 'weekly') {
      const existing = value.recurrence?.dayOfWeek
      return setField('recurrence', { type: 'weekly', dayOfWeek: existing ?? new Date().getDay() })
    }
    setField('recurrence', { type })
  }

  const recType = value.recurrence?.type || 'none'

  return (
    <div style={{
      background: 'linear-gradient(160deg, var(--bg3) 0%, var(--bg2) 100%)',
      border: '1px solid var(--accent-border)', borderRadius: 'var(--radius)',
      padding: '16px 16px 14px', marginBottom: '6px',
      boxShadow: '0 8px 24px -8px rgba(0,0,0,.5), 0 0 0 1px var(--accent-border)',
      animation: 'slideUp .2s cubic-bezier(.25,.46,.45,.94) both',
    }}>
      <input autoFocus placeholder="Título de la tarea..." value={value.titulo}
        onChange={e => setField('titulo', e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSave() } }}
        style={{ width: '100%', background: 'none', border: 'none', outline: 'none', color: 'var(--text0)', fontSize: '14px', fontWeight: 500, fontFamily: 'Inter, sans-serif', marginBottom: '10px' }} />

      <textarea placeholder="Descripción (opcional)..." value={value.descripcion}
        onChange={e => setField('descripcion', e.target.value)} rows={2}
        style={{ width: '100%', background: 'none', resize: 'none', border: 'none', borderTop: '1px solid var(--border)', outline: 'none', color: 'var(--text1)', fontSize: '12px', lineHeight: 1.6, fontFamily: 'Inter, sans-serif', padding: '10px 0 12px' }} />

      {labels.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontSize: '11px', color: 'var(--text2)', fontWeight: 500, marginRight: '2px' }}>Etiquetas:</span>
          {labels.map(lbl => {
            const active = (value.labelIds || []).includes(lbl.id)
            return (
              <button key={lbl.id} onClick={() => toggleLabel(lbl.id)} style={{
                padding: '2px 9px', borderRadius: '20px', fontSize: '11px', fontWeight: active ? 600 : 400,
                border: `1px solid ${active ? lbl.color : 'var(--border)'}`,
                background: active ? hexToRgba(lbl.color, .14) : 'none',
                color: active ? lbl.color : 'var(--text2)',
                cursor: 'pointer', fontFamily: 'Inter, sans-serif', transition: 'all .1s',
              }}>
                {lbl.name}
              </button>
            )
          })}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px solid var(--border)' }}>
        <span style={{ fontSize: '11px', color: 'var(--text2)', fontWeight: 500, marginRight: '2px' }}>Materia:</span>
        {PAES_SUBJECTS.map(s => {
          const active = value.paesSubject === s.key
          return (
            <button key={s.key} onClick={() => setField('paesSubject', active ? '' : s.key)} style={{
              padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: active ? 700 : 400,
              border: `1px solid ${active ? s.color : 'var(--border)'}`,
              background: active ? s.bg : 'none', color: active ? s.color : 'var(--text2)',
              cursor: 'pointer', fontFamily: 'Inter, sans-serif', transition: 'all .1s',
            }}>
              {s.label}
            </button>
          )
        })}
        {value.paesSubject && (
          <button onClick={() => setField('paesSubject', '')} style={{ padding: '3px 7px', borderRadius: '20px', fontSize: '10px', border: '1px solid var(--border)', background: 'none', color: 'var(--text2)', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>✕</button>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px solid var(--border)' }}>
        <span style={{ fontSize: '11px', color: 'var(--text2)', fontWeight: 500, paddingTop: '4px', whiteSpace: 'nowrap' }}>Repetición:</span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {RECURRENCE_TYPES.map(rt => {
              const active = recType === rt.key
              return (
                <button key={rt.key} onClick={() => setRecType(rt.key)} style={{
                  padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: active ? 600 : 400,
                  border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                  background: active ? 'var(--accent-dim)' : 'none',
                  color: active ? 'var(--accent)' : 'var(--text2)',
                  cursor: 'pointer', fontFamily: 'Inter, sans-serif', transition: 'all .1s',
                }}>
                  {rt.label}
                </button>
              )
            })}
          </div>
          {recType === 'weekly' && (
            <div style={{ display: 'flex', gap: '3px' }}>
              {DAYS_ES.map((d, i) => {
                const active = (value.recurrence?.dayOfWeek ?? new Date().getDay()) === i
                return (
                  <button key={i} onClick={() => setField('recurrence', { ...value.recurrence, dayOfWeek: i })}
                    style={{
                      width: '34px', height: '24px', borderRadius: '6px', fontSize: '10px',
                      fontWeight: active ? 700 : 400,
                      border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                      background: active ? 'var(--accent-dim)' : 'none',
                      color: active ? 'var(--accent)' : 'var(--text2)',
                      cursor: 'pointer', fontFamily: 'Inter, sans-serif', transition: 'all .1s',
                    }}>
                    {d}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '10px' }}>
        <CatSelect value={value.categoria} onChange={v => setField('categoria', v)} />
        <div style={{ display: 'flex', gap: '4px' }}>
          {Object.entries(PRIO_META).map(([k, p]) => {
            const active = value.prioridad === k
            return (
              <button key={k} onClick={() => setField('prioridad', k)} style={{
                display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '20px',
                border: `1px solid ${active ? p.color : 'var(--border)'}`,
                background: active ? p.bg : 'none', color: active ? p.color : 'var(--text2)',
                fontSize: '11px', fontWeight: active ? 600 : 400, fontFamily: 'Inter, sans-serif', cursor: 'pointer', transition: 'all .1s',
              }}>
                <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: p.color, flexShrink: 0 }} />
                {p.label}
              </button>
            )
          })}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '4px' }}>
          {ALCANCES.map(a => {
            const active = value.alcance === a.key
            return (
              <button key={a.key} onClick={() => setField('alcance', a.key)} style={{
                padding: '4px 9px', borderRadius: '20px',
                border: `1px solid ${active ? a.color : 'var(--border)'}`,
                background: active ? a.bg : 'none', color: active ? a.color : 'var(--text2)',
                fontSize: '11px', fontWeight: active ? 600 : 400, fontFamily: 'Inter, sans-serif', cursor: 'pointer', transition: 'all .1s',
              }}>
                {a.label.replace('Tareas ', '')}
              </button>
            )
          })}
        </div>
        <input type="date" value={value.fecha} onChange={e => setField('fecha', e.target.value)}
          style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '20px', color: value.fecha ? 'var(--text0)' : 'var(--text2)', fontSize: '11px', padding: '4px 10px', cursor: 'pointer', outline: 'none', fontFamily: 'Inter, sans-serif' }} />
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px' }}>
          <button onClick={onCancel} className="btn-secondary"
            style={{ padding: '6px 14px', borderRadius: '7px', border: '1px solid var(--border)', background: 'none', color: 'var(--text1)', fontSize: '12px', fontWeight: 500, fontFamily: 'Inter, sans-serif', cursor: 'pointer', transition: 'all .18s ease' }}>
            Cancelar
          </button>
          <button onClick={onSave} disabled={!canSave} className="btn-primary"
            style={{ padding: '6px 18px', borderRadius: '7px', border: 'none', background: canSave ? 'var(--accent)' : 'var(--bg3)', color: canSave ? '#1a1608' : 'var(--text2)', fontSize: '12px', fontWeight: 600, fontFamily: 'Inter, sans-serif', cursor: canSave ? 'pointer' : 'not-allowed', opacity: saving ? .7 : 1, transition: 'all .2s ease' }}>
            {saving ? 'Guardando...' : mode === 'edit' ? 'Guardar cambios' : 'Agregar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Selector de categoría ──────────────────────────────────────────────────────

function CatSelect({ value, onChange }) {
  const c = CAT_META[value] || CAT_META.academico
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, border: `1px solid ${c.border}`, background: c.bg, color: c.color, cursor: 'pointer', outline: 'none', fontFamily: 'Inter, sans-serif' }}>
      {CATS.map(cat => <option key={cat} value={cat}>{CAT_META[cat]?.label || cat}</option>)}
    </select>
  )
}

// ── Gestor de etiquetas ────────────────────────────────────────────────────────

function LabelManager({ labels, onSave, onClose }) {
  const [newName, setNewName]   = useState('')
  const [newColor, setNewColor] = useState(LABEL_COLORS[4])

  function addLabel() {
    if (!newName.trim()) return
    onSave([...labels, { id: 'lbl_' + Date.now(), name: newName.trim(), color: newColor }])
    setNewName('')
  }

  return (
    <div style={{
      background: 'var(--bg3)', border: '1px solid var(--accent-border)',
      borderRadius: 'var(--radius)', padding: '14px 16px', marginBottom: '16px',
      boxShadow: '0 4px 16px -4px rgba(0,0,0,.35)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text0)' }}>Gestionar etiquetas</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text2)', display: 'flex', alignItems: 'center', padding: '2px' }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--text1)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text2)'}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {labels.length === 0 && (
        <p style={{ fontSize: '11px', color: 'var(--text2)', marginBottom: '10px' }}>Sin etiquetas aún — creá una abajo.</p>
      )}
      {labels.map(lbl => (
        <LabelRow key={lbl.id} label={lbl}
          onDelete={() => onSave(labels.filter(l => l.id !== lbl.id))}
          onUpdate={ch => onSave(labels.map(l => l.id === lbl.id ? { ...l, ...ch } : l))} />
      ))}

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: labels.length > 0 ? '8px' : '0', paddingTop: labels.length > 0 ? '10px' : '0', borderTop: labels.length > 0 ? '1px solid var(--border)' : 'none' }}>
        <div style={{ display: 'flex', gap: '3px', flexShrink: 0 }}>
          {LABEL_COLORS.map(c => (
            <button key={c} onClick={() => setNewColor(c)} style={{
              width: '16px', height: '16px', borderRadius: '50%', background: c, border: 'none', cursor: 'pointer', flexShrink: 0,
              outline: newColor === c ? `2px solid ${c}` : 'none', outlineOffset: '2px', transition: 'outline .1s',
            }} />
          ))}
        </div>
        <input value={newName} onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addLabel()}
          placeholder="Nombre de etiqueta..."
          style={{ flex: 1, background: 'none', border: 'none', borderBottom: '1px solid var(--border)', outline: 'none', fontSize: '12px', color: 'var(--text1)', fontFamily: 'Inter, sans-serif', padding: '3px 0' }} />
        <button onClick={addLabel} disabled={!newName.trim()}
          style={{ padding: '4px 12px', borderRadius: '7px', border: 'none', background: newName.trim() ? 'var(--accent)' : 'var(--bg3)', color: newName.trim() ? '#1a1608' : 'var(--text2)', fontSize: '11px', fontWeight: 600, cursor: newName.trim() ? 'pointer' : 'not-allowed', fontFamily: 'Inter, sans-serif', flexShrink: 0 }}>
          Crear
        </button>
      </div>
    </div>
  )
}

// ── Fila de etiqueta en el gestor ──────────────────────────────────────────────

function LabelRow({ label, onDelete, onUpdate }) {
  const [hov, setHov]         = useState(false)
  const [editing, setEditing] = useState(false)
  const [name, setName]       = useState(label.name)
  const [showPalette, setShowPalette] = useState(false)

  function commitRename() {
    const trimmed = name.trim()
    if (trimmed && trimmed !== label.name) onUpdate({ name: trimmed })
    else setName(label.name)
    setEditing(false)
  }

  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => { setHov(false); setShowPalette(false) }}
      style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0' }}>
      <button onClick={() => setShowPalette(v => !v)}
        style={{ width: '14px', height: '14px', borderRadius: '50%', background: label.color, border: 'none', cursor: 'pointer', flexShrink: 0, transition: 'transform .1s' }}
        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.25)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
      />
      {showPalette && (
        <div style={{
          position: 'absolute', top: '22px', left: 0, zIndex: 20,
          background: 'var(--bg1)', border: '1px solid var(--border)',
          borderRadius: '8px', padding: '7px', display: 'flex', gap: '4px', flexWrap: 'wrap', width: '118px',
          boxShadow: '0 4px 12px rgba(0,0,0,.3)',
        }}>
          {LABEL_COLORS.map(c => (
            <button key={c} onClick={() => { onUpdate({ color: c }); setShowPalette(false) }}
              style={{ width: '18px', height: '18px', borderRadius: '50%', background: c, border: 'none', cursor: 'pointer', outline: label.color === c ? `2px solid ${c}` : 'none', outlineOffset: '2px' }} />
          ))}
        </div>
      )}

      {editing ? (
        <input value={name} autoFocus onChange={e => setName(e.target.value)}
          onBlur={commitRename}
          onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') { setName(label.name); setEditing(false) } }}
          style={{ flex: 1, background: 'none', border: 'none', borderBottom: '1px solid var(--accent)', outline: 'none', fontSize: '12px', color: 'var(--text1)', fontFamily: 'Inter, sans-serif' }} />
      ) : (
        <span onDoubleClick={() => setEditing(true)} title="Doble clic para renombrar"
          style={{ flex: 1, fontSize: '12px', color: 'var(--text1)', cursor: 'text', userSelect: 'none' }}>
          {label.name}
        </span>
      )}

      {hov && !editing && (
        <button onClick={onDelete}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text2)', padding: '2px', borderRadius: '4px', display: 'flex', alignItems: 'center', flexShrink: 0, transition: 'color .1s' }}
          onMouseEnter={e => e.currentTarget.style.color = '#f07272'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text2)'}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  )
}
