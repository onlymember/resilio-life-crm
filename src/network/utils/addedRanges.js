// Rangos de "fecha de alta" para filtrar y reportar fichas agregadas.
// Los días se cuentan en el huso del navegador de quien mira (el de la
// directora): "hoy" es su hoy, no el día UTC.

const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x }
const addDays    = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x }

// Semana de lunes a domingo.
export const startOfWeek = (d) => {
  const x = startOfDay(d)
  const dow = (x.getDay() + 6) % 7   // lunes = 0
  return addDays(x, -dow)
}

export const ADDED_PRESETS = ['any', 'today', 'yesterday', 'last7', 'thisWeek', 'last30', 'custom']

// Devuelve { from, to } en ISO (to excluyente) o null para "cualquier fecha".
export const addedRange = (preset, custom = {}) => {
  const today = startOfDay(new Date())
  switch (preset) {
    case 'today':     return { from: today, to: addDays(today, 1) }
    case 'yesterday': return { from: addDays(today, -1), to: today }
    case 'last7':     return { from: addDays(today, -6), to: addDays(today, 1) }
    case 'thisWeek':  return { from: startOfWeek(today), to: addDays(today, 1) }
    case 'last30':    return { from: addDays(today, -29), to: addDays(today, 1) }
    case 'custom': {
      // yyyy-mm-dd de los inputs, en hora local
      const f = custom.from ? startOfDay(new Date(`${custom.from}T00:00:00`)) : null
      const t = custom.to   ? addDays(startOfDay(new Date(`${custom.to}T00:00:00`)), 1) : null
      if (!f && !t) return null
      return { from: f, to: t }
    }
    default: return null
  }
}

export const rangeToFilters = (r) => r
  ? { createdFrom: r.from ? r.from.toISOString() : undefined, createdTo: r.to ? r.to.toISOString() : undefined }
  : {}

// Buckets para el reporte: últimos N días o N semanas, del más viejo al
// más nuevo. Cada uno con { key, from, to, label }.
export const buildBuckets = (mode, count, locale = 'es') => {
  const today = startOfDay(new Date())
  const out = []
  if (mode === 'week') {
    const thisWeek = startOfWeek(today)
    for (let i = count - 1; i >= 0; i--) {
      const from = addDays(thisWeek, -7 * i)
      const to   = addDays(from, 7)
      out.push({ key: from.toISOString(), from, to,
        label: from.toLocaleDateString(locale, { day: 'numeric', month: 'short' }) })
    }
  } else {
    for (let i = count - 1; i >= 0; i--) {
      const from = addDays(today, -i)
      out.push({ key: from.toISOString(), from, to: addDays(from, 1),
        label: from.toLocaleDateString(locale, { weekday: 'short', day: 'numeric' }) })
    }
  }
  return out
}

export const bucketIndex = (buckets, iso) => {
  const t = new Date(iso).getTime()
  for (let i = 0; i < buckets.length; i++) {
    if (t >= buckets[i].from.getTime() && t < buckets[i].to.getTime()) return i
  }
  return -1
}

// yyyy-mm-dd local (para inputs type=date)
export const toDateInput = (d) => {
  const x = new Date(d)
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`
}
