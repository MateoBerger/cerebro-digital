import React, { useEffect, useState } from 'react'
import { saveCheckin, subscribeCheckin } from '../firebase/db'
import { gcalListarEventos } from '../utils/gcalApi'

function chileDate() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Santiago' }))
}

function getLocalDate() {
  const d = chileDate()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

const TODAY     = getLocalDate()
const IS_SUNDAY = chileDate().getDay() === 0

const SECCIONES = [
  { nombre: 'Inicio',           desc: 'Esta pantalla. Check-in diario y guía de la app.' },
  { nombre: 'Dashboard',        desc: 'Resumen de tu horario base, metas semanales y config Pomodoro.' },
  { nombre: 'Tareas',           desc: 'Lista de tareas por categoría con prioridades y fechas. (Próximamente)' },
  { nombre: 'Calendario',       desc: 'Vista semanal con bloques de estudio y tiempo libre. (Próximamente)' },
  { nombre: 'PAES',             desc: 'Progreso por materia, ensayos, puntaje meta y estadísticas. (Próximamente)' },
  { nombre: 'Mapa del sistema', desc: 'Diagrama visual de todos los módulos del SMGV, editable.' },
  { nombre: 'Diccionario',      desc: 'Variables de configuración de toda la app, editables en tiempo real.' },
]

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

function sliderColor(v) {
  if (v <= 3) return 'var(--red)'
  if (v <= 6) return 'var(--amber)'
  return 'var(--green)'
}

export default function InicioTab({ uid, gcalToken, onGcalExpired }) {
  const [fields, setFields]     = useState(DEFAULT_VALUES)
  const [saved, setSaved]       = useState(undefined) // undefined=cargando, null=no hay, obj=existe
  const [editing, setEditing]   = useState(false)
  const [saving, setSaving]     = useState(false)
  const [eventosHoy, setEvHoy]  = useState(null)   // null=no cargado, []=sin eventos

  // Cargar eventos de Google Calendar para hoy
  useEffect(() => {
    if (!gcalToken) return
    const start = new Date(); start.setHours(0, 0, 0, 0)
    const end   = new Date(); end.setHours(23, 59, 59, 999)
    gcalListarEventos(gcalToken, start, end)
      .then(items => {
        const ev = items
          .filter(e => e.start?.dateTime)
          .map(e => ({
            id:         e.id,
            titulo:     e.summary || '(sin título)',
            horaInicio: new Date(e.start.dateTime).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
            horaFin:    new Date(e.end.dateTime).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
            tipo:       e.extendedProperties?.private?.tipo || 'otro',
          }))
        setEvHoy(ev)
      })
      .catch(err => { if (err.code === 'token_expired') onGcalExpired?.(); setEvHoy([]) })
  }, [gcalToken])

  useEffect(() => {
    if (!uid) return
    const unsub = subscribeCheckin(uid, TODAY, data => {
      setSaved(data || null)
      if (data) setFields({
        ganas_estudio:    data.ganas_estudio    ?? 5,
        energia:          data.energia          ?? 5,
        ganas_productivo: data.ganas_productivo ?? 5,
        animo:            data.animo            ?? 5,
        tiempo_libre:     data.tiempo_libre     ?? 'algo',
      })
    })
    return unsub
  }, [uid])

  async function handleSave() {
    setSaving(true)
    await saveCheckin(uid, TODAY, fields)
    setSaving(false)
    setEditing(false)
  }

  function setField(key, val) { setFields(f => ({ ...f, [key]: val })) }

  const dateStr  = new Date().toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })
  const showForm = saved === null || editing

  return (
    <div style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
      {/* Marca de agua: logo de fondo */}
      <img
        src="/cerebro-logo.png"
        alt=""
        aria-hidden="true"
        className="inicio-watermark"
        style={{
          position: 'absolute',
          right: '6%',
          top: '50%',
          transform: 'translateY(-50%)',
          width: '420px',
          height: '420px',
          objectFit: 'contain',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      <div style={{ position: 'relative', zIndex: 1, padding: '32px 36px' }}>
      <div style={{ maxWidth: '680px' }}>

        {/* Header */}
        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontSize: '26px', fontWeight: 700, color: 'var(--text0)', letterSpacing: '-.5px', marginBottom: '4px' }}>
            SMGV
          </h1>
          <p style={{ color: 'var(--text1)', fontSize: '14px' }}>Sistema Maestro de Gestión de Vida</p>
        </div>

        {/* Check semanal — solo domingos */}
        {IS_SUNDAY && <CheckSemanalBanner />}

        {/* Calendario del día */}
        {eventosHoy !== null && <CalendarioDia eventos={eventosHoy} />}

        {/* Descripción estática */}
        <div className="card" style={{ marginBottom: '20px' }}>
          <h2 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text0)', marginBottom: '12px' }}>¿Qué es SMGV?</h2>
          <p style={{ fontSize: '13px', color: 'var(--text1)', lineHeight: 1.75, marginBottom: '18px' }}>
            Tu sistema personal para organizarte como estudiante de 4to medio. Centraliza
            tu horario, metas, plan de estudio PAES y seguimiento diario en un solo lugar.
            El asistente IA puede leer todo esto y ayudarte a decidir qué hacer.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
            {SECCIONES.map(s => (
              <div key={s.nombre} style={{ display: 'flex', gap: '12px', alignItems: 'baseline' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent)', minWidth: '128px', flexShrink: 0 }}>
                  {s.nombre}
                </span>
                <span style={{ fontSize: '12px', color: 'var(--text1)', lineHeight: 1.5 }}>{s.desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Check-in diario */}
        <div className="card">
          <div style={{ marginBottom: '20px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text0)', marginBottom: '4px' }}>
              Check-in diario
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--text2)', textTransform: 'capitalize' }}>{dateStr}</p>
          </div>

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

      </div>
      </div>
    </div>
  )
}

/* ── Banner check semanal (solo domingos) ── */
function CheckSemanalBanner() {
  return (
    <div className="card" style={{
      marginBottom: '20px',
      border: '1px solid rgba(240,167,64,.35)',
      background: 'rgba(240,167,64,.07)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontSize: '22px', flexShrink: 0 }}>📋</span>
        <div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--amber)', marginBottom: '3px' }}>
            Heyy, toca el check de la semana
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text1)', lineHeight: 1.5 }}>
            Revisá tus metas antes de que empiece la semana nueva.
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Resumen cuando ya hay check-in ── */
function CheckinSummary({ data, onEdit }) {
  const tiempoLabel = { poco: 'Poco', algo: 'Algo', bastante: 'Bastante' }
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', padding: '10px 12px', background: 'rgba(62,201,126,.08)', borderRadius: '7px', border: '1px solid rgba(62,201,126,.2)' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6L9 17l-5-5" />
        </svg>
        <span style={{ fontSize: '13px', color: 'var(--green)', fontWeight: 500 }}>Check-in completado hoy</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px', marginBottom: '18px' }}>
        {SLIDER_FIELDS.map(f => (
          <div key={f.key}>
            <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: '5px' }}>
              {f.label}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px' }}>
              <span style={{ fontSize: '22px', fontWeight: 700, color: sliderColor(data[f.key] ?? 5), fontFamily: "'IBM Plex Mono', monospace", lineHeight: 1 }}>
                {data[f.key] ?? '—'}
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text2)', fontWeight: 400 }}>/10</span>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '14px', borderTop: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text2)' }}>Tiempo libre:</span>
          <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text1)' }}>
            {tiempoLabel[data.tiempo_libre] || '—'}
          </span>
        </div>
        <button
          onClick={onEdit}
          style={{
            padding: '5px 16px', background: 'none', border: '1px solid var(--border)',
            borderRadius: '6px', color: 'var(--text1)', fontSize: '12px', fontWeight: 500,
            fontFamily: 'Inter, sans-serif', cursor: 'pointer', transition: 'border-color .12s, color .12s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-hi)'; e.currentTarget.style.color = 'var(--text0)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text1)' }}
        >
          Editar
        </button>
      </div>
    </div>
  )
}

/* ── Formulario de check-in ── */
function CheckinForm({ fields, onField, onSave, saving, isEdit, onCancel }) {
  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '22px', marginBottom: '26px' }}>
        {SLIDER_FIELDS.map(f => (
          <SliderRow
            key={f.key}
            label={f.label}
            value={fields[f.key] ?? 5}
            onChange={v => onField(f.key, v)}
          />
        ))}
      </div>

      {/* Tiempo libre */}
      <div style={{ marginBottom: '28px' }}>
        <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text0)', display: 'block', marginBottom: '10px' }}>
          ¿Cuánto tiempo libre tenés hoy?
        </label>
        <div style={{ display: 'flex', gap: '8px' }}>
          {TIEMPO_OPTIONS.map(opt => {
            const active = fields.tiempo_libre === opt.value
            return (
              <button
                key={opt.value}
                onClick={() => onField('tiempo_libre', opt.value)}
                style={{
                  padding: '7px 20px', borderRadius: '7px',
                  border: `1.5px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                  background: active ? 'var(--accent-dim)' : 'none',
                  color: active ? 'var(--accent)' : 'var(--text1)',
                  fontFamily: 'Inter, sans-serif', fontSize: '13px',
                  fontWeight: active ? 500 : 400,
                  cursor: 'pointer', transition: 'all .12s',
                }}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Acciones */}
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
        {onCancel && (
          <button
            onClick={onCancel}
            style={{
              padding: '9px 20px', background: 'none', border: '1px solid var(--border)',
              borderRadius: '7px', color: 'var(--text1)', fontFamily: 'Inter, sans-serif',
              fontSize: '13px', cursor: 'pointer', transition: 'border-color .12s',
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-hi)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
          >
            Cancelar
          </button>
        )}
        <button
          onClick={onSave}
          disabled={saving}
          style={{
            padding: '9px 24px',
            background: saving ? 'var(--bg3)' : 'var(--accent)',
            border: 'none', borderRadius: '7px',
            color: saving ? 'var(--text2)' : '#fff',
            fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 500,
            cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? .7 : 1, transition: 'opacity .12s',
          }}
        >
          {saving ? 'Guardando...' : isEdit ? 'Actualizar' : 'Guardar check-in'}
        </button>
      </div>
    </div>
  )
}

/* ── Calendario del día ── */
const TIPO_COLOR = {
  clase:     '#5b9cf6', estudio: '#c084fc', paes: '#3ec97e',
  libre:     '#9e99ba', ejercicio: '#f0a740', otro: '#625e7c',
}

function CalendarioDia({ eventos }) {
  const dateStr = new Date().toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="card" style={{ marginBottom: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2"/>
          <path d="M16 2v4M8 2v4M3 10h18"/>
        </svg>
        <h2 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text0)' }}>Hoy en tu calendario</h2>
        <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--text2)', textTransform: 'capitalize' }}>
          {dateStr}
        </span>
      </div>

      {eventos.length === 0 ? (
        <p style={{ fontSize: '13px', color: 'var(--text2)', textAlign: 'center', padding: '10px 0' }}>
          Sin eventos programados para hoy
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {eventos.map(ev => {
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
                  color: 'var(--text2)', whiteSpace: 'nowrap', minWidth: '90px',
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

/* ── Fila de slider ── */
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
      <input
        type="range"
        min="1"
        max="10"
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ '--slider-pct': pct, '--slider-color': color }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
        <span style={{ fontSize: '10px', color: 'var(--text2)' }}>1</span>
        <span style={{ fontSize: '10px', color: 'var(--text2)' }}>10</span>
      </div>
    </div>
  )
}
