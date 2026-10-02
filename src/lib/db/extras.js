// Parte de la capa de datos (antes todo en lib/database.js, que hoy
// re-exporta estos módulos). Sección: extras.
import { supabase } from '../supabase.js'
import { friendly, myId } from './core.js'
import { rowToCollaboration } from './mappers.js'

// ═══════════════════════════════════════════════════════════
// OPPORTUNITY INFLUENCERS (032 migration)
// ═══════════════════════════════════════════════════════════

export const rowToOppInfluencer = (r, totalMap = {}) => ({
  id:             r.id,
  opportunityId:  r.opportunity_id,
  influencerId:   r.influencer_id,
  influencerName: r.influencers?.name || r.influencers?.username || '—',
  status:         r.status,
  notes:          r.notes ?? null,
  createdAt:      r.created_at,
  totalValue:     totalMap[r.id] ?? 0,
})

export const rowToOppInfluencerItem = (r) => ({
  id:                     r.id,
  opportunityInfluencerId: r.opportunity_influencer_id,
  activationTypeId:       r.activation_type_id ?? null,
  activationTypeName:     r.activation_types?.name ?? null,
  activationTypeColor:    r.activation_types?.color ?? '#8B5CF6',
  quantity:               r.quantity,
  unitValue:              Number(r.unit_value),
  subtotal:               Number(r.subtotal),
  notes:                  r.notes ?? null,
})

export const dbGetOpportunityInfluencers = async (opportunityId) => {
  const [{ data: oi, error: e1 }, { data: tots, error: e2 }] = await Promise.all([
    supabase.from('opportunity_influencers')
      .select('*, influencers(id, name, username)')
      .eq('opportunity_id', opportunityId)
      .order('created_at'),
    supabase.from('v_opportunity_influencer_totals')
      .select('opportunity_influencer_id, total_value')
      .eq('opportunity_id', opportunityId),
  ])
  if (e1) throw friendly(e1)
  const totalMap = {}
  for (const t of tots || []) totalMap[t.opportunity_influencer_id] = Number(t.total_value)
  return (oi || []).map(r => rowToOppInfluencer(r, totalMap))
}

export const dbAddOpportunityInfluencer = async (opportunityId, influencerId, notes = null) => {
  const uid = await myId()
  if (!uid) throw new Error('Sesión expirada. Volvé a entrar.')
  const { data, error } = await supabase.from('opportunity_influencers')
    .insert([{ opportunity_id: opportunityId, influencer_id: influencerId, notes, created_by: uid }])
    .select('*, influencers(id, name, username)').single()
  if (error) {
    // UNIQUE (opportunity_id, influencer_id): si ya estaba, decirlo con nombre propio
    // en lugar del "duplicate key" genérico.
    if (/duplicate key/i.test(error.message || '')) throw new Error('Esa influencer ya está en la oportunidad.')
    throw friendly(error)
  }
  return rowToOppInfluencer(data)
}

export const dbUpdateOpportunityInfluencerStatus = async (id, status) => {
  const { error } = await supabase.from('opportunity_influencers').update({ status }).eq('id', id)
  if (error) throw friendly(error)
}

export const dbDeleteOpportunityInfluencer = async (id) => {
  const { error } = await supabase.from('opportunity_influencers').delete().eq('id', id)
  if (error) throw friendly(error)
}

export const dbGetOpportunityInfluencerItems = async (opportunityInfluencerId) => {
  const { data, error } = await supabase.from('opportunity_influencer_items')
    .select('*, activation_types(id, name, color)')
    .eq('opportunity_influencer_id', opportunityInfluencerId)
    .order('created_at')
  if (error) throw friendly(error)
  return (data || []).map(rowToOppInfluencerItem)
}

export const dbAddOpportunityInfluencerItem = async (opportunityInfluencerId, activationTypeId, quantity, unitValue, notes = null) => {
  const { data, error } = await supabase.from('opportunity_influencer_items')
    .insert([{
      opportunity_influencer_id: opportunityInfluencerId,
      activation_type_id: activationTypeId || null,
      quantity: Number(quantity) || 1,
      unit_value: Number(unitValue) || 0,
      notes,
    }])
    .select('*, activation_types(id, name, color)').single()
  if (error) throw friendly(error)
  return rowToOppInfluencerItem(data)
}

export const dbUpdateOpportunityInfluencerItem = async (id, fields) => {
  const row = {}
  if ('activationTypeId' in fields) row.activation_type_id = fields.activationTypeId || null
  if ('quantity'         in fields) row.quantity            = Number(fields.quantity) || 1
  if ('unitValue'        in fields) row.unit_value          = Number(fields.unitValue) || 0
  if ('notes'            in fields) row.notes               = fields.notes || null
  if (Object.keys(row).length === 0) return
  const { error } = await supabase.from('opportunity_influencer_items').update(row).eq('id', id)
  if (error) throw friendly(error)
}

export const dbDeleteOpportunityInfluencerItem = async (id) => {
  const { error } = await supabase.from('opportunity_influencer_items').delete().eq('id', id)
  if (error) throw friendly(error)
}

// ═══════════════════════════════════════════════════════════
// NOTIFICATIONS (032 migration)
// ═══════════════════════════════════════════════════════════

export const dbGetNotifications = async (daysLookback = 3) => {
  const { data, error } = await supabase.rpc('my_notifications', { p_days_lookback: daysLookback })
  if (error) throw friendly(error)
  return (data || []).map(r => ({
    kind:       r.kind,
    entityType: r.entity_type,
    entityId:   r.entity_id,
    title:      r.title,
    subtitle:   r.subtitle,
    at:         r.at,
    isOverdue:  r.is_overdue,
  }))
}

// ── Fase 6.5: conversión, historial y snapshots ─────────────

export const dbConvertOpportunityToCollaboration = async (opportunityId) => {
  const { data, error } = await supabase.rpc('convert_opportunity_to_collaboration', {
    p_opportunity_id: opportunityId,
  })
  if (error) throw friendly(error)
  return (data || []).map(rowToCollaboration)
}

export const dbGetBrandInfluencerHistory = async ({ brandId = null, influencerId = null } = {}) => {
  let q = supabase.from('v_brand_influencer_history').select('*')
  if (brandId)      q = q.eq('brand_id', brandId)
  if (influencerId) q = q.eq('influencer_id', influencerId)
  const { data, error } = await q
  if (error) throw friendly(error)
  return (data || []).map(r => ({
    brandId:                  r.brand_id,
    influencerId:             r.influencer_id,
    timesWorked:              Number(r.times_worked || 0),
    firstCollabAt:            r.first_collab_at,
    lastCollabAt:             r.last_collab_at,
    totalValue:               Number(r.total_value || 0),
    totalEstimatedMediaValue: Number(r.total_estimated_media_value || 0),
    avgEngagementRate:        r.avg_engagement_rate == null ? null : Number(r.avg_engagement_rate),
  }))
}

export const dbGetMonthlySnapshots = async ({ period = null, scope = null } = {}) => {
  let q = supabase.from('monthly_snapshots').select('*').order('period', { ascending: false })
  if (period) q = q.eq('period', period)
  if (scope)  q = q.eq('scope', scope)
  const { data, error } = await q
  if (error) throw friendly(error)
  return (data || []).map(r => ({
    id:                       r.id,
    period:                   r.period,
    scope:                    r.scope,
    scopeId:                  r.scope_id,
    newInfluencers:           Number(r.new_influencers || 0),
    newBrands:                Number(r.new_brands || 0),
    newOpportunities:         Number(r.new_opportunities || 0),
    opportunitiesWon:         Number(r.opportunities_won || 0),
    opportunitiesLost:        Number(r.opportunities_lost || 0),
    collaborationsClosed:     Number(r.collaborations_closed || 0),
    totalValue:               Number(r.total_value || 0),
    totalEstimatedMediaValue: Number(r.total_estimated_media_value || 0),
    avgEngagementRate:        r.avg_engagement_rate == null ? null : Number(r.avg_engagement_rate),
    closedAt:                 r.closed_at,
  }))
}

export const dbCloseMonthlySnapshot = async (period = null) => {
  const params = {}
  if (period) params.p_period = period
  const { error } = await supabase.rpc('close_monthly_snapshot', params)
  if (error) throw friendly(error)
}

// ═══════════════════════════════════════════════════════════
// TRASPASO CON CONTEXTO
// Último traspaso de una ficha hacia mí (quién me la pasó, cuándo y el
// motivo que dejó al reasignar). RLS de assignments deja leer lo propio.
// ═══════════════════════════════════════════════════════════
export const dbGetLastHandoffToMe = async (entityType, entityId) => {
  const uid = await myId()
  if (!uid) return null
  const { data, error } = await supabase.from('assignments')
    .select('id, from_owner_id, reason, assigned_at')
    .eq('entity_type', entityType).eq('entity_id', String(entityId)).eq('to_owner_id', uid)
    .order('assigned_at', { ascending: false }).limit(1)
  if (error || !data?.length) return null
  const r = data[0]
  return { id: r.id, fromOwnerId: r.from_owner_id, reason: r.reason, assignedAt: r.assigned_at }
}

