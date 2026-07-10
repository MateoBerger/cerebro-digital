import { useEffect, useRef, useState } from 'react'

function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3) }

// Anima un número entero contando desde su valor anterior (0 en el primer
// render) hasta `value`, con easing. Respeta prefers-reduced-motion.
export default function CountUp({ value, duration = 750 }) {
  const target = Number(value) || 0
  const [display, setDisplay] = useState(0)
  const prevRef = useRef(0)
  const rafRef  = useRef(null)

  useEffect(() => {
    const from = prevRef.current
    const to   = target
    if (from === to) { setDisplay(to); return }

    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion) { setDisplay(to); prevRef.current = to; return }

    const start = performance.now()
    function tick(now) {
      const t = Math.min(1, (now - start) / duration)
      setDisplay(Math.round(from + (to - from) * easeOutCubic(t)))
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        prevRef.current = to
      }
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [target, duration]) // eslint-disable-line react-hooks/exhaustive-deps

  return display
}
