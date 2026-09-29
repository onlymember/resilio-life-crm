// Piezas de UI compartidas por las pantallas de la red de influencers.
// Mismo lenguaje visual que el resto de Network (variables CSS, sheets
// que suben desde abajo, violeta).
import React, { useState } from 'react'
import { X, Copy, Check, MessageCircle } from 'lucide-react'
import { t } from '../../i18n/index.js'
import { whatsappShare } from '../../lib/red.js'

export const btn = {
  primary: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    padding: '9px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600,
    background: 'linear-gradient(135deg, var(--primary-violet-dark), var(--primary-violet))',
    color: 'white', border: 'none', cursor: 'pointer',
  },
  ghost: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    padding: '8px 14px', borderRadius: 10, fontSize: 12, fontWeight: 600,
    background: 'rgba(139,92,246,0.08)', border: '1px solid var(--border-violet)',
    color: 'var(--text-secondary)', cursor: 'pointer',
  },
  danger: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    padding: '8px 14px', borderRadius: 10, fontSize: 12, fontWeight: 600,
    background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)',
    color: '#F87171', cursor: 'pointer',
  },
}

export const inputStyle = {
  width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: 16,
  background: 'rgba(139,92,246,0.07)', border: '1px solid rgba(139,92,246,0.2)',
  color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box',
}

export const labelStyle = { fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }

export const card = {
  borderRadius: 14, background: 'rgba(139,92,246,0.05)',
  border: '1px solid var(--border-violet)', padding: 14,
}

export function Sheet({ title, subtitle, onClose, children, footer }) {
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)', zIndex: 400 }}/>
      <div role="dialog" aria-modal="true" style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 401, margin: '0 auto', maxWidth: 560,
        background: 'var(--bg-secondary)', borderRadius: '20px 20px 0 0',
        border: '1px solid var(--border-violet)', borderBottom: 'none',
        padding: '0 20px', maxHeight: '88vh', display: 'flex', flexDirection: 'column',
        animation: 'slideUp var(--dur-base, .25s) var(--ease-emphasized, ease-out)',
      }}>
        <div style={{ width: 36, height: 4, background: 'rgba(255,255,255,0.15)', borderRadius: 2, margin: '12px auto 16px', flexShrink: 0 }}/>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 16, flexShrink: 0 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{title}</div>
            {subtitle && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{subtitle}</div>}
          </div>
          <button onClick={onClose} aria-label={t('red.common.close')} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 4 }}>
            <X size={18}/>
          </button>
        </div>
        <div style={{ overflowY: 'auto', flex: 1, paddingBottom: footer ? 12 : 24 }}>{children}</div>
        {footer && <div style={{ flexShrink: 0, padding: '12px 0 20px', borderTop: '1px solid var(--border-violet)' }}>{footer}</div>}
      </div>
    </>
  )
}

export function ErrorLine({ error }) {
  if (!error) return null
  return (
    <div role="alert" style={{ fontSize: 12, color: '#F87171', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, padding: '8px 12px' }}>
      {error}
    </div>
  )
}

// Caja con un link para mandar: copiar o abrir WhatsApp con el mensaje.
export function LinkShare({ link, message, expiresAt }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1800) }
    catch { /* el input queda seleccionable a mano */ }
  }
  const text = message ? `${message}\n${link}` : link
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <input readOnly value={link} onFocus={e => e.target.select()} style={{ ...inputStyle, fontSize: 13 }}/>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={copy} style={{ ...btn.ghost, flex: 1 }}>
          {copied ? <Check size={14}/> : <Copy size={14}/>}
          {copied ? t('red.common.copied') : t('red.common.copy')}
        </button>
        <a href={whatsappShare(text)} target="_blank" rel="noopener noreferrer" style={{ ...btn.primary, flex: 1, textDecoration: 'none' }}>
          <MessageCircle size={14}/>{t('red.common.whatsapp')}
        </a>
      </div>
      {expiresAt && (
        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
          {t('red.common.expires', { date: new Date(expiresAt).toLocaleDateString() })}
        </div>
      )}
    </div>
  )
}
