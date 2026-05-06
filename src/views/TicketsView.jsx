import React, { useState, useMemo } from 'react'
import { Ticket, Plus, Edit3, Trash2, X, Save, DollarSign, Users, Search, TrendingUp } from 'lucide-react'

const fmtMoney = (n) => n >= 1000000 ? `$${(n/1000000).toFixed(1)}M` : n >= 1000 ? `$${(n/1000).toFixed(0)}K` : `$${n}`
const generateId = () => `${Date.now()}_${Math.random().toString(36).slice(2,7)}`

const LOTE_TYPES = {
  early_bird: { label:'⚡ Early Bird', color:'#22D3EE' },
  general:    { label:'🎟 General', color:'#8B5CF6' },
  vip:        { label:'⭐ VIP', color:'#FCD34D' },
  fan:        { label:'🔥 Fan Zone', color:'#E879F9' },
}

const EMPTY_LOTE = { type:'general', name:'', price:0, capacity:100, sold:0, status:'active' }

export default function TicketsView({ events, tickets, onSave }) {
  const [selectedEvent, setSelectedEvent] = useState('')
  const [lotes, setLotes] = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [newLote, setNewLote] = useState(EMPTY_LOTE)
  const [loteEdits, setLoteEdits] = useState({})
  const [fCity, setFCity] = useState('all')
  const [search, setSearch] = useState('')

  const cities = [...new Set((events||[]).map(e=>e.city).filter(Boolean))]
  const filteredEvents = (events||[]).filter(e=>{
    const ms = e.name.toLowerCase().includes(search.toLowerCase())
    return ms && (fCity==='all'||e.city===fCity)
  })

  const currentEvent = (events||[]).find(e=>e.id===selectedEvent)

  const savedLotes = useMemo(()=>{
    if (!selectedEvent) return []
    const saved = (tickets||[]).filter(t=>t.eventId===selectedEvent)
    return saved.length > 0 ? saved : [
      { id:'l1',eventId:selectedEvent,type:'early_bird',name:'Early Bird',price:2500,capacity:100,sold:78,status:'active' },
      { id:'l2',eventId:selectedEvent,type:'general',name:'General',price:4000,capacity:300,sold:145,status:'active' },
      { id:'l3',eventId:selectedEvent,type:'vip',name:'VIP',price:8000,capacity:50,sold:34,status:'active' },
    ]
  }, [selectedEvent, tickets])

  const allLotes = [...savedLotes, ...lotes]

  const getLoteVal = (lote, field) => loteEdits[lote.id]?.[field] ?? lote[field]
  const editLote = (id, field, val) => setLoteEdits(p=>({...p,[id]:{...(p[id]||{}),[field]:val}}))

  const totalCapacity = allLotes.reduce((a,l)=>a+(getLoteVal(l,'capacity')||0),0)
  const totalSold = allLotes.reduce((a,l)=>a+(getLoteVal(l,'sold')||0),0)
  const totalRevenue = allLotes.reduce((a,l)=>a+(getLoteVal(l,'sold')||0)*(l.price||0),0)
  const totalEstimated = allLotes.reduce((a,l)=>a+(getLoteVal(l,'capacity')||0)*(l.price||0),0)

  const addLote = () => {
    if (!newLote.name.trim()) return
    setLotes(p=>[...p,{...newLote,id:generateId(),eventId:selectedEvent}])
    setNewLote(EMPTY_LOTE)
    setShowAdd(false)
  }

  return (
    <div style={{ padding:24,animation:'fadeIn 0.3s ease' }}>
      <div style={{ display:'flex',alignItems:'center',gap:12,marginBottom:20,flexWrap:'wrap' }}>
        <div>
          <h2 style={{ fontSize:20,fontWeight:700 }}>Tickets</h2>
          <p style={{ fontSize:12,color:'var(--text-secondary)' }}>Gestión de lotes y ventas por evento</p>
        </div>
      </div>

      {/* Event Selector */}
      <div className="card" style={{ padding:20,marginBottom:20 }}>
        <div style={{ fontSize:13,fontWeight:700,marginBottom:12 }}>Seleccionar Evento</div>
        <div style={{ display:'flex',gap:10,marginBottom:12,flexWrap:'wrap' }}>
          <div style={{ position:'relative',flex:1,minWidth:200 }}>
            <Search size={14} style={{ position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'var(--text-secondary)' }}/>
            <input className="input-field" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar evento..." style={{ paddingLeft:36 }}/>
          </div>
          <select className="select-field" style={{ width:'auto',minWidth:140 }} value={fCity} onChange={e=>setFCity(e.target.value)}>
            <option value="all">Todas las ciudades</option>
            {cities.map(c=><option key={c}>{c}</option>)}
          </select>
        </div>
        <div style={{ display:'flex',gap:8,flexWrap:'wrap' }}>
          {filteredEvents.map(ev=>(
            <button key={ev.id} onClick={()=>{ setSelectedEvent(ev.id); setLoteEdits({}) }} style={{ padding:'10px 16px',borderRadius:12,border:`1px solid ${selectedEvent===ev.id?'var(--primary-violet)':'var(--border-violet)'}`,background:selectedEvent===ev.id?'rgba(139,92,246,0.2)':'rgba(139,92,246,0.05)',fontSize:13,fontWeight:selectedEvent===ev.id?700:400,color:selectedEvent===ev.id?'var(--primary-violet-light)':'var(--text-secondary)',transition:'all 0.2s',cursor:'pointer',display:'flex',alignItems:'center',gap:8 }}>
              <span>🎉</span>
              <span>{ev.name}</span>
              {ev.city&&<span style={{ fontSize:10,color:'var(--text-secondary)' }}>{ev.city}</span>}
            </button>
          ))}
          {filteredEvents.length === 0 && (
            <div style={{ fontSize:13,color:'var(--text-secondary)',padding:'10px 0' }}>No hay eventos disponibles</div>
          )}
        </div>
      </div>

      {selectedEvent && currentEvent ? (
        <div>
          {/* Stats */}
          <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:12,marginBottom:20 }}>
            {[
              { l:'Capacidad Total', v:totalCapacity, c:'#8B5CF6', icon:'👥' },
              { l:'Tickets Vendidos', v:totalSold, c:'#4ADE80', icon:'✅' },
              { l:'Disponibles', v:totalCapacity-totalSold, c:'#FCD34D', icon:'🎫' },
              { l:'Revenue Real', v:fmtMoney(totalRevenue), c:'#4ADE80', icon:'💰' },
              { l:'Revenue Estimado', v:fmtMoney(totalEstimated), c:'#22D3EE', icon:'📈' },
              { l:'Ocupación', v:totalCapacity>0?`${Math.round(totalSold/totalCapacity*100)}%`:'0%', c:'#E879F9', icon:'📊' },
            ].map(s=>(
              <div key={s.l} className="card" style={{ padding:14 }}>
                <div style={{ fontSize:20,marginBottom:4 }}>{s.icon}</div>
                <div style={{ fontSize:20,fontWeight:800,color:s.c }}>{s.v}</div>
                <div style={{ fontSize:11,color:'var(--text-secondary)' }}>{s.l}</div>
              </div>
            ))}
          </div>

          {/* Lotes */}
          <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14 }}>
            <h3 style={{ fontSize:15,fontWeight:700 }}>Lotes de {currentEvent.name}</h3>
            <button className="btn btn-primary" style={{ fontSize:12 }} onClick={()=>setShowAdd(p=>!p)}><Plus size={14}/>Nuevo Lote</button>
          </div>

          {showAdd && (
            <div className="card" style={{ padding:20,marginBottom:14,border:'1px solid rgba(139,92,246,0.4)' }}>
              <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))',gap:12,marginBottom:12 }}>
                <div><label style={{ fontSize:12,color:'var(--text-secondary)',display:'block',marginBottom:6 }}>Tipo</label>
                  <select className="select-field" value={newLote.type} onChange={e=>setNewLote(p=>({...p,type:e.target.value}))}>
                    {Object.entries(LOTE_TYPES).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div><label style={{ fontSize:12,color:'var(--text-secondary)',display:'block',marginBottom:6 }}>Nombre</label><input className="input-field" value={newLote.name} onChange={e=>setNewLote(p=>({...p,name:e.target.value}))}/></div>
                <div><label style={{ fontSize:12,color:'var(--text-secondary)',display:'block',marginBottom:6 }}>Precio ($)</label><input className="input-field" type="number" value={newLote.price} onChange={e=>setNewLote(p=>({...p,price:+e.target.value}))}/></div>
                <div><label style={{ fontSize:12,color:'var(--text-secondary)',display:'block',marginBottom:6 }}>Capacidad</label><input className="input-field" type="number" value={newLote.capacity} onChange={e=>setNewLote(p=>({...p,capacity:+e.target.value}))}/></div>
              </div>
              <div style={{ display:'flex',gap:8 }}>
                <button className="btn btn-primary" style={{ fontSize:12 }} onClick={addLote}><Save size={13}/>Agregar Lote</button>
                <button className="btn btn-ghost" style={{ fontSize:12 }} onClick={()=>setShowAdd(false)}>Cancelar</button>
              </div>
            </div>
          )}

          <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
            {allLotes.map(lote=>{
              const cfg = LOTE_TYPES[lote.type] || LOTE_TYPES.general
              const pct = lote.capacity > 0 ? Math.min(100, Math.round(lote.sold/lote.capacity*100)) : 0
              return (
                <div key={lote.id} className="card" style={{ padding:'16px 20px' }}>
                  <div style={{ display:'flex',alignItems:'center',gap:12,marginBottom:10 }}>
                    <div style={{ padding:'4px 10px',borderRadius:10,background:`${cfg.color}22`,color:cfg.color,fontSize:12,fontWeight:600,border:`1px solid ${cfg.color}33` }}>{cfg.label}</div>
                    <span style={{ fontSize:14,fontWeight:700 }}>{lote.name}</span>
                    <div style={{ flex:1 }}/>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontSize:16,fontWeight:800,color:cfg.color }}>${(lote.price||0).toLocaleString()}</div>
                      <div style={{ fontSize:10,color:'var(--text-secondary)' }}>por ticket</div>
                    </div>
                  </div>
                  <div style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:10 }}>
                    {[
                      { l:'Capacidad', v:getLoteVal(lote,'capacity'), f:'capacity' },
                      { l:'Vendidos', v:getLoteVal(lote,'sold'), f:'sold' },
                      { l:'Disponibles', v:(getLoteVal(lote,'capacity')||0)-(getLoteVal(lote,'sold')||0) },
                      { l:'Revenue', v:fmtMoney((getLoteVal(lote,'sold')||0)*(lote.price||0)) },
                    ].map(s=>(
                      <div key={s.l} style={{ textAlign:'center',padding:'8px 4px',borderRadius:8,background:'rgba(139,92,246,0.07)',border:'1px solid rgba(139,92,246,0.1)' }}>
                        {s.f ? (
                          <input
                            type="number"
                            value={s.v}
                            onChange={e=>editLote(lote.id,s.f,+e.target.value)}
                            style={{ width:'100%',textAlign:'center',fontSize:14,fontWeight:700,color:'var(--primary-violet-light)',background:'transparent',border:'none',outline:'none' }}
                          />
                        ) : (
                          <div style={{ fontSize:14,fontWeight:700,color:'var(--primary-violet-light)' }}>{s.v}</div>
                        )}
                        <div style={{ fontSize:9,color:'var(--text-secondary)' }}>{s.l}</div>
                      </div>
                    ))}
                  </div>
                  <div>
                    <div style={{ display:'flex',justifyContent:'space-between',fontSize:10,color:'var(--text-secondary)',marginBottom:3 }}>
                      <span>Ocupación</span><span style={{ color:cfg.color,fontWeight:600 }}>{pct}%</span>
                    </div>
                    <div style={{ height:5,borderRadius:3,background:'rgba(139,92,246,0.1)' }}>
                      <div style={{ height:'100%',width:`${pct}%`,background:`linear-gradient(90deg,${cfg.color}88,${cfg.color})`,borderRadius:3,transition:'width 0.5s' }}/>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Total summary */}
          {allLotes.length > 0 && (
            <div style={{ marginTop:16,padding:'16px 20px',background:'rgba(74,222,128,0.06)',border:'1px solid rgba(74,222,128,0.2)',borderRadius:14 }}>
              <div style={{ display:'flex',gap:20,flexWrap:'wrap',alignItems:'center' }}>
                <div><div style={{ fontSize:11,color:'var(--text-secondary)' }}>Ganancia real</div><div style={{ fontSize:24,fontWeight:800,color:'#4ADE80' }}>{fmtMoney(totalRevenue)}</div></div>
                <div><div style={{ fontSize:11,color:'var(--text-secondary)' }}>Potencial máx.</div><div style={{ fontSize:24,fontWeight:800,color:'#22D3EE' }}>{fmtMoney(totalEstimated)}</div></div>
                <div><div style={{ fontSize:11,color:'var(--text-secondary)' }}>% completado</div><div style={{ fontSize:24,fontWeight:800,color:'#E879F9' }}>{totalEstimated>0?Math.round(totalRevenue/totalEstimated*100):0}%</div></div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="empty-state">
          <Ticket size={36} color="var(--primary-violet)"/>
          <h3 style={{ fontSize:16,fontWeight:600 }}>Selecciona un evento</h3>
          <p style={{ color:'var(--text-secondary)',fontSize:13 }}>Elige un evento para gestionar sus tickets y lotes</p>
        </div>
      )}
    </div>
  )
}
