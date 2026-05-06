import React, { useState, useMemo } from 'react'
import { Plus, Edit3, Trash2, X, Save, Search, Users, DollarSign, Target, CheckSquare, TrendingUp } from 'lucide-react'

const fmtMoney = (n) => n >= 1000000 ? `$${(n/1000000).toFixed(1)}M` : n >= 1000 ? `$${(n/1000).toFixed(0)}K` : `$${n}`
const generateId = () => `${Date.now()}_${Math.random().toString(36).slice(2,7)}`
const F = ({ label, children }) => (
  <div>
    <label style={{ fontSize:12,fontWeight:500,color:'var(--text-secondary)',display:'block',marginBottom:6 }}>{label}</label>
    {children}
  </div>
)

const CAT_CFG = {
  jefe:      { label:'Jefe', color:'#FCD34D', bg:'rgba(252,211,77,0.15)', icon:'👑' },
  publica:   { label:'Pública', color:'#8B5CF6', bg:'rgba(139,92,246,0.15)', icon:'⭐' },
  satelite:  { label:'Satélite', color:'#22D3EE', bg:'rgba(34,211,238,0.15)', icon:'🛰️' },
}
const TYPE_CFG = {
  cachengue:  { label:'Cachengue', color:'#E879F9' },
  electronica:{ label:'Electrónica', color:'#22D3EE' },
  ambas:      { label:'Ambas', color:'#4ADE80' },
}

const DEMO_RRPP = [
  { id:'rp1', firstName:'Lucía', lastName:'Martínez', age:24, category:'jefe', type:'ambas', instagram:'@lucia_rrpp', email:'lucia@rrpp.com', city:'Buenos Aires', country:'Argentina', dni:'38221456', status:'active', details:'Jefa de equipo CABA', sales:{ ticketsSold:234, revenue:702000, events:8 }, payConfig:{ type:'porcentaje', pct:15, fixedPerTicket:0, eventBonus:5000 } },
  { id:'rp2', firstName:'Camila', lastName:'Rodríguez', age:22, category:'publica', type:'cachengue', instagram:'@cami_r', email:'cami@rrpp.com', city:'Buenos Aires', country:'Argentina', dni:'41234567', status:'active', details:'Especialista eventos cachengue', sales:{ ticketsSold:156, revenue:390000, events:6 }, payConfig:{ type:'porcentaje', pct:10, fixedPerTicket:0, eventBonus:3000 } },
  { id:'rp3', firstName:'Nicolás', lastName:'Vega', age:26, category:'publica', type:'electronica', instagram:'@nico_v', email:'nico@rrpp.com', city:'Rosario', country:'Argentina', dni:'39456789', status:'active', details:'Especialista electrónica', sales:{ ticketsSold:189, revenue:567000, events:7 }, payConfig:{ type:'fijo', pct:0, fixedPerTicket:500, eventBonus:8000 } },
  { id:'rp4', firstName:'Valentina', lastName:'Gómez', age:21, category:'satelite', type:'cachengue', instagram:'@vale_g', email:'vale@rrpp.com', city:'Córdoba', country:'Argentina', dni:'43567890', status:'active', details:'Satélite zona Córdoba', sales:{ ticketsSold:67, revenue:167500, events:3 }, payConfig:{ type:'fijo', pct:0, fixedPerTicket:400, eventBonus:2000 } },
  { id:'rp5', firstName:'Mateo', lastName:'Herrera', age:25, category:'publica', type:'ambas', instagram:'@mateo_h', email:'mateo@rrpp.com', city:'Buenos Aires', country:'Argentina', dni:'40678901', status:'inactive', details:'En pausa temporaria', sales:{ ticketsSold:98, revenue:294000, events:4 }, payConfig:{ type:'porcentaje', pct:12, fixedPerTicket:0, eventBonus:4000 } },
]

const DEMO_EVENTS = [
  { id:'ev1', name:'Resilio Members Night', city:'Buenos Aires', date:'2026-05-25' },
  { id:'ev2', name:'Electronic Night', city:'Rosario', date:'2026-06-10' },
  { id:'ev3', name:'Cumbia Session', city:'Buenos Aires', date:'2026-06-20' },
]

// ─── Member Modal ──────────────────────────────────
const MemberModal = ({ member, onSave, onClose }) => {
  const [form, setForm] = useState(member || {
    firstName:'', lastName:'', age:'', category:'publica', type:'ambas',
    instagram:'', email:'', city:'', country:'Argentina', dni:'', status:'active', details:''
  })
  const set = (f, v) => setForm(p => ({ ...p, [f]: v }))
  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',backdropFilter:'blur(8px)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:20 }} onClick={onClose}>
      <div style={{ width:'100%',maxWidth:580,background:'var(--bg-secondary)',border:'1px solid var(--border-violet)',borderRadius:20,maxHeight:'90vh',overflowY:'auto',boxShadow:'var(--glow-violet),0 40px 80px rgba(0,0,0,0.5)',animation:'fadeIn 0.3s ease' }} onClick={e=>e.stopPropagation()}>
        <div style={{ padding:'20px 28px',borderBottom:'1px solid var(--border-violet)',display:'flex',alignItems:'center',gap:12 }}>
          <div style={{ width:40,height:40,borderRadius:12,background:'linear-gradient(135deg,var(--primary-violet),var(--accent-magenta))',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18 }}>👥</div>
          <h2 style={{ fontSize:16,fontWeight:700 }}>{member?'Editar Miembro':'Nuevo Miembro RRPP'}</h2>
          <button onClick={onClose} style={{ marginLeft:'auto',color:'var(--text-secondary)',padding:6 }}><X size={20}/></button>
        </div>
        <div style={{ padding:'20px 28px',display:'flex',flexDirection:'column',gap:14 }}>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
            <F label="Nombre *"><input className="input-field" value={form.firstName} onChange={e=>set('firstName',e.target.value)} placeholder="Lucía"/></F>
            <F label="Apellido *"><input className="input-field" value={form.lastName} onChange={e=>set('lastName',e.target.value)} placeholder="Martínez"/></F>
          </div>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12 }}>
            <F label="Edad"><input className="input-field" type="number" value={form.age} onChange={e=>set('age',+e.target.value)}/></F>
            <F label="Categoría">
              <select className="select-field" value={form.category} onChange={e=>set('category',e.target.value)}>
                {Object.entries(CAT_CFG).map(([k,v])=><option key={k} value={k}>{v.icon} {v.label}</option>)}
              </select>
            </F>
            <F label="Tipo">
              <select className="select-field" value={form.type} onChange={e=>set('type',e.target.value)}>
                {Object.entries(TYPE_CFG).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
              </select>
            </F>
          </div>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
            <F label="Instagram"><input className="input-field" value={form.instagram} onChange={e=>set('instagram',e.target.value)} placeholder="@usuario"/></F>
            <F label="Email"><input className="input-field" type="email" value={form.email} onChange={e=>set('email',e.target.value)} placeholder="email@rrpp.com"/></F>
          </div>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12 }}>
            <F label="Ciudad"><input className="input-field" value={form.city} onChange={e=>set('city',e.target.value)} placeholder="Buenos Aires"/></F>
            <F label="País"><input className="input-field" value={form.country} onChange={e=>set('country',e.target.value)}/></F>
            <F label="DNI / ID"><input className="input-field" value={form.dni} onChange={e=>set('dni',e.target.value)}/></F>
          </div>
          <F label="Detalles"><textarea className="input-field" value={form.details} onChange={e=>set('details',e.target.value)} rows={2} style={{ resize:'vertical' }}/></F>
          <div><label style={{ fontSize:12,color:'var(--text-secondary)',display:'block',marginBottom:6 }}>Estado</label>
            <div style={{ display:'flex',gap:8 }}>
              {['active','inactive'].map(s=>(
                <button key={s} onClick={()=>set('status',s)} style={{ padding:'8px 20px',borderRadius:10,fontSize:13,fontWeight:500,border:`1px solid ${form.status===s?'var(--primary-violet)':'var(--border-violet)'}`,background:form.status===s?'rgba(139,92,246,0.2)':'rgba(139,92,246,0.05)',color:form.status===s?'var(--primary-violet-light)':'var(--text-secondary)',transition:'all 0.2s' }}>{s==='active'?'Activo':'Inactivo'}</button>
              ))}
            </div>
          </div>
        </div>
        <div style={{ padding:'14px 28px',borderTop:'1px solid var(--border-violet)',display:'flex',gap:10,justifyContent:'flex-end' }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={()=>{ if(!form.firstName.trim())return; onSave({...form,id:member?.id||generateId(),sales:member?.sales||{ticketsSold:0,revenue:0,events:0},payConfig:member?.payConfig||{type:'porcentaje',pct:10,fixedPerTicket:0,eventBonus:0},createdAt:member?.createdAt||new Date().toISOString()}) }}><Save size={14}/>{member?'Guardar':'Agregar'}</button>
        </div>
      </div>
    </div>
  )
}

// ─── Cálculo Tab ────────────────────────────────────
const CalcTab = ({ members }) => {
  const [selected, setSelected] = useState(members[0]?.id || '')
  const [payType, setPayType] = useState('porcentaje')
  const [pct, setPct] = useState(10)
  const [fixedPerTicket, setFixedPerTicket] = useState(500)
  const [bonus, setBonus] = useState(0)
  const [selectedEvent, setSelectedEvent] = useState('')

  const member = members.find(m => m.id === selected)
  if (!member) return <div style={{ textAlign:'center',padding:40,color:'var(--text-secondary)' }}>Selecciona un miembro</div>

  const eventRev = selectedEvent ? (DEMO_EVENTS.find(e=>e.id===selectedEvent)?.ticketPrice||3000)*50 : member.sales?.revenue || 0
  const ticketsSold = member.sales?.ticketsSold || 0

  const calcPayment = () => {
    if (payType === 'porcentaje') return Math.round(eventRev * pct / 100) + (bonus || 0)
    return ticketsSold * fixedPerTicket + (bonus || 0)
  }

  return (
    <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:20 }}>
      <div style={{ display:'flex',flexDirection:'column',gap:14 }}>
        <div>
          <label style={{ fontSize:12,color:'var(--text-secondary)',display:'block',marginBottom:6 }}>Seleccionar Pública</label>
          <select className="select-field" value={selected} onChange={e=>setSelected(e.target.value)}>
            {members.map(m=><option key={m.id} value={m.id}>{m.firstName} {m.lastName}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize:12,color:'var(--text-secondary)',display:'block',marginBottom:6 }}>Evento (opcional)</label>
          <select className="select-field" value={selectedEvent} onChange={e=>setSelectedEvent(e.target.value)}>
            <option value="">General (todos los eventos)</option>
            {DEMO_EVENTS.map(e=><option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize:12,color:'var(--text-secondary)',display:'block',marginBottom:6 }}>Tipo de pago</label>
          <div style={{ display:'flex',gap:8 }}>
            {[{v:'porcentaje',l:'% Revenue'},{v:'fijo',l:'Fijo x ticket'}].map(t=>(
              <button key={t.v} onClick={()=>setPayType(t.v)} style={{ flex:1,padding:'9px 12px',borderRadius:10,fontSize:13,fontWeight:500,border:`1px solid ${payType===t.v?'var(--primary-violet)':'var(--border-violet)'}`,background:payType===t.v?'rgba(139,92,246,0.2)':'rgba(139,92,246,0.05)',color:payType===t.v?'var(--primary-violet-light)':'var(--text-secondary)',transition:'all 0.2s' }}>{t.l}</button>
            ))}
          </div>
        </div>
        {payType === 'porcentaje' ? (
          <div><label style={{ fontSize:12,color:'var(--text-secondary)',display:'block',marginBottom:6 }}>Porcentaje (%)</label><input className="input-field" type="number" min={0} max={100} value={pct} onChange={e=>setPct(+e.target.value)}/></div>
        ) : (
          <div><label style={{ fontSize:12,color:'var(--text-secondary)',display:'block',marginBottom:6 }}>Monto por ticket ($)</label><input className="input-field" type="number" value={fixedPerTicket} onChange={e=>setFixedPerTicket(+e.target.value)}/></div>
        )}
        <div><label style={{ fontSize:12,color:'var(--text-secondary)',display:'block',marginBottom:6 }}>Premio por evento ($)</label><input className="input-field" type="number" value={bonus} onChange={e=>setBonus(+e.target.value)}/></div>
      </div>

      <div style={{ display:'flex',flexDirection:'column',gap:12 }}>
        <div style={{ padding:'20px',background:'rgba(74,222,128,0.08)',border:'1px solid rgba(74,222,128,0.25)',borderRadius:16,textAlign:'center' }}>
          <div style={{ fontSize:13,color:'var(--text-secondary)',marginBottom:6 }}>Pago calculado para</div>
          <div style={{ fontSize:16,fontWeight:700,marginBottom:12 }}>{member.firstName} {member.lastName}</div>
          <div style={{ fontSize:42,fontWeight:900,color:'#4ADE80',lineHeight:1 }}>{fmtMoney(calcPayment())}</div>
          <div style={{ fontSize:12,color:'var(--text-secondary)',marginTop:6 }}>
            {payType==='porcentaje' ? `${pct}% de ${fmtMoney(eventRev)}` : `${ticketsSold} tickets × $${fixedPerTicket}`}
            {bonus > 0 && ` + $${bonus} bonus`}
          </div>
        </div>

        <div className="card" style={{ padding:16 }}>
          <div style={{ fontSize:12,fontWeight:600,marginBottom:10,color:'var(--text-secondary)' }}>Historial de desempeño</div>
          {[
            { l:'Tickets vendidos', v:member.sales?.ticketsSold||0 },
            { l:'Revenue generado', v:fmtMoney(member.sales?.revenue||0) },
            { l:'Eventos', v:member.sales?.events||0 },
          ].map(s=>(
            <div key={s.l} style={{ display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:'1px solid rgba(139,92,246,0.1)' }}>
              <span style={{ fontSize:12,color:'var(--text-secondary)' }}>{s.l}</span>
              <span style={{ fontSize:13,fontWeight:700,color:'var(--primary-violet-light)' }}>{s.v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Detail Modal ──────────────────────────────────
const DetailModal = ({ member, events, onSave, onClose }) => {
  const [notes, setNotes] = useState(member.notes || '')
  const [eventSales, setEventSales] = useState(
    events.map(ev => ({
      eventId: ev.id,
      eventName: ev.name,
      sold: (member.eventSales||[]).find(es=>es.eventId===ev.id)?.sold || 0,
    }))
  )
  const cat = CAT_CFG[member.category]
  const typ = TYPE_CFG[member.type]

  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',backdropFilter:'blur(8px)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:20 }} onClick={onClose}>
      <div style={{ width:'100%',maxWidth:640,background:'var(--bg-secondary)',border:'1px solid var(--border-violet)',borderRadius:20,maxHeight:'92vh',overflowY:'auto',boxShadow:'var(--glow-violet),0 40px 80px rgba(0,0,0,0.5)',animation:'fadeIn 0.3s ease' }} onClick={e=>e.stopPropagation()}>
        <div style={{ padding:'20px 28px',borderBottom:'1px solid var(--border-violet)',display:'flex',alignItems:'center',gap:14 }}>
          <div style={{ width:52,height:52,borderRadius:16,background:`${cat.color}22`,border:`1px solid ${cat.color}44`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,flexShrink:0 }}>{cat.icon}</div>
          <div style={{ flex:1,minWidth:0 }}>
            <h2 style={{ fontSize:18,fontWeight:800,marginBottom:4 }}>{member.firstName} {member.lastName}</h2>
            <div style={{ display:'flex',gap:6,flexWrap:'wrap' }}>
              {[[cat.label,cat.color],[typ.label,typ.color],[member.status==='active'?'Activo':'Inactivo',member.status==='active'?'#4ADE80':'#F87171']].map(([l,c])=>(
                <span key={l} style={{ fontSize:10,padding:'2px 8px',borderRadius:20,background:`${c}22`,color:c,border:`1px solid ${c}44`,fontWeight:600 }}>{l}</span>
              ))}
            </div>
          </div>
          <button onClick={onClose} style={{ padding:6,borderRadius:8,color:'var(--text-secondary)',background:'none',border:'none',cursor:'pointer',flexShrink:0 }}><X size={20}/></button>
        </div>

        <div style={{ padding:'20px 28px',display:'flex',flexDirection:'column',gap:20 }}>
          <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:8 }}>
            {[
              { icon:'📷',label:'Instagram',val:member.instagram },
              { icon:'📧',label:'Email',val:member.email },
              { icon:'📍',label:'Ciudad',val:member.city&&member.country?`${member.city}, ${member.country}`:member.city||'—' },
              { icon:'🎂',label:'Edad',val:member.age?`${member.age} años`:'—' },
              { icon:'🪪',label:'DNI',val:member.dni||'—' },
            ].map(item=>(
              <div key={item.label} style={{ padding:'10px 12px',background:'rgba(139,92,246,0.07)',borderRadius:10,border:'1px solid rgba(139,92,246,0.1)' }}>
                <div style={{ fontSize:10,color:'var(--text-secondary)',marginBottom:3 }}>{item.icon} {item.label}</div>
                <div style={{ fontSize:12,fontWeight:600,wordBreak:'break-all' }}>{item.val||'—'}</div>
              </div>
            ))}
          </div>

          <div>
            <div style={{ fontSize:13,fontWeight:700,marginBottom:10 }}>Métricas de Desempeño</div>
            <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10 }}>
              {[
                { label:'Tickets Vendidos', value:member.sales?.ticketsSold||0, color:'#8B5CF6' },
                { label:'Revenue Total', value:fmtMoney(member.sales?.revenue||0), color:'#4ADE80' },
                { label:'Eventos Participados', value:member.sales?.events||0, color:'#FCD34D' },
              ].map(s=>(
                <div key={s.label} style={{ textAlign:'center',padding:'14px 8px',borderRadius:12,background:`${s.color}14`,border:`1px solid ${s.color}33` }}>
                  <div style={{ fontSize:22,fontWeight:800,color:s.color }}>{s.value}</div>
                  <div style={{ fontSize:10,color:'var(--text-secondary)',marginTop:2 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div style={{ fontSize:13,fontWeight:700,marginBottom:10 }}>Tickets por Evento</div>
            <div style={{ display:'flex',flexDirection:'column',gap:6 }}>
              <div style={{ display:'grid',gridTemplateColumns:'1fr 80px',gap:10,padding:'4px 12px',fontSize:10,color:'var(--text-secondary)',fontWeight:600,textTransform:'uppercase',letterSpacing:1 }}>
                <span>Evento</span><span style={{ textAlign:'center' }}>Tickets</span>
              </div>
              {eventSales.map((es,i)=>(
                <div key={es.eventId} style={{ display:'grid',gridTemplateColumns:'1fr 80px',gap:10,padding:'8px 12px',background:'rgba(139,92,246,0.07)',borderRadius:8,alignItems:'center' }}>
                  <span style={{ fontSize:12 }}>🎉 {es.eventName}</span>
                  <input type="number" value={es.sold} min={0}
                    onChange={e=>setEventSales(prev=>prev.map((x,j)=>j===i?{...x,sold:+e.target.value}:x))}
                    style={{ width:'100%',textAlign:'center',fontSize:13,fontWeight:700,color:'var(--primary-violet-light)',background:'rgba(139,92,246,0.08)',border:'1px solid var(--border-violet)',borderRadius:6,padding:'4px'}}
                  />
                </div>
              ))}
              <div style={{ display:'grid',gridTemplateColumns:'1fr 80px',gap:10,padding:'8px 12px',background:'rgba(74,222,128,0.07)',borderRadius:8,alignItems:'center',border:'1px solid rgba(74,222,128,0.2)' }}>
                <span style={{ fontSize:12,fontWeight:700,color:'#4ADE80' }}>TOTAL</span>
                <span style={{ textAlign:'center',fontSize:13,fontWeight:800,color:'#4ADE80' }}>{eventSales.reduce((a,e)=>a+e.sold,0)}</span>
              </div>
            </div>
          </div>

          {member.payConfig && (
            <div>
              <div style={{ fontSize:13,fontWeight:700,marginBottom:8 }}>Configuración de Pago</div>
              <div style={{ padding:'12px 16px',background:'rgba(74,222,128,0.06)',border:'1px solid rgba(74,222,128,0.2)',borderRadius:10,fontSize:13 }}>
                {member.payConfig.type==='porcentaje'
                  ? <>💰 <strong>{member.payConfig.pct}%</strong> del revenue + <strong>${member.payConfig.eventBonus?.toLocaleString()}</strong> bonus por evento</>
                  : <>🎫 <strong>${member.payConfig.fixedPerTicket?.toLocaleString()}</strong> por ticket + <strong>${member.payConfig.eventBonus?.toLocaleString()}</strong> bonus por evento</>
                }
              </div>
            </div>
          )}

          {member.details && (
            <div style={{ padding:'10px 14px',background:'rgba(139,92,246,0.07)',borderRadius:10,fontSize:13,color:'var(--text-secondary)',border:'1px solid rgba(139,92,246,0.12)' }}>
              ℹ️ {member.details}
            </div>
          )}

          <div>
            <div style={{ fontSize:13,fontWeight:700,marginBottom:8 }}>Notas / Historial de Pagos</div>
            <textarea className="input-field" value={notes} onChange={e=>setNotes(e.target.value)} rows={4}
              placeholder="Agregar notas sobre desempeño, acuerdos, historial de pagos realizados..."
              style={{ resize:'vertical' }}
            />
          </div>
        </div>

        <div style={{ padding:'14px 28px',borderTop:'1px solid var(--border-violet)',display:'flex',gap:10,justifyContent:'flex-end' }}>
          <button className="btn btn-ghost" onClick={onClose}>Cerrar</button>
          <button className="btn btn-primary" onClick={()=>{ onSave({...member,notes,eventSales}); onClose() }}><Save size={14}/>Guardar Cambios</button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Export ────────────────────────────────────
export default function RRPPView() {
  const [tab, setTab] = useState('equipo')
  const [members, setMembers] = useState(DEMO_RRPP)
  const [modal, setModal] = useState(null)
  const [detailMember, setDetailMember] = useState(null)
  const [confirmDel, setConfirmDel] = useState(null)
  const [search, setSearch] = useState('')
  const [fCat, setFCat] = useState('all')
  const [fType, setFType] = useState('all')
  const [fCity, setFCity] = useState('all')
  const [fCountry, setFCountry] = useState('all')

  const cities = [...new Set(members.map(m => m.city).filter(Boolean))]
  const countries = [...new Set(members.map(m => m.country).filter(Boolean))]

  const filtered = members.filter(m => {
    const ms = `${m.firstName} ${m.lastName}`.toLowerCase().includes(search.toLowerCase()) || (m.instagram||'').toLowerCase().includes(search.toLowerCase())
    return ms && (fCat==='all'||m.category===fCat) && (fType==='all'||m.type===fType) && (fCity==='all'||m.city===fCity) && (fCountry==='all'||m.country===fCountry)
  })

  const totalRevenue = members.reduce((a,m)=>a+(m.sales?.revenue||0),0)
  const totalTickets = members.reduce((a,m)=>a+(m.sales?.ticketsSold||0),0)

  const TABS = [
    { id:'equipo', label:'Equipo', icon:'👥' },
    { id:'ventas', label:'Ventas', icon:'💰' },
    { id:'calculo', label:'Cálculo', icon:'🧮' },
    { id:'eventos', label:'Equipos por Evento', icon:'🎉' },
  ]

  return (
    <div style={{ padding:24,animation:'fadeIn 0.3s ease' }}>
      {modal && <MemberModal member={modal==='create'?null:modal} onSave={data=>{setMembers(p=>p.find(x=>x.id===data.id)?p.map(x=>x.id===data.id?data:x):[...p,data]);setModal(null)}} onClose={()=>setModal(null)}/>}
      {detailMember && <DetailModal member={detailMember} events={DEMO_EVENTS} onSave={data=>setMembers(p=>p.map(x=>x.id===data.id?data:x))} onClose={()=>setDetailMember(null)}/>}
      {confirmDel && (
        <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',backdropFilter:'blur(8px)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:20 }} onClick={()=>setConfirmDel(null)}>
          <div style={{ width:'100%',maxWidth:380,background:'var(--bg-secondary)',border:'1px solid rgba(239,68,68,0.3)',borderRadius:16,padding:28,animation:'fadeIn 0.2s' }} onClick={e=>e.stopPropagation()}>
            <h3 style={{ fontSize:15,fontWeight:700,marginBottom:10 }}>Eliminar miembro</h3>
            <p style={{ fontSize:13,color:'var(--text-secondary)',marginBottom:20 }}>¿Eliminar a "{confirmDel.firstName} {confirmDel.lastName}"?</p>
            <div style={{ display:'flex',gap:10,justifyContent:'flex-end' }}>
              <button className="btn btn-ghost" onClick={()=>setConfirmDel(null)}>Cancelar</button>
              <button className="btn btn-danger" onClick={()=>{setMembers(p=>p.filter(x=>x.id!==confirmDel.id));setConfirmDel(null)}}><Trash2 size={13}/>Eliminar</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display:'flex',alignItems:'center',gap:12,marginBottom:20,flexWrap:'wrap' }}>
        <div>
          <h2 style={{ fontSize:20,fontWeight:700 }}>Relaciones Públicas</h2>
          <p style={{ fontSize:12,color:'var(--text-secondary)' }}>{members.filter(m=>m.status==='active').length} activos · {members.length} total</p>
        </div>
        <div style={{ flex:1 }}/>
        {tab==='equipo'&&<button className="btn btn-primary" onClick={()=>setModal('create')}><Plus size={16}/>Nuevo Miembro</button>}
      </div>

      {/* Tabs */}
      <div style={{ display:'flex',gap:2,marginBottom:24,background:'rgba(139,92,246,0.06)',border:'1px solid var(--border-violet)',borderRadius:12,padding:4,width:'fit-content',flexWrap:'wrap' }}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{ padding:'9px 18px',borderRadius:9,fontSize:13,fontWeight:tab===t.id?700:400,background:tab===t.id?'rgba(139,92,246,0.2)':'transparent',color:tab===t.id?'var(--primary-violet-light)':'var(--text-secondary)',border:tab===t.id?'1px solid rgba(139,92,246,0.4)':'1px solid transparent',transition:'all 0.2s',cursor:'pointer',whiteSpace:'nowrap' }}>{t.icon} {t.label}</button>
        ))}
      </div>

      {tab === 'equipo' && (
        <div>
          {/* Filters */}
          <div style={{ display:'flex',gap:10,marginBottom:20,flexWrap:'wrap' }}>
            <div style={{ position:'relative',flex:1,minWidth:180 }}>
              <Search size={14} style={{ position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'var(--text-secondary)' }}/>
              <input className="input-field" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar..." style={{ paddingLeft:36 }}/>
            </div>
            <select className="select-field" style={{ width:'auto' }} value={fCat} onChange={e=>setFCat(e.target.value)}>
              <option value="all">Todas categorías</option>
              {Object.entries(CAT_CFG).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
            </select>
            <select className="select-field" style={{ width:'auto' }} value={fType} onChange={e=>setFType(e.target.value)}>
              <option value="all">Todos los tipos</option>
              {Object.entries(TYPE_CFG).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
            </select>
            <select className="select-field" style={{ width:'auto' }} value={fCity} onChange={e=>setFCity(e.target.value)}>
              <option value="all">Todas las ciudades</option>
              {cities.map(c=><option key={c}>{c}</option>)}
            </select>
            <select className="select-field" style={{ width:'auto' }} value={fCountry} onChange={e=>setFCountry(e.target.value)}>
              <option value="all">Todos los países</option>
              {countries.map(c=><option key={c}>{c}</option>)}
            </select>
          </div>

          <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
            {filtered.map(m=>{
              const cat = CAT_CFG[m.category]
              const typ = TYPE_CFG[m.type]
              return (
                <div key={m.id} className="card" style={{ padding:'14px 18px',display:'flex',alignItems:'center',gap:14,cursor:'pointer' }}
                  onClick={()=>setDetailMember(m)}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--primary-violet)';e.currentTarget.style.boxShadow='var(--glow-violet-sm)'}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--border-violet)';e.currentTarget.style.boxShadow='none'}}
                >
                  <div style={{ width:44,height:44,borderRadius:12,background:`${cat.color}22`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0 }}>{cat.icon}</div>
                  <div style={{ flex:1,minWidth:0 }}>
                    <div style={{ fontSize:14,fontWeight:700 }}>{m.firstName} {m.lastName}</div>
                    <div style={{ fontSize:11,color:'var(--text-secondary)' }}>{m.instagram} · {m.city}, {m.country}</div>
                    <div style={{ display:'flex',gap:6,marginTop:4,flexWrap:'wrap' }}>
                      <span style={{ fontSize:10,padding:'2px 7px',borderRadius:10,background:cat.bg,color:cat.color,border:`1px solid ${cat.color}33` }}>{cat.label}</span>
                      <span style={{ fontSize:10,padding:'2px 7px',borderRadius:10,background:`${typ.color}15`,color:typ.color,border:`1px solid ${typ.color}33` }}>{typ.label}</span>
                      <span style={{ fontSize:10,padding:'2px 7px',borderRadius:10,background:m.status==='active'?'rgba(74,222,128,0.1)':'rgba(248,113,113,0.1)',color:m.status==='active'?'#4ADE80':'#F87171',border:`1px solid ${m.status==='active'?'rgba(74,222,128,0.3)':'rgba(248,113,113,0.3)'}` }}>{m.status==='active'?'Activo':'Inactivo'}</span>
                    </div>
                  </div>
                  <div style={{ textAlign:'right',flexShrink:0 }}>
                    <div style={{ fontSize:14,fontWeight:700,color:'#4ADE80' }}>{fmtMoney(m.sales?.revenue||0)}</div>
                    <div style={{ fontSize:11,color:'var(--text-secondary)' }}>{m.sales?.ticketsSold||0} tickets</div>
                  </div>
                  <div style={{ display:'flex',gap:4,flexShrink:0 }}>
                    <button onClick={e=>{e.stopPropagation();setModal(m)}} style={{ width:28,height:28,borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',color:'var(--primary-violet-light)',border:'1px solid var(--border-violet)',background:'rgba(139,92,246,0.08)' }}><Edit3 size={12}/></button>
                    <button onClick={e=>{e.stopPropagation();setConfirmDel(m)}} style={{ width:28,height:28,borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',color:'#F87171',border:'1px solid rgba(239,68,68,0.3)',background:'rgba(239,68,68,0.08)' }}><Trash2 size={12}/></button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {tab === 'ventas' && (
        <div>
          <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:12,marginBottom:20 }}>
            {[
              { l:'Revenue Total', v:fmtMoney(totalRevenue), c:'#4ADE80', icon:'💰' },
              { l:'Tickets Totales', v:totalTickets, c:'#8B5CF6', icon:'🎫' },
              { l:'Públicas Activas', v:members.filter(m=>m.status==='active').length, c:'#E879F9', icon:'⭐' },
            ].map(s=>(
              <div key={s.l} className="card" style={{ padding:14 }}>
                <div style={{ fontSize:20,marginBottom:4 }}>{s.icon}</div>
                <div style={{ fontSize:22,fontWeight:800,color:s.c }}>{s.v}</div>
                <div style={{ fontSize:11,color:'var(--text-secondary)' }}>{s.l}</div>
              </div>
            ))}
          </div>

          <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
            {[...members].sort((a,b)=>(b.sales?.revenue||0)-(a.sales?.revenue||0)).map((m,i)=>{
              const cat = CAT_CFG[m.category]
              const pct = totalRevenue > 0 ? Math.round((m.sales?.revenue||0)/totalRevenue*100) : 0
              return (
                <div key={m.id} className="card" style={{ padding:'14px 18px' }}>
                  <div style={{ display:'flex',alignItems:'center',gap:12,marginBottom:8 }}>
                    <span style={{ fontSize:12,color:'var(--text-secondary)',width:18,textAlign:'right' }}>#{i+1}</span>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13,fontWeight:700 }}>{m.firstName} {m.lastName}</div>
                      <div style={{ fontSize:11,color:'var(--text-secondary)' }}>{cat.label} · {m.city}</div>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontSize:15,fontWeight:700,color:'#4ADE80' }}>{fmtMoney(m.sales?.revenue||0)}</div>
                      <div style={{ fontSize:11,color:'var(--text-secondary)' }}>{m.sales?.ticketsSold||0} tickets</div>
                    </div>
                  </div>
                  <div style={{ height:5,borderRadius:3,background:'rgba(139,92,246,0.1)' }}>
                    <div style={{ height:'100%',width:`${pct}%`,background:`linear-gradient(90deg,${cat.color}88,${cat.color})`,borderRadius:3,transition:'width 0.5s' }}/>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {tab === 'calculo' && <CalcTab members={members.filter(m=>m.status==='active')}/>}

      {tab === 'eventos' && (
        <div style={{ display:'flex',flexDirection:'column',gap:16 }}>
          {DEMO_EVENTS.map(ev=>{
            const evMembers = members.filter(m=>m.status==='active').slice(0,3)
            return (
              <div key={ev.id} className="card" style={{ padding:20 }}>
                <div style={{ display:'flex',alignItems:'center',gap:12,marginBottom:14 }}>
                  <div style={{ width:40,height:40,borderRadius:12,background:'linear-gradient(135deg,rgba(139,92,246,0.2),rgba(232,121,249,0.15))',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18 }}>🎉</div>
                  <div>
                    <h3 style={{ fontSize:14,fontWeight:700 }}>{ev.name}</h3>
                    <div style={{ fontSize:11,color:'var(--text-secondary)' }}>{ev.city} · {new Date(ev.date).toLocaleDateString('es-AR',{day:'2-digit',month:'short',year:'numeric'})}</div>
                  </div>
                </div>
                <div style={{ display:'flex',gap:8,flexWrap:'wrap' }}>
                  {evMembers.map(m=>(
                    <div key={m.id} style={{ padding:'6px 12px',borderRadius:10,background:'rgba(139,92,246,0.08)',border:'1px solid var(--border-violet)',fontSize:12 }}>
                      {CAT_CFG[m.category]?.icon} {m.firstName} {m.lastName}
                    </div>
                  ))}
                  <button className="btn btn-ghost" style={{ fontSize:12,padding:'6px 12px' }}><Plus size={12}/>Agregar</button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
