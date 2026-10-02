// Parte de la capa de datos (antes todo en lib/database.js, que hoy
// re-exporta estos módulos). Sección: users.
import { supabase } from '../supabase.js'
import { ROLE_PRECEDENCE } from '../roles.js'
// ═══════════════════════════════════════════════════════════
// DATABASE.JS — Capa Supabase centralizada (nueva schema)
// Todas las operaciones que tocan la base pasan por aquí.
// Tablas: profiles, user_roles, influencers, brands,
//         locations, activities, regions, countries, cities
// ═══════════════════════════════════════════════════════════

export const ALL_ECOS = ['resilio','creative','influencers','productora','elevare','gestion','captacion','dashboard']

export const AVATAR_COLORS = ['#8B5CF6','#EC4899','#06B6D4','#10B981','#F59E0B','#EF4444','#6366F1']
export const mkAvatar = (name = 'U') => {
  const parts = (name || 'U').trim().split(' ')
  const initials = parts.length >= 2 ? parts[0][0] + parts[parts.length-1][0] : parts[0].slice(0,2)
  return {
    initials: initials.toUpperCase(),
    color: AVATAR_COLORS[(name.charCodeAt(0) || 0) % 7],
  }
}

// UUID v4 test — distinguishes Postgres-generated UUIDs from frontend timestamp IDs
export const isUuid = (v) => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)

export const ROLE_PERMS = {
  super_admin:       { ecosistemas:[...ALL_ECOS], acciones:{ crear:true,editar:true,borrar:true,exportar:true,analytics:true,equipo:true } },
  network_direction: { ecosistemas:[...ALL_ECOS], acciones:{ crear:true,editar:true,borrar:true,exportar:true,analytics:true,equipo:true } },
  admin:             { ecosistemas:[...ALL_ECOS], acciones:{ crear:true,editar:true,borrar:true,exportar:true,analytics:true,equipo:false } },
  regional_lead:     { ecosistemas:['influencers'], acciones:{ crear:true,editar:true,borrar:false,exportar:true,analytics:true,equipo:true } },
  country_lead:      { ecosistemas:['influencers'], acciones:{ crear:true,editar:true,borrar:false,exportar:true,analytics:true,equipo:true } },
  city_lead:         { ecosistemas:['influencers'], acciones:{ crear:true,editar:true,borrar:false,exportar:true,analytics:true,equipo:true } },
  editor:            { ecosistemas:[], acciones:{ crear:true,editar:true,borrar:false,exportar:false,analytics:false,equipo:false } },
  viewer:            { ecosistemas:[], acciones:{ crear:false,editar:false,borrar:false,exportar:false,analytics:false,equipo:false } },
  custom:            { ecosistemas:[], acciones:{ crear:false,editar:false,borrar:false,exportar:false,analytics:false,equipo:false } },
  scouter:           { ecosistemas:['influencers'], acciones:{ crear:true,editar:true,borrar:false,exportar:false,analytics:false,equipo:false } },
}
export const getRolePermsDb = (rol) => {
  const p = ROLE_PERMS[rol] || ROLE_PERMS.viewer
  return { ecosistemas:[...p.ecosistemas], acciones:{...p.acciones} }
}

// ── Row → App object ────────────────────────────────────────
// profile: row from profiles table
// roles:   rows from user_roles (active)
export const rowToUser = (profile, roles = []) => {
  if (!profile) return null

  // Primary role: the active role with highest precedence
  const ROLE_ORDER = ROLE_PRECEDENCE
  const activeRoles = roles.filter(r => !r.revoked_at)
  const primaryRole = activeRoles.length
    ? ROLE_ORDER.find(r => activeRoles.some(ar => ar.role === r)) || activeRoles[0]?.role || 'viewer'
    : (profile.rol || 'viewer')

  const isSuperAdmin = primaryRole === 'super_admin' || primaryRole === 'admin'

  // Aggregate ecosistemas from all active role rows
  const ecos = isSuperAdmin
    ? [...ALL_ECOS]
    : [...new Set(activeRoles.flatMap(r => r.ecosistemas || getRolePermsDb(r.role).ecosistemas))]

  const rolePerms = getRolePermsDb(primaryRole)

  const av = mkAvatar(profile.nombre || profile.full_name || 'U')

  return {
    id:            profile.id,
    email:         profile.email || '',
    nombre:        profile.nombre || profile.full_name || '',
    username:      profile.username || (profile.email || '').split('@')[0] || '',
    sobrenombre:   profile.sobrenombre || '',
    avatar:        profile.avatar || av.initials,
    avatarColor:   profile.avatar_color || av.color,
    rol:           primaryRole,
    rolProfile:    profile.rol || null,
    estado:        profile.estado || 'pendiente',
    permisos: {
      ecosistemas: ecos,
      acciones: {
        crear:     isSuperAdmin || rolePerms.acciones.crear,
        editar:    isSuperAdmin || rolePerms.acciones.editar,
        borrar:    isSuperAdmin || rolePerms.acciones.borrar,
        exportar:  isSuperAdmin || rolePerms.acciones.exportar,
        analytics: isSuperAdmin || rolePerms.acciones.analytics,
        equipo:    primaryRole === 'super_admin' || rolePerms.acciones.equipo,
      },
    },
    roles: activeRoles.map(r => ({
      role:        r.role,
      scope:       r.scope       || 'global',
      scopeId:     r.scope_id    || null,
      ecosistemas: r.ecosistemas || [],
    })),
    notas_admin:       profile.notas_admin || '',
    ultimo_acceso:     profile.ultimo_acceso || null,
    fecha_registro:    profile.created_at || new Date().toISOString(),
    historial:         [],
    tareas_pendientes: [],
  }
}

// ── Fetch profile + roles for a given auth user id ──────────
export const fetchUserById = async (authId) => {
  const [{ data: profile, error: pErr }, { data: roles }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', authId).maybeSingle(),
    supabase.from('user_roles').select('*').eq('user_id', authId).is('revoked_at', null),
  ])
  if (pErr || !profile) return null
  return rowToUser(profile, roles || [])
}

// ═══════════════════════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════════════════════

export const dbGetCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  return fetchUserById(user.id)
}

export const dbLogin = async (email, _password) => {
  // signInWithPassword is called by App via onAuthStateChange — this path
  // is kept for components that call login() directly.
  const emailLc = email.toLowerCase().trim()
  const { data, error } = await supabase.auth.signInWithPassword({ email: emailLc, password: _password })
  if (error) {
    if (error.message?.toLowerCase().includes('invalid')) throw new Error('Email o contraseña incorrectos')
    throw new Error(error.message)
  }
  const user = await fetchUserById(data.user.id)
  if (!user) throw new Error('Email o contraseña incorrectos')
  if (user.estado === 'pendiente') throw new Error('pending')
  if (user.estado === 'bloqueado') throw new Error('blocked')
  if (user.estado === 'suspendido') throw new Error('Tu cuenta está suspendida. Contactá al administrador.')

  supabase.from('profiles').update({ ultimo_acceso: new Date().toISOString() }).eq('id', data.user.id).then(() => {})
  return user
}

export const dbRegister = async (nombre, email, password) => {
  const emailLc = email.toLowerCase().trim()

  const { data, error } = await supabase.auth.signUp({
    email: emailLc,
    password,
    options: {
      data: { nombre: nombre.trim() },
    },
  })

  if (error) {
    if (error.message?.toLowerCase().includes('already registered')) {
      return { success: false, error: 'Ya existe una cuenta con este email' }
    }
    return { success: false, error: error.message }
  }

  // Profile row is created by Supabase trigger on auth.users insert.
  // Update nombre/username/avatar in case the trigger only sets basic fields.
  if (data.user) {
    const av = mkAvatar(nombre.trim())
    await supabase.from('profiles').upsert([{
      id:          data.user.id,
      email:       emailLc,
      nombre:      nombre.trim(),
      username:    emailLc.split('@')[0],
      avatar:      av.initials,
      avatar_color: av.color,
      rol:         'viewer',
      estado:      'pendiente',
    }], { onConflict: 'id' })
  }

  return { success: true, pending: true }
}

export const dbGetUsers = async () => {
  const [{ data: profiles, error }, { data: allRoles }] = await Promise.all([
    supabase.from('profiles').select('*').order('created_at', { ascending: false }),
    supabase.from('user_roles').select('*'),
  ])
  if (error) throw error
  const rolesByUser = {}
  for (const r of allRoles || []) {
    if (!rolesByUser[r.user_id]) rolesByUser[r.user_id] = []
    rolesByUser[r.user_id].push(r)
  }
  return (profiles || []).map(p => rowToUser(p, rolesByUser[p.id] || []))
}

export const dbUpdateUser = async (id, changes) => {
  const cols = {}
  if (changes.nombre        !== undefined) cols.nombre        = changes.nombre
  if (changes.sobrenombre   !== undefined) cols.sobrenombre   = changes.sobrenombre
  if (changes.rol           !== undefined) cols.rol           = changes.rol
  if (changes.estado        !== undefined) cols.estado        = changes.estado
  if (changes.notas_admin   !== undefined) cols.notas_admin   = changes.notas_admin
  if (changes.ultimo_acceso !== undefined) cols.ultimo_acceso = changes.ultimo_acceso

  const { error } = await supabase.from('profiles').update(cols).eq('id', id)
  if (error) throw error
  return fetchUserById(id)
}

// Los ecosistemas REALES viven en user_roles.ecosistemas, no en profiles.
// Esto los reescribe en todas las filas activas del usuario.
export const dbSetUserEcosistemas = async (userId, ecosistemas) => {
  const { data: activas, error: qErr } = await supabase.from('user_roles')
    .select('id').eq('user_id', userId).is('revoked_at', null)
  if (qErr) throw qErr
  if (!activas || activas.length === 0) {
    throw new Error('Este usuario no tiene ningún rol activo. Asignale rol y ciudades primero con "Roles y ciudades".')
  }
  const { error } = await supabase.from('user_roles')
    .update({ ecosistemas })
    .eq('user_id', userId)
    .is('revoked_at', null)
  if (error) throw error
  return fetchUserById(userId)
}

export const dbApproveUser = async (userId, rol = 'viewer', opts = {}) => {
  const { scopeId = null, scopeIds = null, ecosistemas } = opts
  // Una Scouter NUNCA lleva alcance 'city' ni 'global': eso le abre toda
  // la ciudad (o la red). Va 'own' con la ciudad en scope_id, igual que
  // upsert_scouter(). Ver supabase/052_scouters_privados.sql.
  const scope = rol === 'scouter' ? 'own' : (opts.scope || 'global')
  const ecos = ecosistemas || getRolePermsDb(rol).ecosistemas

  // 1. Perfil: estado + rol
  const { error: pErr } = await supabase.from('profiles')
    .update({ estado: 'aprobado', rol })
    .eq('id', userId)
  if (pErr) throw pErr

  // 2. Revocar roles activos previos (columna real: revoked_at, no "active")
  const { error: revErr } = await supabase.from('user_roles')
    .update({ revoked_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('revoked_at', null)
  if (revErr) throw revErr

  // 3. Otorgar la(s) fila(s) de rol nueva(s).
  //    scope='city'/'country'/'region' con varios ids => una fila por id
  //    (app_visible_city_ids() ya las une todas). scope='global' => una sola fila.
  //
  //    OJO: user_roles tiene un UNIQUE sobre (user_id, role, scope, scope_id) que
  //    NO incluye revoked_at, así que una fila revocada sigue ocupando el lugar.
  //    Insertar a ciegas rompe con "duplicate key" al reasignar el mismo rol en la
  //    misma ciudad. Por eso: primero intentamos reactivar la fila existente y solo
  //    insertamos si no había ninguna.
  const idsList = scope === 'global'
    ? [null]
    : (scopeIds && scopeIds.length ? scopeIds : [scopeId])

  for (const id of idsList) {
    let q = supabase.from('user_roles')
      .update({ revoked_at: null, ecosistemas: ecos })
      .eq('user_id', userId).eq('role', rol).eq('scope', scope)
    q = id === null ? q.is('scope_id', null) : q.eq('scope_id', id)

    const { data: revived, error: upErr } = await q.select('id')
    if (upErr) throw upErr

    if (!revived || revived.length === 0) {
      const { error: insErr } = await supabase.from('user_roles').insert([{
        user_id:     userId,
        role:        rol,
        scope:       scope,
        scope_id:    id,
        ecosistemas: ecos,
      }])
      if (insErr) throw insErr
    }
  }

  // 4. Fila en scouters solo si el rol es scouter (columna real: status, no "active")
  if (rol === 'scouter') {
    const homeCityId = scopeId || (scopeIds && scopeIds[0]) || null
    if (homeCityId) {
      await supabase.from('scouters').upsert([{
        user_id: userId,
        city_id: homeCityId,
        status:  'active',
      }], { onConflict: 'user_id' })
    }
  }

  return fetchUserById(userId)
}

// Bloquear tiene que cortar el acceso en la BASE, no solo en la pantalla:
// los permisos salen de user_roles, que la base nunca cruza con
// profiles.estado. Por eso se revocan los roles (como en dbDeleteUser).
// Al desbloquear hay que volver a asignarle rol y ciudades.
export const dbBlockUser = async (id, motivo = '') => {
  const { error: revErr } = await supabase.from('user_roles')
    .update({ revoked_at: new Date().toISOString() })
    .eq('user_id', id)
    .is('revoked_at', null)
  if (revErr) throw revErr
  await supabase.from('scouters').update({ status: 'inactive' }).eq('user_id', id)
  const cols = { estado: 'bloqueado' }
  if (motivo) cols.notas_admin = motivo
  return dbUpdateUser(id, cols)
}

export const dbUnblockUser = async (id) => dbUpdateUser(id, { estado: 'aprobado' })

export const dbDeleteUser = async (id) => {
  // Real deletion requires service_role (Edge Function Phase 2).
  // Client path: revoke all roles + set estado bloqueado.
  // OJO: user_roles NO tiene columna "active" — la real es revoked_at.
  // Con {active:false} este update no revocaba nada y el usuario "desactivado"
  // conservaba todos sus permisos reales en la base.
  const { error: revErr } = await supabase.from('user_roles')
    .update({ revoked_at: new Date().toISOString() })
    .eq('user_id', id)
    .is('revoked_at', null)
  if (revErr) throw revErr

  // Si tenía fila en scouters, dejarla inactiva (update, no upsert: si no existe, no crea nada)
  await supabase.from('scouters').update({ status: 'inactive' }).eq('user_id', id)

  const { error: pErr } = await supabase.from('profiles')
    .update({ estado: 'bloqueado' }).eq('id', id)
  if (pErr) throw pErr

  return { success: true }
}

