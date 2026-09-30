// Avisos cortos abajo de la pantalla, con acción opcional ("Deshacer").
// Cualquier parte de la app llama toast('Texto', { label, run }).
import React, { useEffect, useState, useRef } from 'react'

export const toast = (message, action = null) =>
  window.dispatchEvent(new CustomEvent('network:toast', { detail: { message, action } }))

export default function Toaster() {
  const [item, setItem] = useState(null)
  const timer = useRef(null)

  useEffect(() => {
    const h = (e) => {
      clearTimeout(timer.current)
      setItem({ ...e.detail, key: Date.now() })
      timer.current = setTimeout(() => setItem(null), e.detail.action ? 6000 : 3500)
    }
    window.addEventListener('network:toast', h)
    return () => { window.removeEventListener('network:toast', h); clearTimeout(timer.current) }
  }, [])

  if (!item) return null
  return (
    <div role="status" key={item.key} style={{
      position: 'fixed', left: '50%', transform: 'translateX(-50%)', zIndex: 600,
      bottom: 'calc(108px + env(safe-area-inset-bottom, 0px))', width: 'max-content', maxWidth: 'calc(100vw - 32px)',
      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 12,
      background: 'var(--bg-secondary, #16131f)', border: '1px solid var(--border-violet)',
      boxShadow: '0 8px 30px rgba(0,0,0,0.4)', color: 'var(--text-primary)', fontSize: 13,
      animation: 'slideUp var(--dur-base, 0.25s) ease both',
    }}>
      <span>{item.message}</span>
      {item.action && (
        <button onClick={() => { item.action.run(); setItem(null) }} style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: 0,
          color: 'var(--primary-violet-light)', fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap',
        }}>{item.action.label}</button>
      )}
    </div>
  )
}
