import React, { useState, useEffect, useCallback, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import NetworkLayout from './NetworkLayout.jsx'
import MobileLayout from './MobileLayout.jsx'
import HomePage from './pages/HomePage.jsx'
// Inicio carga junto con la app; el resto de las pantallas baja recién
// cuando se abren (cada una en su archivo). El Suspense está en los layouts.
// Si se publicó una versión nueva mientras la pestaña estaba abierta, los
// archivos viejos ya no existen: se recarga una vez para tomar la nueva.
const lazyPage = (load) => lazy(() => load().then((m) => {
  try { sessionStorage.removeItem('nw.chunkReload') } catch { /* sin storage */ }
  return m
}).catch((err) => {
  let reloaded = false
  try { reloaded = sessionStorage.getItem('nw.chunkReload') === '1'; sessionStorage.setItem('nw.chunkReload', '1') } catch { /* sin storage */ }
  if (!reloaded) { window.location.reload(); return new Promise(() => {}) }
  throw err
}))

const InfluencersPage = lazyPage(() => import('./pages/InfluencersPage.jsx'))
const InfluencerDetailPage = lazyPage(() => import('./pages/InfluencerDetailPage.jsx'))
const BrandsPage = lazyPage(() => import('./pages/BrandsPage.jsx'))
const BrandDetailPage = lazyPage(() => import('./pages/BrandDetailPage.jsx'))
const OpportunitiesPage = lazyPage(() => import('./pages/OpportunitiesPage.jsx'))
const OpportunityDetailPage = lazyPage(() => import('./pages/OpportunityDetailPage.jsx'))
const CollaborationsPage = lazyPage(() => import('./pages/CollaborationsPage.jsx'))
const CollaborationDetailPage = lazyPage(() => import('./pages/CollaborationDetailPage.jsx'))
const ManualPage = lazyPage(() => import('./pages/ManualPage.jsx'))
const FollowUpsPage = lazyPage(() => import('./pages/FollowUpsPage.jsx'))
const TasksPage = lazyPage(() => import('./pages/TasksPage.jsx'))
const CommandPage = lazyPage(() => import('./pages/CommandPage.jsx'))
const ScoutersPage = lazyPage(() => import('./pages/ScoutersPage.jsx'))
const TaskTemplatesPage = lazyPage(() => import('./pages/TaskTemplatesPage.jsx'))
const MessageTemplatesPage = lazyPage(() => import('./pages/MessageTemplatesPage.jsx'))
const ScouterDetailPage = lazyPage(() => import('./pages/ScouterDetailPage.jsx'))
const ComingSoonPage = lazyPage(() => import('./pages/ComingSoonPage.jsx'))
const CalendarPage = lazyPage(() => import('./pages/CalendarPage.jsx'))
const MissionsPage = lazyPage(() => import('./pages/MissionsPage.jsx'))
const NotesPage = lazyPage(() => import('./pages/NotesPage.jsx'))
const RewardsPage = lazyPage(() => import('./pages/RewardsPage.jsx'))
const OffersPage = lazyPage(() => import('./pages/OffersPage.jsx'))
const ProspectsPage = lazyPage(() => import('./pages/ProspectsPage.jsx'))
const LeadsPage = lazyPage(() => import('./pages/LeadsPage.jsx'))
const ApprovalsPage = lazyPage(() => import('./pages/ApprovalsPage.jsx'))
import CreateSheet from './components/CreateSheet.jsx'
import Toaster from './components/Toaster.jsx'
import GlobalSearch from './components/GlobalSearch.jsx'
// Se importa acá para escuchar a tiempo el aviso de "instalar app".
import './guide/guideActions.js'

import { Shield } from 'lucide-react'
import { getDefaultRoute, COMMAND_ROLES, DIRECTION_ROLES, OFFERS_ROLES, clubRoles, setClubForScouters, useClubForScouters } from './routes.js'
import { dbGetSetting } from '../lib/database.js'
import { t } from '../i18n/index.js'
import { quiet } from '../lib/quiet.js'

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
  useClubForScouters()
  // ¿El Club está abierto para los scouters? (interruptor en la sección Club)
  useEffect(() => { dbGetSetting('club_for_scouters').then(v => setClubForScouters(v === true)).catch(quiet('NetworkApp')) }, [])
  const [createOpen, setCreateOpen] = useState(false)
  const [createStep, setCreateStep] = useState('select')
  const [createPrefill, setCreatePrefill] = useState(null)   // ej. { username } desde "Agregar por Instagram"

  const handleOpenCreate = useCallback((step = 'select', prefill = null) => {
    setCreateStep(step)
    setCreatePrefill(prefill)
    setCreateOpen(true)
  }, [])

  // Abrir el alta desde cualquier pantalla (ej. "Llevame ahí" del Manual).
  useEffect(() => {
    const onCreate = (e) => handleOpenCreate(e.detail?.step || 'select', e.detail?.prefill || null)
    window.addEventListener('network:create', onCreate)
    return () => window.removeEventListener('network:create', onCreate)
  }, [handleOpenCreate])

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
        @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
        @keyframes pulse {
          0%,100% { opacity:1; }
          50%      { opacity:0.5; }
        }
      `}</style>
      <Toaster/>
      <GlobalSearch currentUser={currentUser}/>

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
                  createPrefill={createPrefill}
                  onOpenCreate={handleOpenCreate}
                  onCloseCreate={() => setCreateOpen(false)}
                />
              : <NetworkLayout currentUser={currentUser} onOpenCreate={handleOpenCreate}/>
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
          <Route path="scouters/:id" element={
            <RoleGuard user={currentUser} allowedRoles={COMMAND_ROLES}>
              <ScouterDetailPage currentUser={currentUser}/>
            </RoleGuard>
          }/>
          <Route path="templates"   element={
            <RoleGuard user={currentUser} allowedRoles={DIRECTION_ROLES}>
              <TaskTemplatesPage/>
            </RoleGuard>
          }/>
          <Route path="messages"    element={
            <RoleGuard user={currentUser} allowedRoles={DIRECTION_ROLES}>
              <MessageTemplatesPage/>
            </RoleGuard>
          }/>
          <Route path="prospects"   element={
            <RoleGuard user={currentUser} allowedRoles={OFFERS_ROLES}>
              <ProspectsPage currentUser={currentUser}/>
            </RoleGuard>
          }/>
          <Route path="offers"      element={
            <RoleGuard user={currentUser} allowedRoles={OFFERS_ROLES}>
              <OffersPage currentUser={currentUser}/>
            </RoleGuard>
          }/>
          <Route path="leads"       element={
            <RoleGuard user={currentUser} allowedRoles={clubRoles()}>
              <LeadsPage currentUser={currentUser}/>
            </RoleGuard>
          }/>
          <Route path="approvals"   element={
            <RoleGuard user={currentUser} allowedRoles={DIRECTION_ROLES}>
              <ApprovalsPage currentUser={currentUser}/>
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
          initialData={createPrefill}
        />
      )}
    </BrowserRouter>
  )
}
