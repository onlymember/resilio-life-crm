import React, { useState, useMemo } from 'react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, PieChart, Pie, Cell, LineChart, Line
} from 'recharts'
import { FileText, Download, BarChart3, MapPin, Users, Activity, Search, Filter } from 'lucide-react'

const fmtMoney = (n) => n >= 1000000 ? `$${(n/1000000).toFixed(1)}M` : n >= 1000 ? `$${(n/1000).toFixed(0)}K` : `$${n}`
const fmtDate  = (d) => { if (!d) return '—'; const p = d.split('-'); return `${p[2]}/${p[1]}/${p[0].slice(2)}` }

const TOOLTIP_STYLE = {
  contentStyle: {
    background: 'rgba(29,16,61,0.95)', border: '1px solid rgba(139,92,246,0.4)',
    borderRadius: 12, color: '#F9FAFB', fontSize: 12,
  },
  labelStyle: { color: '#A78BFA', fontWeight: 600 },
}
const COLORS = ['#8B5CF6','#E879F9','#F472B6','#FCD34D','#4ADE80','#60A5FA','#FB923C']

const REPORT_TYPES = [
  { id: 'location',   label: 'Por Local',        icon: MapPin,    color: '#8B5CF6' },
  { id: 'brand',      label: 'Por Marca',         icon: BarChart3, color: '#E879F9' },
  { id: 'influencer', label: 'Por Influencer',    icon: Users,     color: '#FCD34D' },
  { id: 'general',    label: 'Consumo General',   icon: Activity,  color: '#4ADE80' },
]

const StatBox = ({ label, value, color = 'var(--primary-violet-light)' }) => (
  <div style={{ padding: '14px 16px', background: 'rgba(139,92,246,0.08)', border: '1px solid var(--border-violet)', borderRadius: 12, textAlign: 'center' }}>
    <div style={{ fontSize: 20, fontWeight: 800, color }}>{value}</div>
    <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 2 }}>{label}</div>
  </div>
)

const SectionTitle = ({ children }) => (
  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, marginTop: 20 }}>{children}</div>
)

// ── REPORT: POR LOCAL ────────────────────────
function LocationReport({ locations, brands, codeUsages, codes, benefits }) {
  const [locId, setLocId] = useState(locations[0]?.id || '')
  const [dateFrom, setDateFrom] = useState('2026-01-01')
  const [dateTo, setDateTo] = useState('2026-04-30')
  const [generated, setGenerated] = useState(false)

  const loc   = locations.find(l => l.id === locId)
  const brand = brands.find(b => b.id === loc?.brandId)

  const usages = useMemo(() => {
    if (!generated) return []
    return codeUsages.filter(u =>
      u.locationId === locId &&
      u.timestamp.slice(0,10) >= dateFrom &&
      u.timestamp.slice(0,10) <= dateTo
    )
  }, [generated, locId, dateFrom, dateTo, codeUsages])

  const totalRev  = usages.reduce((s,u) => s + u.purchaseAmount, 0)
  const totalDisc = usages.reduce((s,u) => s + u.discountAmount, 0)
  const avgTicket = usages.length > 0 ? Math.round(totalRev / usages.length) : 0

  // Hour distribution
  const hourMap = {}
  usages.forEach(u => {
    const h = new Date(u.timestamp).getHours()
    hourMap[h] = (hourMap[h] || 0) + 1
  })
  const hourData = Array.from({length:14},(_,i)=>i+8).map(h => ({ hora: `${h}h`, usos: hourMap[h]||0 }))

  // Compare vs other locations of same brand
  const otherLocs = locations.filter(l => l.brandId === loc?.brandId && l.id !== locId)
  const compData = [loc, ...otherLocs].filter(Boolean).map(l => {
    const rev = codeUsages.filter(u => u.locationId===l.id && u.timestamp.slice(0,10)>=dateFrom && u.timestamp.slice(0,10)<=dateTo).reduce((s,u)=>s+u.purchaseAmount,0)
    return { name: l.name.split(' ').slice(-1)[0], revenue: rev }
  })

  return (
    <div>
      {/* Filters */}
      <div style={{ display:'flex',gap:12,flexWrap:'wrap',marginBottom:16 }}>
        <select className="select-field" style={{flex:2,minWidth:180}} value={locId} onChange={e=>{ setLocId(e.target.value); setGenerated(false) }}>
          {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
        <input className="input-field" type="date" style={{flex:1,minWidth:130}} value={dateFrom} onChange={e=>{setDateFrom(e.target.value);setGenerated(false)}}/>
        <input className="input-field" type="date" style={{flex:1,minWidth:130}} value={dateTo} onChange={e=>{setDateTo(e.target.value);setGenerated(false)}}/>
        <button className="btn btn-primary" onClick={()=>setGenerated(true)} style={{flexShrink:0}}>
          <Filter size={14}/>Generar
        </button>
      </div>

      {!generated ? (
        <div style={{textAlign:'center',padding:'48px 0',color:'var(--text-secondary)',fontSize:14}}>
          Selecciona un local y período, luego presiona Generar
        </div>
      ) : (
        <>
          <div style={{padding:'14px 18px',background:'rgba(139,92,246,0.1)',border:'1px solid var(--border-violet)',borderRadius:12,marginBottom:16,display:'flex',gap:10,alignItems:'center'}}>
            <span style={{fontSize:22}}>{brand?.logo||'🏢'}</span>
            <div>
              <div style={{fontWeight:700,fontSize:15}}>{loc?.name}</div>
              <div style={{fontSize:11,color:'var(--text-secondary)'}}>{loc?.address} · {fmtDate(dateFrom)} – {fmtDate(dateTo)}</div>
            </div>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))',gap:10,marginBottom:16}}>
            <StatBox label="Usos totales" value={usages.length} />
            <StatBox label="Revenue" value={fmtMoney(totalRev)} color="#4ADE80"/>
            <StatBox label="Descuentos" value={fmtMoney(totalDisc)} color="#F87171"/>
            <StatBox label="Ticket promedio" value={fmtMoney(avgTicket)} color="#FCD34D"/>
          </div>

          {hourData.some(d=>d.usos>0) && (
            <>
              <SectionTitle>Horas pico</SectionTitle>
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={hourData} margin={{top:0,right:0,left:-20,bottom:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(139,92,246,0.1)"/>
                  <XAxis dataKey="hora" stroke="#6B7280" tick={{fontSize:9}}/>
                  <YAxis stroke="#6B7280" tick={{fontSize:9}}/>
                  <Tooltip {...TOOLTIP_STYLE} formatter={v=>[v,'Usos']}/>
                  <Bar dataKey="usos" fill="#8B5CF6" radius={[3,3,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </>
          )}

          {compData.length > 1 && (
            <>
              <SectionTitle>Comparativa vs otros locales — {brand?.name}</SectionTitle>
              <ResponsiveContainer width="100%" height={130}>
                <BarChart data={compData} margin={{top:0,right:0,left:-20,bottom:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(139,92,246,0.1)"/>
                  <XAxis dataKey="name" stroke="#6B7280" tick={{fontSize:10}}/>
                  <YAxis stroke="#6B7280" tick={{fontSize:9}} tickFormatter={v=>`$${(v/1000).toFixed(0)}K`}/>
                  <Tooltip {...TOOLTIP_STYLE} formatter={v=>[fmtMoney(v),'Revenue']}/>
                  <Bar dataKey="revenue" radius={[3,3,0,0]}>
                    {compData.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </>
          )}
        </>
      )}
    </div>
  )
}

// ── REPORT: POR MARCA ────────────────────────
function BrandReport({ brands, locations, codeUsages }) {
  const [brandId, setBrandId] = useState(brands[0]?.id||'')
  const [dateFrom, setDateFrom] = useState('2026-01-01')
  const [dateTo,   setDateTo]   = useState('2026-04-30')
  const [generated, setGenerated] = useState(false)

  const brand = brands.find(b => b.id === brandId)
  const brandLocs = locations.filter(l => l.brandId === brandId)

  const usages = useMemo(() => {
    if (!generated) return []
    return codeUsages.filter(u =>
      u.brandId === brandId &&
      u.timestamp.slice(0,10) >= dateFrom &&
      u.timestamp.slice(0,10) <= dateTo
    )
  }, [generated, brandId, dateFrom, dateTo, codeUsages])

  const totalRev = usages.reduce((s,u) => s + u.purchaseAmount, 0)

  const locPerf = brandLocs.map(l => {
    const usg = usages.filter(u => u.locationId === l.id)
    return { name: l.name.replace(/^(Nike|Adidas|Puma|Reebok|Under Armour) /, ''), usos: usg.length, revenue: usg.reduce((s,u)=>s+u.purchaseAmount,0) }
  }).sort((a,b) => b.revenue - a.revenue)

  // Monthly trend
  const monthMap = {}
  usages.forEach(u => {
    const m = u.timestamp.slice(0,7)
    monthMap[m] = (monthMap[m]||0) + u.purchaseAmount
  })
  const trendData = Object.entries(monthMap).sort().map(([m,v]) => ({
    mes: m.replace('2026-','').replace('-','/')+' 26', revenue: v
  }))

  return (
    <div>
      <div style={{display:'flex',gap:12,flexWrap:'wrap',marginBottom:16}}>
        <select className="select-field" style={{flex:2,minWidth:160}} value={brandId} onChange={e=>{setBrandId(e.target.value);setGenerated(false)}}>
          {brands.map(b => <option key={b.id} value={b.id}>{b.logo} {b.name}</option>)}
        </select>
        <input className="input-field" type="date" style={{flex:1,minWidth:130}} value={dateFrom} onChange={e=>{setDateFrom(e.target.value);setGenerated(false)}}/>
        <input className="input-field" type="date" style={{flex:1,minWidth:130}} value={dateTo} onChange={e=>{setDateTo(e.target.value);setGenerated(false)}}/>
        <button className="btn btn-primary" onClick={()=>setGenerated(true)}><Filter size={14}/>Generar</button>
      </div>

      {!generated ? (
        <div style={{textAlign:'center',padding:'48px 0',color:'var(--text-secondary)',fontSize:14}}>Selecciona marca y período</div>
      ) : (
        <>
          <div style={{padding:'14px 18px',background:'rgba(139,92,246,0.1)',border:'1px solid var(--border-violet)',borderRadius:12,marginBottom:16,display:'flex',gap:10,alignItems:'center'}}>
            <span style={{fontSize:22}}>{brand?.logo}</span>
            <div><div style={{fontWeight:700,fontSize:15}}>{brand?.name}</div><div style={{fontSize:11,color:'var(--text-secondary)'}}>{brandLocs.length} locales · {fmtDate(dateFrom)} – {fmtDate(dateTo)}</div></div>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))',gap:10,marginBottom:16}}>
            <StatBox label="Usos totales" value={usages.length}/>
            <StatBox label="Revenue total" value={fmtMoney(totalRev)} color="#4ADE80"/>
            <StatBox label="Locales activos" value={locPerf.filter(l=>l.usos>0).length}/>
            <StatBox label="Mejor local" value={locPerf[0]?.name||'—'} color="#FCD34D"/>
          </div>

          {trendData.length > 0 && (
            <>
              <SectionTitle>Tendencia mensual</SectionTitle>
              <ResponsiveContainer width="100%" height={140}>
                <LineChart data={trendData} margin={{top:0,right:0,left:-20,bottom:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(139,92,246,0.1)"/>
                  <XAxis dataKey="mes" stroke="#6B7280" tick={{fontSize:10}}/>
                  <YAxis stroke="#6B7280" tick={{fontSize:9}} tickFormatter={v=>`$${(v/1000).toFixed(0)}K`}/>
                  <Tooltip {...TOOLTIP_STYLE} formatter={v=>[fmtMoney(v),'Revenue']}/>
                  <Line type="monotone" dataKey="revenue" stroke="#8B5CF6" strokeWidth={2.5} dot={{fill:'#8B5CF6',r:4}}/>
                </LineChart>
              </ResponsiveContainer>
            </>
          )}

          <SectionTitle>Performance por local</SectionTitle>
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {locPerf.map((l,i) => (
              <div key={l.name} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 14px',background:'rgba(139,92,246,0.06)',borderRadius:10,border:'1px solid var(--border-violet)'}}>
                <span style={{fontSize:12,fontWeight:700,color:'var(--text-secondary)',width:20,textAlign:'right'}}>{i+1}</span>
                <div style={{flex:1,fontSize:13,fontWeight:500}}>{l.name}</div>
                <div style={{fontSize:12,fontWeight:700,color:'#4ADE80'}}>{fmtMoney(l.revenue)}</div>
                <div style={{fontSize:11,color:'var(--text-secondary)'}}>{l.usos} usos</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ── REPORT: POR INFLUENCER ───────────────────
function InfluencerReport({ influencers, codeUsages, codes }) {
  const [infId, setInfId] = useState(influencers[0]?.id||'')
  const [generated, setGenerated] = useState(false)

  const inf = influencers.find(i => i.id === infId)

  const usages = useMemo(() => {
    if (!generated) return []
    return codeUsages.filter(u => u.influencerId === infId)
  }, [generated, infId, codeUsages])

  const totalRev = usages.reduce((s,u) => s + u.purchaseAmount, 0)
  const codeMap = {}
  usages.forEach(u => { codeMap[u.codeId] = (codeMap[u.codeId]||0) + 1 })
  const topCodes = Object.entries(codeMap).sort(([,a],[,b])=>b-a).slice(0,5)
    .map(([cid,cnt]) => ({ code: codes.find(c=>c.id===cid)?.code||cid, usos: cnt }))

  const monthMap = {}
  usages.forEach(u => { const m = u.timestamp.slice(0,7); monthMap[m]=(monthMap[m]||0)+u.purchaseAmount })
  const trendData = Object.entries(monthMap).sort().map(([m,v]) => ({ mes: m.slice(5)+'/26', revenue: v }))

  const TIER_CFG = { 1:'Elite',2:'Pro',3:'Standard',4:'Entry' }

  return (
    <div>
      <div style={{display:'flex',gap:12,flexWrap:'wrap',marginBottom:16}}>
        <select className="select-field" style={{flex:2,minWidth:200}} value={infId} onChange={e=>{setInfId(e.target.value);setGenerated(false)}}>
          {influencers.map(i => <option key={i.id} value={i.id}>{i.username} (Tier {i.tier})</option>)}
        </select>
        <button className="btn btn-primary" onClick={()=>setGenerated(true)}><Filter size={14}/>Generar</button>
      </div>

      {!generated ? (
        <div style={{textAlign:'center',padding:'48px 0',color:'var(--text-secondary)',fontSize:14}}>Selecciona un influencer</div>
      ) : (
        <>
          <div style={{padding:'14px 18px',background:'rgba(139,92,246,0.1)',border:'1px solid var(--border-violet)',borderRadius:12,marginBottom:16,display:'flex',gap:12,alignItems:'center'}}>
            <div style={{width:44,height:44,borderRadius:'50%',background:'linear-gradient(135deg,var(--primary-violet),var(--accent-magenta))',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:18}}>{inf?.name.charAt(0)}</div>
            <div>
              <div style={{fontWeight:700,fontSize:15}}>{inf?.name} · {inf?.username}</div>
              <div style={{fontSize:11,color:'var(--text-secondary)'}}>{TIER_CFG[inf?.tier]} · {(inf?.followers||0).toLocaleString()} seguidores · {inf?.category}</div>
            </div>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))',gap:10,marginBottom:16}}>
            <StatBox label="Usos totales" value={usages.length}/>
            <StatBox label="Revenue atribuido" value={fmtMoney(totalRev)} color="#4ADE80"/>
            <StatBox label="Referidos" value={inf?.referrals?.total||0} color="#FCD34D"/>
            <StatBox label="Conv. rate" value={`${inf?.referrals?.conversionRate||0}%`} color="#E879F9"/>
          </div>

          {trendData.length > 0 && (
            <>
              <SectionTitle>Performance mensual</SectionTitle>
              <ResponsiveContainer width="100%" height={130}>
                <BarChart data={trendData} margin={{top:0,right:0,left:-20,bottom:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(139,92,246,0.1)"/>
                  <XAxis dataKey="mes" stroke="#6B7280" tick={{fontSize:10}}/>
                  <YAxis stroke="#6B7280" tick={{fontSize:9}} tickFormatter={v=>`$${(v/1000).toFixed(0)}K`}/>
                  <Tooltip {...TOOLTIP_STYLE} formatter={v=>[fmtMoney(v),'Revenue']}/>
                  <Bar dataKey="revenue" fill="#8B5CF6" radius={[3,3,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </>
          )}

          {topCodes.length > 0 && (
            <>
              <SectionTitle>Mejores códigos</SectionTitle>
              <div style={{display:'flex',flexDirection:'column',gap:6}}>
                {topCodes.map((c,i) => (
                  <div key={c.code} style={{display:'flex',gap:12,padding:'8px 12px',background:'rgba(139,92,246,0.06)',borderRadius:8}}>
                    <code style={{flex:1,fontSize:12,fontWeight:700,color:'var(--primary-violet-light)',letterSpacing:1}}>{c.code}</code>
                    <span style={{fontSize:12,color:'var(--text-secondary)'}}>{c.usos} usos</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}

// ── REPORT: CONSUMO GENERAL ──────────────────
function GeneralReport({ codeUsages, users }) {
  const [city,   setCity]   = useState('all')
  const [gender, setGender] = useState('all')
  const [dateFrom, setDateFrom] = useState('2026-01-01')
  const [dateTo,   setDateTo]   = useState('2026-04-30')
  const [generated, setGenerated] = useState(false)

  const cities = useMemo(() => [...new Set(codeUsages.map(u => u.userDemographics?.city).filter(Boolean))].sort(), [codeUsages])

  const usages = useMemo(() => {
    if (!generated) return []
    return codeUsages.filter(u => {
      const dem = u.userDemographics || {}
      return (city === 'all' || dem.city === city) &&
             (gender === 'all' || dem.gender === gender) &&
             u.timestamp.slice(0,10) >= dateFrom &&
             u.timestamp.slice(0,10) <= dateTo
    })
  }, [generated, city, gender, dateFrom, dateTo, codeUsages])

  const dayMap = {Mon:0,Tue:0,Wed:0,Thu:0,Fri:0,Sat:0,Sun:0}
  const dayLabels = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']
  const dayCount = [0,0,0,0,0,0,0]
  usages.forEach(u => { const d = new Date(u.timestamp).getDay(); dayCount[d]++ })
  const dayData = dayLabels.map((label,i) => ({label, usos: dayCount[i]}))

  const cityMap = {}
  usages.forEach(u => { const c = u.userDemographics?.city; if(c) cityMap[c]=(cityMap[c]||0)+1 })
  const cityData = Object.entries(cityMap).sort(([,a],[,b])=>b-a).map(([name,count])=>({name,count}))

  const buckets = {'18-24':0,'25-34':0,'35-44':0,'45-54':0,'55+':0}
  usages.forEach(u => {
    const age = u.userDemographics?.age||0
    if(age<25) buckets['18-24']++
    else if(age<35) buckets['25-34']++
    else if(age<45) buckets['35-44']++
    else if(age<55) buckets['45-54']++
    else buckets['55+']++
  })
  const ageData = Object.entries(buckets).map(([range,count])=>({range,count}))

  const totalRev = usages.reduce((s,u)=>s+u.purchaseAmount,0)
  const fCount = usages.filter(u=>u.userDemographics?.gender==='F').length
  const mCount = usages.filter(u=>u.userDemographics?.gender==='M').length

  return (
    <div>
      <div style={{display:'flex',gap:12,flexWrap:'wrap',marginBottom:16}}>
        <select className="select-field" style={{flex:1,minWidth:140}} value={city} onChange={e=>{setCity(e.target.value);setGenerated(false)}}>
          <option value="all">Todas las ciudades</option>
          {cities.map(c=><option key={c} value={c}>{c}</option>)}
        </select>
        <select className="select-field" style={{flex:1,minWidth:120}} value={gender} onChange={e=>{setGender(e.target.value);setGenerated(false)}}>
          <option value="all">Todos los géneros</option>
          <option value="F">Femenino</option>
          <option value="M">Masculino</option>
        </select>
        <input className="input-field" type="date" style={{flex:1,minWidth:130}} value={dateFrom} onChange={e=>{setDateFrom(e.target.value);setGenerated(false)}}/>
        <input className="input-field" type="date" style={{flex:1,minWidth:130}} value={dateTo} onChange={e=>{setDateTo(e.target.value);setGenerated(false)}}/>
        <button className="btn btn-primary" onClick={()=>setGenerated(true)}><Filter size={14}/>Generar</button>
      </div>

      {!generated ? (
        <div style={{textAlign:'center',padding:'48px 0',color:'var(--text-secondary)',fontSize:14}}>Aplica filtros y genera el reporte</div>
      ) : (
        <>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))',gap:10,marginBottom:16}}>
            <StatBox label="Usos filtrados" value={usages.length}/>
            <StatBox label="Revenue" value={fmtMoney(totalRev)} color="#4ADE80"/>
            <StatBox label="♀ Mujeres" value={fCount} color="#F472B6"/>
            <StatBox label="♂ Hombres" value={mCount} color="#60A5FA"/>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
            <div>
              <SectionTitle>Por día de semana</SectionTitle>
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={dayData} margin={{top:0,right:0,left:-20,bottom:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(139,92,246,0.1)"/>
                  <XAxis dataKey="label" stroke="#6B7280" tick={{fontSize:10}}/>
                  <YAxis stroke="#6B7280" tick={{fontSize:9}}/>
                  <Tooltip {...TOOLTIP_STYLE} formatter={v=>[v,'Usos']}/>
                  <Bar dataKey="usos" fill="#8B5CF6" radius={[3,3,0,0]}>
                    {dayData.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div>
              <SectionTitle>Por rango etario</SectionTitle>
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={ageData} margin={{top:0,right:0,left:-20,bottom:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(139,92,246,0.1)"/>
                  <XAxis dataKey="range" stroke="#6B7280" tick={{fontSize:10}}/>
                  <YAxis stroke="#6B7280" tick={{fontSize:9}}/>
                  <Tooltip {...TOOLTIP_STYLE} formatter={v=>[v,'Usuarios']}/>
                  <Bar dataKey="count" fill="#E879F9" radius={[3,3,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {cityData.length > 1 && (
            <>
              <SectionTitle>Distribución por ciudad</SectionTitle>
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {cityData.map((c,i) => (
                  <div key={c.name} style={{display:'flex',alignItems:'center',gap:12}}>
                    <div style={{width:80,fontSize:12,fontWeight:500}}>{c.name}</div>
                    <div style={{flex:1,height:8,borderRadius:4,background:'rgba(139,92,246,0.1)'}}>
                      <div style={{height:'100%',width:`${Math.round(c.count/Math.max(...cityData.map(x=>x.count))*100)}%`,borderRadius:4,background:`linear-gradient(90deg,${COLORS[i%COLORS.length]},${COLORS[(i+1)%COLORS.length]})`}}/>
                    </div>
                    <div style={{fontSize:12,color:'var(--text-secondary)',width:40,textAlign:'right'}}>{c.count}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}

// ── MAIN ─────────────────────────────────────
export default function ReportsView({ codeUsages, codes, brands, locations, influencers, users }) {
  const [activeType, setActiveType] = useState('location')

  const reportComponents = {
    location:   <LocationReport   locations={locations} brands={brands} codeUsages={codeUsages} codes={codes} />,
    brand:      <BrandReport      brands={brands} locations={locations} codeUsages={codeUsages} />,
    influencer: <InfluencerReport influencers={influencers} codeUsages={codeUsages} codes={codes} />,
    general:    <GeneralReport    codeUsages={codeUsages} users={users} />,
  }

  return (
    <div style={{ padding: 24, animation: 'fadeIn 0.3s ease' }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700 }}>Reportes</h2>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Genera reportes detallados por local, marca, influencer o consumo</p>
      </div>

      {/* Type selector */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
        {REPORT_TYPES.map(rt => {
          const isActive = activeType === rt.id
          return (
            <button key={rt.id} onClick={() => setActiveType(rt.id)} style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px',
              borderRadius: 12, border: `1px solid ${isActive ? rt.color : 'var(--border-violet)'}`,
              background: isActive ? `${rt.color}22` : 'rgba(139,92,246,0.05)',
              color: isActive ? rt.color : 'var(--text-secondary)',
              fontWeight: isActive ? 700 : 400, fontSize: 13, transition: 'all 0.2s', cursor: 'pointer'
            }}>
              <rt.icon size={15} />
              {rt.label}
            </button>
          )
        })}
      </div>

      {/* Report panel */}
      <div style={{ background: 'var(--glass-bg)', border: '1px solid var(--border-violet)', borderRadius: 16, padding: '24px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {(() => { const rt = REPORT_TYPES.find(r => r.id === activeType); return rt ? <rt.icon size={16} color={rt.color}/> : null })()}
            <span style={{ fontSize: 15, fontWeight: 700 }}>{REPORT_TYPES.find(r => r.id === activeType)?.label}</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost" style={{ fontSize: 12, padding: '6px 12px' }}>
              <Download size={13}/>PDF
            </button>
            <button className="btn btn-ghost" style={{ fontSize: 12, padding: '6px 12px' }}>
              <Download size={13}/>Excel
            </button>
          </div>
        </div>

        {reportComponents[activeType]}
      </div>
    </div>
  )
}
