// Embudo de invitaciones a la red (064): agrupa los links por ciudad,
// por scouter o por mensaje (A/B). Puro, para poder probarlo.
const empty = () => ({ sent: 0, viewed: 0, joined: 0, declined: 0 })

export function groupInvites(rows = [], by = 'city') {
  const total = empty()
  const map = new Map()
  for (const r of rows) {
    if (r.status === 'closed' && !r.viewed) continue
    const key = by === 'city' ? (r.cityId || null) : by === 'scouter' ? (r.createdBy || null) : (r.variant || 'a')
    if (!map.has(key)) map.set(key, { key, ...empty() })
    const g = map.get(key)
    for (const o of [g, total]) {
      o.sent += 1
      if (r.viewed) o.viewed += 1
      if (r.status === 'joined') o.joined += 1
      if (r.status === 'declined') o.declined += 1
    }
  }
  const groups = [...map.values()].sort((a, b) => b.sent - a.sent || String(a.key).localeCompare(String(b.key)))
  return { total, groups }
}

export const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0)
