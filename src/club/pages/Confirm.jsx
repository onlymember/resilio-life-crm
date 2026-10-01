// /confirmar?t=… — la influencer confirma la fecha de su colaboración
// (o propone otra, o avisa que no puede) sin tener que entrar al Club.
import React, { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CalendarCheck, CalendarClock, CalendarX } from 'lucide-react'
import { getCollabConfirmation, respondCollabConfirmation } from '../api.js'
import { t, errText, useLang, getLang } from '../i18n.js'
import { Field, ErrorBox, Centered } from '../components/ui.jsx'

export default function Confirm() {
  useLang()
  const [params] = useSearchParams()
  const token = params.get('t') || ''
  const [info, setInfo] = useState(null)
  const [mode, setMode] = useState(null)      // null | 'other' | 'no'
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [done, setDone] = useState(null)

  useEffect(() => {
    if (!token) { setInfo({ status: 'invalid' }); return }
    getCollabConfirmation(token).then(setInfo).catch(() => setInfo({ status: 'invalid' }))
  }, [token])

  const send = async (response) => {
    if (busy) return
    setBusy(true); setError(null)
    try {
      await respondCollabConfirmation(token, response, { date: date || null, time: time || null, note: note.trim() || null })
      setDone(response)
    } catch (e) { setError(errText(e)) }
    finally { setBusy(false) }
  }

  if (!info) return <Centered><p className="muted" style={{ textAlign: 'center' }}>{t('common.loading')}</p></Centered>

  if (done || info.status !== 'open') {
    const key = done ? `done${done[0].toUpperCase()}${done.slice(1)}` : info.status
    const Icon = done === 'confirmed' ? CalendarCheck : done === 'proposed' ? CalendarClock : done === 'declined' ? CalendarX : CalendarClock
    return (
      <Centered>
        <div className="club-empty" style={{ padding: '4px 0 8px' }}>
          <div className="ico"><Icon size={24}/></div>
          <p>{t(`confirm.${key}`)}</p>
        </div>
      </Centered>
    )
  }

  const day = info.date
    ? new Date(`${info.date}T12:00:00`).toLocaleDateString(getLang() === 'en' ? 'en' : 'es', { weekday: 'long', day: 'numeric', month: 'long' })
        .replace(/^./, c => c.toUpperCase())   // "Jueves, 1 de octubre" (capitalize ponía "De Octubre")
    : ''
  const today = new Date(); const min = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10)

  return (
    <Centered>
      <h1 style={{ textAlign: 'center' }}>{t('confirm.title')}</h1>
      {info.influencer && <p style={{ textAlign: 'center', marginTop: 6 }}>{t('confirm.hi', { name: info.influencer })}</p>}
      <p className="muted" style={{ textAlign: 'center', marginTop: 4 }}>{t('confirm.intro', { brand: info.brand || 'Resilio' })}</p>
      <div className="club-panel" style={{ margin: '14px 0', textAlign: 'center' }}>
        <div style={{ fontSize: 18, fontWeight: 800 }}>{day}</div>
        {info.time && <div className="muted" style={{ marginTop: 2 }}>{t('confirm.at', { time: info.time })}</div>}
        {info.city && <div className="muted" style={{ marginTop: 2 }}>{info.city}</div>}
      </div>

      {mode === null && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button className="club-btn" disabled={busy} onClick={() => send('confirmed')}>{t('confirm.yes')}</button>
          <button className="club-btn ghost" onClick={() => setMode('other')}>{t('confirm.other')}</button>
          <button className="club-link" onClick={() => setMode('no')}>{t('confirm.no')}</button>
        </div>
      )}

      {mode && (
        <form className="club-panel" noValidate onSubmit={e => { e.preventDefault(); send(mode === 'other' ? 'proposed' : 'declined') }}>
          {mode === 'other' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Field label={t('confirm.newDate')} id="c-date">
                <input id="c-date" className="club-input" type="date" min={min} value={date} onChange={e => setDate(e.target.value)}/>
              </Field>
              <Field label={t('confirm.newTime')} id="c-time">
                <input id="c-time" className="club-input" type="time" value={time} onChange={e => setTime(e.target.value)}/>
              </Field>
            </div>
          )}
          <Field label={t('confirm.note')} id="c-note">
            <textarea id="c-note" className="club-input" rows={3} maxLength={500} value={note} onChange={e => setNote(e.target.value)}/>
          </Field>
          <ErrorBox>{error}</ErrorBox>
          <button className="club-btn" disabled={busy || (mode === 'other' && !date)}>{busy ? t('common.loading') : t('confirm.send')}</button>
          <button type="button" className="club-link" style={{ marginTop: 10 }} onClick={() => { setMode(null); setError(null) }}>{t('common.back')}</button>
        </form>
      )}
      {mode === null && <ErrorBox>{error}</ErrorBox>}
    </Centered>
  )
}
