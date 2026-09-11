import React, { useState } from 'react'
import { t } from '../../i18n/index.js'

const KIND_COLOR = { task: '#A78BFA', next_action: '#22D3EE' }

function ItemPill({ item, onClick }) {
  const col = KIND_COLOR[item.kind] || 'var(--primary-violet-light)'
  return (
    <button
      onClick={e => { e.stopPropagation(); onClick(item) }}
      style={{
        width: '100%', textAlign: 'left',
        background: `${col}18`, border: `1px solid ${col}35`,
        borderRadius: 4, padding: '2px 5px', cursor: 'pointer',
        fontSize: 10, fontWeight: 600, color: col,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        marginBottom: 2, display: 'block',
      }}
    >
      {item.isOverdue && '⚡ '}{item.title}
    </button>
  )
}

export default function CalendarMonthGrid({ items, month, onItemClick }) {
  const [expanded, setExpanded] = useState({})

  const DAYS = t('calendar.days')
  const dayLabels = Array.isArray(DAYS) ? DAYS : ['D','L','M','X','J','V','S']

  const year = month.getFullYear()
  const mon  = month.getMonth()
  const firstDow    = new Date(year, mon, 1).getDay()
  const daysInMonth = new Date(year, mon + 1, 0).getDate()

  const pad2 = (n) => String(n).padStart(2, '0')
  const today = new Date()
  const todayKey = `${today.getFullYear()}-${pad2(today.getMonth()+1)}-${pad2(today.getDate())}`
  const dayKey = (d) => `${year}-${pad2(mon+1)}-${pad2(d)}`

  const byDay = {}
  items.forEach(item => {
    if (!item.dueAt) return
    const k = item.dueAt.split('T')[0]
    if (!byDay[k]) byDay[k] = []
    byDay[k].push(item)
  })

  const rows = Math.ceil((firstDow + daysInMonth) / 7)
  const MAX = 3

  return (
    <div>
      {/* Headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 2 }}>
        {dayLabels.map((d, i) => (
          <div key={i} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5, padding: '4px 0' }}>
            {d}
          </div>
        ))}
      </div>

      {/* Cells */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {Array.from({ length: rows * 7 }).map((_, cellIdx) => {
          const dayNum = cellIdx - firstDow + 1
          if (dayNum < 1 || dayNum > daysInMonth) {
            return <div key={cellIdx} style={{ minHeight: 80, background: 'rgba(139,92,246,0.015)', borderRadius: 6 }}/>
          }
          const dk = dayKey(dayNum)
          const dayItems = byDay[dk] || []
          const isToday = dk === todayKey
          const isExp = expanded[dk]
          const visible = isExp ? dayItems : dayItems.slice(0, MAX)
          const overflow = dayItems.length - MAX

          return (
            <div
              key={cellIdx}
              style={{
                minHeight: 80, padding: '4px 5px',
                background: isToday ? 'rgba(139,92,246,0.09)' : 'rgba(139,92,246,0.02)',
                border: isToday ? '1px solid rgba(139,92,246,0.45)' : '1px solid var(--border-violet)',
                borderRadius: 6, overflow: 'hidden',
              }}
            >
              <div style={{
                fontSize: 11, fontWeight: isToday ? 800 : 500,
                color: isToday ? 'var(--primary-violet-light)' : 'var(--text-secondary)',
                marginBottom: 3, textAlign: 'right',
              }}>
                {dayNum}
              </div>
              {visible.map((item, ii) => (
                <ItemPill key={ii} item={item} onClick={onItemClick}/>
              ))}
              {!isExp && overflow > 0 && (
                <button
                  onClick={() => setExpanded(prev => ({ ...prev, [dk]: true }))}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 9, color: 'var(--text-secondary)', padding: '1px 4px', fontWeight: 600, width: '100%', textAlign: 'left' }}
                >
                  {t('calendar.more', { n: overflow })}
                </button>
              )}
              {isExp && overflow > 0 && (
                <button
                  onClick={() => setExpanded(prev => ({ ...prev, [dk]: false }))}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 9, color: 'var(--text-secondary)', padding: '1px 4px', fontWeight: 600, width: '100%', textAlign: 'left' }}
                >
                  ▲
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
