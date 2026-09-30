// Botón "Crear colaboración" para un "Me interesa" (solo Dirección y
// super_admin). Si ya tiene colaboración, lleva a ella.
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Handshake, ExternalLink } from 'lucide-react'
import { t } from '../../i18n/index.js'
import { redCreateCollabFromInterest } from '../../lib/red.js'
import { toast } from '../components/Toaster.jsx'

const base = { display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, padding: '6px 10px', borderRadius: 8, cursor: 'pointer', whiteSpace: 'nowrap' }

export default function InterestToCollab({ interest, onCreated }) {
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)

  if (interest.collaborationId) {
    return (
      <button onClick={() => navigate(`/network/collaborations/${interest.collaborationId}`)} style={{ ...base, background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.3)', color: '#34D399' }}>
        <ExternalLink size={12}/>{t('interestToCollab.view')}
      </button>
    )
  }
  const create = async () => {
    if (busy) return
    setBusy(true)
    try {
      const c = await redCreateCollabFromInterest(interest)
      onCreated?.(c)
      toast(t('interestToCollab.created'), { label: t('interestToCollab.open'), run: () => navigate(`/network/collaborations/${c.id}`) })
    } catch (e) { toast(e.message) }
    finally { setBusy(false) }
  }
  return (
    <button onClick={create} disabled={busy} style={{ ...base, border: 'none', background: 'var(--primary-violet)', color: 'white', opacity: busy ? 0.6 : 1 }}>
      <Handshake size={12}/>{busy ? t('loading.generic') : t('interestToCollab.create')}
    </button>
  )
}
