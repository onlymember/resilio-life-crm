import { describe, it, expect } from 'vitest'
import { proposalStateOf } from '../network/utils/proposalState.js'

const future = new Date(Date.now() + 5 * 86400000).toISOString()
const past   = new Date(Date.now() - 86400000).toISOString()

describe('estado de la propuesta', () => {
  it('enviada, abierta, respondida', () => {
    expect(proposalStateOf({ status: 'sent', expires_at: future })).toBe('sent')
    expect(proposalStateOf({ status: 'viewed', first_viewed_at: past, expires_at: future })).toBe('viewed')
    expect(proposalStateOf({ status: 'answered', answered_at: past, expires_at: future })).toBe('answered')
  })
  it('vencida y cerrada', () => {
    expect(proposalStateOf({ status: 'viewed', first_viewed_at: past, expires_at: past })).toBe('expired')
    expect(proposalStateOf({ status: 'closed', answered_at: past, expires_at: future })).toBe('closed')
  })
  it('respondida aunque haya vencido después', () => {
    expect(proposalStateOf({ status: 'answered', answered_at: past, expires_at: past })).toBe('answered')
  })
  it('acepta la fila ya mapeada', () => {
    expect(proposalStateOf({ status: 'sent', firstViewedAt: past, expiresAt: future })).toBe('viewed')
  })
})
