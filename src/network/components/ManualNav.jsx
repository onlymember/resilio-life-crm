import React, { useState, useRef, useEffect } from 'react'

export default function ManualNav({ categories, activeCode, onSelect, topOffset = 0 }) {
  const barRef  = useRef(null)
  const btnRefs = useRef({})
  const [ind, setInd] = useState({ left: 0, width: 0, opacity: 0 })

  useEffect(() => {
    const btn = btnRefs.current[activeCode]
    if (!btn) return
    setInd({ left: btn.offsetLeft, width: btn.offsetWidth, opacity: 1 })
    const bar = barRef.current
    if (!bar) return
    const b = btn.getBoundingClientRect()
    const p = bar.getBoundingClientRect()
    if (b.left < p.left || b.right > p.right) {
      btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    }
  }, [activeCode])

  return (
    <div style={{
      position: 'sticky', top: topOffset, zIndex: 20,
      background: 'rgba(14, 6, 32, 0.92)',
      backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
      borderBottom: '1px solid rgba(107, 47, 179, 0.2)',
    }}>
      <div
        ref={barRef}
        className="manual-nav-bar"
        style={{
          display: 'flex', gap: 4, overflowX: 'auto', padding: '9px 16px',
          scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch', position: 'relative',
        }}
      >
        <style>{`
          .manual-nav-bar::-webkit-scrollbar { display: none }
          @media (prefers-reduced-motion: reduce) { .manual-ind { transition: none !important } }
        `}</style>
        <div
          className="manual-ind"
          style={{
            position: 'absolute', top: 0, height: '100%', borderRadius: 20, pointerEvents: 'none',
            background: 'rgba(107, 47, 179, 0.3)', border: '1px solid rgba(107, 47, 179, 0.6)',
            transition: 'left 0.45s cubic-bezier(0.65,0,0.35,1), width 0.45s cubic-bezier(0.65,0,0.35,1), opacity 0.2s',
            left: ind.left, width: ind.width, opacity: ind.opacity,
          }}
        />
        {categories.map(cat => {
          const active = activeCode === cat.code
          return (
            <button
              key={cat.code}
              ref={el => { btnRefs.current[cat.code] = el }}
              onClick={() => onSelect(cat.code)}
              style={{
                position: 'relative', zIndex: 1,
                padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                background: 'transparent', border: 'none',
                color: active ? '#C4B5FD' : 'var(--text-secondary)',
                transition: 'color 0.2s',
              }}
            >
              {cat.name}
            </button>
          )
        })}
      </div>
    </div>
  )
}
