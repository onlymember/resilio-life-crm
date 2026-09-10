import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, Users } from 'lucide-react'
import ActivityTimeline from '../components/ActivityTimeline.jsx'
import EmptyState from '../components/EmptyState.jsx'
import { t } from '../../i18n/index.js'
import { useTz } from '../utils/tz.js'
import { isoToDatetimeLocal, datetimeLocalToIso } from '../utils/date.js'
import { dbGetActivities, dbGetGeography, dbPatchInfluencer } from '../../lib/database.js'
import { supabase } from '../../lib/supabase.js'

const CATEGORIES = t('categories') || []
const TIERS = ['nano','micro','mid','macro','mega']
const REL_STATUSES = ['cold','warm','strong','inactive']

async function fetchInfluencer(id) {
  const { data, error } = await supabase.from('influencers').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  if (!data) return null
  return {
    id: data.id, name: data.name, username: data.username, email: data.email, phone: data.phone,
    instagram: data.instagram, tiktok: data.tiktok, whatsapp: data.whatsapp,
    followers: data.followers ?? 0, category: data.category, tier: data.tier, status: data.status,
    cityId: data.city_id, countryId: data.country_id,
    ownerScouterId: data.owner_scouter_id, createdBy: data.created_by,
    notes: data.notes, createdAt: data.created_at, updatedAt: data.updated_at,
    relationshipStatus: data.relationship_status ?? 'cold',
    engagement: data.engagement ?? null,
    averageViews: data.average_views ?? null,
    nextAction: data.next_action ?? null,
    nextActionAt: data.next_action_at ?? null,
    lastContactAt: data.last_contact_at ?? null,
  }
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

export default function InfluencerDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const tz = useTz()

  const [entity,     setEntity]     = useState(null)
  const [activities, setActivities] = useState([])
  const [geo,        setGeo]        = useState({ cities: [], countries: [] })
  const [loading,    setLoading]    = useState(true)
  const [dirty,      setDirty]      = useState({})
  const [saving,     setSaving]     = useState(false)
  const [saveError,  setSaveError]  = useState(null)

  const get = (f) => f in dirty ? dirty[f] : entity?.[f]
  const set = (f, v) => setDirty(prev => ({ ...prev, [f]: v }))

  const isDirty = Object.keys(dirty).length > 0

  useEffect(() => {
    if (!id) return
    setLoading(true)
    Promise.all([fetchInfluencer(id), dbGetActivities('influencer', id, 20), dbGetGeography()])
      .then(([inf, acts, g]) => {
        setEntity(inf)
        setActivities(acts)
        setGeo(g)
      })
      .catch(() => setEntity(null))
      .finally(() => setLoading(false))
  }, [id])

  // Block accidental tab/browser close when dirty
  useEffect(() => {
    if (!isDirty) return
    const h = (e) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', h)
    return () => window.removeEventListener('beforeunload', h)
  }, [isDirty])

  const handleBack = () => {
    if (isDirty && !window.confirm(t('influencer.unsavedWarning'))) return
    navigate('/network/influencers')
  }

  const handleSave = async () => {
    if (!isDirty || saving) return
    setSaving(true)
    setSaveError(null)
    try {
      await dbPatchInfluencer(entity.id, dirty)
      setEntity(prev => ({ ...prev, ...dirty }))
      setDirty({})
    } catch(e) {
      setSaveError(e.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>{t('loading.generic')}</div>
  if (!entity) return <EmptyState icon={Users} title={t('errors.notFound')} subtitle={t('errors.notFoundAccess')}/>

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
  const relColors = { cold: '#9CA3AF', warm: '#FBBF24', strong: '#34D399', inactive: '#6B7280' }

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
          {entity.username && (
            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>@{entity.username}</div>
          )}
        </div>
        {cityName && (
          <div style={{ fontSize: 10, color: 'var(--text-secondary)', flexShrink: 0 }}>{cityName}</div>
        )}
      </div>

      <div style={{ padding: '16px 20px' }}>

        {/* City warning */}
        {!get('cityId') && (
          <div style={{ fontSize: 11, color: '#FBBF24', background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 8, padding: '8px 12px', marginBottom: 12 }}>
            {t('influencer.cityWarning')}
          </div>
        )}

        {/* CONTACTO */}
        <div style={sectionStyle}>
          <SectionHeader label={t('influencer.sections.contact')} fields={['whatsapp','instagram','tiktok','email','phone']} dirty={dirty}/>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Field label={t('influencer.fields.whatsapp')} value={get('whatsapp')} onChange={v => set('whatsapp', v)} placeholder="+54 9 11 1234 5678"/>
            <Field label={t('influencer.fields.instagram')} value={get('instagram')} onChange={v => set('instagram', v)} placeholder="@usuario"/>
            <Field label={t('influencer.fields.tiktok')} value={get('tiktok')} onChange={v => set('tiktok', v)} placeholder="@usuario"/>
            <Field label={t('influencer.fields.email')} value={get('email')} onChange={v => set('email', v)} type="email" placeholder="correo@ejemplo.com"/>
            <Field label={t('influencer.fields.phone')} value={get('phone')} onChange={v => set('phone', v)} type="tel" placeholder="+54 11 1234 5678"/>
          </div>
        </div>

        {/* PERFIL */}
        <div style={sectionStyle}>
          <SectionHeader label={t('influencer.sections.profile')} fields={['category','tier','cityId','countryId','followers','engagement','averageViews']} dirty={dirty}/>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <SelectField label={t('influencer.fields.category')} value={get('category')} onChange={v => set('category', v)}>
              <option value="">{t('form.selectCategory')}</option>
              {(Array.isArray(CATEGORIES) ? CATEGORIES : []).map(c => <option key={c} value={c}>{c}</option>)}
            </SelectField>
            <SelectField label={t('influencer.fields.tier')} value={get('tier')} onChange={v => set('tier', v)}>
              <option value="">—</option>
              {TIERS.map(tier => <option key={tier} value={tier}>{t(`influencer.tiers.${tier}`)}</option>)}
            </SelectField>
            <div style={{ gridColumn: '1 / -1' }}>
              <SelectField label={t('influencer.fields.city')} value={get('cityId') ?? ''} onChange={v => {
                const city = (geo.cities || []).find(c => c.id === v)
                set('cityId', v || null)
                if (city) set('countryId', city.country_id)
              }}>
                <option value="">{t('influencer.noCityPlaceholder')}</option>
                {(geo.cities || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </SelectField>
            </div>
            <Field label={t('influencer.fields.followers')} value={get('followers') ?? ''} onChange={v => set('followers', v ? Number(v) : 0)} type="number" placeholder="0"/>
            <Field label={t('influencer.fields.engagement')} value={get('engagement') ?? ''} onChange={v => set('engagement', v ? Number(v) : null)} type="number" placeholder="0.00"/>
            <Field label={t('influencer.fields.averageViews')} value={get('averageViews') ?? ''} onChange={v => set('averageViews', v ? Number(v) : null)} type="number" placeholder="0"/>
          </div>
        </div>

        {/* RELACIÓN */}
        <div style={sectionStyle}>
          <SectionHeader label={t('influencer.sections.relationship')} fields={['relationshipStatus','nextAction','nextActionAt','notes']} dirty={dirty}/>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* Relationship status badge buttons */}
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>{t('influencer.fields.relationshipStatus')}</div>
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

            <Field label={t('influencer.fields.nextAction')} value={get('nextAction')} onChange={v => set('nextAction', v)} placeholder="Llamar, enviar propuesta…"/>

            {/* Next action datetime */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{t('influencer.fields.nextActionAt')}</label>
              <input
                type="datetime-local"
                value={isoToDatetimeLocal(get('nextActionAt'), tz)}
                onChange={e => set('nextActionAt', e.target.value ? datetimeLocalToIso(e.target.value, tz) : null)}
                style={{ ...inputStyle, colorScheme: 'dark' }}
                onFocus={e => e.target.style.borderColor = 'var(--primary-violet)'}
                onBlur={e => e.target.style.borderColor = 'rgba(139,92,246,0.25)'}
              />
            </div>

            {/* Notes */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{t('influencer.fields.notes')}</label>
              <textarea
                value={get('notes') ?? ''}
                onChange={e => set('notes', e.target.value || null)}
                rows={4}
                placeholder="Observaciones, contexto, historial informal…"
                style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
                onFocus={e => e.target.style.borderColor = 'var(--primary-violet)'}
                onBlur={e => e.target.style.borderColor = 'rgba(139,92,246,0.25)'}
              />
            </div>
          </div>
        </div>

        {/* ACTIVIDAD */}
        <div style={sectionStyle}>
          <SectionHeader label={t('influencer.sections.activity')} fields={[]} dirty={dirty}/>
          <ActivityTimeline activities={activities}/>
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
            {saving ? t('influencer.saving') : t('influencer.save')}
          </button>
        </div>
      )}
    </div>
  )
}
