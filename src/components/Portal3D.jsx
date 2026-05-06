import React, { useEffect, useRef, useState } from 'react'

const CONFIGS = {
  internal: {
    primary: '#8B5CF6', secondary: '#C084FC', accent: '#E879F9',
    bg: '#0F0A1E', name: 'Admin Portal',
    glow: 'rgba(139,92,246,0.8)', glowRgb: '139,92,246'
  },
  influencers: {
    primary: '#EC4899', secondary: '#F472B6', accent: '#FB923C',
    bg: '#1A0810', name: 'Influencer Portal',
    glow: 'rgba(236,72,153,0.8)', glowRgb: '236,72,153'
  },
  creators: {
    primary: '#06B6D4', secondary: '#22D3EE', accent: '#818CF8',
    bg: '#080F1A', name: 'Creator Portal',
    glow: 'rgba(6,182,212,0.8)', glowRgb: '6,182,212'
  }
}

export default function Portal3D({ onEnter, variant = 'internal' }) {
  const canvasRef = useRef(null)
  const animRef   = useRef(null)
  const [phase,   setPhase]   = useState(0) // 0=boot, 1=vortex, 2=logo, 3=cta, 4=exit
  const [ready,   setReady]   = useState(false)

  const cfg = CONFIGS[variant] || CONFIGS.internal

  // ── Canvas particle system ──────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    const resize = () => {
      canvas.width  = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    // Stars
    const stars = Array.from({ length: 250 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 1.8 + 0.3,
      twinkle: Math.random() * Math.PI * 2,
      speed: Math.random() * 0.03 + 0.01
    }))

    // Colored particles
    const colors = [cfg.primary, cfg.secondary, cfg.accent]
    const pts = Array.from({ length: 60 }, () => ({
      x:  Math.random() * window.innerWidth,
      y:  Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      r:  Math.random() * 2.5 + 0.8,
      op: Math.random() * 0.5 + 0.2,
      c:  colors[Math.floor(Math.random() * 3)]
    }))

    let frame = 0

    const tick = () => {
      animRef.current = requestAnimationFrame(tick)
      frame++
      const W = canvas.width, H = canvas.height, cx = W / 2, cy = H / 2

      ctx.clearRect(0, 0, W, H)

      // Nebula bg
      const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * 0.7)
      grd.addColorStop(0, `rgba(${cfg.glowRgb},0.06)`)
      grd.addColorStop(1, 'transparent')
      ctx.fillStyle = grd
      ctx.fillRect(0, 0, W, H)

      // Stars
      stars.forEach(s => {
        s.twinkle += s.speed
        const op = 0.3 + 0.7 * (Math.sin(s.twinkle) * 0.5 + 0.5)

        // Vortex pull after frame 60
        if (frame > 60) {
          const dx = cx - s.x, dy = cy - s.y
          const dist = Math.sqrt(dx * dx + dy * dy) || 1
          const pull = Math.min(0.8, 4000 / (dist * dist)) * Math.min(1, (frame - 60) / 180)
          s.x += dx * pull * 0.003 + (Math.random() - 0.5) * 0.2
          s.y += dy * pull * 0.003 + (Math.random() - 0.5) * 0.2
          if (dist < 8) {
            s.x = Math.random() * W
            s.y = Math.random() * H
          }
        }

        ctx.beginPath()
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,255,255,${op})`
        ctx.fill()
      })

      // Colored particles
      pts.forEach(p => {
        p.x += p.vx; p.y += p.vy
        if (p.x < 0 || p.x > W) p.vx *= -1
        if (p.y < 0 || p.y > H) p.vy *= -1
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = p.c + Math.floor(p.op * 255).toString(16).padStart(2, '0')
        ctx.fill()
      })

      // Vortex energy lines from center
      if (frame > 80) {
        const lineCount = 6
        const t = frame * 0.015
        for (let i = 0; i < lineCount; i++) {
          const angle = (i / lineCount) * Math.PI * 2 + t
          const len   = 80 + Math.sin(t * 2 + i) * 30
          const op2   = 0.15 + 0.1 * Math.sin(t + i)
          ctx.beginPath()
          ctx.moveTo(cx, cy)
          ctx.lineTo(cx + Math.cos(angle) * len, cy + Math.sin(angle) * len)
          ctx.strokeStyle = `rgba(${cfg.glowRgb},${op2})`
          ctx.lineWidth = 1.5
          ctx.stroke()
        }
      }
    }

    tick()
    return () => {
      cancelAnimationFrame(animRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [cfg])

  // ── Phase progression ───────────────────────────────────
  useEffect(() => {
    const t = [
      setTimeout(() => setPhase(1), 400),
      setTimeout(() => setPhase(2), 1200),
      setTimeout(() => setPhase(3), 2800),
      setTimeout(() => setReady(true), 3100)
    ]
    return () => t.forEach(clearTimeout)
  }, [])

  const enter = () => {
    if (!ready) return
    setPhase(4)
    setTimeout(onEnter, 900)
  }

  return (
    <>
      <style>{`
        @keyframes portalSpin  { to { transform: rotateX(65deg) rotate(360deg); } }
        @keyframes portalSpin2 { to { transform: rotateX(65deg) rotate(-360deg); } }
        @keyframes portalPulse { 0%,100%{opacity:.4} 50%{opacity:1} }
        @keyframes portalOpen  { from{transform:scale(0);opacity:1} to{transform:scale(12);opacity:0} }
        @keyframes ctaLine     { 0%,100%{width:0;opacity:0} 50%{width:48px;opacity:1} }
        @keyframes floatY      { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        @keyframes auroraPulse { 0%,100%{opacity:0.04} 50%{opacity:0.09} }
      `}</style>

      <div
        onClick={enter}
        style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          cursor: ready ? 'pointer' : 'default',
          overflow: 'hidden',
          background: cfg.bg
        }}
      >
        {/* Canvas */}
        <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0 }} />

        {/* Aurora layer */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: `radial-gradient(ellipse 60% 40% at 30% 50%, rgba(${cfg.glowRgb},0.06) 0%, transparent 70%),
                       radial-gradient(ellipse 40% 60% at 70% 50%, rgba(${cfg.glowRgb},0.04) 0%, transparent 70%)`,
          animation: 'auroraPulse 4s ease infinite'
        }} />

        {/* Center content */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 32
        }}>

          {/* Vortex rings */}
          <div style={{ position: 'relative', width: 280, height: 280, perspective: 800 }}>
            {[0,1,2,3].map(i => (
              <div key={i} style={{
                position: 'absolute', inset: 0,
                border: `${1.5 + i * 0.5}px solid ${cfg.primary}`,
                borderRadius: '50%',
                opacity: phase >= 1 ? (0.7 - i * 0.12) : 0,
                transform: `scale(${0.2 + i * 0.28}) rotateX(65deg)`,
                animation: phase >= 1 ? `${i % 2 === 0 ? 'portalSpin' : 'portalSpin2'} ${4 + i * 1.5}s linear infinite` : 'none',
                transition: 'opacity 0.8s ease',
                boxShadow: `0 0 ${15 + i * 8}px ${cfg.glow}, inset 0 0 ${10 + i * 5}px ${cfg.glow}`,
                transformOrigin: 'center center'
              }}/>
            ))}

            {/* Core orb */}
            <div style={{
              position: 'absolute',
              top: '50%', left: '50%',
              width: 72, height: 72,
              marginTop: -36, marginLeft: -36,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${cfg.accent} 0%, ${cfg.primary} 40%, transparent 70%)`,
              boxShadow: `0 0 40px ${cfg.glow}, 0 0 80px ${cfg.glow}, 0 0 120px rgba(${cfg.glowRgb},0.3)`,
              opacity: phase >= 1 ? 1 : 0,
              transition: 'opacity 0.8s ease',
              animation: phase >= 1 ? 'floatY 3s ease infinite' : 'none'
            }}>
              <div style={{
                position: 'absolute', inset: '20%',
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.9)',
                filter: 'blur(4px)'
              }}/>
            </div>
          </div>

          {/* Logo */}
          <div style={{
            textAlign: 'center',
            opacity: phase >= 2 ? 1 : 0,
            transform: phase >= 2 ? 'translateY(0) scale(1)' : 'translateY(24px) scale(0.85)',
            transition: 'all 0.9s cubic-bezier(0.34,1.56,0.64,1)'
          }}>
            <div style={{
              fontSize: 52, fontWeight: 900, letterSpacing: 10,
              background: `linear-gradient(135deg, white 0%, ${cfg.secondary} 50%, ${cfg.accent} 100%)`,
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              lineHeight: 1, marginBottom: 10,
              textShadow: 'none'
            }}>RESILIO</div>
            <div style={{
              fontSize: 11, letterSpacing: 8, color: cfg.secondary,
              opacity: 0.85, marginBottom: 6
            }}>LIFE  ECOSYSTEM</div>
            <div style={{
              display: 'inline-block', padding: '4px 16px',
              border: `1px solid rgba(${cfg.glowRgb},0.4)`,
              borderRadius: 20, fontSize: 10, letterSpacing: 4,
              color: cfg.accent, opacity: 0.8
            }}>{cfg.name.toUpperCase()}</div>
          </div>

          {/* CTA */}
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
            opacity: phase >= 3 ? 1 : 0,
            transform: phase >= 3 ? 'translateY(0)' : 'translateY(12px)',
            transition: 'all 0.7s ease'
          }}>
            <div style={{
              width: ready ? 48 : 0, height: 1,
              background: `linear-gradient(90deg, transparent, ${cfg.primary}, transparent)`,
              transition: 'width 0.8s ease',
              animation: ready ? 'portalPulse 1.8s ease infinite' : 'none'
            }}/>
            <div style={{
              fontSize: 12, letterSpacing: 4,
              color: ready ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.3)',
              textTransform: 'uppercase',
              transition: 'color 0.5s ease'
            }}>
              {ready ? 'Toca para ingresar' : '· · ·'}
            </div>
            <div style={{
              width: ready ? 48 : 0, height: 1,
              background: `linear-gradient(90deg, transparent, ${cfg.primary}, transparent)`,
              transition: 'width 0.8s ease 0.1s',
              animation: ready ? 'portalPulse 1.8s ease infinite 0.9s' : 'none'
            }}/>
          </div>
        </div>

        {/* Loading bar */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: 'rgba(255,255,255,0.05)' }}>
          <div style={{
            height: '100%',
            width: `${Math.min(100, phase * 33)}%`,
            background: `linear-gradient(90deg, ${cfg.primary}, ${cfg.accent})`,
            transition: 'width 1s ease',
            boxShadow: `0 0 8px ${cfg.glow}`
          }}/>
        </div>

        {/* Exit flash */}
        {phase === 4 && (
          <div style={{
            position: 'absolute', inset: 0,
            background: `radial-gradient(circle at center, white 0%, ${cfg.primary} 30%, transparent 70%)`,
            animation: 'portalOpen 0.9s ease forwards',
            pointerEvents: 'none'
          }}/>
        )}
      </div>
    </>
  )
}
