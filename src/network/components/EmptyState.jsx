import React from 'react'
import { Plus } from 'lucide-react'

export default function EmptyState({ icon: Icon, title, subtitle, actionLabel, onAction }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: 280, gap: 16, padding: '40px 24px',
      textAlign: 'center',
    }}>
      {Icon && (
        <div style={{
          width: 56, height: 56, borderRadius: 18,
          background: 'rgba(139,92,246,0.1)',
          border: '1px solid rgba(139,92,246,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={24} color="var(--primary-violet-light)"/>
        </div>
      )}
      <div>
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
          {title}
        </div>
        {subtitle && (
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 300, lineHeight: 1.5 }}>
            {subtitle}
          </div>
        )}
      </div>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '10px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600,
            background: 'linear-gradient(135deg, var(--primary-violet-dark), var(--primary-violet))',
            color: 'white', border: 'none', cursor: 'pointer',
            boxShadow: '0 0 16px rgba(139,92,246,0.3)',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          <Plus size={15}/>
          {actionLabel}
        </button>
      )}
    </div>
  )
}
