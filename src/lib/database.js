// ═══════════════════════════════════════════════════════════
// DATABASE.JS — Capa Supabase centralizada.
// El código vive en lib/db/*.js, separado por tema. Este archivo los
// re-exporta para que el resto de la app siga importando de acá.
// ═══════════════════════════════════════════════════════════
export * from './db/core.js'
export * from './db/users.js'
export * from './db/mappers.js'
export * from './db/opportunities.js'
export * from './db/collaborations.js'
export * from './db/tasks.js'
export * from './db/messages.js'
export * from './db/direction.js'
export * from './db/notes.js'
export * from './db/geography.js'
export * from './db/entities.js'
export * from './db/operations.js'
export * from './db/extras.js'
export * from './db/network.js'
export * from './db/proposals.js'
export * from './db/prospects.js'
export * from './db/invites.js'
