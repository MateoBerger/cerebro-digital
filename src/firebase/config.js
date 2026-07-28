import { initializeApp } from 'firebase/app'
import {
  initializeAuth,
  browserLocalPersistence,
  browserPopupRedirectResolver,
  GoogleAuthProvider,
} from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyDDmMU3siO09lUoBdPVU5dQsOmc2zYIonU",
  authDomain: "cerebro-digital-39ef5.firebaseapp.com",
  projectId: "cerebro-digital-39ef5",
  storageBucket: "cerebro-digital-39ef5.firebasestorage.app",
  messagingSenderId: "110455411680",
  appId: "1:110455411680:web:96d08485b5c9bd908dd185"
}

const app = initializeApp(firebaseConfig)

// browserPopupRedirectResolver es obligatorio cuando se usa initializeAuth
// en lugar de getAuth; sin él, signInWithPopup falla silenciosamente.
export const auth = initializeAuth(app, {
  persistence: browserLocalPersistence,
  popupRedirectResolver: browserPopupRedirectResolver,
})
export const db = getFirestore(app)
export const googleProvider = new GoogleAuthProvider()
googleProvider.addScope('https://www.googleapis.com/auth/calendar')
// Solo lectura — nunca enviar, borrar ni modificar correos.
googleProvider.addScope('https://www.googleapis.com/auth/gmail.readonly')
// Sin esto, si el navegador ya tenía una sesión/consentimiento previo con
// Google, signInWithPopup puede reusarlo en silencio y devolver un token
// que sigue sin incluir un scope agregado recién (nunca llega a mostrarse
// la pantalla de permisos para el scope nuevo). 'consent' fuerza que Google
// siempre la muestre, así el usuario aprueba explícitamente cualquier scope
// que todavía no haya aceptado.
googleProvider.setCustomParameters({ prompt: 'consent' })
