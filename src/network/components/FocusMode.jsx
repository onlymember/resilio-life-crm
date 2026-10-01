// Modo "Arrancar el día": los pendientes de a uno, a pantalla completa.
// Hacés, completás y aparece el siguiente, sin volver a la lista.
// Completar un seguimiento abre el mismo panel de "¿qué pasó?" del
// Inicio (FollowUpSheet, que queda por encima de este overlay).
import React, { useState } from 'react'
import { X, CheckCircle, CalendarClock, SkipForward, ExternalLink, PartyPopper, AlertCircle, Clock } from 'lucide-react'
import QuickActions from './QuickActions.jsx'
import { t } from '../../i18n/index.js'
import { useTz } from '../utils/tz.js'
import { fmtDateTime, fmtDateTimeOverdue } from '../utils/date.js'

const btn = (color, solid) => ({
  flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  padding: '13px 10px', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer',
  background: solid ? color : `${color}18`, color: solid ? '#0A0618' : color,
  border: `1px solid ${color}55`,
})

export default function FocusMode({ items, onClose, onComplete, onTomorrow, onOpen, onContact }) {
  const tz = useTz()
  const [queue] = useState(items)          // foto al abrir: lo que se resuelve no vuelve a aparecer
  const [idx, setIdx] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const item = queue[idx]
  const next = () => { setError(null); setIdx(i => i + 1) }

  const run = async (fn) => {
    if (busy) return
    setBusy(true); setError(null)
    try { const ok = await fn(item); if (ok !== false) next() }
    catch (e) { setError(e.message || String(e)) }
    finally { setBusy(false) }
  }

  const wrap = {
    position: 'fixed', inset: 0, zIndex: 390, background: 'var(--bg-primary)',
    display: 'flex', flexDirection: 'column', padding: 'max(16px, env(safe-area-inset-top)) 16px max(20px, env(safe-area-inset-bottom))',
  }

  return (
    <div role="dialog" aria-modal="true" aria-label={t('homeX.focus.title')} style={wrap}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: 560, width: '100%', margin: '0 auto' }}>
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--primary-violet-light)', letterSpacing: 1.2, textTransform: 'uppercase' }}>{t('homeX.focus.title')}</div>
          {item && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{t('homeX.focus.of', { i: idx + 1, n: queue.length })}</div>}
        </div>
        <button onClick={onClose} aria-label={t('homeX.focus.close')} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 10, background: 'rgba(139,92,246,0.1)', border: '1px solid var(--border-violet)', color: 'var(--text-secondary)', fontSize: 12, cursor: 'pointer' }}>
          <X size={14}/>{t('homeX.focus.close')}
        </button>
      </div>

      {/* Barra de avance */}
      {queue.length > 0 && (
        <div style={{ maxWidth: 560, width: '100%', margin: '12px auto 0', height: 4, borderRadius: 2, background: 'rgba(139,92,246,0.15)', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${Math.min(100, (idx / queue.length) * 100)}%`, background: 'linear-gradient(90deg,var(--primary-violet),var(--primary-violet-light))', transition: 'width 0.3s ease' }}/>
        </div>
      )}

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ maxWidth: 560, width: '100%' }}>
          {!item ? (
            <div style={{ textAlign: 'center' }}>
              <PartyPopper size={40} color="#34D399" style={{ marginBottom: 12 }}/>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>
                {queue.length ? t('homeX.focus.doneTitle') : t('homeX.focus.empty')}
              </div>
              {queue.length > 0 && <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 6 }}>{t('homeX.focus.doneText')}</p>}
              <button onClick={onClose} style={{ ...btn('#8B5CF6', true), flex: 'none', margin: '20px auto 0', padding: '12px 22px', color: 'white' }}>
                {t('homeX.focus.back')}
              </button>
            </div>
          ) : (
            <div key={`${item.entityType}-${item.entityId}-${idx}`} style={{ animation: 'slideUp var(--dur-base) var(--ease-emphasized)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: item.isOverdue ? '#F87171' : item.isToday ? '#FBBF24' : 'var(--text-secondary)', marginBottom: 10 }}>
                {item.isOverdue ? <AlertCircle size={14}/> : <Clock size={14}/>}
                {item.isOverdue ? fmtDateTimeOverdue(item.dueAt, tz) : fmtDateTime(item.dueAt, tz)}
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.2 }}>{item.title}</div>
              {item.subtitle && <div style={{ fontSize: 15, color: 'var(--text-secondary)', marginTop: 6 }}>{item.subtitle}</div>}

              <div style={{ marginTop: 18 }}>
                <QuickActions whatsapp={item.whatsapp} instagram={item.instagram} phone={item.phone}
                  onContact={onContact ? (label) => onContact(item, label) : undefined}/>
              </div>

              <button onClick={() => onOpen(item)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 14, background: 'none', border: 'none', padding: 0, color: 'var(--primary-violet-light)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                <ExternalLink size={12}/>{t('homeX.focus.open')}
              </button>

              {error && <div style={{ fontSize: 12, color: '#F87171', marginTop: 12, padding: '6px 10px', background: 'rgba(239,68,68,0.08)', borderRadius: 8 }}>{error}</div>}
            </div>
          )}
        </div>
      </div>

      {item && (
        <div style={{ display: 'flex', gap: 8, maxWidth: 560, width: '100%', margin: '0 auto' }}>
          <button disabled={busy} onClick={() => run(onComplete)} style={btn('#34D399', true)}>
            <CheckCircle size={16}/>{t('homeX.focus.complete')}
          </button>
          {item.kind === 'next_action' && (
            <button disabled={busy} onClick={() => run(onTomorrow)} style={btn('#FBBF24')}>
              <CalendarClock size={16}/>{t('homeX.focus.tomorrow')}
            </button>
          )}
          <button disabled={busy} onClick={next} style={btn('#A78BFA')}>
            <SkipForward size={16}/>{t('homeX.focus.skip')}
          </button>
        </div>
      )}
    </div>
  )
}
