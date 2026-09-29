import { createClient } from '@supabase/supabase-js'

// Cliente propio del Club. Misma base que el CRM, pero con otra clave de
// sesión: aunque en desarrollo las dos apps corran en localhost, una
// sesión de influencer nunca se mezcla con una del equipo.
const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !key) {
  throw new Error('Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en .env.local')
}

export const supabase = createClient(url, key, {
  auth: {
    persistSession:     true,
    autoRefreshToken:   true,
    detectSessionInUrl: true,
    storageKey:         'resilio.club.auth',
  },
})
