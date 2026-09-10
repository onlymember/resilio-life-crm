/**
 * TEST 3 — Quitar influencer de campaña NO borra la fila en influencers
 *
 * Pasos:
 * 1. Crea un influencer de prueba
 * 2. Crea una campaña de prueba
 * 3. Agrega el influencer a la campaña (INSERT campaign_influencers)
 * 4. Quita el influencer de la campaña (DELETE campaign_influencers)
 * 5. Verifica que el influencer SIGUE en tabla influencers
 * 6. Cleanup completo
 *
 * Uso: TEST_EMAIL=... TEST_PASSWORD=... node scripts/test3_cascade.mjs
 */

import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'

const env = {}
try {
  readFileSync('.env.local', 'utf8').split('\n').forEach(line => {
    const [k, ...v] = line.split('=')
    if (k && v.length) env[k.trim()] = v.join('=').trim()
  })
} catch { console.error('.env.local no encontrado'); process.exit(1) }

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY)

const EMAIL    = process.env.TEST_EMAIL
const PASSWORD = process.env.TEST_PASSWORD
if (!EMAIL || !PASSWORD) {
  console.log('Uso: TEST_EMAIL=... TEST_PASSWORD=... node scripts/test3_cascade.mjs')
  process.exit(1)
}

function ok(msg)   { console.log('  ✅', msg) }
function fail(msg) { console.log('  ❌', msg); process.exitCode = 1 }
function info(msg) { console.log('  ℹ', msg) }

console.log('\n=== TEST 3 — Remove influencer ≠ delete influencer ===\n')

// Login
const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({ email: EMAIL, password: PASSWORD })
if (authErr || !auth.user) { console.error('Login fallido:', authErr?.message); process.exit(1) }
ok(`Login OK — uid: ${auth.user.id}`)

const uid = auth.user.id
let infId, campId

try {
  // 1. Crear influencer de prueba
  console.log('\n→ Paso 1: Crear influencer de prueba...')
  const { data: inf, error: iErr } = await supabase.from('influencers')
    .insert([{ name: 'TEST3-Influencer', status: 'active', created_by: uid, owner_scouter_id: uid }])
    .select('id').single()
  if (iErr || !inf) { fail('CREATE influencer: ' + iErr?.message); throw new Error('abort') }
  infId = inf.id
  ok(`Influencer creado: ${infId}`)

  // 2. Crear campaña de prueba
  console.log('\n→ Paso 2: Crear campaña de prueba...')
  const { data: camp, error: cErr } = await supabase.from('campaigns')
    .insert([{ name: 'TEST3-Campaign', status: 'planning', created_by: uid, owner_id: uid }])
    .select('id').single()
  if (cErr || !camp) { fail('CREATE campaign: ' + cErr?.message); throw new Error('abort') }
  campId = camp.id
  ok(`Campaña creada: ${campId}`)

  // 3. Agregar influencer a la campaña
  console.log('\n→ Paso 3: Agregar influencer a campaña (INSERT campaign_influencers)...')
  const { error: ciErr } = await supabase.from('campaign_influencers')
    .insert([{ campaign_id: campId, influencer_id: infId, assigned_by: uid, status: 'proposed' }])
  if (ciErr) { fail('INSERT campaign_influencers: ' + ciErr.message); throw new Error('abort') }
  ok('Fila creada en campaign_influencers')

  // Verificar fila existe
  const { count: ciBefore } = await supabase.from('campaign_influencers')
    .select('id', { count: 'exact', head: true }).eq('campaign_id', campId).eq('influencer_id', infId)
  info(`Filas en campaign_influencers antes del remove: ${ciBefore}`)
  ciBefore === 1 ? ok('1 fila confirmada') : fail(`Esperaba 1, hay ${ciBefore}`)

  // 4. Quitar influencer de la campaña
  console.log('\n→ Paso 4: Quitar influencer de campaña (DELETE campaign_influencers)...')
  const { error: rmErr } = await supabase.from('campaign_influencers')
    .delete().eq('campaign_id', campId).eq('influencer_id', infId)
  if (rmErr) { fail('DELETE campaign_influencers: ' + rmErr.message); throw new Error('abort') }
  ok('DELETE ejecutado')

  // 5. Verificar que campaign_influencers tiene 0 filas para esta campaña
  const { count: ciAfter } = await supabase.from('campaign_influencers')
    .select('id', { count: 'exact', head: true }).eq('campaign_id', campId).eq('influencer_id', infId)
  info(`Filas en campaign_influencers después del remove: ${ciAfter}`)
  ciAfter === 0 ? ok('0 filas en campaign_influencers (correcto)') : fail(`Debería haber 0, hay ${ciAfter}`)

  // 5b. Verificar que el influencer SIGUE en tabla influencers
  console.log('\n→ Paso 5: Verificar que influencer SIGUE en tabla influencers...')
  const { data: stillThere, error: stErr } = await supabase.from('influencers')
    .select('id, name').eq('id', infId).single()
  if (stErr) { fail('Error consultando influencers: ' + stErr.message) }
  else if (!stillThere) { fail(`Influencer ${infId} YA NO EXISTE — se borró en cascada (BUG)`) }
  else { ok(`Influencer "${stillThere.name}" sigue en tabla influencers (no hay cascade delete)`) }

} finally {
  // Cleanup
  console.log('\n→ Cleanup...')
  if (infId)  await supabase.from('influencers').delete().eq('id', infId)
  if (campId) await supabase.from('campaigns').update({ status: 'archived' }).eq('id', campId)
  ok('Datos de prueba eliminados')
}

console.log(process.exitCode === 1 ? '\n❌ TEST 3 FALLÓ' : '\n✅ TEST 3 PASÓ')
process.exit(process.exitCode || 0)
