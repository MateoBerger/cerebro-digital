import React, { useEffect, useState } from 'react'
import {
  subscribeVariables, seedVariables, subscribeTareas, updateTarea,
  subscribeDailyGoalsConfig, subscribeDailyGoalsState, toggleDailyGoal,
  getCheckinsWeek,
} from '../firebase/db'

// ── Constantes editables ──────────────────────────────────────
const PAES_DATE = '2026-11-30' // lunes 30 nov 2026 — primer día PAES Regular Admisión 2027

const FRASES = [
  'La constancia vence al talento cuando el talento no es constante.',
  'El esfuerzo de hoy es el resultado de mañana.',
  'No hay atajos para ningún lugar que valga la pena ir.',
  'Cada día que estudias es un paso más cerca de tu meta.',
  'La disciplina es elegir entre lo que quieres ahora y lo que más quieres.',
  'El que persevera, alcanza.',
  'Pequeños progresos cada día suman grandes resultados.',
  'Tu futuro yo te lo va a agradecer.',
  'Los campeones siguen jugando hasta que lo hacen bien.',
  'El éxito es la suma de pequeños esfuerzos repetidos día tras día.',
  'Estudia con propósito, no solo con tiempo.',
  'La PAES no se rinde, y tú tampoco.',
  'Cada página que lees te acerca más al puntaje que querés.',
  'El dolor del esfuerzo es temporal; el arrepentimiento, permanente.',
  'Confía en el proceso, los resultados llegarán.',
]

// ── Helpers ───────────────────────────────────────────────────
function chileDate() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Santiago' }))
}

function chileToday() {
  const d = chileDate()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function daysUntilPAES() {
  const d = chileDate()
  const today = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const [y, m, dd] = PAES_DATE.split('-').map(Number)
  return Math.max(0, Math.ceil((new Date(y, m-1, dd) - today) / 86400000))
}

function isWeekend() {
  if (new URLSearchParams(window.location.search).get('testWeekend') === '1') return true
  const day = chileDate().getDay()
  return day === 0 || day === 6
}

function getWeekDates() {
  const d = chileDate()
  const diff = d.getDay() === 0 ? -6 : 1 - d.getDay()
  const mon = new Date(d); mon.setDate(d.getDate() + diff)
  return Array.from({ length: 7 }, (_, i) => {
    const dd = new Date(mon); dd.setDate(mon.getDate() + i)
    return `${dd.getFullYear()}-${String(dd.getMonth()+1).padStart(2,'0')}-${String(dd.getDate()).padStart(2,'0')}`
  })
}

function todayPhrase() {
  const d = chileDate()
  const doy = Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 86400000)
  return FRASES[doy % FRASES.length]
}

function getVar(vars, key, fallback = null) {
  const v = vars.find(v => v.key === key)
  if (!v) return fallback
  try { return JSON.parse(v.val) } catch { return v.val }
}

const MODO_COLOR = { relajado: 'var(--green)', estandar: 'var(--blue)', intensivo: 'var(--red)' }
const PRIO_COLOR = { alta: '#f07272', media: '#f0a740', baja: '#625e7c' }

const TODAY = chileToday()

// ── Componente principal ──────────────────────────────────────
export default function DashboardTab({ uid }) {
  const [vars,         setVars]        = useState([])
  const [tareas,       setTareas]      = useState([])
  const [goalItems,    setGoalItems]   = useState([])
  const [goalState,    setGoalState]   = useState({})
  const [loading,      setLoad]        = useState(true)
  const [weekCheckins, setWeekCheckins]= useState(null)

  const weekend = isWeekend()

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

  useEffect(() => {
    if (!uid || !weekend) return
    getCheckinsWeek(uid, getWeekDates()).then(setWeekCheckins)
  }, [uid, weekend])

  const modo     = getVar(vars, 'modo_organizacion', 'estandar')
  const racha    = getVar(vars, 'constancia_preu_racha', 0)
  const bloque   = getVar(vars, 'tiempo_bloque_estudio', 120)
  const descanso = getVar(vars, 'tiempo_descanso_largo', 25)
  const micro    = getVar(vars, 'tiempo_micro_pausa', 65)
  const metaBloq = getVar(vars, 'bloques_diarios_meta', 3)
  const metaPaes = getVar(vars, 'puntaje_meta_paes', 900)

  const tareasSemana      = tareas.filter(t => (t.alcance || 'general') === 'semanal')
  const tareasAltaPrio    = tareas.filter(t => t.prioridad === 'alta' && !t.completada)

  const hour     = new Date().getHours()
  const greeting = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches'
  const dateStr  = new Date().toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })

  if (loading) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text2)' }}>
        Cargando...
      </div>
    )
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '32px 36px' }}>
      {/* Saludo */}
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: 700, color: 'var(--text0)', letterSpacing: '-.5px', marginBottom: '4px' }}>
          {greeting}, Mateo
        </h1>
        <p style={{ color: 'var(--text1)', fontSize: '14px', textTransform: 'capitalize' }}>{dateStr}</p>
      </div>

      {/* Cuenta regresiva PAES — siempre visible */}
      <PaesCountdown days={daysUntilPAES()} />

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        <StatCard label="Modo"      value={String(modo)}     color={MODO_COLOR[modo] || 'var(--violet)'} />
        <StatCard label="Racha"     value={`${racha} días`}  color="var(--amber)" suffix="🔥" />
        <StatCard label="Meta PAES" value={String(metaPaes)} color="var(--blue)" />
      </div>

      {/* Frase del día */}
      <PhraseCard phrase={todayPhrase()} />

      {/* Resumen de semana — solo sábado y domingo (o ?testWeekend=1) */}
      {weekend && <WeekSummaryCard tareas={tareas} checkins={weekCheckins} />}

      {/* Cards principales */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
        <MetasDiariasCard items={goalItems} state={goalState} uid={uid} />
        <TareasAltaCard   tareas={tareasAltaPrio} uid={uid} />
        <MetasCard        tareas={tareasSemana}   uid={uid} />
        <PomodoroCard     bloque={bloque} descanso={descanso} micro={micro} meta={metaBloq} />
      </div>
    </div>
  )
}

// ── PaesCountdown ─────────────────────────────────────────────
function PaesCountdown({ days }) {
  const urgent = days <= 30
  const soon   = days <= 90
  const color  = urgent ? 'var(--red)' : soon ? 'var(--amber)' : 'var(--blue)'
  const glow   = urgent ? 'rgba(221,144,121,.12)' : soon ? 'rgba(224,189,107,.12)' : 'rgba(143,180,217,.12)'
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      background: `radial-gradient(ellipse at 10% 50%, ${glow} 0%, transparent 60%), linear-gradient(160deg, var(--bg3) 0%, var(--bg2) 100%)`,
      border: `1px solid var(--accent-border)`,
      borderRadius: 'var(--radius)', padding: '14px 22px', marginBottom: '20px',
      boxShadow: '0 10px 30px -12px rgba(0,0,0,.55), 0 0 0 1px var(--accent-border)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontSize: '22px' }}>🎯</span>
        <span style={{
          fontWeight: 700, fontSize: '30px', color,
          fontFamily: 'var(--font-display)', letterSpacing: '-.03em',
          textShadow: `0 0 28px ${color}`,
        }}>{days}</span>
        <span style={{ fontSize: '14px', color: 'var(--text1)' }}>
          {days === 1 ? 'día' : 'días'} para la PAES
        </span>
      </div>
      <span style={{ fontSize: '11px', color: 'var(--text2)', fontWeight: 500, fontFamily: "'IBM Plex Mono', monospace" }}>
        {PAES_DATE}
      </span>
    </div>
  )
}

// ── PhraseCard ────────────────────────────────────────────────
function PhraseCard({ phrase }) {
  return (
    <div className="card" style={{ marginBottom: '16px', borderLeft: '3px solid var(--accent)' }}>
      <div style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.7px', color: 'var(--text2)', marginBottom: '6px' }}>
        Frase del día
      </div>
      <p style={{ fontSize: '13.5px', color: 'var(--text1)', lineHeight: 1.55, fontStyle: 'italic' }}>
        "{phrase}"
      </p>
    </div>
  )
}

// ── WeekSummaryCard ───────────────────────────────────────────
const SLIDER_LABELS = {
  ganas_estudio:    'Estudio',
  energia:          'Energía',
  ganas_productivo: 'Productiv.',
  animo:            'Ánimo',
}
const WEEK_DAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

function ciColor(v) {
  if (v == null) return 'var(--text2)'
  if (v <= 3) return 'var(--red)'
  if (v <= 6) return 'var(--amber)'
  return 'var(--green)'
}

function WeekSummaryCard({ tareas, checkins }) {
  const completadas = tareas.filter(t => t.completada)
  const pendientes  = tareas.filter(t => !t.completada)
  const weekDates   = getWeekDates()

  return (
    <div className="card" style={{ marginBottom: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text0)', letterSpacing: '.1px' }}>
          📋 Resumen de la semana
        </h2>
        <span style={{ fontSize: '11px', color: 'var(--text2)' }}>
          {completadas.length} completadas · {pendientes.length} pendientes
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px' }}>
        {/* Check-ins */}
        <div>
          <div style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.7px', color: 'var(--text2)', marginBottom: '8px' }}>
            Check-ins diarios
          </div>
          {checkins === null ? (
            <p style={{ fontSize: '12px', color: 'var(--text2)' }}>Cargando...</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              {weekDates.map((date, i) => {
                const ci = checkins[date]
                return (
                  <div key={date} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                    <span style={{ color: 'var(--text2)', minWidth: '28px', fontWeight: 600 }}>{WEEK_DAY_NAMES[i]}</span>
                    {ci ? (
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {Object.entries(SLIDER_LABELS).map(([k, label]) =>
                          ci[k] != null && (
                            <span key={k} style={{ color: ciColor(ci[k]) }}>
                              {label} <strong style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{ci[k]}</strong>
                            </span>
                          )
                        )}
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text2)', opacity: .4 }}>sin check-in</span>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Completadas */}
        <div>
          <div style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.7px', color: 'var(--green)', marginBottom: '8px' }}>
            Completadas ({completadas.length})
          </div>
          {completadas.length === 0 ? (
            <p style={{ fontSize: '12px', color: 'var(--text2)', opacity: .7 }}>Ninguna aún</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {completadas.slice(0, 8).map(t => (
                <div key={t.id} style={{ fontSize: '12px', color: 'var(--text2)', display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <span style={{ color: 'var(--green)' }}>✓</span>
                  <span style={{ textDecoration: 'line-through', opacity: .7 }}>{t.titulo}</span>
                </div>
              ))}
              {completadas.length > 8 && <span style={{ fontSize: '11px', color: 'var(--text2)' }}>+{completadas.length - 8} más</span>}
            </div>
          )}
        </div>

        {/* Pendientes */}
        <div>
          <div style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.7px', color: 'var(--text2)', marginBottom: '8px' }}>
            Pendientes ({pendientes.length})
          </div>
          {pendientes.length === 0 ? (
            <p style={{ fontSize: '12px', color: 'var(--green)' }}>¡Todo completado! 🎉</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {pendientes.slice(0, 8).map(t => (
                <div key={t.id} style={{ fontSize: '12px', color: 'var(--text1)', display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <span style={{ color: PRIO_COLOR[t.prioridad] || 'var(--text2)', fontSize: '9px' }}>◆</span>
                  {t.titulo}
                </div>
              ))}
              {pendientes.length > 8 && <span style={{ fontSize: '11px', color: 'var(--text2)' }}>+{pendientes.length - 8} más</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── StatCard ──────────────────────────────────────────────────
function StatCard({ label, value, color, suffix }) {
  return (
    <div className="card" style={{ padding: '16px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <div style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.7px', color: 'var(--text2)' }}>
          {label}
        </div>
        <div style={{
          width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0,
          background: color, boxShadow: `0 0 8px ${color}`,
        }} />
      </div>
      <div style={{
        fontSize: '22px', fontWeight: 700, color,
        fontFamily: 'var(--font-display)', letterSpacing: '-.02em',
        display: 'flex', alignItems: 'center', gap: '6px',
      }}>
        {value}
        {suffix && <span style={{ fontSize: '16px' }}>{suffix}</span>}
      </div>
    </div>
  )
}

// ── CardHeader ────────────────────────────────────────────────
function CardHeader({ title }) {
  return (
    <div style={{ marginBottom: '14px' }}>
      <h2 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text0)', letterSpacing: '.1px' }}>{title}</h2>
    </div>
  )
}

// ── EmptyState ────────────────────────────────────────────────
function EmptyState({ text, hint }) {
  return (
    <div style={{ padding: '16px 0 4px', textAlign: 'center' }}>
      <p style={{ color: 'var(--text1)', fontSize: '13px' }}>{text}</p>
      {hint && <p style={{ color: 'var(--text2)', fontSize: '11px', marginTop: '4px' }}>{hint}</p>}
    </div>
  )
}

// Días en que hay preu: Dom=0, Lun=1, Mar=2, Jue=4
const PREU_DAYS = new Set([0, 1, 2, 4])

// ── MetasDiariasCard (hábitos marcables) ──────────────────────
function MetasDiariasCard({ items, state, uid }) {
  const dow = chileDate().getDay()

  // Filtrar preu los días que no hay clase; renombrar label
  const visibleItems = items
    .map(item => item.id === 'item_preu' ? { ...item, label: 'Asistí al preu' } : item)
    .filter(item => item.id !== 'item_preu' || PREU_DAYS.has(dow))

  const checked = visibleItems.filter(i => state[i.id]).length
  const allDone = visibleItems.length > 0 && checked === visibleItems.length

  async function handleToggle(item) {
    await toggleDailyGoal(uid, TODAY, item.id, !state[item.id])
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <h2 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text0)', letterSpacing: '.1px' }}>Hábitos de hoy</h2>
        {visibleItems.length > 0 && (
          <span style={{ fontSize: '11px', color: allDone ? 'var(--green)' : 'var(--text2)', fontWeight: allDone ? 600 : 400 }}>
            {checked}/{visibleItems.length}
          </span>
        )}
      </div>
      {visibleItems.length === 0 ? (
        <EmptyState text="Sin hábitos configurados" hint="Pedile al asistente que agregue uno" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {visibleItems.map(item => {
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

// ── TareasAltaCard (prioridad ALTA del día) ───────────────────
function TareasAltaCard({ tareas, uid }) {
  async function toggle(t) {
    await updateTarea(uid, t.id, { completada: !t.completada })
  }
  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <h2 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text0)', letterSpacing: '.1px' }}>
          Prioridad alta
        </h2>
        {tareas.length > 0 && (
          <span style={{ fontSize: '11px', color: '#f07272', fontWeight: 600 }}>
            {tareas.length} pendiente{tareas.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>
      {tareas.length === 0 ? (
        <EmptyState text="Sin tareas de alta prioridad" hint="¡Todo bajo control!" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {tareas.map(t => <TareaRow key={t.id} tarea={t} onToggle={() => toggle(t)} />)}
        </div>
      )}
    </div>
  )
}

// ── MetasCard (tareas semanales) ──────────────────────────────
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
          {pendientes.map(t => <TareaRow key={t.id} tarea={t} onToggle={() => toggle(t)} />)}
          {completadas.length > 0 && pendientes.length > 0 && (
            <div style={{ borderTop: '1px solid var(--border)', margin: '4px 0' }} />
          )}
          {completadas.map(t => <TareaRow key={t.id} tarea={t} onToggle={() => toggle(t)} />)}
        </div>
      )}
    </div>
  )
}

// ── TareaRow ──────────────────────────────────────────────────
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

// ── PomodoroCard ──────────────────────────────────────────────
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
