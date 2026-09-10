// ═══════════════════════════════════════════════════════════
// METRICS.JS — Wrappers para las RPCs de métricas (012/013)
// Todas son SECURITY INVOKER: el resultado depende de quién llama.
// Un regional_lead y Dirección ven la misma pantalla con datos distintos.
// ═══════════════════════════════════════════════════════════
import { supabase } from './supabase.js'

export const getNetworkStats = async ({ cityId, countryId, regionId, from, to } = {}) => {
  const { data, error } = await supabase.rpc('network_stats', {
    p_city:    cityId    || null,
    p_country: countryId || null,
    p_region:  regionId  || null,
    p_from:    from      || null,
    p_to:      to        || null,
  })
  if (error) throw error
  return data
}

export const getNetworkAlerts = async () => {
  const { data, error } = await supabase.rpc('network_alerts')
  if (error) throw error
  return data || []
}

export const getScouterPerformance = async (userId, from, to) => {
  const params = { p_user: userId }
  if (from) params.p_from = from
  if (to)   params.p_to   = to
  const { data, error } = await supabase.rpc('scouter_performance', params)
  if (error) throw error
  return data
}

export const getGoalProgress = async (goalId) => {
  const { data, error } = await supabase.rpc('goal_progress', { p_goal_id: goalId })
  if (error) throw error
  return data
}

export const searchGlobal = async (q, lim = 20) => {
  const { data, error } = await supabase.rpc('global_search', { q, lim })
  if (error) throw error
  return data || []
}

// ── Scouter Home (022/023) ───────────────────────────────────

export const getMyAgenda = async (daysAhead = 7) => {
  const { data, error } = await supabase.rpc('my_agenda', { p_days_ahead: daysAhead })
  if (error) throw error
  return (data || []).map(r => ({
    kind:       r.kind,
    entityType: r.entity_type,
    entityId:   r.entity_id,
    title:      r.title,
    subtitle:   r.subtitle,
    dueAt:      r.due_at,
    priority:   r.priority,
    isOverdue:  r.is_overdue,
    isToday:    r.is_today,
    whatsapp:   r.whatsapp   || null,
    instagram:  r.instagram  || null,
    phone:      r.phone      || null,
  }))
}

export const getMyNetworkStats = async () => {
  const { data, error } = await supabase.rpc('my_network_stats')
  if (error) throw error
  const d = data || {}
  return {
    influencers:      Number(d.influencers      ?? 0),
    brands:           Number(d.brands           ?? 0),
    opportunities:    Number(d.opportunities    ?? 0),
    collaborations:   Number(d.collaborations   ?? 0),
    tasksToday:       Number(d.tasks_today      ?? 0),
    tasksOverdue:     Number(d.tasks_overdue    ?? 0),
    followupsToday:   Number(d.followups_today  ?? 0),
    followupsOverdue: Number(d.followups_overdue ?? 0),
  }
}

export const getMyMissions = async () => {
  const { data, error } = await supabase.rpc('my_missions')
  if (error) throw error
  return (data || []).map(r => ({
    id:           r.id,
    title:        r.title,
    description:  r.description,
    metric:       r.metric,
    target:       Number(r.target),
    progress:     Number(r.progress),
    pct:          Number(r.pct),
    rewardPoints: r.reward_points,
    endsAt:       r.ends_at,
  }))
}
