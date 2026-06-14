import React from 'react'
import { signOut } from 'firebase/auth'
import { auth } from '../firebase/config'

function Icon({ paths, size = 18, strokeWidth = 1.75 }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke="currentColor"
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
    >
      {paths.map((d, i) => <path key={i} d={d} />)}
    </svg>
  )
}

const ICONS = {
  home:       ['M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z', 'M9 22V12h6v10'],
  dashboard:  ['M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z'],
  tasks:      ['M9 11l3 3L22 4', 'M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11'],
  calendar:   ['M8 2v4M16 2v4M3 10h18', 'M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z'],
  paes:       ['M12 2a10 10 0 100 20 10 10 0 000-20z', 'M12 6a6 6 0 100 12 6 6 0 000-12z', 'M12 9a3 3 0 100 6 3 3 0 000-6z'],
  diagram:    ['M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98', 'M21 5a3 3 0 11-6 0 3 3 0 016 0z', 'M9 12a3 3 0 11-6 0 3 3 0 016 0z', 'M21 19a3 3 0 11-6 0 3 3 0 016 0z'],
  dictionary: ['M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z', 'M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z'],
  sun:        ['M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42', 'M12 6a6 6 0 000 12 6 6 0 000-12z'],
  moon:       ['M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z'],
  chevLeft:   ['M15 18l-6-6 6-6'],
  chevRight:  ['M9 18l6-6-6-6'],
  logout:     ['M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4', 'M16 17l5-5-5-5', 'M21 12H9'],
  asistente:  ['M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z'],
}

const NAV_MAIN = [
  { id: 'inicio',     label: 'Inicio',      icon: 'home' },
  { id: 'dashboard',  label: 'Dashboard',   icon: 'dashboard' },
  { id: 'tareas',     label: 'Tareas',       icon: 'tasks' },
  { id: 'calendario', label: 'Calendario',  icon: 'calendar' },
  { id: 'paes',       label: 'PAES',         icon: 'paes' },
  { id: 'asistente',  label: 'Asistente',    icon: 'asistente' },
]

const NAV_SYSTEM = [
  { id: 'diagram', label: 'Mapa del sistema', icon: 'diagram' },
  { id: 'dict',    label: 'Diccionario',      icon: 'dictionary' },
]

function NavItem({ item, active, onClick, collapsed }) {
  return (
    <button
      className={`nav-item${active ? ' active' : ''}`}
      onClick={() => onClick(item.id)}
      title={collapsed ? item.label : undefined}
    >
      <span className="nav-icon"><Icon paths={ICONS[item.icon]} /></span>
      <span className="nav-label">{item.label}</span>
    </button>
  )
}

export default function Sidebar({ collapsed, onToggle, activeTab, onTabChange, user, theme, onThemeToggle }) {
  return (
    <aside className={`sidebar${collapsed ? ' collapsed' : ''}`}>
      <div className="sidebar-logo">
        <img
          src="/logo.png"
          alt="SMGV"
          className="logo-mark"
          style={{ objectFit: 'contain', background: 'none' }}
        />
        <span className="logo-text">SMGV</span>
      </div>

      <nav className="sidebar-nav">
        {NAV_MAIN.map(item => (
          <NavItem key={item.id} item={item} active={activeTab === item.id} onClick={onTabChange} collapsed={collapsed} />
        ))}

        <div className="sidebar-divider" />
        <div className="nav-section-label">Sistema</div>

        {NAV_SYSTEM.map(item => (
          <NavItem key={item.id} item={item} active={activeTab === item.id} onClick={onTabChange} collapsed={collapsed} />
        ))}
      </nav>

      <div className="sidebar-footer">
        <button
          className="nav-item"
          onClick={onThemeToggle}
          title={collapsed ? (theme === 'dark' ? 'Modo claro' : 'Modo oscuro') : undefined}
        >
          <span className="nav-icon"><Icon paths={ICONS[theme === 'dark' ? 'sun' : 'moon']} /></span>
          <span className="nav-label">{theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}</span>
        </button>

        <button
          className="nav-item"
          onClick={() => signOut(auth)}
          title={collapsed ? 'Cerrar sesión' : undefined}
        >
          <span className="nav-icon"><Icon paths={ICONS.logout} /></span>
          <span className="nav-label">Cerrar sesión</span>
        </button>

        <div className="sidebar-user">
          <div className="user-avatar">M</div>
          <div className="user-info">
            <div className="user-name">Mateo Berger</div>
            <div className="user-email-small">{user?.email}</div>
          </div>
        </div>

        <button
          className="collapse-btn"
          onClick={onToggle}
          title={collapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
        >
          <Icon paths={ICONS[collapsed ? 'chevRight' : 'chevLeft']} size={16} />
        </button>
      </div>
    </aside>
  )
}
