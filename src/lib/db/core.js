// Utilidades compartidas por toda la capa de datos.
import { supabase } from '../supabase.js'

// Id del usuario con sesión (o null).
export const myId = async () => {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.user?.id ?? null
}

// Traduce errores crudos de Postgres a algo que un humano entienda
export const friendly = (error) => {
  const m = error?.message || ''
  if (/row-level security/i.test(m))          return new Error('No tenés permiso para esta operación.')
  if (/violates not-null/i.test(m))           return new Error('Faltan campos obligatorios (revisá el nombre).')
  if (/duplicate key/i.test(m))               return new Error('Ese registro ya existe.')
  if (/violates foreign key/i.test(m))        return new Error('No se puede borrar: hay registros que dependen de este.')
  if (/assign_entity/i.test(m))               return new Error('El dueño se cambia desde Reasignar, no editando el registro.')
  return error
}
