import {
  collection, doc, getDoc, getDocs, setDoc, updateDoc,
  deleteDoc, onSnapshot, serverTimestamp, writeBatch, addDoc, query, orderBy, limit,
  arrayUnion,
} from 'firebase/firestore'
import { db } from './config'
import { DEFAULT_VARIABLES, DEFAULT_DIAGRAM } from './defaults'

// ── VARIABLES ────────────────────────────────────────────

export function subscribeVariables(uid, callback) {
  const ref = collection(db, 'users', uid, 'variables')
  return onSnapshot(ref, snap => {
    const vars = snap.docs.map(d => ({ firestoreId: d.id, ...d.data() }))
    callback(vars)
  })
}

export async function seedVariables(uid) {
  const ref = collection(db, 'users', uid, 'variables')
  const snap = await getDocs(ref)
  if (!snap.empty) return // already seeded

  const batch = writeBatch(db)
  DEFAULT_VARIABLES.forEach((v, i) => {
    const d = doc(ref, `var_${String(i).padStart(3, '0')}`)
    batch.set(d, { ...v, createdAt: serverTimestamp() })
  })
  await batch.commit()
}

export async function addVariable(uid, variable) {
  const ref = collection(db, 'users', uid, 'variables')
  const id = 'var_' + Date.now()
  await setDoc(doc(ref, id), { ...variable, createdAt: serverTimestamp() })
  return id
}

export async function updateVariable(uid, firestoreId, fields) {
  const ref = doc(db, 'users', uid, 'variables', firestoreId)
  await updateDoc(ref, { ...fields, updatedAt: serverTimestamp() })
}

export async function deleteVariable(uid, firestoreId) {
  await deleteDoc(doc(db, 'users', uid, 'variables', firestoreId))
}

// ── DIAGRAM ──────────────────────────────────────────────

export async function saveDiagram(uid, code) {
  await setDoc(doc(db, 'users', uid, 'settings', 'diagram'), {
    code,
    updatedAt: serverTimestamp()
  })
}

export function subscribeDiagram(uid, callback) {
  const ref = doc(db, 'users', uid, 'settings', 'diagram')
  return onSnapshot(ref, snap => {
    if (snap.exists()) {
      callback(snap.data().code)
    } else {
      callback(DEFAULT_DIAGRAM)
    }
  })
}

// ── CHECKINS ─────────────────────────────────────────────

export async function saveCheckin(uid, date, data) {
  await setDoc(doc(db, 'users', uid, 'checkins', date), {
    ...data,
    fecha: date,
    updatedAt: serverTimestamp(),
  })
}

export function subscribeCheckin(uid, date, callback) {
  const ref = doc(db, 'users', uid, 'checkins', date)
  return onSnapshot(ref, snap => {
    callback(snap.exists() ? snap.data() : null)
  })
}

export async function getCheckinsWeek(uid, dates) {
  const results = {}
  await Promise.all(dates.map(async date => {
    const snap = await getDoc(doc(db, 'users', uid, 'checkins', date))
    results[date] = snap.exists() ? snap.data() : null
  }))
  return results
}

// ── TAREAS ───────────────────────────────────────────────

export function subscribeTareas(uid, callback) {
  const ref = collection(db, 'users', uid, 'tareas')
  return onSnapshot(ref, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  })
}

export async function addTarea(uid, tarea) {
  const ref = collection(db, 'users', uid, 'tareas')
  const id  = 'tarea_' + Date.now()
  await setDoc(doc(ref, id), { ...tarea, completada: false, creadaEn: serverTimestamp() })
  return id
}

export async function updateTarea(uid, id, fields) {
  await updateDoc(doc(db, 'users', uid, 'tareas', id), { ...fields, actualizadaEn: serverTimestamp() })
}

export async function deleteTarea(uid, id) {
  await deleteDoc(doc(db, 'users', uid, 'tareas', id))
}

// ── BLOQUES (Calendario) ──────────────────────────────────

export function subscribeBloques(uid, callback) {
  const ref = collection(db, 'users', uid, 'bloques')
  return onSnapshot(ref, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  })
}

export async function getBloquesOnce(uid) {
  const ref  = collection(db, 'users', uid, 'bloques')
  const snap = await getDocs(ref)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function markBloquesMigrated(uid) {
  const ref  = collection(db, 'users', uid, 'bloques')
  const snap = await getDocs(ref)
  if (snap.empty) return
  const batch = writeBatch(db)
  snap.docs.forEach(d => {
    if (!d.data()._migrated) {
      batch.update(d.ref, { _migrated: true, _migratedAt: serverTimestamp() })
    }
  })
  await batch.commit()
}

export async function addBloque(uid, bloque) {
  const ref = collection(db, 'users', uid, 'bloques')
  const id  = 'bloque_' + Date.now()
  await setDoc(doc(ref, id), { ...bloque, creadaEn: serverTimestamp() })
  return id
}

export async function updateBloque(uid, id, fields) {
  await updateDoc(doc(db, 'users', uid, 'bloques', id), { ...fields, actualizadaEn: serverTimestamp() })
}

export async function deleteBloque(uid, id) {
  await deleteDoc(doc(db, 'users', uid, 'bloques', id))
}

// ── PAES ─────────────────────────────────────────────────

export function subscribePaesDoc(uid, docId, callback) {
  const ref = doc(db, 'users', uid, 'paes', docId)
  return onSnapshot(ref, snap => callback(snap.exists() ? snap.data() : {}))
}

export async function setPaesField(uid, docId, updates) {
  await setDoc(doc(db, 'users', uid, 'paes', docId), updates, { merge: true })
}

export function subscribeEnsayos(uid, callback) {
  const ref = collection(db, 'users', uid, 'ensayos')
  return onSnapshot(ref, snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
}

export async function addEnsayo(uid, ensayo) {
  const id = 'ensayo_' + Date.now()
  await setDoc(doc(db, 'users', uid, 'ensayos', id), { ...ensayo, creadaEn: serverTimestamp() })
}

export async function deleteEnsayo(uid, id) {
  await deleteDoc(doc(db, 'users', uid, 'ensayos', id))
}

// ── PAES v2 — STATS ───────────────────────────────────────
// users/{uid}/paes-data/stats  (4 segmentos → doc válido)

export function subscribePaesStats(uid, callback) {
  return onSnapshot(doc(db, 'users', uid, 'paes-data', 'stats'), snap => {
    callback(snap.exists() ? snap.data() : null)
  })
}

export async function updatePaesStats(uid, updates) {
  await setDoc(doc(db, 'users', uid, 'paes-data', 'stats'), updates, { merge: true })
}

// ── PAES v2 — VOCAB ───────────────────────────────────────
// users/{uid}/paes-data/vocab

export function subscribePaesVocab(uid, callback) {
  return onSnapshot(doc(db, 'users', uid, 'paes-data', 'vocab'), snap => {
    callback(snap.exists() ? snap.data() : null)
  })
}

export async function updatePaesVocab(uid, updates) {
  await setDoc(doc(db, 'users', uid, 'paes-data', 'vocab'), updates, { merge: true })
}

// ── PAES v2 — PROFILE ─────────────────────────────────────
// users/{uid}/paes-data/profile

export function subscribePaesProfile(uid, callback) {
  return onSnapshot(doc(db, 'users', uid, 'paes-data', 'profile'), snap => {
    callback(snap.exists() ? snap.data() : null)
  })
}

export async function updatePaesProfile(uid, updates) {
  await setDoc(doc(db, 'users', uid, 'paes-data', 'profile'), { ...updates, updatedAt: serverTimestamp() }, { merge: true })
}

// ── PAES v2 — HISTORY ─────────────────────────────────────
// users/{uid}/paes-history (collection)

export function subscribePaesHistory(uid, callback) {
  const q = query(collection(db, 'users', uid, 'paes-history'), orderBy('date', 'desc'), limit(20))
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  })
}

export async function addPaesHistory(uid, record) {
  return addDoc(collection(db, 'users', uid, 'paes-history'), {
    ...record,
    date: record.date || new Date().toISOString().slice(0, 10),
    creadoEn: serverTimestamp(),
  })
}

// ── PAES v2 — ERRORS ──────────────────────────────────────
// users/{uid}/paes-errors (collection)

export function subscribePaesErrors(uid, callback) {
  return onSnapshot(collection(db, 'users', uid, 'paes-errors'), snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  })
}

export async function addPaesError(uid, error) {
  return addDoc(collection(db, 'users', uid, 'paes-errors'), {
    ...error,
    resolved:  false,
    date:      new Date().toISOString().slice(0, 10),
    creadoEn:  serverTimestamp(),
  })
}

export async function updatePaesError(uid, id, fields) {
  await updateDoc(doc(db, 'users', uid, 'paes-errors', id), { ...fields, actualizadoEn: serverTimestamp() })
}

export async function deletePaesError(uid, id) {
  await deleteDoc(doc(db, 'users', uid, 'paes-errors', id))
}

// ── GYM STREAK ────────────────────────────────────────────
// users/{uid}/gym-data/stats

function gymLocalDate() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

export function subscribeGymStats(uid, callback) {
  return onSnapshot(doc(db, 'users', uid, 'gym-data', 'stats'), snap => {
    callback(snap.exists() ? snap.data() : { streak: 0, lastGymDate: null, totalSessions: 0 })
  })
}

export async function markGymSession(uid, currentStats) {
  const today = gymLocalDate()
  if (currentStats?.lastGymDate === today) return

  const d = new Date()
  d.setDate(d.getDate() - 1)
  const yesterday = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`

  const prevStreak = currentStats?.streak || 0
  const newStreak  = currentStats?.lastGymDate === yesterday ? prevStreak + 1 : 1

  await setDoc(doc(db, 'users', uid, 'gym-data', 'stats'), {
    streak:        newStreak,
    lastGymDate:   today,
    totalSessions: (currentStats?.totalSessions || 0) + 1,
  }, { merge: true })
}

// ── PAES v2 — EJERCICIOS (generados por IA) ───────────────
// users/{uid}/paes-ejercicios (collection)

export function subscribePaesEjercicios(uid, callback) {
  const q = query(collection(db, 'users', uid, 'paes-ejercicios'), orderBy('generadoEn', 'desc'), limit(50))
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  })
}

export async function addPaesEjercicio(uid, ejercicio) {
  return addDoc(collection(db, 'users', uid, 'paes-ejercicios'), {
    ...ejercicio,
    generadoEn: serverTimestamp(),
  })
}

// ── METAS DIARIAS ─────────────────────────────────────────
// users/{uid}/settings/daily-goals → { items: [{id, label}] }
// users/{uid}/daily-goals/{YYYY-MM-DD} → { [itemId]: boolean }

const DEFAULT_DAILY_GOALS_ITEMS = [
  { id: 'item_mercurio', label: 'Leer Mercurio' },
  { id: 'item_leer',     label: 'Leer 15 min' },
  { id: 'item_creatina', label: 'Tomar creatina' },
  { id: 'item_gym',      label: 'Ir al gym' },
  { id: 'item_estudio',  label: 'Bloque de estudio completado' },
  { id: 'item_preu',     label: 'Fui al preu' },
]

export function subscribeDailyGoalsConfig(uid, callback) {
  const ref = doc(db, 'users', uid, 'settings', 'daily-goals')
  let seeded = false
  return onSnapshot(ref, snap => {
    if (snap.exists()) {
      callback(snap.data().items || DEFAULT_DAILY_GOALS_ITEMS)
    } else if (!seeded) {
      seeded = true
      setDoc(ref, { items: DEFAULT_DAILY_GOALS_ITEMS })
      callback(DEFAULT_DAILY_GOALS_ITEMS)
    }
  })
}

export function subscribeDailyGoalsState(uid, date, callback) {
  return onSnapshot(doc(db, 'users', uid, 'daily-goals', date), snap => {
    callback(snap.exists() ? snap.data() : {})
  })
}

export async function toggleDailyGoal(uid, date, itemId, checked) {
  await setDoc(
    doc(db, 'users', uid, 'daily-goals', date),
    { [itemId]: checked },
    { merge: true },
  )
}

export async function addDailyGoalItem(uid, label) {
  const id  = 'item_' + Date.now()
  const ref = doc(db, 'users', uid, 'settings', 'daily-goals')
  await setDoc(ref, { items: arrayUnion({ id, label }) }, { merge: true })
  return id
}
