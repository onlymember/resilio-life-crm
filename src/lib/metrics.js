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
