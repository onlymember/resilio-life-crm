import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, CheckCircle, Plus, Trash2 } from 'lucide-react'
import ActivityTimeline from '../components/ActivityTimeline.jsx'
import EmptyState from '../components/EmptyState.jsx'
import { t } from '../../i18n/index.js'
import {
  dbPatchCollaboration, dbGetActivationTypes, dbGetGeography,
  dbGetEntityTimeline,
} from '../../lib/database.js'
import { supabase } from '../../lib/supabase.js'

const COLLAB_STATUSES   = ['proposed','confirmed','in_progress','content_pending','completed','cancelled']
const CONTENT_STATUSES  = ['pending','submitted','approved','rejected']
const PAYMENT_STATUSES  = ['pending','invoiced','paid']

async function fetchCollab(id) {
  const { data, error } = await supabase.from('collaborations')
    .select('*, influencers(id, name, username), brands(id, name), campaigns(id, name)')
    .eq('id', id).maybeSingle()
  if (error) throw error
  if (!data) return null
  return {
    id:               data.id,
    influencerId:     data.influencer_id,
    influencerName:   data.influencers?.name || data.influencers?.username || null,
    brandId:          data.brand_id,
    brandName:        data.brands?.name || null,
    campaignId:       data.campaign_id,
    campaignName:     data.campaigns?.name || null,
    activationTypeId: data.activation_type_id,
    status:           data.status,
    startDate:        data.start_date,
    endDate:          data.end_date,
    deliverables:     data.deliverables || [],
    contentStatus:    data.content_status,
    paymentStatus:    data.payment_status,
    amount:           data.amount,
    currency:         data.currency,
    results:          data.results ? JSON.stringify(data.results, null, 2) : '',
    notes:            data.notes,
    scouterId:        data.scouter_id,
    cityId:           data.city_id,
    createdAt:        data.created_at,
    updatedAt:        data.updated_at,
  }
}

const SH = { background: 'var(--glass-bg)', border: '1px solid var(--border-violet)', borderRadius: 14, padding: 16, marginBottom: 12 }
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

export default function CollaborationDetailPage() {
  const { id }   = useParams()
  const navigate = useNavigate()

  const [entity,    setEntity]    = useState(null)
  const [timeline,  setTimeline]  = useState([])
  const [actTypes,  setActTypes]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [dirty,     setDirty]     = useState({})
  const [saving,    setSaving]    = useState(false)
  const [saveError, setSaveError] = useState(null)

  const get = (f) => f in dirty ? dirty[f] : entity?.[f]
  const set = (f, v) => setDirty(prev => ({ ...prev, [f]: v }))
  const isDirty = Object.keys(dirty).length > 0

  useEffect(() => {
    if (!id) return
    setLoading(true)
    Promise.all([
      fetchCollab(id),
      dbGetEntityTimeline('collaboration', id).catch(() => []),
      dbGetActivationTypes(),
    ]).then(([c, tl, at]) => {
      setEntity(c); setTimeline(tl); setActTypes(at)
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
    if (isDirty && !window.confirm(t('collab.unsavedWarning'))) return
    navigate('/network/collaborations')
  }

  const handleSave = async () => {
    if (!isDirty || saving) return
    setSaving(true); setSaveError(null)
    try {
      // Parse results JSON if it changed
      const patch = { ...dirty }
      if ('results' in patch) {
        try { patch.results = JSON.parse(patch.results) } catch { patch.results = { raw: patch.results } }
      }
      await dbPatchCollaboration(entity.id, patch)
      setEntity(prev => ({ ...prev, ...dirty }))
      setDirty({})
    } catch(e) { setSaveError(e.message) }
    finally { setSaving(false) }
  }

  // Deliverables management
  const addDeliverable = () => {
    const current = get('deliverables') || []
    set('deliverables', [...current, ''])
  }
  const updateDeliverable = (i, val) => {
    const current = [...(get('deliverables') || [])]
    current[i] = val
    set('deliverables', current)
  }
  const removeDeliverable = (i) => {
    const current = (get('deliverables') || []).filter((_, j) => j !== i)
    set('deliverables', current)
  }

  if (loading) return <div style={{ padding:40, textAlign:'center', color:'var(--text-secondary)' }}>{t('loading.generic')}</div>
  if (!entity)  return <EmptyState icon={CheckCircle} title={t('errors.notFound')}/>

  const actType = actTypes.find(a => a.id === get('activationTypeId'))

  return (
    <div style={{ maxWidth:680, paddingBottom: isDirty ? 20 : 0 }}>

      {/* Sticky header */}
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 20px', borderBottom:'1px solid var(--border-violet)', position:'sticky', top:0, background:'var(--bg-primary)', zIndex:10 }}>
        <button onClick={handleBack} style={{ display:'flex', alignItems:'center', gap:4, color:'var(--primary-violet-light)', background:'none', border:'none', cursor:'pointer', fontSize:13, padding:'4px 0', flexShrink:0 }}>
          <ChevronLeft size={16}/>{t('nav.back')}
        </button>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:14, fontWeight:700, color:'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {entity.influencerName || '—'} × {entity.brandName || '—'}
          </div>
          {actType && (
            <div style={{ fontSize:11, color: actType.color || 'var(--text-secondary)', fontWeight:600 }}>{actType.name}</div>
          )}
        </div>
        {isDirty && (
          <button onClick={handleSave} disabled={saving} style={{ padding:'7px 16px', borderRadius:9, background:'var(--primary-violet)', color:'white', border:'none', cursor:'pointer', fontSize:12, fontWeight:700, flexShrink:0 }}>
            {saving ? t('brand.saving') : t('brand.save')}
          </button>
        )}
      </div>

      {saveError && (
        <div style={{ margin:'10px 20px', padding:'8px 12px', borderRadius:8, background:'rgba(248,113,113,0.08)', border:'1px solid rgba(248,113,113,0.25)', fontSize:12, color:'#F87171' }}>
          {saveError}
        </div>
      )}

      <div style={{ padding:'16px 20px', display:'flex', flexDirection:'column', gap:0 }}>

        {/* DATOS */}
        <div style={SH}>
          <SectionHeader label={t('collab.sections.data')} fields={['influencerName','brandName','campaignId','activationTypeId']} dirty={dirty}/>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            <div>
              <Label>{t('collab.fields.influencer')}</Label>
              <input value={entity.influencerName || ''} readOnly style={{ ...inputStyle, color:'var(--text-secondary)', cursor:'default' }}/>
            </div>
            <div>
              <Label>{t('collab.fields.brand')}</Label>
              <input value={entity.brandName || ''} readOnly style={{ ...inputStyle, color:'var(--text-secondary)', cursor:'default' }}/>
            </div>
            <div>
              <Label>{t('collab.fields.campaign')} <span style={{ fontSize:9, color:'var(--text-secondary)' }}>{t('collab.noCampaignHint')}</span></Label>
              <input value={entity.campaignName || t('collab.noCampaign')} readOnly style={{ ...inputStyle, color:'var(--text-secondary)', cursor:'default' }}/>
            </div>
            <div>
              <Label>{t('collab.fields.activationType')}</Label>
              <select value={get('activationTypeId') || ''} onChange={e => set('activationTypeId', e.target.value || null)} style={selectStyle}>
                <option value="">—</option>
                {actTypes.map(at => <option key={at.id} value={at.id}>{at.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* FECHAS */}
        <div style={SH}>
          <SectionHeader label={t('collab.sections.dates')} fields={['startDate','endDate']} dirty={dirty}/>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <div>
              <Label>{t('collab.fields.startDate')}</Label>
              <input type="date" value={get('startDate') || ''} onChange={e => set('startDate', e.target.value || null)} style={inputStyle}/>
            </div>
            <div>
              <Label>{t('collab.fields.endDate')}</Label>
              <input type="date" value={get('endDate') || ''} onChange={e => set('endDate', e.target.value || null)} style={inputStyle}/>
            </div>
          </div>
        </div>

        {/* ENTREGABLES */}
        <div style={SH}>
          <SectionHeader label={t('collab.sections.deliverables')} fields={['deliverables']} dirty={dirty}/>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {(get('deliverables') || []).map((d, i) => (
              <div key={i} style={{ display:'flex', gap:6 }}>
                <input
                  value={d}
                  onChange={e => updateDeliverable(i, e.target.value)}
                  placeholder={t('collab.deliverablePlaceholder')}
                  style={{ ...inputStyle, flex:1 }}
                />
                <button onClick={() => removeDeliverable(i)} style={{ padding:'6px 10px', borderRadius:8, background:'rgba(248,113,113,0.08)', border:'1px solid rgba(248,113,113,0.2)', color:'#F87171', cursor:'pointer' }}>
                  <Trash2 size={13}/>
                </button>
              </div>
            ))}
            <button onClick={addDeliverable} style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 12px', borderRadius:8, background:'rgba(139,92,246,0.07)', border:'1px solid var(--border-violet)', color:'var(--text-secondary)', cursor:'pointer', fontSize:12 }}>
              <Plus size={12}/>{t('collab.addDeliverable')}
            </button>
          </div>
        </div>

        {/* ESTADO */}
        <div style={SH}>
          <SectionHeader label={t('collab.sections.status')} fields={['status','contentStatus','paymentStatus']} dirty={dirty}/>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            <div>
              <Label>{t('collab.fields.status')}</Label>
              <select value={get('status') || 'proposed'} onChange={e => set('status', e.target.value)} style={selectStyle}>
                {COLLAB_STATUSES.map(s => <option key={s} value={s}>{t(`collab.status.${s}`)}</option>)}
              </select>
            </div>
            <div>
              <Label>{t('collab.fields.contentStatus')}</Label>
              <select value={get('contentStatus') || 'pending'} onChange={e => set('contentStatus', e.target.value)} style={selectStyle}>
                {CONTENT_STATUSES.map(s => <option key={s} value={s}>{t(`collab.contentStatus.${s}`)}</option>)}
              </select>
            </div>
            <div>
              <Label>{t('collab.fields.paymentStatus')}</Label>
              <select value={get('paymentStatus') || 'pending'} onChange={e => set('paymentStatus', e.target.value)} style={selectStyle}>
                {PAYMENT_STATUSES.map(s => <option key={s} value={s}>{t(`collab.paymentStatus.${s}`)}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* ECONOMÍA */}
        <div style={SH}>
          <SectionHeader label={t('collab.sections.economy')} fields={['amount','currency']} dirty={dirty}/>
          <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:10 }}>
            <div>
              <Label>{t('collab.fields.amount')}</Label>
              <input type="number" value={get('amount') ?? ''} onChange={e => set('amount', e.target.value ? Number(e.target.value) : null)} style={inputStyle}/>
            </div>
            <div>
              <Label>{t('collab.fields.currency')}</Label>
              <input value={get('currency') || ''} onChange={e => set('currency', e.target.value || null)} style={inputStyle}/>
            </div>
          </div>
        </div>

        {/* RESULTADOS */}
        <div style={SH}>
          <SectionHeader label={t('collab.sections.results')} fields={['results','notes']} dirty={dirty}/>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            <div>
              <Label>{t('collab.fields.results')}</Label>
              <textarea
                value={get('results') || ''}
                onChange={e => set('results', e.target.value)}
                rows={4}
                placeholder={t('collab.resultsPlaceholder')}
                style={{ ...inputStyle, resize:'vertical', lineHeight:1.6, fontFamily:'inherit' }}
              />
            </div>
            <div>
              <Label>{t('collab.fields.notes')}</Label>
              <textarea
                value={get('notes') || ''}
                onChange={e => set('notes', e.target.value || null)}
                rows={3}
                style={{ ...inputStyle, resize:'vertical', lineHeight:1.6, fontFamily:'inherit' }}
              />
            </div>
          </div>
        </div>

        {/* ACTIVIDAD */}
        <div style={SH}>
          <SectionHeader label={t('collab.sections.activity')} fields={[]} dirty={dirty}/>
          <ActivityTimeline activities={timeline}/>
        </div>
      </div>
    </div>
  )
}
