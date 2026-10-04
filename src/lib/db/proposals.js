// Propuestas para marcas (059): link privado en partners.resilio.company.
// Crear pasa por create_brand_proposal (valida que la marca se vea).
// Leer/cerrar usa la tabla: la RLS deja ver solo las propias (Dirección, todas).
import { supabase } from '../supabase.js'
import { myId } from './core.js'
import { proposalStateOf } from '../../network/utils/proposalState.js'

export { proposalStateOf }

const mapProposal = (r) => ({
  id: r.id, token: r.token, brandId: r.brand_id, brandName: r.brand_name, lang: r.lang,
  status: r.status, chosenPlan: r.chosen_plan, answers: r.answers || {},
  createdBy: r.created_by, createdAt: r.created_at, expiresAt: r.expires_at,
  firstViewedAt: r.first_viewed_at, lastViewedAt: r.last_viewed_at, viewCount: r.view_count || 0,
  answeredAt: r.answered_at, answerCount: r.answer_count || 0,
})

export const dbCreateBrandProposal = async (brandId, brandName, lang = 'es') => {
  const { data, error } = await supabase.rpc('create_brand_proposal', { p_brand: brandId || null, p_brand_name: brandName || '', p_lang: lang })
  if (error) throw error
  return data   // { id, token, expires_at }
}

export const dbListBrandProposals = async (brandId) => {
  const { data, error } = await supabase.from('brand_proposals')
    .select('*').eq('brand_id', brandId)
    .order('created_at', { ascending: false }).limit(10)
  if (error) throw error
  return (data || []).map(mapProposal)
}

// Cerrar el link (deja de abrirse) o darle 30 días más.
export const dbCloseBrandProposal = async (id) => {
  const { error } = await supabase.from('brand_proposals').update({ status: 'closed' }).eq('id', id)
  if (error) throw error
}

export const dbExtendBrandProposal = async (id) => {
  const expires = new Date(Date.now() + 30 * 86400000).toISOString()
  const { error } = await supabase.from('brand_proposals').update({ expires_at: expires }).eq('id', id)
  if (error) throw error
  return expires
}

const DAY = 86400000

const RANK = { answered: 4, viewed: 3, sent: 2, expired: 1, closed: 0 }

// Para la lista de Marcas: el estado más avanzado de cada marca.
// RLS acota: cada uno ve el estado de las propuestas que mandó.
export const dbGetProposalStatusFor = async (brandIds = []) => {
  const ids = [...new Set(brandIds.filter(Boolean))]
  if (!ids.length) return {}
  const { data, error } = await supabase.from('brand_proposals')
    .select('brand_id, status, chosen_plan, answered_at, first_viewed_at, expires_at')
    .in('brand_id', ids)
  if (error) return {}
  const out = {}
  for (const r of data || []) {
    const st = proposalStateOf(r)
    if (!out[r.brand_id] || RANK[st] > RANK[out[r.brand_id].state]) out[r.brand_id] = { state: st, plan: r.chosen_plan }
  }
  return out
}

// Ids de marcas con al menos una propuesta en ese estado (filtro de la lista).
export const dbBrandIdsByProposalState = async (state) => {
  const { data, error } = await supabase.from('brand_proposals')
    .select('brand_id, status, answered_at, first_viewed_at, expires_at')
    .not('brand_id', 'is', null)
    .order('created_at', { ascending: false }).limit(1000)
  if (error) return []
  // Tope de 300: los ids viajan en la URL del filtro de la lista.
  return [...new Set((data || []).filter(r => proposalStateOf(r) === state).map(r => r.brand_id))].slice(0, 300)
}

// Inicio: propuestas propias para mover hoy.
//   · la abrió y no eligió, sin volver a abrirla hace más de 3 días
//   · vence en los próximos 7 días sin respuesta
export const dbGetMyProposalsToMove = async () => {
  const uid = await myId()
  if (!uid) return []
  const now = Date.now()
  const { data, error } = await supabase.from('brand_proposals')
    .select('id, token, brand_id, brand_name, lang, status, first_viewed_at, last_viewed_at, view_count, expires_at, answered_at, brands(name, whatsapp)')
    .eq('created_by', uid).neq('status', 'closed').is('answered_at', null)
    .gt('expires_at', new Date(now).toISOString())
    .order('expires_at', { ascending: true }).limit(50)
  if (error) return []
  const out = []
  for (const r of data || []) {
    const lastSeen = r.last_viewed_at || r.first_viewed_at
    const stale    = lastSeen && now - new Date(lastSeen).getTime() > 3 * DAY
    const expiring = new Date(r.expires_at).getTime() - now < 7 * DAY
    if (!stale && !expiring) continue
    out.push({
      id: r.id, token: r.token, brandId: r.brand_id,
      brandName: r.brands?.name || r.brand_name, whatsapp: r.brands?.whatsapp || null,
      viewCount: r.view_count || 0, lastSeen, expiresAt: r.expires_at,
      reason: stale ? 'stale' : 'expiring',
    })
  }
  return out
}

// Dirección: embudo de propuestas por scouter en un período.
export const dbGetProposalFunnel = async (fromIso, toIso) => {
  const { data, error } = await supabase.from('brand_proposals')
    .select('created_by, first_viewed_at, answered_at, chosen_plan, created_at')
    .gte('created_at', fromIso).lt('created_at', toIso).limit(5000)
  if (error) throw error
  const by = {}
  const total = { sent: 0, viewed: 0, answered: 0, plans: {} }
  for (const r of data || []) {
    const k = r.created_by || 'none'
    const row = by[k] || (by[k] = { userId: r.created_by, sent: 0, viewed: 0, answered: 0, plans: {} })
    for (const x of [row, total]) {
      x.sent++
      if (r.first_viewed_at) x.viewed++
      if (r.answered_at) { x.answered++; if (r.chosen_plan) x.plans[r.chosen_plan] = (x.plans[r.chosen_plan] || 0) + 1 }
    }
  }
  return { total, rows: Object.values(by).sort((a, b) => b.sent - a.sent) }
}
