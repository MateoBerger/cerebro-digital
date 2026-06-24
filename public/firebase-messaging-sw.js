importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey: "AIzaSyDDmMU3siO09lUoBdPVU5dQsOmc2zYIonU",
  authDomain: "cerebro-digital-39ef5.firebaseapp.com",
  projectId: "cerebro-digital-39ef5",
  storageBucket: "cerebro-digital-39ef5.firebasestorage.app",
  messagingSenderId: "110455411680",
  appId: "1:110455411680:web:96d08485b5c9bd908dd185",
})

const messaging = firebase.messaging()

messaging.onBackgroundMessage(payload => {
  const { title = 'Cerebro Digital', body = '' } = payload.notification || {}
  self.registration.showNotification(title, {
    body,
    icon: '/logo.png',
    badge: '/logo.png',
    data: payload.data || {},
  })
})
