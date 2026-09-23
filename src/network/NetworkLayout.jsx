import React, { useState, useEffect, useCallback, useRef } from 'react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { ChevronLeft, ChevronRight, LogOut, Bell, X, Plus } from 'lucide-react'
import { SPEED_DIAL_ITEMS } from './createOptions.js'
import { NAV_SECTIONS } from './nav.js'
import { t } from '../i18n/index.js'
import { dbGetNotifications } from '../lib/database.js'
import { signOut } from '../lib/auth.js'

const ENTITY_ROUTE = {
  influencer:    (id) => `/network/influencers/${id}`,
  brand:         (id) => `/network/brands/${id}`,
  opportunity:   (id) => `/network/opportunities/${id}`,
  collaboration: (id) => `/network/collaborations/${id}`,
}

function fmtAt(at) {
  if (!at) return ''
  const d = new Date(at)
  const now = new Date()
  const diffMs = now - d
  const diffH = Math.floor(diffMs / 3600000)
  if (diffH < 1)  return `${Math.max(1, Math.floor(diffMs/60000))}m`
  if (diffH < 24) return `${diffH}h`
  return `${Math.floor(diffH/24)}d`
}

function NotificationBell({ onNavigate }) {
  const [notifs,  setNotifs]  = useState([])
  const [open,    setOpen]    = useState(false)
  const [seen,    setSeen]    = useState(new Set())
  const panelRef = useRef(null)

  useEffect(() => {
    dbGetNotifications(3).then(setNotifs).catch(() => {})
  }, [])

  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleOpen = () => {
    setOpen(p => !p)
    setSeen(new Set(notifs.map(n => `${n.entityType}:${n.entityId}`)))
  }

  const unseen = notifs.filter(n => !seen.has(`${n.entityType}:${n.entityId}`)).length

  const handleClick = (n) => {
    const route = ENTITY_ROUTE[n.entityType]
    if (route && onNavigate) onNavigate(route(n.entityId))
    setOpen(false)
  }

  return (
    <div style={{ position:'relative' }} ref={panelRef}>
      <button
        onClick={handleOpen}
        style={{ position:'relative', background:'none', border:'none', cursor:'pointer', color: open ? 'var(--primary-violet-light)' : 'var(--text-secondary)', padding:6, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', transition:'color 0.15s' }}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--primary-violet-light)'}
        onMouseLeave={e => { if (!open) e.currentTarget.style.color = 'var(--text-secondary)' }}
      >
        <Bell size={16}/>
        {unseen > 0 && (
          <span style={{ position:'absolute', top:2, right:2, width:8, height:8, borderRadius:'50%', background:'#F87171', border:'2px solid var(--bg-secondary)', animation:'badgePulse 0.4s var(--ease-spring) 0.5s 2 both' }}/>
        )}
      </button>

      {open && (
        <div style={{ position:'absolute', top:'calc(100% + 6px)', right:0, width:300, background:'var(--bg-secondary)', border:'1px solid var(--border-violet)', borderRadius:12, boxShadow:'0 8px 32px rgba(0,0,0,0.35)', zIndex:200, overflow:'hidden' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', borderBottom:'1px solid var(--border-violet)' }}>
            <span style={{ fontSize:12, fontWeight:700, color:'var(--text-primary)' }}>{t('notifications.title')}</span>
            <button onClick={() => setOpen(false)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-secondary)', padding:2 }}><X size={14}/></button>
          </div>
          <div style={{ maxHeight:320, overflowY:'auto' }}>
            {notifs.length === 0 ? (
              <div style={{ padding:'24px 14px', textAlign:'center', fontSize:12, color:'var(--text-secondary)' }}>{t('notifications.empty')}</div>
            ) : (
              notifs.map((n, i) => {
                const isUnseen = !seen.has(`${n.entityType}:${n.entityId}`)
                const kindColor = n.isOverdue ? '#F87171' : n.kind === 'assigned' ? '#60A5FA' : '#FBBF24'
                return (
                  <button key={i} onClick={() => handleClick(n)}
                    style={{ width:'100%', textAlign:'left', padding:'10px 14px', background: isUnseen ? 'rgba(139,92,246,0.05)' : 'transparent', border:'none', borderBottom:'1px solid rgba(139,92,246,0.06)', cursor:'pointer', display:'block' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(139,92,246,0.08)'}
                    onMouseLeave={e => e.currentTarget.style.background = isUnseen ? 'rgba(139,92,246,0.05)' : 'transparent'}
                  >
                    <div style={{ display:'flex', alignItems:'flex-start', gap:8 }}>
                      <span style={{ fontSize:9, fontWeight:700, padding:'2px 6px', borderRadius:4, background:`${kindColor}18`, color:kindColor, border:`1px solid ${kindColor}30`, flexShrink:0, marginTop:1 }}>
                        {t(`notifications.kind.${n.kind}`)}
                      </span>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:12, fontWeight:600, color:'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{n.title}</div>
                        {n.subtitle && <div style={{ fontSize:11, color:'var(--text-secondary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{n.subtitle}</div>}
                      </div>
                      <span style={{ fontSize:10, color:'var(--text-secondary)', flexShrink:0 }}>{fmtAt(n.at)}</span>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── FAB de escritorio ───────────────────────────────────────
// En mobile el + vive en el bottom nav. En escritorio no existía
// ninguno: crear algo dependía de que la pantalla actual tuviera su
// propio botón, y Tareas, Calendario, Seguimiento, Notas, Command y
// Scouters no lo tienen. Desde acá se crea cualquier entidad estés
// donde estés.
//
// z-index 300: arriba del panel de notificaciones (200) y de la topbar
// (10), abajo del CreateSheet (400/401) para que el sheet lo tape.
function DesktopFab({ onOpenCreate }) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)
  const location = useLocation()

  useEffect(() => { setOpen(false) }, [location.pathname])

  useEffect(() => {
    if (!open) return
    const onKey  = (e) => { if (e.key === 'Escape') setOpen(false) }
    const onDown = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onDown)
    }
  }, [open])

  const select = (step) => { setOpen(false); onOpenCreate(step) }

  return (
    <div ref={wrapRef} style={{ position:'fixed', bottom:24, right:24, zIndex:300, display:'flex', flexDirection:'column', alignItems:'flex-end', gap:10 }}>
      {SPEED_DIAL_ITEMS.map((item, i) => {
        const delay = open ? i * 40 : (SPEED_DIAL_ITEMS.length - 1 - i) * 25
        return (
          <button
            key={item.step}
            tabIndex={open ? 0 : -1}
            onClick={() => select(item.step)}
            style={{
              display:'flex', alignItems:'center', gap:10,
              padding:'8px 14px 8px 9px', borderRadius:22, cursor:'pointer',
              background:'var(--bg-secondary)',
              border:`1px solid ${item.color}45`,
              boxShadow:'0 4px 24px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.05)',
              whiteSpace:'nowrap',
              opacity: open ? 1 : 0,
              transform: open ? 'translateY(0) scale(1)' : 'translateY(10px) scale(0.85)',
              pointerEvents: open ? 'auto' : 'none',
              transition: `opacity 200ms var(--ease-standard) ${delay}ms, transform 200ms var(--ease-spring) ${delay}ms`,
            }}
            onMouseEnter={e => e.currentTarget.style.background = `${item.color}18`}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
          >
            <div style={{ width:28, height:28, borderRadius:9, background:`${item.color}20`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <item.Icon size={14} color={item.color}/>
            </div>
            <span style={{ fontSize:12, fontWeight:600, color:item.color }}>{t(item.labelKey)}</span>
          </button>
        )
      })}

      <button
        onClick={() => setOpen(p => !p)}
        aria-label={t('create.selectType')}
        aria-expanded={open}
        title={t('create.selectType')}
        style={{
          width:52, height:52, borderRadius:'50%',
          background:'linear-gradient(135deg,var(--primary-violet-dark),var(--primary-violet))',
          border:'none', color:'white', cursor:'pointer',
          display:'flex', alignItems:'center', justifyContent:'center',
          boxShadow: open ? '0 0 32px rgba(139,92,246,0.7)' : '0 6px 24px rgba(0,0,0,0.4), 0 0 20px rgba(139,92,246,0.45)',
          transition:'box-shadow var(--dur-base)',
        }}
      >
        <Plus size={24} style={{ transition:'transform var(--dur-base) var(--ease-spring)', transform: open ? 'rotate(45deg)' : 'rotate(0deg)' }}/>
      </button>
    </div>
  )
}

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
              Resilio
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
          <button
            onClick={async () => { await signOut(); window.location.href = '/' }}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8, marginTop: 6, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#F87171', cursor: 'pointer', fontSize: 12, transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.15)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)' }}
          >
            <LogOut size={12}/>{t('layout.signOut')}
          </button>
        </div>
      )}
    </aside>
  )
}

export default function NetworkLayout({ currentUser, railContent, onOpenCreate }) {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('nw_sidebar_collapsed') === 'true')
  const navigate = useNavigate()

  const handleToggle = () => {
    setCollapsed(prev => {
      const next = !prev
      localStorage.setItem('nw_sidebar_collapsed', String(next))
      return next
    })
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <NetworkSidebar currentUser={currentUser} collapsed={collapsed} onToggle={handleToggle}/>

      {/* Workspace */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflowY: 'auto' }}>
        {/* Topbar */}
        <div style={{ height: 44, borderBottom: '1px solid var(--border-violet)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '0 16px', background: 'var(--bg-secondary)', flexShrink: 0, position: 'sticky', top: 0, zIndex: 10 }}>
          <NotificationBell onNavigate={navigate}/>
        </div>
        <Outlet/>
      </div>

      {/* Context Rail — el contenido lo inyecta cada página vía outlet context */}
      {railContent}

      {onOpenCreate && <DesktopFab onOpenCreate={onOpenCreate}/>}
    </div>
  )
}
