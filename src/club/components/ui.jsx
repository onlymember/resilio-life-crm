import React, { useState, useEffect } from 'react'
import { Copy, Check, MessageCircle } from 'lucide-react'
import { t, CATEGORY_KEYS } from '../i18n.js'

export function Field({ label, hint, children, id }) {
  return (
    <div className="club-field">
      <label htmlFor={id}>{label}{hint && <span style={{ fontWeight: 400 }}> · {hint}</span>}</label>
      {children}
    </div>
  )
}

export function ErrorBox({ children }) {
  if (!children) return null
  return <div className="club-error" role="alert">{children}</div>
}

export function Toast({ message, onDone }) {
  useEffect(() => {
    if (!message) return
    const id = setTimeout(onDone, 3200)
    return () => clearTimeout(id)
  }, [message, onDone])
  if (!message) return null
  return <div className="club-toast" role="status">{message}</div>
}

export function Chips({ options, value, onChange, multi = true, scroll = false }) {
  const isOn = (v) => (multi ? value.includes(v) : value === v)
  const toggle = (v) => {
    if (!multi) return onChange(v)
    onChange(isOn(v) ? value.filter(x => x !== v) : [...value, v])
  }
  return (
    <div className={`club-chips${scroll ? ' scroll' : ''}`}>
      {options.map(o => (
        <button type="button" key={o.value} className={`club-chip${isOn(o.value) ? ' on' : ''}`}
          aria-pressed={isOn(o.value)} onClick={() => toggle(o.value)}>
          {o.dot && <span className="dot"/>}{o.label}
        </button>
      ))}
    </div>
  )
}

export const categoryOptions = () => CATEGORY_KEYS.map(k => ({ value: k, label: t(`categories.${k}`) }))

export function LinkShare({ link, message }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1800) }
    catch { /* el campo queda para copiar a mano */ }
  }
  const wa = `https://wa.me/?text=${encodeURIComponent(`${message}\n${link}`)}`
  return (
    <div>
      <input className="club-input" readOnly value={link} onFocus={e => e.target.select()} style={{ fontSize: 14, marginBottom: 10 }}/>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <button type="button" className="club-btn ghost" onClick={copy}>
          {copied ? <Check size={16}/> : <Copy size={16}/>}{copied ? t('common.copied') : t('common.copy')}
        </button>
        <a className="club-btn" href={wa} target="_blank" rel="noopener noreferrer"><MessageCircle size={16}/>WhatsApp</a>
      </div>
    </div>
  )
}

// Pantalla centrada con el logo arriba (login, alta, estados).
export function Centered({ children, top }) {
  return (
    <div className="club-wrap club-center">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>{top}</div>
      {children}
    </div>
  )
}
