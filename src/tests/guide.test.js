import { describe, it, expect } from 'vitest'
import { norm, parseGuide, indexGuide, searchGuides, highlightParts, variants } from '../network/guide/guideSearch.js'
import { isValidAction } from '../network/guide/guideSearch.js'

const G = [
  { id: 1, slug: 'a', category: 'guia_influencers', categoryName: 'Influencers', title: '¿Cómo cargo una influencer?', subtitle: '', body: '1. Tocá **+ Influencer**.\n@ir crear:influencer | Cargar\n@claves alta, nueva' },
  { id: 2, slug: 'b', category: 'guia_contacto', categoryName: 'Contacto', title: '¿Cómo le escribo desde la ficha?', subtitle: '', body: 'Tocá **WhatsApp**.\n@claves mensaje' },
  { id: 3, slug: 'c', category: 'guia_colaboraciones', categoryName: 'Colaboraciones', title: '¿Cómo creo una colaboración?', subtitle: '', body: 'Elegí la influencer.' },
].map(indexGuide)

describe('guía: buscador', () => {
  it('normaliza tildes y mayúsculas', () => { expect(norm('Colaboración ÁRBOL')).toBe('colaboracion arbol') })
  it('separa @ir y @claves del texto', () => {
    const p = parseGuide(G[0].body)
    expect(p.action).toEqual({ to: 'crear:influencer', label: 'Cargar' })
    expect(p.keys).toEqual(['alta', 'nueva'])
    expect(p.text).not.toMatch(/@ir|@claves/)
  })
  it('encuentra sin tildes y con sinónimos', () => {
    expect(searchGuides(G, 'colaboracion').map(g => g.slug)).toEqual(['c'])
    expect(searchGuides(G, 'canje').map(g => g.slug)).toEqual(['c'])
    expect(searchGuides(G, 'wsp').map(g => g.slug)).toEqual(['b'])
    expect(searchGuides(G, 'agregar influ')[0].slug).toBe('a')
  })
  it('el título pesa más que el texto', () => {
    expect(searchGuides(G, 'influencer').map(g => g.slug)).toEqual(['a', 'c'])
  })
  it('todas las palabras tienen que estar', () => { expect(searchGuides(G, 'whatsapp colaboracion')).toEqual([]) })
  it('vacío devuelve todo', () => { expect(searchGuides(G, '  ').length).toBe(3) })
  it('prefijos: "invit" encuentra invitación', () => { expect(variants('invit')).toContain('invitacion') })
  it('resalta en el título original', () => {
    const parts = highlightParts('¿Cómo creo una colaboración?', 'colaboracion')
    expect(parts.filter(p => p.hit).map(p => p.t)).toEqual(['colaboración'])
  })
})

describe('guía: acciones', () => {
  it('acepta solo acciones conocidas', () => {
    expect(isValidAction('crear:influencer')).toBe(true)
    expect(isValidAction('/network/home?focus=1')).toBe(true)
    expect(isValidAction('buscar')).toBe(true)
    expect(isValidAction('crear:borrar')).toBe(false)
    expect(isValidAction('https://evil.com')).toBe(false)
    expect(isValidAction('javascript:alert(1)')).toBe(false)
  })
})

describe('guía: plurales', () => {
  it('"estados" resalta "estado"', () => {
    const parts = highlightParts('¿Qué significa cada estado?', 'estados')
    expect(parts.filter(p => p.hit).map(p => p.t)).toEqual(['estado'])
  })
})
