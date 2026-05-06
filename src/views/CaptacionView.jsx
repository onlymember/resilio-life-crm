import React, { useState, useMemo } from 'react'
import {
  Plus, Search, Filter, Copy, Check, ChevronDown, ChevronRight,
  MapPin, Phone, Mail, Instagram, Globe, Tag, Clock, TrendingUp,
  Users, Target, BarChart3, X, Save, Edit3, Trash2, Calendar,
  AlertCircle, CheckCircle, ArrowRight, Star, Zap, Building2, Bell
} from 'lucide-react'

const F = ({ label, children, err: e }) => (
  <div>
    <label style={{ fontSize:12, fontWeight:500, color:'var(--text-secondary)', display:'block', marginBottom:6 }}>{label}</label>
    {children}
    {e && <span style={{ fontSize:11, color:'#F87171' }}>{e}</span>}
  </div>
)

// ── Types / Config ─────────────────────────────────────────
const PIPELINE_STAGES = [
  { id: 'nuevo',        label: 'Nuevo',             color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)' },
  { id: 'contactado',   label: 'Contactado',         color: '#60A5FA', bg: 'rgba(96,165,250,0.12)' },
  { id: 'interes',      label: 'Interés Detectado',  color: '#FCD34D', bg: 'rgba(252,211,77,0.12)' },
  { id: 'propuesta',    label: 'Propuesta Enviada',  color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
  { id: 'reunion',      label: 'Reunión Agendada',   color: '#A78BFA', bg: 'rgba(167,139,250,0.12)' },
  { id: 'negociacion',  label: 'En Negociación',     color: '#E879F9', bg: 'rgba(232,121,249,0.12)' },
  { id: 'cerrada',      label: 'Cerrada',            color: '#4ADE80', bg: 'rgba(74,222,128,0.12)' },
  { id: 'pausa',        label: 'En Pausa',           color: '#9CA3AF', bg: 'rgba(156,163,175,0.12)' },
  { id: 'baja',         label: 'Baja',               color: '#F87171', bg: 'rgba(248,113,113,0.12)' },
]

const DEFAULT_RUBROS = [
  { id: 'gastronomia',  label: 'Gastronomía',    color: '#F59E0B' },
  { id: 'moda',         label: 'Moda',           color: '#EC4899' },
  { id: 'wellness',     label: 'Wellness',       color: '#4ADE80' },
  { id: 'tecnologia',   label: 'Tecnología',     color: '#60A5FA' },
  { id: 'deporte',      label: 'Deporte',        color: '#8B5CF6' },
  { id: 'belleza',      label: 'Belleza',        color: '#F472B6' },
  { id: 'viajes',       label: 'Viajes',         color: '#22D3EE' },
  { id: 'entretenimiento', label: 'Entretenimiento', color: '#A78BFA' },
  { id: 'retail',       label: 'Retail',         color: '#FCD34D' },
  { id: 'servicios',    label: 'Servicios',      color: '#9CA3AF' },
]

const DEFAULT_SISTEMAS = ['Resilio Life', 'Agencia Creativa', 'Elevare', 'Productora']
const CANALES  = ['Instagram DM', 'WhatsApp', 'Email', 'Llamada', 'Referido', 'LinkedIn']

const PROVINCIAS_AR = [
  'Buenos Aires', 'CABA', 'Córdoba', 'Santa Fe', 'Mendoza',
  'Tucumán', 'Entre Ríos', 'Salta', 'Misiones', 'Chaco',
  'Corrientes', 'Santiago del Estero', 'San Juan', 'Jujuy',
  'Río Negro', 'Neuquén', 'Formosa', 'Chubut', 'San Luis',
  'Catamarca', 'La Rioja', 'La Pampa', 'Santa Cruz', 'Tierra del Fuego'
]

const generateId = () => `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`

const DEMO_PIPELINE = [
  { id: '1', nombre: 'Café Palermo', ciudad: 'Buenos Aires', provincia: 'CABA', rubro: 'gastronomia', sistema: 'Resilio Life', canal: 'Instagram DM', estado: 'nuevo', seguimiento: '2026-05-08', contacto: 'Martín López', telefono: '+54 11 4567-8901' },
  { id: '2', nombre: 'Studio Fit', ciudad: 'Córdoba', provincia: 'Córdoba', rubro: 'wellness', sistema: 'Resilio Life', canal: 'WhatsApp', estado: 'contactado', seguimiento: '2026-05-06', contacto: 'Ana García', telefono: '+54 351 234-5678' },
  { id: '3', nombre: 'Modas Luna', ciudad: 'Rosario', provincia: 'Santa Fe', rubro: 'moda', sistema: 'Resilio Life', canal: 'Email', estado: 'propuesta', seguimiento: '2026-05-07', contacto: 'Laura Méndez', telefono: '+54 341 678-9012' },
  { id: '4', nombre: 'TechHub BA', ciudad: 'Buenos Aires', provincia: 'CABA', rubro: 'tecnologia', sistema: 'Agencia Creativa', canal: 'LinkedIn', estado: 'reunion', seguimiento: '2026-05-10', contacto: 'Carlos Torres', telefono: '+54 11 9876-5432' },
  { id: '5', nombre: 'Bella Estética', ciudad: 'Mendoza', provincia: 'Mendoza', rubro: 'belleza', sistema: 'Resilio Life', canal: 'Instagram DM', estado: 'cerrada', seguimiento: '2026-04-30', contacto: 'Valentina Ruiz', telefono: '+54 261 345-6789' },
  { id: '6', nombre: 'Aventura Sur', ciudad: 'Bariloche', provincia: 'Río Negro', rubro: 'viajes', sistema: 'Resilio Life', canal: 'WhatsApp', estado: 'interes', seguimiento: '2026-05-09', contacto: 'Pablo Herrera', telefono: '+54 294 567-8901' },
  { id: '7', nombre: 'Foodie Express', ciudad: 'Tucumán', provincia: 'Tucumán', rubro: 'gastronomia', sistema: 'Resilio Life', canal: 'Llamada', estado: 'negociacion', seguimiento: '2026-05-05', contacto: 'Diego Paz', telefono: '+54 381 234-5678' },
  { id: '8', nombre: 'Run & Jump', ciudad: 'Buenos Aires', provincia: 'CABA', rubro: 'deporte', sistema: 'Resilio Life', canal: 'Instagram DM', estado: 'pausa', seguimiento: '2026-05-15', contacto: 'Sofía Vidal', telefono: '+54 11 2345-6789' },
]

const DEMO_PROVINCIAS = PROVINCIAS_AR.map((p, i) => ({
  nombre: p,
  estado: i < 5 ? 'activa' : i < 12 ? 'en_proceso' : 'pendiente',
  progreso: i < 5 ? Math.floor(40 + i*12) : i < 12 ? Math.floor(10 + i*4) : Math.floor(i*0.5),
  marcas: i < 5 ? Math.floor(5 + i*4) : i < 12 ? Math.floor(1 + i) : 0,
}))

const DEMO_CIUDADES = [
  { id:'c1', nombre:'Buenos Aires', provincia:'CABA', pais:'Argentina', marcas:24, estado:'activa' },
  { id:'c2', nombre:'Córdoba', provincia:'Córdoba', pais:'Argentina', marcas:18, estado:'activa' },
  { id:'c3', nombre:'Rosario', provincia:'Santa Fe', pais:'Argentina', marcas:12, estado:'activa' },
  { id:'c4', nombre:'Mendoza', provincia:'Mendoza', pais:'Argentina', marcas:8, estado:'activa' },
  { id:'c5', nombre:'Bariloche', provincia:'Río Negro', pais:'Argentina', marcas:5, estado:'en_proceso' },
  { id:'c6', nombre:'Tucumán', provincia:'Tucumán', pais:'Argentina', marcas:4, estado:'en_proceso' },
  { id:'c7', nombre:'Salta', provincia:'Salta', pais:'Argentina', marcas:2, estado:'en_proceso' },
  { id:'c8', nombre:'Mar del Plata', provincia:'Buenos Aires', pais:'Argentina', marcas:0, estado:'pendiente' },
]

// ── Helper Components ───────────────────────────────────────
const RubroTag = ({ rubroId, rubros }) => {
  const r = (rubros||DEFAULT_RUBROS).find(r => r.id === rubroId) || { label: rubroId, color: '#9CA3AF' }
  return (
    <span style={{ display:'inline-flex', alignItems:'center', padding:'2px 8px', borderRadius:20, fontSize:10, fontWeight:600, background:`${r.color}22`, color:r.color, border:`1px solid ${r.color}44` }}>
      {r.label}
    </span>
  )
}

const UrgencyBadge = ({ fecha }) => {
  if (!fecha) return null
  const diff = Math.ceil((new Date(fecha) - new Date()) / (1000*60*60*24))
  if (diff < 0) return <span style={{ padding:'2px 7px', borderRadius:10, fontSize:9, fontWeight:700, background:'rgba(248,113,113,0.2)', color:'#F87171', border:'1px solid rgba(248,113,113,0.4)' }}>VENCIDO</span>
  if (diff <= 1) return <span style={{ padding:'2px 7px', borderRadius:10, fontSize:9, fontWeight:700, background:'rgba(248,113,113,0.2)', color:'#F87171', border:'1px solid rgba(248,113,113,0.4)' }}>HOY</span>
  if (diff <= 3) return <span style={{ padding:'2px 7px', borderRadius:10, fontSize:9, fontWeight:700, background:'rgba(245,158,11,0.2)', color:'#FCD34D', border:'1px solid rgba(245,158,11,0.4)' }}>{diff}d</span>
  return null
}

// ── Brand Modal (con "+" para rubros y sistemas) ────────────
const BrandModal = ({ brand, onSave, onClose, rubros, sistemas, onAddRubro, onAddSistema }) => {
  const EMPTY = { nombre:'', ciudad:'', provincia:'Buenos Aires', rubro: rubros?.[0]?.id||'gastronomia', sistema: sistemas?.[0]||'Resilio Life', canal:'Instagram DM', estado:'nuevo', seguimiento:'', contacto:'', telefono:'', instagram:'', email:'', notas:'' }
  const [form, setForm] = useState(brand || EMPTY)
  const [newRubro, setNewRubro] = useState('')
  const [newSistema, setNewSistema] = useState('')
  const [showAddRubro, setShowAddRubro] = useState(false)
  const [showAddSistema, setShowAddSistema] = useState(false)
  const set = (f, v) => setForm(p => ({ ...p, [f]: v }))

  const handleAddRubro = () => {
    if (!newRubro.trim()) return
    const id = newRubro.toLowerCase().replace(/\s+/g,'_')
    onAddRubro({ id, label: newRubro.trim(), color: '#8B5CF6' })
    set('rubro', id)
    setNewRubro('')
    setShowAddRubro(false)
  }

  const handleAddSistema = () => {
    if (!newSistema.trim()) return
    onAddSistema(newSistema.trim())
    set('sistema', newSistema.trim())
    setNewSistema('')
    setShowAddSistema(false)
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', backdropFilter:'blur(8px)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }} onClick={onClose}>
      <div style={{ width:'100%', maxWidth:560, background:'var(--bg-secondary)', border:'1px solid rgba(139,92,246,0.4)', borderRadius:20, maxHeight:'90vh', overflowY:'auto', boxShadow:'var(--glow-violet),0 40px 80px rgba(0,0,0,0.6)', animation:'fadeIn 0.3s ease' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding:'20px 24px', borderBottom:'1px solid var(--border-violet)', display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:40, height:40, borderRadius:12, background:'linear-gradient(135deg,var(--primary-violet),var(--accent-magenta))', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>📞</div>
          <h2 style={{ fontSize:16, fontWeight:700 }}>{brand ? 'Editar Marca' : 'Nueva Marca en Pipeline'}</h2>
          <button onClick={onClose} style={{ marginLeft:'auto', color:'var(--text-secondary)', padding:6, borderRadius:8 }}><X size={18}/></button>
        </div>
        <div style={{ padding:'20px 24px', display:'flex', flexDirection:'column', gap:14 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <F label="Nombre *"><input className="input-field" value={form.nombre} onChange={e=>set('nombre',e.target.value)} placeholder="Café Palermo"/></F>
            <F label="Contacto"><input className="input-field" value={form.contacto} onChange={e=>set('contacto',e.target.value)} placeholder="Nombre del dueño"/></F>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <F label="Ciudad"><input className="input-field" value={form.ciudad} onChange={e=>set('ciudad',e.target.value)} placeholder="Buenos Aires"/></F>
            <F label="Provincia">
              <select className="select-field" value={form.provincia} onChange={e=>set('provincia',e.target.value)}>
                {PROVINCIAS_AR.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </F>
          </div>
          {/* Rubro con "+" */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <F label="Rubro">
              <div style={{ display:'flex', gap:6 }}>
                <select className="select-field" value={form.rubro} onChange={e=>set('rubro',e.target.value)}>
                  {(rubros||DEFAULT_RUBROS).map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                </select>
                <button onClick={()=>setShowAddRubro(p=>!p)} style={{ width:38, height:38, borderRadius:10, background:'rgba(139,92,246,0.15)', border:'1px solid var(--border-violet)', color:'var(--primary-violet-light)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><Plus size={14}/></button>
              </div>
              {showAddRubro && (
                <div style={{ display:'flex', gap:6, marginTop:6 }}>
                  <input className="input-field" value={newRubro} onChange={e=>setNewRubro(e.target.value)} placeholder="Nuevo rubro..." style={{ flex:1 }} onKeyDown={e=>e.key==='Enter'&&handleAddRubro()}/>
                  <button onClick={handleAddRubro} style={{ padding:'6px 12px', borderRadius:8, background:'rgba(74,222,128,0.15)', color:'#4ADE80', border:'1px solid rgba(74,222,128,0.4)', fontSize:12, fontWeight:600 }}><Check size={13}/></button>
                </div>
              )}
            </F>
            {/* Sistema con "+" */}
            <F label="Sistema">
              <div style={{ display:'flex', gap:6 }}>
                <select className="select-field" value={form.sistema} onChange={e=>set('sistema',e.target.value)}>
                  {(sistemas||DEFAULT_SISTEMAS).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <button onClick={()=>setShowAddSistema(p=>!p)} style={{ width:38, height:38, borderRadius:10, background:'rgba(139,92,246,0.15)', border:'1px solid var(--border-violet)', color:'var(--primary-violet-light)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><Plus size={14}/></button>
              </div>
              {showAddSistema && (
                <div style={{ display:'flex', gap:6, marginTop:6 }}>
                  <input className="input-field" value={newSistema} onChange={e=>setNewSistema(e.target.value)} placeholder="Nuevo sistema..." style={{ flex:1 }} onKeyDown={e=>e.key==='Enter'&&handleAddSistema()}/>
                  <button onClick={handleAddSistema} style={{ padding:'6px 12px', borderRadius:8, background:'rgba(74,222,128,0.15)', color:'#4ADE80', border:'1px solid rgba(74,222,128,0.4)', fontSize:12, fontWeight:600 }}><Check size={13}/></button>
                </div>
              )}
            </F>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <F label="Canal">
              <select className="select-field" value={form.canal} onChange={e=>set('canal',e.target.value)}>
                {CANALES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </F>
            <F label="Fecha Seguimiento"><input className="input-field" type="date" value={form.seguimiento} onChange={e=>set('seguimiento',e.target.value)}/></F>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <F label="Teléfono"><input className="input-field" value={form.telefono} onChange={e=>set('telefono',e.target.value)} placeholder="+54 11 1234-5678"/></F>
            <F label="Instagram"><input className="input-field" value={form.instagram} onChange={e=>set('instagram',e.target.value)} placeholder="@marca"/></F>
          </div>
          <F label="Email"><input className="input-field" type="email" value={form.email} onChange={e=>set('email',e.target.value)} placeholder="contacto@marca.com"/></F>
          <F label="Estado">
            <select className="select-field" value={form.estado} onChange={e=>set('estado',e.target.value)}>
              {PIPELINE_STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </F>
          <F label="Notas">
            <textarea className="input-field" value={form.notas} onChange={e=>set('notas',e.target.value)} rows={3} style={{ resize:'vertical' }} placeholder="Observaciones..."/>
          </F>
        </div>
        <div style={{ padding:'16px 24px', borderTop:'1px solid var(--border-violet)', display:'flex', gap:10, justifyContent:'flex-end' }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={() => { if(!form.nombre.trim()) return; onSave({ ...form, id: brand?.id || generateId() }); onClose() }}>
            <Save size={14}/>{brand ? 'Guardar' : 'Agregar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── PIPELINE TAB ────────────────────────────────────────────
function PipelineTab({ brands, onSaveBrand, onDeleteBrand, rubros, sistemas, onAddRubro, onAddSistema }) {
  const [search, setSearch] = useState('')
  const [filterRubro, setFilterRubro] = useState('all')
  const [filterSistema, setFilterSistema] = useState('all')
  const [filterProvincia, setFilterProvincia] = useState('all')
  const [filterEstado, setFilterEstado] = useState('all')
  const [modal, setModal] = useState(null)
  const [detailBrand, setDetailBrand] = useState(null)

  const filtered = useMemo(() => (brands || []).filter(b => {
    if (search && !b.nombre.toLowerCase().includes(search.toLowerCase()) && !b.ciudad.toLowerCase().includes(search.toLowerCase())) return false
    if (filterRubro !== 'all' && b.rubro !== filterRubro) return false
    if (filterSistema !== 'all' && b.sistema !== filterSistema) return false
    if (filterProvincia !== 'all' && b.provincia !== filterProvincia) return false
    if (filterEstado !== 'all' && b.estado !== filterEstado) return false
    return true
  }), [brands, search, filterRubro, filterSistema, filterProvincia, filterEstado])

  return (
    <div style={{ animation:'fadeIn 0.3s ease' }}>
      <div style={{ display:'flex', gap:10, marginBottom:20, flexWrap:'wrap' }}>
        <div style={{ position:'relative', flex:1, minWidth:200 }}>
          <Search size={14} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--text-secondary)' }}/>
          <input className="input-field" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar marca o ciudad..." style={{ paddingLeft:36 }}/>
        </div>
        <select className="select-field" style={{ width:'auto', minWidth:130 }} value={filterRubro} onChange={e=>setFilterRubro(e.target.value)}>
          <option value="all">Todos los rubros</option>
          {(rubros||DEFAULT_RUBROS).map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
        </select>
        <select className="select-field" style={{ width:'auto', minWidth:140 }} value={filterSistema} onChange={e=>setFilterSistema(e.target.value)}>
          <option value="all">Todos los sistemas</option>
          {(sistemas||DEFAULT_SISTEMAS).map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="select-field" style={{ width:'auto', minWidth:130 }} value={filterEstado} onChange={e=>setFilterEstado(e.target.value)}>
          <option value="all">Todos los estados</option>
          {PIPELINE_STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
        <button className="btn btn-primary" onClick={() => setModal('create')}><Plus size={15}/>Nueva Marca</button>
      </div>

      <div style={{ overflowX:'auto', paddingBottom:16 }}>
        <div style={{ display:'flex', gap:14, minWidth:'max-content' }}>
          {PIPELINE_STAGES.map(stage => {
            const stageItems = filtered.filter(b => b.estado === stage.id)
            return (
              <div key={stage.id} style={{ width:230, flexShrink:0 }}>
                <div style={{ padding:'10px 14px', borderRadius:'12px 12px 0 0', background:stage.bg, border:`1px solid ${stage.color}44`, borderBottom:'none', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <span style={{ fontSize:12, fontWeight:700, color:stage.color }}>{stage.label}</span>
                  <span style={{ padding:'2px 8px', borderRadius:10, fontSize:11, fontWeight:700, background:`${stage.color}33`, color:stage.color }}>{stageItems.length}</span>
                </div>
                <div style={{ minHeight:200, background:'rgba(139,92,246,0.03)', border:`1px solid ${stage.color}33`, borderRadius:'0 0 12px 12px', padding:8, display:'flex', flexDirection:'column', gap:8 }}>
                  {stageItems.map(brand => (
                    <div key={brand.id} onClick={() => setDetailBrand(brand)}
                      style={{ background:'var(--glass-bg)', border:'1px solid var(--border-violet)', borderRadius:10, padding:'12px 14px', cursor:'pointer', transition:'all 0.2s', backdropFilter:'blur(20px)' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor=stage.color; e.currentTarget.style.boxShadow=`0 0 12px ${stage.color}33`; e.currentTarget.style.transform='translateY(-2px)' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border-violet)'; e.currentTarget.style.boxShadow='none'; e.currentTarget.style.transform='none' }}>
                      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:6, marginBottom:8 }}>
                        <span style={{ fontSize:13, fontWeight:700, lineHeight:1.3 }}>{brand.nombre}</span>
                        <UrgencyBadge fecha={brand.seguimiento}/>
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:4, fontSize:11, color:'var(--text-secondary)', marginBottom:6 }}>
                        <MapPin size={10}/>{brand.ciudad}
                      </div>
                      <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginBottom:6 }}>
                        <RubroTag rubroId={brand.rubro} rubros={rubros}/>
                        <span style={{ padding:'2px 7px', borderRadius:10, fontSize:9, fontWeight:600, background:'rgba(139,92,246,0.15)', color:'var(--primary-violet-light)', border:'1px solid var(--border-violet)' }}>{brand.sistema}</span>
                      </div>
                      <div style={{ fontSize:10, color:'var(--text-secondary)' }}>
                        📱 {brand.canal} {brand.seguimiento && `· ${new Date(brand.seguimiento).toLocaleDateString('es-AR',{day:'2-digit',month:'short'})}`}
                      </div>
                    </div>
                  ))}
                  {stageItems.length === 0 && (
                    <div style={{ textAlign:'center', padding:'24px 8px', color:'var(--text-secondary)', fontSize:12, opacity:0.5 }}>Sin marcas</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {detailBrand && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', backdropFilter:'blur(8px)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }} onClick={() => setDetailBrand(null)}>
          <div style={{ width:'100%', maxWidth:500, background:'var(--bg-secondary)', border:'1px solid rgba(139,92,246,0.4)', borderRadius:20, maxHeight:'90vh', overflowY:'auto', animation:'fadeIn 0.3s ease' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding:'20px 24px', borderBottom:'1px solid var(--border-violet)', display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ width:44, height:44, borderRadius:14, background:'linear-gradient(135deg,var(--primary-violet),var(--accent-magenta))', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>🏢</div>
              <div>
                <h2 style={{ fontSize:17, fontWeight:700 }}>{detailBrand.nombre}</h2>
                <p style={{ fontSize:12, color:'var(--text-secondary)' }}>{detailBrand.ciudad}, {detailBrand.provincia}</p>
              </div>
              <div style={{ marginLeft:'auto', display:'flex', gap:8 }}>
                <button onClick={() => { setModal(detailBrand); setDetailBrand(null) }} style={{ padding:'6px 12px', borderRadius:8, fontSize:12, fontWeight:600, background:'rgba(139,92,246,0.15)', color:'var(--primary-violet-light)', border:'1px solid var(--border-violet)' }}>
                  <Edit3 size={13}/>
                </button>
                <button onClick={() => setDetailBrand(null)} style={{ color:'var(--text-secondary)', padding:6, borderRadius:8 }}><X size={18}/></button>
              </div>
            </div>
            <div style={{ padding:'20px 24px', display:'flex', flexDirection:'column', gap:16 }}>
              <div>
                <label style={{ fontSize:12, fontWeight:600, color:'var(--text-secondary)', display:'block', marginBottom:8 }}>Estado</label>
                <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                  {PIPELINE_STAGES.map(s => (
                    <button key={s.id} onClick={() => { onSaveBrand({ ...detailBrand, estado:s.id }); setDetailBrand(p => ({...p, estado:s.id})) }}
                      style={{ padding:'5px 12px', borderRadius:8, fontSize:11, fontWeight:600, border:`1px solid ${detailBrand.estado===s.id?s.color:'var(--border-violet)'}`, background:detailBrand.estado===s.id?s.bg:'transparent', color:detailBrand.estado===s.id?s.color:'var(--text-secondary)', transition:'all 0.2s' }}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                {[
                  { label:'Contacto', value:detailBrand.contacto, icon:'👤' },
                  { label:'Teléfono', value:detailBrand.telefono, icon:'📱' },
                  { label:'Instagram', value:detailBrand.instagram, icon:'📸' },
                  { label:'Email', value:detailBrand.email, icon:'✉️' },
                  { label:'Canal', value:detailBrand.canal, icon:'📡' },
                  { label:'Sistema', value:detailBrand.sistema, icon:'⚡' },
                  { label:'Rubro', value:(rubros||DEFAULT_RUBROS).find(r=>r.id===detailBrand.rubro)?.label, icon:'🏷' },
                  { label:'Seguimiento', value:detailBrand.seguimiento ? new Date(detailBrand.seguimiento).toLocaleDateString('es-AR') : '-', icon:'📅' },
                ].map(item => (
                  <div key={item.label} style={{ background:'rgba(139,92,246,0.06)', borderRadius:10, padding:'10px 14px', border:'1px solid var(--border-violet)' }}>
                    <div style={{ fontSize:11, color:'var(--text-secondary)', marginBottom:4 }}>{item.icon} {item.label}</div>
                    <div style={{ fontSize:13, fontWeight:600 }}>{item.value || '—'}</div>
                  </div>
                ))}
              </div>
              {detailBrand.notas && (
                <div style={{ background:'rgba(139,92,246,0.06)', borderRadius:10, padding:'12px 14px', border:'1px solid var(--border-violet)' }}>
                  <div style={{ fontSize:11, color:'var(--text-secondary)', marginBottom:6 }}>📝 Notas</div>
                  <p style={{ fontSize:13, lineHeight:1.6 }}>{detailBrand.notas}</p>
                </div>
              )}
            </div>
            <div style={{ padding:'14px 24px', borderTop:'1px solid var(--border-violet)', display:'flex', gap:10, justifyContent:'flex-end' }}>
              <button onClick={() => { if(window.confirm(`¿Eliminar ${detailBrand.nombre}?`)){onDeleteBrand(detailBrand.id);setDetailBrand(null)} }} style={{ padding:'8px 14px', borderRadius:10, fontSize:13, background:'rgba(239,68,68,0.1)', color:'#F87171', border:'1px solid rgba(239,68,68,0.3)' }}>
                <Trash2 size={13}/>
              </button>
              <button className="btn btn-primary" onClick={() => setDetailBrand(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {modal && <BrandModal brand={modal === 'create' ? null : modal} onSave={data => onSaveBrand(data)} onClose={() => setModal(null)} rubros={rubros} sistemas={sistemas} onAddRubro={onAddRubro} onAddSistema={onAddSistema}/>}
    </div>
  )
}

// ── BÚSQUEDA TAB (6 cards) ──────────────────────────────────
const BUSQUEDA_CARDS = {
  instagram: [
    {
      id: 'ig1', icon: '🔖', title: 'Por hashtag de ciudad',
      desc: 'Buscar hashtag ciudad + rubro para encontrar marcas activas.',
      content: [
        { label: 'Ejemplos de hashtags', items: ['#restaurantecordoba', '#modamendoza', '#wellnessrosario', '#gymcaba', '#cafebuenosaires', '#bellezatucuman'] },
        { label: 'Filtros recomendados', items: ['Publicaciones últimos 30 días', 'Cuenta con más de 500 seguidores', 'Tiene dirección o bio activa'] },
      ],
      defaultNotes: 'Anotar hashtags relevantes para tu zona...'
    },
    {
      id: 'ig2', icon: '📍', title: 'Por ubicación',
      desc: 'Buscar en "Lugares" el nombre de una ciudad para ver publicaciones geoetiquetadas.',
      content: [
        { label: 'Criterios de filtro', items: ['Seguidores: 1K–50K', 'Última publicación < 30 días', 'Tiene dirección o link en bio', 'Engagement visible en publicaciones'] },
        { label: 'Ciudades prioritarias', items: ['Buenos Aires / CABA', 'Córdoba Capital', 'Rosario Centro', 'Mendoza Capital', 'Tucumán Capital'] },
      ],
      defaultNotes: 'Registrar perfiles encontrados por ubicación...'
    },
    {
      id: 'ig3', icon: '🏆', title: 'Por competidores',
      desc: 'Analizar seguidores y seguidos de cuentas similares para encontrar marcas objetivo.',
      content: [
        { label: 'Estrategias', items: ['Ver seguidores de clubes locales', 'Ver seguidos de guías gastronómicas', 'Ver "cuentas similares" de marcas ya sumadas', 'Analizar comentaristas frecuentes'] },
        { label: 'Cuentas de referencia', items: ['@guia_gastronomica_cba', '@mejoresrestaurantes_arg', '@tiendas_moda_argentina'] },
      ],
      defaultNotes: 'Lista de cuentas analizadas...'
    },
  ],
  gmaps: [
    {
      id: 'gm1', icon: '🔍', title: 'Búsqueda directa',
      desc: 'Formato: [rubro] + [ciudad/zona] en Google Maps.',
      content: [
        { label: 'Ejemplos de búsqueda', items: ['"restaurantes" Córdoba centro', '"gym" Mendoza Godoy Cruz', '"indumentaria mujer" Tucumán', '"estetica" Buenos Aires Palermo', '"cafeteria" Rosario centro'] },
        { label: 'Rubros prioritarios', items: ['Gastronomía', 'Fitness/Wellness', 'Moda/Indumentaria', 'Belleza/Estética', 'Tecnología/Gaming'] },
      ],
      defaultNotes: 'Búsquedas realizadas...'
    },
    {
      id: 'gm2', icon: '⚙️', title: 'Filtros útiles',
      desc: 'Criterios para identificar marcas de calidad con presencia digital activa.',
      content: [
        { label: 'Criterios de calidad', items: ['Rating 4.0 o superior', 'Más de 20 reseñas reales', 'Tiene sitio web o Instagram en el perfil', 'Horarios actualizados', 'Fotos actualizadas < 6 meses'] },
        { label: 'Señales de alerta', items: ['Sin web ni redes sociales', 'Menos de 5 reseñas', 'Rating menor a 3.5', 'Perfil sin actualizar hace +1 año'] },
      ],
      defaultNotes: 'Criterios personalizados...'
    },
    {
      id: 'gm3', icon: '📤', title: 'Exportar lista',
      desc: 'Herramientas para extraer y trabajar con listas de negocios en escala.',
      content: [
        { label: 'Herramientas recomendadas', items: ['outscraper.com — extracción masiva', 'PhantomBuster — automatización', 'Apollo.io — datos de contacto', 'Google Sheets + Maps API'] },
        { label: 'Flujo de trabajo', items: ['1. Exportar lista CSV con nombre + teléfono + web', '2. Filtrar por rating y reseñas', '3. Cargar en pipeline de Captación', '4. Asignar agente y comenzar contacto'] },
      ],
      defaultNotes: 'Listas exportadas y resultados...'
    },
  ]
}

function BusquedaTab() {
  const [activeSource, setActiveSource] = useState('instagram')
  const [editingCard, setEditingCard] = useState(null)
  const [cardNotes, setCardNotes] = useState({})
  const [editNoteTemp, setEditNoteTemp] = useState('')

  const currentCards = BUSQUEDA_CARDS[activeSource]

  const startEdit = (cardId, currentNote) => {
    setEditingCard(cardId)
    setEditNoteTemp(cardNotes[cardId] || currentNote || '')
  }

  const saveNote = (cardId) => {
    setCardNotes(p => ({ ...p, [cardId]: editNoteTemp }))
    setEditingCard(null)
  }

  return (
    <div style={{ animation:'fadeIn 0.3s ease' }}>
      <div style={{ display:'flex', gap:10, marginBottom:24 }}>
        {[{ id:'instagram', label:'Instagram', icon:'📸' }, { id:'gmaps', label:'Google Maps', icon:'🗺️' }].map(s => (
          <button key={s.id} onClick={() => setActiveSource(s.id)}
            style={{ padding:'10px 20px', borderRadius:12, fontSize:13, fontWeight:600, border:`1px solid ${activeSource===s.id?'var(--primary-violet)':'var(--border-violet)'}`, background:activeSource===s.id?'rgba(139,92,246,0.2)':'rgba(139,92,246,0.05)', color:activeSource===s.id?'var(--primary-violet-light)':'var(--text-secondary)', transition:'all 0.2s' }}>
            {s.icon} {s.label}
          </button>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))', gap:16 }}>
        {currentCards.map(card => (
          <div key={card.id} className="card" style={{ padding:20 }}>
            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:12 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ width:40, height:40, borderRadius:12, background:'rgba(139,92,246,0.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>{card.icon}</div>
                <div>
                  <h3 style={{ fontSize:14, fontWeight:700 }}>{card.title}</h3>
                  <p style={{ fontSize:11, color:'var(--text-secondary)', marginTop:2 }}>{card.desc}</p>
                </div>
              </div>
              <button onClick={() => startEdit(card.id, card.defaultNotes)} style={{ width:28, height:28, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(139,92,246,0.1)', border:'1px solid var(--border-violet)', color:'var(--primary-violet-light)', flexShrink:0 }}>
                <Edit3 size={12}/>
              </button>
            </div>

            {card.content.map((section, si) => (
              <div key={si} style={{ marginBottom:12 }}>
                <div style={{ fontSize:11, fontWeight:700, color:'var(--primary-violet-light)', textTransform:'uppercase', letterSpacing:0.5, marginBottom:6 }}>{section.label}</div>
                <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                  {section.items.map((item, ii) => (
                    <div key={ii} style={{ display:'flex', alignItems:'center', gap:8, fontSize:12, color:'var(--text-secondary)', padding:'4px 0' }}>
                      <div style={{ width:5, height:5, borderRadius:'50%', background:'var(--primary-violet)', flexShrink:0 }}/>
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Notes */}
            <div style={{ marginTop:12, paddingTop:12, borderTop:'1px solid var(--border-violet)' }}>
              <div style={{ fontSize:11, fontWeight:600, color:'var(--text-secondary)', marginBottom:6 }}>📝 Notas</div>
              {editingCard === card.id ? (
                <div>
                  <textarea className="input-field" value={editNoteTemp} onChange={e=>setEditNoteTemp(e.target.value)} rows={3} style={{ resize:'vertical', fontSize:12 }}/>
                  <div style={{ display:'flex', gap:6, marginTop:6 }}>
                    <button onClick={() => saveNote(card.id)} style={{ padding:'5px 12px', borderRadius:8, fontSize:12, fontWeight:600, background:'rgba(74,222,128,0.15)', color:'#4ADE80', border:'1px solid rgba(74,222,128,0.4)' }}><Check size={12}/> Guardar</button>
                    <button onClick={() => setEditingCard(null)} style={{ padding:'5px 12px', borderRadius:8, fontSize:12, color:'var(--text-secondary)', border:'1px solid var(--border-violet)' }}>Cancelar</button>
                  </div>
                </div>
              ) : (
                <p style={{ fontSize:12, color:'var(--text-secondary)', fontStyle: cardNotes[card.id] ? 'normal' : 'italic', lineHeight:1.5, cursor:'pointer', minHeight:36 }}
                  onClick={() => startEdit(card.id, card.defaultNotes)}>
                  {cardNotes[card.id] || card.defaultNotes}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── SPEECHES TAB (con edición y categorías) ─────────────────
const SPEECHES_INIT = {
  dm: {
    label: 'DM Instagram', icon: '📸', editable: true,
    items: [{
      id: 'dm1', title: 'DM estándar',
      text: `Hola [nombre/marca] 👋\n\nTe escribo desde Resilio Life. Somos una red de beneficios exclusivos con presencia nacional, y tu marca encaja perfecto en lo que estamos construyendo.\n\nLa propuesta es simple y sin costo: ofrecés un beneficio exclusivo para nuestros miembros (descuento, 2x1, experiencia especial), y nosotros te damos visibilidad en toda la plataforma y nuestros canales.\n\n¿Te interesa? Te cuento más por acá o agendamos una llamada rápida 🤙`
    }]
  },
  whatsapp: {
    label: 'WhatsApp', icon: '💬', editable: true,
    items: [{
      id: 'wa1', title: 'Mensaje inicial',
      text: `Hola [nombre], ¿cómo estás? Soy [tu nombre] de Resilio Life.\n\nEstamos armando la red de beneficios exclusivos más grande de Argentina y queremos que [marca] sea parte.\n\nLa propuesta es sin costo: vos ofrecés un beneficio cada 15 días para nuestros miembros, y nosotros te incluimos en toda la comunicación y eventos de la red.\n\n¿Tenés 10 minutos para una llamada rápida? Te cuento todo.`
    }]
  },
  llamada: {
    label: 'Llamada', icon: '📞', editable: true,
    items: [{
      id: 'll1', title: 'Script de llamada',
      text: `Apertura (2 min):\nResilio Life es la red de beneficios exclusivos más grande del país. Conectamos miembros premium con marcas seleccionadas en todas las provincias.\n\nPropuesta (3 min):\nLa adhesión es completamente gratuita. Lo único que pedimos es un beneficio cada 15 días para nuestros miembros.\n\nLo que ganan (3 min):\nVisibilidad en toda nuestra plataforma digital, redes sociales, prioridad en eventos y campañas especiales.\n\nCierre (2 min):\n¿Les parece si les envío el acuerdo hoy? Son dos páginas, muy simple. Podemos arrancar esta semana.`
    }]
  },
  email: {
    label: 'Email', icon: '✉️', editable: true,
    items: [{
      id: 'em1', title: 'Email de contacto',
      text: `Asunto: Invitación exclusiva — Red Resilio Life\n\nHola [nombre],\n\nMi nombre es [tu nombre] de Resilio Life, la red de beneficios exclusivos con mayor crecimiento en Argentina.\n\nEstamos invitando a [marca] a formar parte como marca adherida. La propuesta es sin costo: ofrecen un beneficio para nuestros miembros y nosotros les damos visibilidad total.\n\n¿Podemos agendar una llamada de 10 minutos esta semana?\n\nSaludos,\n[Tu nombre] — Resilio Life`
    }]
  },
  seguimiento: {
    label: 'Seguimiento', icon: '🔄', editable: true,
    items: [{
      id: 'sg1', title: 'Protocolo de seguimiento',
      text: `48 horas: ¿Pudiste ver la propuesta? Quedo a disposición para cualquier duda.\n\n5 días: Esta semana sumamos [X] marcas nuevas en [ciudad]. Queremos que estén entre las primeras. ¿Arrancamos?\n\n10 días: Entiendo que están ocupados. La invitación queda abierta. Cuando quieran, estamos.`
    }]
  },
  cierre: {
    label: 'Cierre', icon: '✅', editable: true,
    items: [{
      id: 'ce1', title: 'Mensaje de cierre',
      text: `Perfecto [nombre]. Les envío el acuerdo ahora. Son dos páginas, muy simple.\n\nNecesito:\n1. Firma del acuerdo (foto o digital)\n2. El primer beneficio que quieren publicar\n\n¿Les parece bien así?`
    }]
  },
}

const OBJECIONES_INIT = [
  { id:'o1', q: '¿Cuánto cuesta?', a: 'Cero. Sin cuotas, sin comisiones, sin costos ocultos. Solo pedimos que el beneficio sea real y se renueve cada 15 días.' },
  { id:'o2', q: 'No tengo tiempo', a: 'Son literalmente 5 minutos cada 15 días. Nos mandás el beneficio por WhatsApp y nosotros lo publicamos.' },
  { id:'o3', q: '¿Cuántos miembros tienen?', a: 'Estamos en plena expansión. Las marcas que entran ahora tienen prioridad permanente y visibilidad desde el día uno.' },
  { id:'o4', q: 'No puedo dar descuentos', a: 'No tiene que ser descuento. Puede ser prioridad en reservas, regalo con compra, acceso a evento privado.' },
  { id:'o5', q: 'Necesito consultarlo', a: 'Por supuesto. Te envío el acuerdo ahora para que lo revisen. Son dos páginas, sin exclusividad, sin permanencia obligatoria.' },
  { id:'o6', q: 'Ya estoy en otra red', a: 'Perfecto, no hay exclusividad. Cuanta más visibilidad, mejor. Nosotros sumamos un canal más para tu marca, completamente gratis.' },
  { id:'o7', q: '¿Qué pasa si quiero salir?', a: 'Pueden salir cuando quieran con 30 días de aviso. Sin penalidades, sin letras chicas. Está en el contrato.' },
]

function SpeechesTab() {
  const [categories, setCategories] = useState(SPEECHES_INIT)
  const [activeTab, setActiveTab] = useState('dm')
  const [copied, setCopied] = useState('')
  const [objOpen, setObjOpen] = useState(null)
  const [objeciones, setObjeciones] = useState(OBJECIONES_INIT)
  const [expandedSpeech, setExpandedSpeech] = useState({})
  const [editingSpeech, setEditingSpeech] = useState(null)
  const [editText, setEditText] = useState('')
  const [editObjId, setEditObjId] = useState(null)
  const [editObjText, setEditObjText] = useState('')
  const [showAddCategory, setShowAddCategory] = useState(false)
  const [newCatLabel, setNewCatLabel] = useState('')
  const [newCatIcon, setNewCatIcon] = useState('💬')
  const [addingObjQ, setAddingObjQ] = useState('')
  const [addingObjA, setAddingObjA] = useState('')
  const [showAddObj, setShowAddObj] = useState(false)

  const cat = categories[activeTab]

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text).catch(() => {})
    setCopied(id)
    setTimeout(() => setCopied(''), 2000)
  }

  const startEditSpeech = (item) => { setEditingSpeech(item.id); setEditText(item.text) }
  const saveSpeech = (itemId) => {
    setCategories(p => ({ ...p, [activeTab]: { ...p[activeTab], items: p[activeTab].items.map(it => it.id===itemId?{...it,text:editText}:it) } }))
    setEditingSpeech(null)
  }

  const addSpeechToCategory = () => {
    const newId = `${activeTab}_${Date.now()}`
    setCategories(p => ({ ...p, [activeTab]: { ...p[activeTab], items: [...p[activeTab].items, { id:newId, title:'Nuevo speech', text:'' }] } }))
    setEditingSpeech(newId)
    setEditText('')
  }

  const addCategory = () => {
    if (!newCatLabel.trim()) return
    const id = newCatLabel.toLowerCase().replace(/\s+/g,'_')
    setCategories(p => ({ ...p, [id]: { label:newCatLabel.trim(), icon:newCatIcon, editable:true, items:[{ id:`${id}_1`, title:'Speech inicial', text:'' }] } }))
    setActiveTab(id)
    setNewCatLabel('')
    setShowAddCategory(false)
    setEditingSpeech(`${id}_1`)
    setEditText('')
  }

  const saveObj = (id) => {
    setObjeciones(p => p.map(o => o.id===id ? {...o, a:editObjText} : o))
    setEditObjId(null)
  }

  const addObj = () => {
    if (!addingObjQ.trim()) return
    setObjeciones(p => [...p, { id:`o${Date.now()}`, q:addingObjQ.trim(), a:addingObjA.trim() }])
    setAddingObjQ('')
    setAddingObjA('')
    setShowAddObj(false)
  }

  return (
    <div style={{ animation:'fadeIn 0.3s ease' }}>
      {/* Category tabs */}
      <div style={{ display:'flex', gap:8, marginBottom:20, flexWrap:'wrap', alignItems:'center' }}>
        {Object.entries(categories).map(([k, v]) => (
          <button key={k} onClick={() => { setActiveTab(k); setEditingSpeech(null) }}
            style={{ padding:'8px 16px', borderRadius:10, fontSize:12, fontWeight:600, border:`1px solid ${activeTab===k?'var(--primary-violet)':'var(--border-violet)'}`, background:activeTab===k?'rgba(139,92,246,0.2)':'rgba(139,92,246,0.05)', color:activeTab===k?'var(--primary-violet-light)':'var(--text-secondary)', transition:'all 0.2s' }}>
            {v.icon} {v.label}
          </button>
        ))}
        <button onClick={() => setShowAddCategory(p=>!p)}
          style={{ padding:'8px 14px', borderRadius:10, fontSize:12, fontWeight:600, border:'1px dashed var(--border-violet)', background:'transparent', color:'var(--text-secondary)', transition:'all 0.2s' }}>
          <Plus size={13}/> Nueva categoría
        </button>
      </div>

      {showAddCategory && (
        <div className="card" style={{ padding:16, marginBottom:20 }}>
          <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
            <input className="input-field" value={newCatIcon} onChange={e=>setNewCatIcon(e.target.value)} placeholder="🗂" style={{ width:60 }}/>
            <input className="input-field" value={newCatLabel} onChange={e=>setNewCatLabel(e.target.value)} placeholder="Nombre de categoría..." style={{ flex:1, minWidth:160 }} onKeyDown={e=>e.key==='Enter'&&addCategory()}/>
            <button onClick={addCategory} style={{ padding:'8px 16px', borderRadius:10, fontSize:13, fontWeight:600, background:'rgba(74,222,128,0.15)', color:'#4ADE80', border:'1px solid rgba(74,222,128,0.4)' }}><Check size={14}/> Crear</button>
            <button onClick={() => setShowAddCategory(false)} style={{ padding:'8px 12px', borderRadius:10, fontSize:13, color:'var(--text-secondary)', border:'1px solid var(--border-violet)' }}><X size={14}/></button>
          </div>
        </div>
      )}

      {/* Speeches list */}
      {cat && (
        <div style={{ marginBottom:24 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
            <h3 style={{ fontSize:15, fontWeight:700 }}>{cat.icon} {cat.label}</h3>
            <button onClick={addSpeechToCategory}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:10, fontSize:12, fontWeight:600, background:'rgba(139,92,246,0.12)', color:'var(--primary-violet-light)', border:'1px solid var(--border-violet)', transition:'all 0.2s' }}>
              <Plus size={13}/> Agregar speech
            </button>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {cat.items.map(item => (
              <div key={item.id} className="card" style={{ padding:20 }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: expandedSpeech[item.id] || editingSpeech===item.id ? 14 : 0 }}>
                  <button onClick={() => setExpandedSpeech(p => ({...p, [item.id]:!p[item.id]}))}
                    style={{ display:'flex', alignItems:'center', gap:8, color:'var(--text-primary)', fontSize:14, fontWeight:600, background:'none', border:'none', cursor:'pointer' }}>
                    {expandedSpeech[item.id] ? <ChevronDown size={15} color="var(--primary-violet-light)"/> : <ChevronRight size={15} color="var(--text-secondary)"/>}
                    {item.title}
                  </button>
                  <div style={{ display:'flex', gap:6 }}>
                    <button onClick={() => handleCopy(item.text, item.id)}
                      style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 12px', borderRadius:8, fontSize:11, fontWeight:600, background:copied===item.id?'rgba(74,222,128,0.15)':'rgba(139,92,246,0.1)', color:copied===item.id?'#4ADE80':'var(--primary-violet-light)', border:`1px solid ${copied===item.id?'rgba(74,222,128,0.4)':'var(--border-violet)'}`, transition:'all 0.3s' }}>
                      {copied===item.id ? <><Check size={11}/> Copiado</> : <><Copy size={11}/> Copiar</>}
                    </button>
                    <button onClick={() => { startEditSpeech(item); setExpandedSpeech(p=>({...p,[item.id]:true})) }}
                      style={{ width:28, height:28, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(139,92,246,0.1)', border:'1px solid var(--border-violet)', color:'var(--primary-violet-light)' }}>
                      <Edit3 size={12}/>
                    </button>
                  </div>
                </div>
                {(expandedSpeech[item.id] || editingSpeech===item.id) && (
                  editingSpeech === item.id ? (
                    <div>
                      <textarea className="input-field" value={editText} onChange={e=>setEditText(e.target.value)} rows={8} style={{ resize:'vertical', fontSize:13, lineHeight:1.7 }}/>
                      <div style={{ display:'flex', gap:8, marginTop:8 }}>
                        <button onClick={() => saveSpeech(item.id)} style={{ padding:'7px 14px', borderRadius:10, fontSize:12, fontWeight:600, background:'rgba(74,222,128,0.15)', color:'#4ADE80', border:'1px solid rgba(74,222,128,0.4)' }}><Check size={13}/> Guardar</button>
                        <button onClick={() => setEditingSpeech(null)} style={{ padding:'7px 12px', borderRadius:10, fontSize:12, color:'var(--text-secondary)', border:'1px solid var(--border-violet)' }}>Cancelar</button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize:13, lineHeight:1.8, color:'var(--text-primary)', background:'rgba(139,92,246,0.04)', borderRadius:10, padding:'14px 16px', border:'1px solid var(--border-violet)', whiteSpace:'pre-line' }}
                      dangerouslySetInnerHTML={{ __html: item.text.replace(/\[([^\]]+)\]/g, '<mark style="background:rgba(139,92,246,0.2);color:#A78BFA;padding:1px 4px;border-radius:4px;font-weight:600">[$1]</mark>') }}/>
                  )
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Objeciones */}
      <div className="card" style={{ padding:20 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
          <h3 style={{ fontSize:14, fontWeight:700 }}>💡 Manejo de Objeciones</h3>
          <button onClick={() => setShowAddObj(p=>!p)}
            style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 12px', borderRadius:10, fontSize:12, fontWeight:600, background:'rgba(139,92,246,0.1)', color:'var(--primary-violet-light)', border:'1px solid var(--border-violet)' }}>
            <Plus size={13}/> Agregar pregunta
          </button>
        </div>
        {showAddObj && (
          <div style={{ marginBottom:14, padding:14, background:'rgba(139,92,246,0.06)', borderRadius:12, border:'1px solid var(--border-violet)', display:'flex', flexDirection:'column', gap:10 }}>
            <input className="input-field" value={addingObjQ} onChange={e=>setAddingObjQ(e.target.value)} placeholder="Pregunta frecuente..."/>
            <textarea className="input-field" value={addingObjA} onChange={e=>setAddingObjA(e.target.value)} rows={3} placeholder="Respuesta..." style={{ resize:'vertical' }}/>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={addObj} style={{ padding:'7px 14px', borderRadius:10, fontSize:12, fontWeight:600, background:'rgba(74,222,128,0.15)', color:'#4ADE80', border:'1px solid rgba(74,222,128,0.4)' }}><Check size={13}/> Agregar</button>
              <button onClick={() => setShowAddObj(false)} style={{ padding:'7px 12px', borderRadius:10, fontSize:12, color:'var(--text-secondary)', border:'1px solid var(--border-violet)' }}>Cancelar</button>
            </div>
          </div>
        )}
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {objeciones.map((obj) => (
            <div key={obj.id} style={{ borderRadius:12, border:'1px solid var(--border-violet)', overflow:'hidden' }}>
              <button onClick={() => setObjOpen(objOpen===obj.id?null:obj.id)}
                style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', background:'rgba(139,92,246,0.06)', color:'var(--text-primary)', fontSize:13, fontWeight:600, textAlign:'left', transition:'all 0.2s' }}
                onMouseEnter={e=>e.currentTarget.style.background='rgba(139,92,246,0.12)'}
                onMouseLeave={e=>e.currentTarget.style.background='rgba(139,92,246,0.06)'}>
                <span>❓ {obj.q}</span>
                <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                  <button onClick={e=>{ e.stopPropagation(); setEditObjId(obj.id); setEditObjText(obj.a); setObjOpen(obj.id) }} style={{ width:24, height:24, borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(139,92,246,0.15)', border:'1px solid var(--border-violet)', color:'var(--primary-violet-light)' }}
                    onMouseEnter={e=>{e.stopPropagation()}}><Edit3 size={11}/></button>
                  {objOpen===obj.id ? <ChevronDown size={14} color="var(--primary-violet-light)"/> : <ChevronRight size={14} color="var(--text-secondary)"/>}
                </div>
              </button>
              {objOpen===obj.id && (
                <div style={{ padding:'12px 16px', background:'rgba(139,92,246,0.04)', fontSize:13, color:'var(--text-secondary)', lineHeight:1.7, borderTop:'1px solid var(--border-violet)' }}>
                  {editObjId === obj.id ? (
                    <div>
                      <textarea className="input-field" value={editObjText} onChange={e=>setEditObjText(e.target.value)} rows={3} style={{ resize:'vertical', fontSize:13, marginBottom:8 }}/>
                      <div style={{ display:'flex', gap:8 }}>
                        <button onClick={() => saveObj(obj.id)} style={{ padding:'5px 12px', borderRadius:8, fontSize:12, fontWeight:600, background:'rgba(74,222,128,0.15)', color:'#4ADE80', border:'1px solid rgba(74,222,128,0.4)' }}><Check size={12}/> Guardar</button>
                        <button onClick={() => setEditObjId(null)} style={{ padding:'5px 10px', borderRadius:8, fontSize:12, color:'var(--text-secondary)', border:'1px solid var(--border-violet)' }}>Cancelar</button>
                      </div>
                    </div>
                  ) : (
                    <>✅ {obj.a}</>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── EXPANSIÓN TAB (Provincias + Ciudades) ───────────────────
function ExpansionTab({ pipeline }) {
  const [subTab, setSubTab] = useState('provincias')
  const [search, setSearch] = useState('')
  const [filterPais, setFilterPais] = useState('all')
  const [filterEstado, setFilterEstado] = useState('all')
  const [ciudades, setCiudades] = useState(DEMO_CIUDADES)
  const [selectedCiudad, setSelectedCiudad] = useState(null)
  const [showAddCiudad, setShowAddCiudad] = useState(false)
  const [newCiudad, setNewCiudad] = useState({ nombre:'', provincia:'', pais:'Argentina' })

  const provinciaStats = useMemo(() => {
    return DEMO_PROVINCIAS.map(p => ({
      ...p,
      marcasPipeline: (pipeline || []).filter(b => b.provincia === p.nombre).length,
    }))
  }, [pipeline])

  const stateColor = { activa:'#4ADE80', en_proceso:'#FCD34D', pendiente:'#9CA3AF' }
  const stateLabel = { activa:'Activa', en_proceso:'En Proceso', pendiente:'Pendiente' }

  const filteredCiudades = ciudades.filter(c => {
    const term = search.toLowerCase()
    if (search && !c.nombre.toLowerCase().includes(term) && !c.provincia.toLowerCase().includes(term) && !c.pais.toLowerCase().includes(term)) return false
    if (filterPais !== 'all' && c.pais !== filterPais) return false
    if (filterEstado !== 'all' && c.estado !== filterEstado) return false
    return true
  })

  const brandsByCity = selectedCiudad ? (pipeline||[]).filter(b => b.ciudad.toLowerCase() === selectedCiudad.nombre.toLowerCase()) : []

  return (
    <div style={{ animation:'fadeIn 0.3s ease' }}>
      {/* Sub-tabs */}
      <div style={{ display:'flex', gap:4, marginBottom:20, background:'rgba(139,92,246,0.06)', borderRadius:12, padding:4, width:'fit-content' }}>
        {[{ id:'provincias', label:'Provincias', icon:'🗺️' }, { id:'ciudades', label:'Ciudades', icon:'🏙️' }].map(t => (
          <button key={t.id} onClick={() => setSubTab(t.id)}
            style={{ padding:'8px 20px', borderRadius:8, fontSize:13, fontWeight:600, border:'none', background:subTab===t.id?'rgba(139,92,246,0.25)':'transparent', color:subTab===t.id?'var(--primary-violet-light)':'var(--text-secondary)', transition:'all 0.2s' }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Search bar for cities */}
      {subTab === 'ciudades' && (
        <div style={{ display:'flex', gap:10, marginBottom:20, flexWrap:'wrap' }}>
          <div style={{ position:'relative', flex:1, minWidth:200 }}>
            <Search size={14} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--text-secondary)' }}/>
            <input className="input-field" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar ciudad, provincia o país..." style={{ paddingLeft:36 }}/>
          </div>
          <select className="select-field" style={{ width:'auto', minWidth:130 }} value={filterEstado} onChange={e=>setFilterEstado(e.target.value)}>
            <option value="all">Todos los estados</option>
            <option value="activa">Activa</option>
            <option value="en_proceso">En Proceso</option>
            <option value="pendiente">Pendiente</option>
          </select>
          <button onClick={() => setShowAddCiudad(true)} className="btn btn-primary"><Plus size={14}/>Nueva Ciudad</button>
        </div>
      )}

      {subTab === 'provincias' && (
        <>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14, marginBottom:24 }}>
            {[
              { label:'Provincias Activas', value:provinciaStats.filter(p=>p.estado==='activa').length, color:'#4ADE80', icon:'✅' },
              { label:'En Proceso', value:provinciaStats.filter(p=>p.estado==='en_proceso').length, color:'#FCD34D', icon:'🔄' },
              { label:'Pendientes', value:provinciaStats.filter(p=>p.estado==='pendiente').length, color:'#9CA3AF', icon:'⏳' },
            ].map(s => (
              <div key={s.label} className="stat-card">
                <div style={{ width:44, height:44, borderRadius:12, background:`${s.color}22`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>{s.icon}</div>
                <div>
                  <div style={{ fontSize:24, fontWeight:700, color:s.color }}>{s.value}</div>
                  <div style={{ fontSize:12, color:'var(--text-secondary)' }}>{s.label}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:14 }}>
            {provinciaStats.map(p => (
              <div key={p.nombre} className="card" style={{ padding:'16px 18px' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
                  <div>
                    <h3 style={{ fontSize:14, fontWeight:700 }}>{p.nombre}</h3>
                    <span style={{ fontSize:11, color:stateColor[p.estado], fontWeight:600 }}>● {stateLabel[p.estado]}</span>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:20, fontWeight:700, color:stateColor[p.estado] }}>{p.progreso}%</div>
                    <div style={{ fontSize:10, color:'var(--text-secondary)' }}>{p.marcas} marcas</div>
                  </div>
                </div>
                <div style={{ height:6, background:'rgba(139,92,246,0.15)', borderRadius:3, overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${p.progreso}%`, background:`linear-gradient(90deg,${stateColor[p.estado]},${stateColor[p.estado]}88)`, borderRadius:3, transition:'width 1s ease' }}/>
                </div>
                {p.marcasPipeline > 0 && (
                  <div style={{ marginTop:8, fontSize:11, color:'var(--primary-violet-light)' }}>🔄 {p.marcasPipeline} en pipeline activo</div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {subTab === 'ciudades' && (
        <>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:14 }}>
            {filteredCiudades.map(c => (
              <div key={c.id} className="card" style={{ padding:'16px 18px', cursor:'pointer', transition:'all 0.2s' }}
                onClick={() => setSelectedCiudad(c)}
                onMouseEnter={e => { e.currentTarget.style.borderColor='var(--primary-violet)'; e.currentTarget.style.transform='translateY(-3px)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border-violet)'; e.currentTarget.style.transform='none' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                  <div>
                    <h3 style={{ fontSize:14, fontWeight:700 }}>{c.nombre}</h3>
                    <p style={{ fontSize:11, color:'var(--text-secondary)', marginTop:2 }}>{c.provincia}, {c.pais}</p>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:18, fontWeight:700, color:stateColor[c.estado] }}>{c.marcas}</div>
                    <div style={{ fontSize:10, color:'var(--text-secondary)' }}>marcas</div>
                  </div>
                </div>
                <span style={{ fontSize:11, fontWeight:600, color:stateColor[c.estado], padding:'2px 10px', borderRadius:20, background:`${stateColor[c.estado]}22`, border:`1px solid ${stateColor[c.estado]}44` }}>
                  ● {stateLabel[c.estado]||c.estado}
                </span>
              </div>
            ))}
            {filteredCiudades.length === 0 && (
              <div style={{ gridColumn:'1/-1', textAlign:'center', padding:'40px', color:'var(--text-secondary)', fontSize:13 }}>Sin ciudades que coincidan</div>
            )}
          </div>
        </>
      )}

      {/* City detail modal */}
      {selectedCiudad && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', backdropFilter:'blur(8px)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }} onClick={() => setSelectedCiudad(null)}>
          <div style={{ width:'100%', maxWidth:580, background:'var(--bg-secondary)', border:'1px solid rgba(139,92,246,0.4)', borderRadius:20, maxHeight:'90vh', overflowY:'auto', animation:'fadeIn 0.3s ease' }} onClick={e=>e.stopPropagation()}>
            <div style={{ padding:'20px 24px', borderBottom:'1px solid var(--border-violet)', display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ width:44, height:44, borderRadius:14, background:'linear-gradient(135deg,var(--primary-violet),var(--accent-magenta))', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>🏙️</div>
              <div>
                <h2 style={{ fontSize:17, fontWeight:700 }}>{selectedCiudad.nombre}</h2>
                <p style={{ fontSize:12, color:'var(--text-secondary)' }}>{selectedCiudad.provincia}, {selectedCiudad.pais}</p>
              </div>
              <button onClick={() => setSelectedCiudad(null)} style={{ marginLeft:'auto', color:'var(--text-secondary)', padding:6, borderRadius:8 }}><X size={18}/></button>
            </div>
            <div style={{ padding:'20px 24px' }}>
              <h3 style={{ fontSize:13, fontWeight:700, color:'var(--text-secondary)', marginBottom:14, textTransform:'uppercase', letterSpacing:0.5 }}>Marcas en esta ciudad por etapa</h3>
              {PIPELINE_STAGES.map(stage => {
                const stageItems = brandsByCity.filter(b => b.estado === stage.id)
                if (stageItems.length === 0) return null
                return (
                  <div key={stage.id} style={{ marginBottom:12 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                      <span style={{ fontSize:12, fontWeight:700, color:stage.color }}>{stage.label}</span>
                      <span style={{ padding:'1px 8px', borderRadius:10, fontSize:10, fontWeight:700, background:`${stage.color}22`, color:stage.color }}>{stageItems.length}</span>
                    </div>
                    {stageItems.map(b => (
                      <div key={b.id} style={{ padding:'10px 14px', borderRadius:10, background:`${stage.color}08`, border:`1px solid ${stage.color}30`, marginBottom:6, fontSize:13 }}>
                        <div style={{ fontWeight:700 }}>{b.nombre}</div>
                        <div style={{ fontSize:11, color:'var(--text-secondary)', marginTop:2 }}>{b.contacto} · {b.canal}</div>
                      </div>
                    ))}
                  </div>
                )
              })}
              {brandsByCity.length === 0 && (
                <div style={{ textAlign:'center', padding:'32px', color:'var(--text-secondary)', fontSize:13 }}>Sin marcas en el pipeline para esta ciudad</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add city modal */}
      {showAddCiudad && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', backdropFilter:'blur(8px)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }} onClick={() => setShowAddCiudad(false)}>
          <div style={{ width:'100%', maxWidth:420, background:'var(--bg-secondary)', border:'1px solid rgba(139,92,246,0.4)', borderRadius:20, padding:28, animation:'fadeIn 0.3s ease' }} onClick={e=>e.stopPropagation()}>
            <h2 style={{ fontSize:16, fontWeight:700, marginBottom:20 }}>Nueva Ciudad</h2>
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <F label="Nombre *"><input className="input-field" value={newCiudad.nombre} onChange={e=>setNewCiudad(p=>({...p,nombre:e.target.value}))} placeholder="Córdoba"/></F>
              <F label="Provincia"><input className="input-field" value={newCiudad.provincia} onChange={e=>setNewCiudad(p=>({...p,provincia:e.target.value}))} placeholder="Córdoba"/></F>
              <F label="País"><input className="input-field" value={newCiudad.pais} onChange={e=>setNewCiudad(p=>({...p,pais:e.target.value}))} placeholder="Argentina"/></F>
            </div>
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:20 }}>
              <button className="btn btn-ghost" onClick={() => setShowAddCiudad(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={() => {
                if(!newCiudad.nombre.trim()) return
                setCiudades(p => [...p, { id:generateId(), ...newCiudad, marcas:0, estado:'pendiente' }])
                setNewCiudad({ nombre:'', provincia:'', pais:'Argentina' })
                setShowAddCiudad(false)
              }}><Save size={14}/> Agregar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── SEGUIMIENTO TAB ─────────────────────────────────────────
function SeguimientoTab({ pipeline, alertas, onSaveAlerta }) {
  const [filterEstado, setFilterEstado] = useState('all')
  const [filterPeriodo, setFilterPeriodo] = useState('all')
  const today = new Date()

  const filteredPipeline = useMemo(() => {
    if (filterEstado === 'all') return pipeline || []
    return (pipeline || []).filter(b => b.estado === filterEstado)
  }, [pipeline, filterEstado])

  const metricsByStage = PIPELINE_STAGES.map(s => ({
    ...s,
    count: (pipeline || []).filter(b => b.estado === s.id).length
  }))

  const totalActive = (pipeline || []).filter(b => !['cerrada','baja'].includes(b.estado)).length
  const closed = (pipeline || []).filter(b => b.estado === 'cerrada').length
  const total = (pipeline || []).length
  const conversion = total > 0 ? Math.round((closed/total)*100) : 0

  const filteredAlertas = useMemo(() => {
    const sorted = [...(alertas||[])].sort((a,b) => new Date(a.fecha) - new Date(b.fecha))
    if (filterPeriodo === 'all') return sorted
    const now = new Date()
    const end = new Date(now)
    if (filterPeriodo === 'hoy') end.setDate(end.getDate())
    else if (filterPeriodo === 'semana') end.setDate(end.getDate() + 7)
    else if (filterPeriodo === 'mes') end.setMonth(end.getMonth() + 1)
    else if (filterPeriodo === 'trimestre') end.setMonth(end.getMonth() + 3)
    return sorted.filter(a => new Date(a.fecha) <= end)
  }, [alertas, filterPeriodo])

  return (
    <div style={{ animation:'fadeIn 0.3s ease' }}>
      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:14, marginBottom:24 }}>
        {[
          { label:'Total Pipeline', value:total, color:'#8B5CF6', icon:'📊' },
          { label:'En Proceso Activo', value:totalActive, color:'#60A5FA', icon:'⚡' },
          { label:'Cerradas', value:closed, color:'#4ADE80', icon:'✅' },
          { label:'Tasa de Conversión', value:`${conversion}%`, color:'#FCD34D', icon:'📈' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div style={{ width:42, height:42, borderRadius:12, background:`${s.color}22`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>{s.icon}</div>
            <div>
              <div style={{ fontSize:22, fontWeight:700, color:s.color }}>{s.value}</div>
              <div style={{ fontSize:11, color:'var(--text-secondary)' }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Cards por etapa */}
      <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' }}>
        <button onClick={() => setFilterEstado('all')}
          style={{ padding:'5px 14px', borderRadius:10, fontSize:12, fontWeight:600, border:`1px solid ${filterEstado==='all'?'var(--primary-violet)':'var(--border-violet)'}`, background:filterEstado==='all'?'rgba(139,92,246,0.2)':'transparent', color:filterEstado==='all'?'var(--primary-violet-light)':'var(--text-secondary)', transition:'all 0.2s' }}>
          Todos ({total})
        </button>
        {PIPELINE_STAGES.map(s => {
          const cnt = metricsByStage.find(m=>m.id===s.id)?.count||0
          if (cnt === 0) return null
          return (
            <button key={s.id} onClick={() => setFilterEstado(s.id)}
              style={{ padding:'5px 14px', borderRadius:10, fontSize:12, fontWeight:600, border:`1px solid ${filterEstado===s.id?s.color:'var(--border-violet)'}`, background:filterEstado===s.id?s.bg:'transparent', color:filterEstado===s.id?s.color:'var(--text-secondary)', transition:'all 0.2s' }}>
              {s.label} ({cnt})
            </button>
          )
        })}
      </div>

      {/* Stage breakdown */}
      <div className="card" style={{ padding:20, marginBottom:20 }}>
        <h3 style={{ fontSize:14, fontWeight:700, marginBottom:14 }}>📊 Distribución por Etapa</h3>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {metricsByStage.filter(s=>s.count>0).map(s => (
            <div key={s.id} style={{ display:'flex', alignItems:'center', gap:12 }}>
              <span style={{ fontSize:12, width:160, color:'var(--text-secondary)', flexShrink:0 }}>{s.label}</span>
              <div style={{ flex:1, height:8, background:'rgba(139,92,246,0.12)', borderRadius:4, overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${total>0?(s.count/total)*100:0}%`, background:s.color, borderRadius:4 }}/>
              </div>
              <span style={{ fontSize:13, fontWeight:700, color:s.color, width:30, textAlign:'right', flexShrink:0 }}>{s.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Alertas */}
      <div className="card" style={{ padding:20 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14, flexWrap:'wrap', gap:10 }}>
          <h3 style={{ fontSize:14, fontWeight:700 }}>🔔 Alertas de Seguimiento</h3>
          <div style={{ display:'flex', gap:6 }}>
            {['all','hoy','semana','mes','trimestre'].map(p => (
              <button key={p} onClick={() => setFilterPeriodo(p)}
                style={{ padding:'4px 12px', borderRadius:8, fontSize:11, fontWeight:600, border:`1px solid ${filterPeriodo===p?'var(--primary-violet)':'var(--border-violet)'}`, background:filterPeriodo===p?'rgba(139,92,246,0.2)':'transparent', color:filterPeriodo===p?'var(--primary-violet-light)':'var(--text-secondary)', transition:'all 0.2s', textTransform:'capitalize' }}>
                {p === 'all' ? 'Todas' : p.charAt(0).toUpperCase()+p.slice(1)}
              </button>
            ))}
          </div>
        </div>
        {filteredAlertas.length === 0 ? (
          <div style={{ textAlign:'center', padding:'24px', color:'var(--text-secondary)', fontSize:13 }}>✅ Sin alertas pendientes</div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {filteredAlertas.map(alerta => {
              const diff = Math.ceil((new Date(alerta.fecha) - today) / (1000*60*60*24))
              const urgColor = diff < 0 ? '#F87171' : diff <= 1 ? '#F87171' : diff <= 3 ? '#FCD34D' : '#60A5FA'
              return (
                <div key={alerta.id} style={{ display:'flex', alignItems:'center', gap:14, padding:'12px 16px', borderRadius:12, background:`${urgColor}10`, border:`1px solid ${urgColor}33` }}>
                  <Bell size={16} color={urgColor} style={{ flexShrink:0 }}/>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:700 }}>{alerta.nombre}</div>
                    <div style={{ fontSize:11, color:'var(--text-secondary)' }}>{alerta.notas || alerta.hora || ''}</div>
                  </div>
                  <div style={{ textAlign:'right', flexShrink:0 }}>
                    <div style={{ fontSize:11, fontWeight:700, color:urgColor }}>{diff < 0 ? 'VENCIDO' : diff === 0 ? 'HOY' : `${diff}d`}</div>
                    <div style={{ fontSize:10, color:'var(--text-secondary)' }}>{alerta.fecha}</div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ── CONTACTOS CRM TAB ───────────────────────────────────────
const CONTACTO_TIPOS  = ['Marca', 'Influencer', 'Proveedor', 'Cliente', 'Lead', 'Público']
const CONTACTO_SUBS   = ['Resilio Life', 'Agencia Creativa', 'Agencia Influencers', 'Productora', 'Elevare']

const DEMO_CONTACTOS = [
  { id:'c1', nombre:'Martín', apellido:'López', subtitulo:'Dueño', telefono:'+54 11 4567-8901', email:'martin@cafepalermo.com', instagram:'@martinlopez', ciudad:'Buenos Aires', pais:'Argentina', tipo:'Marca', subempresa:'Resilio Life', estado:'nuevo', notas:'Dueño de Café Palermo. Interesado en sumarse.' },
  { id:'c2', nombre:'Ana', apellido:'García', subtitulo:'Manager', telefono:'+54 351 234-5678', email:'ana@studiofit.com', instagram:'@anagarcia_fit', ciudad:'Córdoba', pais:'Argentina', tipo:'Marca', subempresa:'Resilio Life', estado:'contactado', notas:'Gym en Córdoba capital.' },
  { id:'c3', nombre:'Laura', apellido:'Méndez', subtitulo:'', telefono:'+54 341 678-9012', email:'laura@modasluna.com', instagram:'@modas_luna', ciudad:'Rosario', pais:'Argentina', tipo:'Lead', subempresa:'Resilio Life', estado:'propuesta', notas:'Marca de moda, propuesta enviada.' },
]

const CONTACTO_EMPTY = { nombre:'', apellido:'', subtitulo:'', telefono:'', email:'', instagram:'', ciudad:'', pais:'Argentina', tipo:'Marca', subempresa:'Resilio Life', estado:'nuevo', notas:'' }

function ContactosTab({ onAddAlerta }) {
  const [contactos, setContactos] = useState(DEMO_CONTACTOS)
  const [search, setSearch] = useState('')
  const [filterTipo, setFilterTipo] = useState('all')
  const [filterEstado, setFilterEstado] = useState('all')
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(CONTACTO_EMPTY)
  const [alertModal, setAlertModal] = useState(null)
  const [alertForm, setAlertForm] = useState({ fecha:'', hora:'', notas:'' })

  const filtered = contactos.filter(c => {
    const term = search.toLowerCase()
    if (search && !`${c.nombre} ${c.apellido} ${c.telefono} ${c.email}`.toLowerCase().includes(term)) return false
    if (filterTipo !== 'all' && c.tipo !== filterTipo) return false
    if (filterEstado !== 'all' && c.estado !== filterEstado) return false
    return true
  })

  const openNew = () => { setForm(CONTACTO_EMPTY); setModal('form') }
  const openEdit = (c) => { setForm(c); setModal('form') }
  const save = () => {
    if (!form.nombre.trim()) return
    if (form.id) setContactos(p => p.map(c => c.id===form.id?form:c))
    else setContactos(p => [...p, { ...form, id:generateId() }])
    setModal(null)
  }
  const del = (id) => setContactos(p => p.filter(c => c.id !== id))
  const set = (f, v) => setForm(p => ({ ...p, [f]:v }))

  const stageForId = (id) => PIPELINE_STAGES.find(s => s.id === id)

  const saveAlerta = () => {
    if (!alertForm.fecha || !alertModal) return
    onAddAlerta({ id:generateId(), nombre:`${alertModal.nombre} ${alertModal.apellido}`, ...alertForm, contactoId:alertModal.id })
    setAlertModal(null)
    setAlertForm({ fecha:'', hora:'', notas:'' })
  }

  return (
    <div style={{ animation:'fadeIn 0.3s ease' }}>
      {/* Stage cards */}
      <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' }}>
        {PIPELINE_STAGES.slice(0,8).map(s => {
          const cnt = contactos.filter(c=>c.estado===s.id).length
          return (
            <button key={s.id} onClick={() => setFilterEstado(filterEstado===s.id?'all':s.id)}
              style={{ padding:'4px 12px', borderRadius:10, fontSize:11, fontWeight:600, border:`1px solid ${filterEstado===s.id?s.color:'var(--border-violet)'}`, background:filterEstado===s.id?s.bg:'transparent', color:filterEstado===s.id?s.color:'var(--text-secondary)', transition:'all 0.2s' }}>
              {s.label} ({cnt})
            </button>
          )
        })}
      </div>

      <div style={{ display:'flex', gap:10, marginBottom:20, flexWrap:'wrap' }}>
        <div style={{ position:'relative', flex:1, minWidth:200 }}>
          <Search size={14} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--text-secondary)' }}/>
          <input className="input-field" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar por nombre, teléfono, email..." style={{ paddingLeft:36 }}/>
        </div>
        <select className="select-field" style={{ width:'auto', minWidth:130 }} value={filterTipo} onChange={e=>setFilterTipo(e.target.value)}>
          <option value="all">Todos los tipos</option>
          {CONTACTO_TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <button className="btn btn-primary" onClick={openNew}><Plus size={15}/>Nuevo Contacto</button>
      </div>

      <div className="card" style={{ overflow:'hidden' }}>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ borderBottom:'1px solid var(--border-violet)' }}>
                {['Nombre', 'Contacto', 'Ciudad', 'Tipo', 'Subempresa', 'Estado', ''].map(h => (
                  <th key={h} style={{ padding:'12px 16px', textAlign:'left', fontSize:11, fontWeight:700, color:'var(--text-secondary)', textTransform:'uppercase', letterSpacing:0.5, whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => {
                const stage = stageForId(c.estado)
                return (
                  <tr key={c.id} style={{ borderBottom:'1px solid rgba(139,92,246,0.08)', background:i%2===0?'transparent':'rgba(139,92,246,0.03)' }}
                    onMouseEnter={e=>e.currentTarget.style.background='rgba(139,92,246,0.08)'}
                    onMouseLeave={e=>e.currentTarget.style.background=i%2===0?'transparent':'rgba(139,92,246,0.03)'}>
                    <td style={{ padding:'12px 16px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <div style={{ width:32, height:32, borderRadius:'50%', background:'linear-gradient(135deg,var(--primary-violet),var(--accent-magenta))', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, flexShrink:0 }}>
                          {c.nombre[0]}{c.apellido[0]||''}
                        </div>
                        <div>
                          <div style={{ fontSize:13, fontWeight:700 }}>{c.nombre} {c.apellido}</div>
                          {c.subtitulo && <div style={{ fontSize:11, color:'var(--text-secondary)' }}>{c.subtitulo}</div>}
                          {c.instagram && <div style={{ fontSize:11, color:'var(--primary-violet-light)' }}>{c.instagram}</div>}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding:'12px 16px' }}>
                      <div style={{ fontSize:12, color:'var(--text-secondary)' }}>{c.telefono}</div>
                      <div style={{ fontSize:11, color:'var(--text-secondary)', opacity:0.7 }}>{c.email}</div>
                    </td>
                    <td style={{ padding:'12px 16px', fontSize:12, color:'var(--text-secondary)' }}>{c.ciudad}, {c.pais}</td>
                    <td style={{ padding:'12px 16px' }}>
                      <span style={{ padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:600, background:'rgba(139,92,246,0.15)', color:'var(--primary-violet-light)', border:'1px solid var(--border-violet)' }}>{c.tipo}</span>
                    </td>
                    <td style={{ padding:'12px 16px', fontSize:12, color:'var(--text-secondary)' }}>{c.subempresa}</td>
                    <td style={{ padding:'12px 16px' }}>
                      {stage ? (
                        <span style={{ padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:600, background:stage.bg, color:stage.color, border:`1px solid ${stage.color}44` }}>{stage.label}</span>
                      ) : (
                        <span style={{ fontSize:11, color:'var(--text-secondary)' }}>{c.estado}</span>
                      )}
                    </td>
                    <td style={{ padding:'12px 16px' }}>
                      <div style={{ display:'flex', gap:5 }}>
                        <button onClick={() => { setAlertModal(c); setAlertForm({ fecha:'', hora:'', notas:'' }) }} title="Agregar alerta" style={{ width:28, height:28, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', color:'#FCD34D', border:'1px solid rgba(252,211,77,0.4)', background:'rgba(252,211,77,0.1)', transition:'all 0.2s' }}>
                          <Bell size={12}/>
                        </button>
                        <button onClick={() => openEdit(c)} style={{ width:28, height:28, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--primary-violet-light)', border:'1px solid var(--border-violet)', background:'rgba(139,92,246,0.08)', transition:'all 0.2s' }}>
                          <Edit3 size={12}/>
                        </button>
                        <button onClick={() => del(c.id)} style={{ width:28, height:28, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', color:'#F87171', border:'1px solid rgba(239,68,68,0.3)', background:'rgba(239,68,68,0.08)', transition:'all 0.2s' }}>
                          <Trash2 size={12}/>
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div style={{ textAlign:'center', padding:'40px', color:'var(--text-secondary)', fontSize:13 }}>Sin contactos que coincidan</div>
          )}
        </div>
      </div>

      {/* Alert modal */}
      {alertModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', backdropFilter:'blur(8px)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }} onClick={() => setAlertModal(null)}>
          <div style={{ width:'100%', maxWidth:420, background:'var(--bg-secondary)', border:'1px solid rgba(252,211,77,0.4)', borderRadius:20, padding:28, animation:'fadeIn 0.3s ease' }} onClick={e=>e.stopPropagation()}>
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
              <div style={{ width:40, height:40, borderRadius:12, background:'rgba(252,211,77,0.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>🔔</div>
              <div>
                <h2 style={{ fontSize:16, fontWeight:700 }}>Nueva Alerta</h2>
                <p style={{ fontSize:12, color:'var(--text-secondary)' }}>{alertModal.nombre} {alertModal.apellido}</p>
              </div>
              <button onClick={() => setAlertModal(null)} style={{ marginLeft:'auto', color:'var(--text-secondary)', padding:6 }}><X size={18}/></button>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <F label="Fecha *"><input className="input-field" type="date" value={alertForm.fecha} onChange={e=>setAlertForm(p=>({...p,fecha:e.target.value}))}/></F>
              <F label="Hora"><input className="input-field" type="time" value={alertForm.hora} onChange={e=>setAlertForm(p=>({...p,hora:e.target.value}))}/></F>
              <F label="Notas"><textarea className="input-field" value={alertForm.notas} onChange={e=>setAlertForm(p=>({...p,notas:e.target.value}))} rows={3} style={{ resize:'vertical' }} placeholder="Recordatorio, tema a tratar..."/></F>
            </div>
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:20 }}>
              <button className="btn btn-ghost" onClick={() => setAlertModal(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={saveAlerta}><Bell size={14}/> Agregar Alerta</button>
            </div>
          </div>
        </div>
      )}

      {/* Form Modal */}
      {modal === 'form' && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', backdropFilter:'blur(8px)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }} onClick={() => setModal(null)}>
          <div style={{ width:'100%', maxWidth:560, background:'var(--bg-secondary)', border:'1px solid rgba(139,92,246,0.4)', borderRadius:20, maxHeight:'90vh', overflowY:'auto', animation:'fadeIn 0.3s ease' }} onClick={e=>e.stopPropagation()}>
            <div style={{ padding:'20px 24px', borderBottom:'1px solid var(--border-violet)', display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ width:40, height:40, borderRadius:12, background:'linear-gradient(135deg,var(--primary-violet),var(--accent-magenta))', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>👤</div>
              <h2 style={{ fontSize:16, fontWeight:700 }}>{form.id ? 'Editar Contacto' : 'Nuevo Contacto'}</h2>
              <button onClick={() => setModal(null)} style={{ marginLeft:'auto', color:'var(--text-secondary)', padding:6, borderRadius:8 }}><X size={18}/></button>
            </div>
            <div style={{ padding:'20px 24px', display:'flex', flexDirection:'column', gap:13 }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <F label="Nombre *"><input className="input-field" value={form.nombre} onChange={e=>set('nombre',e.target.value)} placeholder="Martín"/></F>
                <F label="Apellido"><input className="input-field" value={form.apellido} onChange={e=>set('apellido',e.target.value)} placeholder="López"/></F>
              </div>
              <F label="Subtítulo / Rol"><input className="input-field" value={form.subtitulo||''} onChange={e=>set('subtitulo',e.target.value)} placeholder="Ej: Dueño, Gerente, Manager..."/></F>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <F label="Teléfono"><input className="input-field" value={form.telefono} onChange={e=>set('telefono',e.target.value)} placeholder="+54 11 1234-5678"/></F>
                <F label="Email"><input className="input-field" type="email" value={form.email} onChange={e=>set('email',e.target.value)} placeholder="email@ejemplo.com"/></F>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <F label="Instagram"><input className="input-field" value={form.instagram} onChange={e=>set('instagram',e.target.value)} placeholder="@usuario"/></F>
                <F label="Ciudad"><input className="input-field" value={form.ciudad} onChange={e=>set('ciudad',e.target.value)} placeholder="Buenos Aires"/></F>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <F label="Tipo">
                  <select className="select-field" value={form.tipo} onChange={e=>set('tipo',e.target.value)}>
                    {CONTACTO_TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </F>
                <F label="Subempresa">
                  <select className="select-field" value={form.subempresa} onChange={e=>set('subempresa',e.target.value)}>
                    {CONTACTO_SUBS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </F>
              </div>
              <F label="Estado">
                <select className="select-field" value={form.estado} onChange={e=>set('estado',e.target.value)}>
                  {PIPELINE_STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </F>
              <F label="Notas">
                <textarea className="input-field" value={form.notas} onChange={e=>set('notas',e.target.value)} rows={3} style={{ resize:'vertical' }} placeholder="Observaciones..."/>
              </F>
            </div>
            <div style={{ padding:'16px 24px', borderTop:'1px solid var(--border-violet)', display:'flex', gap:10, justifyContent:'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={save}><Save size={14}/>{form.id ? 'Guardar' : 'Crear Contacto'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── MAIN COMPONENT ──────────────────────────────────────────
const CAPTACION_TABS = [
  { id:'pipeline',   label:'Pipeline',   icon:'📊' },
  { id:'busqueda',   label:'Búsqueda',   icon:'🔍' },
  { id:'speeches',   label:'Speeches',   icon:'💬' },
  { id:'expansion',  label:'Expansión',  icon:'🗺️' },
  { id:'seguimiento',label:'Seguimiento',icon:'🔔' },
  { id:'contactos',  label:'Contactos',  icon:'👥' },
]

export default function CaptacionView({ defaultTab = 'pipeline' }) {
  const realDefaultTab = defaultTab === 'provincias' ? 'expansion' : defaultTab
  const [activeTab, setActiveTab] = useState(realDefaultTab)
  const [brands, setBrands] = useState(DEMO_PIPELINE)
  const [alertas, setAlertas] = useState([])
  const [rubros, setRubros] = useState(DEFAULT_RUBROS)
  const [sistemas, setSistemas] = useState(DEFAULT_SISTEMAS)

  const upsert = (item) => setBrands(p => p.find(x=>x.id===item.id) ? p.map(x=>x.id===item.id?item:x) : [...p, item])
  const del = (id) => setBrands(p => p.filter(x => x.id !== id))
  const addRubro = (r) => setRubros(p => p.find(x=>x.id===r.id) ? p : [...p, r])
  const addSistema = (s) => setSistemas(p => p.includes(s) ? p : [...p, s])
  const addAlerta = (a) => setAlertas(p => [...p, a])

  const totalCerradas = brands.filter(b=>b.estado==='cerrada').length
  const totalPipeline = brands.length

  return (
    <div style={{ padding:24, animation:'fadeIn 0.3s ease' }}>
      <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:24 }}>
        <div>
          <h2 style={{ fontSize:22, fontWeight:800 }}>📞 Captación</h2>
          <p style={{ fontSize:13, color:'var(--text-secondary)', marginTop:2 }}>
            {totalPipeline} marcas en pipeline · {totalCerradas} cerradas
          </p>
        </div>
        <div style={{ marginLeft:'auto', display:'flex', gap:12 }}>
          {[
            { label:'Total Pipeline', value:totalPipeline, color:'#8B5CF6' },
            { label:'Cerradas', value:totalCerradas, color:'#4ADE80' },
            { label:'Conversión', value:`${totalPipeline>0?Math.round((totalCerradas/totalPipeline)*100):0}%`, color:'#FCD34D' },
          ].map(s => (
            <div key={s.label} style={{ textAlign:'center', padding:'8px 16px', borderRadius:12, background:`${s.color}11`, border:`1px solid ${s.color}33` }}>
              <div style={{ fontSize:18, fontWeight:800, color:s.color }}>{s.value}</div>
              <div style={{ fontSize:10, color:'var(--text-secondary)' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display:'flex', gap:4, marginBottom:24, background:'rgba(139,92,246,0.06)', borderRadius:14, padding:4, flexWrap:'wrap' }}>
        {CAPTACION_TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            style={{ flex:1, minWidth:90, padding:'9px 14px', borderRadius:10, fontSize:12, fontWeight:600, border:'none', background:activeTab===tab.id?'rgba(139,92,246,0.25)':'transparent', color:activeTab===tab.id?'var(--primary-violet-light)':'var(--text-secondary)', transition:'all 0.2s', boxShadow:activeTab===tab.id?'0 0 12px rgba(139,92,246,0.2)':'none' }}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'pipeline'    && <PipelineTab brands={brands} onSaveBrand={upsert} onDeleteBrand={del} rubros={rubros} sistemas={sistemas} onAddRubro={addRubro} onAddSistema={addSistema}/>}
      {activeTab === 'busqueda'    && <BusquedaTab/>}
      {activeTab === 'speeches'    && <SpeechesTab/>}
      {activeTab === 'expansion'   && <ExpansionTab pipeline={brands}/>}
      {activeTab === 'seguimiento' && <SeguimientoTab pipeline={brands} alertas={alertas} onSaveAlerta={addAlerta}/>}
      {activeTab === 'contactos'   && <ContactosTab onAddAlerta={addAlerta}/>}
    </div>
  )
}
