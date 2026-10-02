// Parte de la capa de datos (antes todo en lib/database.js, que hoy
// re-exporta estos módulos). Sección: tasks.
import { supabase } from '../supabase.js'
import { friendly, myId } from './core.js'
import { isUuid } from './users.js'
import { rowToActivity, rowToTask } from './mappers.js'

import { startOfToday, startOfTomorrow } from './entities.js'
// ═══════════════════════════════════════════════════════════
// ACTIVITIES — timeline de negocio
// Nota: audit_log es SOLO por triggers de DB, nunca desde el cliente.
// ═══════════════════════════════════════════════════════════

export const dbLogActivityFor = async (actorId, entityType, entityId, type, title, description = null, metadata = {}) => {
  const { error } = await supabase.from('activities').insert([{
    actor_id:    actorId,
    entity_type: entityType,
    entity_id:   String(entityId),
    type,
    title,
    description: description || null,
    metadata:    metadata || {},
  }])
  if (error) console.error('dbLogActivityFor:', error.message)
}

export const dbGetActivities = async (entityType, entityId, limit = 50) => {
  const { data, error } = await supabase.from('activities')
    .select('*')
    .eq('entity_type', entityType)
    .eq('entity_id', String(entityId))
    .order('occurred_at', { ascending: false })
    .limit(limit)
  if (error) throw friendly(error)
  return (data || []).map(rowToActivity)
}

export const dbGetActivitiesByActor = async (actorId, limit = 50) => {
  const { data, error } = await supabase.from('activities')
    .select('*')
    .eq('actor_id', actorId)
    .order('occurred_at', { ascending: false })
    .limit(limit)
  if (error) throw friendly(error)
  return (data || []).map(rowToActivity)
}

// ═══════════════════════════════════════════════════════════
// TASKS
// ═══════════════════════════════════════════════════════════

// Paginada — Network. Siempre devuelve { rows, total, hasMore }.
// `createdBy` y `statusIn` existen para el seguimiento de trabajo delegado.
// La policy task_select ya permite ver lo propio, lo que uno creo y todo si
// sos Direccion: lo unico que faltaba era poder pedirlo. Filtrar de menos
// aca es seguro — RLS acota igual.
export const dbGetTasks = async ({
  page = 0, pageSize = 30,
  assignedTo, createdBy, status, statusIn, entityType, entityId,
  overdueOnly = false, dueToday = false, templateId,
  orderBy = 'due_date', orderDir = 'asc',
} = {}) => {
  let q = supabase.from('v_tasks_estado')
    .select('*', { count: 'exact' })
    .order(orderBy, { ascending: orderDir === 'asc', nullsFirst: false })
    .range(page * pageSize, (page + 1) * pageSize - 1)
  if (assignedTo)              q = q.eq('assigned_to', assignedTo)
  if (createdBy)               q = q.eq('created_by', createdBy)
  if (status)                  q = q.eq('status', status)
  if (statusIn?.length)        q = q.in('status', statusIn)
  if (entityType && entityId)  q = q.eq('entity_type', entityType).eq('entity_id', String(entityId))
  if (templateId)              q = q.eq('template_id', templateId)
  // estado_efectivo lo deriva la vista de due_date. Filtrar por esa
  // columna en vez de recalcular "vencida" aca evita que las dos
  // definiciones se separen.
  if (overdueOnly)             q = q.eq('estado_efectivo', 'overdue')
  if (dueToday)                q = q.gte('due_date', startOfToday())
                                    .lt('due_date',  startOfTomorrow())
  const { data, count, error } = await q
  if (error) throw friendly(error)
  const rows = (data || []).map(rowToTask)
  return { rows, total: count ?? 0, hasMore: (count ?? 0) > (page + 1) * pageSize }
}

// Legacy para entity timelines (sin paginación, límite fijo)
export const dbGetTasksForEntity = async (entityType, entityId) => {
  const { data, error } = await supabase.from('v_tasks_estado')
    .select('*')
    .eq('entity_type', entityType).eq('entity_id', String(entityId))
    .order('due_date', { ascending: true, nullsFirst: false })
    .limit(50)
  if (error) throw friendly(error)
  return (data || []).map(rowToTask)
}

export const dbGetTaskById = async (id) => {
  const { data, error } = await supabase.from('tasks').select('*').eq('id', id).maybeSingle()
  if (error) throw friendly(error)
  return data ? rowToTask(data) : null
}

export const dbSaveTask = async (task, userId) => {
  const uid = userId || await myId()
  if (!uid) throw new Error('Sesión expirada. Volvé a entrar.')
  const row = {
    title:       task.title       || 'Tarea sin título',
    description: task.description || null,
    assigned_to: task.assignedTo  || null,
    entity_type: task.entityType  || null,
    entity_id:   task.entityId    ? String(task.entityId) : null,
    type:        task.type        || 'general',
    priority:    task.priority    || 'normal',
    status:      task.status      || 'todo',
    due_date:    task.dueDate     || null,
  }
  if (isUuid(task.id)) {
    const { data, error } = await supabase.from('tasks').update(row).eq('id', task.id).select('*').single()
    if (error) throw friendly(error)
    return rowToTask(data)
  }
  const { data, error } = await supabase.from('tasks')
    .insert([{ ...row, created_by: uid }]).select('*').single()
  if (error) throw friendly(error)
  return rowToTask(data)
}

// Asignar a varias personas crea una fila por persona con un batch_id
// compartido. El estado de una tarea es por persona, asi que una sola
// fila con muchos responsables no alcanzaria: cada una la completa por
// su lado. La pantalla usa el batch_id para mostrarlas como una linea
// con su progreso.
export const dbCreateTasks = async (task, assigneeIds = []) => {
  const uid = await myId()
  if (!uid) throw new Error('Sesión expirada. Volvé a entrar.')
  const ids = [...new Set((assigneeIds || []).filter(Boolean))]
  if (!ids.length) throw new Error('Elegí al menos un responsable.')

  const base = {
    title:       task.title       || 'Tarea sin título',
    description: task.description || null,
    entity_type: task.entityType  || null,
    entity_id:   task.entityId    ? String(task.entityId) : null,
    type:        task.type        || 'general',
    priority:    task.priority    || 'normal',
    status:      'todo',
    due_date:    task.dueDate     || null,
    created_by:  uid,
  }
  const batch = ids.length > 1 ? crypto.randomUUID() : null
  const rows  = ids.map(id => ({ ...base, assigned_to: id, batch_id: batch }))

  const { data, error } = await supabase.from('tasks').insert(rows).select('*')
  if (error) throw friendly(error)
  return (data || []).map(rowToTask)
}

export const dbDeleteTask = async (id) => {
  const { data, error } = await supabase.from('tasks').delete().eq('id', id).select('id')
  if (error) throw friendly(error)
  if (!data?.length) throw new Error('No tenés permiso para borrar esta tarea.')
}

// Borra las filas de un lote entero. Se usa cuando se elimina una
// tarea que fue asignada a varias personas.
export const dbDeleteTaskBatch = async (batchId) => {
  const { data, error } = await supabase.from('tasks').delete().eq('batch_id', batchId).select('id')
  if (error) throw friendly(error)
  if (!data?.length) throw new Error('No tenés permiso para borrar estas tareas.')
  return data.length
}

export const dbCompleteTask = async (id) => {
  const { data, error } = await supabase.from('tasks')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', id).select('*').single()
  if (error) throw friendly(error)
  return rowToTask(data)
}

// ═══════════════════════════════════════════════════════════
// PLANTILLAS DE TAREAS · el motor de la operación diaria
//
// Una plantilla no es una tarea: es la definición de un hábito. El
// generador la materializa en una tarea por Scouter y por período, y
// la guarda de duplicados (template_id + assigned_to + due_date) es lo
// que permite dispararlo muchas veces por día sin repetir nada.
// ═══════════════════════════════════════════════════════════

export const rowToTemplate = (r) => ({
  id:          r.id,
  title:       r.title,
  description: r.description,
  type:        r.type,
  priority:    r.priority,
  recurrence:  r.recurrence,
  targetType:  r.target_type,
  targetId:    r.target_id,
  dueHour:     r.due_hour ?? 18,
  active:      r.active,
  createdBy:   r.created_by,
  createdAt:   r.created_at,
})

export const dbGetTaskTemplates = async ({ activeOnly = false } = {}) => {
  let q = supabase.from('task_templates').select('*').order('created_at', { ascending: true })
  if (activeOnly) q = q.eq('active', true)
  const { data, error } = await q
  if (error) throw friendly(error)
  return (data || []).map(rowToTemplate)
}

export const dbSaveTaskTemplate = async (tpl) => {
  const uid = await myId()
  if (!uid) throw new Error('Sesión expirada. Volvé a entrar.')
  const row = {
    title:       tpl.title?.trim() || 'Plantilla sin título',
    description: tpl.description?.trim() || null,
    type:        tpl.type       || 'general',
    priority:    tpl.priority   || 'normal',
    recurrence:  tpl.recurrence || 'daily',
    target_type: tpl.targetType || 'network',
    target_id:   tpl.targetType && tpl.targetType !== 'network' ? (tpl.targetId || null) : null,
    due_hour:    Number.isInteger(tpl.dueHour) ? tpl.dueHour : 18,
    active:      tpl.active !== false,
  }
  if (isUuid(tpl.id)) {
    const { data, error } = await supabase.from('task_templates')
      .update(row).eq('id', tpl.id).select('*').single()
    if (error) throw friendly(error)
    return rowToTemplate(data)
  }
  const { data, error } = await supabase.from('task_templates')
    .insert([{ ...row, created_by: uid }]).select('*').single()
  if (error) throw friendly(error)
  return rowToTemplate(data)
}

// RLS niega el DELETE sin error: PostgREST devuelve 0 filas y ningún
// mensaje. Sin el .select() de control, borrar sin permiso se vería
// exactamente igual que borrar con permiso.
export const dbDeleteTaskTemplate = async (id) => {
  const { data, error } = await supabase.from('task_templates').delete().eq('id', id).select('id')
  if (error) throw friendly(error)
  if (!data?.length) throw new Error('No tenés permiso para borrar esta plantilla.')
}

// El disparador del motor. pg_cron no está disponible en esta
// instancia, así que quien abre el sistema es quien lo hace correr.
// La función del lado de la base tiene el candado de 6 horas: llamarla
// de más no genera de más.
export const dbRunDailyMaintenance = async () => {
  const { data, error } = await supabase.rpc('run_daily_maintenance')
  if (error) throw friendly(error)
  return data || { ran: false }
}

// ═══════════════════════════════════════════════════════════
// CADENCIA · que ninguna ficha se caiga del circuito
//
// Completar un seguimiento sin agendar el siguiente deja la ficha sin
// next_action_at, o sea fuera de la agenda de todos, para siempre. Eso
// era el estado de 272 fichas. advance_follow_up() cierra y reagenda en
// un solo acto, con la cadencia de supabase/042_cadencia.sql.
// ═══════════════════════════════════════════════════════════

export const dbAdvanceFollowUp = async (entityType, entityId, { days = null, outcome = null, note = null } = {}) => {
  const { data, error } = await supabase.rpc('advance_follow_up', {
    p_entity_type: entityType,
    p_entity_id:   entityId,
    p_days:        days,
    p_outcome:     outcome,
    p_note:        note,
  })
  if (error) throw friendly(error)
  return data || {}
}

// Reacomoda TODO lo vencido de una persona, lo mas viejo primero y con
// el mismo escalonado del reparto. Sin owner, el de uno mismo.
export const dbRescheduleOverdue = async (ownerId = null, cap = 20) => {
  const { data, error } = await supabase.rpc('reschedule_overdue', {
    p_owner: ownerId, p_cap: cap,
  })
  if (error) throw friendly(error)
  return data ?? 0
}

// Cancela las tareas de plantilla que ya no tienen sentido. Cancelled,
// no completed: la metrica de cumplimiento no se infla.
export const dbCancelStaleTasks = async (days = 3, ownerId = null) => {
  const { data, error } = await supabase.rpc('cancel_stale_tasks', {
    p_days: days, p_owner: ownerId,
  })
  if (error) throw friendly(error)
  return data ?? 0
}

