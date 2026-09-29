// Resilio Club — app de influencers (club.resilio.company).
// Rutas públicas: /sumate, /activar, /entrar, /olvide, /nueva-clave.
// Rutas con sesión: / (ofertas), /intereses, /invitar, /perfil.
import React, { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, NavLink, useLocation } from 'react-router-dom'
import { Sparkles, Heart, UserPlus, User, Lock } from 'lucide-react'
import { THEME_CSS } from '../styles/theme.js'
import './club.css'
import { t, useLang, getLang } from './i18n.js'
import { AuthProvider, useAuth, Logo, LangToggle } from './components/chrome.jsx'
import { Centered } from './components/ui.jsx'
import Join from './pages/Join.jsx'
import Activate from './pages/Activate.jsx'
import Login from './pages/Login.jsx'
import Forgot from './pages/Forgot.jsx'
import ResetPassword from './pages/ResetPassword.jsx'
import Feed from './pages/Feed.jsx'
import Interests from './pages/Interests.jsx'
import Invite from './pages/Invite.jsx'
import Profile from './pages/Profile.jsx'

function Shell({ children }) {
  return (
    <>
      <header className="club-top">
        <div className="club-wrap club-top-in"><Logo/><LangToggle/></div>
      </header>
      <main className="club-wrap club-page">{children}</main>
      {/* Misma barra flotante que Network en celular (.nw-bottom-nav). */}
      <nav className="nw-bottom-nav club-nav" aria-label="Resilio Club">
        <NavLink to="/" end><Sparkles size={20}/><span>{t('nav.feed')}</span></NavLink>
        <NavLink to="/intereses"><Heart size={20}/><span>{t('nav.interests')}</span></NavLink>
        <NavLink to="/invitar"><UserPlus size={20}/><span>{t('nav.invite')}</span></NavLink>
        <NavLink to="/perfil"><User size={20}/><span>{t('nav.profile')}</span></NavLink>
      </nav>
    </>
  )
}

function Blocked() {
  const { logout } = useAuth()
  return (
    <Centered>
      <div className="club-empty" style={{ padding: '8px 0 20px' }}>
        <div className="ico"><Lock size={24}/></div>
        <h1>{t('blocked.title')}</h1>
        <p className="muted">{t('blocked.body')}</p>
      </div>
      <button className="club-btn ghost" onClick={logout}>{t('common.logout')}</button>
    </Centered>
  )
}

function Private({ children }) {
  const { status, refresh } = useAuth()
  const loc = useLocation()
  if (status === 'loading') return <div className="club-auth"><p className="muted">{t('common.loading')}</p></div>
  if (status === 'anon') return <Navigate to="/entrar" replace state={{ from: loc.pathname }}/>
  if (status === 'blocked') return <Blocked/>
  if (status === 'error') return (
    <Centered>
      <p className="muted" style={{ textAlign: 'center', marginBottom: 16 }}>{t('errors.generic')}</p>
      <button className="club-btn ghost" onClick={refresh}>{t('common.retry')}</button>
    </Centered>
  )
  return <Shell>{children}</Shell>
}

export default function ClubApp() {
  useLang()
  useEffect(() => {
    document.title = 'Resilio Club'
    document.documentElement.lang = getLang()
    document.body.style.margin = '0'
  }, [])
  return (
    <div className="club">
      <style>{THEME_CSS}</style>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/sumate"      element={<Join/>}/>
            <Route path="/activar"     element={<Activate/>}/>
            <Route path="/entrar"      element={<Login/>}/>
            <Route path="/olvide"      element={<Forgot/>}/>
            <Route path="/nueva-clave" element={<ResetPassword/>}/>
            <Route path="/"            element={<Private><Feed/></Private>}/>
            <Route path="/intereses"   element={<Private><Interests/></Private>}/>
            <Route path="/invitar"     element={<Private><Invite/></Private>}/>
            <Route path="/perfil"      element={<Private><Profile/></Private>}/>
            <Route path="*"            element={<Navigate to="/" replace/>}/>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </div>
  )
}
