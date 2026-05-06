import React, { useState, useMemo } from 'react'
import {
  Calendar, MapPin, Users, DollarSign, Ticket, Plus, Edit3, Trash2,
  X, Save, ChevronDown, Image, RefreshCw, Clock, TrendingUp,
  Wrench, Tag, Film, Music, BarChart3
} from 'lucide-react'

const fmtMoney = (n) => n >= 1000000 ? `$${(n/1000000).toFixed(1)}M` : n >= 1000 ? `$${(n/1000).toFixed(0)}K` : `$${n}`
const generateId = () => `${Date.now()}_${Math.random().toString(36).slice(2,7)}`
const F = ({ label, children }) => (
  <div>
    <label style={{ fontSize:12,fontWeight:500,color:'var(--text-secondary)',display:'block',marginBottom:6 }}>{label}</label>
    {children}
  </div>
)

const STATUS_CFG = {
  planning:  { label: 'Planificando', color: '#A78BFA', bg: 'rgba(167,139,250,0.15)', border: 'rgba(167,139,250,0.4)' },
  upcoming:  { label: 'Próximo',      color: '#FCD34D', bg: 'rgba(252,211,77,0.15)',  border: 'rgba(252,211,77,0.4)'  },
  ongoing:   { label: 'En curso',     color: '#4ADE80', bg: 'rgba(74,222,128,0.15)',  border: 'rgba(74,222,128,0.4)'  },
  completed: { label: 'Completado',   color: '#9CA3AF', bg: 'rgba(156,163,175,0.12)', border: 'rgba(156,163,175,0.3)' },
  cancelled: { label: 'Cancelado',    color: '#F87171', bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.3)'  },
}

const EVENT_EMPTY = {
  type:'massive', name:'', description:'', venue:'', address:'', city:'', country:'Argentina',
  date:'', timeStart:'20:00', timeEnd:'02:00', capacity:500, ticketsSold:0,
  status:'planning', budget:0, budgetSpent:0, isVip:false,
  ingresos:[], ganancias:{agencyPct:30,totalEstimated:0}, herramientas:[],
  promociones:'', contenido:'', tecnica:{sonido:'',luces:'',equipo:''}
}

// ─── Event Full Modal (click on card) ────────────────
const EventDetailModal = ({ event, onEdit, onClose }) => {
  const cfg = STATUS_CFG[event.status] || STATUS_CFG.planning
  const daysLeft = event.date ? Math.ceil((new Date(event.date) - new Date()) / 86400000) : null
  const soldPct = event.capacity > 0 ? Math.min(100, Math.round(event.ticketsSold / event.capacity * 100)) : 0

  const sections = [
    { label:'Ingresos', items: event.ingresos || [] },
    { label:'Herramientas', items: event.herramientas || [] },
  ]

  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',backdropFilter:'blur(8px)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:20 }} onClick={onClose}>
      <div style={{ width:'100%',maxWidth:680,background:'var(--bg-secondary)',border:'1px solid var(--border-violet)',borderRadius:20,maxHeight:'92vh',overflowY:'auto',boxShadow:'var(--glow-violet),0 40px 80px rgba(0,0,0,0.5)',animation:'fadeIn 0.3s ease' }} onClick={e=>e.stopPropagation()}>
        {/* Top banner */}
        <div style={{ position:'relative',height:120,background:'linear-gradient(135deg,rgba(139,92,246,0.3),rgba(232,121,249,0.2))',borderRadius:'20px 20px 0 0',overflow:'hidden',display:'flex',alignItems:'flex-end',padding:'0 24px 16px' }}>
          {event.imageUrl ? (
            <img src={event.imageUrl} alt="" style={{ position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',opacity:0.4 }}/>
          ) : (
            <div style={{ position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:40,opacity:0.3 }}>🎉</div>
          )}
          <div style={{ position:'relative',zIndex:1,flex:1 }}>
            <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:4 }}>
              <h2 style={{ fontSize:20,fontWeight:800,textShadow:'0 2px 10px rgba(0,0,0,0.5)' }}>{event.name}</h2>
              <span style={{ fontSize:11,padding:'3px 10px',borderRadius:12,background:cfg.bg,color:cfg.color,border:`1px solid ${cfg.border}`,fontWeight:600 }}>{cfg.label}</span>
              {event.isVip && <span style={{ fontSize:11,padding:'3px 10px',borderRadius:12,background:'rgba(252,211,77,0.2)',color:'#FCD34D',border:'1px solid rgba(252,211,77,0.4)',fontWeight:600 }}>⭐ VIP</span>}
            </div>
          </div>
          <button onClick={onClose} style={{ position:'absolute',top:12,right:12,width:32,height:32,borderRadius:10,background:'rgba(0,0,0,0.4)',display:'flex',alignItems:'center',justifyContent:'center',color:'white' }}><X size={16}/></button>
        </div>

        <div style={{ padding:'24px 28px',display:'flex',flexDirection:'column',gap:20 }}>
          {/* Info grid */}
          <div style={{ display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:10 }}>
            {[
              { l:'Venue', v:event.venue, icon:'🏟️' },
              { l:'Ciudad', v:`${event.city}${event.country?`, ${event.country}`:''}`, icon:'📍' },
              { l:'Fecha', v:event.date?new Date(event.date).toLocaleDateString('es-AR',{day:'2-digit',month:'long',year:'numeric'}):'—', icon:'📅' },
              { l:'Horario', v:`${event.timeStart||'—'} → ${event.timeEnd||'—'}`, icon:'🕗' },
            ].map(item=>(
              <div key={item.l} style={{ padding:'10px 14px',background:'rgba(139,92,246,0.06)',borderRadius:10,border:'1px solid var(--border-violet)' }}>
                <div style={{ fontSize:11,color:'var(--text-secondary)',marginBottom:3 }}>{item.icon} {item.l}</div>
                <div style={{ fontSize:13,fontWeight:600 }}>{item.v||'—'}</div>
              </div>
            ))}
          </div>

          {/* Tickets progress */}
          <div style={{ background:'rgba(139,92,246,0.06)',borderRadius:12,border:'1px solid var(--border-violet)',padding:'16px 18px' }}>
            <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10 }}>
              <span style={{ fontSize:13,fontWeight:700 }}>Tickets</span>
              <span style={{ fontSize:13,color:'var(--primary-violet-light)',fontWeight:700 }}>{event.ticketsSold} / {event.capacity}</span>
            </div>
            <div style={{ height:10,borderRadius:5,background:'rgba(139,92,246,0.12)',overflow:'hidden',marginBottom:8 }}>
              <div style={{ height:'100%',width:`${soldPct}%`,background:'linear-gradient(90deg,#8B5CF6,#E879F9)',borderRadius:5,transition:'width 0.5s ease' }}/>
            </div>
            <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8 }}>
              {[
                { l:'Vendidos', v:event.ticketsSold, c:'#4ADE80' },
                { l:'Disponibles', v:event.capacity-(event.ticketsSold||0), c:'#8B5CF6' },
                { l:'Ocupación', v:`${soldPct}%`, c:'#E879F9' },
              ].map(s=>(
                <div key={s.l} style={{ textAlign:'center',padding:'8px 6px',borderRadius:8,background:'rgba(139,92,246,0.05)' }}>
                  <div style={{ fontSize:16,fontWeight:800,color:s.c }}>{s.v}</div>
                  <div style={{ fontSize:10,color:'var(--text-secondary)' }}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Financiero */}
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:10 }}>
            <div style={{ padding:'14px 16px',background:'rgba(74,222,128,0.06)',borderRadius:10,border:'1px solid rgba(74,222,128,0.2)' }}>
              <div style={{ fontSize:11,color:'var(--text-secondary)' }}>Presupuesto Total</div>
              <div style={{ fontSize:20,fontWeight:800,color:'#4ADE80' }}>{fmtMoney(event.budget||0)}</div>
            </div>
            <div style={{ padding:'14px 16px',background:'rgba(248,113,113,0.06)',borderRadius:10,border:'1px solid rgba(248,113,113,0.2)' }}>
              <div style={{ fontSize:11,color:'var(--text-secondary)' }}>Gastado</div>
              <div style={{ fontSize:20,fontWeight:800,color:'#F87171' }}>{fmtMoney(event.budgetSpent||0)}</div>
            </div>
          </div>

          {event.description&&<p style={{ fontSize:13,color:'var(--text-secondary)',lineHeight:1.6 }}>{event.description}</p>}

          {event.contenido&&(
            <div style={{ padding:'12px 16px',background:'rgba(139,92,246,0.06)',borderRadius:10,border:'1px solid var(--border-violet)' }}>
              <div style={{ fontSize:12,fontWeight:600,marginBottom:4,color:'var(--primary-violet-light)' }}>🎬 Contenido</div>
              <div style={{ fontSize:12,color:'var(--text-secondary)' }}>{event.contenido}</div>
            </div>
          )}

          {(event.tecnica?.sonido||event.tecnica?.luces||event.tecnica?.equipo)&&(
            <div style={{ padding:'12px 16px',background:'rgba(139,92,246,0.06)',borderRadius:10,border:'1px solid var(--border-violet)' }}>
              <div style={{ fontSize:12,fontWeight:600,marginBottom:8,color:'var(--primary-violet-light)' }}>🔧 Técnica</div>
              {[{l:'Sonido',v:event.tecnica.sonido},{l:'Luces',v:event.tecnica.luces},{l:'Equipo',v:event.tecnica.equipo}].filter(x=>x.v).map(x=>(
                <div key={x.l} style={{ fontSize:12,color:'var(--text-secondary)',marginBottom:2 }}><span style={{ color:'var(--text-primary)',fontWeight:500 }}>{x.l}:</span> {x.v}</div>
              ))}
            </div>
          )}

          {/* Countdown */}
          {daysLeft !== null && daysLeft > 0 && (
            <div style={{ padding:'12px 16px',background:'rgba(252,211,77,0.06)',borderRadius:10,border:'1px solid rgba(252,211,77,0.25)',display:'flex',alignItems:'center',gap:12 }}>
              <Clock size={18} color="#FCD34D"/>
              <span style={{ fontSize:13,color:'#FCD34D',fontWeight:600 }}>Faltan {daysLeft} días para el evento</span>
            </div>
          )}
        </div>

        <div style={{ padding:'14px 28px',borderTop:'1px solid var(--border-violet)',display:'flex',gap:8,justifyContent:'flex-end' }}>
          <button className="btn btn-ghost" onClick={onClose}>Cerrar</button>
          <button className="btn btn-primary" onClick={()=>{onClose();onEdit(event)}}><Edit3 size={14}/>Editar</button>
        </div>
      </div>
    </div>
  )
}

// ─── Event Edit Modal ─────────────────────────────
const EventModal = ({ event, onSave, onClose }) => {
  const [form, setForm] = useState(event || EVENT_EMPTY)
  const [tab, setTab] = useState('general')
  const set = (f, v) => setForm(p => ({ ...p, [f]: v }))
  const setNested = (obj, f, v) => setForm(p => ({ ...p, [obj]: { ...(p[obj]||{}), [f]: v } }))

  const handleSave = () => {
    if (!form.name.trim()) return
    onSave({ ...form, id: event?.id || generateId(), createdAt: event?.createdAt || new Date().toISOString() })
  }

  const TABS = [
    { id:'general', label:'General', icon:'🎉' },
    { id:'ingresos', label:'Ingresos', icon:'💰' },
    { id:'ganancias', label:'Ganancias', icon:'📈' },
    { id:'herramientas', label:'Herramientas', icon:'🔧' },
    { id:'promociones', label:'Promociones', icon:'📣' },
    { id:'contenido', label:'Contenido', icon:'🎬' },
    { id:'tecnica', label:'Técnica', icon:'🎛️' },
  ]

  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',backdropFilter:'blur(8px)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:20 }} onClick={onClose}>
      <div style={{ width:'100%',maxWidth:680,background:'var(--bg-secondary)',border:'1px solid var(--border-violet)',borderRadius:20,maxHeight:'92vh',display:'flex',flexDirection:'column',boxShadow:'var(--glow-violet),0 40px 80px rgba(0,0,0,0.5)',animation:'fadeIn 0.3s ease' }} onClick={e=>e.stopPropagation()}>
        <div style={{ padding:'20px 28px',borderBottom:'1px solid var(--border-violet)',display:'flex',alignItems:'center',gap:12 }}>
          <div style={{ width:40,height:40,borderRadius:12,background:'linear-gradient(135deg,var(--primary-violet),var(--accent-magenta))',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18 }}>🎉</div>
          <div><h2 style={{ fontSize:16,fontWeight:700 }}>{event?'Editar Evento':'Nuevo Evento'}</h2></div>
          <button onClick={onClose} style={{ marginLeft:'auto',color:'var(--text-secondary)',padding:6 }}><X size={20}/></button>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex',overflowX:'auto',borderBottom:'1px solid var(--border-violet)',padding:'0 20px',gap:2,flexShrink:0 }}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{ padding:'10px 14px',fontSize:12,fontWeight:tab===t.id?700:400,color:tab===t.id?'var(--primary-violet-light)':'var(--text-secondary)',borderBottom:`2px solid ${tab===t.id?'var(--primary-violet)':'transparent'}`,whiteSpace:'nowrap',transition:'all 0.2s',cursor:'pointer' }}>{t.icon} {t.label}</button>
          ))}
        </div>

        <div style={{ flex:1,overflowY:'auto',padding:'20px 28px' }}>
          {tab==='general'&&(
            <div style={{ display:'flex',flexDirection:'column',gap:14 }}>
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
                <F label="Nombre *"><input className="input-field" value={form.name} onChange={e=>set('name',e.target.value)} placeholder="Resilio Members Night"/></F>
                <F label="Tipo"><select className="select-field" value={form.type} onChange={e=>set('type',e.target.value)}>{['massive','vip','private','festival','corporate'].map(t=><option key={t} value={t}>{t}</option>)}</select></F>
              </div>
              <F label="Descripción"><textarea className="input-field" value={form.description} onChange={e=>set('description',e.target.value)} rows={2} style={{ resize:'vertical' }}/></F>
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
                <F label="Venue"><input className="input-field" value={form.venue} onChange={e=>set('venue',e.target.value)} placeholder="Club Niceto"/></F>
                <F label="Ciudad"><input className="input-field" value={form.city} onChange={e=>set('city',e.target.value)} placeholder="Buenos Aires"/></F>
              </div>
              <F label="Dirección"><input className="input-field" value={form.address} onChange={e=>set('address',e.target.value)}/></F>
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12 }}>
                <F label="Fecha"><input className="input-field" type="date" value={form.date} onChange={e=>set('date',e.target.value)}/></F>
                <F label="Hora inicio"><input className="input-field" type="time" value={form.timeStart} onChange={e=>set('timeStart',e.target.value)}/></F>
                <F label="Hora fin"><input className="input-field" type="time" value={form.timeEnd} onChange={e=>set('timeEnd',e.target.value)}/></F>
              </div>
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12 }}>
                <F label="Capacidad"><input className="input-field" type="number" value={form.capacity} onChange={e=>set('capacity',+e.target.value)}/></F>
                <F label="Tickets Vendidos"><input className="input-field" type="number" value={form.ticketsSold} onChange={e=>set('ticketsSold',+e.target.value)}/></F>
                <F label="Estado"><select className="select-field" value={form.status} onChange={e=>set('status',e.target.value)}>{Object.entries(STATUS_CFG).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</select></F>
              </div>
              <div style={{ display:'flex',alignItems:'center',gap:10 }}>
                <input type="checkbox" id="isVip" checked={form.isVip||false} onChange={e=>set('isVip',e.target.checked)} style={{ width:16,height:16,accentColor:'var(--primary-violet)' }}/>
                <label htmlFor="isVip" style={{ fontSize:13,cursor:'pointer' }}>⭐ Evento VIP (Only Members)</label>
              </div>
              <F label="Imagen del evento (URL)"><input className="input-field" value={form.imageUrl||''} onChange={e=>set('imageUrl',e.target.value)} placeholder="https://..."/></F>
            </div>
          )}

          {tab==='ingresos'&&(
            <div style={{ display:'flex',flexDirection:'column',gap:12 }}>
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
                <F label="Presupuesto Total ($)"><input className="input-field" type="number" value={form.budget||0} onChange={e=>set('budget',+e.target.value)}/></F>
                <F label="Gastado ($)"><input className="input-field" type="number" value={form.budgetSpent||0} onChange={e=>set('budgetSpent',+e.target.value)}/></F>
              </div>
              <F label="Revenue estimado por tickets ($)"><input className="input-field" type="number" value={form.revenueEstimated||0} onChange={e=>set('revenueEstimated',+e.target.value)}/></F>
              <F label="Notas de ingresos"><textarea className="input-field" value={form.ingresosNotes||''} onChange={e=>set('ingresosNotes',e.target.value)} rows={3} style={{ resize:'vertical' }} placeholder="Detalles de entradas, sponsors..."/></F>
            </div>
          )}

          {tab==='ganancias'&&(
            <div style={{ display:'flex',flexDirection:'column',gap:12 }}>
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
                <F label="% Agencia / Productora"><input className="input-field" type="number" min={0} max={100} value={form.ganancias?.agencyPct||30} onChange={e=>setNested('ganancias','agencyPct',+e.target.value)}/></F>
                <F label="Revenue estimado total ($)"><input className="input-field" type="number" value={form.ganancias?.totalEstimated||0} onChange={e=>setNested('ganancias','totalEstimated',+e.target.value)}/></F>
              </div>
              <div style={{ padding:'14px 16px',background:'rgba(74,222,128,0.06)',borderRadius:12,border:'1px solid rgba(74,222,128,0.2)' }}>
                <div style={{ fontSize:12,color:'var(--text-secondary)',marginBottom:4 }}>Ganancia estimada</div>
                <div style={{ fontSize:24,fontWeight:800,color:'#4ADE80' }}>{fmtMoney(Math.round((form.ganancias?.totalEstimated||0)*(form.ganancias?.agencyPct||30)/100))}</div>
              </div>
              <F label="Notas de ganancias"><textarea className="input-field" value={form.gananciasNotes||''} onChange={e=>set('gananciasNotes',e.target.value)} rows={3} style={{ resize:'vertical' }}/></F>
            </div>
          )}

          {tab==='herramientas'&&(
            <div style={{ display:'flex',flexDirection:'column',gap:12 }}>
              <F label="Plataforma de tickets"><input className="input-field" value={form.ticketPlatform||''} onChange={e=>set('ticketPlatform',e.target.value)} placeholder="Passline, Eventbrite..."/></F>
              <F label="Herramientas de marketing"><textarea className="input-field" value={form.marketingTools||''} onChange={e=>set('marketingTools',e.target.value)} rows={2} style={{ resize:'vertical' }} placeholder="Mailchimp, Instagram Ads..."/></F>
              <F label="Software de gestión"><input className="input-field" value={form.managementTools||''} onChange={e=>set('managementTools',e.target.value)}/></F>
              <F label="Links importantes"><textarea className="input-field" value={form.importantLinks||''} onChange={e=>set('importantLinks',e.target.value)} rows={2} style={{ resize:'vertical' }}/></F>
            </div>
          )}

          {tab==='promociones'&&(
            <div style={{ display:'flex',flexDirection:'column',gap:12 }}>
              <F label="Estrategia de promoción"><textarea className="input-field" value={form.promociones||''} onChange={e=>set('promociones',e.target.value)} rows={4} style={{ resize:'vertical' }} placeholder="RRSS, influencers, email marketing..."/></F>
              <F label="Descuentos y promos especiales"><textarea className="input-field" value={form.promoDeals||''} onChange={e=>set('promoDeals',e.target.value)} rows={3} style={{ resize:'vertical' }}/></F>
              <F label="Fecha inicio promoción"><input className="input-field" type="date" value={form.promoStart||''} onChange={e=>set('promoStart',e.target.value)}/></F>
            </div>
          )}

          {tab==='contenido'&&(
            <div style={{ display:'flex',flexDirection:'column',gap:12 }}>
              <F label="Plan de contenido"><textarea className="input-field" value={form.contenido||''} onChange={e=>set('contenido',e.target.value)} rows={4} style={{ resize:'vertical' }} placeholder="Posts, stories, reels, cobertura en vivo..."/></F>
              <F label="Fotógrafo/Videomaker"><input className="input-field" value={form.mediaContact||''} onChange={e=>set('mediaContact',e.target.value)}/></F>
              <F label="Hashtags"><input className="input-field" value={form.hashtags||''} onChange={e=>set('hashtags',e.target.value)} placeholder="#resiliolife #event..."/></F>
            </div>
          )}

          {tab==='tecnica'&&(
            <div style={{ display:'flex',flexDirection:'column',gap:12 }}>
              <F label="Sistema de Sonido"><textarea className="input-field" value={form.tecnica?.sonido||''} onChange={e=>setNested('tecnica','sonido',e.target.value)} rows={2} style={{ resize:'vertical' }} placeholder="PA principal, monitores, consola..."/></F>
              <F label="Iluminación"><textarea className="input-field" value={form.tecnica?.luces||''} onChange={e=>setNested('tecnica','luces',e.target.value)} rows={2} style={{ resize:'vertical' }} placeholder="Moving heads, wash, strobes..."/></F>
              <F label="Equipamiento general"><textarea className="input-field" value={form.tecnica?.equipo||''} onChange={e=>setNested('tecnica','equipo',e.target.value)} rows={2} style={{ resize:'vertical' }} placeholder="DJ booth, escenario, backline..."/></F>
              <F label="Proveedor técnico"><input className="input-field" value={form.tecnica?.proveedor||''} onChange={e=>setNested('tecnica','proveedor',e.target.value)}/></F>
            </div>
          )}
        </div>

        <div style={{ padding:'14px 28px',borderTop:'1px solid var(--border-violet)',display:'flex',gap:10,justifyContent:'flex-end',flexShrink:0 }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSave}><Save size={14}/>{event?'Guardar Cambios':'Crear Evento'}</button>
        </div>
      </div>
    </div>
  )
}

// ─── Event Card ────────────────────────────────────
const EventCard = ({ event, onClick, onEdit, onDelete }) => {
  const cfg = STATUS_CFG[event.status] || STATUS_CFG.planning
  const daysLeft = event.date ? Math.ceil((new Date(event.date) - new Date()) / 86400000) : null
  const timeProgress = event.date ? Math.max(0, Math.min(100, 100 - (daysLeft / 90 * 100))) : 50
  const soldPct = event.capacity > 0 ? Math.min(100, Math.round(event.ticketsSold / event.capacity * 100)) : 0

  return (
    <div
      style={{ background:'var(--glass-bg)',backdropFilter:'blur(40px)',border:'1px solid var(--border-violet)',borderRadius:16,overflow:'hidden',transition:'all 0.3s',cursor:'pointer' }}
      onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-4px)';e.currentTarget.style.boxShadow='var(--glow-violet)';e.currentTarget.style.borderColor='var(--primary-violet)'}}
      onMouseLeave={e=>{e.currentTarget.style.transform='none';e.currentTarget.style.boxShadow='none';e.currentTarget.style.borderColor='var(--border-violet)'}}
      onClick={() => onClick(event)}
    >
      <div style={{ display:'flex',gap:0 }}>
        {/* Image 4:5 */}
        <div style={{ width:80,flexShrink:0,background:`linear-gradient(135deg,${cfg.bg.replace('0.15','0.4')},rgba(232,121,249,0.2))`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:28,borderRight:'1px solid var(--border-violet)',position:'relative',minHeight:110 }}>
          {event.imageUrl ? (
            <img src={event.imageUrl} alt="" style={{ width:'100%',height:'100%',objectFit:'cover',position:'absolute',inset:0 }}/>
          ) : '🎉'}
          {event.isVip && <div style={{ position:'absolute',top:6,left:6,fontSize:10,padding:'2px 6px',borderRadius:8,background:'rgba(252,211,77,0.8)',color:'#000',fontWeight:700 }}>VIP</div>}
        </div>

        {/* Content */}
        <div style={{ flex:1,padding:'14px 16px' }}>
          <div style={{ display:'flex',alignItems:'flex-start',gap:8,marginBottom:6 }}>
            <div style={{ flex:1,minWidth:0 }}>
              <h3 style={{ fontSize:14,fontWeight:700,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',marginBottom:2 }}>{event.name}</h3>
              <div style={{ fontSize:11,color:'var(--text-secondary)',display:'flex',alignItems:'center',gap:6 }}>
                <MapPin size={10}/>{event.city||event.venue}
                {event.date&&<>· <Calendar size={10}/>{new Date(event.date).toLocaleDateString('es-AR',{day:'2-digit',month:'short'})}</>}
              </div>
            </div>
            <div style={{ display:'flex',gap:4,flexShrink:0 }}>
              <span style={{ fontSize:10,padding:'2px 8px',borderRadius:10,background:cfg.bg,color:cfg.color,fontWeight:600 }}>{cfg.label}</span>
            </div>
          </div>

          <div style={{ display:'flex',gap:10,fontSize:11,color:'var(--text-secondary)',marginBottom:8,flexWrap:'wrap' }}>
            <span><Users size={10} style={{ display:'inline',verticalAlign:'middle' }}/> {event.ticketsSold}/{event.capacity}</span>
            {event.budget&&<span><DollarSign size={10} style={{ display:'inline',verticalAlign:'middle' }}/>{fmtMoney(event.budget)}</span>}
            {daysLeft !== null && <span style={{ color: daysLeft <= 7 ? '#F87171' : 'inherit' }}><Clock size={10} style={{ display:'inline',verticalAlign:'middle' }}/> {daysLeft > 0 ? `${daysLeft}d` : 'Hoy'}</span>}
          </div>

          <div style={{ display:'flex',gap:4,justifyContent:'flex-end' }}>
            <button onClick={e=>{e.stopPropagation();onEdit(event)}} style={{ width:26,height:26,borderRadius:7,display:'flex',alignItems:'center',justifyContent:'center',color:'var(--primary-violet-light)',border:'1px solid var(--border-violet)',background:'rgba(139,92,246,0.08)' }}><Edit3 size={11}/></button>
            <button onClick={e=>{e.stopPropagation();onDelete(event)}} style={{ width:26,height:26,borderRadius:7,display:'flex',alignItems:'center',justifyContent:'center',color:'#F87171',border:'1px solid rgba(239,68,68,0.3)',background:'rgba(239,68,68,0.08)' }}><Trash2 size={11}/></button>
          </div>
        </div>
      </div>

      {/* Single bottom progress bar */}
      <div style={{ height:4,background:'rgba(139,92,246,0.1)' }}>
        <div style={{ height:'100%',width:`${timeProgress}%`,background:`linear-gradient(90deg,${cfg.color}88,${cfg.color})`,transition:'width 0.5s ease' }}/>
      </div>
    </div>
  )
}

// ─── Dashboard ─────────────────────────────────────
const EventsDashboard = ({ events }) => {
  const active = events.filter(e=>e.status==='ongoing').length
  const upcoming = events.filter(e=>e.status==='upcoming'||e.status==='planning').length
  const completed = events.filter(e=>e.status==='completed').length
  const totalRev = events.reduce((a,e)=>a+(e.budget||0),0)
  const avgOcc = events.length > 0 ? Math.round(events.reduce((a,e)=>a+(e.capacity>0?e.ticketsSold/e.capacity:0),0)/events.length*100) : 0

  return (
    <div style={{ display:'flex',flexDirection:'column',gap:16,marginBottom:24 }}>
      <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:12 }}>
        {[
          { l:'Revenue Total', v:fmtMoney(totalRev), c:'#4ADE80', bg:'rgba(74,222,128,0.12)', icon:'💰' },
          { l:'En curso', v:active, c:'#4ADE80', bg:'rgba(74,222,128,0.08)', icon:'🎉' },
          { l:'Próximos', v:upcoming, c:'#FCD34D', bg:'rgba(252,211,77,0.08)', icon:'📅' },
          { l:'Completados', v:completed, c:'#9CA3AF', bg:'rgba(156,163,175,0.08)', icon:'✅' },
          { l:'Ocup. Promedio', v:`${avgOcc}%`, c:'#8B5CF6', bg:'rgba(139,92,246,0.08)', icon:'🎫' },
        ].map(s=>(
          <div key={s.l} className="card" style={{ padding:14,background:s.bg }}>
            <div style={{ fontSize:20,marginBottom:4 }}>{s.icon}</div>
            <div style={{ fontSize:20,fontWeight:800,color:s.c }}>{s.v}</div>
            <div style={{ fontSize:11,color:'var(--text-secondary)' }}>{s.l}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main Export ────────────────────────────────────
export default function EventsView({ events, sponsors, tickets, onSaveEvent, onDeleteEvent }) {
  const [modal, setModal] = useState(null)
  const [detail, setDetail] = useState(null)
  const [search, setSearch] = useState('')
  const [fStatus, setFStatus] = useState('all')
  const [fCity, setFCity] = useState('all')
  const [showDeleted, setShowDeleted] = useState(false)
  const [deletedEvents, setDeletedEvents] = useState([])

  const cities = [...new Set((events||[]).map(e=>e.city).filter(Boolean))]

  const filtered = (events||[]).filter(e => {
    if (showDeleted) return false
    const ms = e.name.toLowerCase().includes(search.toLowerCase()) || (e.city||'').toLowerCase().includes(search.toLowerCase())
    return ms && (fStatus==='all'||e.status===fStatus) && (fCity==='all'||e.city===fCity)
  })

  const handleDelete = (event) => {
    setDeletedEvents(p => [...p, event])
    onDeleteEvent && onDeleteEvent(event.id)
  }

  const handleRestore = (event) => {
    setDeletedEvents(p => p.filter(e => e.id !== event.id))
    onSaveEvent && onSaveEvent(event)
  }

  return (
    <div style={{ padding:24,animation:'fadeIn 0.3s ease' }}>
      <div style={{ display:'flex',alignItems:'center',gap:12,marginBottom:20,flexWrap:'wrap' }}>
        <div>
          <h2 style={{ fontSize:20,fontWeight:700 }}>Productora · Eventos</h2>
          <p style={{ fontSize:12,color:'var(--text-secondary)' }}>{(events||[]).length} eventos</p>
        </div>
        <div style={{ flex:1 }}/>
        <button className="btn btn-ghost" style={{ fontSize:12 }} onClick={()=>setShowDeleted(p=>!p)}>
          <RefreshCw size={13}/>{showDeleted ? 'Ver activos' : 'Recuperar eliminados'}
          {deletedEvents.length > 0 && <span style={{ marginLeft:4,padding:'1px 6px',borderRadius:10,background:'rgba(248,113,113,0.2)',color:'#F87171',fontSize:10 }}>{deletedEvents.length}</span>}
        </button>
        <button className="btn btn-primary" onClick={()=>setModal('create')}><Plus size={16}/>Nuevo Evento</button>
      </div>

      <EventsDashboard events={events||[]}/>

      {/* Filters */}
      <div style={{ display:'flex',gap:10,marginBottom:20,flexWrap:'wrap' }}>
        <div style={{ position:'relative',flex:1,minWidth:200 }}>
          <input className="input-field" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar eventos..." style={{ paddingLeft:36 }}/>
        </div>
        <select className="select-field" style={{ width:'auto',minWidth:140 }} value={fStatus} onChange={e=>setFStatus(e.target.value)}>
          <option value="all">Todos los estados</option>
          {Object.entries(STATUS_CFG).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
        </select>
        <select className="select-field" style={{ width:'auto',minWidth:130 }} value={fCity} onChange={e=>setFCity(e.target.value)}>
          <option value="all">Todas las ciudades</option>
          {cities.map(c=><option key={c}>{c}</option>)}
        </select>
      </div>

      {showDeleted ? (
        <div>
          <h3 style={{ fontSize:14,fontWeight:600,marginBottom:12,color:'var(--text-secondary)' }}>Eventos eliminados ({deletedEvents.length})</h3>
          {deletedEvents.length === 0 ? (
            <div className="empty-state"><RefreshCw size={28} color="var(--primary-violet)"/><p style={{ color:'var(--text-secondary)' }}>Sin eventos eliminados</p></div>
          ) : (
            <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
              {deletedEvents.map(e=>(
                <div key={e.id} style={{ display:'flex',alignItems:'center',gap:12,padding:'12px 16px',background:'rgba(248,113,113,0.06)',border:'1px solid rgba(248,113,113,0.2)',borderRadius:12 }}>
                  <div style={{ flex:1 }}><div style={{ fontSize:13,fontWeight:600 }}>{e.name}</div><div style={{ fontSize:11,color:'var(--text-secondary)' }}>{e.city}</div></div>
                  <button className="btn btn-ghost" style={{ fontSize:12 }} onClick={()=>handleRestore(e)}><RefreshCw size={13}/>Restaurar</button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state"><Calendar size={32} color="var(--primary-violet)"/><h3>Sin eventos</h3><p style={{ color:'var(--text-secondary)' }}>Crea tu primer evento</p></div>
      ) : (
        <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(340px,1fr))',gap:14 }}>
          {filtered.map(ev=>(
            <EventCard
              key={ev.id}
              event={ev}
              onClick={setDetail}
              onEdit={e=>{setDetail(null);setModal(e)}}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {detail && <EventDetailModal event={detail} onEdit={e=>{setDetail(null);setModal(e)}} onClose={()=>setDetail(null)}/>}
      {modal && <EventModal event={modal==='create'?null:modal} onSave={data=>{onSaveEvent&&onSaveEvent(data);setModal(null)}} onClose={()=>setModal(null)}/>}
    </div>
  )
}
