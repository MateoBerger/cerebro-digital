import React, { useState, useEffect, useRef } from 'react'
import {
  subscribePaesStats,   updatePaesStats,
  subscribePaesVocab,   updatePaesVocab,
  subscribePaesProfile,
  subscribePaesHistory, addPaesHistory,
  subscribePaesErrors,  updatePaesError, deletePaesError,
} from '../firebase/db'
import { VOCAB_BANK, GUIDES_DATA, EXERCISE_BANK, LENGUAJE_TEXTS, MATH_TIPS, DATOS_CURIOSOS } from '../data/paesData'
import { usePaesChat } from '../hooks/usePaesChat'
import ChatUI from './ChatUI'

// ── PAES 2026 countdown target ────────────────────────────────────────────────
const PAES_DATE = new Date('2026-11-21T08:00:00')

function getDaysLeft() {
  const diff = PAES_DATE - new Date()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

function getLocalDate() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

// ── Sub-tab list ──────────────────────────────────────────────────────────────
const TABS = [
  { id: 'inicio',     label: 'Inicio' },
  { id: 'guias',      label: 'Guías' },
  { id: 'practica',   label: 'Práctica' },
  { id: 'vocabulario',label: 'Vocabulario' },
  { id: 'ensayos',    label: 'Ensayos' },
  { id: 'progreso',   label: 'Progreso' },
  { id: 'asistente',  label: 'Asistente IA' },
]

// ── Shuffle array helper ──────────────────────────────────────────────────────
function shuffleArr(arr) {
  return [...arr].sort(() => Math.random() - 0.5)
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION: Inicio
// ─────────────────────────────────────────────────────────────────────────────
function InicioSection({ stats, profile, history }) {
  const days  = getDaysLeft()
  const tip   = MATH_TIPS[new Date().getDate() % MATH_TIPS.length]
  const dato  = DATOS_CURIOSOS[new Date().getDate() % DATOS_CURIOSOS.length]

  const totalAnswered  = stats?.totalAnswers || 0
  const totalCorrect   = stats?.correctAnswers || 0
  const pct            = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {[
          { label: 'Días para la PAES', value: days, color: days < 90 ? 'var(--red)' : 'var(--accent)', unit: 'días' },
          { label: 'Racha actual', value: stats?.streak || 0, color: 'var(--amber)', unit: 'días' },
          { label: 'Precisión global', value: `${pct}%`, color: pct >= 70 ? 'var(--green)' : pct >= 50 ? 'var(--amber)' : 'var(--red)' },
          { label: 'Ensayos registrados', value: stats?.essaysCount || 0, color: 'var(--blue)' },
        ].map((s, i) => (
          <div key={i} className="card" style={{ textAlign: 'center', padding: '16px 12px' }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: s.color, lineHeight: 1.1, fontFamily: 'IBM Plex Mono, monospace' }}>{s.value}</div>
            <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Perfil row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="card">
          <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.8px' }}>Puntajes estimados</div>
          {[
            { label: 'CL', color: '#5b9cf6', val: profile?.puntajeEstimado?.cl },
            { label: 'M1', color: '#c084fc', val: profile?.puntajeEstimado?.m1 },
            { label: 'M2', color: '#f0a740', val: profile?.puntajeEstimado?.m2 },
            { label: 'Ciencias', color: '#3ec97e', val: profile?.puntajeEstimado?.ciencias },
          ].map(m => (
            <div key={m.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 11, color: m.color, fontWeight: 600, minWidth: 52 }}>{m.label}</span>
              <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--bg3)' }}>
                <div style={{
                  height: '100%', borderRadius: 3, background: m.color, transition: 'width .4s ease',
                  width: m.val ? `${Math.round(((m.val - 150) / 850) * 100)}%` : '0%',
                }} />
              </div>
              <span style={{ fontSize: 12, color: m.val ? 'var(--text0)' : 'var(--text2)', fontFamily: 'IBM Plex Mono, monospace', minWidth: 36, textAlign: 'right' }}>
                {m.val || '—'}
              </span>
            </div>
          ))}
          {!profile && <div style={{ color: 'var(--text2)', fontSize: 12 }}>Usa el Asistente IA para calibrar tu nivel.</div>}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card" style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.8px' }}>Tip del día</div>
            <div style={{ fontSize: 12, color: 'var(--text1)', lineHeight: 1.5 }}>{tip?.tip}</div>
            <div style={{ fontSize: 10, color: 'var(--text2)', marginTop: 4 }}>{tip?.area}</div>
          </div>
          <div className="card" style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.8px' }}>¿Sabías que?</div>
            <div style={{ fontSize: 12, color: 'var(--text1)', lineHeight: 1.5 }}>{dato?.fact}</div>
            <div style={{ fontSize: 10, color: 'var(--text2)', marginTop: 4 }}>{dato?.source}</div>
          </div>
        </div>
      </div>

      {/* Actividad reciente */}
      {history.length > 0 && (
        <div className="card">
          <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.8px' }}>Actividad reciente</div>
          {history.slice(0, 4).map(h => {
            const hPct = h.total > 0 ? Math.round(((h.correctas ?? h.correct ?? 0) / h.total) * 100) : 0
            return (
              <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--accent)', background: 'var(--accent-dim)', borderRadius: 4, padding: '2px 6px', minWidth: 36, textAlign: 'center' }}>
                  {(h.materia ?? h.subject ?? '?').toUpperCase()}
                </span>
                <span style={{ flex: 1, fontSize: 12, color: 'var(--text1)' }}>{h.tipo} — {h.correctas ?? h.correct ?? '?'}/{h.total ?? '?'}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: hPct >= 70 ? 'var(--green)' : hPct >= 50 ? 'var(--amber)' : 'var(--red)' }}>{hPct}%</span>
                <span style={{ fontSize: 10, color: 'var(--text2)' }}>{h.date}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION: Guías
// ─────────────────────────────────────────────────────────────────────────────
const SUBJECT_LABELS = { cl: 'Lenguaje', m1: 'Matemática M1', m2: 'Matemática M2', ciencias: 'Ciencias' }

function GuiasSection() {
  const [selected, setSelected] = useState(null)

  if (selected) {
    const guide = GUIDES_DATA.find(g => g.id === selected)
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <button onClick={() => setSelected(null)} style={{ alignSelf: 'flex-start', background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text1)', borderRadius: 6, padding: '5px 12px', fontSize: 12, cursor: 'pointer' }}>
          ← Volver a guías
        </button>
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: guide.color, flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text0)' }}>{guide.label}</div>
              <div style={{ fontSize: 11, color: 'var(--text2)' }}>{SUBJECT_LABELS[guide.subject]}</div>
            </div>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text1)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
            {guide.theory}
          </div>
          {guide.tips && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.8px' }}>Tips PAES</div>
              {guide.tips.map((tip, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                  <span style={{ color: guide.color, flexShrink: 0, fontWeight: 700 }}>→</span>
                  <span style={{ fontSize: 12, color: 'var(--text1)', lineHeight: 1.5 }}>{tip}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  const bySubject = { cl: [], m1: [], m2: [], ciencias: [] }
  GUIDES_DATA.forEach(g => { if (bySubject[g.subject]) bySubject[g.subject].push(g) })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {Object.entries(bySubject).filter(([, gs]) => gs.length > 0).map(([subj, guides]) => (
        <div key={subj}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.9px' }}>{SUBJECT_LABELS[subj]}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
            {guides.map(guide => (
              <button key={guide.id} onClick={() => setSelected(guide.id)} style={{
                textAlign: 'left', background: 'var(--bg2)', border: `1px solid ${guide.color}44`,
                borderRadius: 9, padding: '14px 16px', cursor: 'pointer', transition: 'border-color .15s, transform .12s',
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = guide.color; e.currentTarget.style.transform = 'translateY(-2px)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = `${guide.color}44`; e.currentTarget.style.transform = '' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: guide.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text0)' }}>{guide.label}</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text2)' }}>
                  {(EXERCISE_BANK[guide.id]?.length || 0)} ejercicios disponibles
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION: Práctica
// ─────────────────────────────────────────────────────────────────────────────
const PRACTICE_TOPICS = {
  cl:       { label: 'Lenguaje', color: '#5b9cf6', topics: ['leng-localizar', 'leng-relacionar', 'leng-caracterizar'] },
  m1:       { label: 'Matemática M1', color: '#c084fc', topics: ['mat-numeros', 'mat-algebra', 'mat-geometria', 'mat-probabilidad'] },
  ciencias: { label: 'Ciencias', color: '#3ec97e', topics: ['cien-ondas', 'cien-celula'] },
}

function PracticaSection({ uid, stats }) {
  const [subject,  setSubject]  = useState('m1')
  const [topicId,  setTopicId]  = useState('mat-algebra')
  const [session,  setSession]  = useState(null)   // {exercises, answers, submitted}
  const [saving,   setSaving]   = useState(false)

  useEffect(() => {
    const first = PRACTICE_TOPICS[subject]?.topics?.[0]
    if (first) setTopicId(first)
    setSession(null)
  }, [subject])

  function startSession() {
    const bank  = EXERCISE_BANK[topicId] || []
    const seen  = stats?.seenExIds || []
    let pool    = bank.filter(ex => !seen.includes(ex.id))
    if (pool.length < 5) pool = bank
    const exs   = shuffleArr(pool).slice(0, 5)
    setSession({ exercises: exs, answers: {}, submitted: false })
  }

  async function submitSession() {
    if (!session) return
    setSaving(true)
    const { exercises, answers } = session
    let correct = 0
    exercises.forEach(ex => { if (answers[ex.id] === ex.correct) correct++ })

    const newSeen = [...(stats?.seenExIds || []), ...exercises.map(e => e.id)]
    await updatePaesStats(uid, {
      totalAnswers:   (stats?.totalAnswers || 0)   + exercises.length,
      correctAnswers: (stats?.correctAnswers || 0) + correct,
      seenExIds:      newSeen.slice(-200),
    })
    await addPaesHistory(uid, {
      tipo:    'practica',
      materia: subject,
      subject,
      correctas: correct,
      correct,
      total:   exercises.length,
      pct:     Math.round((correct / exercises.length) * 100),
      label:   topicId,
      date:    getLocalDate(),
    })

    setSession(s => ({ ...s, submitted: true }))
    setSaving(false)
  }

  function selectAnswer(exId, idx) {
    if (session?.submitted) return
    setSession(s => ({ ...s, answers: { ...s.answers, [exId]: idx } }))
  }

  const topicInfo = PRACTICE_TOPICS[subject]
  const guide     = GUIDES_DATA.find(g => g.id === topicId)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Config row */}
      {!session && (
        <div className="card">
          <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.8px' }}>Configurar práctica</div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
            {Object.entries(PRACTICE_TOPICS).map(([key, val]) => (
              <button key={key} onClick={() => setSubject(key)} style={{
                padding: '6px 14px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
                background: subject === key ? val.color : 'var(--bg3)',
                color: subject === key ? '#fff' : 'var(--text1)',
                border: `1px solid ${subject === key ? val.color : 'var(--border)'}`,
              }}>{val.label}</button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
            {(topicInfo?.topics || []).map(t => {
              const g = GUIDES_DATA.find(x => x.id === t)
              return (
                <button key={t} onClick={() => setTopicId(t)} style={{
                  padding: '5px 12px', borderRadius: 6, fontSize: 11, cursor: 'pointer',
                  background: topicId === t ? 'var(--accent-dim)' : 'var(--bg3)',
                  color: topicId === t ? 'var(--accent)' : 'var(--text1)',
                  border: `1px solid ${topicId === t ? 'var(--accent-border)' : 'var(--border)'}`,
                }}>{g?.label || t}</button>
              )
            })}
          </div>
          <button onClick={startSession} style={{
            padding: '8px 20px', borderRadius: 7, background: 'var(--accent)', color: '#fff',
            border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
          }}>
            Comenzar práctica (5 ejercicios)
          </button>
        </div>
      )}

      {/* Session */}
      {session && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {session.exercises.map((ex, idx) => {
            const chosen    = session.answers[ex.id]
            const submitted = session.submitted
            return (
              <div key={ex.id} className="card" style={{
                border: submitted
                  ? chosen === ex.correct ? '1px solid var(--green)' : chosen !== undefined ? '1px solid var(--red)' : '1px solid var(--border)'
                  : '1px solid var(--border)',
              }}>
                <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 6 }}>Ejercicio {idx + 1}</div>
                <div style={{ fontSize: 13, color: 'var(--text0)', lineHeight: 1.5, marginBottom: 12 }}>{ex.stem}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {ex.options.map((opt, i) => {
                    let bg    = 'var(--bg3)'
                    let color = 'var(--text1)'
                    let border = '1px solid var(--border)'
                    if (chosen === i && !submitted) { bg = 'var(--accent-dim)'; color = 'var(--accent)'; border = '1px solid var(--accent-border)' }
                    if (submitted) {
                      if (i === ex.correct) { bg = 'rgba(62,201,126,.12)'; color = 'var(--green)'; border = '1px solid var(--green)' }
                      else if (chosen === i) { bg = 'rgba(240,114,114,.12)'; color = 'var(--red)'; border = '1px solid var(--red)' }
                    }
                    return (
                      <button key={i} onClick={() => selectAnswer(ex.id, i)} style={{
                        textAlign: 'left', padding: '7px 12px', borderRadius: 6, cursor: submitted ? 'default' : 'pointer',
                        background: bg, color, border, fontSize: 12, transition: 'all .1s',
                      }}>
                        {opt}
                      </button>
                    )
                  })}
                </div>
                {submitted && (
                  <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text1)', background: 'var(--bg3)', borderRadius: 6, padding: '8px 12px', lineHeight: 1.5 }}>
                    {ex.explanation}
                  </div>
                )}
              </div>
            )
          })}

          {!session.submitted && (
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setSession(null)} style={{ padding: '8px 14px', borderRadius: 7, background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text1)', cursor: 'pointer', fontSize: 12 }}>
                Cancelar
              </button>
              <button
                onClick={submitSession}
                disabled={saving || Object.keys(session.answers).length < session.exercises.length}
                style={{
                  padding: '8px 20px', borderRadius: 7, background: 'var(--accent)', color: '#fff',
                  border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, opacity: saving ? 0.7 : 1,
                }}
              >
                {saving ? 'Guardando…' : 'Corregir y guardar'}
              </button>
            </div>
          )}

          {session.submitted && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text0)' }}>
                Resultado: {Object.keys(session.answers).filter(id => {
                  const ex = session.exercises.find(e => e.id === id)
                  return ex && session.answers[id] === ex.correct
                }).length} / {session.exercises.length} correctas
              </div>
              <button onClick={() => setSession(null)} style={{ padding: '7px 16px', borderRadius: 7, background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                Nueva práctica
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION: Vocabulario
// ─────────────────────────────────────────────────────────────────────────────
function VocabSection({ uid, vocabState }) {
  const [revealed, setRevealed] = useState(false)
  const [learned,  setLearned]  = useState(false)

  const today   = getLocalDate()
  const pos     = vocabState?.currentPos || 0
  const word    = VOCAB_BANK[pos % VOCAB_BANK.length]
  const learnedList = vocabState?.learnedWords || []
  const alreadyDone = vocabState?.lastVocabDate === today

  async function markLearned() {
    const newPos = (pos + 1) % VOCAB_BANK.length
    await updatePaesVocab(uid, {
      currentPos:    newPos,
      learnedWords:  [...learnedList, word.id],
      lastVocabDate: today,
      learnedToday:  true,
    })
    setLearned(true)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 520 }}>
      <div style={{ display: 'flex', gap: 12 }}>
        <div className="card" style={{ textAlign: 'center', padding: '14px', flex: 1 }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--accent)', fontFamily: 'IBM Plex Mono, monospace' }}>{learnedList.length}</div>
          <div style={{ fontSize: 11, color: 'var(--text2)' }}>Palabras aprendidas</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '14px', flex: 1 }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--amber)', fontFamily: 'IBM Plex Mono, monospace' }}>{VOCAB_BANK.length - learnedList.length}</div>
          <div style={{ fontSize: 11, color: 'var(--text2)' }}>Por aprender</div>
        </div>
      </div>

      <div className="card">
        <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.8px' }}>Palabra del día</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text0)', marginBottom: 4 }}>{word.term}</div>
        <span style={{ fontSize: 10, background: 'var(--accent-dim)', color: 'var(--accent)', borderRadius: 4, padding: '2px 7px', display: 'inline-block', marginBottom: 12 }}>{word.type}</span>

        {!revealed ? (
          <button onClick={() => setRevealed(true)} style={{
            display: 'block', width: '100%', padding: '10px', borderRadius: 7, background: 'var(--bg3)',
            border: '1px dashed var(--border-hi)', color: 'var(--text2)', cursor: 'pointer', fontSize: 13,
          }}>
            Ver definición →
          </button>
        ) : (
          <div style={{ animation: 'fadeIn .2s ease' }}>
            <div style={{ fontSize: 13, color: 'var(--text1)', lineHeight: 1.6, marginBottom: 12 }}>{word.def}</div>
            <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 6, fontWeight: 600 }}>Ejemplos</div>
            {word.examples.map((ex, i) => (
              <div key={i} style={{ fontSize: 12, color: 'var(--text1)', fontStyle: 'italic', marginBottom: 4, paddingLeft: 10, borderLeft: '2px solid var(--border-hi)' }}>"{ex}"</div>
            ))}
            {!alreadyDone && !learned && (
              <button onClick={markLearned} style={{
                marginTop: 14, padding: '8px 20px', borderRadius: 7, background: 'var(--green)',
                color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
              }}>
                ✓ La aprendí — siguiente
              </button>
            )}
            {(alreadyDone || learned) && (
              <div style={{ marginTop: 10, fontSize: 12, color: 'var(--green)' }}>✓ Ya completaste la palabra de hoy. Volvé mañana.</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION: Ensayos
// ─────────────────────────────────────────────────────────────────────────────
function EnsayosSection({ uid, stats }) {
  const [mode,     setMode]     = useState(null)  // 'mini' | 'full'
  const [session,  setSession]  = useState(null)
  const [time,     setTime]     = useState(0)
  const [saving,   setSaving]   = useState(false)
  const timerRef = useRef(null)

  function startEnsayo(type) {
    const texts    = LENGUAJE_TEXTS
    const shuffled = shuffleArr(texts)
    const questions = shuffled.flatMap(t => t.questions.map(q => ({ ...q, textTitle: t.title, textBody: t.text })))
    const selected  = type === 'mini' ? questions.slice(0, 5) : questions
    const secs      = type === 'mini' ? 15 * 60 : 32 * 60

    setSession({ type, questions: selected, answers: {}, currentQ: 0, submitted: false })
    setMode(type)
    setTime(secs)
    timerRef.current = setInterval(() => setTime(t => {
      if (t <= 1) { clearInterval(timerRef.current); return 0 }
      return t - 1
    }), 1000)
  }

  function stopTimer() { clearInterval(timerRef.current) }

  useEffect(() => () => stopTimer(), [])

  async function submitEnsayo() {
    if (!session) return
    setSaving(true)
    stopTimer()
    const { questions, answers } = session
    let correct = 0
    questions.forEach(q => { if (answers[q.id] === q.correct) correct++ })
    const pct = Math.round((correct / questions.length) * 100)

    await updatePaesStats(uid, {
      essaysCount:    (stats?.essaysCount || 0) + 1,
      totalAnswers:   (stats?.totalAnswers || 0)   + questions.length,
      correctAnswers: (stats?.correctAnswers || 0) + correct,
      lastEssayDate:  getLocalDate(),
    })
    await addPaesHistory(uid, {
      tipo:    session.type,
      materia: 'cl',
      subject: 'cl',
      correctas: correct,
      correct,
      total:   questions.length,
      pct,
      label:   `Ensayo CL ${session.type}`,
      date:    getLocalDate(),
    })

    setSession(s => ({ ...s, submitted: true, resultCorrect: correct }))
    setSaving(false)
  }

  const minStr = m => `${String(Math.floor(m / 60)).padStart(2,'0')}:${String(m % 60).padStart(2,'0')}`

  if (!session) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ color: 'var(--text1)', fontSize: 13, marginBottom: 4 }}>
          Practica con textos al estilo PAES. Las preguntas se toman de los textos de comprensión lectora cargados en el sistema.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[
            { type: 'mini', label: 'Mini-Ensayo', qs: '5 preguntas', time: '15 min', color: '#5b9cf6' },
            { type: 'full', label: 'Ensayo Completo', qs: '10 preguntas', time: '32 min', color: '#c084fc' },
          ].map(m => (
            <button key={m.type} onClick={() => startEnsayo(m.type)} style={{
              textAlign: 'left', padding: '20px', borderRadius: 9, cursor: 'pointer',
              background: 'var(--bg2)', border: `1px solid ${m.color}44`,
              transition: 'border-color .15s, transform .12s',
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = m.color; e.currentTarget.style.transform = 'translateY(-2px)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = `${m.color}44`; e.currentTarget.style.transform = '' }}
            >
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text0)', marginBottom: 4 }}>{m.label}</div>
              <div style={{ fontSize: 12, color: 'var(--text2)' }}>{m.qs} · {m.time}</div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  const q = session.questions[session.currentQ]

  if (session.submitted) {
    return (
      <div className="card" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 36, fontWeight: 800, color: 'var(--accent)', marginBottom: 8, fontFamily: 'IBM Plex Mono, monospace' }}>
          {session.resultCorrect}/{session.questions.length}
        </div>
        <div style={{ fontSize: 14, color: 'var(--text1)', marginBottom: 16 }}>
          {Math.round((session.resultCorrect / session.questions.length) * 100)}% de respuestas correctas
        </div>
        <button onClick={() => { setSession(null); setMode(null) }} style={{
          padding: '8px 20px', borderRadius: 7, background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
        }}>
          Volver
        </button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 12, color: 'var(--text2)' }}>Pregunta {session.currentQ + 1} / {session.questions.length}</div>
        <div style={{ fontSize: 14, fontFamily: 'IBM Plex Mono, monospace', color: time < 60 ? 'var(--red)' : 'var(--text0)', fontWeight: 700 }}>⏱ {minStr(time)}</div>
      </div>

      <div className="card" style={{ maxHeight: 180, overflowY: 'auto' }}>
        <div style={{ fontSize: 10, color: 'var(--text2)', marginBottom: 6 }}>Texto: {q.textTitle}</div>
        <div style={{ fontSize: 12, color: 'var(--text1)', lineHeight: 1.6 }}>{q.textBody}</div>
      </div>

      <div className="card">
        <div style={{ fontSize: 13, color: 'var(--text0)', lineHeight: 1.5, marginBottom: 12 }}>{q.stem}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {q.options.map((opt, i) => {
            const chosen = session.answers[q.id]
            return (
              <button key={i} onClick={() => setSession(s => ({ ...s, answers: { ...s.answers, [q.id]: i } }))} style={{
                textAlign: 'left', padding: '8px 12px', borderRadius: 7, cursor: 'pointer', fontSize: 12,
                background: chosen === i ? 'var(--accent-dim)' : 'var(--bg3)',
                color: chosen === i ? 'var(--accent)' : 'var(--text1)',
                border: `1px solid ${chosen === i ? 'var(--accent-border)' : 'var(--border)'}`,
              }}>{opt}</button>
            )
          })}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        {session.currentQ > 0 && (
          <button onClick={() => setSession(s => ({ ...s, currentQ: s.currentQ - 1 }))} style={{ padding: '8px 14px', borderRadius: 7, background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text1)', cursor: 'pointer', fontSize: 12 }}>← Anterior</button>
        )}
        {session.currentQ < session.questions.length - 1 && (
          <button onClick={() => setSession(s => ({ ...s, currentQ: s.currentQ + 1 }))} style={{ padding: '8px 16px', borderRadius: 7, background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, marginLeft: 'auto' }}>Siguiente →</button>
        )}
        {session.currentQ === session.questions.length - 1 && (
          <button onClick={submitEnsayo} disabled={saving} style={{ padding: '8px 16px', borderRadius: 7, background: 'var(--green)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, marginLeft: 'auto', opacity: saving ? .7 : 1 }}>
            {saving ? 'Guardando…' : 'Finalizar y corregir'}
          </button>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION: Progreso
// ─────────────────────────────────────────────────────────────────────────────
function ProgresoSection({ history, errors, uid }) {
  const [tab, setTab] = useState('historial')

  async function resolveError(id) {
    await updatePaesError(uid, id, { resolved: true })
  }

  async function deleteError(id) {
    await deletePaesError(uid, id)
  }

  const pending   = errors.filter(e => !e.resolved)
  const resolved  = errors.filter(e => e.resolved)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        {[['historial','Historial'],['errores','Errores pendientes']].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            padding: '6px 14px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
            background: tab === id ? 'var(--accent-dim)' : 'var(--bg3)',
            color: tab === id ? 'var(--accent)' : 'var(--text1)',
            border: `1px solid ${tab === id ? 'var(--accent-border)' : 'var(--border)'}`,
          }}>{label}{id === 'errores' && pending.length > 0 ? ` (${pending.length})` : ''}</button>
        ))}
      </div>

      {tab === 'historial' && (
        <div className="card">
          {history.length === 0 ? (
            <div style={{ color: 'var(--text2)', fontSize: 12 }}>Sin historial aún. Completá ensayos o práctica para ver tus resultados aquí.</div>
          ) : history.map(h => {
            const hPct = h.total > 0 ? Math.round(((h.correctas ?? h.correct ?? 0) / h.total) * 100) : 0
            return (
              <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--accent)', background: 'var(--accent-dim)', borderRadius: 4, padding: '2px 6px', minWidth: 36, textAlign: 'center' }}>
                  {(h.materia ?? h.subject ?? '?').toUpperCase()}
                </span>
                <span style={{ flex: 1, fontSize: 12, color: 'var(--text1)' }}>{h.tipo} — {h.correctas ?? h.correct ?? '?'}/{h.total ?? '?'} correctas</span>
                <span style={{ fontWeight: 600, fontSize: 13, fontFamily: 'IBM Plex Mono, monospace', color: hPct >= 70 ? 'var(--green)' : hPct >= 50 ? 'var(--amber)' : 'var(--red)' }}>{hPct}%</span>
                <span style={{ fontSize: 10, color: 'var(--text2)', minWidth: 80, textAlign: 'right' }}>{h.date}</span>
              </div>
            )
          })}
        </div>
      )}

      {tab === 'errores' && (
        <div className="card">
          {pending.length === 0 ? (
            <div style={{ color: 'var(--text2)', fontSize: 12 }}>Sin errores pendientes. Podés registrar nuevos desde el Asistente IA.</div>
          ) : pending.map(e => (
            <div key={e.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <span style={{
                  fontSize: 10, fontWeight: 600, color: e.prioridad === 'alta' ? 'var(--red)' : e.prioridad === 'media' ? 'var(--amber)' : 'var(--text2)',
                  minWidth: 42, textAlign: 'center', padding: '2px 0',
                }}>{e.prioridad?.toUpperCase()}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: 'var(--text0)', fontWeight: 600 }}>[{e.materia?.toUpperCase()}] {e.tema}</div>
                  <div style={{ fontSize: 12, color: 'var(--text1)', marginTop: 2 }}>{e.descripcion}</div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => resolveError(e.id)} style={{ fontSize: 11, padding: '3px 8px', borderRadius: 5, background: 'rgba(62,201,126,.12)', color: 'var(--green)', border: '1px solid var(--green)', cursor: 'pointer' }}>✓</button>
                  <button onClick={() => deleteError(e.id)}  style={{ fontSize: 11, padding: '3px 8px', borderRadius: 5, background: 'rgba(240,114,114,.12)', color: 'var(--red)', border: '1px solid var(--red)', cursor: 'pointer' }}>×</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION: Asistente PAES
// ─────────────────────────────────────────────────────────────────────────────
function AsistentePAESSection({ uid }) {
  const chat = usePaesChat(uid)
  const fileInputRef = useRef(null)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 0 }}>
      <ChatUI
        uiMessages={chat.uiMessages}
        input={chat.input}
        setInput={chat.setInput}
        send={chat.send}
        loading={chat.loading}
        handleKey={chat.handleKey}
        compact={false}
        canSend={!!(chat.input.trim() || chat.file)}
        extraToolbar={
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {chat.file && (
              <div style={{ fontSize: 11, color: 'var(--accent)', background: 'var(--accent-dim)', borderRadius: 4, padding: '2px 8px', display: 'flex', alignItems: 'center', gap: 4 }}>
                📎 {chat.file.name}
                <button onClick={() => chat.setFile(null)} style={{ background: 'none', border: 'none', color: 'var(--text2)', cursor: 'pointer', padding: 0, fontSize: 13, lineHeight: 1 }}>×</button>
              </div>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              title="Adjuntar PDF o imagen de ensayo"
              style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', color: 'var(--text2)', cursor: 'pointer', fontSize: 11 }}
            >
              📎 Subir ensayo
            </button>
            <input ref={fileInputRef} type="file" accept="image/*,.pdf" onChange={chat.handleFileSelect} style={{ display: 'none' }} />
          </div>
        }
      />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function PAESTab({ uid }) {
  const [activeTab, setActiveTab] = useState('inicio')
  const [stats,     setStats]     = useState(null)
  const [vocabState,setVocabState]= useState(null)
  const [profile,   setProfile]   = useState(null)
  const [history,   setHistory]   = useState([])
  const [errors,    setErrors]    = useState([])

  useEffect(() => {
    if (!uid) return
    const unsubs = [
      subscribePaesStats(uid,   setStats),
      subscribePaesVocab(uid,   setVocabState),
      subscribePaesProfile(uid, setProfile),
      subscribePaesHistory(uid, setHistory),
      subscribePaesErrors(uid,  setErrors),
    ]
    return () => unsubs.forEach(u => u())
  }, [uid])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        padding: '0 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg1)',
        display: 'flex', alignItems: 'center', gap: 20, flexShrink: 0, overflowX: 'auto',
      }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
            padding: '12px 4px', background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: activeTab === t.id ? 600 : 400,
            color: activeTab === t.id ? 'var(--accent)' : 'var(--text1)',
            borderBottom: activeTab === t.id ? '2px solid var(--accent)' : '2px solid transparent',
            whiteSpace: 'nowrap', flexShrink: 0, transition: 'color .15s',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: activeTab === 'asistente' ? 0 : '20px', display: 'flex', flexDirection: 'column' }}>
        {activeTab === 'inicio'      && <InicioSection    stats={stats} profile={profile} history={history} />}
        {activeTab === 'guias'       && <GuiasSection />}
        {activeTab === 'practica'    && <PracticaSection  uid={uid} stats={stats} />}
        {activeTab === 'vocabulario' && <VocabSection     uid={uid} vocabState={vocabState} />}
        {activeTab === 'ensayos'     && <EnsayosSection   uid={uid} stats={stats} />}
        {activeTab === 'progreso'    && <ProgresoSection  history={history} errors={errors} uid={uid} />}
        {activeTab === 'asistente'   && <AsistentePAESSection uid={uid} />}
      </div>
    </div>
  )
}
