// Bloque "Club" de la ficha de influencer:
//   · Acceso a la app: activo / link pendiente / "Dar acceso a la app".
//   · Sus "Me interesa", con el estado interno que maneja el equipo.
// La influencer nunca ve este estado interno.
import React, { useState, useEffect, useCallback } from 'react'
import { Smartphone, Heart } from 'lucide-react'
import { t } from '../../i18n/index.js'
import { redGetAppAccess, redCreateInvitation, redGetInfluencerInterests, redUpdateInterest, redGetInfluencerTopics } from '../../lib/red.js'
import { LinkShare, ErrorLine, btn, inputStyle } from './ui.jsx'
import InterestToCollab from './InterestToCollab.jsx'

const INTERNAL = ['new', 'reviewed', 'contacted', 'discarded', 'matched']

function AppAccess({ influencerId }) {
  const [state,   setState]   = useState(null)
  const [invite,  setInvite]  = useState(null)
  const [busy,    setBusy]    = useState(false)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    redGetAppAccess(influencerId).then(setState).catch(e => setError(e.message))
  }, [influencerId])

  const give = async () => {
    setBusy(true); setError(null)
    try { setInvite(await redCreateInvitation({ kind: 'activation', influencerId })) }
    catch (e) { setError(e.message) }
    finally { setBusy(false) }
  }

  if (!state && !error) return <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t('loading.generic')}</div>

  if (state?.account) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-primary)' }}>
        <Smartphone size={14} color={state.account.status === 'active' ? '#34D399' : '#F87171'}/>
        {state.account.status === 'active' ? t('red.access.active') : t('red.access.suspended')}
        {state.account.lastSeenAt && (
          <span style={{ color: 'var(--text-secondary)' }}>· {t('red.access.lastSeen', { date: new Date(state.account.lastSeenAt).toLocaleDateString() })}</span>
        )}
      </div>
    )
  }

  const pending = invite || state?.pendingInvitation
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {pending ? (
        <>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t('red.access.pending')}</div>
          <LinkShare link={pending.link} message={t('red.access.message')} expiresAt={pending.expiresAt}/>
        </>
      ) : (
        <>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{t('red.access.none')}</div>
          <button onClick={give} disabled={busy} style={{ ...btn.primary, alignSelf: 'flex-start', opacity: busy ? 0.6 : 1 }}>
            <Smartphone size={14}/>{busy ? t('red.common.saving') : t('red.access.give')}
          </button>
        </>
      )}
      <ErrorLine error={error}/>
    </div>
  )
}

function Interests({ influencerId, isDirection, ownerId }) {
  const [rows,  setRows]  = useState(null)
  const [error, setError] = useState(null)

  const load = useCallback(() => {
    redGetInfluencerInterests(influencerId).then(setRows).catch(e => setError(e.message))
  }, [influencerId])
  useEffect(() => { load() }, [load])

  const change = async (row, internalStatus) => {
    setError(null)
    try {
      await redUpdateInterest(row.id, { internalStatus })
      setRows(prev => prev.map(r => r.id === row.id ? { ...r, internalStatus } : r))
    } catch (e) { setError(e.message) }
  }

  if (!rows && !error) return <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t('loading.generic')}</div>
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {rows?.length === 0 && <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t('red.interests.none')}</div>}
      {rows?.map(r => (
        <div key={r.id} style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10, padding: '8px 10px', borderRadius: 10, background: 'rgba(139,92,246,0.05)', border: '1px solid var(--border-violet)' }}>
          <Heart size={13} color="var(--primary-violet-light)" style={{ flexShrink: 0 }}/>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.offerTitle}</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
              {[r.brandName, r.cityName, new Date(r.votedAt).toLocaleDateString(), r.offerStatus === 'inactive' ? t('red.offers.inactive') : null].filter(Boolean).join(' · ')}
            </div>
          </div>
          {isDirection && (
            <InterestToCollab interest={{ ...r, influencerOwnerId: ownerId }}
              onCreated={(c) => setRows(prev => prev.map(x => x.id === r.id ? { ...x, collaborationId: c.id, internalStatus: 'matched' } : x))}/>
          )}
          <select value={r.internalStatus} onChange={e => change(r, e.target.value)} aria-label={t('red.interests.status')}
            style={{ ...inputStyle, width: 'auto', padding: '6px 8px', fontSize: 12 }}>
            {INTERNAL.map(s => <option key={s} value={s}>{t(`red.interests.internal.${s}`)}</option>)}
          </select>
        </div>
      ))}
      <ErrorLine error={error}/>
    </div>
  )
}

function Topics({ influencerId }) {
  const [list, setList] = useState([])
  useEffect(() => { redGetInfluencerTopics(influencerId).then(setList).catch(() => {}) }, [influencerId])
  if (!list.length) return null
  const label = (c) => { const k = `categories.${c}`; const v = t(k); return v && v !== k ? v : c }
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
      {list.map(c => <span key={c} style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, background: 'rgba(139,92,246,0.1)', border: '1px solid var(--border-violet)', color: 'var(--text-primary)' }}>{label(c)}</span>)}
    </div>
  )
}

export default function InfluencerRedSection({ influencerId, sectionStyle, isDirection = false, ownerId = null }) {
  const title = { fontSize: 11, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 10 }
  return (
    <div style={sectionStyle}>
      <div style={title}>{t('red.access.section')}</div>
      <AppAccess influencerId={influencerId}/>
      <div style={{ ...title, marginTop: 18 }}>{t('red.topics')}</div>
      <Topics influencerId={influencerId}/>
      <div style={{ ...title, marginTop: 18 }}>{t('red.interests.title')}</div>
      <Interests influencerId={influencerId} isDirection={isDirection} ownerId={ownerId}/>
    </div>
  )
}
