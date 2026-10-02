// Parte de la capa de datos (antes todo en lib/database.js, que hoy
// re-exporta estos módulos). Sección: mappers.
import { supabase } from '../supabase.js'
// ═══════════════════════════════════════════════════════════
// MAPEO ENTIDADES DE NEGOCIO
// ═══════════════════════════════════════════════════════════

export const rowToCampaign = (r) => ({
  id:            r.id,
  brandId:       r.brand_id,
  opportunityId: r.opportunity_id,
  cityId:        r.city_id,
  countryId:     r.country_id,
  name:          r.name,
  description:   r.description,
  status:        r.status,
  budget:        r.budget,
  currency:      r.currency,
  agencyPct:     r.agency_pct,
  influencerPct: r.influencer_pct,
  startDate:     r.start_date,
  endDate:       r.end_date,
  ownerId:       r.owner_id,
  createdBy:     r.created_by,
  notes:         r.notes,
  createdAt:     r.created_at,
  updatedAt:     r.updated_at,
})

export const rowToCampaignInfluencer = (r) => ({
  id:            r.id,
  campaignId:    r.campaign_id,
  influencerId:  r.influencer_id,
  assignedBy:    r.assigned_by,
  status:        r.status,
  rate:          r.rate,
  currency:      r.currency,
  deliverables:  r.deliverables || [],
  contentStatus: r.content_status,
  paymentStatus: r.payment_status,
  notes:         r.notes,
  createdAt:     r.created_at,
})

export const rowToCollaboration = (r) => ({
  id:                   r.id,
  campaignId:           r.campaign_id,
  opportunityId:        r.opportunity_id      ?? null,
  brandId:              r.brand_id,
  influencerId:         r.influencer_id,
  scouterId:            r.scouter_id,
  cityId:               r.city_id,
  countryId:            r.country_id,
  status:               r.status,
  activationTypeId:     r.activation_type_id,
  startDate:            r.start_date,
  endDate:              r.end_date,
  deliverables:         r.deliverables        || [],
  contentStatus:        r.content_status,
  paymentStatus:        r.payment_status,
  amount:               r.amount,
  currency:             r.currency,
  results:              r.results             || {},
  notes:                r.notes,
  // 031 — próxima acción
  nextAction:           r.next_action         ?? null,
  nextActionAt:         r.next_action_at      ?? null,
  // 031 — documentos
  contractUrl:          r.contract_url        ?? null,
  invoiceUrl:           r.invoice_url         ?? null,
  // 031 — KPIs
  reach:                r.reach               ?? null,
  impressions:          r.impressions         ?? null,
  likes:                r.likes               ?? null,
  comments:             r.comments            ?? null,
  shares:               r.shares              ?? null,
  saves:                r.saves               ?? null,
  linkClicks:           r.link_clicks         ?? null,
  engagementRate:       r.engagement_rate     ?? null,
  checklist:            r.checklist           || {},
  estimatedMediaValue:  r.estimated_media_value ?? null,
  resultsNotes:         r.results_notes       ?? null,
  createdBy:            r.created_by,
  createdAt:            r.created_at,
  updatedAt:            r.updated_at,
})

export const rowToActivationType = (r) => ({
  id:          r.id,
  code:        r.code,
  name:        r.name,
  description: r.description,
  color:       r.color,
  sortOrder:   r.sort_order,
})

export const rowToActivity = (r) => ({
  id:          r.id,
  actorId:     r.actor_id,
  entityType:  r.entity_type,
  entityId:    r.entity_id,
  type:        r.type,
  title:       r.title,
  description: r.description,
  metadata:    r.metadata || {},
  occurredAt:  r.occurred_at,
  createdAt:   r.created_at,
})

export const rowToTask = (r) => ({
  id:              r.id,
  templateId:      r.template_id,
  title:           r.title,
  description:     r.description,
  assignedTo:      r.assigned_to,
  createdBy:       r.created_by,
  entityType:      r.entity_type,
  entityId:        r.entity_id,
  type:            r.type,
  priority:        r.priority,
  status:          r.status,
  batchId:         r.batch_id ?? null,
  estadoEfectivo:  r.estado_efectivo || r.status,
  isOverdue:       r.is_overdue ?? (r.estado_efectivo === 'overdue'),
  dueDate:         r.due_date,
  completedAt:     r.completed_at,
  createdAt:       r.created_at,
})

export const rowToGoal = (r) => ({
  id:              r.id,
  title:           r.title,
  description:     r.description,
  metric:          r.metric,
  target:          r.target,
  period:          r.period,
  periodStart:     r.period_start,
  periodEnd:       r.period_end,
  assignedTo:      r.assigned_to,
  cityId:          r.city_id,
  countryId:       r.country_id,
  regionId:        r.region_id,
  status:          r.status,
  currentProgress: r.current_progress,
  pct:             r.pct,
  createdBy:       r.created_by,
  createdAt:       r.created_at,
})

export const rowToMission = (r) => ({
  id:           r.id,
  title:        r.title,
  description:  r.description,
  type:         r.type,
  metric:       r.metric,
  target:       r.target,
  cityId:       r.city_id,
  startsAt:     r.starts_at,
  endsAt:       r.ends_at,
  rewardPoints: r.reward_points,
  status:       r.status,
  createdBy:    r.created_by,
  createdAt:    r.created_at,
})

