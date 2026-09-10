import React from 'react'
import { X, SlidersHorizontal } from 'lucide-react'
import { t } from '../../i18n/index.js'

const Chip = ({ label, active, onClick }) => (
  <button
    onClick={onClick}
    style={{
      padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500,
      background: active ? 'rgba(139,92,246,0.25)' : 'rgba(139,92,246,0.07)',
      border: active ? '1px solid rgba(139,92,246,0.5)' : '1px solid var(--border-violet)',
      color: active ? 'var(--primary-violet-light)' : 'var(--text-secondary)',
      cursor: 'pointer', transition: 'all 0.15s', flexShrink: 0,
    }}
    onMouseEnter={e => !active && (e.currentTarget.style.border = '1px solid rgba(139,92,246,0.3)')}
    onMouseLeave={e => !active && (e.currentTarget.style.border = '1px solid var(--border-violet)')}
  >
    {label}
  </button>
)

const Section = ({ label, children }) => (
  <div>
    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>
      {label}
    </div>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {children}
    </div>
  </div>
)

const RELATIONSHIP_OPTIONS = ['cold','warm','strong','inactive']

export default function FilterSheet({ isOpen, onClose, filters, onChange, onApply, onClear, cities = [], categories = [] }) {
  if (!isOpen) return null

  const set = (key, val) => onChange({ ...filters, [key]: val === filters[key] ? null : val })

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', zIndex: 300 }}
      />

      {/* Sheet */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 301,
        background: 'var(--bg-secondary)', borderRadius: '20px 20px 0 0',
        border: '1px solid var(--border-violet)', borderBottom: 'none',
        padding: '0 20px 32px',
        maxHeight: '80vh', overflowY: 'auto',
        animation: 'slideUp 0.22s ease',
      }}>
        {/* Handle */}
        <div style={{ width: 36, height: 4, background: 'rgba(255,255,255,0.15)', borderRadius: 2, margin: '12px auto 20px' }}/>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <SlidersHorizontal size={16} color="var(--primary-violet-light)"/>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{t('filter.title')}</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
            <X size={18}/>
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Relación */}
          <Section label={t('filter.relationship')}>
            <Chip label={t('filter.all')} active={!filters.relationshipStatus} onClick={() => set('relationshipStatus', null)}/>
            {RELATIONSHIP_OPTIONS.map(s => (
              <Chip key={s} label={t(`relationship.${s}`)} active={filters.relationshipStatus === s} onClick={() => set('relationshipStatus', s)}/>
            ))}
          </Section>

          {/* Ciudad */}
          {cities.length > 0 && (
            <Section label={t('filter.city')}>
              <Chip label={t('filter.all')} active={!filters.cityId} onClick={() => set('cityId', null)}/>
              {cities.slice(0, 8).map(c => (
                <Chip key={c.id} label={c.name} active={filters.cityId === c.id} onClick={() => set('cityId', c.id)}/>
              ))}
            </Section>
          )}

          {/* Categoría */}
          {categories.length > 0 && (
            <Section label={t('filter.category')}>
              <Chip label={t('filter.all')} active={!filters.category} onClick={() => set('category', null)}/>
              {categories.map(c => (
                <Chip key={c} label={c} active={filters.category === c} onClick={() => set('category', c)}/>
              ))}
            </Section>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, marginTop: 28 }}>
          <button
            onClick={onClear}
            style={{
              flex: 1, padding: '12px', borderRadius: 10, fontSize: 13, fontWeight: 600,
              background: 'transparent', border: '1px solid var(--border-violet)',
              color: 'var(--text-secondary)', cursor: 'pointer',
            }}
          >
            {t('filter.clear')}
          </button>
          <button
            onClick={() => { onApply(filters); onClose() }}
            style={{
              flex: 2, padding: '12px', borderRadius: 10, fontSize: 13, fontWeight: 600,
              background: 'linear-gradient(135deg, var(--primary-violet-dark), var(--primary-violet))',
              color: 'white', border: 'none', cursor: 'pointer',
              boxShadow: '0 0 16px rgba(139,92,246,0.3)',
            }}
          >
            {t('filter.apply')}
          </button>
        </div>
      </div>
    </>
  )
}
