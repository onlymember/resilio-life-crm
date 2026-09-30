// Duplicar una colaboración: misma marca, tipo, entregables y monto;
// se elige otra influencer (o la misma) y otra fecha. Queda "propuesta".
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Copy } from 'lucide-react'
import { t } from '../../i18n/index.js'
import { dbSaveCollaboration } from '../../lib/database.js'
import EntityPicker from './EntityPicker.jsx'
import { toast } from './Toaster.jsx'

const input = { width: '100%', background: 'rgba(139,92,246,0.07)', border: '1px solid rgba(139,92,246,0.25)', borderRadius: 10, padding: '10px 12px', color: 'var(--text-primary)', fontSize: 14, outline: 'none' }
const lbl = { fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, display: 'block' }

export default function DuplicateCollabSheet({ collab, onClose }) {
  const navigate = useNavigate()
  const [influencer, setInfluencer] = useState(collab.influencerId ? { id: collab.influencerId, name: collab.influencerName } : null)
  const [startDate, setStartDate] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  const save = async () => {
    if (!influencer || busy) return
    setBusy(true); setErr(null)
    try {
      const c = await dbSaveCollaboration({
        brandId: collab.brandId, influencerId: influencer.id, cityId: collab.cityId,
        opportunityId: collab.opportunityId || null, activationTypeId: collab.activationTypeId,
        deliverables: collab.deliverables || [], amount: collab.amount, currency: collab.currency,
        startDate: startDate || null, endDate: null, status: 'proposed',
        notes: collab.notes || null,
      })
      toast(t('duplicate.done'))
      onClose()
      navigate(`/network/collaborations/${c.id}`)
    } catch (e) { setErr(e.message) }
    finally { setBusy(false) }
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 480, margin: 12, borderRadius: 18, padding: 16, background: 'var(--bg-secondary, #16131f)', border: '1px solid var(--border-violet)', animation: 'slideUp var(--dur-base, 0.25s) ease both', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{t('duplicate.title')}</div>
          <button onClick={onClose} aria-label={t('batch.close')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><X size={17}/></button>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t('duplicate.hint', { brand: collab.brandName || '—' })}</div>
        <div>
          <span style={lbl}>{t('form.influencer')}</span>
          <EntityPicker kind="influencer" value={influencer} onChange={setInfluencer}/>
        </div>
        <div>
          <label style={lbl} htmlFor="dup-date">{t('duplicate.date')}</label>
          <input id="dup-date" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={input}/>
        </div>
        {err && <div style={{ fontSize: 12, color: '#F87171' }}>{err}</div>}
        <button onClick={save} disabled={!influencer || busy} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '11px 0', borderRadius: 10, border: 'none', cursor: influencer ? 'pointer' : 'default', background: influencer ? 'var(--primary-violet)' : 'rgba(139,92,246,0.25)', color: 'white', fontWeight: 700, fontSize: 14 }}>
          <Copy size={14}/>{busy ? t('loading.generic') : t('duplicate.create')}
        </button>
      </div>
    </div>
  )
}
