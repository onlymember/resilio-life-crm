import React, { useState } from 'react'
import { Users, Search, MapPin, TrendingUp, User } from 'lucide-react'

const fmtMoney = (n) => n>=1000000?`$${(n/1000000).toFixed(1)}M`:n>=1000?`$${(n/1000).toFixed(0)}K`:`$${n}`
const fmtDate  = (d) => { if(!d) return '—'; const parts=d.split('-'); return `${parts[2]}/${parts[1]}/${parts[0].slice(2)}` }

export default function UsersView({ users, influencers, memberships }) {
  const [search,  setSearch]  = useState('')
  const [fCity,   setFCity]   = useState('all')
  const [fGender, setFGender] = useState('all')

  const cities = [...new Set(users.map(u=>u.city))].sort()

  const filtered = users.filter(u => {
    const q  = search.toLowerCase()
    const ms = u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.city.toLowerCase().includes(q)
    return ms && (fCity==='all'||u.city===fCity) && (fGender==='all'||u.gender===fGender)
  })

  const totalSpent = users.reduce((s,u)=>s+u.totalSpent,0)
  const avgAge     = Math.round(users.reduce((s,u)=>s+u.age,0)/users.length)
  const femaleCount= users.filter(u=>u.gender==='F').length

  // City distribution
  const cityMap = {}
  users.forEach(u=>{ cityMap[u.city]=(cityMap[u.city]||0)+1 })
  const topCities = Object.entries(cityMap).sort(([,a],[,b])=>b-a).slice(0,6)
  const maxCity   = Math.max(...Object.values(cityMap),1)

  return (
    <div style={{ padding:24,animation:'fadeIn 0.3s ease' }}>
      <div style={{ marginBottom:20 }}>
        <h2 style={{ fontSize:20,fontWeight:700 }}>Usuarios</h2>
        <p style={{ fontSize:12,color:'var(--text-secondary)' }}>{users.length} usuarios registrados</p>
      </div>

      {/* Stats */}
      <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:14,marginBottom:20 }}>
        {[
          { label:'Total Usuarios',  value:users.length,             color:'var(--primary-violet)' },
          { label:'Gasto Total',     value:fmtMoney(totalSpent),     color:'#4ADE80'               },
          { label:'Edad Promedio',   value:`${avgAge} años`,         color:'#E879F9'               },
          { label:'% Femenino',      value:`${Math.round(femaleCount/users.length*100)}%`, color:'#F472B6' },
          { label:'Con Membresía',   value:memberships.filter(m=>m.status==='active').length, color:'#FCD34D' },
        ].map(s=>(
          <div key={s.label} style={{ padding:'14px 16px',background:'var(--glass-bg)',border:'1px solid var(--border-violet)',borderRadius:12,transition:'all 0.2s' }} onMouseEnter={e=>e.currentTarget.style.borderColor='var(--primary-violet)'} onMouseLeave={e=>e.currentTarget.style.borderColor='var(--border-violet)'}>
            <div style={{ fontSize:18,fontWeight:800,color:s.color }}>{s.value}</div>
            <div style={{ fontSize:10,color:'var(--text-secondary)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* City distribution */}
      <div style={{ marginBottom:20,padding:'16px 20px',background:'var(--glass-bg)',border:'1px solid var(--border-violet)',borderRadius:14 }}>
        <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:14 }}>
          <MapPin size={14} color="var(--primary-violet-light)"/>
          <span style={{ fontSize:13,fontWeight:600 }}>Distribución Geográfica</span>
        </div>
        <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:12 }}>
          {topCities.map(([city,count])=>(
            <div key={city}>
              <div style={{ display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:5 }}>
                <span style={{ fontWeight:500 }}>{city}</span>
                <span style={{ color:'var(--primary-violet-light)',fontWeight:700 }}>{count} ({Math.round(count/users.length*100)}%)</span>
              </div>
              <div style={{ height:5,borderRadius:3,background:'rgba(139,92,246,0.15)' }}>
                <div style={{ height:'100%',width:`${Math.round(count/maxCity*100)}%`,borderRadius:3,background:'linear-gradient(90deg,var(--primary-violet),var(--accent-magenta))' }}/>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div style={{ display:'flex',gap:10,marginBottom:20,flexWrap:'wrap' }}>
        <div style={{ position:'relative',flex:1,minWidth:200 }}>
          <Search size={13} style={{ position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'var(--text-secondary)' }}/>
          <input className="input-field" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar por nombre, email o ciudad..." style={{ paddingLeft:34 }}/>
        </div>
        <select className="select-field" style={{ width:'auto',minWidth:140 }} value={fCity} onChange={e=>setFCity(e.target.value)}>
          <option value="all">Todas las ciudades</option>
          {cities.map(c=><option key={c} value={c}>{c}</option>)}
        </select>
        <select className="select-field" style={{ width:'auto',minWidth:110 }} value={fGender} onChange={e=>setFGender(e.target.value)}>
          <option value="all">Todos</option>
          <option value="F">Femenino</option>
          <option value="M">Masculino</option>
        </select>
      </div>

      {/* List */}
      <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
        {filtered.length===0 ? (
          <div style={{ display:'flex',flexDirection:'column',alignItems:'center',gap:16,padding:'64px 32px',textAlign:'center' }}>
            <div style={{ width:64,height:64,borderRadius:20,background:'rgba(139,92,246,0.1)',display:'flex',alignItems:'center',justifyContent:'center' }}><Users size={28} color="var(--primary-violet)"/></div>
            <h3 style={{ fontSize:16,fontWeight:600 }}>Sin resultados</h3>
          </div>
        ) : filtered.map(u=>{
          const refInf   = influencers.find(i=>i.id===u.referredBy)
          const hasMem   = memberships.some(m=>m.userId===u.id&&m.status==='active')

          return (
            <div key={u.id} style={{
              display:'flex',alignItems:'center',gap:12,padding:'12px 16px',
              background:'var(--glass-bg)',border:'1px solid var(--border-violet)',borderRadius:12,
              transition:'all 0.2s',flexWrap:'wrap'
            }}
              onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--primary-violet)'}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--border-violet)'}}
            >
              {/* Avatar */}
              <div style={{ width:38,height:38,borderRadius:'50%',background:'linear-gradient(135deg,var(--bg-tertiary),var(--primary-violet-dark))',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,color:'var(--primary-violet-light)',fontSize:14,flexShrink:0,border:'1px solid var(--border-violet)' }}>
                {u.name.charAt(0)}
              </div>

              {/* Info */}
              <div style={{ flex:1,minWidth:150 }}>
                <div style={{ fontSize:13,fontWeight:600 }}>{u.name}</div>
                <div style={{ fontSize:11,color:'var(--text-secondary)' }}>{u.email}</div>
              </div>

              {/* Location + age */}
              <div style={{ minWidth:110,fontSize:11,color:'var(--text-secondary)' }}>
                <div style={{ display:'flex',alignItems:'center',gap:4 }}><MapPin size={10}/>{u.city}</div>
                <div>{u.gender==='F'?'♀️':'♂️'} {u.age} años</div>
              </div>

              {/* Membership */}
              <span style={{ fontSize:10,fontWeight:600,padding:'2px 8px',borderRadius:8,background:hasMem?'rgba(74,222,128,0.12)':'rgba(156,163,175,0.1)',border:`1px solid ${hasMem?'rgba(74,222,128,0.3)':'rgba(156,163,175,0.2)'}`,color:hasMem?'#4ADE80':'#9CA3AF' }}>
                {hasMem?'✓ Miembro':'Sin membresía'}
              </span>

              {/* Since */}
              <div style={{ fontSize:11,color:'var(--text-secondary)',minWidth:90 }}>
                Desde {fmtDate(u.memberSince)}
              </div>

              {/* Stats */}
              <div style={{ textAlign:'right',minWidth:100 }}>
                <div style={{ fontSize:13,fontWeight:700,color:'#4ADE80' }}>{fmtMoney(u.totalSpent)}</div>
                <div style={{ fontSize:10,color:'var(--text-secondary)' }}>{u.totalPurchases} compras</div>
              </div>

              {/* Referral */}
              {refInf&&(
                <div style={{ fontSize:10,color:'#E879F9' }}>via {refInf.username}</div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
