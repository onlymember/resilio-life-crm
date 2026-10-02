import { describe, it, expect } from 'vitest'
import { COPY, LANGS, PLAN_KEYS, OPTION_KEYS, toAnswers, fromAnswers, answerLabel, planLabel, guessLang } from '../partners/content.js'
import { readToken } from '../partners/api.js'

describe('partners · textos', () => {
  it('los tres idiomas tienen la misma forma', () => {
    for (const l of LANGS) {
      const c = COPY[l]
      expect(c.plans).toHaveLength(PLAN_KEYS.length)
      for (const k of Object.keys(OPTION_KEYS)) {
        expect(c.opt[k], `${l}.opt.${k}`).toHaveLength(OPTION_KEYS[k].length)
        expect(c.q[k], `${l}.q.${k}`).toBeTruthy()
      }
      expect(Object.keys(c).sort()).toEqual(Object.keys(COPY.es).sort())
    }
  })
  it('las preguntas pedidas', () => {
    expect(COPY.es.opt.start[0]).toBe('Una semana de prueba')
    expect(COPY.es.opt.networks).toEqual(['Instagram', 'TikTok', 'Ambas'])
    expect(COPY.es.opt.creators_per_week).toEqual(['3 a 5', '5 a 10', '10 a 20'])
  })
})

describe('partners · respuestas', () => {
  it('guarda claves fijas y vuelve igual', () => {
    const st = { goal: 0, start: 0, networks: 2, creators_per_week: 1, notes: '  lanzamos en marzo ' }
    const a = toAnswers(st)
    expect(a).toEqual({ goal: 'sell', start: 'trial', networks: 'both', creators_per_week: '5-10', notes: 'lanzamos en marzo' })
    expect(fromAnswers(a)).toEqual({ ...st, notes: 'lanzamos en marzo' })
  })
  it('omite lo no respondido y tolera basura', () => {
    expect(toAnswers({ goal: null, start: 9, notes: '' })).toEqual({})
    expect(fromAnswers(null)).toEqual({ notes: '', goal: null, start: null, networks: null, creators_per_week: null })
  })
  it('etiquetas para Network', () => {
    expect(answerLabel('networks', 'both')).toBe('Ambas')
    expect(answerLabel('start', 'trial', 'en')).toBe('A one-week trial')
    expect(planLabel('crecimiento')).toBe('Crecimiento')
    expect(planLabel('asesoria')).toBe('Asesórenme')
    expect(planLabel(null)).toBe('')
  })
  it('idioma del navegador', () => {
    expect(guessLang('pt-BR')).toBe('pt')
    expect(guessLang('fr-FR')).toBe('es')
  })
})

describe('partners · link', () => {
  const tok = 'a'.repeat(64)
  it('lee /p/<token> y ?t=', () => {
    expect(readToken({ pathname: `/p/${tok}`, search: '' })).toBe(tok)
    expect(readToken({ pathname: '/', search: `?t=${tok}` })).toBe(tok)
    expect(readToken({ pathname: '/p/demo/', search: '' })).toBe('demo')
  })
  it('rechaza lo demás', () => {
    expect(readToken({ pathname: '/', search: '' })).toBeNull()
    expect(readToken({ pathname: '/p/<script>', search: '' })).toBeNull()
  })
})
