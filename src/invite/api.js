// Acceso a la base desde la invitación pública (partners.resilio.company/i/<token>).
// Sin sesión: solo las funciones de la 064, siempre con el token del link.
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

let client = null
const db = () => {
  if (!url || !key) throw new Error('Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY')
  if (!client) {
    client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: 'resilio.invite' },
    })
  }
  return client
}

export const DEMO_TOKEN = 'demo'

export function readInviteToken(loc = window.location) {
  const m = loc.pathname.match(/^\/i\/([A-Za-z0-9-]{4,80})\/?$/)
  return m ? m[1] : null
}

export async function getInvite(token) {
  if (token === DEMO_TOKEN) {
    return { ok: true, demo: true, name: 'Flor Medina', first_name: 'Flor', instagram: 'flor.rosario', city: 'Rosario',
      categories: ['gastronomia', 'lifestyle'], whatsapp_end: '1234', lang: null, status: 'viewed', answered: false, texts: null }
  }
  const { data, error } = await db().rpc('get_influencer_invite', { p_token: token })
  if (error) throw error
  return data
}

export async function respondInvite(token, action, data = {}) {
  if (token === DEMO_TOKEN) {
    const birth = data.birthdate ? new Date(data.birthdate) : null
    const age = birth ? (Date.now() - birth.getTime()) / 31557600000 : 99
    return { ok: true, status: action === 'decline' ? 'declined' : age < 18 ? 'underage' : 'joined' }
  }
  const { data: res, error } = await db().rpc('respond_influencer_invite', { p_token: token, p_action: action, p_data: data })
  if (error) {
    const e = new Error(error.message); e.hint = error.hint || error.details || ''
    throw e
  }
  return res
}
