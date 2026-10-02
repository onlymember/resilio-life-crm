// Parte de la capa de datos (antes todo en lib/database.js, que hoy
// re-exporta estos módulos). Sección: collaborations.
import { supabase } from '../supabase.js'
import { friendly, myId } from './core.js'
import { isUuid } from './users.js'
import { rowToActivationType, rowToCollaboration } from './mappers.js'

// ═══════════════════════════════════════════════════════════
// ACTIVATION TYPES
// ═══════════════════════════════════════════════════════════

let _actTypesCache = null
export const clearActTypesCache = () => { _actTypesCache = null }

export const dbGetActivationTypes = async (force = false) => {
  if (_actTypesCache && !force) return _actTypesCache
  const { data, error } = await supabase.from('activation_types')
    .select('*').eq('active', true).order('sort_order')
  if (error) throw friendly(error)
  _actTypesCache = (data || []).map(rowToActivationType)
  return _actTypesCache
}

// ═══════════════════════════════════════════════════════════
// COLLABORATIONS
// ═══════════════════════════════════════════════════════════

export const dbGetCollaborations = async (filters = {}) => {
  const paginated = filters.pageSize !== undefined
  const { page = 0, pageSize = 30, includeCancelled = false } = filters

  let q = supabase.from('collaborations')
    .select(paginated ? '*, influencers(id, name, username), brands(id, name)' : '*', { count: paginated ? 'exact' : undefined })
    .order('created_at', { ascending: false })
  if (paginated) q = q.range(page * pageSize, (page + 1) * pageSize - 1)
  else           q = q.limit(1000)   // legacy cap — App.jsx
  if (!includeCancelled)        q = q.not('status', 'eq', 'cancelled')
  if (filters.status)           q = q.eq('status', filters.status)
  if (filters.activationTypeId) q = q.eq('activation_type_id', filters.activationTypeId)
  if (filters.influencerId)     q = q.eq('influencer_id', filters.influencerId)
  if (filters.brandId)          q = q.eq('brand_id', filters.brandId)
  if (filters.cityId)           q = q.eq('city_id', filters.cityId)
  if (filters.scouterId)        q = q.eq('scouter_id', filters.scouterId)

  const { data, count, error } = await q
  if (error) throw friendly(error)

  if (!paginated) {
    return (data || []).map(rowToCollaboration)
  }
  const rows = (data || []).map(r => ({
    ...rowToCollaboration(r),
    influencerName: r.influencers?.name || r.influencers?.username || null,
    brandName:      r.brands?.name || null,
  }))
  return { rows, total: count ?? 0, hasMore: (count ?? 0) > (page + 1) * pageSize }
}

export const dbSaveCollaboration = async (collab, userId) => {
  const uid = userId || await myId()
  if (!uid) throw new Error('Sesión expirada. Volvé a entrar.')
  const { id, ...rest } = collab
  // collaborations.influencer_id es NOT NULL: sin influencer el insert muere con un
  // error crudo de Postgres. El formulario ya lo pide, pero cualquier otra llamada
  // (importador, automatización) merece un mensaje claro.
  if (!id && !rest.influencerId) throw new Error('La colaboración necesita una influencer.')
  const row = {
    campaign_id:        rest.campaignId       || null,
    opportunity_id:     rest.opportunityId    || null,
    brand_id:           rest.brandId          || null,
    influencer_id:      rest.influencerId      || null,
    scouter_id:         rest.scouterId        || uid,
    status:             rest.status           || 'proposed',
    activation_type_id: rest.activationTypeId || null,
    start_date:         rest.startDate        || null,
    end_date:           rest.endDate          || null,
    deliverables:       rest.deliverables     || [],
    content_status:     rest.contentStatus    || 'pending',
    payment_status:     rest.paymentStatus    || 'pending',
    amount:             Number(rest.amount)   || null,
    currency:           rest.currency         || null,
    notes:              rest.notes            || null,
  }
  // Derive city from brand then influencer (same cascade as collab_city_id() in SQL).
  let cityId = rest.cityId || null
  if (!cityId && row.brand_id) {
    const { data: b } = await supabase.from('brands').select('city_id').eq('id', row.brand_id).maybeSingle()
    cityId = b?.city_id || null
  }
  if (!cityId && row.influencer_id) {
    const { data: inf } = await supabase.from('influencers').select('city_id').eq('id', row.influencer_id).maybeSingle()
    cityId = inf?.city_id || null
  }
  row.city_id = cityId
  if (isUuid(id)) {
    const { data, error } = await supabase.from('collaborations')
      .update(row).eq('id', id).select('*').single()
    if (error) throw friendly(error)
    return rowToCollaboration(data)
  }
  const { data, error } = await supabase.from('collaborations')
    .insert([{ ...row, created_by: uid }]).select('*').single()
  if (error) throw friendly(error)
  return rowToCollaboration(data)
}

export const dbDeleteCollaboration = async (id) => {
  const { data, error } = await supabase.from('collaborations')
    .update({ status: 'cancelled' }).eq('id', id).select('*').single()
  if (error) throw friendly(error)
  return rowToCollaboration(data)
}

export const dbPatchCollaboration = async (id, patch) => {
  const FIELD_MAP = {
    influencerId:        'influencer_id',
    brandId:             'brand_id',
    campaignId:          'campaign_id',
    opportunityId:       'opportunity_id',
    activationTypeId:    'activation_type_id',
    status:              'status',
    startDate:           'start_date',
    startTime:           'start_time',
    endDate:             'end_date',
    deliverables:        'deliverables',
    contentStatus:       'content_status',
    paymentStatus:       'payment_status',
    amount:              'amount',
    currency:            'currency',
    results:             'results',
    notes:               'notes',
    nextAction:          'next_action',
    nextActionAt:        'next_action_at',
    contractUrl:         'contract_url',
    invoiceUrl:          'invoice_url',
    reach:               'reach',
    impressions:         'impressions',
    likes:               'likes',
    comments:            'comments',
    shares:              'shares',
    saves:               'saves',
    linkClicks:          'link_clicks',
    engagementRate:      'engagement_rate',
    estimatedMediaValue: 'estimated_media_value',
    resultsNotes:        'results_notes',
  }
  const row = {}
  for (const [camel, snake] of Object.entries(FIELD_MAP)) {
    if (camel in patch) row[snake] = patch[camel]
  }
  if (Object.keys(row).length === 0) return
  const { error } = await supabase.from('collaborations').update(row).eq('id', id)
  if (error) throw friendly(error)
}

// ═══════════════════════════════════════════════════════════
// COLLABORATION DELIVERABLES
// ═══════════════════════════════════════════════════════════

export const rowToDeliverable = (r) => ({
  id:          r.id,
  description: r.description,
  dueDate:     r.due_date ?? null,
  status:      r.status,
  completedAt: r.completed_at ?? null,
  sortOrder:   r.sort_order ?? 0,
})

export const dbGetCollaborationDeliverables = async (collaborationId) => {
  const { data, error } = await supabase
    .from('collaboration_deliverables')
    .select('*')
    .eq('collaboration_id', collaborationId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) throw friendly(error)
  return (data || []).map(rowToDeliverable)
}

export const dbAddCollaborationDeliverable = async (collaborationId, { description, dueDate, sortOrder = 0 }) => {
  const { data, error } = await supabase
    .from('collaboration_deliverables')
    .insert([{ collaboration_id: collaborationId, description, due_date: dueDate || null, sort_order: sortOrder }])
    .select('*').single()
  if (error) throw friendly(error)
  return rowToDeliverable(data)
}

export const dbUpdateCollaborationDeliverable = async (id, patch) => {
  const row = {}
  if ('description' in patch) row.description = patch.description
  if ('dueDate'     in patch) row.due_date     = patch.dueDate || null
  if ('sortOrder'   in patch) row.sort_order   = patch.sortOrder
  if ('status'      in patch) {
    row.status       = patch.status
    row.completed_at = patch.status === 'approved' ? new Date().toISOString() : null
  }
  if (Object.keys(row).length === 0) return
  const { data, error } = await supabase
    .from('collaboration_deliverables')
    .update(row).eq('id', id).select('*').single()
  if (error) throw friendly(error)
  return rowToDeliverable(data)
}

export const dbDeleteCollaborationDeliverable = async (id) => {
  const { error } = await supabase.from('collaboration_deliverables').delete().eq('id', id)
  if (error) throw friendly(error)
}

