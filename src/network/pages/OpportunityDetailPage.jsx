import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Briefcase, ChevronLeft, ChevronDown, ChevronUp, Plus, Trash2, Check, X } from 'lucide-react'
import ActivityTimeline from '../components/ActivityTimeline.jsx'
import EmptyState from '../components/EmptyState.jsx'
import { t } from '../../i18n/index.js'
import { useTz } from '../utils/tz.js'
import { isoToDatetimeLocal, datetimeLocalToIso } from '../utils/date.js'
import {
  dbPatchOpportunity, dbGetGeography, dbListAllBrands,
  dbGetEntityTimeline, dbGetActivationTypes, dbGetInfluencers,
  dbGetOpportunityInfluencers, dbAddOpportunityInfluencer,
  dbUpdateOpportunityInfluencerStatus, dbDeleteOpportunityInfluencer,
  dbGetOpportunityInfluencerItems, dbAddOpportunityInfluencerItem,
  dbDeleteOpportunityInfluencerItem,
  dbConvertOpportunityToCollaboration,
} from '../../lib/database.js'
import { supabase } from '../../lib/supabase.js'

const STATUSES = ['new','qualifying','contacted','in_conversation','proposal','won','lost','on_hold']

const STATUS_COLOR = {
  new:'#9CA3AF', qualifying:'#60A5FA', contacted:'#A78BFA',
  in_conversation:'#FBBF24', proposal:'#22D3EE',
  won:'#4ADE80', lost:'#F87171', on_hold:'#6B7280',
}

async function fetchOpportunity(id) {
  const { data, error } = await supabase.from('opportunities')
    .select('*, brands(id,name), campaigns(id,name), collaborations(id,status)')
    .eq('id', id).maybeSingle()
  if (error) throw error
  if (!data) return null
  return {
    id:          data.id,
    title:       data.title,
    description: data.description  ?? null,
    source:      data.source       ?? null,
    brandId:     data.brand_id,
    brandName:   data.brands?.name || null,
    scouterId:   data.owner_scouter_id,
    cityId:      data.city_id,
    countryId:   data.country_id,
    status:      data.status,
    value:       data.estimated_value,
    currency:    data.currency,
    lostReason:  data.lost_reason  ?? null,
    notes:       data.notes,
    createdAt:   data.created_at,
    updatedAt:   data.updated_at,
    nextAction:   data.next_action    ?? null,
    nextActionAt: data.next_action_at ?? null,
    linkedCampaigns:     (data.campaigns     || []),
    linkedCollaborations:(data.collaborations || []),
  }
}

const SH = { background:'var(--glass-bg)', border:'1px solid var(--border-violet)', borderRadius:14, padding:16, marginBottom:12 }
const inputStyle = { width:'100%', padding:'8px 12px', borderRadius:8, background:'rgba(139,92,246,0.07)', border:'1px solid var(--border-violet)', color:'var(--text-primary)', fontSize:14, outline:'none' }
const selectStyle = { ...inputStyle, cursor:'pointer', appearance:'none' }

const SectionHeader = ({ label, fields, dirty }) => {
  const hasDirty = fields.some(f => f in dirty)
  return (
    <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:10, fontWeight:700, color:'var(--text-secondary)', textTransform:'uppercase', letterSpacing:1, marginBottom:12 }}>
      {label}{hasDirty && <div style={{ width:6, height:6, borderRadius:'50%', background:'#FBBF24' }}/>}
    </div>
  )
}

const Label = ({ children }) => (
  <label style={{ fontSize:10, fontWeight:600, color:'var(--text-secondary)', textTransform:'uppercase', letterSpacing:0.5, display:'block', marginBottom:4 }}>{children}</label>
)

const CAND_STATUS_COLOR = { proposed:'#9CA3AF', confirmed:'#34D399', declined:'#F87171' }

const fmtMoney = (n) => {
  if (!n) return '—'
  return n >= 1000000 ? `${(n/1000000).toFixed(1)}M` : n >= 1000 ? `${(n/1000).toFixed(0)}K` : String(n)
}

function AddItemInline({ candidateId, actTypes, onAdded }) {
  const [form, setForm] = useState({ activationTypeId: '', quantity: 1, unitValue: '' })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const valid = Number(form.quantity) > 0 && form.unitValue !== ''

  const handleAdd = async () => {
    if (!valid || saving) return
    setSaving(true)
    try {
      const item = await dbAddOpportunityInfluencerItem(
        candidateId, form.activationTypeId || null,
        Number(form.quantity), Number(form.unitValue)
      )
      onAdded(item)
      setForm({ activationTypeId: '', quantity: 1, unitValue: '' })
    } finally { setSaving(false) }
  }

  return (
    <div style={{ display:'flex', gap:6, alignItems:'center', flexWrap:'wrap', marginTop:6 }}>
      <select value={form.activationTypeId} onChange={e => set('activationTypeId', e.target.value)}
        style={{ padding:'4px 6px', borderRadius:6, background:'rgba(139,92,246,0.07)', border:'1px solid var(--border-violet)', color:'var(--text-primary)', fontSize:11, flex:'1 1 100px' }}>
        <option value="">— {t('opportunities.influencers.type')} —</option>
        {actTypes.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
      </select>
      <input type="number" min="1" value={form.quantity} onChange={e => set('quantity', e.target.value)}
        style={{ width:50, padding:'4px 6px', borderRadius:6, background:'rgba(139,92,246,0.07)', border:'1px solid var(--border-violet)', color:'var(--text-primary)', fontSize:11 }}
        placeholder={t('opportunities.influencers.qty')}/>
      <input type="number" min="0" step="any" value={form.unitValue} onChange={e => set('unitValue', e.target.value)}
        style={{ width:80, padding:'4px 6px', borderRadius:6, background:'rgba(139,92,246,0.07)', border:'1px solid var(--border-violet)', color:'var(--text-primary)', fontSize:11 }}
        placeholder={t('opportunities.influencers.unitValue')}/>
      <button onClick={handleAdd} disabled={!valid || saving}
        style={{ padding:'4px 10px', borderRadius:6, background: valid ? 'var(--primary-violet)' : 'rgba(139,92,246,0.3)', border:'none', color:'white', fontSize:11, cursor: valid ? 'pointer' : 'default' }}>
        {saving ? '…' : t('opportunities.influencers.addItem')}
      </button>
    </div>
  )
}

function CandidateRow({ candidate, actTypes, onStatusChange, onDelete, onTotalChange }) {
  const [expanded, setExpanded] = useState(false)
  const [items,    setItems]    = useState([])
  const [loadingItems, setLoadingItems] = useState(false)
  const color = CAND_STATUS_COLOR[candidate.status] || '#9CA3AF'

  const loadItems = useCallback(async () => {
    if (items.length > 0) return
    setLoadingItems(true)
    try {
      const its = await dbGetOpportunityInfluencerItems(candidate.id)
      setItems(its)
    } finally { setLoadingItems(false) }
  }, [candidate.id, items.length])

  const handleExpand = () => {
    if (!expanded) loadItems()
    setExpanded(p => !p)
  }

  const handleItemAdded = (item) => {
    const next = [...items, item]
    setItems(next)
    const total = next.reduce((s, it) => s + it.subtotal, 0)
    onTotalChange(candidate.id, total)
  }

  const handleDeleteItem = async (itemId) => {
    await dbDeleteOpportunityInfluencerItem(itemId)
    const next = items.filter(i => i.id !== itemId)
    setItems(next)
    const total = next.reduce((s, it) => s + it.subtotal, 0)
    onTotalChange(candidate.id, total)
  }

  return (
    <div style={{ borderBottom:'1px solid rgba(139,92,246,0.08)', paddingBottom:8, marginBottom:8 }}>
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <button onClick={handleExpand} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-secondary)', padding:2, flexShrink:0 }}>
          {expanded ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
        </button>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:13, fontWeight:600, color:'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{candidate.influencerName}</div>
          <span style={{ fontSize:10, fontWeight:600, color, background:`${color}15`, border:`1px solid ${color}30`, borderRadius:4, padding:'1px 5px' }}>
            {t(`opportunities.influencers.status.${candidate.status}`)}
          </span>
        </div>
        <div style={{ fontSize:12, fontWeight:700, color:'var(--primary-violet-light)', flexShrink:0 }}>
          {candidate.totalValue ? fmtMoney(candidate.totalValue) : '—'}
        </div>
        {candidate.status === 'proposed' && (
          <>
            <button onClick={() => onStatusChange(candidate.id, 'confirmed')} title={t('opportunities.influencers.confirm')}
              style={{ background:'rgba(52,211,153,0.1)', border:'1px solid rgba(52,211,153,0.3)', borderRadius:6, padding:'3px 6px', cursor:'pointer', color:'#34D399' }}>
              <Check size={12}/>
            </button>
            <button onClick={() => onStatusChange(candidate.id, 'declined')} title={t('opportunities.influencers.decline')}
              style={{ background:'rgba(248,113,113,0.1)', border:'1px solid rgba(248,113,113,0.3)', borderRadius:6, padding:'3px 6px', cursor:'pointer', color:'#F87171' }}>
              <X size={12}/>
            </button>
          </>
        )}
        <button onClick={() => onDelete(candidate.id)} title={t('opportunities.influencers.remove')}
          style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-secondary)', padding:2 }}>
          <Trash2 size={12}/>
        </button>
      </div>

      {expanded && (
        <div style={{ paddingLeft:22, marginTop:8 }}>
          {loadingItems ? (
            <div style={{ fontSize:11, color:'var(--text-secondary)' }}>…</div>
          ) : items.length === 0 ? (
            <div style={{ fontSize:11, color:'var(--text-secondary)', marginBottom:4 }}>{t('opportunities.influencers.noItems')}</div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:4, marginBottom:6 }}>
              {items.map(item => (
                <div key={item.id} style={{ display:'flex', alignItems:'center', gap:6, fontSize:11 }}>
                  <span style={{ flex:1, color:'var(--text-primary)' }}>
                    {item.activationTypeName || '—'} × {item.quantity}
                  </span>
                  <span style={{ color:'var(--text-secondary)' }}>{fmtMoney(item.unitValue)} × {item.quantity}</span>
                  <span style={{ fontWeight:600, color:'var(--primary-violet-light)', minWidth:40, textAlign:'right' }}>{fmtMoney(item.subtotal)}</span>
                  <button onClick={() => handleDeleteItem(item.id)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-secondary)', padding:1 }}>
                    <Trash2 size={10}/>
                  </button>
                </div>
              ))}
            </div>
          )}
          <AddItemInline candidateId={candidate.id} actTypes={actTypes} onAdded={handleItemAdded}/>
        </div>
      )}
    </div>
  )
}

function AddInfluencerSheet({ opportunityId, existing, onAdded, onClose }) {
  const [search,  setSearch]  = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [adding,  setAdding]  = useState(null)

  useEffect(() => {
    if (search.length < 2) { setResults([]); return }
    setLoading(true)
    dbGetInfluencers({ search, pageSize: 10, status: 'active' })
      .then(r => setResults(r.rows.filter(inf => !existing.includes(inf.id))))
      .finally(() => setLoading(false))
  }, [search, existing])

  const handleAdd = async (inf) => {
    setAdding(inf.id)
    try {
      const candidate = await dbAddOpportunityInfluencer(opportunityId, inf.id)
      onAdded(candidate)
      onClose()
    } catch (e) {
      console.warn(e.message)
    } finally { setAdding(null) }
  }

  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', zIndex:300, backdropFilter:'blur(2px)' }}/>
      <div style={{ position:'fixed', bottom:0, left:0, right:0, zIndex:301, background:'var(--bg-secondary)', borderRadius:'20px 20px 0 0', border:'1px solid var(--border-violet)', borderBottom:'none', maxHeight:'70vh', display:'flex', flexDirection:'column', animation:'slideUp 0.2s ease' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px 12px' }}>
          <span style={{ fontSize:15, fontWeight:700, color:'var(--text-primary)' }}>{t('opportunities.influencers.add')}</span>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'var(--text-secondary)', cursor:'pointer' }}><X size={18}/></button>
        </div>
        <div style={{ padding:'0 20px 12px' }}>
          <input value={search} onChange={e => setSearch(e.target.value)} autoFocus
            placeholder={t('opportunities.influencers.searchPlaceholder')}
            style={{ width:'100%', padding:'8px 12px', borderRadius:8, background:'rgba(139,92,246,0.07)', border:'1px solid var(--border-violet)', color:'var(--text-primary)', fontSize:13, outline:'none' }}/>
        </div>
        <div style={{ flex:1, overflowY:'auto', padding:'0 20px 24px' }}>
          {loading && <div style={{ fontSize:12, color:'var(--text-secondary)', textAlign:'center', padding:16 }}>…</div>}
          {!loading && search.length >= 2 && results.length === 0 && (
            <div style={{ fontSize:12, color:'var(--text-secondary)', textAlign:'center', padding:16 }}>{t('opportunities.influencers.noResults')}</div>
          )}
          {results.map(inf => (
            <button key={inf.id} onClick={() => handleAdd(inf)} disabled={adding === inf.id}
              style={{ width:'100%', textAlign:'left', padding:'10px 0', background:'none', border:'none', borderBottom:'1px solid rgba(139,92,246,0.08)', cursor:'pointer', display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:600, color:'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{inf.name}</div>
                {inf.username && <div style={{ fontSize:11, color:'var(--text-secondary)' }}>@{inf.username}</div>}
              </div>
              <Plus size={14} style={{ color:'var(--primary-violet-light)', flexShrink:0 }}/>
            </button>
          ))}
        </div>
      </div>
    </>
  )
}

export default function OpportunityDetailPage({ currentUser }) {
  const { id }   = useParams()
  const navigate = useNavigate()
  const tz       = useTz()

  const [entity,      setEntity]      = useState(null)
  const [timeline,    setTimeline]    = useState([])
  const [geo,         setGeo]         = useState({ cities:[], countries:[] })
  const [brands,      setBrands]      = useState([])
  const [loading,     setLoading]     = useState(true)
  const [dirty,       setDirty]       = useState({})
  const [saving,      setSaving]      = useState(false)
  const [saveError,   setSaveError]   = useState(null)
  const [candidates,  setCandidates]  = useState([])
  const [actTypes,    setActTypes]    = useState([])
  const [addInfOpen,  setAddInfOpen]  = useState(false)
  const [converting,  setConverting]  = useState(false)
  const [convertResult, setConvertResult] = useState(null)
  const [convertError,  setConvertError]  = useState(null)

  const get = (f) => f in dirty ? dirty[f] : entity?.[f]
  const set = (f, v) => setDirty(prev => ({ ...prev, [f]: v }))
  const isDirty = Object.keys(dirty).length > 0

  useEffect(() => {
    if (!id) return
    setLoading(true)
    Promise.all([
      fetchOpportunity(id),
      dbGetEntityTimeline('opportunity', id).catch(() => []),
      dbGetGeography(),
      dbListAllBrands(),
      dbGetOpportunityInfluencers(id).catch(() => []),
      dbGetActivationTypes().catch(() => []),
    ]).then(([opp, tl, g, br, cands, acts]) => {
      setEntity(opp); setTimeline(tl); setGeo(g); setBrands(br)
      setCandidates(cands); setActTypes(acts)
    }).catch(() => setEntity(null))
    .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (!isDirty) return
    const h = (e) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', h)
    return () => window.removeEventListener('beforeunload', h)
  }, [isDirty])

  const handleBack = () => {
    if (isDirty && !window.confirm(t('opportunities.unsavedWarning'))) return
    navigate('/network/opportunities')
  }

  const handleSave = async () => {
    if (!isDirty || saving) return
    setSaving(true); setSaveError(null)
    try {
      await dbPatchOpportunity(entity.id, dirty)
      setEntity(prev => ({ ...prev, ...dirty }))
      setDirty({})
    } catch(e) { setSaveError(e.message) }
    finally { setSaving(false) }
  }

  const handleCandidateStatusChange = async (candidateId, status) => {
    await dbUpdateOpportunityInfluencerStatus(candidateId, status).catch(() => {})
    setCandidates(prev => prev.map(c => c.id === candidateId ? { ...c, status } : c))
  }

  const handleCandidateDelete = async (candidateId) => {
    await dbDeleteOpportunityInfluencer(candidateId).catch(() => {})
    setCandidates(prev => prev.filter(c => c.id !== candidateId))
  }

  const handleCandidateTotalChange = (candidateId, total) => {
    setCandidates(prev => prev.map(c => c.id === candidateId ? { ...c, totalValue: total } : c))
  }

  const handleCandidateAdded = (candidate) => {
    setCandidates(prev => [...prev, candidate])
  }

  const handleConvert = async () => {
    setConverting(true)
    setConvertError(null)
    setConvertResult(null)
    try {
      await dbConvertOpportunityToCollaboration(entity.id)
      const updated = await fetchOpportunity(entity.id)
      setEntity(updated)
      setConvertResult(updated.linkedCollaborations.length)
    } catch(e) {
      setConvertError(e.message)
    } finally {
      setConverting(false)
    }
  }

  if (loading) return <div style={{ padding:40, textAlign:'center', color:'var(--text-secondary)' }}>{t('loading.generic')}</div>
  if (!entity)  return <EmptyState icon={Briefcase} title={t('errors.notFound')}/>

  const statusColor = STATUS_COLOR[get('status')] || '#9CA3AF'
  const nextActionLocal = isoToDatetimeLocal(get('nextActionAt'), tz)

  return (
    <div style={{ maxWidth:680, paddingBottom: isDirty ? 20 : 0 }}>

      {/* Sticky header */}
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 20px', borderBottom:'1px solid var(--border-violet)', position:'sticky', top:0, background:'var(--bg-primary)', zIndex:10 }}>
        <button onClick={handleBack} style={{ display:'flex', alignItems:'center', gap:4, color:'var(--primary-violet-light)', background:'none', border:'none', cursor:'pointer', fontSize:13, padding:'4px 0', flexShrink:0 }}>
          <ChevronLeft size={16}/>{t('nav.back')}
        </button>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:15, fontWeight:700, color:'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{entity.title}</div>
          <span style={{ fontSize:10, fontWeight:700, color:statusColor, background:`${statusColor}15`, border:`1px solid ${statusColor}30`, borderRadius:6, padding:'1px 6px' }}>
            {t(`opportunities.status.${get('status')}`)}
          </span>
        </div>
        {isDirty && (
          <button onClick={handleSave} disabled={saving} style={{ padding:'7px 16px', borderRadius:9, background:'var(--primary-violet)', color:'white', border:'none', cursor:'pointer', fontSize:12, fontWeight:700, flexShrink:0 }}>
            {saving ? t('brand.saving') : t('brand.save')}
          </button>
        )}
      </div>

      {saveError && (
        <div style={{ margin:'10px 20px', padding:'8px 12px', borderRadius:8, background:'rgba(248,113,113,0.08)', border:'1px solid rgba(248,113,113,0.25)', fontSize:12, color:'#F87171' }}>{saveError}</div>
      )}

      <div style={{ padding:'16px 20px' }}>

        {/* DATOS */}
        <div style={SH}>
          <SectionHeader label={t('opportunities.sections.data')} fields={['title','description','source','brandId']} dirty={dirty}/>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            <div>
              <Label>{t('opportunities.fields.title')}</Label>
              <input value={get('title') || ''} onChange={e => set('title', e.target.value)} style={inputStyle}/>
            </div>
            <div>
              <Label>{t('opportunities.fields.brand')}</Label>
              <select value={get('brandId') || ''} onChange={e => set('brandId', e.target.value || null)} style={selectStyle}>
                <option value="">—</option>
                {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <Label>{t('opportunities.fields.description')}</Label>
              <textarea value={get('description') || ''} onChange={e => set('description', e.target.value || null)} rows={3} style={{ ...inputStyle, resize:'vertical', lineHeight:1.6, fontFamily:'inherit' }}/>
            </div>
            <div>
              <Label>{t('opportunities.fields.source')}</Label>
              <input value={get('source') || ''} onChange={e => set('source', e.target.value || null)} style={inputStyle}/>
            </div>
          </div>
        </div>

        {/* UBICACIÓN */}
        <div style={SH}>
          <SectionHeader label={t('opportunities.sections.location')} fields={['cityId','countryId']} dirty={dirty}/>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            <div>
              <Label>{t('opportunities.fields.city')}</Label>
              <select value={get('cityId') || ''} onChange={e => set('cityId', e.target.value || null)} style={selectStyle}>
                <option value="">—</option>
                {geo.cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <Label>{t('opportunities.fields.country')}</Label>
              <select value={get('countryId') || ''} onChange={e => set('countryId', e.target.value || null)} style={selectStyle}>
                <option value="">—</option>
                {geo.countries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* PIPELINE */}
        <div style={SH}>
          <SectionHeader label={t('opportunities.sections.pipeline')} fields={['status']} dirty={dirty}/>
          <div>
            <Label>{t('opportunities.fields.status')}</Label>
            <select value={get('status') || 'new'} onChange={e => set('status', e.target.value)} style={{ ...selectStyle, color: statusColor, borderColor: `${statusColor}40` }}>
              {STATUSES.map(s => <option key={s} value={s}>{t(`opportunities.status.${s}`)}</option>)}
            </select>
          </div>
        </div>

        {/* VALOR */}
        <div style={SH}>
          <SectionHeader label={t('opportunities.sections.value')} fields={['value','currency']} dirty={dirty}/>
          <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:10 }}>
            <div>
              <Label>{t('opportunities.fields.value')}</Label>
              <input type="number" value={get('value') ?? ''} onChange={e => set('value', e.target.value ? Number(e.target.value) : null)} style={inputStyle}/>
            </div>
            <div>
              <Label>{t('opportunities.fields.currency')}</Label>
              <input value={get('currency') || ''} onChange={e => set('currency', e.target.value || null)} style={inputStyle}/>
            </div>
          </div>
        </div>

        {/* RELACIÓN */}
        <div style={SH}>
          <SectionHeader label={t('opportunities.sections.relationship')} fields={['nextAction','nextActionAt','notes']} dirty={dirty}/>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            <div>
              <Label>{t('opportunities.fields.nextAction')}</Label>
              <input value={get('nextAction') || ''} onChange={e => set('nextAction', e.target.value || null)} style={inputStyle}/>
            </div>
            <div>
              <Label>{t('opportunities.fields.nextActionAt')}</Label>
              <input
                type="datetime-local"
                value={nextActionLocal}
                onChange={e => set('nextActionAt', e.target.value ? datetimeLocalToIso(e.target.value, tz) : null)}
                style={inputStyle}
              />
            </div>
            <div>
              <Label>{t('opportunities.fields.notes')}</Label>
              <textarea value={get('notes') || ''} onChange={e => set('notes', e.target.value || null)} rows={3} style={{ ...inputStyle, resize:'vertical', lineHeight:1.6, fontFamily:'inherit' }}/>
            </div>
          </div>
        </div>

        {/* CIERRE — only when lost */}
        {get('status') === 'lost' && (
          <div style={SH}>
            <SectionHeader label={t('opportunities.sections.closing')} fields={['lostReason']} dirty={dirty}/>
            <div>
              <Label>{t('opportunities.fields.lostReason')}</Label>
              <textarea value={get('lostReason') || ''} onChange={e => set('lostReason', e.target.value || null)} rows={3} style={{ ...inputStyle, resize:'vertical', lineHeight:1.6, fontFamily:'inherit' }}/>
            </div>
          </div>
        )}

        {/* INFLUENCERS CANDIDATOS */}
        <div style={SH}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
            <div style={{ fontSize:10, fontWeight:700, color:'var(--text-secondary)', textTransform:'uppercase', letterSpacing:1 }}>
              {t('opportunities.influencers.title')}
            </div>
            <button onClick={() => setAddInfOpen(true)}
              style={{ display:'flex', alignItems:'center', gap:4, padding:'4px 10px', borderRadius:7, background:'var(--primary-violet)', border:'none', color:'white', fontSize:11, fontWeight:700, cursor:'pointer' }}>
              <Plus size={11}/>{t('opportunities.influencers.add')}
            </button>
          </div>
          {candidates.length === 0 ? (
            <div style={{ fontSize:12, color:'var(--text-secondary)', textAlign:'center', padding:'12px 0' }}>
              {t('opportunities.influencers.empty')}
            </div>
          ) : (
            candidates.map(c => (
              <CandidateRow
                key={c.id}
                candidate={c}
                actTypes={actTypes}
                onStatusChange={handleCandidateStatusChange}
                onDelete={handleCandidateDelete}
                onTotalChange={handleCandidateTotalChange}
              />
            ))
          )}
          {candidates.length > 0 && (
            <div style={{ display:'flex', justifyContent:'flex-end', paddingTop:4, fontSize:12, fontWeight:700, color:'var(--primary-violet-light)' }}>
              {t('opportunities.influencers.total')}: {fmtMoney(candidates.reduce((s,c) => s + (c.totalValue||0), 0))}
            </div>
          )}

          {get('status') === 'won' && (() => {
            const confirmed = candidates.filter(c => c.status === 'confirmed')
            const hasLinked = entity.linkedCollaborations?.length > 0
            const totalConf = confirmed.reduce((s, c) => s + (c.totalValue || 0), 0)
            return (
              <div style={{ marginTop:12, padding:12, borderRadius:10, background:'rgba(139,92,246,0.05)', border:'1px solid var(--border-violet)' }}>
                <div style={{ fontSize:10, fontWeight:700, color:'var(--text-secondary)', textTransform:'uppercase', letterSpacing:1, marginBottom:8 }}>
                  {t('opportunities.convert.title')}
                </div>
                {confirmed.length === 0 ? (
                  <div style={{ fontSize:12, color:'var(--text-secondary)' }}>
                    {t('opportunities.convert.needConfirmed')}
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize:12, color:'var(--text-secondary)', marginBottom:8 }}>
                      {t('opportunities.convert.willConvert', { n: confirmed.length, amount: fmtMoney(totalConf) })}
                    </div>
                    <button
                      onClick={handleConvert}
                      disabled={converting}
                      style={{ padding:'7px 16px', borderRadius:9, background: converting ? 'rgba(139,92,246,0.3)' : 'var(--primary-violet)', color:'white', border:'none', cursor: converting ? 'default' : 'pointer', fontSize:12, fontWeight:700 }}
                    >
                      {converting ? '…' : hasLinked ? t('opportunities.convert.buttonSync') : t('opportunities.convert.button')}
                    </button>
                  </div>
                )}
                {convertResult != null && (
                  <div style={{ marginTop:8, fontSize:12, color:'#34D399' }}>
                    {t('opportunities.convert.done', { n: convertResult })}
                  </div>
                )}
                {convertError && (
                  <div style={{ marginTop:8, fontSize:12, color:'#F87171' }}>
                    {t('opportunities.convert.error', { msg: convertError })}
                  </div>
                )}
              </div>
            )
          })()}
        </div>

        {addInfOpen && (
          <AddInfluencerSheet
            opportunityId={entity.id}
            existing={candidates.map(c => c.influencerId)}
            onAdded={handleCandidateAdded}
            onClose={() => setAddInfOpen(false)}
          />
        )}

        {/* VÍNCULOS */}
        {(entity.linkedCampaigns?.length > 0 || entity.linkedCollaborations?.length > 0) && (
          <div style={SH}>
            <SectionHeader label={t('opportunities.sections.links')} fields={[]} dirty={dirty}/>
            {entity.linkedCampaigns?.length > 0 && (
              <div style={{ marginBottom:8 }}>
                <div style={{ fontSize:10, color:'var(--text-secondary)', marginBottom:4, fontWeight:600 }}>{t('opportunities.linkedCampaignsLabel')}</div>
                {entity.linkedCampaigns.map(c => (
                  <div key={c.id} style={{ fontSize:12, color:'var(--text-primary)', padding:'4px 0', borderBottom:'1px solid rgba(139,92,246,0.08)' }}>{c.name}</div>
                ))}
              </div>
            )}
            {entity.linkedCollaborations?.length > 0 && (
              <div>
                <div style={{ fontSize:10, color:'var(--text-secondary)', marginBottom:4, fontWeight:600 }}>{t('opportunities.linkedCollaborationsLabel')}</div>
                {entity.linkedCollaborations.map(c => (
                  <div key={c.id} style={{ fontSize:12, color:'var(--text-primary)', padding:'4px 0', borderBottom:'1px solid rgba(139,92,246,0.08)' }}>
                    {t(`collab.status.${c.status}`)}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ACTIVIDAD */}
        <div style={SH}>
          <SectionHeader label={t('opportunities.sections.activity')} fields={[]} dirty={dirty}/>
          <ActivityTimeline activities={timeline}/>
        </div>
      </div>
    </div>
  )
}
