/**
 * seed_scale.mjs — Datos de prueba a escala para RESILIO NETWORK
 *
 * USO:
 *   node scripts/seed_scale.mjs              # genera datos
 *   node scripts/seed_scale.mjs --clean      # borra todo lo que sembró
 *
 * SEGURIDAD: NO correr contra la base con datos reales sin avisar.
 * Todos los registros llevan data.seed_batch = '<timestamp>' para
 * poder borrarlos con un solo DELETE.
 *
 * REQUIERE: SUPABASE_URL y SUPABASE_SERVICE_KEY en el entorno (service_role).
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌  Falta SUPABASE_URL o SUPABASE_SERVICE_KEY')
  process.exit(1)
}

const db = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
})

const BATCH_TAG    = `seed_${Date.now()}`
const BATCH_SIZE   = 500
const SLEEP_MS     = 300

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

// ── helpers ──────────────────────────────────────────────────────────────────

const rand = (arr) => arr[Math.floor(Math.random() * arr.length)]
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min

const CATEGORIES = ['Lifestyle','Deportes','Gastronomía','Moda','Fitness','Tecnología','Viajes','Música','Entretenimiento','Otros']
const REL_STATUS = ['cold','warm','strong','inactive']
const FIRST_NAMES = ['Valentina','Florencia','Lucía','Camila','Sofía','Martina','Agustina','Julieta','Abril','Mía','Juan','Mateo','Santiago','Nicolás','Lucas','Facundo','Tomás','Emiliano','Franco','Ramiro']
const LAST_NAMES  = ['García','Rodríguez','López','Martínez','González','Fernández','Pérez','Sánchez','Romero','Díaz','Torres','Ramírez','Flores','Ruiz','Vega','Medina','Castro','Suárez','Ortiz','Reyes']
const BRAND_TYPES = ['Studio','Group','Brands','Co.','Argentina','Latam','Corp','Media','Store','Agency']
const BRAND_PREFIXES = ['Neo','Alpha','Delta','Vibe','Urban','Glow','Apex','Prime','Core','Peak','Flux','Nova','Zen','Echo','Bold']

const fullName = () => `${rand(FIRST_NAMES)} ${rand(LAST_NAMES)}`
const username = (name) => name.toLowerCase().replace(/\s+/g,'_').normalize('NFD').replace(/[^a-z0-9_]/g,'') + randInt(1,999)
const brandName = () => `${rand(BRAND_PREFIXES)} ${rand(BRAND_TYPES)}`

async function insertBatch(table, rows) {
  const { error } = await db.from(table).insert(rows)
  if (error) {
    console.error(`  ❌  Error en ${table}:`, error.message)
    throw error
  }
}

async function insertInBatches(table, rows, size = BATCH_SIZE) {
  const total = rows.length
  for (let i = 0; i < total; i += size) {
    const batch = rows.slice(i, i + size)
    process.stdout.write(`  ${table}: ${i + batch.length}/${total}\r`)
    await insertBatch(table, batch)
    if (i + size < total) await sleep(SLEEP_MS)
  }
  process.stdout.write('\n')
}

// ── clean ─────────────────────────────────────────────────────────────────────

async function clean() {
  console.log('🧹  Buscando todos los batches sembrados…')

  // Leer todos los batches únicos
  const { data: infBatches } = await db.from('influencers').select('data->seed_batch').not('data->seed_batch', 'is', null).limit(1)
  if (!infBatches?.length) { console.log('  Nada que limpiar.'); return }

  // Borrar por presencia de la clave seed_batch en data
  const tables = ['influencers', 'brands', 'opportunities']
  for (const t of tables) {
    const { error, count } = await db.from(t).delete({ count: 'exact' }).not('data->seed_batch', 'is', null)
    if (error) console.error(`  ❌  ${t}:`, error.message)
    else console.log(`  ✓  ${t}: ${count ?? '?'} borrados`)
  }
  console.log('✅  Limpieza completa.')
}

// ── seed ──────────────────────────────────────────────────────────────────────

async function seed() {
  // 1. Cargar geografía
  console.log('📍  Cargando ciudades…')
  const { data: cities, error: geoErr } = await db.from('cities').select('id').eq('active', true).limit(50)
  if (geoErr || !cities?.length) { console.error('❌  No hay ciudades. Ejecutá las migraciones.'); process.exit(1) }
  const cityIds = cities.map(c => c.id)

  // 2. Cargar usuarios para usar como owners
  console.log('👤  Cargando scouters…')
  const { data: profiles } = await db.from('profiles').select('id').limit(200)
  const ownerIds = (profiles || []).map(p => p.id)
  if (!ownerIds.length) { console.error('❌  No hay perfiles de usuario.'); process.exit(1) }

  // 3. Influencers — 20.000
  console.log('\n🎯  Generando 20.000 influencers…')
  const influencerRows = Array.from({ length: 20000 }, (_, i) => {
    const name = fullName()
    return {
      name,
      username:             username(name),
      category:             rand(CATEGORIES),
      city_id:              rand(cityIds),
      status:               'active',
      relationship_status:  rand(REL_STATUS),
      followers:            randInt(1000, 5000000),
      engagement:           Math.random() * 15,
      owner_scouter_id:     rand(ownerIds),
      data: { seed_batch: BATCH_TAG, seed_index: i },
    }
  })
  await insertInBatches('influencers', influencerRows)
  console.log('  ✓  20.000 influencers')

  // 4. Marcas — 3.000
  console.log('\n🏢  Generando 3.000 marcas…')
  const brandRows = Array.from({ length: 3000 }, (_, i) => ({
    name:                brandName(),
    category:            rand(CATEGORIES),
    city_id:             rand(cityIds),
    status:              'active',
    relationship_status: rand(REL_STATUS),
    potential_value:     randInt(10000, 5000000),
    owner_scouter_id:    rand(ownerIds),
    data: { seed_batch: BATCH_TAG, seed_index: i },
  }))
  await insertInBatches('brands', brandRows)
  console.log('  ✓  3.000 marcas')

  // 5. Oportunidades — 1.000 (necesitan brand_id reales)
  console.log('\n💼  Cargando brand ids para oportunidades…')
  const { data: brandSample } = await db.from('brands').select('id').not('data->seed_batch', 'is', null).limit(3000)
  const brandIds = (brandSample || []).map(b => b.id)

  if (brandIds.length) {
    console.log('\n💼  Generando 1.000 oportunidades…')
    const STATUS = ['new','qualified','proposal','negotiation']
    const oppRows = Array.from({ length: 1000 }, (_, i) => ({
      title:            `Oportunidad ${i+1} — ${rand(CATEGORIES)}`,
      brand_id:         rand(brandIds),
      city_id:          rand(cityIds),
      status:           rand(STATUS),
      value:            randInt(5000, 500000),
      currency:         'ARS',
      owner_scouter_id: rand(ownerIds),
      data: { seed_batch: BATCH_TAG, seed_index: i },
    }))
    await insertInBatches('opportunities', oppRows)
    console.log('  ✓  1.000 oportunidades')
  }

  console.log(`\n✅  Seed completado. Batch tag: ${BATCH_TAG}`)
  console.log('   Para limpiar: node scripts/seed_scale.mjs --clean')
}

// ── main ──────────────────────────────────────────────────────────────────────

const isClean = process.argv.includes('--clean')
console.log(`\n🌱  seed_scale.mjs — ${isClean ? 'LIMPIANDO' : 'SEMBRANDO'}\n`)

if (isClean) {
  await clean()
} else {
  console.log('⚠️   ATENCIÓN: esto creará 24.000 registros en la base.')
  console.log('    Si es producción, Ctrl+C ahora.\n')
  await sleep(2000) // pausa de seguridad
  await seed()
}
