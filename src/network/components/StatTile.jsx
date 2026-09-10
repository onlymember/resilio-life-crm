import React from 'react'

export default function StatTile({ value, label, onClick, accent }) {
  const color = accent || 'var(--primary-violet-light)'
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 3, padding: '14px 6px', minWidth: 0,
        background: 'var(--glass-bg)', border: '1px solid var(--border-violet)', borderRadius: 12,
        cursor: onClick ? 'pointer' : 'default', transition: 'all 0.15s',
      }}
      onMouseEnter={e => { if (onClick) { e.currentTarget.style.background = 'rgba(139,92,246,0.1)'; e.currentTarget.style.borderColor = `${color}60` } }}
      onMouseLeave={e => { if (onClick) { e.currentTarget.style.background = 'var(--glass-bg)'; e.currentTarget.style.borderColor = 'var(--border-violet)' } }}
    >
      <span style={{ fontSize: 22, fontWeight: 800, color, lineHeight: 1 }}>{value ?? '—'}</span>
      <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'center', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>
        {label}
      </span>
    </button>
  )
}
