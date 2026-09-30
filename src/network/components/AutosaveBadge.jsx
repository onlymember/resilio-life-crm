// Indicador chico de guardado automático ("Guardando…" / "Guardado").
import React from 'react'
import { Check, Loader2, AlertCircle } from 'lucide-react'
import { t } from '../../i18n/index.js'

export default function AutosaveBadge({ state, onRetry }) {
  if (state === 'idle') return null
  const map = {
    pending: { icon: Loader2, label: t('autosave.pending'), col: 'var(--text-secondary)' },
    saving:  { icon: Loader2, label: t('autosave.saving'),  col: 'var(--text-secondary)' },
    saved:   { icon: Check,   label: t('autosave.saved'),   col: '#34D399' },
    error:   { icon: AlertCircle, label: t('autosave.error'), col: '#F87171' },
  }
  const m = map[state]
  if (!m) return null
  return (
    <button type="button" onClick={state === 'error' ? onRetry : undefined} aria-live="polite" style={{
      display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: m.col, flexShrink: 0,
      background: 'none', border: 'none', padding: '2px 4px', cursor: state === 'error' ? 'pointer' : 'default', whiteSpace: 'nowrap',
    }}>
      <m.icon size={12} style={state === 'saving' || state === 'pending' ? { animation: 'spin 1s linear infinite' } : undefined}/>{m.label}
    </button>
  )
}
