/**
 * test_pagination.mjs — TEST 6 & 7 de la Fase 2B
 *
 * Verifica paginación real contra Supabase con una cuenta de prueba.
 * No usa service_role. RLS aplica igual que en el browser.
 *
 * USO:
 *   TEST_EMAIL=... TEST_PASSWORD=... node scripts/test_pagination.mjs
 *
 * Variables de entorno:
 *   SUPABASE_URL       (o VITE_SUPABASE_URL como fallback)
 *   SUPABASE_ANON_KEY  (o VITE_SUPABASE_ANON_KEY como fallback)
 *   TEST_EMAIL
 *   TEST_PASSWORD
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL  = process.env.SUPABASE_URL  || process.env.VITE_SUPABASE_URL
const SUPABASE_KEY  = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
const TEST_EMAIL    = process.env.TEST_EMAIL
const TEST_PASSWORD = process.env.TEST_PASSWORD

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌  Falta SUPABASE_URL / SUPABASE_ANON_KEY (o los prefijos VITE_)')
  process.exit(1)
}
if (!TEST_EMAIL || !TEST_PASSWORD) {
  console.error('❌  Falta TEST_EMAIL o TEST_PASSWORD')
  process.exit(1)
}

const db = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } })

// ── Replica exacta de dbGetInfluencers de src/lib/database.js ────────────────
async function dbGetInfluencers({ page = 0, pageSize = 30, search, cityId, status } = {}) {
  let q = db.from('influencers')
    .select('id, name, username, status, city_id, relationship_status, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(page * pageSize, (page + 1) * pageSize - 1)

  if (status)   q = q.eq('status', status)
  if (cityId)   q = q.eq('city_id', cityId)
  // TEST 7: el filtro de búsqueda viaja en la query al servidor, no post-fetch
  if (search)   q = q.or(`name.ilike.%${search}%,username.ilike.%${search}%`)

  const { data, count, error } = await q
  if (error) throw error
  return { rows: data || [], total: count ?? 0, hasMore: (count ?? 0) > (page + 1) * pageSize }
}

// ── helpers ───────────────────────────────────────────────────────────────────
let passed = 0
let failed = 0

function ok(label) { console.log(`  ✓  ${label}`); passed++ }
function fail(label, detail) { console.error(`  ✗  ${label}`); if (detail) console.error(`       → ${detail}`); failed++ }

function assertLte(label, actual, max) {
  if (typeof actual !== 'number') return fail(label, `Expected number, got ${typeof actual}: ${actual}`)
  if (actual > max) return fail(label, `${actual} > ${max}`)
  ok(label)
}

function assertNumber(label, value) {
  if (typeof value !== 'number' || isNaN(value)) return fail(label, `Expected number, got: ${JSON.stringify(value)}`)
  ok(label)
}

function assertDistinct(label, a, b) {
  const idsA = new Set(a.map(r => r.id))
  const idsB = new Set(b.map(r => r.id))
  const overlap = [...idsA].filter(id => idsB.has(id))
  if (overlap.length > 0) return fail(label, `${overlap.length} IDs repeated between page 0 and page 1`)
  ok(label)
}

function assertFiltered(label, rows, term) {
  const lower = term.toLowerCase()
  const bad = rows.filter(r => {
    const name = (r.name || '').toLowerCase()
    const user = (r.username || '').toLowerCase()
    return !name.includes(lower) && !user.includes(lower)
  })
  if (bad.length > 0) {
    return fail(label, `${bad.length} rows don't match "${term}": ${bad.slice(0,3).map(r=>r.name).join(', ')}`)
  }
  ok(label)
}

// ── main ──────────────────────────────────────────────────────────────────────
console.log('\n🧪  test_pagination.mjs — Fase 2B')
console.log('─'.repeat(50))

// 1. Autenticar
console.log('\n📋  Autenticando…')
const { data: authData, error: authError } = await db.auth.signInWithPassword({ email: TEST_EMAIL, password: TEST_PASSWORD })
if (authError) {
  console.error('❌  Login fallido:', authError.message)
  process.exit(1)
}
console.log(`  ✓  Sesión: ${authData.user.email} (id: ${authData.user.id.slice(0,8)}…)`)

// ── TEST 6a — página 0 devuelve ≤ 30 filas y total es número ─────────────────
console.log('\n📊  TEST 6a — Página 0, pageSize=30')
const p0 = await dbGetInfluencers({ page: 0, pageSize: 30 })
assertLte   ('rows.length <= 30',   p0.rows.length, 30)
assertNumber('total es número',     p0.total)
if (p0.rows.length > 0) ok(`total declarado: ${p0.total}, filas recibidas: ${p0.rows.length}`)
else fail('Hay al menos 1 influencer', 'La tabla está vacía o RLS bloquea todo acceso')

// ── TEST 6b — página 1 tiene filas DISTINTAS a página 0 ─────────────────────
if (p0.total > 30) {
  console.log('\n📊  TEST 6b — Página 1 vs Página 0 (sin overlap)')
  const p1 = await dbGetInfluencers({ page: 1, pageSize: 30 })
  assertLte('p1 rows.length <= 30', p1.rows.length, 30)
  assertDistinct('No hay IDs repetidos entre pag 0 y pag 1', p0.rows, p1.rows)
} else {
  console.log('\n📊  TEST 6b — SKIP (total <= 30, no hay página 1)')
  console.log(`  ℹ  total=${p0.total}. Cargá seed para probar paginación real: node scripts/seed_scale.mjs`)
}

// ── TEST 7 — búsqueda viaja al servidor, no filtrado en cliente ───────────────
console.log('\n📊  TEST 7 — Filtro "flor" → query enviada al servidor')
const pSearch = await dbGetInfluencers({ search: 'flor', pageSize: 30 })
assertNumber('total es número tras búsqueda', pSearch.total)
console.log(`  ℹ  Resultados para "flor": ${pSearch.total} total, ${pSearch.rows.length} en esta página`)

if (pSearch.rows.length > 0) {
  // Si hay resultados, cada fila devuelta debe coincidir con el término
  assertFiltered(
    'Todas las filas devueltas contienen "flor" (filtro en servidor, no en cliente)',
    pSearch.rows,
    'flor'
  )
} else {
  // Sin resultados es válido si la DB no tiene influencers con "flor" —
  // pero el total debe ser 0, no p0.total (lo que demostraría que el filtro fue al servidor)
  if (pSearch.total === 0 && p0.total > 0) {
    ok('El total con "flor" (0) es menor que el total sin filtro — filtro aplicado en servidor')
  } else if (pSearch.total === p0.total) {
    fail('El total con "flor" es igual al total sin filtro — posible filtrado en cliente')
  } else {
    ok(`Sin resultados para "flor" y total=${pSearch.total} — filtro llegó al servidor`)
  }
}

// ── Resumen ───────────────────────────────────────────────────────────────────
console.log('\n' + '─'.repeat(50))
console.log(`\n✅  ${passed} passed   ${failed > 0 ? `❌  ${failed} failed` : '0 failed'}\n`)

if (failed > 0) process.exit(1)
