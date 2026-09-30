// Perfil. Nombre, Instagram y WhatsApp se editan directo y quedan en la
// ficha del CRM. El mail no: se pide el cambio y lo autoriza Dirección
// (migración 048). Ciudades con buscador; temas de la lista o propios.
import React, { useEffect, useState } from 'react'
import { updateProfile, listCities, setNewPassword, requestEmailChange, myEmailRequest } from '../api.js'
import { t, errText, useLang } from '../i18n.js'
import { Field, ErrorBox, Chips, Toast, categoryOptions } from '../components/ui.jsx'
import { useAuth, LangToggle } from '../components/chrome.jsx'

export default function Profile() {
  useLang()
  const { profile, setProfile, logout } = useAuth()
  const [cities, setCities] = useState([])
  const [cityQ,  setCityQ]  = useState('')
  const [topic,  setTopic]  = useState('')
  const [f, setF] = useState(() => ({
    name: profile?.name || '', instagram: profile?.instagram || '',
    whatsapp: profile?.whatsapp || '', cityIds: profile?.city_ids || [], categories: profile?.categories || [],
  }))
  const [busy,  setBusy]  = useState(false)
  const [error, setError] = useState(null)
  const [toast, setToast] = useState(null)
  const [panel, setPanel] = useState(null)          // 'password' | 'email'
  const [pw,    setPw]    = useState('')
  const [mail,  setMail]  = useState('')
  const [pending, setPending] = useState(null)
  const [pErr,  setPErr]  = useState(null)

  useEffect(() => { listCities().then(setCities); myEmailRequest().then(setPending).catch(() => {}) }, [])
  const set = (k) => (e) => setF(p => ({ ...p, [k]: e.target.value }))

  const save = async (e) => {
    e.preventDefault()
    if (busy) return
    setBusy(true); setError(null)
    try {
      const diff = (k, orig) => (f[k] !== (orig || '') ? f[k] : null)
      const updated = await updateProfile({
        name: diff('name', profile.name), instagram: diff('instagram', profile.instagram),
        whatsapp: diff('whatsapp', profile.whatsapp), cityIds: f.cityIds, categories: f.categories,
      })
      setProfile(updated)
      setToast(t('common.saved'))
    } catch (err) { setError(errText(err)) }
    finally { setBusy(false) }
  }

  const addTopic = () => {
    const v = topic.trim().slice(0, 40)
    if (v && !f.categories.includes(v)) setF(p => ({ ...p, categories: [...p.categories, v] }))
    setTopic('')
  }

  const submitPanel = async (e) => {
    e.preventDefault(); setPErr(null)
    try {
      if (panel === 'password') {
        if (pw.length < 8) { setPErr(t('errors.password_short')); return }
        await setNewPassword(pw); setPw(''); setToast(t('profile.passwordSaved'))
      } else {
        await requestEmailChange(mail); setPending({ new_email: mail.trim().toLowerCase() }); setMail('')
        setToast(t('profile.emailSent'))
      }
      setPanel(null)
    } catch (err) { setPErr(errText(err)) }
  }

  // Temas: los de la lista + los propios que haya agregado.
  const known = categoryOptions()
  const topicOptions = [...known, ...f.categories.filter(c => !known.some(k => k.value === c)).map(c => ({ value: c, label: c }))]
  const cityOptions = cities
    .filter(c => f.cityIds.includes(c.id) || !cityQ || c.name.toLowerCase().includes(cityQ.trim().toLowerCase()))
    .map(c => ({ value: c.id, label: c.name }))

  return (
    <>
      <h1>{t('profile.title')}</h1>
      <p className="muted" style={{ marginBottom: 18 }}>{t('profile.intro')}</p>
      <form className="club-panel" onSubmit={save} noValidate>
        <Field label={t('fields.name')} id="p-name">
          <input id="p-name" className="club-input" autoComplete="name" value={f.name} onChange={set('name')} maxLength={120}/>
        </Field>
        <Field label={t('fields.instagram')} id="p-ig">
          <input id="p-ig" className="club-input" autoCapitalize="none" autoCorrect="off" value={f.instagram} onChange={set('instagram')}/>
        </Field>
        <Field label={t('fields.email')} hint={t('profile.emailLocked')} id="p-email">
          <input id="p-email" className="club-input" type="email" value={profile?.email || ''} readOnly/>
        </Field>
        <Field label={t('fields.whatsapp')} id="p-wa">
          <input id="p-wa" className="club-input" type="tel" autoComplete="tel" value={f.whatsapp} onChange={set('whatsapp')}/>
        </Field>
        {cities.length > 0 && (
          <Field label={t('fields.cities')} id="p-cityq">
            <input id="p-cityq" className="club-input" value={cityQ} onChange={e => setCityQ(e.target.value)} placeholder={t('profile.searchCity')} style={{ marginBottom: 8 }}/>
            <Chips options={cityOptions} value={f.cityIds} onChange={v => setF(p => ({ ...p, cityIds: v }))}/>
          </Field>
        )}
        <Field label={t('fields.categories')} id="p-topic">
          <Chips options={topicOptions} value={f.categories} onChange={v => setF(p => ({ ...p, categories: v }))}/>
          <div className="club-inline">
            <input id="p-topic" className="club-input" value={topic} maxLength={40} onChange={e => setTopic(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTopic() } }} placeholder={t('profile.addTopic')}/>
            <button type="button" className="club-btn ghost" onClick={addTopic} disabled={!topic.trim()}>{t('profile.add')}</button>
          </div>
        </Field>
        <ErrorBox>{error}</ErrorBox>
        <button className="club-btn" disabled={busy}>{busy ? t('common.saving') : t('common.save')}</button>
      </form>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 }}>
        <LangToggle/>
        <button className="club-link" onClick={logout}>{t('common.logout')}</button>
      </div>
      <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 4 }}>
        <button className="club-link" onClick={() => { setPanel(panel === 'password' ? null : 'password'); setPErr(null) }}>{t('profile.changePassword')}</button>
        <button className="club-link" onClick={() => { setPanel(panel === 'email' ? null : 'email'); setPErr(null) }}>{t('profile.changeEmail')}</button>
      </div>
      {pending && <div className="club-note" style={{ marginTop: 10 }}>{t('profile.emailPending', { email: pending.new_email })}</div>}
      {panel && (
        <form className="club-panel" onSubmit={submitPanel} noValidate style={{ marginTop: 10 }}>
          {panel === 'password' ? (
            <Field label={t('fields.passwordNew')} hint={t('fields.passwordHint')} id="p-pw">
              <input id="p-pw" className="club-input" type="password" autoComplete="new-password" value={pw} onChange={e => setPw(e.target.value)}/>
            </Field>
          ) : (
            <Field label={t('profile.newEmail')} id="p-newmail">
              <input id="p-newmail" className="club-input" type="email" autoComplete="email" value={mail} onChange={e => setMail(e.target.value)}/>
            </Field>
          )}
          <ErrorBox>{pErr}</ErrorBox>
          <button className="club-btn">{panel === 'password' ? t('common.save') : t('profile.requestEmail')}</button>
        </form>
      )}
      <div style={{ textAlign: 'center', marginTop: 18 }}>
        <a className="club-link" href="/privacidad" style={{ fontSize: 12 }}>{t('join.privacyLink')}</a>
      </div>
      <Toast message={toast} onDone={() => setToast(null)}/>
    </>
  )
}
