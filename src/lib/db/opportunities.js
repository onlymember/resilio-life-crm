// Parte de la capa de datos (antes todo en lib/database.js, que hoy
// re-exporta estos módulos). Sección: opportunities.
import { supabase } from '../supabase.js'
import { friendly, myId } from './core.js'
import { isUuid } from './users.js'
import { rowToCampaign, rowToCampaignInfluencer } from './mappers.js'

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

export const rowToOpportunity = (r) => ({
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

