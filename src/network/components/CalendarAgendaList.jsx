import React from 'react'
import { Calendar } from 'lucide-react'
import { t } from '../../i18n/index.js'

const KIND_COLOR = { task: '#A78BFA', next_action: '#22D3EE' }

function AgendaItem({ item, onClick }) {
  const col = KIND_COLOR[item.kind] || 'var(--primary-violet-light)'
  return (
    <button
      onClick={() => onClick(item)}
      style={{
        width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 0', background: 'none', border: 'none', cursor: 'pointer',
        borderBottom: '1px solid rgba(139,92,246,0.1)',
      }}
    >
      <div style={{ width: 4, alignSelf: 'stretch', minHeight: 36, borderRadius: 2, background: item.isOverdue ? '#F87171' : col, flexShrink: 0 }}/>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 2 }}>
          {item.isOverdue && '⚡ '}{item.title}
        </div>
        {item.subtitle && (
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {item.subtitle}
          </div>
        )}
      </div>
      {item.dueAt && (
        <div style={{ fontSize: 10, color: item.isOverdue ? '#F87171' : 'var(--text-secondary)', flexShrink: 0 }}>
          {new Date(item.dueAt).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
        </div>
      )}
    </button>
  )
}

export default function CalendarAgendaList({ items, month, onItemClick }) {
  const year = month.getFullYear()
  const mon  = month.getMonth()

  const pad2 = (n) => String(n).padStart(2, '0')
  const today = new Date()
  const todayKey = `${today.getFullYear()}-${pad2(today.getMonth()+1)}-${pad2(today.getDate())}`
  const tomorrowD = new Date(today); tomorrowD.setDate(today.getDate() + 1)
  const tomorrowKey = `${tomorrowD.getFullYear()}-${pad2(tomorrowD.getMonth()+1)}-${pad2(tomorrowD.getDate())}`

  const byDay = {}
  items.forEach(item => {
    if (!item.dueAt) return
    const k = item.dueAt.split('T')[0]
    if (!byDay[k]) byDay[k] = []
    byDay[k].push(item)
  })

  const activeDays = Object.keys(byDay).sort()

  const dayLabel = (dk) => {
    if (dk === todayKey)    return t('agenda.today')
    if (dk === tomorrowKey) return t('agenda.tomorrow') || 'Mañana'
    const d = new Date(dk + 'T12:00:00')
    return d.toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short' })
  }

  if (activeDays.length === 0) {
    const MONTHS = t('calendar.months')
    const monthName = Array.isArray(MONTHS) ? MONTHS[mon] : month.toLocaleDateString('es', { month: 'long' })
    return (
      <div style={{ padding: '48px 0', textAlign: 'center' }}>
        <Calendar size={40} style={{ color: 'var(--text-secondary)', opacity: 0.35, display: 'block', margin: '0 auto 16px' }}/>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6, textTransform: 'capitalize' }}>
          {t('calendar.empty')}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 240, margin: '0 auto' }}>
          {t('calendar.emptyCta')}
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {activeDays.map(dk => (
        <div key={dk} style={{ marginBottom: 20 }}>
          <div style={{
            fontSize: 11, fontWeight: 800,
            color: dk === todayKey ? 'var(--primary-violet-light)' : 'var(--text-secondary)',
            textTransform: 'uppercase', letterSpacing: 0.8,
            paddingBottom: 4, borderBottom: '1px solid var(--border-violet)',
            marginBottom: 2,
          }}>
            {dayLabel(dk)}
          </div>
          {byDay[dk].map((item, i) => (
            <AgendaItem key={i} item={item} onClick={onItemClick}/>
          ))}
        </div>
      ))}
    </div>
  )
}
