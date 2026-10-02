// Parte de la capa de datos (antes todo en lib/database.js, que hoy
// re-exporta estos módulos). Sección: messages.
import { supabase } from '../supabase.js'
import { friendly, myId } from './core.js'
import { isUuid } from './users.js'

// ═══════════════════════════════════════════════════════════
// PLANTILLAS DE MENSAJE
// Ver supabase/044_mensajes.sql. El reemplazo de marcadores vive en
// MessageSheet.jsx, no acá: la vista previa lo necesita sin ir a la base.
// ═══════════════════════════════════════════════════════════

export const rowToMessageTemplate = (r) => ({
  id: r.id, title: r.title, body: r.body,
  target: r.target, stage: r.stage, cityId: r.city_id,
  active: r.active, createdAt: r.created_at,
})

// El filtrado por etapa y ciudad se hace acá y no en la consulta porque
// una plantilla con stage NULL sirve para TODAS las etapas, y eso en
// PostgREST serían dos condiciones OR anidadas por cada eje. Son
// decenas de filas: traerlas y filtrar en memoria es más simple de leer
// y no cambia nada en velocidad.
export const dbGetMessageTemplates = async ({ target, stage, cityId, all = false } = {}) => {
  let q = supabase.from('message_templates').select('*').order('created_at')
  if (!all) q = q.eq('active', true)
  const { data, error } = await q
  if (error) throw friendly(error)
  let rows = (data || []).map(rowToMessageTemplate)
  if (all) return rows
  if (target) rows = rows.filter(r => r.target === 'any' || r.target === target)
  if (stage)  rows = rows.filter(r => !r.stage  || r.stage === stage)
  if (cityId) rows = rows.filter(r => !r.cityId || r.cityId === cityId)
  else        rows = rows.filter(r => !r.cityId)
  return rows
}

export const dbSaveMessageTemplate = async (tpl) => {
  const uid = await myId()
  if (!uid) throw new Error('Sesión expirada. Volvé a entrar.')
  const row = {
    title:   tpl.title?.trim() || 'Sin título',
    body:    tpl.body ?? '',
    target:  tpl.target || 'any',
    stage:   tpl.stage  || null,
    city_id: tpl.cityId || null,
    active:  tpl.active !== false,
    updated_at: new Date().toISOString(),
  }
  if (isUuid(tpl.id)) {
    const { data, error } = await supabase.from('message_templates')
      .update(row).eq('id', tpl.id).select('*').single()
    if (error) throw friendly(error)
    return rowToMessageTemplate(data)
  }
  const { data, error } = await supabase.from('message_templates')
    .insert([{ ...row, created_by: uid }]).select('*').single()
  if (error) throw friendly(error)
  return rowToMessageTemplate(data)
}

// RLS niega el DELETE sin error: 0 filas y ningún mensaje. Sin el
// .select() de control, borrar sin permiso se ve igual que borrar con.
export const dbDeleteMessageTemplate = async (id) => {
  const { data, error } = await supabase.from('message_templates').delete().eq('id', id).select('id')
  if (error) throw friendly(error)
  if (!data?.length) throw new Error('No tenés permiso para borrar esta plantilla.')
}

