// ═══════════════════════════════════════════════════════════
// AUTH.JS — Session, helpers y bridge a database.js
// La sesión es gestionada por Supabase Auth (JWT).
// ═══════════════════════════════════════════════════════════
import { supabase } from './supabase.js'

export {
  getRolePermsDb as getRolePerms,
  dbRegister     as register,
  dbLogin        as login,
  dbGetUsers     as getUsers,
  dbGetCurrentUser as getCurrentUser,
  dbUpdateUser   as updateUser,
  dbApproveUser  as approveUser,
  dbBlockUser    as blockUser,
  dbUnblockUser  as unblockUser,
  dbDeleteUser   as deleteUser,
  dbLogActivity  as logActivity,
  dbGetActivityLog as getActivityLog,
  dbGetGeography as getGeography,
} from './database.js'

// ── Supabase Auth wrappers ──────────────────────────────────
export const signOut = async () => {
  await supabase.auth.signOut()
}

export const requestPasswordReset = async (email) => {
  const { error } = await supabase.auth.resetPasswordForEmail(email.toLowerCase().trim(), {
    redirectTo: `${window.location.origin}${window.location.pathname}?reset=1`,
  })
  if (error) throw error
}

export const updatePassword = async (newPassword) => {
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw error
}

// ── Helpers ─────────────────────────────────────────────────
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

// ═══════════════════════════════════════════════════════════
// ACCESO POR VISTA
//
// ⚠️ ESTO NO ES SEGURIDAD. Es restricción de UX únicamente.
//
// La seguridad real la aplican las RLS policies de Supabase
// (via Supabase Auth JWT + helper functions en la DB).
// ═══════════════════════════════════════════════════════════

export const VIEW_ECOSYSTEM = {
  // General
  hub:'dashboard', dashboard:'dashboard',
  // Resilio Life
  rl_dashboard:'resilio', brands:'resilio', locations:'resilio', influencers:'resilio',
  benefits:'resilio', codes:'resilio', memberships:'resilio', users:'resilio',
  unregistered:'resilio', tracking:'resilio', analytics:'resilio', reports:'resilio',
  // Agencia Creativa
  creative:'creative', creative_projects:'creative', creative_clients:'creative',
  creative_equipo:'creative',
  // Agencia de Influencers (viewIds legacy: conservados para no romper RLS suite)
  inf_dashboard:'influencers', inf_campaigns:'influencers',
  inf_crm:'influencers', inf_collabs:'influencers',
  // RESILIO NETWORK (módulo nuevo con React Router)
  network:'influencers',
  // Productora
  prod_dashboard:'productora', events:'productora', tickets:'productora',
  only_members:'productora', rrpp:'productora',
  // Elevare
  elevare:'elevare', elevare_bienes:'elevare', elevare_leads:'elevare',
  elevare_contratos:'elevare', elevare_contenido:'elevare', elevare_hosp:'elevare',
  // Gestión
  missions:'gestion', team:'gestion', advanced:'gestion',
  // Captación
  cap_pipeline:'captacion', cap_busqueda:'captacion', cap_speeches:'captacion',
  cap_provincias:'captacion', cap_seguimiento:'captacion', cap_contactos:'captacion',
}

export const canAccessView = (u, viewId) => {
  if (!u) return false
  if (isAdmin(u)) return true
  const eco = VIEW_ECOSYSTEM[viewId]
  if (!eco) return false
  return hasEcoAccess(u, eco)
}

export const defaultViewFor = (u) => {
  if (!u) return 'dashboard'
  // Roles de Network aterrizan directamente en el módulo Network
  if (['scouter','network_direction','regional_lead','country_lead','city_lead'].includes(u.rol)) return 'network'
  if (canAccessView(u, 'hub')) return 'hub'
  const first = (u.permisos?.ecosistemas || [])
    .map(eco => Object.keys(VIEW_ECOSYSTEM).find(v => VIEW_ECOSYSTEM[v] === eco))
    .find(Boolean)
  return first || 'hub'
}

export const hasAnyAccess = (u) =>
  !!u && (isAdmin(u) || (u.permisos?.ecosistemas || []).length > 0)

// ── Admin Notifications (localStorage — solo para el admin local) ─
const K_NOTIFS = 'admin_notifications'

const addAdminNotif = ({ type, title, body, userId }) => {
  try {
    const notifs = getAdminNotifs()
    const n = { id: genId(), type, title, body, userId, read: false, timestamp: new Date().toISOString() }
    localStorage.setItem(K_NOTIFS, JSON.stringify([n, ...notifs].slice(0, 100)))
  } catch {}
}
export const getAdminNotifs = () => {
  try { return JSON.parse(localStorage.getItem(K_NOTIFS) || '[]') } catch { return [] }
}
export const markNotifRead = (id) => {
  const n = getAdminNotifs().map(x => x.id === id ? { ...x, read: true } : x)
  localStorage.setItem(K_NOTIFS, JSON.stringify(n)); return n
}
export const markAllNotifsRead = () => {
  const n = getAdminNotifs().map(x => ({ ...x, read: true }))
  localStorage.setItem(K_NOTIFS, JSON.stringify(n)); return n
}

export const notifyNewUser = (nombre, email, userId) => {
  addAdminNotif({ type:'new_user', title:'Nuevo usuario registrado', body:`${nombre} (${email}) espera aprobación`, userId })
}

// ── System Config ───────────────────────────────────────────
const K_CONFIG = 'system_config'
const DEFAULT_CFG = { empresa:'Resilio Life', mensajeBienvenida:'Bienvenido al sistema Resilio Life', version:'6.0', adminEmail:'lucajcazzoli@gmail.com' }
export const getSystemConfig = () => {
  try { return { ...DEFAULT_CFG, ...JSON.parse(localStorage.getItem(K_CONFIG)||'null') } } catch { return DEFAULT_CFG }
}
export const saveSystemConfig = (c) => { try { localStorage.setItem(K_CONFIG, JSON.stringify(c)) } catch {} }

// Legacy no-op for backward compat
export const saveUsers = () => {}
