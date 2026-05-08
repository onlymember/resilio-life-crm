import React, { useState, useMemo } from 'react'
import { Palette, Plus, Edit3, Trash2, X, Save, Users, Clock, CheckCircle, Circle, AlertCircle, Search, Globe, Briefcase, Tag, Calendar, ChevronDown, BarChart3, Star } from 'lucide-react'

// ── Equipo Demo ──────────────────────────────
const DEMO_EQUIPO = [
  { id:'e1', nombre:'Lucía Fernández', rol:'Directora Creativa', pais:'Argentina', ciudad:'Buenos Aires', especialidad:'Branding & Identidad', portfolio:'luciadesign.com', contacto:'lucia@resilio.com', instagram:'@lucia_design', estado:'activo', proyectos:['Rebrand Elevare','Web Resilio'], descripcion:'Especialista en identidad visual y branding estratégico.', fechaIngreso:'2022-03-15', disponibilidad:'Disponible', nivelExperiencia:'Senior', habilidades:['Illustrator','Photoshop','Branding','Figma'], tarifa:120, proyectosActivos:3, capacidadSemanal:40, notas:'' },
  { id:'e2', nombre:'Carlos Vega', rol:'Motion Designer', pais:'México', ciudad:'Ciudad de México', especialidad:'Motion Graphics & 3D', portfolio:'carlosvega.mx', contacto:'carlos@resilio.com', instagram:'@carlosvega_mx', estado:'activo', proyectos:['Videos Campaigns'], descripcion:'Experto en motion graphics y animación 3D.', fechaIngreso:'2022-07-01', disponibilidad:'Ocupado', nivelExperiencia:'Semi-Senior', habilidades:['After Effects','Cinema 4D','Premiere'], tarifa:90, proyectosActivos:2, capacidadSemanal:32, notas:'' },
  { id:'e3', nombre:'Sophie Müller', rol:'UX Designer', pais:'Alemania', ciudad:'Berlín', especialidad:'UX/UI & Producto', portfolio:'sophiemüller.de', contacto:'sophie@resilio.com', instagram:'@sophie_ux', estado:'activo', proyectos:['App Resilio','Dashboard'], descripcion:'Diseñadora de experiencia con enfoque en producto digital.', fechaIngreso:'2023-01-10', disponibilidad:'Parcial', nivelExperiencia:'Senior', habilidades:['Figma','Sketch','User Research'], tarifa:110, proyectosActivos:2, capacidadSemanal:24, notas:'' },
  { id:'e4', nombre:'André Costa', rol:'Fotógrafo', pais:'Brasil', ciudad:'São Paulo', especialidad:'Fotografía de Marca', portfolio:'andrecosta.br', contacto:'andre@resilio.com', instagram:'@andrecosta_photo', estado:'activo', proyectos:['Sesión Elevare'], descripcion:'Fotógrafo comercial especializado en fotografía de marca.', fechaIngreso:'2023-04-20', disponibilidad:'Disponible', nivelExperiencia:'Junior', habilidades:['Lightroom','Photoshop','Studio Lighting'], tarifa:70, proyectosActivos:1, capacidadSemanal:40, notas:'' },
  { id:'e5', nombre:'María López', rol:'Copywriter', pais:'España', ciudad:'Madrid', especialidad:'Copy & Storytelling', portfolio:'marialopez.es', contacto:'maria@resilio.com', instagram:'@maria_copy', estado:'freelance', proyectos:[], descripcion:'Copywriter con especialidad en storytelling de marca.', fechaIngreso:'2023-09-05', disponibilidad:'Disponible', nivelExperiencia:'Semi-Senior', habilidades:['Copywriting','SEO','Brand Voice'], tarifa:80, proyectosActivos:0, capacidadSemanal:20, notas:'' },
]

const EQUIPO_EMPTY = { nombre:'', rol:'', pais:'', ciudad:'', especialidad:'', portfolio:'', contacto:'', instagram:'', estado:'activo', proyectos:[], descripcion:'', fechaIngreso:'', disponibilidad:'Disponible', nivelExperiencia:'Junior', habilidades:[], tarifa:0, proyectosActivos:0, capacidadSemanal:0, notas:'' }

// ── Shared helpers ───────────────────────────
const F = ({ label, children, err: e }) => (
  <div>
    <label style={{ fontSize:12,fontWeight:500,color:'var(--text-secondary)',display:'block',marginBottom:6 }}>{label}</label>
    {children}
    {e && <span style={{ fontSize:11,color:'#F87171' }}>{e}</span>}
  </div>
)

const fmtMoney = (n) => n >= 1000000 ? `$${(n/1000000).toFixed(1)}M` : n >= 1000 ? `$${(n/1000).toFixed(0)}K` : `$${n}`
const fmtDate  = (d) => { if (!d) return '—'; const p = d.split('-'); return `${p[2]}/${p[1]}/${p[0].slice(2)}` }
const generateId = () => `${Date.now()}_${Math.random().toString(36).slice(2,7)}`

// ── Project constants ─────────────────────────
const TYPE_CFG = {
  consultancy:      { label:'Consultoría',  color:'#A78BFA', bg:'rgba(167,139,250,0.15)', icon:'💡' },
  special:          { label:'Especial',      color:'#E879F9', bg:'rgba(232,121,249,0.15)', icon:'⭐' },
  defined:          { label:'Definido',      color:'#60A5FA', bg:'rgba(96,165,250,0.15)',  icon:'📦' },
  monthly_retainer: { label:'Retainer',      color:'#4ADE80', bg:'rgba(74,222,128,0.15)',  icon:'🔄' },
}
const STATUS_CFG = {
  idea:        { label:'Idea',       color:'#A78BFA', bg:'rgba(167,139,250,0.15)' },
  proposal:    { label:'Propuesta',  color:'#FCD34D', bg:'rgba(252,211,77,0.15)'  },
  in_progress: { label:'En proceso', color:'#8B5CF6', bg:'rgba(139,92,246,0.15)' },
  completed:   { label:'Completado', color:'#4ADE80', bg:'rgba(74,222,128,0.15)' },
  cancelled:   { label:'Cancelado',  color:'#F87171', bg:'rgba(239,68,68,0.15)'  },
  archivo:     { label:'Archivo',    color:'#9CA3AF', bg:'rgba(156,163,175,0.15)' },
}
const KANBAN_COLS = [
  { id:'idea',        label:'✨ Idea',       color:'#A78BFA' },
  { id:'proposal',    label:'💡 Propuesta',  color:'#FCD34D' },
  { id:'in_progress', label:'🚀 En Proceso', color:'#8B5CF6' },
  { id:'completed',   label:'✅ Completado', color:'#4ADE80' },
  { id:'cancelled',   label:'❌ Cancelado',  color:'#F87171' },
  { id:'archivo',     label:'📦 Archivo',    color:'#9CA3AF' },
]

const TIPO_CLI_CFG = {
  fijo:    { l:'Fijo',    c:'#4ADE80' },
  estandar:{ l:'Estándar',c:'#60A5FA' },
  especial:{ l:'Especial',c:'#E879F9' },
}

const ProgressBar = ({ value, max, color='#8B5CF6', label }) => {
  const pct = max > 0 ? Math.min(100, Math.round(value/max*100)) : 0
  return (
    <div>
      <div style={{ display:'flex',justifyContent:'space-between',fontSize:10,color:'var(--text-secondary)',marginBottom:3 }}>
        <span>{label}</span><span style={{ color,fontWeight:600 }}>{pct}%</span>
      </div>
      <div style={{ height:5,borderRadius:3,background:'rgba(139,92,246,0.1)' }}>
        <div style={{ height:'100%',width:`${pct}%`,borderRadius:3,background:color,transition:'width 0.4s ease' }}/>
      </div>
    </div>
  )
}

// ── Project Modal ─────────────────────────────
const PROJ_EMPTY = { type:'monthly_retainer',clientId:'',creadorId:'',name:'',description:'',status:'proposal',budget:0,budgetSpent:0,startDate:'',endDate:'',hoursTracked:0,hoursEstimated:0,deliverables:[],team:[] }

const ProjectModal = ({ project, clients, equipo, onSave, onClose }) => {
  const [form, setForm] = useState(project || PROJ_EMPTY)
  const [newDel, setNewDel] = useState('')
  const set = (f,v) => setForm(p=>({...p,[f]:v}))

  const addDeliverable = () => {
    if (!newDel.trim()) return
    set('deliverables', [...(form.deliverables||[]), { name:newDel.trim(), status:'pending', dueDate:'' }])
    setNewDel('')
  }
  const removeDeliverable = (i) => set('deliverables', form.deliverables.filter((_,idx)=>idx!==i))
  const toggleDelStatus = (i) => {
    const newDels = [...form.deliverables]
    const cycle = { pending:'in_progress', in_progress:'completed', completed:'pending' }
    newDels[i] = { ...newDels[i], status: cycle[newDels[i].status]||'pending' }
    set('deliverables', newDels)
  }
  const handleSave = () => {
    if (!form.name.trim()) return
    onSave({ ...form, id:project?.id||generateId(), createdAt:project?.createdAt||new Date().toISOString() })
  }
  const DEL_ICONS = { pending:Circle, in_progress:AlertCircle, completed:CheckCircle }
  const DEL_COLORS = { pending:'#9CA3AF', in_progress:'#FCD34D', completed:'#4ADE80' }

  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',backdropFilter:'blur(8px)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:20 }} onClick={onClose}>
      <div style={{ width:'100%',maxWidth:620,background:'var(--bg-secondary)',border:'1px solid var(--border-violet)',borderRadius:20,maxHeight:'92vh',overflowY:'auto',boxShadow:'var(--glow-violet),0 40px 80px rgba(0,0,0,0.5)',animation:'fadeIn 0.3s ease' }} onClick={e=>e.stopPropagation()}>
        <div style={{ padding:'24px 28px',borderBottom:'1px solid var(--border-violet)',display:'flex',alignItems:'center',gap:12 }}>
          <div style={{ width:40,height:40,borderRadius:12,background:'linear-gradient(135deg,var(--primary-violet),var(--accent-magenta))',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20 }}>🎨</div>
          <h2 style={{ fontSize:16,fontWeight:700 }}>{project?'Editar Proyecto':'Nuevo Proyecto'}</h2>
          <button onClick={onClose} style={{ marginLeft:'auto',color:'var(--text-secondary)',padding:6,borderRadius:8 }}><X size={20}/></button>
        </div>
        <div style={{ padding:'24px 28px',display:'flex',flexDirection:'column',gap:16 }}>
          {/* Tipo */}
          <div>
            <label style={{ fontSize:12,fontWeight:500,color:'var(--text-secondary)',display:'block',marginBottom:8 }}>Tipo</label>
            <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:8 }}>
              {Object.entries(TYPE_CFG).map(([k,v])=>(
                <button key={k} onClick={()=>set('type',k)} style={{ padding:'8px 12px',borderRadius:10,fontSize:12,fontWeight:500,border:`1px solid ${form.type===k?v.color:'var(--border-violet)'}`,background:form.type===k?v.bg:'rgba(139,92,246,0.05)',color:form.type===k?v.color:'var(--text-secondary)',transition:'all 0.2s',textAlign:'left' }}>{v.icon} {v.label}</button>
              ))}
            </div>
          </div>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
            <F label="Cliente">
              <select className="select-field" value={form.clientId} onChange={e=>set('clientId',e.target.value)}>
                <option value="">Seleccionar cliente...</option>
                {clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </F>
            <F label="Estado">
              <select className="select-field" value={form.status} onChange={e=>set('status',e.target.value)}>
                {Object.entries(STATUS_CFG).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
              </select>
            </F>
          </div>
          {/* ¿Quién lo hace? */}
          <F label="¿Quién lo hace?">
            <select className="select-field" value={form.creadorId} onChange={e=>set('creadorId',e.target.value)}>
              <option value="">Sin asignar</option>
              {(equipo||[]).map(m=><option key={m.id} value={m.id}>{m.nombre} · {m.rol}</option>)}
            </select>
          </F>
          <F label="Nombre del proyecto *"><input className="input-field" value={form.name} onChange={e=>set('name',e.target.value)} placeholder="Nike Social Media Management"/></F>
          <F label="Descripción"><textarea className="input-field" value={form.description} onChange={e=>set('description',e.target.value)} rows={2} style={{ resize:'vertical' }}/></F>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
            <F label="Presupuesto ($)"><input className="input-field" type="number" value={form.budget} onChange={e=>set('budget',+e.target.value)}/></F>
            <F label="Gastado ($)"><input className="input-field" type="number" value={form.budgetSpent} onChange={e=>set('budgetSpent',+e.target.value)}/></F>
          </div>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:12 }}>
            <F label="Inicio"><input className="input-field" type="date" value={form.startDate} onChange={e=>set('startDate',e.target.value)}/></F>
            <F label="Fin"><input className="input-field" type="date" value={form.endDate} onChange={e=>set('endDate',e.target.value)}/></F>
            <F label="Hs estimadas"><input className="input-field" type="number" value={form.hoursEstimated} onChange={e=>set('hoursEstimated',+e.target.value)}/></F>
            <F label="Hs trackeadas"><input className="input-field" type="number" value={form.hoursTracked} onChange={e=>set('hoursTracked',+e.target.value)}/></F>
          </div>
          {/* Entregables */}
          <div>
            <label style={{ fontSize:12,fontWeight:500,color:'var(--text-secondary)',display:'block',marginBottom:8 }}>Entregables</label>
            <div style={{ display:'flex',gap:8,marginBottom:8 }}>
              <input className="input-field" value={newDel} onChange={e=>setNewDel(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addDeliverable()} placeholder="Nuevo entregable..." style={{ flex:1 }}/>
              <button className="btn btn-ghost" onClick={addDeliverable} style={{ padding:'8px 12px' }}><Plus size={14}/></button>
            </div>
            {(form.deliverables||[]).map((d,i) => {
              const Icon = DEL_ICONS[d.status]||Circle
              return (
                <div key={i} style={{ display:'flex',alignItems:'center',gap:8,padding:'7px 10px',background:'rgba(139,92,246,0.06)',borderRadius:8,marginBottom:4 }}>
                  <button onClick={()=>toggleDelStatus(i)} style={{ flexShrink:0,padding:0,background:'none',border:'none',cursor:'pointer' }}><Icon size={14} color={DEL_COLORS[d.status]}/></button>
                  <span style={{ flex:1,fontSize:12,textDecoration:d.status==='completed'?'line-through':'none',color:d.status==='completed'?'var(--text-secondary)':'var(--text-primary)' }}>{d.name}</span>
                  <button onClick={()=>removeDeliverable(i)} style={{ padding:0,background:'none',border:'none',cursor:'pointer',color:'#F87171',flexShrink:0 }}><X size={12}/></button>
                </div>
              )
            })}
          </div>
        </div>
        <div style={{ padding:'16px 28px',borderTop:'1px solid var(--border-violet)',display:'flex',gap:10,justifyContent:'flex-end' }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSave}><Save size={14}/>{project?'Guardar':'Crear Proyecto'}</button>
        </div>
      </div>
    </div>
  )
}

// ── Kanban Card ───────────────────────────────
const ProjectKanbanCard = ({ project, client, creador, onEdit, onDelete }) => {
  const type = TYPE_CFG[project.type] || TYPE_CFG.defined
  const budgetPct = project.budget > 0 ? Math.round(project.budgetSpent/project.budget*100) : 0
  const completedDels = (project.deliverables||[]).filter(d=>d.status==='completed').length
  const totalDels = (project.deliverables||[]).length
  return (
    <div style={{ background:'var(--glass-bg)',border:'1px solid var(--border-violet)',borderRadius:12,padding:'14px 16px',marginBottom:10,transition:'all 0.2s' }}
      onMouseEnter={e=>{ e.currentTarget.style.borderColor='var(--primary-violet)'; e.currentTarget.style.boxShadow='var(--glow-violet-sm)' }}
      onMouseLeave={e=>{ e.currentTarget.style.borderColor='var(--border-violet)'; e.currentTarget.style.boxShadow='none' }}>
      <div style={{ display:'flex',alignItems:'flex-start',gap:8,marginBottom:8 }}>
        <span style={{ fontSize:10,padding:'2px 7px',borderRadius:20,background:type.bg,color:type.color,fontWeight:600,flexShrink:0 }}>{type.icon} {type.label}</span>
        <div style={{ display:'flex',gap:4,marginLeft:'auto',flexShrink:0 }}>
          <button onClick={onEdit} style={{ padding:'3px 6px',borderRadius:6,color:'var(--primary-violet-light)',background:'rgba(139,92,246,0.1)',border:'none',cursor:'pointer' }}><Edit3 size={10}/></button>
          <button onClick={onDelete} style={{ padding:'3px 6px',borderRadius:6,color:'#F87171',background:'rgba(239,68,68,0.1)',border:'none',cursor:'pointer' }}><Trash2 size={10}/></button>
        </div>
      </div>
      <div style={{ fontSize:13,fontWeight:600,marginBottom:3,lineHeight:1.3 }}>{project.name}</div>
      {client && <div style={{ fontSize:10,color:'var(--text-secondary)',marginBottom:4 }}>🏢 {client.name}</div>}
      {creador && <div style={{ fontSize:10,color:'var(--primary-violet-light)',marginBottom:8 }}>👤 {creador.nombre}</div>}
      <ProgressBar label={`Budget ${fmtMoney(project.budgetSpent)}/${fmtMoney(project.budget)}`} value={project.budgetSpent} max={project.budget} color={budgetPct>90?'#F87171':'#4ADE80'}/>
      {project.hoursEstimated > 0 && <div style={{ marginTop:6 }}><ProgressBar label={`${project.hoursTracked}h / ${project.hoursEstimated}h`} value={project.hoursTracked} max={project.hoursEstimated} color="#A78BFA"/></div>}
      {totalDels > 0 && <div style={{ marginTop:8,fontSize:10,color:'var(--text-secondary)' }}><CheckCircle size={10} style={{ display:'inline',marginRight:4,verticalAlign:'middle',color:'#4ADE80' }}/>{completedDels}/{totalDels} entregables</div>}
    </div>
  )
}

// ── Client Modal (quick edit) ─────────────────
const CLIENT_EMPTY = { name:'',contactPerson:'',email:'',phone:'',type:'retainer',status:'active',tipoCliente:'fijo',descripcion:'',prioridad:'',fuente:'',valorEstimado:0,responsable:'',etiquetas:[],notas:'' }

const ClientModal = ({ client, onSave, onClose }) => {
  const [form, setForm] = useState(client || CLIENT_EMPTY)
  const set = (f,v) => setForm(p=>({...p,[f]:v}))
  const handleSave = () => {
    if (!form.name.trim()) return
    onSave({ ...form, id:client?.id||generateId(), projectsCount:client?.projectsCount||0, totalRevenue:client?.totalRevenue||0, createdAt:client?.createdAt||new Date().toISOString() })
  }
  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',backdropFilter:'blur(8px)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:20 }} onClick={onClose}>
      <div style={{ width:'100%',maxWidth:500,background:'var(--bg-secondary)',border:'1px solid var(--border-violet)',borderRadius:20,boxShadow:'var(--glow-violet),0 40px 80px rgba(0,0,0,0.5)',animation:'fadeIn 0.3s ease' }} onClick={e=>e.stopPropagation()}>
        <div style={{ padding:'24px 28px',borderBottom:'1px solid var(--border-violet)',display:'flex',alignItems:'center',gap:12 }}>
          <div style={{ width:40,height:40,borderRadius:12,background:'linear-gradient(135deg,var(--primary-violet),var(--accent-magenta))',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20 }}>🤝</div>
          <h2 style={{ fontSize:16,fontWeight:700 }}>{client?'Editar Cliente':'Nuevo Cliente'}</h2>
          <button onClick={onClose} style={{ marginLeft:'auto',color:'var(--text-secondary)',padding:6,borderRadius:8 }}><X size={20}/></button>
        </div>
        <div style={{ padding:'24px 28px',display:'flex',flexDirection:'column',gap:14 }}>
          <F label="Empresa *"><input className="input-field" value={form.name} onChange={e=>set('name',e.target.value)} placeholder="Nike Argentina"/></F>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
            <F label="Contacto"><input className="input-field" value={form.contactPerson} onChange={e=>set('contactPerson',e.target.value)} placeholder="Juan Pérez"/></F>
            <F label="Email"><input className="input-field" type="email" value={form.email} onChange={e=>set('email',e.target.value)} placeholder="juan@empresa.com"/></F>
            <F label="Teléfono"><input className="input-field" value={form.phone} onChange={e=>set('phone',e.target.value)} placeholder="+54 11 1234-5678"/></F>
            <F label="Tipo"><select className="select-field" value={form.type} onChange={e=>set('type',e.target.value)}><option value="retainer">Retainer</option><option value="one_time">One-time</option></select></F>
          </div>
          <div>
            <label style={{ fontSize:12,fontWeight:500,color:'var(--text-secondary)',display:'block',marginBottom:8 }}>Tipo de Cliente</label>
            <div style={{ display:'flex',gap:8 }}>
              {Object.entries(TIPO_CLI_CFG).map(([k,v])=>(
                <button key={k} onClick={()=>set('tipoCliente',k)} style={{ flex:1,padding:'7px',borderRadius:10,fontSize:12,fontWeight:600,border:`1px solid ${form.tipoCliente===k?v.c:'var(--border-violet)'}`,background:form.tipoCliente===k?`${v.c}22`:'rgba(139,92,246,0.05)',color:form.tipoCliente===k?v.c:'var(--text-secondary)',transition:'all 0.2s',cursor:'pointer' }}>{v.l}</button>
              ))}
            </div>
          </div>
          <div>
            <label style={{ fontSize:12,fontWeight:500,color:'var(--text-secondary)',display:'block',marginBottom:8 }}>Estado</label>
            <div style={{ display:'flex',gap:8 }}>
              {['active','inactive'].map(s=>(
                <button key={s} onClick={()=>set('status',s)} style={{ padding:'7px 18px',borderRadius:10,fontSize:13,border:`1px solid ${form.status===s?'var(--primary-violet)':'var(--border-violet)'}`,background:form.status===s?'rgba(139,92,246,0.2)':'rgba(139,92,246,0.05)',color:form.status===s?'var(--primary-violet-light)':'var(--text-secondary)',transition:'all 0.2s' }}>{s==='active'?'Activo':'Inactivo'}</button>
              ))}
            </div>
          </div>
        </div>
        <div style={{ padding:'16px 28px',borderTop:'1px solid var(--border-violet)',display:'flex',gap:10,justifyContent:'flex-end' }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSave}><Save size={14}/>{client?'Guardar':'Crear Cliente'}</button>
        </div>
      </div>
    </div>
  )
}

// ── Client Detail Modal (3 tabs) ──────────────
const ClientDetailModal = ({ client, projects, equipo, onSave, onDelete, onClose }) => {
  const [tab, setTab] = useState('info')
  const [form, setForm] = useState({ ...CLIENT_EMPTY, ...client })
  const set = (f,v) => setForm(p=>({...p,[f]:v}))
  const cProjects = projects.filter(p=>p.clientId===client.id)
  const tCfg = TIPO_CLI_CFG[form.tipoCliente]

  const handleSave = () => {
    onSave({ ...form, id:client.id, createdAt:client.createdAt })
    onClose()
  }

  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',backdropFilter:'blur(10px)',zIndex:1100,display:'flex',alignItems:'center',justifyContent:'center',padding:16 }} onClick={onClose}>
      <div style={{ width:'100%',maxWidth:680,background:'var(--bg-secondary)',border:'1px solid var(--border-violet)',borderRadius:22,maxHeight:'92vh',display:'flex',flexDirection:'column',boxShadow:'var(--glow-violet),0 40px 80px rgba(0,0,0,0.6)',animation:'fadeIn 0.3s ease' }} onClick={e=>e.stopPropagation()}>
        {/* Header */}
        <div style={{ padding:'20px 24px',borderBottom:'1px solid var(--border-violet)',display:'flex',alignItems:'center',gap:12,flexShrink:0 }}>
          <div style={{ width:48,height:48,borderRadius:14,background:'linear-gradient(135deg,var(--primary-violet),var(--accent-magenta))',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:22 }}>{client.name.charAt(0)}</div>
          <div>
            <div style={{ fontSize:16,fontWeight:700 }}>{client.name}</div>
            <div style={{ fontSize:11,color:'var(--text-secondary)' }}>{client.contactPerson} · {client.email}</div>
          </div>
          <div style={{ marginLeft:'auto',display:'flex',gap:8 }}>
            <button onClick={()=>{ if(window.confirm(`¿Eliminar a ${client.name}?`)){onDelete(client.id);onClose()} }} className="btn btn-danger" style={{ fontSize:12,padding:'6px 12px' }}><Trash2 size={13}/>Eliminar</button>
            <button onClick={onClose} style={{ color:'var(--text-secondary)',padding:6,borderRadius:8 }}><X size={20}/></button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex',gap:6,padding:'12px 24px 0',flexShrink:0 }}>
          {[{id:'info',l:'📋 Información'},{id:'internos',l:'🔒 Datos Internos'},{id:'historial',l:`📊 Historial (${cProjects.length})`}].map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{ padding:'8px 16px',borderRadius:10,fontSize:12,fontWeight:tab===t.id?700:400,border:`1px solid ${tab===t.id?'var(--primary-violet)':'var(--border-violet)'}`,background:tab===t.id?'rgba(139,92,246,0.2)':'rgba(139,92,246,0.05)',color:tab===t.id?'var(--primary-violet-light)':'var(--text-secondary)',transition:'all 0.2s',cursor:'pointer' }}>{t.l}</button>
          ))}
        </div>

        {/* Body */}
        <div style={{ flex:1,overflowY:'auto',padding:'20px 24px' }}>
          {/* Tab Información */}
          {tab==='info' && (
            <div style={{ display:'flex',flexDirection:'column',gap:14 }}>
              <F label="Empresa"><input className="input-field" value={form.name} onChange={e=>set('name',e.target.value)}/></F>
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
                <F label="Contacto"><input className="input-field" value={form.contactPerson} onChange={e=>set('contactPerson',e.target.value)}/></F>
                <F label="Email"><input className="input-field" type="email" value={form.email} onChange={e=>set('email',e.target.value)}/></F>
                <F label="Teléfono"><input className="input-field" value={form.phone} onChange={e=>set('phone',e.target.value)}/></F>
                <F label="Tipo de contrato">
                  <select className="select-field" value={form.type} onChange={e=>set('type',e.target.value)}>
                    <option value="retainer">Retainer</option>
                    <option value="one_time">One-time</option>
                  </select>
                </F>
              </div>
              <F label="Descripción del Cliente">
                <textarea className="input-field" value={form.descripcion} onChange={e=>set('descripcion',e.target.value)} rows={4} placeholder="Notas generales sobre el cliente, preferencias, contexto..." style={{ resize:'vertical' }}/>
              </F>
              <div>
                <label style={{ fontSize:12,fontWeight:500,color:'var(--text-secondary)',display:'block',marginBottom:8 }}>Tipo de Cliente</label>
                <div style={{ display:'flex',gap:8 }}>
                  {Object.entries(TIPO_CLI_CFG).map(([k,v])=>(
                    <button key={k} onClick={()=>set('tipoCliente',k)} style={{ flex:1,padding:'7px',borderRadius:10,fontSize:12,fontWeight:600,border:`1px solid ${form.tipoCliente===k?v.c:'var(--border-violet)'}`,background:form.tipoCliente===k?`${v.c}22`:'rgba(139,92,246,0.05)',color:form.tipoCliente===k?v.c:'var(--text-secondary)',transition:'all 0.2s',cursor:'pointer' }}>{v.l}</button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontSize:12,fontWeight:500,color:'var(--text-secondary)',display:'block',marginBottom:8 }}>Estado</label>
                <div style={{ display:'flex',gap:8 }}>
                  {['active','inactive'].map(s=>(
                    <button key={s} onClick={()=>set('status',s)} style={{ padding:'7px 18px',borderRadius:10,fontSize:13,border:`1px solid ${form.status===s?'var(--primary-violet)':'var(--border-violet)'}`,background:form.status===s?'rgba(139,92,246,0.2)':'rgba(139,92,246,0.05)',color:form.status===s?'var(--primary-violet-light)':'var(--text-secondary)',transition:'all 0.2s' }}>{s==='active'?'Activo':'Inactivo'}</button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tab Datos Internos */}
          {tab==='internos' && (
            <div style={{ display:'flex',flexDirection:'column',gap:14 }}>
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
                <F label="Prioridad">
                  <select className="select-field" value={form.prioridad} onChange={e=>set('prioridad',e.target.value)}>
                    <option value="">Sin asignar</option>
                    {['Baja','Media','Alta','Urgente'].map(p=><option key={p} value={p}>{p}</option>)}
                  </select>
                </F>
                <F label="Fuente">
                  <select className="select-field" value={form.fuente} onChange={e=>set('fuente',e.target.value)}>
                    <option value="">Sin asignar</option>
                    {['Referido','Web','Redes Sociales','Evento','Otro'].map(f=><option key={f} value={f}>{f}</option>)}
                  </select>
                </F>
                <F label="Valor estimado ($)"><input className="input-field" type="number" value={form.valorEstimado} onChange={e=>set('valorEstimado',+e.target.value)}/></F>
                <F label="Responsable">
                  <select className="select-field" value={form.responsable} onChange={e=>set('responsable',e.target.value)}>
                    <option value="">Sin asignar</option>
                    {equipo.map(m=><option key={m.id} value={m.id}>{m.nombre}</option>)}
                  </select>
                </F>
              </div>
              <F label="Etiquetas (separadas por coma)">
                <input className="input-field" value={(form.etiquetas||[]).join(', ')} onChange={e=>set('etiquetas',e.target.value.split(',').map(s=>s.trim()).filter(Boolean))} placeholder="premium, urgente, referido..."/>
              </F>
              {(form.etiquetas||[]).length > 0 && (
                <div style={{ display:'flex',gap:6,flexWrap:'wrap' }}>
                  {form.etiquetas.map(t=>(
                    <span key={t} style={{ fontSize:11,padding:'3px 10px',borderRadius:20,background:'rgba(139,92,246,0.15)',color:'var(--primary-violet-light)',border:'1px solid var(--border-violet)' }}>{t}</span>
                  ))}
                </div>
              )}
              <F label="Notas internas">
                <textarea className="input-field" value={form.notas} onChange={e=>set('notas',e.target.value)} rows={4} placeholder="Información confidencial, historial de conversaciones..." style={{ resize:'vertical' }}/>
              </F>
            </div>
          )}

          {/* Tab Historial de Creaciones */}
          {tab==='historial' && (
            <div>
              {cProjects.length === 0 ? (
                <div style={{ textAlign:'center',padding:'40px',color:'var(--text-secondary)' }}>
                  <div style={{ fontSize:36,marginBottom:12 }}>📭</div>
                  <div>No hay proyectos para este cliente</div>
                </div>
              ) : (
                <div style={{ display:'flex',flexDirection:'column',gap:12 }}>
                  {cProjects.sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).map(p => {
                    const st = STATUS_CFG[p.status]||STATUS_CFG.idea
                    const ty = TYPE_CFG[p.type]||TYPE_CFG.defined
                    return (
                      <div key={p.id} style={{ background:'rgba(139,92,246,0.06)',border:'1px solid var(--border-violet)',borderRadius:12,padding:'14px 16px' }}>
                        <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:6 }}>
                          <span style={{ fontSize:10,padding:'2px 8px',borderRadius:20,background:ty.bg,color:ty.color,fontWeight:600 }}>{ty.icon} {ty.label}</span>
                          <span style={{ fontSize:10,padding:'2px 8px',borderRadius:20,background:st.bg,color:st.color,fontWeight:600 }}>{st.label}</span>
                          <span style={{ marginLeft:'auto',fontSize:10,color:'var(--text-secondary)' }}>{fmtDate(p.startDate)}</span>
                        </div>
                        <div style={{ fontSize:13,fontWeight:700,marginBottom:4 }}>{p.name}</div>
                        <div style={{ display:'flex',gap:16,fontSize:11,color:'var(--text-secondary)' }}>
                          <span>💰 {fmtMoney(p.budgetSpent)}/{fmtMoney(p.budget)}</span>
                          <span>⏱ {p.hoursTracked}h</span>
                          <span>✅ {(p.deliverables||[]).filter(d=>d.status==='completed').length}/{(p.deliverables||[]).length} entregables</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding:'14px 24px',borderTop:'1px solid var(--border-violet)',display:'flex',gap:10,justifyContent:'flex-end',flexShrink:0 }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSave}><Save size={14}/>Guardar Cambios</button>
        </div>
      </div>
    </div>
  )
}

// ── Creador Detail Modal (3 tabs) ─────────────
const CreadorDetailModal = ({ creador, projects, onSave, onClose }) => {
  const [tab, setTab] = useState('perfil')
  const [form, setForm] = useState({ ...EQUIPO_EMPTY, ...creador })
  const set = (f,v) => setForm(p=>({...p,[f]:v}))
  const cProjects = projects.filter(p=>p.creadorId===creador.id)
  const estadoColor = { activo:'#4ADE80', freelance:'#FCD34D', inactivo:'#9CA3AF' }
  const dispColor = { Disponible:'#4ADE80', Ocupado:'#F87171', Parcial:'#FCD34D', Ausente:'#9CA3AF' }

  const handleSave = () => {
    onSave({ ...form, id:creador.id })
    onClose()
  }

  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',backdropFilter:'blur(10px)',zIndex:1100,display:'flex',alignItems:'center',justifyContent:'center',padding:16 }} onClick={onClose}>
      <div style={{ width:'100%',maxWidth:680,background:'var(--bg-secondary)',border:'1px solid var(--border-violet)',borderRadius:22,maxHeight:'92vh',display:'flex',flexDirection:'column',boxShadow:'var(--glow-violet),0 40px 80px rgba(0,0,0,0.6)',animation:'fadeIn 0.3s ease' }} onClick={e=>e.stopPropagation()}>
        {/* Header */}
        <div style={{ padding:'20px 24px',borderBottom:'1px solid var(--border-violet)',display:'flex',alignItems:'center',gap:12,flexShrink:0 }}>
          <div style={{ width:52,height:52,borderRadius:16,background:'linear-gradient(135deg,var(--primary-violet),var(--accent-magenta))',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:22 }}>{creador.nombre.charAt(0)}</div>
          <div>
            <div style={{ fontSize:16,fontWeight:700 }}>{creador.nombre}</div>
            <div style={{ fontSize:11,color:'var(--primary-violet-light)' }}>{creador.rol}</div>
            <div style={{ fontSize:10,color:'var(--text-secondary)' }}><Globe size={9} style={{ display:'inline',marginRight:3 }}/>{creador.ciudad}, {creador.pais}</div>
          </div>
          <span style={{ marginLeft:'auto',fontSize:10,padding:'3px 10px',borderRadius:20,background:`${estadoColor[form.estado]||'#9CA3AF'}22`,color:estadoColor[form.estado]||'#9CA3AF',fontWeight:700,border:`1px solid ${estadoColor[form.estado]||'#9CA3AF'}44` }}>{form.estado}</span>
          <button onClick={onClose} style={{ color:'var(--text-secondary)',padding:6,borderRadius:8 }}><X size={20}/></button>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex',gap:6,padding:'12px 24px 0',flexShrink:0 }}>
          {[{id:'perfil',l:'👤 Perfil'},{id:'internos',l:'🔒 Datos Internos'},{id:'historial',l:`📊 Historial (${cProjects.length})`}].map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{ padding:'8px 16px',borderRadius:10,fontSize:12,fontWeight:tab===t.id?700:400,border:`1px solid ${tab===t.id?'var(--primary-violet)':'var(--border-violet)'}`,background:tab===t.id?'rgba(139,92,246,0.2)':'rgba(139,92,246,0.05)',color:tab===t.id?'var(--primary-violet-light)':'var(--text-secondary)',transition:'all 0.2s',cursor:'pointer' }}>{t.l}</button>
          ))}
        </div>

        {/* Body */}
        <div style={{ flex:1,overflowY:'auto',padding:'20px 24px' }}>
          {/* Tab Perfil */}
          {tab==='perfil' && (
            <div style={{ display:'flex',flexDirection:'column',gap:14 }}>
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
                <F label="Nombre"><input className="input-field" value={form.nombre} onChange={e=>set('nombre',e.target.value)}/></F>
                <F label="Rol"><input className="input-field" value={form.rol} onChange={e=>set('rol',e.target.value)} placeholder="Motion Designer"/></F>
                <F label="País"><input className="input-field" value={form.pais} onChange={e=>set('pais',e.target.value)}/></F>
                <F label="Ciudad"><input className="input-field" value={form.ciudad} onChange={e=>set('ciudad',e.target.value)}/></F>
                <F label="Especialidad"><input className="input-field" value={form.especialidad} onChange={e=>set('especialidad',e.target.value)}/></F>
                <F label="Portfolio"><input className="input-field" value={form.portfolio} onChange={e=>set('portfolio',e.target.value)}/></F>
                <F label="Contacto"><input className="input-field" value={form.contacto} onChange={e=>set('contacto',e.target.value)}/></F>
                <F label="Instagram"><input className="input-field" value={form.instagram} onChange={e=>set('instagram',e.target.value)}/></F>
              </div>
              <F label="Descripción / Especialidades">
                <textarea className="input-field" value={form.descripcion} onChange={e=>set('descripcion',e.target.value)} rows={3} placeholder="Especialidades, fortalezas, área de expertise..." style={{ resize:'vertical' }}/>
              </F>
              <div>
                <label style={{ fontSize:12,fontWeight:500,color:'var(--text-secondary)',display:'block',marginBottom:8 }}>Estado</label>
                <div style={{ display:'flex',gap:8 }}>
                  {['activo','freelance','inactivo'].map(s=>(
                    <button key={s} onClick={()=>set('estado',s)} style={{ flex:1,padding:'8px',borderRadius:10,fontSize:12,fontWeight:600,border:`1px solid ${form.estado===s?(estadoColor[s]||'#9CA3AF'):'var(--border-violet)'}`,background:form.estado===s?`${estadoColor[s]||'#9CA3AF'}22`:'rgba(139,92,246,0.05)',color:form.estado===s?(estadoColor[s]||'#9CA3AF'):'var(--text-secondary)',transition:'all 0.2s',cursor:'pointer',textTransform:'capitalize' }}>{s}</button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tab Datos Internos */}
          {tab==='internos' && (
            <div style={{ display:'flex',flexDirection:'column',gap:14 }}>
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
                <F label="Fecha de Ingreso"><input className="input-field" type="date" value={form.fechaIngreso} onChange={e=>set('fechaIngreso',e.target.value)}/></F>
                <F label="Disponibilidad">
                  <select className="select-field" value={form.disponibilidad} onChange={e=>set('disponibilidad',e.target.value)}>
                    {['Disponible','Ocupado','Parcial','Ausente'].map(d=><option key={d} value={d}>{d}</option>)}
                  </select>
                </F>
                <F label="Nivel de Experiencia">
                  <select className="select-field" value={form.nivelExperiencia} onChange={e=>set('nivelExperiencia',e.target.value)}>
                    {['Junior','Semi-Senior','Senior','Lead'].map(n=><option key={n} value={n}>{n}</option>)}
                  </select>
                </F>
                <F label="Tarifa por hora ($)"><input className="input-field" type="number" value={form.tarifa} onChange={e=>set('tarifa',+e.target.value)}/></F>
                <F label="Proyectos activos"><input className="input-field" type="number" value={form.proyectosActivos} onChange={e=>set('proyectosActivos',+e.target.value)}/></F>
                <F label="Capacidad semanal (hs)"><input className="input-field" type="number" value={form.capacidadSemanal} onChange={e=>set('capacidadSemanal',+e.target.value)}/></F>
              </div>
              <F label="Habilidades (separadas por coma)">
                <input className="input-field" value={(form.habilidades||[]).join(', ')} onChange={e=>set('habilidades',e.target.value.split(',').map(s=>s.trim()).filter(Boolean))} placeholder="After Effects, Figma, Photoshop..."/>
              </F>
              {(form.habilidades||[]).length > 0 && (
                <div style={{ display:'flex',gap:6,flexWrap:'wrap' }}>
                  {form.habilidades.map(h=>(
                    <span key={h} style={{ fontSize:11,padding:'3px 10px',borderRadius:20,background:'rgba(139,92,246,0.15)',color:'var(--primary-violet-light)',border:'1px solid var(--border-violet)' }}>{h}</span>
                  ))}
                </div>
              )}
              <F label="Disponibilidad actual">
                <div style={{ display:'flex',gap:8 }}>
                  {['Disponible','Ocupado','Parcial','Ausente'].map(d=>(
                    <button key={d} onClick={()=>set('disponibilidad',d)} style={{ flex:1,padding:'7px 4px',borderRadius:10,fontSize:11,fontWeight:600,border:`1px solid ${form.disponibilidad===d?(dispColor[d]||'var(--primary-violet)'):'var(--border-violet)'}`,background:form.disponibilidad===d?`${dispColor[d]||'#8B5CF6'}22`:'rgba(139,92,246,0.05)',color:form.disponibilidad===d?(dispColor[d]||'var(--primary-violet-light)'):'var(--text-secondary)',transition:'all 0.2s',cursor:'pointer',textAlign:'center' }}>{d}</button>
                  ))}
                </div>
              </F>
              <F label="Notas internas">
                <textarea className="input-field" value={form.notas} onChange={e=>set('notas',e.target.value)} rows={3} placeholder="Observaciones, condiciones especiales..." style={{ resize:'vertical' }}/>
              </F>
            </div>
          )}

          {/* Tab Historial & Estadísticas */}
          {tab==='historial' && (
            <div>
              {/* Stats */}
              <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:20 }}>
                {[
                  { label:'Proyectos asignados', value:cProjects.length, color:'#8B5CF6', icon:'📁' },
                  { label:'En curso', value:cProjects.filter(p=>p.status==='in_progress').length, color:'#FCD34D', icon:'🚀' },
                  { label:'Completados', value:cProjects.filter(p=>p.status==='completed').length, color:'#4ADE80', icon:'✅' },
                ].map(s=>(
                  <div key={s.label} style={{ padding:'12px',background:'rgba(139,92,246,0.06)',border:'1px solid var(--border-violet)',borderRadius:12,textAlign:'center' }}>
                    <div style={{ fontSize:18,marginBottom:2 }}>{s.icon}</div>
                    <div style={{ fontSize:22,fontWeight:800,color:s.color }}>{s.value}</div>
                    <div style={{ fontSize:9,color:'var(--text-secondary)' }}>{s.label}</div>
                  </div>
                ))}
              </div>
              {cProjects.length === 0 ? (
                <div style={{ textAlign:'center',padding:'32px',color:'var(--text-secondary)' }}>
                  <div style={{ fontSize:36,marginBottom:12 }}>📭</div>
                  <div>No hay proyectos asignados a este creador</div>
                </div>
              ) : (
                <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
                  {cProjects.sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).map(p => {
                    const st = STATUS_CFG[p.status]||STATUS_CFG.idea
                    const ty = TYPE_CFG[p.type]||TYPE_CFG.defined
                    return (
                      <div key={p.id} style={{ background:'rgba(139,92,246,0.06)',border:'1px solid var(--border-violet)',borderRadius:12,padding:'14px 16px' }}>
                        <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:6 }}>
                          <span style={{ fontSize:10,padding:'2px 8px',borderRadius:20,background:ty.bg,color:ty.color,fontWeight:600 }}>{ty.icon} {ty.label}</span>
                          <span style={{ fontSize:10,padding:'2px 8px',borderRadius:20,background:st.bg,color:st.color,fontWeight:600 }}>{st.label}</span>
                          <span style={{ marginLeft:'auto',fontSize:10,color:'var(--text-secondary)' }}>{fmtDate(p.startDate)}</span>
                        </div>
                        <div style={{ fontSize:13,fontWeight:700,marginBottom:4 }}>{p.name}</div>
                        <div style={{ fontSize:11,color:'var(--text-secondary)' }}>💰 {fmtMoney(p.budgetSpent)} · ⏱ {p.hoursTracked}h</div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding:'14px 24px',borderTop:'1px solid var(--border-violet)',display:'flex',gap:10,justifyContent:'flex-end',flexShrink:0 }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSave}><Save size={14}/>Guardar Cambios</button>
        </div>
      </div>
    </div>
  )
}

// ── Equipo Form Modal ─────────────────────────
const EquipoFormModal = ({ miembro, onSave, onClose }) => {
  const estadoColor = { activo:'#4ADE80', freelance:'#FCD34D', inactivo:'#9CA3AF' }
  const [form, setForm] = useState(miembro || EQUIPO_EMPTY)
  const set = (f,v) => setForm(p=>({...p,[f]:v}))
  const save = () => {
    if (!form.nombre.trim()) return
    onSave({ ...form, id:form.id||`e${Date.now()}` })
  }
  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',backdropFilter:'blur(8px)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:20 }} onClick={onClose}>
      <div style={{ width:'100%',maxWidth:520,background:'var(--bg-secondary)',border:'1px solid var(--border-violet)',borderRadius:20,maxHeight:'90vh',overflowY:'auto',animation:'fadeIn 0.3s ease' }} onClick={e=>e.stopPropagation()}>
        <div style={{ padding:'20px 24px',borderBottom:'1px solid var(--border-violet)',display:'flex',alignItems:'center',gap:12 }}>
          <div style={{ width:40,height:40,borderRadius:12,background:'linear-gradient(135deg,var(--primary-violet),var(--accent-magenta))',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18 }}>👤</div>
          <h2 style={{ fontSize:16,fontWeight:700 }}>{form.id?'Editar':'Nuevo'} Miembro</h2>
          <button onClick={onClose} style={{ marginLeft:'auto',color:'var(--text-secondary)',padding:6,borderRadius:8 }}><X size={18}/></button>
        </div>
        <div style={{ padding:'20px 24px',display:'flex',flexDirection:'column',gap:12 }}>
          {[
            {l:'Nombre *', f:'nombre', ph:'Lucía Fernández'},
            {l:'Rol', f:'rol', ph:'Motion Designer'},
            {l:'País', f:'pais', ph:'Argentina'},
            {l:'Ciudad', f:'ciudad', ph:'Buenos Aires'},
            {l:'Especialidad', f:'especialidad', ph:'UX/UI & Producto'},
            {l:'Portfolio', f:'portfolio', ph:'luciadesign.com'},
            {l:'Contacto (email/wa)', f:'contacto', ph:'lucia@email.com'},
            {l:'Instagram', f:'instagram', ph:'@lucia_design'},
          ].map(item=>(
            <div key={item.f}>
              <label style={{ fontSize:12,fontWeight:500,color:'var(--text-secondary)',display:'block',marginBottom:6 }}>{item.l}</label>
              <input className="input-field" value={form[item.f]} onChange={e=>set(item.f,e.target.value)} placeholder={item.ph}/>
            </div>
          ))}
          <div>
            <label style={{ fontSize:12,fontWeight:500,color:'var(--text-secondary)',display:'block',marginBottom:8 }}>Estado</label>
            <div style={{ display:'flex',gap:8 }}>
              {['activo','freelance','inactivo'].map(s=>(
                <button key={s} onClick={()=>set('estado',s)} style={{ flex:1,padding:'8px',borderRadius:10,fontSize:12,fontWeight:600,border:`1px solid ${form.estado===s?(estadoColor[s]||'#9CA3AF'):'var(--border-violet)'}`,background:form.estado===s?`${estadoColor[s]||'#9CA3AF'}22`:'rgba(139,92,246,0.05)',color:form.estado===s?(estadoColor[s]||'#9CA3AF'):'var(--text-secondary)',transition:'all 0.2s',cursor:'pointer',textTransform:'capitalize' }}>{s}</button>
              ))}
            </div>
          </div>
        </div>
        <div style={{ padding:'14px 24px',borderTop:'1px solid var(--border-violet)',display:'flex',gap:10,justifyContent:'flex-end' }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={save}><Save size={14}/>Guardar</button>
        </div>
      </div>
    </div>
  )
}

// ── MAIN ─────────────────────────────────────
export default function CreativeAgencyView({ projects, clients, onSaveProject, onDeleteProject, onSaveClient, onDeleteClient, defaultTab = 'kanban' }) {
  const [tab,            setTab]           = useState(defaultTab)
  const [modal,          setModal]         = useState(null)       // ProjectModal
  const [cModal,         setCModal]        = useState(null)       // ClientModal (quick edit)
  const [clienteDetalle, setClienteDetalle]= useState(null)       // ClientDetailModal
  const [creadorDetalle, setCreadorDetalle]= useState(null)       // CreadorDetailModal
  const [clientFilter,   setClientFilter]  = useState('all')
  const [searchClientes, setSearchClientes]= useState('')
  const [filtroFecha,    setFiltroFecha]   = useState('all')
  const [filtroKanbanCliente, setFiltroKanbanCliente] = useState('')
  const [filtroKanbanCreador, setFiltroKanbanCreador] = useState('')

  // Equipo state (lifted)
  const [equipo, setEquipo] = useState(DEMO_EQUIPO)
  const [equipoModal, setEquipoModal] = useState(null)

  const totalBudget = projects.reduce((s,p)=>s+p.budget,0)
  const totalSpent  = projects.reduce((s,p)=>s+p.budgetSpent,0)
  const retainerRevMRR = projects.filter(p=>p.type==='monthly_retainer'&&p.status==='in_progress').reduce((s,p)=>s+p.budget/3,0)
  const activeProj = projects.filter(p=>p.status==='in_progress').length

  // Filtros de fecha para clientes
  const filterClientsByDate = (clientsList) => {
    if (filtroFecha === 'all') return clientsList
    const now = new Date()
    const cutoff = {
      hoy:      new Date(now.getFullYear(),now.getMonth(),now.getDate()),
      semana:   new Date(now - 7*24*60*60*1000),
      mes:      new Date(now - 30*24*60*60*1000),
      anio:     new Date(now.getFullYear(),0,1),
    }[filtroFecha]
    if (!cutoff) return clientsList
    return clientsList.filter(c => new Date(c.createdAt||0) >= cutoff)
  }

  // Clientes filtrados
  const filteredClients = useMemo(() => {
    let result = clients
    if (clientFilter !== 'all') result = result.filter(c=>c.tipoCliente===clientFilter)
    if (searchClientes.trim()) {
      const q = searchClientes.toLowerCase()
      result = result.filter(c =>
        c.name?.toLowerCase().includes(q) ||
        c.contactPerson?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.phone?.toLowerCase().includes(q)
      )
    }
    return filterClientsByDate(result)
  }, [clients, clientFilter, searchClientes, filtroFecha])

  // Proyectos filtrados para Kanban
  const filteredProjects = useMemo(() => {
    let result = projects
    if (filtroKanbanCliente) result = result.filter(p=>p.clientId===filtroKanbanCliente)
    if (filtroKanbanCreador) result = result.filter(p=>p.creadorId===filtroKanbanCreador)
    return result
  }, [projects, filtroKanbanCliente, filtroKanbanCreador])

  const saveEquipoMember = (m) => {
    setEquipo(prev => prev.find(e=>e.id===m.id) ? prev.map(e=>e.id===m.id?m:e) : [...prev,m])
    setEquipoModal(null)
    if (creadorDetalle?.id === m.id) setCreadorDetalle(m)
  }

  return (
    <div style={{ padding:24,animation:'fadeIn 0.3s ease' }}>
      <div style={{ display:'flex',alignItems:'center',gap:12,marginBottom:20,flexWrap:'wrap' }}>
        <div>
          <h2 style={{ fontSize:20,fontWeight:700 }}>Agencia Creativa</h2>
          <p style={{ fontSize:12,color:'var(--text-secondary)' }}>{projects.length} proyectos · {clients.length} clientes</p>
        </div>
        <div style={{ flex:1 }}/>
        <button className="btn btn-ghost" onClick={()=>setCModal('create')} style={{ fontSize:13 }}><Plus size={14}/>Cliente</button>
        <button className="btn btn-primary" onClick={()=>setModal('create')}><Plus size={16}/>Nuevo Proyecto</button>
      </div>

      {/* KPIs */}
      <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:12,marginBottom:20 }}>
        {[
          { label:'Proyectos activos', value:activeProj,                                            color:'#8B5CF6' },
          { label:'MRR estimado',      value:fmtMoney(Math.round(retainerRevMRR)),                  color:'#4ADE80' },
          { label:'Budget total',      value:fmtMoney(totalBudget),                                 color:'#FCD34D' },
          { label:'Ejecutado',         value:fmtMoney(totalSpent),                                  color:'#E879F9' },
          { label:'Clientes activos',  value:clients.filter(c=>c.status==='active').length,         color:'#60A5FA' },
        ].map(s=>(
          <div key={s.label} style={{ padding:'14px 16px',background:'var(--glass-bg)',border:'1px solid var(--border-violet)',borderRadius:12,transition:'all 0.2s' }}
            onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--primary-violet)';e.currentTarget.style.transform='translateY(-2px)'}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--border-violet)';e.currentTarget.style.transform='none'}}>
            <div style={{ fontSize:18,fontWeight:800,color:s.color }}>{s.value}</div>
            <div style={{ fontSize:10,color:'var(--text-secondary)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display:'flex',gap:8,marginBottom:20 }}>
        {[{id:'kanban',label:'🎨 Creación'},{id:'clients',label:'🤝 Clientes'},{id:'equipo',label:'👥 Equipo'}].map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{ padding:'8px 18px',borderRadius:10,fontSize:13,fontWeight:tab===t.id?700:400,border:`1px solid ${tab===t.id?'var(--primary-violet)':'var(--border-violet)'}`,background:tab===t.id?'rgba(139,92,246,0.2)':'rgba(139,92,246,0.05)',color:tab===t.id?'var(--primary-violet-light)':'var(--text-secondary)',transition:'all 0.2s',cursor:'pointer' }}>{t.label}</button>
        ))}
      </div>

      {/* ─── KANBAN ─── */}
      {tab === 'kanban' && (
        <div>
          {/* Filtros del Kanban */}
          <div style={{ display:'flex',gap:10,marginBottom:16,flexWrap:'wrap',alignItems:'center' }}>
            <select className="select-field" style={{ width:'auto',minWidth:160 }} value={filtroKanbanCliente} onChange={e=>setFiltroKanbanCliente(e.target.value)}>
              <option value="">Todos los clientes</option>
              {clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select className="select-field" style={{ width:'auto',minWidth:160 }} value={filtroKanbanCreador} onChange={e=>setFiltroKanbanCreador(e.target.value)}>
              <option value="">Todos los creadores</option>
              {equipo.map(m=><option key={m.id} value={m.id}>{m.nombre}</option>)}
            </select>
            {(filtroKanbanCliente||filtroKanbanCreador) && (
              <button className="btn btn-ghost" onClick={()=>{setFiltroKanbanCliente('');setFiltroKanbanCreador('')}} style={{ fontSize:12,padding:'6px 12px' }}><X size={13}/>Limpiar filtros</button>
            )}
            <span style={{ fontSize:12,color:'var(--text-secondary)',marginLeft:'auto' }}>{filteredProjects.length} proyectos</span>
          </div>
          <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))',gap:16 }}>
            {KANBAN_COLS.map(col => {
              const colProjects = filteredProjects.filter(p=>p.status===col.id)
              return (
                <div key={col.id}>
                  <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:12 }}>
                    <div style={{ width:8,height:8,borderRadius:'50%',background:col.color,boxShadow:`0 0 6px ${col.color}` }}/>
                    <span style={{ fontSize:12,fontWeight:700,color:col.color }}>{col.label}</span>
                    <span style={{ marginLeft:'auto',fontSize:11,fontWeight:600,padding:'1px 7px',borderRadius:20,background:`${col.color}22`,color:col.color }}>{colProjects.length}</span>
                  </div>
                  <div style={{ minHeight:100 }}>
                    {colProjects.map(p=>(
                      <ProjectKanbanCard key={p.id} project={p}
                        client={clients.find(c=>c.id===p.clientId)}
                        creador={equipo.find(m=>m.id===p.creadorId)}
                        onEdit={()=>setModal(p)} onDelete={()=>onDeleteProject(p.id)}
                      />
                    ))}
                    {colProjects.length===0 && <div style={{ border:'1px dashed var(--border-violet)',borderRadius:10,padding:'20px',textAlign:'center',color:'var(--text-secondary)',fontSize:12 }}>Sin proyectos</div>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ─── CLIENTES ─── */}
      {tab === 'clients' && (
        <div>
          {/* Buscador + Filtros */}
          <div style={{ display:'flex',gap:10,marginBottom:14,flexWrap:'wrap' }}>
            <div style={{ position:'relative',flex:1,minWidth:200 }}>
              <Search size={14} style={{ position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'var(--text-secondary)' }}/>
              <input className="input-field" value={searchClientes} onChange={e=>setSearchClientes(e.target.value)} placeholder="Buscar cliente, contacto, email..." style={{ paddingLeft:36 }}/>
            </div>
            <select className="select-field" style={{ width:'auto',minWidth:150 }} value={filtroFecha} onChange={e=>setFiltroFecha(e.target.value)}>
              <option value="all">Todos los tiempos</option>
              <option value="hoy">Hoy</option>
              <option value="semana">Esta semana</option>
              <option value="mes">Este mes</option>
              <option value="anio">Este año</option>
            </select>
          </div>
          {/* Filtros de tipo */}
          <div style={{ display:'flex',gap:8,marginBottom:16,flexWrap:'wrap' }}>
            {[{v:'all',l:'Todos'},{v:'fijo',l:'Fijos',c:'#4ADE80'},{v:'estandar',l:'Estándar',c:'#60A5FA'},{v:'especial',l:'Especial',c:'#E879F9'}].map(f=>(
              <button key={f.v} onClick={()=>setClientFilter(f.v)} style={{ padding:'6px 16px',borderRadius:20,fontSize:12,fontWeight:clientFilter===f.v?700:500,border:`1px solid ${clientFilter===f.v?(f.c||'var(--primary-violet)'):'var(--border-violet)'}`,background:clientFilter===f.v?`${f.c||'#8B5CF6'}22`:'rgba(139,92,246,0.05)',color:clientFilter===f.v?(f.c||'var(--primary-violet-light)'):'var(--text-secondary)',transition:'all 0.2s',cursor:'pointer' }}>{f.l}</button>
            ))}
            <span style={{ marginLeft:'auto',fontSize:12,color:'var(--text-secondary)',alignSelf:'center' }}>{filteredClients.length} clientes</span>
          </div>

          <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:14 }}>
            {filteredClients.map(c => {
              const cProjects = projects.filter(p=>p.clientId===c.id)
              const cRev = cProjects.reduce((s,p)=>s+p.budgetSpent,0)
              const tCfg = TIPO_CLI_CFG[c.tipoCliente]
              return (
                <div key={c.id} style={{ background:'var(--glass-bg)',border:'1px solid var(--border-violet)',borderRadius:14,padding:'18px 20px',transition:'all 0.2s',cursor:'pointer' }}
                  onClick={()=>setClienteDetalle(c)}
                  onMouseEnter={e=>{ e.currentTarget.style.borderColor='var(--primary-violet)'; e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='var(--glow-violet-sm)' }}
                  onMouseLeave={e=>{ e.currentTarget.style.borderColor='var(--border-violet)'; e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow='none' }}>
                  <div style={{ display:'flex',alignItems:'flex-start',gap:10,marginBottom:14 }}>
                    <div style={{ width:44,height:44,borderRadius:12,background:'linear-gradient(135deg,var(--primary-violet),var(--accent-magenta))',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:18,flexShrink:0 }}>{c.name.charAt(0)}</div>
                    <div style={{ flex:1,minWidth:0 }}>
                      <div style={{ fontSize:14,fontWeight:700,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{c.name}</div>
                      <div style={{ fontSize:11,color:'var(--text-secondary)' }}>{c.contactPerson}</div>
                    </div>
                    <div style={{ display:'flex',gap:4,flexShrink:0 }} onClick={e=>e.stopPropagation()}>
                      <button onClick={()=>setCModal(c)} style={{ padding:'4px 7px',borderRadius:7,color:'var(--primary-violet-light)',background:'rgba(139,92,246,0.1)',border:'none',cursor:'pointer' }}><Edit3 size={11}/></button>
                      <button onClick={()=>onDeleteClient(c.id)} style={{ padding:'4px 7px',borderRadius:7,color:'#F87171',background:'rgba(239,68,68,0.1)',border:'none',cursor:'pointer' }}><Trash2 size={11}/></button>
                    </div>
                  </div>
                  <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:10 }}>
                    {[{l:'Proyectos',v:cProjects.length},{l:'Activos',v:cProjects.filter(p=>p.status==='in_progress').length},{l:'Revenue',v:fmtMoney(cRev)}].map(s=>(
                      <div key={s.l} style={{ textAlign:'center',padding:'8px 4px',borderRadius:8,background:'rgba(139,92,246,0.07)' }}>
                        <div style={{ fontSize:15,fontWeight:700,color:'var(--primary-violet-light)' }}>{s.v}</div>
                        <div style={{ fontSize:9,color:'var(--text-secondary)' }}>{s.l}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display:'flex',gap:6,flexWrap:'wrap' }}>
                    {tCfg&&<span style={{ fontSize:10,padding:'2px 8px',borderRadius:20,background:`${tCfg.c}22`,color:tCfg.c,border:`1px solid ${tCfg.c}44`,fontWeight:600 }}>{tCfg.l}</span>}
                    <span style={{ fontSize:10,padding:'2px 8px',borderRadius:20,background:c.type==='retainer'?'rgba(74,222,128,0.15)':'rgba(139,92,246,0.15)',color:c.type==='retainer'?'#4ADE80':'var(--primary-violet-light)',border:`1px solid ${c.type==='retainer'?'rgba(74,222,128,0.3)':'var(--border-violet)'}`,fontWeight:600 }}>
                      {c.type==='retainer'?'🔄 Retainer':'💡 One-time'}
                    </span>
                    <span style={{ fontSize:10,padding:'2px 8px',borderRadius:20,background:c.status==='active'?'rgba(74,222,128,0.12)':'rgba(239,68,68,0.12)',color:c.status==='active'?'#4ADE80':'#F87171',border:`1px solid ${c.status==='active'?'rgba(74,222,128,0.3)':'rgba(239,68,68,0.3)'}`,fontWeight:600 }}>
                      {c.status==='active'?'Activo':'Inactivo'}
                    </span>
                  </div>
                </div>
              )
            })}
            {filteredClients.length === 0 && (
              <div style={{ gridColumn:'1/-1',textAlign:'center',padding:'48px',color:'var(--text-secondary)',fontSize:14 }}>
                <div style={{ fontSize:40,marginBottom:12 }}>🤝</div>
                <div>{searchClientes ? `Sin resultados para "${searchClientes}"` : 'No hay clientes registrados'}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── EQUIPO ─── */}
      {tab === 'equipo' && (
        <EquipoTab
          equipo={equipo}
          setEquipo={setEquipo}
          projects={projects}
          onOpenDetalle={m=>setCreadorDetalle(m)}
          onOpenForm={m=>setEquipoModal(m||EQUIPO_EMPTY)}
        />
      )}

      {/* Modales */}
      {modal  && <ProjectModal project={modal==='create'?null:modal} clients={clients} equipo={equipo} onSave={d=>{onSaveProject(d);setModal(null)}} onClose={()=>setModal(null)}/>}
      {cModal && <ClientModal  client={cModal==='create'?null:cModal} onSave={d=>{onSaveClient(d);setCModal(null)}} onClose={()=>setCModal(null)}/>}
      {clienteDetalle && <ClientDetailModal client={clienteDetalle} projects={projects} equipo={equipo} onSave={d=>{onSaveClient(d);setClienteDetalle(null)}} onDelete={id=>{onDeleteClient(id);setClienteDetalle(null)}} onClose={()=>setClienteDetalle(null)}/>}
      {creadorDetalle && <CreadorDetailModal creador={creadorDetalle} projects={projects} onSave={saveEquipoMember} onClose={()=>setCreadorDetalle(null)}/>}
      {equipoModal    && <EquipoFormModal miembro={equipoModal.nombre?equipoModal:null} onSave={saveEquipoMember} onClose={()=>setEquipoModal(null)}/>}
    </div>
  )
}

// ── Equipo Tab ────────────────────────────────
function EquipoTab({ equipo, setEquipo, projects, onOpenDetalle, onOpenForm }) {
  const [search,    setSearch]    = useState('')
  const [filterPais,setFilterPais]= useState('all')
  const [filterEsp, setFilterEsp] = useState('all')

  const paises      = [...new Set(equipo.map(e=>e.pais))]
  const especialidades = [...new Set(equipo.map(e=>e.especialidad))]
  const estadoColor = { activo:'#4ADE80', freelance:'#FCD34D', inactivo:'#9CA3AF' }
  const dispColor   = { Disponible:'#4ADE80', Ocupado:'#F87171', Parcial:'#FCD34D', Ausente:'#9CA3AF' }

  const filtered = equipo.filter(e=>{
    if (search && !e.nombre.toLowerCase().includes(search.toLowerCase()) && !e.rol.toLowerCase().includes(search.toLowerCase())) return false
    if (filterPais !== 'all' && e.pais !== filterPais) return false
    if (filterEsp  !== 'all' && e.especialidad !== filterEsp) return false
    return true
  })

  const deleteEquipo = (id) => setEquipo(p=>p.filter(e=>e.id!==id))

  return (
    <div style={{ animation:'fadeIn 0.3s ease' }}>
      {/* Stats */}
      <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:12,marginBottom:20 }}>
        {[
          { label:'Total Equipo',  value:equipo.length,                              color:'#8B5CF6', icon:'👥' },
          { label:'Países',        value:paises.length,                              color:'#60A5FA', icon:'🌍' },
          { label:'Activos',       value:equipo.filter(e=>e.estado==='activo').length, color:'#4ADE80', icon:'✅' },
          { label:'Freelancers',   value:equipo.filter(e=>e.estado==='freelance').length, color:'#FCD34D', icon:'🔗' },
        ].map(s=>(
          <div key={s.label} style={{ padding:'14px 16px',background:'var(--glass-bg)',border:'1px solid var(--border-violet)',borderRadius:12,transition:'all 0.2s' }}
            onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--primary-violet)';e.currentTarget.style.transform='translateY(-2px)'}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--border-violet)';e.currentTarget.style.transform='none'}}>
            <div style={{ fontSize:20,marginBottom:4 }}>{s.icon}</div>
            <div style={{ fontSize:20,fontWeight:800,color:s.color }}>{s.value}</div>
            <div style={{ fontSize:10,color:'var(--text-secondary)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display:'flex',gap:10,marginBottom:20,flexWrap:'wrap' }}>
        <div style={{ position:'relative',flex:1,minWidth:200 }}>
          <Search size={14} style={{ position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'var(--text-secondary)' }}/>
          <input className="input-field" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar por nombre o rol..." style={{ paddingLeft:36 }}/>
        </div>
        <select className="select-field" style={{ width:'auto',minWidth:140 }} value={filterPais} onChange={e=>setFilterPais(e.target.value)}>
          <option value="all">Todos los países</option>
          {paises.map(p=><option key={p} value={p}>{p}</option>)}
        </select>
        <select className="select-field" style={{ width:'auto',minWidth:160 }} value={filterEsp} onChange={e=>setFilterEsp(e.target.value)}>
          <option value="all">Todas las especialidades</option>
          {especialidades.map(e=><option key={e} value={e}>{e}</option>)}
        </select>
        <button className="btn btn-primary" onClick={()=>onOpenForm(null)}><Plus size={15}/>Agregar Miembro</button>
      </div>

      {/* Cards */}
      <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:16 }}>
        {filtered.map(m=>{
          const cProjects = projects.filter(p=>p.creadorId===m.id)
          return (
            <div key={m.id} className="card" style={{ padding:'20px',cursor:'pointer' }} onClick={()=>onOpenDetalle(m)}>
              <div style={{ display:'flex',alignItems:'flex-start',gap:12,marginBottom:14 }}>
                <div style={{ width:52,height:52,borderRadius:16,background:'linear-gradient(135deg,var(--primary-violet),var(--accent-magenta))',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:20,flexShrink:0 }}>
                  {m.nombre.charAt(0)}
                </div>
                <div style={{ flex:1,minWidth:0 }}>
                  <div style={{ fontSize:14,fontWeight:700,marginBottom:2 }}>{m.nombre}</div>
                  <div style={{ fontSize:12,color:'var(--primary-violet-light)',marginBottom:4 }}>{m.rol}</div>
                  <div style={{ display:'flex',gap:6,alignItems:'center',fontSize:11,color:'var(--text-secondary)' }}>
                    <Globe size={10}/>{m.ciudad}, {m.pais}
                  </div>
                </div>
                <div style={{ display:'flex',gap:4,flexShrink:0 }} onClick={e=>e.stopPropagation()}>
                  <button onClick={()=>onOpenForm(m)} style={{ padding:'4px 7px',borderRadius:7,color:'var(--primary-violet-light)',background:'rgba(139,92,246,0.1)',border:'none',cursor:'pointer' }}><Edit3 size={11}/></button>
                  <button onClick={()=>deleteEquipo(m.id)} style={{ padding:'4px 7px',borderRadius:7,color:'#F87171',background:'rgba(239,68,68,0.1)',border:'none',cursor:'pointer' }}><Trash2 size={11}/></button>
                </div>
              </div>
              <div style={{ fontSize:12,color:'var(--text-secondary)',marginBottom:10,padding:'8px 12px',background:'rgba(139,92,246,0.06)',borderRadius:8 }}>
                <Briefcase size={11} style={{ marginRight:6 }}/>{m.especialidad}
              </div>
              <div style={{ display:'flex',gap:6,flexWrap:'wrap',marginBottom:8 }}>
                <span style={{ fontSize:10,padding:'2px 8px',borderRadius:20,background:`${estadoColor[m.estado]||'#9CA3AF'}22`,color:estadoColor[m.estado]||'#9CA3AF',fontWeight:600,textTransform:'capitalize' }}>{m.estado}</span>
                {m.disponibilidad&&<span style={{ fontSize:10,padding:'2px 8px',borderRadius:20,background:`${dispColor[m.disponibilidad]||'#9CA3AF'}22`,color:dispColor[m.disponibilidad]||'#9CA3AF',fontWeight:600 }}>{m.disponibilidad}</span>}
                {m.instagram&&<span style={{ fontSize:10,padding:'2px 8px',borderRadius:20,background:'rgba(139,92,246,0.12)',color:'var(--primary-violet-light)' }}>{m.instagram}</span>}
              </div>
              {cProjects.length > 0 && (
                <div style={{ fontSize:10,color:'var(--text-secondary)',marginBottom:8 }}>
                  <Star size={9} style={{ display:'inline',marginRight:4,verticalAlign:'middle',color:'#FCD34D' }}/>
                  {cProjects.length} proyecto{cProjects.length!==1?'s':''} asignado{cProjects.length!==1?'s':''}
                </div>
              )}
              {m.portfolio&&<a href={`https://${m.portfolio}`} target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()} style={{ display:'block',marginTop:6,fontSize:11,color:'var(--primary-violet-light)',textDecoration:'underline' }}>🔗 {m.portfolio}</a>}
            </div>
          )
        })}
        {filtered.length===0&&<div style={{ gridColumn:'1/-1',textAlign:'center',padding:'48px',color:'var(--text-secondary)' }}>No hay miembros del equipo</div>}
      </div>
    </div>
  )
}
