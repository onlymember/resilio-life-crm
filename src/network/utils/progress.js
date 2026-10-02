// Meta del día y racha a partir de my_daily_progress (053).
// days: [{ day, contacts, added }] ordenado de más viejo a hoy.
export function computeProgress(days, goal) {
  if (!days || !days.length) return null
  const today = days[days.length - 1]
  const met = (d) => d.contacts >= goal
  let streak = 0
  let i = met(today) ? days.length - 1 : days.length - 2
  for (; i >= 0 && met(days[i]); i--) streak++
  const week = days.slice(-7)
  return {
    today: today.contacts,
    reached: met(today),
    streak,
    week: {
      contacts: week.reduce((s, d) => s + d.contacts, 0),
      added:    week.reduce((s, d) => s + d.added, 0),
    },
  }
}
