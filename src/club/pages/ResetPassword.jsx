// /nueva-clave — llega desde el email de recuperación (con sesión temporal).
import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { setNewPassword } from '../api.js'
import { t, errText, useLang } from '../i18n.js'
import { Field, ErrorBox, Centered } from '../components/ui.jsx'
import { Logo, LangToggle, useAuth } from '../components/chrome.jsx'

export default function ResetPassword() {
  useLang()
  const { session } = useAuth()
  const [password, setPassword] = useState('')
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const submit = async (e) => {
    e.preventDefault()
    if (busy) return
    if (password.length < 8) { setError(t('errors.password_short')); return }
    setBusy(true); setError(null)
    try { await setNewPassword(password); setDone(true) }
    catch (err) { setError(errText(err)) }
    finally { setBusy(false) }
  }

  return (
    <Centered top={<><Logo/><LangToggle/></>}>
      <h1>{t('reset.title')}</h1>
      {done ? (
        <>
          <div className="club-note" style={{ margin: '12px 0 16px' }}>{t('reset.done')}</div>
          <Link className="club-btn" to="/">{t('nav.feed')}</Link>
        </>
      ) : session === null ? (
        <div className="club-error" style={{ marginTop: 12 }}>{t('errors.link_invalid')}</div>
      ) : (
        <form className="club-panel" onSubmit={submit} noValidate style={{ marginTop: 16 }}>
          <Field label={t('fields.passwordNew')} hint={t('fields.passwordHint')} id="r-pass">
            <input id="r-pass" className="club-input" type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)}/>
          </Field>
          <ErrorBox>{error}</ErrorBox>
          <button className="club-btn" disabled={busy}>{busy ? t('common.saving') : t('reset.submit')}</button>
        </form>
      )}
    </Centered>
  )
}
