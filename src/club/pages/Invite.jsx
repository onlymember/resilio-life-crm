// Invitar: cupo mensual, link de un solo uso.
import React, { useEffect, useState } from 'react'
import { myInvitations, createInvite, joinLink } from '../api.js'
import { t, errText, useLang } from '../i18n.js'
import { Field, ErrorBox, LinkShare } from '../components/ui.jsx'

export default function Invite() {
  useLang()
  const [data,  setData]  = useState(null)
  const [hint,  setHint]  = useState('')
  const [fresh, setFresh] = useState(null)
  const [busy,  setBusy]  = useState(false)
  const [error, setError] = useState(null)

  const load = () => myInvitations().then(setData).catch(e => setError(errText(e)))
  useEffect(() => { load() }, [])

  const create = async (e) => {
    e.preventDefault()
    if (busy) return
    setBusy(true); setError(null)
    try { const r = await createInvite(hint.trim()); setFresh(joinLink(r.token)); setHint(''); load() }
    catch (err) { setError(errText(err)) }
    finally { setBusy(false) }
  }

  const left = data?.quota_left ?? 0
  return (
    <>
      <h1>{t('invite.title')}</h1>
      <p className="muted" style={{ marginBottom: 18 }}>{t('invite.intro')}</p>

      {fresh ? (
        <div className="club-panel" style={{ marginBottom: 20 }}>
          <LinkShare link={fresh} message={t('invite.message')}/>
          <button className="club-link" style={{ marginTop: 10 }} onClick={() => setFresh(null)}>{t('common.back')}</button>
        </div>
      ) : (
        <form className="club-panel" onSubmit={create} style={{ marginBottom: 20 }}>
          {data && <div className="club-note" style={{ marginBottom: 14 }}>{t('invite.left', { n: left })}</div>}
          <Field label={t('invite.hint')} hint={t('common.optional')} id="i-hint">
            <input id="i-hint" className="club-input" value={hint} onChange={e => setHint(e.target.value)} maxLength={120} placeholder="@usuario"/>
          </Field>
          <ErrorBox>{error}</ErrorBox>
          <button className="club-btn" disabled={busy || !data || left <= 0}>{busy ? t('common.saving') : t('invite.generate')}</button>
        </form>
      )}

      <h2>{t('invite.history')}</h2>
      {data && data.items.length === 0 && <p className="muted">{t('invite.none')}</p>}
      {data?.items.map(i => (
        <div key={i.token} className="club-row">
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{i.hint || '—'}</div>
            <div className="muted small">{new Date(i.created_at).toLocaleDateString()}</div>
          </div>
          <span className={`club-status ${i.state === 'pending' ? 'on' : 'off'}`}>{t(`invite.state.${i.state}`)}</span>
        </div>
      ))}
    </>
  )
}
