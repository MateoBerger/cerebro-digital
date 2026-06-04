# cerebro.digital

Sistema de Vida Integral — Panel de control personal con sincronizacion en tiempo real.

## Stack

- React + Vite
- Firebase (Auth + Firestore)
- Mermaid.js
- Vercel (hosting)

## Estructura

```
src/
  firebase/
    config.js     ← credenciales Firebase
    db.js         ← funciones de base de datos
    defaults.js   ← variables y diagrama iniciales
  components/
    Topbar.jsx
    DiagramTab.jsx
    DictTab.jsx
    Statusbar.jsx
  pages/
    LoginPage.jsx
  App.jsx
  main.jsx
  index.css
```

## Desarrollo local

```bash
npm install
npm run dev
```

## Deploy en Vercel

1. Conectar este repositorio en vercel.com
2. Framework preset: **Vite**
3. Build command: `npm run build`
4. Output directory: `dist`
5. Deploy

## Firestore Rules

Copiar el contenido de `firestore.rules` en Firebase Console → Firestore → Reglas.
