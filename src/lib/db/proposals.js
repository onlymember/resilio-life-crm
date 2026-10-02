// Propuestas para marcas (059): link privado en partners.resilio.company.
// Crear pasa por create_brand_proposal (valida que la marca se vea).
// Leer/cerrar usa la tabla: la RLS deja ver solo las propias (Dirección, todas).
import { supabase } from '../supabase.js'

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
