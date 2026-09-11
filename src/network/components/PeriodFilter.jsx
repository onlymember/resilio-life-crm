import React, { useState } from 'react'
import { t } from '../../i18n/index.js'

const today = () => new Date().toISOString().slice(0, 10)

const PRESETS = [
  {
    id: 'week',
    labelKey: 'period.week',
    range: () => {
      const d = new Date()
      const day = d.getDay() || 7
      const mon = new Date(d); mon.setDate(d.getDate() - day + 1)
      const sun = new Date(mon); sun.setDate(mon.getDate() + 6)
      return { from: mon.toISOString().slice(0,10), to: sun.toISOString().slice(0,10) }
    },
  },
  {
    id: 'month',
    labelKey: 'period.month',
    range: () => {
      const d = new Date()
      const first = new Date(d.getFullYear(), d.getMonth(), 1)
      const last  = new Date(d.getFullYear(), d.getMonth() + 1, 0)
      return { from: first.toISOString().slice(0,10), to: last.toISOString().slice(0,10) }
    },
  },
  {
    id: 'quarter',
    labelKey: 'period.quarter',
    range: () => {
      const d = new Date()
      const q = Math.floor(d.getMonth() / 3)
      const first = new Date(d.getFullYear(), q * 3, 1)
      const last  = new Date(d.getFullYear(), q * 3 + 3, 0)
      return { from: first.toISOString().slice(0,10), to: last.toISOString().slice(0,10) }
    },
  },
  { id: 'range', labelKey: 'period.range', range: null },
]

export default function PeriodFilter({ value, onChange }) {
  const activeId = value?.presetId || null
  const [rangeFrom, setRangeFrom] = useState(value?.from || today())
  const [rangeTo,   setRangeTo]   = useState(value?.to   || today())

  const handlePreset = (preset) => {
    if (preset.id === 'range') {
      onChange({ presetId: 'range', from: rangeFrom, to: rangeTo })
    } else {
      const r = preset.range()
      onChange({ presetId: preset.id, ...r })
    }
  }

  const handleRangeApply = () => {
    onChange({ presetId: 'range', from: rangeFrom, to: rangeTo })
  }

  const chip = (preset) => {
    const active = activeId === preset.id
    return (
      <button
        key={preset.id}
        onClick={() => handlePreset(preset)}
        style={{
          padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600,
          cursor: 'pointer', whiteSpace: 'nowrap',
          background: active ? 'rgba(139,92,246,0.25)' : 'rgba(139,92,246,0.07)',
          color: active ? 'var(--primary-violet-light)' : 'var(--text-secondary)',
          border: active ? '1px solid rgba(139,92,246,0.5)' : '1px solid var(--border-violet)',
        }}
      >
        {t(preset.labelKey)}
      </button>
    )
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
      {PRESETS.map(chip)}
      {activeId === 'range' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <input
            type="date" value={rangeFrom} onChange={e => setRangeFrom(e.target.value)}
            style={{ padding:'4px 8px', borderRadius:8, background:'rgba(139,92,246,0.07)', border:'1px solid var(--border-violet)', color:'var(--text-primary)', fontSize:12 }}
          />
          <span style={{ fontSize:11, color:'var(--text-secondary)' }}>→</span>
          <input
            type="date" value={rangeTo} onChange={e => setRangeTo(e.target.value)}
            style={{ padding:'4px 8px', borderRadius:8, background:'rgba(139,92,246,0.07)', border:'1px solid var(--border-violet)', color:'var(--text-primary)', fontSize:12 }}
          />
          <button
            onClick={handleRangeApply}
            style={{ padding:'4px 10px', borderRadius:8, background:'var(--primary-violet)', color:'white', border:'none', cursor:'pointer', fontSize:11, fontWeight:700 }}
          >
            {t('period.apply')}
          </button>
        </div>
      )}
    </div>
  )
}
