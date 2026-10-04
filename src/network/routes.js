import { useSyncExternalStore } from 'react'
// Las listas de roles viven en lib/roles.js (una sola fuente, alineada
// con las funciones de la base). Se re-exportan para no cambiar imports.
import { COMMAND_ROLES, DIRECTION_ROLES, OFFERS_ROLES, DIRECTION_ADMIN_ROLES } from '../lib/roles.js'
export { COMMAND_ROLES, DIRECTION_ROLES, OFFERS_ROLES, DIRECTION_ADMIN_ROLES }

// Club (red de influencers) para los scouters: lo prenden o apagan
// super_admin, admin o network_direction con el interruptor de la sección
// Club (app_settings.club_for_scouters, migración 051). Apagado, el Club
// (menú, Leads y la sección en la ficha) solo lo ven esos tres roles.
let clubOpen = false
const clubSubs = new Set()
export const setClubForScouters = (v) => { clubOpen = !!v; clubSubs.forEach(f => f()) }
export const isClubForScouters = () => clubOpen
export const canSeeClub = (user) => clubOpen || OFFERS_ROLES.includes(user?.rol)
export const clubRoles = () => (clubOpen ? null : OFFERS_ROLES)
export const useClubForScouters = () => useSyncExternalStore(
  (cb) => { clubSubs.add(cb); return () => clubSubs.delete(cb) },
  () => clubOpen,
)

export const canSeeCommand = (user) =>
  user && COMMAND_ROLES.includes(user.rol)

// Redirect de /network según rol
export const getDefaultRoute = (user) => {
  if (!user) return '/network/home'
  return canSeeCommand(user) ? '/network/command' : '/network/home'
}

// Definición de rutas. roles:null → cualquier usuario autenticado con acceso a Network
export const ROUTES = [
  { path: '/network/home',                  pageKey: 'home',               soon: false, roles: null },
  { path: '/network/influencers',           pageKey: 'influencers',        soon: false, roles: null },
  { path: '/network/influencers/:id',       pageKey: 'influencer-detail',  soon: false, roles: null },
  { path: '/network/brands',                pageKey: 'brands',             soon: false, roles: null },
  { path: '/network/brands/:id',            pageKey: 'brand-detail',       soon: false, roles: null },
  { path: '/network/prospects',             pageKey: 'prospects',          soon: false, roles: OFFERS_ROLES },
  { path: '/network/opportunities',         pageKey: 'opportunities',      soon: false, roles: null },
  { path: '/network/opportunities/:id',     pageKey: 'opportunity-detail', soon: false, roles: null },
  { path: '/network/collaborations',        pageKey: 'collaborations',     soon: false, roles: null },
  { path: '/network/collaborations/:id',   pageKey: 'collaboration-detail',soon: false, roles: null },
  { path: '/network/tasks',                 pageKey: 'tasks',              soon: false, roles: null },
  { path: '/network/command',               pageKey: 'command',            soon: false, roles: COMMAND_ROLES },
  { path: '/network/scouters',              pageKey: 'scouters',           soon: false, roles: COMMAND_ROLES },
  { path: '/network/templates',             pageKey: 'templates',          soon: false, roles: DIRECTION_ROLES },
  { path: '/network/messages',              pageKey: 'messages',           soon: false, roles: DIRECTION_ROLES },
  { path: '/network/scouters/:id',          pageKey: 'scouter-detail',     soon: false, roles: COMMAND_ROLES },
  { path: '/network/calendar',              pageKey: 'calendar',           soon: false, roles: null },
  { path: '/network/follow-ups',            pageKey: 'follow-ups',         soon: false, roles: null },
  { path: '/network/notes',                 pageKey: 'notes',              soon: false, roles: null },
  { path: '/network/missions',              pageKey: 'missions',           soon: false, roles: null },
  { path: '/network/roadmap',               pageKey: 'roadmap',            soon: true,  roles: null },
  { path: '/network/rewards',               pageKey: 'rewards',            soon: false, roles: null },
  { path: '/network/offers',                pageKey: 'offers',             soon: false, roles: OFFERS_ROLES },
  { path: '/network/leads',                 pageKey: 'leads',              soon: false, roles: null, club: true },
  { path: '/network/approvals',             pageKey: 'approvals',          soon: false, roles: DIRECTION_ROLES },
  { path: '/network/manual',               pageKey: 'manual',             soon: false, roles: null },
]
