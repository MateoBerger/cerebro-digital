import React, { useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from './firebase/config'
import LoginPage  from './pages/LoginPage'
import Topbar     from './components/Topbar'
import DiagramTab from './components/DiagramTab'
import DictTab    from './components/DictTab'
import Statusbar  from './components/Statusbar'

export default function App() {
  const [user, setUser]       = useState(undefined) // undefined = loading
  const [tab, setTab]         = useState('diagram')
  const [info, setInfo]       = useState('—')
  const [status, setStatus]   = useState('loading')

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => {
      setUser(u)
      setStatus(u ? 'ok' : 'ok')
    })
    return unsub
  }, [])

  // Loading splash
  if (user === undefined) {
    return (
      <div style={{
        height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg0)', fontFamily: "'IBM Plex Mono', monospace",
        fontSize: '11px', color: 'var(--text2)',
      }}>
        iniciando...
      </div>
    )
  }

  // Not logged in
  if (!user) return <LoginPage />

  // App
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Topbar
        activeTab={tab}
        onTabChange={setTab}
        info={info}
      />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {tab === 'diagram' && (
          <DiagramTab uid={user.uid} onInfo={setInfo} />
        )}
        {tab === 'dict' && (
          <DictTab uid={user.uid} onInfo={setInfo} />
        )}
      </div>

      <Statusbar
        status={status}
        info={info}
        user={user.email}
      />
    </div>
  )
}
