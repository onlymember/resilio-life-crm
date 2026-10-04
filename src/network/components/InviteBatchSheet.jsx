// Invitaciones a la red en tanda (064). Se va persona por persona:
// "Enviar invitación y seguir" crea el link (o reusa el vigente), abre
// WhatsApp con su nombre y su link, registra el contacto y pasa a la
// siguiente. El mensaje A o B lo elige el link, para medir cuál funciona.
import React, { useEffect, useMemo, useState } from 'react'
import { X, MessageCircle, SkipForward, Check } from 'lucide-react'
import { t } from '../../i18n/index.js'
import { dbEnsureInfluencerInvite, dbGetInviteTexts, dbLogContact } from '../../lib/database.js'
import { PARTNERS_URL } from '../../partners/content.js'
import { inviteMessage } from '../../invite/content.js'
import { quiet } from '../../lib/quiet.js'
import { toast } from './Toaster.jsx'

const LANGS = ['es', 'en', 'pt']
const waNumber = (e) => (e?.whatsapp || e?.phone || '').replace(/[^0-9]/g, '')

export default function InviteBatchSheet({ entities, cityMap = {}, onClose, onContacted }) {
  const [idx, setIdx] = useState(0)
  const [sent, setSent] = useState(0)
  const [lang, setLang] = useState('es')
  const [texts, setTexts] = useState({})
  const [busy, setBusy] = useState(false)

  const queue = useMemo(() => entities.filter(e => waNumber(e)), [entities])
  const skippedNoWa = entities.length - queue.length
  useEffect(() => { dbGetInviteTexts().then(setTexts).catch(() => {}) }, [])

  const current = queue[idx]
  const done = idx >= queue.length
  const preview = current ? inviteMessage({ lang, variant: 'a', name: current.name, city: cityMap[current.cityId] || '', link: `${PARTNERS_URL}/i/…`, overrides: texts }) : ''

  const send = async () => {
    if (!current || busy) return
    // La ventana se abre antes de esperar a la base: si no, el navegador la bloquea.
    const win = window.open('', '_blank')
    setBusy(true)
    try {
      const inv = await dbEnsureInfluencerInvite(current.id, lang)
      const text = inviteMessage({ lang: inv.lang, variant: inv.variant, name: current.name, city: cityMap[current.cityId] || '', link: `${PARTNERS_URL}/i/${inv.token}`, overrides: texts })
      const url = `https://wa.me/${waNumber(current)}?text=${encodeURIComponent(text)}`
      if (win) win.location.href = url; else window.open(url, '_blank', 'noopener')
      dbLogContact('influencer', current.id, 'WhatsApp').catch(quiet('InviteBatchSheet'))
      onContacted?.(current.id)
      setSent(n => n + 1)
      setIdx(i => i + 1)
    } catch (e) {
      win?.close()
      toast(e.message)
    } finally { setBusy(false) }
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 480, margin: 12, maxHeight: '85vh', overflowY: 'auto', borderRadius: 18, padding: 16, background: 'var(--bg-secondary, #16131f)', border: '1px solid var(--border-violet)', animation: 'slideUp var(--dur-base, 0.25s) ease both' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{t('invite.batchTitle')}</div>
          <button onClick={onClose} aria-label={t('batch.close')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><X size={17}/></button>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 10 }}>{t('invite.batchHint')}</div>
        {skippedNoWa > 0 && <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 10 }}>{t('batch.noWhatsapp', { n: skippedNoWa })}</div>}

        {queue.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', padding: '16px 0' }}>{t('batch.nobody')}</div>
        ) : done ? (
          <div style={{ textAlign: 'center', padding: '24px 8px' }}>
            <Check size={28} color="#34D399"/>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginTop: 8 }}>{t('invite.batchDone', { n: sent })}</div>
            <button onClick={onClose} style={{ marginTop: 16, padding: '10px 18px', borderRadius: 10, border: 'none', background: 'var(--primary-violet)', color: 'white', fontWeight: 700, cursor: 'pointer' }}>{t('batch.close')}</button>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{t('batch.progress', { i: idx + 1, n: queue.length })}</span>
              <div role="group" aria-label="Idioma" style={{ display: 'flex', gap: 2, padding: 2, borderRadius: 8, border: '1px solid var(--border-violet)' }}>
                {LANGS.map(l => (
                  <button key={l} onClick={() => setLang(l)} aria-pressed={lang === l}
                    style={{ fontSize: 10, fontWeight: 700, padding: '4px 8px', borderRadius: 6, cursor: 'pointer', border: 'none', background: lang === l ? 'var(--primary-violet)' : 'transparent', color: lang === l ? 'white' : 'var(--text-secondary)' }}>{l.toUpperCase()}</button>
                ))}
              </div>
            </div>
            <div style={{ height: 4, borderRadius: 2, background: 'rgba(139,92,246,0.12)', marginBottom: 12 }}>
              <div style={{ height: '100%', width: `${(idx / Math.max(1, queue.length)) * 100}%`, borderRadius: 2, background: 'var(--primary-violet)', transition: 'width 0.2s' }}/>
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{current.name}</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 8 }}>{current.whatsapp || current.phone}</div>
            <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.5, whiteSpace: 'pre-wrap', padding: '10px 12px', borderRadius: 12, background: 'rgba(139,92,246,0.05)', border: '1px solid var(--border-violet)', marginBottom: 12 }}>{preview}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 8 }}>
              <button onClick={() => setIdx(i => i + 1)} disabled={busy} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '11px 0', borderRadius: 10, cursor: 'pointer', background: 'rgba(139,92,246,0.08)', border: '1px solid var(--border-violet)', color: 'var(--text-secondary)', fontSize: 13, fontWeight: 600 }}>
                <SkipForward size={14}/>{t('batch.skip')}
              </button>
              <button onClick={send} disabled={busy} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '11px 0', borderRadius: 10, cursor: busy ? 'default' : 'pointer', background: '#25D366', border: 'none', color: '#062b14', fontSize: 13, fontWeight: 800, opacity: busy ? 0.7 : 1 }}>
                <MessageCircle size={15}/>{busy ? t('invite.batchCreating') : t('invite.batchSend')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
