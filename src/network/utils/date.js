import { t } from '../../i18n/index.js'

export const DEFAULT_TZ = 'America/Argentina/Buenos_Aires'

function tzOffset(tz, d = new Date()) {
  try {
    const parts = new Intl.DateTimeFormat('en', {
      timeZone: tz, timeZoneName: 'shortOffset',
    }).formatToParts(d)
    const raw = parts.find(p => p.type === 'timeZoneName')?.value || 'GMT+0'
    const inner = raw.replace('GMT', '') || '+0'
    const [hPart, mPart = '00'] = inner.split(':')
    const sign = hPart.startsWith('-') ? '-' : '+'
    const h = hPart.replace(/[+-]/, '').padStart(2, '0')
    const m = mPart.padStart(2, '0')
    return `${sign}${h}:${m}`
  } catch { return '-03:00' }
}

function inTzDate(d, tz) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(d)
}

function inTzTime(d, tz) {
  return new Intl.DateTimeFormat('es', {
    timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(d)
}

function isMidnightUTC(d) {
  return d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0
}

export function fmtDateTime(iso, tz = DEFAULT_TZ) {
  if (!iso) return null
  const d = new Date(iso)
  if (isNaN(d.getTime())) return null
  const hideTime = isMidnightUTC(d)

  const now = new Date()
  const todayStr    = inTzDate(now, tz)
  const tomorrowStr = inTzDate(new Date(now.getTime() + 86400000), tz)
  const dStr        = inTzDate(d, tz)

  let label
  if (dStr === todayStr)         label = t('agenda.today')
  else if (dStr === tomorrowStr) label = t('agenda.tomorrow')
  else label = d.toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short', timeZone: tz })

  if (hideTime) return label
  return `${label} · ${inTzTime(d, tz)}`
}

export function fmtDateTimeOverdue(iso, tz = DEFAULT_TZ) {
  const base = t('agenda.overdue')
  if (!iso) return base
  const d = new Date(iso)
  if (isNaN(d.getTime()) || isMidnightUTC(d)) return base
  return `${base} · ${inTzTime(d, tz)}`
}

export function isoToDatetimeLocal(iso, tz = DEFAULT_TZ) {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat('sv', {
    timeZone: tz,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  }).format(d).replace(' ', 'T')
}

export function datetimeLocalToIso(local, tz = DEFAULT_TZ) {
  if (!local) return null
  try {
    const offset = tzOffset(tz, new Date(local + ':00'))
    return new Date(`${local}:00${offset}`).toISOString()
  } catch { return null }
}

export function defaultDueLocal(tz = DEFAULT_TZ) {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return `${inTzDate(tomorrow, tz)}T09:00`
}
