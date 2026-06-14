import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
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

export const auth = getAuth(app)
export const db = getFirestore(app)
export const googleProvider = new GoogleAuthProvider()
googleProvider.addScope('https://www.googleapis.com/auth/calendar')
