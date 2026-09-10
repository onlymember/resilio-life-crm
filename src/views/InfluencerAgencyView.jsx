import React, { useState, useMemo, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import {
  Plus, Edit3, Trash2, X, Save, Search, Users, TrendingUp, DollarSign,
  Star, Eye, Heart, CheckCircle, Clock, Award, Upload, Download,
  Instagram, Globe, ChevronDown, BarChart3, Zap, Trophy, Shield, MapPin, Phone, Bell
} from 'lucide-react'

const fmtMoney = (n) => n >= 1000000 ? `$${(n/1000000).toFixed(1)}M` : n >= 1000 ? `$${(n/1000).toFixed(0)}K` : `$${n}`
const fmtNum   = (n) => n >= 1000000 ? `${(n/1000000).toFixed(1)}M` : n >= 1000 ? `${(n/1000).toFixed(0)}K` : `${n}`
const fmtDate  = (d) => { if (!d) return '—'; const p = d.split('-'); return `${p[2]}/${p[1]}/${p[0].slice(2)}` }
const generateId = () => `${Date.now()}_${Math.random().toString(36).slice(2,7)}`
const F = ({ label, children }) => (
  <div>
    <label style={{ fontSize:12,fontWeight:500,color:'var(--text-secondary)',display:'block',marginBottom:6 }}>{label}</label>
    {children}
  </div>
)

const CAMP_STATUS = {
  planning:  { label: 'Planificando', color: '#A78BFA', bg: 'rgba(167,139,250,0.15)' },
  active:    { label: 'Activa',       color: '#4ADE80', bg: 'rgba(74,222,128,0.15)'  },
  completed: { label: 'Completada',   color: '#9CA3AF', bg: 'rgba(156,163,175,0.12)' },
  paused:    { label: 'Pausada',      color: '#FCD34D', bg: 'rgba(252,211,77,0.12)'  },
  cancelled: { label: 'Cancelada',    color: '#F87171', bg: 'rgba(239,68,68,0.12)'   },
}

// ─── Brand Quick Add Modal ─────────────────────────
const BrandQuickModal = ({ onSave, onClose }) => {
  const [form, setForm] = useState({ name: '', logo: '🏢', category: 'Moda', contactPerson: '', email: '' })
  const set = (f, v) => setForm(p => ({ ...p, [f]: v }))
  const cats = ['Moda', 'Deportes', 'Belleza', 'Tecnología', 'Alimentos', 'Entretenimiento', 'Otro']
  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.8)',backdropFilter:'blur(8px)',zIndex:1100,display:'flex',alignItems:'center',justifyContent:'center',padding:20 }} onClick={onClose}>
      <div style={{ width:'100%',maxWidth:460,background:'var(--bg-secondary)',border:'1px solid var(--border-violet)',borderRadius:20,padding:28,boxShadow:'var(--glow-violet),0 40px 80px rgba(0,0,0,0.5)',animation:'fadeIn 0.3s ease' }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20 }}>
          <h3 style={{ fontSize:16,fontWeight:700 }}>Agregar Marca Rápida</h3>
          <button onClick={onClose} style={{ color:'var(--text-secondary)',padding:4 }}><X size={18}/></button>
        </div>
        <div style={{ display:'flex',flexDirection:'column',gap:14 }}>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
            <div><label style={{ fontSize:12,color:'var(--text-secondary)',display:'block',marginBottom:6 }}>Nombre *</label><input className="input-field" value={form.name} onChange={e=>set('name',e.target.value)} placeholder="Nike"/></div>
            <div><label style={{ fontSize:12,color:'var(--text-secondary)',display:'block',marginBottom:6 }}>Categoría</label><select className="select-field" value={form.category} onChange={e=>set('category',e.target.value)}>{cats.map(c=><option key={c}>{c}</option>)}</select></div>
          </div>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
            <div><label style={{ fontSize:12,color:'var(--text-secondary)',display:'block',marginBottom:6 }}>Contacto</label><input className="input-field" value={form.contactPerson} onChange={e=>set('contactPerson',e.target.value)} placeholder="Nombre"/></div>
            <div><label style={{ fontSize:12,color:'var(--text-secondary)',display:'block',marginBottom:6 }}>Email</label><input className="input-field" type="email" value={form.email} onChange={e=>set('email',e.target.value)} placeholder="email@marca.com"/></div>
          </div>
        </div>
        <div style={{ display:'flex',gap:10,justifyContent:'flex-end',marginTop:20 }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={()=>{ if(!form.name.trim())return; onSave({...form,id:generateId(),status:'active',contractType:'standard',createdAt:new Date().toISOString()}); }}><Save size={14}/>Crear y Asignar</button>
        </div>
      </div>
    </div>
  )
}

// ─── Influencer Quick Add Modal ────────────────────
const InfluencerQuickModal = ({ onSave, onClose }) => {
  const [form, setForm] = useState({ name: '', instagram: '', tiktok:'', whatsapp:'', ciudad:'', pais:'Argentina', grupo:'', followers: 0, category: 'Lifestyle', rate: 0, contractType: 'per_post' })
  const set = (f, v) => setForm(p => ({ ...p, [f]: v }))
  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.8)',backdropFilter:'blur(8px)',zIndex:1100,display:'flex',alignItems:'center',justifyContent:'center',padding:20 }} onClick={onClose}>
      <div style={{ width:'100%',maxWidth:520,background:'var(--bg-secondary)',border:'1px solid var(--border-violet)',borderRadius:20,padding:28,maxHeight:'90vh',overflowY:'auto',boxShadow:'var(--glow-violet),0 40px 80px rgba(0,0,0,0.5)',animation:'fadeIn 0.3s ease' }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20 }}>
          <h3 style={{ fontSize:16,fontWeight:700 }}>Agregar Influencer</h3>
          <button onClick={onClose} style={{ color:'var(--text-secondary)',padding:4 }}><X size={18}/></button>
        </div>
        <div style={{ display:'flex',flexDirection:'column',gap:12 }}>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
            <div><label style={{ fontSize:12,color:'var(--text-secondary)',display:'block',marginBottom:6 }}>Nombre *</label><input className="input-field" value={form.name} onChange={e=>set('name',e.target.value)} placeholder="María González"/></div>
            <div><label style={{ fontSize:12,color:'var(--text-secondary)',display:'block',marginBottom:6 }}>Instagram</label><input className="input-field" value={form.instagram} onChange={e=>set('instagram',e.target.value)} placeholder="@usuario"/></div>
          </div>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
            <div><label style={{ fontSize:12,color:'var(--text-secondary)',display:'block',marginBottom:6 }}>TikTok</label><input className="input-field" value={form.tiktok} onChange={e=>set('tiktok',e.target.value)} placeholder="@usuario"/></div>
            <div><label style={{ fontSize:12,color:'var(--text-secondary)',display:'block',marginBottom:6 }}>WhatsApp</label><input className="input-field" value={form.whatsapp} onChange={e=>set('whatsapp',e.target.value)} placeholder="+54 11 1234-5678"/></div>
          </div>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
            <div><label style={{ fontSize:12,color:'var(--text-secondary)',display:'block',marginBottom:6 }}>Ciudad</label><input className="input-field" value={form.ciudad} onChange={e=>set('ciudad',e.target.value)} placeholder="Buenos Aires"/></div>
            <div><label style={{ fontSize:12,color:'var(--text-secondary)',display:'block',marginBottom:6 }}>País</label><input className="input-field" value={form.pais} onChange={e=>set('pais',e.target.value)} placeholder="Argentina"/></div>
          </div>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
            <div><label style={{ fontSize:12,color:'var(--text-secondary)',display:'block',marginBottom:6 }}>Seguidores</label><input className="input-field" type="number" value={form.followers} onChange={e=>set('followers',+e.target.value)}/></div>
            <div><label style={{ fontSize:12,color:'var(--text-secondary)',display:'block',marginBottom:6 }}>Categoría</label><select className="select-field" value={form.category} onChange={e=>set('category',e.target.value)}>{['Lifestyle','Fitness','Moda','Belleza','Gaming','Viajes','Gastronomía'].map(c=><option key={c}>{c}</option>)}</select></div>
          </div>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
            <div><label style={{ fontSize:12,color:'var(--text-secondary)',display:'block',marginBottom:6 }}>Tarifa</label><input className="input-field" type="number" value={form.rate} onChange={e=>set('rate',+e.target.value)} placeholder="18000"/></div>
            <div><label style={{ fontSize:12,color:'var(--text-secondary)',display:'block',marginBottom:6 }}>Tipo contrato</label><select className="select-field" value={form.contractType} onChange={e=>set('contractType',e.target.value)}>{['per_post','monthly','campaign','revenue_share'].map(c=><option key={c}>{c}</option>)}</select></div>
          </div>
          <div><label style={{ fontSize:12,color:'var(--text-secondary)',display:'block',marginBottom:6 }}>Grupo</label><input className="input-field" value={form.grupo} onChange={e=>set('grupo',e.target.value)} placeholder="Ej: Grupo A, VIP..."/></div>
        </div>
        <div style={{ display:'flex',gap:10,justifyContent:'flex-end',marginTop:20 }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={()=>{ if(!form.name.trim())return; onSave({...form,id:generateId(),status:'active',tier:2,stats:{totalReach:form.followers*4,engagement:4.5,codesUsed:0,revenueGenerated:0},createdAt:new Date().toISOString()}); }}><Save size={14}/>Agregar</button>
        </div>
      </div>
    </div>
  )
}

// ─── Campaign Modal (full) ─────────────────────────

const CI_STATUS = ['proposed','confirmed','in_progress','completed','cancelled']

const CampaignModal = ({
  campaign, brands, influencers,
  onSave, onClose, onAddBrand,
  onGetCampaignInfluencers, onCIAdd, onCIUpdate, onCIRemove, onPatchCampaignInfluencers,
}) => {
  const [form, setForm] = useState(campaign || {
    brandId: '', name: '', description: '', budget: 0, agencyPct: 20, influencerPct: 80,
    status: 'planning', startDate: '', endDate: '', notes: '', currency: 'ARS',
  })
  const [brandSearch, setBrandSearch]   = useState('')
  const [infSearch,   setInfSearch]     = useState('')
  const [showBrandAdd, setShowBrandAdd] = useState(false)
  const [ciRows,  setCiRows]  = useState([])   // { influencerId, rate, currency, deliverables, status }
  const [origIds, setOrigIds] = useState(new Set())
  const [saving,  setSaving]  = useState(false)
  const [saveErr, setSaveErr] = useState(null)
  const [loadingCi, setLoadingCi] = useState(false)

  const set = (f, v) => setForm(p => ({ ...p, [f]: v }))

  // Load existing influencers when editing
  useEffect(() => {
    if (campaign?.id && onGetCampaignInfluencers) {
      setLoadingCi(true)
      onGetCampaignInfluencers(campaign.id)
        .then(rows => {
          setCiRows(rows.map(r => ({
            influencerId: r.influencerId,
            rate:         r.rate ?? '',
            currency:     r.currency || campaign.currency || 'ARS',
            deliverables: Array.isArray(r.deliverables) ? r.deliverables.join(', ') : '',
            status:       r.status || 'proposed',
          })))
          setOrigIds(new Set(rows.map(r => r.influencerId)))
        })
        .catch(() => {})
        .finally(() => setLoadingCi(false))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaign?.id])

  const agencyEarning = Math.round((form.budget || 0) * ((form.agencyPct || 20) / 100))
  const infPayment    = Math.round((form.budget || 0) * ((form.influencerPct || 80) / 100))

  const filteredBrands = brands.filter(b => b.name.toLowerCase().includes(brandSearch.toLowerCase()))
  const availableInfs  = influencers.filter(i =>
    !ciRows.some(r => r.influencerId === i.id) &&
    i.name.toLowerCase().includes(infSearch.toLowerCase())
  )

  const addInfluencer = (inf) => {
    setCiRows(prev => [...prev, {
      influencerId: inf.id,
      rate:         '',
      currency:     form.currency || 'ARS',
      deliverables: '',
      status:       'proposed',
    }])
    setInfSearch('')
  }

  const updateCiRow = (infId, field, value) => {
    setCiRows(prev => prev.map(r => r.influencerId === infId ? { ...r, [field]: value } : r))
  }

  const removeFromList = (infId) => {
    setCiRows(prev => prev.filter(r => r.influencerId !== infId))
  }

  const handleSave = async () => {
    if (!form.name.trim()) { setSaveErr('El nombre de la campaña es obligatorio'); return }
    setSaving(true)
    setSaveErr(null)
    try {
      const brand = brands.find(b => b.id === form.brandId)
      // influencerIds: null → dbSaveCampaign no toca campaign_influencers
      const saved = await onSave({
        ...form,
        brandName:     brand?.name || '',
        id:            campaign?.id || null,
        influencerIds: null,
      })

      const campaignId = saved?.id
      if (!campaignId) throw new Error('No se pudo obtener el ID de la campaña guardada.')

      const currentIds = new Set(ciRows.map(r => r.influencerId))

      // Remove influencers no longer in list
      for (const oldId of origIds) {
        if (!currentIds.has(oldId) && onCIRemove) {
          await onCIRemove(campaignId, oldId)
        }
      }

      // Add new / update existing
      for (const ci of ciRows) {
        const fields = {
          rate:         ci.rate !== '' ? Number(ci.rate) : null,
          currency:     ci.currency || null,
          deliverables: ci.deliverables
            ? ci.deliverables.split(',').map(s => s.trim()).filter(Boolean)
            : [],
          status: ci.status || 'proposed',
        }
        if (origIds.has(ci.influencerId)) {
          if (onCIUpdate) await onCIUpdate(campaignId, ci.influencerId, fields)
        } else {
          if (onCIAdd) await onCIAdd(campaignId, ci.influencerId, fields)
        }
      }

      // Patch local campaign state with final influencerIds
      if (onPatchCampaignInfluencers) {
        onPatchCampaignInfluencers(campaignId, ciRows.map(r => r.influencerId))
      }

      onClose()
    } catch (e) {
      setSaveErr(e.message || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
<>
      {showBrandAdd && <BrandQuickModal onSave={b => { onAddBrand && onAddBrand(b); set('brandId', b.id); setShowBrandAdd(false) }} onClose={() => setShowBrandAdd(false)} />}
      <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',backdropFilter:'blur(8px)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:20 }} onClick={onClose}>
        <div style={{ width:'100%',maxWidth:700,background:'var(--bg-secondary)',border:'1px solid var(--border-violet)',borderRadius:20,maxHeight:'92vh',overflowY:'auto',boxShadow:'var(--glow-violet),0 40px 80px rgba(0,0,0,0.5)',animation:'fadeIn 0.3s ease' }} onClick={e => e.stopPropagation()}>
          <div style={{ padding:'24px 28px',borderBottom:'1px solid var(--border-violet)',display:'flex',alignItems:'center',gap:12 }}>
            <div style={{ width:40,height:40,borderRadius:12,background:'linear-gradient(135deg,var(--primary-violet),var(--accent-magenta))',display:'flex',alignItems:'center',justifyContent:'center' }}><Star size={18} color="white"/></div>
            <div><h2 style={{ fontSize:16,fontWeight:700 }}>{campaign ? 'Editar Campaña' : 'Nueva Campaña'}</h2><p style={{ fontSize:12,color:'var(--text-secondary)' }}>Agencia Influencers</p></div>
            <button onClick={onClose} style={{ marginLeft:'auto',color:'var(--text-secondary)',padding:6 }}><X size={20}/></button>
          </div>

          <div style={{ padding:'24px 28px',display:'flex',flexDirection:'column',gap:20 }}>
            {/* Marca */}
            <div>
              <label style={{ fontSize:12,fontWeight:500,color:'var(--text-secondary)',display:'block',marginBottom:8 }}>Marca *</label>
              <div style={{ position:'relative',display:'flex',gap:8 }}>
                <div style={{ flex:1,position:'relative' }}>
                  <Search size={14} style={{ position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'var(--text-secondary)' }}/>
                  <input className="input-field" style={{ paddingLeft:36 }} value={brandSearch} onChange={e => setBrandSearch(e.target.value)} placeholder="Buscar marca del CRM..."/>
                </div>
                <button className="btn btn-ghost" style={{ padding:'9px 14px',flexShrink:0 }} onClick={() => setShowBrandAdd(true)}><Plus size={14}/>Nueva</button>
              </div>
              {brandSearch && (
                <div style={{ background:'var(--bg-tertiary)',border:'1px solid var(--border-violet)',borderRadius:10,marginTop:4,maxHeight:160,overflowY:'auto' }}>
                  {filteredBrands.length === 0 ? (
                    <div style={{ padding:'12px 16px',fontSize:12,color:'var(--text-secondary)',display:'flex',alignItems:'center',justifyContent:'space-between' }}>No encontrada<button className="btn btn-ghost" style={{ padding:'4px 10px',fontSize:11 }} onClick={()=>setShowBrandAdd(true)}><Plus size={12}/>Crear</button></div>
                  ) : filteredBrands.map(b => (
                    <button key={b.id} onClick={() => { set('brandId', b.id); setBrandSearch(b.name) }} style={{ width:'100%',padding:'10px 16px',display:'flex',alignItems:'center',gap:10,fontSize:13,color:'var(--text-primary)',background:form.brandId===b.id?'rgba(139,92,246,0.15)':'transparent',transition:'all 0.15s',cursor:'pointer',textAlign:'left' }} onMouseEnter={e=>e.currentTarget.style.background='rgba(139,92,246,0.1)'} onMouseLeave={e=>e.currentTarget.style.background=form.brandId===b.id?'rgba(139,92,246,0.15)':'transparent'}>
                      <span style={{ fontSize:16 }}>{b.logo}</span>{b.name}
                      <span style={{ fontSize:11,color:'var(--text-secondary)',marginLeft:'auto' }}>{b.category}</span>
                    </button>
                  ))}
                </div>
              )}
              {form.brandId && !brandSearch && (
                <div style={{ padding:'8px 12px',background:'rgba(139,92,246,0.1)',border:'1px solid var(--border-violet)',borderRadius:8,marginTop:4,fontSize:12,display:'flex',alignItems:'center',gap:8 }}>
                  <span>{brands.find(b=>b.id===form.brandId)?.name}</span>
                  <button onClick={()=>{set('brandId','');setBrandSearch('')}} style={{ marginLeft:'auto',color:'var(--text-secondary)' }}><X size={12}/></button>
                </div>
              )}
            </div>

            <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:14 }}>
              <F label="Nombre de campaña *"><input className="input-field" value={form.name} onChange={e=>set('name',e.target.value)} placeholder="Spring Collection 2026"/></F>
              <F label="Estado">
                <select className="select-field" value={form.status} onChange={e=>set('status',e.target.value)}>
                  {Object.entries(CAMP_STATUS).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
                </select>
              </F>
            </div>

            <F label="Descripción"><textarea className="input-field" value={form.description||''} onChange={e=>set('description',e.target.value)} placeholder="Descripción de la campaña..." rows={2} style={{ resize:'vertical' }}/></F>

            {/* Presupuesto */}
            <div style={{ background:'rgba(139,92,246,0.06)',border:'1px solid var(--border-violet)',borderRadius:12,padding:'16px 18px' }}>
              <div style={{ fontSize:13,fontWeight:700,marginBottom:12,display:'flex',alignItems:'center',gap:8 }}><DollarSign size={15} color="var(--primary-violet-light)"/>Presupuesto y Distribución</div>
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr 80px',gap:10 }}>
                <F label="Total"><input className="input-field" type="number" value={form.budget||0} onChange={e=>set('budget',+e.target.value)}/></F>
                <F label="% Agencia"><input className="input-field" type="number" min={0} max={100} value={form.agencyPct||20} onChange={e=>{ const v=+e.target.value; set('agencyPct',v); set('influencerPct',100-v) }}/></F>
                <F label="% Influencer"><input className="input-field" type="number" min={0} max={100} value={form.influencerPct||80} onChange={e=>{ const v=+e.target.value; set('influencerPct',v); set('agencyPct',100-v) }}/></F>
                <F label="Moneda"><input className="input-field" value={form.currency||'ARS'} onChange={e=>set('currency',e.target.value)} placeholder="ARS" maxLength={5}/></F>
              </div>
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginTop:10 }}>
                <div style={{ padding:'10px 14px',background:'rgba(74,222,128,0.08)',border:'1px solid rgba(74,222,128,0.25)',borderRadius:10 }}>
                  <div style={{ fontSize:11,color:'var(--text-secondary)' }}>Ganancia Agencia</div>
                  <div style={{ fontSize:18,fontWeight:800,color:'#4ADE80' }}>{fmtMoney(agencyEarning)}</div>
                </div>
                <div style={{ padding:'10px 14px',background:'rgba(139,92,246,0.08)',border:'1px solid var(--border-violet)',borderRadius:10 }}>
                  <div style={{ fontSize:11,color:'var(--text-secondary)' }}>Pago Influencer(s)</div>
                  <div style={{ fontSize:18,fontWeight:800,color:'var(--primary-violet-light)' }}>{fmtMoney(infPayment)}</div>
                </div>
              </div>
            </div>

            <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12 }}>
              <F label="Inicio"><input className="input-field" type="date" value={form.startDate||''} onChange={e=>set('startDate',e.target.value)}/></F>
              <F label="Fin"><input className="input-field" type="date" value={form.endDate||''} onChange={e=>set('endDate',e.target.value)}/></F>
              <F label="Horario/Schedule"><input className="input-field" value={form.schedule||''} onChange={e=>set('schedule',e.target.value)} placeholder="Lun-Vie 9-18h"/></F>
            </div>

            {/* ── Influencers con rate individual ──────────────── */}
            <div>
              <div style={{ fontSize:12,fontWeight:600,color:'var(--text-secondary)',marginBottom:10,display:'flex',alignItems:'center',gap:8 }}>
                <Users size={13}/>Influencers asignados
                {loadingCi && <span style={{ fontSize:11,color:'var(--text-secondary)' }}>Cargando...</span>}
              </div>

              {/* Buscador para agregar */}
              <div style={{ position:'relative',marginBottom:10 }}>
                <Search size={14} style={{ position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'var(--text-secondary)',pointerEvents:'none' }}/>
                <input
                  className="input-field" style={{ paddingLeft:36 }}
                  value={infSearch} onChange={e=>setInfSearch(e.target.value)}
                  placeholder="Buscar y agregar influencer..."
                />
                {infSearch && availableInfs.length > 0 && (
                  <div style={{ position:'absolute',top:'100%',left:0,right:0,zIndex:10,background:'var(--bg-tertiary)',border:'1px solid var(--border-violet)',borderRadius:10,marginTop:2,maxHeight:180,overflowY:'auto' }}>
                    {availableInfs.slice(0,8).map(inf => (
                      <button key={inf.id} onClick={()=>addInfluencer(inf)}
                        style={{ width:'100%',padding:'10px 14px',display:'flex',alignItems:'center',gap:10,fontSize:13,color:'var(--text-primary)',background:'transparent',transition:'background 0.1s',cursor:'pointer',textAlign:'left' }}
                        onMouseEnter={e=>e.currentTarget.style.background='rgba(139,92,246,0.12)'}
                        onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                        <div style={{ width:26,height:26,borderRadius:'50%',background:'linear-gradient(135deg,var(--primary-violet),var(--accent-magenta))',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:'white',flexShrink:0 }}>{inf.name[0]}</div>
                        <div style={{ flex:1,minWidth:0 }}>
                          <div style={{ fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{inf.name}</div>
                          <div style={{ fontSize:11,color:'var(--text-secondary)' }}>{fmtNum(inf.followers||0)} seg. · {inf.category}</div>
                        </div>
                        <Plus size={14} color="var(--primary-violet-light)"/>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Lista de influencers asignados con campos editables */}
              {ciRows.length === 0 ? (
                <div style={{ padding:'16px',textAlign:'center',fontSize:12,color:'var(--text-secondary)',background:'rgba(139,92,246,0.04)',border:'1px dashed var(--border-violet)',borderRadius:10 }}>
                  Sin influencers asignados. Buscá uno arriba para agregar.
                </div>
              ) : (
                <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
                  {ciRows.map(ci => {
                    const inf = influencers.find(i => i.id === ci.influencerId)
                    return (
                      <div key={ci.influencerId} style={{ background:'rgba(139,92,246,0.06)',border:'1px solid var(--border-violet)',borderRadius:12,padding:'12px 14px' }}>
                        {/* Header row: name + remove */}
                        <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:10 }}>
                          <div style={{ width:28,height:28,borderRadius:'50%',background:'linear-gradient(135deg,var(--primary-violet),var(--accent-magenta))',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,color:'white',flexShrink:0 }}>
                            {inf ? inf.name[0] : '?'}
                          </div>
                          <div style={{ flex:1,minWidth:0 }}>
                            <div style={{ fontSize:13,fontWeight:700,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{inf?.name || 'Influencer eliminado'}</div>
                            <div style={{ fontSize:11,color:'var(--text-secondary)' }}>{inf ? fmtNum(inf.followers||0) + ' seg.' : ''}</div>
                          </div>
                          <button onClick={()=>removeFromList(ci.influencerId)} style={{ color:'var(--text-secondary)',padding:4,flexShrink:0 }} title="Quitar"><X size={14}/></button>
                        </div>
                        {/* Fields: rate · currency · status */}
                        <div style={{ display:'grid',gridTemplateColumns:'1fr 70px 1fr',gap:8,marginBottom:8 }}>
                          <div>
                            <div style={{ fontSize:10,color:'var(--text-secondary)',marginBottom:4,fontWeight:500 }}>Rate ($)</div>
                            <input
                              className="input-field" type="number" min={0}
                              value={ci.rate}
                              onChange={e=>updateCiRow(ci.influencerId,'rate',e.target.value)}
                              placeholder="0"
                              style={{ padding:'7px 10px',fontSize:13 }}
                            />
                          </div>
                          <div>
                            <div style={{ fontSize:10,color:'var(--text-secondary)',marginBottom:4,fontWeight:500 }}>Moneda</div>
                            <input
                              className="input-field"
                              value={ci.currency}
                              onChange={e=>updateCiRow(ci.influencerId,'currency',e.target.value.toUpperCase())}
                              placeholder="ARS" maxLength={5}
                              style={{ padding:'7px 8px',fontSize:12,textAlign:'center' }}
                            />
                          </div>
                          <div>
                            <div style={{ fontSize:10,color:'var(--text-secondary)',marginBottom:4,fontWeight:500 }}>Estado</div>
                            <select
                              className="select-field"
                              value={ci.status}
                              onChange={e=>updateCiRow(ci.influencerId,'status',e.target.value)}
                              style={{ padding:'7px 10px',fontSize:12 }}
                            >
                              {CI_STATUS.map(s=><option key={s} value={s}>{s}</option>)}
                            </select>
                          </div>
                        </div>
                        {/* Deliverables */}
                        <div>
                          <div style={{ fontSize:10,color:'var(--text-secondary)',marginBottom:4,fontWeight:500 }}>Deliverables (separados por coma)</div>
                          <input
                            className="input-field"
                            value={ci.deliverables}
                            onChange={e=>updateCiRow(ci.influencerId,'deliverables',e.target.value)}
                            placeholder="1 reel, 3 stories, 1 post..."
                            style={{ padding:'7px 10px',fontSize:12 }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {ciRows.length > 0 && (
                <div style={{ marginTop:8,fontSize:12,color:'var(--primary-violet-light)' }}>
                  {ciRows.length} influencer{ciRows.length !== 1 ? 's' : ''} asignado{ciRows.length !== 1 ? 's' : ''}
                </div>
              )}
            </div>
          </div>

          <div style={{ padding:'16px 28px',borderTop:'1px solid var(--border-violet)',display:'flex',flexDirection:'column',gap:8 }}>
            {saveErr && <div style={{ fontSize:12,color:'#F87171',textAlign:'center' }}>{saveErr}</div>}
            <div style={{ display:'flex',gap:10,justifyContent:'flex-end' }}>
              <button className="btn btn-ghost" onClick={onClose} disabled={saving}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                <Save size={14}/>{saving ? 'Guardando...' : campaign ? 'Guardar' : 'Crear Campaña'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// ─── Influencer Detail Modal (Portfolio) ───────────
const InfluencerDetailModal = ({ influencer, onClose, onSave }) => {
  const [tab, setTab] = useState('datos')
  const [edit, setEdit] = useState(false)
  const [form, setForm] = useState(influencer)
  const set = (f, v) => setForm(p => ({ ...p, [f]: v }))

  const BADGES = [
    { icon: '🏆', label: 'Top Performer', cond: (influencer.stats?.revenueGenerated || 0) > 500000 },
    { icon: '🔥', label: '100+ Usos', cond: (influencer.stats?.codesUsed || 0) >= 100 },
    { icon: '⚡', label: 'Alta Conversión', cond: (influencer.referrals?.conversionRate || 0) >= 70 },
    { icon: '🌟', label: 'Mega Influencer', cond: (influencer.followers || 0) >= 200000 },
    { icon: '💎', label: 'Tier 1', cond: influencer.tier === 1 },
  ]

  const tabs = ['datos', 'desempeño', 'portfolio', 'historial']

  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',backdropFilter:'blur(8px)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:20 }} onClick={onClose}>
      <div style={{ width:'100%',maxWidth:680,background:'var(--bg-secondary)',border:'1px solid var(--border-violet)',borderRadius:20,maxHeight:'92vh',display:'flex',flexDirection:'column',boxShadow:'var(--glow-violet),0 40px 80px rgba(0,0,0,0.5)',animation:'fadeIn 0.3s ease' }} onClick={e=>e.stopPropagation()}>
        {/* Header */}
        <div style={{ padding:'20px 24px',borderBottom:'1px solid var(--border-violet)',display:'flex',gap:16,alignItems:'center' }}>
          <div style={{ width:56,height:56,borderRadius:16,background:'linear-gradient(135deg,var(--primary-violet),var(--accent-magenta))',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,fontWeight:700,color:'white',flexShrink:0 }}>{influencer.name[0]}</div>
          <div style={{ flex:1,minWidth:0 }}>
            <h2 style={{ fontSize:18,fontWeight:800 }}>{influencer.name}</h2>
            <div style={{ fontSize:13,color:'var(--text-secondary)' }}>{influencer.instagram} · {fmtNum(influencer.followers||0)} seguidores</div>
            <div style={{ display:'flex',gap:6,marginTop:6,flexWrap:'wrap' }}>
              {BADGES.filter(b=>b.cond).map(b=>(
                <span key={b.label} style={{ fontSize:10,padding:'2px 8px',borderRadius:12,background:'rgba(139,92,246,0.15)',border:'1px solid var(--border-violet)',color:'var(--primary-violet-light)' }}>{b.icon} {b.label}</span>
              ))}
            </div>
          </div>
          <button onClick={onClose} style={{ color:'var(--text-secondary)',padding:6 }}><X size={20}/></button>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex',borderBottom:'1px solid var(--border-violet)',padding:'0 24px' }}>
          {tabs.map(t=>(
            <button key={t} onClick={()=>setTab(t)} style={{ padding:'12px 16px',fontSize:13,fontWeight:tab===t?700:400,color:tab===t?'var(--primary-violet-light)':'var(--text-secondary)',borderBottom:`2px solid ${tab===t?'var(--primary-violet)':'transparent'}`,transition:'all 0.2s',cursor:'pointer',textTransform:'capitalize' }}>{t}</button>
          ))}
        </div>

        <div style={{ flex:1,overflowY:'auto',padding:24 }}>
          {tab === 'datos' && (
            <div style={{ display:'flex',flexDirection:'column',gap:14 }}>
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
                {[
                  { l:'Categoría', v:influencer.category },
                  { l:'Tier', v:`Tier ${influencer.tier}` },
                  { l:'Email', v:influencer.email },
                  { l:'Teléfono', v:influencer.phone },
                  { l:'Tipo contrato', v:influencer.contractType },
                  { l:'Tarifa', v:fmtMoney(influencer.rate||0) },
                  { l:'Estado', v:influencer.status },
                  { l:'Link único', v:influencer.uniLink },
                ].map(item=>(
                  <div key={item.l} style={{ padding:'10px 14px',background:'rgba(139,92,246,0.06)',borderRadius:10,border:'1px solid var(--border-violet)' }}>
                    <div style={{ fontSize:11,color:'var(--text-secondary)',marginBottom:3 }}>{item.l}</div>
                    <div style={{ fontSize:13,fontWeight:600 }}>{item.v||'—'}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'desempeño' && (
            <div style={{ display:'flex',flexDirection:'column',gap:12 }}>
              <div style={{ display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:10 }}>
                {[
                  { l:'Reach Total', v:fmtNum(influencer.stats?.totalReach||0), c:'#8B5CF6' },
                  { l:'Engagement', v:`${influencer.stats?.engagement||0}%`, c:'#E879F9' },
                  { l:'Códigos Usados', v:influencer.stats?.codesUsed||0, c:'#22D3EE' },
                  { l:'Revenue Generado', v:fmtMoney(influencer.stats?.revenueGenerated||0), c:'#4ADE80' },
                  { l:'Referidos', v:influencer.referrals?.total||0, c:'#FCD34D' },
                  { l:'Tasa Conversión', v:`${influencer.referrals?.conversionRate||0}%`, c:'#FB923C' },
                ].map(s=>(
                  <div key={s.l} style={{ padding:'14px 16px',background:'rgba(139,92,246,0.06)',borderRadius:12,border:'1px solid var(--border-violet)' }}>
                    <div style={{ fontSize:22,fontWeight:800,color:s.c }}>{s.v}</div>
                    <div style={{ fontSize:11,color:'var(--text-secondary)',marginTop:3 }}>{s.l}</div>
                  </div>
                ))}
              </div>

              {/* Gamification */}
              <div style={{ padding:'16px',background:'rgba(252,211,77,0.06)',border:'1px solid rgba(252,211,77,0.2)',borderRadius:12 }}>
                <div style={{ fontSize:13,fontWeight:700,marginBottom:10,color:'#FCD34D',display:'flex',alignItems:'center',gap:8 }}><Trophy size={14}/>Ranking & Puntos</div>
                <div style={{ display:'flex',alignItems:'center',gap:16 }}>
                  <div style={{ textAlign:'center' }}>
                    <div style={{ fontSize:32,fontWeight:900,color:'#FCD34D' }}>{Math.round((influencer.stats?.revenueGenerated||0)/1000 + (influencer.stats?.codesUsed||0)*10)}</div>
                    <div style={{ fontSize:11,color:'var(--text-secondary)' }}>Puntos</div>
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex',gap:6,flexWrap:'wrap' }}>
                      {BADGES.filter(b=>b.cond).map(b=>(
                        <span key={b.label} style={{ padding:'4px 10px',borderRadius:20,background:'rgba(252,211,77,0.15)',border:'1px solid rgba(252,211,77,0.3)',fontSize:11,color:'#FCD34D' }}>{b.icon} {b.label}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === 'portfolio' && (
            <div>
              <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16 }}>
                <span style={{ fontSize:13,color:'var(--text-secondary)' }}>Portfolio Resilio · Diseño 2 páginas A4</span>
                <div style={{ display:'flex',gap:8 }}>
                  <button className="btn btn-ghost" style={{ fontSize:12,padding:'7px 14px' }}><Upload size={13}/>Subir foto</button>
                  <button className="btn btn-primary" style={{ fontSize:12,padding:'7px 14px' }}><Download size={13}/>Descargar PDF</button>
                </div>
              </div>
              <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10 }}>
                {Array.from({length:6},(_,i)=>(
                  <div key={i} style={{ aspectRatio:'4/5',borderRadius:12,background:`linear-gradient(135deg,rgba(139,92,246,${0.1+i*0.03}),rgba(232,121,249,${0.08+i*0.02}))`,border:'1px dashed var(--border-violet)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',transition:'all 0.2s' }} onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--primary-violet)';e.currentTarget.style.background='rgba(139,92,246,0.15)'}} onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--border-violet)';e.currentTarget.style.background=`linear-gradient(135deg,rgba(139,92,246,${0.1+i*0.03}),rgba(232,121,249,${0.08+i*0.02}))`}}>
                    <div style={{ textAlign:'center',color:'var(--text-secondary)' }}>
                      <Upload size={20} style={{ marginBottom:4,opacity:0.5 }}/>
                      <div style={{ fontSize:11 }}>Agregar foto</div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop:12,padding:'10px 14px',background:'rgba(139,92,246,0.06)',borderRadius:10,fontSize:12,color:'var(--text-secondary)' }}>
                El PDF se generará con diseño vertical 2 páginas incluyendo stats, bio y portfolio de imágenes.
              </div>
            </div>
          )}

          {tab === 'historial' && (
            <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
              {[
                { date:'2026-04-15', camp:'Nike Spring Run', status:'completed', payment: 45000 },
                { date:'2026-03-01', camp:'Adidas Boost Campaign', status:'completed', payment: 28000 },
                { date:'2026-01-10', camp:'UA Training Week', status:'completed', payment: 32000 },
              ].map((h,i)=>(
                <div key={i} style={{ padding:'12px 16px',background:'rgba(139,92,246,0.06)',borderRadius:12,border:'1px solid var(--border-violet)',display:'flex',alignItems:'center',gap:12 }}>
                  <div style={{ width:36,height:36,borderRadius:10,background:'rgba(74,222,128,0.15)',display:'flex',alignItems:'center',justifyContent:'center' }}><CheckCircle size={18} color="#4ADE80"/></div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13,fontWeight:600 }}>{h.camp}</div>
                    <div style={{ fontSize:11,color:'var(--text-secondary)' }}>{fmtDate(h.date)}</div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:14,fontWeight:700,color:'#4ADE80' }}>{fmtMoney(h.payment)}</div>
                    <div style={{ fontSize:10,color:'var(--text-secondary)' }}>pagado</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ padding:'14px 24px',borderTop:'1px solid var(--border-violet)',display:'flex',gap:8,justifyContent:'flex-end' }}>
          {influencer.instagram && (
            <a href={`https://instagram.com/${influencer.instagram.replace('@','')}`} target="_blank" rel="noopener" className="btn btn-ghost" style={{ fontSize:12 }}>
              <Instagram size={13}/>Ver IG
            </a>
          )}
          <button onClick={onClose} className="btn btn-ghost">Cerrar</button>
        </div>
      </div>
    </div>
  )
}

// ─── Influencers CRM ────────────────────────────────
const InfluencersCRM = ({ influencers, onSave, onDelete }) => {
  const [search, setSearch] = useState('')
  const [fCat, setFCat] = useState('all')
  const [fStatus, setFStatus] = useState('all')
  const [fTier, setFTier] = useState('all')
  const [fCiudad, setFCiudad] = useState('all')
  const [fGrupo, setFGrupo] = useState('all')
  const [selected, setSelected] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [confirmDel, setConfirmDel] = useState(null)
  const [grupos, setGrupos] = useState(['Grupo A', 'Grupo B', 'VIP'])
  const [showAddGrupo, setShowAddGrupo] = useState(false)
  const [newGrupo, setNewGrupo] = useState('')

  const filtered = influencers.filter(i => {
    const term = search.toLowerCase()
    const ms = i.name.toLowerCase().includes(term) || (i.instagram||'').toLowerCase().includes(term) || (i.ciudad||'').toLowerCase().includes(term)
    return ms && (fCat === 'all' || i.category === fCat) && (fStatus === 'all' || i.status === fStatus) && (fTier === 'all' || String(i.tier) === fTier) && (fCiudad === 'all' || i.ciudad === fCiudad) && (fGrupo === 'all' || i.grupo === fGrupo)
  })

  const cats = [...new Set(influencers.map(i => i.category))]
  const ciudades = [...new Set(influencers.map(i => i.ciudad).filter(Boolean))]
  const sorted = [...filtered].sort((a,b) => (b.stats?.revenueGenerated||0) - (a.stats?.revenueGenerated||0))

  const tierLabel = { 1:'Mega', 2:'Macro', 3:'Micro', 4:'Nano' }
  const tierColor = { 1:'#FCD34D', 2:'#8B5CF6', 3:'#22D3EE', 4:'#9CA3AF' }

  const addGrupo = () => { if(!newGrupo.trim()) return; setGrupos(p=>[...p,newGrupo.trim()]); setNewGrupo(''); setShowAddGrupo(false) }

  const contactarWhatsApp = (e, inf) => {
    e.stopPropagation()
    const num = (inf.whatsapp||inf.phone||'').replace(/\D/g,'')
    if (num) window.open(`https://wa.me/${num}`, '_blank')
  }

  return (
    <div>
      {selected && <InfluencerDetailModal influencer={selected} onClose={()=>setSelected(null)} onSave={onSave}/>}
      {showAdd && <InfluencerQuickModal onSave={i=>{onSave(i);setShowAdd(false)}} onClose={()=>setShowAdd(false)}/>}

      <div style={{ display:'flex',gap:10,marginBottom:14,flexWrap:'wrap',alignItems:'center' }}>
        <div style={{ position:'relative',flex:1,minWidth:200 }}>
          <Search size={14} style={{ position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'var(--text-secondary)' }}/>
          <input className="input-field" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar influencer, ciudad..." style={{ paddingLeft:36 }}/>
        </div>
        <select className="select-field" style={{ width:'auto',minWidth:130 }} value={fCat} onChange={e=>setFCat(e.target.value)}>
          <option value="all">Todas las categorías</option>
          {cats.map(c=><option key={c}>{c}</option>)}
        </select>
        <select className="select-field" style={{ width:'auto',minWidth:110 }} value={fTier} onChange={e=>setFTier(e.target.value)}>
          <option value="all">Todos los tiers</option>
          {[1,2,3,4].map(t=><option key={t} value={t}>{tierLabel[t]}</option>)}
        </select>
        <select className="select-field" style={{ width:'auto',minWidth:120 }} value={fCiudad} onChange={e=>setFCiudad(e.target.value)}>
          <option value="all">Todas las ciudades</option>
          {ciudades.map(c=><option key={c}>{c}</option>)}
        </select>
        <select className="select-field" style={{ width:'auto',minWidth:120 }} value={fGrupo} onChange={e=>setFGrupo(e.target.value)}>
          <option value="all">Todos los grupos</option>
          {grupos.map(g=><option key={g}>{g}</option>)}
        </select>
        <select className="select-field" style={{ width:'auto',minWidth:110 }} value={fStatus} onChange={e=>setFStatus(e.target.value)}>
          <option value="all">Todos</option>
          <option value="active">Activos</option>
          <option value="paused">Pausados</option>
        </select>
        <button onClick={()=>setShowAddGrupo(p=>!p)} style={{ display:'flex',alignItems:'center',gap:6,padding:'9px 14px',borderRadius:10,fontSize:13,fontWeight:600,background:'rgba(139,92,246,0.1)',color:'var(--primary-violet-light)',border:'1px solid var(--border-violet)' }}><Plus size={14}/>Grupo</button>
        <button className="btn btn-primary" onClick={()=>setShowAdd(true)}><Plus size={14}/>Nueva Influencer</button>
      </div>
      {showAddGrupo && (
        <div style={{ display:'flex',gap:8,marginBottom:14,alignItems:'center' }}>
          <input className="input-field" value={newGrupo} onChange={e=>setNewGrupo(e.target.value)} placeholder="Nombre del grupo..." style={{ flex:1,maxWidth:280 }} onKeyDown={e=>e.key==='Enter'&&addGrupo()}/>
          <button onClick={addGrupo} style={{ padding:'8px 14px',borderRadius:10,fontSize:13,fontWeight:600,background:'rgba(74,222,128,0.15)',color:'#4ADE80',border:'1px solid rgba(74,222,128,0.4)' }}>Crear</button>
          <button onClick={()=>setShowAddGrupo(false)} style={{ padding:'8px 10px',borderRadius:10,color:'var(--text-secondary)',border:'1px solid var(--border-violet)' }}><X size={14}/></button>
        </div>
      )}

      {/* Leaderboard top 3 */}
      <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:20 }}>
        {sorted.slice(0,3).map((inf,i)=>(
          <div key={inf.id} className="card" style={{ padding:16,cursor:'pointer',border:`1px solid ${['#FCD34D','#C0C0C0','#CD7F32'][i]}33` }} onClick={()=>setSelected(inf)}>
            <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:8 }}>
              <div style={{ width:36,height:36,borderRadius:'50%',background:'linear-gradient(135deg,var(--primary-violet),var(--accent-magenta))',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,fontWeight:700,color:'white' }}>{['🥇','🥈','🥉'][i]}</div>
              <div>
                <div style={{ fontSize:13,fontWeight:700 }}>{inf.name}</div>
                <div style={{ fontSize:11,color:'var(--text-secondary)' }}>{inf.instagram}</div>
              </div>
            </div>
            <div style={{ fontSize:16,fontWeight:800,color:'#4ADE80' }}>{fmtMoney(inf.stats?.revenueGenerated||0)}</div>
            <div style={{ fontSize:11,color:'var(--text-secondary)' }}>{fmtNum(inf.followers||0)} seguidores · {inf.stats?.engagement||0}% eng.</div>
          </div>
        ))}
      </div>

      {/* Grid */}
      <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:14 }}>
        {sorted.map(inf=>(
          <div key={inf.id} className="card" style={{ padding:18,cursor:'pointer' }} onClick={()=>setSelected(inf)}>
            <div style={{ display:'flex',alignItems:'flex-start',gap:12,marginBottom:10 }}>
              <div style={{ width:48,height:48,borderRadius:14,background:'linear-gradient(135deg,var(--primary-violet),var(--accent-magenta))',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,fontWeight:700,color:'white',flexShrink:0 }}>{inf.name[0]}</div>
              <div style={{ flex:1,minWidth:0 }}>
                <div style={{ fontSize:14,fontWeight:700,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{inf.name}</div>
                <div style={{ display:'flex',alignItems:'center',gap:6,flexWrap:'wrap',marginTop:2 }}>
                  {inf.instagram && <div style={{ fontSize:11,color:'var(--primary-violet-light)' }}>{inf.instagram}</div>}
                  {inf.tiktok && <div style={{ fontSize:11,color:'#22D3EE' }}>🎵 {inf.tiktok}</div>}
                </div>
                {inf.ciudad && <div style={{ fontSize:11,color:'var(--text-secondary)',marginTop:2,display:'flex',alignItems:'center',gap:4 }}><MapPin size={9}/>{inf.ciudad}{inf.pais&&`, ${inf.pais}`}</div>}
                <div style={{ display:'flex',gap:4,marginTop:4,flexWrap:'wrap' }}>
                  <span style={{ fontSize:10,padding:'2px 7px',borderRadius:10,background:`${tierColor[inf.tier]}22`,color:tierColor[inf.tier],border:`1px solid ${tierColor[inf.tier]}44` }}>{tierLabel[inf.tier]}</span>
                  {inf.grupo && <span style={{ fontSize:10,padding:'2px 7px',borderRadius:10,background:'rgba(34,211,238,0.1)',color:'#22D3EE',border:'1px solid rgba(34,211,238,0.3)' }}>{inf.grupo}</span>}
                  <span style={{ fontSize:10,padding:'2px 7px',borderRadius:10,background:inf.status==='active'?'rgba(74,222,128,0.1)':'rgba(252,211,77,0.1)',color:inf.status==='active'?'#4ADE80':'#FCD34D',border:`1px solid ${inf.status==='active'?'rgba(74,222,128,0.3)':'rgba(252,211,77,0.3)'}` }}>{inf.status==='active'?'Activa':'Pausada'}</span>
                </div>
              </div>
              <button onClick={e=>{e.stopPropagation();setConfirmDel(inf)}} style={{ color:'#F87171',padding:4,opacity:0.6 }} onMouseEnter={e=>e.currentTarget.style.opacity='1'} onMouseLeave={e=>e.currentTarget.style.opacity='0.6'}><Trash2 size={13}/></button>
            </div>
            <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:6,marginBottom:10 }}>
              {[
                { l:'Seguidores', v:fmtNum(inf.followers||0) },
                { l:'Engagement', v:`${inf.stats?.engagement||0}%` },
                { l:'Revenue', v:fmtMoney(inf.stats?.revenueGenerated||0) },
              ].map(s=>(
                <div key={s.l} style={{ textAlign:'center',padding:'6px 4px',borderRadius:8,background:'rgba(139,92,246,0.07)',border:'1px solid rgba(139,92,246,0.1)' }}>
                  <div style={{ fontSize:13,fontWeight:700,color:'var(--primary-violet-light)' }}>{s.v}</div>
                  <div style={{ fontSize:9,color:'var(--text-secondary)' }}>{s.l}</div>
                </div>
              ))}
            </div>
            {/* Botones de contacto */}
            <div style={{ display:'flex',gap:6,marginTop:4 }} onClick={e=>e.stopPropagation()}>
              {(inf.whatsapp||inf.phone) && (
                <button onClick={e=>contactarWhatsApp(e,inf)} style={{ flex:1,padding:'6px 10px',borderRadius:8,fontSize:11,fontWeight:600,background:'rgba(74,222,128,0.12)',color:'#4ADE80',border:'1px solid rgba(74,222,128,0.3)',display:'flex',alignItems:'center',justifyContent:'center',gap:5 }}>
                  <Phone size={11}/>Contactar
                </button>
              )}
              {inf.tiktok && (
                <a href={`https://tiktok.com/@${inf.tiktok.replace('@','')}`} target="_blank" rel="noopener" onClick={e=>e.stopPropagation()} style={{ flex:1,padding:'6px 10px',borderRadius:8,fontSize:11,fontWeight:600,background:'rgba(34,211,238,0.12)',color:'#22D3EE',border:'1px solid rgba(34,211,238,0.3)',display:'flex',alignItems:'center',justifyContent:'center',gap:5,textDecoration:'none' }}>
                  🎵 TikTok
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      {confirmDel && (
        <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',backdropFilter:'blur(8px)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:20 }} onClick={()=>setConfirmDel(null)}>
          <div style={{ width:'100%',maxWidth:380,background:'var(--bg-secondary)',border:'1px solid rgba(239,68,68,0.3)',borderRadius:16,padding:28,animation:'fadeIn 0.2s ease' }} onClick={e=>e.stopPropagation()}>
            <h3 style={{ fontSize:15,fontWeight:700,marginBottom:10 }}>Eliminar influencer</h3>
            <p style={{ fontSize:13,color:'var(--text-secondary)',marginBottom:20 }}>¿Confirmas eliminar a "{confirmDel.name}"?</p>
            <div style={{ display:'flex',gap:10,justifyContent:'flex-end' }}>
              <button className="btn btn-ghost" onClick={()=>setConfirmDel(null)}>Cancelar</button>
              <button className="btn btn-danger" onClick={()=>{onDelete(confirmDel.id);setConfirmDel(null)}}><Trash2 size={13}/>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Agency Dashboard ───────────────────────────────
const AgencyDashboard = ({ campaigns, influencers, collaborations }) => {
  const [period, setPeriod] = useState('mes')

  const activeCamps = campaigns.filter(c => c.status === 'active').length
  const totalBudget = campaigns.reduce((a, c) => a + (c.budget || 0), 0)
  const activeInfs = influencers.filter(i => i.status === 'active').length
  const avgEngagement = influencers.reduce((a, i) => a + (i.stats?.engagement || 0), 0) / (influencers.length || 1)

  const topPerformers = [...influencers].sort((a,b)=>(b.stats?.revenueGenerated||0)-(a.stats?.revenueGenerated||0)).slice(0,5)

  const campByStatus = [
    { name: 'Activas', v: activeCamps, c: '#4ADE80' },
    { name: 'Planificando', v: campaigns.filter(c=>c.status==='planning').length, c: '#A78BFA' },
    { name: 'Completadas', v: campaigns.filter(c=>c.status==='completed').length, c: '#9CA3AF' },
  ]

  const revenueChart = [
    { month: 'Ene', rev: 380000, roi: 2.1 },
    { month: 'Feb', rev: 520000, roi: 2.8 },
    { month: 'Mar', rev: 490000, roi: 2.4 },
    { month: 'Abr', rev: 680000, roi: 3.2 },
    { month: 'May', rev: 720000, roi: 3.6 },
  ]

  const Pill = ({ v, l }) => (
    <button onClick={() => setPeriod(v)} style={{ padding:'6px 16px',borderRadius:20,fontSize:12,fontWeight:500,border:`1px solid ${period===v?'var(--primary-violet)':'var(--border-violet)'}`,background:period===v?'rgba(139,92,246,0.2)':'rgba(139,92,246,0.05)',color:period===v?'var(--primary-violet-light)':'var(--text-secondary)',transition:'all 0.2s',cursor:'pointer' }}>{l}</button>
  )

  return (
    <div>
      <div style={{ display:'flex',gap:8,marginBottom:20 }}>
        {[{v:'semana',l:'Semana'},{v:'mes',l:'Mes'}].map(p=><Pill key={p.v} {...p}/>)}
      </div>

      <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:12,marginBottom:20 }}>
        {[
          { l:'Revenue Total', v:fmtMoney(totalBudget), c:'#4ADE80', bg:'rgba(74,222,128,0.12)', icon:'💰' },
          { l:'Campañas Activas', v:activeCamps, c:'#8B5CF6', bg:'rgba(139,92,246,0.12)', icon:'📣' },
          { l:'Influencers Activos', v:activeInfs, c:'#E879F9', bg:'rgba(232,121,249,0.12)', icon:'⭐' },
          { l:'Engagement Promedio', v:`${avgEngagement.toFixed(1)}%`, c:'#22D3EE', bg:'rgba(34,211,238,0.12)', icon:'❤️' },
        ].map(s=>(
          <div key={s.l} className="card" style={{ padding:16 }}>
            <div style={{ fontSize:24,marginBottom:6 }}>{s.icon}</div>
            <div style={{ fontSize:22,fontWeight:800,color:s.c }}>{s.v}</div>
            <div style={{ fontSize:11,color:'var(--text-secondary)' }}>{s.l}</div>
          </div>
        ))}
      </div>

      <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16 }}>
        <div className="card" style={{ padding:20 }}>
          <div style={{ fontSize:13,fontWeight:700,marginBottom:14 }}>Revenue por Mes</div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={revenueChart} margin={{top:4,right:4,bottom:0,left:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(139,92,246,0.1)"/>
              <XAxis dataKey="month" tick={{fill:'var(--text-secondary)',fontSize:10}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fill:'var(--text-secondary)',fontSize:10}} axisLine={false} tickLine={false} tickFormatter={v=>fmtMoney(v)}/>
              <Tooltip formatter={v=>fmtMoney(v)} contentStyle={{background:'var(--bg-tertiary)',border:'1px solid var(--border-violet)',borderRadius:10,fontSize:12}}/>
              <Bar dataKey="rev" fill="#8B5CF6" radius={[6,6,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card" style={{ padding:20 }}>
          <div style={{ fontSize:13,fontWeight:700,marginBottom:14 }}>Top Performers</div>
          {topPerformers.map((inf,i)=>(
            <div key={inf.id} style={{ display:'flex',alignItems:'center',gap:10,marginBottom:8 }}>
              <span style={{ fontSize:12,color:'var(--text-secondary)',width:16,textAlign:'right' }}>#{i+1}</span>
              <div style={{ width:28,height:28,borderRadius:'50%',background:'linear-gradient(135deg,var(--primary-violet),var(--accent-magenta))',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,color:'white',fontWeight:700,flexShrink:0 }}>{inf.name[0]}</div>
              <div style={{ flex:1,minWidth:0 }}>
                <div style={{ fontSize:12,fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{inf.name}</div>
                <div style={{ height:3,borderRadius:2,background:'rgba(139,92,246,0.1)',marginTop:3 }}>
                  <div style={{ height:'100%',width:`${Math.min(100,((inf.stats?.revenueGenerated||0)/(topPerformers[0]?.stats?.revenueGenerated||1))*100)}%`,background:'linear-gradient(90deg,#8B5CF6,#E879F9)',borderRadius:2 }}/>
                </div>
              </div>
              <span style={{ fontSize:12,color:'#4ADE80',fontWeight:700,flexShrink:0 }}>{fmtMoney(inf.stats?.revenueGenerated||0)}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10 }}>
        {campByStatus.map(s=>(
          <div key={s.name} className="card" style={{ padding:16,textAlign:'center' }}>
            <div style={{ fontSize:28,fontWeight:900,color:s.c }}>{s.v}</div>
            <div style={{ fontSize:12,color:'var(--text-secondary)' }}>{s.name}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Collaboration Modal ────────────────────────────
const COLLAB_STATUS_OPTS = ['proposed','confirmed','in_progress','content_pending','completed']
const COLLAB_STATUS_LABELS = {
  proposed: 'Propuesto', confirmed: 'Confirmado', in_progress: 'En Progreso',
  content_pending: 'Pendiente contenido', completed: 'Completado',
}
const COLLAB_STATUS_COLORS = {
  proposed: '#A78BFA', confirmed: '#06B6D4', in_progress: '#4ADE80',
  content_pending: '#FCD34D', completed: '#9CA3AF',
}

const CollabModal = ({ collab, activationTypes, influencers, brands, defaultActivationTypeId, onSave, onClose, onDelete }) => {
  const [form, setForm] = useState(collab || {
    influencerId: '', brandId: '', activationTypeId: defaultActivationTypeId || '',
    status: 'proposed', amount: '', currency: '', notes: '', startDate: '', endDate: '',
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)
  const set = (f, v) => setForm(p => ({ ...p, [f]: v }))

  const handleSave = async () => {
    if (!form.influencerId) { setErr('Seleccioná un influencer'); return }
    setSaving(true); setErr(null)
    try {
      await onSave({ ...form, id: collab?.id || null })
    } catch (e) {
      setErr(e.message || 'Error al guardar')
    } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    setSaving(true)
    try { await onDelete() } catch (e) { setErr(e.message || 'Error') } finally { setSaving(false) }
  }

  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',backdropFilter:'blur(8px)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:20 }} onClick={onClose}>
      <div style={{ width:'100%',maxWidth:540,background:'var(--bg-secondary)',border:'1px solid var(--border-violet)',borderRadius:20,maxHeight:'90vh',overflowY:'auto',boxShadow:'var(--glow-violet),0 40px 80px rgba(0,0,0,0.5)',animation:'fadeIn 0.3s ease' }} onClick={e=>e.stopPropagation()}>
        <div style={{ padding:'20px 24px',borderBottom:'1px solid var(--border-violet)',display:'flex',alignItems:'center',gap:12 }}>
          <h2 style={{ fontSize:16,fontWeight:700,flex:1 }}>{collab ? 'Editar Colaboración' : 'Nueva Colaboración'}</h2>
          <button onClick={onClose} style={{ color:'var(--text-secondary)',padding:4 }}><X size={18}/></button>
        </div>
        <div style={{ padding:'20px 24px',display:'flex',flexDirection:'column',gap:14 }}>
          {err && <div style={{ padding:'10px 14px',background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.3)',borderRadius:10,color:'#F87171',fontSize:13 }}>{err}</div>}
          <F label="Influencer *">
            <select className="select-field" value={form.influencerId} onChange={e=>set('influencerId',e.target.value)}>
              <option value="">Seleccionar influencer...</option>
              {influencers.map(i=><option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
          </F>
          <F label="Marca">
            <select className="select-field" value={form.brandId} onChange={e=>set('brandId',e.target.value)}>
              <option value="">Sin marca (opcional)</option>
              {brands.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </F>
          {activationTypes.length > 0 && (
            <div>
              <label style={{ fontSize:12,fontWeight:500,color:'var(--text-secondary)',display:'block',marginBottom:8 }}>Tipo de activación</label>
              <div style={{ display:'flex',gap:8,flexWrap:'wrap' }}>
                {activationTypes.map(at=>(
                  <button key={at.id} onClick={()=>set('activationTypeId',at.id)}
                    style={{ flex:'1 1 80px',padding:'8px 12px',borderRadius:10,fontSize:12,fontWeight:600,cursor:'pointer',
                      border:`1px solid ${form.activationTypeId===at.id?at.color:'var(--border-violet)'}`,
                      background:form.activationTypeId===at.id?`${at.color}25`:'transparent',
                      color:form.activationTypeId===at.id?at.color:'var(--text-secondary)',transition:'all 0.2s' }}>
                    {at.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
            <F label="Estado">
              <select className="select-field" value={form.status} onChange={e=>set('status',e.target.value)}>
                {COLLAB_STATUS_OPTS.map(s=><option key={s} value={s}>{COLLAB_STATUS_LABELS[s]}</option>)}
              </select>
            </F>
            <F label="Monto"><input className="input-field" type="number" value={form.amount} onChange={e=>set('amount',e.target.value)} placeholder="0"/></F>
          </div>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
            <F label="Inicio"><input className="input-field" type="date" value={form.startDate||''} onChange={e=>set('startDate',e.target.value)}/></F>
            <F label="Fin"><input className="input-field" type="date" value={form.endDate||''} onChange={e=>set('endDate',e.target.value)}/></F>
          </div>
          <F label="Notas"><textarea className="input-field" value={form.notes||''} onChange={e=>set('notes',e.target.value)} rows={3} style={{ resize:'vertical' }} placeholder="Notas internas..."/></F>
        </div>
        <div style={{ padding:'14px 24px',borderTop:'1px solid var(--border-violet)',display:'flex',gap:10,justifyContent:'flex-end' }}>
          {onDelete && <button onClick={handleDelete} className="btn btn-danger" style={{ marginRight:'auto' }} disabled={saving}><Trash2 size={13}/>Cancelar collab</button>}
          <button onClick={onClose} className="btn btn-ghost">Cerrar</button>
          <button onClick={handleSave} className="btn btn-primary" disabled={saving}><Save size={14}/>{saving?'Guardando...':(collab?'Guardar':'Crear')}</button>
        </div>
      </div>
    </div>
  )
}

// ─── Collaborations Panel ────────────────────────────
const CollabsPanel = ({ collaborations, activationTypes, influencers, brands, onSave, onDelete }) => {
  const [activeTab, setActiveTab] = useState('')
  const [selected, setSelected] = useState(null)
  const [showCreate, setShowCreate] = useState(false)

  React.useEffect(() => {
    if (activationTypes.length > 0 && !activeTab) setActiveTab(activationTypes[0].id)
  }, [activationTypes, activeTab])

  const filtered = collaborations.filter(c => c.activationTypeId === activeTab)

  const closeModal = () => { setSelected(null); setShowCreate(false) }

  return (
    <div style={{ animation:'fadeIn 0.3s ease' }}>
      {/* Activation type tabs — desde DB */}
      {activationTypes.length === 0 ? (
        <div style={{ color:'var(--text-secondary)',fontSize:13,padding:'16px 0' }}>Cargando tipos de activación...</div>
      ) : (
        <div style={{ display:'flex',gap:4,marginBottom:16,background:'rgba(139,92,246,0.06)',borderRadius:12,padding:4,width:'fit-content' }}>
          {activationTypes.map(at=>(
            <button key={at.id} onClick={()=>setActiveTab(at.id)}
              style={{ padding:'8px 24px',borderRadius:8,fontSize:13,fontWeight:700,border:'none',
                background:activeTab===at.id?`${at.color}25`:'transparent',
                color:activeTab===at.id?at.color:'var(--text-secondary)',
                borderBottom:activeTab===at.id?`2px solid ${at.color}`:'2px solid transparent',
                transition:'all 0.2s',cursor:'pointer' }}>
              {at.name}
            </button>
          ))}
        </div>
      )}

      <div style={{ display:'flex',justifyContent:'flex-end',marginBottom:16 }}>
        <button className="btn btn-primary" onClick={()=>setShowCreate(true)}><Plus size={14}/>Nueva Colaboración</button>
      </div>

      <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:14 }}>
        {filtered.map(collab => {
          const inf   = influencers.find(i=>i.id===collab.influencerId)
          const brand = brands.find(b=>b.id===collab.brandId)
          const actType = activationTypes.find(a=>a.id===collab.activationTypeId)
          const statusColor = COLLAB_STATUS_COLORS[collab.status] || '#A78BFA'
          return (
            <div key={collab.id} className="card" style={{ padding:18,cursor:'pointer' }} onClick={()=>setSelected(collab)}>
              <div style={{ display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:10 }}>
                <div style={{ minWidth:0,flex:1 }}>
                  <h3 style={{ fontSize:14,fontWeight:700,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{inf?.name||'Influencer eliminado'}</h3>
                  {brand && <div style={{ fontSize:12,color:'var(--text-secondary)',marginTop:2 }}>🏢 {brand.name}</div>}
                </div>
                <span style={{ padding:'3px 10px',borderRadius:10,fontSize:10,fontWeight:700,flexShrink:0,marginLeft:8,background:`${statusColor}22`,color:statusColor }}>
                  {COLLAB_STATUS_LABELS[collab.status]||collab.status}
                </span>
              </div>
              {collab.amount > 0 && (
                <div style={{ fontSize:18,fontWeight:800,color:'#4ADE80',marginBottom:6 }}>
                  ${Number(collab.amount).toLocaleString()}{collab.currency?` ${collab.currency}`:''}
                </div>
              )}
              {collab.notes && <p style={{ fontSize:12,color:'var(--text-secondary)',lineHeight:1.5,fontStyle:'italic' }}>{collab.notes}</p>}
            </div>
          )
        })}
        {filtered.length === 0 && (
          <div style={{ gridColumn:'1/-1',textAlign:'center',padding:'40px',color:'var(--text-secondary)',fontSize:13 }}>
            Sin colaboraciones en {activationTypes.find(a=>a.id===activeTab)?.name||'...'}
          </div>
        )}
      </div>

      {(showCreate || selected) && (
        <CollabModal
          collab={selected}
          activationTypes={activationTypes}
          influencers={influencers}
          brands={brands}
          defaultActivationTypeId={activeTab}
          onSave={async (data) => { await onSave(data); closeModal() }}
          onClose={closeModal}
          onDelete={selected ? async () => { await onDelete(selected.id); closeModal() } : null}
        />
      )}
    </div>
  )
}

// ─── Main Export ────────────────────────────────────
export default function InfluencerAgencyView({ campaigns, collaborations, activationTypes, influencers, brands, onSaveCampaign, onDeleteCampaign, onSaveCollaboration, onDeleteCollaboration, onSaveInfluencer, onDeleteInfluencer, onGetCampaignInfluencers, onCIAdd, onCIUpdate, onCIRemove, onPatchCampaignInfluencers, defaultTab }) {
  const [tab, setTab] = useState(defaultTab || 'dashboard')
  const [modal, setModal] = useState(null)
  const [localBrands, setLocalBrands] = useState(brands || [])
  const [campSearch, setCampSearch] = useState('')
  const [campFilterStatus, setCampFilterStatus] = useState('all')
  const [campFilterCiudad, setCampFilterCiudad] = useState('all')
  const [campFiltered, setCampFiltered] = useState(null)

  const allBrands = [...(brands||[]), ...localBrands.filter(b=>!(brands||[]).find(x=>x.id===b.id))]

  const TABS = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'campaigns', label: 'Campañas', icon: Star },
    { id: 'crm', label: 'Influencers CRM', icon: Users },
    { id: 'collabs', label: 'Colaboraciones', icon: CheckCircle },
  ]

  return (
    <div style={{ padding:24,animation:'fadeIn 0.3s ease' }}>
      <div style={{ display:'flex',alignItems:'center',gap:12,marginBottom:20,flexWrap:'wrap' }}>
        <div>
          <h2 style={{ fontSize:20,fontWeight:700 }}>Agencia Influencers</h2>
          <p style={{ fontSize:12,color:'var(--text-secondary)' }}>{(campaigns||[]).length} campañas · {(influencers||[]).length} influencers</p>
        </div>
        <div style={{ flex:1 }}/>
        {tab==='campaigns'&&<button className="btn btn-primary" onClick={()=>setModal('create')}><Plus size={16}/>Nueva Campaña</button>}
      </div>

      {/* Tabs */}
      <div style={{ display:'flex',gap:2,marginBottom:24,background:'rgba(139,92,246,0.06)',border:'1px solid var(--border-violet)',borderRadius:12,padding:4,width:'fit-content' }}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{ display:'flex',alignItems:'center',gap:8,padding:'9px 18px',borderRadius:9,fontSize:13,fontWeight:tab===t.id?700:400,background:tab===t.id?'rgba(139,92,246,0.2)':'transparent',color:tab===t.id?'var(--primary-violet-light)':'var(--text-secondary)',border:tab===t.id?'1px solid rgba(139,92,246,0.4)':'1px solid transparent',transition:'all 0.2s',cursor:'pointer' }}>
            <t.icon size={15}/>{t.label}
          </button>
        ))}
      </div>

      {tab === 'dashboard' && <AgencyDashboard campaigns={campaigns||[]} influencers={influencers||[]} collaborations={collaborations||[]}/>}

      {tab === 'campaigns' && (
        <div>
          {/* Filtros campañas */}
          <div style={{ display:'flex',gap:10,marginBottom:20,flexWrap:'wrap' }}>
            <div style={{ position:'relative',flex:1,minWidth:180 }}>
              <Search size={14} style={{ position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'var(--text-secondary)' }}/>
              <input className="input-field" value={campSearch} onChange={e=>setCampSearch(e.target.value)} placeholder="Buscar campaña o marca..." style={{ paddingLeft:36 }}/>
            </div>
            <select className="select-field" style={{ width:'auto',minWidth:140 }} value={campFilterStatus} onChange={e=>setCampFilterStatus(e.target.value)}>
              <option value="all">Todos los estados</option>
              {Object.entries(CAMP_STATUS).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
            </select>
            <select className="select-field" style={{ width:'auto',minWidth:130 }} value={campFilterCiudad} onChange={e=>setCampFilterCiudad(e.target.value)}>
              <option value="all">Todas las ciudades</option>
              {[...new Set((campaigns||[]).map(c=>c.ciudad).filter(Boolean))].map(c=><option key={c}>{c}</option>)}
            </select>
          </div>
          {(() => {
            const filtered = (campaigns||[]).filter(c => {
              if (campSearch && !c.name.toLowerCase().includes(campSearch.toLowerCase()) && !(c.brandName||'').toLowerCase().includes(campSearch.toLowerCase())) return false
              if (campFilterStatus !== 'all' && c.status !== campFilterStatus) return false
              if (campFilterCiudad !== 'all' && c.ciudad !== campFilterCiudad) return false
              return true
            })
            return filtered.length === 0 ? (
              <div className="empty-state"><Star size={32} color="var(--primary-violet)"/><h3>Sin campañas</h3><p style={{color:'var(--text-secondary)'}}>Crea tu primera campaña</p></div>
            ) : (
            <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))',gap:14 }}>
              {filtered.map(camp=>{
                const cfg = CAMP_STATUS[camp.status] || CAMP_STATUS.planning
                const assignedInfs = (influencers||[]).filter(i=>(camp.influencerIds||[]).includes(i.id))
                const agencyEarn = Math.round((camp.budget||0)*(camp.agencyPct||20)/100)
                return (
                  <div key={camp.id} className="card" style={{ padding:18 }}>
                    <div style={{ display:'flex',alignItems:'flex-start',gap:10,marginBottom:12 }}>
                      <div style={{ flex:1,minWidth:0 }}>
                        <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:4,flexWrap:'wrap' }}>
                          <h3 style={{ fontSize:14,fontWeight:700 }}>{camp.name}</h3>
                          <span style={{ fontSize:10,padding:'2px 8px',borderRadius:10,background:cfg.bg,color:cfg.color,fontWeight:600 }}>{cfg.label}</span>
                        </div>
                        {camp.brandName&&<div style={{ fontSize:12,color:'var(--text-secondary)' }}>🏷️ {camp.brandName}</div>}
                        {camp.ciudad&&<div style={{ fontSize:11,color:'var(--text-secondary)',display:'flex',alignItems:'center',gap:4,marginTop:2 }}><MapPin size={10}/>{camp.ciudad}{camp.pais&&`, ${camp.pais}`}</div>}
                      </div>
                      <div style={{ display:'flex',gap:4,flexShrink:0 }}>
                        <button onClick={()=>setModal(camp)} style={{ width:28,height:28,borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',color:'var(--primary-violet-light)',border:'1px solid var(--border-violet)',background:'rgba(139,92,246,0.08)',transition:'all 0.15s' }}><Edit3 size={12}/></button>
                        <button onClick={()=>onDeleteCampaign&&onDeleteCampaign(camp.id)} style={{ width:28,height:28,borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',color:'#F87171',border:'1px solid rgba(239,68,68,0.3)',background:'rgba(239,68,68,0.08)',transition:'all 0.15s' }}><Trash2 size={12}/></button>
                      </div>
                    </div>
                    <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:10 }}>
                      <div style={{ padding:'8px 10px',borderRadius:8,background:'rgba(74,222,128,0.08)',border:'1px solid rgba(74,222,128,0.2)' }}>
                        <div style={{ fontSize:11,color:'var(--text-secondary)' }}>Ganancia Agencia</div>
                        <div style={{ fontSize:16,fontWeight:700,color:'#4ADE80' }}>{fmtMoney(agencyEarn)}</div>
                      </div>
                      <div style={{ padding:'8px 10px',borderRadius:8,background:'rgba(139,92,246,0.08)',border:'1px solid var(--border-violet)' }}>
                        <div style={{ fontSize:11,color:'var(--text-secondary)' }}>Presupuesto Total</div>
                        <div style={{ fontSize:16,fontWeight:700,color:'var(--primary-violet-light)' }}>{fmtMoney(camp.budget||0)}</div>
                      </div>
                    </div>
                    {assignedInfs.length > 0 && (
                      <div style={{ display:'flex',gap:4,alignItems:'center',fontSize:12,color:'var(--text-secondary)' }}>
                        <Users size={12} color="var(--primary-violet-light)"/>
                        {assignedInfs.slice(0,3).map(i=>i.name.split(' ')[0]).join(', ')}
                        {assignedInfs.length > 3 && ` +${assignedInfs.length-3}`}
                      </div>
                    )}
                    {camp.startDate&&<div style={{ fontSize:11,color:'var(--text-secondary)',marginTop:6 }}>{fmtDate(camp.startDate)} → {fmtDate(camp.endDate)}</div>}
                  </div>
                )
              })}
            </div>
            )
          })()}
        </div>
      )}

      {tab === 'crm' && (
        <InfluencersCRM
          influencers={influencers||[]}
          onSave={onSaveInfluencer||(()=>{})}
          onDelete={onDeleteInfluencer||(()=>{})}
        />
      )}

      {tab === 'collabs' && (
        <CollabsPanel
          collaborations={collaborations||[]}
          activationTypes={activationTypes||[]}
          influencers={influencers||[]}
          brands={brands||[]}
          onSave={onSaveCollaboration||(()=>{})}
          onDelete={onDeleteCollaboration||(()=>{})}
        />
      )}

      {modal && (
        <CampaignModal
          campaign={modal==='create'?null:modal}
          brands={allBrands}
          influencers={influencers||[]}
          onSave={onSaveCampaign||(async()=>null)}
          onClose={()=>setModal(null)}
          onAddBrand={b=>setLocalBrands(p=>[...p,b])}
          onGetCampaignInfluencers={onGetCampaignInfluencers}
          onCIAdd={onCIAdd}
          onCIUpdate={onCIUpdate}
          onCIRemove={onCIRemove}
          onPatchCampaignInfluencers={onPatchCampaignInfluencers}
        />
      )}
    </div>
  )
}
