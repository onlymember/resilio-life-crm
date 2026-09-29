// Leads de la red: quienes completaron el formulario de club.resilio.company
// con un link de invitación.
//   · Dirección (super_admin / network_direction) aprueba o descarta.
//   · Un scouter ve, solo lectura, los que le tocarían (RLS).
// A un descartado no se le comunica nada (decisión 2026-09-28).
import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { UserPlus, Instagram, Mail, Phone, MapPin, Check, X, Link2, ExternalLink } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import EmptyState from '../components/EmptyState.jsx'
import { t } from '../../i18n/index.js'
import { dbGetActiveScouters } from '../../lib/database.js'
import { personName } from '../utils/people.js'
import { redGetLeads, redApproveLead, redRejectLead, redCreateInvitation } from '../../lib/red.js'
import { DIRECTION_ROLES } from '../routes.js'
import { Sheet, ErrorLine, LinkShare, btn, inputStyle, labelStyle, card } from '../red/ui.jsx'

const STATUS_TABS = ['pending', 'approved', 'rejected', 'all']

const statusColor = {
  pending:  'var(--primary-violet-light)',
  approved: '#34D399',
  rejected: '#F87171',
}

// Invitar a alguien nuevo: genera un link de un solo uso para /sumate.
export function InviteSheet({ onClose }) {
  const [hint,   setHint]   = useState('')
  const [inv,    setInv]    = useState(null)
  const [busy,   setBusy]   = useState(false)
  const [error,  setError]  = useState(null)

  const create = async () => {
    setBusy(true); setError(null)
    try { setInv(await redCreateInvitation({ kind: 'join', hint: hint.trim() || null })) }
    catch (e) { setError(e.message) }
    finally { setBusy(false) }
  }

  return (
    <Sheet title={t('red.invite.title')} subtitle={t('red.invite.subtitle')} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {!inv ? (
          <>
            <div>
              <label style={labelStyle} htmlFor="inv-hint">{t('red.invite.hint')}</label>
              <input id="inv-hint" value={hint} maxLength={120} onChange={e => setHint(e.target.value)} placeholder="@usuario" style={inputStyle}/>
            </div>
            <ErrorLine error={error}/>
            <button onClick={create} disabled={busy} style={{ ...btn.primary, opacity: busy ? 0.6 : 1 }}>
              <Link2 size={14}/>{busy ? t('red.common.saving') : t('red.invite.generate')}
            </button>
          </>
        ) : (
          <>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{t('red.invite.ready')}</div>
            <LinkShare link={inv.link} message={t('red.invite.message')} expiresAt={inv.expiresAt}/>
          </>
        )}
      </div>
    </Sheet>
  )
}

function ApproveSheet({ lead, onClose, onDone }) {
  const needsOwner = !lead.matchedInfluencerId && !lead.suggestedOwnerId
  const [scouters, setScouters] = useState([])
  const [allCities, setAllCities] = useState(false)
  const [owner,    setOwner]    = useState('')
  const [busy,     setBusy]     = useState(false)
  const [error,    setError]    = useState(null)
  const [result,   setResult]   = useState(null)

  useEffect(() => {
    if (!needsOwner) return
    dbGetActiveScouters(allCities ? null : lead.cityId || null)
      .then(setScouters).catch(e => setError(e.message))
  }, [needsOwner, allCities, lead.cityId])

  const approve = async () => {
    if (needsOwner && !owner) return
    setBusy(true); setError(null)
    try { setResult(await redApproveLead(lead.id, owner || null)) }
    catch (e) { setError(e.message) }
    finally { setBusy(false) }
  }

  return (
    <Sheet title={result ? t('red.leads.approvedTitle') : t('red.leads.approveTitle')} subtitle={`${lead.name} · @${lead.instagram}`}
      onClose={result ? () => onDone(result) : onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {!result ? (
          <>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              {lead.matchedInfluencerId ? t('red.leads.approveMatched') : t('red.leads.approveNew')}
            </div>
            {needsOwner && (
              <div>
                <label style={labelStyle} htmlFor="lead-owner">{t('red.leads.owner')} *</label>
                <select id="lead-owner" value={owner} onChange={e => setOwner(e.target.value)} style={inputStyle}>
                  <option value="">{t('red.common.choose')}</option>
                  {scouters.map(s => <option key={s.userId} value={s.userId}>{personName(s)}</option>)}
                </select>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)', marginTop: 8 }}>
                  <input type="checkbox" checked={allCities} onChange={e => setAllCities(e.target.checked)}/>
                  {t('red.leads.allCities')}
                </label>
              </div>
            )}
            <ErrorLine error={error}/>
            <button onClick={approve} disabled={busy || (needsOwner && !owner)} style={{ ...btn.primary, opacity: busy || (needsOwner && !owner) ? 0.5 : 1 }}>
              <Check size={14}/>{busy ? t('red.common.saving') : t('red.leads.approve')}
            </button>
          </>
        ) : result.activation ? (
          <>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{t('red.leads.sendActivation')}</div>
            <LinkShare link={result.activation.link} message={t('red.access.message')} expiresAt={result.activation.expiresAt}/>
          </>
        ) : (
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t('red.leads.alreadyHasAccount')}</div>
        )}
      </div>
    </Sheet>
  )
}

function RejectSheet({ lead, onClose, onDone }) {
  const [note,  setNote]  = useState('')
  const [busy,  setBusy]  = useState(false)
  const [error, setError] = useState(null)
  const ok = note.trim().length >= 3
  const reject = async () => {
    if (!ok) return
    setBusy(true); setError(null)
    try { await redRejectLead(lead.id, note.trim()); onDone() }
    catch (e) { setError(e.message) }
    finally { setBusy(false) }
  }
  return (
    <Sheet title={t('red.leads.rejectTitle')} subtitle={`${lead.name} · @${lead.instagram}`} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{t('red.leads.rejectHint')}</div>
        <div>
          <label style={labelStyle} htmlFor="lead-note">{t('red.leads.reason')} *</label>
          <textarea id="lead-note" rows={3} value={note} onChange={e => setNote(e.target.value)} style={{ ...inputStyle, resize: 'vertical' }}/>
        </div>
        <ErrorLine error={error}/>
        <button onClick={reject} disabled={!ok || busy} style={{ ...btn.danger, opacity: !ok || busy ? 0.5 : 1 }}>
          <X size={14}/>{busy ? t('red.common.saving') : t('red.leads.reject')}
        </button>
      </div>
    </Sheet>
  )
}

function LeadCard({ lead, isDirection, ownerName, onApprove, onReject }) {
  const navigate = useNavigate()
  const Row = ({ icon: Icon, children }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)', minWidth: 0 }}>
      <Icon size={12} style={{ flexShrink: 0 }}/><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{children}</span>
    </div>
  )
  const inviter = lead.inviterKind === 'agency' ? t('red.leads.byAgency')
    : lead.inviterKind === 'influencer' ? t('red.leads.byInfluencer')
    : t('red.leads.byScouter')

  return (
    <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{lead.name}</div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
            {inviter}{ownerName ? ` · ${t('red.leads.goesTo', { name: ownerName })}` : ''} · {new Date(lead.createdAt).toLocaleDateString()}
          </div>
        </div>
        <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: statusColor[lead.status] }}>
          {t(`red.leads.status.${lead.status}`)}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 6 }}>
        <Row icon={Instagram}>
          <a href={`https://instagram.com/${lead.instagram}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary-violet-light)', textDecoration: 'none' }}>@{lead.instagram}</a>
        </Row>
        <Row icon={Mail}>{lead.email}</Row>
        {lead.whatsapp && <Row icon={Phone}>{lead.whatsapp}</Row>}
        {lead.cityName && <Row icon={MapPin}>{lead.cityName}</Row>}
      </div>

      {lead.categories.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {lead.categories.map(c => (
            <span key={c} style={{ fontSize: 10, padding: '3px 8px', borderRadius: 12, background: 'rgba(139,92,246,0.1)', color: 'var(--text-secondary)' }}>{c}</span>
          ))}
        </div>
      )}

      {lead.message && (
        <div style={{ fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{lead.message}</div>
      )}

      {lead.matchedInfluencerId && lead.status === 'pending' && (
        <button onClick={() => navigate(`/network/influencers/${lead.matchedInfluencerId}`)} style={{ ...btn.ghost, alignSelf: 'flex-start' }}>
          <ExternalLink size={12}/>{t('red.leads.alreadyInCrm')}
        </button>
      )}

      {lead.status === 'rejected' && lead.decisionNote && isDirection && (
        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{t('red.leads.reason')}: {lead.decisionNote}</div>
      )}
      {lead.status === 'approved' && lead.influencerId && (
        <button onClick={() => navigate(`/network/influencers/${lead.influencerId}`)} style={{ ...btn.ghost, alignSelf: 'flex-start' }}>
          <ExternalLink size={12}/>{t('red.leads.openProfile')}
        </button>
      )}

      {isDirection && lead.status === 'pending' && (
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => onReject(lead)} style={{ ...btn.danger, flex: 1 }}><X size={14}/>{t('red.leads.reject')}</button>
          <button onClick={() => onApprove(lead)} style={{ ...btn.primary, flex: 1 }}><Check size={14}/>{t('red.leads.approve')}</button>
        </div>
      )}
    </div>
  )
}

export default function LeadsPage({ currentUser }) {
  const isDirection = DIRECTION_ROLES.includes(currentUser?.rol)
  const [status,   setStatus]   = useState('pending')
  const [leads,    setLeads]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)
  const [owners,   setOwners]   = useState({})
  const [approve,  setApprove]  = useState(null)
  const [reject,   setReject]   = useState(null)
  const [invite,   setInvite]   = useState(false)

  const load = useCallback(async (st = status) => {
    setLoading(true); setError(null)
    try { setLeads(await redGetLeads({ status: st })) }
    catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }, [status])

  useEffect(() => { load(status) }, [status])

  // Nombres de scouters para "va a …". Solo Dirección los necesita.
  useEffect(() => {
    if (!isDirection) return
    dbGetActiveScouters(null)
      .then(list => { const m = {}; list.forEach(s => { m[s.userId] = personName(s) }); setOwners(m) })
      .catch(() => {})
  }, [isDirection])

  const pendingCount = useMemo(() => leads.filter(l => l.status === 'pending').length, [leads])

  return (
    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>{t('red.leads.title')}</h1>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            {isDirection ? t('red.leads.subtitleDirection') : t('red.leads.subtitleScouter')}
          </p>
        </div>
        <button onClick={() => setInvite(true)} style={btn.primary}><UserPlus size={14}/>{t('red.invite.button')}</button>
      </div>

      <div style={{ display: 'flex', gap: 6, overflowX: 'auto' }}>
        {STATUS_TABS.map(id => (
          <button key={id} onClick={() => setStatus(id)} style={{
            padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
            background: status === id ? 'rgba(139,92,246,0.25)' : 'rgba(139,92,246,0.07)',
            color: status === id ? 'var(--primary-violet-light)' : 'var(--text-secondary)',
            border: status === id ? '1px solid rgba(139,92,246,0.5)' : '1px solid var(--border-violet)',
          }}>
            {t(`red.leads.tabs.${id}`)}{id === 'pending' && status === 'pending' && pendingCount > 0 ? ` · ${pendingCount}` : ''}
          </button>
        ))}
      </div>

      <ErrorLine error={error}/>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[0, 1, 2].map(i => <div key={i} style={{ height: 120, borderRadius: 14, background: 'rgba(139,92,246,0.06)', border: '1px solid var(--border-violet)' }}/>)}
        </div>
      ) : leads.length === 0 ? (
        <EmptyState icon={UserPlus} title={t('red.leads.empty')} subtitle={t('red.leads.emptyHint')}
          actionLabel={t('red.invite.button')} onAction={() => setInvite(true)}/>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {leads.map(l => (
            <LeadCard key={l.id} lead={l} isDirection={isDirection}
              ownerName={isDirection ? owners[l.suggestedOwnerId] : null}
              onApprove={setApprove} onReject={setReject}/>
          ))}
        </div>
      )}

      {invite && <InviteSheet onClose={() => setInvite(false)}/>}
      {approve && (
        <ApproveSheet lead={approve} onClose={() => setApprove(null)}
          onDone={() => { setApprove(null); load(status) }}/>
      )}
      {reject && (
        <RejectSheet lead={reject} onClose={() => setReject(null)}
          onDone={() => { setReject(null); load(status) }}/>
      )}
    </div>
  )
}
