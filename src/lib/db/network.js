// Parte de la capa de datos (antes todo en lib/database.js, que hoy
// re-exporta estos módulos). Sección: network.
import { supabase } from '../supabase.js'
import { friendly, myId } from './core.js'
import { rowToGoal } from './mappers.js'
import { clearGeoCache } from './geography.js'
import { clearBrandCatsCache } from './entities.js'
import { clearActTypesCache } from './collaborations.js'
// ═══════════════════════════════════════════════════════════
// INICIO · "Hoy"
// ═══════════════════════════════════════════════════════════

// Fecha local YYYY-MM-DD (no UTC: a las 23hs de Buenos Aires ya es
// "mañana" en UTC y la lista saldría corrida un día).
export const localDate = (d = new Date()) => {
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
  return z.toISOString().slice(0, 10)
}
export const weekStart = (d = new Date()) => {
  const x = new Date(d); const day = (x.getDay() + 6) % 7   // lunes = 0
  x.setDate(x.getDate() - day); x.setHours(0, 0, 0, 0)
  return x
}

// Visitas de mañana que maneja uno (scouter a cargo o quien la cargó),
// con el contacto de la marca para avisarle.
export const dbGetTomorrowVisits = async () => {
  const uid = await myId()
  if (!uid) return []
  const tm = new Date(); tm.setDate(tm.getDate() + 1)
  const { data, error } = await supabase.from('collaborations')
    .select('id, start_date, status, brand_id, influencer_id, influencers(name, username, whatsapp, phone), brands(name, whatsapp, phone)')
    .eq('start_date', localDate(tm))
    .in('status', ['proposed', 'confirmed', 'in_progress'])
    .or(`scouter_id.eq.${uid},created_by.eq.${uid}`)
    .order('created_at')
  if (error) return []
  return (data || []).map(r => ({
    id: r.id, date: r.start_date, status: r.status,
    influencerId: r.influencer_id, brandId: r.brand_id,
    influencerName: r.influencers?.name || r.influencers?.username || '—',
    influencerWa: r.influencers?.whatsapp || r.influencers?.phone || null,
    brandName: r.brands?.name || '—',
    brandWa: r.brands?.whatsapp || r.brands?.phone || null,
  }))
}

// ═══════════════════════════════════════════════════════════
// OBJETIVOS SEMANALES (tabla goals, progreso calculado en goals_view)
// Una fila por scouter, métrica y semana (lunes a domingo).
// ═══════════════════════════════════════════════════════════
export const WEEKLY_METRICS = ['influencers_added', 'brands_added', 'contacts', 'collaborations']

export const dbGetWeekGoals = async (start = weekStart(), assignedTo = null) => {
  let q = supabase.from('goals_view').select('*')
    .eq('period', 'weekly').eq('period_start', localDate(start)).in('metric', WEEKLY_METRICS)
  if (assignedTo) q = q.eq('assigned_to', assignedTo)
  const { data, error } = await q
  if (error) throw friendly(error)
  return (data || []).map(rowToGoal)
}

export const dbGetMyWeekGoals = async () => {
  const uid = await myId()
  if (!uid) return []
  return dbGetWeekGoals(weekStart(), uid)
}

// rows: [{ assignedTo, metric, target }] para la semana `start`.
// target 0 o vacío = sin objetivo (se borra si existía).
export const dbSaveWeekGoals = async (rows, start = weekStart()) => {
  const uid = await myId()
  const ps = localDate(start)
  const end = new Date(start); end.setDate(end.getDate() + 6)
  const pe = localDate(end)
  const current = await dbGetWeekGoals(start)
  const key = (a, m) => `${a}|${m}`
  const byKey = Object.fromEntries(current.map(g => [key(g.assignedTo, g.metric), g]))
  for (const r of rows) {
    const g = byKey[key(r.assignedTo, r.metric)]
    const target = Number(r.target) || 0
    if (g && target <= 0) {
      const { error } = await supabase.from('goals').delete().eq('id', g.id)
      if (error) throw friendly(error)
    } else if (g && Number(g.target) !== target) {
      const { error } = await supabase.from('goals').update({ target, updated_at: new Date().toISOString() }).eq('id', g.id)
      if (error) throw friendly(error)
    } else if (!g && target > 0) {
      const { error } = await supabase.from('goals').insert([{
        title: `Semana ${ps} · ${r.metric}`, metric: r.metric, target, period: 'weekly',
        period_start: ps, period_end: pe, assigned_to: r.assignedTo, status: 'active', created_by: uid,
      }])
      if (error) throw friendly(error)
    }
  }
}

// ═══════════════════════════════════════════════════════════
// RESUMEN SEMANAL (Command Center, Dirección)
// Últimos 7 días contra los 7 anteriores. Solo cuenta (head: true):
// no trae filas, así que es barato aunque la red crezca.
// ═══════════════════════════════════════════════════════════
export const countRows = async (table, build) => {
  const { count, error } = await build(supabase.from(table).select('id', { count: 'exact', head: true }))
  if (error) throw friendly(error)
  return count || 0
}

// Resumen semanal: una sola consulta en la base (migración 056). Antes
// eran 12 conteos + dos lecturas de 5000 filas sumadas en el navegador,
// y Supabase corta en 1000: con mucho volumen los números salían mal.
// Sin la 056 usa el cálculo viejo.
export const dbGetWeeklySummary = async () => {
  const { data, error } = await supabase.rpc('weekly_summary')
  if (!error && data && typeof data === 'object' && !Array.isArray(data) && data.byCity) return data
  if (error && !['PGRST202', '42883'].includes(error.code)) throw friendly(error)
  return dbGetWeeklySummaryLegacy()
}

export const dbGetWeeklySummaryLegacy = async () => {
  const now = new Date()
  const d7  = new Date(now.getTime() - 7 * 86400000).toISOString()
  const d14 = new Date(now.getTime() - 14 * 86400000).toISOString()
  const nowIso = now.toISOString()
  const range = (col, from, to) => (q) => q.gte(col, from).lt(col, to)
  const CONTACT = ['dm', 'whatsapp', 'call', 'meeting', 'email']
  const metric = async (fn) => ({ cur: await fn(d7, nowIso), prev: await fn(d14, d7) })

  const [influencers, brands, contacts, answers, collabs, completed] = await Promise.all([
    metric((a, b) => countRows('influencers', range('created_at', a, b))),
    metric((a, b) => countRows('brands', range('created_at', a, b))),
    metric((a, b) => countRows('activities', q => range('occurred_at', a, b)(q).in('type', CONTACT))),
    metric((a, b) => countRows('activities', q => range('occurred_at', a, b)(q).eq('type', 'answered'))),
    metric((a, b) => countRows('collaborations', range('created_at', a, b))),
    metric((a, b) => countRows('collaborations', q => range('updated_at', a, b)(q).eq('status', 'completed'))),
  ])

  // Altas y contactos por ciudad en la semana, para marcar las flojas.
  const [inf, act] = await Promise.all([
    supabase.from('influencers').select('city_id, created_by').gte('created_at', d7).limit(5000),
    supabase.from('collaborations').select('city_id').gte('created_at', d7).limit(5000),
  ])
  const byCity = {}
  for (const r of inf.data || []) if (r.city_id) (byCity[r.city_id] ||= { adds: 0, collabs: 0 }).adds++
  for (const r of act.data || []) if (r.city_id) (byCity[r.city_id] ||= { adds: 0, collabs: 0 }).collabs++
  const byCreator = {}
  for (const r of inf.data || []) if (r.created_by) byCreator[r.created_by] = (byCreator[r.created_by] || 0) + 1

  return { influencers, brands, contacts, answers, collabs, completed, byCity, byCreator }
}

// ═══════════════════════════════════════════════════════════
// FASE 2 (migración 049)
// ═══════════════════════════════════════════════════════════

// Aviso de duplicado mientras se escribe. Sin la 049 (o sin permiso)
// devuelve "no existe" y la pantalla sigue igual que antes.
export const dbCheckDuplicateLive = async (type, { instagram, email, whatsapp, name, excludeId } = {}) => {
  const { data, error } = await supabase.rpc('check_duplicate_v2', {
    p_type: type, p_instagram: instagram || null, p_email: email || null,
    p_whatsapp: whatsapp || null, p_name: name || null, p_exclude: excludeId || null,
  })
  if (error) return { exists: false }
  return data || { exists: false }
}

// Checklist de la colaboración (confirmada, visita, contenido, link, marca avisada).
export const dbSetCollabChecklist = async (id, checklist) => {
  const { error } = await supabase.from('collaborations').update({ checklist }).eq('id', id)
  if (error) throw friendly(error)
}

// Colaboraciones del mes para el calendario (lo que RLS deja ver).
export const dbGetCollabCalendar = async (from, to, cityId = null) => {
  let q = supabase.from('collaborations')
    .select('id, start_date, status, city_id, influencer_id, brand_id, influencers(name, username), brands(name)')
    .gte('start_date', from).lte('start_date', to)
    .neq('status', 'cancelled').order('start_date').limit(2000)
  if (cityId) q = q.eq('city_id', cityId)
  const { data, error } = await q
  if (error) throw friendly(error)
  return (data || []).map(r => ({
    id: r.id, date: r.start_date, status: r.status, cityId: r.city_id,
    influencerId: r.influencer_id, brandId: r.brand_id,
    influencerName: r.influencers?.name || r.influencers?.username || '—',
    brandName: r.brands?.name || '—',
  }))
}

// Embudo cold → warm → strong → colaboración (Dirección).
export const dbGetStageFunnel = async (days = 90) => {
  const { data, error } = await supabase.rpc('stage_funnel', { p_days: days })
  if (error) throw friendly(error)
  return (data || []).map(r => ({
    entityType: r.entity_type, step: r.step, entered: Number(r.entered), advanced: Number(r.advanced),
    pct: r.pct == null ? null : Number(r.pct), avgDays: r.avg_days == null ? null : Number(r.avg_days),
  }))
}

// ═══════════════════════════════════════════════════════════
// FASE 3 (migración 050)
// ═══════════════════════════════════════════════════════════

// Link de confirmación para la influencer (se abre en el Club, sin cuenta).
export const dbCreateCollabConfirmation = async (collabId) => {
  const { data, error } = await supabase.rpc('create_collab_confirmation', { p_collab: collabId })
  if (error) throw friendly(error)
  return { token: data.token, expiresAt: data.expires_at }
}

// Último link de la colaboración y lo que respondió.
export const dbGetLastCollabConfirmation = async (collabId) => {
  const { data, error } = await supabase.from('collab_confirmations')
    .select('token, created_at, expires_at, responded_at, response, proposed_date, proposed_time, note')
    .eq('collaboration_id', collabId).order('created_at', { ascending: false }).limit(1)
  if (error || !data?.length) return null
  const r = data[0]
  return { token: r.token, createdAt: r.created_at, expiresAt: r.expires_at, respondedAt: r.responded_at,
    response: r.response, proposedDate: r.proposed_date, proposedTime: r.proposed_time?.slice(0, 5) || null, note: r.note }
}

// Fusionar fichas (Dirección). take = columnas que se toman de la que se borra.
export const dbMergeEntities = async (type, keepId, removeId, take = []) => {
  const { data, error } = await supabase.rpc('merge_entities', { p_type: type, p_keep: keepId, p_remove: removeId, p_take: take })
  if (error) throw friendly(error)
  return data
}

export const dbGetEntityRaw = async (type, id) => {
  const { data, error } = await supabase.from(type === 'brand' ? 'brands' : 'influencers').select('*').eq('id', id).maybeSingle()
  if (error) throw friendly(error)
  return data
}

// Agenda: las tareas vinculadas a una influencer o marca traen el
// WhatsApp/Instagram/teléfono de esa ficha, igual que los seguimientos.
// Son dos o tres consultas chicas; si algo falla, la agenda queda como estaba.
export const dbEnrichAgendaContacts = async (items = []) => {
  try {
    const taskIds = items.filter(i => i.kind === 'task' && !i.whatsapp && !i.phone && !i.instagram).map(i => i.entityId)
    if (!taskIds.length) return items
    const { data: tasks } = await supabase.from('tasks').select('id, entity_type, entity_id').in('id', taskIds)
    const link = {}
    const ids = { influencer: [], brand: [] }
    for (const tk of tasks || []) {
      if ((tk.entity_type === 'influencer' || tk.entity_type === 'brand') && tk.entity_id) {
        link[tk.id] = { type: tk.entity_type, id: tk.entity_id }
        ids[tk.entity_type].push(tk.entity_id)
      }
    }
    const fetch = async (table, list) => list.length
      ? (await supabase.from(table).select('id, whatsapp, instagram, phone').in('id', [...new Set(list)])).data || []
      : []
    const [infs, brands] = await Promise.all([fetch('influencers', ids.influencer), fetch('brands', ids.brand)])
    const contact = {}
    for (const r of infs) contact[`influencer:${r.id}`] = r
    for (const r of brands) contact[`brand:${r.id}`] = r
    return items.map(i => {
      const l = i.kind === 'task' && link[i.entityId]
      const c = l && contact[`${l.type}:${l.id}`]
      return c ? { ...i, whatsapp: c.whatsapp || null, instagram: c.instagram || null, phone: c.phone || null } : i
    })
  } catch { return items }
}

// ═══════════════════════════════════════════════════════════
// AJUSTES GENERALES (app_settings, migración 051)
// ═══════════════════════════════════════════════════════════
export const dbGetSetting = async (key) => {
  const { data, error } = await supabase.from('app_settings').select('value').eq('key', key).maybeSingle()
  if (error) return null
  return data?.value ?? null
}
export const dbSetSetting = async (key, value) => {
  const uid = await myId()
  const { error } = await supabase.from('app_settings')
    .upsert({ key, value, updated_by: uid, updated_at: new Date().toISOString() }, { onConflict: 'key' })
  if (error) throw friendly(error)
}

// ═══════════════════════════════════════════════════════════
// INICIO NUEVO (migración 053)
// ═══════════════════════════════════════════════════════════

// Contactos y fichas cargadas por día, en el huso de la Scouter.
// Sin la 053 devuelve null y el Inicio esconde la meta del día.
export const dbGetDailyProgress = async (days = 60) => {
  const { data, error } = await supabase.rpc('my_daily_progress', { p_days: days })
  if (error) return null
  return (data || []).map(r => ({ day: r.day, contacts: Number(r.contacts || 0), added: Number(r.added || 0) }))
}

// Oportunidades abiertas que llevan minDays+ en la misma etapa. La RLS
// decide cuáles: la Scouter las suyas, Dirección toda la red.
export const dbGetStalledOpportunities = async (minDays = 10, limit = 5) => {
  const cutoff = new Date(Date.now() - minDays * 86400000).toISOString()
  const { data, error } = await supabase.from('opportunities')
    .select('id, title, status, status_changed_at')
    .not('status', 'in', '(won,lost,on_hold)')
    .lt('status_changed_at', cutoff)
    .order('status_changed_at', { ascending: true })
    .limit(limit)
  if (error) return []
  return (data || []).map(r => ({
    id: r.id, title: r.title, status: r.status,
    days: Math.floor((Date.now() - new Date(r.status_changed_at).getTime()) / 86400000),
  }))
}

// Ciudad de la Scouter, para precargar las altas rápidas del Inicio.
export const dbGetMyScouterCity = async () => {
  const uid = await myId()
  if (!uid) return null
  const { data } = await supabase.from('scouters').select('city_id').eq('user_id', uid).maybeSingle()
  return data?.city_id || null
}

// Al cerrar sesión: que la próxima persona en esta pestaña no herede
// datos de la anterior (geografía filtrada por su RLS, tipos, etc.).
export const dbClearCaches = () => {
  clearActTypesCache()
  clearGeoCache()
  clearBrandCatsCache()
}

