// POST /api/check-reminders
// Evalúa qué recordatorios enviar y llama a /api/send-notification.
// Body: { uid }
// Llamar desde un cron job en vercel.json (próximo paso) o manualmente para pruebas.

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { uid } = req.body || {}
  if (!uid) return res.status(400).json({ error: 'uid requerido' })

  // TODO (próximo paso): evaluar reglas y llamar a /api/send-notification:
  // 1. Sin check-in del día a las 20:00 → "¿Cómo fue tu día?"
  // 2. Racha en riesgo antes de medianoche → "¡No rompas tu racha!"
  // 3. Tareas de alta prioridad sin completar a las 09:00 → resumen de pendientes
  // 4. Día sin bloque de estudio a las 17:00 → "Tiempo de estudiar"

  return res.status(200).json({
    ok:      true,
    message: 'check-reminders operativo — reglas pendientes del siguiente paso',
    uid,
  })
}
