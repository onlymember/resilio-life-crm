// Resilio Club — app de influencers (club.resilio.company).
// Rutas públicas: /sumate, /activar, /entrar, /olvide, /nueva-clave.
// Rutas con sesión: / (ofertas), /intereses, /invitar, /perfil.
import React, { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, NavLink, useLocation } from 'react-router-dom'
import { Sparkles, Heart, UserPlus, User, Lock } from 'lucide-react'
import './club.css'
import { t, useLang, getLang } from './i18n.js'
import { AuthProvider, useAuth, Logo, LangToggle } from './components/chrome.jsx'
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
      <nav className="club-nav" aria-label="Resilio Club">
        <div className="club-nav-in">
          <NavLink to="/" end><Sparkles size={20}/>{t('nav.feed')}</NavLink>
          <NavLink to="/intereses"><Heart size={20}/>{t('nav.interests')}</NavLink>
          <NavLink to="/invitar"><UserPlus size={20}/>{t('nav.invite')}</NavLink>
          <NavLink to="/perfil"><User size={20}/>{t('nav.profile')}</NavLink>
        </div>
      </nav>
    </>
  )
}

function Blocked() {
  const { logout } = useAuth()
  return (
    <div className="club-wrap club-center">
      <div className="club-empty">
        <div className="ico"><Lock size={24}/></div>
        <h2>{t('blocked.title')}</h2>
        <p className="muted">{t('blocked.body')}</p>
      </div>
      <button className="club-btn ghost" onClick={logout}>{t('common.logout')}</button>
    </div>
  )
}

function Private({ children }) {
  const { status, refresh } = useAuth()
  const loc = useLocation()
  if (status === 'loading') return <div className="club-wrap club-center"><p className="muted" style={{ textAlign: 'center' }}>{t('common.loading')}</p></div>
  if (status === 'anon') return <Navigate to="/entrar" replace state={{ from: loc.pathname }}/>
  if (status === 'blocked') return <Blocked/>
  if (status === 'error') return (
    <div className="club-wrap club-center">
      <p className="muted" style={{ textAlign: 'center' }}>{t('errors.generic')}</p>
      <button className="club-btn ghost" onClick={refresh}>{t('common.retry')}</button>
    </div>
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
