// ═══════════════════════════════════════════════
// AUTH UTILITIES — Resilio Life CRM
// ═══════════════════════════════════════════════

export const SUPER_ADMIN_EMAIL = 'lucajcazzoli@gmail.com'

const K = {
  users:  'auth_users',
  session:'auth_session',
  log:    'activity_log',
  notifs: 'admin_notifications',
  config: 'system_config',
}

const SESSION_TTL = 7 * 24 * 60 * 60 * 1000

// ── Helpers ────────────────────────────────────
export const hashPwd = (p) => {
  try { return btoa(unescape(encodeURIComponent(p + '_rl26'))) }
  catch { return btoa(p + '_rl26') }
}
const verifyPwd = (p, h) => hashPwd(p) === h
export const genId = () => `${Date.now()}_${Math.random().toString(36).slice(2,7)}`

const AVATAR_COLORS = ['#8B5CF6','#EC4899','#06B6D4','#10B981','#F59E0B','#EF4444','#6366F1']
export const getAvatar = (n = 'U') => {
  const p = (n || 'U').trim().split(' ')
  const i = p.length >= 2 ? p[0][0] + p[p.length-1][0] : p[0].slice(0,2)
  return { initials: i.toUpperCase(), color: AVATAR_COLORS[(n.charCodeAt(0) || 0) % 7] }
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

// ── Role Permissions ───────────────────────────
const ALL_ECOS = ['resilio','creative','influencers','productora','elevare','gestion','captacion','dashboard']
const ALL_ACTIONS = { crear:true, editar:true, borrar:true, exportar:true, analytics:true, equipo:true }
const NO_ACTIONS  = { crear:false,editar:false,borrar:false,exportar:false,analytics:false,equipo:false }

const ROLE_PERMS = {
  super_admin:{ ecosistemas:[...ALL_ECOS], acciones:{...ALL_ACTIONS} },
  admin:      { ecosistemas:[...ALL_ECOS], acciones:{...ALL_ACTIONS, equipo:false} },
  editor:     { ecosistemas:[], acciones:{...NO_ACTIONS, crear:true, editar:true} },
  viewer:     { ecosistemas:[], acciones:{...NO_ACTIONS} },
  custom:     { ecosistemas:[], acciones:{...NO_ACTIONS} },
}
export const getRolePerms = (rol) => {
  const p = ROLE_PERMS[rol] || ROLE_PERMS.viewer
  return { ecosistemas:[...p.ecosistemas], acciones:{...p.acciones} }
}

// ── Default Super Admin ────────────────────────
const mkSuperAdmin = () => {
  const av = getAvatar('Luca Cazzoli')
  return {
    id:'sadmin-001', email:SUPER_ADMIN_EMAIL, nombre:'Luca Cazzoli', username:'lucajcazzoli',
    password:hashPwd('admin123'), avatar:av.initials, avatarColor:'#F59E0B',
    rol:'super_admin', estado:'aprobado', permisos:{ ecosistemas:[...ALL_ECOS], acciones:{...ALL_ACTIONS} },
    sobrenombre:'', ultimo_acceso:new Date().toISOString(), fecha_registro:new Date().toISOString(),
    historial:[], tareas_pendientes:[], notas_admin:''
  }
}

// ── User Storage ───────────────────────────────
export const getUsers = () => {
  try {
    let u = JSON.parse(localStorage.getItem(K.users) || 'null')
    if (!u || u.length === 0) {
      u = [mkSuperAdmin()]
      localStorage.setItem(K.users, JSON.stringify(u))
      return u
    }
    if (!u.find(x => x.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase())) {
      u = [mkSuperAdmin(), ...u]
      localStorage.setItem(K.users, JSON.stringify(u))
    }
    return u
  } catch { return [mkSuperAdmin()] }
}
export const saveUsers = (u) => { try { localStorage.setItem(K.users, JSON.stringify(u)) } catch {} }

// ── Session ────────────────────────────────────
export const getSession = () => {
  try {
    const s = JSON.parse(localStorage.getItem(K.session) || 'null')
    if (s?.user && s.expiresAt > Date.now()) return s.user
    localStorage.removeItem(K.session)
    return null
  } catch { return null }
}
export const saveSession = (user) => {
  try { localStorage.setItem(K.session, JSON.stringify({ user, expiresAt: Date.now() + SESSION_TTL })) } catch {}
}
export const clearSession = () => { try { localStorage.removeItem(K.session) } catch {} }

// ── Auth Operations ────────────────────────────
export const login = (email, password) => {
  const users = getUsers()
  const u = users.find(x => x.email.toLowerCase() === email.toLowerCase().trim())
  if (!u) return { success:false, error:'Email o contraseña incorrectos' }
  if (!verifyPwd(password, u.password)) return { success:false, error:'Email o contraseña incorrectos' }
  if (u.estado === 'pendiente')  return { success:false, error:'pending' }
  if (u.estado === 'bloqueado')  return { success:false, error:'blocked' }
  if (u.estado === 'suspendido') return { success:false, error:'Tu cuenta está suspendida. Contactá al administrador.' }
  const updated = users.map(x => x.id === u.id ? { ...x, ultimo_acceso:new Date().toISOString() } : x)
  saveUsers(updated)
  const fresh = updated.find(x => x.id === u.id)
  saveSession(fresh)
  logActivity({ userId:u.id, userName:u.nombre, accion:'login', detalle:'Inició sesión', seccion:'sistema' })
  return { success:true, user:fresh }
}

export const register = (nombre, email, password) => {
  const users = getUsers()
  if (users.find(u => u.email.toLowerCase() === email.toLowerCase().trim()))
    return { success:false, error:'Ya existe una cuenta con este email' }
  const isSA = email.toLowerCase().trim() === SUPER_ADMIN_EMAIL.toLowerCase()
  const av   = getAvatar(nombre)
  const newU = {
    id:genId(), email:email.toLowerCase().trim(), nombre:nombre.trim(), username:email.split('@')[0],
    password:hashPwd(password), avatar:av.initials, avatarColor:av.color,
    rol:isSA?'super_admin':'viewer', estado:isSA?'aprobado':'pendiente',
    permisos:isSA ? { ecosistemas:[...ALL_ECOS], acciones:{...ALL_ACTIONS} } : { ecosistemas:[], acciones:{...NO_ACTIONS} },
    sobrenombre:'', ultimo_acceso:new Date().toISOString(), fecha_registro:new Date().toISOString(),
    historial:[], tareas_pendientes:[], notas_admin:''
  }
  saveUsers([...users, newU])
  if (!isSA) {
    addAdminNotif({ type:'new_user', title:'Nuevo usuario registrado', body:`${nombre} (${email}) espera aprobación`, userId:newU.id })
  }
  if (isSA) {
    saveSession(newU)
    logActivity({ userId:newU.id, userName:newU.nombre, accion:'login', detalle:'Primer acceso como Super Admin', seccion:'sistema' })
    return { success:true, user:newU, directAccess:true }
  }
  return { success:true, user:newU, pending:true }
}

// ── Permissions ────────────────────────────────
export const hasEcoAccess = (user, eco) => {
  if (!user) return false
  if (user.rol === 'super_admin' || user.rol === 'admin') return true
  return (user.permisos?.ecosistemas || []).includes(eco)
}
export const canDo = (user, action) => {
  if (!user) return false
  if (user.rol === 'super_admin' || user.rol === 'admin') return true
  return user.permisos?.acciones?.[action] === true
}
export const isAdmin = (user) => user && (user.rol === 'super_admin' || user.rol === 'admin')

// ── Activity Log ───────────────────────────────
export const logActivity = ({ userId, userName, accion, detalle, seccion }) => {
  try {
    const log = getActivityLog()
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000
    const fresh = log.filter(e => new Date(e.timestamp).getTime() > cutoff)
    const entry = { id:genId(), usuario_id:userId, usuario_nombre:userName, accion, detalle, seccion:seccion||'sistema', timestamp:new Date().toISOString() }
    localStorage.setItem(K.log, JSON.stringify([entry, ...fresh].slice(0, 1000)))
  } catch {}
}
export const getActivityLog = () => {
  try { return JSON.parse(localStorage.getItem(K.log) || '[]') } catch { return [] }
}

// ── Admin Notifications ────────────────────────
const addAdminNotif = ({ type, title, body, userId }) => {
  try {
    const n    = getAdminNotifs()
    const notif = { id:genId(), type, title, body, userId, read:false, timestamp:new Date().toISOString() }
    localStorage.setItem(K.notifs, JSON.stringify([notif, ...n].slice(0, 100)))
  } catch {}
}
export const getAdminNotifs = () => {
  try { return JSON.parse(localStorage.getItem(K.notifs) || '[]') } catch { return [] }
}
export const markNotifRead = (id) => {
  const n = getAdminNotifs().map(x => x.id===id ? {...x,read:true} : x)
  localStorage.setItem(K.notifs, JSON.stringify(n)); return n
}
export const markAllNotifsRead = () => {
  const n = getAdminNotifs().map(x => ({...x,read:true}))
  localStorage.setItem(K.notifs, JSON.stringify(n)); return n
}

// ── System Config ──────────────────────────────
const DEFAULT_CFG = { empresa:'Resilio Life', mensajeBienvenida:'Bienvenido al sistema Resilio Life', version:'5.0', adminEmail:SUPER_ADMIN_EMAIL }
export const getSystemConfig = () => {
  try { return { ...DEFAULT_CFG, ...JSON.parse(localStorage.getItem(K.config)||'null') } } catch { return DEFAULT_CFG }
}
export const saveSystemConfig = (c) => { try { localStorage.setItem(K.config, JSON.stringify(c)) } catch {} }

// ── Admin User CRUD ────────────────────────────
export const approveUser = (userId, rol = 'viewer') => {
  const users = getUsers().map(u => u.id===userId ? { ...u, estado:'aprobado', rol, permisos:getRolePerms(rol) } : u)
  saveUsers(users); return users
}
export const blockUser = (userId, motivo = '') => {
  const users = getUsers().map(u => u.id===userId ? { ...u, estado:'bloqueado', notas_admin:motivo||u.notas_admin } : u)
  saveUsers(users); return users
}
export const unblockUser = (userId) => {
  const users = getUsers().map(u => u.id===userId ? { ...u, estado:'aprobado' } : u)
  saveUsers(users); return users
}
export const updateUser = (userId, changes) => {
  const users = getUsers().map(u => u.id===userId ? { ...u, ...changes } : u)
  saveUsers(users); return users
}
export const deleteUser = (userId) => {
  const u = getUsers().find(x => x.id===userId)
  if (u?.rol==='super_admin') return { success:false, error:'No se puede eliminar al Super Admin' }
  const users = getUsers().filter(x => x.id!==userId)
  saveUsers(users); return { success:true, users }
}
