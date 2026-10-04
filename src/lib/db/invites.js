// Invitación a la red para influencers (064): link privado en
// partners.resilio.company/i/<token>. Crear es un INSERT directo: la RLS
// exige que quien lo crea vea la ficha. Leer/cerrar usa la misma tabla.
import { supabase } from '../supabase.js'
import { dbGetSetting, dbSetSetting } from './network.js'

export const INVITE_TEXTS_KEY = 'influencer_invite_texts'

const mapInvite = (r) => ({
  id: r.id, token: r.token, influencerId: r.influencer_id, lang: r.lang, variant: r.variant,
  status: r.status, answers: r.answers || {}, flags: r.flags || {},
  createdBy: r.created_by, createdAt: r.created_at, expiresAt: r.expires_at,
  firstViewedAt: r.first_viewed_at, lastViewedAt: r.last_viewed_at, viewCount: r.view_count || 0,
  answeredAt: r.answered_at, answerCount: r.answer_count || 0,
})

export const inviteIsOpen = (i) => i && i.status !== 'closed' && new Date(i.expiresAt) > new Date()

// Estado para mostrar: enviada → la abrió → se sumó / ahora no / menor / vencida / cerrada.
export function inviteStateOf(i) {
  if (!i) return 'none'
  if (i.status === 'closed') return 'closed'
  if (['joined', 'declined', 'underage'].includes(i.status)) return i.status
  if (new Date(i.expiresAt) < new Date()) return 'expired'
  if (i.viewCount > 0 || i.status === 'viewed') return 'viewed'
  return 'sent'
}

export const dbListInfluencerInvites = async (influencerId) => {
  const { data, error } = await supabase.from('influencer_invites')
    .select('*').eq('influencer_id', influencerId)
    .order('created_at', { ascending: false }).limit(10)
  if (error) throw error
  return (data || []).map(mapInvite)
}

// Devuelve el link vigente de la influencer o crea uno nuevo.
export const dbEnsureInfluencerInvite = async (influencerId, lang = 'es') => {
  const { data: open, error: e1 } = await supabase.from('influencer_invites')
    .select('*').eq('influencer_id', influencerId)
    .in('status', ['sent', 'viewed', 'declined']).gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false }).limit(1)
  if (e1) throw e1
  if (open?.length) return mapInvite(open[0])
  const { data, error } = await supabase.from('influencer_invites')
    .insert({ influencer_id: influencerId, lang }).select('*').single()
  if (error) throw error
  return mapInvite(data)
}

export const dbCloseInfluencerInvite = async (id) => {
  const { error } = await supabase.from('influencer_invites').update({ status: 'closed' }).eq('id', id)
  if (error) throw error
}

export const dbExtendInfluencerInvite = async (id) => {
  const expires = new Date(Date.now() + 30 * 86400000).toISOString()
  const { error } = await supabase.from('influencer_invites').update({ expires_at: expires }).eq('id', id)
  if (error) throw error
  return expires
}

// Embudo (Command, Dirección): la RLS ya deja ver toda la red a Dirección.
// Trae los links desde `from` con la ciudad de la ficha.
export const dbGetInviteFunnelRows = async (from, to) => {
  const out = []
  for (let off = 0; off < 10000; off += 1000) {
    let q = supabase.from('influencer_invites')
      .select('id, status, variant, view_count, created_by, created_at, influencers(city_id)')
      .order('created_at', { ascending: true }).range(off, off + 999)
    if (from) q = q.gte('created_at', from)
    if (to)   q = q.lt('created_at', to)
    const { data, error } = await q
    if (error) throw error
    out.push(...(data || []))
    if (!data || data.length < 1000) break
  }
  return out.map(r => ({
    id: r.id, status: r.status, variant: r.variant, viewed: (r.view_count || 0) > 0 || ['viewed', 'joined', 'declined', 'underage'].includes(r.status),
    createdBy: r.created_by, cityId: r.influencers?.city_id || null,
  }))
}

// Textos editables de la página y de los mensajes (Dirección / Admin).
export const dbGetInviteTexts = async () => (await dbGetSetting(INVITE_TEXTS_KEY)) || {}
export const dbSaveInviteTexts = (value) => dbSetSetting(INVITE_TEXTS_KEY, value)
