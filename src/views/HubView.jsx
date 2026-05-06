import React, { useState, useEffect } from 'react'

const NODES = [
  { id:'resilio',     label:'Resilio Life',    icon:'⚡', color:'#8B5CF6', desc:'Marcas, beneficios, códigos y membresías', route:'brands',        x:500, y:105 },
  { id:'creative',   label:'Ag. Creativa',    icon:'🎨', color:'#E879F9', desc:'Proyectos, clientes y equipo creativo',   route:'creative',       x:730, y:222 },
  { id:'influencers',label:'Ag. Influencers', icon:'⭐', color:'#FCD34D', desc:'Campañas, CRM y colaboraciones',          route:'inf_dashboard',  x:785, y:462 },
  { id:'productora', label:'Productora',       icon:'🎉', color:'#4ADE80', desc:'Eventos, tickets y relaciones públicas', route:'events',         x:620, y:660 },
  { id:'elevare',    label:'Elevare',          icon:'💎', color:'#F59E0B', desc:'Luxury network, bienes y leads premium', route:'elevare',        x:380, y:660 },
  { id:'gestion',    label:'Gestión',          icon:'🎯', color:'#60A5FA', desc:'Misiones, team y herramientas avanzadas',route:'team',           x:215, y:462 },
  { id:'captacion',  label:'Captación',        icon:'📞', color:'#F87171', desc:'Pipeline, speeches y expansión',         route:'cap_pipeline',   x:270, y:222 },
]

const CX = 500, CY = 390, VW = 1000, VH = 790

const STARS = Array.from({length:40},(_,i)=>({
  x: (i*137.5+13) % 100,
  y: (i*97.3+7)   % 100,
  r: 0.5 + (i%3)*0.4,
  o: 0.2 + (i%4)*0.15,
  d: 2 + (i%5)*0.8,
}))

export default function HubView({ onNavigate }) {
  const [hovered, setHovered] = useState(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setTick(p => p+1), 2000)
    return () => clearInterval(t)
  }, [])

  const hovNode = NODES.find(n => n.id === hovered)

  return (
    <div style={{ width:'100%', height:'calc(100vh - 64px)', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', background:'var(--bg-primary)', position:'relative' }}>

      {/* ── Desktop SVG Network ── */}
      <div className="hide-mobile" style={{ width:'100%', maxWidth:1000, aspectRatio:'1000/790', position:'relative', flex:'0 0 auto' }}>

        {/* Info panel */}
        <div style={{
          position:'absolute', left:CX/VW*100+'%', top:'calc('+CY/VH*100+'% + 90px)',
          transform:'translateX(-50%)', textAlign:'center', pointerEvents:'none',
          transition:'all 0.4s ease', opacity: hovNode ? 1 : 0,
          background: hovNode ? `${hovNode.color}18` : 'transparent',
          border: hovNode ? `1px solid ${hovNode.color}44` : '1px solid transparent',
          borderRadius:12, padding:'8px 18px', maxWidth:220, zIndex:5,
        }}>
          {hovNode && <>
            <div style={{ fontSize:13, fontWeight:700, color:hovNode.color }}>{hovNode.icon} {hovNode.label}</div>
            <div style={{ fontSize:11, color:'var(--text-secondary)', marginTop:4 }}>{hovNode.desc}</div>
          </>}
        </div>

        <svg viewBox={`0 0 ${VW} ${VH}`} style={{ width:'100%', height:'100%', position:'absolute', inset:0 }} xmlns="http://www.w3.org/2000/svg">
          {/* Stars */}
          {STARS.map((s,i) => (
            <circle key={i} cx={s.x*VW/100} cy={s.y*VH/100} r={s.r}
              fill="white" opacity={s.o}
              style={{ animation:`starTwinkle ${s.d}s ease-in-out infinite`, animationDelay:`${(i%5)*0.4}s` }}/>
          ))}

          {/* Orbit rings */}
          <circle cx={CX} cy={CY} r={290} fill="none" stroke="rgba(139,92,246,0.06)" strokeWidth={1}/>
          <circle cx={CX} cy={CY} r={200} fill="none" stroke="rgba(139,92,246,0.05)" strokeWidth={1} strokeDasharray="4 8"/>

          {/* Connection lines */}
          {NODES.map(n => (
            <line key={n.id}
              x1={CX} y1={CY} x2={n.x} y2={n.y}
              stroke={hovered===n.id ? n.color : 'rgba(139,92,246,0.18)'}
              strokeWidth={hovered===n.id ? 2 : 1}
              strokeDasharray={hovered===n.id ? 'none' : '5 8'}
              opacity={hovered && hovered!==n.id ? 0.4 : 1}
              style={{ transition:'all 0.35s ease' }}
            />
          ))}

          {/* Moving dots on lines */}
          {NODES.map((n,i) => {
            const t = ((tick + i*0.3) % 1)
            return (
              <circle key={n.id+'dot'}
                cx={CX + (n.x-CX)*t}
                cy={CY + (n.y-CY)*t}
                r={2.5} fill={n.color} opacity={0.7}
              />
            )
          })}

          {/* Center glow rings */}
          <circle cx={CX} cy={CY} r={75} fill="rgba(139,92,246,0.06)" stroke="rgba(139,92,246,0.2)" strokeWidth={1}/>
          <circle cx={CX} cy={CY} r={58} fill="rgba(139,92,246,0.12)" stroke="rgba(139,92,246,0.4)" strokeWidth={1.5}/>
          <circle cx={CX} cy={CY} r={44} fill="rgba(139,92,246,0.2)" stroke="rgba(139,92,246,0.6)" strokeWidth={2}
            style={{ filter:'drop-shadow(0 0 8px rgba(139,92,246,0.6))' }}/>
        </svg>

        {/* Center node */}
        <div style={{
          position:'absolute',
          left:CX/VW*100+'%', top:CY/VH*100+'%',
          transform:'translate(-50%,-50%)',
          width:88, height:88, borderRadius:'50%',
          background:'linear-gradient(135deg,rgba(139,92,246,0.4),rgba(232,121,249,0.3))',
          border:'2px solid rgba(139,92,246,0.8)',
          display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
          boxShadow:'0 0 30px rgba(139,92,246,0.5), 0 0 60px rgba(139,92,246,0.2)',
          animation:'pulse-glow 3s ease-in-out infinite',
          zIndex:10, cursor:'default',
        }}>
          <div style={{ fontSize:26, lineHeight:1 }}>⚡</div>
          <div style={{ fontSize:9, fontWeight:800, letterSpacing:2, color:'var(--primary-violet-light)', marginTop:2 }}>RESILIO</div>
        </div>

        {/* Ecosystem nodes */}
        {NODES.map(n => {
          const isHov = hovered === n.id
          return (
            <div key={n.id}
              style={{
                position:'absolute',
                left:n.x/VW*100+'%', top:n.y/VH*100+'%',
                transform:'translate(-50%,-50%)',
                zIndex:20, cursor:'pointer',
                transition:'transform 0.25s ease',
              }}
              onMouseEnter={() => setHovered(n.id)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => onNavigate(n.route)}
            >
              <div style={{
                width: isHov ? 78 : 68,
                height: isHov ? 78 : 68,
                borderRadius:'50%',
                background: isHov ? `${n.color}30` : 'rgba(18,10,40,0.85)',
                border:`2px solid ${isHov ? n.color : n.color+'66'}`,
                display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
                boxShadow: isHov ? `0 0 20px ${n.color}55, 0 0 40px ${n.color}22` : `0 0 8px ${n.color}22`,
                transition:'all 0.25s ease',
                backdropFilter:'blur(10px)',
              }}>
                <div style={{ fontSize: isHov ? 22 : 20, lineHeight:1, transition:'all 0.2s' }}>{n.icon}</div>
                <div style={{ fontSize:8.5, fontWeight:700, color:isHov?n.color:'var(--text-secondary)', marginTop:2, textAlign:'center', maxWidth:60, lineHeight:1.2, transition:'all 0.2s' }}>
                  {n.label}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Mobile grid ── */}
      <div className="show-mobile-only" style={{ width:'100%', padding:'24px 16px' }}>
        <div style={{ textAlign:'center', marginBottom:24 }}>
          <div style={{ fontSize:40, marginBottom:8 }}>⚡</div>
          <div style={{ fontSize:22, fontWeight:900, background:'linear-gradient(135deg,var(--primary-violet-light),var(--accent-magenta))', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>
            RESILIO
          </div>
          <div style={{ fontSize:12, color:'var(--text-secondary)', marginTop:4 }}>Ecosystem Hub</div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          {NODES.map(n => (
            <button key={n.id} onClick={() => onNavigate(n.route)} style={{
              padding:'16px 12px', borderRadius:14,
              background:`${n.color}14`,
              border:`1px solid ${n.color}44`,
              display:'flex', flexDirection:'column', alignItems:'center', gap:6,
              cursor:'pointer', transition:'all 0.2s',
            }}
              onMouseEnter={e=>{e.currentTarget.style.transform='scale(1.03)';e.currentTarget.style.boxShadow=`0 0 16px ${n.color}44`}}
              onMouseLeave={e=>{e.currentTarget.style.transform='none';e.currentTarget.style.boxShadow='none'}}
            >
              <div style={{ fontSize:28 }}>{n.icon}</div>
              <div style={{ fontSize:12, fontWeight:700, color:n.color, textAlign:'center', lineHeight:1.3 }}>{n.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Bottom hint */}
      <div style={{
        position:'absolute', bottom:20, left:'50%', transform:'translateX(-50%)',
        fontSize:11, color:'var(--text-secondary)', opacity:0.5, pointerEvents:'none',
        whiteSpace:'nowrap',
      }}>
        Click en un nodo para acceder · Usa la barra lateral para navegar
      </div>
    </div>
  )
}
