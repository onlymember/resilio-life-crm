// Prospectos de marcas (063): Dirección y Admin.
// La búsqueda en Google Maps la hace la función /api/places-search
// (la clave nunca llega al navegador); acá se guarda y se trabaja.
import { supabase } from '../supabase.js'
import { friendly } from './core.js'

const mapProspect = (r) => ({
  id: r.id, placeId: r.place_id, name: r.name, category: r.category, address: r.address, city: r.city,
  rating: r.rating != null ? Number(r.rating) : null, reviews: r.reviews ?? 0,
  phone: r.phone, website: r.website, instagram: r.instagram, email: r.email, mapsUrl: r.maps_url,
  status: r.status, assignedTo: r.assigned_to, brandId: r.brand_id, searchId: r.search_id,
  actedAt: r.acted_at, createdAt: r.created_at,
})

// Busca y guarda. Devuelve { search_id, total, new, in_network, again }.
export const dbProspectSearch = async (query, city) => {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Sesión expirada. Volvé a entrar.')
  const r = await fetch('/api/places-search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({ query, city }),
  })
  const body = await r.json().catch(() => ({}))
  if (!r.ok) {
    const e = new Error(body.error || 'search_failed'); e.code = body.error || 'search_failed'; throw e
  }
  const { data, error } = await supabase.rpc('prospect_ingest', { p_query: query, p_city: city, p_places: body.places || [] })
  if (error) throw friendly(error)
  return data
}

export const dbListProspects = async ({ status, searchId } = {}) => {
  let q = supabase.from('prospects').select('*').order('reviews', { ascending: false, nullsFirst: false }).limit(500)
  if (status)   q = q.eq('status', status)
  if (searchId) q = q.eq('search_id', searchId)
  const { data, error } = await q
  if (error) throw friendly(error)
  return (data || []).map(mapProspect)
}

export const dbProspectCounts = async (searchId) => {
  let q = supabase.from('prospects').select('status')
  if (searchId) q = q.eq('search_id', searchId)
  const { data, error } = await q.limit(5000)
  if (error) throw friendly(error)
  const out = { new: 0, assigned: 0, contacted: 0, discarded: 0, in_network: 0 }
  for (const r of data || []) out[r.status] = (out[r.status] || 0) + 1
  return out
}

// Búsquedas de hoy y del mes (toda la empresa) y las últimas para repetir.
export const dbProspectUsage = async () => {
  const now = new Date()
  const day = new Date(now); day.setHours(0, 0, 0, 0)
  const month = new Date(now.getFullYear(), now.getMonth(), 1)
  const [t, m, recent] = await Promise.all([
    supabase.from('prospect_searches').select('id', { count: 'exact', head: true }).gte('created_at', day.toISOString()),
    supabase.from('prospect_searches').select('id', { count: 'exact', head: true }).gte('created_at', month.toISOString()),
    supabase.from('prospect_searches').select('id, query, city, result_count, new_count, created_at').order('created_at', { ascending: false }).limit(8),
  ])
  return {
    today: t.count ?? 0, month: m.count ?? 0,
    recent: (recent.data || []).map(r => ({ id: r.id, query: r.query, city: r.city, results: r.result_count, fresh: r.new_count, createdAt: r.created_at })),
  }
}

// action: 'contact' | 'assign' | 'discard' | 'restore'
export const dbProspectAct = async (id, action, { scouterId = null, lang = 'es' } = {}) => {
  const { data, error } = await supabase.rpc('prospect_act', { p_id: id, p_action: action, p_scouter: scouterId, p_lang: lang })
  if (error) throw friendly(error)
  return data   // { ok, status, brand_id, token }
}
