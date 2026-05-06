// ═══════════════════════════════════════════════════════════
// AUTH.JS — Session, helpers y bridge a database.js
// Las operaciones de usuario son async (Supabase).
// La sesión local del navegador sigue en localStorage.
// ═══════════════════════════════════════════════════════════

export {
  SUPER_ADMIN_EMAIL,
  getRolePermsDb as getRolePerms,
  dbRegister  as register,
  dbLogin     as login,
  dbGetUsers  as getUsers,
  dbUpdateUser as updateUser,
  dbApproveUser as approveUser,
  dbBlockUser   as blockUser,
  dbUnblockUser as unblockUser,
  dbDeleteUser  as deleteUser,
  dbLogActivity as logActivity,
  dbGetActivityLog as getActivityLog,
} from './database.js'

const SESSION_TTL = 7 * 24 * 60 * 60 * 1000
const K = { session: 'auth_session', notifs: 'admin_notifications', config: 'system_config' }

// ── Helpers (sin cambios) ──────────────────────────────────
export const hashPwd = (p) => {
  try { return btoa(unescape(encodeURIComponent(p + '_rl26'))) }
  catch { return btoa(p + '_rl26') }
}
export const genId = () => `${Date.now()}_${Math.random().toString(36).slice(2,7)}`

const AVATAR_COLORS = ['#8B5CF6','#EC4899','#06B6D4','#10B981','#F59E0B','#EF4444','#6366F1']
export const getAvatar = (n = 'U') => {
  const p = (n || 'U').trim().split(' ')
  const i = p.length >= 2 ? p[0][0] + p[p.length-1][0] : p[0].slice(0,2)
  return { initials: i.toUpperCase(), color: AVATAR_COLORS[(n.charCodeAt(0)||0) % 7] }
}

export const timeAgo = (iso) => {
  if (!iso) return '-'
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'ahora'
  if (m < 60) return `hace ${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `hace ${h}h`
  const d = Math.floor(h / 24)
  if (d < 7)  return `hace ${d}d`
  return new Date(iso).toLocaleDateString('es-AR', { day:'2-digit', month:'short' })
}

// ── Role helpers ────────────────────────────────────────────
export const isAdmin     = (u) => u && (u.rol === 'super_admin' || u.rol === 'admin')
export const canDo       = (u, a) => !u ? false : (isAdmin(u) ? true : !!u.permisos?.acciones?.[a])
export const hasEcoAccess= (u, e) => !u ? false : (isAdmin(u) ? true : (u.permisos?.ecosistemas||[]).includes(e))

// ── Session (localStorage — local al navegador del usuario) ─
export const getSession = () => {
  try {
    const s = JSON.parse(localStorage.getItem(K.session) || 'null')
    if (s?.user && s.expiresAt > Date.now()) return s.user
    localStorage.removeItem(K.session)
    return null
  } catch { return null }
}
export const saveSession = (user) => {
  try {
    localStorage.setItem(K.session, JSON.stringify({ user, expiresAt: Date.now() + SESSION_TTL }))
  } catch {}
}
export const clearSession = () => { try { localStorage.removeItem(K.session) } catch {} }

// ── Admin Notifications (localStorage — solo para el admin local) ─
const addAdminNotif = ({ type, title, body, userId }) => {
  try {
    const notifs = getAdminNotifs()
    const n = { id: genId(), type, title, body, userId, read: false, timestamp: new Date().toISOString() }
    localStorage.setItem(K.notifs, JSON.stringify([n, ...notifs].slice(0, 100)))
  } catch {}
}
export const getAdminNotifs = () => {
  try { return JSON.parse(localStorage.getItem(K.notifs) || '[]') } catch { return [] }
}
export const markNotifRead = (id) => {
  const n = getAdminNotifs().map(x => x.id === id ? { ...x, read: true } : x)
  localStorage.setItem(K.notifs, JSON.stringify(n)); return n
}
export const markAllNotifsRead = () => {
  const n = getAdminNotifs().map(x => ({ ...x, read: true }))
  localStorage.setItem(K.notifs, JSON.stringify(n)); return n
}

// Helper used by LoginScreen to notify admin when a new user registers
export const notifyNewUser = (nombre, email, userId) => {
  addAdminNotif({ type:'new_user', title:'Nuevo usuario registrado', body:`${nombre} (${email}) espera aprobación`, userId })
}

// ── System Config ───────────────────────────────────────────
const DEFAULT_CFG = { empresa:'Resilio Life', mensajeBienvenida:'Bienvenido al sistema Resilio Life', version:'6.0', adminEmail:'lucajcazzoli@gmail.com' }
export const getSystemConfig = () => {
  try { return { ...DEFAULT_CFG, ...JSON.parse(localStorage.getItem(K.config)||'null') } } catch { return DEFAULT_CFG }
}
export const saveSystemConfig = (c) => { try { localStorage.setItem(K.config, JSON.stringify(c)) } catch {} }

// Legacy export for backward compat (unused but imported in some places)
export const saveUsers = () => {}
