// ═══════════════════════════════════════════════════════════
// RED.JS — Datos de la red de influencers (migración 047)
//
// Va aparte de database.js a propósito: nada de lo existente cambia.
// Mismas reglas que el resto de la capa de datos:
//   · DB primero, estado local después.
//   · Todo lo que falla lanza; la pantalla muestra el mensaje.
//   · Filas en camelCase; snake_case no sale de este archivo.
// Quién puede qué lo decide la base (RLS + funciones de la 047); lo que
// se chequea en pantalla es solo para no ofrecer botones inútiles.
// ═══════════════════════════════════════════════════════════
import { supabase } from './supabase.js'
import { dbSaveCollaboration } from './database.js'

// Dominio de la app de influencers. Se puede pisar con VITE_CLUB_URL
// (por ejemplo, para probar en un deploy de preview).
export const CLUB_URL = (import.meta.env.VITE_CLUB_URL || 'https://club.resilio.company').replace(/\/$/, '')

export const OFFERS_BUCKET = 'offers'
export const OFFER_IMAGE_MAX_BYTES = 5 * 1024 * 1024
export const OFFER_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

const fail = (error) => {
  // Las funciones de la 047 traen el motivo en el mensaje (en español).
  const e = new Error(error?.message || 'No se pudo completar la operación.')
  e.hint = error?.hint || null
  e.code = error?.code || null
  return e
}

// ── Links ───────────────────────────────────────────────────
export const joinLink       = (token) => `${CLUB_URL}/sumate?inv=${token}`
export const activationLink = (token) => `${CLUB_URL}/activar?inv=${token}`

export const whatsappShare = (text) => `https://wa.me/?text=${encodeURIComponent(text)}`

export const offerImageUrl = (path) =>
  path ? supabase.storage.from(OFFERS_BUCKET).getPublicUrl(path).data.publicUrl : null

// ── Tipos de oferta ─────────────────────────────────────────
let _typesCache = null
export const redGetOfferTypes = async (force = false) => {
  if (_typesCache && !force) return _typesCache
  const { data, error } = await supabase.from('offer_types')
    .select('*').eq('active', true).order('sort_order')
  if (error) throw fail(error)
  _typesCache = (data || []).map(r => ({ slug: r.slug, labelEs: r.label_es, labelEn: r.label_en }))
  return _typesCache
}

// ── Ofertas ─────────────────────────────────────────────────
const rowToOffer = (r) => ({
  id:          r.id,
  brandId:     r.brand_id,
  brandName:   r.brands?.name ?? null,
  brandLogo:   r.brands?.logo ?? null,
  cityId:      r.city_id,
  cityName:    r.cities?.name ?? null,
  title:       r.title,
  typeSlug:    r.type_slug,
  imagePath:   r.image_path,
  imageUrl:    offerImageUrl(r.image_path),
  status:      r.status,
  activatedAt: r.activated_at,
  createdAt:   r.created_at,
  updatedAt:   r.updated_at,
})

export const redGetOffers = async ({ brandId, status, cityId } = {}) => {
  let q = supabase.from('offers')
    .select('*, brands(name, logo), cities(name)')
    .order('created_at', { ascending: false })
    .limit(500)
  if (brandId) q = q.eq('brand_id', brandId)
  if (status)  q = q.eq('status', status)
  if (cityId)  q = q.eq('city_id', cityId)
  const { data, error } = await q
  if (error) throw fail(error)
  return (data || []).map(rowToOffer)
}

// Cantidad de "Me interesa" por oferta. RLS acota: cada uno cuenta los
// de las fichas que puede ver.
export const redGetInterestCounts = async (offerIds) => {
  if (!offerIds?.length) return {}
  const { data, error } = await supabase.from('offer_interests')
    .select('offer_id').eq('vote', 'interested').in('offer_id', offerIds)
  if (error) throw fail(error)
  const m = {}
  for (const r of data || []) m[r.offer_id] = (m[r.offer_id] || 0) + 1
  return m
}

export const redUploadOfferImage = async (file, brandId) => {
  if (!file) throw new Error('Elegí una imagen.')
  if (!OFFER_IMAGE_TYPES.includes(file.type)) throw new Error('La foto tiene que ser JPG, PNG o WEBP.')
  if (file.size > OFFER_IMAGE_MAX_BYTES) throw new Error('La foto no puede pesar más de 5 MB.')
  const ext  = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
  const path = `${brandId}/${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage.from(OFFERS_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false, cacheControl: '31536000' })
  if (error) throw fail(error)
  return path
}

// Crear (id vacío) o editar. created_by lo pone la base (auth.uid()).
export const redSaveOffer = async ({ id, brandId, cityId, title, typeSlug, imagePath, status }) => {
  const row = {
    brand_id:   brandId,
    city_id:    cityId,
    title:      (title || '').trim(),
    type_slug:  typeSlug,
    image_path: imagePath || null,
  }
  if (status) row.status = status
  const q = id
    ? supabase.from('offers').update(row).eq('id', id)
    : supabase.from('offers').insert([row])
  const { data, error } = await q.select('*, brands(name, logo), cities(name)').single()
  if (error) throw fail(error)
  return rowToOffer(data)
}

export const redSetOfferStatus = async (id, status) => {
  const { data, error } = await supabase.from('offers')
    .update({ status }).eq('id', id)
    .select('*, brands(name, logo), cities(name)').single()
  if (error) throw fail(error)
  return rowToOffer(data)
}

// ── Invitaciones ────────────────────────────────────────────
// kind 'join' → link de /sumate. kind 'activation' → link para una
// ficha que ya existe en el CRM (sin lead ni aprobación).
export const redCreateInvitation = async ({ kind = 'join', influencerId = null, hint = null } = {}) => {
  const { data, error } = await supabase.rpc('create_invitation', {
    p_kind: kind, p_target_influencer: influencerId, p_hint: hint,
  })
  if (error) throw fail(error)
  return {
    id: data.id, token: data.token, kind: data.kind, expiresAt: data.expires_at,
    link: data.kind === 'activation' ? activationLink(data.token) : joinLink(data.token),
  }
}

// Estado del acceso a la app de una ficha: activo, link pendiente o nada.
export const redGetAppAccess = async (influencerId) => {
  const [acc, inv] = await Promise.all([
    supabase.from('influencer_accounts').select('status, created_at, last_seen_at')
      .eq('influencer_id', influencerId).maybeSingle(),
    supabase.from('invitations').select('token, expires_at, used_at, revoked_at, created_at')
      .eq('target_influencer_id', influencerId).eq('kind', 'activation')
      .order('created_at', { ascending: false }).limit(1),
  ])
  if (acc.error) throw fail(acc.error)
  // La lectura de invitaciones puede no estar permitida (solo Dirección
  // y quien la creó): en ese caso simplemente no se muestra el link.
  const last = inv.error ? null : (inv.data || [])[0]
  const pending = last && !last.used_at && !last.revoked_at && new Date(last.expires_at) > new Date()
  return {
    account: acc.data ? { status: acc.data.status, createdAt: acc.data.created_at, lastSeenAt: acc.data.last_seen_at } : null,
    pendingInvitation: pending ? { token: last.token, expiresAt: last.expires_at, link: activationLink(last.token) } : null,
  }
}

// ── Leads ───────────────────────────────────────────────────
const rowToLead = (r) => ({
  id:                  r.id,
  name:                r.name,
  instagram:           r.instagram,
  email:               r.email,
  whatsapp:            r.whatsapp,
  cityId:              r.city_id,
  cityName:            r.cities?.name ?? r.city_text ?? null,
  categories:          r.categories || [],
  message:             r.message,
  inviterKind:         r.inviter_kind,
  inviterUserId:       r.inviter_user_id,
  suggestedOwnerId:    r.suggested_owner_id,
  matchedInfluencerId: r.matched_influencer_id,
  status:              r.status,
  decisionNote:        r.decision_note,
  decidedAt:           r.decided_at,
  influencerId:        r.influencer_id,
  createdAt:           r.created_at,
})

export const redGetLeads = async ({ status = 'pending' } = {}) => {
  let q = supabase.from('influencer_leads')
    .select('*, cities(name)').order('created_at', { ascending: false }).limit(300)
  if (status && status !== 'all') q = q.eq('status', status)
  const { data, error } = await q
  if (error) throw fail(error)
  return (data || []).map(rowToLead)
}

export const redApproveLead = async (leadId, ownerId = null) => {
  const { data, error } = await supabase.rpc('approve_lead', { p_lead_id: leadId, p_owner: ownerId })
  if (error) throw fail(error)
  return {
    influencerId:      data.influencer_id,
    alreadyHadAccount: !!data.already_had_account,
    activation: data.activation
      ? { token: data.activation.token, expiresAt: data.activation.expires_at, link: activationLink(data.activation.token) }
      : null,
  }
}

export const redRejectLead = async (leadId, note) => {
  const { error } = await supabase.rpc('reject_lead', { p_lead_id: leadId, p_note: note })
  if (error) throw fail(error)
}

// ── Intereses de una ficha ──────────────────────────────────
export const redGetInfluencerInterests = async (influencerId) => {
  const { data, error } = await supabase.from('offer_interests')
    .select('id, vote, voted_at, internal_status, internal_note, collaboration_id, offers(id, title, status, brand_id, city_id, cities(name), brands(name))')
    .eq('influencer_id', influencerId).eq('vote', 'interested')
    .order('voted_at', { ascending: false })
  if (error) throw fail(error)
  return (data || []).map(r => ({
    id:              r.id,
    votedAt:         r.voted_at,
    internalStatus:  r.internal_status,
    internalNote:    r.internal_note,
    collaborationId: r.collaboration_id,
    offerId:         r.offers?.id,
    offerTitle:      r.offers?.title,
    offerStatus:     r.offers?.status,
    cityName:        r.offers?.cities?.name ?? null,
    brandName:       r.offers?.brands?.name ?? null,
    brandId:         r.offers?.brand_id ?? null,
    cityId:          r.offers?.city_id ?? null,
    influencerId,
  }))
}

export const redUpdateInterest = async (id, { internalStatus, internalNote, collaborationId } = {}) => {
  const { data: { user } } = await supabase.auth.getUser()
  const row = { reviewed_by: user?.id ?? null, reviewed_at: new Date().toISOString() }
  if (internalStatus  !== undefined) row.internal_status  = internalStatus
  if (internalNote    !== undefined) row.internal_note    = internalNote
  if (collaborationId !== undefined) row.collaboration_id = collaborationId
  const { error } = await supabase.from('offer_interests').update(row).eq('id', id)
  if (error) throw fail(error)
}

// ── Métrica principal ───────────────────────────────────────
export const redGetConversion = async ({ from, to } = {}) => {
  const args = {}
  if (from) args.p_from = from
  if (to)   args.p_to   = to
  const { data, error } = await supabase.rpc('red_conversion', args)
  if (error) throw fail(error)
  const r = (data || [])[0] || {}
  return {
    interested:        Number(r.interested || 0),
    withCollaboration: Number(r.with_collaboration || 0),
    pct:               r.conversion_pct == null ? null : Number(r.conversion_pct),
  }
}

// ── Cambios de email pedidos desde el Club (migración 048) ──
export const redGetEmailRequests = async () => {
  const { data, error } = await supabase.from('influencer_email_requests')
    .select('id, old_email, new_email, created_at, influencer_id, influencers(name)')
    .eq('status', 'pending').order('created_at', { ascending: false })
  if (error) return []                       // sin 048 o sin permiso: no se muestra
  return (data || []).map(r => ({ id: r.id, oldEmail: r.old_email, newEmail: r.new_email,
    createdAt: r.created_at, influencerId: r.influencer_id, name: r.influencers?.name || '—' }))
}
export const redDecideEmailChange = async (id, approve) => {
  const { error } = await supabase.rpc('decide_email_change', { p_id: id, p_approve: approve })
  if (error) throw fail(error)
}

// Temas que eligió la influencer en el Club (incluye los que escribió ella).
export const redGetInfluencerTopics = async (influencerId) => {
  const { data } = await supabase.from('influencer_preferences').select('categories')
    .eq('influencer_id', influencerId).maybeSingle()
  return data?.categories || []
}

// Pendientes para la bandeja de aprobaciones y el bloque "Hoy".
// Si alguna tabla no está (o no hay permiso), cuenta 0.
export const redGetPendingCounts = async () => {
  const head = (table) => supabase.from(table).select('id', { count: 'exact', head: true })
  const [leads, emails, interests] = await Promise.all([
    head('influencer_leads').eq('status', 'pending'),
    head('influencer_email_requests').eq('status', 'pending'),
    head('offer_interests').eq('vote', 'interested').eq('internal_status', 'new'),
  ])
  return {
    leads:     leads.error ? 0 : (leads.count || 0),
    emails:    emails.error ? 0 : (emails.count || 0),
    interests: interests.error ? 0 : (interests.count || 0),
  }
}

// ── Bandeja de "Me interesa" (Dirección) ────────────────────
export const redGetInterests = async ({ status = 'open' } = {}) => {
  let q = supabase.from('offer_interests')
    .select('id, vote, voted_at, internal_status, internal_note, collaboration_id, influencer_id, influencers(name, username, owner_scouter_id), offers(id, title, brand_id, city_id, cities(name), brands(name))')
    .eq('vote', 'interested').order('voted_at', { ascending: false }).limit(300)
  if (status === 'open') q = q.in('internal_status', ['new', 'reviewed', 'contacted'])
  else if (status !== 'all') q = q.eq('internal_status', status)
  const { data, error } = await q
  if (error) throw fail(error)
  return (data || []).map(r => ({
    id: r.id, votedAt: r.voted_at, internalStatus: r.internal_status, internalNote: r.internal_note,
    collaborationId: r.collaboration_id, influencerId: r.influencer_id,
    influencerName: r.influencers?.name || r.influencers?.username || '—',
    influencerOwnerId: r.influencers?.owner_scouter_id || null,
    offerId: r.offers?.id, offerTitle: r.offers?.title,
    brandId: r.offers?.brand_id || null, cityId: r.offers?.city_id || null,
    brandName: r.offers?.brands?.name ?? null, cityName: r.offers?.cities?.name ?? null,
  }))
}

// "Me interesa" → colaboración con marca, ciudad e influencer ya puestas.
// Queda "propuesta" y a cargo de la scouter dueña de la influencer (o de
// quien la crea si no tiene). El interés queda vinculado y en "matched".
export const redCreateCollabFromInterest = async (it) => {
  const collab = await dbSaveCollaboration({
    influencerId: it.influencerId,
    brandId: it.brandId,
    cityId: it.cityId,
    scouterId: it.influencerOwnerId || undefined,
    status: 'proposed',
    notes: it.offerTitle ? `Desde la oferta "${it.offerTitle}" (Me interesa en el Club)` : null,
  })
  await redUpdateInterest(it.id, { internalStatus: 'matched', collaborationId: collab.id })
  return collab
}
