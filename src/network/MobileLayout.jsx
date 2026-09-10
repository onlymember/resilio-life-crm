import React, { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Home, CheckSquare, Plus, Users, MoreHorizontal, LogOut } from 'lucide-react'
import CreateSheet from './components/CreateSheet.jsx'
import { t } from '../i18n/index.js'
import { getDefaultRoute } from './routes.js'

const AVATAR_COLORS = ['#8B5CF6','#EC4899','#06B6D4','#10B981','#F59E0B','#EF4444','#6366F1']
const avatarColor = (name='') => AVATAR_COLORS[(name.charCodeAt(0)||0) % AVATAR_COLORS.length]
const initials = (name='') => {
  const p = (name||'').trim().split(' ')
  return p.length>=2?(p[0][0]+p[p.length-1][0]).toUpperCase():(name||'').slice(0,2).toUpperCase()||'?'
}

function MobileHeader({ currentUser }) {
  const [menuOpen, setMenuOpen] = useState(false)
  return (
    <header style={{ height: 52, background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-violet)', display: 'flex', alignItems: 'center', padding: '0 16px', position: 'sticky', top: 0, zIndex: 100 }}>
      <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1.5, background: 'linear-gradient(90deg,var(--primary-violet-light),var(--accent-magenta))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        RESILIO NETWORK
      </div>
      <div style={{ flex: 1 }}/>
      {currentUser && (
        <div style={{ position: 'relative' }}>
          <button onClick={() => setMenuOpen(p => !p)} style={{ width: 34, height: 34, borderRadius: '50%', background: avatarColor(currentUser.nombre||'U'), border: '2px solid rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'white', cursor: 'pointer' }}>
            {initials(currentUser.nombre||currentUser.username||'U')}
          </button>
          {menuOpen && (
            <>
              <div onClick={() => setMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 200 }}/>
              <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, background: 'var(--bg-secondary)', border: '1px solid var(--border-violet)', borderRadius: 12, overflow: 'hidden', zIndex: 201, minWidth: 160, boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
                <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-violet)', fontSize: 11, color: 'var(--text-secondary)' }}>
                  {currentUser.nombre || currentUser.username}
                </div>
                <button onClick={() => { window.location.href = '/' }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 12 }}>
                  <LogOut size={13}/>{t('layout.backToApp')}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </header>
  )
}

const NavBtn = ({ to, icon: Icon, label, exactActive }) => (
  <NavLink
    to={to}
    end={exactActive}
    style={({ isActive }) => ({
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
      padding: '6px 10px', flex: 1, textDecoration: 'none',
      color: isActive ? 'var(--primary-violet-light)' : 'var(--text-secondary)',
    })}
  >
    <Icon size={20}/>
    <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: 0.3 }}>{label}</span>
  </NavLink>
)

export default function MobileLayout({ currentUser, onCreated }) {
  const [createOpen, setCreateOpen] = useState(false)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)', paddingBottom: 64 }}>
      <MobileHeader currentUser={currentUser}/>

      <main style={{ flex: 1 }}>
        <Outlet/>
      </main>

      {/* Bottom Nav */}
      <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: 60, background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-violet)', display: 'flex', alignItems: 'center', zIndex: 100 }}>
        <NavBtn to="/network/home"   icon={Home}          label={t('nav.home')}   exactActive/>
        <NavBtn to="/network/tasks"  icon={CheckSquare}   label={t('nav.tasks')}/>

        {/* FAB central */}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <button
            onClick={() => setCreateOpen(true)}
            style={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg,var(--primary-violet-dark),var(--primary-violet))', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(139,92,246,0.5)', transform: 'translateY(-8px)', transition: 'all 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-10px) scale(1.05)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(-8px)'}
          >
            <Plus size={22}/>
          </button>
        </div>

        <NavBtn to="/network/influencers" icon={Users}         label={t('nav.influencers')}/>
        <NavBtn to="/network/command"     icon={MoreHorizontal} label={t('nav.more')}/>
      </nav>

      <CreateSheet
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        currentUser={currentUser}
        onCreated={onCreated}
      />
    </div>
  )
}
