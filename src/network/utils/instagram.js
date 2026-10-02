// Lee un link o @usuario de Instagram y devuelve el usuario limpio.
const RESERVED = new Set(['p', 'reel', 'reels', 'stories', 'explore', 'tv', 'accounts', 'direct', 'share'])

// "https://www.instagram.com/valen.cabral/?hl=es" → "valen.cabral"
export function parseInstagram(raw) {
  let s = (raw || '').trim()
  if (!s) return null
  const m = s.match(/instagram\.com\/([^/?#\s]+)/i)
  if (m) s = m[1]
  s = s.replace(/^@/, '').replace(/\/+$/, '').toLowerCase()
  if (RESERVED.has(s)) return null
  return /^[a-z0-9._]{1,30}$/.test(s) ? s : null
}
