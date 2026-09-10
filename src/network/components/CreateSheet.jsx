import React, { useState, useEffect, useCallback } from 'react'
import { X, Users, Building2, Briefcase, ChevronLeft, AlertCircle } from 'lucide-react'
import { t } from '../../i18n/index.js'
import { dbGetGeography, dbListAllBrands, dbSaveInfluencer, dbSaveBrand, dbSaveOpportunity } from '../../lib/database.js'

const CATEGORIES = t('categories') // array desde es.json

const INPUT_STYLE = {
  width: '100%', background: 'rgba(139,92,246,0.07)',
  border: '1px solid rgba(139,92,246,0.25)', borderRadius: 10,
  padding: '10px 12px', color: 'var(--text-primary)', fontSize: 13, outline: 'none',
  transition: 'border 0.15s',
}

const SELECT_STYLE = { ...INPUT_STYLE, cursor: 'pointer', appearance: 'none' }

const Label = ({ children, required }) => (
  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.6 }}>
    {children}{required && <span style={{ color: '#F87171', marginLeft: 3 }}>*</span>}
  </label>
)

const Field = ({ label, required, children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
    <Label required={required}>{label}</Label>
    {children}
  </div>
)

// ─── Formulario Influencer ────────────────────────────────────────────────────

function InfluencerForm({ cities, onSave, saving, error }) {
  const [form, setForm] = useState({ username: '', name: '', cityId: '', category: '' })
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  return (
    <form onSubmit={e => { e.preventDefault(); onSave(form) }} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Field label={t('form.username')} required>
        <input
          value={form.username} onChange={e => set('username', e.target.value)}
          placeholder={t('create.influencer.usernamePlaceholder')}
          style={INPUT_STYLE}
          onFocus={e => e.target.style.border = '1px solid rgba(139,92,246,0.6)'}
          onBlur={e => e.target.style.border = '1px solid rgba(139,92,246,0.25)'}
        />
      </Field>
      <Field label={t('form.name')} required>
        <input
          value={form.name} onChange={e => set('name', e.target.value)}
          placeholder={t('create.influencer.namePlaceholder')}
          style={INPUT_STYLE}
          onFocus={e => e.target.style.border = '1px solid rgba(139,92,246,0.6)'}
          onBlur={e => e.target.style.border = '1px solid rgba(139,92,246,0.25)'}
        />
      </Field>
      <Field label={t('form.city')}>
        <select value={form.cityId} onChange={e => set('cityId', e.target.value)} style={SELECT_STYLE}>
          <option value="">{t('form.selectCity')}</option>
          {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </Field>
      <Field label={t('form.category')}>
        <select value={form.category} onChange={e => set('category', e.target.value)} style={SELECT_STYLE}>
          <option value="">{t('form.selectCategory')}</option>
          {(Array.isArray(CATEGORIES) ? CATEGORIES : []).map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </Field>
      <SaveButton saving={saving} error={error}/>
    </form>
  )
}

// ─── Formulario Marca ─────────────────────────────────────────────────────────

function BrandForm({ cities, onSave, saving, error }) {
  const [form, setForm] = useState({ name: '', category: '', cityId: '' })
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  return (
    <form onSubmit={e => { e.preventDefault(); onSave(form) }} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Field label={t('form.name')} required>
        <input
          value={form.name} onChange={e => set('name', e.target.value)}
          placeholder={t('create.brand.namePlaceholder')}
          style={INPUT_STYLE}
          onFocus={e => e.target.style.border = '1px solid rgba(139,92,246,0.6)'}
          onBlur={e => e.target.style.border = '1px solid rgba(139,92,246,0.25)'}
        />
      </Field>
      <Field label={t('form.category')}>
        <select value={form.category} onChange={e => set('category', e.target.value)} style={SELECT_STYLE}>
          <option value="">{t('form.selectCategory')}</option>
          {(Array.isArray(CATEGORIES) ? CATEGORIES : []).map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </Field>
      <Field label={t('form.city')}>
        <select value={form.cityId} onChange={e => set('cityId', e.target.value)} style={SELECT_STYLE}>
          <option value="">{t('form.selectCity')}</option>
          {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </Field>
      <SaveButton saving={saving} error={error}/>
    </form>
  )
}

// ─── Formulario Oportunidad ───────────────────────────────────────────────────

function OpportunityForm({ brands, onSave, saving, error }) {
  const [form, setForm] = useState({ brandId: '', title: '', value: '', nextAction: '' })
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  return (
    <form onSubmit={e => { e.preventDefault(); onSave(form) }} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Field label={t('form.brand')}>
        <select value={form.brandId} onChange={e => set('brandId', e.target.value)} style={SELECT_STYLE}>
          <option value="">{t('form.selectBrand')}</option>
          {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </Field>
      <Field label={t('form.title')} required>
        <input
          value={form.title} onChange={e => set('title', e.target.value)}
          placeholder={t('create.opportunity.titlePlaceholder')}
          style={INPUT_STYLE}
          onFocus={e => e.target.style.border = '1px solid rgba(139,92,246,0.6)'}
          onBlur={e => e.target.style.border = '1px solid rgba(139,92,246,0.25)'}
        />
      </Field>
      <Field label={t('form.estimatedValue')}>
        <input
          type="number" value={form.value} onChange={e => set('value', e.target.value)}
          placeholder="50000"
          style={INPUT_STYLE}
          onFocus={e => e.target.style.border = '1px solid rgba(139,92,246,0.6)'}
          onBlur={e => e.target.style.border = '1px solid rgba(139,92,246,0.25)'}
        />
      </Field>
      <Field label={t('form.nextAction')}>
        <input
          value={form.nextAction} onChange={e => set('nextAction', e.target.value)}
          placeholder={t('create.opportunity.nextActionPlaceholder')}
          style={INPUT_STYLE}
          onFocus={e => e.target.style.border = '1px solid rgba(139,92,246,0.6)'}
          onBlur={e => e.target.style.border = '1px solid rgba(139,92,246,0.25)'}
        />
      </Field>
      <SaveButton saving={saving} error={error}/>
    </form>
  )
}

// ─── Botón Guardar ────────────────────────────────────────────────────────────

function SaveButton({ saving, error }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', fontSize: 12, color: '#F87171' }}>
          <AlertCircle size={13}/>{error}
        </div>
      )}
      <button
        type="submit"
        disabled={saving}
        style={{
          width: '100%', padding: '13px', borderRadius: 10,
          background: saving ? 'rgba(139,92,246,0.3)' : 'linear-gradient(135deg, var(--primary-violet-dark), var(--primary-violet))',
          color: 'white', border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
          fontSize: 14, fontWeight: 700, boxShadow: saving ? 'none' : '0 0 20px rgba(139,92,246,0.3)',
          transition: 'all 0.2s',
        }}
      >
        {saving ? t('form.saving') : t('form.save')}
      </button>
    </div>
  )
}

// ─── Ítem del selector de tipo ────────────────────────────────────────────────

function TypeButton({ icon: Icon, label, color, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
        padding: '16px 12px', borderRadius: 14,
        background: `${color}15`, border: `1px solid ${color}40`,
        cursor: 'pointer', transition: 'all 0.2s', minWidth: 80,
      }}
      onMouseEnter={e => { e.currentTarget.style.background = `${color}25`; e.currentTarget.style.transform = 'translateY(-2px)' }}
      onMouseLeave={e => { e.currentTarget.style.background = `${color}15`; e.currentTarget.style.transform = 'none' }}
    >
      <div style={{ width: 40, height: 40, borderRadius: 12, background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={20} color={color}/>
      </div>
      <span style={{ fontSize: 11, fontWeight: 600, color, textAlign: 'center', lineHeight: 1.2 }}>{label}</span>
    </button>
  )
}

// ─── Sheet principal ──────────────────────────────────────────────────────────

export default function CreateSheet({ isOpen, onClose, currentUser, onCreated }) {
  const [step,     setStep]    = useState('select') // 'select' | 'influencer' | 'brand' | 'opportunity'
  const [saving,   setSaving]  = useState(false)
  const [error,    setError]   = useState(null)
  const [cities,   setCities]  = useState([])
  const [brands,   setBrands]  = useState([])

  useEffect(() => {
    if (!isOpen) return
    setStep('select'); setError(null)
    dbGetGeography().then(g => setCities(g.cities || [])).catch(() => {})
    dbListAllBrands().then(b => setBrands(b)).catch(() => {})
  }, [isOpen])

  const handleSaveInfluencer = useCallback(async (form) => {
    if (!form.name.trim() && !form.username.trim()) { setError(t('form.required')); return }
    setSaving(true); setError(null)
    try {
      const saved = await dbSaveInfluencer({
        name:     form.name.trim(),
        username: form.username.trim() || null,
        cityId:   form.cityId || null,
        category: form.category || null,
      })
      onCreated?.('influencer', saved)
      onClose()
    } catch (e) {
      setError(e.message || t('errors.saving'))
    } finally {
      setSaving(false)
    }
  }, [onClose, onCreated])

  const handleSaveBrand = useCallback(async (form) => {
    if (!form.name.trim()) { setError(t('form.required')); return }
    setSaving(true); setError(null)
    try {
      const saved = await dbSaveBrand({
        name:     form.name.trim(),
        category: form.category || null,
        cityId:   form.cityId || null,
      })
      onCreated?.('brand', saved)
      onClose()
    } catch (e) {
      setError(e.message || t('errors.saving'))
    } finally {
      setSaving(false)
    }
  }, [onClose, onCreated])

  const handleSaveOpportunity = useCallback(async (form) => {
    if (!form.title.trim()) { setError(t('form.required')); return }
    setSaving(true); setError(null)
    try {
      const saved = await dbSaveOpportunity({
        title:      form.title.trim(),
        brandId:    form.brandId || null,
        value:      Number(form.value) || null,
        nextAction: form.nextAction.trim() || null,
      }, currentUser?.id)
      onCreated?.('opportunity', saved)
      onClose()
    } catch (e) {
      setError(e.message || t('errors.saving'))
    } finally {
      setSaving(false)
    }
  }, [onClose, onCreated, currentUser?.id])

  if (!isOpen) return null

  const FORM_TITLE = {
    influencer:  `+ ${t('create.influencer.label')}`,
    brand:       `+ ${t('create.brand.label')}`,
    opportunity: `+ ${t('create.opportunity.label')}`,
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', zIndex: 400 }}/>
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 401,
        background: 'var(--bg-secondary)', borderRadius: '24px 24px 0 0',
        border: '1px solid var(--border-violet)', borderBottom: 'none',
        padding: '0 20px 40px',
        maxHeight: '90vh', overflowY: 'auto',
        animation: 'slideUp 0.22s ease',
      }}>
        <div style={{ width: 36, height: 4, background: 'rgba(255,255,255,0.15)', borderRadius: 2, margin: '12px auto 0' }}/>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {step !== 'select' && (
              <button onClick={() => setStep('select')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', padding: 0 }}>
                <ChevronLeft size={18}/>
              </button>
            )}
            <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
              {step === 'select' ? t('create.selectType') : FORM_TITLE[step]}
            </span>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid var(--border-violet)', borderRadius: 8, width: 30, height: 30, cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={14}/>
          </button>
        </div>

        {/* Selector de tipo */}
        {step === 'select' && (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', paddingBottom: 8 }}>
            <TypeButton icon={Users}     label={t('create.influencer.label')}   color="#8B5CF6" onClick={() => setStep('influencer')}/>
            <TypeButton icon={Building2} label={t('create.brand.label')}        color="#22D3EE" onClick={() => setStep('brand')}/>
            <TypeButton icon={Briefcase} label={t('create.opportunity.label')}  color="#FBBF24" onClick={() => setStep('opportunity')}/>
          </div>
        )}

        {step === 'influencer'  && <InfluencerForm  cities={cities} onSave={handleSaveInfluencer}  saving={saving} error={error}/>}
        {step === 'brand'       && <BrandForm        cities={cities} onSave={handleSaveBrand}        saving={saving} error={error}/>}
        {step === 'opportunity' && <OpportunityForm  brands={brands} onSave={handleSaveOpportunity}  saving={saving} error={error}/>}
      </div>
    </>
  )
}
