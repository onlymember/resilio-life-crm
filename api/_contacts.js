// Lee el HTML de la web de un comercio y saca su Instagram y su email.
// Sin dependencias: se usa en la función de Vercel y en los tests.

const IG_RESERVED = new Set(['p', 'reel', 'reels', 'explore', 'stories', 'accounts', 'tv', 'direct', 'share', 'about', 'legal', 'developer', 'instagram'])
const BAD_MAIL = /(\.(png|jpe?g|gif|webp|svg)$)|(@(sentry|wixpress|example|domain|email|yourdomain)\.)|^(user|name|correo|email)@/i

export function instagramFromUrl(url) {
  const m = String(url || '').match(/instagram\.com\/([A-Za-z0-9._]{2,30})/i)
  if (!m) return null
  const u = m[1].replace(/\.+$/, '').toLowerCase()
  return IG_RESERVED.has(u) ? null : u
}

export function extractContacts(html) {
  const text = String(html || '').slice(0, 400000)
  let instagram = null
  const igs = text.match(/instagram\.com\/[A-Za-z0-9._]{2,30}/gi) || []
  for (const s of igs) { const u = instagramFromUrl(s); if (u) { instagram = u; break } }

  let email = null
  const mailto = text.match(/mailto:([^"'?\s>]+)/i)
  const candidates = [
    ...(mailto ? [decodeURIComponent(mailto[1])] : []),
    ...(text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || []),
  ]
  for (const c of candidates) { if (!BAD_MAIL.test(c)) { email = c.toLowerCase(); break } }
  return { instagram, email }
}
