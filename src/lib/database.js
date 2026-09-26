// ═══════════════════════════════════════════════════════════
// DATABASE.JS — Capa Supabase centralizada (nueva schema)
// Todas las operaciones que tocan la base pasan por aquí.
// Tablas: profiles, user_roles, influencers, brands,
//         locations, activities, regions, countries, cities
// ═══════════════════════════════════════════════════════════
import { supabase } from './supabase.js'

const ALL_ECOS = ['resilio','creative','influencers','productora','elevare','gestion','captacion','dashboard']

const AVATAR_COLORS = ['#8B5CF6','#EC4899','#06B6D4','#10B981','#F59E0B','#EF4444','#6366F1']
const mkAvatar = (name = 'U') => {
  const parts = (name || 'U').trim().split(' ')
  const initials = parts.length >= 2 ? parts[0][0] + parts[parts.length-1][0] : parts[0].slice(0,2)
  return {
    initials: initials.toUpperCase(),
    color: AVATAR_COLORS[(name.charCodeAt(0) || 0) % 7],
  }
}

// UUID v4 test — distinguishes Postgres-generated UUIDs from frontend timestamp IDs
export const isUuid = (v) => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)

const ROLE_PERMS = {
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
const rowToUser = (profile, roles = []) => {
  if (!profile) return null

  // Primary role: the active role with highest precedence
  const ROLE_ORDER = ['super_admin','network_direction','admin','regional_lead','country_lead','city_lead','scouter','editor','viewer','custom']
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
  const { scope = 'global', scopeId = null, scopeIds = null, ecosistemas } = opts
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

export const dbBlockUser = async (id, motivo = '') => {
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

// ═══════════════════════════════════════════════════════════
// MAPEO ENTIDADES DE NEGOCIO
// ═══════════════════════════════════════════════════════════

const rowToCampaign = (r) => ({
  id:            r.id,
  brandId:       r.brand_id,
  opportunityId: r.opportunity_id,
  cityId:        r.city_id,
  countryId:     r.country_id,
  name:          r.name,
  description:   r.description,
  status:        r.status,
  budget:        r.budget,
  currency:      r.currency,
  agencyPct:     r.agency_pct,
  influencerPct: r.influencer_pct,
  startDate:     r.start_date,
  endDate:       r.end_date,
  ownerId:       r.owner_id,
  createdBy:     r.created_by,
  notes:         r.notes,
  createdAt:     r.created_at,
  updatedAt:     r.updated_at,
})

const rowToCampaignInfluencer = (r) => ({
  id:            r.id,
  campaignId:    r.campaign_id,
  influencerId:  r.influencer_id,
  assignedBy:    r.assigned_by,
  status:        r.status,
  rate:          r.rate,
  currency:      r.currency,
  deliverables:  r.deliverables || [],
  contentStatus: r.content_status,
  paymentStatus: r.payment_status,
  notes:         r.notes,
  createdAt:     r.created_at,
})

const rowToCollaboration = (r) => ({
  id:                   r.id,
  campaignId:           r.campaign_id,
  opportunityId:        r.opportunity_id      ?? null,
  brandId:              r.brand_id,
  influencerId:         r.influencer_id,
  scouterId:            r.scouter_id,
  cityId:               r.city_id,
  countryId:            r.country_id,
  status:               r.status,
  activationTypeId:     r.activation_type_id,
  startDate:            r.start_date,
  endDate:              r.end_date,
  deliverables:         r.deliverables        || [],
  contentStatus:        r.content_status,
  paymentStatus:        r.payment_status,
  amount:               r.amount,
  currency:             r.currency,
  results:              r.results             || {},
  notes:                r.notes,
  // 031 — próxima acción
  nextAction:           r.next_action         ?? null,
  nextActionAt:         r.next_action_at      ?? null,
  // 031 — documentos
  contractUrl:          r.contract_url        ?? null,
  invoiceUrl:           r.invoice_url         ?? null,
  // 031 — KPIs
  reach:                r.reach               ?? null,
  impressions:          r.impressions         ?? null,
  likes:                r.likes               ?? null,
  comments:             r.comments            ?? null,
  shares:               r.shares              ?? null,
  saves:                r.saves               ?? null,
  linkClicks:           r.link_clicks         ?? null,
  engagementRate:       r.engagement_rate     ?? null,
  estimatedMediaValue:  r.estimated_media_value ?? null,
  resultsNotes:         r.results_notes       ?? null,
  createdBy:            r.created_by,
  createdAt:            r.created_at,
  updatedAt:            r.updated_at,
})

const rowToActivationType = (r) => ({
  id:          r.id,
  code:        r.code,
  name:        r.name,
  description: r.description,
  color:       r.color,
  sortOrder:   r.sort_order,
})

const rowToActivity = (r) => ({
  id:          r.id,
  actorId:     r.actor_id,
  entityType:  r.entity_type,
  entityId:    r.entity_id,
  type:        r.type,
  title:       r.title,
  description: r.description,
  metadata:    r.metadata || {},
  occurredAt:  r.occurred_at,
  createdAt:   r.created_at,
})

const rowToTask = (r) => ({
  id:              r.id,
  templateId:      r.template_id,
  title:           r.title,
  description:     r.description,
  assignedTo:      r.assigned_to,
  createdBy:       r.created_by,
  entityType:      r.entity_type,
  entityId:        r.entity_id,
  type:            r.type,
  priority:        r.priority,
  status:          r.status,
  estadoEfectivo:  r.estado_efectivo || r.status,
  isOverdue:       r.is_overdue ?? (r.estado_efectivo === 'overdue'),
  dueDate:         r.due_date,
  completedAt:     r.completed_at,
  createdAt:       r.created_at,
})

const rowToGoal = (r) => ({
  id:              r.id,
  title:           r.title,
  description:     r.description,
  metric:          r.metric,
  target:          r.target,
  period:          r.period,
  periodStart:     r.period_start,
  periodEnd:       r.period_end,
  assignedTo:      r.assigned_to,
  cityId:          r.city_id,
  countryId:       r.country_id,
  regionId:        r.region_id,
  status:          r.status,
  currentProgress: r.current_progress,
  pct:             r.pct,
  createdBy:       r.created_by,
  createdAt:       r.created_at,
})

const rowToMission = (r) => ({
  id:           r.id,
  title:        r.title,
  description:  r.description,
  type:         r.type,
  metric:       r.metric,
  target:       r.target,
  cityId:       r.city_id,
  startsAt:     r.starts_at,
  endsAt:       r.ends_at,
  rewardPoints: r.reward_points,
  status:       r.status,
  createdBy:    r.created_by,
  createdAt:    r.created_at,
})

// ═══════════════════════════════════════════════════════════
// CAMPAIGNS
// ═══════════════════════════════════════════════════════════

export const dbGetCampaigns = async (filters = {}) => {
  let q = supabase.from('campaigns')
    .select('*, campaign_influencers(influencer_id)')
    .not('status', 'eq', 'archived')
    .order('created_at', { ascending: false })
  if (filters.status)  q = q.eq('status', filters.status)
  if (filters.ownerId) q = q.eq('owner_id', filters.ownerId)
  const { data, error } = await q
  if (error) throw friendly(error)
  return (data || []).map(r => ({
    ...rowToCampaign(r),
    influencerIds: (r.campaign_influencers || []).map(ci => ci.influencer_id),
  }))
}

export const dbSaveCampaign = async (camp, userId) => {
  const uid = userId || await myId()
  if (!uid) throw new Error('Sesión expirada. Volvé a entrar.')

  // influencerIds === null → caller manages campaign_influencers individually
  const { influencerIds = null, id, brandName, ...rest } = camp
  const row = {
    brand_id:       rest.brandId       || null,
    opportunity_id: rest.opportunityId || null,
    name:           (rest.name || '').trim() || 'Sin nombre',
    description:    rest.description   || null,
    status:         rest.status        || 'planning',
    budget:         Number(rest.budget) || null,
    currency:       rest.currency      || null,
    agency_pct:     Number(rest.agencyPct)     || 20,
    influencer_pct: Number(rest.influencerPct) || 80,
    start_date:     rest.startDate || null,
    end_date:       rest.endDate   || null,
    notes:          rest.notes     || null,
  }

  let campaignId
  if (isUuid(id)) {
    const { data, error } = await supabase.from('campaigns')
      .update(row).eq('id', id).select('id').single()
    if (error) throw friendly(error)
    campaignId = data.id

    if (influencerIds !== null) {
      const { data: existing } = await supabase.from('campaign_influencers')
        .select('influencer_id').eq('campaign_id', campaignId)
      const existingSet = new Set((existing || []).map(r => r.influencer_id))
      const selectedSet = new Set(influencerIds)

      const toRemove = [...existingSet].filter(x => !selectedSet.has(x))
      const toAdd    = [...selectedSet].filter(x => !existingSet.has(x))

      if (toRemove.length > 0) {
        await supabase.from('campaign_influencers')
          .delete().eq('campaign_id', campaignId).in('influencer_id', toRemove)
      }
      if (toAdd.length > 0) {
        const inserts = toAdd.map(infId => ({
          campaign_id: campaignId, influencer_id: infId, assigned_by: uid, status: 'proposed',
        }))
        const { error: ciErr } = await supabase.from('campaign_influencers').insert(inserts)
        if (ciErr && ciErr.code !== '23505') throw friendly(ciErr)
      }
    }
  } else {
    const { data, error } = await supabase.from('campaigns')
      .insert([{ ...row, created_by: uid, owner_id: uid }]).select('id').single()
    if (error) throw friendly(error)
    campaignId = data.id

    if (influencerIds !== null && influencerIds.length > 0) {
      const inserts = influencerIds.map(infId => ({
        campaign_id: campaignId, influencer_id: infId, assigned_by: uid, status: 'proposed',
      }))
      const { error: ciErr } = await supabase.from('campaign_influencers').insert(inserts)
      if (ciErr && ciErr.code !== '23505') throw friendly(ciErr)
    }
  }

  const { data: full, error: fErr } = await supabase.from('campaigns')
    .select('*, campaign_influencers(influencer_id)').eq('id', campaignId).single()
  if (fErr) throw friendly(fErr)
  return {
    ...rowToCampaign(full),
    influencerIds: (full.campaign_influencers || []).map(ci => ci.influencer_id),
  }
}

// ═══════════════════════════════════════════════════════════
// OPPORTUNITIES
// ═══════════════════════════════════════════════════════════

const rowToOpportunity = (r) => ({
  id:          r.id,
  title:       r.title,
  description: r.description  ?? null,
  source:      r.source       ?? null,
  brandId:     r.brand_id,
  scouterId:   r.owner_scouter_id,
  cityId:      r.city_id,
  countryId:   r.country_id,
  status:      r.status,
  value:       r.estimated_value,
  currency:    r.currency,
  lostReason:  r.lost_reason  ?? null,
  notes:       r.notes,
  createdBy:   r.created_by,
  createdAt:   r.created_at,
  updatedAt:   r.updated_at,
  // 020_crm_fields
  nextAction:   r.next_action   ?? null,
  nextActionAt: r.next_action_at ?? null,
})

// Paginada — Network. Siempre devuelve { rows, total, hasMore }.
export const dbGetOpportunities = async ({
  page = 0, pageSize = 30,
  search, status, brandId, cityId, ownerId,
  orderBy = 'created_at', orderDir = 'desc',
} = {}) => {
  let q = supabase.from('opportunities')
    .select('*', { count: 'exact' })
    .order(orderBy, { ascending: orderDir === 'asc' })
    .range(page * pageSize, (page + 1) * pageSize - 1)
  if (status)  q = q.eq('status', status)
  if (brandId) q = q.eq('brand_id', brandId)
  if (cityId)  q = q.eq('city_id', cityId)
  if (ownerId) q = q.eq('owner_scouter_id', ownerId)
  if (search)  q = q.ilike('title', `%${search}%`)
  const { data, count, error } = await q
  if (error) throw friendly(error)
  const rows = (data || []).map(rowToOpportunity)
  return { rows, total: count ?? 0, hasMore: (count ?? 0) > (page + 1) * pageSize }
}

export const dbSaveOpportunity = async (opp, userId) => {
  const uid = userId || await myId()
  if (!uid) throw new Error('Sesión expirada. Volvé a entrar.')
  const { id, ...rest } = opp
  const row = {
    title:            (rest.title || '').trim() || 'Sin título',
    description:      rest.description  || null,
    source:           rest.source       || null,
    brand_id:         rest.brandId      || null,
    city_id:          rest.cityId       || null,
    country_id:       rest.countryId    || null,
    status:           rest.status       || 'new',
    estimated_value:  Number(rest.value) || null,
    currency:         rest.currency     || null,
    lost_reason:      rest.lostReason   || null,
    notes:            rest.notes        || null,
  }
  if (isUuid(id)) {
    const { data, error } = await supabase.from('opportunities')
      .update(row).eq('id', id).select('*').single()
    if (error) throw friendly(error)
    return rowToOpportunity(data)
  }
  const { data, error } = await supabase.from('opportunities')
    .insert([{ ...row, created_by: uid, owner_scouter_id: uid }]).select('*').single()
  if (error) throw friendly(error)
  return rowToOpportunity(data)
}

export const dbPatchOpportunity = async (id, patch) => {
  const FIELD_MAP = {
    title:       'title',
    description: 'description',
    source:      'source',
    brandId:     'brand_id',
    cityId:      'city_id',
    countryId:   'country_id',
    status:      'status',
    value:       'estimated_value',
    currency:    'currency',
    lostReason:  'lost_reason',
    notes:       'notes',
    nextAction:  'next_action',
    nextActionAt:'next_action_at',
  }
  const row = {}
  for (const [camel, snake] of Object.entries(FIELD_MAP)) {
    if (camel in patch) row[snake] = patch[camel]
  }
  if (Object.keys(row).length === 0) return
  const { error } = await supabase.from('opportunities').update(row).eq('id', id)
  if (error) throw friendly(error)
}

// Soft delete: status='archived' (invisible en dbGetCampaigns)
// RLS: pasa por camp_update (dueño o Direction), más permisivo que camp_delete.
export const dbDeleteCampaign = async (id) => {
  const { error } = await supabase.from('campaigns').update({ status: 'archived' }).eq('id', id)
  if (error) throw friendly(error)
}

export const dbGetCampaignInfluencers = async (campaignId) => {
  const { data, error } = await supabase.from('campaign_influencers')
    .select('*').eq('campaign_id', campaignId).order('created_at')
  if (error) throw friendly(error)
  return (data || []).map(rowToCampaignInfluencer)
}

export const dbAddInfluencerToCampaign = async (campaignId, influencerId, fields = {}) => {
  const uid = await myId()
  if (!uid) throw new Error('Sesión expirada. Volvé a entrar.')
  const { data, error } = await supabase.from('campaign_influencers').insert([{
    campaign_id:    campaignId,
    influencer_id:  influencerId,
    assigned_by:    uid,
    status:         fields.status        || 'proposed',
    rate:           fields.rate          || null,
    currency:       fields.currency      || null,
    deliverables:   fields.deliverables  || [],
    content_status: fields.contentStatus || 'pending',
    payment_status: fields.paymentStatus || 'pending',
    notes:          fields.notes         || null,
  }]).select('*').single()
  if (error) {
    if (error.code === '23505') throw new Error('Este influencer ya está asignado a esta campaña.')
    throw friendly(error)
  }
  return rowToCampaignInfluencer(data)
}

export const dbRemoveInfluencerFromCampaign = async (campaignId, influencerId) => {
  const { error } = await supabase.from('campaign_influencers')
    .delete().eq('campaign_id', campaignId).eq('influencer_id', influencerId)
  if (error) throw friendly(error)
}

export const dbUpdateCampaignInfluencer = async (campaignId, influencerId, updates) => {
  const row = {}
  if (updates.status        !== undefined) row.status         = updates.status
  if (updates.rate          !== undefined) row.rate           = updates.rate
  if (updates.currency      !== undefined) row.currency       = updates.currency
  if (updates.contentStatus !== undefined) row.content_status = updates.contentStatus
  if (updates.paymentStatus !== undefined) row.payment_status = updates.paymentStatus
  if (updates.notes         !== undefined) row.notes          = updates.notes
  if (updates.deliverables  !== undefined) row.deliverables   = updates.deliverables
  const { data, error } = await supabase.from('campaign_influencers')
    .update(row).eq('campaign_id', campaignId).eq('influencer_id', influencerId)
    .select('*').single()
  if (error) throw friendly(error)
  return rowToCampaignInfluencer(data)
}

// ═══════════════════════════════════════════════════════════
// ACTIVATION TYPES
// ═══════════════════════════════════════════════════════════

let _actTypesCache = null

export const dbGetActivationTypes = async (force = false) => {
  if (_actTypesCache && !force) return _actTypesCache
  const { data, error } = await supabase.from('activation_types')
    .select('*').eq('active', true).order('sort_order')
  if (error) throw friendly(error)
  _actTypesCache = (data || []).map(rowToActivationType)
  return _actTypesCache
}

// ═══════════════════════════════════════════════════════════
// COLLABORATIONS
// ═══════════════════════════════════════════════════════════

export const dbGetCollaborations = async (filters = {}) => {
  const paginated = filters.pageSize !== undefined
  const { page = 0, pageSize = 30, includeCancelled = false } = filters

  let q = supabase.from('collaborations')
    .select(paginated ? '*, influencers(id, name, username), brands(id, name)' : '*', { count: paginated ? 'exact' : undefined })
    .order('created_at', { ascending: false })
  if (paginated) q = q.range(page * pageSize, (page + 1) * pageSize - 1)
  else           q = q.limit(1000)   // legacy cap — App.jsx
  if (!includeCancelled)        q = q.not('status', 'eq', 'cancelled')
  if (filters.status)           q = q.eq('status', filters.status)
  if (filters.activationTypeId) q = q.eq('activation_type_id', filters.activationTypeId)
  if (filters.influencerId)     q = q.eq('influencer_id', filters.influencerId)
  if (filters.cityId)           q = q.eq('city_id', filters.cityId)
  if (filters.scouterId)        q = q.eq('scouter_id', filters.scouterId)

  const { data, count, error } = await q
  if (error) throw friendly(error)

  if (!paginated) {
    return (data || []).map(rowToCollaboration)
  }
  const rows = (data || []).map(r => ({
    ...rowToCollaboration(r),
    influencerName: r.influencers?.name || r.influencers?.username || null,
    brandName:      r.brands?.name || null,
  }))
  return { rows, total: count ?? 0, hasMore: (count ?? 0) > (page + 1) * pageSize }
}

export const dbSaveCollaboration = async (collab, userId) => {
  const uid = userId || await myId()
  if (!uid) throw new Error('Sesión expirada. Volvé a entrar.')
  const { id, ...rest } = collab
  // collaborations.influencer_id es NOT NULL: sin influencer el insert muere con un
  // error crudo de Postgres. El formulario ya lo pide, pero cualquier otra llamada
  // (importador, automatización) merece un mensaje claro.
  if (!id && !rest.influencerId) throw new Error('La colaboración necesita una influencer.')
  const row = {
    campaign_id:        rest.campaignId       || null,
    opportunity_id:     rest.opportunityId    || null,
    brand_id:           rest.brandId          || null,
    influencer_id:      rest.influencerId      || null,
    scouter_id:         rest.scouterId        || uid,
    status:             rest.status           || 'proposed',
    activation_type_id: rest.activationTypeId || null,
    start_date:         rest.startDate        || null,
    end_date:           rest.endDate          || null,
    deliverables:       rest.deliverables     || [],
    content_status:     rest.contentStatus    || 'pending',
    payment_status:     rest.paymentStatus    || 'pending',
    amount:             Number(rest.amount)   || null,
    currency:           rest.currency         || null,
    notes:              rest.notes            || null,
  }
  // Derive city from brand then influencer (same cascade as collab_city_id() in SQL).
  let cityId = rest.cityId || null
  if (!cityId && row.brand_id) {
    const { data: b } = await supabase.from('brands').select('city_id').eq('id', row.brand_id).maybeSingle()
    cityId = b?.city_id || null
  }
  if (!cityId && row.influencer_id) {
    const { data: inf } = await supabase.from('influencers').select('city_id').eq('id', row.influencer_id).maybeSingle()
    cityId = inf?.city_id || null
  }
  row.city_id = cityId
  if (isUuid(id)) {
    const { data, error } = await supabase.from('collaborations')
      .update(row).eq('id', id).select('*').single()
    if (error) throw friendly(error)
    return rowToCollaboration(data)
  }
  const { data, error } = await supabase.from('collaborations')
    .insert([{ ...row, created_by: uid }]).select('*').single()
  if (error) throw friendly(error)
  return rowToCollaboration(data)
}

export const dbDeleteCollaboration = async (id) => {
  const { data, error } = await supabase.from('collaborations')
    .update({ status: 'cancelled' }).eq('id', id).select('*').single()
  if (error) throw friendly(error)
  return rowToCollaboration(data)
}

export const dbPatchCollaboration = async (id, patch) => {
  const FIELD_MAP = {
    influencerId:        'influencer_id',
    brandId:             'brand_id',
    campaignId:          'campaign_id',
    opportunityId:       'opportunity_id',
    activationTypeId:    'activation_type_id',
    status:              'status',
    startDate:           'start_date',
    endDate:             'end_date',
    deliverables:        'deliverables',
    contentStatus:       'content_status',
    paymentStatus:       'payment_status',
    amount:              'amount',
    currency:            'currency',
    results:             'results',
    notes:               'notes',
    nextAction:          'next_action',
    nextActionAt:        'next_action_at',
    contractUrl:         'contract_url',
    invoiceUrl:          'invoice_url',
    reach:               'reach',
    impressions:         'impressions',
    likes:               'likes',
    comments:            'comments',
    shares:              'shares',
    saves:               'saves',
    linkClicks:          'link_clicks',
    engagementRate:      'engagement_rate',
    estimatedMediaValue: 'estimated_media_value',
    resultsNotes:        'results_notes',
  }
  const row = {}
  for (const [camel, snake] of Object.entries(FIELD_MAP)) {
    if (camel in patch) row[snake] = patch[camel]
  }
  if (Object.keys(row).length === 0) return
  const { error } = await supabase.from('collaborations').update(row).eq('id', id)
  if (error) throw friendly(error)
}

// ═══════════════════════════════════════════════════════════
// COLLABORATION DELIVERABLES
// ═══════════════════════════════════════════════════════════

const rowToDeliverable = (r) => ({
  id:          r.id,
  description: r.description,
  dueDate:     r.due_date ?? null,
  status:      r.status,
  completedAt: r.completed_at ?? null,
  sortOrder:   r.sort_order ?? 0,
})

export const dbGetCollaborationDeliverables = async (collaborationId) => {
  const { data, error } = await supabase
    .from('collaboration_deliverables')
    .select('*')
    .eq('collaboration_id', collaborationId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) throw friendly(error)
  return (data || []).map(rowToDeliverable)
}

export const dbAddCollaborationDeliverable = async (collaborationId, { description, dueDate, sortOrder = 0 }) => {
  const { data, error } = await supabase
    .from('collaboration_deliverables')
    .insert([{ collaboration_id: collaborationId, description, due_date: dueDate || null, sort_order: sortOrder }])
    .select('*').single()
  if (error) throw friendly(error)
  return rowToDeliverable(data)
}

export const dbUpdateCollaborationDeliverable = async (id, patch) => {
  const row = {}
  if ('description' in patch) row.description = patch.description
  if ('dueDate'     in patch) row.due_date     = patch.dueDate || null
  if ('sortOrder'   in patch) row.sort_order   = patch.sortOrder
  if ('status'      in patch) {
    row.status       = patch.status
    row.completed_at = patch.status === 'approved' ? new Date().toISOString() : null
  }
  if (Object.keys(row).length === 0) return
  const { data, error } = await supabase
    .from('collaboration_deliverables')
    .update(row).eq('id', id).select('*').single()
  if (error) throw friendly(error)
  return rowToDeliverable(data)
}

export const dbDeleteCollaborationDeliverable = async (id) => {
  const { error } = await supabase.from('collaboration_deliverables').delete().eq('id', id)
  if (error) throw friendly(error)
}

// ═══════════════════════════════════════════════════════════
// ACTIVITIES — timeline de negocio
// Nota: audit_log es SOLO por triggers de DB, nunca desde el cliente.
// ═══════════════════════════════════════════════════════════

export const dbLogActivityFor = async (actorId, entityType, entityId, type, title, description = null, metadata = {}) => {
  const { error } = await supabase.from('activities').insert([{
    actor_id:    actorId,
    entity_type: entityType,
    entity_id:   String(entityId),
    type,
    title,
    description: description || null,
    metadata:    metadata || {},
  }])
  if (error) console.error('dbLogActivityFor:', error.message)
}

export const dbGetActivities = async (entityType, entityId, limit = 50) => {
  const { data, error } = await supabase.from('activities')
    .select('*')
    .eq('entity_type', entityType)
    .eq('entity_id', String(entityId))
    .order('occurred_at', { ascending: false })
    .limit(limit)
  if (error) throw friendly(error)
  return (data || []).map(rowToActivity)
}

export const dbGetActivitiesByActor = async (actorId, limit = 50) => {
  const { data, error } = await supabase.from('activities')
    .select('*')
    .eq('actor_id', actorId)
    .order('occurred_at', { ascending: false })
    .limit(limit)
  if (error) throw friendly(error)
  return (data || []).map(rowToActivity)
}

// ═══════════════════════════════════════════════════════════
// TASKS
// ═══════════════════════════════════════════════════════════

// Paginada — Network. Siempre devuelve { rows, total, hasMore }.
export const dbGetTasks = async ({
  page = 0, pageSize = 30,
  assignedTo, status, entityType, entityId,
  orderBy = 'due_date', orderDir = 'asc',
} = {}) => {
  let q = supabase.from('v_tasks_estado')
    .select('*', { count: 'exact' })
    .order(orderBy, { ascending: orderDir === 'asc', nullsFirst: false })
    .range(page * pageSize, (page + 1) * pageSize - 1)
  if (assignedTo)              q = q.eq('assigned_to', assignedTo)
  if (status)                  q = q.eq('status', status)
  if (entityType && entityId)  q = q.eq('entity_type', entityType).eq('entity_id', String(entityId))
  const { data, count, error } = await q
  if (error) throw friendly(error)
  const rows = (data || []).map(rowToTask)
  return { rows, total: count ?? 0, hasMore: (count ?? 0) > (page + 1) * pageSize }
}

// Legacy para entity timelines (sin paginación, límite fijo)
export const dbGetTasksForEntity = async (entityType, entityId) => {
  const { data, error } = await supabase.from('v_tasks_estado')
    .select('*')
    .eq('entity_type', entityType).eq('entity_id', String(entityId))
    .order('due_date', { ascending: true, nullsFirst: false })
    .limit(50)
  if (error) throw friendly(error)
  return (data || []).map(rowToTask)
}

export const dbGetTaskById = async (id) => {
  const { data, error } = await supabase.from('tasks').select('*').eq('id', id).maybeSingle()
  if (error) throw friendly(error)
  return data ? rowToTask(data) : null
}

export const dbSaveTask = async (task, userId) => {
  const uid = userId || await myId()
  if (!uid) throw new Error('Sesión expirada. Volvé a entrar.')
  const row = {
    title:       task.title       || 'Tarea sin título',
    description: task.description || null,
    assigned_to: task.assignedTo  || null,
    entity_type: task.entityType  || null,
    entity_id:   task.entityId    ? String(task.entityId) : null,
    type:        task.type        || 'general',
    priority:    task.priority    || 'normal',
    status:      task.status      || 'todo',
    due_date:    task.dueDate     || null,
  }
  if (isUuid(task.id)) {
    const { data, error } = await supabase.from('tasks').update(row).eq('id', task.id).select('*').single()
    if (error) throw friendly(error)
    return rowToTask(data)
  }
  const { data, error } = await supabase.from('tasks')
    .insert([{ ...row, created_by: uid }]).select('*').single()
  if (error) throw friendly(error)
  return rowToTask(data)
}

export const dbCompleteTask = async (id) => {
  const { data, error } = await supabase.from('tasks')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', id).select('*').single()
  if (error) throw friendly(error)
  return rowToTask(data)
}

// ═══════════════════════════════════════════════════════════
// GOALS / MISSIONS
// ═══════════════════════════════════════════════════════════

export const dbGetGoals = async (filters = {}) => {
  let q = supabase.from('goals_view').select('*').order('period_start', { ascending: false })
  if (filters.status)     q = q.eq('status', filters.status)
  if (filters.assignedTo) q = q.eq('assigned_to', filters.assignedTo)
  const { data, error } = await q
  if (error) throw friendly(error)
  return (data || []).map(rowToGoal)
}

export const dbGetMissions = async (filters = {}) => {
  let q = supabase.from('missions').select('*').order('created_at', { ascending: false })
  if (filters.status) q = q.eq('status', filters.status)
  if (filters.cityId) q = q.eq('city_id', filters.cityId)
  const { data, error } = await q
  if (error) throw friendly(error)
  return (data || []).map(rowToMission)
}

export const dbSaveMission = async (mission, userId) => {
  const uid = userId || await myId()
  if (!uid) throw new Error('Sesión expirada. Volvé a entrar.')
  const row = {
    title:         (mission.title || '').trim() || 'Misión sin título',
    description:   mission.description || null,
    type:          mission.type || 'individual',
    metric:        mission.metric,
    target:        Number(mission.target) || 0,
    city_id:       mission.cityId || null,
    starts_at:     mission.startsAt || null,
    ends_at:       mission.endsAt || null,
    reward_points: Number(mission.rewardPoints) || 0,
    status:        mission.status || 'active',
  }
  if (isUuid(mission.id)) {
    const { data, error } = await supabase.from('missions')
      .update(row).eq('id', mission.id).select('*').single()
    if (error) throw friendly(error)
    return rowToMission(data)
  }
  const { data, error } = await supabase.from('missions')
    .insert([{ ...row, created_by: uid }]).select('*').single()
  if (error) throw friendly(error)
  return rowToMission(data)
}

// ═══════════════════════════════════════════════════════════
// PERSONAL NOTES (030) — cuaderno privado por usuario
// ═══════════════════════════════════════════════════════════

const rowToPersonalNote = (r) => ({
  id:        r.id,
  title:     r.title,
  body:      r.body,
  pinned:    r.pinned,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
})

export const dbGetPersonalNotes = async () => {
  const { data, error } = await supabase.from('personal_notes')
    .select('*')
    .order('pinned', { ascending: false })
    .order('updated_at', { ascending: false })
  if (error) throw friendly(error)
  return (data || []).map(rowToPersonalNote)
}

export const dbSavePersonalNote = async (note, userId) => {
  const uid = userId || await myId()
  if (!uid) throw new Error('Sesión expirada. Volvé a entrar.')
  const row = {
    title:      note.title || null,
    body:       note.body || '',
    pinned:     !!note.pinned,
    updated_at: new Date().toISOString(),
  }
  if (isUuid(note.id)) {
    const { data, error } = await supabase.from('personal_notes')
      .update(row).eq('id', note.id).select('*').single()
    if (error) throw friendly(error)
    return rowToPersonalNote(data)
  }
  const { data, error } = await supabase.from('personal_notes')
    .insert([{ ...row, user_id: uid }]).select('*').single()
  if (error) throw friendly(error)
  return rowToPersonalNote(data)
}

export const dbDeletePersonalNote = async (id) => {
  const { error } = await supabase.from('personal_notes').delete().eq('id', id)
  if (error) throw friendly(error)
}

// ═══════════════════════════════════════════════════════════
// NOTES FEED (030) — agregador de notas de entidades
// ═══════════════════════════════════════════════════════════

const rowToFeedNote = (r) => ({
  entityType:     r.entity_type,
  entityId:       r.entity_id,
  entityLabel:    r.entity_label,
  noteText:       r.note_text,
  notedAt:        r.noted_at,
  ownerScouterId: r.owner_scouter_id,
})

export const dbGetNotesFeed = async () => {
  const { data, error } = await supabase.from('my_notes_feed')
    .select('*')
    .order('noted_at', { ascending: false })
  if (error) throw friendly(error)
  return (data || []).map(rowToFeedNote)
}

// ═══════════════════════════════════════════════════════════
// GEOGRAPHY
// ═══════════════════════════════════════════════════════════

let _geoCache = null

export const dbGetGeography = async (force = false) => {
  if (_geoCache && !force) return _geoCache
  const [r, c, ci] = await Promise.all([
    supabase.from('regions').select('*').eq('active', true).order('name'),
    supabase.from('countries').select('*').eq('active', true).order('name'),
    supabase.from('cities').select('*').eq('active', true).order('name'),
  ])
  if (r.error)  throw r.error
  if (c.error)  throw c.error
  if (ci.error) throw ci.error
  _geoCache = { regions: r.data || [], countries: c.data || [], cities: ci.data || [] }
  return _geoCache
}

// cities.slug es NOT NULL y tiene UNIQUE (country_id, slug): si no viene,
// se genera del nombre. "San Carlos de Bariloche" -> "san-carlos-de-bariloche".
const slugify = (s) => norm(s).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

export const dbCreateCity = async ({ name, countryId, slug = null, timezone = null }) => {
  const finalSlug = (slug && slug.trim()) || slugify(name)
  if (!finalSlug) throw new Error('El nombre de la ciudad no es válido.')
  const { data, error } = await supabase.from('cities')
    .insert([{ name, country_id: countryId, slug: finalSlug, timezone, active: true }])
    .select()
    .single()
  if (error) throw friendly(error)
  _geoCache = null
  return data
}

// countries exige name, code, currency, region_id y timezone: todas NOT NULL y sin
// default. Si falta cualquiera, Postgres rechaza el insert. Validamos acá para dar un
// mensaje que se entienda en lugar del error crudo. code tiene UNIQUE, así que se
// normaliza a mayúsculas para que "ar" y "AR" no terminen siendo dos países distintos.
export const dbCreateCountry = async ({ name, code = null, regionId = null, currency = null, timezone = null }) => {
  const faltan = []
  if (!name || !name.trim())         faltan.push('nombre')
  if (!code || !code.trim())         faltan.push('código (ej. AR)')
  if (!currency || !currency.trim()) faltan.push('moneda (ej. ARS)')
  if (!regionId)                     faltan.push('región')
  if (!timezone || !timezone.trim()) faltan.push('zona horaria (ej. America/Argentina/Buenos_Aires)')
  if (faltan.length) throw new Error(`Para crear un país falta: ${faltan.join(', ')}.`)

  const { data, error } = await supabase.from('countries')
    .insert([{
      name: name.trim(),
      code: code.trim().toUpperCase(),
      region_id: regionId,
      currency: currency.trim().toUpperCase(),
      timezone: timezone.trim(),
      active: true,
    }])
    .select().single()
  if (error) throw friendly(error)
  _geoCache = null
  return data
}

export const dbUpdateCity = async (id, patch) => {
  const row = {}
  if ('name'      in patch) row.name       = patch.name
  if ('countryId' in patch) row.country_id = patch.countryId
  if ('timezone'  in patch) row.timezone   = patch.timezone
  if ('active'    in patch) row.active     = patch.active
  const { error } = await supabase.from('cities').update(row).eq('id', id)
  if (error) throw friendly(error)
  _geoCache = null
}

export const dbUpdateCountry = async (id, patch) => {
  const row = {}
  if ('name'     in patch) row.name      = patch.name
  if ('code'     in patch) row.code      = patch.code
  if ('regionId' in patch) row.region_id = patch.regionId
  if ('currency' in patch) row.currency  = patch.currency
  if ('active'   in patch) row.active    = patch.active
  const { error } = await supabase.from('countries').update(row).eq('id', id)
  if (error) throw friendly(error)
  _geoCache = null
}

// El modelo viejo guarda `ciudad` y `pais` como texto libre.
// Hasta que la UI tenga selectores (Fase 2), se intenta resolver el texto
// contra `cities`. Lo que no matchea queda en null y el registro solo lo
// ve Dirección — es visible en la vista "sin ciudad", no se pierde.
const norm = (s) => (s || '').toString().trim().toLowerCase()
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')

const resolveGeo = async (ciudad, pais) => {
  if (!ciudad && !pais) return { city_id: null, country_id: null }
  try {
    const { cities, countries } = await dbGetGeography()
    const city = cities.find(c => norm(c.name) === norm(ciudad))
    if (city) return { city_id: city.id, country_id: city.country_id }
    const country = countries.find(c => norm(c.name) === norm(pais) || norm(c.code) === norm(pais))
    return { city_id: null, country_id: country?.id ?? null }
  } catch { return { city_id: null, country_id: null } }
}

const myId = async () => {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.user?.id ?? null
}

// Traduce errores crudos de Postgres a algo que un humano entienda
const friendly = (error) => {
  const m = error?.message || ''
  if (/row-level security/i.test(m))          return new Error('No tenés permiso para esta operación.')
  if (/violates not-null/i.test(m))           return new Error('Faltan campos obligatorios (revisá el nombre).')
  if (/duplicate key/i.test(m))               return new Error('Ese registro ya existe.')
  if (/violates foreign key/i.test(m))        return new Error('No se puede borrar: hay registros que dependen de este.')
  if (/assign_entity/i.test(m))               return new Error('El dueño se cambia desde Reasignar, no editando el registro.')
  return error
}

// ═══════════════════════════════════════════════════════════
// MAPEO fila ↔ objeto de la app
// Los campos de GOBIERNO son columnas reales (owner, ciudad, estado).
// `data` guarda solo el contenido de negocio.
// ═══════════════════════════════════════════════════════════

const rowToInfluencer = (r) => ({
  ...(r.data || {}),
  id: r.id,
  name: r.name, username: r.username, email: r.email, phone: r.phone,
  instagram: r.instagram, tiktok: r.tiktok, whatsapp: r.whatsapp,
  followers: r.followers ?? 0, category: r.category, tier: r.tier,
  cityId: r.city_id, countryId: r.country_id, status: r.status,
  ownerScouterId: r.owner_scouter_id, createdBy: r.created_by,
  nextFollowUp: r.next_follow_up, notes: r.notes,
  createdAt: r.created_at, updatedAt: r.updated_at,
  // 020_crm_fields
  relationshipStatus: r.relationship_status ?? 'cold',
  profileImage:       r.profile_image ?? null,
  engagement:         r.engagement ?? null,
  averageViews:       r.average_views ?? null,
  nextAction:         r.next_action ?? null,
  nextActionAt:       r.next_action_at ?? null,
  lastContactAt:      r.last_contact_at ?? null,
})

const influencerToRow = async (i) => {
  const geo = await resolveGeo(i.ciudad ?? i.city, i.pais ?? i.country)
  return {
    name:      (i.name || i.nombre || '').trim() || 'Sin nombre',
    username:  i.username ?? null,
    email:     i.email ?? null,
    phone:     i.phone ?? i.telefono ?? null,
    instagram: i.instagram ?? null,
    tiktok:    i.tiktok ?? null,
    whatsapp:  i.whatsapp ?? null,
    followers: Number(i.followers) || 0,
    category:  i.category ?? i.categoria ?? null,
    tier:      i.tier ?? null,
    city_id:    i.cityId ?? geo.city_id,
    country_id: i.countryId ?? geo.country_id,
    status:    i.status ?? 'active',
    next_follow_up:     i.nextFollowUp ?? null,
    notes:              i.notes ?? null,
    relationship_status: i.relationshipStatus ?? 'cold',
    next_action:        i.nextAction ?? null,
    next_action_at:     i.nextActionAt ?? null,
    engagement:         i.engagement ? Number(i.engagement) : null,
    average_views:      i.averageViews ? Number(i.averageViews) : null,
    // Todo lo que no tiene columna propia, incluido el texto original
    data: {
      ciudad: i.ciudad ?? null, pais: i.pais ?? null, grupo: i.grupo ?? null,
      stats: i.stats ?? {}, referrals: i.referrals ?? {},
      uniLink: i.uniLink ?? null, contractType: i.contractType ?? null,
      rate: i.rate ?? null,
    },
    // owner_scouter_id y created_by NUNCA van acá: el owner lo protege un
    // trigger y se cambia solo con assign_entity().
  }
}

const rowToBrand = (r) => ({
  ...(r.data || {}),
  id: r.id, name: r.name, category: r.category,
  categoryId: r.category_id ?? null,
  cityId: r.city_id, countryId: r.country_id, status: r.status,
  potential: r.potential, website: r.website,
  ownerScouterId: r.owner_scouter_id, createdBy: r.created_by,
  nextFollowUp: r.next_follow_up, notes: r.notes,
  createdAt: r.created_at, updatedAt: r.updated_at,
  // 020_crm_fields
  relationshipStatus: r.relationship_status ?? 'cold',
  logo:              r.logo ?? null,
  potentialValue:    r.potential_value ?? null,
  nextAction:        r.next_action ?? null,
  nextActionAt:      r.next_action_at ?? null,
  lastContactAt:     r.last_contact_at ?? null,
  whatsapp:          r.whatsapp   ?? null,
  instagram:         r.instagram  ?? null,
  phone:             r.phone      ?? null,
  email:             r.email      ?? null,
})

const BRAND_REL_VALID = new Set(['cold','warm','strong','inactive'])

const brandToRow = async (b) => {
  const geo = await resolveGeo(b.ciudad ?? b.city, b.pais ?? b.country)
  const { id, ...rest } = b
  const catText = b.category ?? b.categoria ?? null

  // Resolve category_id from text, falling back to null without failing
  let category_id = b.categoryId ?? null
  if (!category_id && catText) {
    const cats = await dbGetBrandCategories().catch(() => [])
    const match = cats.find(c => norm(c.name) === norm(catText))
    category_id = match?.id ?? null
  }

  const row = {
    name:          (b.name || b.nombre || '').trim() || 'Sin nombre',
    category:      catText,
    category_id,
    city_id:       b.cityId ?? geo.city_id,
    country_id:    b.countryId ?? geo.country_id,
    status:        b.status ?? 'active',
    potential:     b.potential ?? null,
    potential_value: b.potentialValue != null ? Number(b.potentialValue) : null,
    website:       b.website ?? null,
    next_follow_up: b.nextFollowUp ?? null,
    next_action:   b.nextAction ?? null,
    next_action_at: b.nextActionAt ?? null,
    notes:         b.notes ?? null,
    whatsapp:      b.whatsapp  ?? null,
    instagram:     b.instagram ?? null,
    phone:         b.phone     ?? null,
    email:         b.email     ?? null,
    data:          rest,
  }

  // relationship_status is an enum; only write valid values to avoid insert errors
  const rel = b.relationshipStatus ?? null
  if (rel && BRAND_REL_VALID.has(rel)) row.relationship_status = rel

  return row
}

const rowToLocation = (r) => ({
  ...(r.data || {}),
  id: r.id, brandId: r.brand_id, name: r.name,
  cityId: r.city_id, countryId: r.country_id,
  address: r.address, status: r.status,
  createdAt: r.created_at, updatedAt: r.updated_at,
})

const locationToRow = async (l) => {
  const geo = await resolveGeo(l.ciudad ?? l.city, l.pais ?? l.country)
  const { id, ...rest } = l
  return {
    brand_id: isUuid(l.brandId) ? l.brandId : null,
    name:    (l.name || l.nombre || '').trim() || 'Sin nombre',
    city_id:    l.cityId ?? geo.city_id,
    country_id: l.countryId ?? geo.country_id,
    address: l.address ?? l.direccion ?? null,
    status:  l.status ?? 'active',
    data:    rest,
  }
}

// ═══════════════════════════════════════════════════════════
// INFLUENCERS
// ═══════════════════════════════════════════════════════════

// Columnas que admiten NULLS LAST en influencers
const INF_NULLS_LAST_COLS = new Set(['engagement','last_contact_at','followers','next_action_at'])

// Paginada — Network. Siempre devuelve { rows, total, hasMore }.
const safe = (s) => String(s).replace(/[,()"']/g, ' ').trim()

// Limites del dia local del navegador, en ISO, para el filtro
// "seguimiento hoy". Se calcula aca y no en la consulta porque el
// corte del dia depende de quien mira, no del servidor.
const startOfToday = () => {
  const d = new Date(); d.setHours(0, 0, 0, 0); return d.toISOString()
}
const startOfTomorrow = () => {
  const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + 1); return d.toISOString()
}

export const dbGetInfluencers = async ({
  page = 0, pageSize = 30,
  search, cityId, countryId, ownerId, status, relationshipStatus, category,
  noOwner = false, noCity = false, overdueOnly = false, overdueToday = false,
  orderBy = 'created_at', orderDir = 'desc',
} = {}) => {
  const nullsFirst = !INF_NULLS_LAST_COLS.has(orderBy)
  let q = supabase.from('influencers')
    .select('*', { count: 'exact' })
    .order(orderBy, { ascending: orderDir === 'asc', nullsFirst })
    .range(page * pageSize, (page + 1) * pageSize - 1)
  if (status)             q = q.eq('status', status)
  if (cityId)             q = q.eq('city_id', cityId)
  if (countryId)          q = q.eq('country_id', countryId)
  if (ownerId)            q = q.eq('owner_scouter_id', ownerId)
  if (noOwner)            q = q.is('owner_scouter_id', null)
  if (noCity)             q = q.is('city_id', null)
  if (overdueOnly)        q = q.lt('next_action_at', new Date().toISOString())
  if (overdueToday)       q = q.gte('next_action_at', startOfToday())
                              .lt('next_action_at',  startOfTomorrow())
  if (relationshipStatus) q = q.eq('relationship_status', relationshipStatus)
  if (category)           q = q.eq('category', category)
  if (search)             q = q.or(`name.ilike.%${safe(search)}%,username.ilike.%${safe(search)}%`)
  const { data, count, error } = await q
  if (error) throw friendly(error)
  const rows = (data || []).map(rowToInfluencer)
  return { rows, total: count ?? 0, hasMore: (count ?? 0) > (page + 1) * pageSize }
}

// Legacy — InfluencersView de Resilio Life. Cap duro: no escala con 20K registros.
// No usar en módulos nuevos; usar dbGetInfluencers con paginación.
export const dbListAllInfluencers = async () => {
  const { data, error } = await supabase.from('influencers')
    .select('*').order('created_at', { ascending: false }).limit(1000)
  if (error) throw friendly(error)
  return (data || []).map(rowToInfluencer)
}

export const dbSaveInfluencer = async (inf) => {
  const row = await influencerToRow(inf)

  if (isUuid(inf.id)) {
    const { data, error } = await supabase.from('influencers')
      .update(row).eq('id', inf.id).select('*').single()
    if (error) throw friendly(error)
    return rowToInfluencer(data)
  }

  const uid = await myId()
  if (!uid) throw new Error('Sesión expirada. Volvé a entrar.')
  const { data, error } = await supabase.from('influencers')
    .insert([{ ...row, created_by: uid, owner_scouter_id: uid }])
    .select('*').single()
  if (error) throw friendly(error)
  return rowToInfluencer(data)
}

export const dbDeleteInfluencer = async (id) => {
  const { error } = await supabase.from('influencers').delete().eq('id', id)
  if (error) throw friendly(error)
}

// Partial update — only sends changed fields. Never touches owner_scouter_id or created_by.
export const dbPatchInfluencer = async (id, patch) => {
  const FIELD_MAP = {
    name:               'name',
    username:           'username',
    email:              'email',
    phone:              'phone',
    instagram:          'instagram',
    tiktok:             'tiktok',
    whatsapp:           'whatsapp',
    followers:          'followers',
    category:           'category',
    tier:               'tier',
    cityId:             'city_id',
    countryId:          'country_id',
    status:             'status',
    notes:              'notes',
    relationshipStatus: 'relationship_status',
    engagement:         'engagement',
    averageViews:       'average_views',
    nextAction:         'next_action',
    nextActionAt:       'next_action_at',
  }
  const row = {}
  for (const [camel, snake] of Object.entries(FIELD_MAP)) {
    if (camel in patch) row[snake] = patch[camel]
  }
  if (Object.keys(row).length === 0) return
  const { error } = await supabase.from('influencers').update(row).eq('id', id)
  if (error) throw friendly(error)
}

// ═══════════════════════════════════════════════════════════
// BRANDS
// ═══════════════════════════════════════════════════════════

const BRAND_NULLS_LAST_COLS = new Set(['last_contact_at','next_action_at','potential_value'])

// Paginada — Network. Siempre devuelve { rows, total, hasMore }.
export const dbGetBrands = async ({
  page = 0, pageSize = 30,
  search, cityId, countryId, ownerId, status, relationshipStatus, category, categoryId,
  noOwner = false, noCity = false, overdueFollowup = false,
  orderBy = 'created_at', orderDir = 'desc',
} = {}) => {
  const nullsFirst = !BRAND_NULLS_LAST_COLS.has(orderBy)
  let q = supabase.from('brands')
    .select('*', { count: 'exact' })
    .order(orderBy, { ascending: orderDir === 'asc', nullsFirst })
    .range(page * pageSize, (page + 1) * pageSize - 1)
  if (status)             q = q.eq('status', status)
  if (cityId)             q = q.eq('city_id', cityId)
  if (countryId)          q = q.eq('country_id', countryId)
  if (ownerId)            q = q.eq('owner_scouter_id', ownerId)
  if (noOwner)            q = q.is('owner_scouter_id', null)
  if (noCity)             q = q.is('city_id', null)
  if (relationshipStatus) q = q.eq('relationship_status', relationshipStatus)
  if (category)           q = q.eq('category', category)
  if (categoryId)         q = q.eq('category_id', categoryId)
  if (overdueFollowup)    q = q.lt('next_action_at', new Date().toISOString())
  if (search)             q = q.or(`name.ilike.%${safe(search)}%`)
  const { data, count, error } = await q
  if (error) throw friendly(error)
  const rows = (data || []).map(rowToBrand)
  return { rows, total: count ?? 0, hasMore: (count ?? 0) > (page + 1) * pageSize }
}

// Legacy — BrandsView de Resilio Life. Cap duro: no escala.
export const dbListAllBrands = async () => {
  const { data, error } = await supabase.from('brands')
    .select('*').order('created_at', { ascending: false }).limit(1000)
  if (error) throw friendly(error)
  return (data || []).map(rowToBrand)
}

export const dbSaveBrand = async (brand) => {
  const row = await brandToRow(brand)

  if (isUuid(brand.id)) {
    const { data, error } = await supabase.from('brands')
      .update(row).eq('id', brand.id).select('*').single()
    if (error) throw friendly(error)
    return rowToBrand(data)
  }

  const uid = await myId()
  if (!uid) throw new Error('Sesión expirada. Volvé a entrar.')
  const { data, error } = await supabase.from('brands')
    .insert([{ ...row, created_by: uid, owner_scouter_id: uid }])
    .select('*').single()
  if (error) throw friendly(error)
  return rowToBrand(data)
}

export const dbDeleteBrand = async (id) => {
  const { error } = await supabase.from('brands').delete().eq('id', id)
  if (error) throw friendly(error)
}

// Partial update — only sends changed fields. Never touches owner_scouter_id or created_by.
export const dbPatchBrand = async (id, patch) => {
  const FIELD_MAP = {
    name:               'name',
    categoryId:         'category_id',
    website:            'website',
    logo:               'logo',
    cityId:             'city_id',
    countryId:          'country_id',
    status:             'status',
    notes:              'notes',
    relationshipStatus: 'relationship_status',
    potentialValue:     'potential_value',
    nextAction:         'next_action',
    nextActionAt:       'next_action_at',
    whatsapp:           'whatsapp',
    instagram:          'instagram',
    phone:              'phone',
    email:              'email',
  }
  const row = {}
  for (const [camel, snake] of Object.entries(FIELD_MAP)) {
    if (camel in patch) row[snake] = patch[camel]
  }
  if (Object.keys(row).length === 0) return
  const { error } = await supabase.from('brands').update(row).eq('id', id)
  if (error) throw friendly(error)
}

// ── Brand categories (cache de sesión) ──────────────────────
let _brandCatsCache = null

export const dbGetBrandCategories = async (force = false) => {
  if (_brandCatsCache && !force) return _brandCatsCache
  const { data, error } = await supabase.from('brand_categories')
    .select('*').eq('active', true).order('sort_order')
  if (error) throw friendly(error)
  _brandCatsCache = data || []
  return _brandCatsCache
}

// ── Entity timeline (activities + reassignments) ─────────────
export const dbGetEntityTimeline = async (entityType, entityId) => {
  const { data, error } = await supabase.rpc('entity_timeline', {
    p_type: entityType,
    p_id:   entityId,
  })
  if (error) throw friendly(error)
  return (data || []).map(r => ({
    id:          r.id,
    type:        r.type,
    title:       r.title,
    description: r.description,
    occurredAt:  r.occurred_at,
  }))
}

// ── Active scouters (for AssignModal) ────────────────────────
export const dbGetActiveScouters = async (cityId = null) => {
  let q = supabase.from('scouters').select('user_id, city_id').eq('status', 'active')
  if (cityId) q = q.eq('city_id', cityId)
  const { data: scouts, error } = await q
  if (error) throw friendly(error)
  if (!scouts?.length) return []

  const userIds = scouts.map(s => s.user_id)
  const { data: profs, error: pErr } = await supabase
    .from('profiles').select('id, nombre, sobrenombre, email').in('id', userIds)
  if (pErr) throw friendly(pErr)

  const profMap = {}
  for (const p of profs || []) profMap[p.id] = p

  return scouts.map(s => ({
    userId:      s.user_id,
    cityId:      s.city_id,
    nombre:      profMap[s.user_id]?.nombre      || '',
    sobrenombre: profMap[s.user_id]?.sobrenombre || '',
    email:       profMap[s.user_id]?.email        || '',
  }))
}

// ── Log contact and update last_contact_at via trigger ───────
const CONTACT_TYPE_MAP = {
  'Instagram': 'dm',
  'WhatsApp':  'whatsapp',
  'Llamar':    'call',
}

export const dbLogContact = async (entityType, entityId, contactLabel) => {
  const uid = await myId()
  if (!uid) return
  const type = CONTACT_TYPE_MAP[contactLabel] || 'note'
  await dbLogActivityFor(uid, entityType, entityId, type, contactLabel)
}

// ═══════════════════════════════════════════════════════════
// LOCATIONS
// ═══════════════════════════════════════════════════════════

// Legacy — App.jsx Resilio Life. Cap duro.
export const dbGetLocations = async () => {
  const { data, error } = await supabase.from('locations')
    .select('*').order('created_at', { ascending: false }).limit(1000)
  if (error) throw friendly(error)
  return (data || []).map(rowToLocation)
}

export const dbSaveLocation = async (location) => {
  const row = await locationToRow(location)

  if (isUuid(location.id)) {
    const { data, error } = await supabase.from('locations')
      .update(row).eq('id', location.id).select('*').single()
    if (error) throw friendly(error)
    return rowToLocation(data)
  }

  const uid = await myId()
  if (!uid) throw new Error('Sesión expirada. Volvé a entrar.')
  const { data, error } = await supabase.from('locations')
    .insert([{ ...row, created_by: uid }])
    .select('*').single()
  if (error) throw friendly(error)
  return rowToLocation(data)
}

export const dbDeleteLocation = async (id) => {
  const { error } = await supabase.from('locations').delete().eq('id', id)
  if (error) throw friendly(error)
}

// ═══════════════════════════════════════════════════════════
// ASSIGN ENTITY — único camino de reasignación
// Los nombres de los parámetros DEBEN coincidir con la firma SQL
// (p_entity_type, p_entity_id, p_to_owner, p_reason) o el RPC falla.
// ═══════════════════════════════════════════════════════════

export const dbAssignEntity = async (entityType, entityId, toOwner, reason = null) => {
  const { error } = await supabase.rpc('assign_entity', {
    p_entity_type: entityType,
    p_entity_id:   entityId,
    p_to_owner:    toOwner,
    p_reason:      reason,
  })
  if (error) throw friendly(error)
}

// ═══════════════════════════════════════════════════════════
// COMPAT SHIMS — mapean la firma vieja del AdminPanel al schema
// real de la tabla activities.
// ═══════════════════════════════════════════════════════════

export const dbLogActivity = async ({ userId, userName, accion, detalle, seccion } = {}) => {
  if (!userId || !accion) return
  await dbLogActivityFor(
    userId,
    'admin',
    String(userId),
    accion,
    detalle || accion,
    null,
    { userName, seccion },
  )
}

export const dbGetActivityLog = async (limit = 100) => {
  const { data, error } = await supabase.from('activities')
    .select('*')
    .eq('entity_type', 'admin')
    .order('occurred_at', { ascending: false })
    .limit(limit)
  if (error) return []
  return (data || []).map(r => ({
    id:         r.id,
    userId:     r.actor_id,
    userName:   r.metadata?.userName || r.actor_id,
    accion:     r.type,
    detalle:    r.title,
    seccion:    r.metadata?.seccion || 'admin',
    created_at: r.occurred_at || r.created_at,
  }))
}

// ═══════════════════════════════════════════════════════════
// NEXT ACTIONS — wrappers de complete_next_action / set_next_action
// Usan las RPCs SQL (022) que hacen las dos escrituras atómicas.
// ═══════════════════════════════════════════════════════════

const friendlyRpc = (error) => {
  const m = error?.message || ''
  if (m.includes('no existe o no tenés permiso')) return new Error('El registro no existe o no tenés permiso para modificarlo.')
  if (m.includes('entity_type inválido'))         return new Error('Tipo de entidad no reconocido.')
  if (/row-level security/i.test(m))              return new Error('No tenés permiso para esta operación.')
  return new Error('No se pudo completar la operación. Intentá de nuevo.')
}

export const dbCompleteNextAction = async (entityType, entityId, note = null) => {
  const { error } = await supabase.rpc('complete_next_action', {
    p_entity_type:   entityType,
    p_entity_id:     entityId,
    p_activity_type: 'follow_up',
    p_note:          note,
  })
  if (error) throw friendlyRpc(error)
}

export const dbSetNextAction = async (entityType, entityId, action, at) => {
  const { error } = await supabase.rpc('set_next_action', {
    p_entity_type: entityType,
    p_entity_id:   entityId,
    p_action:      action,
    p_at:          at,
  })
  if (error) throw friendlyRpc(error)
}

// ═══════════════════════════════════════════════════════════
// SCOUTERS — gestión (026)
// upsert_scouter es SECURITY DEFINER: hace las tres escrituras
// (scouters, profiles.estado, user_roles) en una llamada atómica.
// ═══════════════════════════════════════════════════════════

export const dbUpsertScouter = async ({ userId, cityId, teamId = null, level = 1, status = 'active' }) => {
  const { error } = await supabase.rpc('upsert_scouter', {
    p_user_id: userId,
    p_city_id: cityId,
    p_team_id: teamId,
    p_level:   level,
    p_status:  status,
  })
  if (error) throw friendly(error)
}

const BULK_CHUNK = 100

// assign_entities_bulk devuelve una fila POR ENTIDAD con ok/error.
// Fallos parciales NO lanzan excepción: vienen en el array de resultados.
// onProgress(done, total) es opcional para mostrar progreso.
export const dbAssignBulk = async (entityType, entityIds, toOwner, reason = null, onProgress) => {
  const results = []
  for (let i = 0; i < entityIds.length; i += BULK_CHUNK) {
    const chunk = entityIds.slice(i, i + BULK_CHUNK)
    const { data, error } = await supabase.rpc('assign_entities_bulk', {
      p_entity_type: entityType,
      p_entity_ids:  chunk,
      p_to_owner:    toOwner,
      p_reason:      reason,
    })
    if (error) throw friendly(error)
    for (const r of data || []) {
      results.push({ entityId: r.entity_id, ok: r.ok, error: r.error })
    }
    if (onProgress) onProgress(results.length, entityIds.length)
  }
  return results
}

// ═══════════════════════════════════════════════════════════
// MANUAL (027 migration)
// RLS filtra por scouters.level — NO duplicar en cliente.
// Edición solo para Dirección (RLS lo valida en dbPatchManual).
// ═══════════════════════════════════════════════════════════

export const dbGetManualCategories = async () => {
  const { data, error } = await supabase.from('manual_categories')
    .select('*').eq('active', true).order('sort_order')
  if (error) throw friendly(error)
  return (data || []).map(r => ({ code: r.code, name: r.name, sortOrder: r.sort_order }))
}

export const dbGetManual = async () => {
  const { data, error } = await supabase.from('manual_sections')
    .select('*, manual_categories(code, name, sort_order)')
    .eq('active', true)
    .order('sort_order')
  if (error) throw friendly(error)
  return (data || [])
    .sort((a, b) => {
      const cA = a.manual_categories?.sort_order ?? 0
      const cB = b.manual_categories?.sort_order ?? 0
      return cA !== cB ? cA - cB : (a.sort_order ?? 0) - (b.sort_order ?? 0)
    })
    .map(r => ({
      id:         r.id,
      category:   r.category,
      categoryName: r.manual_categories?.name || r.category,
      slug:       r.slug,
      title:      r.title,
      subtitle:   r.subtitle || null,
      body:       r.body     || '',
      sortOrder:  r.sort_order,
      minLevel:   r.min_level ?? 1,
      updatedAt:  r.updated_at,
    }))
}

export const dbPatchManual = async (id, patch) => {
  const row = {}
  if ('title'    in patch) row.title    = patch.title
  if ('subtitle' in patch) row.subtitle = patch.subtitle
  if ('body'     in patch) row.body     = patch.body
  if (Object.keys(row).length === 0) return
  const { error } = await supabase.from('manual_sections').update(row).eq('id', id)
  if (error) throw friendly(error)
}

// ═══════════════════════════════════════════════════════════
// CALENDARIO (029 migration)
// SECURITY INVOKER — cada usuario ve su propio alcance.
// ═══════════════════════════════════════════════════════════

const mapCalendarRow = (r) => ({
  kind:       r.kind,
  entityType: r.entity_type,
  entityId:   r.entity_id,
  title:      r.title,
  subtitle:   r.subtitle,
  dueAt:      r.due_at,
  priority:   r.priority,
  isOverdue:  r.is_overdue,
  isToday:    r.is_today,
})

export const dbGetCalendarRange = async (from, to) => {
  const { data, error } = await supabase.rpc('my_calendar_range', { p_from: from, p_to: to })
  if (error) throw friendly(error)
  return (data || []).map(mapCalendarRow)
}

// ═══════════════════════════════════════════════════════════
// OPPORTUNITY INFLUENCERS (032 migration)
// ═══════════════════════════════════════════════════════════

const rowToOppInfluencer = (r, totalMap = {}) => ({
  id:             r.id,
  opportunityId:  r.opportunity_id,
  influencerId:   r.influencer_id,
  influencerName: r.influencers?.name || r.influencers?.username || '—',
  status:         r.status,
  notes:          r.notes ?? null,
  createdAt:      r.created_at,
  totalValue:     totalMap[r.id] ?? 0,
})

const rowToOppInfluencerItem = (r) => ({
  id:                     r.id,
  opportunityInfluencerId: r.opportunity_influencer_id,
  activationTypeId:       r.activation_type_id ?? null,
  activationTypeName:     r.activation_types?.name ?? null,
  activationTypeColor:    r.activation_types?.color ?? '#8B5CF6',
  quantity:               r.quantity,
  unitValue:              Number(r.unit_value),
  subtotal:               Number(r.subtotal),
  notes:                  r.notes ?? null,
})

export const dbGetOpportunityInfluencers = async (opportunityId) => {
  const [{ data: oi, error: e1 }, { data: tots, error: e2 }] = await Promise.all([
    supabase.from('opportunity_influencers')
      .select('*, influencers(id, name, username)')
      .eq('opportunity_id', opportunityId)
      .order('created_at'),
    supabase.from('v_opportunity_influencer_totals')
      .select('opportunity_influencer_id, total_value')
      .eq('opportunity_id', opportunityId),
  ])
  if (e1) throw friendly(e1)
  const totalMap = {}
  for (const t of tots || []) totalMap[t.opportunity_influencer_id] = Number(t.total_value)
  return (oi || []).map(r => rowToOppInfluencer(r, totalMap))
}

export const dbAddOpportunityInfluencer = async (opportunityId, influencerId, notes = null) => {
  const uid = await myId()
  if (!uid) throw new Error('Sesión expirada. Volvé a entrar.')
  const { data, error } = await supabase.from('opportunity_influencers')
    .insert([{ opportunity_id: opportunityId, influencer_id: influencerId, notes, created_by: uid }])
    .select('*, influencers(id, name, username)').single()
  if (error) {
    // UNIQUE (opportunity_id, influencer_id): si ya estaba, decirlo con nombre propio
    // en lugar del "duplicate key" genérico.
    if (/duplicate key/i.test(error.message || '')) throw new Error('Esa influencer ya está en la oportunidad.')
    throw friendly(error)
  }
  return rowToOppInfluencer(data)
}

export const dbUpdateOpportunityInfluencerStatus = async (id, status) => {
  const { error } = await supabase.from('opportunity_influencers').update({ status }).eq('id', id)
  if (error) throw friendly(error)
}

export const dbDeleteOpportunityInfluencer = async (id) => {
  const { error } = await supabase.from('opportunity_influencers').delete().eq('id', id)
  if (error) throw friendly(error)
}

export const dbGetOpportunityInfluencerItems = async (opportunityInfluencerId) => {
  const { data, error } = await supabase.from('opportunity_influencer_items')
    .select('*, activation_types(id, name, color)')
    .eq('opportunity_influencer_id', opportunityInfluencerId)
    .order('created_at')
  if (error) throw friendly(error)
  return (data || []).map(rowToOppInfluencerItem)
}

export const dbAddOpportunityInfluencerItem = async (opportunityInfluencerId, activationTypeId, quantity, unitValue, notes = null) => {
  const { data, error } = await supabase.from('opportunity_influencer_items')
    .insert([{
      opportunity_influencer_id: opportunityInfluencerId,
      activation_type_id: activationTypeId || null,
      quantity: Number(quantity) || 1,
      unit_value: Number(unitValue) || 0,
      notes,
    }])
    .select('*, activation_types(id, name, color)').single()
  if (error) throw friendly(error)
  return rowToOppInfluencerItem(data)
}

export const dbUpdateOpportunityInfluencerItem = async (id, fields) => {
  const row = {}
  if ('activationTypeId' in fields) row.activation_type_id = fields.activationTypeId || null
  if ('quantity'         in fields) row.quantity            = Number(fields.quantity) || 1
  if ('unitValue'        in fields) row.unit_value          = Number(fields.unitValue) || 0
  if ('notes'            in fields) row.notes               = fields.notes || null
  if (Object.keys(row).length === 0) return
  const { error } = await supabase.from('opportunity_influencer_items').update(row).eq('id', id)
  if (error) throw friendly(error)
}

export const dbDeleteOpportunityInfluencerItem = async (id) => {
  const { error } = await supabase.from('opportunity_influencer_items').delete().eq('id', id)
  if (error) throw friendly(error)
}

// ═══════════════════════════════════════════════════════════
// NOTIFICATIONS (032 migration)
// ═══════════════════════════════════════════════════════════

export const dbGetNotifications = async (daysLookback = 3) => {
  const { data, error } = await supabase.rpc('my_notifications', { p_days_lookback: daysLookback })
  if (error) throw friendly(error)
  return (data || []).map(r => ({
    kind:       r.kind,
    entityType: r.entity_type,
    entityId:   r.entity_id,
    title:      r.title,
    subtitle:   r.subtitle,
    at:         r.at,
    isOverdue:  r.is_overdue,
  }))
}

// ── Fase 6.5: conversión, historial y snapshots ─────────────

export const dbConvertOpportunityToCollaboration = async (opportunityId) => {
  const { data, error } = await supabase.rpc('convert_opportunity_to_collaboration', {
    p_opportunity_id: opportunityId,
  })
  if (error) throw friendly(error)
  return (data || []).map(rowToCollaboration)
}

export const dbGetBrandInfluencerHistory = async ({ brandId = null, influencerId = null } = {}) => {
  let q = supabase.from('v_brand_influencer_history').select('*')
  if (brandId)      q = q.eq('brand_id', brandId)
  if (influencerId) q = q.eq('influencer_id', influencerId)
  const { data, error } = await q
  if (error) throw friendly(error)
  return (data || []).map(r => ({
    brandId:                  r.brand_id,
    influencerId:             r.influencer_id,
    timesWorked:              Number(r.times_worked || 0),
    firstCollabAt:            r.first_collab_at,
    lastCollabAt:             r.last_collab_at,
    totalValue:               Number(r.total_value || 0),
    totalEstimatedMediaValue: Number(r.total_estimated_media_value || 0),
    avgEngagementRate:        r.avg_engagement_rate == null ? null : Number(r.avg_engagement_rate),
  }))
}

export const dbGetMonthlySnapshots = async ({ period = null, scope = null } = {}) => {
  let q = supabase.from('monthly_snapshots').select('*').order('period', { ascending: false })
  if (period) q = q.eq('period', period)
  if (scope)  q = q.eq('scope', scope)
  const { data, error } = await q
  if (error) throw friendly(error)
  return (data || []).map(r => ({
    id:                       r.id,
    period:                   r.period,
    scope:                    r.scope,
    scopeId:                  r.scope_id,
    newInfluencers:           Number(r.new_influencers || 0),
    newBrands:                Number(r.new_brands || 0),
    newOpportunities:         Number(r.new_opportunities || 0),
    opportunitiesWon:         Number(r.opportunities_won || 0),
    opportunitiesLost:        Number(r.opportunities_lost || 0),
    collaborationsClosed:     Number(r.collaborations_closed || 0),
    totalValue:               Number(r.total_value || 0),
    totalEstimatedMediaValue: Number(r.total_estimated_media_value || 0),
    avgEngagementRate:        r.avg_engagement_rate == null ? null : Number(r.avg_engagement_rate),
    closedAt:                 r.closed_at,
  }))
}

export const dbCloseMonthlySnapshot = async (period = null) => {
  const params = {}
  if (period) params.p_period = period
  const { error } = await supabase.rpc('close_monthly_snapshot', params)
  if (error) throw friendly(error)
}
