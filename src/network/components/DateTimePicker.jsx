import React from 'react'
import { t } from '../../i18n/index.js'

export default function DateTimePicker({ value, onChange, onConfirm, onCancel }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
      <input
        type="datetime-local"
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          width: '100%', padding: '8px 12px',
          background: 'rgba(139,92,246,0.08)', border: '1px solid var(--border-violet)',
          borderRadius: 8, color: 'var(--text-primary)', fontSize: 13,
          colorScheme: 'dark',
        }}
      />
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={onConfirm}
          style={{
            flex: 1, padding: '8px 0', borderRadius: 8, fontSize: 13, fontWeight: 600,
            background: 'var(--primary-violet)', color: 'white', border: 'none', cursor: 'pointer',
          }}
        >
          {t('agenda.confirmReschedule')}
        </button>
        <button
          onClick={onCancel}
          style={{
            flex: 1, padding: '8px 0', borderRadius: 8, fontSize: 13,
            background: 'transparent', color: 'var(--text-secondary)',
            border: '1px solid var(--border-violet)', cursor: 'pointer',
          }}
        >
          {t('agenda.cancelReschedule')}
        </button>
      </div>
    </div>
  )
}
