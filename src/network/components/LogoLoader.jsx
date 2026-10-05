// Pantalla de carga: solo el isotipo de Resilio girando sobre su eje
// vertical (como una moneda): la parte de abajo siempre queda abajo.
// Aparece solo si la carga demora (por defecto, más de 250 ms), así un
// cambio de pantalla rápido no parpadea.
import React, { useEffect, useState } from 'react'

const CSS = `
@keyframes rl-flip { 0% { transform: rotateY(0deg) } 100% { transform: rotateY(360deg) } }
@keyframes rl-in { from { opacity: 0 } to { opacity: 1 } }
.rl-wrap { display: flex; align-items: center; justify-content: center; animation: rl-in .25s ease both; perspective: 400px; }
.rl-logo { width: 46px; height: auto; animation: rl-flip 1.6s cubic-bezier(.45,.05,.55,.95) infinite;
  filter: drop-shadow(0 0 14px rgba(139,92,246,.55)); backface-visibility: visible; }
@media (prefers-reduced-motion: reduce) { .rl-logo { animation: none; } }
`

export default function LogoLoader({ full = false, delay = 250, label = 'Cargando' }) {
  const [show, setShow] = useState(delay === 0)
  useEffect(() => {
    if (delay === 0) return
    const id = setTimeout(() => setShow(true), delay)
    return () => clearTimeout(id)
  }, [delay])

  return (
    <div role="status" aria-label={label} style={{
      minHeight: full ? '100vh' : '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: full ? 'var(--bg-primary, #0A0618)' : 'transparent',
    }}>
      <style>{CSS}</style>
      {show && <div className="rl-wrap"><img className="rl-logo" src="/hub-mark.png" alt="" width="46" height="40"/></div>}
    </div>
  )
}
