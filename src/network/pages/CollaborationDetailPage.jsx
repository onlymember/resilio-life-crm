import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, CheckCircle, Plus, Trash2, ExternalLink, Check } from 'lucide-react'
import ActivityTimeline from '../components/ActivityTimeline.jsx'
import AssignModal from '../components/AssignModal.jsx'
import EmptyState from '../components/EmptyState.jsx'
import { t } from '../../i18n/index.js'
import { COMMAND_ROLES } from '../routes.js'
import {
  dbPatchCollaboration, dbGetActivationTypes,
  dbGetEntityTimeline,
  dbGetCollaborationDeliverables, dbAddCollaborationDeliverable,
  dbUpdateCollaborationDeliverable, dbDeleteCollaborationDeliverable,
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
    id:                  data.id,
    influencerId:        data.influencer_id,
    influencerName:      data.influencers?.name || data.influencers?.username || null,
    brandId:             data.brand_id,
    brandName:           data.brands?.name || null,
    campaignId:          data.campaign_id,
    campaignName:        data.campaigns?.name || null,
    opportunityId:       data.opportunity_id ?? null,
    activationTypeId:    data.activation_type_id,
    status:              data.status,
    startDate:           data.start_date,
    endDate:             data.end_date,
    deliverables:        data.deliverables || [],
    contentStatus:       data.content_status,
    paymentStatus:       data.payment_status,
    amount:              data.amount,
    currency:            data.currency,
    results:             data.results ? JSON.stringify(data.results, null, 2) : '',
    notes:               data.notes,
    nextAction:          data.next_action ?? null,
    nextActionAt:        data.next_action_at ? data.next_action_at.slice(0,10) : null,
    contractUrl:         data.contract_url ?? null,
    invoiceUrl:          data.invoice_url ?? null,
    reach:               data.reach ?? null,
    impressions:         data.impressions ?? null,
    likes:               data.likes ?? null,
    comments:            data.comments ?? null,
    shares:              data.shares ?? null,
    saves:               data.saves ?? null,
    linkClicks:          data.link_clicks ?? null,
    engagementRate:      data.engagement_rate ?? null,
    estimatedMediaValue: data.estimated_media_value ?? null,
    resultsNotes:        data.results_notes ?? null,
    scouterId:           data.scouter_id,
    cityId:              data.city_id,
    createdAt:           data.created_at,
    updatedAt:           data.updated_at,
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

const numField = (val) => val == null ? '' : String(val)
const parseNum = (s) => s === '' ? null : Number(s)

export default function CollaborationDetailPage({ currentUser }) {
  const { id }   = useParams()
  const navigate = useNavigate()
  const canReassign = COMMAND_ROLES.includes(currentUser?.rol)

  const [entity,    setEntity]    = useState(null)
  const [timeline,  setTimeline]  = useState([])
  const [actTypes,  setActTypes]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [dirty,     setDirty]     = useState({})
  const [saving,    setSaving]    = useState(false)
  const [saveError, setSaveError] = useState(null)

  // Structured deliverables (collaboration_deliverables table)
  const [deliverables,    setDeliverables]    = useState([])
  const [delivLoading,    setDelivLoading]    = useState(false)
  const [addingDeliv,     setAddingDeliv]     = useState(false)
  const [newDelivDesc,    setNewDelivDesc]    = useState('')
  const [newDelivDate,    setNewDelivDate]    = useState('')
  const [delivSaving,     setDelivSaving]     = useState(false)
  const [completingNext,  setCompletingNext]  = useState(false)
  const [legacyExpanded,  setLegacyExpanded]  = useState(false)
  const [assignOpen,      setAssignOpen]      = useState(false)

  const get = (f) => f in dirty ? dirty[f] : entity?.[f]
  const set = (f, v) => setDirty(prev => ({ ...prev, [f]: v }))
  const isDirty = Object.keys(dirty).length > 0

  const loadDeliverables = useCallback(async (collabId) => {
    setDelivLoading(true)
    try {
      const rows = await dbGetCollaborationDeliverables(collabId)
      setDeliverables(rows)
    } catch(e) { console.error('loadDeliverables:', e.message) }
    finally { setDelivLoading(false) }
  }, [])

  useEffect(() => {
    if (!id) return
    setLoading(true)
    Promise.all([
      fetchCollab(id),
      dbGetEntityTimeline('collaboration', id).catch(() => []),
      dbGetActivationTypes(),
    ]).then(([c, tl, at]) => {
      setEntity(c); setTimeline(tl); setActTypes(at)
      if (c) loadDeliverables(c.id)
    }).catch(() => setEntity(null))
    .finally(() => setLoading(false))
  }, [id, loadDeliverables])

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

  const handleCompleteNextAction = async () => {
    if (completingNext) return
    setCompletingNext(true)
    try {
      await dbPatchCollaboration(entity.id, { nextAction: null, nextActionAt: null })
      setEntity(prev => ({ ...prev, nextAction: null, nextActionAt: null }))
      setDirty(prev => { const d = { ...prev }; delete d.nextAction; delete d.nextActionAt; return d })
    } catch(e) { setSaveError(e.message) }
    finally { setCompletingNext(false) }
  }

  const handleAddDeliverable = async () => {
    if (!newDelivDesc.trim() || delivSaving) return
    setDelivSaving(true)
    try {
      const row = await dbAddCollaborationDeliverable(entity.id, { description: newDelivDesc.trim(), dueDate: newDelivDate || null, sortOrder: deliverables.length })
      setDeliverables(prev => [...prev, row])
      setNewDelivDesc(''); setNewDelivDate(''); setAddingDeliv(false)
    } catch(e) { console.error('addDeliverable:', e.message) }
    finally { setDelivSaving(false) }
  }

  const handleToggleDeliverable = async (deliv) => {
    const nextStatus = deliv.status === 'approved' ? 'pending' : 'approved'
    try {
      const updated = await dbUpdateCollaborationDeliverable(deliv.id, { status: nextStatus })
      setDeliverables(prev => prev.map(d => d.id === deliv.id ? updated : d))
    } catch(e) { console.error('toggleDeliverable:', e.message) }
  }

  const handleDeleteDeliverable = async (delivId) => {
    try {
      await dbDeleteCollaborationDeliverable(delivId)
      setDeliverables(prev => prev.filter(d => d.id !== delivId))
    } catch(e) { console.error('deleteDeliverable:', e.message) }
  }

  if (loading) return <div style={{ padding:40, textAlign:'center', color:'var(--text-secondary)' }}>{t('loading.generic')}</div>
  if (!entity)  return <EmptyState icon={CheckCircle} title={t('errors.notFound')}/>

  const actType = actTypes.find(a => a.id === get('activationTypeId'))
  const legacyDeliverables = entity.deliverables || []
  const hasNextAction = !!(get('nextAction') || get('nextActionAt'))

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
        {canReassign && (
          <button onClick={() => setAssignOpen(true)} style={{ fontSize:11, fontWeight:600, color:'var(--primary-violet-light)', background:'rgba(139,92,246,0.1)', border:'1px solid rgba(139,92,246,0.3)', borderRadius:8, padding:'5px 10px', cursor:'pointer', flexShrink:0 }}>
            {t('network.assign')}
          </button>
        )}
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
          <SectionHeader label={t('collab.sections.data')} fields={['activationTypeId']} dirty={dirty}/>
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
            {entity.opportunityId && (
              <div>
                <Label>{t('collab.fromOpportunity')}</Label>
                <button
                  onClick={() => navigate(`/network/opportunities/${entity.opportunityId}`)}
                  style={{ display:'flex', alignItems:'center', gap:6, width:'100%', padding:'8px 12px', borderRadius:8, background:'rgba(139,92,246,0.07)', border:'1px solid var(--border-violet)', color:'var(--primary-violet-light)', fontSize:13, cursor:'pointer', fontWeight:600 }}
                >
                  <ExternalLink size={13}/>{t('collab.fromOpportunityLink')}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* PRÓXIMA ACCIÓN */}
        <div style={SH}>
          <SectionHeader label={t('collab.sections.nextAction')} fields={['nextAction','nextActionAt']} dirty={dirty}/>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            <div>
              <Label>{t('collab.fields.nextAction')}</Label>
              <textarea
                value={get('nextAction') || ''}
                onChange={e => set('nextAction', e.target.value || null)}
                rows={2}
                placeholder={t('collab.nextActionPlaceholder')}
                style={{ ...inputStyle, resize:'vertical', lineHeight:1.5, fontFamily:'inherit' }}
              />
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr auto', gap:10, alignItems:'flex-end' }}>
              <div>
                <Label>{t('collab.fields.nextActionAt')}</Label>
                <input type="date" value={get('nextActionAt') || ''} onChange={e => set('nextActionAt', e.target.value || null)} style={inputStyle}/>
              </div>
              {hasNextAction && (
                <button
                  onClick={handleCompleteNextAction}
                  disabled={completingNext}
                  style={{ padding:'8px 14px', borderRadius:8, background:'rgba(52,211,153,0.1)', border:'1px solid rgba(52,211,153,0.3)', color:'#34D399', cursor:'pointer', fontSize:12, fontWeight:700, display:'flex', alignItems:'center', gap:5, flexShrink:0, height:36 }}
                >
                  <Check size={13}/>{t('collab.nextActionComplete')}
                </button>
              )}
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

        {/* ENTREGABLES ESTRUCTURADOS */}
        <div style={SH}>
          <SectionHeader label={t('collab.sections.deliverables')} fields={[]} dirty={dirty}/>
          {delivLoading ? (
            <div style={{ fontSize:12, color:'var(--text-secondary)', padding:'8px 0' }}>{t('loading.generic')}</div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {deliverables.map(d => (
                <div key={d.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 10px', borderRadius:8, background:'rgba(139,92,246,0.04)', border:'1px solid var(--border-violet)' }}>
                  <button
                    onClick={() => handleToggleDeliverable(d)}
                    style={{ width:20, height:20, borderRadius:6, border:`2px solid ${d.status === 'approved' ? '#34D399' : 'rgba(139,92,246,0.4)'}`, background: d.status === 'approved' ? 'rgba(52,211,153,0.15)' : 'transparent', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0 }}
                  >
                    {d.status === 'approved' && <Check size={11} color="#34D399"/>}
                  </button>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, color: d.status === 'approved' ? 'var(--text-secondary)' : 'var(--text-primary)', textDecoration: d.status === 'approved' ? 'line-through' : 'none', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {d.description}
                    </div>
                    {d.dueDate && (
                      <div style={{ fontSize:10, color:'var(--text-secondary)', marginTop:2 }}>
                        {t('collab.deliverables.dueDate')}: {new Date(d.dueDate).toLocaleDateString('es-AR', { day:'2-digit', month:'short' })}
                      </div>
                    )}
                  </div>
                  <button onClick={() => handleDeleteDeliverable(d.id)} style={{ padding:4, background:'none', border:'none', color:'rgba(248,113,113,0.6)', cursor:'pointer', flexShrink:0 }}>
                    <Trash2 size={13}/>
                  </button>
                </div>
              ))}

              {addingDeliv ? (
                <div style={{ display:'flex', flexDirection:'column', gap:6, padding:'10px', borderRadius:8, background:'rgba(139,92,246,0.04)', border:'1px solid var(--border-violet)' }}>
                  <input
                    autoFocus
                    value={newDelivDesc}
                    onChange={e => setNewDelivDesc(e.target.value)}
                    placeholder={t('collab.deliverables.placeholder')}
                    style={{ ...inputStyle, fontSize:13 }}
                    onKeyDown={e => e.key === 'Enter' && handleAddDeliverable()}
                  />
                  <div style={{ display:'grid', gridTemplateColumns:'1fr auto auto', gap:6, alignItems:'center' }}>
                    <input type="date" value={newDelivDate} onChange={e => setNewDelivDate(e.target.value)} style={{ ...inputStyle, fontSize:12 }}/>
                    <button onClick={handleAddDeliverable} disabled={!newDelivDesc.trim() || delivSaving}
                      style={{ padding:'7px 14px', borderRadius:8, background:'var(--primary-violet)', border:'none', color:'white', fontSize:12, fontWeight:700, cursor:'pointer' }}>
                      {t('form.save')}
                    </button>
                    <button onClick={() => { setAddingDeliv(false); setNewDelivDesc(''); setNewDelivDate('') }}
                      style={{ padding:'7px 12px', borderRadius:8, background:'transparent', border:'1px solid var(--border-violet)', color:'var(--text-secondary)', fontSize:12, cursor:'pointer' }}>
                      {t('form.cancel')}
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setAddingDeliv(true)} style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 12px', borderRadius:8, background:'rgba(139,92,246,0.07)', border:'1px solid var(--border-violet)', color:'var(--text-secondary)', cursor:'pointer', fontSize:12 }}>
                  <Plus size={12}/>{t('collab.deliverables.add')}
                </button>
              )}
            </div>
          )}
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

        {/* DOCUMENTOS */}
        <div style={SH}>
          <SectionHeader label={t('collab.sections.documents')} fields={['contractUrl','invoiceUrl']} dirty={dirty}/>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            <div>
              <Label>{t('collab.contractUrl')}</Label>
              <input value={get('contractUrl') || ''} onChange={e => set('contractUrl', e.target.value || null)} placeholder="https://…" style={inputStyle}/>
            </div>
            <div>
              <Label>{t('collab.invoiceUrl')}</Label>
              <input value={get('invoiceUrl') || ''} onChange={e => set('invoiceUrl', e.target.value || null)} placeholder="https://…" style={inputStyle}/>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div style={SH}>
          <SectionHeader label={t('collab.sections.kpis')} fields={['reach','impressions','likes','comments','shares','saves','linkClicks','engagementRate','estimatedMediaValue','resultsNotes']} dirty={dirty}/>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
            {[
              ['reach',               t('collab.kpis.reach')],
              ['impressions',         t('collab.kpis.impressions')],
              ['likes',               t('collab.kpis.likes')],
              ['comments',            t('collab.kpis.comments')],
              ['shares',              t('collab.kpis.shares')],
              ['saves',               t('collab.kpis.saves')],
              ['linkClicks',          t('collab.kpis.linkClicks')],
              ['estimatedMediaValue', t('collab.kpis.estimatedMediaValue')],
            ].map(([field, label]) => (
              <div key={field}>
                <Label>{label}</Label>
                <input type="number" min="0" value={numField(get(field))} onChange={e => set(field, parseNum(e.target.value))} style={inputStyle}/>
              </div>
            ))}
          </div>
          <div>
            <Label>{t('collab.kpis.engagementRate')} (%)</Label>
            <input type="number" min="0" step="0.01" value={numField(get('engagementRate'))} onChange={e => set('engagementRate', parseNum(e.target.value))} style={inputStyle}/>
          </div>
          <div style={{ marginTop:10 }}>
            <Label>{t('collab.kpis.resultsNotes')}</Label>
            <textarea
              value={get('resultsNotes') || ''}
              onChange={e => set('resultsNotes', e.target.value || null)}
              rows={3}
              style={{ ...inputStyle, resize:'vertical', lineHeight:1.5, fontFamily:'inherit' }}
            />
          </div>
        </div>

        {/* RESULTADOS (legacy JSONB + notas) */}
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

        {/* ENTREGABLES LEGACY (colapsado, solo lectura) */}
        {legacyDeliverables.length > 0 && (
          <div style={SH}>
            <button
              onClick={() => setLegacyExpanded(p => !p)}
              style={{ display:'flex', alignItems:'center', gap:6, fontSize:10, fontWeight:700, color:'var(--text-secondary)', textTransform:'uppercase', letterSpacing:1, background:'none', border:'none', cursor:'pointer', padding:0, width:'100%', justifyContent:'space-between' }}
            >
              {t('collab.sections.legacyDeliverables')} ({legacyDeliverables.length})
              <span style={{ fontSize:12 }}>{legacyExpanded ? '▲' : '▼'}</span>
            </button>
            {legacyExpanded && (
              <div style={{ marginTop:10, display:'flex', flexDirection:'column', gap:4 }}>
                {legacyDeliverables.map((d, i) => (
                  <div key={i} style={{ fontSize:12, color:'var(--text-secondary)', padding:'4px 0', borderBottom:'1px solid rgba(139,92,246,0.08)' }}>{d}</div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ACTIVIDAD */}
        <div style={SH}>
          <SectionHeader label={t('collab.sections.activity')} fields={[]} dirty={dirty}/>
          <ActivityTimeline activities={timeline}/>
        </div>
      </div>

      <AssignModal
        isOpen={assignOpen}
        onClose={() => setAssignOpen(false)}
        entity={entity}
        entityType="collaboration"
        onAssigned={(_, scouter) => setEntity(prev => ({ ...prev, scouterId: scouter.userId }))}
      />
    </div>
  )
}
