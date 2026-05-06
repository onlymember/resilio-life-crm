import React, { useState } from 'react'
import { QrCode, Plus, Edit3, Trash2, Search, AlertCircle, Save, X, Copy, Check, Zap, RefreshCw } from 'lucide-react'

const generateId  = () => `${Date.now()}_${Math.random().toString(36).slice(2,7)}`
const F = ({ label, children, err: e }) => (
  <div>
    <label style={{ fontSize:12,fontWeight:500,color:'var(--text-secondary)',display:'block',marginBottom:5 }}>{label}</label>
    {children}
    {e && <span style={{ fontSize:11,color:'#F87171' }}>{e}</span>}
  </div>
)
const fmtDate     = (d) => { if(!d) return '-'; const dt=new Date(d); return `${dt.getDate()}/${dt.getMonth()+1}/${String(dt.getFullYear()).slice(2)}` }
const CHARS       = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const randSuffix  = (len=6) => Array.from({length:len},()=>CHARS[Math.floor(Math.random()*CHARS.length)]).join('')

// ── Shared ────────────────────────────────────────
const CopyBtn = ({ text, label }) => {
  const [ok, setOk] = useState(false)
  const go = () => { navigator.clipboard.writeText(text).catch(()=>{}); setOk(true); setTimeout(()=>setOk(false),2000) }
  return (
    <button onClick={go} title="Copiar código" style={{
      display:'flex',alignItems:'center',gap:4,padding:'3px 9px',borderRadius:6,fontSize:10,fontWeight:700,cursor:'pointer',
      background:ok?'rgba(74,222,128,0.15)':'rgba(139,92,246,0.1)',
      border:`1px solid ${ok?'rgba(74,222,128,0.4)':'var(--border-violet)'}`,
      color:ok?'#4ADE80':'var(--primary-violet-light)',transition:'all 0.2s'
    }}>{ok?<Check size={10}/>:<Copy size={10}/>}{ok?'Copiado':(label||'Copiar')}</button>
  )
}

const ConfirmDel = ({ name, onConfirm, onClose }) => (
  <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',backdropFilter:'blur(8px)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:20 }}>
    <div style={{ width:'100%',maxWidth:380,background:'var(--bg-secondary)',border:'1px solid rgba(239,68,68,0.3)',borderRadius:16,padding:28 }}>
      <div style={{ display:'flex',alignItems:'center',gap:12,marginBottom:14 }}><AlertCircle size={20} color="#F87171"/><h3 style={{ fontSize:15,fontWeight:700 }}>Eliminar Código</h3></div>
      <p style={{ fontSize:13,color:'var(--text-secondary)',marginBottom:22 }}>¿Eliminar <strong>{name}</strong>? No se puede deshacer.</p>
      <div style={{ display:'flex',gap:10,justifyContent:'flex-end' }}>
        <button onClick={onClose} style={{ padding:'8px 18px',borderRadius:10,fontSize:13,background:'rgba(139,92,246,0.1)',border:'1px solid var(--border-violet)',color:'var(--primary-violet-light)',cursor:'pointer' }}>Cancelar</button>
        <button onClick={onConfirm} style={{ padding:'8px 18px',borderRadius:10,fontSize:13,background:'rgba(239,68,68,0.15)',border:'1px solid rgba(239,68,68,0.3)',color:'#F87171',cursor:'pointer',display:'flex',alignItems:'center',gap:6 }}><Trash2 size={13}/>Eliminar</button>
      </div>
    </div>
  </div>
)

// ── Code Modal ────────────────────────────────────
const EMPTY_CODE = {
  code:'', benefitId:'', brandId:'', locationId:'', influencerId:'',
  type:'multi_use', usageLimit:50, usageCount:0, status:'active',
  validFrom:'', validUntil:''
}

const CodeModal = ({ code, brands, locations, benefits, influencers, onSave, onClose }) => {
  const [form, setForm] = useState(code || EMPTY_CODE)
  const [err,  setErr]  = useState({})

  const set = (k,v) => { setForm(p=>({...p,[k]:v})); setErr(p=>{const n={...p};delete n[k];return n}) }

  const validate = () => {
    const e = {}
    if (!form.code.trim()) e.code='Requerido'
    if (!form.brandId) e.brandId='Requerido'
    setErr(e); return !Object.keys(e).length
  }

  const handleSave = () => {
    if (!validate()) return
    onSave({ ...form, id: code?.id||generateId(), createdAt: code?.createdAt||new Date().toISOString() })
  }

  const autoCode = () => {
    const brand = brands.find(b=>b.id===form.brandId)
    const prefix = brand ? brand.name.slice(0,4).toUpperCase() : 'CODE'
    set('code', `${prefix}${randSuffix()}`)
  }

  const brandLocs = locations.filter(l => l.brandId === form.brandId)
  const brandBens = benefits.filter(b => b.brandId === form.brandId)

  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',backdropFilter:'blur(8px)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:20,overflowY:'auto' }}>
      <div style={{ width:'100%',maxWidth:580,background:'var(--bg-secondary)',border:'1px solid var(--border-violet)',borderRadius:20,maxHeight:'90vh',overflowY:'auto',boxShadow:'var(--glow-violet),0 40px 80px rgba(0,0,0,0.5)',animation:'fadeIn 0.3s ease' }}>
        <div style={{ padding:'22px 26px',borderBottom:'1px solid var(--border-violet)',display:'flex',alignItems:'center',gap:12 }}>
          <div style={{ width:40,height:40,borderRadius:12,background:'linear-gradient(135deg,var(--secondary-purple),var(--accent-pink))',display:'flex',alignItems:'center',justifyContent:'center' }}><QrCode size={18} color="white"/></div>
          <div><h2 style={{ fontSize:16,fontWeight:700 }}>{code?'Editar Código':'Nuevo Código'}</h2><p style={{ fontSize:12,color:'var(--text-secondary)' }}>{code?code.code:'Ingresa los datos del código'}</p></div>
          <button onClick={onClose} style={{ marginLeft:'auto',color:'var(--text-secondary)',padding:6,borderRadius:8,cursor:'pointer' }} onMouseEnter={e=>e.currentTarget.style.color='#F87171'} onMouseLeave={e=>e.currentTarget.style.color='var(--text-secondary)'}><X size={20}/></button>
        </div>

        <div style={{ padding:'22px 26px',display:'flex',flexDirection:'column',gap:16 }}>
          <div style={{ display:'grid',gridTemplateColumns:'1fr auto',gap:10,alignItems:'end' }}>
            <F label="Código *" err={err.code}>
              <input className="input-field" value={form.code} onChange={e=>set('code',e.target.value.toUpperCase())} placeholder="NIKEABC123" style={{ fontFamily:'JetBrains Mono,monospace',letterSpacing:2,...(err.code?{borderColor:'#F87171'}:{}) }}/>
            </F>
            <button onClick={autoCode} title="Auto-generar" style={{ padding:'10px 14px',borderRadius:10,background:'rgba(139,92,246,0.1)',border:'1px solid var(--border-violet)',color:'var(--primary-violet-light)',cursor:'pointer',display:'flex',alignItems:'center',gap:6,fontSize:12,marginBottom:err.code?16:0 }}>
              <RefreshCw size={13}/> Auto
            </button>
          </div>

          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:14 }}>
            <F label="Marca *" err={err.brandId}>
              <select className="select-field" value={form.brandId} onChange={e=>{set('brandId',e.target.value);set('locationId','');set('benefitId','')}} style={err.brandId?{borderColor:'#F87171'}:{}}>
                <option value="">Seleccionar...</option>
                {brands.map(b=><option key={b.id} value={b.id}>{b.logo} {b.name}</option>)}
              </select>
            </F>
            <F label="Beneficio">
              <select className="select-field" value={form.benefitId} onChange={e=>set('benefitId',e.target.value)}>
                <option value="">Sin beneficio</option>
                {brandBens.map(b=><option key={b.id} value={b.id}>{b.title}</option>)}
              </select>
            </F>
            <F label="Local">
              <select className="select-field" value={form.locationId} onChange={e=>set('locationId',e.target.value)}>
                <option value="">Sin local específico</option>
                {brandLocs.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </F>
            <F label="Influencer">
              <select className="select-field" value={form.influencerId||''} onChange={e=>set('influencerId',e.target.value||null)}>
                <option value="">Sin influencer</option>
                {influencers.map(i=><option key={i.id} value={i.id}>{i.name}</option>)}
              </select>
            </F>
            <F label="Tipo">
              <select className="select-field" value={form.type} onChange={e=>set('type',e.target.value)}>
                <option value="unique">Único (1 uso)</option>
                <option value="multi_use">Multi-uso</option>
              </select>
            </F>
            {form.type==='multi_use' && (
              <F label="Límite de Usos">
                <input className="input-field" type="number" value={form.usageLimit} onChange={e=>set('usageLimit',+e.target.value)} min={1}/>
              </F>
            )}
            <F label="Válido Desde">
              <input className="input-field" type="date" value={form.validFrom} onChange={e=>set('validFrom',e.target.value)}/>
            </F>
            <F label="Válido Hasta">
              <input className="input-field" type="date" value={form.validUntil} onChange={e=>set('validUntil',e.target.value)}/>
            </F>
          </div>

          <F label="Estado">
            <div style={{ display:'flex',gap:8 }}>
              {['active','depleted','expired'].map(s=>(
                <button key={s} onClick={()=>set('status',s)} style={{ padding:'7px 16px',borderRadius:10,fontSize:12,cursor:'pointer',transition:'all 0.2s',background:form.status===s?'rgba(139,92,246,0.2)':'rgba(139,92,246,0.05)',border:`1px solid ${form.status===s?'var(--primary-violet)':'var(--border-violet)'}`,color:form.status===s?'var(--primary-violet-light)':'var(--text-secondary)' }}>{{active:'Activo',depleted:'Agotado',expired:'Expirado'}[s]}</button>
              ))}
            </div>
          </F>
        </div>

        <div style={{ padding:'16px 26px',borderTop:'1px solid var(--border-violet)',display:'flex',gap:10,justifyContent:'flex-end' }}>
          <button onClick={onClose} style={{ padding:'9px 18px',borderRadius:10,fontSize:13,background:'rgba(139,92,246,0.1)',border:'1px solid var(--border-violet)',color:'var(--primary-violet-light)',cursor:'pointer' }}>Cancelar</button>
          <button onClick={handleSave} style={{ padding:'9px 18px',borderRadius:10,fontSize:13,background:'linear-gradient(135deg,var(--primary-violet),var(--primary-violet-dark))',color:'white',cursor:'pointer',display:'flex',alignItems:'center',gap:6,border:'none',boxShadow:'var(--glow-violet-sm)' }}>
            <Save size={14}/>{code?'Guardar Cambios':'Crear Código'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Bulk Code Generator ───────────────────────────
const BulkModal = ({ brands, locations, benefits, influencers, existingCodes, onGenerate, onClose }) => {
  const [form,    setForm]    = useState({ brandId:'', benefitId:'', locationId:'', influencerId:'', prefix:'', count:50, type:'unique', usageLimit:1 })
  const [preview, setPreview] = useState([])
  const [toast,   setToast]   = useState('')

  const set = (k,v) => setForm(p=>({...p,[k]:v}))

  const doPreview = () => {
    const pfx = form.prefix || 'CODE'
    const ex  = new Set(existingCodes.map(c=>c.code))
    const samples = []
    let tries = 0
    while (samples.length < Math.min(5, form.count) && tries < 200) {
      const c = `${pfx.toUpperCase()}${randSuffix()}`
      if (!ex.has(c)) { ex.add(c); samples.push(c) }
      tries++
    }
    setPreview(samples)
  }

  const doGenerate = () => {
    if (!form.brandId) return
    const pfx = form.prefix || 'CODE'
    const ex  = new Set(existingCodes.map(c=>c.code))
    const newCodes = []
    let tries = 0

    while (newCodes.length < form.count && tries < form.count * 20) {
      tries++
      const c = `${pfx.toUpperCase()}${randSuffix()}`
      if (!ex.has(c)) {
        ex.add(c)
        newCodes.push({
          id:          `code_${Date.now()}_${newCodes.length}`,
          code:        c,
          benefitId:   form.benefitId   || null,
          brandId:     form.brandId,
          locationId:  form.locationId  || null,
          influencerId:form.influencerId|| null,
          type:        form.type,
          usageLimit:  form.type==='unique' ? 1 : form.usageLimit,
          usageCount:  0,
          status:      'active',
          validFrom:   new Date().toISOString().split('T')[0],
          validUntil:  new Date(Date.now()+30*86400000).toISOString().split('T')[0],
          createdAt:   new Date().toISOString()
        })
      }
    }

    onGenerate(newCodes)
    setToast(`✓ ${newCodes.length} códigos generados exitosamente`)
    setTimeout(()=>{ setToast(''); onClose() }, 1800)
  }

  const brandLocs = locations.filter(l=>l.brandId===form.brandId)
  const brandBens = benefits.filter(b=>b.brandId===form.brandId)

  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',backdropFilter:'blur(8px)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:20 }}>
      <div style={{ width:'100%',maxWidth:560,background:'var(--bg-secondary)',border:'1px solid var(--border-violet)',borderRadius:20,maxHeight:'90vh',overflowY:'auto',boxShadow:'var(--glow-violet),0 40px 80px rgba(0,0,0,0.5)',animation:'fadeIn 0.3s ease' }}>
        <div style={{ padding:'22px 26px',borderBottom:'1px solid var(--border-violet)',display:'flex',alignItems:'center',gap:12 }}>
          <div style={{ width:40,height:40,borderRadius:12,background:'linear-gradient(135deg,#E879F9,#8B5CF6)',display:'flex',alignItems:'center',justifyContent:'center' }}><Zap size={18} color="white"/></div>
          <div><h2 style={{ fontSize:16,fontWeight:700 }}>Generador Masivo de Códigos</h2><p style={{ fontSize:12,color:'var(--text-secondary)' }}>Crea múltiples códigos únicos en segundos</p></div>
          <button onClick={onClose} style={{ marginLeft:'auto',color:'var(--text-secondary)',padding:6,borderRadius:8,cursor:'pointer' }}><X size={20}/></button>
        </div>

        {toast && (
          <div style={{ margin:'16px 26px 0',padding:'12px 16px',borderRadius:10,background:'rgba(74,222,128,0.15)',border:'1px solid rgba(74,222,128,0.4)',color:'#4ADE80',fontSize:13,fontWeight:600 }}>{toast}</div>
        )}

        <div style={{ padding:'22px 26px',display:'flex',flexDirection:'column',gap:16 }}>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:14 }}>
            <div>
              <label style={{ fontSize:12,fontWeight:500,color:'var(--text-secondary)',display:'block',marginBottom:5 }}>Marca *</label>
              <select className="select-field" value={form.brandId} onChange={e=>{set('brandId',e.target.value);set('locationId','');set('benefitId','');const b=brands.find(br=>br.id===e.target.value);if(b)set('prefix',b.name.slice(0,5).toUpperCase())}}>
                <option value="">Seleccionar marca...</option>
                {brands.map(b=><option key={b.id} value={b.id}>{b.logo} {b.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize:12,fontWeight:500,color:'var(--text-secondary)',display:'block',marginBottom:5 }}>Prefijo del código</label>
              <input className="input-field" value={form.prefix} onChange={e=>set('prefix',e.target.value.toUpperCase())} placeholder="NIKE20" style={{ fontFamily:'JetBrains Mono,monospace',letterSpacing:2 }}/>
            </div>
            <div>
              <label style={{ fontSize:12,fontWeight:500,color:'var(--text-secondary)',display:'block',marginBottom:5 }}>Beneficio asociado</label>
              <select className="select-field" value={form.benefitId} onChange={e=>set('benefitId',e.target.value)}>
                <option value="">Sin beneficio</option>
                {brandBens.map(b=><option key={b.id} value={b.id}>{b.title}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize:12,fontWeight:500,color:'var(--text-secondary)',display:'block',marginBottom:5 }}>Local (opcional)</label>
              <select className="select-field" value={form.locationId} onChange={e=>set('locationId',e.target.value)}>
                <option value="">Todos los locales</option>
                {brandLocs.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize:12,fontWeight:500,color:'var(--text-secondary)',display:'block',marginBottom:5 }}>Influencer (opcional)</label>
              <select className="select-field" value={form.influencerId||''} onChange={e=>set('influencerId',e.target.value||null)}>
                <option value="">Sin influencer</option>
                {influencers.map(i=><option key={i.id} value={i.id}>{i.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize:12,fontWeight:500,color:'var(--text-secondary)',display:'block',marginBottom:5 }}>Tipo</label>
              <select className="select-field" value={form.type} onChange={e=>set('type',e.target.value)}>
                <option value="unique">Único (1 uso por código)</option>
                <option value="multi_use">Multi-uso</option>
              </select>
            </div>
          </div>

          {/* Count slider */}
          <div>
            <label style={{ fontSize:12,fontWeight:500,color:'var(--text-secondary)',display:'flex',justifyContent:'space-between',marginBottom:8 }}>
              <span>Cantidad de códigos</span>
              <span style={{ color:'var(--primary-violet-light)',fontWeight:700 }}>{form.count}</span>
            </label>
            <input type="range" min={1} max={500} value={form.count} onChange={e=>set('count',+e.target.value)} style={{ width:'100%',accentColor:'var(--primary-violet)',cursor:'pointer' }}/>
            <div style={{ display:'flex',justifyContent:'space-between',fontSize:10,color:'var(--text-secondary)',marginTop:4 }}>
              <span>1</span><span>100</span><span>250</span><span>500</span>
            </div>
          </div>

          {/* Preview */}
          <div>
            <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8 }}>
              <label style={{ fontSize:12,fontWeight:500,color:'var(--text-secondary)' }}>Vista previa (5 ejemplos)</label>
              <button onClick={doPreview} style={{ fontSize:11,padding:'4px 10px',borderRadius:6,background:'rgba(139,92,246,0.1)',border:'1px solid var(--border-violet)',color:'var(--primary-violet-light)',cursor:'pointer',display:'flex',alignItems:'center',gap:4 }}>
                <RefreshCw size={10}/> Generar preview
              </button>
            </div>
            {preview.length>0 ? (
              <div style={{ padding:'12px 14px',borderRadius:10,background:'rgba(139,92,246,0.06)',border:'1px solid var(--border-violet)',display:'flex',flexWrap:'wrap',gap:8 }}>
                {preview.map((c,i)=>(
                  <code key={i} style={{ fontSize:12,fontWeight:700,color:'var(--primary-violet-light)',letterSpacing:1,padding:'3px 10px',background:'rgba(139,92,246,0.1)',borderRadius:6,border:'1px solid var(--border-violet)' }}>{c}</code>
                ))}
                <span style={{ fontSize:11,color:'var(--text-secondary)',alignSelf:'center' }}>+ {Math.max(0,form.count-5)} más...</span>
              </div>
            ) : (
              <div style={{ padding:'12px 14px',borderRadius:10,background:'rgba(139,92,246,0.04)',border:'1px dashed var(--border-violet)',fontSize:12,color:'var(--text-secondary)',textAlign:'center' }}>
                Haz clic en "Generar preview" para ver ejemplos
              </div>
            )}
          </div>
        </div>

        <div style={{ padding:'16px 26px',borderTop:'1px solid var(--border-violet)',display:'flex',gap:10,justifyContent:'flex-end',alignItems:'center' }}>
          <span style={{ fontSize:12,color:'var(--text-secondary)',marginRight:'auto' }}>Se crearán <strong style={{ color:'var(--primary-violet-light)' }}>{form.count}</strong> códigos únicos</span>
          <button onClick={onClose} style={{ padding:'9px 18px',borderRadius:10,fontSize:13,background:'rgba(139,92,246,0.1)',border:'1px solid var(--border-violet)',color:'var(--primary-violet-light)',cursor:'pointer' }}>Cancelar</button>
          <button onClick={doGenerate} disabled={!form.brandId} style={{ padding:'9px 18px',borderRadius:10,fontSize:13,background:form.brandId?'linear-gradient(135deg,#E879F9,var(--primary-violet))':'rgba(139,92,246,0.1)',color:form.brandId?'white':'var(--text-secondary)',cursor:form.brandId?'pointer':'not-allowed',display:'flex',alignItems:'center',gap:6,border:'none',boxShadow:form.brandId?'0 0 15px rgba(232,121,249,0.4)':'none',transition:'all 0.2s' }}>
            <Zap size={14}/> Generar {form.count} Códigos
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Code Row ──────────────────────────────────────
const STATUS_CFG = {
  active:   { label:'Activo',  color:'#4ADE80', bg:'rgba(34,197,94,0.12)',  border:'rgba(34,197,94,0.3)'  },
  depleted: { label:'Agotado', color:'#F87171', bg:'rgba(239,68,68,0.12)',  border:'rgba(239,68,68,0.3)'  },
  expired:  { label:'Expirado',color:'#9CA3AF', bg:'rgba(156,163,175,0.12)',border:'rgba(156,163,175,0.3)' },
}

const CodeRow = ({ code, brand, location, influencer, benefit, onEdit, onDelete }) => {
  const st   = STATUS_CFG[code.status] || STATUS_CFG.active
  const used = code.type==='unique' ? code.usageCount : code.usageCount
  const lim  = code.type==='unique' ? 1 : code.usageLimit
  const pct  = lim>0 ? Math.min(100,Math.round(used/lim*100)) : 0

  return (
    <div style={{
      display:'flex',alignItems:'center',gap:12,padding:'12px 16px',
      background:'var(--glass-bg)',border:'1px solid var(--border-violet)',borderRadius:12,
      transition:'all 0.2s',flexWrap:'wrap'
    }}
      onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--primary-violet)';e.currentTarget.style.background='rgba(29,16,61,0.85)'}}
      onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--border-violet)';e.currentTarget.style.background='var(--glass-bg)'}}
    >
      {/* Code */}
      <div style={{ minWidth:150,display:'flex',alignItems:'center',gap:8 }}>
        <code style={{ fontSize:12,fontWeight:700,color:'var(--primary-violet-light)',letterSpacing:1,fontFamily:'JetBrains Mono,monospace' }}>{code.code}</code>
        <CopyBtn text={code.code}/>
      </div>

      {/* Brand + location */}
      <div style={{ flex:1,minWidth:120 }}>
        <div style={{ fontSize:12,fontWeight:600,display:'flex',alignItems:'center',gap:6 }}>
          <span style={{ fontSize:16 }}>{brand?.logo}</span>{brand?.name}
        </div>
        {location && <div style={{ fontSize:10,color:'var(--text-secondary)' }}>{location.name}</div>}
      </div>

      {/* Influencer */}
      <div style={{ minWidth:100,fontSize:11,color:'var(--text-secondary)' }}>
        {influencer ? <span style={{ color:'var(--primary-violet-light)' }}>{influencer.username}</span> : '—'}
      </div>

      {/* Type */}
      <span style={{ fontSize:10,fontWeight:600,padding:'2px 8px',borderRadius:8,background:'rgba(139,92,246,0.1)',border:'1px solid var(--border-violet)',color:'var(--text-secondary)',whiteSpace:'nowrap' }}>
        {code.type==='unique'?'Único':'Multi-uso'}
      </span>

      {/* Usage */}
      <div style={{ minWidth:80,textAlign:'center' }}>
        <div style={{ fontSize:12,fontWeight:600 }}>{used}<span style={{ color:'var(--text-secondary)' }}>/{lim}</span></div>
        <div style={{ height:3,borderRadius:2,background:'rgba(139,92,246,0.15)',marginTop:3,overflow:'hidden' }}>
          <div style={{ height:'100%',width:`${pct}%`,background:pct>90?'#F87171':'var(--primary-violet)',borderRadius:2 }}/>
        </div>
      </div>

      {/* Status */}
      <span style={{ fontSize:10,fontWeight:600,padding:'2px 8px',borderRadius:8,background:st.bg,border:`1px solid ${st.border}`,color:st.color,whiteSpace:'nowrap' }}>{st.label}</span>

      {/* Dates */}
      <div style={{ fontSize:10,color:'var(--text-secondary)',whiteSpace:'nowrap' }}>
        {fmtDate(code.validFrom)} → {fmtDate(code.validUntil)}
      </div>

      {/* Actions */}
      <div style={{ display:'flex',gap:4,flexShrink:0 }}>
        <button onClick={onEdit} style={{ width:28,height:28,borderRadius:7,display:'flex',alignItems:'center',justifyContent:'center',color:'var(--primary-violet-light)',border:'1px solid var(--border-violet)',background:'rgba(139,92,246,0.08)',cursor:'pointer',transition:'all 0.2s' }} onMouseEnter={e=>e.currentTarget.style.background='rgba(139,92,246,0.2)'} onMouseLeave={e=>e.currentTarget.style.background='rgba(139,92,246,0.08)'}><Edit3 size={12}/></button>
        <button onClick={onDelete} style={{ width:28,height:28,borderRadius:7,display:'flex',alignItems:'center',justifyContent:'center',color:'#F87171',border:'1px solid rgba(239,68,68,0.3)',background:'rgba(239,68,68,0.08)',cursor:'pointer',transition:'all 0.2s' }} onMouseEnter={e=>e.currentTarget.style.background='rgba(239,68,68,0.2)'} onMouseLeave={e=>e.currentTarget.style.background='rgba(239,68,68,0.08)'}><Trash2 size={12}/></button>
      </div>
    </div>
  )
}

// ── Main View ─────────────────────────────────────
export default function CodesView({ codes, brands, locations, benefits, influencers, onSave, onDelete, onBulkGenerate }) {
  const [search,     setSearch]     = useState('')
  const [fBrand,     setFBrand]     = useState('all')
  const [fInfluencer,setFInfluencer]= useState('all')
  const [fStatus,    setFStatus]    = useState('all')
  const [fType,      setFType]      = useState('all')
  const [modal,      setModal]      = useState(null)
  const [bulkOpen,   setBulkOpen]   = useState(false)
  const [delTarget,  setDelTarget]  = useState(null)
  const [bulkToast,  setBulkToast]  = useState('')

  const filtered = codes.filter(c => {
    const q = search.toLowerCase()
    const ms = c.code.toLowerCase().includes(q) || (brands.find(b=>b.id===c.brandId)?.name||'').toLowerCase().includes(q)
    return ms && (fBrand==='all'||c.brandId===fBrand) && (fInfluencer==='all'||c.influencerId===fInfluencer) && (fStatus==='all'||c.status===fStatus) && (fType==='all'||c.type===fType)
  })

  const activeCodes   = codes.filter(c=>c.status==='active').length
  const depletedCodes = codes.filter(c=>c.status==='depleted').length
  const totalUsage    = codes.reduce((s,c)=>s+c.usageCount,0)

  const handleBulkGenerate = (newCodes) => {
    onBulkGenerate(newCodes)
    setBulkToast(`✓ ${newCodes.length} códigos generados exitosamente`)
    setTimeout(()=>setBulkToast(''),3000)
  }

  return (
    <div style={{ padding:24,animation:'fadeIn 0.3s ease' }}>
      <div style={{ display:'flex',alignItems:'center',gap:12,marginBottom:20,flexWrap:'wrap' }}>
        <div>
          <h2 style={{ fontSize:20,fontWeight:700 }}>Códigos</h2>
          <p style={{ fontSize:12,color:'var(--text-secondary)' }}>{codes.length} registrados · {activeCodes} activos</p>
        </div>
        <div style={{ flex:1 }}/>
        <button onClick={()=>setBulkOpen(true)} style={{ display:'flex',alignItems:'center',gap:8,padding:'9px 18px',borderRadius:12,fontSize:13,fontWeight:600,background:'rgba(232,121,249,0.15)',border:'1px solid rgba(232,121,249,0.4)',color:'#E879F9',cursor:'pointer',transition:'all 0.2s' }} onMouseEnter={e=>{e.currentTarget.style.background='rgba(232,121,249,0.25)';e.currentTarget.style.boxShadow='0 0 15px rgba(232,121,249,0.3)'}} onMouseLeave={e=>{e.currentTarget.style.background='rgba(232,121,249,0.15)';e.currentTarget.style.boxShadow='none'}}>
          <Zap size={15}/> Generar Masivo
        </button>
        <button onClick={()=>setModal('create')} style={{ display:'flex',alignItems:'center',gap:8,padding:'9px 18px',borderRadius:12,fontSize:14,fontWeight:500,background:'linear-gradient(135deg,var(--primary-violet),var(--primary-violet-dark))',color:'white',cursor:'pointer',boxShadow:'var(--glow-violet-sm)',border:'none',transition:'all 0.2s' }} onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow='var(--glow-violet)'}} onMouseLeave={e=>{e.currentTarget.style.transform='none';e.currentTarget.style.boxShadow='var(--glow-violet-sm)'}}>
          <Plus size={16}/> Nuevo Código
        </button>
      </div>

      {bulkToast && (
        <div style={{ marginBottom:16,padding:'12px 18px',borderRadius:12,background:'rgba(74,222,128,0.12)',border:'1px solid rgba(74,222,128,0.3)',color:'#4ADE80',fontSize:13,fontWeight:600 }}>{bulkToast}</div>
      )}

      {/* Stats */}
      <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))',gap:12,marginBottom:20 }}>
        {[
          { label:'Total', value:codes.length, color:'var(--primary-violet)' },
          { label:'Activos', value:activeCodes, color:'#4ADE80' },
          { label:'Agotados', value:depletedCodes, color:'#F87171' },
          { label:'Usos Totales', value:totalUsage.toLocaleString(), color:'#E879F9' },
          { label:'Únicos', value:codes.filter(c=>c.type==='unique').length, color:'var(--primary-violet-light)' },
          { label:'Multi-uso', value:codes.filter(c=>c.type==='multi_use').length, color:'#FCD34D' },
        ].map(s=>(
          <div key={s.label} style={{ padding:'12px 14px',background:'var(--glass-bg)',border:'1px solid var(--border-violet)',borderRadius:12 }}>
            <div style={{ fontSize:16,fontWeight:800,color:s.color }}>{s.value}</div>
            <div style={{ fontSize:10,color:'var(--text-secondary)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display:'flex',gap:10,marginBottom:20,flexWrap:'wrap' }}>
        <div style={{ position:'relative',flex:1,minWidth:180 }}>
          <Search size={13} style={{ position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'var(--text-secondary)' }}/>
          <input className="input-field" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar código o marca..." style={{ paddingLeft:34 }}/>
        </div>
        <select className="select-field" style={{ width:'auto',minWidth:130 }} value={fBrand} onChange={e=>setFBrand(e.target.value)}>
          <option value="all">Todas las marcas</option>
          {brands.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <select className="select-field" style={{ width:'auto',minWidth:130 }} value={fInfluencer} onChange={e=>setFInfluencer(e.target.value)}>
          <option value="all">Todos los influencers</option>
          {influencers.map(i=><option key={i.id} value={i.id}>{i.name}</option>)}
        </select>
        <select className="select-field" style={{ width:'auto',minWidth:120 }} value={fType} onChange={e=>setFType(e.target.value)}>
          <option value="all">Todos los tipos</option>
          <option value="unique">Únicos</option>
          <option value="multi_use">Multi-uso</option>
        </select>
        <select className="select-field" style={{ width:'auto',minWidth:110 }} value={fStatus} onChange={e=>setFStatus(e.target.value)}>
          <option value="all">Todos</option>
          <option value="active">Activos</option>
          <option value="depleted">Agotados</option>
          <option value="expired">Expirados</option>
        </select>
      </div>

      {/* List */}
      {filtered.length===0 ? (
        <div style={{ display:'flex',flexDirection:'column',alignItems:'center',gap:16,padding:'64px 32px',textAlign:'center' }}>
          <div style={{ width:64,height:64,borderRadius:20,background:'rgba(139,92,246,0.1)',display:'flex',alignItems:'center',justifyContent:'center' }}><QrCode size={28} color="var(--primary-violet)"/></div>
          <h3 style={{ fontSize:16,fontWeight:600 }}>No hay códigos</h3>
          <p style={{ color:'var(--text-secondary)',fontSize:14 }}>{search||fBrand!=='all'||fStatus!=='all'?'Sin resultados.':'Crea tu primer código o usa el generador masivo.'}</p>
        </div>
      ) : (
        <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
          {filtered.map(c=>(
            <CodeRow
              key={c.id} code={c}
              brand={brands.find(b=>b.id===c.brandId)}
              location={locations.find(l=>l.id===c.locationId)}
              influencer={influencers.find(i=>i.id===c.influencerId)}
              benefit={benefits.find(b=>b.id===c.benefitId)}
              onEdit={()=>setModal(c)}
              onDelete={()=>setDelTarget(c)}
            />
          ))}
        </div>
      )}

      {modal && (
        <CodeModal
          code={modal==='create'?null:modal}
          brands={brands} locations={locations} benefits={benefits} influencers={influencers}
          onSave={data=>{onSave(data);setModal(null)}}
          onClose={()=>setModal(null)}
        />
      )}
      {bulkOpen && (
        <BulkModal
          brands={brands} locations={locations} benefits={benefits} influencers={influencers}
          existingCodes={codes}
          onGenerate={handleBulkGenerate}
          onClose={()=>setBulkOpen(false)}
        />
      )}
      {delTarget && (
        <ConfirmDel name={delTarget.code} onConfirm={()=>{onDelete(delTarget.id);setDelTarget(null)}} onClose={()=>setDelTarget(null)}/>
      )}
    </div>
  )
}
