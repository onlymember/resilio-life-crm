// Parte de la capa de datos (antes todo en lib/database.js, que hoy
// re-exporta estos módulos). Sección: operations.
import { supabase } from '../supabase.js'
import { friendly, myId } from './core.js'
import { dbLogActivityFor } from './tasks.js'

// ═══════════════════════════════════════════════════════════
// ASSIGN ENTITY — único camino de reasignación
// Los nombres de los parámetros DEBEN coincidir con la firma SQL
// (p_entity_type, p_entity_id, p_to_owner, p_reason) o el RPC falla.
// ═══════════════════════════════════════════════════════════

export const dbAssignEntity = async (entityType, entityId, toOwner, reason = null) => {
  const { error } = await supabase.rpc('assign_entity', {
    p_entity_type: entityType,
    p_entity_id:   entityId,
    p_to_owner:    toOwner,
    p_reason:      reason,
  })
  if (error) throw friendly(error)
}

// ═══════════════════════════════════════════════════════════
// COMPAT SHIMS — mapean la firma vieja del AdminPanel al schema
// real de la tabla activities.
// ═══════════════════════════════════════════════════════════

export const dbLogActivity = async ({ userId, userName, accion, detalle, seccion } = {}) => {
  if (!userId || !accion) return
  await dbLogActivityFor(
    userId,
    'admin',
    String(userId),
    accion,
    detalle || accion,
    null,
    { userName, seccion },
  )
}

export const dbGetActivityLog = async (limit = 100) => {
  const { data, error } = await supabase.from('activities')
    .select('*')
    .eq('entity_type', 'admin')
    .order('occurred_at', { ascending: false })
    .limit(limit)
  if (error) return []
  return (data || []).map(r => ({
    id:         r.id,
    userId:     r.actor_id,
    userName:   r.metadata?.userName || r.actor_id,
    accion:     r.type,
    detalle:    r.title,
    seccion:    r.metadata?.seccion || 'admin',
    created_at: r.occurred_at || r.created_at,
  }))
}

// ═══════════════════════════════════════════════════════════
// NEXT ACTIONS — wrappers de complete_next_action / set_next_action
// Usan las RPCs SQL (022) que hacen las dos escrituras atómicas.
// ═══════════════════════════════════════════════════════════

export const friendlyRpc = (error) => {
  const m = error?.message || ''
  if (m.includes('no existe o no tenés permiso')) return new Error('El registro no existe o no tenés permiso para modificarlo.')
  if (m.includes('entity_type inválido'))         return new Error('Tipo de entidad no reconocido.')
  if (/row-level security/i.test(m))              return new Error('No tenés permiso para esta operación.')
  return new Error('No se pudo completar la operación. Intentá de nuevo.')
}

export const dbCompleteNextAction = async (entityType, entityId, note = null) => {
  const { error } = await supabase.rpc('complete_next_action', {
    p_entity_type:   entityType,
    p_entity_id:     entityId,
    p_activity_type: 'follow_up',
    p_note:          note,
  })
  if (error) throw friendlyRpc(error)
}

export const dbSetNextAction = async (entityType, entityId, action, at) => {
  const { error } = await supabase.rpc('set_next_action', {
    p_entity_type: entityType,
    p_entity_id:   entityId,
    p_action:      action,
    p_at:          at,
  })
  if (error) throw friendlyRpc(error)
}

// ═══════════════════════════════════════════════════════════
// SCOUTERS — gestión (026)
// upsert_scouter es SECURITY DEFINER: hace las tres escrituras
// (scouters, profiles.estado, user_roles) en una llamada atómica.
// ═══════════════════════════════════════════════════════════

export const dbUpsertScouter = async ({ userId, cityId, teamId = null, level = 1, status = 'active' }) => {
  const { error } = await supabase.rpc('upsert_scouter', {
    p_user_id: userId,
    p_city_id: cityId,
    p_team_id: teamId,
    p_level:   level,
    p_status:  status,
  })
  if (error) throw friendly(error)
}

export const BULK_CHUNK = 100

// assign_entities_bulk devuelve una fila POR ENTIDAD con ok/error.
// Fallos parciales NO lanzan excepción: vienen en el array de resultados.
// onProgress(done, total) es opcional para mostrar progreso.
export const dbAssignBulk = async (entityType, entityIds, toOwner, reason = null, onProgress) => {
  const results = []
  for (let i = 0; i < entityIds.length; i += BULK_CHUNK) {
    const chunk = entityIds.slice(i, i + BULK_CHUNK)
    const { data, error } = await supabase.rpc('assign_entities_bulk', {
      p_entity_type: entityType,
      p_entity_ids:  chunk,
      p_to_owner:    toOwner,
      p_reason:      reason,
    })
    if (error) throw friendly(error)
    for (const r of data || []) {
      results.push({ entityId: r.entity_id, ok: r.ok, error: r.error })
    }
    if (onProgress) onProgress(results.length, entityIds.length)
  }
  return results
}

// ═══════════════════════════════════════════════════════════
// MANUAL (027 migration)
// RLS filtra por scouters.level — NO duplicar en cliente.
// Edición solo para Dirección (RLS lo valida en dbPatchManual).
// ═══════════════════════════════════════════════════════════

export const dbGetManualCategories = async () => {
  const { data, error } = await supabase.from('manual_categories')
    .select('*').eq('active', true).order('sort_order')
  if (error) throw friendly(error)
  return (data || []).map(r => ({ code: r.code, name: r.name, sortOrder: r.sort_order }))
}

export const dbGetManual = async () => {
  const { data, error } = await supabase.from('manual_sections')
    .select('*, manual_categories(code, name, sort_order)')
    .eq('active', true)
    .order('sort_order')
  if (error) throw friendly(error)
  return (data || [])
    .sort((a, b) => {
      const cA = a.manual_categories?.sort_order ?? 0
      const cB = b.manual_categories?.sort_order ?? 0
      return cA !== cB ? cA - cB : (a.sort_order ?? 0) - (b.sort_order ?? 0)
    })
    .map(r => ({
      id:         r.id,
      category:   r.category,
      categoryName: r.manual_categories?.name || r.category,
      slug:       r.slug,
      title:      r.title,
      subtitle:   r.subtitle || null,
      body:       r.body     || '',
      sortOrder:  r.sort_order,
      minLevel:   r.min_level ?? 1,
      updatedAt:  r.updated_at,
    }))
}

export const dbPatchManual = async (id, patch) => {
  const row = {}
  if ('title'    in patch) row.title    = patch.title
  if ('subtitle' in patch) row.subtitle = patch.subtitle
  if ('body'     in patch) row.body     = patch.body
  if (Object.keys(row).length === 0) return
  row.updated_at = new Date().toISOString()
  // Si no hay permiso, la base ignora el cambio sin error: se avisa.
  const { data, error } = await supabase.from('manual_sections').update(row).eq('id', id).select('id')
  if (error) throw friendly(error)
  if (!data?.length) throw new Error('No se guardó: solo Dirección puede editar el manual.')
}

// ── Primeros pasos (pestaña "Cómo usar Network") ──────────────
// Cinco preguntas de sí/no sobre lo que hizo la persona con sesión.
// Cada una por separado: si una falla (permiso, tabla), queda en false
// y el resto sigue.
export const dbGetFirstSteps = async () => {
  const uid = await myId()
  if (!uid) return {}
  const has = async (q) => {
    try { const { count, error } = await q; return !error && (count || 0) > 0 } catch { return false }
  }
  const head = { count: 'exact', head: true }
  const [influencer, whatsapp, contact, task, invite] = await Promise.all([
    has(supabase.from('influencers').select('id', head).eq('created_by', uid)),
    has(supabase.from('influencers').select('id', head).eq('created_by', uid).not('whatsapp', 'is', null).neq('whatsapp', '')),
    has(supabase.from('activities').select('id', head).eq('actor_id', uid).in('type', ['whatsapp', 'dm', 'call'])),
    has(supabase.from('tasks').select('id', head).eq('created_by', uid)),
    has(supabase.from('influencer_invites').select('id', head).eq('created_by', uid)),
  ])
  return { influencer, whatsapp, contact, task, invite }
}

// ═══════════════════════════════════════════════════════════
// CALENDARIO (029 migration)
// SECURITY INVOKER — cada usuario ve su propio alcance.
// ═══════════════════════════════════════════════════════════

export const mapCalendarRow = (r) => ({
  kind:       r.kind,
  entityType: r.entity_type,
  entityId:   r.entity_id,
  title:      r.title,
  subtitle:   r.subtitle,
  dueAt:      r.due_at,
  priority:   r.priority,
  isOverdue:  r.is_overdue,
  isToday:    r.is_today,
})

export const dbGetCalendarRange = async (from, to) => {
  const { data, error } = await supabase.rpc('my_calendar_range', { p_from: from, p_to: to })
  if (error) throw friendly(error)
  return (data || []).map(mapCalendarRow)
}

