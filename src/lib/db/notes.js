// Parte de la capa de datos (antes todo en lib/database.js, que hoy
// re-exporta estos módulos). Sección: notes.
import { supabase } from '../supabase.js'
import { friendly, myId } from './core.js'
import { isUuid } from './users.js'

// ═══════════════════════════════════════════════════════════
// PERSONAL NOTES (030) — cuaderno privado por usuario
// ═══════════════════════════════════════════════════════════

export const rowToPersonalNote = (r) => ({
  id:        r.id,
  title:     r.title,
  body:      r.body,
  pinned:    r.pinned,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
})

export const dbGetPersonalNotes = async () => {
  const { data, error } = await supabase.from('personal_notes')
    .select('*')
    .order('pinned', { ascending: false })
    .order('updated_at', { ascending: false })
  if (error) throw friendly(error)
  return (data || []).map(rowToPersonalNote)
}

export const dbSavePersonalNote = async (note, userId) => {
  const uid = userId || await myId()
  if (!uid) throw new Error('Sesión expirada. Volvé a entrar.')
  const row = {
    title:      note.title || null,
    body:       note.body || '',
    pinned:     !!note.pinned,
    updated_at: new Date().toISOString(),
  }
  if (isUuid(note.id)) {
    const { data, error } = await supabase.from('personal_notes')
      .update(row).eq('id', note.id).select('*').single()
    if (error) throw friendly(error)
    return rowToPersonalNote(data)
  }
  const { data, error } = await supabase.from('personal_notes')
    .insert([{ ...row, user_id: uid }]).select('*').single()
  if (error) throw friendly(error)
  return rowToPersonalNote(data)
}

export const dbDeletePersonalNote = async (id) => {
  const { error } = await supabase.from('personal_notes').delete().eq('id', id)
  if (error) throw friendly(error)
}

// ═══════════════════════════════════════════════════════════
// NOTES FEED (030) — agregador de notas de entidades
// ═══════════════════════════════════════════════════════════

export const rowToFeedNote = (r) => ({
  entityType:     r.entity_type,
  entityId:       r.entity_id,
  entityLabel:    r.entity_label,
  noteText:       r.note_text,
  notedAt:        r.noted_at,
  ownerScouterId: r.owner_scouter_id,
})

export const dbGetNotesFeed = async () => {
  const { data, error } = await supabase.from('my_notes_feed')
    .select('*')
    .order('noted_at', { ascending: false })
  if (error) throw friendly(error)
  return (data || []).map(rowToFeedNote)
}

