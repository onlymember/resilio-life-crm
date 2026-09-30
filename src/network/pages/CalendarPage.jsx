import React, { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import { t } from '../../i18n/index.js'
import { dbGetCalendarRange, dbGetCollabCalendar, dbGetGeography } from '../../lib/database.js'
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

// Colaboraciones como ítems del calendario. Choque = la misma influencer
// o la misma marca con dos colaboraciones el mismo día.
const COLLAB_COLOR = { proposed: '#9CA3AF', confirmed: '#60A5FA', in_progress: '#A78BFA', content_pending: '#FBBF24', completed: '#34D399' }
function collabItems(rows) {
  const count = {}
  const k = (a, b) => `${a}|${b}`
  rows.forEach(r => {
    count[k(r.date, 'i' + r.influencerId)] = (count[k(r.date, 'i' + r.influencerId)] || 0) + 1
    if (r.brandId) count[k(r.date, 'b' + r.brandId)] = (count[k(r.date, 'b' + r.brandId)] || 0) + 1
  })
  return rows.map(r => ({
    kind: 'collab', entityType: 'collaboration', entityId: r.id, allDay: true,
    title: `${r.influencerName} × ${r.brandName}`, subtitle: t(`collab.status.${r.status}`),
    dueAt: r.date, color: COLLAB_COLOR[r.status],
    conflict: count[k(r.date, 'i' + r.influencerId)] > 1 || (r.brandId && count[k(r.date, 'b' + r.brandId)] > 1),
  }))
}

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
  // 'mine' = mi agenda (como antes) · 'collabs' = colaboraciones por ciudad
  const [mode,    setMode]    = useState('mine')
  const [cityId,  setCityId]  = useState('')
  const [cities,  setCities]  = useState([])
  useEffect(() => { dbGetGeography().then(g => setCities(g.cities || [])).catch(() => {}) }, [])

  const load = useCallback(async (m) => {
    setLoading(true)
    const from = fmtDate(m)
    const to   = fmtDate(new Date(m.getFullYear(), m.getMonth() + 1, 0))
    try {
      if (mode === 'collabs') {
        setItems(collabItems(await dbGetCollabCalendar(from, to, cityId || null)))
        return
      }
      const data = await dbGetCalendarRange(from, to)
      setItems(data)
    } catch (e) {
      console.error('CalendarPage:', e.message)
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [mode, cityId])

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

      {/* Mi agenda / Colaboraciones por ciudad */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {['mine', 'collabs'].map(m => (
          <button key={m} onClick={() => setMode(m)} style={{
            padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer',
            background: mode === m ? 'rgba(139,92,246,0.25)' : 'rgba(139,92,246,0.07)',
            color: mode === m ? 'var(--primary-violet-light)' : 'var(--text-secondary)',
            border: mode === m ? '1px solid rgba(139,92,246,0.5)' : '1px solid var(--border-violet)',
          }}>{t(`calendarCollabs.mode.${m}`)}</button>
        ))}
        {mode === 'collabs' && (
          <select value={cityId} onChange={e => setCityId(e.target.value)} aria-label={t('calendarCollabs.city')}
            style={{ padding: '5px 10px', borderRadius: 8, background: 'rgba(139,92,246,0.07)', border: '1px solid var(--border-violet)', color: 'var(--text-primary)', fontSize: 12 }}>
            <option value="">{t('calendarCollabs.allCities')}</option>
            {[...cities].sort((a, b) => a.name.localeCompare(b.name)).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}
        {mode === 'collabs' && !loading && (() => {
          const conflicts = items.filter(i => i.conflict).length
          const busy = new Set(items.map(i => i.dueAt))
          const last = new Date(month.getFullYear(), month.getMonth() + 1, 0)
          const start = isCurrentMonth ? new Date(now.getFullYear(), now.getMonth(), now.getDate()) : new Date(month)
          let gaps = 0
          for (let d = new Date(start); d <= last; d.setDate(d.getDate() + 1)) if (!busy.has(fmtDate(d))) gaps++
          return (
            <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
              {t('calendarCollabs.summary', { n: items.length, gaps })}
              {conflicts > 0 && <b style={{ color: '#F87171' }}> · {t('calendarCollabs.conflicts', { n: conflicts })}</b>}
            </span>
          )
        })()}
      </div>

      {/* Contenido */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[0,1,2,3].map(i => (
            <div key={i} style={{ height: isMobile ? 60 : 80, borderRadius: 8, background: 'rgba(139,92,246,0.06)', animation: 'pulse 1.5s ease-in-out infinite' }}/>
          ))}
        </div>
      ) : (
        <>
          <CalendarMonthGrid items={items} month={month} onItemClick={handleItemClick}/>

          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
              {t('calendar.listTitle')}
            </div>
            {items.length === 0 ? (
              <div style={{ padding: '28px 0', textAlign: 'center' }}>
                <Calendar size={32} style={{ color: 'var(--text-secondary)', opacity: 0.3, display: 'block', margin: '0 auto 12px' }}/>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{t('calendar.emptyMonth')}</div>
              </div>
            ) : (
              <div style={{ maxWidth: 640 }}>
                <CalendarAgendaList items={items} month={month} onItemClick={handleItemClick}/>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
