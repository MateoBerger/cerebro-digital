import React, { useEffect, useState } from 'react'
import {
  subscribeVariables, seedVariables,
  addVariable, updateVariable, deleteVariable
} from '../firebase/db'

const CATS  = ['academico', 'pomodoro', 'personal', 'objetivos', 'sistema']
const TYPES = ['string', 'number', 'boolean', 'array', 'object']
const CAT_ORDER = { academico: 0, pomodoro: 1, personal: 2, objetivos: 3, sistema: 4 }

const CAT_STYLE = {
  academico: { background: 'rgba(77,156,246,.12)',  color: 'var(--blue)',   border: '1px solid rgba(77,156,246,.2)' },
  pomodoro:  { background: 'rgba(54,201,160,.12)',  color: 'var(--teal)',   border: '1px solid rgba(54,201,160,.2)' },
  personal:  { background: 'rgba(61,186,111,.12)',  color: 'var(--green)',  border: '1px solid rgba(61,186,111,.2)' },
  objetivos: { background: 'rgba(232,162,69,.12)',  color: 'var(--amber)',  border: '1px solid rgba(232,162,69,.2)' },
  sistema:   { background: 'rgba(157,124,240,.12)', color: 'var(--violet)', border: '1px solid rgba(157,124,240,.2)' },
}

const s = {
  root: { display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' },
  toolbar: {
    background: 'var(--bg1)',
    borderBottom: '1px solid var(--border)',
    padding: '8px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexShrink: 0,
    flexWrap: 'wrap',
  },
  select: {
    background: 'var(--bg2)',
    border: '1px solid var(--border)',
    color: 'var(--text0)',
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: '11px',
    padding: '4px 8px',
    borderRadius: '3px',
    outline: 'none',
  },
  input: {
    background: 'var(--bg2)',
    border: '1px solid var(--border)',
    color: 'var(--text0)',
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: '11px',
    padding: '4px 8px',
    borderRadius: '3px',
    outline: 'none',
    width: '160px',
  },
  btnAdd: {
    padding: '5px 12px',
    background: 'rgba(61,186,111,.1)',
    border: '1px solid rgba(61,186,111,.25)',
    color: 'var(--green)',
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: '10px',
    borderRadius: '3px',
    cursor: 'pointer',
  },
  btnExport: {
    marginLeft: 'auto',
    padding: '5px 12px',
    background: 'rgba(77,156,246,.1)',
    border: '1px solid rgba(77,156,246,.25)',
    color: 'var(--blue)',
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: '10px',
    borderRadius: '3px',
    cursor: 'pointer',
  },
  scroll: {
    flex: 1,
    overflowY: 'auto',
    background: 'var(--bg0)',
    backgroundImage: 'radial-gradient(circle, rgba(37,42,51,.8) 1px, transparent 1px)',
    backgroundSize: '20px 20px',
    padding: '16px',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '12px',
  },
  th: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: '9px',
    letterSpacing: '1px',
    textTransform: 'uppercase',
    color: 'var(--text2)',
    textAlign: 'left',
    padding: '0 10px 8px',
    borderBottom: '1px solid var(--border)',
  },
  cell: {
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: 'var(--text0)',
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: '11px',
    padding: '7px 10px',
    width: '100%',
    transition: 'background .1s',
  },
  catPill: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: '9px',
    padding: '2px 6px',
    borderRadius: '2px',
    display: 'inline-block',
    letterSpacing: '.5px',
  },
  btnDel: {
    background: 'none',
    border: 'none',
    color: 'var(--text2)',
    fontSize: '16px',
    lineHeight: 1,
    padding: '4px 8px',
    borderRadius: '3px',
    cursor: 'pointer',
    transition: 'color .12s, background .12s',
  },
}

function CellInput({ value, onChange, style = {}, mono = true }) {
  const [v, setV] = useState(value)
  useEffect(() => setV(value), [value])

  return (
    <input
      style={{
        ...s.cell,
        fontFamily: mono ? "'IBM Plex Mono', monospace" : "'IBM Plex Sans', sans-serif",
        color: mono ? 'var(--text0)' : 'var(--text1)',
        ...style,
      }}
      value={v}
      onChange={e => setV(e.target.value)}
      onBlur={() => { if (v !== value) onChange(v) }}
      onKeyDown={e => { if (e.key === 'Enter') e.target.blur() }}
      spellCheck={false}
    />
  )
}

function InlineSelect({ value, options, onChange, style = {} }) {
  return (
    <select
      style={{
        background: 'transparent',
        border: 'none',
        outline: 'none',
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: '10px',
        color: 'var(--text1)',
        cursor: 'pointer',
        padding: '7px 8px',
        width: '100%',
        ...style,
      }}
      value={value}
      onChange={e => onChange(e.target.value)}
    >
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  )
}

export default function DictTab({ uid, onInfo }) {
  const [vars, setVars]     = useState([])
  const [newCat, setNewCat] = useState('academico')
  const [newKey, setNewKey] = useState('')
  const [newType, setNewType] = useState('string')
  const [newVal, setNewVal] = useState('')

  useEffect(() => {
    if (!uid) return
    seedVariables(uid)
    const unsub = subscribeVariables(uid, v => {
      const sorted = [...v].sort((a, b) => (CAT_ORDER[a.cat] || 0) - (CAT_ORDER[b.cat] || 0))
      setVars(sorted)
      onInfo && onInfo(v.length + ' variables')
    })
    return unsub
  }, [uid])

  async function handleAdd() {
    if (!newKey.trim()) return
    await addVariable(uid, { cat: newCat, key: newKey.trim(), type: newType, val: newVal || '""', desc: 'Sin descripcion.' })
    setNewKey('')
    setNewVal('')
  }

  async function handleUpdate(firestoreId, field, value) {
    await updateVariable(uid, firestoreId, { [field]: value })
  }

  async function handleDelete(firestoreId) {
    if (!confirm('Eliminar esta variable?')) return
    await deleteVariable(uid, firestoreId)
  }

  function handleExport() {
    const out = {}
    vars.forEach(r => {
      if (!out[r.cat]) out[r.cat] = {}
      out[r.cat][r.key] = { type: r.type, value: r.val, description: r.desc }
    })
    const blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'cerebro_variables.json'
    a.click()
  }

  return (
    <div style={s.root}>
      {/* TOOLBAR */}
      <div style={s.toolbar}>
        <select style={s.select} value={newCat} onChange={e => setNewCat(e.target.value)}>
          {CATS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <input
          style={s.input}
          placeholder="nombre_variable"
          value={newKey}
          onChange={e => setNewKey(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleAdd() }}
        />
        <select style={s.select} value={newType} onChange={e => setNewType(e.target.value)}>
          {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <input
          style={{ ...s.input, width: '120px' }}
          placeholder="valor"
          value={newVal}
          onChange={e => setNewVal(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleAdd() }}
        />
        <button style={s.btnAdd} onClick={handleAdd}>+ Agregar</button>
        <button style={s.btnExport} onClick={handleExport}>Exportar JSON</button>
      </div>

      {/* TABLE */}
      <div style={s.scroll}>
        <table style={s.table}>
          <thead>
            <tr>
              <th style={{ ...s.th, width: '95px'  }}>Categoria</th>
              <th style={{ ...s.th, width: '180px' }}>Variable</th>
              <th style={{ ...s.th, width: '70px'  }}>Tipo</th>
              <th style={{ ...s.th, width: '150px' }}>Valor</th>
              <th style={s.th}>Descripcion</th>
              <th style={{ ...s.th, width: '36px'  }}></th>
            </tr>
          </thead>
          <tbody>
            {vars.map(row => (
              <tr
                key={row.firestoreId}
                style={{ borderBottom: '1px solid var(--border)', transition: 'background .1s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,.015)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <td style={{ padding: '4px 8px', verticalAlign: 'middle' }}>
                  <InlineSelect
                    value={row.cat}
                    options={CATS}
                    onChange={v => handleUpdate(row.firestoreId, 'cat', v)}
                    style={{ ...CAT_STYLE[row.cat] || {}, borderRadius: '2px', fontSize: '9px', padding: '2px 6px' }}
                  />
                </td>
                <td style={{ verticalAlign: 'middle' }}>
                  <CellInput
                    value={row.key}
                    onChange={v => handleUpdate(row.firestoreId, 'key', v)}
                    style={{ color: 'var(--amber)' }}
                  />
                </td>
                <td style={{ verticalAlign: 'middle' }}>
                  <InlineSelect
                    value={row.type}
                    options={TYPES}
                    onChange={v => handleUpdate(row.firestoreId, 'type', v)}
                  />
                </td>
                <td style={{ verticalAlign: 'middle' }}>
                  <CellInput
                    value={row.val}
                    onChange={v => handleUpdate(row.firestoreId, 'val', v)}
                  />
                </td>
                <td style={{ verticalAlign: 'middle' }}>
                  <CellInput
                    value={row.desc || ''}
                    onChange={v => handleUpdate(row.firestoreId, 'desc', v)}
                    mono={false}
                  />
                </td>
                <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                  <button
                    style={s.btnDel}
                    onClick={() => handleDelete(row.firestoreId)}
                    onMouseEnter={e => { e.target.style.color = 'var(--red)'; e.target.style.background = 'rgba(224,92,92,.1)' }}
                    onMouseLeave={e => { e.target.style.color = 'var(--text2)'; e.target.style.background = 'none' }}
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
