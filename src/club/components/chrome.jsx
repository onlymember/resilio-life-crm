// Contexto de sesión y piezas comunes del Club (logo, idioma).
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../supabase.js'
import { myProfile, signOut } from '../api.js'
import { t, useLang, setLang, getLang } from '../i18n.js'

const AuthCtx = createContext(null)
export const useAuth = () => useContext(AuthCtx)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined)   // undefined = todavía no se sabe
  const [profile, setProfile] = useState(null)
  const [status,  setStatus]  = useState('loading')   // loading | anon | ready | blocked | error

  const loadProfile = useCallback(async (sess) => {
    if (!sess) { setProfile(null); setStatus('anon'); return }
    try { setProfile(await myProfile()); setStatus('ready') }
    catch (e) {
      setProfile(null)
      // access_inactive = sin cuenta de influencer activa (o ficha
      // inactiva en el CRM). Cualquier otra cosa es un error de red.
      setStatus(e.key === 'access_inactive' ? 'blocked' : 'error')
    }
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); loadProfile(data.session) })
    const { data: sub } = supabase.auth.onAuthStateChange((event, sess) => {
      setSession(sess)
      // Diferido: llamar a Supabase dentro de este callback puede trabar
      // el cliente (documentado en supabase-js).
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') setTimeout(() => loadProfile(sess), 0)
    })
    return () => sub.subscription.unsubscribe()
  }, [loadProfile])

  const value = {
    session, profile, status,
    // Lee la sesión del momento: la del estado puede no estar actualizada
    // todavía (recién creada la cuenta, por ejemplo).
    refresh: async () => { const { data } = await supabase.auth.getSession(); setSession(data.session); return loadProfile(data.session) },
    setProfile,
    logout: async () => { await signOut(); setProfile(null); setStatus('anon') },
  }
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>
}

export function LangToggle() {
  useLang()
  return (
    <button className="club-link small" onClick={() => setLang(getLang() === 'es' ? 'en' : 'es')}>
      {t('common.language')}
    </button>
  )
}

export function Logo() {
  return <div className="club-logo">Resilio <span>Club</span></div>
}

