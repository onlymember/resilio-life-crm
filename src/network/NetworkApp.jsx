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
import TasksPage from './pages/TasksPage.jsx'
import CommandPage from './pages/CommandPage.jsx'
import ComingSoonPage from './pages/ComingSoonPage.jsx'
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

// Guard de rol: si el usuario no tiene el rol requerido, redirige a home
function RoleGuard({ user, allowedRoles, children }) {
  if (!user) return <Navigate to="/network/home" replace/>
  if (allowedRoles && !allowedRoles.includes(user.rol)) {
    return (
      <EmptyState
        icon={Shield}
        title={t('errors.noAccess')}
        subtitle={t('errors.noAccessSubtitle')}
      />
    )
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

  const handleCreated = useCallback((type, entity) => {
    // Las páginas de listado hacen su propio refresh. Aquí solo logueamos.
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
        {/* Redirect raíz */}
        <Route path="/network" element={<NetworkRedirect currentUser={currentUser}/>}/>

        {/* Layout + rutas anidadas */}
        <Route
          path="/network/*"
          element={
            isMobile
              ? <MobileLayout currentUser={currentUser} onCreated={handleCreated}/>
              : <NetworkLayout currentUser={currentUser}/>
          }
        >
          <Route path="home"          element={<HomePage onOpenCreate={() => setCreateOpen(true)} currentUser={currentUser}/>}/>
          <Route path="influencers"   element={<InfluencersPage onOpenCreate={() => setCreateOpen(true)} currentUser={currentUser}/>}/>
          <Route path="influencers/:id" element={<InfluencerDetailPage currentUser={currentUser}/>}/>
          <Route path="brands"        element={<BrandsPage onOpenCreate={() => setCreateOpen(true)} currentUser={currentUser}/>}/>
          <Route path="brands/:id"    element={<BrandDetailPage currentUser={currentUser}/>}/>
          <Route path="opportunities" element={<OpportunitiesPage onOpenCreate={() => setCreateOpen(true)} currentUser={currentUser}/>}/>
          <Route path="opportunities/:id" element={<OpportunityDetailPage currentUser={currentUser}/>}/>
          <Route path="collaborations" element={<CollaborationsPage onOpenCreate={() => setCreateOpen(true)} currentUser={currentUser}/>}/>
          <Route path="tasks"         element={<TasksPage currentUser={currentUser}/>}/>
          <Route path="command"       element={
            <RoleGuard user={currentUser} allowedRoles={COMMAND_ROLES}>
              <CommandPage currentUser={currentUser}/>
            </RoleGuard>
          }/>
          <Route path="calendar"    element={<ComingSoonPage/>}/>
          <Route path="follow-ups"  element={<ComingSoonPage/>}/>
          <Route path="notes"       element={<ComingSoonPage/>}/>
          <Route path="missions"    element={<ComingSoonPage/>}/>
          <Route path="roadmap"     element={<ComingSoonPage/>}/>
          <Route path="rewards"     element={<ComingSoonPage/>}/>
          <Route path="manual"      element={<ComingSoonPage/>}/>
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
        />
      )}
    </BrowserRouter>
  )
}
