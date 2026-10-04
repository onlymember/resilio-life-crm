// POST /api/places-search  { query, city }
// Busca comercios en Google Maps (Places API New) para la bandeja de
// Prospectos. Solo Dirección y Admin: se verifica la sesión contra
// Supabase (app_can_manage_offers) antes de gastar una búsqueda.
// La clave de Google vive solo acá (GOOGLE_PLACES_API_KEY, sin VITE_).
import { extractContacts, instagramFromUrl } from './_contacts.js'

const FIELDS = [
  'places.id', 'places.displayName', 'places.formattedAddress', 'places.rating',
  'places.userRatingCount', 'places.nationalPhoneNumber', 'places.internationalPhoneNumber',
  'places.websiteUri', 'places.googleMapsUri', 'places.primaryTypeDisplayName', 'places.businessStatus',
].join(',')

async function canManage(token) {
  const url = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').replace(/\/$/, '')
  const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
  if (!url || !key || !token) return false
  const r = await fetch(`${url}/rest/v1/rpc/app_can_manage_offers`, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: '{}',
  })
  if (!r.ok) return false
  return (await r.json()) === true
}

async function fetchSite(url) {
  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), 3500)
  try {
    const r = await fetch(url, { signal: ctl.signal, redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ResilioNetwork/1.0)' } })
    if (!r.ok || !(r.headers.get('content-type') || '').includes('text/html')) return {}
    return extractContacts((await r.text()).slice(0, 400000))
  } catch { return {} } finally { clearTimeout(timer) }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'method' }); return }
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  try {
    if (!(await canManage(token))) { res.status(403).json({ error: 'forbidden' }); return }
  } catch { res.status(502).json({ error: 'auth_unavailable' }); return }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
  const query = String(body.query || '').trim().slice(0, 80)
  const city  = String(body.city || '').trim().slice(0, 80)
  if (!query || !city) { res.status(400).json({ error: 'missing' }); return }

  const key = process.env.GOOGLE_PLACES_API_KEY
  if (!key) { res.status(500).json({ error: 'no_key' }); return }

  let g
  try {
    const r = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': FIELDS },
      body: JSON.stringify({ textQuery: `${query} en ${city}`, languageCode: 'es', pageSize: 20 }),
    })
    g = await r.json()
    if (!r.ok) {
      const quota = r.status === 429 || /quota|RESOURCE_EXHAUSTED/i.test(JSON.stringify(g))
      res.status(quota ? 429 : 502).json({ error: quota ? 'quota' : 'google', detail: g?.error?.message || null })
      return
    }
  } catch { res.status(502).json({ error: 'google' }); return }

  const places = (g.places || [])
    .filter(p => !p.businessStatus || p.businessStatus === 'OPERATIONAL')
    .map(p => {
      const site = p.websiteUri || null
      const igFromSite = instagramFromUrl(site)
      return {
        id: p.id,
        name: p.displayName?.text || '',
        category: p.primaryTypeDisplayName?.text || null,
        address: p.formattedAddress || null,
        rating: p.rating ?? null,
        reviews: p.userRatingCount ?? null,
        phone: p.internationalPhoneNumber || p.nationalPhoneNumber || null,
        website: igFromSite ? null : site,
        instagram: igFromSite,
        email: null,
        maps_url: p.googleMapsUri || null,
      }
    })

  // Instagram y email desde la web de cada comercio (en paralelo, 3,5 s máximo cada una).
  await Promise.all(places.map(async (p) => {
    if (!p.website) return
    const c = await fetchSite(p.website)
    if (c.instagram && !p.instagram) p.instagram = c.instagram
    if (c.email) p.email = c.email
  }))

  res.status(200).json({ places })
}
