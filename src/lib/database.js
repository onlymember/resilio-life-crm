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

export const dbApproveUser = async (userId, rol = 'viewer', opts = {}) => {
  const { scope = 'global', scopeId = null, ecosistemas } = opts
  const ecos = ecosistemas || getRolePermsDb(rol).ecosistemas

  // Update profile estado + rol
  const { error: pErr } = await supabase.from('profiles')
    .update({ estado: 'aprobado', rol })
    .eq('id', userId)
  if (pErr) throw pErr

  // Revoke existing roles and insert new one
  await supabase.from('user_roles').update({ active: false }).eq('user_id', userId)
  const { error: rErr } = await supabase.from('user_roles').insert([{
    user_id:     userId,
    role:        rol,
    scope:       scope,
    scope_id:    scopeId,
    ecosistemas: ecos,
    active:      true,
  }])
  if (rErr) throw rErr

  // Create scouters row if applicable
  if (rol === 'scouter' && scopeId) {
    await supabase.from('scouters').upsert([{
      user_id: userId,
      city_id: scopeId,
      active:  true,
    }], { onConflict: 'user_id' })
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
  await supabase.from('user_roles').update({ active: false }).eq('user_id', id)
  await supabase.from('profiles').update({ estado: 'bloqueado' }).eq('id', id)
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
  id:               r.id,
  campaignId:       r.campaign_id,
  brandId:          r.brand_id,
  influencerId:     r.influencer_id,
  scouterId:        r.scouter_id,
  cityId:           r.city_id,
  countryId:        r.country_id,
  status:           r.status,
  activationTypeId: r.activation_type_id,
  startDate:        r.start_date,
  endDate:          r.end_date,
  deliverables:     r.deliverables || [],
  contentStatus:    r.content_status,
  paymentStatus:    r.payment_status,
  amount:           r.amount,
  currency:         r.currency,
  results:          r.results || {},
  notes:            r.notes,
  createdBy:        r.created_by,
  createdAt:        r.created_at,
  updatedAt:        r.updated_at,
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
  brandId:     r.brand_id,
  scouterId:   r.owner_scouter_id,
  cityId:      r.city_id,
  countryId:   r.country_id,
  status:      r.status,
  value:       r.value,
  currency:    r.currency,
  notes:       r.notes,
  createdBy:   r.created_by,
  createdAt:   r.created_at,
  updatedAt:   r.updated_at,
  // 020_crm_fields
  nextAction:   r.next_action  ?? null,
  nextActionAt: r.next_action_at ?? null,
})

// Paginada — Network. Siempre devuelve { rows, total, hasMore }.
export const dbGetOpportunities = async ({
  page = 0, pageSize = 30,
  search, status, brandId, ownerId,
  orderBy = 'created_at', orderDir = 'desc',
} = {}) => {
  let q = supabase.from('opportunities')
    .select('*', { count: 'exact' })
    .order(orderBy, { ascending: orderDir === 'asc' })
    .range(page * pageSize, (page + 1) * pageSize - 1)
  if (status)  q = q.eq('status', status)
  if (brandId) q = q.eq('brand_id', brandId)
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
    brand_id:         rest.brandId    || null,
    city_id:          rest.cityId     || null,
    country_id:       rest.countryId  || null,
    status:           rest.status     || 'new',
    value:            Number(rest.value) || null,
    currency:         rest.currency   || null,
    notes:            rest.notes      || null,
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
  let q = supabase.from('collaborations')
    .select('*')
    .not('status', 'eq', 'cancelled')
    .order('created_at', { ascending: false })
  if (filters.status)           q = q.eq('status', filters.status)
  if (filters.activationTypeId) q = q.eq('activation_type_id', filters.activationTypeId)
  if (filters.influencerId)     q = q.eq('influencer_id', filters.influencerId)
  const { data, error } = await q
  if (error) throw friendly(error)
  return (data || []).map(rowToCollaboration)
}

export const dbSaveCollaboration = async (collab, userId) => {
  const uid = userId || await myId()
  if (!uid) throw new Error('Sesión expirada. Volvé a entrar.')
  const { id, ...rest } = collab
  const row = {
    campaign_id:        rest.campaignId       || null,
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
// GOALS / MISSIONS (solo lectura desde el cliente)
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
    next_follow_up: i.nextFollowUp ?? null,
    notes:     i.notes ?? null,
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
})

const brandToRow = async (b) => {
  const geo = await resolveGeo(b.ciudad ?? b.city, b.pais ?? b.country)
  const { id, ...rest } = b
  return {
    name:     (b.name || b.nombre || '').trim() || 'Sin nombre',
    category: b.category ?? b.categoria ?? null,
    city_id:    b.cityId ?? geo.city_id,
    country_id: b.countryId ?? geo.country_id,
    status:   b.status ?? 'active',
    potential: b.potential ?? null,
    website:  b.website ?? null,
    next_follow_up: b.nextFollowUp ?? null,
    notes:    b.notes ?? null,
    data:     rest,
  }
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

// Paginada — Network. Siempre devuelve { rows, total, hasMore }.
export const dbGetInfluencers = async ({
  page = 0, pageSize = 30,
  search, cityId, countryId, ownerId, status, relationshipStatus, category,
  orderBy = 'created_at', orderDir = 'desc',
} = {}) => {
  let q = supabase.from('influencers')
    .select('*', { count: 'exact' })
    .order(orderBy, { ascending: orderDir === 'asc' })
    .range(page * pageSize, (page + 1) * pageSize - 1)
  if (status)             q = q.eq('status', status)
  if (cityId)             q = q.eq('city_id', cityId)
  if (countryId)          q = q.eq('country_id', countryId)
  if (ownerId)            q = q.eq('owner_scouter_id', ownerId)
  if (relationshipStatus) q = q.eq('relationship_status', relationshipStatus)
  if (category)           q = q.eq('category', category)
  if (search)             q = q.or(`name.ilike.%${search}%,username.ilike.%${search}%`)
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

// ═══════════════════════════════════════════════════════════
// BRANDS
// ═══════════════════════════════════════════════════════════

// Paginada — Network. Siempre devuelve { rows, total, hasMore }.
export const dbGetBrands = async ({
  page = 0, pageSize = 30,
  search, cityId, countryId, ownerId, status, relationshipStatus, category,
  orderBy = 'created_at', orderDir = 'desc',
} = {}) => {
  let q = supabase.from('brands')
    .select('*', { count: 'exact' })
    .order(orderBy, { ascending: orderDir === 'asc' })
    .range(page * pageSize, (page + 1) * pageSize - 1)
  if (status)             q = q.eq('status', status)
  if (cityId)             q = q.eq('city_id', cityId)
  if (countryId)          q = q.eq('country_id', countryId)
  if (ownerId)            q = q.eq('owner_scouter_id', ownerId)
  if (relationshipStatus) q = q.eq('relationship_status', relationshipStatus)
  if (category)           q = q.eq('category', category)
  if (search)             q = q.ilike('name', `%${search}%`)
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
// real de la tabla activities.  No modificar AdminPanel.jsx.
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
