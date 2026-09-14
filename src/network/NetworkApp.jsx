import React, { useState, useEffect, useCallback } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import NetworkLayout from './NetworkLayout.jsx'
import MobileLayout from './MobileLayout.jsx'
import HomePage from './pages/HomePage.jsx'
import InfluencersPage from './pages/InfluencersPage.jsx'
import InfluencerDetailPage from './pages/InfluencerDetailPage.jsx'
import BrandsPage from './pages/BrandsPage.jsx'
import BrandDetailPage from './pages/BrandDetailPage.jsx'
import OpportunitiesPage from './pages/OpportunitiesPage.jsx'
import OpportunityDetailPage from './pages/OpportunityDetailPage.jsx'
import CollaborationsPage from './pages/CollaborationsPage.jsx'
import CollaborationDetailPage from './pages/CollaborationDetailPage.jsx'
import ManualPage from './pages/ManualPage.jsx'
import FollowUpsPage from './pages/FollowUpsPage.jsx'
import TasksPage from './pages/TasksPage.jsx'
import CommandPage from './pages/CommandPage.jsx'
import ScoutersPage from './pages/ScoutersPage.jsx'
import ComingSoonPage from './pages/ComingSoonPage.jsx'
import CalendarPage from './pages/CalendarPage.jsx'
import MissionsPage from './pages/MissionsPage.jsx'
import NotesPage from './pages/NotesPage.jsx'
import RewardsPage from './pages/RewardsPage.jsx'
import CreateSheet from './components/CreateSheet.jsx'
import EmptyState from './components/EmptyState.jsx'
import { Shield } from 'lucide-react'
import { getDefaultRoute, COMMAND_ROLES } from './routes.js'
import { t } from '../i18n/index.js'

const useIsMobile = () => {
  const [mobile, setMobile] = useState(window.innerWidth < 640)
  useEffect(() => {
    const h = () => setMobile(window.innerWidth < 640)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])
  return mobile
}

function NoAccessPage() {
  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg-primary)' }}>
      <div style={{ textAlign:'center', maxWidth:320, padding:'0 24px' }}>
        <Shield size={48} style={{ color:'var(--primary-violet-light)', display:'block', margin:'0 auto 16px' }}/>
        <div style={{ fontSize:18, fontWeight:700, color:'var(--text-primary)', marginBottom:8 }}>{t('errors.noAccess')}</div>
        <div style={{ fontSize:13, color:'var(--text-secondary)', marginBottom:20 }}>{t('errors.noAccessSubtitle')}</div>
        <a href="/" style={{ fontSize:13, color:'var(--primary-violet-light)', textDecoration:'none' }}>{t('layout.backToApp')}</a>
      </div>
    </div>
  )
}

// Guard de rol: si el usuario no tiene el rol requerido, redirige a página sin layout
function RoleGuard({ user, allowedRoles, children }) {
  if (!user) return <Navigate to="/network/home" replace/>
  if (allowedRoles && !allowedRoles.includes(user.rol)) {
    return <Navigate to="/network/no-access" replace/>
  }
  return children
}

// Redirect de /network al destino correcto según el rol
function NetworkRedirect({ currentUser }) {
  return <Navigate to={getDefaultRoute(currentUser)} replace/>
}

// Wrapper que inyecta props comunes a cada página
function Page({ component: Comp, currentUser, onOpenCreate, onCreated, ...rest }) {
  return <Comp {...rest} currentUser={currentUser} onOpenCreate={onOpenCreate} onCreated={onCreated}/>
}

export default function NetworkApp({ currentUser }) {
  const isMobile = useIsMobile()
  const [createOpen, setCreateOpen] = useState(false)
  const [createStep, setCreateStep] = useState('select')

  const handleOpenCreate = useCallback((step = 'select') => {
    setCreateStep(step)
    setCreateOpen(true)
  }, [])

  const handleCreated = useCallback((type, entity) => {
    window.dispatchEvent(new CustomEvent('network:created', { detail: { type, entity } }))
    if (import.meta.env.DEV) console.info('[Network] created', type, entity?.id)
  }, [])

  const Layout = isMobile ? MobileLayout : NetworkLayout

  if (!currentUser) {
    return (
      <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg-primary)' }}>
        <div style={{ fontSize:14, color:'var(--text-secondary)' }}>{t('loading.session')}</div>
      </div>
    )
  }

  return (
    <BrowserRouter>
      {/* CSS slideUp para sheets */}
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity:0; }
          to   { transform: translateY(0);    opacity:1; }
        }
        @keyframes pulse {
          0%,100% { opacity:1; }
          50%      { opacity:0.5; }
        }
      `}</style>

      <Routes>
        {/* Standalone — no hereda sidebar/header del layout */}
        <Route path="/network/no-access" element={<NoAccessPage/>}/>

        {/* Redirect raíz */}
        <Route path="/network" element={<NetworkRedirect currentUser={currentUser}/>}/>

        {/* Layout + rutas anidadas */}
        <Route
          path="/network/*"
          element={
            isMobile
              ? <MobileLayout
                  currentUser={currentUser}
                  onCreated={handleCreated}
                  createOpen={createOpen}
                  createStep={createStep}
                  onOpenCreate={handleOpenCreate}
                  onCloseCreate={() => setCreateOpen(false)}
                />
              : <NetworkLayout currentUser={currentUser}/>
          }
        >
          <Route path="home"          element={<HomePage onOpenCreate={handleOpenCreate} currentUser={currentUser}/>}/>
          <Route path="influencers"   element={<InfluencersPage onOpenCreate={handleOpenCreate} currentUser={currentUser}/>}/>
          <Route path="influencers/:id" element={<InfluencerDetailPage currentUser={currentUser}/>}/>
          <Route path="brands"        element={<BrandsPage onOpenCreate={handleOpenCreate} currentUser={currentUser}/>}/>
          <Route path="brands/:id"    element={<BrandDetailPage currentUser={currentUser}/>}/>
          <Route path="opportunities" element={<OpportunitiesPage onOpenCreate={handleOpenCreate} currentUser={currentUser}/>}/>
          <Route path="opportunities/:id" element={<OpportunityDetailPage currentUser={currentUser}/>}/>
          <Route path="collaborations"     element={<CollaborationsPage onOpenCreate={handleOpenCreate} currentUser={currentUser}/>}/>
          <Route path="collaborations/:id" element={<CollaborationDetailPage currentUser={currentUser}/>}/>
          <Route path="tasks"              element={<TasksPage currentUser={currentUser}/>}/>
          <Route path="command"       element={
            <RoleGuard user={currentUser} allowedRoles={COMMAND_ROLES}>
              <CommandPage currentUser={currentUser}/>
            </RoleGuard>
          }/>
          <Route path="scouters"      element={
            <RoleGuard user={currentUser} allowedRoles={COMMAND_ROLES}>
              <ScoutersPage currentUser={currentUser}/>
            </RoleGuard>
          }/>
          <Route path="calendar"    element={<CalendarPage currentUser={currentUser}/>}/>
          <Route path="follow-ups"  element={<FollowUpsPage currentUser={currentUser}/>}/>
          <Route path="notes"       element={<NotesPage    currentUser={currentUser}/>}/>
          <Route path="missions"    element={<MissionsPage currentUser={currentUser}/>}/>
          <Route path="roadmap"     element={<ComingSoonPage/>}/>
          <Route path="rewards"     element={<RewardsPage/>}/>
          <Route path="manual"      element={<ManualPage currentUser={currentUser}/>}/>
          {/* Catch-all: vuelve al destino por defecto según rol */}
          <Route path="*" element={<Navigate to={getDefaultRoute(currentUser)} replace/>}/>
        </Route>
      </Routes>

      {/* CreateSheet desktop: el mobile lo maneja MobileLayout */}
      {!isMobile && (
        <CreateSheet
          isOpen={createOpen}
          onClose={() => setCreateOpen(false)}
          currentUser={currentUser}
          onCreated={handleCreated}
          initialStep={createStep}
        />
      )}
    </BrowserRouter>
  )
}
