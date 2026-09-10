import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !key) {
  throw new Error(
    'Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en .env.local'
  )
}

export const supabase = createClient(url, key, {
  auth: {
    persistSession:    true,
    autoRefreshToken:  true,
    detectSessionInUrl: true,   // necesario para el link de reset de contraseña
    storageKey:        'resilio.auth',
  },
})

// Solo en desarrollo: permite correr la suite de negación desde la consola.
if (import.meta.env.DEV) window.supabase = supabase
