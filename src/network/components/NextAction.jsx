import React from 'react'
import { AlertCircle, Clock, CheckCircle } from 'lucide-react'
import { t } from '../../i18n/index.js'

const diffDays = (iso) => {
  if (!iso) return null
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000)
}

export default function NextAction({ action, actionAt, onComplete }) {
  if (!action && !actionAt) {
    return (
      <div style={{
        padding: '12px 14px', borderRadius: 10,
        background: 'rgba(139,92,246,0.05)', border: '1px dashed rgba(139,92,246,0.2)',
        fontSize: 12, color: 'var(--text-secondary)', textAlign: 'center',
      }}>
        {t('nextAction.noAction')}
      </div>
    )
  }

  const days    = diffDays(actionAt)
  const overdue = days !== null && days < 0
  const today   = days !== null && days === 0

  const statusColor = overdue ? '#F87171' : today ? '#FBBF24' : 'var(--primary-violet-light)'
  const dateLine = (() => {
    if (days === null) return null
    if (overdue) return t('nextAction.overdue') + ' · ' + t('nextAction.daysOverdue', { n: Math.abs(days) })
    if (today)   return 'Hoy'
    return t('nextAction.daysLeft', { n: days })
  })()

  return (
    <div style={{
      padding: '12px 14px', borderRadius: 10,
      background: overdue ? 'rgba(239,68,68,0.08)' : 'rgba(139,92,246,0.08)',
      border: `1px solid ${overdue ? 'rgba(239,68,68,0.25)' : 'rgba(139,92,246,0.2)'}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: dateLine ? 8 : 0 }}>
        {overdue
          ? <AlertCircle size={14} color="#F87171" style={{ flexShrink: 0, marginTop: 1 }}/>
          : <Clock size={14} color={statusColor} style={{ flexShrink: 0, marginTop: 1 }}/>
        }
        <span style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.4, flex: 1 }}>
          {action || t('nextAction.label')}
        </span>
      </div>

      {(dateLine || onComplete) && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 22 }}>
          {dateLine && (
            <span style={{ fontSize: 11, color: statusColor, fontWeight: 500 }}>{dateLine}</span>
          )}
          {onComplete && (
            <button
              onClick={onComplete}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                fontSize: 11, fontWeight: 600, color: '#34D399',
                background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.25)',
                borderRadius: 6, padding: '3px 8px', cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(52,211,153,0.2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(52,211,153,0.1)'}
            >
              <CheckCircle size={11}/>{t('nextAction.complete')}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
