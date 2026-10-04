import { describe, it, expect } from 'vitest'
import { extractContacts, instagramFromUrl } from '../../api/_contacts.js'

describe('prospectos · contactos desde la web', () => {
  it('lee Instagram y email', () => {
    const html = '<a href="https://www.instagram.com/cafe.aurora/">IG</a> <a href="mailto:hola@aurora.com.ar?subject=x">mail</a>'
    expect(extractContacts(html)).toEqual({ instagram: 'cafe.aurora', email: 'hola@aurora.com.ar' })
  })
  it('ignora links de posteos y mails falsos', () => {
    const html = 'instagram.com/p/abc123 instagram.com/explore logo@2x.png user@example.com contacto@local.com'
    expect(extractContacts(html)).toEqual({ instagram: null, email: 'contacto@local.com' })
  })
  it('web que en realidad es Instagram', () => {
    expect(instagramFromUrl('https://instagram.com/Panaderia.Rios')).toBe('panaderia.rios')
    expect(instagramFromUrl('https://panaderia.com')).toBeNull()
  })
})
