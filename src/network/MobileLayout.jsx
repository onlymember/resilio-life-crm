import React, { useState, useEffect, useRef } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Home, CheckSquare, Plus, Users, Menu, X, LogOut, Bell } from 'lucide-react'
import CreateSheet from './components/CreateSheet.jsx'
import { NAV_SECTIONS } from './nav.js'
import { t } from '../i18n/index.js'
import { dbGetNotifications } from '../lib/database.js'

const ENTITY_ROUTE = {
  influencer:    (id) => `/network/influencers/${id}`,
  brand:         (id) => `/network/brands/${id}`,
  opportunity:   (id) => `/network/opportunities/${id}`,
  collaboration: (id) => `/network/collaborations/${id}`,
}

function fmtAt(at) {
  if (!at) return ''
  const diffH = Math.floor((Date.now() - new Date(at)) / 3600000)
  if (diffH < 1)  return `${Math.max(1, Math.floor((Date.now() - new Date(at)) / 60000))}m`
  if (diffH < 24) return `${diffH}h`
  return `${Math.floor(diffH / 24)}d`
}

function BellNavBtn() {
  const [notifs,    setNotifs]    = useState([])
  const [open,      setOpen]      = useState(false)
  const [seen,      setSeen]      = useState(new Set())
  const navigate = useNavigate()

  useEffect(() => {
    dbGetNotifications(3).then(setNotifs).catch(() => {})
  }, [])

  const unseen = notifs.filter(n => !seen.has(`${n.entityType}:${n.entityId}`)).length

  const handleOpen = () => {
    setOpen(true)
    setSeen(new Set(notifs.map(n => `${n.entityType}:${n.entityId}`)))
    document.body.style.overflow = 'hidden'
  }

  const handleClose = () => {
    setOpen(false)
    document.body.style.overflow = ''
  }

  const handleClick = (n) => {
    const route = ENTITY_ROUTE[n.entityType]
    if (route) navigate(route(n.entityId))
    handleClose()
  }

  return (
    <>
      <button
        onClick={handleOpen}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '6px 10px', flex: 1, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', position: 'relative' }}
      >
        <Bell size={20}/>
        {unseen > 0 && (
          <span style={{ position: 'absolute', top: 4, right: 'calc(50% - 14px)', minWidth: 16, height: 16, borderRadius: 8, background: '#F87171', border: '2px solid var(--bg-primary)', fontSize: 9, fontWeight: 700, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px' }}>
            {unseen > 9 ? '9+' : unseen}
          </span>
        )}
        <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: 0.3 }}>{t('notifications.title')}</span>
      </button>

      {open && (
        <>
          <div onClick={handleClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 300, backdropFilter: 'blur(2px)', WebkitBackdropFilter: 'blur(2px)' }}/>
          <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 301, background: 'var(--bg-secondary)', borderRadius: '20px 20px 0 0', border: '1px solid var(--border-violet)', borderBottom: 'none', maxHeight: '80vh', display: 'flex', flexDirection: 'column', animation: 'slideUp 0.2s ease' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px 12px', borderBottom: '1px solid var(--border-violet)', flexShrink: 0 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{t('notifications.title')}</span>
              <button onClick={handleClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 4 }}><X size={18}/></button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))' }}>
              {notifs.length === 0 ? (
                <div style={{ padding: '32px 20px', textAlign: 'center', fontSize: 13, color: 'var(--text-secondary)' }}>{t('notifications.empty')}</div>
              ) : (
                notifs.map((n, i) => {
                  const kindColor = n.isOverdue ? '#F87171' : n.kind === 'assigned' ? '#60A5FA' : '#FBBF24'
                  return (
                    <button key={i} onClick={() => handleClick(n)}
                      style={{ width: '100%', textAlign: 'left', padding: '12px 20px', background: 'none', border: 'none', borderBottom: '1px solid rgba(139,92,246,0.06)', cursor: 'pointer', display: 'block' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(139,92,246,0.06)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'none'}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                        <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: `${kindColor}18`, color: kindColor, border: `1px solid ${kindColor}30`, flexShrink: 0, marginTop: 2 }}>
                          {t(`notifications.kind.${n.kind}`)}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.title}</div>
                          {n.subtitle && <div style={{ fontSize: 11, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>{n.subtitle}</div>}
                        </div>
                        <span style={{ fontSize: 10, color: 'var(--text-secondary)', flexShrink: 0 }}>{fmtAt(n.at)}</span>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </div>
        </>
      )}
    </>
  )
}

const AVATAR_COLORS = ['#8B5CF6','#EC4899','#06B6D4','#10B981','#F59E0B','#EF4444','#6366F1']
const avatarColor = (name='') => AVATAR_COLORS[(name.charCodeAt(0)||0) % AVATAR_COLORS.length]
const initials = (name='') => {
  const p = (name||'').trim().split(' ')
  return p.length>=2?(p[0][0]+p[p.length-1][0]).toUpperCase():(name||'').slice(0,2).toUpperCase()||'?'
}

function MobileHeader({ currentUser, onOpenDrawer }) {
  const [menuOpen, setMenuOpen] = useState(false)
  return (
    <header style={{ height: 52, background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-violet)', display: 'flex', alignItems: 'center', padding: '0 12px', position: 'sticky', top: 0, zIndex: 100 }}>
      <button
        onClick={onOpenDrawer}
        aria-label="Menú"
        style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', flexShrink: 0, borderRadius: 8 }}
      >
        <Menu size={20}/>
      </button>

      <div style={{ flex: 1, textAlign: 'center', fontSize: 11, fontWeight: 800, letterSpacing: 1.5, background: 'linear-gradient(90deg,var(--primary-violet-light),var(--accent-magenta))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        RESILIO NETWORK
      </div>

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

function NavDrawer({ currentUser, onClose }) {
  const userRol = currentUser?.rol || ''

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 200, backdropFilter: 'blur(2px)', WebkitBackdropFilter: 'blur(2px)' }}
      />
      {/* Drawer */}
      <div style={{
        position: 'fixed', top: 0, left: 0, bottom: 0, width: 260, zIndex: 201,
        background: 'var(--bg-secondary)', borderRight: '1px solid var(--border-violet)',
        display: 'flex', flexDirection: 'column', overflowY: 'auto',
        animation: 'slideIn 0.2s ease',
      }}>
        {/* Drawer header */}
        <div style={{ height: 52, display: 'flex', alignItems: 'center', padding: '0 12px', borderBottom: '1px solid var(--border-violet)', flexShrink: 0 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg,var(--primary-violet),var(--accent-magenta))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <img src="/logoresilio.png" alt="Resilio" style={{ width: 16, height: 16, objectFit: 'contain', filter: 'brightness(0) invert(1)' }}/>
          </div>
          <div style={{ flex: 1, marginLeft: 10, fontSize: 11, fontWeight: 800, letterSpacing: 1.5, background: 'linear-gradient(90deg,var(--primary-violet-light),var(--accent-magenta))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            RESILIO NETWORK
          </div>
          <button onClick={onClose} style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', borderRadius: 8 }}>
            <X size={18}/>
          </button>
        </div>

        {/* Nav sections */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '8px 8px' }}>
          {NAV_SECTIONS.map((section, si) => {
            if (section.roles && !section.roles.includes(userRol)) return null
            const visibleItems = section.items.filter(item => !item.roles || item.roles.includes(userRol))
            if (!visibleItems.length) return null
            return (
              <div key={si} style={{ marginBottom: 4 }}>
                <div style={{ padding: '6px 8px 3px', fontSize: 9, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: 1.2, textTransform: 'uppercase', opacity: 0.7 }}>
                  {t(section.sectionKey)}
                </div>
                {visibleItems.map(item => {
                  const Icon = item.icon
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={onClose}
                      style={({ isActive }) => ({
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '9px 10px', borderRadius: 10, marginBottom: 2,
                        textDecoration: 'none', transition: 'all 0.15s',
                        background: isActive ? 'rgba(139,92,246,0.2)' : 'transparent',
                        color: isActive ? 'var(--primary-violet-light)' : 'var(--text-secondary)',
                        border: isActive ? '1px solid rgba(139,92,246,0.4)' : '1px solid transparent',
                      })}
                    >
                      <Icon size={16} style={{ flexShrink: 0 }}/>
                      <span style={{ fontSize: 13, fontWeight: 500, flex: 1 }}>{t(item.labelKey)}</span>
                      {item.soon && (
                        <span style={{ fontSize: 9, fontWeight: 700, background: 'rgba(139,92,246,0.15)', color: 'var(--primary-violet-light)', padding: '1px 5px', borderRadius: 8, border: '1px solid var(--border-violet)', letterSpacing: 0.5 }}>
                          {t('soon')}
                        </span>
                      )}
                    </NavLink>
                  )
                })}
              </div>
            )
          })}
        </nav>

        {/* User + exit */}
        {currentUser && (
          <div style={{ padding: '12px', borderTop: '1px solid var(--border-violet)', flexShrink: 0 }}>
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
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8, background: 'transparent', border: '1px solid var(--border-violet)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 12 }}
            >
              <LogOut size={12}/>{t('layout.backToApp')}
            </button>
          </div>
        )}
      </div>
    </>
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

export default function MobileLayout({ currentUser, onCreated, createOpen, onOpenCreate, onCloseCreate }) {
  const [drawerOpen, setDrawerOpen] = useState(false)

  const openDrawer = () => {
    setDrawerOpen(true)
    document.body.style.overflow = 'hidden'
  }

  const closeDrawer = () => {
    setDrawerOpen(false)
    document.body.style.overflow = ''
  }

  useEffect(() => () => { document.body.style.overflow = '' }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)', paddingBottom: 'calc(96px + env(safe-area-inset-bottom, 0px))' }}>
      <MobileHeader currentUser={currentUser} onOpenDrawer={openDrawer}/>

      {drawerOpen && <NavDrawer currentUser={currentUser} onClose={closeDrawer}/>}

      <main style={{ flex: 1 }}>
        <Outlet/>
      </main>

      {/* Bottom Nav with glassmorphism */}
      <nav className="nw-bottom-nav" style={{ position: 'fixed', bottom: 'calc(16px + env(safe-area-inset-bottom, 0px))', left: 16, right: 16, height: 64, display: 'flex', alignItems: 'center', zIndex: 100 }}>
        <NavBtn to="/network/home"   icon={Home}        label={t('nav.home')}        exactActive/>
        <NavBtn to="/network/tasks"  icon={CheckSquare} label={t('nav.tasks')}/>

        {/* FAB central */}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <button
            onClick={onOpenCreate}
            style={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg,var(--primary-violet-dark),var(--primary-violet))', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(139,92,246,0.5)', transform: 'translateY(-8px)', transition: 'all 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-10px) scale(1.05)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(-8px)'}
          >
            <Plus size={22}/>
          </button>
        </div>

        <NavBtn to="/network/influencers" icon={Users} label={t('nav.influencers')}/>
        <BellNavBtn/>
      </nav>

      <CreateSheet
        isOpen={createOpen}
        onClose={onCloseCreate}
        currentUser={currentUser}
        onCreated={onCreated}
      />
    </div>
  )
}
