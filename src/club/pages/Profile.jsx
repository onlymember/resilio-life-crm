// Perfil: nombre, Instagram, email, WhatsApp, ciudades y temas.
// Todo lo demás de la ficha es del equipo y no se ve acá.
import React, { useEffect, useState } from 'react'
import { updateProfile, listCities } from '../api.js'
import { t, errText, useLang } from '../i18n.js'
import { Field, ErrorBox, Chips, Toast, categoryOptions } from '../components/ui.jsx'
import { useAuth, LangToggle } from '../components/chrome.jsx'

export default function Profile() {
  useLang()
  const { profile, setProfile, logout } = useAuth()
  const [cities, setCities] = useState([])
  const [f, setF] = useState(() => ({
    name: profile?.name || '', instagram: profile?.instagram || '', email: profile?.email || '',
    whatsapp: profile?.whatsapp || '', cityIds: profile?.city_ids || [], categories: profile?.categories || [],
  }))
  const [busy,  setBusy]  = useState(false)
  const [error, setError] = useState(null)
  const [toast, setToast] = useState(null)

  useEffect(() => { listCities().then(setCities) }, [])
  const set = (k) => (e) => setF(p => ({ ...p, [k]: e.target.value }))

  const save = async (e) => {
    e.preventDefault()
    if (busy) return
    setBusy(true); setError(null)
    try {
      // Solo se mandan los campos que cambiaron: el resto va en null (= sin cambios).
      const diff = (k, orig) => (f[k] !== (orig || '') ? f[k] : null)
      const updated = await updateProfile({
        name: diff('name', profile.name), instagram: diff('instagram', profile.instagram),
        email: diff('email', profile.email), whatsapp: diff('whatsapp', profile.whatsapp),
        cityIds: f.cityIds, categories: f.categories,
      })
      setProfile(updated)
      setToast(t('common.saved'))
    } catch (err) { setError(errText(err)) }
    finally { setBusy(false) }
  }

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
        <Field label={t('fields.email')} id="p-email">
          <input id="p-email" className="club-input" type="email" autoComplete="email" value={f.email} onChange={set('email')}/>
        </Field>
        <Field label={t('fields.whatsapp')} id="p-wa">
          <input id="p-wa" className="club-input" type="tel" autoComplete="tel" value={f.whatsapp} onChange={set('whatsapp')}/>
        </Field>
        {cities.length > 0 && (
          <Field label={t('fields.cities')}>
            <Chips options={cities.map(c => ({ value: c.id, label: c.name }))} value={f.cityIds} onChange={v => setF(p => ({ ...p, cityIds: v }))}/>
          </Field>
        )}
        <Field label={t('fields.categories')}>
          <Chips options={categoryOptions()} value={f.categories} onChange={v => setF(p => ({ ...p, categories: v }))}/>
        </Field>
        <ErrorBox>{error}</ErrorBox>
        <button className="club-btn" disabled={busy}>{busy ? t('common.saving') : t('common.save')}</button>
      </form>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 }}>
        <LangToggle/>
        <button className="club-link" onClick={logout}>{t('common.logout')}</button>
      </div>
      <Toast message={toast} onDone={() => setToast(null)}/>
    </>
  )
}
