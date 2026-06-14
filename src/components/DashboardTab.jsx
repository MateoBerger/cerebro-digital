import React, { useEffect, useState } from 'react'
import {
  subscribeVariables, seedVariables, subscribeTareas, updateTarea,
  subscribeDailyGoalsConfig, subscribeDailyGoalsState, toggleDailyGoal,
} from '../firebase/db'

function chileToday() {
  const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Santiago' }))
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

const TODAY = chileToday()

function getVar(vars, key, fallback = null) {
  const v = vars.find(v => v.key === key)
  if (!v) return fallback
  try { return JSON.parse(v.val) } catch { return v.val }
}

const MODO_COLOR = {
  relajado:  'var(--green)',
  estandar:  'var(--blue)',
  intensivo: 'var(--red)',
}

export default function DashboardTab({ uid }) {
  const [vars,      setVars]      = useState([])
  const [tareas,    setTareas]    = useState([])
  const [goalItems, setGoalItems] = useState([])
  const [goalState, setGoalState] = useState({})
  const [loading,   setLoad]      = useState(true)

  useEffect(() => {
    if (!uid) return
    seedVariables(uid)
    const unsubs = [
      subscribeVariables(uid, data => { setVars(data); setLoad(false) }),
      subscribeTareas(uid, setTareas),
      subscribeDailyGoalsConfig(uid, setGoalItems),
      subscribeDailyGoalsState(uid, TODAY, setGoalState),
    ]
    return () => unsubs.forEach(u => u())
  }, [uid])

  const modo      = getVar(vars, 'modo_organizacion', 'estandar')
  const racha     = getVar(vars, 'constancia_preu_racha', 0)
  const horario   = getVar(vars, 'horario_base', {})
  const bloque    = getVar(vars, 'tiempo_bloque_estudio', 120)
  const descanso  = getVar(vars, 'tiempo_descanso_largo', 25)
  const micro     = getVar(vars, 'tiempo_micro_pausa', 65)
  const metaBloq  = getVar(vars, 'bloques_diarios_meta', 3)
  const metaPaes  = getVar(vars, 'puntaje_meta_paes', 900)

  const tareasSemana = tareas.filter(t => (t.alcance || 'general') === 'semanal')

  const now      = new Date()
  const hour     = now.getHours()
  const greeting = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches'
  const dateStr  = now.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })

  if (loading) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text2)' }}>
        Cargando...
      </div>
    )
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '32px 36px' }}>
      {/* Greeting */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: 700, color: 'var(--text0)', letterSpacing: '-.5px', marginBottom: '4px' }}>
          {greeting}, Mateo
        </h1>
        <p style={{ color: 'var(--text1)', fontSize: '14px', textTransform: 'capitalize' }}>{dateStr}</p>
      </div>

      {/* Stats row — 3 cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px', marginBottom: '28px' }}>
        <StatCard label="Modo"      value={String(modo)}     color={MODO_COLOR[modo] || 'var(--violet)'} />
        <StatCard label="Racha"     value={`${racha} días`}  color="var(--amber)" suffix="🔥" />
        <StatCard label="Meta PAES" value={String(metaPaes)} color="var(--blue)"  />
      </div>

      {/* Main cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
        <MetasDiariasCard items={goalItems} state={goalState} uid={uid} />
        <HorarioCard      horario={horario} />
        <MetasCard        tareas={tareasSemana} uid={uid} />
        <PomodoroCard     bloque={bloque} descanso={descanso} micro={micro} meta={metaBloq} />
      </div>
    </div>
  )
}

function MetasDiariasCard({ items, state, uid }) {
  const checked = items.filter(i => state[i.id]).length
  const allDone = items.length > 0 && checked === items.length

  async function handleToggle(item) {
    await toggleDailyGoal(uid, TODAY, item.id, !state[item.id])
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <h2 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text0)', letterSpacing: '.1px' }}>Metas diarias</h2>
        {items.length > 0 && (
          <span style={{ fontSize: '11px', color: allDone ? 'var(--green)' : 'var(--text2)', fontWeight: allDone ? 600 : 400 }}>
            {checked}/{items.length}
          </span>
        )}
      </div>
      {items.length === 0 ? (
        <EmptyState text="Sin metas diarias" hint="Pedile al asistente que agregue una" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {items.map(item => {
            const done = !!state[item.id]
            return (
              <div key={item.id} style={{ display: 'flex', gap: '9px', alignItems: 'center' }}>
                <button
                  onClick={() => handleToggle(item)}
                  style={{
                    width: '17px', height: '17px', borderRadius: '4px', flexShrink: 0,
                    border: `2px solid ${done ? 'var(--green)' : 'var(--border-hi, #444)'}`,
                    background: done ? 'rgba(62,201,126,.14)' : 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', transition: 'all .15s',
                  }}
                >
                  {done && (
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  )}
                </button>
                <span style={{
                  fontSize: '13px', color: done ? 'var(--text2)' : 'var(--text0)',
                  textDecoration: done ? 'line-through' : 'none',
                  opacity: done ? .6 : 1, lineHeight: 1.4, transition: 'all .2s',
                }}>
                  {item.label}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, color, suffix }) {
  return (
    <div className="card" style={{ padding: '16px 18px' }}>
      <div style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.7px', color: 'var(--text2)', marginBottom: '8px' }}>
        {label}
      </div>
      <div style={{ fontSize: '20px', fontWeight: 700, color, display: 'flex', alignItems: 'center', gap: '6px' }}>
        {value}
        {suffix && <span style={{ fontSize: '16px' }}>{suffix}</span>}
      </div>
    </div>
  )
}

function CardHeader({ title }) {
  return (
    <div style={{ marginBottom: '14px' }}>
      <h2 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text0)', letterSpacing: '.1px' }}>{title}</h2>
    </div>
  )
}

function EmptyState({ text, hint }) {
  return (
    <div style={{ padding: '16px 0 4px', textAlign: 'center' }}>
      <p style={{ color: 'var(--text1)', fontSize: '13px' }}>{text}</p>
      {hint && <p style={{ color: 'var(--text2)', fontSize: '11px', marginTop: '4px' }}>{hint}</p>}
    </div>
  )
}

function HorarioCard({ horario }) {
  const entries = Object.entries(horario || {})
  return (
    <div className="card">
      <CardHeader title="Horario base" />
      {entries.length === 0
        ? <EmptyState text="Sin horario configurado" hint="Edítalo en Diccionario → horario_base" />
        : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {entries.map(([hora, act]) => (
              <div key={hora} style={{ display: 'flex', gap: '12px', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: 'var(--accent)', minWidth: '46px', fontWeight: 500 }}>{hora}</span>
                <span style={{ fontSize: '13px', color: 'var(--text0)' }}>{String(act)}</span>
              </div>
            ))}
          </div>
        )
      }
    </div>
  )
}

const PRIO_COLOR = { alta: '#f07272', media: '#f0a740', baja: '#625e7c' }

function MetasCard({ tareas, uid }) {
  const pendientes  = tareas.filter(t => !t.completada)
  const completadas = tareas.filter(t => t.completada)

  async function toggle(t) {
    await updateTarea(uid, t.id, { completada: !t.completada })
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <h2 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text0)', letterSpacing: '.1px' }}>Tareas de la semana</h2>
        {tareas.length > 0 && (
          <span style={{ fontSize: '11px', color: 'var(--text2)' }}>
            {completadas.length}/{tareas.length}
          </span>
        )}
      </div>

      {tareas.length === 0 ? (
        <EmptyState text="Sin tareas semanales" hint="Agregalas en Tareas → Semanales" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {pendientes.map(t => (
            <TareaRow key={t.id} tarea={t} onToggle={() => toggle(t)} />
          ))}
          {completadas.length > 0 && pendientes.length > 0 && (
            <div style={{ borderTop: '1px solid var(--border)', margin: '4px 0' }} />
          )}
          {completadas.map(t => (
            <TareaRow key={t.id} tarea={t} onToggle={() => toggle(t)} />
          ))}
        </div>
      )}
    </div>
  )
}

function TareaRow({ tarea, onToggle }) {
  const done  = tarea.completada
  const color = PRIO_COLOR[tarea.prioridad] || PRIO_COLOR.media
  return (
    <div style={{ display: 'flex', gap: '9px', alignItems: 'center' }}>
      <button
        onClick={onToggle}
        style={{
          width: '17px', height: '17px', borderRadius: '4px', flexShrink: 0,
          border: `2px solid ${done ? 'var(--green)' : color}`,
          background: done ? 'rgba(62,201,126,.14)' : 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', transition: 'all .15s',
        }}
      >
        {done && (
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        )}
      </button>
      <span style={{
        fontSize: '13px', color: done ? 'var(--text2)' : 'var(--text0)',
        textDecoration: done ? 'line-through' : 'none', lineHeight: 1.4,
        opacity: done ? .6 : 1,
      }}>
        {tarea.titulo}
      </span>
    </div>
  )
}

function PomodoroCard({ bloque, descanso, micro, meta }) {
  return (
    <div className="card">
      <CardHeader title="Configuración Pomodoro" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <PomRow label="Bloque de estudio" value={`${bloque} min`}  color="var(--blue)"   />
        <PomRow label="Descanso largo"    value={`${descanso} min`} color="var(--green)"  />
        <PomRow label="Micro-pausa"       value={`${micro} min`}   color="var(--amber)"  />
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '10px', marginTop: '2px' }}>
          <PomRow label="Meta diaria"     value={`${meta} bloques`} color="var(--accent)" />
        </div>
      </div>
    </div>
  )
}

function PomRow({ label, value, color }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: '12px', color: 'var(--text1)' }}>{label}</span>
      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '13px', fontWeight: 600, color }}>{value}</span>
    </div>
  )
}
