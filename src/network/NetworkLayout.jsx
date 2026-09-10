import React, { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, LogOut } from 'lucide-react'
import { NAV_SECTIONS } from './nav.js'
import { t } from '../i18n/index.js'

const AVATAR_COLORS = ['#8B5CF6','#EC4899','#06B6D4','#10B981','#F59E0B','#EF4444','#6366F1']
const avatarColor = (name = '') => AVATAR_COLORS[(name.charCodeAt(0)||0) % AVATAR_COLORS.length]
const initials = (name = '') => {
  const p = (name||'').trim().split(' ')
  return p.length>=2?(p[0][0]+p[p.length-1][0]).toUpperCase():(name||'').slice(0,2).toUpperCase()||'?'
}

function NetworkSidebar({ currentUser, collapsed, onToggle }) {
  const userRol = currentUser?.rol || ''

  return (
    <aside style={{
      width: collapsed ? 56 : 240, flexShrink: 0,
      background: 'var(--bg-secondary)',
      borderRight: '1px solid var(--border-violet)',
      display: 'flex', flexDirection: 'column',
      transition: 'width 0.25s ease', overflow: 'hidden',
      position: 'sticky', top: 0, height: '100vh',
    }}>
      {/* Logo */}
      <div style={{ padding: '18px 12px', borderBottom: '1px solid var(--border-violet)', display: 'flex', alignItems: 'center', gap: 10, minHeight: 64 }}>
        <div style={{ width: 32, height: 32, borderRadius: 10, flexShrink: 0, background: 'linear-gradient(135deg,var(--primary-violet),var(--accent-magenta))', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--glow-violet-sm)' }}>
          <img src="/logoresilio.png" alt="Resilio" style={{ width: 20, height: 20, objectFit: 'contain', filter: 'brightness(0) invert(1)' }}/>
        </div>
        {!collapsed && (
          <div style={{ overflow: 'hidden', flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.5, whiteSpace: 'nowrap', background: 'linear-gradient(90deg,var(--primary-violet-light),var(--accent-magenta))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              RESILIO NETWORK
            </div>
          </div>
        )}
        <button onClick={onToggle} style={{ marginLeft: 'auto', color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0, padding: 4, borderRadius: 6 }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--primary-violet-light)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
        >
          {collapsed ? <ChevronRight size={14}/> : <ChevronLeft size={14}/>}
        </button>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '10px 8px' }}>
        {NAV_SECTIONS.map((section, si) => {
          // Filtrar secciones y ítems por rol
          if (section.roles && !section.roles.includes(userRol)) return null
          const visibleItems = section.items.filter(item => !item.roles || item.roles.includes(userRol))
          if (!visibleItems.length) return null

          return (
            <div key={si} style={{ marginBottom: 6 }}>
              {!collapsed && (
                <div style={{ padding: '4px 8px 4px', fontSize: 9, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: 1.2, textTransform: 'uppercase', opacity: 0.7 }}>
                  {t(section.sectionKey)}
                </div>
              )}
              {visibleItems.map((item) => {
                const Icon = item.icon
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    title={collapsed ? t(item.labelKey) : undefined}
                    style={({ isActive }) => ({
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: collapsed ? '9px' : '8px 10px',
                      justifyContent: collapsed ? 'center' : 'flex-start',
                      borderRadius: 10, marginBottom: 2, transition: 'all 0.15s',
                      textDecoration: 'none',
                      background: isActive ? 'rgba(139,92,246,0.2)' : 'transparent',
                      color: isActive ? 'var(--primary-violet-light)' : 'var(--text-secondary)',
                      border: isActive ? '1px solid rgba(139,92,246,0.4)' : '1px solid transparent',
                      boxShadow: isActive ? 'var(--glow-violet-sm)' : 'none',
                    })}
                    onMouseEnter={e => { if (!e.currentTarget.dataset.active) { e.currentTarget.style.background = 'rgba(139,92,246,0.08)'; e.currentTarget.style.color = 'var(--text-primary)' } }}
                    onMouseLeave={e => { if (!e.currentTarget.dataset.active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)' } }}
                  >
                    <Icon size={16} style={{ flexShrink: 0 }}/>
                    {!collapsed && (
                      <>
                        <span style={{ fontSize: 13, fontWeight: 500, flex: 1, textAlign: 'left' }}>{t(item.labelKey)}</span>
                        {item.soon && (
                          <span style={{ fontSize: 9, fontWeight: 700, background: 'rgba(139,92,246,0.15)', color: 'var(--primary-violet-light)', padding: '1px 5px', borderRadius: 8, border: '1px solid var(--border-violet)', letterSpacing: 0.5 }}>
                            {t('soon')}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                )
              })}
            </div>
          )
        })}
      </nav>

      {/* User + exit */}
      {!collapsed && currentUser && (
        <div style={{ padding: '12px 12px', borderTop: '1px solid var(--border-violet)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', flexShrink: 0, background: avatarColor(currentUser.nombre||'U'), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'white' }}>
              {initials(currentUser.nombre||currentUser.username||'U')}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentUser.nombre||currentUser.username}</div>
              <div style={{ fontSize: 10, color: 'var(--primary-violet-light)', textTransform: 'capitalize' }}>{(currentUser.rol||'').replace('_',' ')}</div>
            </div>
          </div>
          <button
            onClick={() => { window.location.href = '/' }}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8, background: 'transparent', border: '1px solid var(--border-violet)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 12, transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(139,92,246,0.08)'; e.currentTarget.style.color = 'var(--text-primary)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)' }}
          >
            <LogOut size={12}/>{t('layout.backToApp')}
          </button>
        </div>
      )}
    </aside>
  )
}

export default function NetworkLayout({ currentUser, railContent }) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <NetworkSidebar currentUser={currentUser} collapsed={collapsed} onToggle={() => setCollapsed(p => !p)}/>

      {/* Workspace */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflowY: 'auto' }}>
        <Outlet/>
      </div>

      {/* Context Rail — el contenido lo inyecta cada página vía outlet context */}
      {railContent}
    </div>
  )
}
