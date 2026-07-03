import React, { useEffect, useRef, useState, useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import AssistantAvatar from './AssistantAvatar'

// ── Helpers de fecha/hora Chile ────────────────────────────────────────────────
const TZ = 'America/Santiago'

function getChileDate(ts) {
  return new Date(ts).toLocaleDateString('es-CL', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
  })
}

function formatSepLabel(ts) {
  const todayStr = getChileDate(Date.now())
  const yestStr  = getChileDate(Date.now() - 86400000)
  const tsStr    = getChileDate(ts)
  if (tsStr === todayStr) return 'Hoy'
  if (tsStr === yestStr)  return 'Ayer'
  return new Date(ts).toLocaleDateString('es-CL', {
    timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long',
  })
}

function formatTime(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleTimeString('es-CL', {
    timeZone: TZ, hour: '2-digit', minute: '2-digit',
  })
}

function getChileHour() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: TZ })).getHours()
}

// ── Chips de sugerencia ────────────────────────────────────────────────────────
const QUICK_CHIPS = [
  '¿Qué hago hoy?',
  'Revisa mis tareas',
  '¿Qué tengo en el calendario?',
  'Dame un resumen de mi semana',
]

function ChipBtn({ label, onClick }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        padding: '5px 13px', borderRadius: '20px',
        border: `1px solid ${hov ? 'var(--accent)' : 'var(--accent-border)'}`,
        background: hov ? 'var(--accent)' : 'var(--accent-dim)',
        color: hov ? '#1a1608' : 'var(--accent)',
        fontSize: '11px', fontWeight: 500, fontFamily: 'Inter, sans-serif',
        cursor: 'pointer', transition: 'all .15s', whiteSpace: 'nowrap', lineHeight: 1,
      }}
    >
      {label}
    </button>
  )
}

// ── Separador de fecha ────────────────────────────────────────────────────────
function DateSeparator({ ts }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 0', userSelect: 'none' }}>
      <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, transparent, var(--border))' }} />
      <span style={{
        fontSize: '10px', fontWeight: 600, color: 'var(--text2)',
        letterSpacing: '.6px', textTransform: 'uppercase', whiteSpace: 'nowrap',
        padding: '2px 8px', borderRadius: '10px',
        background: 'var(--bg2)', border: '1px solid var(--border)',
      }}>
        {formatSepLabel(ts)}
      </span>
      <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, var(--border), transparent)' }} />
    </div>
  )
}

// ── Typing indicator ──────────────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div className="msg-bubble" style={{ display: 'flex', alignItems: 'flex-end', gap: '7px' }}>
      <AssistantAvatar pulsing size={26} />
      <div style={{
        padding: '11px 15px', borderRadius: '4px 16px 16px 16px',
        background: 'var(--bg2)', border: '1px solid rgba(224,189,107,.22)',
        boxShadow: '0 0 10px rgba(224,189,107,.08)',
        display: 'flex', gap: '5px', alignItems: 'center',
      }}>
        {[0, 1, 2].map(i => (
          <span key={i} style={{
            width: '6px', height: '6px', borderRadius: '50%',
            background: 'var(--accent)', display: 'inline-block',
            animation: 'dotPulse 1.2s ease-in-out infinite',
            animationDelay: `${i * 0.18}s`,
          }} />
        ))}
      </div>
    </div>
  )
}

// ── Tarjetita de acción ───────────────────────────────────────────────────────
function ActionCard({ msg }) {
  return (
    <div className="msg-bubble" style={{ display: 'flex', justifyContent: 'center', padding: '2px 0' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '9px 16px', borderRadius: '12px', maxWidth: '88%',
        background: msg.pending ? 'var(--bg2)' : 'rgba(62,201,126,.06)',
        border: `1px solid ${msg.pending ? 'var(--border)' : 'rgba(62,201,126,.22)'}`,
        boxShadow: msg.pending ? 'none' : '0 0 14px rgba(62,201,126,.06)',
        transition: 'all .25s ease',
      }}>
        {/* Ícono */}
        {msg.pending ? (
          <span style={{
            display: 'inline-block', width: '16px', height: '16px', flexShrink: 0,
            border: '2px solid var(--accent-border)', borderTopColor: 'var(--accent)',
            borderRadius: '50%', animation: 'spin .7s linear infinite',
          }} />
        ) : (
          <div style={{
            width: '20px', height: '20px', borderRadius: '50%', flexShrink: 0,
            background: 'rgba(62,201,126,.15)', border: '1.5px solid rgba(62,201,126,.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
              stroke="#4ec97e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
        )}
        {/* Texto */}
        <span style={{
          fontSize: '12px', fontWeight: 500,
          color: msg.pending ? 'var(--text1)' : '#4ec97e',
          letterSpacing: '.1px',
        }}>
          {msg.text}
        </span>
      </div>
    </div>
  )
}

// ── Mensaje de chat con streaming ─────────────────────────────────────────────
function ChatMessage({ msg, shouldStream, onStreamEnd }) {
  const isUser   = msg.role === 'user'
  const isAction = msg.role === 'action'
  const canStream = shouldStream && !isUser && !isAction

  // Estado del texto visible — inicializa vacío si hay streaming
  const [visibleText, setVisibleText] = useState(canStream ? '' : (msg.text || ''))
  const animated   = useRef(!canStream)
  const msgTextRef = useRef(msg.text) // captura el texto en el momento del mount

  // Efecto de escritura — corre UNA vez al montarse
  useEffect(() => {
    if (animated.current) return
    animated.current = true
    const full = msgTextRef.current || ''
    if (!full) { onStreamEnd?.(); return }

    const TOTAL_MS   = 1200
    const INTERVAL   = 16
    const ticks      = Math.ceil(TOTAL_MS / INTERVAL)
    const chunk      = Math.max(1, Math.ceil(full.length / ticks))
    let pos = 0

    const iv = setInterval(() => {
      pos = Math.min(pos + chunk, full.length)
      setVisibleText(full.slice(0, pos))
      if (pos >= full.length) { clearInterval(iv); onStreamEnd?.() }
    }, INTERVAL)

    return () => clearInterval(iv)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Renderizar tarjetita de acción (hooks ya llamados arriba)
  if (isAction) return <ActionCard msg={msg} />

  const displayText = isUser ? (msg.text || '') : visibleText

  return (
    <div
      className="msg-bubble"
      style={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        alignItems: 'flex-end', gap: '7px',
      }}
    >
      {!isUser && <AssistantAvatar pulsing={false} size={26} />}

      <div style={{ maxWidth: '80%', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {/* Burbuja */}
        <div style={{
          padding: '10px 14px',
          borderRadius: isUser ? '16px 16px 4px 16px' : '4px 16px 16px 16px',
          background: isUser
            ? 'var(--accent)'
            : msg.isError ? 'rgba(240,114,114,.1)' : 'var(--bg2)',
          color: isUser ? '#1a1608' : msg.isError ? '#f07272' : 'var(--text0)',
          border: isUser
            ? 'none'
            : `1px solid ${msg.isError ? 'rgba(240,114,114,.22)' : 'rgba(224,189,107,.18)'}`,
          boxShadow: isUser
            ? '0 2px 10px rgba(224,189,107,.28)'
            : msg.isError ? 'none' : '0 0 14px rgba(224,189,107,.06)',
          fontSize: '14px', lineHeight: 1.55,
          whiteSpace:  isUser ? 'pre-wrap' : undefined,
          wordBreak:   'break-word',
        }}>
          {isUser
            ? displayText
            : <ReactMarkdown className="chat-md" remarkPlugins={[remarkGfm]}>{displayText}</ReactMarkdown>
          }
        </div>

        {/* Timestamp */}
        {msg.ts && (
          <div style={{
            fontSize: '10px', color: 'var(--text2)',
            textAlign: isUser ? 'right' : 'left',
            paddingLeft: isUser ? 0 : '2px', paddingRight: isUser ? '2px' : 0,
            userSelect: 'none',
          }}>
            {formatTime(msg.ts)}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Estado de bienvenida ──────────────────────────────────────────────────────
function WelcomeState({ greetingData }) {
  const { firstName = 'Mateo', urgentCount = null } = greetingData || {}
  const h      = getChileHour()
  const saludo = h < 6 ? 'Buenas noches' : h < 12 ? 'Buenos días' : h < 20 ? 'Buenas tardes' : 'Buenas noches'

  let taskLine = ''
  if (urgentCount === null || urgentCount === 0) taskLine = 'Estás al día con tus tareas.'
  else if (urgentCount === 1) taskLine = 'Tenés 1 tarea urgente para hoy.'
  else taskLine = `Tenés ${urgentCount} tareas urgentes para hoy.`

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '40px 24px', gap: '16px',
      animation: 'fadeIn .4s ease',
    }}>
      <AssistantAvatar pulsing={false} size={54} />
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text0)', marginBottom: '5px', letterSpacing: '-.01em' }}>
          {saludo}, {firstName}.
        </p>
        <p style={{ fontSize: '12px', color: 'var(--accent)', marginBottom: '6px', fontWeight: 500 }}>
          {taskLine}
        </p>
        <p style={{ fontSize: '12px', color: 'var(--text2)', lineHeight: 1.7, maxWidth: '250px', margin: '0 auto' }}>
          Tengo acceso a tus datos en tiempo real. Preguntame lo que quieras.
        </p>
      </div>
    </div>
  )
}

// ── ChatUI ────────────────────────────────────────────────────────────────────
export default function ChatUI({
  uiMessages, input, setInput, send, loading,
  handleKey, compact = false, canSend, extraToolbar,
  greetingData,
}) {
  const bottomRef   = useRef(null)
  const textareaRef = useRef(null)
  const isMounted   = useRef(false)

  // Inicializa con los IDs de mensajes presentes en el primer render
  // → no se animan los mensajes históricos, solo los nuevos
  const streamedSetRef = useRef(null)
  if (streamedSetRef.current === null) {
    streamedSetRef.current = new Set(uiMessages.map(m => m.id))
  }

  useEffect(() => { isMounted.current = true }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [uiMessages, loading])

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }, [input])

  const hasMessages = uiMessages.length > 0
  // Chips visibles cuando no hay mensajes o cuando el último mensaje es del asistente
  // (desaparecen mientras el usuario espera respuesta, reaparecen después)
  const lastMsg   = uiMessages[uiMessages.length - 1]
  const showChips = !loading && (
    !hasMessages ||
    (lastMsg && (lastMsg.role === 'assistant' || lastMsg.role === 'action') && !lastMsg.pending)
  )

  // Renderiza los mensajes con separadores de fecha intercalados
  function renderMessages() {
    let lastDate = null
    const elems = []

    for (const msg of uiMessages) {
      const msgDate   = msg.ts ? getChileDate(msg.ts) : null
      if (msgDate && msgDate !== lastDate) {
        lastDate = msgDate
        elems.push(<DateSeparator key={`sep-${msgDate}`} ts={msg.ts} />)
      }

      const shouldStream = (
        msg.role === 'assistant' &&
        isMounted.current &&
        !streamedSetRef.current.has(msg.id)
      )

      elems.push(
        <ChatMessage
          key={msg.id}
          msg={msg}
          shouldStream={shouldStream}
          onStreamEnd={() => streamedSetRef.current.add(msg.id)}
        />
      )
    }

    return elems
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* ── Área de mensajes ── */}
      <div
        className="chat-messages-bg"
        style={{
          flex: 1, overflowY: 'auto',
          padding: compact ? '10px 10px 6px' : '20px 24px 12px',
          display: 'flex', flexDirection: 'column', gap: '8px',
        }}
      >
        {/* Bienvenida — solo cuando no hay mensajes y no es compact */}
        {!hasMessages && !loading && !compact && (
          <WelcomeState greetingData={greetingData} />
        )}

        {renderMessages()}
        {loading && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      {/* ── Input ── */}
      <div style={{
        padding: compact ? '6px 10px 10px' : '8px 24px 20px',
        borderTop: '1px solid var(--border)',
        flexShrink: 0,
        background: compact ? 'var(--bg1)' : undefined,
      }}>
        {extraToolbar && (
          <div style={{ marginBottom: compact ? 5 : 8 }}>{extraToolbar}</div>
        )}

        {/* Chips de sugerencias */}
        {showChips && (
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: '5px',
            marginBottom: compact ? 6 : 10,
            animation: 'fadeIn .35s ease',
          }}>
            {QUICK_CHIPS.map(chip => (
              <ChipBtn key={chip} label={chip} onClick={() => send(chip)} />
            ))}
          </div>
        )}

        {/* Campo de texto con micro-avatar */}
        <div
          className="chat-input-wrap"
          style={{
            display: 'flex', gap: compact ? '5px' : '8px', alignItems: 'center',
            background: 'var(--bg2)', borderRadius: compact ? '18px' : '14px',
            border: '1px solid var(--border)',
            padding: compact ? '5px 5px 5px 10px' : '8px 8px 8px 12px',
          }}
        >
          {/* Micro-avatar decorativo */}
          <img
            src="/logo.png"
            alt=""
            aria-hidden="true"
            style={{
              width: compact ? 13 : 15, height: compact ? 13 : 15,
              objectFit: 'contain', opacity: .38, flexShrink: 0,
            }}
          />

          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Escribí algo…"
            rows={1}
            style={{
              flex: 1, background: 'none', border: 'none', outline: 'none',
              resize: 'none', fontFamily: 'inherit', fontSize: compact ? '12px' : '14px',
              color: 'var(--text0)', lineHeight: 1.5,
              maxHeight: compact ? '80px' : '120px', overflowY: 'auto',
            }}
          />

          {(() => {
            const canGo  = (canSend !== undefined ? canSend : input.trim()) && !loading
            const btnSz  = compact ? 26 : 32
            const iconSz = compact ? 13 : 15
            return (
              <button
                onClick={send}
                disabled={!canGo}
                style={{
                  width: btnSz, height: btnSz,
                  borderRadius: compact ? '10px' : '8px',
                  border: 'none',
                  background: canGo ? 'var(--accent)' : 'var(--bg3)',
                  cursor: canGo ? 'pointer' : 'default',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, transition: 'background .15s',
                  boxShadow: canGo ? '0 2px 8px rgba(224,189,107,.32)' : 'none',
                }}
              >
                <svg width={iconSz} height={iconSz} viewBox="0 0 24 24" fill="none"
                  stroke={canGo ? (compact ? '#1a1608' : '#fff') : 'var(--text2)'}
                  strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2"  x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            )
          })()}
        </div>

        {!compact && (
          <p style={{ fontSize: '11px', color: 'var(--text2)', marginTop: '6px', textAlign: 'center' }}>
            Enter para enviar · Shift+Enter para nueva línea
          </p>
        )}
      </div>
    </div>
  )
}
