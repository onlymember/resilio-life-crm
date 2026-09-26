// Nombre visible de una persona de la red.
//
// network_scouters() resuelve el nombre con
// coalesce(sobrenombre, nombre, email), y coalesce NO considera vacío
// al string ''. Un perfil con sobrenombre = '' devuelve '' y la UI
// queda mostrando nada: en el selector de Responsable de Tareas el
// ítem se veía como " · Rosario", o sea solo la ciudad.
//
// Acá el fallback se hace de nuevo, tratando '' y los espacios como
// ausencia, para que la pantalla no dependa de cuán limpios estén los
// datos. Devuelve siempre un string no vacío.
const clean = (v) => (typeof v === 'string' && v.trim() ? v.trim() : null)

export const personName = (p) =>
  clean(p?.nombre) || clean(p?.sobrenombre) || clean(p?.username) || clean(p?.email) || '—'

// Nombre + ciudad, para listas donde conviven Scouters de varias.
export const personLabel = (p) => {
  const n = personName(p)
  const city = clean(p?.ciudad)
  return city ? `${n} · ${city}` : n
}

// Primer nombre, para chips donde el espacio es corto.
export const personShort = (p) => personName(p).split(' ')[0]
