import React, { useEffect, useRef, useState } from 'react'
import { subscribeTareas, addTarea, updateTarea, deleteTarea } from '../firebase/db'

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

const EMPTY_FIELDS = {
  titulo: '', descripcion: '', categoria: 'academico', prioridad: 'media',
  fecha: '', note: '', paesSubject: '',
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

function renderNote(text) {
  if (!text) return null
  const parts = text.split(/(https?:\/\/[^\s]+)/g)
  return parts.map((part, i) =>
    /^https?:\/\//.test(part)
      ? <a key={i} href={part} target="_blank" rel="noopener noreferrer"
           style={{ color: 'var(--accent)', textDecoration: 'underline' }}>{part}</a>
      : part
  )
}

// ── Componente principal ───────────────────────────────────────────────────────

export default function TareasTab({ uid }) {
  const [tareas, setTareas]         = useState([])
  const [loading, setLoading]       = useState(true)
  const [form, setForm]             = useState(null)
  const [saving, setSaving]         = useState(false)
  const [verComp, setVerComp]       = useState({})
  const [filterPaes, setFilterPaes] = useState('')

  useEffect(() => {
    if (!uid) return
    const unsub = subscribeTareas(uid, data => { setTareas(data); setLoading(false) })
    return unsub
  }, [uid])

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
      note:        t.note || '',
      paesSubject: t.paesSubject || '',
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
      note:        (form.note || '').trim(),
      paesSubject: form.paesSubject || '',
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
    await updateTarea(uid, t.id, { completada: !t.completada })
  }

  const hasPaes         = tareas.some(t => t.paesSubject)
  const totalPendientes = tareas.filter(t => !t.completada).length

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
      <div style={{ marginBottom: hasPaes ? '16px' : '32px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text0)', letterSpacing: '-.4px', marginBottom: '3px' }}>
          Tareas
        </h1>
        <p style={{ fontSize: '12px', color: 'var(--text2)' }}>
          {totalPendientes > 0
            ? `${totalPendientes} pendiente${totalPendientes !== 1 ? 's' : ''} en total`
            : 'Sin pendientes — ¡todo al día!'}
        </p>
      </div>

      {/* ── Filtro PAES (solo si alguna tarea tiene materia asignada) ── */}
      {hasPaes && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '24px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text2)', fontWeight: 500, marginRight: '2px' }}>Materia:</span>
          <button
            onClick={() => setFilterPaes('')}
            style={{
              padding: '3px 10px', borderRadius: '20px', fontSize: '11px',
              fontWeight: filterPaes === '' ? 600 : 400,
              border: `1px solid ${filterPaes === '' ? 'var(--accent)' : 'var(--border)'}`,
              background: filterPaes === '' ? 'var(--accent-dim)' : 'none',
              color: filterPaes === '' ? 'var(--accent)' : 'var(--text2)',
              cursor: 'pointer', fontFamily: 'Inter, sans-serif', transition: 'all .12s',
            }}
          >
            Todas
          </button>
          {PAES_SUBJECTS.map(s => {
            const active = filterPaes === s.key
            return (
              <button key={s.key} onClick={() => setFilterPaes(active ? '' : s.key)} style={{
                padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: active ? 600 : 400,
                border: `1px solid ${active ? s.color : 'var(--border)'}`,
                background: active ? s.bg : 'none',
                color: active ? s.color : 'var(--text2)',
                cursor: 'pointer', fontFamily: 'Inter, sans-serif', transition: 'all .12s',
              }}>
                {s.label}
              </button>
            )
          })}
        </div>
      )}

      {/* ── Tres secciones ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '36px', maxWidth: '740px' }}>
        {ALCANCES.map(alc => {
          const tareasAlc = tareas
            .filter(t => (t.alcance || 'general') === alc.key)
            .filter(t => !filterPaes || t.paesSubject === filterPaes)
          return (
            <TareaSeccion
              key={alc.key}
              uid={uid}
              alc={alc}
              tareas={tareasAlc}
              form={form}
              setField={setField}
              onOpenNew={() => openNew(alc.key)}
              onOpenEdit={openEdit}
              onCancelForm={() => setForm(null)}
              onSave={handleSave}
              onToggle={handleToggle}
              onDelete={id => deleteTarea(uid, id)}
              saving={saving}
              verComp={!!verComp[alc.key]}
              onToggleComp={() => setVerComp(v => ({ ...v, [alc.key]: !v[alc.key] }))}
            />
          )
        })}
      </div>
    </div>
  )
}

// ── Sección ────────────────────────────────────────────────────────────────────

function TareaSeccion({ uid, alc, tareas, form, setField, onOpenNew, onOpenEdit, onCancelForm, onSave, onToggle, onDelete, saving, verComp, onToggleComp }) {
  const isNewHere  = form?.mode === 'new' && form.alcance === alc.key
  const pendientes = tareas
    .filter(t => !t.completada)
    .sort((a, b) => (PRIO_META[a.prioridad]?.order ?? 1) - (PRIO_META[b.prioridad]?.order ?? 1))
  const completadas = tareas.filter(t => t.completada)

  return (
    <section>
      {/* ── Cabecera de sección ── */}
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

      {/* ── Formulario nueva tarea ── */}
      {isNewHere && (
        <TareaForm
          value={form}
          setField={setField}
          onSave={onSave}
          onCancel={onCancelForm}
          saving={saving}
          mode="new"
        />
      )}

      {/* ── Empty state ── */}
      {pendientes.length === 0 && completadas.length === 0 && !isNewHere && (
        <div style={{
          padding: '18px 0 10px', display: 'flex', alignItems: 'center', gap: '10px',
          borderTop: '1px dashed var(--border)',
        }}>
          <span style={{ fontSize: '12px', color: 'var(--text2)' }}>Sin tareas · presioná Agregar para empezar</span>
        </div>
      )}

      {/* ── Lista de pendientes ── */}
      {pendientes.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          {pendientes.map(t => {
            if (form?.mode === 'edit' && form.id === t.id) {
              return (
                <TareaForm
                  key={t.id}
                  value={form}
                  setField={setField}
                  onSave={onSave}
                  onCancel={onCancelForm}
                  saving={saving}
                  mode="edit"
                />
              )
            }
            return (
              <TareaItem
                key={t.id}
                uid={uid}
                tarea={t}
                onToggle={onToggle}
                onEdit={() => onOpenEdit(t)}
                onDelete={() => onDelete(t.id)}
              />
            )
          })}
        </div>
      )}

      {/* ── Completadas colapsable ── */}
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
                <TareaItem
                  key={t.id}
                  uid={uid}
                  tarea={t}
                  onToggle={onToggle}
                  onEdit={() => onOpenEdit(t)}
                  onDelete={() => onDelete(t.id)}
                />
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
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: '5px',
        padding: '5px 12px', borderRadius: '7px',
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

function TareaItem({ uid, tarea, onToggle, onEdit, onDelete }) {
  const [hov, setHov]             = useState(false)
  const [removing, setRemoving]   = useState(false)
  const [showSubs, setShowSubs]   = useState(false)
  const [showFullNote, setShowFullNote] = useState(false)

  function handleDelete() {
    setRemoving(true)
    setTimeout(onDelete, 180)
  }

  const cat      = CAT_META[tarea.categoria]  || CAT_META.academico
  const prio     = PRIO_META[tarea.prioridad] || PRIO_META.media
  const fecha    = formatFecha(tarea.fecha)
  const done     = tarea.completada
  const subs     = tarea.subtasks || []
  const subsDone = subs.filter(s => s.done).length
  const hasSubs  = subs.length > 0
  const paes     = PAES_SUBJECTS.find(s => s.key === tarea.paesSubject)

  return (
    <div
      className={`task-item${removing ? ' task-item--exit' : ''}`}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: '10px',
        padding: '12px 12px 12px 0',
        borderRadius: 'var(--radius-sm)',
        borderTop:    `1px solid ${hov && !done ? 'var(--accent-border)' : 'var(--border)'}`,
        borderRight:  `1px solid ${hov && !done ? 'var(--accent-border)' : 'var(--border)'}`,
        borderBottom: `1px solid ${hov && !done ? 'var(--accent-border)' : 'var(--border)'}`,
        borderLeft:   `3px solid ${done ? 'var(--border)' : prio.color}`,
        background:   hov ? 'linear-gradient(160deg, var(--bg3), var(--bg2))' : 'var(--bg1)',
        boxShadow:    hov && !done
          ? '0 6px 22px rgba(0,0,0,.28), 0 0 0 1px rgba(224,189,107,.1)'
          : 'var(--shadow-sm)',
        transform:    hov ? 'translateY(-2px)' : 'translateY(0)',
        opacity:      done ? .48 : 1,
        transition:   'background .15s, box-shadow .2s, transform .2s, opacity .2s, border-color .2s',
      }}
    >
      {/* ── Checkbox circular ── */}
      <div style={{ paddingLeft: '14px', paddingTop: '1px', flexShrink: 0 }}>
        <button
          onClick={() => onToggle(tarea)}
          title={done ? 'Marcar pendiente' : 'Marcar completada'}
          style={{
            width: '20px', height: '20px', borderRadius: '50%',
            border: `2px solid ${done ? '#3ec97e' : (hov ? 'var(--text1)' : 'var(--border-hi)')}`,
            background: done ? 'rgba(62,201,126,.14)' : 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', transition: 'border-color .18s, background .18s',
            flexShrink: 0,
          }}
        >
          {done && (
            <svg key="done" className="check-pop" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#3ec97e" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          )}
        </button>
      </div>

      {/* ── Contenido ── */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Título */}
        <span style={{
          display: 'block',
          fontSize: '13px', lineHeight: '1.45', fontFamily: 'Inter, sans-serif',
          color:          done ? 'var(--text2)' : 'var(--text0)',
          fontWeight:     tarea.prioridad === 'alta' && !done ? 600 : 400,
          textDecoration: done ? 'line-through' : 'none',
          marginBottom:   (tarea.descripcion || tarea.note || hasSubs) ? '5px' : '8px',
        }}>
          {tarea.titulo}
        </span>

        {/* Descripción */}
        {tarea.descripcion && (
          <p style={{
            fontSize: '12px', color: 'var(--text2)', lineHeight: 1.55,
            marginBottom: (tarea.note || hasSubs) ? '6px' : '9px',
            display: '-webkit-box', WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {tarea.descripcion}
          </p>
        )}

        {/* Nota */}
        {tarea.note && (
          <div style={{
            borderLeft: '2px solid var(--accent)',
            paddingLeft: '8px',
            marginBottom: hasSubs ? '6px' : '9px',
          }}>
            <p
              onClick={() => setShowFullNote(v => !v)}
              style={{
                fontSize: '11.5px', fontStyle: 'italic', color: 'var(--text2)',
                lineHeight: 1.55, cursor: 'pointer', margin: 0,
                display: showFullNote ? 'block' : '-webkit-box',
                WebkitLineClamp: showFullNote ? undefined : 2,
                WebkitBoxOrient: 'vertical',
                overflow: showFullNote ? 'visible' : 'hidden',
              }}
            >
              {renderNote(tarea.note)}
            </p>
          </div>
        )}

        {/* Progreso de subtareas (mini barra clickable) */}
        {hasSubs && (
          <button
            onClick={() => setShowSubs(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '0', marginBottom: '8px',
            }}
          >
            <div style={{ width: '50px', height: '3px', borderRadius: '2px', background: 'var(--border)', overflow: 'hidden', flexShrink: 0 }}>
              <div style={{
                height: '100%', borderRadius: '2px',
                background: subsDone === subs.length ? '#3ec97e' : 'var(--accent)',
                width: `${(subsDone / subs.length) * 100}%`,
                transition: 'width .3s ease',
              }} />
            </div>
            <span style={{
              fontSize: '10px', fontFamily: "'IBM Plex Mono', monospace",
              color: subsDone === subs.length ? '#3ec97e' : '#e0bd6b',
              fontWeight: 500,
            }}>
              {subsDone}/{subs.length}
            </span>
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="var(--text2)" strokeWidth="2.5" strokeLinecap="round"
              style={{ transform: showSubs ? 'rotate(180deg)' : 'none', transition: 'transform .15s', marginLeft: '1px' }}>
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
        )}

        {/* Panel de subtareas expandido */}
        {showSubs && <SubtaskPanel uid={uid} tarea={tarea} />}

        {/* ── Fila inferior: badges + acciones ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          {/* Categoría */}
          <span style={{
            fontSize: '10px', fontWeight: 600, padding: '2px 7px', borderRadius: '20px',
            background: cat.bg, color: cat.color, border: `1px solid ${cat.border}`,
            letterSpacing: '.15px', flexShrink: 0,
          }}>
            {cat.label}
          </span>

          {/* Materia PAES */}
          {paes && (
            <span style={{
              fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '20px',
              background: paes.bg, color: paes.color, border: `1px solid ${paes.border}`,
              letterSpacing: '.2px', flexShrink: 0,
            }}>
              {paes.label}
            </span>
          )}

          {/* Indicador de nota */}
          {tarea.note && (
            <span style={{ fontSize: '11px', flexShrink: 0, lineHeight: 1 }} title="Tiene nota">📝</span>
          )}

          {/* Prioridad (alta siempre; media en hover; baja nunca) */}
          {(!done && (tarea.prioridad === 'alta' || hov)) && tarea.prioridad !== 'baja' && (
            <span style={{
              display: 'flex', alignItems: 'center', gap: '3px',
              fontSize: '10px', fontWeight: 600, color: prio.color, flexShrink: 0,
            }}>
              <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: prio.color }} />
              {prio.label}
            </span>
          )}

          {/* Fecha */}
          {fecha && (
            <span style={{
              fontSize: '11px', fontFamily: "'IBM Plex Mono', monospace", flexShrink: 0,
              color:      fecha.overdue && !done ? '#f07272' : 'var(--text2)',
              fontWeight: fecha.overdue && !done ? 700 : 400,
            }}>
              {fecha.label}
            </span>
          )}

          {/* Acciones (aparecen en hover) */}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '3px', opacity: hov ? 1 : 0, transition: 'opacity .15s' }}>
            <IconBtn onClick={onEdit} title="Editar" hoverColor="var(--accent)" hoverBg="var(--accent-dim)">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
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

  const subs = tarea.subtasks || []

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus()
  }, [])

  useEffect(() => {
    if (editingId && editRef.current) editRef.current.focus()
  }, [editingId])

  async function toggleSub(sub) {
    const updated = subs.map(s => s.id === sub.id ? { ...s, done: !s.done } : s)
    await updateTarea(uid, tarea.id, { subtasks: updated })
  }

  async function addSub() {
    const text = newText.trim()
    if (!text) return
    const sub = { id: 'sub_' + Date.now(), text, done: false }
    await updateTarea(uid, tarea.id, { subtasks: [...subs, sub] })
    setNewText('')
  }

  async function deleteSub(subId) {
    await updateTarea(uid, tarea.id, { subtasks: subs.filter(s => s.id !== subId) })
  }

  async function commitEdit(subId) {
    const text = editText.trim()
    if (!text) { setEditingId(null); return }
    const updated = subs.map(s => s.id === subId ? { ...s, text } : s)
    await updateTarea(uid, tarea.id, { subtasks: updated })
    setEditingId(null)
  }

  function startEdit(sub) {
    setEditingId(sub.id)
    setEditText(sub.text)
  }

  return (
    <div style={{
      marginBottom: '8px',
      padding: '8px 10px 6px',
      background: 'var(--bg3)',
      borderRadius: '8px',
      border: '1px solid var(--border)',
    }}>
      {subs.map(sub => (
        <SubtaskRow
          key={sub.id}
          sub={sub}
          isEditing={editingId === sub.id}
          editText={editText}
          editRef={editRef}
          onToggle={() => toggleSub(sub)}
          onDelete={() => deleteSub(sub.id)}
          onDoubleClick={() => startEdit(sub)}
          onEditChange={setEditText}
          onEditKeyDown={e => {
            if (e.key === 'Enter') { e.preventDefault(); commitEdit(sub.id) }
            if (e.key === 'Escape') setEditingId(null)
          }}
          onEditBlur={() => commitEdit(sub.id)}
        />
      ))}

      {/* Agregar nueva subtarea */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: subs.length > 0 ? '4px' : '0' }}>
        <div style={{
          width: '14px', height: '14px', borderRadius: '4px',
          border: '1.5px dashed var(--border)', flexShrink: 0,
        }} />
        <input
          ref={inputRef}
          value={newText}
          onChange={e => setNewText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSub() } }}
          placeholder="Nueva subtarea..."
          style={{
            flex: 1, background: 'none', border: 'none', outline: 'none',
            fontSize: '12px', color: 'var(--text1)', fontFamily: 'Inter, sans-serif',
          }}
        />
        {newText.trim() && (
          <button
            onClick={addSub}
            style={{
              background: 'var(--accent)', border: 'none', borderRadius: '5px',
              color: '#1a1608', fontSize: '11px', fontWeight: 700,
              padding: '2px 8px', cursor: 'pointer', fontFamily: 'Inter, sans-serif',
            }}
          >
            +
          </button>
        )}
      </div>
    </div>
  )
}

// ── Fila de subtarea ───────────────────────────────────────────────────────────

function SubtaskRow({ sub, isEditing, editText, editRef, onToggle, onDelete, onDoubleClick, onEditChange, onEditKeyDown, onEditBlur }) {
  const [hov, setHov] = useState(false)

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '3px 0', minHeight: '24px' }}
    >
      {/* Checkbox dorado */}
      <button
        onClick={onToggle}
        style={{
          width: '14px', height: '14px', borderRadius: '4px', flexShrink: 0,
          border: `1.5px solid ${sub.done ? '#e0bd6b' : 'var(--border-hi)'}`,
          background: sub.done ? 'rgba(224,189,107,.18)' : 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', transition: 'all .14s',
        }}
      >
        {sub.done && (
          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#e0bd6b" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        )}
      </button>

      {/* Texto / input edición */}
      {isEditing ? (
        <input
          ref={editRef}
          value={editText}
          onChange={e => onEditChange(e.target.value)}
          onKeyDown={onEditKeyDown}
          onBlur={onEditBlur}
          style={{
            flex: 1, background: 'none', border: 'none', outline: 'none',
            fontSize: '12px', color: 'var(--text0)', fontFamily: 'Inter, sans-serif',
            borderBottom: '1px solid var(--accent)', paddingBottom: '1px',
          }}
        />
      ) : (
        <span
          onDoubleClick={onDoubleClick}
          title="Doble clic para editar"
          style={{
            flex: 1, fontSize: '12px', lineHeight: 1.4, fontFamily: 'Inter, sans-serif',
            color: sub.done ? 'var(--text2)' : 'var(--text1)',
            textDecoration: sub.done ? 'line-through' : 'none',
            cursor: 'text', userSelect: 'none',
          }}
        >
          {sub.text}
        </span>
      )}

      {/* Eliminar (hover) */}
      {!isEditing && hov && (
        <button
          onClick={onDelete}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text2)', padding: '2px', borderRadius: '4px',
            display: 'flex', alignItems: 'center', flexShrink: 0,
            transition: 'color .1s',
          }}
          onMouseEnter={e => e.currentTarget.style.color = '#f07272'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text2)'}
        >
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
    <button
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: '26px', height: '26px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: hov ? hoverBg  : 'none',
        border: 'none', borderRadius: '6px', cursor: 'pointer',
        color: hov ? hoverColor : 'var(--text2)',
        transition: 'color .1s, background .1s',
      }}
    >
      {children}
    </button>
  )
}

// ── Formulario (nuevo + editar) ────────────────────────────────────────────────

function TareaForm({ value, setField, onSave, onCancel, saving, mode }) {
  const canSave = !!value.titulo.trim() && !saving

  return (
    <div style={{
      background: 'linear-gradient(160deg, var(--bg3) 0%, var(--bg2) 100%)',
      border: '1px solid var(--accent-border)',
      borderRadius: 'var(--radius)', padding: '16px 16px 14px',
      marginBottom: '6px',
      boxShadow: '0 8px 24px -8px rgba(0,0,0,.5), 0 0 0 1px var(--accent-border)',
      animation: 'slideUp .2s cubic-bezier(.25,.46,.45,.94) both',
    }}>
      {/* ── Título ── */}
      <input
        autoFocus
        placeholder="Título de la tarea..."
        value={value.titulo}
        onChange={e => setField('titulo', e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSave() } }}
        style={{
          width: '100%', background: 'none', border: 'none', outline: 'none',
          color: 'var(--text0)', fontSize: '14px', fontWeight: 500,
          fontFamily: 'Inter, sans-serif', marginBottom: '10px',
        }}
      />

      {/* ── Descripción ── */}
      <textarea
        placeholder="Descripción (opcional)..."
        value={value.descripcion}
        onChange={e => setField('descripcion', e.target.value)}
        rows={2}
        style={{
          width: '100%', background: 'none', resize: 'none',
          border: 'none', borderTop: '1px solid var(--border)', outline: 'none',
          color: 'var(--text1)', fontSize: '12px', lineHeight: 1.6,
          fontFamily: 'Inter, sans-serif', padding: '10px 0 10px',
        }}
      />

      {/* ── Nota ── */}
      <textarea
        placeholder="Nota o enlace (opcional)..."
        value={value.note}
        onChange={e => setField('note', e.target.value)}
        rows={2}
        style={{
          width: '100%', background: 'none', resize: 'none',
          border: 'none', borderTop: '1px solid var(--border)', outline: 'none',
          color: 'var(--text2)', fontSize: '12px', lineHeight: 1.6, fontStyle: 'italic',
          fontFamily: 'Inter, sans-serif', padding: '10px 0 12px',
        }}
      />

      {/* ── Materia PAES ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap',
        marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px solid var(--border)',
      }}>
        <span style={{ fontSize: '11px', color: 'var(--text2)', fontWeight: 500, marginRight: '2px' }}>Materia:</span>
        {PAES_SUBJECTS.map(s => {
          const active = value.paesSubject === s.key
          return (
            <button key={s.key} onClick={() => setField('paesSubject', active ? '' : s.key)} style={{
              padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: active ? 700 : 400,
              border: `1px solid ${active ? s.color : 'var(--border)'}`,
              background: active ? s.bg : 'none',
              color: active ? s.color : 'var(--text2)',
              cursor: 'pointer', fontFamily: 'Inter, sans-serif', transition: 'all .1s',
            }}>
              {s.label}
            </button>
          )
        })}
        {value.paesSubject && (
          <button onClick={() => setField('paesSubject', '')} style={{
            padding: '3px 7px', borderRadius: '20px', fontSize: '10px',
            border: '1px solid var(--border)', background: 'none',
            color: 'var(--text2)', cursor: 'pointer', fontFamily: 'Inter, sans-serif',
          }}>✕</button>
        )}
      </div>

      {/* ── Fila 1: categoría + prioridad ── */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '10px' }}>
        <CatSelect value={value.categoria} onChange={v => setField('categoria', v)} />

        <div style={{ display: 'flex', gap: '4px' }}>
          {Object.entries(PRIO_META).map(([k, p]) => {
            const active = value.prioridad === k
            return (
              <button key={k} onClick={() => setField('prioridad', k)} style={{
                display: 'flex', alignItems: 'center', gap: '4px',
                padding: '4px 10px', borderRadius: '20px',
                border:      `1px solid ${active ? p.color : 'var(--border)'}`,
                background:  active ? p.bg : 'none',
                color:       active ? p.color : 'var(--text2)',
                fontSize: '11px', fontWeight: active ? 600 : 400,
                fontFamily: 'Inter, sans-serif', cursor: 'pointer', transition: 'all .1s',
              }}>
                <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: p.color, flexShrink: 0 }} />
                {p.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Fila 2: alcance + fecha + acciones ── */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Alcance */}
        <div style={{ display: 'flex', gap: '4px' }}>
          {ALCANCES.map(a => {
            const active = value.alcance === a.key
            return (
              <button key={a.key} onClick={() => setField('alcance', a.key)} style={{
                padding: '4px 9px', borderRadius: '20px',
                border:     `1px solid ${active ? a.color : 'var(--border)'}`,
                background: active ? a.bg : 'none',
                color:      active ? a.color : 'var(--text2)',
                fontSize: '11px', fontWeight: active ? 600 : 400,
                fontFamily: 'Inter, sans-serif', cursor: 'pointer', transition: 'all .1s',
              }}>
                {a.label.replace('Tareas ', '')}
              </button>
            )
          })}
        </div>

        {/* Fecha */}
        <input
          type="date"
          value={value.fecha}
          onChange={e => setField('fecha', e.target.value)}
          style={{
            background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '20px',
            color: value.fecha ? 'var(--text0)' : 'var(--text2)',
            fontSize: '11px', padding: '4px 10px', cursor: 'pointer', outline: 'none',
            fontFamily: 'Inter, sans-serif',
          }}
        />

        {/* Acciones */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px' }}>
          <button onClick={onCancel}
            className="btn-secondary"
            style={{
              padding: '6px 14px', borderRadius: '7px',
              border: '1px solid var(--border)', background: 'none',
              color: 'var(--text1)', fontSize: '12px', fontWeight: 500,
              fontFamily: 'Inter, sans-serif', cursor: 'pointer', transition: 'all .18s ease',
            }}
          >
            Cancelar
          </button>
          <button
            onClick={onSave}
            disabled={!canSave}
            className="btn-primary"
            style={{
              padding: '6px 18px', borderRadius: '7px', border: 'none',
              background: canSave ? 'var(--accent)' : 'var(--bg3)',
              color:      canSave ? '#1a1608' : 'var(--text2)',
              fontSize: '12px', fontWeight: 600, fontFamily: 'Inter, sans-serif',
              cursor: canSave ? 'pointer' : 'not-allowed',
              opacity: saving ? .7 : 1, transition: 'all .2s ease',
            }}
          >
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
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600,
        border: `1px solid ${c.border}`, background: c.bg, color: c.color,
        cursor: 'pointer', outline: 'none', fontFamily: 'Inter, sans-serif',
      }}
    >
      {CATS.map(cat => <option key={cat} value={cat}>{CAT_META[cat]?.label || cat}</option>)}
    </select>
  )
}
