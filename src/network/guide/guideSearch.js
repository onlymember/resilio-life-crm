// Guía "Cómo usar Network": lectura del texto de cada guía y buscador.
// Sin dependencias de React para poder probarlo con tests.

// Minúsculas y sin tildes: "Colaboración" → "colaboracion".
export const norm = (s) => String(s || '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9@\s]/g, ' ').replace(/\s+/g, ' ').trim()

// Palabras que la gente usa para lo mismo. Cada grupo se busca junto.
const GROUPS = [
  ['whatsapp', 'wsp', 'wpp', 'whats', 'wasap', 'guasap'],
  ['influencer', 'influencers', 'influ', 'influs', 'creadora', 'creador', 'creadoras', 'talento'],
  ['marca', 'marcas', 'local', 'locales', 'cliente', 'clientes', 'negocio', 'empresa', 'brand'],
  ['colaboracion', 'colaboraciones', 'colab', 'colabs', 'canje', 'canjes', 'activacion'],
  ['tarea', 'tareas', 'pendiente', 'pendientes', 'recordatorio', 'recordar'],
  ['cargar', 'agregar', 'crear', 'sumar', 'alta', 'nueva', 'nuevo', 'anadir'],
  ['invitacion', 'invitar', 'invitaciones', 'invite'],
  ['buscar', 'busqueda', 'encontrar', 'lupa'],
  ['seguimiento', 'seguimientos', 'followup', 'follow'],
  ['instagram', 'ig', 'insta', 'dm'],
  ['editar', 'cambiar', 'corregir', 'modificar'],
  ['etapa', 'estado', 'cold', 'warm', 'strong'],
  ['avisos', 'notificaciones', 'campanita', 'alertas'],
  ['mensaje', 'mensajes', 'escribir', 'plantilla', 'plantillas'],
  ['instalar', 'app', 'aplicacion', 'icono'],
  ['puntos', 'premios', 'misiones', 'recompensas'],
]
const SYN = new Map()
GROUPS.forEach(g => g.forEach(w => SYN.set(w, g)))

// Variantes de una palabra: ella misma + su grupo de sinónimos.
// Las palabras cortas (≤ 2 letras) solo valen solas.
export const variants = (word) => {
  const w = norm(word)
  if (!w) return []
  const out = new Set([w])
  // Plural simple: "estados" → "estado", "tareas" → "tarea".
  if (w.length > 4 && w.endsWith('s')) out.add(w.slice(0, -1))
  const g = SYN.get(w) || (w.endsWith('s') && SYN.get(w.slice(0, -1))) || (w.length >= 4 ? [...SYN.keys()].filter(k => k.length >= 4 && k.startsWith(w)).flatMap(k => SYN.get(k)) : [])
  g.forEach(x => out.add(x))
  return [...out]
}

// Separa del texto las líneas especiales:
//   @ir <acción> | <texto del botón>
//   @claves palabra, palabra
export const parseGuide = (body) => {
  const lines = String(body || '').replace(/\r\n/g, '\n').split('\n')
  let action = null
  const keys = []
  const rest = []
  for (const raw of lines) {
    const l = raw.trim()
    const ir = /^@ir\s+([^|]+?)\s*(?:\|\s*(.+))?$/.exec(l)
    if (ir) { action = { to: ir[1].trim(), label: (ir[2] || '').trim() }; continue }
    const cl = /^@claves\s+(.*)$/.exec(l)
    if (cl) { cl[1].split(',').map(s => s.trim()).filter(Boolean).forEach(k => keys.push(k)); continue }
    rest.push(raw)
  }
  return { text: rest.join('\n').trim(), action, keys }
}

// Arma lo que se indexa de cada guía (una vez).
export const indexGuide = (g) => {
  const p = parseGuide(g.body)
  return {
    ...g,
    ...p,
    _title: norm(g.title),
    _keys: norm(p.keys.join(' ') + ' ' + (g.subtitle || '') + ' ' + (g.categoryName || '')),
    _text: norm(p.text.replace(/[*#>|`_-]/g, ' ')),
  }
}

// Busca: todas las palabras tienen que aparecer (en alguna de sus
// variantes) en el título, las claves o el texto. Ordena por dónde
// apareció: título primero.
export const searchGuides = (indexed, query) => {
  const words = norm(query).split(' ').filter(w => w.length > 1 || /\d/.test(w))
  if (!words.length) return indexed
  const scored = []
  for (const g of indexed) {
    let score = 0
    let ok = true
    for (const w of words) {
      const vs = variants(w)
      const hit = (field) => vs.some(v => (` ${field}`).includes(` ${v}`))
      if (hit(g._title)) score += 10
      else if (hit(g._keys)) score += 5
      else if (hit(g._text)) score += 2
      else { ok = false; break }
    }
    if (ok) scored.push({ g, score })
  }
  return scored.sort((a, b) => b.score - a.score).map(x => x.g)
}

// Partes del título que coinciden, para resaltarlas.
export const highlightParts = (title, query) => {
  const words = norm(query).split(' ').filter(w => w.length > 1)
  if (!words.length) return [{ t: title, hit: false }]
  const vs = [...new Set(words.flatMap(variants))].filter(v => v.length > 1)
  // Se trabaja sobre el título sin tildes pero se corta el original.
  const plain = String(title).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  const marks = new Array(title.length).fill(false)
  for (const v of vs) {
    let i = plain.indexOf(v)
    while (i !== -1) {
      const before = i === 0 ? ' ' : plain[i - 1]
      if (!/[a-z0-9]/.test(before)) for (let k = i; k < i + v.length && k < marks.length; k++) marks[k] = true
      i = plain.indexOf(v, i + 1)
    }
  }
  const parts = []
  for (let i = 0; i < title.length; i++) {
    const last = parts[parts.length - 1]
    if (last && last.hit === marks[i]) last.t += title[i]
    else parts.push({ t: title[i], hit: marks[i] })
  }
  return parts
}

// Acciones permitidas en "@ir" (lo demás se ignora: nada de links externos).
const CREATE_STEPS = ['influencer', 'brand', 'task', 'collaboration', 'opportunity', 'select']
export const isValidAction = (to) =>
  typeof to === 'string' && (/^\/network\/[\w\-/?=&.%]*$/.test(to) || to === 'buscar' || to === 'arrancar' || to === 'instalar'
    || (to.startsWith('crear:') && CREATE_STEPS.includes(to.slice(6))))
