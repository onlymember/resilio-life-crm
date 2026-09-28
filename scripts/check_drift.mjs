/**
 * check_drift.mjs — ¿hay algo vivo en la base que el repo no conoce?
 *
 * POR QUE EXISTE
 *   El 2026-09-28 descubrimos que system_health() y la migración 025
 *   entera existían solo dentro de Supabase: se habían corrido pegando
 *   el SQL en el dashboard y nunca quedaron en un archivo. Nadie lo
 *   notó durante semanas, y se descubrió de casualidad.
 *
 *   Este script hace ese descubrimiento automático. Pide el inventario
 *   real del esquema (system_inventory(), migración 040) y busca cada
 *   nombre en los .sql del repo. Lo que no aparece en ningún archivo es
 *   deriva: existe en la base y no hay de dónde recrearlo.
 *
 * QUE NO HACE
 *   No compara el CUERPO de las funciones, solo si el nombre está
 *   mencionado. Una función editada a mano en el dashboard, con el
 *   mismo nombre, pasa el chequeo. Para eso está `supabase db diff`.
 *   Esto atrapa lo que de verdad nos pasó: objetos enteros sin archivo.
 *
 *   Tampoco reporta lo que está en el repo y no en la base. Eso suele
 *   ser una migración que todavía no se corrió, que es normal.
 *
 * SEGURIDAD
 *   No usa service_role. Entra con una cuenta normal y RLS aplica igual
 *   que en el browser. Las credenciales salen del entorno y nunca del
 *   código: la cuenta tiene que ser de Dirección porque
 *   system_inventory() lo exige.
 *
 * USO
 *   DRIFT_EMAIL=... DRIFT_PASSWORD=... node scripts/check_drift.mjs
 *
 *   Sale con código 1 si encuentra deriva, así que sirve en un hook de
 *   pre-push o en CI.
 */

import { createClient } from '@supabase/supabase-js'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT     = join(dirname(fileURLToPath(import.meta.url)), '..')
const SQL_DIR  = join(ROOT, 'supabase')

const SUPABASE_URL = process.env.SUPABASE_URL      || process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
const EMAIL        = process.env.DRIFT_EMAIL
const PASSWORD     = process.env.DRIFT_PASSWORD

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌  Falta SUPABASE_URL / SUPABASE_ANON_KEY (o los prefijos VITE_)')
  process.exit(1)
}
if (!EMAIL || !PASSWORD) {
  console.error('❌  Falta DRIFT_EMAIL o DRIFT_PASSWORD (una cuenta de Dirección)')
  process.exit(1)
}

// ── Todos los .sql del repo, en un solo texto ───────────────────────────────
// Se recorre en profundidad porque fase1/ tiene la creación original de
// varias tablas y dejarla afuera daría decenas de falsos positivos.
const readSqlRecursive = (dir) => {
  let out = ''
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) out += readSqlRecursive(full)
    else if (name.endsWith('.sql'))   out += '\n' + readFileSync(full, 'utf8')
  }
  return out
}

// Se compara en minúsculas: PostgreSQL pliega los identificadores sin
// comillas a minúscula, así que "CREATE TABLE Tasks" y `tasks` son lo
// mismo y comparar con mayúsculas daría deriva inventada.
const corpus = readSqlRecursive(SQL_DIR).toLowerCase()

// El nombre tiene que aparecer como palabra entera. Sin los límites,
// `tasks` haría pasar a `task_templates` y el chequeo sería inútil.
const mentioned = (name) =>
  new RegExp(`(^|[^a-z0-9_])${name.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9_]|$)`)
    .test(corpus)

// ── Inventario real ────────────────────────────────────────────────────────
const db = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } })

const { error: authError } = await db.auth.signInWithPassword({ email: EMAIL, password: PASSWORD })
if (authError) {
  console.error('❌  No se pudo entrar:', authError.message)
  process.exit(1)
}

const { data: inv, error } = await db.rpc('system_inventory')
if (error) {
  console.error('❌  system_inventory() falló:', error.message)
  console.error('    ¿Corriste la migración 040? ¿La cuenta es de Dirección?')
  process.exit(1)
}

// ── Comparación ────────────────────────────────────────────────────────────
// Las policies vienen como "tabla.policy": lo que importa es el nombre de
// la policy, porque el de la tabla aparece en todos lados.
const GRUPOS = [
  ['funciones', inv.functions, x => x],
  ['vistas',    inv.views,     x => x],
  ['tablas',    inv.tables,    x => x],
  ['policies',  inv.policies,  x => x.split('.').slice(1).join('.')],
  ['triggers',  inv.triggers,  x => x],
  ['enums',     inv.enums,     x => x],
]

let total = 0
console.log(`\nInventario del ${new Date(inv.generated_at).toLocaleString('es-AR')}\n`)

for (const [etiqueta, lista, aNombre] of GRUPOS) {
  const huerfanos = (lista || []).filter(x => !mentioned(aNombre(x))).sort()
  const n = (lista || []).length
  if (huerfanos.length === 0) {
    console.log(`  ✅  ${etiqueta.padEnd(10)} ${n} en la base, todas con archivo`)
  } else {
    total += huerfanos.length
    console.log(`  ⚠️   ${etiqueta.padEnd(10)} ${huerfanos.length} de ${n} sin archivo:`)
    for (const h of huerfanos) console.log(`        · ${h}`)
  }
}

if (total === 0) {
  console.log('\n✅  Sin deriva: todo lo que corre en la base tiene de dónde recrearse.\n')
  process.exit(0)
}

console.log(`\n⚠️   ${total} objeto(s) viven solo dentro de Supabase.`)
console.log('    Volcalos con supabase/dump_deriva.sql antes de seguir.\n')
process.exit(1)
