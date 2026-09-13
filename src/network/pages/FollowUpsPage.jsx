import React, { useState, useEffect, useCallback } from 'react'
import AgendaItem from '../components/AgendaItem.jsx'
import { t } from '../../i18n/index.js'
import { useTz } from '../utils/tz.js'
import { getMyAgenda } from '../../lib/metrics.js'
import { dbCompleteNextAction, dbSetNextAction, dbCompleteTask } from '../../lib/database.js'

const GROUP_SIZE = 20

function groupItems(items) {
  const now  = new Date()
  const eow  = new Date(now); eow.setDate(eow.getDate() + (7 - eow.getDay()))
  const overdue = [], today = [], week = [], later = []
  for (const item of items) {
    if (item.isOverdue) { overdue.push(item); continue }
    if (item.isToday)   { today.push(item);   continue }
    const due = new Date(item.dueAt)
    if (due <= eow)     { week.push(item);    continue }
    later.push(item)
  }
  return { overdue, today, week, later }
}

function Group({ labelKey, items, onComplete, onReschedule }) {
  const [show, setShow] = useState(GROUP_SIZE)
  if (!items.length) return null
  const visible  = items.slice(0, show)
  const remaining = items.length - show
  return (
    <section>
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1.4, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 8, marginTop: 24 }}>
        {t(`followups.groups.${labelKey}`)}
        <span style={{ marginLeft: 6, fontWeight: 400 }}>({items.length})</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {visible.map((item, i) => (
          <AgendaItem
            key={`${item.entityId}-${item.entityType}-${i}`}
            item={item}
            onComplete={onComplete}
            onReschedule={onReschedule}
          />
        ))}
      </div>
      {remaining > 0 && (
        <button
          onClick={() => setShow(s => s + GROUP_SIZE)}
          style={{ marginTop: 8, width: '100%', padding: '8px', borderRadius: 8, background: 'rgba(139,92,246,0.07)', border: '1px solid var(--border-violet)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 12 }}
        >
          {t('followups.viewMore', { n: remaining })}
        </button>
      )}
    </section>
  )
}

const ENTITY_FILTERS = ['all', 'influencer', 'brand', 'opportunity', 'collaboration']

export default function FollowUpsPage() {
  const tz = useTz()
  const [allItems, setAllItems] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [typeFilter, setTypeFilter] = useState('all')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const items = await getMyAgenda(365)
      setAllItems(items)
    } catch(e) { console.error('FollowUpsPage:', e.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleComplete = useCallback(async (item) => {
    if (item.kind === 'task') {
      await dbCompleteTask(item.entityId)
    } else {
      await dbCompleteNextAction(item.entityType, item.entityId)
    }
    setAllItems(prev => prev.filter(a => !(a.entityId === item.entityId && a.entityType === item.entityType && a.kind === item.kind)))
  }, [])

  const handleReschedule = useCallback(async (item, isoAt) => {
    await dbSetNextAction(item.entityType, item.entityId, item.title, isoAt)
    const now = new Date()
    const due = new Date(isoAt)
    setAllItems(prev => prev.map(a =>
      (a.entityId === item.entityId && a.entityType === item.entityType && a.kind === item.kind)
        ? { ...a, dueAt: isoAt, isOverdue: due < now, isToday: due.toDateString() === now.toDateString() }
        : a
    ))
  }, [])

  const filtered = typeFilter === 'all'
    ? allItems
    : allItems.filter(a => a.entityType === typeFilter)

  const { overdue, today, week, later } = groupItems(filtered)
  const total = overdue.length + today.length + week.length + later.length

  return (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 4, maxWidth: 680 }}>
      {/* Header */}
      <div style={{ marginBottom: 12 }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>
          {t('followups.title')}
        </h1>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
          {loading ? t('loading.generic') : `${total} ${t('followups.subtitle').toLowerCase()}`}
        </p>
      </div>

      {/* Entity type filter chips */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
        {ENTITY_FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setTypeFilter(f)}
            style={{
              padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer',
              background: typeFilter === f ? 'rgba(139,92,246,0.25)' : 'rgba(139,92,246,0.07)',
              color: typeFilter === f ? 'var(--primary-violet-light)' : 'var(--text-secondary)',
              border: typeFilter === f ? '1px solid rgba(139,92,246,0.5)' : '1px solid var(--border-violet)',
            }}
          >
            {t(`followups.filters.${f}`)}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
          {[0,1,2,3].map(i => <div key={i} style={{ height: 80, borderRadius: 12, background: 'rgba(139,92,246,0.06)', animation: 'pulse 1.5s ease-in-out infinite' }}/>)}
        </div>
      ) : total === 0 ? (
        <div style={{ marginTop: 40, textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>
          {t('followups.empty')}
        </div>
      ) : (
        <div style={{ paddingBottom: 40 }}>
          <Group labelKey="overdue" items={overdue} onComplete={handleComplete} onReschedule={handleReschedule}/>
          <Group labelKey="today"   items={today}   onComplete={handleComplete} onReschedule={handleReschedule}/>
          <Group labelKey="week"    items={week}    onComplete={handleComplete} onReschedule={handleReschedule}/>
          <Group labelKey="later"   items={later}   onComplete={handleComplete} onReschedule={handleReschedule}/>
        </div>
      )}
    </div>
  )
}
