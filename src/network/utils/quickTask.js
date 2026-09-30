// Tareas escribiendo: "llamar a Sofi el jueves 11hs" → título, fecha,
// hora y a quién va. Todo en el navegador, sin IA: reglas simples en
// español (y lo básico en inglés). Lo que no reconoce queda en el título.

const DAYS = {
  domingo: 0, lunes: 1, martes: 2, miercoles: 3, miércoles: 3, jueves: 4, viernes: 5, sabado: 6, sábado: 6,
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6,
}
const DAY_RE = Object.keys(DAYS).join('|')

const pad = (n) => String(n).padStart(2, '0')
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

// today: Date "de hoy" en el huso del usuario (solo se usa año/mes/día).
export function parseQuickTask(input, today = new Date()) {
  let text = ` ${input.trim()} `
  let date = null, time = null
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const addDays = (n) => { const d = new Date(base); d.setDate(d.getDate() + n); return d }
  const cut = (re) => { text = text.replace(re, ' ') }

  // Fecha
  let m
  if ((m = text.match(/\s(pasado\s+mañana|pasado\s+manana)\s/i))) { date = addDays(2); cut(m[0]) }
  else if ((m = text.match(/\s(mañana|manana|tomorrow)\s/i))) { date = addDays(1); cut(m[0]) }
  else if ((m = text.match(/\s(hoy|today)\s/i))) { date = addDays(0); cut(m[0]) }
  else if ((m = text.match(/\sen\s+(\d{1,2})\s+d[ií]as?\s/i))) { date = addDays(Number(m[1])); cut(m[0]) }
  else if ((m = text.match(new RegExp(`\\s(?:el\\s+|este\\s+|on\\s+)?(${DAY_RE})(?:\\s+(\\d{1,2})(?!\\s*(?:hs|h|am|pm|:|\\d)))?\\s`, 'i')))) {
    const target = DAYS[m[1].toLowerCase()]
    let diff = (target - base.getDay() + 7) % 7
    if (diff === 0) diff = 7
    date = addDays(diff)
    if (m[2]) {   // "el jueves 12": el número manda si coincide con un día del mes
      const d = new Date(base.getFullYear(), base.getMonth(), Number(m[2]))
      if (d < base) d.setMonth(d.getMonth() + 1)
      date = d
    }
    cut(m[0])
  }
  else if ((m = text.match(/\s(?:el\s+)?(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\s/))) {
    const y = m[3] ? (m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3])) : base.getFullYear()
    date = new Date(y, Number(m[2]) - 1, Number(m[1]))
    if (!m[3] && date < base) date.setFullYear(y + 1)
    cut(m[0])
  }

  // Hora: "11hs", "11 hs", "11:30", "a las 11", "11am", "18h"
  if ((m = text.match(/\s(?:a\s+las?\s+|at\s+)?(\d{1,2})(?::(\d{2}))?\s*(hs|h|am|pm)\b\.?\s?/i))
   || (m = text.match(/\s(?:a\s+las?\s+|at\s+)(\d{1,2})(?::(\d{2}))?()\s/i))
   || (m = text.match(/\s(\d{1,2}):(\d{2})()\s/))) {
    let h = Number(m[1]); const min = Number(m[2] || 0); const suf = (m[3] || '').toLowerCase()
    if (suf === 'pm' && h < 12) h += 12
    if (suf === 'am' && h === 12) h = 0
    if (h <= 23 && min <= 59) { time = `${pad(h)}:${pad(min)}`; cut(m[0]) }
  }
  if (time && !date) date = addDays(0)

  // A quién: "a Sofi", "con Nike", "to Ana" → 1 o 2 palabras.
  let who = null
  if ((m = text.match(/\s(?:a|con|para|to|with)\s+([A-ZÁÉÍÓÚÑ@][\wÁÉÍÓÚÑáéíóúñ.@-]*(?:\s+[A-ZÁÉÍÓÚÑ][\wÁÉÍÓÚÑáéíóúñ-]*)?)/))) {
    who = m[1].replace(/^@/, '').trim()
  }

  const title = text.replace(/\s+/g, ' ').replace(/\s(el|a\s+las?)\s*$/i, '').trim()
  return {
    title: title ? title.charAt(0).toUpperCase() + title.slice(1) : '',
    date: date ? ymd(date) : null,
    time,
    who,
  }
}
