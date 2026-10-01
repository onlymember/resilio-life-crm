// Fila deslizable de la agenda: → completa, ← pasa a mañana.
// Es el mismo gesto que el Club. Solo arranca si el movimiento es
// claramente horizontal, así el scroll vertical y los botones de
// adentro (WhatsApp, Completar) siguen funcionando igual.
import React, { useRef, useState } from 'react'
import { CheckCircle, CalendarClock } from 'lucide-react'

const THRESHOLD = 90

export default function SwipeRow({ children, onRight, onLeft, rightLabel, leftLabel }) {
  const start = useRef(null)
  const [dx, setDx] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [busy, setBusy] = useState(false)

  const down = (e) => {
    if (busy || (e.pointerType === 'mouse' && e.button !== 0)) return
    start.current = { x: e.clientX, y: e.clientY, id: e.pointerId, locked: null }
  }
  const move = (e) => {
    const s = start.current
    if (!s || s.id !== e.pointerId) return
    const mx = e.clientX - s.x, my = e.clientY - s.y
    if (s.locked === null) {
      if (Math.abs(mx) < 10 && Math.abs(my) < 10) return
      s.locked = Math.abs(mx) > Math.abs(my) * 1.4 ? 'x' : 'y'
      if (s.locked === 'x') { setDragging(true); e.currentTarget.setPointerCapture?.(e.pointerId) }
    }
    if (s.locked !== 'x') return
    let v = mx
    if (v > 0 && !onRight) v = 0
    if (v < 0 && !onLeft)  v = 0
    setDx(v)
  }
  const up = async () => {
    const s = start.current
    start.current = null
    if (!s || s.locked !== 'x') { setDx(0); setDragging(false); return }
    setDragging(false)
    const fn = dx >= THRESHOLD ? onRight : dx <= -THRESHOLD ? onLeft : null
    if (!fn) { setDx(0); return }
    setBusy(true)
    setDx(dx > 0 ? 600 : -600)
    try { await fn() } catch { /* el padre muestra el error */ }
    setDx(0); setBusy(false)
  }

  // Un click que terminó un arrastre no tiene que abrir la ficha.
  const clickCapture = (e) => { if (Math.abs(dx) > 5) { e.stopPropagation(); e.preventDefault() } }

  const pct = Math.min(1, Math.abs(dx) / THRESHOLD)
  const right = dx > 0
  return (
    <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden' }}>
      {dx !== 0 && (
        <div aria-hidden style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
          justifyContent: right ? 'flex-start' : 'flex-end', padding: '0 18px', gap: 6,
          background: right ? `rgba(52,211,153,${0.08 + pct * 0.2})` : `rgba(251,191,36,${0.08 + pct * 0.2})`,
          color: right ? '#34D399' : '#FBBF24', fontSize: 12, fontWeight: 700,
        }}>
          {right ? <CheckCircle size={16}/> : <CalendarClock size={16}/>}
          {pct >= 1 && <span>{right ? rightLabel : leftLabel}</span>}
        </div>
      )}
      <div
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
        onClickCapture={clickCapture}
        style={{
          position: 'relative', touchAction: 'pan-y', borderRadius: 12,
          background: dx !== 0 ? 'var(--bg-primary, #0d0b14)' : undefined,
          transform: `translateX(${dx}px)`,
          transition: dragging ? 'none' : 'transform 0.25s ease',
          opacity: busy ? 0.6 : 1,
        }}
      >
        {children}
      </div>
    </div>
  )
}
