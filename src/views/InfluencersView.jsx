import React, { useState } from 'react'
import {
  Users, Plus, Edit3, Trash2, Search, Crown, Star, Copy, Check,
  Instagram, Phone, Mail, TrendingUp, AlertCircle, Save, X, RefreshCw
} from 'lucide-react'

const generateId = () => `${Date.now()}_${Math.random().toString(36).slice(2,7)}`
const F = ({ label, children, err: e }) => (
  <div>
    <label style={{ fontSize:12,fontWeight:500,color:'var(--text-secondary)',display:'block',marginBottom:5 }}>{label}</label>
    {children}
    {e && <span style={{ fontSize:11,color:'#F87171' }}>{e}</span>}
  </div>
)
const formatMoney = (n) => n >= 1000000 ? `$${(n/1000000).toFixed(1)}M` : n >= 1000 ? `$${(n/1000).toFixed(0)}K` : `$${n}`
const formatNum   = (n) => n >= 1000000 ? `${(n/1000000).toFixed(1)}M` : n >= 1000 ? `${(n/1000).toFixed(0)}K` : String(n)

const TIER_CFG = {
  1: { label: 'Elite',    color: '#FCD34D', bg: 'rgba(252,211,77,0.15)',  border: 'rgba(252,211,77,0.4)',  icon: Crown },
  2: { label: 'Pro',      color: '#9CA3AF', bg: 'rgba(156,163,175,0.15)', border: 'rgba(156,163,175,0.4)', icon: Star  },
  3: { label: 'Standard', color: '#CD7F32', bg: 'rgba(205,127,50,0.15)',  border: 'rgba(205,127,50,0.4)',  icon: Star  },
  4: { label: 'Entry',    color: '#8B5CF6', bg: 'rgba(139,92,246,0.15)', border: 'rgba(139,92,246,0.4)',  icon: Star  },
}
const CONTRACT_LABELS = {
  per_post: 'Por Post', monthly: 'Mensual', campaign: 'Campaña',
  revenue_share: 'Rev. Share', hybrid: 'Híbrido'
}
const CATEGORIES = ['Lifestyle','Fitness','Running','Fashion Sports','Sports Tech','Active Lifestyle','Nutrición','Wellness']

// ── Copy Button ───────────────────────────────────
const CopyBtn = ({ text }) => {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text).catch(() => {})
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={copy} style={{
      display: 'flex', alignItems: 'center', gap: 4, padding: '2px 8px',
      borderRadius: 6, fontSize: 10, fontWeight: 600,
      background: copied ? 'rgba(74,222,128,0.15)' : 'rgba(139,92,246,0.1)',
      border: `1px solid ${copied ? 'rgba(74,222,128,0.4)' : 'var(--border-violet)'}`,
      color: copied ? '#4ADE80' : 'var(--primary-violet-light)', cursor: 'pointer', transition: 'all 0.2s'
    }}>
      {copied ? <Check size={10} /> : <Copy size={10} />}
      {copied ? 'Copiado' : 'Copiar'}
    </button>
  )
}

// ── Confirm Modal ─────────────────────────────────
const ConfirmDel = ({ name, onConfirm, onClose }) => (
  <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',backdropFilter:'blur(8px)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:20 }}>
    <div style={{ width:'100%',maxWidth:380,background:'var(--bg-secondary)',border:'1px solid rgba(239,68,68,0.3)',borderRadius:16,padding:28,boxShadow:'0 0 30px rgba(239,68,68,0.2)' }}>
      <div style={{ display:'flex',alignItems:'center',gap:12,marginBottom:14 }}>
        <div style={{ width:40,height:40,borderRadius:12,background:'rgba(239,68,68,0.15)',display:'flex',alignItems:'center',justifyContent:'center' }}><AlertCircle size={20} color="#F87171"/></div>
        <h3 style={{ fontSize:15,fontWeight:700 }}>Eliminar Influencer</h3>
      </div>
      <p style={{ fontSize:13,color:'var(--text-secondary)',lineHeight:1.6,marginBottom:22 }}>¿Confirmas eliminar <strong>{name}</strong>? Esta acción no se puede deshacer.</p>
      <div style={{ display:'flex',gap:10,justifyContent:'flex-end' }}>
        <button onClick={onClose} style={{ padding:'8px 18px',borderRadius:10,fontSize:13,background:'rgba(139,92,246,0.1)',border:'1px solid var(--border-violet)',color:'var(--primary-violet-light)',cursor:'pointer' }}>Cancelar</button>
        <button onClick={onConfirm} style={{ padding:'8px 18px',borderRadius:10,fontSize:13,background:'rgba(239,68,68,0.15)',border:'1px solid rgba(239,68,68,0.3)',color:'#F87171',cursor:'pointer',display:'flex',alignItems:'center',gap:6 }}><Trash2 size={13}/>Eliminar</button>
      </div>
    </div>
  </div>
)

// ── Influencer Modal (Create / Edit) ──────────────
const EMPTY = {
  name:'', username:'', email:'', phone:'', instagram:'',
  followers: 10000, category:'Lifestyle', tier:3,
  uniLink:'', contractType:'per_post', rate:0, status:'active',
  referrals:{ total:0, converted:0, conversionRate:0 },
  stats:{ totalReach:0, engagement:0, codesUsed:0, revenueGenerated:0 }
}

const InfluencerModal = ({ inf, onSave, onClose }) => {
  const [form, setForm] = useState(inf || EMPTY)
  const [err, setErr] = useState({})

  const set = (k, v) => { setForm(p => ({...p,[k]:v})); setErr(p => {const n={...p};delete n[k];return n}) }

  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Requerido'
    if (!form.username.trim()) e.username = 'Requerido'
    if (!form.uniLink.trim()) e.uniLink = 'Requerido'
    setErr(e); return !Object.keys(e).length
  }

  const handleSave = () => {
    if (!validate()) return
    onSave({ ...form, id: inf?.id || generateId(), createdAt: inf?.createdAt || new Date().toISOString() })
  }

  const autoUniLink = () => {
    const base = form.name.split(' ')[0].toUpperCase() || 'INF'
    set('uniLink', `${base}${new Date().getFullYear()}`)
  }

  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',backdropFilter:'blur(8px)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:20,overflowY:'auto' }}>
      <div style={{ width:'100%',maxWidth:640,background:'var(--bg-secondary)',border:'1px solid var(--border-violet)',borderRadius:20,maxHeight:'90vh',overflowY:'auto',boxShadow:'var(--glow-violet),0 40px 80px rgba(0,0,0,0.5)',animation:'fadeIn 0.3s ease' }}>
        {/* Header */}
        <div style={{ padding:'22px 26px',borderBottom:'1px solid var(--border-violet)',display:'flex',alignItems:'center',gap:12 }}>
          <div style={{ width:40,height:40,borderRadius:12,background:'linear-gradient(135deg,var(--primary-violet),var(--accent-magenta))',display:'flex',alignItems:'center',justifyContent:'center' }}>
            <Users size={18} color="white"/>
          </div>
          <div>
            <h2 style={{ fontSize:16,fontWeight:700 }}>{inf ? 'Editar Influencer' : 'Nuevo Influencer'}</h2>
            <p style={{ fontSize:12,color:'var(--text-secondary)' }}>{inf ? inf.name : 'Completa los datos del influencer'}</p>
          </div>
          <button onClick={onClose} style={{ marginLeft:'auto',color:'var(--text-secondary)',padding:6,borderRadius:8,cursor:'pointer' }} onMouseEnter={e=>e.currentTarget.style.color='#F87171'} onMouseLeave={e=>e.currentTarget.style.color='var(--text-secondary)'}><X size={20}/></button>
        </div>

        {/* Body */}
        <div style={{ padding:'22px 26px',display:'flex',flexDirection:'column',gap:16 }}>
          {/* Tier selector */}
          <div>
            <label style={{ fontSize:12,fontWeight:500,color:'var(--text-secondary)',display:'block',marginBottom:8 }}>Tier</label>
            <div style={{ display:'flex',gap:8,flexWrap:'wrap' }}>
              {[1,2,3,4].map(t => {
                const cfg = TIER_CFG[t]
                const active = form.tier === t
                return (
                  <button key={t} onClick={() => set('tier',t)} style={{
                    padding:'7px 14px',borderRadius:10,fontSize:12,fontWeight:600,cursor:'pointer',transition:'all 0.2s',
                    background: active ? cfg.bg : 'rgba(139,92,246,0.05)',
                    border: `1px solid ${active ? cfg.border : 'var(--border-violet)'}`,
                    color: active ? cfg.color : 'var(--text-secondary)'
                  }}>Tier {t} — {cfg.label}</button>
                )
              })}
            </div>
          </div>

          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:14 }}>
            <F label="Nombre *" err={err.name}><input className="input-field" value={form.name} onChange={e=>set('name',e.target.value)} placeholder="María González" style={err.name?{borderColor:'#F87171'}:{}}/></F>
            <F label="Usuario *" err={err.username}><input className="input-field" value={form.username} onChange={e=>set('username',e.target.value)} placeholder="@usuario" style={err.username?{borderColor:'#F87171'}:{}} /></F>
            <F label="Email"><input className="input-field" type="email" value={form.email} onChange={e=>set('email',e.target.value)} placeholder="email@dominio.com"/></F>
            <F label="Teléfono"><input className="input-field" value={form.phone} onChange={e=>set('phone',e.target.value)} placeholder="+54 9 11 1234-5678"/></F>
            <F label="Instagram"><input className="input-field" value={form.instagram} onChange={e=>set('instagram',e.target.value)} placeholder="@instagram"/></F>
            <F label="Seguidores"><input className="input-field" type="number" value={form.followers} onChange={e=>set('followers',+e.target.value)} placeholder="10000"/></F>
            <F label="Categoría">
              <select className="select-field" value={form.category} onChange={e=>set('category',e.target.value)}>
                {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            </F>
            <F label="Tipo de Contrato">
              <select className="select-field" value={form.contractType} onChange={e=>set('contractType',e.target.value)}>
                {Object.entries(CONTRACT_LABELS).map(([v,l])=><option key={v} value={v}>{l}</option>)}
              </select>
            </F>
            <F label={`UniLink * ${form.contractType==='revenue_share'?'':'— código único de referido'}`} err={err.uniLink}>
              <div style={{ display:'flex',gap:8 }}>
                <input className="input-field" value={form.uniLink} onChange={e=>set('uniLink',e.target.value.toUpperCase())} placeholder="MARIA2024" style={err.uniLink?{borderColor:'#F87171'}:{}} />
                <button onClick={autoUniLink} title="Auto-generar" style={{ padding:'0 12px',borderRadius:10,background:'rgba(139,92,246,0.1)',border:'1px solid var(--border-violet)',color:'var(--primary-violet-light)',cursor:'pointer',flexShrink:0 }}><RefreshCw size={14}/></button>
              </div>
            </F>
            <F label={`Tarifa ${form.contractType==='revenue_share'?'(% del revenue)':'($)'}`}>
              <input className="input-field" type="number" value={form.rate} onChange={e=>set('rate',+e.target.value)} placeholder="0"/>
            </F>
          </div>

          {/* Status */}
          <div>
            <label style={{ fontSize:12,fontWeight:500,color:'var(--text-secondary)',display:'block',marginBottom:8 }}>Estado</label>
            <div style={{ display:'flex',gap:8 }}>
              {['active','paused','inactive'].map(s=>(
                <button key={s} onClick={()=>set('status',s)} style={{
                  padding:'7px 16px',borderRadius:10,fontSize:12,fontWeight:500,cursor:'pointer',transition:'all 0.2s',
                  background:form.status===s?'rgba(139,92,246,0.2)':'rgba(139,92,246,0.05)',
                  border:`1px solid ${form.status===s?'var(--primary-violet)':'var(--border-violet)'}`,
                  color:form.status===s?'var(--primary-violet-light)':'var(--text-secondary)'
                }}>{{active:'Activo',paused:'Pausado',inactive:'Inactivo'}[s]}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding:'16px 26px',borderTop:'1px solid var(--border-violet)',display:'flex',gap:10,justifyContent:'flex-end' }}>
          <button onClick={onClose} style={{ padding:'9px 18px',borderRadius:10,fontSize:13,background:'rgba(139,92,246,0.1)',border:'1px solid var(--border-violet)',color:'var(--primary-violet-light)',cursor:'pointer' }}>Cancelar</button>
          <button onClick={handleSave} style={{ padding:'9px 18px',borderRadius:10,fontSize:13,background:'linear-gradient(135deg,var(--primary-violet),var(--primary-violet-dark))',color:'white',cursor:'pointer',display:'flex',alignItems:'center',gap:6,boxShadow:'var(--glow-violet-sm)' }}>
            <Save size={14}/> {inf ? 'Guardar Cambios' : 'Crear Influencer'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Influencer Card ───────────────────────────────
const InfluencerCard = ({ inf, onEdit, onDelete }) => {
  const tier = TIER_CFG[inf.tier] || TIER_CFG[4]
  const TierIcon = tier.icon

  return (
    <div style={{
      background:'var(--glass-bg)',backdropFilter:'blur(40px)',
      border:'1px solid var(--border-violet)',borderRadius:16,padding:20,
      transition:'all 0.3s',display:'flex',flexDirection:'column',gap:14
    }}
      onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-4px)';e.currentTarget.style.boxShadow='var(--glow-violet)';e.currentTarget.style.borderColor='var(--primary-violet)'}}
      onMouseLeave={e=>{e.currentTarget.style.transform='none';e.currentTarget.style.boxShadow='none';e.currentTarget.style.borderColor='var(--border-violet)'}}
    >
      {/* Header */}
      <div style={{ display:'flex',alignItems:'flex-start',gap:12 }}>
        <div style={{
          width:52,height:52,borderRadius:'50%',flexShrink:0,
          background:'linear-gradient(135deg,var(--primary-violet),var(--accent-magenta))',
          display:'flex',alignItems:'center',justifyContent:'center',
          fontSize:20,fontWeight:800,color:'white',boxShadow:'var(--glow-violet-sm)'
        }}>{inf.name.charAt(0)}</div>
        <div style={{ flex:1,minWidth:0 }}>
          <div style={{ fontSize:14,fontWeight:700,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{inf.name}</div>
          <div style={{ fontSize:11,color:'var(--text-secondary)' }}>{inf.username}</div>
          <div style={{ display:'flex',gap:6,marginTop:4,flexWrap:'wrap' }}>
            <span style={{ fontSize:10,fontWeight:600,padding:'2px 7px',borderRadius:10,background:tier.bg,border:`1px solid ${tier.border}`,color:tier.color,display:'flex',alignItems:'center',gap:3 }}>
              <TierIcon size={9}/> Tier {inf.tier} {tier.label}
            </span>
            <span style={{ fontSize:10,padding:'2px 7px',borderRadius:10,background:'rgba(139,92,246,0.1)',border:'1px solid var(--border-violet)',color:'var(--text-secondary)' }}>
              {inf.category}
            </span>
            <span style={{
              fontSize:10,padding:'2px 7px',borderRadius:10,
              background: inf.status==='active'?'rgba(34,197,94,0.12)':inf.status==='paused'?'rgba(251,191,36,0.12)':'rgba(239,68,68,0.12)',
              border: `1px solid ${inf.status==='active'?'rgba(34,197,94,0.3)':inf.status==='paused'?'rgba(251,191,36,0.3)':'rgba(239,68,68,0.3)'}`,
              color: inf.status==='active'?'#4ADE80':inf.status==='paused'?'#FCD34D':'#F87171',
              fontWeight:600
            }}>{{active:'Activo',paused:'Pausado',inactive:'Inactivo'}[inf.status]}</span>
          </div>
        </div>
        <div style={{ display:'flex',gap:4,flexShrink:0 }}>
          <button onClick={onEdit} style={{ width:28,height:28,borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',color:'var(--primary-violet-light)',border:'1px solid var(--border-violet)',background:'rgba(139,92,246,0.08)',cursor:'pointer',transition:'all 0.2s' }} onMouseEnter={e=>e.currentTarget.style.background='rgba(139,92,246,0.2)'} onMouseLeave={e=>e.currentTarget.style.background='rgba(139,92,246,0.08)'}><Edit3 size={12}/></button>
          <button onClick={onDelete} style={{ width:28,height:28,borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',color:'#F87171',border:'1px solid rgba(239,68,68,0.3)',background:'rgba(239,68,68,0.08)',cursor:'pointer',transition:'all 0.2s' }} onMouseEnter={e=>e.currentTarget.style.background='rgba(239,68,68,0.2)'} onMouseLeave={e=>e.currentTarget.style.background='rgba(239,68,68,0.08)'}><Trash2 size={12}/></button>
        </div>
      </div>

      {/* Followers + UniLink */}
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 14px',borderRadius:10,background:'rgba(139,92,246,0.07)',border:'1px solid rgba(139,92,246,0.12)' }}>
        <div style={{ display:'flex',alignItems:'center',gap:6 }}>
          <Instagram size={13} color="var(--accent-magenta)"/>
          <span style={{ fontSize:13,fontWeight:700,color:'var(--primary-violet-light)' }}>{formatNum(inf.followers)}</span>
          <span style={{ fontSize:10,color:'var(--text-secondary)' }}>seguidores · {inf.stats.engagement}% eng.</span>
        </div>
      </div>

      <div style={{ display:'flex',alignItems:'center',gap:8,padding:'8px 12px',borderRadius:10,background:'rgba(232,121,249,0.07)',border:'1px solid rgba(232,121,249,0.2)' }}>
        <span style={{ fontSize:11,color:'var(--text-secondary)',flexShrink:0 }}>UniLink:</span>
        <code style={{ fontSize:12,fontWeight:700,color:'#E879F9',letterSpacing:1,flex:1 }}>{inf.uniLink}</code>
        <CopyBtn text={inf.uniLink}/>
      </div>

      {/* Stats */}
      <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8 }}>
        {[
          { label:'Referidos', value:inf.referrals.total, color:'var(--primary-violet-light)' },
          { label:'Conversión', value:`${inf.referrals.conversionRate}%`, color:'#4ADE80' },
          { label:'Revenue', value:formatMoney(inf.stats.revenueGenerated), color:'#FCD34D' },
        ].map(s=>(
          <div key={s.label} style={{ textAlign:'center',padding:'8px 4px',borderRadius:10,background:'rgba(139,92,246,0.07)',border:'1px solid rgba(139,92,246,0.1)' }}>
            <div style={{ fontSize:13,fontWeight:700,color:s.color }}>{s.value}</div>
            <div style={{ fontSize:9,color:'var(--text-secondary)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Contract */}
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',fontSize:11,color:'var(--text-secondary)' }}>
        <div style={{ display:'flex',alignItems:'center',gap:6 }}>
          <TrendingUp size={11} color="var(--primary-violet-light)"/>
          {CONTRACT_LABELS[inf.contractType] || inf.contractType}
        </div>
        {inf.rate > 0 && <span style={{ fontSize:12,fontWeight:600,color:'var(--text-primary)' }}>{inf.contractType==='revenue_share' ? `${inf.rate}%` : formatMoney(inf.rate)}</span>}
      </div>
    </div>
  )
}

// ── Main View ─────────────────────────────────────
export default function InfluencersView({ influencers, onSave, onDelete }) {
  const [search,    setSearch]    = useState('')
  const [fTier,     setFTier]     = useState('all')
  const [fCat,      setFCat]      = useState('all')
  const [fStatus,   setFStatus]   = useState('all')
  const [modal,     setModal]     = useState(null)
  const [delTarget, setDelTarget] = useState(null)

  const cats = [...new Set(influencers.map(i=>i.category))]

  const filtered = influencers.filter(i => {
    const q = search.toLowerCase()
    const ms = i.name.toLowerCase().includes(q) || i.username.toLowerCase().includes(q) || i.uniLink.toLowerCase().includes(q)
    return ms && (fTier==='all'||String(i.tier)===fTier) && (fCat==='all'||i.category===fCat) && (fStatus==='all'||i.status===fStatus)
  })

  const totalReach   = influencers.reduce((s,i)=>s+i.stats.totalReach,0)
  const totalRevenue = influencers.reduce((s,i)=>s+i.stats.revenueGenerated,0)

  return (
    <div style={{ padding:24, animation:'fadeIn 0.3s ease' }}>
      {/* Header */}
      <div style={{ display:'flex',alignItems:'center',gap:12,marginBottom:20,flexWrap:'wrap' }}>
        <div>
          <h2 style={{ fontSize:20,fontWeight:700 }}>Influencers</h2>
          <p style={{ fontSize:12,color:'var(--text-secondary)' }}>{influencers.length} registrados · {influencers.filter(i=>i.status==='active').length} activos</p>
        </div>
        <div style={{ flex:1 }}/>
        <button onClick={()=>setModal('create')} style={{ display:'flex',alignItems:'center',gap:8,padding:'9px 18px',borderRadius:12,fontSize:14,fontWeight:500,background:'linear-gradient(135deg,var(--primary-violet),var(--primary-violet-dark))',color:'white',cursor:'pointer',boxShadow:'var(--glow-violet-sm)',border:'none',transition:'all 0.2s' }} onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow='var(--glow-violet)'}} onMouseLeave={e=>{e.currentTarget.style.transform='none';e.currentTarget.style.boxShadow='var(--glow-violet-sm)'}}>
          <Plus size={16}/> Nuevo Influencer
        </button>
      </div>

      {/* Quick stats */}
      <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:12,marginBottom:20 }}>
        {[
          { label:'Alcance Total', value: totalReach>=1000000?`${(totalReach/1000000).toFixed(1)}M`:`${(totalReach/1000).toFixed(0)}K`, color:'#8B5CF6' },
          { label:'Revenue Total', value: formatMoney(totalRevenue), color:'#FCD34D' },
          { label:'Tier 1 (Elite)', value: influencers.filter(i=>i.tier===1).length, color:'#FCD34D' },
          { label:'Tier 2 (Pro)',   value: influencers.filter(i=>i.tier===2).length, color:'#9CA3AF' },
        ].map(s=>(
          <div key={s.label} style={{ padding:'12px 16px',background:'var(--glass-bg)',border:'1px solid var(--border-violet)',borderRadius:12,display:'flex',alignItems:'center',gap:10 }}>
            <Users size={16} color={s.color}/>
            <div>
              <div style={{ fontSize:16,fontWeight:800,color:s.color }}>{s.value}</div>
              <div style={{ fontSize:10,color:'var(--text-secondary)' }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display:'flex',gap:10,marginBottom:20,flexWrap:'wrap' }}>
        <div style={{ position:'relative',flex:1,minWidth:200 }}>
          <Search size={13} style={{ position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'var(--text-secondary)' }}/>
          <input className="input-field" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar por nombre, usuario, UniLink..." style={{ paddingLeft:34 }}/>
        </div>
        <select className="select-field" style={{ width:'auto',minWidth:120 }} value={fTier} onChange={e=>setFTier(e.target.value)}>
          <option value="all">Todos los tiers</option>
          {[1,2,3,4].map(t=><option key={t} value={String(t)}>Tier {t} — {TIER_CFG[t].label}</option>)}
        </select>
        <select className="select-field" style={{ width:'auto',minWidth:130 }} value={fCat} onChange={e=>setFCat(e.target.value)}>
          <option value="all">Todas las categorías</option>
          {cats.map(c=><option key={c} value={c}>{c}</option>)}
        </select>
        <select className="select-field" style={{ width:'auto',minWidth:120 }} value={fStatus} onChange={e=>setFStatus(e.target.value)}>
          <option value="all">Todos los estados</option>
          <option value="active">Activos</option>
          <option value="paused">Pausados</option>
          <option value="inactive">Inactivos</option>
        </select>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div style={{ display:'flex',flexDirection:'column',alignItems:'center',gap:16,padding:'64px 32px',textAlign:'center' }}>
          <div style={{ width:64,height:64,borderRadius:20,background:'rgba(139,92,246,0.1)',display:'flex',alignItems:'center',justifyContent:'center' }}><Users size={28} color="var(--primary-violet)"/></div>
          <h3 style={{ fontSize:16,fontWeight:600 }}>No hay influencers</h3>
          <p style={{ color:'var(--text-secondary)',fontSize:14 }}>
            {search||fTier!=='all'||fCat!=='all'||fStatus!=='all' ? 'Sin resultados para los filtros aplicados.' : 'Crea tu primer influencer para comenzar.'}
          </p>
        </div>
      ) : (
        <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(290px,1fr))',gap:16 }}>
          {filtered.map(inf=>(
            <InfluencerCard key={inf.id} inf={inf} onEdit={()=>setModal(inf)} onDelete={()=>setDelTarget(inf)}/>
          ))}
        </div>
      )}

      {modal && (
        <InfluencerModal
          inf={modal==='create'?null:modal}
          onSave={data=>{onSave(data);setModal(null)}}
          onClose={()=>setModal(null)}
        />
      )}
      {delTarget && (
        <ConfirmDel
          name={delTarget.name}
          onConfirm={()=>{onDelete(delTarget.id);setDelTarget(null)}}
          onClose={()=>setDelTarget(null)}
        />
      )}
    </div>
  )
}
