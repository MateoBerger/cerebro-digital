import React, { useEffect, useRef, useState } from 'react'
import mermaid from 'mermaid'
import { saveDiagram, subscribeDiagram } from '../firebase/db'

mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  themeVariables: {
    darkMode: true,
    background: '#111318',
    primaryColor: '#162040',
    primaryTextColor: '#d4dae6',
    primaryBorderColor: '#4d9cf6',
    lineColor: '#3d4450',
    secondaryColor: '#1e222a',
    tertiaryColor: '#1e222a',
    edgeLabelBackground: '#111318',
    fontFamily: 'IBM Plex Sans, sans-serif',
    fontSize: '12px',
  },
  flowchart: { curve: 'basis', padding: 16, htmlLabels: true },
  securityLevel: 'loose',
})

const s = {
  root: { display: 'flex', flex: 1, overflow: 'hidden' },
  sidebar: {
    width: '300px',
    flexShrink: 0,
    background: 'var(--bg1)',
    borderRight: '1px solid var(--border)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  sidebarHead: {
    padding: '9px 14px',
    borderBottom: '1px solid var(--border)',
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: '9px',
    letterSpacing: '1.2px',
    textTransform: 'uppercase',
    color: 'var(--text2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexShrink: 0,
  },
  textarea: {
    flex: 1,
    background: 'var(--bg0)',
    border: 'none',
    outline: 'none',
    color: 'var(--teal)',
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: '10.5px',
    lineHeight: '1.65',
    padding: '12px 14px',
    resize: 'none',
    tabSize: 2,
    overflowY: 'auto',
  },
  footer: {
    borderTop: '1px solid var(--border)',
    padding: '8px 12px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexShrink: 0,
  },
  btnRender: {
    flex: 1,
    padding: '6px 10px',
    background: 'rgba(77,156,246,.1)',
    border: '1px solid rgba(77,156,246,.25)',
    color: 'var(--blue)',
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: '10px',
    borderRadius: '3px',
    cursor: 'pointer',
    textAlign: 'center',
    transition: 'background .12s',
  },
  btnSave: {
    padding: '6px 10px',
    background: 'rgba(61,186,111,.1)',
    border: '1px solid rgba(61,186,111,.25)',
    color: 'var(--green)',
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: '10px',
    borderRadius: '3px',
    cursor: 'pointer',
    transition: 'background .12s',
  },
  hint: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: '9px',
    color: 'var(--text2)',
    whiteSpace: 'nowrap',
  },
  center: {
    flex: 1,
    overflow: 'auto',
    padding: '16px',
    background: 'var(--bg0)',
    backgroundImage: 'radial-gradient(circle, rgba(37,42,51,.8) 1px, transparent 1px)',
    backgroundSize: '20px 20px',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
  },
  diagWrap: {
    background: 'var(--bg1)',
    border: '1px solid var(--border)',
    borderRadius: '5px',
    padding: '16px',
    boxShadow: '0 4px 24px rgba(0,0,0,.5)',
    minWidth: '300px',
  },
  error: {
    color: 'var(--red)',
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: '11px',
    padding: '12px',
    background: 'rgba(224,92,92,.05)',
    border: '1px solid rgba(224,92,92,.2)',
    borderRadius: '4px',
    marginBottom: '10px',
    whiteSpace: 'pre-wrap',
  },
}

let rc = 0

export default function DiagramTab({ uid, onInfo }) {
  const [code, setCode]   = useState('')
  const [error, setError] = useState(null)
  const [saved, setSaved] = useState(true)
  const outRef = useRef(null)

  // Subscribe to Firestore diagram
  useEffect(() => {
    if (!uid) return
    const unsub = subscribeDiagram(uid, incoming => {
      setCode(incoming)
    })
    return unsub
  }, [uid])

  // Render whenever code changes (debounced)
  useEffect(() => {
    if (!code) return
    const t = setTimeout(() => render(code), 300)
    return () => clearTimeout(t)
  }, [code])

  async function render(c) {
    const out = outRef.current
    if (!out) return
    setError(null)
    try {
      const id = 'g' + (++rc) + '_' + Date.now()
      out.removeAttribute('data-processed')
      out.innerHTML = ''
      const { svg } = await mermaid.render(id, c)
      out.innerHTML = svg
      const n = (c.match(/-->/g) || []).length
      onInfo && onInfo(n + ' conexiones')
    } catch (e) {
      setError('Error en Mermaid: ' + e.message)
    }
  }

  async function handleSave() {
    if (!uid) return
    await saveDiagram(uid, code)
    setSaved(true)
  }

  function handleChange(v) {
    setCode(v)
    setSaved(false)
  }

  function handleKey(e) {
    if (e.ctrlKey && e.key === 'Enter') { e.preventDefault(); render(code) }
    if (e.ctrlKey && e.key === 's')    { e.preventDefault(); handleSave() }
  }

  return (
    <div style={s.root}>
      <div style={s.sidebar}>
        <div style={s.sidebarHead}>
          <span>editor.mmd</span>
          <span style={{ color: saved ? 'var(--green)' : 'var(--amber)', fontSize: '9px' }}>
            {saved ? 'guardado' : 'sin guardar'}
          </span>
        </div>
        <textarea
          style={s.textarea}
          value={code}
          onChange={e => handleChange(e.target.value)}
          onKeyDown={handleKey}
          spellCheck={false}
        />
        <div style={s.footer}>
          <button style={s.btnRender} onClick={() => render(code)}>Actualizar</button>
          <button style={s.btnSave}   onClick={handleSave}>Guardar</button>
          <span style={s.hint}>Ctrl+S</span>
        </div>
      </div>

      <div style={s.center}>
        <div style={s.diagWrap}>
          {error && <div style={s.error}>{error}</div>}
          <div ref={outRef} />
        </div>
      </div>
    </div>
  )
}
