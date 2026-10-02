// Parte de la capa de datos (antes todo en lib/database.js, que hoy
// re-exporta estos módulos). Sección: direction.
import { supabase } from '../supabase.js'
import { friendly, myId } from './core.js'
import { isUuid } from './users.js'
import { rowToGoal, rowToMission } from './mappers.js'

// ═══════════════════════════════════════════════════════════
// DIRECCION · pista y comparacion entre ciudades
// Ver supabase/045_direccion.sql.
// ═══════════════════════════════════════════════════════════

// runwayDays = hasta que dia tiene algo agendado. La cobertura avisa
// cuando ya cayo; la pista avisa antes.
export const dbGetCoverageRunway = async () => {
  const { data, error } = await supabase.rpc('coverage_runway')
  if (error) throw friendly(error)
  return (data || []).map(r => ({
    userId:     r.user_id,
    nombre:     r.nombre,
    ciudad:     r.ciudad,
    coverage7d: r.coverage_7d,
    runwayDays: r.runway_days,
    overdue:    r.overdue,
    sinAgenda:  r.sin_agenda,
    nivel:      r.nivel,
  }))
}

export const dbGetCityComparison = async ({ from = null, to = null } = {}) => {
  const { data, error } = await supabase.rpc('city_comparison', { p_from: from, p_to: to })
  if (error) throw friendly(error)
  return (data || []).map(r => ({
    cityId:         r.city_id,
    ciudad:         r.ciudad,
    pais:           r.pais,
    scouters:       r.scouters,
    influencers:    r.influencers,
    marcas:         r.marcas,
    oportunidades:  r.oportunidades,
    colaboraciones: r.colaboraciones,
    coverage7d:     r.coverage_7d,
    sinAgenda:      r.sin_agenda,
    nuevasFichas:   r.nuevas_fichas,
  }))
}

// ═══════════════════════════════════════════════════════════
// GOALS / MISSIONS
// ═══════════════════════════════════════════════════════════

export const dbGetGoals = async (filters = {}) => {
  let q = supabase.from('goals_view').select('*').order('period_start', { ascending: false })
  if (filters.status)     q = q.eq('status', filters.status)
  if (filters.assignedTo) q = q.eq('assigned_to', filters.assignedTo)
  const { data, error } = await q
  if (error) throw friendly(error)
  return (data || []).map(rowToGoal)
}

export const dbGetMissions = async (filters = {}) => {
  let q = supabase.from('missions').select('*').order('created_at', { ascending: false })
  if (filters.status) q = q.eq('status', filters.status)
  if (filters.cityId) q = q.eq('city_id', filters.cityId)
  const { data, error } = await q
  if (error) throw friendly(error)
  return (data || []).map(rowToMission)
}

export const dbSaveMission = async (mission, userId) => {
  const uid = userId || await myId()
  if (!uid) throw new Error('Sesión expirada. Volvé a entrar.')
  const row = {
    title:         (mission.title || '').trim() || 'Misión sin título',
    description:   mission.description || null,
    type:          mission.type || 'individual',
    metric:        mission.metric,
    target:        Number(mission.target) || 0,
    city_id:       mission.cityId || null,
    starts_at:     mission.startsAt || null,
    ends_at:       mission.endsAt || null,
    reward_points: Number(mission.rewardPoints) || 0,
    status:        mission.status || 'active',
  }
  if (isUuid(mission.id)) {
    const { data, error } = await supabase.from('missions')
      .update(row).eq('id', mission.id).select('*').single()
    if (error) throw friendly(error)
    return rowToMission(data)
  }
  const { data, error } = await supabase.from('missions')
    .insert([{ ...row, created_by: uid }]).select('*').single()
  if (error) throw friendly(error)
  return rowToMission(data)
}

