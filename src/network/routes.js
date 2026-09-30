// Roles que tienen acceso al Command Center (vista de Dirección)
export const COMMAND_ROLES = [
  'super_admin',
  'network_direction',
  'regional_lead',
  'country_lead',
  'city_lead',
]

// Direccion estricta. Coincide con app_is_direction() de la base: los
// tres roles de territorio ven el Command Center pero NO pueden escribir
// plantillas, asi que mostrarles esa pantalla seria ofrecerles algo que
// RLS les va a negar.
export const DIRECTION_ROLES = ['super_admin', 'network_direction']

// Ofertas del Club (047): las gestionan super_admin, admin y
// network_direction. Coincide con app_can_manage_offers() de la base.
export const OFFERS_ROLES = ['super_admin', 'admin', 'network_direction']

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
  { path: '/network/leads',                 pageKey: 'leads',              soon: false, roles: null },
  { path: '/network/approvals',             pageKey: 'approvals',          soon: false, roles: DIRECTION_ROLES },
  { path: '/network/manual',               pageKey: 'manual',             soon: false, roles: null },
]
