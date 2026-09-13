import React, { useState, useEffect, useCallback } from 'react'
import { Target, X } from 'lucide-react'
import { t } from '../../i18n/index.js'
import { getMyMissions, claimCompletedMissions } from '../../lib/metrics.js'
import { dbSaveMission, dbGetGeography } from '../../lib/database.js'
import { canSeeCommand } from '../routes.js'
import MissionProgress from '../components/MissionProgress.jsx'

const INPUT_STYLE = {
  width: '100%', background: 'rgba(139,92,246,0.07)',
  border: '1px solid rgba(139,92,246,0.25)', borderRadius: 10,
  padding: '10px 12px', color: 'var(--text-primary)', fontSize: 13, outline: 'none',
}
const SELECT_STYLE = { ...INPUT_STYLE, cursor: 'pointer', appearance: 'none' }

const METRICS = [
  'influencers_added','brands_added','opportunities','collaborations',
  'contacts','follow_ups','tasks_completed',
]

function MissionForm({ cities, onSave, onClose, saving, error }) {
  const [form, setForm] = useState({
    title: '', description: '', type: 'individual', metric: 'influencers_added',
    target: '', cityId: '', startsAt: '', endsAt: '', rewardPoints: '0',
  })
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const valid = form.title.trim().length > 0 && Number(form.target) > 0 && form.metric

  return (
    <form onSubmit={e => { e.preventDefault(); if (valid) onSave(form) }}
      style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      <div>
        <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.6 }}>
          {t('missions.form.title')} *
        </label>
        <input value={form.title} onChange={e => set('title', e.target.value)}
          style={INPUT_STYLE} placeholder={t('missions.form.titlePlaceholder')}
          onFocus={e => e.target.style.border = '1px solid rgba(139,92,246,0.6)'}
          onBlur={e => e.target.style.border = '1px solid rgba(139,92,246,0.25)'}
        />
      </div>

      <div>
        <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.6 }}>
          {t('missions.form.description')}
        </label>
        <textarea value={form.description} onChange={e => set('description', e.target.value)}
          rows={2} style={{ ...INPUT_STYLE, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }}
          placeholder={t('missions.form.descriptionPlaceholder')}
          onFocus={e => e.target.style.border = '1px solid rgba(139,92,246,0.6)'}
          onBlur={e => e.target.style.border = '1px solid rgba(139,92,246,0.25)'}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.6 }}>
            {t('missions.form.type')}
          </label>
          <select value={form.type} onChange={e => set('type', e.target.value)} style={SELECT_STYLE}>
            <option value="individual">{t('missions.form.typeIndividual')}</option>
            <option value="equipo">{t('missions.form.typeTeam')}</option>
          </select>
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.6 }}>
            {t('missions.form.target')} *
          </label>
          <input type="number" min="1" value={form.target} onChange={e => set('target', e.target.value)}
            style={INPUT_STYLE} placeholder="5"
            onFocus={e => e.target.style.border = '1px solid rgba(139,92,246,0.6)'}
            onBlur={e => e.target.style.border = '1px solid rgba(139,92,246,0.25)'}
          />
        </div>
      </div>

      <div>
        <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.6 }}>
          {t('missions.form.metric')} *
        </label>
        <select value={form.metric} onChange={e => set('metric', e.target.value)} style={SELECT_STYLE}>
          {METRICS.map(m => (
            <option key={m} value={m}>{t(`missions.form.metrics.${m}`)}</option>
          ))}
        </select>
      </div>

      <div>
        <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.6 }}>
          {t('missions.form.city')}
        </label>
        <select value={form.cityId} onChange={e => set('cityId', e.target.value)} style={SELECT_STYLE}>
          <option value="">{t('form.selectCity')}</option>
          {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.6 }}>
            {t('missions.form.startsAt')}
          </label>
          <input type="date" value={form.startsAt} onChange={e => set('startsAt', e.target.value)} style={INPUT_STYLE}/>
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.6 }}>
            {t('missions.form.endsAt')}
          </label>
          <input type="date" value={form.endsAt} onChange={e => set('endsAt', e.target.value)} style={INPUT_STYLE}/>
        </div>
      </div>

      <div>
        <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.6 }}>
          {t('missions.form.rewardPoints')}
        </label>
        <input type="number" min="0" value={form.rewardPoints} onChange={e => set('rewardPoints', e.target.value)}
          style={INPUT_STYLE} placeholder="0"
          onFocus={e => e.target.style.border = '1px solid rgba(139,92,246,0.6)'}
          onBlur={e => e.target.style.border = '1px solid rgba(139,92,246,0.25)'}
        />
      </div>

      {error && <div style={{ fontSize: 12, color: '#F87171' }}>{error}</div>}

      <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
        <button type="submit" disabled={saving || !valid}
          style={{ flex: 1, padding: '10px 0', borderRadius: 10, background: valid ? 'var(--primary-violet)' : 'rgba(139,92,246,0.3)', border: 'none', color: 'white', fontSize: 13, fontWeight: 700, cursor: valid ? 'pointer' : 'default' }}>
          {saving ? t('form.saving') : t('form.save')}
        </button>
        <button type="button" onClick={onClose}
          style={{ padding: '10px 16px', borderRadius: 10, background: 'transparent', border: '1px solid var(--border-violet)', color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer' }}>
          {t('form.cancel')}
        </button>
      </div>
    </form>
  )
}

export default function MissionsPage({ currentUser }) {
  const [missions,  setMissions]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [claimed,   setClaimed]   = useState([])
  const [formOpen,  setFormOpen]  = useState(false)
  const [saving,    setSaving]    = useState(false)
  const [formError, setFormError] = useState(null)
  const [cities,    setCities]    = useState([])

  const canManage = canSeeCommand(currentUser)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [ms, cl] = await Promise.allSettled([
        getMyMissions(),
        claimCompletedMissions(),
      ])
      if (ms.status === 'fulfilled')  setMissions(ms.value)
      if (cl.status === 'fulfilled' && cl.value.length > 0) setClaimed(cl.value)
      else if (cl.status === 'rejected') console.warn('claim_completed_missions:', cl.reason?.message)
    } catch (e) {
      console.error('MissionsPage load:', e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!formOpen || !canManage) return
    dbGetGeography().then(g => setCities(g.cities)).catch(() => {})
  }, [formOpen, canManage])

  const handleSave = async (form) => {
    setSaving(true); setFormError(null)
    try {
      const m = await dbSaveMission(form, currentUser?.id)
      setMissions(prev => [{ ...m, progress: 0, pct: 0 }, ...prev])
      setFormOpen(false)
    } catch (e) {
      setFormError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ padding: '20px', maxWidth: 720 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>
            {t('missions.title')}
          </h1>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t('missions.subtitle')}</p>
        </div>
        {canManage && (
          <button
            onClick={() => { setFormOpen(true); setFormError(null) }}
            style={{ padding: '8px 14px', borderRadius: 10, background: 'var(--primary-violet)', border: 'none', color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0, minHeight: 36 }}
          >
            {t('missions.new')}
          </button>
        )}
      </div>

      {/* Banner de puntos ganados */}
      {claimed.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          {claimed.map((c, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', marginBottom: 8, background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.3)', borderRadius: 12, fontSize: 13, fontWeight: 600, color: '#34D399' }}>
              <span>{t('missions.claimed', { n: c.pointsAwarded, title: c.title })}</span>
              <button onClick={() => setClaimed(prev => prev.filter((_, j) => j !== i))}
                style={{ background: 'none', border: 'none', color: '#34D399', cursor: 'pointer', padding: 4 }}>
                <X size={14}/>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[0,1,2].map(i => (
            <div key={i} style={{ height: 90, borderRadius: 12, background: 'rgba(139,92,246,0.06)', animation: 'pulse 1.5s ease-in-out infinite' }}/>
          ))}
        </div>
      ) : missions.length === 0 ? (
        <div style={{ padding: '48px 0', textAlign: 'center' }}>
          <Target size={40} style={{ color: 'var(--text-secondary)', opacity: 0.35, display: 'block', margin: '0 auto 16px' }}/>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
            {t('missions.empty')}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 280, margin: '0 auto' }}>
            {t('missions.emptySub')}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {missions.map(m => <MissionProgress key={m.id} mission={m}/>)}
        </div>
      )}

      {/* Bottom sheet — form nueva misión */}
      {formOpen && (
        <>
          <div onClick={() => setFormOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 300, backdropFilter: 'blur(2px)', WebkitBackdropFilter: 'blur(2px)' }}
          />
          <div style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 301,
            background: 'var(--bg-secondary)', borderRadius: '20px 20px 0 0',
            border: '1px solid var(--border-violet)', borderBottom: 'none',
            maxHeight: '90vh', overflowY: 'auto', padding: '20px 20px 32px',
            animation: 'slideUp 0.2s ease',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{t('missions.new')}</span>
              <button onClick={() => setFormOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 4 }}>
                <X size={18}/>
              </button>
            </div>
            <MissionForm cities={cities} onSave={handleSave} onClose={() => setFormOpen(false)} saving={saving} error={formError}/>
          </div>
        </>
      )}
    </div>
  )
}
