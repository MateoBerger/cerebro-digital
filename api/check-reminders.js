// POST /api/check-reminders
// Evalúa reglas de notificación y envía push FCM.
// Llamado por GitHub Actions cron cada 30 minutos.
// Body: { uid? }   Header: Authorization: Bearer {CRON_SECRET}

import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getMessaging }                  from 'firebase-admin/messaging'
import { getFirestore }                  from 'firebase-admin/firestore'

// ── Horarios de gym (editar aquí) ────────────────────────────────
// Clave = día de semana (0=Dom, 1=Lun, 2=Mar, 3=Mié, 4=Jue, 5=Vie, 6=Sáb)
// Cada entrada = hora de notificación (30 min antes de la sesión)
const GYM_NOTIF = {
  1: { hour: 16, min: 20 }, // Lunes  — sesión 16:50 → notif 16:20
  2: { hour: 15, min: 45 }, // Martes — sesión 16:15 → notif 15:45
  5: { hour: 15, min: 30 }, // Viernes — sesión 16:00 → notif 15:30
  6: { hour:  9, min: 45 }, // Sábado — sesión 10:15 → notif 09:45
}

// ── Hábitos diarios (editar aquí) ────────────────────────────────
// Cada entrada dispara UNA notificación si el hábito no está marcado.
// Para item_estudio hay dos entradas (Lunes y el resto) con distintos horarios.
const HABIT_SCHEDULE = [
  {
    id:    'item_creatina',
    days:  [0, 1, 2, 3, 4, 5, 6],   // todos los días
    hour:  7,  min: 20,
    title: 'Hora de la creatina 💪',
    body:  '¡No olvides tomarla!',
  },
  {
    id:    'item_mercurio',
    days:  [0, 1, 2, 3, 4, 5, 6],
    hour:  8,  min: 22,
    title: 'El Mercurio te espera ☕',
    body:  'Momento de leer las noticias del día.',
  },
  {
    id:    'item_leer',
    days:  [0, 1, 2, 3, 4, 5, 6],
    hour:  21, min: 45,
    title: 'Lectura nocturna 📖',
    body:  '15 minutos antes de dormir.',
  },
  {
    id:    'item_estudio',
    days:  [1],                       // Lunes: 10:15 PM
    hour:  22, min: 15,
    title: 'Bloque de estudio 📚',
    body:  '¿Completaste tu bloque de hoy?',
  },
  {
    id:    'item_estudio',
    days:  [0, 2, 3, 4, 5],          // Dom, Mar, Mié, Jue, Vie: 9 PM (Sábado no)
    hour:  21, min:  0,
    title: 'Bloque de estudio 📚',
    body:  '¿Completaste tu bloque de hoy?',
  },
]

// ── Helpers de zona horaria ───────────────────────────────────────
function chileNow() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Santiago' }))
}

function fmtDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function chileToday(now)    { return fmtDate(now) }

function chileTomorrow(now) {
  const d = new Date(now)
  d.setDate(d.getDate() + 1)
  return fmtDate(d)
}

function chileYesterday(now) {
  const d = new Date(now)
  d.setDate(d.getDate() - 1)
  return fmtDate(d)
}

// Lunes de la semana actual — misma convención que getWeekKey() en el frontend,
// usada para filtrar bloques de calendario no recurrentes por semana.
function chileWeekKey(now) {
  const d   = new Date(now)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return fmtDate(d)
}

// Retorna la fecha del domingo de esta semana (o anterior si hoy es lunes madrugada)
function lastSundayDate(now) {
  const d = new Date(now)
  d.setDate(d.getDate() - now.getDay()) // dow=0 → -0 (hoy); dow=1 → -1 (ayer = domingo)
  return fmtDate(d)
}

// True si el momento actual cae en [target, target + windowMins)
// El cron corre cada 30 min → ventana de 30 min garantiza que no se salta.
function inWindow(now, h, m, windowMins = 30) {
  const cur    = now.getHours() * 60 + now.getMinutes()
  const target = h * 60 + m
  return cur >= target && cur < target + windowMins
}

// Domingo ≥ 16:00 hasta lunes 01:30 (ventana de resumen semanal)
function inWeeklySummaryWindow(now) {
  const h = now.getHours(), m = now.getMinutes(), dow = now.getDay()
  return (dow === 0 && h >= 16) ||
         (dow === 1 && h === 0) ||
         (dow === 1 && h === 1 && m <= 30)
}

// ── Admin SDK init ────────────────────────────────────────────────
function ensureAdmin() {
  if (getApps().length > 0) return
  initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) })
}

// ── Dedup en Firestore (notif-log) ───────────────────────────────
async function alreadySent(db, uid, logId) {
  const snap = await db.collection('users').doc(uid)
    .collection('notif-log').doc(logId).get()
  return snap.exists
}

async function markSent(db, uid, logId) {
  await db.collection('users').doc(uid)
    .collection('notif-log').doc(logId)
    .set({ sentAt: new Date().toISOString() })
}

// ── Push helper (closure sobre tokens, fetched once) ─────────────
function makeSendPush(fcm, tokens) {
  return async function sendPush(title, body, data) {
    if (tokens.length === 0) return
    await Promise.allSettled(
      tokens.map(token => fcm.send({
        token,
        notification: { title, body },
        ...(data ? { data } : {}),
        webpush: {
          notification: { icon: '/logo.png', badge: '/logo.png' },
          fcmOptions:   { link: '/' },
        },
      }))
    )
  }
}

// ── Mensaje diario proactivo (IA) ─────────────────────────────────
// Junta contexto real (tareas, calendario, rachas, ayer) y le pide a
// Cerebras un mensaje corto y humano. Si la IA falla, cae a un mensaje
// de respaldo armado con los mismos datos (nunca queda sin mensaje).

async function buildDailyMessageContext(db, uid, now) {
  const today     = chileToday(now)
  const yesterday = chileYesterday(now)
  const dow       = now.getDay()
  const todayDia  = dow === 0 ? 6 : dow - 1 // 0=Lunes…6=Domingo, igual que el frontend
  const weekKey   = chileWeekKey(now)

  const [tareasSnap, bloquesSnap, gymSnap, streakSnap, pomoSnap, goalsCfgSnap, goalsYestSnap] = await Promise.all([
    db.collection('users').doc(uid).collection('tareas').get(),
    db.collection('users').doc(uid).collection('bloques').get(),
    db.collection('users').doc(uid).collection('gym-data').doc('stats').get(),
    db.collection('users').doc(uid).collection('settings').doc('day-complete-streak').get(),
    db.collection('users').doc(uid).collection('pomodoro-data').doc('stats').get(),
    db.collection('users').doc(uid).collection('settings').doc('daily-goals').get(),
    db.collection('users').doc(uid).collection('daily-goals').doc(yesterday).get(),
  ])

  const tareas      = tareasSnap.docs.map(d => d.data())
  const pendientes  = tareas.filter(t => !t.completada)
  const vencidas    = pendientes.filter(t => t.fecha && t.fecha < today)
  const hoyTareas   = pendientes.filter(t => t.fecha === today)
  const altaPrio    = pendientes.filter(t => t.prioridad === 'alta')

  const bloquesHoy = bloquesSnap.docs
    .map(d => d.data())
    .filter(b => b.dia === todayDia && (!b.semana || b.semana === weekKey))
    .sort((a, b) => (a.horaInicio || '').localeCompare(b.horaInicio || ''))

  const gymStreak    = gymSnap.exists ? (gymSnap.data().streak || 0) : 0
  const dayStreak     = streakSnap.exists ? streakSnap.data() : { streak: 0, lastCompleteDate: null }
  const pomoStreak    = pomoSnap.exists ? (pomoSnap.data().streak || 0) : 0

  const goalItems  = goalsCfgSnap.exists ? (goalsCfgSnap.data().items || []) : []
  const goalsYest  = goalsYestSnap.exists ? goalsYestSnap.data() : {}
  const doneYest   = goalItems.filter(g => goalsYest[g.id]).length
  const totalGoals = goalItems.length
  const completoAyer = dayStreak.lastCompleteDate === yesterday

  return {
    today, yesterday,
    tareasResumen: [
      vencidas.length ? `${vencidas.length} tarea(s) vencida(s)` : null,
      hoyTareas.length ? `${hoyTareas.length} tarea(s) vencen hoy: ${hoyTareas.slice(0, 3).map(t => t.titulo).join(', ')}` : null,
      altaPrio.length ? `${altaPrio.length} tarea(s) de alta prioridad pendiente(s)` : null,
      !vencidas.length && !hoyTareas.length && !altaPrio.length ? 'sin nada urgente pendiente' : null,
    ].filter(Boolean).join(' | ') || 'sin tareas pendientes',
    primeraTareaUrgente: (vencidas[0] || hoyTareas[0] || altaPrio[0])?.titulo || null,
    calendarioHoy: bloquesHoy.length
      ? bloquesHoy.map(b => `${b.horaInicio}-${b.horaFin} ${b.titulo}`).join(', ')
      : 'sin bloques agendados',
    huecoLibre: bloquesHoy.length <= 1,
    gymStreak, dayStreak: dayStreak.streak || 0, pomoStreak,
    completoAyer, doneYest, totalGoals,
  }
}

function fallbackDailyMessage(ctx) {
  const parts = ['Buenos días, Mateo.']
  if (ctx.primeraTareaUrgente) {
    parts.push(`Hoy es clave avanzar con "${ctx.primeraTareaUrgente}".`)
  } else {
    parts.push('No tenés nada urgente pendiente, buen día para avanzar tranquilo.')
  }
  if (ctx.huecoLibre) parts.push('Tenés bastante espacio libre en la agenda, aprovechalo.')
  if (ctx.completoAyer) parts.push('Ayer cerraste el día completo — seguí así.')
  parts.push('Aquí ando 💪')
  return parts.join(' ')
}

async function generateDailyMessage(ctx) {
  const key = process.env.CEREBRAS_API_KEY
  if (!key) return { text: fallbackDailyMessage(ctx), source: 'fallback' }

  const sysPrompt = `Sos el asistente personal de Mateo Berger, estudiante chileno de 4to medio preparando la PAES 2026. Cada mañana le dejás UN mensaje corto y humano antes de que abra la app — no es un chat, es una nota que te vas a comportar como si ya lo conocieras.

Datos reales de hoy (${ctx.today}):
- Tareas: ${ctx.tareasResumen}
- Calendario de hoy: ${ctx.calendarioHoy}
- Racha de gym: ${ctx.gymStreak} día(s) | Racha de días 100% completos: ${ctx.dayStreak} día(s) | Racha de bloques de estudio: ${ctx.pomoStreak} día(s)
- Ayer: ${ctx.completoAyer ? 'completó todas sus metas diarias' : ctx.totalGoals ? `completó ${ctx.doneYest}/${ctx.totalGoals} metas diarias` : 'sin datos de metas diarias'}

Reglas del mensaje:
- 2 a 4 frases, corto, directo, en español (vos/tenés, tono chileno-rioplatense natural).
- Tono de ALIADO cercano, nunca de capataz ni de coach genérico. No uses frases hechas de autoayuda.
- Basate en los datos reales de arriba — mencioná algo concreto (una tarea, un hueco libre, una racha), no generalidades vacías.
- Variá el estilo respecto a un mensaje típico: no empieces siempre igual, no repitas estructura de libro de fórmulas.
- Aproximadamente 1 de cada 3 veces (a tu criterio, con naturalidad), cerrá con una pregunta breve y genuina sobre cómo viene el día o algo puntual. El resto de las veces no preguntes nada, solo cerrá con una frase corta de aliento o un emoji suelto (nunca abuses de emojis, como mucho uno).
- Nunca uses saludo tipo "¡Buenos días!" con signos de exclamación exagerados. Ejemplo de tono (no lo copies literal): "Buenos días, Mateo. Hoy lo importante es la guía de física atrasada. Tenés la tarde libre, aprovechala. Aquí ando 💪"
- Devolvé SOLO el mensaje final, sin comillas, sin markdown, sin explicaciones.`

  try {
    const controller = new AbortController()
    const timeout    = setTimeout(() => controller.abort(), 7000)
    const res = await fetch('https://api.cerebras.ai/v1/chat/completions', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({
        model:       'gpt-oss-120b',
        max_tokens:  220,
        temperature: 0.9,
        messages: [
          { role: 'system', content: sysPrompt },
          { role: 'user',   content: 'Escribí el mensaje de hoy.' },
        ],
      }),
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout))

    if (!res.ok) throw new Error(`provider status ${res.status}`)
    const data = await res.json()
    const text = data.choices?.[0]?.message?.content?.trim()
    if (!text) throw new Error('respuesta vacía')
    return { text, source: 'ai' }
  } catch (err) {
    console.error('[check-reminders] daily message IA falló, usando fallback:', err.message)
    return { text: fallbackDailyMessage(ctx), source: 'fallback' }
  }
}

// ── Handler principal ─────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // Auth: verifica CRON_SECRET si está configurado
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && req.headers.authorization !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const uid = req.body?.uid || process.env.USER_UID
  if (!uid) return res.status(400).json({ error: 'uid requerido' })

  try {
    ensureAdmin()
    const db  = getFirestore()
    const fcm = getMessaging()
    const now  = chileNow()
    const dow  = now.getDay()  // 0=Dom … 6=Sáb
    const today = chileToday(now)
    const sent  = []

    // Fetch tokens once (usados por todas las reglas)
    const tokensSnap = await db.collection('users').doc(uid).collection('tokens').get()
    const tokens     = tokensSnap.docs.map(d => d.data().token).filter(Boolean)
    const sendPush   = makeSendPush(fcm, tokens)

    // ── REGLA 0: Mensaje diario proactivo (IA, ~7:30am) ────────
    if (inWindow(now, 7, 30, 30)) {
      const logId = `daily_message_${today}`
      if (!(await alreadySent(db, uid, logId))) {
        const dailyCtx = await buildDailyMessageContext(db, uid, now)
        const { text, source } = await generateDailyMessage(dailyCtx)

        await db.collection('users').doc(uid).collection('daily-message').doc(today).set({
          text, date: today, source, createdAt: new Date().toISOString(),
        })

        const pushBody = text.length > 160 ? text.slice(0, 157) + '…' : text
        await sendPush('☀️ Tu asistente te dejó un mensaje', pushBody, { type: 'daily_message' })
        await markSent(db, uid, logId)
        sent.push(logId)
      }
    }

    // ── REGLA 4: Hábitos diarios ──────────────────────────────
    const goalsSnap = await db.collection('users').doc(uid).collection('daily-goals').doc(today).get()
    const goalsData = goalsSnap.exists ? goalsSnap.data() : {}

    for (const h of HABIT_SCHEDULE) {
      if (!h.days.includes(dow)) continue
      if (!inWindow(now, h.hour, h.min)) continue
      if (goalsData[h.id]) continue               // ya marcado hoy → no molestar

      const logId = `habit_${h.id}_${today}`
      if (await alreadySent(db, uid, logId)) continue

      await sendPush(h.title, h.body)
      await markSent(db, uid, logId)
      sent.push(logId)
    }

    // ── REGLA 5: Gym — recordatorio 30 min antes de la sesión ──
    const gymSched = GYM_NOTIF[dow]
    if (gymSched && inWindow(now, gymSched.hour, gymSched.min)) {
      const logId = `gym_session_${today}`
      if (!(await alreadySent(db, uid, logId))) {
        await sendPush('🏋️ Gym en 30 minutos', '¡Prepárate para entrenar!')
        await markSent(db, uid, logId)
        sent.push(logId)
      }
    }

    // ── REGLA 6: Gym — racha rota (domingo 20:00–20:59) ────────
    if (dow === 0 && inWindow(now, 20, 0, 60)) {
      const gymStatsSnap = await db.collection('users').doc(uid)
        .collection('gym-data').doc('stats').get()
      const lastGymDate = gymStatsSnap.exists ? gymStatsSnap.data().lastGymDate : null
      const logId = `gym_racha_${lastSundayDate(now)}`

      if (lastGymDate && !(await alreadySent(db, uid, logId))) {
        const diffDays = Math.round(
          (new Date(today + 'T12:00:00') - new Date(lastGymDate + 'T12:00:00')) / 86400000
        )
        if (diffDays >= 3) {
          await sendPush(
            '💪 Mañana toca gym',
            `Llevas ${diffDays} días sin ir. ¡El lunes es el día!`
          )
          await markSent(db, uid, logId)
          sent.push(logId)
        }
      }
    }

    // ── REGLA 7: Resumen semanal (domingo ≥ 16h hasta lunes 01:30) ──
    if (inWeeklySummaryWindow(now)) {
      const logId = `resumen_semanal_${lastSundayDate(now)}`
      if (!(await alreadySent(db, uid, logId))) {
        const tareasSnap  = await db.collection('users').doc(uid).collection('tareas').get()
        const total       = tareasSnap.size
        const completadas = tareasSnap.docs.filter(d => d.data().completada).length
        const pendientes  = total - completadas

        const gymSnap    = await db.collection('users').doc(uid).collection('gym-data').doc('stats').get()
        const lastGym    = gymSnap.exists ? gymSnap.data().lastGymDate : null
        const gymEsSemana = lastGym && lastGym >= lastSundayDate(now)
        const gymMsg     = gymEsSemana ? 'Gym: ✓' : 'Gym: sin sesión'

        await sendPush(
          '📋 Resumen de la semana',
          `${completadas}/${total} tareas completadas · ${pendientes} pendientes · ${gymMsg}`
        )
        await markSent(db, uid, logId)
        sent.push(logId)
      }
    }

    // ── REGLAS 1 & 2: Tareas de alta prioridad ───────────────
    const tareasSnap = await db.collection('users').doc(uid).collection('tareas').get()
    const tareasAlta = tareasSnap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(t => t.prioridad === 'alta' && !t.completada && t.fecha)

    for (const t of tareasAlta) {
      // Regla 2: aviso en la mañana del día de vencimiento (primera ventana del día)
      if (t.fecha === today && inWindow(now, 8, 0, 30)) {
        const logId = `warn_${t.id}_${t.fecha}`
        if (!(await alreadySent(db, uid, logId))) {
          await sendPush('📌 Tarea vence hoy', `"${t.titulo}" tiene entrega hoy`)
          await markSent(db, uid, logId)
          sent.push(logId)
        }
      }

      // Regla 1: vencida — notificar una sola vez por tarea/fecha
      if (t.fecha < today) {
        const logId = `overdue_${t.id}_${t.fecha}`
        if (!(await alreadySent(db, uid, logId))) {
          await sendPush('⚠️ Tarea vencida', `"${t.titulo}" venció el ${t.fecha}`)
          await markSent(db, uid, logId)
          sent.push(logId)
        }
      }
    }

    return res.status(200).json({ ok: true, sent, count: sent.length, time: now.toISOString() })
  } catch (err) {
    console.error('[check-reminders]', err)
    return res.status(500).json({ error: err.message })
  }
}
