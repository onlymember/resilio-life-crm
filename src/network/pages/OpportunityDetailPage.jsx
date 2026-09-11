import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Briefcase, ChevronLeft } from 'lucide-react'
import ActivityTimeline from '../components/ActivityTimeline.jsx'
import EmptyState from '../components/EmptyState.jsx'
import { t } from '../../i18n/index.js'
import { useTz } from '../utils/tz.js'
import { isoToDatetimeLocal, datetimeLocalToIso } from '../utils/date.js'
import {
  dbPatchOpportunity, dbGetGeography, dbListAllBrands,
  dbGetEntityTimeline,
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
    value:       data.value,
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

export default function OpportunityDetailPage({ currentUser }) {
  const { id }   = useParams()
  const navigate = useNavigate()
  const tz       = useTz()

  const [entity,    setEntity]    = useState(null)
  const [timeline,  setTimeline]  = useState([])
  const [geo,       setGeo]       = useState({ cities:[], countries:[] })
  const [brands,    setBrands]    = useState([])
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
      fetchOpportunity(id),
      dbGetEntityTimeline('opportunity', id).catch(() => []),
      dbGetGeography(),
      dbListAllBrands(),
    ]).then(([opp, tl, g, br]) => {
      setEntity(opp); setTimeline(tl); setGeo(g); setBrands(br)
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

        {/* VÍNCULOS */}
        {(entity.linkedCampaigns?.length > 0 || entity.linkedCollaborations?.length > 0) && (
          <div style={SH}>
            <SectionHeader label={t('opportunities.sections.links')} fields={[]} dirty={dirty}/>
            {entity.linkedCampaigns?.length > 0 && (
              <div style={{ marginBottom:8 }}>
                <div style={{ fontSize:10, color:'var(--text-secondary)', marginBottom:4, fontWeight:600 }}>Campañas</div>
                {entity.linkedCampaigns.map(c => (
                  <div key={c.id} style={{ fontSize:12, color:'var(--text-primary)', padding:'4px 0', borderBottom:'1px solid rgba(139,92,246,0.08)' }}>{c.name}</div>
                ))}
              </div>
            )}
            {entity.linkedCollaborations?.length > 0 && (
              <div>
                <div style={{ fontSize:10, color:'var(--text-secondary)', marginBottom:4, fontWeight:600 }}>Colaboraciones</div>
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
