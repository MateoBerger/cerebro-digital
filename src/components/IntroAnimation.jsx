import { useEffect, useRef, useState } from 'react'

const DAYS   = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']
const MONTHS = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']

function chileNow() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Santiago' }))
}

function getGreeting(h) {
  if (h >= 6 && h < 12) return '¡Buenos días'
  if (h >= 12 && h < 20) return '¡Buenas tardes'
  return '¡Buenas noches'
}

function shouldShow() {
  const now  = chileNow()
  const date = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`
  const win  = now.getHours() >= 21 ? 'night' : 'morning'
  const key  = `smgv-intro-${win}-${date}`
  if (localStorage.getItem(key)) return false
  localStorage.setItem(key, '1')
  return true
}

export default function IntroAnimation({ user }) {
  const [visible, setVisible] = useState(() => shouldShow())
  const overlayRef   = useRef(null)
  const particlesRef = useRef(null)
  const fullsparkRef = useRef(null)

  useEffect(() => {
    if (!visible) return

    const pc = particlesRef.current
    if (pc) {
      for (let k = 0; k < 14; k++) {
        const p  = document.createElement('i')
        const dx = (Math.random() * 120 - 60).toFixed(0)
        const delay = (Math.random() * 1.2 + 0.4).toFixed(2)
        const dur   = (Math.random() * 1.2 + 1.6).toFixed(2)
        const sz    = (Math.random() * 4 + 3).toFixed(1)
        p.style.left   = (Math.random() * 220 - 110).toFixed(0) + 'px'
        p.style.width  = sz + 'px'
        p.style.height = sz + 'px'
        p.style.setProperty('--dx', dx + 'px')
        p.style.animation = `intro-float ${dur}s ease-out ${delay}s forwards`
        pc.appendChild(p)
      }
    }

    const fs = fullsparkRef.current
    if (fs) {
      for (let k = 0; k < 26; k++) {
        const p    = document.createElement('i')
        const delay = (Math.random() * 2.4).toFixed(2)
        const dur   = (Math.random() * 1.8 + 2).toFixed(2)
        const sz    = (Math.random() * 3 + 2).toFixed(1)
        p.style.left      = (Math.random() * 100).toFixed(1) + '%'
        p.style.top       = (Math.random() * 100).toFixed(1) + '%'
        p.style.width     = sz + 'px'
        p.style.height    = sz + 'px'
        p.style.animation = `intro-riseSpark ${dur}s ease-out ${delay}s forwards`
        fs.appendChild(p)
      }
    }

    const t1 = setTimeout(() => {
      if (overlayRef.current) {
        overlayRef.current.style.transition = 'opacity .6s'
        overlayRef.current.style.opacity    = '0'
      }
    }, 3900)
    const t2 = setTimeout(() => setVisible(false), 4500)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [visible])

  if (!visible) return null

  const now  = chileNow()
  const greet = getGreeting(now.getHours())
  const sub   = `${DAYS[now.getDay()]} · ${now.getDate()} de ${MONTHS[now.getMonth()]}`
  const name  = user?.displayName?.split(' ')[0] || 'Mateo'

  return (
    <div ref={overlayRef} className="intro-overlay">
      <div className="intro-aurora">
        <b className="intro-a1" /><b className="intro-a2" /><b className="intro-a3" />
      </div>
      <div className="intro-dotgrid" />
      <div className="intro-bigwave intro-w1" />
      <div className="intro-bigwave intro-w2" />
      <div className="intro-bigwave intro-w3" />
      <div ref={fullsparkRef} className="intro-fullspark" />

      <div className="intro-stage">
        <div className="intro-halo" />
        <div className="intro-pulse" />
        <div className="intro-pulse intro-p2" />
        <div ref={particlesRef} className="intro-particles" />
        <div className="intro-logo-wrap">
          <div className="intro-logo-ring" />
          <img className="intro-logo" src="/cerebro-logo.png" alt="" />
          <div className="intro-shine" />
        </div>
        <div className="intro-greet">
          <div className="intro-hi">{greet}, <em>{name}</em>!</div>
          <div className="intro-sub">{sub}</div>
          <div className="intro-line" />
        </div>
      </div>
    </div>
  )
}
