// Bandeja de aprobaciones (Dirección y super_admin).
//   · "Pendientes": leads del Club y cambios de mail, para resolver de corrido.
//   · "Me interesa": los intereses de las influencers, aparte, con el
//     botón para convertirlos en colaboración.
import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Inbox, Heart } from 'lucide-react'
import EmptyState from '../components/EmptyState.jsx'
import { t } from '../../i18n/index.js'
import { dbGetActiveScouters } from '../../lib/database.js'
import { personName } from '../utils/people.js'
import { redGetLeads, redGetInterests, redUpdateInterest, redGetPendingCounts } from '../../lib/red.js'
import { ErrorLine, inputStyle } from '../red/ui.jsx'
import { LeadCard, ApproveSheet, RejectSheet, EmailRequests } from './LeadsPage.jsx'
import InterestToCollab from '../red/InterestToCollab.jsx'

const INTERNAL = ['new', 'reviewed', 'contacted', 'matched', 'discarded']
const INTEREST_FILTERS = ['open', 'new', 'matched', 'discarded', 'all']

const chip = (on) => ({
  display: 'flex', alignItems: 'center', gap: 6,
  padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
  background: on ? 'rgba(139,92,246,0.25)' : 'rgba(139,92,246,0.07)',
  color: on ? 'var(--primary-violet-light)' : 'var(--text-secondary)',
  border: on ? '1px solid rgba(139,92,246,0.5)' : '1px solid var(--border-violet)',
})

function PendingTab({ onChanged }) {
  const [leads, setLeads] = useState(null)
  const [owners, setOwners] = useState({})
  const [error, setError] = useState(null)
  const [approve, setApprove] = useState(null)
  const [reject, setReject] = useState(null)

  const load = useCallback(() => {
    redGetLeads({ status: 'pending' }).then(setLeads).catch(e => { setError(e.message); setLeads([]) })
    onChanged?.()
  }, [onChanged])
  useEffect(() => { load() }, [])
  useEffect(() => {
    dbGetActiveScouters(null).then(list => { const m = {}; list.forEach(s => { m[s.userId] = personName(s) }); setOwners(m) }).catch(() => {})
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <EmailRequests/>
      <ErrorLine error={error}/>
      {leads === null ? (
        [0, 1].map(i => <div key={i} style={{ height: 110, borderRadius: 14, background: 'rgba(139,92,246,0.06)', border: '1px solid var(--border-violet)' }}/>)
      ) : leads.length === 0 ? (
        <EmptyState icon={Inbox} title={t('approvals.noLeads')} subtitle={t('approvals.noLeadsHint')}/>
      ) : leads.map(l => (
        <LeadCard key={l.id} lead={l} isDirection ownerName={owners[l.suggestedOwnerId]} onApprove={setApprove} onReject={setReject}/>
      ))}
      {approve && <ApproveSheet lead={approve} onClose={() => setApprove(null)} onDone={() => { setApprove(null); load() }}/>}
      {reject && <RejectSheet lead={reject} onClose={() => setReject(null)} onDone={() => { setReject(null); load() }}/>}
    </div>
  )
}

function InterestsTab({ onChanged }) {
  const navigate = useNavigate()
  const [filter, setFilter] = useState('open')
  const [rows, setRows] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    setRows(null); setError(null)
    redGetInterests({ status: filter }).then(setRows).catch(e => { setError(e.message); setRows([]) })
  }, [filter])

  const change = async (r, internalStatus) => {
    setError(null)
    try {
      await redUpdateInterest(r.id, { internalStatus })
      setRows(prev => prev.map(x => x.id === r.id ? { ...x, internalStatus } : x))
      onChanged?.()
    } catch (e) { setError(e.message) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto' }}>
        {INTEREST_FILTERS.map(f => <button key={f} onClick={() => setFilter(f)} style={{ ...chip(filter === f), padding: '4px 11px', fontSize: 11 }}>{t(`approvals.interestFilter.${f}`)}</button>)}
      </div>
      <ErrorLine error={error}/>
      {rows === null ? (
        [0, 1, 2].map(i => <div key={i} style={{ height: 64, borderRadius: 12, background: 'rgba(139,92,246,0.06)' }}/>)
      ) : rows.length === 0 ? (
        <EmptyState icon={Heart} title={t('approvals.noInterests')}/>
      ) : rows.map(r => (
        <div key={r.id} style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10, padding: '10px 12px', borderRadius: 12, background: 'var(--glass-bg)', border: '1px solid var(--border-violet)' }}>
          <Heart size={14} color="#EC4899" style={{ flexShrink: 0 }}/>
          <div style={{ flex: 1, minWidth: 180 }}>
            <button onClick={() => navigate(`/network/influencers/${r.influencerId}`)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', textAlign: 'left' }}>{r.influencerName}</button>
            <div style={{ fontSize: 12, color: 'var(--text-primary)' }}>{r.offerTitle}</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{[r.brandName, r.cityName, new Date(r.votedAt).toLocaleDateString()].filter(Boolean).join(' · ')}</div>
          </div>
          <InterestToCollab interest={r} onCreated={(c) => { setRows(prev => prev.map(x => x.id === r.id ? { ...x, collaborationId: c.id, internalStatus: 'matched' } : x)); onChanged?.() }}/>
          <select value={r.internalStatus} onChange={e => change(r, e.target.value)} aria-label={t('red.interests.status')} style={{ ...inputStyle, width: 'auto', padding: '6px 8px', fontSize: 12 }}>
            {INTERNAL.map(s => <option key={s} value={s}>{t(`red.interests.internal.${s}`)}</option>)}
          </select>
        </div>
      ))}
    </div>
  )
}

export default function ApprovalsPage() {
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') === 'interests' ? 'interests' : 'pending'
  const [counts, setCounts] = useState(null)
  const refreshCounts = useCallback(() => { redGetPendingCounts().then(setCounts).catch(() => {}) }, [])
  useEffect(() => { refreshCounts() }, [refreshCounts])

  const pendingN = counts ? counts.leads + counts.emails : 0
  return (
    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>{t('approvals.title')}</h1>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t('approvals.subtitle')}</p>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => setParams({})} style={chip(tab === 'pending')}><Inbox size={13}/>{t('approvals.tabPending')}{pendingN > 0 ? ` · ${pendingN}` : ''}</button>
        <button onClick={() => setParams({ tab: 'interests' })} style={chip(tab === 'interests')}><Heart size={13}/>{t('approvals.tabInterests')}{counts?.interests > 0 ? ` · ${counts.interests}` : ''}</button>
      </div>
      {tab === 'pending' ? <PendingTab onChanged={refreshCounts}/> : <InterestsTab onChanged={refreshCounts}/>}
    </div>
  )
}
