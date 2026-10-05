// Entrada directa a Network (/network/*): la app instalada en el celular,
// un link a una ficha, recargar la página. Antes pasaba por el CRM
// clásico completo (App.jsx + datos demo, ~180 KB que Network no usa).
// Este shell hace solo lo necesario: sesión, perfil y permisos.
// El login sigue viviendo en "/": sin sesión, se manda ahí.
import LogoLoader from './components/LogoLoader.jsx'
import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { fetchUserById, dbClearCaches } from '../lib/database.js'
import { redClearCaches } from '../lib/red.js'
import { canAccessView } from '../lib/auth.js'
import { THEME_CSS } from '../styles/theme.js'
import { resetTz } from './utils/tz.js'
import NetworkApp from './NetworkApp.jsx'
import { quiet } from '../lib/quiet.js'

const toLogin = () => { window.location.replace('/') }

const Splash = () => <LogoLoader full delay={0}/>

export default function NetworkRoot() {
  const [user, setUser] = useState(null)

  useEffect(() => {
    let alive = true
    const load = async (session) => {
      if (!session?.user) { toLogin(); return }
      try {
        const u = await fetchUserById(session.user.id)
        if (!alive) return
        // Misma regla que el CRM: pendiente/bloqueada no entra, y hace
        // falta permiso para el módulo Network.
        if (!u || u.estado !== 'aprobado') { await supabase.auth.signOut().catch(quiet('NetworkRoot')); toLogin(); return }
        if (!canAccessView(u, 'network')) { toLogin(); return }
        setUser(u)
      } catch (e) {
        console.error('Network — no se pudo cargar el perfil:', e)
        toLogin()
      }
    }
    supabase.auth.getSession().then(({ data: { session } }) => { if (alive) load(session) })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!alive) return
      if (event === 'SIGNED_OUT' || !session?.user) {
        dbClearCaches(); redClearCaches(); resetTz()
        toLogin()
      }
    })
    return () => { alive = false; subscription.unsubscribe() }
  }, [])

  return (
    <>
      <style>{THEME_CSS}</style>
      {user ? <NetworkApp currentUser={user}/> : <Splash/>}
    </>
  )
}
