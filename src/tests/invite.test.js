import { describe, it, expect } from 'vitest'
import { inviteMessage, textsFor, fill } from '../invite/content.js'
import { groupInvites, pct } from '../network/utils/inviteFunnel.js'
import { ogTags } from '../../api/_og.js'

describe('invitación a la red · mensajes', () => {
  it('arma el mensaje A con nombre, ciudad y link', () => {
    const m = inviteMessage({ lang: 'es', variant: 'a', name: 'Flor Medina', city: 'Rosario', link: 'https://x/i/t' })
    expect(m).toContain('Hola Flor!')
    expect(m).toContain('en Rosario')
    expect(m.endsWith('https://x/i/t')).toBe(true)
  })
  it('sin ciudad no deja "en ." colgando, y sin nombre queda "Hola!"', () => {
    const m = inviteMessage({ lang: 'es', variant: 'b', name: '', city: '', link: 'L' })
    expect(m.startsWith('Hola!')).toBe(true)
    expect(m).not.toMatch(/en\s*\{ciudad\}|en\s+y/)
    expect(m).not.toContain('{')
  })
  it('usa lo que editó Dirección, solo en ese idioma', () => {
    const o = { es: { waA: 'Hey {nombre} {link}', hello: '  ' }, en: { hello: 'Yo,' } }
    expect(inviteMessage({ lang: 'es', variant: 'a', name: 'Ana', link: 'L', overrides: o })).toBe('Hey Ana L')
    expect(textsFor('es', o).hello).toBe('Hola,')
    expect(textsFor('en', o).hello).toBe('Yo,')
    expect(fill('Termina en {end}', { end: '1234' })).toBe('Termina en 1234')
  })
})

describe('invitación a la red · embudo', () => {
  const rows = [
    { status: 'joined', viewed: true, cityId: 'r', createdBy: 'u1', variant: 'a' },
    { status: 'viewed', viewed: true, cityId: 'r', createdBy: 'u1', variant: 'b' },
    { status: 'sent', viewed: false, cityId: null, createdBy: 'u2', variant: 'b' },
    { status: 'declined', viewed: true, cityId: 'f', createdBy: 'u2', variant: 'a' },
    { status: 'closed', viewed: false, cityId: 'f', createdBy: 'u2', variant: 'a' },
  ]
  it('cuenta total y por grupo (los cerrados sin abrir no cuentan)', () => {
    const { total, groups } = groupInvites(rows, 'city')
    expect(total).toEqual({ sent: 4, viewed: 3, joined: 1, declined: 1 })
    expect(groups[0]).toEqual({ key: 'r', sent: 2, viewed: 2, joined: 1, declined: 0 })
    expect(groupInvites(rows, 'message').groups.map(g => g.key).sort()).toEqual(['a', 'b'])
    expect(pct(1, 3)).toBe(33)
  })
})

describe('invitación a la red · vista previa de WhatsApp', () => {
  it('escapa el nombre y arma las etiquetas', () => {
    const tags = ogTags({ firstName: 'Flor<script>', city: 'Rosario', lang: 'es', url: 'https://p/i/t', image: 'https://p/og.jpg' })
    expect(tags).toContain('Flor&lt;script&gt;, te invitamos')
    expect(tags).toContain('og:image" content="https://p/og.jpg"')
    expect(tags).not.toContain('<script>')
  })
})
