// /sumate?inv=TOKEN — formulario de alta. Sin link válido no hay formulario.
import React, { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Lock, CheckCircle2 } from 'lucide-react'
import { checkInvitation, submitLead, listCities } from '../api.js'
import { t, errText, useLang } from '../i18n.js'
import { Field, ErrorBox, Chips, Centered, categoryOptions } from '../components/ui.jsx'
import { Logo, LangToggle } from '../components/chrome.jsx'

const CONSENT_VERSION = 'v1-2026-09'

export default function Join() {
  useLang()
  const [params] = useSearchParams()
  const token = params.get('inv') || ''
  const [stage,   setStage]   = useState('checking')   // checking | closed | form | sent
  const [by,      setBy]      = useState('')
  const [cities,  setCities]  = useState([])
  const [f, setF] = useState({ name: '', instagram: '', email: '', whatsapp: '', cityId: '', cityText: '', categories: [], message: '', consent: false })
  const [busy,  setBusy]  = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!token) { setStage('closed'); return }
    checkInvitation(token)
      .then(r => { if (r?.valid && r.kind === 'join') { setBy(r.invited_by); setStage('form') } else setStage('closed') })
      .catch(() => setStage('closed'))
    listCities().then(setCities)
  }, [token])

  const set = (k) => (e) => setF(p => ({ ...p, [k]: e?.target ? (e.target.type === 'checkbox' ? e.target.checked : e.target.value) : e }))

  const submit = async (e) => {
    e.preventDefault()
    if (busy) return
    setBusy(true); setError(null)
    try {
      await submitLead(token, {
        name: f.name, instagram: f.instagram, email: f.email, whatsapp: f.whatsapp,
        city_id: f.cityId || null, city_text: f.cityId ? null : f.cityText,
        categories: f.categories, message: f.message,
        consent: f.consent, consent_version: CONSENT_VERSION,
      })
      setStage('sent')
      window.scrollTo(0, 0)
    } catch (err) {
      setError(errText(err))
      if (err.key === 'link_invalid') setStage('closed')
    } finally { setBusy(false) }
  }

  const top = <><Logo/><LangToggle/></>

  if (stage === 'checking') return <Centered top={top}><p className="muted" style={{ textAlign: 'center' }}>{t('common.loading')}</p></Centered>

  if (stage === 'closed') return (
    <Centered top={top}>
      <div className="club-empty">
        <div className="ico"><Lock size={24}/></div>
        <h1>{t('join.closedTitle')}</h1>
        <p className="muted">{t('join.closedBody')}</p>
      </div>
    </Centered>
  )

  if (stage === 'sent') return (
    <Centered top={top}>
      <div className="club-empty">
        <div className="ico"><CheckCircle2 size={24}/></div>
        <h1>{t('join.sentTitle')}</h1>
        <p className="muted">{t('join.sentBody')}</p>
      </div>
    </Centered>
  )

  return (
    <Centered>
      <div style={{ marginBottom: 20 }}>
        <div className="club-chip on" style={{ cursor: 'default', marginBottom: 14 }}><span className="dot"/>{t('join.invitedBy', { name: by })}</div>
        <h1>{t('join.title')}</h1>
        <p className="muted">{t('join.intro')}</p>
      </div>

      <form className="club-panel" onSubmit={submit} noValidate>
        <Field label={t('fields.name')} id="j-name">
          <input id="j-name" className="club-input" autoComplete="name" value={f.name} onChange={set('name')} maxLength={120} required/>
        </Field>
        <Field label={t('fields.instagram')} id="j-ig">
          <input id="j-ig" className="club-input" autoCapitalize="none" autoCorrect="off" placeholder="@usuario" value={f.instagram} onChange={set('instagram')} required/>
        </Field>
        <Field label={t('fields.email')} id="j-email">
          <input id="j-email" className="club-input" type="email" autoComplete="email" value={f.email} onChange={set('email')} required/>
        </Field>
        <Field label={t('fields.whatsapp')} hint={t('common.optional')} id="j-wa">
          <input id="j-wa" className="club-input" type="tel" autoComplete="tel" placeholder="+54 9 11 …" value={f.whatsapp} onChange={set('whatsapp')}/>
        </Field>
        <Field label={t('fields.city')} id="j-city">
          {cities.length > 0 ? (
            <select id="j-city" className="club-input" value={f.cityId} onChange={set('cityId')}>
              <option value="">—</option>
              {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          ) : (
            <input id="j-city" className="club-input" autoComplete="address-level2" value={f.cityText} onChange={set('cityText')} maxLength={120}/>
          )}
        </Field>
        <Field label={t('fields.categories')}>
          <Chips options={categoryOptions()} value={f.categories} onChange={v => setF(p => ({ ...p, categories: v }))}/>
        </Field>
        <Field label={t('fields.message')} hint={t('common.optional')} id="j-msg">
          <textarea id="j-msg" className="club-input" value={f.message} onChange={set('message')} maxLength={1000}/>
        </Field>
        <label className="club-check">
          <input type="checkbox" checked={f.consent} onChange={set('consent')}/>
          <span>{t('join.consent')}</span>
        </label>
        <ErrorBox>{error}</ErrorBox>
        <button className="club-btn" disabled={busy || !f.consent}>{busy ? t('common.saving') : t('join.submit')}</button>
      </form>
    </Centered>
  )
}
