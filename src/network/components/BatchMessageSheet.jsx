// Mensajes en tanda: se elige una plantilla y se va persona por persona.
// "Enviar y seguir" abre WhatsApp con el texto listo, registra el
// contacto en la ficha y pasa a la siguiente sin volver a la lista.
import React, { useEffect, useMemo, useState } from 'react'
import { X, MessageCircle, SkipForward, Check } from 'lucide-react'
import { t } from '../../i18n/index.js'
import { dbGetMessageTemplates, dbLogContact } from '../../lib/database.js'
import { renderTemplate } from './MessageSheet.jsx'

const waNumber = (e) => (e?.whatsapp || e?.phone || '').replace(/[^0-9]/g, '')

export default function BatchMessageSheet({ entities, entityType, cityMap = {}, me = '', onClose, onContacted }) {
  const [templates, setTemplates] = useState(null)
  const [tpl, setTpl] = useState(null)
  const [idx, setIdx] = useState(0)
  const [sent, setSent] = useState(0)
  const [custom, setCustom] = useState('')
  const [draft, setDraft] = useState('')

  // Solo quienes tienen WhatsApp; el resto se avisa arriba.
  const queue = useMemo(() => entities.filter(e => waNumber(e)), [entities])
  const skippedNoWa = entities.length - queue.length

  useEffect(() => {
    dbGetMessageTemplates({ target: entityType }).then(setTemplates).catch(() => setTemplates([]))
  }, [entityType])

  const current = queue[idx]
  const body = tpl ? tpl.body : custom
  const text = current ? renderTemplate(body, { entity: current, cityName: cityMap[current.cityId] || '', me }) : ''
  const done = idx >= queue.length

  const send = () => {
    if (!current || !body.trim()) return
    window.open(`https://wa.me/${waNumber(current)}?text=${encodeURIComponent(text)}`, '_blank', 'noopener')
    dbLogContact(entityType, current.id, 'WhatsApp').catch(() => {})
    onContacted?.(current.id)
    setSent(n => n + 1)
    setIdx(i => i + 1)
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 480, margin: 12, maxHeight: '85vh', overflowY: 'auto', borderRadius: 18, padding: 16, background: 'var(--bg-secondary, #16131f)', border: '1px solid var(--border-violet)', animation: 'slideUp var(--dur-base, 0.25s) ease both' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{t('batch.title')}</div>
          <button onClick={onClose} aria-label={t('batch.close')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><X size={17}/></button>
        </div>

        {skippedNoWa > 0 && <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 10 }}>{t('batch.noWhatsapp', { n: skippedNoWa })}</div>}

        {queue.length === 0 && (
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', padding: '16px 0' }}>{t('batch.nobody')}</div>
        )}

        {queue.length > 0 && !tpl && !custom && (
          <>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>{t('batch.pick')}</div>
            {templates === null ? (
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', padding: '12px 0' }}>{t('loading.generic')}</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {templates.map(x => (
                  <button key={x.id} onClick={() => setTpl(x)} style={{ textAlign: 'left', padding: '10px 12px', borderRadius: 12, cursor: 'pointer', background: 'rgba(139,92,246,0.05)', border: '1px solid var(--border-violet)', color: 'var(--text-primary)' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary-violet-light)', marginBottom: 4 }}>{x.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', maxHeight: 54, overflow: 'hidden' }}>{x.body}</div>
                  </button>
                ))}
                <textarea rows={3} placeholder={t('batch.custom')} value={draft} onChange={e => setDraft(e.target.value)}
                  style={{ padding: '10px 12px', borderRadius: 12, background: 'rgba(139,92,246,0.05)', border: '1px dashed var(--border-violet)', color: 'var(--text-primary)', fontSize: 14, fontFamily: 'inherit', resize: 'vertical' }}/>
                {draft.trim() && (
                  <button onClick={() => setCustom(draft)} style={{ padding: '9px 0', borderRadius: 10, border: 'none', background: 'var(--primary-violet)', color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>{t('batch.useText')}</button>
                )}
                <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{t('batch.placeholders')} {'{nombre} · {nombre_completo} · {ciudad} · {usuario} · {yo}'}</div>
              </div>
            )}
          </>
        )}

        {(tpl || custom) && (done ? (
          <div style={{ textAlign: 'center', padding: '24px 8px' }}>
            <Check size={28} color="#34D399"/>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginTop: 8 }}>{t('batch.finished', { n: sent })}</div>
            <button onClick={onClose} style={{ marginTop: 16, padding: '10px 18px', borderRadius: 10, border: 'none', background: 'var(--primary-violet)', color: 'white', fontWeight: 700, cursor: 'pointer' }}>{t('batch.close')}</button>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-secondary)', marginBottom: 6 }}>
              <span>{t('batch.progress', { i: idx + 1, n: queue.length })}</span>
              <button onClick={() => { setTpl(null); setCustom('') }} style={{ background: 'none', border: 'none', color: 'var(--primary-violet-light)', cursor: 'pointer', fontSize: 11, padding: 0 }}>{t('batch.change')}</button>
            </div>
            <div style={{ height: 4, borderRadius: 2, background: 'rgba(139,92,246,0.12)', marginBottom: 12 }}>
              <div style={{ height: '100%', width: `${(idx / Math.max(1, queue.length)) * 100}%`, borderRadius: 2, background: 'var(--primary-violet)', transition: 'width 0.2s' }}/>
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{current.name}</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 8 }}>{current.whatsapp || current.phone}</div>
            <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.5, whiteSpace: 'pre-wrap', padding: '10px 12px', borderRadius: 12, background: 'rgba(139,92,246,0.05)', border: '1px solid var(--border-violet)', marginBottom: 12 }}>{text}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 8 }}>
              <button onClick={() => setIdx(i => i + 1)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '11px 0', borderRadius: 10, cursor: 'pointer', background: 'rgba(139,92,246,0.08)', border: '1px solid var(--border-violet)', color: 'var(--text-secondary)', fontSize: 13, fontWeight: 600 }}>
                <SkipForward size={14}/>{t('batch.skip')}
              </button>
              <button onClick={send} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '11px 0', borderRadius: 10, cursor: 'pointer', background: '#25D366', border: 'none', color: '#062b14', fontSize: 13, fontWeight: 800 }}>
                <MessageCircle size={15}/>{t('batch.send')}
              </button>
            </div>
          </>
        ))}
      </div>
    </div>
  )
}
