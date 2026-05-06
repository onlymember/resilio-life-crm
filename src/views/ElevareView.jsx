import React, { useState, useMemo } from 'react'
import { Plus, Edit3, Trash2, X, Save, MapPin, DollarSign, Users, Star, TrendingUp, Building, Layers, Grid, List, Search, BarChart3, Calendar } from 'lucide-react'

const fmtMoney = (n, cur='$') => n>=1000000?`${cur}${(n/1000000).toFixed(1)}M`:n>=1000?`${cur}${(n/1000).toFixed(0)}K`:`${cur}${n}`
const fmtDate  = (d) => { if(!d) return '—'; const p=d.split('-'); return `${p[2]}/${p[1]}/${p[0].slice(2)}` }
const generateId = () => `${Date.now()}_${Math.random().toString(36).slice(2,7)}`
const F = ({ label, children, err: e }) => (
  <div>
    <label style={{ fontSize:12, fontWeight:500, color:'var(--text-secondary)', display:'block', marginBottom:6 }}>{label}</label>
    {children}
    {e && <span style={{ fontSize:11, color:'#F87171' }}>{e}</span>}
  </div>
)

// Updated categories: Motors added, PR/Events and Media removed
const UNIT_CFG = {
  real_estate:  { label:'Real Estate',   icon:'🏙',  color:'#FCD34D', bg:'rgba(252,211,77,0.15)',  border:'rgba(252,211,77,0.4)'  },
  development:  { label:'Developments',  icon:'🏗',  color:'#E879F9', bg:'rgba(232,121,249,0.15)', border:'rgba(232,121,249,0.4)' },
  motors:       { label:'Motors',        icon:'🚗',  color:'#F87171', bg:'rgba(248,113,113,0.15)', border:'rgba(248,113,113,0.4)' },
  b2b:          { label:'B2B Alliances', icon:'🤝',  color:'#4ADE80', bg:'rgba(74,222,128,0.15)',  border:'rgba(74,222,128,0.4)'  },
}

const STATUS_A = {
  available: { label:'Disponible', color:'#4ADE80' },
  reserved:  { label:'Reservado',  color:'#FCD34D' },
  sold:      { label:'Vendido',    color:'#9CA3AF' },
  active:    { label:'Activo',     color:'#8B5CF6' },
  contenido: { label:'Contenido',  color:'#60A5FA' },
}

const LEAD_STATUS = {
  new:       { label:'Nuevo',     color:'#60A5FA' },
  contacted: { label:'Contactado',color:'#A78BFA' },
  qualified: { label:'Calificado',color:'#FCD34D' },
  proposal:  { label:'Propuesta', color:'#E879F9' },
  closed:    { label:'Cerrado',   color:'#4ADE80' },
}

const INTEREST_CFG = {
  low:    { label:'Bajo',  color:'#9CA3AF' },
  medium: { label:'Medio', color:'#FCD34D' },
  high:   { label:'Alto',  color:'#4ADE80' },
}

const CONTRACT_STATUS = {
  draft:     { label:'Borrador',   color:'#9CA3AF' },
  sent:      { label:'Enviado',    color:'#60A5FA' },
  signed:    { label:'Firmado',    color:'#4ADE80' },
  completed: { label:'Completado', color:'#8B5CF6' },
}

const CONTENT_STATUS = {
  todo:      { label:'Por hacer',  color:'#9CA3AF', bg:'rgba(156,163,175,0.15)' },
  done:      { label:'Hecho',      color:'#4ADE80', bg:'rgba(74,222,128,0.15)'  },
  editing:   { label:'En edición', color:'#FCD34D', bg:'rgba(252,211,77,0.15)'  },
  uploaded:  { label:'Subido',     color:'#8B5CF6', bg:'rgba(139,92,246,0.15)'  },
}

// Demo data for new sections
const DEMO_CONTENIDO = [
  { id:'co1', tipo:'eleva', subtipo:'Reels', titulo:'Tour Penthouse Puerto Madero', bienId:'', fechaGrab:'2026-05-10', estado:'todo', referencias:'@arqdesign', notas:'' },
  { id:'co2', tipo:'eleva', subtipo:'Carrusel', titulo:'Mercado inmobiliario Q2 2026', bienId:'', fechaGrab:'2026-05-08', estado:'done', referencias:'', notas:'Revisar con equipo' },
  { id:'co3', tipo:'bien', subtipo:'Video', titulo:'Drone Torre Catalinas', bienId:'', fechaGrab:'2026-05-12', estado:'editing', referencias:'Piloto Drone Lucas', notas:'' },
  { id:'co4', tipo:'bien', subtipo:'Fotos', titulo:'Showroom Palermo Chico', bienId:'', fechaGrab:'2026-05-07', estado:'uploaded', referencias:'', notas:'Subido a IG' },
]

const DEMO_HOSPITALITY = [
  { id:'h1', tipo:'alquiler', nombre:'Villa Lago Nahuel', ubicacion:'Bariloche, Río Negro', precio:1200, moneda:'USD', estado:'disponible', capacidad:10, notas:'7 noches mínimo' },
  { id:'h2', tipo:'concierge', nombre:'Transfer VIP Aeropuerto', ubicacion:'Buenos Aires', precio:180, moneda:'USD', estado:'activo', capacidad:4, notas:'Auto de lujo' },
  { id:'h3', tipo:'evento', nombre:'Cena Privada en Bodega', ubicacion:'Mendoza', precio:350, moneda:'USD', estado:'disponible', capacidad:20, notas:'Viernes y sábados' },
]

// ── Asset Modal ───────────────────────────────
const ASSET_EMPTY = { unit:'real_estate', name:'', description:'', price:0, currency:'USD', status:'available', location:'', contactPerson:'', contactSearch:'', bedrooms:0, bathrooms:0, sqm:0, segmento:'estandar' }

const AssetModal = ({ asset, leads, onSave, onClose }) => {
  const [form, setForm] = useState(asset||ASSET_EMPTY)
  const [contactQuery, setContactQuery] = useState('')
  const set = (f,v) => setForm(p=>({...p,[f]:v}))
  const handleSave = () => { if(!form.name.trim()) return; onSave({...form, id:asset?.id||generateId(), createdAt:asset?.createdAt||new Date().toISOString()}) }
  const filteredLeads = contactQuery.trim() ? (leads||[]).filter(l =>
    l.name.toLowerCase().includes(contactQuery.toLowerCase()) ||
    (l.phone||'').includes(contactQuery)
  ) : []

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',backdropFilter:'blur(8px)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:20}} onClick={onClose}>
      <div style={{width:'100%',maxWidth:600,background:'var(--bg-secondary)',border:'1px solid rgba(252,211,77,0.3)',borderRadius:20,maxHeight:'90vh',overflowY:'auto',boxShadow:'0 0 30px rgba(252,211,77,0.15),0 40px 80px rgba(0,0,0,0.6)',animation:'fadeIn 0.3s ease'}} onClick={e=>e.stopPropagation()}>
        <div style={{padding:'24px 28px',borderBottom:'1px solid var(--border-violet)',display:'flex',alignItems:'center',gap:12}}>
          <div style={{width:40,height:40,borderRadius:12,background:'linear-gradient(135deg,#B45309,#FCD34D)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20}}>{UNIT_CFG[form.unit]?.icon||'💎'}</div>
          <h2 style={{fontSize:16,fontWeight:700}}>{asset?'Editar Bien':'Nuevo Bien'}</h2>
          <button onClick={onClose} style={{marginLeft:'auto',color:'var(--text-secondary)',padding:6,borderRadius:8}}><X size={20}/></button>
        </div>
        <div style={{padding:'24px 28px',display:'flex',flexDirection:'column',gap:14}}>
          {/* Unit */}
          <div>
            <label style={{fontSize:12,fontWeight:500,color:'var(--text-secondary)',display:'block',marginBottom:8}}>Categoría</label>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
              {Object.entries(UNIT_CFG).map(([k,v])=>(
                <button key={k} onClick={()=>set('unit',k)} style={{padding:'8px 10px',borderRadius:10,fontSize:12,fontWeight:500,textAlign:'left',border:`1px solid ${form.unit===k?v.color:'var(--border-violet)'}`,background:form.unit===k?v.bg:'rgba(139,92,246,0.05)',color:form.unit===k?v.color:'var(--text-secondary)',transition:'all 0.2s'}}>{v.icon} {v.label}</button>
              ))}
            </div>
          </div>
          {/* Segmento */}
          <div>
            <label style={{fontSize:12,fontWeight:500,color:'var(--text-secondary)',display:'block',marginBottom:8}}>Segmento</label>
            <div style={{display:'flex',gap:8}}>
              {['estandar','premium'].map(s=>(
                <button key={s} onClick={()=>set('segmento',s)} style={{flex:1,padding:'7px',borderRadius:10,fontSize:12,fontWeight:600,border:`1px solid ${form.segmento===s?'var(--primary-violet)':'var(--border-violet)'}`,background:form.segmento===s?'rgba(139,92,246,0.2)':'rgba(139,92,246,0.05)',color:form.segmento===s?'var(--primary-violet-light)':'var(--text-secondary)',transition:'all 0.2s',textTransform:'capitalize'}}>
                  {s==='estandar'?'Estándar':'Premium'}
                </button>
              ))}
            </div>
          </div>
          <F label="Nombre *"><input className="input-field" value={form.name} onChange={e=>set('name',e.target.value)} placeholder="Penthouse Puerto Madero"/></F>
          <F label="Descripción"><textarea className="input-field" value={form.description} onChange={e=>set('description',e.target.value)} rows={2} style={{resize:'vertical'}}/></F>
          <F label="Ubicación"><input className="input-field" value={form.location} onChange={e=>set('location',e.target.value)} placeholder="Puerto Madero, CABA"/></F>
          {/* Contact search */}
          <div>
            <label style={{fontSize:12,fontWeight:500,color:'var(--text-secondary)',display:'block',marginBottom:6}}>Contacto asignado</label>
            <div style={{position:'relative'}}>
              <Search size={13} style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'var(--text-secondary)'}}/>
              <input className="input-field" style={{paddingLeft:34}} value={contactQuery||form.contactPerson} onChange={e=>{setContactQuery(e.target.value);set('contactPerson',e.target.value)}} placeholder="Buscar por nombre o teléfono..."/>
            </div>
            {filteredLeads.length > 0 && (
              <div style={{marginTop:6,background:'var(--bg-tertiary)',border:'1px solid var(--border-violet)',borderRadius:10,overflow:'hidden',maxHeight:140,overflowY:'auto'}}>
                {filteredLeads.map(l=>(
                  <button key={l.id} onClick={()=>{set('contactPerson',l.name);setContactQuery('')}} style={{width:'100%',padding:'9px 14px',textAlign:'left',fontSize:12,color:'var(--text-primary)',display:'flex',gap:10,alignItems:'center',transition:'background 0.2s'}}
                    onMouseEnter={e=>e.currentTarget.style.background='rgba(139,92,246,0.12)'}
                    onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                    <span style={{fontWeight:600}}>{l.name}</span>
                    <span style={{color:'var(--text-secondary)',fontSize:11}}>{l.phone||l.email}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <F label="Precio"><input className="input-field" type="number" value={form.price} onChange={e=>set('price',+e.target.value)}/></F>
            <F label="Moneda">
              <select className="select-field" value={form.currency} onChange={e=>set('currency',e.target.value)}>
                <option value="USD">USD</option><option value="ARS">ARS</option><option value="EUR">EUR</option>
              </select>
            </F>
          </div>
          {form.unit==='real_estate'&&(
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12}}>
              <F label="Dormitorios"><input className="input-field" type="number" value={form.bedrooms} onChange={e=>set('bedrooms',+e.target.value)}/></F>
              <F label="Baños"><input className="input-field" type="number" value={form.bathrooms} onChange={e=>set('bathrooms',+e.target.value)}/></F>
              <F label="m²"><input className="input-field" type="number" value={form.sqm} onChange={e=>set('sqm',+e.target.value)}/></F>
            </div>
          )}
          <div>
            <label style={{fontSize:12,fontWeight:500,color:'var(--text-secondary)',display:'block',marginBottom:8}}>Estado</label>
            <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
              {Object.entries(STATUS_A).map(([k,v])=>(
                <button key={k} onClick={()=>set('status',k)} style={{padding:'6px 14px',borderRadius:10,fontSize:12,border:`1px solid ${form.status===k?v.color:'var(--border-violet)'}`,background:form.status===k?`${v.color}22`:'rgba(139,92,246,0.05)',color:form.status===k?v.color:'var(--text-secondary)',transition:'all 0.2s'}}>{v.label}</button>
              ))}
            </div>
          </div>
        </div>
        <div style={{padding:'16px 28px',borderTop:'1px solid var(--border-violet)',display:'flex',gap:10,justifyContent:'flex-end'}}>
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button onClick={handleSave} style={{display:'flex',alignItems:'center',gap:8,padding:'9px 18px',borderRadius:12,fontSize:14,fontWeight:600,background:'linear-gradient(135deg,#B45309,#D97706)',color:'white',boxShadow:'0 0 12px rgba(217,119,6,0.4)',cursor:'pointer'}}><Save size={14}/>Guardar</button>
        </div>
      </div>
    </div>
  )
}

// ── Lead Modal ────────────────────────────────
const LEAD_EMPTY = { name:'', email:'', phone:'', assetId:'', interest:'medium', source:'referral', notes:'', status:'new' }

const LeadModal = ({ lead, assets, onSave, onClose }) => {
  const [form, setForm] = useState(lead||LEAD_EMPTY)
  const set = (f,v) => setForm(p=>({...p,[f]:v}))
  const handleSave = () => { if(!form.name.trim()) return; onSave({...form, id:lead?.id||generateId(), createdAt:lead?.createdAt||new Date().toISOString()}) }
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',backdropFilter:'blur(8px)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:20}} onClick={onClose}>
      <div style={{width:'100%',maxWidth:520,background:'var(--bg-secondary)',border:'1px solid var(--border-violet)',borderRadius:20,boxShadow:'var(--glow-violet),0 40px 80px rgba(0,0,0,0.6)',animation:'fadeIn 0.3s ease'}} onClick={e=>e.stopPropagation()}>
        <div style={{padding:'22px 28px',borderBottom:'1px solid var(--border-violet)',display:'flex',alignItems:'center',gap:12}}>
          <div style={{width:40,height:40,borderRadius:12,background:'linear-gradient(135deg,var(--primary-violet),var(--accent-magenta))',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>👤</div>
          <h2 style={{fontSize:16,fontWeight:700}}>{lead?'Editar Lead':'Nuevo Lead'}</h2>
          <button onClick={onClose} style={{marginLeft:'auto',color:'var(--text-secondary)',padding:6,borderRadius:8}}><X size={20}/></button>
        </div>
        <div style={{padding:'22px 28px',display:'flex',flexDirection:'column',gap:14}}>
          <F label="Nombre *"><input className="input-field" value={form.name} onChange={e=>set('name',e.target.value)} placeholder="Carlos Méndez"/></F>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <F label="Email"><input className="input-field" type="email" value={form.email} onChange={e=>set('email',e.target.value)} placeholder="carlos@email.com"/></F>
            <F label="Teléfono"><input className="input-field" value={form.phone} onChange={e=>set('phone',e.target.value)} placeholder="+54 11 1234-5678"/></F>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <F label="Bien de interés">
              <select className="select-field" value={form.assetId} onChange={e=>set('assetId',e.target.value)}>
                <option value="">Ninguno</option>
                {assets.map(a=><option key={a.id} value={a.id}>{UNIT_CFG[a.unit]?.icon} {a.name}</option>)}
              </select>
            </F>
            <F label="Fuente">
              <select className="select-field" value={form.source} onChange={e=>set('source',e.target.value)}>
                {['referral','website','event','cold_contact','redes_sociales'].map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </F>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <div>
              <label style={{fontSize:12,fontWeight:500,color:'var(--text-secondary)',display:'block',marginBottom:8}}>Interés</label>
              <div style={{display:'flex',gap:6}}>
                {Object.entries(INTEREST_CFG).map(([k,v])=>(
                  <button key={k} onClick={()=>set('interest',k)} style={{flex:1,padding:'6px 0',borderRadius:8,fontSize:11,fontWeight:600,border:`1px solid ${form.interest===k?v.color:'var(--border-violet)'}`,background:form.interest===k?`${v.color}22`:'transparent',color:form.interest===k?v.color:'var(--text-secondary)',transition:'all 0.2s'}}>{v.label}</button>
                ))}
              </div>
            </div>
            <F label="Estado">
              <select className="select-field" value={form.status} onChange={e=>set('status',e.target.value)}>
                {Object.entries(LEAD_STATUS).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
              </select>
            </F>
          </div>
          <F label="Notas"><textarea className="input-field" value={form.notes} onChange={e=>set('notes',e.target.value)} rows={2} style={{resize:'vertical'}} placeholder="Observaciones..."/></F>
        </div>
        <div style={{padding:'16px 28px',borderTop:'1px solid var(--border-violet)',display:'flex',gap:10,justifyContent:'flex-end'}}>
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSave}><Save size={14}/>{lead?'Guardar':'Crear Lead'}</button>
        </div>
      </div>
    </div>
  )
}

// ── Asset Card (renamed to BienCard) ──────────
const BienCard = ({ asset, leads, onEdit, onDelete }) => {
  const uc  = UNIT_CFG[asset.unit] || UNIT_CFG.real_estate
  const st  = STATUS_A[asset.status] || STATUS_A.available
  const cnt = leads.filter(l=>l.assetId===asset.id).length
  return (
    <div style={{background:'var(--glass-bg)',border:`1px solid ${uc.border}`,borderRadius:16,overflow:'hidden',transition:'all 0.2s'}}
      onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-4px)';e.currentTarget.style.boxShadow=`0 0 20px ${uc.color}33`}}
      onMouseLeave={e=>{e.currentTarget.style.transform='none';e.currentTarget.style.boxShadow='none'}}
    >
      <div style={{height:4,background:`linear-gradient(90deg,${uc.color},${uc.color}88)`}}/>
      <div style={{padding:'18px 20px'}}>
        <div style={{display:'flex',alignItems:'flex-start',gap:10,marginBottom:12}}>
          <div style={{width:44,height:44,borderRadius:12,background:uc.bg,border:`1px solid ${uc.border}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0}}>{uc.icon}</div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:'flex',gap:6,alignItems:'center',marginBottom:4}}>
              <span style={{fontSize:10,fontWeight:700,color:uc.color}}>{uc.label}</span>
              {asset.segmento && <span style={{fontSize:9,padding:'1px 6px',borderRadius:8,background:asset.segmento==='premium'?'rgba(252,211,77,0.15)':'rgba(139,92,246,0.12)',color:asset.segmento==='premium'?'#FCD34D':'var(--primary-violet-light)',fontWeight:600}}>{asset.segmento==='premium'?'Premium':'Estándar'}</span>}
            </div>
            <h3 style={{fontSize:14,fontWeight:700,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{asset.name}</h3>
            {asset.location&&<div style={{fontSize:11,color:'var(--text-secondary)',display:'flex',alignItems:'center',gap:4,marginTop:2}}><MapPin size={9}/>{asset.location}</div>}
          </div>
          <div style={{display:'flex',gap:4,flexShrink:0}}>
            <button onClick={onEdit} style={{padding:'4px 7px',borderRadius:7,color:'var(--primary-violet-light)',background:'rgba(139,92,246,0.1)',border:'none',cursor:'pointer'}}><Edit3 size={11}/></button>
            <button onClick={onDelete} style={{padding:'4px 7px',borderRadius:7,color:'#F87171',background:'rgba(239,68,68,0.1)',border:'none',cursor:'pointer'}}><Trash2 size={11}/></button>
          </div>
        </div>
        {asset.description&&<p style={{fontSize:11,color:'var(--text-secondary)',marginBottom:12,overflow:'hidden',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical'}}>{asset.description}</p>}
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:8}}>
          <div>
            <div style={{fontSize:20,fontWeight:800,color:uc.color}}>{fmtMoney(asset.price, asset.currency==='USD'?'USD ':asset.currency==='EUR'?'€':'$')}</div>
            {asset.unit==='real_estate'&&asset.sqm>0&&<div style={{fontSize:10,color:'var(--text-secondary)'}}>{asset.bedrooms}🛏 {asset.bathrooms}🚿 {asset.sqm}m²</div>}
          </div>
          <div style={{display:'flex',gap:6,alignItems:'center'}}>
            {cnt>0&&<span style={{fontSize:10,padding:'2px 8px',borderRadius:20,background:'rgba(139,92,246,0.15)',color:'var(--primary-violet-light)',border:'1px solid var(--border-violet)'}}>{cnt} leads</span>}
            <span style={{fontSize:10,padding:'2px 8px',borderRadius:20,background:`${st.color}22`,color:st.color,fontWeight:600}}>{st.label}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── CONTENIDO SECTION ─────────────────────────
function ContenidoTab({ assets }) {
  const [activeSubTab, setActiveSubTab] = useState('eleva')
  const [contenido, setContenido] = useState(DEMO_CONTENIDO)
  const [modal, setModal] = useState(null)
  const EMPTY_C = { tipo:'eleva', subtipo:'', titulo:'', bienId:'', fechaGrab:'', estado:'todo', referencias:'', notas:'' }
  const [form, setForm] = useState(EMPTY_C)
  const set = (f,v) => setForm(p=>({...p,[f]:v}))
  const save = () => { if(!form.titulo.trim()) return; if(form.id) setContenido(p=>p.map(c=>c.id===form.id?form:c)); else setContenido(p=>[...p,{...form,id:generateId()}]); setModal(null) }

  const subTipos = { eleva:['Reels','Carrusel','Story','Tutorial','Entrevista'], bien:['Video','Fotos','Drone','Virtual Tour','Testimonial'] }
  const filtered = contenido.filter(c => c.tipo === activeSubTab)

  const kanbanCols = Object.entries(CONTENT_STATUS)

  return (
    <div style={{animation:'fadeIn 0.3s ease'}}>
      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:20,flexWrap:'wrap'}}>
        <div style={{display:'flex',gap:8,background:'rgba(139,92,246,0.06)',borderRadius:12,padding:4}}>
          {[{id:'eleva',label:'✨ Eleva',desc:'Contenido de valor'},{id:'bien',label:'🏙 Bienes',desc:'Grabación de bienes'}].map(t=>(
            <button key={t.id} onClick={()=>setActiveSubTab(t.id)} style={{padding:'8px 18px',borderRadius:8,fontSize:13,fontWeight:600,border:'none',background:activeSubTab===t.id?'rgba(139,92,246,0.25)':'transparent',color:activeSubTab===t.id?'var(--primary-violet-light)':'var(--text-secondary)',transition:'all 0.2s'}}>{t.label}</button>
          ))}
        </div>
        <button className="btn btn-primary" onClick={()=>{setForm({...EMPTY_C,tipo:activeSubTab});setModal('form')}} style={{marginLeft:'auto'}}><Plus size={15}/>Nuevo Contenido</button>
      </div>

      {/* Kanban */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:14}}>
        {kanbanCols.map(([statusKey, statusCfg]) => {
          const cards = filtered.filter(c=>c.estado===statusKey)
          return (
            <div key={statusKey}>
              <div style={{padding:'8px 14px',borderRadius:'10px 10px 0 0',background:statusCfg.bg,border:`1px solid ${statusCfg.color}44`,borderBottom:'none',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <span style={{fontSize:12,fontWeight:700,color:statusCfg.color}}>{statusCfg.label}</span>
                <span style={{fontSize:11,fontWeight:700,background:`${statusCfg.color}33`,color:statusCfg.color,padding:'1px 8px',borderRadius:10}}>{cards.length}</span>
              </div>
              <div style={{minHeight:160,background:'rgba(139,92,246,0.02)',border:`1px solid ${statusCfg.color}22`,borderRadius:'0 0 10px 10px',padding:8,display:'flex',flexDirection:'column',gap:8}}>
                {cards.map(c=>(
                  <div key={c.id} style={{background:'var(--glass-bg)',border:'1px solid var(--border-violet)',borderRadius:10,padding:'12px 14px',cursor:'pointer',transition:'all 0.2s'}}
                    onMouseEnter={e=>{e.currentTarget.style.borderColor=statusCfg.color;e.currentTarget.style.boxShadow=`0 0 10px ${statusCfg.color}22`}}
                    onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--border-violet)';e.currentTarget.style.boxShadow='none'}}
                    onClick={()=>{setForm(c);setModal('form')}}>
                    <div style={{fontSize:13,fontWeight:700,marginBottom:4}}>{c.titulo}</div>
                    {c.subtipo&&<span style={{fontSize:10,padding:'1px 8px',borderRadius:10,background:'rgba(139,92,246,0.15)',color:'var(--primary-violet-light)'}}>{c.subtipo}</span>}
                    {c.fechaGrab&&<div style={{fontSize:11,color:'var(--text-secondary)',marginTop:6}}>📅 {fmtDate(c.fechaGrab)}</div>}
                    {c.referencias&&<div style={{fontSize:10,color:'var(--text-secondary)',marginTop:4}}>📌 {c.referencias}</div>}
                    <div style={{display:'flex',gap:6,marginTop:8,justifyContent:'flex-end'}}>
                      {Object.entries(CONTENT_STATUS).map(([k,v])=>(
                        <button key={k} onClick={e=>{e.stopPropagation();setContenido(p=>p.map(x=>x.id===c.id?{...x,estado:k}:x))}}
                          style={{padding:'2px 8px',borderRadius:6,fontSize:9,fontWeight:700,border:`1px solid ${c.estado===k?v.color:'transparent'}`,background:c.estado===k?v.bg:'transparent',color:c.estado===k?v.color:'var(--text-secondary)',transition:'all 0.2s',cursor:'pointer'}}>
                          {v.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                {cards.length===0&&<div style={{textAlign:'center',padding:'16px',color:'var(--text-secondary)',fontSize:11,opacity:0.5}}>Sin contenido</div>}
              </div>
            </div>
          )
        })}
      </div>

      {/* Form Modal */}
      {modal==='form'&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',backdropFilter:'blur(8px)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:20}} onClick={()=>setModal(null)}>
          <div style={{width:'100%',maxWidth:480,background:'var(--bg-secondary)',border:'1px solid var(--border-violet)',borderRadius:20,animation:'fadeIn 0.3s ease'}} onClick={e=>e.stopPropagation()}>
            <div style={{padding:'20px 24px',borderBottom:'1px solid var(--border-violet)',display:'flex',alignItems:'center',gap:12}}>
              <span style={{fontSize:20}}>{form.tipo==='eleva'?'✨':'🏙'}</span>
              <h2 style={{fontSize:16,fontWeight:700}}>{form.id?'Editar':'Nuevo'} Contenido</h2>
              <button onClick={()=>setModal(null)} style={{marginLeft:'auto',color:'var(--text-secondary)',padding:6,borderRadius:8}}><X size={18}/></button>
            </div>
            <div style={{padding:'20px 24px',display:'flex',flexDirection:'column',gap:12}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <div>
                  <label style={{fontSize:12,fontWeight:500,color:'var(--text-secondary)',display:'block',marginBottom:6}}>Tipo</label>
                  <select className="select-field" value={form.tipo} onChange={e=>set('tipo',e.target.value)}>
                    <option value="eleva">Eleva</option><option value="bien">Bienes</option>
                  </select>
                </div>
                <div>
                  <label style={{fontSize:12,fontWeight:500,color:'var(--text-secondary)',display:'block',marginBottom:6}}>Subtipo</label>
                  <select className="select-field" value={form.subtipo} onChange={e=>set('subtipo',e.target.value)}>
                    <option value="">Seleccionar...</option>
                    {(subTipos[form.tipo]||[]).map(s=><option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div><label style={{fontSize:12,fontWeight:500,color:'var(--text-secondary)',display:'block',marginBottom:6}}>Título *</label><input className="input-field" value={form.titulo} onChange={e=>set('titulo',e.target.value)} placeholder="Nombre del contenido"/></div>
              {form.tipo==='bien'&&(
                <div><label style={{fontSize:12,fontWeight:500,color:'var(--text-secondary)',display:'block',marginBottom:6}}>Bien relacionado</label>
                  <select className="select-field" value={form.bienId} onChange={e=>set('bienId',e.target.value)}>
                    <option value="">Ninguno</option>
                    {assets.map(a=><option key={a.id} value={a.id}>{UNIT_CFG[a.unit]?.icon} {a.name}</option>)}
                  </select>
                </div>
              )}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <div><label style={{fontSize:12,fontWeight:500,color:'var(--text-secondary)',display:'block',marginBottom:6}}>Día de grabación</label><input className="input-field" type="date" value={form.fechaGrab} onChange={e=>set('fechaGrab',e.target.value)}/></div>
                <div><label style={{fontSize:12,fontWeight:500,color:'var(--text-secondary)',display:'block',marginBottom:6}}>Estado</label>
                  <select className="select-field" value={form.estado} onChange={e=>set('estado',e.target.value)}>
                    {Object.entries(CONTENT_STATUS).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
              </div>
              <div><label style={{fontSize:12,fontWeight:500,color:'var(--text-secondary)',display:'block',marginBottom:6}}>Referencias</label><input className="input-field" value={form.referencias} onChange={e=>set('referencias',e.target.value)} placeholder="@persona, links, recursos..."/></div>
              <div><label style={{fontSize:12,fontWeight:500,color:'var(--text-secondary)',display:'block',marginBottom:6}}>Notas</label><textarea className="input-field" value={form.notas} onChange={e=>set('notas',e.target.value)} rows={2} style={{resize:'vertical'}}/></div>
            </div>
            <div style={{padding:'14px 24px',borderTop:'1px solid var(--border-violet)',display:'flex',gap:10,justifyContent:'flex-end'}}>
              {form.id&&<button onClick={()=>{setContenido(p=>p.filter(c=>c.id!==form.id));setModal(null)}} style={{marginRight:'auto',padding:'8px 14px',borderRadius:10,fontSize:12,background:'rgba(239,68,68,0.1)',color:'#F87171',border:'1px solid rgba(239,68,68,0.3)'}}><Trash2 size={12}/></button>}
              <button className="btn btn-ghost" onClick={()=>setModal(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={save}><Save size={14}/>Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── HOSPITALITY SECTION ───────────────────────
const HOSP_TIPOS = { alquiler:'🏡', concierge:'🎩', evento:'🥂' }
const HOSP_ESTADOS = ['disponible', 'activo', 'reservado', 'inactivo']

function HospitalityTab() {
  const [items, setItems] = useState(DEMO_HOSPITALITY)
  const [modal, setModal] = useState(null)
  const EMPTY_H = { tipo:'alquiler', nombre:'', ubicacion:'', precio:0, moneda:'USD', estado:'disponible', capacidad:0, notas:'' }
  const [form, setForm] = useState(EMPTY_H)
  const set = (f,v) => setForm(p=>({...p,[f]:v}))
  const save = () => { if(!form.nombre.trim()) return; if(form.id) setItems(p=>p.map(x=>x.id===form.id?form:x)); else setItems(p=>[...p,{...form,id:generateId()}]); setModal(null) }

  const tiposStats = Object.keys(HOSP_TIPOS).map(t=>({ tipo:t, count:items.filter(i=>i.tipo===t).length }))

  return (
    <div style={{animation:'fadeIn 0.3s ease'}}>
      {/* Stats */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:12,marginBottom:20}}>
        {[
          {label:'Total Experiencias',value:items.length,color:'#FCD34D',icon:'💎'},
          {label:'Alquileres Premium',value:items.filter(i=>i.tipo==='alquiler').length,color:'#A78BFA',icon:'🏡'},
          {label:'Concierge',value:items.filter(i=>i.tipo==='concierge').length,color:'#60A5FA',icon:'🎩'},
          {label:'Eventos Exclusivos',value:items.filter(i=>i.tipo==='evento').length,color:'#4ADE80',icon:'🥂'},
        ].map(s=>(
          <div key={s.label} style={{padding:'14px 16px',background:'var(--glass-bg)',border:'1px solid rgba(252,211,77,0.2)',borderRadius:14,transition:'all 0.2s'}}
            onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(252,211,77,0.5)';e.currentTarget.style.transform='translateY(-2px)'}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(252,211,77,0.2)';e.currentTarget.style.transform='none'}}>
            <div style={{fontSize:20,marginBottom:4}}>{s.icon}</div>
            <div style={{fontSize:20,fontWeight:800,color:s.color}}>{s.value}</div>
            <div style={{fontSize:10,color:'var(--text-secondary)'}}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{display:'flex',justifyContent:'flex-end',marginBottom:16}}>
        <button className="btn btn-primary" onClick={()=>{setForm(EMPTY_H);setModal('form')}}><Plus size={15}/>Nueva Experiencia</button>
      </div>

      {/* Cards grid */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:16}}>
        {items.map(item=>{
          const estadoColor = {disponible:'#4ADE80',activo:'#8B5CF6',reservado:'#FCD34D',inactivo:'#9CA3AF'}[item.estado]||'#9CA3AF'
          return (
            <div key={item.id} className="card" style={{padding:0,overflow:'hidden'}}>
              <div style={{height:4,background:`linear-gradient(90deg,${estadoColor},${estadoColor}66)`}}/>
              <div style={{padding:'18px 20px'}}>
                <div style={{display:'flex',alignItems:'flex-start',gap:12,marginBottom:12}}>
                  <div style={{width:44,height:44,borderRadius:14,background:`${estadoColor}22`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0}}>{HOSP_TIPOS[item.tipo]||'⭐'}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <h3 style={{fontSize:14,fontWeight:700,marginBottom:4}}>{item.nombre}</h3>
                    <div style={{fontSize:11,color:'var(--text-secondary)',display:'flex',alignItems:'center',gap:4}}><MapPin size={9}/>{item.ubicacion}</div>
                  </div>
                  <div style={{display:'flex',gap:4}}>
                    <button onClick={()=>{setForm(item);setModal('form')}} style={{padding:'4px 7px',borderRadius:7,color:'var(--primary-violet-light)',background:'rgba(139,92,246,0.1)',border:'none',cursor:'pointer'}}><Edit3 size={11}/></button>
                    <button onClick={()=>setItems(p=>p.filter(x=>x.id!==item.id))} style={{padding:'4px 7px',borderRadius:7,color:'#F87171',background:'rgba(239,68,68,0.1)',border:'none',cursor:'pointer'}}><Trash2 size={11}/></button>
                  </div>
                </div>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                  <div>
                    <div style={{fontSize:18,fontWeight:800,color:'#FCD34D'}}>{fmtMoney(item.precio, item.moneda==='USD'?'USD ':'$')}<span style={{fontSize:11,fontWeight:400,color:'var(--text-secondary)'}}>/noche</span></div>
                    {item.capacidad>0&&<div style={{fontSize:11,color:'var(--text-secondary)'}}>👥 Hasta {item.capacidad} personas</div>}
                  </div>
                  <span style={{fontSize:10,padding:'3px 10px',borderRadius:20,background:`${estadoColor}22`,color:estadoColor,fontWeight:700,textTransform:'capitalize'}}>{item.estado}</span>
                </div>
                {item.notas&&<p style={{fontSize:11,color:'var(--text-secondary)',marginTop:8,lineHeight:1.5}}>{item.notas}</p>}
              </div>
            </div>
          )
        })}
      </div>

      {/* Form Modal */}
      {modal==='form'&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',backdropFilter:'blur(8px)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:20}} onClick={()=>setModal(null)}>
          <div style={{width:'100%',maxWidth:480,background:'var(--bg-secondary)',border:'1px solid rgba(252,211,77,0.3)',borderRadius:20,animation:'fadeIn 0.3s ease'}} onClick={e=>e.stopPropagation()}>
            <div style={{padding:'20px 24px',borderBottom:'1px solid var(--border-violet)',display:'flex',alignItems:'center',gap:12}}>
              <span style={{fontSize:20}}>{HOSP_TIPOS[form.tipo]||'⭐'}</span>
              <h2 style={{fontSize:16,fontWeight:700}}>{form.id?'Editar':'Nueva'} Experiencia</h2>
              <button onClick={()=>setModal(null)} style={{marginLeft:'auto',color:'var(--text-secondary)',padding:6,borderRadius:8}}><X size={18}/></button>
            </div>
            <div style={{padding:'20px 24px',display:'flex',flexDirection:'column',gap:12}}>
              <div>
                <label style={{fontSize:12,fontWeight:500,color:'var(--text-secondary)',display:'block',marginBottom:8}}>Tipo</label>
                <div style={{display:'flex',gap:8}}>
                  {Object.entries(HOSP_TIPOS).map(([k,v])=>(
                    <button key={k} onClick={()=>set('tipo',k)} style={{flex:1,padding:'8px',borderRadius:10,fontSize:12,fontWeight:600,border:`1px solid ${form.tipo===k?'#FCD34D':'var(--border-violet)'}`,background:form.tipo===k?'rgba(252,211,77,0.15)':'rgba(139,92,246,0.05)',color:form.tipo===k?'#FCD34D':'var(--text-secondary)',transition:'all 0.2s',cursor:'pointer'}}>
                      {v} {k.charAt(0).toUpperCase()+k.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div><label style={{fontSize:12,fontWeight:500,color:'var(--text-secondary)',display:'block',marginBottom:6}}>Nombre *</label><input className="input-field" value={form.nombre} onChange={e=>set('nombre',e.target.value)} placeholder="Villa Lago Nahuel"/></div>
              <div><label style={{fontSize:12,fontWeight:500,color:'var(--text-secondary)',display:'block',marginBottom:6}}>Ubicación</label><input className="input-field" value={form.ubicacion} onChange={e=>set('ubicacion',e.target.value)} placeholder="Bariloche, Río Negro"/></div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10}}>
                <div><label style={{fontSize:12,fontWeight:500,color:'var(--text-secondary)',display:'block',marginBottom:6}}>Precio</label><input className="input-field" type="number" value={form.precio} onChange={e=>set('precio',+e.target.value)}/></div>
                <div><label style={{fontSize:12,fontWeight:500,color:'var(--text-secondary)',display:'block',marginBottom:6}}>Moneda</label><select className="select-field" value={form.moneda} onChange={e=>set('moneda',e.target.value)}><option value="USD">USD</option><option value="ARS">ARS</option></select></div>
                <div><label style={{fontSize:12,fontWeight:500,color:'var(--text-secondary)',display:'block',marginBottom:6}}>Capacidad</label><input className="input-field" type="number" value={form.capacidad} onChange={e=>set('capacidad',+e.target.value)}/></div>
              </div>
              <div>
                <label style={{fontSize:12,fontWeight:500,color:'var(--text-secondary)',display:'block',marginBottom:8}}>Estado</label>
                <div style={{display:'flex',gap:8}}>
                  {HOSP_ESTADOS.map(s=>{
                    const c={disponible:'#4ADE80',activo:'#8B5CF6',reservado:'#FCD34D',inactivo:'#9CA3AF'}[s]
                    return <button key={s} onClick={()=>set('estado',s)} style={{flex:1,padding:'6px',borderRadius:8,fontSize:11,fontWeight:600,border:`1px solid ${form.estado===s?c:'var(--border-violet)'}`,background:form.estado===s?`${c}22`:'rgba(139,92,246,0.05)',color:form.estado===s?c:'var(--text-secondary)',transition:'all 0.2s',textTransform:'capitalize',cursor:'pointer'}}>{s}</button>
                  })}
                </div>
              </div>
              <div><label style={{fontSize:12,fontWeight:500,color:'var(--text-secondary)',display:'block',marginBottom:6}}>Notas</label><textarea className="input-field" value={form.notas} onChange={e=>set('notas',e.target.value)} rows={2} style={{resize:'vertical'}}/></div>
            </div>
            <div style={{padding:'14px 24px',borderTop:'1px solid var(--border-violet)',display:'flex',gap:10,justifyContent:'flex-end'}}>
              <button className="btn btn-ghost" onClick={()=>setModal(null)}>Cancelar</button>
              <button onClick={save} style={{display:'flex',alignItems:'center',gap:8,padding:'9px 18px',borderRadius:12,fontSize:14,fontWeight:600,background:'linear-gradient(135deg,#B45309,#D97706)',color:'white',cursor:'pointer'}}><Save size={14}/>Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── MAIN ─────────────────────────────────────
export default function ElevareView({ assets, leads, contracts, onSaveAsset, onDeleteAsset, onSaveLead, onDeleteLead, defaultTab = 'bienes' }) {
  const [tab,      setTab]    = useState(defaultTab)
  const [modal,    setModal]  = useState(null)
  const [lModal,   setLModal] = useState(null)
  const [fUnit,    setFUnit]  = useState('all')
  const [fSeg,     setFSeg]   = useState('all')
  const [viewMode, setViewMode]= useState('cards')

  const totalValue      = assets.reduce((s,a)=>s+(a.currency==='USD'?a.price*1000:a.price),0)
  const available       = assets.filter(a=>a.status==='available').length
  const totalLeads      = leads.length
  const hotLeads        = leads.filter(l=>l.interest==='high').length
  const closedContracts = contracts.filter(c=>c.status==='signed'||c.status==='completed').length

  const filteredAssets = assets.filter(a => {
    if (fUnit !== 'all' && a.unit !== fUnit) return false
    if (fSeg  !== 'all' && (a.segmento||'estandar') !== fSeg) return false
    return true
  })
  const filteredLeads = leads.sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt))

  const TABS = [
    {id:'bienes',    label:'💎 Bienes'},
    {id:'leads',     label:'👤 Leads'},
    {id:'contracts', label:'📝 Contratos'},
    {id:'contenido', label:'🎬 Contenido'},
    {id:'hospitality',label:'🏡 Hospitality'},
  ]

  return (
    <div style={{padding:24,animation:'fadeIn 0.3s ease'}}>
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:20,flexWrap:'wrap'}}>
        <div>
          <h2 style={{fontSize:20,fontWeight:700,background:'linear-gradient(135deg,#FCD34D,#F59E0B)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text'}}>💎 Elevare</h2>
          <p style={{fontSize:12,color:'var(--text-secondary)'}}>Luxury Network · {assets.length} bienes · {leads.length} leads</p>
        </div>
        <div style={{flex:1}}/>
        {tab==='bienes'&&<button className="btn btn-primary" onClick={()=>setModal('create')} style={{background:'linear-gradient(135deg,#B45309,#D97706)'}}><Plus size={16}/>Nuevo Bien</button>}
        {tab==='leads'&&<button className="btn btn-primary" onClick={()=>setLModal('create')}><Plus size={16}/>Nuevo Lead</button>}
      </div>

      {/* KPIs */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(145px,1fr))',gap:12,marginBottom:20}}>
        {[
          {label:'Bienes disponibles', value:available,        color:'#FCD34D', icon:'💎'},
          {label:'Leads totales',      value:totalLeads,       color:'#A78BFA', icon:'👤'},
          {label:'Leads calientes',    value:hotLeads,         color:'#F87171', icon:'🔥'},
          {label:'Contratos firmados', value:closedContracts,  color:'#4ADE80', icon:'📝'},
          {label:'Categorías activas', value:Object.keys(UNIT_CFG).length, color:'#60A5FA', icon:'🏢'},
        ].map(s=>(
          <div key={s.label} style={{padding:'14px 16px',background:'var(--glass-bg)',border:'1px solid rgba(252,211,77,0.2)',borderRadius:12,transition:'all 0.2s'}}
            onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(252,211,77,0.5)';e.currentTarget.style.transform='translateY(-2px)'}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(252,211,77,0.2)';e.currentTarget.style.transform='none'}}>
            <div style={{fontSize:20,marginBottom:4}}>{s.icon}</div>
            <div style={{fontSize:18,fontWeight:800,color:s.color}}>{s.value}</div>
            <div style={{fontSize:10,color:'var(--text-secondary)'}}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{display:'flex',gap:6,marginBottom:20,flexWrap:'wrap'}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{padding:'8px 16px',borderRadius:10,fontSize:12,fontWeight:tab===t.id?700:400,border:`1px solid ${tab===t.id?'#FCD34D':'var(--border-violet)'}`,background:tab===t.id?'rgba(252,211,77,0.15)':'rgba(139,92,246,0.05)',color:tab===t.id?'#FCD34D':'var(--text-secondary)',transition:'all 0.2s',cursor:'pointer'}}>{t.label}</button>
        ))}
      </div>

      {/* BIENES */}
      {tab==='bienes'&&(
        <>
          <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap',alignItems:'center'}}>
            {/* Category filter */}
            <button onClick={()=>setFUnit('all')} style={{padding:'5px 14px',borderRadius:20,fontSize:12,border:`1px solid ${fUnit==='all'?'#FCD34D':'var(--border-violet)'}`,background:fUnit==='all'?'rgba(252,211,77,0.15)':'transparent',color:fUnit==='all'?'#FCD34D':'var(--text-secondary)',cursor:'pointer',transition:'all 0.2s'}}>Todos</button>
            {Object.entries(UNIT_CFG).map(([k,v])=>(
              <button key={k} onClick={()=>setFUnit(k)} style={{padding:'5px 14px',borderRadius:20,fontSize:12,border:`1px solid ${fUnit===k?v.color:'var(--border-violet)'}`,background:fUnit===k?v.bg:'transparent',color:fUnit===k?v.color:'var(--text-secondary)',cursor:'pointer',transition:'all 0.2s'}}>{v.icon} {v.label}</button>
            ))}
            <div style={{flex:1}}/>
            {/* Segmento filter */}
            <div style={{display:'flex',gap:6,alignItems:'center'}}>
              {[{k:'all',l:'Todos'},{k:'estandar',l:'Estándar'},{k:'premium',l:'Premium'}].map(s=>(
                <button key={s.k} onClick={()=>setFSeg(s.k)} style={{padding:'5px 12px',borderRadius:20,fontSize:11,fontWeight:600,border:`1px solid ${fSeg===s.k?'var(--primary-violet)':'var(--border-violet)'}`,background:fSeg===s.k?'rgba(139,92,246,0.2)':'transparent',color:fSeg===s.k?'var(--primary-violet-light)':'var(--text-secondary)',cursor:'pointer',transition:'all 0.2s'}}>{s.l}</button>
              ))}
            </div>
            {/* View toggle */}
            <div style={{display:'flex',gap:4,background:'rgba(139,92,246,0.08)',borderRadius:10,padding:3}}>
              <button onClick={()=>setViewMode('cards')} style={{padding:'5px 10px',borderRadius:8,color:viewMode==='cards'?'var(--primary-violet-light)':'var(--text-secondary)',background:viewMode==='cards'?'rgba(139,92,246,0.2)':'transparent',border:'none',cursor:'pointer',transition:'all 0.2s'}}><Grid size={14}/></button>
              <button onClick={()=>setViewMode('list')} style={{padding:'5px 10px',borderRadius:8,color:viewMode==='list'?'var(--primary-violet-light)':'var(--text-secondary)',background:viewMode==='list'?'rgba(139,92,246,0.2)':'transparent',border:'none',cursor:'pointer',transition:'all 0.2s'}}><List size={14}/></button>
            </div>
          </div>

          {viewMode==='cards'?(
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:16}}>
              {filteredAssets.map(a=>(
                <BienCard key={a.id} asset={a} leads={leads} onEdit={()=>setModal(a)} onDelete={()=>onDeleteAsset(a.id)}/>
              ))}
              {filteredAssets.length===0&&(
                <div style={{gridColumn:'1/-1',textAlign:'center',padding:'48px',color:'var(--text-secondary)'}}>
                  <div style={{fontSize:48,marginBottom:12}}>💎</div><div>Sin bienes en esta categoría</div>
                </div>
              )}
            </div>
          ):(
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {filteredAssets.map(a=>{
                const uc = UNIT_CFG[a.unit]||UNIT_CFG.real_estate
                const st = STATUS_A[a.status]||STATUS_A.available
                return (
                  <div key={a.id} style={{display:'flex',alignItems:'center',gap:14,padding:'14px 16px',background:'var(--glass-bg)',border:`1px solid ${uc.border}`,borderRadius:12,transition:'all 0.2s'}}
                    onMouseEnter={e=>{e.currentTarget.style.boxShadow=`0 0 12px ${uc.color}22`}}
                    onMouseLeave={e=>{e.currentTarget.style.boxShadow='none'}}>
                    <div style={{width:40,height:40,borderRadius:12,background:uc.bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0}}>{uc.icon}</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:13,fontWeight:700}}>{a.name}</div>
                      <div style={{fontSize:11,color:'var(--text-secondary)'}}>{uc.label} · {a.location||'—'}</div>
                    </div>
                    <div style={{fontSize:14,fontWeight:700,color:uc.color}}>{fmtMoney(a.price,a.currency==='USD'?'USD ':'$')}</div>
                    <span style={{fontSize:10,padding:'2px 8px',borderRadius:20,background:`${st.color}22`,color:st.color,fontWeight:600}}>{st.label}</span>
                    {a.segmento&&<span style={{fontSize:10,padding:'2px 8px',borderRadius:20,background:'rgba(139,92,246,0.12)',color:'var(--primary-violet-light)',fontWeight:600,textTransform:'capitalize'}}>{a.segmento}</span>}
                    <div style={{display:'flex',gap:4}}>
                      <button onClick={()=>setModal(a)} style={{padding:'5px 8px',borderRadius:8,color:'var(--primary-violet-light)',background:'rgba(139,92,246,0.1)',border:'none',cursor:'pointer'}}><Edit3 size={12}/></button>
                      <button onClick={()=>onDeleteAsset(a.id)} style={{padding:'5px 8px',borderRadius:8,color:'#F87171',background:'rgba(239,68,68,0.1)',border:'none',cursor:'pointer'}}><Trash2 size={12}/></button>
                    </div>
                  </div>
                )
              })}
              {filteredAssets.length===0&&<div style={{textAlign:'center',padding:'48px',color:'var(--text-secondary)'}}>Sin bienes</div>}
            </div>
          )}
        </>
      )}

      {/* LEADS */}
      {tab==='leads'&&(
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {filteredLeads.map(lead=>{
            const asset = assets.find(a=>a.id===lead.assetId)
            const is = INTEREST_CFG[lead.interest]||INTEREST_CFG.medium
            const ls = LEAD_STATUS[lead.status]||LEAD_STATUS.new
            return (
              <div key={lead.id} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 16px',background:'var(--glass-bg)',border:'1px solid var(--border-violet)',borderRadius:12,transition:'all 0.2s',flexWrap:'wrap'}}
                onMouseEnter={e=>e.currentTarget.style.borderColor='var(--primary-violet)'}
                onMouseLeave={e=>e.currentTarget.style.borderColor='var(--border-violet)'}>
                <div style={{width:36,height:36,borderRadius:'50%',background:'linear-gradient(135deg,var(--primary-violet),var(--accent-magenta))',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:14,flexShrink:0}}>{lead.name.charAt(0)}</div>
                <div style={{flex:1,minWidth:140}}>
                  <div style={{fontSize:13,fontWeight:600}}>{lead.name}</div>
                  <div style={{fontSize:11,color:'var(--text-secondary)'}}>{lead.email||lead.phone}</div>
                </div>
                {asset&&<span style={{fontSize:11,color:'#FCD34D'}}>💎 {asset.name}</span>}
                <span style={{fontSize:10,padding:'2px 8px',borderRadius:20,background:`${is.color}22`,color:is.color,fontWeight:600}}>{is.label}</span>
                <span style={{fontSize:10,padding:'2px 8px',borderRadius:20,background:`${ls.color}22`,color:ls.color,fontWeight:600}}>{ls.label}</span>
                <div style={{display:'flex',gap:4}}>
                  <button onClick={()=>setLModal(lead)} style={{padding:'4px 8px',borderRadius:7,color:'var(--primary-violet-light)',background:'rgba(139,92,246,0.1)',border:'none',cursor:'pointer'}}><Edit3 size={11}/></button>
                  <button onClick={()=>onDeleteLead(lead.id)} style={{padding:'4px 8px',borderRadius:7,color:'#F87171',background:'rgba(239,68,68,0.1)',border:'none',cursor:'pointer'}}><Trash2 size={11}/></button>
                </div>
              </div>
            )
          })}
          {filteredLeads.length===0&&<div style={{textAlign:'center',padding:'48px',color:'var(--text-secondary)'}}>Sin leads registrados</div>}
        </div>
      )}

      {/* CONTRACTS */}
      {tab==='contracts'&&(
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {contracts.length===0?<div style={{textAlign:'center',padding:'48px',color:'var(--text-secondary)'}}>Sin contratos</div>:
          contracts.map(c=>{
            const asset = assets.find(a=>a.id===c.assetId)
            const lead  = leads.find(l=>l.id===c.leadId)
            const cs    = CONTRACT_STATUS[c.status]||CONTRACT_STATUS.draft
            return (
              <div key={c.id} style={{display:'flex',alignItems:'center',gap:12,padding:'14px 18px',background:'var(--glass-bg)',border:'1px solid var(--border-violet)',borderRadius:12,flexWrap:'wrap',transition:'all 0.2s'}}
                onMouseEnter={e=>e.currentTarget.style.borderColor='var(--primary-violet)'}
                onMouseLeave={e=>e.currentTarget.style.borderColor='var(--border-violet)'}>
                <span style={{fontSize:18}}>📝</span>
                <div style={{flex:1,minWidth:150}}>
                  <div style={{fontSize:13,fontWeight:700}}>{asset?.name||c.name||'—'}</div>
                  <div style={{fontSize:11,color:'var(--text-secondary)'}}>{lead?.name||c.clientName||'—'} · {c.type||'contrato'}</div>
                </div>
                <div style={{fontSize:15,fontWeight:700,color:'#4ADE80'}}>{fmtMoney(c.value||0,c.currency==='USD'?'USD ':'$')}</div>
                <span style={{fontSize:10,padding:'3px 10px',borderRadius:20,background:`${cs.color}22`,color:cs.color,fontWeight:600}}>{cs.label}</span>
                <div style={{fontSize:11,color:'var(--text-secondary)'}}>{fmtDate(c.signedDate)}</div>
              </div>
            )
          })}
        </div>
      )}

      {/* CONTENIDO */}
      {tab==='contenido'&&<ContenidoTab assets={assets}/>}

      {/* HOSPITALITY */}
      {tab==='hospitality'&&<HospitalityTab/>}

      {modal  && <AssetModal asset={modal==='create'?null:modal} leads={leads} onSave={d=>{onSaveAsset(d);setModal(null)}} onClose={()=>setModal(null)}/>}
      {lModal && <LeadModal  lead={lModal==='create'?null:lModal} assets={assets} onSave={d=>{onSaveLead(d);setLModal(null)}} onClose={()=>setLModal(null)}/>}
    </div>
  )
}
