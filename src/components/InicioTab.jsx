import React, { useEffect, useState } from 'react'
import { saveCheckin, subscribeCheckin, subscribeTareas } from '../firebase/db'
import SectionHeading from './SectionHeading'
import EmptyState from './EmptyState'
import NextEventWidget from './NextEventWidget'

// ── Helpers ────────────────────────────────────────────────────────────────────

function chileDate() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Santiago' }))
}

function getLocalDate() {
  const d = chileDate()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

const TODAY = getLocalDate()

const SLIDER_FIELDS = [
  { key: 'ganas_estudio',    label: 'Ganas de estudiar' },
  { key: 'energia',          label: 'Energía / qué tan descansado estás' },
  { key: 'ganas_productivo', label: 'Ganas de ser productivo' },
  { key: 'animo',            label: 'Ánimo / estado emocional' },
]

const TIEMPO_OPTIONS = [
  { value: 'poco',     label: 'Poco' },
  { value: 'algo',     label: 'Algo' },
  { value: 'bastante', label: 'Bastante' },
]

const DEFAULT_VALUES = { ganas_estudio: 5, energia: 5, ganas_productivo: 5, animo: 5, tiempo_libre: 'algo' }

const TIPO_COLOR = {
  clase: '#5b9cf6', estudio: '#c084fc', paes: '#3ec97e',
  libre: '#9e99ba', ejercicio: '#f0a740', otro: '#625e7c',
}

const PRIO_META = {
  alta:  { color: '#f07272' },
  media: { color: '#f0a740' },
  baja:  { color: '#625e7c' },
}

function sliderColor(v) {
  if (v <= 3) return 'var(--red)'
  if (v <= 6) return 'var(--amber)'
  return 'var(--green)'
}

// ── Componente principal ───────────────────────────────────────────────────────

export default function InicioTab({ uid, gcalToken, eventosHoy, onTabChange }) {
  const [fields, setFields]    = useState(DEFAULT_VALUES)
  const [saved, setSaved]      = useState(undefined)
  const [editing, setEditing]  = useState(false)
  const [saving, setSaving]    = useState(false)
  const [tareas, setTareas]    = useState([])

  // Check-in de hoy
  useEffect(() => {
    if (!uid) return
    return subscribeCheckin(uid, TODAY, data => {
      setSaved(data || null)
      if (data) setFields({
        ganas_estudio:    data.ganas_estudio    ?? 5,
        energia:          data.energia          ?? 5,
        ganas_productivo: data.ganas_productivo ?? 5,
        animo:            data.animo            ?? 5,
        tiempo_libre:     data.tiempo_libre     ?? 'algo',
      })
    })
  }, [uid])

  // Tareas
  useEffect(() => {
    if (!uid) return
    return subscribeTareas(uid, setTareas)
  }, [uid])

  async function handleSave() {
    setSaving(true)
    await saveCheckin(uid, TODAY, fields)
    setSaving(false)
    setEditing(false)
  }

  function setField(key, val) { setFields(f => ({ ...f, [key]: val })) }

  // Saludo por hora
  const now = chileDate()
  const h   = now.getHours()
  const greeting = h < 6 ? 'Buenas noches' : h < 12 ? 'Buenos días' : h < 20 ? 'Buenas tardes' : 'Buenas noches'
  const dateLabel = now.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })
  const dateCap   = dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1)

  const showForm  = saved === null || editing
  const urgentes  = tareas.filter(t => !t.completada && t.fecha && t.fecha <= TODAY)
  const vencidas  = urgentes.filter(t => t.fecha < TODAY)
  const hoy       = urgentes.filter(t => t.fecha === TODAY)

  return (
    <div style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
      {/* Marca de agua */}
      <img
        src="/cerebro-logo.png"
        alt=""
        aria-hidden="true"
        className="inicio-watermark"
        style={{
          position: 'absolute', right: '6%', top: '50%',
          transform: 'translateY(-50%)',
          width: '420px', height: '420px',
          objectFit: 'contain', pointerEvents: 'none', zIndex: 0,
        }}
      />

      <div style={{ position: 'relative', zIndex: 1, padding: '32px 36px' }}>
        <div style={{ maxWidth: '680px' }}>

          {/* 1 ── Saludo + fecha */}
          <div style={{ marginBottom: '28px' }}>
            <h1 style={{ fontSize: '26px', fontWeight: 700, color: 'var(--text0)', letterSpacing: '-.5px', marginBottom: '4px' }}>
              {greeting}, Mateo.
            </h1>
            <p style={{ color: 'var(--text2)', fontSize: '14px' }}>{dateCap}</p>
          </div>

          {/* Próximo evento — siempre visible, arriba de todo */}
          <div style={{ marginBottom: '20px' }}>
            <NextEventWidget gcalToken={gcalToken} eventosHoy={eventosHoy} />
          </div>

          <div className="stagger-children" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* 2 ── Check-in diario */}
            <div className="card">
              <SectionHeading
                title="Check-in del día"
                icon={
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
                  </svg>
                }
                style={{ marginBottom: '18px' }}
              />

              {saved === undefined && (
                <p style={{ color: 'var(--text2)', fontSize: '13px' }}>Cargando...</p>
              )}
              {saved !== undefined && !showForm && saved && (
                <CheckinSummary data={saved} onEdit={() => setEditing(true)} />
              )}
              {saved !== undefined && showForm && (
                <CheckinForm
                  fields={fields}
                  onField={setField}
                  onSave={handleSave}
                  saving={saving}
                  isEdit={!!saved}
                  onCancel={saved ? () => setEditing(false) : null}
                />
              )}
            </div>

            {/* 3 ── Calendario de hoy */}
            <CalendarioDiaCard gcalToken={gcalToken} eventosHoy={eventosHoy} />

            {/* 4 ── Tareas urgentes de hoy */}
            <TareasUrgentesCard
              vencidas={vencidas}
              hoy={hoy}
              onClick={() => onTabChange?.('tareas')}
            />

          </div>
        </div>
      </div>
    </div>
  )
}

// ── Calendario de hoy (maneja los 3 estados: sin GCal, cargando, con eventos) ──

function CalendarioDiaCard({ gcalToken, eventosHoy }) {
  return (
    <div className="card">
      <SectionHeading
        title="Hoy en tu calendario"
        icon={
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2"/>
            <path d="M16 2v4M8 2v4M3 10h18"/>
          </svg>
        }
      />

      {/* Sin GCal conectado */}
      {!gcalToken && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '10px 12px', borderRadius: '8px',
          background: 'var(--bg3)', border: '1px solid var(--border)',
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span style={{ fontSize: '12px', color: 'var(--text2)' }}>
            Conectá Google Calendar desde la pestaña <strong style={{ color: 'var(--text1)' }}>Calendario</strong> para ver tus eventos aquí.
          </span>
        </div>
      )}

      {/* Cargando */}
      {gcalToken && eventosHoy === null && (
        <p style={{ fontSize: '12px', color: 'var(--text2)', padding: '6px 0' }}>Cargando eventos...</p>
      )}

      {/* Sin eventos */}
      {gcalToken && eventosHoy !== null && eventosHoy.length === 0 && (
        <EmptyState size="sm" text="Sin eventos programados para hoy" hint="Día libre." />
      )}

      {/* Lista de eventos */}
      {gcalToken && eventosHoy !== null && eventosHoy.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          {eventosHoy.map(ev => {
            const color = TIPO_COLOR[ev.tipo] || TIPO_COLOR.otro
            return (
              <div key={ev.id} style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '7px 10px', borderRadius: '7px',
                background: 'var(--bg2)', border: '1px solid var(--border)',
                borderLeft: `3px solid ${color}`,
              }}>
                <span style={{
                  fontSize: '11px', fontFamily: "'IBM Plex Mono', monospace",
                  color: 'var(--text2)', whiteSpace: 'nowrap', minWidth: '96px', flexShrink: 0,
                }}>
                  {ev.horaInicio} – {ev.horaFin}
                </span>
                <span style={{
                  fontSize: '13px', fontWeight: 500, color: 'var(--text0)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {ev.titulo}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Tareas urgentes de hoy ─────────────────────────────────────────────────────

function TareasUrgentesCard({ vencidas, hoy, onClick }) {
  const total    = vencidas.length + hoy.length
  const hasUrgent = total > 0
  const MAX_SHOW  = 5
  const combined  = [...vencidas, ...hoy].slice(0, MAX_SHOW)
  const remaining = total - combined.length

  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', textAlign: 'left', background: 'none', border: 'none',
        padding: 0, cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <div
        className="card"
        style={{
          border: hasUrgent && vencidas.length > 0
            ? '1px solid rgba(240,114,114,.3)'
            : hasUrgent
              ? '1px solid rgba(240,167,64,.28)'
              : undefined,
          background: hasUrgent && vencidas.length > 0
            ? 'rgba(240,114,114,.04)'
            : undefined,
          transition: 'border-color .15s, box-shadow .15s',
        }}
        onMouseEnter={e => { if (onClick) e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,.18)' }}
        onMouseLeave={e => { if (onClick) e.currentTarget.style.boxShadow = '' }}
      >
        {/* Header */}
        <SectionHeading
          title="Tareas urgentes de hoy"
          style={{ marginBottom: hasUrgent ? '12px' : '0' }}
          icon={
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke={vencidas.length > 0 ? '#f07272' : hoy.length > 0 ? '#f0a740' : 'currentColor'}
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          }
          right={
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {hasUrgent && (
                <span style={{
                  fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px',
                  background: vencidas.length > 0 ? 'rgba(240,114,114,.12)' : 'rgba(240,167,64,.12)',
                  color:      vencidas.length > 0 ? '#f07272' : '#f0a740',
                  border:     `1px solid ${vencidas.length > 0 ? 'rgba(240,114,114,.3)' : 'rgba(240,167,64,.3)'}`,
                }}>
                  {total}
                </span>
              )}
              {onClick && (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              )}
            </div>
          }
        />

        {/* Sin urgentes */}
        {!hasUrgent && (
          <EmptyState size="sm" text="Sin tareas urgentes para hoy" hint="¡Bien!" />
        )}

        {/* Lista compacta */}
        {hasUrgent && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {combined.map(t => {
              const prio     = PRIO_META[t.prioridad] || PRIO_META.media
              const isOverdue = t.fecha < TODAY
              return (
                <div key={t.id} style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '6px 10px', borderRadius: '7px',
                  background: 'var(--bg2)', border: '1px solid var(--border)',
                  borderLeft: `3px solid ${prio.color}`,
                }}>
                  <span style={{
                    flex: 1, fontSize: '12px', fontWeight: 500,
                    color: 'var(--text0)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {t.titulo}
                  </span>
                  <span style={{
                    fontSize: '10px', fontFamily: "'IBM Plex Mono', monospace",
                    fontWeight: 700, flexShrink: 0,
                    color: isOverdue ? '#f07272' : '#f0a740',
                  }}>
                    {isOverdue ? 'Vencida' : 'Hoy'}
                  </span>
                </div>
              )
            })}
            {remaining > 0 && (
              <p style={{ fontSize: '11px', color: 'var(--text2)', paddingLeft: '2px', marginTop: '2px' }}>
                ...y {remaining} tarea{remaining !== 1 ? 's' : ''} más
              </p>
            )}
          </div>
        )}
      </div>
    </button>
  )
}

// ── Resumen de check-in ya guardado ───────────────────────────────────────────

function CheckinSummary({ data, onEdit }) {
  const tiempoLabel = { poco: 'Poco', algo: 'Algo', bastante: 'Bastante' }
  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px',
        padding: '8px 12px', background: 'rgba(62,201,126,.08)',
        borderRadius: '7px', border: '1px solid rgba(62,201,126,.2)',
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6L9 17l-5-5" />
        </svg>
        <span style={{ fontSize: '12px', color: 'var(--green)', fontWeight: 500 }}>Check-in completado hoy</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px', marginBottom: '16px' }}>
        {SLIDER_FIELDS.map(f => (
          <div key={f.key}>
            <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: '4px' }}>
              {f.label}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px' }}>
              <span style={{ fontSize: '20px', fontWeight: 700, color: sliderColor(data[f.key] ?? 5), fontFamily: "'IBM Plex Mono', monospace", lineHeight: 1 }}>
                {data[f.key] ?? '—'}
              </span>
              <span style={{ fontSize: '10px', color: 'var(--text2)' }}>/10</span>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text2)' }}>Tiempo libre:</span>
          <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text1)' }}>
            {tiempoLabel[data.tiempo_libre] || '—'}
          </span>
        </div>
        <button
          onClick={onEdit}
          className="btn-secondary"
          style={{
            padding: '4px 14px', background: 'none', border: '1px solid var(--border)',
            borderRadius: '6px', color: 'var(--text1)', fontSize: '12px', fontWeight: 500,
            fontFamily: 'Inter, sans-serif', cursor: 'pointer', transition: 'all .18s ease',
          }}
        >
          Editar
        </button>
      </div>
    </div>
  )
}

// ── Formulario de check-in ────────────────────────────────────────────────────

function CheckinForm({ fields, onField, onSave, saving, isEdit, onCancel }) {
  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '22px', marginBottom: '26px' }}>
        {SLIDER_FIELDS.map(f => (
          <SliderRow key={f.key} label={f.label} value={fields[f.key] ?? 5} onChange={v => onField(f.key, v)} />
        ))}
      </div>

      {/* Tiempo libre */}
      <div style={{ marginBottom: '26px' }}>
        <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text0)', display: 'block', marginBottom: '10px' }}>
          ¿Cuánto tiempo libre tenés hoy?
        </label>
        <div style={{ display: 'flex', gap: '8px' }}>
          {TIEMPO_OPTIONS.map(opt => {
            const active = fields.tiempo_libre === opt.value
            return (
              <button key={opt.value} onClick={() => onField('tiempo_libre', opt.value)} style={{
                padding: '7px 20px', borderRadius: '7px',
                border: `1.5px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                background: active ? 'var(--accent-dim)' : 'none',
                color: active ? 'var(--accent)' : 'var(--text1)',
                fontFamily: 'Inter, sans-serif', fontSize: '13px',
                fontWeight: active ? 500 : 400,
                cursor: 'pointer', transition: 'all .12s',
              }}>
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Acciones */}
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
        {onCancel && (
          <button onClick={onCancel} className="btn-secondary" style={{
            padding: '9px 20px', background: 'none', border: '1px solid var(--border)',
            borderRadius: '7px', color: 'var(--text1)', fontFamily: 'Inter, sans-serif',
            fontSize: '13px', cursor: 'pointer', transition: 'all .18s ease',
          }}>
            Cancelar
          </button>
        )}
        <button onClick={onSave} disabled={saving} className="btn-primary" style={{
          padding: '9px 24px',
          background: saving ? 'var(--bg3)' : 'var(--accent)',
          border: 'none', borderRadius: '7px',
          color: saving ? 'var(--text2)' : '#1a1608',
          fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 600,
          cursor: saving ? 'not-allowed' : 'pointer',
          opacity: saving ? .7 : 1, transition: 'all .2s ease',
        }}>
          {saving ? 'Guardando...' : isEdit ? 'Actualizar' : 'Guardar check-in'}
        </button>
      </div>
    </div>
  )
}

// ── Fila de slider ─────────────────────────────────────────────────────────────

function SliderRow({ label, value, onChange }) {
  const color = sliderColor(value)
  const pct   = `${((value - 1) / 9) * 100}%`
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text0)' }}>{label}</label>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '15px', fontWeight: 700, color, minWidth: '28px', textAlign: 'right' }}>
          {value}
        </span>
      </div>
      <input type="range" min="1" max="10" value={value} onChange={e => onChange(Number(e.target.value))}
        style={{ '--slider-pct': pct, '--slider-color': color }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
        <span style={{ fontSize: '10px', color: 'var(--text2)' }}>1</span>
        <span style={{ fontSize: '10px', color: 'var(--text2)' }}>10</span>
      </div>
    </div>
  )
}
