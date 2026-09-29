// /activar?inv=TOKEN — la influencer crea su cuenta (o entra con una que
// ya tiene) y la cuenta queda atada a su ficha del CRM.
import React, { useEffect, useState, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Lock, MailCheck } from 'lucide-react'
import { checkInvitation, acceptInvitation, signUp, signIn } from '../api.js'
import { t, errText, useLang } from '../i18n.js'
import { Field, ErrorBox, Centered } from '../components/ui.jsx'
import { Logo, LangToggle, useAuth } from '../components/chrome.jsx'

export default function Activate() {
  useLang()
  const [params] = useSearchParams()
  const token = params.get('inv') || ''
  const navigate = useNavigate()
  const { session, refresh, logout } = useAuth()

  const [stage, setStage] = useState('checking')   // checking | closed | auth | email | activating
  const [mode,  setMode]  = useState('new')
  const [f, setF] = useState({ name: '', email: '', password: '' })
  const [busy,  setBusy]  = useState(false)
  const [error, setError] = useState(null)
  const tried = useRef(false)

  const activate = async () => {
    setStage('activating'); setError(null)
    try {
      await acceptInvitation(token)
      await refresh()
      navigate('/', { replace: true })
    } catch (e) {
      if (e.key === 'already_active') { await refresh(); navigate('/', { replace: true }); return }
      setError(errText(e))
      setStage(e.key === 'link_invalid' || e.key === 'already_activated' ? 'closed' : 'auth')
    }
  }

  useEffect(() => {
    if (session === undefined) return
    if (!token) { setStage('closed'); return }
    if (session) {
      // Volvió del email de confirmación, o ya tenía sesión: activar directo.
      if (!tried.current) { tried.current = true; activate() }
      return
    }
    checkInvitation(token)
      .then(r => setStage(r?.valid && r.kind === 'activation' ? 'auth' : 'closed'))
      .catch(() => setStage('closed'))
  }, [session, token])

  const set = (k) => (e) => setF(p => ({ ...p, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    if (busy) return
    if (f.password.length < 8) { setError(t('errors.password_short')); return }
    setBusy(true); setError(null)
    // Al entrar, la sesión nueva dispara el efecto de arriba: que no
    // active dos veces.
    tried.current = true
    try {
      if (mode === 'new') {
        const data = await signUp({ email: f.email, password: f.password, name: f.name, inviteToken: token })
        // Con "Confirm email" activado no hay sesión hasta confirmar.
        if (!data.session) { setStage('email'); return }
      } else {
        await signIn(f.email, f.password)
      }
      await activate()
    } catch (err) { tried.current = false; setError(errText(err)) }
    finally { setBusy(false) }
  }

  const top = <><Logo/><LangToggle/></>

  if (stage === 'checking' || stage === 'activating') return (
    <Centered top={top}><p className="muted" style={{ textAlign: 'center' }}>{stage === 'activating' ? t('activate.activating') : t('common.loading')}</p></Centered>
  )

  if (stage === 'closed') return (
    <Centered top={top}>
      <div className="club-empty">
        <div className="ico"><Lock size={24}/></div>
        <h1>{t('join.closedTitle')}</h1>
        <p className="muted">{error || t('errors.link_invalid')}</p>
      </div>
      {session && <button className="club-btn ghost" onClick={logout}>{t('common.logout')}</button>}
    </Centered>
  )

  if (stage === 'email') return (
    <Centered top={top}>
      <div className="club-empty">
        <div className="ico"><MailCheck size={24}/></div>
        <h1>{t('activate.checkEmailTitle')}</h1>
        <p className="muted">{t('activate.checkEmailBody', { email: f.email })}</p>
      </div>
    </Centered>
  )

  return (
    <Centered top={top}>
      <h1>{t('activate.title')}</h1>
      <p className="muted" style={{ marginBottom: 20 }}>{t('activate.intro')}</p>
      {/* Mismas pestañas que el login del CRM. */}
      <div className="club-tabs" role="tablist">
        {[['new', t('activate.newAccount')], ['login', t('activate.haveAccount')]].map(([m, label]) => (
          <button key={m} type="button" role="tab" aria-selected={mode === m}
            className={`club-tab${mode === m ? ' on' : ''}`} onClick={() => { setMode(m); setError(null) }}>{label}</button>
        ))}
      </div>
      <form className="club-panel" onSubmit={submit} noValidate>
        {mode === 'new' && (
          <Field label={t('fields.name')} id="a-name">
            <input id="a-name" className="club-input" autoComplete="name" value={f.name} onChange={set('name')}/>
          </Field>
        )}
        <Field label={t('fields.email')} id="a-email">
          <input id="a-email" className="club-input" type="email" autoComplete="email" value={f.email} onChange={set('email')}/>
        </Field>
        <Field label={t('fields.password')} hint={mode === 'new' ? t('fields.passwordHint') : null} id="a-pass">
          <input id="a-pass" className="club-input" type="password" autoComplete={mode === 'new' ? 'new-password' : 'current-password'} value={f.password} onChange={set('password')}/>
        </Field>
        <ErrorBox>{error}</ErrorBox>
        <button className="club-btn" disabled={busy}>{busy ? t('common.saving') : mode === 'new' ? t('activate.create') : t('activate.enter')}</button>
      </form>
    </Centered>
  )
}
