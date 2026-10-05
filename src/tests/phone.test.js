import { describe, it, expect } from 'vitest'
import { formatPhone } from '../network/utils/phone.js'

describe('WhatsApp: se corrige solo', () => {
  it('Argentina local con 15 y guiones', () => {
    expect(formatPhone('0341 15 555-1111', '54')).toBe('+54 9 341 555 1111')
    expect(formatPhone('(011) 15-2345-6789', '54')).toBe('+54 9 11 2345 6789')
  })
  it('ya internacional, sin espacios o con guiones', () => {
    expect(formatPhone('+5493415551111')).toBe('+54 9 341 555 1111')
    expect(formatPhone('+54 11 2345-6789')).toBe('+54 9 11 2345 6789')
    expect(formatPhone('+34 612-345-678')).toBe('+34 612 345 678')
    expect(formatPhone('0034612345678')).toBe('+34 612 345 678')
  })
  it('sin país conocido: solo saca guiones', () => {
    expect(formatPhone('341-555-1111')).toBe('341 555 1111')
    expect(formatPhone('')).toBe('')
  })
})
