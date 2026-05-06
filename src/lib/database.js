// ═══════════════════════════════════════════════════════════
// DATABASE.JS — Capa Supabase centralizada
// Todas las operaciones que tocan la base de datos pasan por aquí.
// ═══════════════════════════════════════════════════════════
import { supabase } from './supabase.js'

export const SUPER_ADMIN_EMAIL = 'lucajcazzoli@gmail.com'

const ALL_ECOS = ['resilio','creative','influencers','productora','elevare','gestion','captacion','dashboard']

const hashPwd = (p) => {
  try { return btoa(unescape(encodeURIComponent(p + '_rl26'))) }
  catch { return btoa(p + '_rl26') }
}

const AVATAR_COLORS = ['#8B5CF6','#EC4899','#06B6D4','#10B981','#F59E0B','#EF4444','#6366F1']
const mkAvatar = (name = 'U') => {
  const parts = name.trim().split(' ')
  const initials = parts.length >= 2 ? parts[0][0] + parts[parts.length-1][0] : parts[0].slice(0,2)
  return {
    initials: initials.toUpperCase(),
    color: AVATAR_COLORS[(name.charCodeAt(0) || 0) % 7],
  }
}

const ROLE_PERMS = {
  super_admin: { ecosistemas:[...ALL_ECOS], acciones:{ crear:true,editar:true,borrar:true,exportar:true,analytics:true,equipo:true } },
  admin:       { ecosistemas:[...ALL_ECOS], acciones:{ crear:true,editar:true,borrar:true,exportar:true,analytics:true,equipo:false } },
  editor:      { ecosistemas:[], acciones:{ crear:true,editar:true,borrar:false,exportar:false,analytics:false,equipo:false } },
  viewer:      { ecosistemas:[], acciones:{ crear:false,editar:false,borrar:false,exportar:false,analytics:false,equipo:false } },
  custom:      { ecosistemas:[], acciones:{ crear:false,editar:false,borrar:false,exportar:false,analytics:false,equipo:false } },
}
export const getRolePermsDb = (rol) => {
  const p = ROLE_PERMS[rol] || ROLE_PERMS.viewer
  return { ecosistemas:[...p.ecosistemas], acciones:{...p.acciones} }
}

// ── Row ↔ App object mapping ───────────────────────────────
const rowToUser = (row) => {
  if (!row) return null
  const isSuperAdmin = row.rol === 'super_admin' || row.rol === 'admin'
  return {
    id:            row.id,
    email:         row.email,
    password:      row.password,
    nombre:        row.nombre,
    username:      row.username || row.email?.split('@')[0] || '',
    sobrenombre:   row.sobrenombre || '',
    avatar:        row.avatar || mkAvatar(row.nombre).initials,
    avatarColor:   row.avatar_color || '#8B5CF6',
    rol:           row.rol || 'viewer',
    estado:        row.estado || 'pendiente',
    permisos: {
      ecosistemas: row.permisos_ecosistemas || (isSuperAdmin ? [...ALL_ECOS] : []),
      acciones: {
        crear:     isSuperAdmin || !!row.permiso_crear,
        editar:    isSuperAdmin || !!row.permiso_editar,
        borrar:    isSuperAdmin || !!row.permiso_borrar,
        exportar:  isSuperAdmin || !!row.permiso_exportar,
        analytics: isSuperAdmin || !!row.permiso_analytics,
        equipo:    row.rol === 'super_admin' || !!row.permiso_equipo,
      },
    },
    notas_admin:       row.notas_admin || '',
    ultimo_acceso:     row.ultimo_acceso || null,
    fecha_registro:    row.created_at || new Date().toISOString(),
    historial:         [],
    tareas_pendientes: [],
  }
}

const permissionsToDbCols = (permisos, rol) => {
  const isSA = rol === 'super_admin' || rol === 'admin'
  const acc = permisos?.acciones || {}
  return {
    permisos_ecosistemas: permisos?.ecosistemas || [],
    permiso_crear:    isSA ? true : !!acc.crear,
    permiso_editar:   isSA ? true : !!acc.editar,
    permiso_borrar:   isSA ? true : !!acc.borrar,
    permiso_exportar: isSA ? true : !!acc.exportar,
    permiso_analytics:isSA ? true : !!acc.analytics,
    permiso_equipo:   rol === 'super_admin' ? true : !!acc.equipo,
  }
}

// ═══════════════════════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════════════════════

export const dbRegister = async (nombre, email, password) => {
  const emailLc = email.toLowerCase().trim()
  const isSA    = emailLc === SUPER_ADMIN_EMAIL.toLowerCase()

  // Existing email check
  const { data: existing } = await supabase.from('users').select('id').eq('email', emailLc).maybeSingle()

  if (existing) {
    if (isSA) {
      // SA already in DB — fetch and return direct access
      const { data: saRow } = await supabase.from('users').select('*').eq('id', existing.id).single()
      return { success: true, user: rowToUser(saRow), directAccess: true }
    }
    return { success: false, error: 'Ya existe una cuenta con este email' }
  }

  const av = mkAvatar(nombre)
  const perms = getRolePermsDb(isSA ? 'super_admin' : 'viewer')
  const row = {
    email: emailLc,
    password: hashPwd(password),
    nombre: nombre.trim(),
    username: emailLc.split('@')[0],
    avatar: av.initials,
    avatar_color: av.color,
    rol: isSA ? 'super_admin' : 'viewer',
    estado: isSA ? 'aprobado' : 'pendiente',
    ...permissionsToDbCols(perms, isSA ? 'super_admin' : 'viewer'),
  }

  const { data, error } = await supabase.from('users').insert([row]).select().single()
  if (error) return { success: false, error: error.message }

  const user = rowToUser(data)
  return { success: true, user, directAccess: isSA, pending: !isSA }
}

export const dbLogin = async (email, password) => {
  const emailLc = email.toLowerCase().trim()
  const { data, error } = await supabase.from('users').select('*').eq('email', emailLc).maybeSingle()

  if (error || !data)              throw new Error('Email o contraseña incorrectos')
  if (hashPwd(password) !== data.password) throw new Error('Email o contraseña incorrectos')
  if (data.estado === 'pendiente') throw new Error('pending')
  if (data.estado === 'bloqueado') throw new Error('blocked')
  if (data.estado === 'suspendido') throw new Error('Tu cuenta está suspendida. Contactá al administrador.')

  supabase.from('users').update({ ultimo_acceso: new Date().toISOString() }).eq('id', data.id).then(() => {})
  return rowToUser(data)
}

export const dbGetUsers = async () => {
  const { data, error } = await supabase.from('users').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return (data || []).map(rowToUser)
}

export const dbUpdateUser = async (id, changes) => {
  const cols = {}
  if (changes.nombre       !== undefined) cols.nombre       = changes.nombre
  if (changes.sobrenombre  !== undefined) cols.sobrenombre  = changes.sobrenombre
  if (changes.rol          !== undefined) cols.rol          = changes.rol
  if (changes.estado       !== undefined) cols.estado       = changes.estado
  if (changes.password     !== undefined) cols.password     = changes.password
  if (changes.notas_admin  !== undefined) cols.notas_admin  = changes.notas_admin
  if (changes.ultimo_acceso!== undefined) cols.ultimo_acceso= changes.ultimo_acceso
  if (changes.permisos) {
    Object.assign(cols, permissionsToDbCols(changes.permisos, changes.rol || 'viewer'))
  }
  const { data, error } = await supabase.from('users').update(cols).eq('id', id).select().single()
  if (error) throw error
  return rowToUser(data)
}

export const dbApproveUser = async (id, rol = 'viewer') => {
  const perms = getRolePermsDb(rol)
  return dbUpdateUser(id, { estado: 'aprobado', rol, permisos: perms })
}

export const dbBlockUser = async (id, motivo = '') => {
  const updates = { estado: 'bloqueado' }
  if (motivo) updates.notas_admin = motivo
  return dbUpdateUser(id, updates)
}

export const dbUnblockUser = async (id) => dbUpdateUser(id, { estado: 'aprobado' })

export const dbDeleteUser = async (id) => {
  const { error } = await supabase.from('users').delete().eq('id', id)
  if (error) return { success: false, error: error.message }
  return { success: true }
}

// ═══════════════════════════════════════════════════════════
// ACTIVITY LOG
// ═══════════════════════════════════════════════════════════

export const dbLogActivity = async ({ userId, userName, accion, detalle, seccion }) => {
  try {
    await supabase.from('activity_log').insert([{
      user_id:   userId   || null,
      user_name: userName || '',
      action:    accion,
      detail:    detalle  || '',
      section:   seccion  || 'sistema',
    }])
  } catch (e) { /* fire-and-forget — never throw */ }
}

export const dbGetActivityLog = async (limit = 500) => {
  const { data } = await supabase.from('activity_log').select('*').order('created_at', { ascending: false }).limit(limit)
  return (data || []).map(r => ({
    id:             r.id,
    usuario_id:     r.user_id,
    usuario_nombre: r.user_name,
    accion:         r.action,
    detalle:        r.detail,
    seccion:        r.section,
    timestamp:      r.created_at,
  }))
}

// ═══════════════════════════════════════════════════════════
// MARCAS (JSONB flexible)
// ═══════════════════════════════════════════════════════════

export const dbGetBrands = async () => {
  const { data } = await supabase.from('crm_brands').select('data').order('created_at', { ascending: false })
  return (data || []).map(r => r.data).filter(Boolean)
}

export const dbSaveBrand = async (brand) => {
  const { error } = await supabase.from('crm_brands')
    .upsert([{ id: brand.id, data: brand, updated_at: new Date().toISOString() }], { onConflict: 'id' })
  if (error) throw error
  return brand
}

export const dbDeleteBrand = async (id) => {
  await supabase.from('crm_brands').delete().eq('id', id)
}

// ═══════════════════════════════════════════════════════════
// LOCALES (JSONB flexible)
// ═══════════════════════════════════════════════════════════

export const dbGetLocations = async () => {
  const { data } = await supabase.from('crm_locations').select('data').order('created_at', { ascending: false })
  return (data || []).map(r => r.data).filter(Boolean)
}

export const dbSaveLocation = async (location) => {
  const { error } = await supabase.from('crm_locations')
    .upsert([{
      id: location.id,
      brand_id: location.brandId || null,
      data: location,
      updated_at: new Date().toISOString(),
    }], { onConflict: 'id' })
  if (error) throw error
  return location
}

export const dbDeleteLocation = async (id) => {
  await supabase.from('crm_locations').delete().eq('id', id)
}

// ═══════════════════════════════════════════════════════════
// INFLUENCERS (JSONB flexible)
// ═══════════════════════════════════════════════════════════

export const dbGetInfluencers = async () => {
  const { data } = await supabase.from('crm_influencers').select('data').order('created_at', { ascending: false })
  return (data || []).map(r => r.data).filter(Boolean)
}

export const dbSaveInfluencer = async (inf) => {
  const { error } = await supabase.from('crm_influencers')
    .upsert([{ id: inf.id, data: inf, updated_at: new Date().toISOString() }], { onConflict: 'id' })
  if (error) throw error
  return inf
}

export const dbDeleteInfluencer = async (id) => {
  await supabase.from('crm_influencers').delete().eq('id', id)
}
