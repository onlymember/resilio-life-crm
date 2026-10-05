// WhatsApp / teléfono: se corrige solo al terminar de escribir.
// Mismo criterio que norm_phone() de la base (049): formato internacional
// con +, sin guiones ni paréntesis, separado con espacios para leerlo:
//   "0341 15 555-1111" (Argentina) → "+54 9 341 555 1111"
//   "+34 612-345-678"              → "+34 612 345 678"
// La base guarda solo los números (+5493415551111); los links de
// WhatsApp usan solo los números, así que los espacios no molestan.

// Códigos de país conocidos, de más largo a más corto.
const DIALS = ['598', '595', '591', '593', '351', '54', '34', '56', '52', '57', '51', '58', '55', '44', '49', '39', '33', '1']

const group = (s, sizes) => {
  const out = []
  let i = 0
  for (const n of sizes) { if (i >= s.length) break; out.push(s.slice(i, i + n)); i += n }
  if (i < s.length) out.push(s.slice(i))
  return out.join(' ')
}

// Agrupa los números que van después del código de país.
function groupNational(dial, rest) {
  if (dial === '54') {
    // Celular con 9: 9 + área + número. Buenos Aires (11) tiene área de 2.
    if (rest.length === 11 && rest[0] === '9') {
      const r = rest.slice(1)
      return '9 ' + (r.startsWith('11') ? group(r, [2, 4, 4]) : group(r, [3, 3, 4]))
    }
    if (rest.length === 10) return rest.startsWith('11') ? group(rest, [2, 4, 4]) : group(rest, [3, 3, 4])
  }
  if (dial === '34' && rest.length === 9) return group(rest, [3, 3, 3])
  if (dial === '1' && rest.length === 10) return group(rest, [3, 3, 4])
  if (rest.length <= 4) return rest
  // Genérico: de a 3 y el último de 4.
  const head = rest.slice(0, rest.length - 4)
  return (head.match(/.{1,3}/g) || []).join(' ') + ' ' + rest.slice(-4)
}

// raw: lo que escribió la persona. dial: código del país de la ficha
// (countries.dial_code), si se conoce. Si no se puede entender, se
// devuelve como vino (sin guiones ni paréntesis).
export function formatPhone(raw, dial) {
  if (raw == null) return raw
  const src = String(raw).trim()
  if (!src) return ''
  let v = src.replace(/[^0-9+]/g, '')
  if (v.startsWith('00')) v = '+' + v.slice(2)
  let d = v.replace(/[^0-9]/g, '')
  const plus = v.startsWith('+')

  if (!plus) {
    const code = String(dial || '').replace(/[^0-9]/g, '')
    if (!code) return src.replace(/[-().]/g, ' ').replace(/\s+/g, ' ').trim()
    if (!(d.startsWith(code) && d.length >= code.length + 9)) {
      d = d.replace(/^0+/, '')
      if (code === '54') {
        d = d.replace(/^(\d{2,4})15(\d{6,8})$/, '$1$2')   // el "15" local
        if (d.length === 10) d = '9' + d
      }
      d = code + d
    }
  }
  // Argentina con +54 pero sin el 9 de celular.
  if (/^54[1-8]\d{9}$/.test(d)) d = '549' + d.slice(2)
  if (d.length < 8 || d.length > 15) return src.replace(/[-().]/g, ' ').replace(/\s+/g, ' ').trim()

  const code = DIALS.find(c => d.startsWith(c)) || d.slice(0, 2)
  return `+${code} ${groupNational(code, d.slice(code.length))}`.trim()
}

// Código de país de una ciudad (cities + countries de dbGetGeography).
export function dialForCity(cityId, geo) {
  if (!cityId || !geo) return null
  const city = (geo.cities || []).find(c => c.id === cityId)
  const country = city && (geo.countries || []).find(c => c.id === city.country_id)
  return country?.dial_code || null
}
