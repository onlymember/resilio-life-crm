import React, { useState } from 'react'
import { AlertCircle, Clock, CheckCircle, Calendar } from 'lucide-react'
import QuickActions from './QuickActions.jsx'
import DateTimePicker from './DateTimePicker.jsx'
import { t } from '../../i18n/index.js'

const fmtDue = (iso, isOverdue, isToday) => {
  if (!iso) return null
  if (isOverdue) return t('agenda.overdue')
  if (isToday)   return t('agenda.today')
  const d   = new Date(iso)
  const now = new Date()
  const diffDays = Math.ceil((d - now) / 86400000)
  if (diffDays === 1) return t('agenda.tomorrow')
  return d.toLocaleDateString('es', { day: 'numeric', month: 'short' })
}

const toDatetimeLocal = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function AgendaItem({ item, onComplete, onReschedule, onNote }) {
  const [completing,    setCompleting]    = useState(false)
  const [rescheduling,  setRescheduling]  = useState(false)
  const [newDatetime,   setNewDatetime]   = useState(toDatetimeLocal(item.dueAt))
  const [error,         setError]         = useState(null)

  const handleComplete = async () => {
    if (completing) return
    setCompleting(true)
    setError(null)
    try {
      await onComplete(item)
    } catch(e) {
      setError(e.message)
      setCompleting(false)
    }
  }

  const handleConfirmReschedule = async () => {
    if (!newDatetime) return
    setError(null)
    try {
      await onReschedule(item, new Date(newDatetime).toISOString())
      setRescheduling(false)
    } catch(e) {
      setError(e.message)
    }
  }

  const dueLabel  = fmtDue(item.dueAt, item.isOverdue, item.isToday)
  const borderCol = item.isOverdue ? 'rgba(239,68,68,0.3)' : 'var(--border-violet)'
  const bgCol     = item.isOverdue ? 'rgba(239,68,68,0.06)' : 'var(--glass-bg)'
  const timeCol   = item.isOverdue ? '#F87171' : item.isToday ? '#FBBF24' : 'var(--text-secondary)'

  return (
    <div style={{
      padding: '12px 14px', borderRadius: 12,
      background: bgCol, border: `1px solid ${borderCol}`,
      transition: 'all 0.2s',
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        {item.isOverdue
          ? <AlertCircle size={15} color="#F87171" style={{ flexShrink: 0, marginTop: 2 }}/>
          : <Clock       size={15} color="var(--primary-violet-light)" style={{ flexShrink: 0, marginTop: 2 }}/>
        }
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3 }}>
            {item.title}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {item.subtitle}
          </div>
        </div>
        {dueLabel && (
          <span style={{ fontSize: 10, fontWeight: 700, color: timeCol, flexShrink: 0, paddingTop: 2 }}>
            {dueLabel}
          </span>
        )}
      </div>

      {/* Quick actions */}
      {item.kind === 'next_action' && (
        <QuickActions
          whatsapp={item.whatsapp}
          instagram={item.instagram}
          phone={item.phone}
          onNote={onNote ? () => onNote(item) : null}
        />
      )}

      {/* Error */}
      {error && (
        <div style={{ fontSize: 11, color: '#F87171', marginTop: 8, padding: '4px 8px', background: 'rgba(239,68,68,0.08)', borderRadius: 6 }}>
          {error}
        </div>
      )}

      {/* Reschedule picker */}
      {rescheduling && (
        <DateTimePicker
          value={newDatetime}
          onChange={setNewDatetime}
          onConfirm={handleConfirmReschedule}
          onCancel={() => setRescheduling(false)}
        />
      )}

      {/* Action buttons */}
      {!rescheduling && (
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <button
            onClick={handleComplete}
            disabled={completing}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
              background: completing ? 'rgba(52,211,153,0.06)' : 'rgba(52,211,153,0.12)',
              color: '#34D399', border: '1px solid rgba(52,211,153,0.25)',
              cursor: completing ? 'default' : 'pointer', transition: 'all 0.15s',
            }}
            onMouseEnter={e => { if (!completing) e.currentTarget.style.background = 'rgba(52,211,153,0.22)' }}
            onMouseLeave={e => { if (!completing) e.currentTarget.style.background = 'rgba(52,211,153,0.12)' }}
          >
            <CheckCircle size={12}/>
            {completing ? t('agenda.completing') : t('agenda.complete')}
          </button>
          {item.kind === 'next_action' && (
            <button
              onClick={() => setRescheduling(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '6px 12px', borderRadius: 8, fontSize: 12,
                background: 'transparent', color: 'var(--text-secondary)',
                border: '1px solid var(--border-violet)', cursor: 'pointer',
              }}
            >
              <Calendar size={12}/>{t('agenda.reschedule')}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
