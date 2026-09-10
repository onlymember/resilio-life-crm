// Roles que tienen acceso al Command Center (vista de Dirección)
export const COMMAND_ROLES = [
  'super_admin',
  'network_direction',
  'regional_lead',
  'country_lead',
  'city_lead',
]

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
  { path: '/network/tasks',                 pageKey: 'tasks',              soon: false, roles: null },
  { path: '/network/command',               pageKey: 'command',            soon: false, roles: COMMAND_ROLES },
  { path: '/network/calendar',              pageKey: 'calendar',           soon: true,  roles: null },
  { path: '/network/follow-ups',            pageKey: 'follow-ups',         soon: true,  roles: null },
  { path: '/network/notes',                 pageKey: 'notes',              soon: true,  roles: null },
  { path: '/network/missions',              pageKey: 'missions',           soon: true,  roles: null },
  { path: '/network/roadmap',               pageKey: 'roadmap',            soon: true,  roles: null },
  { path: '/network/rewards',               pageKey: 'rewards',            soon: true,  roles: null },
  { path: '/network/manual',               pageKey: 'manual',             soon: true,  roles: null },
]
