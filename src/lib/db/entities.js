// Parte de la capa de datos (antes todo en lib/database.js, que hoy
// re-exporta estos módulos). Sección: entities.
import { supabase } from '../supabase.js'
import { friendly, myId } from './core.js'
import { isUuid } from './users.js'
import { dbLogActivityFor } from './tasks.js'
import { brandToRow, influencerToRow, locationToRow, rowToBrand, rowToInfluencer, rowToLocation } from './geography.js'
// ═══════════════════════════════════════════════════════════
// INFLUENCERS
// ═══════════════════════════════════════════════════════════

// Columnas que admiten NULLS LAST en influencers
// Tope duro para "seleccionar todo". No es una limitacion de la base:
// es que repartir mas de dos mil fichas de un saque, con el escalonado
// de la 041, le llenaria a una persona mas de tres meses de agenda.
// Si alguna vez hace falta mas, conviene repartir por tandas igual.
export const MAX_BULK_IDS = 2000

export const INF_NULLS_LAST_COLS = new Set(['engagement','last_contact_at','followers','next_action_at'])

// Paginada — Network. Siempre devuelve { rows, total, hasMore }.
export const safe = (s) => String(s).replace(/[,()"']/g, ' ').trim()

// Limites del dia local del navegador, en ISO, para el filtro
// "seguimiento hoy". Se calcula aca y no en la consulta porque el
// corte del dia depende de quien mira, no del servidor.
export const startOfToday = () => {
  const d = new Date(); d.setHours(0, 0, 0, 0); return d.toISOString()
}
export const startOfTomorrow = () => {
  const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + 1); return d.toISOString()
}

// Varios grupos "A o B" que tienen que cumplirse a la vez (por ejemplo
// sin WhatsApp Y búsqueda por nombre). PostgREST recibe un solo "or",
// así que se anidan: or(and(or(g1),or(g2))).
export const orGroups = (q, groups) => {
  const g = groups.filter(Boolean)
  if (g.length === 0) return q
  if (g.length === 1) return q.or(g[0])
  return q.or(`and(${g.map(x => `or(${x})`).join(',')})`)
}

export const dbGetInfluencers = async ({
  page = 0, pageSize = 30,
  search, cityId, countryId, ownerId, status, relationshipStatus, category,
  noOwner = false, noCity = false, overdueOnly = false, overdueToday = false,
  noNextAction = false, idsOnly = false,
  // Fecha de alta (ISO, "to" excluyente) y quién la cargó.
  createdFrom, createdTo, createdBy,
  // Fichas incompletas: sin WhatsApp / sin categoría.
  noWhatsapp = false, noCategory = false,
  orderBy = 'created_at', orderDir = 'desc',
} = {}) => {
  const nullsFirst = !INF_NULLS_LAST_COLS.has(orderBy)
  let q = supabase.from('influencers')
    // idsOnly: para "seleccionar todo" hace falta la lista completa de
    // ids que matchean el filtro, no la pagina visible. Pedir solo la
    // columna id la hace barata aunque sean miles.
    .select(idsOnly ? 'id' : '*', { count: 'exact' })
    .order(orderBy, { ascending: orderDir === 'asc', nullsFirst })
  q = idsOnly ? q.limit(MAX_BULK_IDS) : q.range(page * pageSize, (page + 1) * pageSize - 1)
  if (status)             q = q.eq('status', status)
  if (cityId)             q = q.eq('city_id', cityId)
  if (countryId)          q = q.eq('country_id', countryId)
  if (ownerId)            q = q.eq('owner_scouter_id', ownerId)
  if (noOwner)            q = q.is('owner_scouter_id', null)
  if (noCity)             q = q.is('city_id', null)
  if (overdueOnly)        q = q.lt('next_action_at', new Date().toISOString())
  if (overdueToday)       q = q.gte('next_action_at', startOfToday())
                              .lt('next_action_at',  startOfTomorrow())
  // Sin proxima accion = invisible para la agenda: no aparece en el Home
  // de nadie. Sin este filtro no habia forma de encontrarlas.
  if (noNextAction)       q = q.is('next_action_at', null)
  if (relationshipStatus) q = q.eq('relationship_status', relationshipStatus)
  if (category)           q = q.eq('category', category)
  if (createdFrom)        q = q.gte('created_at', createdFrom)
  if (createdTo)          q = q.lt('created_at', createdTo)
  if (createdBy)          q = q.eq('created_by', createdBy)
  q = orGroups(q, [
    noWhatsapp && 'whatsapp.is.null,whatsapp.eq.',
    noCategory && 'category.is.null,category.eq.',
    search && `name.ilike.%${safe(search)}%,username.ilike.%${safe(search)}%`,
  ])
  const { data, count, error } = await q
  if (error) throw friendly(error)
  if (idsOnly) return { ids: (data || []).map(r => r.id), total: count ?? 0 }
  const rows = (data || []).map(rowToInfluencer)
  return { rows, total: count ?? 0, hasMore: (count ?? 0) > (page + 1) * pageSize }
}

// ═══════════════════════════════════════════════════════════
// ALTAS DE INFLUENCERS (reporte del Command Center)
//
// Trae solo fecha de alta, quién la cargó y dueña actual de las fichas
// creadas desde `from`. RLS acota: Dirección ve toda la red; un lead de
// territorio, su territorio. Se agrupa en el navegador para contar los
// días en el huso de quien mira. De a 1000 filas (tope de PostgREST).
// ═══════════════════════════════════════════════════════════
export const dbGetInfluencerIntake = (opts = {}) => dbGetIntake({ ...opts, table: 'influencers' })
export const dbGetBrandIntake      = (opts = {}) => dbGetIntake({ ...opts, table: 'brands' })

export const dbGetIntake = async ({ table, from, cityId, countryId } = {}) => {
  const PAGE = 1000, MAX = 20000
  const out = []
  for (let off = 0; off < MAX; off += PAGE) {
    let q = supabase.from(table)
      .select('id, created_at, created_by, owner_scouter_id')
      .gte('created_at', from)
      .order('created_at', { ascending: true })
      .range(off, off + PAGE - 1)
    if (cityId)    q = q.eq('city_id', cityId)
    if (countryId) q = q.eq('country_id', countryId)
    const { data, error } = await q
    if (error) throw friendly(error)
    out.push(...(data || []))
    if (!data || data.length < PAGE) break
  }
  return out.map(r => ({ id: r.id, createdAt: r.created_at, createdBy: r.created_by, ownerId: r.owner_scouter_id }))
}

// Nombres visibles para una lista de ids de usuario (quién cargó / dueña).
export const dbGetPeopleNames = async (ids = []) => {
  const uniq = [...new Set(ids.filter(Boolean))]
  if (!uniq.length) return {}
  const { data, error } = await supabase.from('profiles')
    .select('id, nombre, sobrenombre, email').in('id', uniq)
  if (error) throw friendly(error)
  const m = {}
  for (const p of data || []) m[p.id] = (p.sobrenombre || '').trim() || p.nombre || p.email || '—'
  return m
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

// ═══════════════════════════════════════════════════════════
// CARGA EN LOTE
//
// El importador guardaba fila por fila: un `await` dentro de un `for`.
// 500 marcas eran 500 viajes al servidor, con el usuario mirando una
// barra de progreso durante minutos. De a 100 son 5 viajes.
//
// El mapeo a columnas sigue siendo el mismo (influencerToRow /
// brandToRow), asi que una fila importada queda IDENTICA a una cargada
// a mano. Lo unico que cambia es cuantas viajan juntas.
//
// resolveGeo() usa el cache de dbGetGeography(), asi que resolver la
// ciudad de 500 filas no cuesta 500 consultas: cuesta una.
// ═══════════════════════════════════════════════════════════

// Nombre propio: BULK_CHUNK ya existe mas abajo, para el reparto en
// lote. Son dos cosas distintas y cada una tiene su tamaño.
export const IMPORT_CHUNK = 100

export const saveBulk = async (table, rows, toRow, onProgress) => {
  const uid = await myId()
  if (!uid) throw new Error('Sesión expirada. Volvé a entrar.')

  const mapped = []
  for (const r of rows) mapped.push({ ...(await toRow(r)), created_by: uid, owner_scouter_id: uid })

  const ok = []
  const failed = []
  for (let i = 0; i < mapped.length; i += IMPORT_CHUNK) {
    const chunk = mapped.slice(i, i + IMPORT_CHUNK)
    const { data, error } = await supabase.from(table).insert(chunk).select('id')
    if (error) {
      // Postgres aborta el INSERT entero si UNA fila falla, asi que el
      // lote se reintenta de a una para no perder las 99 buenas por
      // culpa de una mala, y para poder decir CUAL fallo.
      for (const row of chunk) {
        const one = await supabase.from(table).insert([row]).select('id')
        if (one.error) failed.push({ name: row.name || '?', error: friendly(one.error).message })
        else ok.push(one.data[0].id)
        onProgress?.(ok.length + failed.length, mapped.length)
      }
    } else {
      ok.push(...(data || []).map(d => d.id))
      onProgress?.(ok.length + failed.length, mapped.length)
    }
  }
  return { created: ok.length, failed }
}

export const dbSaveInfluencersBulk = (list, onProgress) =>
  saveBulk('influencers', list, influencerToRow, onProgress)

export const dbSaveBrandsBulk = (list, onProgress) =>
  saveBulk('brands', list, brandToRow, onProgress)

// Revisa un archivo entero contra la base en UNA llamada. Devuelve solo
// las filas que ya existen, indexadas por la clave que se mando.
// Ver supabase/043_duplicados_en_lote.sql.
export const dbCheckDuplicates = async (type, rows) => {
  if (!rows?.length) return {}
  const { data, error } = await supabase.rpc('check_duplicates_bulk', {
    p_type: type, p_rows: rows,
  })
  if (error) throw friendly(error)
  return data || {}
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

export const BRAND_NULLS_LAST_COLS = new Set(['last_contact_at','next_action_at','potential_value'])

// Paginada — Network. Siempre devuelve { rows, total, hasMore }.
export const dbGetBrands = async ({
  page = 0, pageSize = 30,
  search, cityId, countryId, ownerId, status, relationshipStatus, category, categoryId,
  noOwner = false, noCity = false, overdueFollowup = false, noNextAction = false,
  idsOnly = false,
  // Fecha de alta (ISO, "to" excluyente) y quién la cargó.
  createdFrom, createdTo, createdBy,
  noWhatsapp = false, noCategory = false,
  orderBy = 'created_at', orderDir = 'desc',
} = {}) => {
  const nullsFirst = !BRAND_NULLS_LAST_COLS.has(orderBy)
  let q = supabase.from('brands')
    .select(idsOnly ? 'id' : '*', { count: 'exact' })
    .order(orderBy, { ascending: orderDir === 'asc', nullsFirst })
  q = idsOnly ? q.limit(MAX_BULK_IDS) : q.range(page * pageSize, (page + 1) * pageSize - 1)
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
  if (noNextAction)       q = q.is('next_action_at', null)
  if (createdFrom)        q = q.gte('created_at', createdFrom)
  if (createdTo)          q = q.lt('created_at', createdTo)
  if (createdBy)          q = q.eq('created_by', createdBy)
  if (noCategory)         q = q.is('category_id', null)
  q = orGroups(q, [
    noWhatsapp && 'whatsapp.is.null,whatsapp.eq.',
    search && `name.ilike.%${safe(search)}%`,
  ])
  const { data, count, error } = await q
  if (error) throw friendly(error)
  if (idsOnly) return { ids: (data || []).map(r => r.id), total: count ?? 0 }
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
export const clearBrandCatsCache = () => { _brandCatsCache = null }

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
export const CONTACT_TYPE_MAP = {
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

