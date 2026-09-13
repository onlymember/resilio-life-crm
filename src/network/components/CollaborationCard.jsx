import React from 'react'
import { t } from '../../i18n/index.js'

const todayStr = () => new Date().toISOString().slice(0, 10)

const urgencyColor = (nextActionAt) => {
  if (!nextActionAt) return null
  const d = nextActionAt.slice(0, 10)
  const today = todayStr()
  if (d < today)  return '#F87171'
  if (d === today) return '#FBBF24'
  return null
}

const fmtMoney = (n, cur) => {
  if (!n) return null
  const s = n >= 1000000 ? `${(n/1000000).toFixed(1)}M` : n >= 1000 ? `${(n/1000).toFixed(0)}K` : String(n)
  return cur ? `${s} ${cur}` : s
}

const fmtDate = (d) => {
  if (!d) return null
  return new Date(d).toLocaleDateString('es-AR', { day:'2-digit', month:'short' })
}

export default function CollaborationCard({ collab, activationType, onClick }) {
  const urgColor = urgencyColor(collab.nextActionAt)

  const statusColor = {
    proposed:        '#9CA3AF',
    confirmed:       '#60A5FA',
    in_progress:     '#A78BFA',
    content_pending: '#FBBF24',
    completed:       '#34D399',
    cancelled:       '#F87171',
  }[collab.status] || '#9CA3AF'

  const typeColor = activationType?.color || '#8B5CF6'
  const typeName  = activationType?.name  || '—'

  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', textAlign: 'left',
        background: 'var(--glass-bg)', border: '1px solid var(--border-violet)',
        borderRadius: 12, padding: '12px 14px', cursor: 'pointer',
        display: 'flex', flexDirection: 'column', gap: 8,
        transition: 'border-color 0.15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(139,92,246,0.4)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-violet)' }}
    >
      {/* Top row: names + type badge */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {collab.influencerName || '—'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {collab.brandName || '—'}
          </div>
        </div>
        <span style={{ padding: '3px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700, background: `${typeColor}18`, color: typeColor, border: `1px solid ${typeColor}30`, flexShrink: 0 }}>
          {typeName}
        </span>
      </div>

      {/* Bottom row: status, dates, amount */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ padding: '2px 8px', borderRadius: 8, fontSize: 10, fontWeight: 600, background: `${statusColor}15`, color: statusColor, border: `1px solid ${statusColor}30` }}>
          {t(`collab.status.${collab.status}`) || collab.status}
        </span>
        {(collab.startDate || collab.endDate) && (
          <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>
            {fmtDate(collab.startDate)}{collab.endDate ? ` → ${fmtDate(collab.endDate)}` : ''}
          </span>
        )}
        {urgColor && (
          <span style={{ padding: '2px 8px', borderRadius: 8, fontSize: 10, fontWeight: 700, background: `${urgColor}18`, color: urgColor, border: `1px solid ${urgColor}30` }}>
            {t('collab.nextAction')}
          </span>
        )}
        {collab.amount && (
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--primary-violet-light)', marginLeft: 'auto' }}>
            {fmtMoney(collab.amount, collab.currency)}
          </span>
        )}
      </div>
    </button>
  )
}
