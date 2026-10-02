// ═══════════════════════════════════════════════════════════
// Roles: UNA sola fuente para toda la app.
// Cada lista dice con qué función de la base coincide. Si se cambia una
// regla en SQL, se cambia acá también (y al revés).
// ═══════════════════════════════════════════════════════════

// Precedencia: cuando alguien tiene varios roles, el "principal" es el
// primero de esta lista que tenga.
export const ROLE_PRECEDENCE = [
  'super_admin', 'network_direction', 'admin',
  'regional_lead', 'country_lead', 'city_lead',
  'scouter', 'editor', 'viewer', 'custom',
]

// = app_is_direction()
export const DIRECTION_ROLES = ['super_admin', 'network_direction']

// = app_can_manage_offers()
export const OFFERS_ROLES = ['super_admin', 'admin', 'network_direction']

// Ven el Command Center (Dirección + líderes de territorio).
export const COMMAND_ROLES = ['super_admin', 'network_direction', 'regional_lead', 'country_lead', 'city_lead']

// = roles con alcance territorial en app_visible_city_ids() (055).
export const TERRITORY_ROLES = ['super_admin', 'network_direction', 'admin', 'regional_lead', 'country_lead', 'city_lead']

// Aterrizan directo en Network al entrar.
export const NETWORK_LANDING_ROLES = ['scouter', 'network_direction', 'regional_lead', 'country_lead', 'city_lead']
