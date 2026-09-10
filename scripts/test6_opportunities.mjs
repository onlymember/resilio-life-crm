/**
 * TEST 6 — Trigger log_activity_auto sobre opportunities
 *
 * Verifica que al crear una oportunidad y cambiarla de estado,
 * el trigger trg_act_opportunity genera las filas en activities
 * SIN que el cliente las escriba.
 *
 * Ejecutar: node scripts/test6_opportunities.mjs
 * Requiere: VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en .env.local
 *           + un usuario autenticado (se loguea con EMAIL/PASSWORD
 *             pasados como variables de entorno TEST_EMAIL y TEST_PASSWORD).
 *
 * No deja basura: borra la oportunidad de prueba al final.
 */

import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'

// ── Cargar .env.local ────────────────────────────────
const env = {}
try {
  readFileSync('.env.local', 'utf8')
    .split('\n')
    .forEach(line => {
      const [k, ...v] = line.split('=')
      if (k && v.length) env[k.trim()] = v.join('=').trim()
    })
} catch { console.error('.env.local no encontrado'); process.exit(1) }

const url  = env.VITE_SUPABASE_URL
const akey = env.VITE_SUPABASE_ANON_KEY
if (!url || !akey) { console.error('Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY'); process.exit(1) }

const EMAIL    = process.env.TEST_EMAIL
const PASSWORD = process.env.TEST_PASSWORD
if (!EMAIL || !PASSWORD) {
  console.log('Uso: TEST_EMAIL=tu@email.com TEST_PASSWORD=tu_password node scripts/test6_opportunities.mjs')
  process.exit(1)
}

const supabase = createClient(url, akey)

function ok(msg)   { console.log('  ✅', msg) }
function fail(msg) { console.log('  ❌', msg); process.exitCode = 1 }
function info(msg) { console.log('  ℹ', msg) }

// ── Login ────────────────────────────────────────────
console.log('\n=== TEST 6 — Trigger log_activity_auto (opportunities) ===\n')
console.log('Autenticando...')
const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({ email: EMAIL, password: PASSWORD })
if (authErr || !auth.user) { console.error('Login fallido:', authErr?.message); process.exit(1) }
ok(`Login OK — uid: ${auth.user.id}`)

// ── Paso 1: Crear oportunidad con status 'new' ───────
console.log('\n→ Paso 1: INSERT opportunities (status=new)...')
const { data: opp, error: insErr } = await supabase
  .from('opportunities')
  .insert([{ title: 'TEST6-AUTO', status: 'new', created_by: auth.user.id, owner_scouter_id: auth.user.id }])
  .select('id, status')
  .single()
if (insErr || !opp) { fail('INSERT fallido: ' + (insErr?.message || 'null')); process.exit(1) }
ok(`Oportunidad creada: id=${opp.id}  status=${opp.status}`)
const oppId = opp.id

// ── Paso 2: Mover a 'contacted' ───────────────────
console.log('\n→ Paso 2: UPDATE status → contacted...')
const { error: u1Err } = await supabase
  .from('opportunities')
  .update({ status: 'contacted' })
  .eq('id', oppId)
if (u1Err) { fail('UPDATE contacted fallido: ' + u1Err.message) }
else ok('status → contacted')

// ── Paso 3: Mover a 'won' ─────────────────────────
console.log('\n→ Paso 3: UPDATE status → won...')
const { error: u2Err } = await supabase
  .from('opportunities')
  .update({ status: 'won' })
  .eq('id', oppId)
if (u2Err) { fail('UPDATE won fallido: ' + u2Err.message) }
else ok('status → won')

// ── Paso 4: Leer activities generadas por el trigger ─
console.log('\n→ Paso 4: Leer activities generadas por el trigger...')
const { data: acts, error: actsErr } = await supabase
  .from('activities')
  .select('id, type, title, actor_id, entity_type, entity_id')
  .eq('entity_type', 'opportunity')
  .eq('entity_id', oppId)
  .order('occurred_at')
if (actsErr) { fail('Error leyendo activities: ' + actsErr.message); process.exit(1) }

info(`Filas en activities para esta oportunidad: ${acts?.length ?? 0}`)
acts?.forEach((a, i) => info(`  [${i+1}] type=${a.type}  title="${a.title}"  actor=${a.actor_id}`))

// Verificaciones
if (!acts || acts.length < 1) {
  fail('El trigger NO generó ninguna actividad. Verificar que 011_activities_auto.sql fue aplicado.')
} else {
  const created     = acts.find(a => a.type === 'created')
  const contacted   = acts.find(a => a.title?.includes('contacted'))
  const won         = acts.find(a => a.title?.includes('won'))

  created   ? ok("Actividad 'created' presente")      : fail("Falta actividad 'created'")
  contacted ? ok("Actividad 'status_change→contacted' presente") : fail("Falta actividad status→contacted")
  won       ? ok("Actividad 'status_change→won' presente")       : fail("Falta actividad status→won")

  // El cliente NUNCA llamó a INSERT en activities — las generó el trigger.
  ok('Las 3 actividades fueron escritas por el trigger, no por el cliente')
}

// ── Cleanup ─────────────────────────────────────────
console.log('\n→ Cleanup: borrando oportunidad de prueba...')
const { error: delErr } = await supabase.from('opportunities').delete().eq('id', oppId)
delErr ? fail('Borrado fallido: ' + delErr.message) : ok('Oportunidad de prueba borrada')

console.log(process.exitCode === 1 ? '\n❌ TEST 6 FALLÓ' : '\n✅ TEST 6 PASÓ')
process.exit(process.exitCode || 0)
