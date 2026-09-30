// Deslizar una tarjeta para cambiar la etapa de relación (solo con el
// dedo; con mouse no, para no pelear con clics y selección de texto).
// Derecha = avanza, izquierda = retrocede. El scroll vertical sigue
// funcionando porque recién se toma el gesto cuando es claramente
// horizontal.
import React, { useRef, useState } from 'react'
import { ChevronRight, ChevronLeft } from 'lucide-react'
import { t } from '../../i18n/index.js'
import { nextStage, prevStage, STAGE_COLOR } from '../utils/stages.js'

const THRESHOLD = 90

export default function SwipeStage({ stage, onChange, children, disabled = false }) {
  const start = useRef(null)
  const moved = useRef(false)
  const [dx, setDx] = useState(0)

  const next = nextStage(stage)
  const prev = prevStage(stage)

  const down = (e) => {
    if (disabled || e.pointerType !== 'touch') return
    start.current = { x: e.clientX, y: e.clientY, axis: null }
    moved.current = false
  }
  const move = (e) => {
    const s = start.current
    if (!s) return
    const ddx = e.clientX - s.x, ddy = e.clientY - s.y
    if (!s.axis) {
      if (Math.abs(ddx) > 12 && Math.abs(ddx) > Math.abs(ddy) * 1.5) s.axis = 'x'
      else if (Math.abs(ddy) > 12) { start.current = null; return }
    }
    if (s.axis === 'x') {
      moved.current = true
      const lim = (ddx > 0 && !next) || (ddx < 0 && !prev) ? 0.25 : 1
      setDx(ddx * lim)
    }
  }
  const up = () => {
    const s = start.current
    start.current = null
    if (s?.axis === 'x') {
      const target = dx > THRESHOLD ? next : dx < -THRESHOLD ? prev : null
      if (target) onChange(target)
    }
    setDx(0)
  }
  // Un gesto que se movió no es un toque: no abre la ficha.
  const clickCapture = (e) => {
    if (moved.current) { e.stopPropagation(); e.preventDefault(); moved.current = false }
  }

  const target = dx > 0 ? next : dx < 0 ? prev : null
  const ready = Math.abs(dx) > THRESHOLD
  const color = target ? STAGE_COLOR[target] : 'transparent'

  return (
    <div style={{ position: 'relative', touchAction: 'pan-y' }}
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onClickCapture={clickCapture}>
      {dx !== 0 && target && (
        <div aria-hidden="true" style={{
          position: 'absolute', inset: 0, borderRadius: 14, display: 'flex', alignItems: 'center',
          justifyContent: dx > 0 ? 'flex-start' : 'flex-end', padding: '0 18px', gap: 6,
          background: `${color}${ready ? '40' : '1f'}`, border: `1px solid ${color}66`,
          color, fontSize: 12, fontWeight: 700,
        }}>
          {dx > 0 && <ChevronRight size={14}/>}
          {t(`relationship.${target}`)}
          {dx < 0 && <ChevronLeft size={14}/>}
        </div>
      )}
      <div style={{ transform: dx ? `translateX(${dx}px)` : undefined, transition: dx ? 'none' : 'transform 0.2s ease' }}>
        {children}
      </div>
    </div>
  )
}
