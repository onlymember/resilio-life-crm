import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, Building2, ExternalLink } from 'lucide-react'
import ActivityTimeline from '../components/ActivityTimeline.jsx'
import AssignModal from '../components/AssignModal.jsx'
import EmptyState from '../components/EmptyState.jsx'
import RelationshipHistory from '../components/RelationshipHistory.jsx'
import { t } from '../../i18n/index.js'
import { useTz } from '../utils/tz.js'
import { isoToDatetimeLocal, datetimeLocalToIso } from '../utils/date.js'
import {
  dbGetBrandCategories, dbPatchBrand, dbGetEntityTimeline,
  dbGetGeography,
} from '../../lib/database.js'
import { supabase } from '../../lib/supabase.js'
import { COMMAND_ROLES } from '../routes.js'

const REL_STATUSES = ['cold','warm','strong','inactive']
const relColors = { cold: '#9CA3AF', warm: '#FBBF24', strong: '#34D399', inactive: '#6B7280' }

async function fetchBrand(id) {
  const { data, error } = await supabase.from('brands').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  if (!data) return null
  return {
    id: data.id, name: data.name,
    category: data.category, categoryId: data.category_id ?? null,
    cityId: data.city_id, countryId: data.country_id, status: data.status,
    ownerScouterId: data.owner_scouter_id, createdBy: data.created_by,
    notes: data.notes, website: data.website, logo: data.logo ?? null,
    createdAt: data.created_at, updatedAt: data.updated_at,
    relationshipStatus: data.relationship_status ?? 'cold',
    potentialValue: data.potential_value ?? null,
    nextAction: data.next_action ?? null, nextActionAt: data.next_action_at ?? null,
    lastContactAt: data.last_contact_at ?? null,
    ...(data.data || {}),
  }
}

async function fetchOpportunities(brandId) {
  const { data } = await supabase.from('opportunities')
    .select('id, title, status, created_at')
    .eq('brand_id', brandId)
    .order('created_at', { ascending: false })
    .limit(5)
  return data || []
}

const SectionHeader = ({ label, fields, dirty }) => {
  const hasDirty = fields.some(f => f in dirty)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
      {label}
      {hasDirty && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#FBBF24', flexShrink: 0 }}/>}
    </div>
  )
}

const Field = ({ label, value, onChange, type = 'text', placeholder = '' }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
    <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</label>
    <input
      type={type}
      value={value ?? ''}
      onChange={e => onChange(e.target.value || null)}
      placeholder={placeholder}
      style={{
        width: '100%', padding: '8px 12px', borderRadius: 8,
        background: 'rgba(139,92,246,0.07)', border: '1px solid var(--border-violet)',
        color: 'var(--text-primary)', fontSize: 16, transition: 'border-color 0.15s',
      }}
      onFocus={e => e.target.style.borderColor = 'var(--primary-violet)'}
      onBlur={e => e.target.style.borderColor = 'rgba(139,92,246,0.25)'}
    />
  </div>
)

const SelectField = ({ label, value, onChange, children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
    <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</label>
    <select
      value={value ?? ''}
      onChange={e => onChange(e.target.value || null)}
      style={{
        width: '100%', padding: '8px 12px', borderRadius: 8,
        background: 'rgba(139,92,246,0.07)', border: '1px solid var(--border-violet)',
        color: 'var(--text-primary)', fontSize: 16, appearance: 'none', cursor: 'pointer',
      }}
    >
      {children}
    </select>
  </div>
)

const OPP_STATUS_COLOR = {
  new: '#9CA3AF', qualifying: '#FBBF24', contacted: '#60A5FA',
  in_conversation: '#A78BFA', qualified: '#34D399', proposal: '#22D3EE',
  negotiation: '#FB923C', won: '#4ADE80', lost: '#F87171', on_hold: '#6B7280',
}

export default function BrandDetailPage({ currentUser }) {
  const { id }   = useParams()
  const navigate = useNavigate()
  const tz       = useTz()
  const canReassign = COMMAND_ROLES.includes(currentUser?.rol)

  const [entity,        setEntity]        = useState(null)
  const [timeline,      setTimeline]      = useState([])
  const [opps,          setOpps]          = useState([])
  const [geo,           setGeo]           = useState({ cities: [], countries: [] })
  const [brandCats,     setBrandCats]     = useState([])
  const [loading,       setLoading]       = useState(true)
  const [dirty,         setDirty]         = useState({})
  const [saving,        setSaving]        = useState(false)
  const [saveError,     setSaveError]     = useState(null)
  const [assignOpen,    setAssignOpen]    = useState(false)

  const get = (f) => f in dirty ? dirty[f] : entity?.[f]
  const set = (f, v) => setDirty(prev => ({ ...prev, [f]: v }))
  const isDirty = Object.keys(dirty).length > 0

  useEffect(() => {
    if (!id) return
    setLoading(true)
    Promise.all([
      fetchBrand(id),
      dbGetEntityTimeline('brand', id).catch(() => []),
      fetchOpportunities(id),
      dbGetGeography(),
      dbGetBrandCategories(),
    ]).then(([brand, tl, oList, g, cats]) => {
      setEntity(brand)
      setTimeline(tl)
      setOpps(oList)
      setGeo(g)
      setBrandCats(cats)
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
    if (isDirty && !window.confirm(t('brand.unsavedWarning'))) return
    navigate('/network/brands')
  }

  const handleSave = async () => {
    if (!isDirty || saving) return
    setSaving(true); setSaveError(null)
    try {
      await dbPatchBrand(entity.id, dirty)
      setEntity(prev => ({ ...prev, ...dirty }))
      setDirty({})
    } catch(e) { setSaveError(e.message) }
    finally { setSaving(false) }
  }

  const handleAssigned = (entityId, scouter) => {
    setEntity(prev => ({ ...prev, ownerScouterId: scouter.userId }))
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>{t('loading.generic')}</div>
  if (!entity)  return <EmptyState icon={Building2} title={t('errors.notFound')} subtitle={t('errors.notFoundAccess')}/>

  const cityName = (geo.cities || []).find(c => c.id === get('cityId'))?.name || null

  const inputStyle = {
    width: '100%', padding: '8px 12px', borderRadius: 8,
    background: 'rgba(139,92,246,0.07)', border: '1px solid var(--border-violet)',
    color: 'var(--text-primary)', fontSize: 16,
  }
  const sectionStyle = {
    background: 'var(--glass-bg)', border: '1px solid var(--border-violet)',
    borderRadius: 14, padding: '16px', marginBottom: 12,
  }

  return (
    <div style={{ maxWidth: 680, paddingBottom: isDirty ? 20 : 0 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', borderBottom: '1px solid var(--border-violet)', position: 'sticky', top: 0, background: 'var(--bg-primary)', zIndex: 10 }}>
        <button
          onClick={handleBack}
          style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--primary-violet-light)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, padding: '4px 0', flexShrink: 0 }}
        >
          <ChevronLeft size={16}/>{t('nav.back')}
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entity.name}</div>
          {cityName && <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{cityName}</div>}
        </div>
        {canReassign && (
          <button
            onClick={() => setAssignOpen(true)}
            style={{ fontSize: 11, fontWeight: 600, color: 'var(--primary-violet-light)', background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 8, padding: '5px 10px', cursor: 'pointer', flexShrink: 0 }}
          >
            {t('network.assign')}
          </button>
        )}
      </div>

      <div style={{ padding: '16px 20px' }}>

        {/* City warning */}
        {!get('cityId') && (
          <div style={{ fontSize: 11, color: '#FBBF24', background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 8, padding: '8px 12px', marginBottom: 12 }}>
            {t('brand.cityWarning')}
          </div>
        )}

        {/* IDENTIDAD */}
        <div style={sectionStyle}>
          <SectionHeader label={t('brand.sections.identity')} fields={['name','categoryId','website','logo']} dirty={dirty}/>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Field label={t('brand.fields.name')} value={get('name')} onChange={v => set('name', v)} placeholder="Nike Argentina"/>
            <SelectField label={t('brand.fields.category')} value={get('categoryId')} onChange={v => set('categoryId', v)}>
              <option value="">{t('brand.noCategoryPlaceholder')}</option>
              {brandCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </SelectField>
            <Field label={t('brand.fields.website')} value={get('website')} onChange={v => set('website', v)} placeholder="https://example.com"/>
            <Field label={t('brand.fields.logo')} value={get('logo')} onChange={v => set('logo', v)} placeholder="URL de logo (opcional)"/>
          </div>
        </div>

        {/* CONTACTO */}
        <div style={sectionStyle}>
          <SectionHeader label={t('brand.sections.contact')} fields={['whatsapp','instagram','phone','email']} dirty={dirty}/>
          {!get('whatsapp') && !get('instagram') && !get('phone') && !get('email') && (
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 10, fontStyle: 'italic' }}>
              {t('brand.contactEmpty')}
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Field label={t('brand.fields.whatsapp')} value={get('whatsapp')} onChange={v => set('whatsapp', v)} placeholder="+54 9 11 1234 5678"/>
            <Field label={t('brand.fields.instagram')} value={get('instagram')} onChange={v => set('instagram', v)} placeholder="@marca"/>
            <Field label={t('brand.fields.phone')} value={get('phone')} onChange={v => set('phone', v)} type="tel" placeholder="+54 11 1234 5678"/>
            <Field label={t('brand.fields.email')} value={get('email')} onChange={v => set('email', v)} type="email" placeholder="contacto@marca.com"/>
          </div>
        </div>

        {/* UBICACIÓN */}
        <div style={sectionStyle}>
          <SectionHeader label={t('brand.sections.location')} fields={['cityId','countryId']} dirty={dirty}/>
          <SelectField label={t('brand.fields.city')} value={get('cityId') ?? ''} onChange={v => {
            const city = (geo.cities || []).find(c => c.id === v)
            set('cityId', v || null)
            if (city) set('countryId', city.country_id)
          }}>
            <option value="">{t('influencer.noCityPlaceholder')}</option>
            {(geo.cities || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </SelectField>
        </div>

        {/* RELACIÓN */}
        <div style={sectionStyle}>
          <SectionHeader label={t('brand.sections.relationship')} fields={['relationshipStatus','nextAction','nextActionAt','potentialValue','notes']} dirty={dirty}/>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* Relationship status badge buttons */}
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>{t('brand.fields.relationshipStatus')}</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {REL_STATUSES.map(s => {
                  const active = (get('relationshipStatus') || 'cold') === s
                  const col = relColors[s]
                  return (
                    <button
                      key={s}
                      onClick={() => set('relationshipStatus', s)}
                      style={{
                        padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                        cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 0.5,
                        background: active ? `${col}25` : 'transparent',
                        color: active ? col : 'var(--text-secondary)',
                        border: active ? `1px solid ${col}60` : '1px solid var(--border-violet)',
                        transition: 'all 0.15s',
                      }}
                    >
                      {t(`influencer.relationship.${s}`)}
                    </button>
                  )
                })}
              </div>
            </div>

            <Field label={t('brand.fields.nextAction')} value={get('nextAction')} onChange={v => set('nextAction', v)} placeholder="Enviar propuesta, llamar…"/>

            {/* Next action datetime */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{t('brand.fields.nextActionAt')}</label>
              <input
                type="datetime-local"
                value={isoToDatetimeLocal(get('nextActionAt'), tz)}
                onChange={e => set('nextActionAt', e.target.value ? datetimeLocalToIso(e.target.value, tz) : null)}
                style={{ ...inputStyle, colorScheme: 'dark' }}
                onFocus={e => e.target.style.borderColor = 'var(--primary-violet)'}
                onBlur={e => e.target.style.borderColor = 'rgba(139,92,246,0.25)'}
              />
            </div>

            <Field label={t('brand.fields.potentialValue')} value={get('potentialValue') ?? ''} onChange={v => set('potentialValue', v ? Number(v) : null)} type="number" placeholder="0"/>

            {/* Notes */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{t('brand.fields.notes')}</label>
              <textarea
                value={get('notes') ?? ''}
                onChange={e => set('notes', e.target.value || null)}
                rows={4}
                placeholder="Contexto, historial, decisores…"
                style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
                onFocus={e => e.target.style.borderColor = 'var(--primary-violet)'}
                onBlur={e => e.target.style.borderColor = 'rgba(139,92,246,0.25)'}
              />
            </div>
          </div>
        </div>

        {/* VÍNCULOS — oportunidades relacionadas */}
        {opps.length > 0 && (
          <div style={sectionStyle}>
            <SectionHeader label={t('brand.sections.links')} fields={[]} dirty={dirty}/>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {opps.map(o => (
                <button
                  key={o.id}
                  onClick={() => navigate(`/network/opportunities/${o.id}`)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    background: 'rgba(139,92,246,0.05)', border: '1px solid var(--border-violet)',
                    borderRadius: 8, padding: '8px 10px', cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: OPP_STATUS_COLOR[o.status] || '#9CA3AF', flexShrink: 0 }}/>
                  <span style={{ flex: 1, fontSize: 12, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.title}</span>
                  <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{t(`opportunities.status.${o.status}`) || o.status}</span>
                  <ExternalLink size={10} color="var(--text-secondary)"/>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* HISTORIAL DE RELACIÓN */}
        <div style={sectionStyle}>
          <SectionHeader label={t('relationshipHistory.title')} fields={[]} dirty={dirty}/>
          <RelationshipHistory brandId={entity.id}/>
        </div>

        {/* ACTIVIDAD */}
        <div style={sectionStyle}>
          <SectionHeader label={t('brand.sections.activity')} fields={[]} dirty={dirty}/>
          <ActivityTimeline activities={timeline}/>
        </div>

      </div>

      {/* Sticky save bar */}
      {isDirty && (
        <div className="nw-save-bar">
          {saveError && (
            <div style={{ fontSize: 11, color: '#F87171', marginBottom: 8 }}>{saveError}</div>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              width: '100%', padding: '10px 0', borderRadius: 10, fontSize: 14, fontWeight: 700,
              background: saving ? 'rgba(139,92,246,0.3)' : 'var(--primary-violet)',
              color: 'white', border: 'none', cursor: saving ? 'default' : 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {saving ? t('brand.saving') : t('brand.save')}
          </button>
        </div>
      )}

      <AssignModal
        isOpen={assignOpen}
        onClose={() => setAssignOpen(false)}
        entity={entity}
        entityType="brand"
        onAssigned={handleAssigned}
      />
    </div>
  )
}
