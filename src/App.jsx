import React, { useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from './firebase/config'
import { useGCalToken } from './hooks/useGCalToken'
import LoginPage    from './pages/LoginPage'
import Sidebar      from './components/Sidebar'
import InicioTab    from './components/InicioTab'
import DashboardTab from './components/DashboardTab'
import DiagramTab   from './components/DiagramTab'
import DictTab      from './components/DictTab'
import TareasTab      from './components/TareasTab'
import CalendarioTab  from './components/CalendarioTab'
import PAESTab        from './components/PAESTab'
import AsistenteTab   from './components/AsistenteTab'
import FloatingChat   from './components/FloatingChat'
import NotifPrompt    from './components/NotifPrompt'
import IntroAnimation from './components/IntroAnimation'
import LoadingScreen  from './components/LoadingScreen'

function PlaceholderTab({ name }) {
  return (
    <div className="placeholder-page">
      <div style={{ fontSize: '44px', opacity: .15, marginBottom: '8px' }}>◎</div>
      <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text1)' }}>{name}</h2>
      <p style={{ color: 'var(--text2)', fontSize: '13px' }}>Disponible en la próxima etapa</p>
    </div>
  )
}

export default function App() {
  const [user, setUser]           = useState(undefined)
  const [showLoading, setShowLoading] = useState(true)
  const [tab, setTab]             = useState('inicio')
  const [sidebarOpen, setSidebar] = useState(true)
  const [theme, setTheme]         = useState(() => localStorage.getItem('cd-theme') || 'dark')
  const [info, setInfo]           = useState('')
  const { token: gcalToken, saveToken: saveGcalToken, handleTokenExpired: onGcalExpired } = useGCalToken()

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('cd-theme', theme)
  }, [theme])

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u)
      setTimeout(() => setShowLoading(false), 380)
    })
  }, [])


  if (showLoading) return <LoadingScreen fading={user !== undefined} />

  if (!user) return <LoginPage onGcalToken={saveGcalToken} />

  return (
    <>
    <IntroAnimation user={user} />
    <div className="app-shell">
      <Sidebar
        collapsed={!sidebarOpen}
        onToggle={() => setSidebar(s => !s)}
        activeTab={tab}
        onTabChange={setTab}
        user={user}
        theme={theme}
        onThemeToggle={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
      />
      <div className="app-content">
        <div key={tab} className="tab-enter">
          {tab === 'inicio'     && <InicioTab    uid={user.uid} gcalToken={gcalToken} onGcalExpired={onGcalExpired} />}
          {tab === 'dashboard'  && <DashboardTab uid={user.uid} onInfo={setInfo} />}
          {tab === 'diagram'    && <DiagramTab   uid={user.uid} onInfo={setInfo} />}
          {tab === 'dict'       && <DictTab      uid={user.uid} onInfo={setInfo} />}
          {tab === 'tareas'     && <TareasTab uid={user.uid} />}
          {tab === 'calendario' && <CalendarioTab uid={user.uid} gcalToken={gcalToken} onGcalToken={saveGcalToken} onGcalExpired={onGcalExpired} />}
          {tab === 'paes'       && <PAESTab uid={user.uid} />}
          {tab === 'asistente'  && <AsistenteTab uid={user.uid} />}
        </div>
      </div>
      {tab !== 'asistente' && <FloatingChat uid={user.uid} />}
      <NotifPrompt uid={user.uid} />
    </div>
    </>
  )
}
