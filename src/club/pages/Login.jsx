// /entrar — email y contraseña.
import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { signIn } from '../api.js'
import { t, errText, useLang } from '../i18n.js'
import { Field, ErrorBox, Centered } from '../components/ui.jsx'
import { Logo, LangToggle, useAuth } from '../components/chrome.jsx'

export default function Login() {
  useLang()
  const navigate = useNavigate()
  const loc = useLocation()
  const { status } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    // blocked también sale del login: la pantalla de acceso inactivo
    // (con "Cerrar sesión") la muestra la ruta privada.
    if (status === 'ready' || status === 'blocked') navigate(loc.state?.from || '/', { replace: true })
  }, [status])

  const submit = async (e) => {
    e.preventDefault()
    if (busy) return
    setBusy(true); setError(null)
    try { await signIn(email, password) }
    catch (err) { setError(errText(err)) }
    finally { setBusy(false) }
  }

  return (
    <Centered top={<><Logo/><LangToggle/></>}>
      <h1>{t('login.title')}</h1>
      <p className="muted" style={{ marginBottom: 20 }}>{t('tagline')}</p>
      <form className="club-panel" onSubmit={submit} noValidate>
        <Field label={t('fields.email')} id="l-email">
          <input id="l-email" className="club-input" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)}/>
        </Field>
        <Field label={t('fields.password')} id="l-pass">
          <input id="l-pass" className="club-input" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)}/>
        </Field>
        <ErrorBox>{error}</ErrorBox>
        <button className="club-btn" disabled={busy}>{busy ? t('common.loading') : t('login.submit')}</button>
        <div style={{ textAlign: 'center', marginTop: 12 }}><Link className="club-link" to="/olvide">{t('login.forgot')}</Link></div>
      </form>
      <p className="muted small" style={{ textAlign: 'center', marginTop: 18 }}>{t('login.noAccount')}</p>
    </Centered>
  )
}
