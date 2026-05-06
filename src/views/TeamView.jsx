import React, { useState } from 'react'
import { Plus, Edit3, Trash2, X, Save, Shield, Users, CheckCircle, Circle, Clock, AlertCircle, Search } from 'lucide-react'

const generateId = () => `${Date.now()}_${Math.random().toString(36).slice(2,7)}`
const F = ({label,children}) => (
  <div>
    <label style={{fontSize:12,fontWeight:500,color:'var(--text-secondary)',display:'block',marginBottom:6}}>{label}</label>
    {children}
  </div>
)

const ROLE_CFG = {
  admin:    { label:'Admin',    color:'#E879F9', bg:'rgba(232,121,249,0.15)' },
  director: { label:'Director', color:'#FCD34D', bg:'rgba(252,211,77,0.15)' },
  manager:  { label:'Manager',  color:'#8B5CF6', bg:'rgba(139,92,246,0.15)' },
  member:   { label:'Member',   color:'#4ADE80', bg:'rgba(74,222,128,0.15)' },
}
const DEPT_CFG = {
  resilio:     { label:'Resilio Life',     color:'#8B5CF6', icon:'⚡' },
  creative:    { label:'Ag. Creativa',     color:'#E879F9', icon:'🎨' },
  influencers: { label:'Ag. Influencers',  color:'#FCD34D', icon:'⭐' },
  events:      { label:'Productora',       color:'#4ADE80', icon:'🎉' },
  elevare:     { label:'Elevare',          color:'#F59E0B', icon:'💎' },
  tech:        { label:'Tech',             color:'#60A5FA', icon:'💻' },
}
const PERMISSIONS_LIST = [
  { id:'view_all',       label:'Ver todo'          },
  { id:'edit_projects',  label:'Editar proyectos'  },
  { id:'manage_team',    label:'Gestionar equipo'  },
  { id:'view_analytics', label:'Ver analytics'     },
  { id:'export_data',    label:'Exportar datos'    },
  { id:'manage_billing', label:'Gestionar billing' },
]
const TASK_STATUS = {
  pendiente:   { label:'Pendiente',  color:'#FCD34D', icon: Circle },
  aprobado:    { label:'Aprobado',   color:'#8B5CF6', icon: Clock },
  completado:  { label:'Completado', color:'#4ADE80', icon: CheckCircle },
}
const TASK_PRIORITY = {
  alta:  { label:'Alta',  color:'#F87171' },
  media: { label:'Media', color:'#FCD34D' },
  baja:  { label:'Baja',  color:'#4ADE80' },
}

const DEMO_TASKS = [
  { id:'t1', title:'Preparar reporte Q2',      assigneeId:'', status:'pendiente', priority:'alta',  dueDate:'2026-05-15', notes:'' },
  { id:'t2', title:'Revisar campañas activas', assigneeId:'', status:'aprobado',  priority:'media', dueDate:'2026-05-10', notes:'' },
  { id:'t3', title:'Onboarding nuevo cliente', assigneeId:'', status:'pendiente', priority:'alta',  dueDate:'2026-05-20', notes:'' },
  { id:'t4', title:'Actualizar contratos',      assigneeId:'', status:'completado',priority:'baja',  dueDate:'2026-05-05', notes:'' },
  { id:'t5', title:'Reunión estrategia mayo',   assigneeId:'', status:'completado',priority:'media', dueDate:'2026-05-03', notes:'' },
]

const MemberModal = ({ member, onSave, onClose }) => {
  const [form, setForm] = useState(member || { name:'',email:'',role:'member',department:'resilio',phone:'',status:'active',permissions:[],legajoNotes:'' })
  const set = (f,v) => setForm(p=>({...p,[f]:v}))
  const togglePerm = (id) => set('permissions',(form.permissions||[]).includes(id)?(form.permissions||[]).filter(x=>x!==id):[...(form.permissions||[]),id])
  const handleSave = () => { if(!form.name.trim()) return; onSave({...form,id:member?.id||generateId(),joinedAt:member?.joinedAt||new Date().toISOString().slice(0,10)}) }
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',backdropFilter:'blur(8px)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:20}} onClick={onClose}>
      <div style={{width:'100%',maxWidth:560,background:'var(--bg-secondary)',border:'1px solid var(--border-violet)',borderRadius:20,maxHeight:'92vh',overflowY:'auto',boxShadow:'var(--glow-violet)',animation:'fadeIn 0.3s ease'}} onClick={e=>e.stopPropagation()}>
        <div style={{padding:'24px 28px',borderBottom:'1px solid var(--border-violet)',display:'flex',alignItems:'center',gap:12}}>
          <div style={{width:40,height:40,borderRadius:'50%',background:'linear-gradient(135deg,var(--primary-violet),var(--accent-magenta))',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:16}}>{form.name?form.name.charAt(0):'👤'}</div>
          <h2 style={{fontSize:16,fontWeight:700}}>{member?'Editar Miembro':'Nuevo Miembro'}</h2>
          <button onClick={onClose} style={{marginLeft:'auto',color:'var(--text-secondary)',padding:6,borderRadius:8}}><X size={20}/></button>
        </div>
        <div style={{padding:'24px 28px',display:'flex',flexDirection:'column',gap:14}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <F label="Nombre *"><input className="input-field" value={form.name} onChange={e=>set('name',e.target.value)} placeholder="Juan García"/></F>
            <F label="Email"><input className="input-field" type="email" value={form.email} onChange={e=>set('email',e.target.value)} placeholder="juan@resilio.com"/></F>
            <F label="Teléfono"><input className="input-field" value={form.phone} onChange={e=>set('phone',e.target.value)} placeholder="+54 11 1234-5678"/></F>
            <F label="Estado">
              <select className="select-field" value={form.status} onChange={e=>set('status',e.target.value)}>
                <option value="active">Activo</option><option value="inactive">Inactivo</option>
              </select>
            </F>
          </div>
          <div>
            <label style={{fontSize:12,fontWeight:500,color:'var(--text-secondary)',display:'block',marginBottom:8}}>Rol</label>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
              {Object.entries(ROLE_CFG).map(([k,v])=>(
                <button key={k} onClick={()=>set('role',k)} style={{padding:'8px 12px',borderRadius:10,fontSize:12,fontWeight:500,border:`1px solid ${form.role===k?v.color:'var(--border-violet)'}`,background:form.role===k?v.bg:'rgba(139,92,246,0.05)',color:form.role===k?v.color:'var(--text-secondary)',transition:'all 0.2s'}}>{v.label}</button>
              ))}
            </div>
          </div>
          <div>
            <label style={{fontSize:12,fontWeight:500,color:'var(--text-secondary)',display:'block',marginBottom:8}}>Departamento</label>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
              {Object.entries(DEPT_CFG).map(([k,v])=>(
                <button key={k} onClick={()=>set('department',k)} style={{padding:'7px 12px',borderRadius:10,fontSize:12,textAlign:'left',border:`1px solid ${form.department===k?v.color:'var(--border-violet)'}`,background:form.department===k?`${v.color}18`:'rgba(139,92,246,0.05)',color:form.department===k?v.color:'var(--text-secondary)',transition:'all 0.2s'}}>{v.icon} {v.label}</button>
              ))}
            </div>
          </div>
          <div>
            <label style={{fontSize:12,fontWeight:500,color:'var(--text-secondary)',display:'block',marginBottom:8}}>Permisos</label>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
              {PERMISSIONS_LIST.map(p=>{
                const has=(form.permissions||[]).includes(p.id)
                return <button key={p.id} onClick={()=>togglePerm(p.id)} style={{display:'flex',alignItems:'center',gap:8,padding:'7px 10px',borderRadius:8,fontSize:12,border:`1px solid ${has?'var(--primary-violet)':'var(--border-violet)'}`,background:has?'rgba(139,92,246,0.15)':'rgba(139,92,246,0.04)',color:has?'var(--primary-violet-light)':'var(--text-secondary)',transition:'all 0.2s'}}>
                  <div style={{width:14,height:14,borderRadius:3,border:`2px solid ${has?'var(--primary-violet)':'rgba(139,92,246,0.3)'}`,background:has?'var(--primary-violet)':'transparent',flexShrink:0}}/>
                  {p.label}
                </button>
              })}
            </div>
          </div>
        </div>
        <div style={{padding:'16px 28px',borderTop:'1px solid var(--border-violet)',display:'flex',gap:10,justifyContent:'flex-end'}}>
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSave}><Save size={14}/>{member?'Guardar':'Agregar'}</button>
        </div>
      </div>
    </div>
  )
}

const LegajoModal = ({ member, tasks, onSave, onClose }) => {
  const [notes, setNotes] = useState(member.legajoNotes||'')
  const memberTasks = tasks.filter(t=>t.assigneeId===member.id)
  const role = ROLE_CFG[member.role]||ROLE_CFG.member
  const dept = DEPT_CFG[member.department]||DEPT_CFG.resilio
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',backdropFilter:'blur(8px)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:20}} onClick={onClose}>
      <div style={{width:'100%',maxWidth:600,background:'var(--bg-secondary)',border:'1px solid var(--border-violet)',borderRadius:20,maxHeight:'92vh',overflowY:'auto',boxShadow:'var(--glow-violet)',animation:'fadeIn 0.3s ease'}} onClick={e=>e.stopPropagation()}>
        <div style={{padding:'20px 28px',borderBottom:'1px solid var(--border-violet)',display:'flex',alignItems:'center',gap:14}}>
          <div style={{width:52,height:52,borderRadius:'50%',background:'linear-gradient(135deg,var(--primary-violet),var(--accent-magenta))',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:22,flexShrink:0}}>{member.name.charAt(0)}</div>
          <div style={{flex:1}}>
            <h2 style={{fontSize:17,fontWeight:800}}>{member.name}</h2>
            <div style={{display:'flex',gap:6,marginTop:4}}>
              <span style={{fontSize:10,padding:'2px 8px',borderRadius:20,background:role.bg,color:role.color,fontWeight:700}}>{role.label}</span>
              <span style={{fontSize:10,padding:'2px 8px',borderRadius:20,background:`${dept.color}18`,color:dept.color,fontWeight:600}}>{dept.icon} {dept.label}</span>
            </div>
          </div>
          <button onClick={onClose} style={{padding:6,borderRadius:8,color:'var(--text-secondary)',background:'none',border:'none',cursor:'pointer'}}><X size={20}/></button>
        </div>

        <div style={{padding:'20px 28px',display:'flex',flexDirection:'column',gap:20}}>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}}>
            {[
              {label:'Tareas totales',   value:memberTasks.length,                                       color:'#8B5CF6'},
              {label:'Completadas',      value:memberTasks.filter(t=>t.status==='completado').length,    color:'#4ADE80'},
              {label:'Pendientes',       value:memberTasks.filter(t=>t.status==='pendiente').length,     color:'#FCD34D'},
            ].map(s=>(
              <div key={s.label} style={{textAlign:'center',padding:'14px 8px',borderRadius:12,background:`${s.color}14`,border:`1px solid ${s.color}33`}}>
                <div style={{fontSize:24,fontWeight:800,color:s.color}}>{s.value}</div>
                <div style={{fontSize:10,color:'var(--text-secondary)',marginTop:2}}>{s.label}</div>
              </div>
            ))}
          </div>

          {memberTasks.length > 0 && (
            <div>
              <div style={{fontSize:13,fontWeight:700,marginBottom:10}}>Tareas Asignadas</div>
              <div style={{display:'flex',flexDirection:'column',gap:6}}>
                {memberTasks.map(t=>{
                  const st = TASK_STATUS[t.status]
                  const pr = TASK_PRIORITY[t.priority]
                  const Icon = st?.icon || Circle
                  return (
                    <div key={t.id} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 12px',background:'rgba(139,92,246,0.07)',borderRadius:8,border:'1px solid rgba(139,92,246,0.1)'}}>
                      <Icon size={14} color={st?.color||'#9CA3AF'}/>
                      <span style={{flex:1,fontSize:12}}>{t.title}</span>
                      <span style={{fontSize:9,padding:'1px 6px',borderRadius:10,background:`${pr?.color||'#9CA3AF'}22`,color:pr?.color||'#9CA3AF',fontWeight:600}}>{pr?.label}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div>
            <div style={{fontSize:13,fontWeight:700,marginBottom:8}}>Legajo / Notas del Miembro</div>
            <textarea className="input-field" value={notes} onChange={e=>setNotes(e.target.value)} rows={6}
              placeholder="Historial, acuerdos, evaluaciones, observaciones del equipo..."
              style={{resize:'vertical'}}
            />
          </div>

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            {[
              {l:'Email',v:member.email},
              {l:'Teléfono',v:member.phone},
              {l:'Ingresó',v:member.joinedAt||'—'},
              {l:'Estado',v:member.status==='active'?'Activo':'Inactivo'},
            ].map(i=>(
              <div key={i.l} style={{padding:'8px 12px',background:'rgba(139,92,246,0.05)',borderRadius:8}}>
                <div style={{fontSize:10,color:'var(--text-secondary)',marginBottom:2}}>{i.l}</div>
                <div style={{fontSize:12,fontWeight:600}}>{i.v||'—'}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{padding:'14px 28px',borderTop:'1px solid var(--border-violet)',display:'flex',gap:10,justifyContent:'flex-end'}}>
          <button className="btn btn-ghost" onClick={onClose}>Cerrar</button>
          <button className="btn btn-primary" onClick={()=>{onSave({...member,legajoNotes:notes});onClose()}}><Save size={14}/>Guardar Notas</button>
        </div>
      </div>
    </div>
  )
}

const TaskModal = ({ task, members, onSave, onClose }) => {
  const [form, setForm] = useState(task||{title:'',assigneeId:'',status:'pendiente',priority:'media',dueDate:'',notes:''})
  const set=(f,v)=>setForm(p=>({...p,[f]:v}))
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',backdropFilter:'blur(8px)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:20}} onClick={onClose}>
      <div style={{width:'100%',maxWidth:480,background:'var(--bg-secondary)',border:'1px solid var(--border-violet)',borderRadius:20,animation:'fadeIn 0.3s ease'}} onClick={e=>e.stopPropagation()}>
        <div style={{padding:'20px 24px',borderBottom:'1px solid var(--border-violet)',display:'flex',alignItems:'center',gap:12}}>
          <span style={{fontSize:20}}>📋</span>
          <h2 style={{fontSize:16,fontWeight:700}}>{task?'Editar Tarea':'Nueva Tarea'}</h2>
          <button onClick={onClose} style={{marginLeft:'auto',color:'var(--text-secondary)',padding:6,borderRadius:8}}><X size={18}/></button>
        </div>
        <div style={{padding:'20px 24px',display:'flex',flexDirection:'column',gap:12}}>
          <F label="Título *"><input className="input-field" value={form.title} onChange={e=>set('title',e.target.value)} placeholder="Descripción de la tarea"/></F>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <F label="Asignado a">
              <select className="select-field" value={form.assigneeId} onChange={e=>set('assigneeId',e.target.value)}>
                <option value="">Sin asignar</option>
                {members.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </F>
            <F label="Fecha límite"><input className="input-field" type="date" value={form.dueDate} onChange={e=>set('dueDate',e.target.value)}/></F>
          </div>
          <div>
            <label style={{fontSize:12,fontWeight:500,color:'var(--text-secondary)',display:'block',marginBottom:8}}>Estado</label>
            <div style={{display:'flex',gap:8}}>
              {Object.entries(TASK_STATUS).map(([k,v])=>(
                <button key={k} onClick={()=>set('status',k)} style={{flex:1,padding:'7px',borderRadius:10,fontSize:11,fontWeight:600,border:`1px solid ${form.status===k?v.color:'var(--border-violet)'}`,background:form.status===k?`${v.color}22`:'rgba(139,92,246,0.05)',color:form.status===k?v.color:'var(--text-secondary)',transition:'all 0.2s',cursor:'pointer'}}>{v.label}</button>
              ))}
            </div>
          </div>
          <div>
            <label style={{fontSize:12,fontWeight:500,color:'var(--text-secondary)',display:'block',marginBottom:8}}>Prioridad</label>
            <div style={{display:'flex',gap:8}}>
              {Object.entries(TASK_PRIORITY).map(([k,v])=>(
                <button key={k} onClick={()=>set('priority',k)} style={{flex:1,padding:'7px',borderRadius:10,fontSize:11,fontWeight:600,border:`1px solid ${form.priority===k?v.color:'var(--border-violet)'}`,background:form.priority===k?`${v.color}22`:'rgba(139,92,246,0.05)',color:form.priority===k?v.color:'var(--text-secondary)',transition:'all 0.2s',cursor:'pointer'}}>{v.label}</button>
              ))}
            </div>
          </div>
          <F label="Notas"><textarea className="input-field" value={form.notes} onChange={e=>set('notes',e.target.value)} rows={2} style={{resize:'vertical'}} placeholder="Detalles adicionales..."/></F>
        </div>
        <div style={{padding:'14px 24px',borderTop:'1px solid var(--border-violet)',display:'flex',gap:10,justifyContent:'flex-end'}}>
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={()=>{if(!form.title.trim())return;onSave({...form,id:task?.id||generateId()});onClose()}}><Save size={14}/>Guardar</button>
        </div>
      </div>
    </div>
  )
}

export default function TeamView({ members, onSave, onDelete }) {
  const [tab,         setTab]        = useState('equipo')
  const [modal,       setModal]      = useState(null)
  const [legajoMember,setLegajoMember]= useState(null)
  const [taskModal,   setTaskModal]  = useState(null)
  const [tasks,       setTasks]      = useState(DEMO_TASKS)
  const [fDept,       setFDept]      = useState('all')
  const [fRole,       setFRole]      = useState('all')
  const [taskSearch,  setTaskSearch] = useState('')
  const [taskFilter,  setTaskFilter] = useState('all')
  const [taskAssignee,setTaskAssignee]= useState('all')

  const saveTask = (t) => setTasks(p=>p.find(x=>x.id===t.id)?p.map(x=>x.id===t.id?t:x):[...p,t])
  const deleteTask = (id) => setTasks(p=>p.filter(x=>x.id!==id))

  const filtered = members.filter(m=>(fDept==='all'||m.department===fDept)&&(fRole==='all'||m.role===fRole))
  const active = members.filter(m=>m.status==='active').length

  const filteredTasks = tasks.filter(t=>{
    const ms = t.title.toLowerCase().includes(taskSearch.toLowerCase())
    return ms && (taskFilter==='all'||t.status===taskFilter) && (taskAssignee==='all'||t.assigneeId===taskAssignee)
  })

  const TABS = [{id:'equipo',label:'👥 Equipo'},{id:'tareas',label:'📋 Tareas'},{id:'performance',label:'📊 Performance'}]

  return (
    <div style={{padding:24,animation:'fadeIn 0.3s ease'}}>
      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:20,flexWrap:'wrap'}}>
        <div>
          <h2 style={{fontSize:20,fontWeight:700}}>Team</h2>
          <p style={{fontSize:12,color:'var(--text-secondary)'}}>{members.length} miembros · {active} activos · {tasks.filter(t=>t.status!=='completado').length} tareas activas</p>
        </div>
        <div style={{flex:1}}/>
        {tab==='equipo'&&<button className="btn btn-primary" onClick={()=>setModal('create')}><Plus size={16}/>Nuevo Miembro</button>}
        {tab==='tareas'&&<button className="btn btn-primary" onClick={()=>setTaskModal('create')}><Plus size={16}/>Nueva Tarea</button>}
      </div>

      {/* Tabs */}
      <div style={{display:'flex',gap:6,marginBottom:20}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{padding:'8px 18px',borderRadius:10,fontSize:13,fontWeight:tab===t.id?700:400,border:`1px solid ${tab===t.id?'var(--primary-violet)':'var(--border-violet)'}`,background:tab===t.id?'rgba(139,92,246,0.2)':'rgba(139,92,246,0.05)',color:tab===t.id?'var(--primary-violet-light)':'var(--text-secondary)',transition:'all 0.2s',cursor:'pointer'}}>{t.label}</button>
        ))}
      </div>

      {/* EQUIPO TAB */}
      {tab==='equipo'&&(
        <div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))',gap:10,marginBottom:20}}>
            {Object.entries(ROLE_CFG).map(([k,v])=>{
              const cnt=members.filter(m=>m.role===k).length
              return <div key={k} style={{padding:'12px 14px',background:'var(--glass-bg)',border:'1px solid var(--border-violet)',borderRadius:12}}><div style={{fontSize:18,fontWeight:800,color:v.color}}>{cnt}</div><div style={{fontSize:10,color:'var(--text-secondary)'}}>{v.label}</div></div>
            })}
          </div>
          <div style={{display:'flex',gap:8,marginBottom:20,flexWrap:'wrap'}}>
            <select className="select-field" style={{width:'auto',minWidth:150}} value={fDept} onChange={e=>setFDept(e.target.value)}>
              <option value="all">Todos los dptos.</option>
              {Object.entries(DEPT_CFG).map(([k,v])=><option key={k} value={k}>{v.icon} {v.label}</option>)}
            </select>
            <select className="select-field" style={{width:'auto',minWidth:130}} value={fRole} onChange={e=>setFRole(e.target.value)}>
              <option value="all">Todos los roles</option>
              {Object.entries(ROLE_CFG).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:14}}>
            {filtered.map(m=>{
              const role=ROLE_CFG[m.role]||ROLE_CFG.member
              const dept=DEPT_CFG[m.department]||DEPT_CFG.resilio
              const mTasks=tasks.filter(t=>t.assigneeId===m.id)
              return (
                <div key={m.id} style={{background:'var(--glass-bg)',border:'1px solid var(--border-violet)',borderRadius:14,padding:'18px 20px',transition:'all 0.2s',cursor:'pointer'}}
                  onClick={()=>setLegajoMember(m)}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--primary-violet)';e.currentTarget.style.transform='translateY(-3px)';e.currentTarget.style.boxShadow='var(--glow-violet-sm)'}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--border-violet)';e.currentTarget.style.transform='none';e.currentTarget.style.boxShadow='none'}}
                >
                  <div style={{display:'flex',alignItems:'flex-start',gap:12,marginBottom:14}}>
                    <div style={{width:48,height:48,borderRadius:'50%',background:'linear-gradient(135deg,var(--primary-violet),var(--accent-magenta))',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:18,flexShrink:0,boxShadow:'var(--glow-violet-sm)'}}>{m.name.charAt(0)}</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:14,fontWeight:700,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{m.name}</div>
                      <div style={{fontSize:11,color:'var(--text-secondary)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{m.email}</div>
                    </div>
                    <div style={{display:'flex',gap:4,flexShrink:0}}>
                      <button onClick={e=>{e.stopPropagation();setModal(m)}} style={{padding:'4px 6px',borderRadius:7,color:'var(--primary-violet-light)',background:'rgba(139,92,246,0.1)',border:'none',cursor:'pointer'}}><Edit3 size={11}/></button>
                      <button onClick={e=>{e.stopPropagation();onDelete(m.id)}} style={{padding:'4px 6px',borderRadius:7,color:'#F87171',background:'rgba(239,68,68,0.1)',border:'none',cursor:'pointer'}}><Trash2 size={11}/></button>
                    </div>
                  </div>
                  <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:10}}>
                    <span style={{fontSize:10,padding:'2px 9px',borderRadius:20,background:role.bg,color:role.color,fontWeight:700}}>{role.label}</span>
                    <span style={{fontSize:10,padding:'2px 9px',borderRadius:20,background:`${dept.color}18`,color:dept.color,fontWeight:600}}>{dept.icon} {dept.label}</span>
                    <span style={{fontSize:10,padding:'2px 9px',borderRadius:20,background:m.status==='active'?'rgba(74,222,128,0.12)':'rgba(239,68,68,0.12)',color:m.status==='active'?'#4ADE80':'#F87171',fontWeight:600}}>{m.status==='active'?'Activo':'Inactivo'}</span>
                  </div>
                  {mTasks.length>0&&(
                    <div style={{fontSize:11,color:'var(--text-secondary)'}}>
                      📋 {mTasks.filter(t=>t.status==='completado').length}/{mTasks.length} tareas completadas
                    </div>
                  )}
                  {m.legajoNotes&&<div style={{fontSize:10,color:'var(--text-secondary)',marginTop:6,opacity:0.7}}>📝 Tiene notas en legajo</div>}
                </div>
              )
            })}
            {filtered.length===0&&(
              <div style={{gridColumn:'1/-1',textAlign:'center',padding:'48px',color:'var(--text-secondary)'}}>
                <div style={{fontSize:40,marginBottom:12}}>👥</div><div>No hay miembros</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAREAS TAB */}
      {tab==='tareas'&&(
        <div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:20}}>
            {Object.entries(TASK_STATUS).map(([k,v])=>{
              const cnt=tasks.filter(t=>t.status===k).length
              const Icon=v.icon
              return <div key={k} style={{padding:'14px 16px',background:'var(--glass-bg)',border:`1px solid ${v.color}44`,borderRadius:12,display:'flex',alignItems:'center',gap:12}}>
                <Icon size={20} color={v.color}/>
                <div><div style={{fontSize:20,fontWeight:800,color:v.color}}>{cnt}</div><div style={{fontSize:10,color:'var(--text-secondary)'}}>{v.label}</div></div>
              </div>
            })}
          </div>

          <div style={{display:'flex',gap:10,marginBottom:16,flexWrap:'wrap'}}>
            <div style={{position:'relative',flex:1,minWidth:180}}>
              <Search size={14} style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'var(--text-secondary)'}}/>
              <input className="input-field" value={taskSearch} onChange={e=>setTaskSearch(e.target.value)} placeholder="Buscar tarea..." style={{paddingLeft:36}}/>
            </div>
            <select className="select-field" style={{width:'auto',minWidth:140}} value={taskFilter} onChange={e=>setTaskFilter(e.target.value)}>
              <option value="all">Todos los estados</option>
              {Object.entries(TASK_STATUS).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
            </select>
            <select className="select-field" style={{width:'auto',minWidth:140}} value={taskAssignee} onChange={e=>setTaskAssignee(e.target.value)}>
              <option value="all">Todos los miembros</option>
              {members.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>

          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {filteredTasks.map(t=>{
              const st=TASK_STATUS[t.status]
              const pr=TASK_PRIORITY[t.priority]
              const assignee=members.find(m=>m.id===t.assigneeId)
              const Icon=st?.icon||Circle
              return (
                <div key={t.id} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 16px',background:'var(--glass-bg)',border:'1px solid var(--border-violet)',borderRadius:12,transition:'all 0.2s'}}
                  onMouseEnter={e=>e.currentTarget.style.borderColor='var(--primary-violet)'}
                  onMouseLeave={e=>e.currentTarget.style.borderColor='var(--border-violet)'}
                >
                  <Icon size={16} color={st?.color||'#9CA3AF'}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:600}}>{t.title}</div>
                    <div style={{fontSize:11,color:'var(--text-secondary)',marginTop:2}}>
                      {assignee?`👤 ${assignee.name}`:'Sin asignar'}
                      {t.dueDate&&` · 📅 ${t.dueDate}`}
                    </div>
                  </div>
                  <span style={{fontSize:10,padding:'2px 8px',borderRadius:20,background:`${pr?.color||'#9CA3AF'}22`,color:pr?.color||'#9CA3AF',fontWeight:600,flexShrink:0}}>{pr?.label}</span>
                  <span style={{fontSize:10,padding:'2px 8px',borderRadius:20,background:`${st?.color||'#9CA3AF'}22`,color:st?.color||'#9CA3AF',fontWeight:600,flexShrink:0}}>{st?.label}</span>
                  <div style={{display:'flex',gap:4,flexShrink:0}}>
                    <button onClick={()=>setTaskModal(t)} style={{padding:'4px 6px',borderRadius:7,color:'var(--primary-violet-light)',background:'rgba(139,92,246,0.1)',border:'none',cursor:'pointer'}}><Edit3 size={11}/></button>
                    <button onClick={()=>deleteTask(t.id)} style={{padding:'4px 6px',borderRadius:7,color:'#F87171',background:'rgba(239,68,68,0.1)',border:'none',cursor:'pointer'}}><Trash2 size={11}/></button>
                  </div>
                </div>
              )
            })}
            {filteredTasks.length===0&&<div style={{textAlign:'center',padding:'48px',color:'var(--text-secondary)'}}><div style={{fontSize:40,marginBottom:12}}>📋</div><div>No hay tareas</div></div>}
          </div>
        </div>
      )}

      {/* PERFORMANCE TAB */}
      {tab==='performance'&&(
        <div>
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {[...members].sort((a,b)=>{
              const aT=tasks.filter(t=>t.assigneeId===a.id)
              const bT=tasks.filter(t=>t.assigneeId===b.id)
              return bT.filter(t=>t.status==='completado').length - aT.filter(t=>t.status==='completado').length
            }).map((m,i)=>{
              const mTasks=tasks.filter(t=>t.assigneeId===m.id)
              const done=mTasks.filter(t=>t.status==='completado').length
              const pct=mTasks.length>0?Math.round(done/mTasks.length*100):0
              const role=ROLE_CFG[m.role]||ROLE_CFG.member
              const dept=DEPT_CFG[m.department]||DEPT_CFG.resilio
              return (
                <div key={m.id} style={{display:'flex',alignItems:'center',gap:14,padding:'14px 18px',background:'var(--glass-bg)',border:'1px solid var(--border-violet)',borderRadius:12,transition:'all 0.2s'}}
                  onMouseEnter={e=>e.currentTarget.style.borderColor='var(--primary-violet)'}
                  onMouseLeave={e=>e.currentTarget.style.borderColor='var(--border-violet)'}
                >
                  <div style={{fontSize:13,fontWeight:700,color:'var(--text-secondary)',width:24,textAlign:'right',flexShrink:0}}>#{i+1}</div>
                  <div style={{width:40,height:40,borderRadius:'50%',background:'linear-gradient(135deg,var(--primary-violet),var(--accent-magenta))',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:16,flexShrink:0}}>{m.name.charAt(0)}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
                      <span style={{fontSize:13,fontWeight:700}}>{m.name}</span>
                      <span style={{fontSize:9,padding:'1px 6px',borderRadius:10,background:role.bg,color:role.color,fontWeight:600}}>{role.label}</span>
                      <span style={{fontSize:9,padding:'1px 6px',borderRadius:10,background:`${dept.color}18`,color:dept.color}}>{dept.icon} {dept.label}</span>
                    </div>
                    <div style={{height:5,borderRadius:3,background:'rgba(139,92,246,0.1)'}}>
                      <div style={{height:'100%',width:`${pct}%`,borderRadius:3,background:`linear-gradient(90deg,var(--primary-violet),var(--accent-magenta))`,transition:'width 0.5s'}}/>
                    </div>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(3,56px)',gap:8,flexShrink:0}}>
                    {[{l:'Total',v:mTasks.length},{l:'Completadas',v:done},{l:'%',v:`${pct}%`}].map(s=>(
                      <div key={s.l} style={{textAlign:'center'}}>
                        <div style={{fontSize:14,fontWeight:700,color:s.l==='%'&&pct>70?'#4ADE80':'var(--primary-violet-light)'}}>{s.v}</div>
                        <div style={{fontSize:9,color:'var(--text-secondary)'}}>{s.l}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {modal && <MemberModal member={modal==='create'?null:modal} onSave={d=>{onSave(d);setModal(null)}} onClose={()=>setModal(null)}/>}
      {legajoMember && <LegajoModal member={legajoMember} tasks={tasks} onSave={d=>onSave(d)} onClose={()=>setLegajoMember(null)}/>}
      {taskModal && <TaskModal task={taskModal==='create'?null:taskModal} members={members} onSave={saveTask} onClose={()=>setTaskModal(null)}/>}
    </div>
  )
}
