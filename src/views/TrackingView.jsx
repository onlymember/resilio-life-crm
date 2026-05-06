import React, { useState } from 'react'
import { Activity, Search, DollarSign, QrCode, TrendingUp, MapPin, Users } from 'lucide-react'

const fmtMoney = (n) => n>=1000000?`$${(n/1000000).toFixed(1)}M`:n>=1000?`$${(n/1000).toFixed(0)}K`:`$${n}`
const fmtDate  = (ts) => {
  if (!ts) return '-'
  const d = new Date(ts)
  return `${d.getDate()}/${d.getMonth()+1} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}

export default function TrackingView({ codeUsages, codes, brands, locations, influencers, users }) {
  const [search,   setSearch]   = useState('')
  const [fBrand,   setFBrand]   = useState('all')
  const [fLoc,     setFLoc]     = useState('all')
  const [fMonth,   setFMonth]   = useState('all')
  const [fGender,  setFGender]  = useState('all')

  const months = [...new Set(codeUsages.map(u=>u.timestamp.slice(0,7)))].sort().reverse()

  const filtered = [...codeUsages]
    .sort((a,b)=>b.timestamp.localeCompare(a.timestamp))
    .filter(u => {
      const c    = codes.find(cd=>cd.id===u.codeId)
      const cStr = (c?.code||'').toLowerCase()
      const ms   = cStr.includes(search.toLowerCase()) ||
        (brands.find(b=>b.id===u.brandId)?.name||'').toLowerCase().includes(search.toLowerCase())
      return ms &&
        (fBrand==='all'||u.brandId===fBrand) &&
        (fLoc==='all'||u.locationId===fLoc) &&
        (fMonth==='all'||u.timestamp.startsWith(fMonth)) &&
        (fGender==='all'||u.userDemographics?.gender===fGender)
    })

  const totalRev  = filtered.reduce((s,u)=>s+u.purchaseAmount,0)
  const totalDisc = filtered.reduce((s,u)=>s+u.discountAmount,0)
  const avgTicket = filtered.length>0 ? Math.round(totalRev/filtered.length) : 0

  // Top location
  const locMap = {}
  filtered.forEach(u=>{ if(u.locationId) locMap[u.locationId]=(locMap[u.locationId]||0)+1 })
  const topLocId = Object.entries(locMap).sort(([,a],[,b])=>b-a)[0]?.[0]
  const topLoc   = locations.find(l=>l.id===topLocId)

  // City distribution
  const cityMap = {}
  filtered.forEach(u=>{ const city=u.userDemographics?.city; if(city) cityMap[city]=(cityMap[city]||0)+1 })
  const topCities = Object.entries(cityMap).sort(([,a],[,b])=>b-a).slice(0,4)

  return (
    <div style={{ padding:24,animation:'fadeIn 0.3s ease' }}>
      <div style={{ marginBottom:20 }}>
        <h2 style={{ fontSize:20,fontWeight:700 }}>Tracking de Uso</h2>
        <p style={{ fontSize:12,color:'var(--text-secondary)' }}>{codeUsages.length} usos registrados en total</p>
      </div>

      {/* Summary stats */}
      <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))',gap:12,marginBottom:20 }}>
        {[
          { label:'Revenue Total', value:fmtMoney(totalRev), icon:DollarSign, color:'#4ADE80' },
          { label:'Total Descuentos', value:fmtMoney(totalDisc), icon:TrendingUp, color:'#F87171' },
          { label:'Ticket Promedio', value:fmtMoney(avgTicket), icon:QrCode, color:'#E879F9' },
          { label:'Usos (filtrados)', value:filtered.length, icon:Activity, color:'var(--primary-violet)' },
          { label:'Top Local', value:topLoc?.name||'—', icon:MapPin, color:'#FCD34D' },
        ].map(s=>(
          <div key={s.label} style={{ padding:'14px 16px',background:'var(--glass-bg)',border:'1px solid var(--border-violet)',borderRadius:12,display:'flex',alignItems:'center',gap:10,transition:'all 0.2s' }} onMouseEnter={e=>e.currentTarget.style.borderColor='var(--primary-violet)'} onMouseLeave={e=>e.currentTarget.style.borderColor='var(--border-violet)'}>
            <s.icon size={18} color={s.color}/>
            <div style={{ minWidth:0 }}>
              <div style={{ fontSize:14,fontWeight:700,color:s.color,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{s.value}</div>
              <div style={{ fontSize:10,color:'var(--text-secondary)' }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* City breakdown */}
      {topCities.length>0&&(
        <div style={{ marginBottom:20,padding:'16px 20px',background:'var(--glass-bg)',border:'1px solid var(--border-violet)',borderRadius:14 }}>
          <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:14 }}>
            <Users size={14} color="var(--primary-violet-light)"/>
            <span style={{ fontSize:13,fontWeight:600 }}>Distribución por Ciudad</span>
          </div>
          <div style={{ display:'flex',gap:10,flexWrap:'wrap' }}>
            {topCities.map(([city,count])=>(
              <div key={city} style={{ display:'flex',alignItems:'center',gap:8,flex:1,minWidth:120 }}>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:4 }}><span>{city}</span><span style={{ color:'var(--primary-violet-light)',fontWeight:600 }}>{count}</span></div>
                  <div style={{ height:4,borderRadius:2,background:'rgba(139,92,246,0.15)' }}>
                    <div style={{ height:'100%',width:`${Math.round(count/filtered.length*100)}%`,borderRadius:2,background:'linear-gradient(90deg,var(--primary-violet),var(--accent-magenta))' }}/>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display:'flex',gap:10,marginBottom:20,flexWrap:'wrap' }}>
        <div style={{ position:'relative',flex:1,minWidth:180 }}>
          <Search size={13} style={{ position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'var(--text-secondary)' }}/>
          <input className="input-field" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar por código o marca..." style={{ paddingLeft:34 }}/>
        </div>
        <select className="select-field" style={{ width:'auto',minWidth:130 }} value={fBrand} onChange={e=>setFBrand(e.target.value)}>
          <option value="all">Todas las marcas</option>
          {brands.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <select className="select-field" style={{ width:'auto',minWidth:120 }} value={fLoc} onChange={e=>setFLoc(e.target.value)}>
          <option value="all">Todos los locales</option>
          {locations.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
        <select className="select-field" style={{ width:'auto',minWidth:110 }} value={fMonth} onChange={e=>setFMonth(e.target.value)}>
          <option value="all">Todos los meses</option>
          {months.map(m=><option key={m} value={m}>{m}</option>)}
        </select>
        <select className="select-field" style={{ width:'auto',minWidth:100 }} value={fGender} onChange={e=>setFGender(e.target.value)}>
          <option value="all">Todos</option>
          <option value="F">Femenino</option>
          <option value="M">Masculino</option>
        </select>
      </div>

      {/* Timeline */}
      <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
        {filtered.length===0 ? (
          <div style={{ display:'flex',flexDirection:'column',alignItems:'center',gap:16,padding:'64px 32px',textAlign:'center' }}>
            <div style={{ width:64,height:64,borderRadius:20,background:'rgba(139,92,246,0.1)',display:'flex',alignItems:'center',justifyContent:'center' }}><Activity size={28} color="var(--primary-violet)"/></div>
            <h3 style={{ fontSize:16,fontWeight:600 }}>Sin resultados</h3>
            <p style={{ color:'var(--text-secondary)',fontSize:14 }}>Ajusta los filtros para ver más datos.</p>
          </div>
        ) : filtered.map(u=>{
          const code = codes.find(c=>c.id===u.codeId)
          const brand= brands.find(b=>b.id===u.brandId)
          const loc  = locations.find(l=>l.id===u.locationId)
          const inf  = influencers.find(i=>i.id===u.influencerId)
          const dem  = u.userDemographics || {}

          return (
            <div key={u.id} style={{
              display:'flex',alignItems:'center',gap:12,padding:'12px 16px',
              background:'var(--glass-bg)',border:'1px solid var(--border-violet)',borderRadius:12,
              transition:'all 0.2s',flexWrap:'wrap'
            }}
              onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--primary-violet)';e.currentTarget.style.boxShadow='var(--glow-violet-sm)'}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--border-violet)';e.currentTarget.style.boxShadow='none'}}
            >
              {/* Brand */}
              <div style={{ display:'flex',alignItems:'center',gap:8,minWidth:120 }}>
                <span style={{ fontSize:20,flexShrink:0 }}>{brand?.logo||'🏢'}</span>
                <div>
                  <div style={{ fontSize:12,fontWeight:600 }}>{brand?.name}</div>
                  {loc&&<div style={{ fontSize:10,color:'var(--text-secondary)' }}>{loc.name}</div>}
                </div>
              </div>

              {/* Code */}
              <div style={{ flex:1,minWidth:110 }}>
                <code style={{ fontSize:11,fontWeight:700,color:'var(--primary-violet-light)',letterSpacing:1,fontFamily:'JetBrains Mono,monospace' }}>{code?.code||u.codeId}</code>
                {inf&&<div style={{ fontSize:10,color:'#E879F9' }}>{inf.username}</div>}
              </div>

              {/* Demographics */}
              <div style={{ minWidth:110,fontSize:11,color:'var(--text-secondary)' }}>
                <div>{dem.city||'—'}</div>
                <div>{dem.gender==='F'?'♀️ Mujer':dem.gender==='M'?'♂️ Hombre':'—'} · {dem.age||'—'} años</div>
              </div>

              {/* Amounts */}
              <div style={{ textAlign:'right',minWidth:110 }}>
                <div style={{ fontSize:13,fontWeight:700,color:'#4ADE80' }}>{fmtMoney(u.purchaseAmount)}</div>
                {u.discountAmount>0&&<div style={{ fontSize:10,color:'#F87171' }}>−{fmtMoney(u.discountAmount)} dto.</div>}
                {u.discountAmount>0&&<div style={{ fontSize:10,color:'var(--text-secondary)' }}>Final: {fmtMoney(u.finalAmount)}</div>}
              </div>

              {/* Timestamp */}
              <div style={{ fontSize:11,color:'var(--text-secondary)',whiteSpace:'nowrap',minWidth:70,textAlign:'right' }}>
                {fmtDate(u.timestamp)}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
