import React, { useState } from 'react'
import { Star, Users, Calendar, MapPin, TrendingUp, Filter, BarChart3 } from 'lucide-react'

const fmtMoney = (n) => n >= 1000000 ? `$${(n/1000000).toFixed(1)}M` : n >= 1000 ? `$${(n/1000).toFixed(0)}K` : `$${n}`

const DEMO_VIP_EVENTS = [
  { id:'vip1', name:'Resilio Members Night', city:'Buenos Aires', country:'Argentina', venue:'Club Niceto', date:'2026-05-25', capacity:120, attended:98, revenue:480000, status:'upcoming', exclusive:true },
  { id:'vip2', name:'Elite Pool Party', city:'Montevideo', country:'Uruguay', venue:'Hotel Sofitel', date:'2026-04-12', capacity:80, attended:74, revenue:320000, status:'completed', exclusive:true },
  { id:'vip3', name:'VIP Night Rosario', city:'Rosario', country:'Argentina', venue:'Puerto Norte', date:'2026-03-08', capacity:100, attended:88, revenue:290000, status:'completed', exclusive:true },
  { id:'vip4', name:'Sunset Members', city:'Buenos Aires', country:'Argentina', venue:'Terrazas del Puerto', date:'2026-06-15', capacity:60, attended:0, revenue:0, status:'planning', exclusive:true },
]

const DEMO_VIP_MEMBERS = [
  { id:'m1', name:'Florencia Torres', email:'flor@email.com', city:'Buenos Aires', eventsAttended:8, tier:'platinum', status:'active', memberSince:'2024-01-15' },
  { id:'m2', name:'Diego Alvarado', email:'diego@email.com', city:'Rosario', eventsAttended:5, tier:'gold', status:'active', memberSince:'2024-03-20' },
  { id:'m3', name:'Valentina Cruz', email:'vale@email.com', city:'Buenos Aires', eventsAttended:11, tier:'platinum', status:'active', memberSince:'2023-11-10' },
  { id:'m4', name:'Mateo Reyes', email:'mateo@email.com', city:'Córdoba', eventsAttended:3, tier:'silver', status:'active', memberSince:'2024-06-05' },
  { id:'m5', name:'Sofía Medina', email:'sofia@email.com', city:'Buenos Aires', eventsAttended:7, tier:'gold', status:'active', memberSince:'2024-02-14' },
]

const TIER_CFG = {
  platinum: { label:'Platinum', color:'#E2E8F0', bg:'rgba(226,232,240,0.15)', icon:'💎' },
  gold:     { label:'Gold',     color:'#FCD34D', bg:'rgba(252,211,77,0.15)',  icon:'🥇' },
  silver:   { label:'Silver',   color:'#9CA3AF', bg:'rgba(156,163,175,0.15)',icon:'🥈' },
}

export default function OnlyMembersView({ events }) {
  const [fCity, setFCity] = useState('all')
  const [fCountry, setFCountry] = useState('all')
  const [tab, setTab] = useState('dashboard')

  const vipEvents = events?.filter(e => e.isVip || e.type === 'vip') || DEMO_VIP_EVENTS
  const allEvents = [...vipEvents, ...DEMO_VIP_EVENTS.filter(d => !vipEvents.find(e => e.id === d.id))]

  const cities = [...new Set(allEvents.map(e => e.city).filter(Boolean))]
  const countries = [...new Set(allEvents.map(e => e.country).filter(Boolean))]

  const filtered = allEvents.filter(e =>
    (fCity === 'all' || e.city === fCity) && (fCountry === 'all' || e.country === fCountry)
  )

  const totalRev = allEvents.reduce((a, e) => a + (e.revenue || 0), 0)
  const totalAttended = allEvents.reduce((a, e) => a + (e.attended || 0), 0)
  const avgOcc = allEvents.length > 0 ? Math.round(allEvents.reduce((a, e) => a + (e.capacity > 0 ? (e.attended || 0) / e.capacity : 0), 0) / allEvents.length * 100) : 0

  const TABS = ['dashboard', 'eventos', 'miembros']

  return (
    <div style={{ padding:24, animation:'fadeIn 0.3s ease' }}>
      <div style={{ display:'flex',alignItems:'center',gap:12,marginBottom:20,flexWrap:'wrap' }}>
        <div>
          <h2 style={{ fontSize:20,fontWeight:700,display:'flex',alignItems:'center',gap:8 }}>
            <span style={{ fontSize:22 }}>⭐</span>Only Members
          </h2>
          <p style={{ fontSize:12,color:'var(--text-secondary)' }}>Eventos exclusivos · {allEvents.length} eventos VIP</p>
        </div>
        <div style={{ flex:1 }}/>
        <div style={{ display:'flex',gap:8 }}>
          <select className="select-field" style={{ width:'auto' }} value={fCountry} onChange={e=>setFCountry(e.target.value)}>
            <option value="all">Todos los países</option>
            {countries.map(c=><option key={c}>{c}</option>)}
          </select>
          <select className="select-field" style={{ width:'auto' }} value={fCity} onChange={e=>setFCity(e.target.value)}>
            <option value="all">Todas las ciudades</option>
            {cities.map(c=><option key={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex',gap:2,marginBottom:24,background:'rgba(139,92,246,0.06)',border:'1px solid var(--border-violet)',borderRadius:12,padding:4,width:'fit-content' }}>
        {TABS.map(t=>(
          <button key={t} onClick={()=>setTab(t)} style={{ padding:'9px 20px',borderRadius:9,fontSize:13,fontWeight:tab===t?700:400,background:tab===t?'rgba(139,92,246,0.2)':'transparent',color:tab===t?'var(--primary-violet-light)':'var(--text-secondary)',border:tab===t?'1px solid rgba(139,92,246,0.4)':'1px solid transparent',transition:'all 0.2s',cursor:'pointer',textTransform:'capitalize' }}>{t}</button>
        ))}
      </div>

      {tab === 'dashboard' && (
        <div>
          <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:12,marginBottom:24 }}>
            {[
              { l:'Revenue Total', v:fmtMoney(totalRev), c:'#4ADE80', icon:'💰' },
              { l:'Total Asistentes', v:totalAttended, c:'#8B5CF6', icon:'👥' },
              { l:'Eventos VIP', v:allEvents.length, c:'#FCD34D', icon:'⭐' },
              { l:'Ocupación Media', v:`${avgOcc}%`, c:'#E879F9', icon:'🎫' },
              { l:'Miembros Activos', v:DEMO_VIP_MEMBERS.length, c:'#22D3EE', icon:'💎' },
            ].map(s=>(
              <div key={s.l} className="card" style={{ padding:16 }}>
                <div style={{ fontSize:22,marginBottom:6 }}>{s.icon}</div>
                <div style={{ fontSize:22,fontWeight:800,color:s.c }}>{s.v}</div>
                <div style={{ fontSize:11,color:'var(--text-secondary)' }}>{s.l}</div>
              </div>
            ))}
          </div>

          {/* Revenue by city */}
          <div className="card" style={{ padding:20,marginBottom:16 }}>
            <div style={{ fontSize:13,fontWeight:700,marginBottom:14 }}>Revenue por ciudad</div>
            <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
              {cities.map(city=>{
                const cityEvents = allEvents.filter(e=>e.city===city)
                const cityRev = cityEvents.reduce((a,e)=>a+(e.revenue||0),0)
                const pct = totalRev > 0 ? Math.round(cityRev/totalRev*100) : 0
                return (
                  <div key={city}>
                    <div style={{ display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:3 }}>
                      <span>{city}</span>
                      <span style={{ color:'#4ADE80',fontWeight:600 }}>{fmtMoney(cityRev)}</span>
                    </div>
                    <div style={{ height:6,borderRadius:3,background:'rgba(139,92,246,0.1)' }}>
                      <div style={{ height:'100%',width:`${pct}%`,background:'linear-gradient(90deg,#8B5CF6,#E879F9)',borderRadius:3 }}/>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {tab === 'eventos' && (
        <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:14 }}>
          {filtered.map(ev=>{
            const occPct = ev.capacity > 0 ? Math.round((ev.attended||0)/ev.capacity*100) : 0
            const isFuture = ev.status === 'upcoming' || ev.status === 'planning'
            return (
              <div key={ev.id} className="card" style={{ padding:20 }}>
                <div style={{ display:'flex',alignItems:'flex-start',gap:12,marginBottom:12 }}>
                  <div style={{ width:48,height:48,borderRadius:14,background:'linear-gradient(135deg,rgba(252,211,77,0.2),rgba(139,92,246,0.2))',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0 }}>⭐</div>
                  <div style={{ flex:1,minWidth:0 }}>
                    <h3 style={{ fontSize:14,fontWeight:700,marginBottom:3 }}>{ev.name}</h3>
                    <div style={{ fontSize:11,color:'var(--text-secondary)',display:'flex',gap:8 }}>
                      <span><MapPin size={10} style={{ display:'inline',verticalAlign:'middle' }}/> {ev.city}</span>
                      <span><Calendar size={10} style={{ display:'inline',verticalAlign:'middle' }}/> {ev.date?new Date(ev.date).toLocaleDateString('es-AR',{day:'2-digit',month:'short'}):'—'}</span>
                    </div>
                  </div>
                  <span style={{ fontSize:10,padding:'2px 8px',borderRadius:10,background:isFuture?'rgba(252,211,77,0.15)':'rgba(74,222,128,0.15)',color:isFuture?'#FCD34D':'#4ADE80',fontWeight:600 }}>{isFuture?'Próximo':'Completado'}</span>
                </div>
                <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:10 }}>
                  {[
                    { l:'Asistentes', v:ev.attended||0 },
                    { l:'Capacidad', v:ev.capacity },
                    { l:'Revenue', v:fmtMoney(ev.revenue||0) },
                  ].map(s=>(
                    <div key={s.l} style={{ textAlign:'center',padding:'8px 4px',borderRadius:8,background:'rgba(139,92,246,0.07)',border:'1px solid rgba(139,92,246,0.1)' }}>
                      <div style={{ fontSize:14,fontWeight:700,color:'var(--primary-violet-light)' }}>{s.v}</div>
                      <div style={{ fontSize:10,color:'var(--text-secondary)' }}>{s.l}</div>
                    </div>
                  ))}
                </div>
                {!isFuture && (
                  <div>
                    <div style={{ display:'flex',justifyContent:'space-between',fontSize:11,color:'var(--text-secondary)',marginBottom:3 }}>
                      <span>Ocupación</span><span style={{ color:'var(--primary-violet-light)',fontWeight:600 }}>{occPct}%</span>
                    </div>
                    <div style={{ height:5,borderRadius:3,background:'rgba(139,92,246,0.1)' }}>
                      <div style={{ height:'100%',width:`${occPct}%`,background:'linear-gradient(90deg,#FCD34D,#E879F9)',borderRadius:3 }}/>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {tab === 'miembros' && (
        <div>
          <div style={{ display:'flex',gap:12,marginBottom:16,flexWrap:'wrap' }}>
            {Object.entries(TIER_CFG).map(([k,v])=>{
              const count = DEMO_VIP_MEMBERS.filter(m=>m.tier===k).length
              return (
                <div key={k} className="card" style={{ padding:'12px 20px',border:`1px solid ${v.color}33` }}>
                  <div style={{ fontSize:20 }}>{v.icon}</div>
                  <div style={{ fontSize:20,fontWeight:800,color:v.color }}>{count}</div>
                  <div style={{ fontSize:11,color:'var(--text-secondary)' }}>{v.label}</div>
                </div>
              )
            })}
          </div>

          <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
            {DEMO_VIP_MEMBERS.map(m=>{
              const tc = TIER_CFG[m.tier]
              return (
                <div key={m.id} className="card" style={{ padding:'14px 18px',display:'flex',alignItems:'center',gap:14 }}>
                  <div style={{ width:42,height:42,borderRadius:12,background:`${tc.color}22`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0 }}>{tc.icon}</div>
                  <div style={{ flex:1,minWidth:0 }}>
                    <div style={{ fontSize:13,fontWeight:700 }}>{m.name}</div>
                    <div style={{ fontSize:11,color:'var(--text-secondary)' }}>{m.email} · {m.city}</div>
                  </div>
                  <div style={{ textAlign:'center',padding:'6px 12px',borderRadius:8,background:'rgba(139,92,246,0.07)' }}>
                    <div style={{ fontSize:16,fontWeight:700,color:'var(--primary-violet-light)' }}>{m.eventsAttended}</div>
                    <div style={{ fontSize:9,color:'var(--text-secondary)' }}>eventos</div>
                  </div>
                  <span style={{ fontSize:10,padding:'3px 10px',borderRadius:12,background:tc.bg,color:tc.color,border:`1px solid ${tc.color}44`,fontWeight:600 }}>{tc.label}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
