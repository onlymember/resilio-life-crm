import React, { useRef, useState } from 'react'
import { t } from '../../i18n/index.js'

const PRIORITY_COLOR = { urgent: '#F87171', high: '#FB923C', normal: '#60A5FA', low: '#9CA3AF' }

const fmtDate = (iso, isOverdue) => {
  if (!iso) return null
  const d = new Date(iso)
  const now = new Date()
  const diffDays = Math.round((d.setHours(0,0,0,0) - now.setHours(0,0,0,0)) / 86400000)
  if (isOverdue) return { label: diffDays === 0 ? 'Hoy' : `Hace ${Math.abs(diffDays)}d`, overdue: true }
  if (diffDays === 0) return { label: 'Hoy', overdue: false }
  if (diffDays === 1) return { label: t('agenda.tomorrow'), overdue: false }
  return { label: d.toLocaleDateString('es', { day: 'numeric', month: 'short' }), overdue: false }
}

export default function TaskRow({ task, onComplete }) {
  const [done, setDone]       = useState(false)
  const [loading, setLoading] = useState(false)
  const touchX = useRef(null)

  const complete = async () => {
    if (done || loading) return
    setLoading(true)
    try {
      await onComplete(task.id)
      setDone(true)
    } catch { setLoading(false) }
  }

  const onTouchStart = (e) => { touchX.current = e.touches[0].clientX }
  const onTouchEnd   = (e) => {
    if (touchX.current === null) return
    const dx = e.changedTouches[0].clientX - touchX.current
    touchX.current = null
    if (dx > 80) complete()
  }

  const date   = fmtDate(task.dueDate, task.isOverdue)
  const pColor = PRIORITY_COLOR[task.priority] || '#9CA3AF'

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 14px',
        background: done ? 'rgba(52,211,153,0.05)' : 'var(--glass-bg)',
        border: `1px solid ${done ? 'rgba(52,211,153,0.2)' : 'var(--border-violet)'}`,
        borderRadius: 12, transition: 'all 0.2s',
        opacity: done ? 0.5 : 1,
      }}
    >
      {/* Checkbox — 44px touch target */}
      <button
        onClick={complete}
        disabled={done || loading}
        aria-label={t('agenda.complete')}
        style={{
          width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, background: 'none', border: 'none', cursor: done ? 'default' : 'pointer',
          padding: 0,
        }}
      >
        <div style={{
          width: 22, height: 22, borderRadius: '50%',
          border: `2px solid ${done ? '#34D399' : `${pColor}80`}`,
          background: done ? 'rgba(52,211,153,0.2)' : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.15s',
        }}>
          {done && <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#34D399' }}/>}
          {loading && !done && <div style={{ width: 10, height: 10, borderRadius: '50%', background: `${pColor}60`, animation: 'spin 1s linear infinite' }}/>}
        </div>
      </button>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: done ? 'line-through' : 'none' }}>
          {task.title}
        </div>
        {date && (
          <div style={{ fontSize: 10, color: date.overdue ? '#F87171' : 'var(--text-secondary)', marginTop: 2 }}>
            {date.label}
          </div>
        )}
      </div>

      <span style={{
        fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 8,
        background: `${pColor}15`, color: pColor, flexShrink: 0,
        textTransform: 'uppercase', letterSpacing: 0.5,
      }}>
        {t(`task.priorities.${task.priority}`) || task.priority}
      </span>
    </div>
  )
}
