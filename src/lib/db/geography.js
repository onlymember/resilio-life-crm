// Parte de la capa de datos (antes todo en lib/database.js, que hoy
// re-exporta estos módulos). Sección: geography.
import { supabase } from '../supabase.js'
import { friendly } from './core.js'
import { isUuid } from './users.js'
import { dbGetBrandCategories } from './entities.js'
// ═══════════════════════════════════════════════════════════
// GEOGRAPHY
// ═══════════════════════════════════════════════════════════

let _geoCache = null
export const clearGeoCache = () => { _geoCache = null }

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
export const slugify = (s) => norm(s).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

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
export const norm = (s) => (s || '').toString().trim().toLowerCase()
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')

export const resolveGeo = async (ciudad, pais) => {
  if (!ciudad && !pais) return { city_id: null, country_id: null }
  try {
    const { cities, countries } = await dbGetGeography()
    const city = cities.find(c => norm(c.name) === norm(ciudad))
    if (city) return { city_id: city.id, country_id: city.country_id }
    const country = countries.find(c => norm(c.name) === norm(pais) || norm(c.code) === norm(pais))
    return { city_id: null, country_id: country?.id ?? null }
  } catch { return { city_id: null, country_id: null } }
}


// ═══════════════════════════════════════════════════════════
// MAPEO fila ↔ objeto de la app
// Los campos de GOBIERNO son columnas reales (owner, ciudad, estado).
// `data` guarda solo el contenido de negocio.
// ═══════════════════════════════════════════════════════════

export const rowToInfluencer = (r) => ({
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

export const influencerToRow = async (i) => {
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

export const rowToBrand = (r) => ({
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

export const BRAND_REL_VALID = new Set(['cold','warm','strong','inactive'])

export const brandToRow = async (b) => {
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

export const rowToLocation = (r) => ({
  ...(r.data || {}),
  id: r.id, brandId: r.brand_id, name: r.name,
  cityId: r.city_id, countryId: r.country_id,
  address: r.address, status: r.status,
  createdAt: r.created_at, updatedAt: r.updated_at,
})

export const locationToRow = async (l) => {
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

