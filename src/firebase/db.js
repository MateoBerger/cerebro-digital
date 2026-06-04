import {
  collection, doc, getDocs, setDoc, updateDoc,
  deleteDoc, onSnapshot, serverTimestamp, writeBatch
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
