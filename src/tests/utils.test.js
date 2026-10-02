import { describe, it, expect } from 'vitest'
import { parseInstagram } from '../network/utils/instagram.js'
import { computeProgress } from '../network/utils/progress.js'
import { tomorrowAtIso, isoToDatetimeLocal, datetimeLocalToIso } from '../network/utils/date.js'
import { ROLE_PRECEDENCE, DIRECTION_ROLES, OFFERS_ROLES, COMMAND_ROLES, TERRITORY_ROLES } from '../lib/roles.js'

describe('parseInstagram', () => {
  it('lee links, @usuario y texto suelto', () => {
    expect(parseInstagram('https://www.instagram.com/Valen.Cabral/?hl=es')).toBe('valen.cabral')
    expect(parseInstagram('@sofi_ok')).toBe('sofi_ok')
    expect(parseInstagram('  marca.rosario ')).toBe('marca.rosario')
  })
  it('rechaza posts, reels y basura', () => {
    expect(parseInstagram('https://instagram.com/p/xyz')).toBeNull()
    expect(parseInstagram('https://instagram.com/reel/abc')).toBeNull()
    expect(parseInstagram('hola mundo')).toBeNull()
    expect(parseInstagram('')).toBeNull()
  })
})

describe('computeProgress', () => {
  const day = (contacts, added = 0) => ({ day: 'x', contacts, added })
  it('cuenta la racha incluyendo hoy si se cumplió', () => {
    const p = computeProgress([day(1), day(5), day(6), day(5)], 5)
    expect(p.streak).toBe(3); expect(p.reached).toBe(true)
  })
  it('si hoy todavía no se cumplió, la racha viene de ayer', () => {
    const p = computeProgress([day(5), day(7), day(2)], 5)
    expect(p.streak).toBe(2); expect(p.reached).toBe(false); expect(p.today).toBe(2)
  })
  it('suma la semana', () => {
    const p = computeProgress(Array.from({ length: 10 }, () => day(1, 2)), 5)
    expect(p.week).toEqual({ contacts: 7, added: 14 })
  })
  it('sin datos devuelve null', () => { expect(computeProgress([], 5)).toBeNull() })
})

describe('fechas en el huso de la scouter', () => {
  it('ida y vuelta local ↔ ISO en Buenos Aires', () => {
    const iso = datetimeLocalToIso('2026-10-05T10:00', 'America/Argentina/Buenos_Aires')
    expect(iso).toBe('2026-10-05T13:00:00.000Z')
    expect(isoToDatetimeLocal(iso, 'America/Argentina/Buenos_Aires')).toBe('2026-10-05T10:00')
  })
  it('mañana a las 10 en Madrid', () => {
    const iso = tomorrowAtIso('Europe/Madrid', 10)
    expect(isoToDatetimeLocal(iso, 'Europe/Madrid').endsWith('T10:00')).toBe(true)
  })
})

describe('roles alineados con la base', () => {
  it('Dirección = app_is_direction()', () => { expect(DIRECTION_ROLES).toEqual(['super_admin', 'network_direction']) })
  it('Ofertas = app_can_manage_offers()', () => { expect(OFFERS_ROLES.sort()).toEqual(['admin', 'network_direction', 'super_admin']) })
  it('toda lista usa roles conocidos', () => {
    for (const r of [...COMMAND_ROLES, ...TERRITORY_ROLES, ...OFFERS_ROLES]) expect(ROLE_PRECEDENCE).toContain(r)
  })
  it('scouter nunca tiene alcance territorial (055)', () => { expect(TERRITORY_ROLES).not.toContain('scouter') })
})

import es from '../i18n/es.json'
import en from '../i18n/en.json'
const keys = (o, p = '') => Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' ? keys(v, p + k + '.') : [p + k]))

describe('traducciones', () => {
  it('es y en tienen exactamente las mismas claves', () => {
    const a = new Set(keys(es)), b = new Set(keys(en))
    expect([...a].filter(k => !b.has(k))).toEqual([])
    expect([...b].filter(k => !a.has(k))).toEqual([])
  })
  it('los {marcadores} coinciden', () => {
    const flat = (o) => Object.fromEntries(keys(o).map(k => [k, k.split('.').reduce((x, y) => x[y], o)]))
    const fe = flat(es), fn = flat(en)
    const ph = (s) => (String(s).match(/\{\w+\}/g) || []).sort().join(',')
    const bad = Object.keys(fe).filter(k => ph(fe[k]) !== ph(fn[k]))
    expect(bad).toEqual([])
  })
})
