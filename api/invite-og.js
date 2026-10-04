// GET /i/<token> en partners.resilio.company (rewrite en vercel.json).
// WhatsApp no ejecuta JavaScript: para que al pegar el link aparezca la
// tarjeta "Flor, te invitamos a la red de creadores de Resilio", acá se
// toma el index.html de la app y se le agregan las etiquetas Open Graph
// con el nombre. La página sigue siendo la misma app de siempre.
// influencer_invite_preview (064) no cuenta como apertura del link.
import { ogTags } from './_og.js'

async function preview(token) {
  const url = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').replace(/\/$/, '')
  const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
  if (!url || !key || !/^[A-Za-z0-9]{64}$/.test(token)) return null
  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), 2500)
  try {
    const r = await fetch(`${url}/rest/v1/rpc/influencer_invite_preview`, {
      method: 'POST', signal: ctl.signal,
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_token: token }),
    })
    return r.ok ? await r.json() : null
  } catch { return null } finally { clearTimeout(timer) }
}

export default async function handler(req, res) {
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || 'partners.resilio.company')
  const token = String(req.query?.t || '').slice(0, 80)
  const base = `https://${host}`

  let html
  try {
    const r = await fetch(`${base}/index.html`)
    html = r.ok ? await r.text() : null
  } catch { html = null }
  // Sin el index no hay página que servir: se manda a la app sin pasar por acá.
  if (!html) { res.setHeader('Location', `/i/${encodeURIComponent(token)}?v=1`); res.status(302).end(); return }

  const p = await preview(token)
  const tags = ogTags({ firstName: p?.first_name, city: p?.city, lang: p?.lang, url: `${base}/i/${token}`, image: `${base}/partners/invite-og.jpg` })
  html = html.replace(/<title>[\s\S]*?<\/title>/i, '').replace(/<meta name="description"[^>]*>/i, '').replace('</head>', `${tags}\n</head>`)

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 'private, no-store')
  res.setHeader('X-Robots-Tag', 'noindex, nofollow')
  res.status(200).send(html)
}
