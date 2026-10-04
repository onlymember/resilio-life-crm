// Estado de una propuesta (059) para listas, filtros y el Inicio.
//   answered · viewed (la abrió, no eligió) · sent (no la abrió) · expired · closed
// Acepta la fila de la base (snake_case) o la mapeada (camelCase).
export const proposalStateOf = (p, now = Date.now()) => {
  if (p.status === 'closed') return 'closed'
  if (p.answered_at || p.answeredAt) return 'answered'
  if (new Date(p.expires_at || p.expiresAt).getTime() < now) return 'expired'
  if (p.first_viewed_at || p.firstViewedAt) return 'viewed'
  return 'sent'
}
