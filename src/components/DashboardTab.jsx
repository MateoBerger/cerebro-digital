import React, { useEffect, useRef, useState } from 'react'
import {
  subscribeVariables, seedVariables, subscribeTareas, updateTarea,
  subscribeDailyGoalsConfig, subscribeDailyGoalsState, toggleDailyGoal,
  getCheckinsWeek, subscribeGymStats, markGymSession,
  subscribeDayCompleteStreak, recordDayComplete,
} from '../firebase/db'
import SectionHeading from './SectionHeading'
import CountUp from './CountUp'
import EmptyState from './EmptyState'
import FocusMode from './FocusMode'
import { playCompleteSound, playCelebrationSound } from '../utils/sound'

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
export default function DashboardTab({ uid, user }) {
  const [vars,              setVars]             = useState([])
  const [tareas,            setTareas]           = useState([])
  const [goalItems,         setGoalItems]        = useState([])
  const [goalState,         setGoalState]        = useState({})
  const [loading,           setLoad]             = useState(true)
  const [weekCheckins,      setWeekCheckins]     = useState(null)
  const [gymStats,          setGymStats]         = useState({ streak: 0, lastGymDate: null, totalSessions: 0 })
  const [dayCompleteStreak, setDayCompleteStreak]= useState({ streak: 0, lastCompleteDate: null })
  const [showConfetti,      setShowConfetti]     = useState(false)
  const [celebrationStreak, setCelebrationStreak]= useState(0)
  const [showFocus,         setShowFocus]        = useState(false)

  const goalStateLoadedRef  = useRef(false)
  const prevPctRef          = useRef(null)
  const dayCompleteStreakRef = useRef({ streak: 0, lastCompleteDate: null })

  const weekend = isWeekend()

  // Progreso del día: hábitos diarios + tareas de alcance 'diaria' (excluye semanal/general)
  const dow           = chileDate().getDay()
  const visibleGoals  = goalItems
    .map(item => item.id === 'item_preu' ? { ...item, label: 'Asistí al preu' } : item)
    .filter(item => item.id !== 'item_preu' || PREU_DAYS.has(dow))
  const checkedGoals  = visibleGoals.filter(i => goalState[i.id]).length
  const tareasDiarias = tareas.filter(t => (t.alcance || 'general') === 'diaria')
  const tareasHechas  = tareasDiarias.filter(t => t.completada).length
  const dayTotal      = visibleGoals.length + tareasDiarias.length
  const dayDone       = checkedGoals + tareasHechas
  const dayPct        = dayTotal > 0 ? Math.round(dayDone / dayTotal * 100) : 0

  useEffect(() => { dayCompleteStreakRef.current = dayCompleteStreak }, [dayCompleteStreak])

  useEffect(() => {
    if (!uid) return
    seedVariables(uid)
    const unsubs = [
      subscribeVariables(uid, data => { setVars(data); setLoad(false) }),
      subscribeTareas(uid, setTareas),
      subscribeDailyGoalsConfig(uid, setGoalItems),
      subscribeDailyGoalsState(uid, TODAY, data => {
        setGoalState(data)
        goalStateLoadedRef.current = true
      }),
      subscribeGymStats(uid, setGymStats),
      subscribeDayCompleteStreak(uid, setDayCompleteStreak),
    ]
    return () => unsubs.forEach(u => u())
  }, [uid])

  useEffect(() => {
    if (!uid || !weekend) return
    getCheckinsWeek(uid, getWeekDates()).then(setWeekCheckins)
  }, [uid, weekend])

  // Detecta el cruce de <100% → 100%; nunca dispara en la carga inicial
  useEffect(() => {
    if (!goalStateLoadedRef.current || dayTotal === 0) return
    if (prevPctRef.current !== null && prevPctRef.current < 100 && dayPct === 100) {
      setShowConfetti(true)
      playCelebrationSound()
      recordDayComplete(uid, dayCompleteStreakRef.current).then(setCelebrationStreak)
    }
    prevPctRef.current = dayPct
  }, [dayPct]) // eslint-disable-line react-hooks/exhaustive-deps

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
      {showConfetti && (
        <DayCompleteConfetti
          displayName={user?.displayName?.split(' ')[0] || 'Mateo'}
          streak={celebrationStreak}
          onDone={() => setShowConfetti(false)}
        />
      )}

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
      <div className="stagger-children" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        <StatCard label="Modo"       value={String(modo)}                                            color={MODO_COLOR[modo] || 'var(--violet)'} />
        <StatCard label="Racha"      num={racha}                   unit=" días"  color="var(--amber)"  suffix="🔥" />
        <StatCard label="Gym"        num={gymStats.streak}         unit=" días"  color="var(--green)"  suffix="🏋️" />
        <StatCard label="Días 100%"  num={dayCompleteStreak.streak}              color="#e0bd6b"       suffix="✨" />
        <StatCard label="Meta PAES"  num={metaPaes}                              color="var(--blue)" />
      </div>

      {/* Frase del día */}
      <PhraseCard phrase={todayPhrase()} />

      {/* Resumen de semana — solo sábado y domingo (o ?testWeekend=1) */}
      {weekend && <WeekSummaryCard tareas={tareas} checkins={weekCheckins} />}

      {/* Cards principales */}
      <div className="stagger-children" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
        <MetasDiariasCard items={goalItems} state={goalState} uid={uid} gymStats={gymStats} />
        <TareasAltaCard   tareas={tareasAltaPrio} uid={uid} />
        <MetasCard        tareas={tareasSemana}   uid={uid} />
        <PomodoroCard     bloque={bloque} descanso={descanso} micro={micro} meta={metaBloq} onOpenFocus={() => setShowFocus(true)} />
      </div>

      {showFocus && (
        <FocusMode
          uid={uid}
          bloque={bloque} descanso={descanso} micro={micro} metaBloq={metaBloq}
          onClose={() => setShowFocus(false)}
        />
      )}
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
        }}><CountUp value={days} duration={900} /></span>
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
      <SectionHeading
        title="Resumen de la semana"
        icon={
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
          </svg>
        }
        right={<span>{completadas.length} completadas · {pendientes.length} pendientes</span>}
      />

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
function StatCard({ label, value, num, unit, color, suffix }) {
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
        {num != null ? <><CountUp value={num} />{unit}</> : value}
        {suffix && <span style={{ fontSize: '16px' }}>{suffix}</span>}
      </div>
    </div>
  )
}

// ── CardHeader ────────────────────────────────────────────────
function CardHeader({ title }) {
  return (
    <SectionHeading
      title={title}
      icon={
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="13" r="8" />
          <path d="M12 9v4l3 2M9 2h6" />
        </svg>
      }
    />
  )
}

// Días en que hay preu: Dom=0, Lun=1, Mar=2, Jue=4
const PREU_DAYS = new Set([0, 1, 2, 4])

// ── MetasDiariasCard (hábitos marcables) ──────────────────────
function MetasDiariasCard({ items, state, uid, gymStats }) {
  const dow = chileDate().getDay()

  // Filtrar preu los días que no hay clase; renombrar label
  const visibleItems = items
    .map(item => item.id === 'item_preu' ? { ...item, label: 'Asistí al preu' } : item)
    .filter(item => item.id !== 'item_preu' || PREU_DAYS.has(dow))

  const checked = visibleItems.filter(i => state[i.id]).length
  const allDone = visibleItems.length > 0 && checked === visibleItems.length

  async function handleToggle(item) {
    const newVal = !state[item.id]
    if (newVal) playCompleteSound()
    await toggleDailyGoal(uid, TODAY, item.id, newVal)
    if (item.id === 'item_gym' && newVal) {
      await markGymSession(uid, gymStats)
    }
  }

  return (
    <div className="card">
      <SectionHeading
        title="Hábitos de hoy"
        icon={
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
          </svg>
        }
        right={visibleItems.length > 0 && (
          <span style={{ color: allDone ? 'var(--green)' : 'var(--text2)', fontWeight: allDone ? 600 : 400 }}>
            {checked}/{visibleItems.length}
          </span>
        )}
      />
      {visibleItems.length === 0 ? (
        <EmptyState size="sm" text="Sin hábitos configurados" hint="Pedile al asistente que agregue uno" />
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
    if (!t.completada) playCompleteSound()
    await updateTarea(uid, t.id, { completada: !t.completada })
  }
  return (
    <div className="card">
      <SectionHeading
        title="Prioridad alta"
        icon={
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" y1="22" x2="4" y2="15" />
          </svg>
        }
        right={tareas.length > 0 && (
          <span style={{ color: '#f07272', fontWeight: 600 }}>
            {tareas.length} pendiente{tareas.length !== 1 ? 's' : ''}
          </span>
        )}
      />
      {tareas.length === 0 ? (
        <EmptyState size="sm" text="Sin tareas de alta prioridad" hint="¡Todo bajo control!" />
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
    if (!t.completada) playCompleteSound()
    await updateTarea(uid, t.id, { completada: !t.completada })
  }

  return (
    <div className="card">
      <SectionHeading
        title="Tareas de la semana"
        icon={
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
          </svg>
        }
        right={tareas.length > 0 && (
          <span>{completadas.length}/{tareas.length}</span>
        )}
      />
      {tareas.length === 0 ? (
        <EmptyState size="sm" text="Sin tareas semanales" hint="Agregalas en Tareas → Semanales" />
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
function PomodoroCard({ bloque, descanso, micro, meta, onOpenFocus }) {
  const [hov, setHov] = useState(false)
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
      <button
        onClick={onOpenFocus}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
          width: '100%', marginTop: '14px', padding: '9px 14px',
          borderRadius: 'var(--radius-sm)', border: `1px solid ${hov ? 'var(--accent)' : 'var(--accent-border)'}`,
          background: hov ? 'var(--accent)' : 'var(--accent-dim)',
          color: hov ? '#1a1608' : 'var(--accent)',
          fontSize: '12.5px', fontWeight: 600, fontFamily: 'Inter, sans-serif',
          cursor: 'pointer', transition: 'all .15s',
        }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
        </svg>
        Modo enfoque
      </button>
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

// ── Celebración al 100% ───────────────────────────────────────

const CONFETTI_COLORS = ['#e0bd6b', '#f0d089', '#bd9748', '#f4eee2', '#d9a441', '#ffe9b0']
const randBetween = (a, b) => a + Math.random() * (b - a)
const pickRand    = arr => arr[Math.floor(Math.random() * arr.length)]

const CONFETTI_CSS = `
@keyframes confetti-fall {
  from { transform: translateY(-15vh); }
  to   { transform: translateY(115vh); }
}
@keyframes confetti-cw  { from { transform: rotate(0deg);    } to { transform: rotate(360deg);  } }
@keyframes confetti-ccw { from { transform: rotate(0deg);    } to { transform: rotate(-360deg); } }
@keyframes logo-bounce  { 0% { transform: translateY(0px); } 100% { transform: translateY(-14px); } }
`

function generateConfetti(n) {
  return Array.from({ length: n }, (_, id) => ({
    id,
    x:        randBetween(0, 100),
    delay:    randBetween(0, 1.2),
    duration: randBetween(2.2, 3.8),
    color:    pickRand(CONFETTI_COLORS),
    shape:    pickRand(['circle', 'square', 'strip']),
    size:     randBetween(5, 11),
    spinDir:  pickRand(['cw', 'ccw']),
    spinDur:  randBetween(0.6, 1.8),
  }))
}

function ConfettiPiece({ x, delay, duration, color, shape, size, spinDir, spinDur }) {
  const w = shape === 'strip' ? size * 0.35 : size
  const h = shape === 'strip' ? size * 2.8  : size
  return (
    <div style={{
      position:  'absolute',
      left:      `${x}%`,
      top:       0,
      width:     `${w}px`,
      height:    `${h}px`,
      animation: `confetti-fall ${duration}s ${delay}s linear both`,
    }}>
      <div style={{
        width:        '100%',
        height:       '100%',
        background:   color,
        borderRadius: shape === 'circle' ? '50%' : '2px',
        opacity:      0.88,
        animation:    `confetti-${spinDir} ${spinDur}s ${delay}s linear infinite`,
      }} />
    </div>
  )
}

function DayCompleteConfetti({ displayName, streak, onDone }) {
  const [gone,    setGone]    = useState(false)
  const [visible, setVisible] = useState(true)
  const [pieces]              = useState(() => generateConfetti(90))

  useEffect(() => {
    const t1 = setTimeout(() => setVisible(false), 3500)
    const t2 = setTimeout(() => { setGone(true); onDone?.() }, 4600)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [onDone])

  if (gone) return null

  return (
    <div style={{
      position:   'fixed',
      inset:      0,
      zIndex:     9999,
      pointerEvents: 'none',
      overflow:   'hidden',
      opacity:    visible ? 1 : 0,
      transition: 'opacity 1.1s ease',
    }}>
      <style>{CONFETTI_CSS}</style>
      {pieces.map(p => <ConfettiPiece key={p.id} {...p} />)}
      <div style={{
        position:       'absolute',
        inset:          0,
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        justifyContent: 'center',
        gap:            '20px',
      }}>
        <img
          src="/cerebro-logo.png"
          alt=""
          style={{
            width:     64,
            height:    64,
            filter:    'drop-shadow(0 0 18px rgba(224,189,107,.55))',
            animation: 'logo-bounce 0.55s ease-in-out infinite alternate',
          }}
        />
        <div style={{
          background:   'linear-gradient(135deg, rgba(27,25,41,.96) 0%, rgba(13,12,20,.96) 100%)',
          border:       '1.5px solid #e0bd6b',
          borderRadius: '18px',
          padding:      '28px 40px',
          textAlign:    'center',
          boxShadow:    '0 0 52px rgba(224,189,107,.22), 0 0 120px rgba(224,189,107,.07), 0 24px 60px rgba(0,0,0,.7)',
          maxWidth:     '360px',
        }}>
          <div style={{
            fontFamily:   'var(--font-display)',
            fontSize:     '21px',
            fontWeight:   700,
            color:        'var(--text0)',
            marginBottom: '10px',
            lineHeight:   1.35,
          }}>
            ¡Día completado, <em style={{ color: '#e0bd6b', fontStyle: 'italic' }}>{displayName}</em>!
          </div>
          <div style={{ fontSize: '14px', color: 'var(--text1)', lineHeight: 1.55 }}>
            Completaste todo lo de hoy. Sigue así. 🔥
          </div>
          {streak > 1 && (
            <div style={{
              marginTop:    '14px',
              fontSize:     '13px',
              color:        '#e0bd6b',
              fontWeight:   600,
              letterSpacing: '.01em',
            }}>
              Llevas {streak} días completos seguidos ✨
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
