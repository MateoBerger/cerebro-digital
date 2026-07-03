import React, { useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

function LoadingDots() {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
      <div style={{
        padding: '12px 16px',
        borderRadius: '16px 16px 16px 4px',
        background: 'var(--bg2)',
        border: '1px solid var(--border)',
        display: 'flex', gap: '5px', alignItems: 'center',
      }}>
        {[0, 1, 2].map(i => (
          <span key={i} style={{
            width: '6px', height: '6px', borderRadius: '50%',
            background: 'var(--text2)', display: 'inline-block',
            animation: 'dotPulse 1.2s ease-in-out infinite',
            animationDelay: `${i * 0.2}s`,
          }} />
        ))}
      </div>
    </div>
  )
}

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

function ChatMessage({ msg }) {
  if (msg.role === 'action') return <ActionChip msg={msg} />

  const isUser = msg.role === 'user'
  return (
    <div style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
      <div style={{
        maxWidth: '82%',
        padding: '10px 14px',
        borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
        background: isUser
          ? 'var(--accent)'
          : msg.isError ? 'rgba(240,114,114,.12)' : 'var(--bg2)',
        color:    isUser ? '#fff' : msg.isError ? '#f07272' : 'var(--text0)',
        border:   isUser ? 'none' : `1px solid ${msg.isError ? 'rgba(240,114,114,.25)' : 'var(--border)'}`,
        fontSize: '14px', lineHeight: 1.55,
        whiteSpace:  isUser ? 'pre-wrap' : undefined,
        wordBreak:   'break-word',
        overflow:    isUser ? undefined : 'hidden',
      }}>
        {isUser
          ? msg.text
          : <ReactMarkdown className="chat-md" remarkPlugins={[remarkGfm]}>{msg.text || ''}</ReactMarkdown>
        }
      </div>
    </div>
  )
}

export default function ChatUI({ uiMessages, input, setInput, send, loading, handleKey, compact = false, canSend, extraToolbar }) {
  const bottomRef   = useRef(null)
  const textareaRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [uiMessages, loading])

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }, [input])

  const fs = compact ? 13 : 14

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Messages area */}
      <div style={{
        flex: 1, overflowY: 'auto',
        padding: compact ? '12px 12px 8px' : '24px 28px 16px',
        display: 'flex', flexDirection: 'column', gap: '8px',
      }}>
        {uiMessages.map(msg => <ChatMessage key={msg.id} msg={msg} />)}
        {loading && <LoadingDots />}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div style={{
        padding: compact ? '8px 12px 12px' : '8px 28px 24px',
        borderTop: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        {extraToolbar && (
          <div style={{ marginBottom: 8 }}>{extraToolbar}</div>
        )}
        <div style={{
          display: 'flex', gap: '8px', alignItems: 'flex-end',
          background: 'var(--bg2)', borderRadius: '12px',
          border: '1px solid var(--border)',
          padding: '8px 8px 8px 14px',
          transition: 'border-color .15s',
        }}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Escribí algo…"
            rows={1}
            style={{
              flex: 1, background: 'none', border: 'none', outline: 'none',
              resize: 'none', fontFamily: 'inherit', fontSize: `${fs}px`,
              color: 'var(--text0)', lineHeight: 1.5,
              maxHeight: '120px', overflowY: 'auto',
            }}
          />
          <button
            onClick={send}
            disabled={!(canSend !== undefined ? canSend : input.trim()) || loading}
            style={{
              width: '32px', height: '32px', borderRadius: '8px', border: 'none',
              background: (canSend !== undefined ? canSend : input.trim()) && !loading ? 'var(--accent)' : 'var(--bg3)',
              cursor: (canSend !== undefined ? canSend : input.trim()) && !loading ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, transition: 'background .15s',
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
              stroke={(canSend !== undefined ? canSend : input.trim()) && !loading ? '#fff' : 'var(--text2)'}
              strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
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
