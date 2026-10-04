// Inicio · Propuestas para mover hoy.
// Las propias que la marca abrió y no respondió hace más de 3 días, y
// las que vencen esta semana. WhatsApp con el link, +30 días o cerrar.
// Si no hay nada para mover, no ocupa lugar.
import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MessageCircle, Clock, Eye, X } from 'lucide-react'
import { t } from '../../i18n/index.js'
import { dbGetMyProposalsToMove, dbExtendBrandProposal, dbCloseBrandProposal } from '../../lib/database.js'
import { PARTNERS_URL } from '../../partners/content.js'
import { toast } from './Toaster.jsx'

const label = { fontSize: 9, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: 1.2, textTransform: 'uppercase' }
const btn = { display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, padding: '7px 11px', borderRadius: 9, cursor: 'pointer', whiteSpace: 'nowrap', minHeight: 34 }
const soft = { ...btn, background: 'rgba(139,92,246,0.08)', border: '1px solid var(--border-violet)', color: 'var(--text-secondary)' }
const DAY = 86400000

export default function ProposalsToMove() {
  const navigate = useNavigate()
  const [items, setItems] = useState([])

  const reload = () => dbGetMyProposalsToMove().then(setItems).catch(() => setItems([]))
  useEffect(() => { reload() }, [])

  if (!items.length) return null

  const extend = async (p) => {
    try { await dbExtendBrandProposal(p.id); toast(t('proposal.extended')); reload() } catch (e) { toast(e.message) }
  }
  const close = async (p) => {
    if (!window.confirm(t('proposal.closeConfirm'))) return
    try { await dbCloseBrandProposal(p.id); reload() } catch (e) { toast(e.message) }
  }

  return (
    <section style={{ marginBottom: 20 }}>
      <div style={{ ...label, marginBottom: 8 }}>{t('toMove.title', { n: items.length })}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map(p => {
          const link = `${PARTNERS_URL}/p/${p.token}`
          const wa = String(p.whatsapp || '').replace(/[^0-9]/g, '')
          const msg = t('toMove.message', { marca: p.brandName || '', link })
          const days = Math.max(0, Math.ceil((new Date(p.expiresAt).getTime() - Date.now()) / DAY))
          const stale = p.reason === 'stale'
          return (
            <div key={p.id} style={{ padding: '12px 14px', borderRadius: 12, background: 'var(--glass-bg)', border: `1px solid ${stale ? 'rgba(251,191,36,0.35)' : 'rgba(248,113,113,0.35)'}` }}>
              <button onClick={() => p.brandId && navigate(`/network/brands/${p.brandId}`)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', background: 'none', border: 'none', padding: 0, textAlign: 'left', cursor: p.brandId ? 'pointer' : 'default' }}>
                {stale ? <Eye size={15} color="#FBBF24"/> : <Clock size={15} color="#F87171"/>}
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.brandName}</span>
                  <span style={{ display: 'block', fontSize: 11, color: 'var(--text-secondary)', marginTop: 1 }}>
                    {stale
                      ? t('toMove.stale', { n: p.viewCount, days: Math.floor((Date.now() - new Date(p.lastSeen).getTime()) / DAY) })
                      : days <= 1 ? t('toMove.expiresTomorrow') : t('toMove.expires', { n: days })}
                  </span>
                </span>
              </button>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                <a href={`https://wa.me/${wa}?text=${encodeURIComponent(msg)}`} target="_blank" rel="noopener noreferrer"
                  style={{ ...btn, textDecoration: 'none', color: '#062b14', background: '#25D366' }}>
                  <MessageCircle size={14}/>{t('toMove.write')}
                </a>
                {!stale && <button onClick={() => extend(p)} style={soft}><Clock size={13}/>{t('proposal.extend')}</button>}
                <button onClick={() => close(p)} style={soft}><X size={13}/>{t('proposal.close')}</button>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
