import React, { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import { t } from '../../i18n/index.js'
import { dbGetCalendarRange } from '../../lib/database.js'
import CalendarMonthGrid from '../components/CalendarMonthGrid.jsx'
import CalendarAgendaList from '../components/CalendarAgendaList.jsx'
import { useNavigate } from 'react-router-dom'

const useIsMobile = () => {
  const [mobile, setMobile] = useState(window.innerWidth < 640)
  useEffect(() => {
    const h = () => setMobile(window.innerWidth < 640)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])
  return mobile
}

const pad2 = (n) => String(n).padStart(2, '0')

const fmtDate = (date) =>
  `${date.getFullYear()}-${pad2(date.getMonth()+1)}-${pad2(date.getDate())}`

const ENTITY_PATHS = { influencer: 'influencers', brand: 'brands', opportunity: 'opportunities', collaboration: 'collaborations', task: 'tasks' }

export default function CalendarPage() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()

  const [month, setMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [items,   setItems]   = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async (m) => {
    setLoading(true)
    const from = fmtDate(m)
    const to   = fmtDate(new Date(m.getFullYear(), m.getMonth() + 1, 0))
    try {
      const data = await dbGetCalendarRange(from, to)
      setItems(data)
    } catch (e) {
      console.error('CalendarPage:', e.message)
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load(month) }, [month, load])

  const prevMonth = () => setMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))
  const nextMonth = () => setMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))

  const now = new Date()
  const isCurrentMonth = month.getFullYear() === now.getFullYear() && month.getMonth() === now.getMonth()

  const goToday = () => setMonth(new Date(now.getFullYear(), now.getMonth(), 1))

  const MONTHS = t('calendar.months')
  const monthName = Array.isArray(MONTHS) ? MONTHS[month.getMonth()] : month.toLocaleDateString('es', { month: 'long' })

  const handleItemClick = (item) => {
    if (!item.entityId) return
    const base = ENTITY_PATHS[item.entityType]
    if (base) navigate(`/network/${base}/${item.entityId}`)
  }

  return (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 960 }}>

      {/* Header + navegación */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>
            {t('calendar.title')}
          </h1>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t('calendar.subtitle')}</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {!isCurrentMonth && (
            <button
              onClick={goToday}
              style={{ padding: '5px 12px', borderRadius: 8, background: 'rgba(139,92,246,0.1)', border: '1px solid var(--border-violet)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 11, fontWeight: 600, minHeight: 32 }}
            >
              {t('calendar.today')}
            </button>
          )}
          <button
            onClick={prevMonth}
            style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(139,92,246,0.08)', border: '1px solid var(--border-violet)', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <ChevronLeft size={16}/>
          </button>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', minWidth: 150, textAlign: 'center', textTransform: 'capitalize' }}>
            {monthName} {month.getFullYear()}
          </span>
          <button
            onClick={nextMonth}
            style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(139,92,246,0.08)', border: '1px solid var(--border-violet)', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <ChevronRight size={16}/>
          </button>
        </div>
      </div>

      {/* Contenido */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[0,1,2,3].map(i => (
            <div key={i} style={{ height: isMobile ? 60 : 80, borderRadius: 8, background: 'rgba(139,92,246,0.06)', animation: 'pulse 1.5s ease-in-out infinite' }}/>
          ))}
        </div>
      ) : isMobile ? (
        <CalendarAgendaList items={items} month={month} onItemClick={handleItemClick}/>
      ) : (
        items.length === 0 ? (
          <div style={{ padding: '48px 0', textAlign: 'center' }}>
            <Calendar size={40} style={{ color: 'var(--text-secondary)', opacity: 0.35, display: 'block', margin: '0 auto 16px' }}/>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6, textTransform: 'capitalize' }}>
              {t('calendar.empty')}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 280, margin: '0 auto' }}>
              {t('calendar.emptyCta')}
            </div>
          </div>
        ) : (
          <CalendarMonthGrid items={items} month={month} onItemClick={handleItemClick}/>
        )
      )}
    </div>
  )
}
