import React, { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import AssistantAvatar from './AssistantAvatar'

const QUICK_CHIPS = [
  '¿Qué hago hoy?',
  'Revisa mis tareas',
  '¿Qué tengo en el calendario?',
  'Dame un resumen de mi semana',
]

// ── Typing indicator ──────────────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div className="msg-bubble" style={{ display: 'flex', alignItems: 'flex-end', gap: '7px' }}>
      <AssistantAvatar pulsing size={26} />
      <div style={{
        padding: '11px 15px',
        borderRadius: '4px 16px 16px 16px',
        background: 'var(--bg2)',
        border: '1px solid rgba(224,189,107,.22)',
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

// ── Chip de sugerencia ────────────────────────────────────────────────────────
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
        cursor: 'pointer', transition: 'all .15s', whiteSpace: 'nowrap',
        lineHeight: 1,
      }}
    >
      {label}
    </button>
  )
}

// ── ActionChip (sin cambios funcionales) ─────────────────────────────────────
function ActionChip({ msg }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '2px 0' }}>
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: '6px',
        padding: '4px 12px', borderRadius: '20px', fontSize: '12px',
        background:  msg.pending ? 'var(--accent-dim)' : 'rgba(62,201,126,.1)',
        border:      `1px solid ${msg.pending ? 'var(--accent-border)' : 'rgba(62,201,126,.25)'}`,
        color:       msg.pending ? 'var(--accent)' : '#3ec97e',
        transition:  'all .2s',
      }}>
        {msg.pending ? (
          <span style={{
            display: 'inline-block', width: '10px', height: '10px',
            border: '1.5px solid currentColor', borderTopColor: 'transparent',
            borderRadius: '50%', animation: 'spin .6s linear infinite',
          }} />
        ) : (
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        )}
        {msg.text}
      </span>
    </div>
  )
}

// ── Mensaje de chat ───────────────────────────────────────────────────────────
function ChatMessage({ msg }) {
  if (msg.role === 'action') return <ActionChip msg={msg} />

  const isUser = msg.role === 'user'
  return (
    <div
      className="msg-bubble"
      style={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        alignItems: 'flex-end',
        gap: '7px',
      }}
    >
      {!isUser && <AssistantAvatar pulsing={false} size={26} />}

      <div style={{
        maxWidth: '80%',
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
          ? msg.text
          : <ReactMarkdown className="chat-md" remarkPlugins={[remarkGfm]}>{msg.text || ''}</ReactMarkdown>
        }
      </div>
    </div>
  )
}

// ── Estado de bienvenida (chat vacío, no compact) ────────────────────────────
function WelcomeState() {
  return (
    <div style={{
      flex: 1,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '40px 24px', gap: '16px',
      animation: 'fadeIn .4s ease',
    }}>
      <AssistantAvatar pulsing={false} size={54} />
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text0)', marginBottom: '6px', letterSpacing: '-.01em' }}>
          Asistente SMGV
        </p>
        <p style={{ fontSize: '12px', color: 'var(--text2)', lineHeight: 1.7, maxWidth: '260px', margin: '0 auto' }}>
          Tengo acceso a tus tareas, calendario y progreso PAES en tiempo real. Preguntame lo que quieras.
        </p>
      </div>
    </div>
  )
}

// ── ChatUI ────────────────────────────────────────────────────────────────────
export default function ChatUI({
  uiMessages, input, setInput, send, loading,
  handleKey, compact = false, canSend, extraToolbar,
}) {
  const bottomRef   = useRef(null)
  const textareaRef = useRef(null)

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
  const showChips   = !hasMessages && !loading

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* ── Messages area ── */}
      <div style={{
        flex: 1, overflowY: 'auto',
        padding: compact ? '10px 10px 6px' : '20px 24px 12px',
        display: 'flex', flexDirection: 'column', gap: '8px',
      }}>
        {/* Welcome state: solo cuando no hay mensajes y no es compact */}
        {!hasMessages && !loading && !compact && <WelcomeState />}

        {uiMessages.map(msg => <ChatMessage key={msg.id} msg={msg} />)}
        {loading && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      {/* ── Input area ── */}
      <div style={{
        padding: compact ? '6px 10px 10px' : '8px 24px 20px',
        borderTop: '1px solid var(--border)',
        flexShrink: 0,
        background: compact ? 'var(--bg1)' : undefined,
      }}>
        {extraToolbar && (
          <div style={{ marginBottom: compact ? 5 : 8 }}>{extraToolbar}</div>
        )}

        {/* Chips de sugerencias — ocultos una vez que hay mensajes */}
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

        {/* Campo de texto */}
        <div
          className="chat-input-wrap"
          style={{
            display: 'flex', gap: compact ? '5px' : '8px', alignItems: 'flex-end',
            background: 'var(--bg2)', borderRadius: compact ? '18px' : '12px',
            border: '1px solid var(--border)',
            padding: compact ? '5px 5px 5px 11px' : '8px 8px 8px 14px',
          }}
        >
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
            const canGo = (canSend !== undefined ? canSend : input.trim()) && !loading
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
