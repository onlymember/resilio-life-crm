// /olvide — pide el link para crear una contraseña nueva.
import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { requestReset } from '../api.js'
import { t, errText, useLang } from '../i18n.js'
import { Field, ErrorBox, Centered } from '../components/ui.jsx'
import { Logo, LangToggle } from '../components/chrome.jsx'

export default function Forgot() {
  useLang()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const submit = async (e) => {
    e.preventDefault()
    if (busy) return
    setBusy(true); setError(null)
    // Mismo mensaje exista o no la cuenta: no se confirma quién está registrado.
    try { await requestReset(email); setSent(true) }
    catch (err) { if (err.code === 'over_email_send_rate_limit') setError(errText(err)); else setSent(true) }
    finally { setBusy(false) }
  }

  return (
    <Centered top={<><Logo/><LangToggle/></>}>
      <h1>{t('forgot.title')}</h1>
      {sent ? (
        <div className="club-note" style={{ marginTop: 12 }}>{t('forgot.sent')}</div>
      ) : (
        <form className="club-panel" onSubmit={submit} noValidate style={{ marginTop: 16 }}>
          <Field label={t('fields.email')} id="f-email">
            <input id="f-email" className="club-input" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)}/>
          </Field>
          <ErrorBox>{error}</ErrorBox>
          <button className="club-btn" disabled={busy || !email}>{busy ? t('common.loading') : t('forgot.submit')}</button>
        </form>
      )}
      <div style={{ textAlign: 'center', marginTop: 16 }}><Link className="club-link" to="/entrar">{t('common.back')}</Link></div>
    </Centered>
  )
}
