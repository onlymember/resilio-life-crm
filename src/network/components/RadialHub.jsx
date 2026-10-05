// Resilio Radial Hub: reemplaza al "+" de la barra de abajo (celular).
// Al tocar el logo, sube al centro de la pantalla dando una vuelta
// completa, larga una onda, se dibuja la órbita y salen los 5 módulos.
// Al elegir uno, ese círculo crece un instante y se abre directo el alta
// (nueva influencer, marca, tarea…), igual que hacía el +.
// Tocar el centro, afuera o Escape cierra.
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation } from 'react-router-dom'
import { t } from '../../i18n/index.js'
import { SPEED_DIAL_ITEMS } from '../createOptions.js'
import './radialHub.css'

const MARK = '/hub-mark.png'
const OPEN_MS = 420

// Posición de cada módulo alrededor del centro (ángulo en grados, distancia).
// A propósito no es simétrico: parece un sistema, no un menú.
const ORBIT = {
  task:          { a: -90,  r: 150, route: '/network/tasks' },
  collaboration: { a: -22,  r: 140, route: '/network/collaborations' },
  opportunity:   { a: 42,   r: 152, route: '/network/opportunities' },
  influencer:    { a: 136,  r: 148, route: '/network/influencers' },
  brand:         { a: -158, r: 136, route: '/network/brands' },
}
// Orden de salida: arriba primero, después en sentido horario.
const OUT_ORDER = ['task', 'collaboration', 'opportunity', 'influencer', 'brand']

const rgb = (hex) => {
  const h = hex.replace('#', '')
  return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)).join(',')
}

export default function RadialHub({ onCreate }) {
  const location = useLocation()
  const btnRef = useRef(null)
  const firstRef = useRef(null)
  const [phase, setPhase] = useState('closed')      // closed | opening | open | module | closing
  const [sel, setSel] = useState(null)
  const [geo, setGeo] = useState(null)               // centro, escala y punto de partida
  const timer = useRef(null)

  const measure = () => {
    const w = window.innerWidth, h = window.innerHeight
    const b = btnRef.current?.getBoundingClientRect()
    const cx = w / 2, cy = Math.round(h * 0.46)
    return { cx, cy, k: Math.min(1, (w - 60) / 330), fromX: b ? b.left + b.width / 2 - cx : 0, fromY: b ? b.top + b.height / 2 - cy : h / 2 }
  }

  const open = () => {
    clearTimeout(timer.current)
    setGeo(measure()); setSel(null); setPhase('opening')
    // Dos cuadros: primero se monta en la barra, después viaja al centro.
    requestAnimationFrame(() => requestAnimationFrame(() => setPhase('open')))
  }
  const close = useCallback(() => {
    setPhase(p => (p === 'closed' ? p : 'closing'))
    setSel(null)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setPhase('closed'), OPEN_MS)
  }, [])

  // Cambiar de pantalla, Escape y bloqueo del scroll de fondo.
  useEffect(() => { if (phase !== 'closed') close() }, [location.pathname]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (phase === 'closed') return
    const onKey = (e) => { if (e.key === 'Escape') { if (sel) { setSel(null); setPhase('open') } else close() } }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [phase, sel, close])
  useEffect(() => { if (phase === 'open' && !sel) setTimeout(() => firstRef.current?.focus({ preventScroll: true }), OPEN_MS) }, [phase, sel])
  useEffect(() => () => clearTimeout(timer.current), [])

  const isOpen = phase === 'open'
  const inModule = phase === 'module'
  const items = OUT_ORDER.map(step => SPEED_DIAL_ITEMS.find(i => i.step === step)).filter(Boolean)

  const posOf = (step) => {
    const o = ORBIT[step], k = geo?.k ?? 1
    const rad = (o.a * Math.PI) / 180
    return { x: Math.round(Math.cos(rad) * o.r * k), y: Math.round(Math.sin(rad) * o.r * k) }
  }

  // Crece el elegido y se abre el alta. El hub se cierra por debajo.
  const pick = (item) => {
    setSel(item); setPhase('module')
    clearTimeout(timer.current)
    timer.current = setTimeout(() => { setPhase('closed'); setSel(null); onCreate?.(item.step) }, 280)
  }

  const hubT = !geo ? '' : (phase === 'opening' || phase === 'closing')
    ? `translate(${geo.fromX}px, ${geo.fromY}px) scale(.78)`
    : inModule ? 'scale(.6)' : 'scale(1.15)'
  const spin = isOpen || inModule ? 360 : 0
  const orbitLen = 2 * Math.PI * 142 * (geo?.k ?? 1)

  return (
    <>
      <button ref={btnRef} className={`rh-btn${phase !== 'closed' ? ' rh-hidden' : ''}`} onClick={open}
        aria-label={t('hub.open')} aria-haspopup="dialog" aria-expanded={phase !== 'closed'}>
        <img src={MARK} alt="" width="26" height="23"/>
      </button>

      {phase !== 'closed' && geo && createPortal(
        <div className={`rh-layer${isOpen || inModule ? ' rh-on' : ''}`} role="dialog" aria-modal="true" aria-label={t('hub.title')}>
          <button className="rh-veil" aria-label={t('hub.close')} tabIndex={-1} onClick={close}/>

          <svg className="rh-orbit" aria-hidden="true">
            <circle cx={geo.cx} cy={geo.cy} r={142 * geo.k} stroke="rgba(216,204,255,.22)" strokeWidth="1"
              transform={`rotate(-120 ${geo.cx} ${geo.cy})`}
              style={{ strokeDasharray: `${orbitLen * 0.72} ${orbitLen * 0.28}`, strokeDashoffset: isOpen ? 0 : orbitLen * 0.72, opacity: isOpen ? 1 : 0 }}/>
            <circle cx={geo.cx} cy={geo.cy} r={176 * geo.k} stroke="rgba(231,182,245,.14)" strokeWidth="1" strokeDasharray="2 7"
              style={{ opacity: isOpen ? 1 : 0, transition: 'opacity .6s .2s' }}/>
          </svg>

          {isOpen && <><span className="rh-wave" style={{ left: geo.cx, top: geo.cy }}/><span className="rh-wave w2" style={{ left: geo.cx, top: geo.cy }}/></>}

          {items.map((item, i) => {
            const p = posOf(item.step)
            const chosen = inModule && sel?.step === item.step
            const delay = isOpen ? 260 + i * 55 : 0
            const tf = isOpen ? `translate(${p.x}px, ${p.y}px) scale(1)` : chosen ? `translate(${p.x}px, ${p.y}px) scale(1.6)` : 'translate(0px, 0px) scale(.25)'
            const c = rgb(item.color)
            return (
              <button key={item.step} ref={i === 0 ? firstRef : undefined} className="rh-mod" onClick={() => pick(item)}
                tabIndex={isOpen ? 0 : -1} aria-label={t(item.labelKey)}
                style={{ left: geo.cx, top: geo.cy, transform: tf, opacity: isOpen ? 1 : chosen ? 0.0001 : 0, transition: chosen ? 'transform .28s cubic-bezier(.2,.9,.25,1.05), opacity .28s ease-in' : undefined, transitionDelay: `${delay}ms`, pointerEvents: isOpen ? 'auto' : 'none' }}>
                <span className="rh-float" style={{ animationDuration: `${4.6 + i * 0.7}s`, animationDelay: `-${i}s` }}>
                  <span className="rh-out"/>
                  <span className="rh-in" style={{ background: `radial-gradient(circle at 35% 30%, rgba(${c},.55), rgba(${c},.16) 75%)`, border: `1px solid rgba(${c},.45)`, boxShadow: `0 0 18px rgba(${c},.25)` }}>
                    <item.Icon size={19} strokeWidth={1.8}/>
                  </span>
                </span>
                <span className="rh-name" style={{ opacity: isOpen ? 1 : 0, transitionDelay: `${delay + 120}ms` }}>{t(item.labelKey)}</span>
              </button>
            )
          })}

          <button className="rh-hub" onClick={close} aria-label={t('hub.close')}
            style={{ left: geo.cx, top: geo.cy, transform: hubT, opacity: inModule ? 0 : 1 }}>
            <img src={MARK} alt="" width="33" height="29" style={{ transform: `rotate(${spin}deg)` }}/>
          </button>

        </div>,
        document.body,
      )}
    </>
  )
}
