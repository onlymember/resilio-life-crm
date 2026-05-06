import React, { useState, useMemo } from 'react'
import {
  Target, Plus, Check, X, Clock, Star, Zap, ChevronDown,
  Filter, Search, Edit3, Trash2, TrendingUp, Users,
  Eye, AlertCircle, CheckCircle, Calendar, Tag
} from 'lucide-react'

const STATUS_CFG = {
  active:    { label: 'Activa',      color: '#8B5CF6', bg: 'rgba(139,92,246,0.15)'  },
  pending:   { label: 'Pendiente',   color: '#F59E0B', bg: 'rgba(245,158,11,0.15)'  },
  in_process:{ label: 'En Proceso',  color: '#60A5FA', bg: 'rgba(96,165,250,0.15)'  },
  completed: { label: 'Completada',  color: '#10B981', bg: 'rgba(16,185,129,0.15)'  },
  review:    { label: 'En Revisión', color: '#06B6D4', bg: 'rgba(6,182,212,0.15)'   },
  approved:  { label: 'Aprobada',    color: '#4ADE80', bg: 'rgba(74,222,128,0.15)'  },
  rejected:  { label: 'Rechazada',   color: '#F87171', bg: 'rgba(248,113,113,0.15)' }
}

// Priority (replaces difficulty) - 1-3 stars
const PRIORITY_CFG = {
  1: { label: 'Baja',  color: '#4ADE80', stars: 1 },
  2: { label: 'Media', color: '#FCD34D', stars: 2 },
  3: { label: 'Alta',  color: '#F87171', stars: 3 }
}

// Updated categories
const CATEGORIES = [
  'Agencia Creativa', 'Productora', 'Contenido', 'Elevare',
  'RED', 'Agua', 'Stream', 'Cuenta Resilio', 'Forest',
  'Scouting', 'Captación'
]

const EMPTY_MISSION = {
  id: '', title: '', description: '', category: 'Contenido',
  status: 'active', priority: 1, deadline: '',
  assignedTo: '', notes: '', createdAt: null
}

function Badge({ cfg, label }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 10px', borderRadius: 20,
      fontSize: 11, fontWeight: 600, letterSpacing: 0.5,
      background: cfg.bg || cfg.color + '22',
      color: cfg.color,
      border: `1px solid ${cfg.color}44`
    }}>{label || cfg.label}</span>
  )
}

function PriorityStars({ priority }) {
  const cfg = PRIORITY_CFG[priority] || PRIORITY_CFG[1]
  return (
    <span style={{ color: cfg.color, fontSize: 14, letterSpacing: 2 }}>
      {'★'.repeat(cfg.stars)}{'☆'.repeat(3 - cfg.stars)}
    </span>
  )
}

function DeadlineBar({ deadline, status }) {
  if (!deadline || ['approved', 'completed', 'rejected'].includes(status)) return null
  const now  = new Date()
  const end  = new Date(deadline)
  const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24))
  const color = diff < 0 ? '#F87171' : diff <= 3 ? '#F87171' : diff <= 7 ? '#FCD34D' : '#4ADE80'
  const label = diff < 0 ? 'Vencida' : diff === 0 ? 'Hoy' : `${diff}d`
  return (
    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
      <div style={{ flex:1, height:4, background:'rgba(139,92,246,0.15)', borderRadius:2, overflow:'hidden' }}>
        <div style={{ height:'100%', width:`${Math.max(0,Math.min(100,(diff/30)*100))}%`, background:color, borderRadius:2, transition:'width 1s ease' }}/>
      </div>
      <span style={{ fontSize:10, fontWeight:700, color, minWidth:36, textAlign:'right' }}>{label}</span>
    </div>
  )
}

function StatCard({ icon, label, value, color }) {
  return (
    <div className="stat-card">
      <div style={{ width:44, height:44, borderRadius:12, background:`${color}22`, display:'flex', alignItems:'center', justifyContent:'center', color, flexShrink:0 }}>{icon}</div>
      <div>
        <div style={{ fontSize:22, fontWeight:700 }}>{value}</div>
        <div style={{ fontSize:12, color:'var(--text-secondary)' }}>{label}</div>
      </div>
    </div>
  )
}

export default function MissionsView({ missions, influencers = [], onSave, onDelete }) {
  const [tab,        setTab]        = useState('all')
  const [search,     setSearch]     = useState('')
  const [filterCat,  setFilterCat]  = useState('all')
  const [filterSt,   setFilterSt]   = useState('all')
  const [filterAgent,setFilterAgent]= useState('all')
  const [editing,    setEditing]    = useState(null)
  const [viewing,    setViewing]    = useState(null)
  const [newCat,     setNewCat]     = useState('')
  const [customCats, setCustomCats] = useState([])

  const allCats   = [...CATEGORIES, ...customCats]
  const allAgents = useMemo(() => {
    const agents = [...new Set((missions||[]).map(m=>m.assignedTo).filter(Boolean))]
    return agents
  }, [missions])

  const filtered = useMemo(() => {
    return (missions || []).filter(m => {
      if (filterCat   !== 'all' && m.category  !== filterCat)   return false
      if (filterSt    !== 'all' && m.status    !== filterSt)    return false
      if (filterAgent !== 'all' && m.assignedTo !== filterAgent) return false
      if (search && !m.title.toLowerCase().includes(search.toLowerCase()) &&
          !(m.assignedTo || '').toLowerCase().includes(search.toLowerCase())) return false
      if (tab === 'review'    && m.status !== 'review')                          return false
      if (tab === 'in_process'&& m.status !== 'in_process')                      return false
      if (tab === 'completed' && !['completed','approved','rejected'].includes(m.status)) return false
      return true
    })
  }, [missions, filterCat, filterSt, filterAgent, search, tab])

  const stats = useMemo(() => ({
    total:      (missions||[]).length,
    active:     (missions||[]).filter(m=>m.status==='active').length,
    in_process: (missions||[]).filter(m=>m.status==='in_process').length,
    review:     (missions||[]).filter(m=>m.status==='review').length,
    approved:   (missions||[]).filter(m=>m.status==='approved').length,
  }), [missions])

  const approve = (m) => onSave({ ...m, status: 'approved', approvedAt: new Date().toISOString() })
  const reject  = (m) => onSave({ ...m, status: 'rejected', rejectedAt: new Date().toISOString() })

  const save = () => {
    if (!editing?.title?.trim() || !editing?.deadline) return
    onSave({
      ...editing,
      id: editing.id || `mis_${Date.now()}`,
      createdAt: editing.createdAt || new Date().toISOString()
    })
    setEditing(null)
  }

  return (
    <div style={{ padding:24, maxWidth:1400, margin:'0 auto', animation:'fadeIn 0.3s ease' }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:16, marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:24, fontWeight:800, marginBottom:4, display:'flex', alignItems:'center', gap:10 }}>
            <Target size={26} color="var(--primary-violet)"/>
            <span className="gradient-text">Misiones</span>
          </h1>
          <p style={{ color:'var(--text-secondary)', fontSize:13 }}>Gestión de misiones por agente y categoría</p>
        </div>
        <button className="btn btn-primary" onClick={() => setEditing({ ...EMPTY_MISSION })}>
          <Plus size={16}/> Nueva Misión
        </button>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:16, marginBottom:24 }}>
        <StatCard icon={<Target size={20}/>}      label="Total"       value={stats.total}      color="var(--primary-violet)"/>
        <StatCard icon={<Zap size={20}/>}          label="Activas"     value={stats.active}     color="#A78BFA"/>
        <StatCard icon={<TrendingUp size={20}/>}   label="En Proceso"  value={stats.in_process} color="#60A5FA"/>
        <StatCard icon={<Eye size={20}/>}           label="En Revisión" value={stats.review}     color="#06B6D4"/>
        <StatCard icon={<CheckCircle size={20}/>}  label="Aprobadas"   value={stats.approved}   color="#4ADE80"/>
      </div>

      {/* Filters */}
      <div style={{ display:'flex', flexWrap:'wrap', gap:10, alignItems:'center', marginBottom:20 }}>
        {/* Status tabs */}
        <div style={{ display:'flex', gap:6, background:'rgba(139,92,246,0.06)', borderRadius:12, padding:4 }}>
          {[['all','Todas'],['in_process','En Proceso'],['review','Revisión'],['completed','Completadas']].map(([k,l])=>(
            <button key={k} onClick={()=>setTab(k)} style={{ padding:'7px 14px', borderRadius:8, fontSize:12, fontWeight:600, border:'none', background:tab===k?'rgba(139,92,246,0.25)':'transparent', color:tab===k?'var(--primary-violet-light)':'var(--text-secondary)', cursor:'pointer', transition:'all 0.2s' }}>{l}</button>
          ))}
        </div>
        {/* Search */}
        <div style={{ position:'relative', flex:1, minWidth:180 }}>
          <Search size={14} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--text-secondary)' }}/>
          <input className="input-field" placeholder="Buscar misión o agente..." value={search} onChange={e=>setSearch(e.target.value)} style={{ paddingLeft:34 }}/>
        </div>
        {/* Category filter */}
        <select className="select-field" value={filterCat} onChange={e=>setFilterCat(e.target.value)} style={{ width:'auto', minWidth:150 }}>
          <option value="all">Todas las categorías</option>
          {allCats.map(c=><option key={c} value={c}>{c}</option>)}
        </select>
        {/* Agent filter */}
        <select className="select-field" value={filterAgent} onChange={e=>setFilterAgent(e.target.value)} style={{ width:'auto', minWidth:150 }}>
          <option value="all">Todos los agentes</option>
          {allAgents.map(a=><option key={a} value={a}>{a}</option>)}
        </select>
        {/* Status filter */}
        <select className="select-field" value={filterSt} onChange={e=>setFilterSt(e.target.value)} style={{ width:'auto', minWidth:140 }}>
          <option value="all">Todos los estados</option>
          {Object.entries(STATUS_CFG).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="glass" style={{ borderRadius:'var(--radius-lg)', overflow:'hidden' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr style={{ borderBottom:'1px solid var(--border-violet)' }}>
              {['Misión','Categoría','Prioridad','Estado','Agente','Deadline','Progreso','Acciones'].map(h=>(
                <th key={h} style={{ padding:'12px 16px', textAlign:'left', fontSize:11, fontWeight:700, letterSpacing:1, color:'var(--text-secondary)', textTransform:'uppercase', whiteSpace:'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={8}>
                <div className="empty-state">
                  <Target size={40} color="var(--primary-violet)" style={{ opacity:0.4 }}/>
                  <p style={{ color:'var(--text-secondary)' }}>Sin misiones para mostrar</p>
                </div>
              </td></tr>
            )}
            {filtered.map(m => {
              const st = STATUS_CFG[m.status] || STATUS_CFG.active
              return (
                <tr key={m.id} style={{ borderBottom:'1px solid var(--border-violet)', transition:'background 0.2s' }}
                    onMouseEnter={e=>e.currentTarget.style.background='rgba(139,92,246,0.05)'}
                    onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <td style={{ padding:'12px 16px', maxWidth:240 }}>
                    <div style={{ fontWeight:600, fontSize:13, marginBottom:2 }}>{m.title}</div>
                    <div style={{ fontSize:11, color:'var(--text-secondary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:200 }}>{m.description}</div>
                    {m.notes && <div style={{ fontSize:10, color:'var(--primary-violet-light)', marginTop:2 }}>📝 {m.notes}</div>}
                  </td>
                  <td style={{ padding:'12px 16px', whiteSpace:'nowrap' }}>
                    <span style={{ padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:600, background:'rgba(139,92,246,0.12)', color:'var(--primary-violet-light)', border:'1px solid var(--border-violet)' }}>{m.category||'—'}</span>
                  </td>
                  <td style={{ padding:'12px 16px', whiteSpace:'nowrap' }}>
                    <PriorityStars priority={m.priority||1}/>
                  </td>
                  <td style={{ padding:'12px 16px' }}>
                    <Badge cfg={st}/>
                  </td>
                  <td style={{ padding:'12px 16px', fontSize:13, color:'var(--text-secondary)', whiteSpace:'nowrap' }}>
                    {m.assignedTo ? (
                      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                        <div style={{ width:24, height:24, borderRadius:'50%', background:'linear-gradient(135deg,var(--primary-violet),var(--accent-magenta))', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, color:'white' }}>
                          {(m.assignedTo[0]||'?').toUpperCase()}
                        </div>
                        <span style={{ fontSize:12 }}>{m.assignedTo}</span>
                      </div>
                    ) : <span style={{ opacity:0.4 }}>—</span>}
                  </td>
                  <td style={{ padding:'12px 16px', fontSize:12, whiteSpace:'nowrap' }}>
                    {m.deadline ? new Date(m.deadline).toLocaleDateString('es-AR', { day:'2-digit', month:'short' }) : '—'}
                  </td>
                  <td style={{ padding:'12px 16px', minWidth:120 }}>
                    <DeadlineBar deadline={m.deadline} status={m.status}/>
                  </td>
                  <td style={{ padding:'12px 16px' }}>
                    <div style={{ display:'flex', gap:5 }}>
                      {m.status === 'review' && (
                        <>
                          <button title="Aprobar" onClick={()=>approve(m)} style={{ width:26, height:26, borderRadius:7, background:'rgba(74,222,128,0.15)', border:'1px solid rgba(74,222,128,0.3)', color:'#4ADE80', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}><Check size={12}/></button>
                          <button title="Rechazar" onClick={()=>reject(m)} style={{ width:26, height:26, borderRadius:7, background:'rgba(248,113,113,0.15)', border:'1px solid rgba(248,113,113,0.3)', color:'#F87171', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}><X size={12}/></button>
                        </>
                      )}
                      <button title="Ver" onClick={()=>setViewing(m)} style={{ width:26, height:26, borderRadius:7, background:'rgba(139,92,246,0.1)', border:'1px solid var(--border-violet)', color:'var(--primary-violet-light)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}><Eye size={12}/></button>
                      <button title="Editar" onClick={()=>setEditing({...m})} style={{ width:26, height:26, borderRadius:7, background:'rgba(139,92,246,0.1)', border:'1px solid var(--border-violet)', color:'var(--primary-violet-light)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}><Edit3 size={12}/></button>
                      <button title="Eliminar" onClick={()=>onDelete(m.id)} style={{ width:26, height:26, borderRadius:7, background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', color:'#F87171', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}><Trash2 size={12}/></button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* View Modal */}
      {viewing && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', backdropFilter:'blur(8px)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }} onClick={()=>setViewing(null)}>
          <div className="glass" style={{ width:'100%', maxWidth:520, borderRadius:'var(--radius-xl)', padding:28, animation:'fadeIn 0.2s ease', maxHeight:'90vh', overflowY:'auto' }} onClick={e=>e.stopPropagation()}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
              <div>
                <div style={{ fontSize:10, letterSpacing:2, color:'var(--text-secondary)', marginBottom:6 }}>DETALLE DE MISIÓN</div>
                <h2 style={{ fontSize:18, fontWeight:700 }}>{viewing.title}</h2>
              </div>
              <button onClick={()=>setViewing(null)} style={{ width:32, height:32, borderRadius:8, background:'rgba(139,92,246,0.1)', border:'1px solid var(--border-violet)', color:'var(--text-secondary)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}><X size={16}/></button>
            </div>

            <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:16 }}>
              <Badge cfg={STATUS_CFG[viewing.status]||STATUS_CFG.active}/>
              <span style={{ padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:600, background:'rgba(139,92,246,0.12)', color:'var(--primary-violet-light)', border:'1px solid var(--border-violet)' }}>{viewing.category}</span>
              <span style={{ fontSize:14, color:(PRIORITY_CFG[viewing.priority]||PRIORITY_CFG[1]).color }}><PriorityStars priority={viewing.priority||1}/></span>
            </div>

            {viewing.description && <p style={{ fontSize:13, color:'var(--text-secondary)', lineHeight:1.7, marginBottom:16 }}>{viewing.description}</p>}

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:16 }}>
              {[
                ['Agente', viewing.assignedTo||'—'],
                ['Deadline', viewing.deadline ? new Date(viewing.deadline).toLocaleDateString('es-AR',{day:'2-digit',month:'long',year:'numeric'}) : '—'],
                ['Aprobada', viewing.approvedAt ? new Date(viewing.approvedAt).toLocaleDateString('es-AR') : '—'],
                ['Rechazada', viewing.rejectedAt ? new Date(viewing.rejectedAt).toLocaleDateString('es-AR') : '—'],
              ].map(([k,v])=>(
                <div key={k} className="glass" style={{ padding:'10px 14px', borderRadius:'var(--radius)' }}>
                  <div style={{ fontSize:10, color:'var(--text-secondary)', marginBottom:3, textTransform:'uppercase', letterSpacing:1 }}>{k}</div>
                  <div style={{ fontWeight:600, fontSize:13 }}>{v}</div>
                </div>
              ))}
            </div>

            {/* Deadline bar */}
            {viewing.deadline && (
              <div style={{ marginBottom:16 }}>
                <label style={{ fontSize:11, color:'var(--text-secondary)', marginBottom:6, display:'block' }}>Progreso hasta deadline</label>
                <DeadlineBar deadline={viewing.deadline} status={viewing.status}/>
              </div>
            )}

            {/* Notes */}
            {viewing.notes && (
              <div style={{ marginBottom:16, padding:14, borderRadius:'var(--radius)', background:'rgba(139,92,246,0.08)', border:'1px solid var(--border-violet)' }}>
                <div style={{ fontSize:11, color:'var(--primary-violet-light)', marginBottom:4, fontWeight:700 }}>📝 NOTA</div>
                <div style={{ fontSize:13, color:'var(--text-secondary)' }}>{viewing.notes}</div>
              </div>
            )}

            <div style={{ display:'flex', gap:10 }}>
              {viewing.status === 'review' && (
                <>
                  <button className="btn" style={{ flex:1, background:'rgba(74,222,128,0.15)', color:'#4ADE80', border:'1px solid rgba(74,222,128,0.3)' }} onClick={()=>{ approve(viewing); setViewing(null) }}><Check size={14}/> Aprobar</button>
                  <button className="btn" style={{ flex:1, background:'rgba(248,113,113,0.15)', color:'#F87171', border:'1px solid rgba(248,113,113,0.3)' }} onClick={()=>{ reject(viewing); setViewing(null) }}><X size={14}/> Rechazar</button>
                </>
              )}
              <button className="btn btn-ghost" style={{ flex:1 }} onClick={()=>{ setEditing({...viewing}); setViewing(null) }}><Edit3 size={14}/> Editar</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit/Create Modal */}
      {editing && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', backdropFilter:'blur(8px)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }} onClick={()=>setEditing(null)}>
          <div className="glass" style={{ width:'100%', maxWidth:580, borderRadius:'var(--radius-xl)', padding:28, maxHeight:'90vh', overflowY:'auto', animation:'fadeIn 0.2s ease' }} onClick={e=>e.stopPropagation()}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
              <h2 style={{ fontSize:18, fontWeight:700 }}>{editing.id ? 'Editar Misión' : 'Nueva Misión'}</h2>
              <button onClick={()=>setEditing(null)} style={{ width:32, height:32, borderRadius:8, background:'rgba(139,92,246,0.1)', border:'1px solid var(--border-violet)', color:'var(--text-secondary)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}><X size={16}/></button>
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              <div>
                <label style={{ fontSize:12, color:'var(--text-secondary)', marginBottom:6, display:'block' }}>Título *</label>
                <input className="input-field" value={editing.title} onChange={e=>setEditing(p=>({...p,title:e.target.value}))} placeholder="Nombre de la misión"/>
              </div>
              <div>
                <label style={{ fontSize:12, color:'var(--text-secondary)', marginBottom:6, display:'block' }}>Descripción</label>
                <textarea className="input-field" value={editing.description} onChange={e=>setEditing(p=>({...p,description:e.target.value}))} placeholder="Descripción detallada..." rows={3} style={{ resize:'vertical' }}/>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
                <div>
                  <label style={{ fontSize:12, color:'var(--text-secondary)', marginBottom:6, display:'block' }}>Categoría</label>
                  <select className="select-field" value={editing.category} onChange={e=>setEditing(p=>({...p,category:e.target.value}))}>
                    {allCats.map(c=><option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize:12, color:'var(--text-secondary)', marginBottom:6, display:'block' }}>Estado</label>
                  <select className="select-field" value={editing.status} onChange={e=>setEditing(p=>({...p,status:e.target.value}))}>
                    {Object.entries(STATUS_CFG).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
              </div>
              {/* Priority */}
              <div>
                <label style={{ fontSize:12, color:'var(--text-secondary)', marginBottom:8, display:'block' }}>Prioridad</label>
                <div style={{ display:'flex', gap:8 }}>
                  {Object.entries(PRIORITY_CFG).map(([k,v])=>(
                    <button key={k} onClick={()=>setEditing(p=>({...p,priority:+k}))}
                      style={{ flex:1, padding:'10px', borderRadius:10, fontSize:12, fontWeight:600, border:`1px solid ${(editing.priority||1)===+k?v.color:'var(--border-violet)'}`, background:(editing.priority||1)===+k?`${v.color}22`:'rgba(139,92,246,0.05)', color:(editing.priority||1)===+k?v.color:'var(--text-secondary)', transition:'all 0.2s', cursor:'pointer' }}>
                      {'★'.repeat(v.stars)}{'☆'.repeat(3-v.stars)}<br/><span style={{ fontSize:10 }}>{v.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
                <div>
                  <label style={{ fontSize:12, color:'var(--text-secondary)', marginBottom:6, display:'block' }}>Asignado a</label>
                  <input className="input-field" value={editing.assignedTo||''} onChange={e=>setEditing(p=>({...p,assignedTo:e.target.value}))} placeholder="Nombre del agente"/>
                  {/* Suggestions */}
                  {allAgents.length > 0 && (
                    <div style={{ display:'flex', gap:4, marginTop:6, flexWrap:'wrap' }}>
                      {allAgents.slice(0,4).map(a=>(
                        <button key={a} onClick={()=>setEditing(p=>({...p,assignedTo:a}))}
                          style={{ padding:'2px 8px', borderRadius:8, fontSize:11, background:'rgba(139,92,246,0.12)', color:'var(--primary-violet-light)', border:'1px solid var(--border-violet)', cursor:'pointer' }}>
                          {a}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label style={{ fontSize:12, color:'var(--text-secondary)', marginBottom:6, display:'block' }}>Deadline *</label>
                  <input className="input-field" type="date" value={editing.deadline} onChange={e=>setEditing(p=>({...p,deadline:e.target.value}))}/>
                </div>
              </div>
              <div>
                <label style={{ fontSize:12, color:'var(--text-secondary)', marginBottom:6, display:'block' }}>Nota</label>
                <textarea className="input-field" value={editing.notes||''} onChange={e=>setEditing(p=>({...p,notes:e.target.value}))} placeholder="Nota interna sobre la misión..." rows={2} style={{ resize:'vertical' }}/>
              </div>
              {/* Add custom category */}
              <div style={{ padding:'12px 16px', borderRadius:12, background:'rgba(139,92,246,0.06)', border:'1px solid var(--border-violet)' }}>
                <label style={{ fontSize:12, color:'var(--text-secondary)', marginBottom:8, display:'block', fontWeight:600 }}>+ Agregar nueva categoría</label>
                <div style={{ display:'flex', gap:8 }}>
                  <input className="input-field" style={{ flex:1 }} value={newCat} onChange={e=>setNewCat(e.target.value)} placeholder="Nueva categoría..." onKeyDown={e=>{if(e.key==='Enter'&&newCat.trim()){setCustomCats(p=>[...p,newCat.trim()]);setNewCat('')}}}/>
                  <button onClick={()=>{if(newCat.trim()){setCustomCats(p=>[...p,newCat.trim()]);setNewCat('')}}} style={{ padding:'9px 14px', borderRadius:10, background:'rgba(139,92,246,0.15)', color:'var(--primary-violet-light)', border:'1px solid var(--border-violet)', cursor:'pointer', fontSize:13, fontWeight:600 }}>Agregar</button>
                </div>
              </div>
            </div>

            <div style={{ display:'flex', gap:12, marginTop:24 }}>
              <button className="btn btn-primary" style={{ flex:1 }} onClick={save}><Check size={16}/> Guardar</button>
              <button className="btn btn-ghost" onClick={()=>setEditing(null)}><X size={16}/> Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
