import React, { useRef, useEffect } from 'react'

export default function ManualNav({ categories, activeCode, onSelect }) {
  const barRef  = useRef(null)
  const btnRefs = useRef({})

  // Auto-scroll the active chip into view within the bar
  useEffect(() => {
    const btn = btnRefs.current[activeCode]
    const bar = barRef.current
    if (!btn || !bar) return
    const bRect = btn.getBoundingClientRect()
    const pRect = bar.getBoundingClientRect()
    if (bRect.left < pRect.left || bRect.right > pRect.right) {
      btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    }
  }, [activeCode])

  return (
    <div
      ref={barRef}
      style={{
        display: 'flex', gap: 6, overflowX: 'auto', padding: '10px 20px',
        background: 'var(--bg-primary)', borderBottom: '1px solid var(--border-violet)',
        position: 'sticky', top: 0, zIndex: 20,
        scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch',
      }}
    >
      <style>{`div::-webkit-scrollbar { display: none }`}</style>
      {categories.map(cat => {
        const active = activeCode === cat.code
        return (
          <button
            key={cat.code}
            ref={el => { btnRefs.current[cat.code] = el }}
            onClick={() => onSelect(cat.code)}
            style={{
              padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
              cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
              background: active ? 'rgba(139,92,246,0.25)' : 'rgba(139,92,246,0.07)',
              color: active ? 'var(--primary-violet-light)' : 'var(--text-secondary)',
              border: active ? '1px solid rgba(139,92,246,0.5)' : '1px solid var(--border-violet)',
              transition: 'all 0.15s',
            }}
          >
            {cat.name}
          </button>
        )
      })}
    </div>
  )
}
