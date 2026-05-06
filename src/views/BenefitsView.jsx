import React, { useState } from 'react'
import { Gift, Plus, Edit3, Trash2, Search, AlertCircle, Save, X, Percent, Star, Package, CheckCircle } from 'lucide-react'

const generateId = () => `${Date.now()}_${Math.random().toString(36).slice(2,7)}`

const F = ({ label, children, err: e }) => (
  <div>
    <label style={{ fontSize:12,fontWeight:500,color:'var(--text-secondary)',display:'block',marginBottom:5 }}>{label}</label>
    {children}
    {e && <span style={{ fontSize:11,color:'#F87171' }}>{e}</span>}
  </div>
)
const fmtDate = (d) => { if(!d) return '-'; const dt=new Date(d); return `${dt.getDate()}/${dt.getMonth()+1}/${dt.getFullYear()}` }

const TYPE_CFG = {
  discount: { label:'Descuento', color:'#8B5CF6', bg:'rgba(139,92,246,0.15)', icon: Percent,      emoji:'%'  },
  '2x1':    { label:'2x1',       color:'#E879F9', bg:'rgba(232,121,249,0.15)', icon: Star,         emoji:'2×1'},
  freebie:  { label:'Regalo',    color:'#F472B6', bg:'rgba(244,114,182,0.15)', icon: Package,      emoji:'🎁' },
  points:   { label:'Puntos',    color:'#FCD34D', bg:'rgba(252,211,77,0.15)',  icon: CheckCircle,  emoji:'⭐' },
}

const ConfirmDel = ({ name, onConfirm, onClose }) => (
  <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',backdropFilter:'blur(8px)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:20 }}>
    <div style={{ width:'100%',maxWidth:380,background:'var(--bg-secondary)',border:'1px solid rgba(239,68,68,0.3)',borderRadius:16,padding:28,boxShadow:'0 0 30px rgba(239,68,68,0.2)' }}>
      <div style={{ display:'flex',alignItems:'center',gap:12,marginBottom:14 }}><div style={{ width:40,height:40,borderRadius:12,background:'rgba(239,68,68,0.15)',display:'flex',alignItems:'center',justifyContent:'center' }}><AlertCircle size={20} color="#F87171"/></div><h3 style={{ fontSize:15,fontWeight:700 }}>Eliminar Beneficio</h3></div>
      <p style={{ fontSize:13,color:'var(--text-secondary)',lineHeight:1.6,marginBottom:22 }}>¿Confirmas eliminar <strong>{name}</strong>?</p>
      <div style={{ display:'flex',gap:10,justifyContent:'flex-end' }}>
        <button onClick={onClose} style={{ padding:'8px 18px',borderRadius:10,fontSize:13,background:'rgba(139,92,246,0.1)',border:'1px solid var(--border-violet)',color:'var(--primary-violet-light)',cursor:'pointer' }}>Cancelar</button>
        <button onClick={onConfirm} style={{ padding:'8px 18px',borderRadius:10,fontSize:13,background:'rgba(239,68,68,0.15)',border:'1px solid rgba(239,68,68,0.3)',color:'#F87171',cursor:'pointer',display:'flex',alignItems:'center',gap:6 }}><Trash2 size={13}/>Eliminar</button>
      </div>
    </div>
  </div>
)

// ── Benefit Modal ─────────────────────────────────
const EMPTY_BEN = {
  brandId:'', locationIds:[], type:'discount', title:'', description:'',
  value:10, minPurchase:0, validFrom:'', validUntil:'',
  usageLimit:500, usageCount:0, status:'active', terms:''
}

const BenefitModal = ({ benefit, brands, locations, onSave, onClose }) => {
  const [form, setForm] = useState(benefit || EMPTY_BEN)
  const [err,  setErr]  = useState({})

  const set = (k,v) => { setForm(p=>({...p,[k]:v})); setErr(p=>{const n={...p};delete n[k];return n}) }

  const toggleLoc = (lid) => {
    const next = form.locationIds.includes(lid)
      ? form.locationIds.filter(x=>x!==lid)
      : [...form.locationIds, lid]
    set('locationIds', next)
  }

  const validate = () => {
    const e = {}
    if (!form.brandId) e.brandId = 'Requerido'
    if (!form.title.trim()) e.title = 'Requerido'
    setErr(e); return !Object.keys(e).length
  }

  const handleSave = () => {
    if (!validate()) return
    onSave({ ...form, id: benefit?.id || generateId(), createdAt: benefit?.createdAt || new Date().toISOString() })
  }

  const brandLocs = locations.filter(l => l.brandId === form.brandId)

  // F is defined at module level

  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',backdropFilter:'blur(8px)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:20,overflowY:'auto' }}>
      <div style={{ width:'100%',maxWidth:620,background:'var(--bg-secondary)',border:'1px solid var(--border-violet)',borderRadius:20,maxHeight:'90vh',overflowY:'auto',boxShadow:'var(--glow-violet),0 40px 80px rgba(0,0,0,0.5)',animation:'fadeIn 0.3s ease' }}>
        <div style={{ padding:'22px 26px',borderBottom:'1px solid var(--border-violet)',display:'flex',alignItems:'center',gap:12 }}>
          <div style={{ width:40,height:40,borderRadius:12,background:'linear-gradient(135deg,var(--accent-magenta),var(--primary-violet))',display:'flex',alignItems:'center',justifyContent:'center' }}><Gift size={18} color="white"/></div>
          <div><h2 style={{ fontSize:16,fontWeight:700 }}>{benefit?'Editar Beneficio':'Nuevo Beneficio'}</h2><p style={{ fontSize:12,color:'var(--text-secondary)' }}>{benefit?benefit.title:'Completa los datos'}</p></div>
          <button onClick={onClose} style={{ marginLeft:'auto',color:'var(--text-secondary)',padding:6,borderRadius:8,cursor:'pointer' }} onMouseEnter={e=>e.currentTarget.style.color='#F87171'} onMouseLeave={e=>e.currentTarget.style.color='var(--text-secondary)'}><X size={20}/></button>
        </div>

        <div style={{ padding:'22px 26px',display:'flex',flexDirection:'column',gap:16 }}>
          {/* Type selector */}
          <div>
            <label style={{ fontSize:12,fontWeight:500,color:'var(--text-secondary)',display:'block',marginBottom:8 }}>Tipo de Beneficio</label>
            <div style={{ display:'flex',gap:8,flexWrap:'wrap' }}>
              {Object.entries(TYPE_CFG).map(([k,cfg])=>{
                const active=form.type===k
                return (
                  <button key={k} onClick={()=>set('type',k)} style={{
                    padding:'8px 16px',borderRadius:10,fontSize:12,fontWeight:600,cursor:'pointer',transition:'all 0.2s',
                    background:active?cfg.bg:'rgba(139,92,246,0.05)',
                    border:`1px solid ${active?cfg.color+'88':'var(--border-violet)'}`,
                    color:active?cfg.color:'var(--text-secondary)',display:'flex',alignItems:'center',gap:6
                  }}>
                    <span style={{ fontSize:14 }}>{cfg.emoji}</span>{cfg.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:14 }}>
            <F label="Marca *" err={err.brandId}>
              <select className="select-field" value={form.brandId} onChange={e=>{set('brandId',e.target.value);set('locationIds',[])}} style={err.brandId?{borderColor:'#F87171'}:{}}>
                <option value="">Seleccionar marca...</option>
                {brands.map(b=><option key={b.id} value={b.id}>{b.logo} {b.name}</option>)}
              </select>
            </F>
            <F label="Título *" err={err.title}>
              <input className="input-field" value={form.title} onChange={e=>set('title',e.target.value)} placeholder="20% OFF en toda la tienda" style={err.title?{borderColor:'#F87171'}:{}}/>
            </F>
          </div>

          <F label="Descripción">
            <textarea className="input-field" value={form.description} onChange={e=>set('description',e.target.value)} placeholder="Descripción del beneficio..." rows={2} style={{ resize:'vertical' }}/>
          </F>

          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:14 }}>
            <F label={form.type==='discount'?'Descuento (%)':form.type==='points'?'Multiplicador':'Valor ($)'}>
              <input className="input-field" type="number" value={form.value} onChange={e=>set('value',+e.target.value)} placeholder="0"/>
            </F>
            <F label="Compra Mínima ($)">
              <input className="input-field" type="number" value={form.minPurchase} onChange={e=>set('minPurchase',+e.target.value)} placeholder="0"/>
            </F>
            <F label="Límite de Usos">
              <input className="input-field" type="number" value={form.usageLimit} onChange={e=>set('usageLimit',+e.target.value)} placeholder="500"/>
            </F>
            <F label="Vigencia Desde">
              <input className="input-field" type="date" value={form.validFrom} onChange={e=>set('validFrom',e.target.value)}/>
            </F>
            <F label="Vigencia Hasta">
              <input className="input-field" type="date" value={form.validUntil} onChange={e=>set('validUntil',e.target.value)}/>
            </F>
            <F label="Estado">
              <select className="select-field" value={form.status} onChange={e=>set('status',e.target.value)}>
                <option value="active">Activo</option>
                <option value="paused">Pausado</option>
                <option value="expired">Expirado</option>
              </select>
            </F>
          </div>

          {/* Location multi-select */}
          {form.brandId && brandLocs.length > 0 && (
            <div>
              <label style={{ fontSize:12,fontWeight:500,color:'var(--text-secondary)',display:'block',marginBottom:8 }}>Locales asignados</label>
              <div style={{ display:'flex',flexWrap:'wrap',gap:8 }}>
                {brandLocs.map(l=>{
                  const sel=form.locationIds.includes(l.id)
                  return (
                    <button key={l.id} onClick={()=>toggleLoc(l.id)} style={{
                      padding:'6px 12px',borderRadius:8,fontSize:12,cursor:'pointer',transition:'all 0.2s',
                      background:sel?'rgba(139,92,246,0.2)':'rgba(139,92,246,0.05)',
                      border:`1px solid ${sel?'var(--primary-violet)':'var(--border-violet)'}`,
                      color:sel?'var(--primary-violet-light)':'var(--text-secondary)'
                    }}>{l.name}</button>
                  )
                })}
              </div>
            </div>
          )}

          <F label="Términos y Condiciones">
            <input className="input-field" value={form.terms} onChange={e=>set('terms',e.target.value)} placeholder="No acumulable con otras promociones"/>
          </F>
        </div>

        <div style={{ padding:'16px 26px',borderTop:'1px solid var(--border-violet)',display:'flex',gap:10,justifyContent:'flex-end' }}>
          <button onClick={onClose} style={{ padding:'9px 18px',borderRadius:10,fontSize:13,background:'rgba(139,92,246,0.1)',border:'1px solid var(--border-violet)',color:'var(--primary-violet-light)',cursor:'pointer' }}>Cancelar</button>
          <button onClick={handleSave} style={{ padding:'9px 18px',borderRadius:10,fontSize:13,background:'linear-gradient(135deg,var(--primary-violet),var(--primary-violet-dark))',color:'white',cursor:'pointer',display:'flex',alignItems:'center',gap:6,border:'none',boxShadow:'var(--glow-violet-sm)' }}>
            <Save size={14}/>{benefit?'Guardar Cambios':'Crear Beneficio'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Benefit Card ──────────────────────────────────
const BenefitCard = ({ benefit, brand, locations, onEdit, onDelete }) => {
  const cfg     = TYPE_CFG[benefit.type] || TYPE_CFG.discount
  const pct     = benefit.usageLimit > 0 ? Math.min(100, Math.round((benefit.usageCount / benefit.usageLimit) * 100)) : 0
  const benLocs = locations.filter(l => benefit.locationIds?.includes(l.id))

  return (
    <div style={{
      background:'var(--glass-bg)',backdropFilter:'blur(40px)',
      border:'1px solid var(--border-violet)',borderRadius:16,overflow:'hidden',
      transition:'all 0.3s'
    }}
      onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-4px)';e.currentTarget.style.boxShadow='var(--glow-violet)';e.currentTarget.style.borderColor='var(--primary-violet)'}}
      onMouseLeave={e=>{e.currentTarget.style.transform='none';e.currentTarget.style.boxShadow='none';e.currentTarget.style.borderColor='var(--border-violet)'}}
    >
      {/* Colored top bar */}
      <div style={{ height:4,background:`linear-gradient(90deg,${cfg.color},${cfg.color}88)` }}/>
      <div style={{ padding:18 }}>
        <div style={{ display:'flex',alignItems:'flex-start',gap:12,marginBottom:12 }}>
          <div style={{ width:44,height:44,borderRadius:12,background:cfg.bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0 }}>
            {cfg.emoji}
          </div>
          <div style={{ flex:1,minWidth:0 }}>
            <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:4,flexWrap:'wrap' }}>
              <span style={{ fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:10,background:cfg.bg,border:`1px solid ${cfg.color}44`,color:cfg.color }}>{cfg.label}</span>
              <span style={{
                fontSize:10,fontWeight:600,padding:'2px 7px',borderRadius:10,
                background:benefit.status==='active'?'rgba(34,197,94,0.12)':benefit.status==='paused'?'rgba(251,191,36,0.12)':'rgba(239,68,68,0.12)',
                border:`1px solid ${benefit.status==='active'?'rgba(34,197,94,0.3)':benefit.status==='paused'?'rgba(251,191,36,0.3)':'rgba(239,68,68,0.3)'}`,
                color:benefit.status==='active'?'#4ADE80':benefit.status==='paused'?'#FCD34D':'#F87171'
              }}>{benefit.status==='active'?'Activo':benefit.status==='paused'?'Pausado':'Expirado'}</span>
            </div>
            <h3 style={{ fontSize:13,fontWeight:700,lineHeight:1.4,overflow:'hidden',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical' }}>{benefit.title}</h3>
          </div>
          <div style={{ display:'flex',gap:4,flexShrink:0 }}>
            <button onClick={onEdit} style={{ width:28,height:28,borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',color:'var(--primary-violet-light)',border:'1px solid var(--border-violet)',background:'rgba(139,92,246,0.08)',cursor:'pointer',transition:'all 0.2s' }} onMouseEnter={e=>e.currentTarget.style.background='rgba(139,92,246,0.2)'} onMouseLeave={e=>e.currentTarget.style.background='rgba(139,92,246,0.08)'}><Edit3 size={12}/></button>
            <button onClick={onDelete} style={{ width:28,height:28,borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',color:'#F87171',border:'1px solid rgba(239,68,68,0.3)',background:'rgba(239,68,68,0.08)',cursor:'pointer',transition:'all 0.2s' }} onMouseEnter={e=>e.currentTarget.style.background='rgba(239,68,68,0.2)'} onMouseLeave={e=>e.currentTarget.style.background='rgba(239,68,68,0.08)'}><Trash2 size={12}/></button>
          </div>
        </div>

        {/* Value display */}
        <div style={{ textAlign:'center',padding:'10px',borderRadius:10,background:`${cfg.color}11`,border:`1px solid ${cfg.color}33`,marginBottom:12 }}>
          <span style={{ fontSize:22,fontWeight:800,color:cfg.color }}>
            {benefit.type==='discount'?`${benefit.value}% OFF`:benefit.type==='2x1'?'2×1':benefit.type==='freebie'?`$${benefit.value.toLocaleString()} regalo`:`${benefit.value}× puntos`}
          </span>
          {benefit.minPurchase>0&&<div style={{ fontSize:10,color:'var(--text-secondary)',marginTop:2 }}>compra mínima ${benefit.minPurchase.toLocaleString()}</div>}
        </div>

        {/* Usage progress */}
        <div style={{ marginBottom:12 }}>
          <div style={{ display:'flex',justifyContent:'space-between',fontSize:11,color:'var(--text-secondary)',marginBottom:5 }}>
            <span>Usos: {benefit.usageCount.toLocaleString()} / {benefit.usageLimit.toLocaleString()}</span>
            <span style={{ color:pct>90?'#F87171':pct>70?'#FCD34D':'#4ADE80',fontWeight:600 }}>{pct}%</span>
          </div>
          <div style={{ height:6,borderRadius:3,background:'rgba(139,92,246,0.15)',overflow:'hidden' }}>
            <div style={{ height:'100%',width:`${pct}%`,borderRadius:3,background:pct>90?'#F87171':pct>70?'#FCD34D':cfg.color,transition:'width 0.5s ease' }}/>
          </div>
        </div>

        {/* Brand + locations */}
        <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:8,fontSize:11,color:'var(--text-secondary)' }}>
          <span style={{ fontSize:16 }}>{brand?.logo}</span>
          <span>{brand?.name}</span>
          {benLocs.length>0&&<span>· {benLocs.map(l=>l.name).join(', ')}</span>}
        </div>

        {/* Dates */}
        {(benefit.validFrom||benefit.validUntil)&&(
          <div style={{ fontSize:10,color:'var(--text-secondary)',display:'flex',alignItems:'center',gap:4 }}>
            📅 {fmtDate(benefit.validFrom)} → {fmtDate(benefit.validUntil)}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main View ─────────────────────────────────────
export default function BenefitsView({ benefits, brands, locations, onSave, onDelete }) {
  const [search,    setSearch]    = useState('')
  const [fBrand,    setFBrand]    = useState('all')
  const [fType,     setFType]     = useState('all')
  const [fStatus,   setFStatus]   = useState('all')
  const [modal,     setModal]     = useState(null)
  const [delTarget, setDelTarget] = useState(null)

  const filtered = benefits.filter(b => {
    const ms = b.title.toLowerCase().includes(search.toLowerCase())
    return ms && (fBrand==='all'||b.brandId===fBrand) && (fType==='all'||b.type===fType) && (fStatus==='all'||b.status===fStatus)
  })

  const totalUsage = benefits.reduce((s,b)=>s+b.usageCount,0)
  const expiringSoon = benefits.filter(b=>b.status==='active'&&b.validUntil&&new Date(b.validUntil)<new Date(Date.now()+7*86400000)).length

  return (
    <div style={{ padding:24,animation:'fadeIn 0.3s ease' }}>
      <div style={{ display:'flex',alignItems:'center',gap:12,marginBottom:20,flexWrap:'wrap' }}>
        <div>
          <h2 style={{ fontSize:20,fontWeight:700 }}>Beneficios</h2>
          <p style={{ fontSize:12,color:'var(--text-secondary)' }}>{benefits.length} registrados · {benefits.filter(b=>b.status==='active').length} activos</p>
        </div>
        <div style={{ flex:1 }}/>
        <button onClick={()=>setModal('create')} style={{ display:'flex',alignItems:'center',gap:8,padding:'9px 18px',borderRadius:12,fontSize:14,fontWeight:500,background:'linear-gradient(135deg,var(--primary-violet),var(--primary-violet-dark))',color:'white',cursor:'pointer',boxShadow:'var(--glow-violet-sm)',border:'none',transition:'all 0.2s' }} onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow='var(--glow-violet)'}} onMouseLeave={e=>{e.currentTarget.style.transform='none';e.currentTarget.style.boxShadow='var(--glow-violet-sm)'}}>
          <Plus size={16}/> Nuevo Beneficio
        </button>
      </div>

      {/* Summary stats */}
      <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:12,marginBottom:20 }}>
        {[
          { label:'Usos Totales', value:totalUsage.toLocaleString(), color:'var(--primary-violet)' },
          { label:'Descuentos', value:benefits.filter(b=>b.type==='discount').length, color:'#8B5CF6' },
          { label:'2×1', value:benefits.filter(b=>b.type==='2x1').length, color:'#E879F9' },
          { label:'Regalos', value:benefits.filter(b=>b.type==='freebie').length, color:'#F472B6' },
          { label:'Puntos', value:benefits.filter(b=>b.type==='points').length, color:'#FCD34D' },
          { label:'Vencen Pronto', value:expiringSoon, color:'#F87171' },
        ].map(s=>(
          <div key={s.label} style={{ padding:'12px 14px',background:'var(--glass-bg)',border:'1px solid var(--border-violet)',borderRadius:12 }}>
            <div style={{ fontSize:16,fontWeight:800,color:s.color }}>{s.value}</div>
            <div style={{ fontSize:10,color:'var(--text-secondary)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display:'flex',gap:10,marginBottom:20,flexWrap:'wrap' }}>
        <div style={{ position:'relative',flex:1,minWidth:200 }}>
          <Search size={13} style={{ position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'var(--text-secondary)' }}/>
          <input className="input-field" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar beneficios..." style={{ paddingLeft:34 }}/>
        </div>
        <select className="select-field" style={{ width:'auto',minWidth:140 }} value={fBrand} onChange={e=>setFBrand(e.target.value)}>
          <option value="all">Todas las marcas</option>
          {brands.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <select className="select-field" style={{ width:'auto',minWidth:130 }} value={fType} onChange={e=>setFType(e.target.value)}>
          <option value="all">Todos los tipos</option>
          {Object.entries(TYPE_CFG).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
        </select>
        <select className="select-field" style={{ width:'auto',minWidth:120 }} value={fStatus} onChange={e=>setFStatus(e.target.value)}>
          <option value="all">Todos los estados</option>
          <option value="active">Activos</option>
          <option value="paused">Pausados</option>
          <option value="expired">Expirados</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div style={{ display:'flex',flexDirection:'column',alignItems:'center',gap:16,padding:'64px 32px',textAlign:'center' }}>
          <div style={{ width:64,height:64,borderRadius:20,background:'rgba(139,92,246,0.1)',display:'flex',alignItems:'center',justifyContent:'center' }}><Gift size={28} color="var(--primary-violet)"/></div>
          <h3 style={{ fontSize:16,fontWeight:600 }}>No hay beneficios</h3>
          <p style={{ color:'var(--text-secondary)',fontSize:14 }}>{search||fBrand!=='all'||fType!=='all'||fStatus!=='all'?'Sin resultados.':'Crea el primer beneficio.'}</p>
        </div>
      ) : (
        <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:16 }}>
          {filtered.map(b=>(
            <BenefitCard
              key={b.id} benefit={b}
              brand={brands.find(br=>br.id===b.brandId)}
              locations={locations}
              onEdit={()=>setModal(b)}
              onDelete={()=>setDelTarget(b)}
            />
          ))}
        </div>
      )}

      {modal && (
        <BenefitModal
          benefit={modal==='create'?null:modal}
          brands={brands} locations={locations}
          onSave={data=>{onSave(data);setModal(null)}}
          onClose={()=>setModal(null)}
        />
      )}
      {delTarget && (
        <ConfirmDel name={delTarget.title} onConfirm={()=>{onDelete(delTarget.id);setDelTarget(null)}} onClose={()=>setDelTarget(null)}/>
      )}
    </div>
  )
}
