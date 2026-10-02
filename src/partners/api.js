// Acceso a la base desde partners.resilio.company.
// La página es pública: no hay sesión. Solo usa las dos funciones de la
// 059, siempre con el token del link. No puede leer ninguna tabla.
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

let client = null
const db = () => {
  if (!url || !key) throw new Error('Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY')
  if (!client) {
    client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: 'resilio.partners' },
    })
  }
  return client
}

// Token del link: partners.resilio.company/p/<token> (también ?t=<token>).
export function readToken(loc = window.location) {
  const m = loc.pathname.match(/^\/p\/([A-Za-z0-9-]{4,80})\/?$/)
  if (m) return m[1]
  const q = new URLSearchParams(loc.search).get('t')
  return q && /^[A-Za-z0-9-]{4,80}$/.test(q) ? q : null
}

// Vista de ejemplo, sin base: partners.resilio.company/p/demo
export const DEMO_TOKEN = 'demo'

export async function getProposal(token) {
  if (token === DEMO_TOKEN) return { ok: true, demo: true, brand_name: 'Tu marca', lang: null, answered: false, chosen_plan: null, answers: {} }
  const { data, error } = await db().rpc('get_brand_proposal', { p_token: token })
  if (error) throw error
  return data
}

export async function respondProposal(token, plan, answers) {
  if (token === DEMO_TOKEN) return { ok: true, chosen_plan: plan }
  const { data, error } = await db().rpc('respond_brand_proposal', { p_token: token, p_plan: plan, p_answers: answers })
  if (error) throw error
  return data
}
