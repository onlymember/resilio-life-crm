// Colaboración · pedirle a la influencer que confirme fecha y hora con un
// link (se abre en el Club, sin cuenta). Muestra qué respondió y, si
// propuso otra fecha, permite aceptarla con un toque.
import React, { useEffect, useState } from 'react'
import { MessageCircle, Copy, Check, Link2, CalendarCheck, CalendarX, CalendarClock } from 'lucide-react'
import { t } from '../../i18n/index.js'
import { dbCreateCollabConfirmation, dbGetLastCollabConfirmation, dbPatchCollaboration, dbSetCollabChecklist } from '../../lib/database.js'
import { CLUB_URL } from '../../lib/red.js'
import { toast } from './Toaster.jsx'

const btn = { display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, padding: '8px 12px', borderRadius: 9, cursor: 'pointer', whiteSpace: 'nowrap' }
const fmtDay = (d) => d ? new Date(`${d}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }) : ''

export default function ConfirmLinkCard({ collab, influencerWa, onApplied }) {
  const [last, setLast] = useState(undefined)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => { dbGetLastCollabConfirmation(collab.id).then(setLast).catch(() => setLast(null)) }, [collab.id])

  const link = last && !last.respondedAt && new Date(last.expiresAt) > new Date() ? `${CLUB_URL}/confirmar?t=${last.token}` : null
  const wa = (influencerWa || '').replace(/[^0-9]/g, '')
  const message = t('confirmLink.message', { marca: collab.brandName || '', fecha: fmtDay(collab.startDate) })

  const create = async () => {
    setBusy(true)
    try {
      await dbCreateCollabConfirmation(collab.id)
      setLast(await dbGetLastCollabConfirmation(collab.id))
    } catch (e) { toast(e.message) }
    finally { setBusy(false) }
  }
  const copy = async () => {
    try { await navigator.clipboard.writeText(`${message}\n${link}`); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch { /* sin portapapeles */ }
  }
  const acceptProposal = async () => {
    setBusy(true)
    try {
      await dbPatchCollaboration(collab.id, { startDate: last.proposedDate, startTime: last.proposedTime || null, status: collab.status === 'proposed' ? 'confirmed' : collab.status, nextAction: null, nextActionAt: null })
      await dbSetCollabChecklist(collab.id, { ...(collab.checklist || {}), confirmed: true })
      onApplied?.({ startDate: last.proposedDate, startTime: last.proposedTime || null, status: collab.status === 'proposed' ? 'confirmed' : collab.status, nextAction: null, nextActionAt: null, checklist: { ...(collab.checklist || {}), confirmed: true } })
      toast(t('confirmLink.applied'))
    } catch (e) { toast(e.message) }
    finally { setBusy(false) }
  }

  if (last === undefined) return <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t('loading.generic')}</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Respuesta */}
      {last?.respondedAt && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 12px', borderRadius: 10,
          background: last.response === 'confirmed' ? 'rgba(52,211,153,0.08)' : last.response === 'proposed' ? 'rgba(251,191,36,0.08)' : 'rgba(248,113,113,0.08)',
          border: `1px solid ${last.response === 'confirmed' ? 'rgba(52,211,153,0.3)' : last.response === 'proposed' ? 'rgba(251,191,36,0.35)' : 'rgba(248,113,113,0.3)'}` }}>
          {last.response === 'confirmed' ? <CalendarCheck size={16} color="#34D399"/> : last.response === 'proposed' ? <CalendarClock size={16} color="#FBBF24"/> : <CalendarX size={16} color="#F87171"/>}
          <div style={{ flex: 1, fontSize: 12, color: 'var(--text-primary)' }}>
            <b>{t(`confirmLink.response.${last.response}`, { fecha: fmtDay(last.proposedDate), hora: last.proposedTime || '' })}</b>
            <span style={{ color: 'var(--text-secondary)' }}> · {new Date(last.respondedAt).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
            {last.note && <div style={{ color: 'var(--text-secondary)', marginTop: 3 }}>“{last.note}”</div>}
          </div>
          {last.response === 'proposed' && (
            <button onClick={acceptProposal} disabled={busy} style={{ ...btn, border: 'none', background: '#FBBF24', color: '#2a1d00' }}>{t('confirmLink.accept')}</button>
          )}
        </div>
      )}

      {/* Link vigente o botón para crearlo */}
      {link ? (
        <>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{t('confirmLink.pending', { fecha: new Date(last.expiresAt).toLocaleDateString() })}</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <a href={`https://wa.me/${wa}?text=${encodeURIComponent(`${message}\n${link}`)}`} target="_blank" rel="noopener noreferrer"
              style={{ ...btn, textDecoration: 'none', color: '#062b14', background: '#25D366' }}>
              <MessageCircle size={14}/>{wa ? t('confirmLink.sendWa') : t('confirmLink.shareWa')}
            </a>
            <button onClick={copy} style={{ ...btn, background: 'rgba(139,92,246,0.08)', border: '1px solid var(--border-violet)', color: 'var(--text-secondary)' }}>
              {copied ? <Check size={14}/> : <Copy size={14}/>}{copied ? t('confirmLink.copied') : t('confirmLink.copy')}
            </button>
          </div>
        </>
      ) : (
        <button onClick={create} disabled={busy || !collab.startDate} style={{ ...btn, alignSelf: 'flex-start', border: 'none', background: collab.startDate ? 'var(--primary-violet)' : 'rgba(139,92,246,0.25)', color: 'white' }}>
          <Link2 size={14}/>{busy ? t('loading.generic') : last?.respondedAt ? t('confirmLink.again') : t('confirmLink.create')}
        </button>
      )}
      {!collab.startDate && <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{t('confirmLink.needDate')}</div>}
    </div>
  )
}
