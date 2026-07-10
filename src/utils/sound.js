// Sonidos sutiles vía Web Audio API — sin archivos externos.
// Toggle persistido en localStorage; por defecto ACTIVADOS.

const STORAGE_KEY = 'cd-sounds'

export function isSoundEnabled() {
  const v = localStorage.getItem(STORAGE_KEY)
  return v === null ? true : v === '1'
}

export function setSoundEnabled(enabled) {
  localStorage.setItem(STORAGE_KEY, enabled ? '1' : '0')
}

let sharedCtx = null
function getCtx() {
  if (!sharedCtx) sharedCtx = new (window.AudioContext || window.webkitAudioContext)()
  return sharedCtx
}

// Tono corto, cálido y grave — completar una tarea o marcar un hábito.
export function playCompleteSound() {
  if (!isSoundEnabled()) return
  try {
    const ctx = getCtx()
    const osc  = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    const t0 = ctx.currentTime
    osc.frequency.setValueAtTime(196.00, t0)
    osc.frequency.exponentialRampToValueAtTime(261.63, t0 + 0.09)
    gain.gain.setValueAtTime(0, t0)
    gain.gain.linearRampToValueAtTime(0.09, t0 + 0.015)
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.28)
    osc.start(t0)
    osc.stop(t0 + 0.3)
  } catch (_) {}
}

// Chime suave y ascendente — fin de un bloque/pausa del modo enfoque.
export function playPhaseEndSound() {
  if (!isSoundEnabled()) return
  try {
    const ctx   = getCtx()
    const notes = [392.00, 523.25] // G4 -> C5
    notes.forEach((freq, i) => {
      const osc  = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type            = 'sine'
      osc.frequency.value = freq
      const t0 = ctx.currentTime + i * 0.16
      gain.gain.setValueAtTime(0, t0)
      gain.gain.linearRampToValueAtTime(0.1, t0 + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.6)
      osc.start(t0)
      osc.stop(t0 + 0.65)
    })
  } catch (_) {}
}

// Celebración más elaborada — día completado al 100%.
export function playCelebrationSound() {
  if (!isSoundEnabled()) return
  try {
    const ctx   = getCtx()
    const notes = [261.63, 329.63, 392.00, 523.25] // C4 E4 G4 C5
    notes.forEach((freq, i) => {
      const osc  = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type            = 'sine'
      osc.frequency.value = freq
      const t0 = ctx.currentTime + i * 0.20
      gain.gain.setValueAtTime(0, t0)
      gain.gain.linearRampToValueAtTime(0.13, t0 + 0.06)
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.95)
      osc.start(t0)
      osc.stop(t0 + 1.05)
    })
  } catch (_) {}
}
