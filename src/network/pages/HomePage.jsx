import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, Building2, Briefcase, Handshake } from 'lucide-react'
import AgendaItem from '../components/AgendaItem.jsx'
import StatTile from '../components/StatTile.jsx'
import MissionProgress from '../components/MissionProgress.jsx'
import EmptyState from '../components/EmptyState.jsx'
import { t } from '../../i18n/index.js'
import { getMyAgenda, getMyNetworkStats, getMyMissions } from '../../lib/metrics.js'
import { dbCompleteNextAction, dbSetNextAction, dbCompleteTask, dbSaveTask } from '../../lib/database.js'
import { supabase } from '../../lib/supabase.js'

const AGENDA_PREVIEW = 5

function greeting(tz) {
  const h = tz
    ? Number(new Date().toLocaleString('en', { timeZone: tz, hour: 'numeric', hour12: false }))
    : new Date().getHours()
  if (h >= 5  && h < 12) return t('home.greeting.morning')
  if (h >= 12 && h < 20) return t('home.greeting.afternoon')
  return t('home.greeting.evening')
}

async function fetchTimezone(userId) {
  if (!userId) return null
  const { data } = await supabase
    .from('scouters')
    .select('cities(timezone)')
    .eq('user_id', userId)
    .maybeSingle()
  return data?.cities?.timezone || null
}

export default function HomePage({ currentUser, onOpenCreate }) {
  const navigate = useNavigate()

  const [agenda,   setAgenda]   = useState([])
  const [stats,    setStats]    = useState(null)
  const [missions, setMissions] = useState([])
  const [tz,       setTz]       = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [showAll,  setShowAll]  = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [ag, st, ms, timezone] = await Promise.all([
        getMyAgenda(7),
        getMyNetworkStats(),
        getMyMissions(),
        fetchTimezone(currentUser?.id),
      ])
      setAgenda(ag)
      setStats(st)
      setMissions(ms)
      setTz(timezone)
    } catch(e) {
      console.error('HomePage load:', e.message)
    } finally {
      setLoading(false)
    }
  }, [currentUser?.id])

  useEffect(() => { load() }, [load])

  const handleComplete = useCallback(async (item) => {
    if (item.kind === 'task') {
      await dbCompleteTask(item.entityId)
    } else {
      await dbCompleteNextAction(item.entityType, item.entityId)
    }
    setAgenda(prev => prev.filter(a => !(a.entityId === item.entityId && a.entityType === item.entityType)))
    setStats(prev => prev ? {
      ...prev,
      tasksToday:    item.kind === 'task' ? Math.max(0, prev.tasksToday - 1)    : prev.tasksToday,
      tasksOverdue:  (item.kind === 'task' && item.isOverdue) ? Math.max(0, prev.tasksOverdue - 1) : prev.tasksOverdue,
      followupsToday:  (item.kind === 'next_action' && item.isToday)   ? Math.max(0, prev.followupsToday - 1)   : prev.followupsToday,
      followupsOverdue:(item.kind === 'next_action' && item.isOverdue) ? Math.max(0, prev.followupsOverdue - 1) : prev.followupsOverdue,
    } : prev)
  }, [])

  const handleReschedule = useCallback(async (item, isoAt) => {
    await dbSetNextAction(item.entityType, item.entityId, item.title, isoAt)
    setAgenda(prev => prev.map(a =>
      (a.entityId === item.entityId && a.entityType === item.entityType)
        ? { ...a, dueAt: isoAt, isOverdue: false, isToday: new Date(isoAt).toDateString() === new Date().toDateString() }
        : a
    ))
  }, [])

  const name = currentUser?.nombre?.split(' ')[0] || currentUser?.username || ''
  const greet = greeting(tz)

  const visible = showAll ? agenda : agenda.slice(0, AGENDA_PREVIEW)

  if (loading) {
    return (
      <div style={{ padding: 20 }}>
        <div style={{ height: 28, width: 180, borderRadius: 8, background: 'rgba(139,92,246,0.08)', marginBottom: 20 }}/>
        {[0,1,2].map(i => (
          <div key={i} style={{ height: 80, borderRadius: 12, background: 'rgba(139,92,246,0.06)', border: '1px solid var(--border-violet)', marginBottom: 10 }}/>
        ))}
      </div>
    )
  }

  const tasksLabel = stats
    ? (stats.tasksOverdue > 0
        ? t('home.tasksOverdue', { n: stats.tasksToday + stats.tasksOverdue })
        : t('home.tasks', { n: stats.tasksToday }))
    : '—'
  const followLabel = stats
    ? (stats.followupsOverdue > 0
        ? t('home.followupsOverdue', { n: stats.followupsToday + stats.followupsOverdue })
        : t('home.followups', { n: stats.followupsToday }))
    : '—'

  return (
    <div className="nw-home-grid">

      {/* ── Columna izquierda ── */}
      <div style={{ padding: '20px 20px 0' }}>

        {/* 1 · SALUDO */}
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>
            {greet}{name ? `, ${name}` : ''}
          </h1>
        </div>

        {/* 2 · HOY */}
        {stats && (
          <section style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8 }}>
              {t('home.today')}
            </div>
            <div className="nw-stat-row">
              <StatTile
                value={stats.tasksToday + stats.tasksOverdue}
                label={tasksLabel}
                onClick={() => navigate('/network/tasks')}
                accent={stats.tasksOverdue > 0 ? '#F87171' : undefined}
              />
              <StatTile
                value={stats.followupsToday + stats.followupsOverdue}
                label={followLabel}
                onClick={() => navigate('/network/influencers')}
                accent={stats.followupsOverdue > 0 ? '#FB923C' : undefined}
              />
              <StatTile
                value={stats.opportunities}
                label={t('nav.opportunities')}
                onClick={() => navigate('/network/opportunities')}
              />
              <StatTile
                value={stats.collaborations}
                label={t('nav.collaborations')}
                onClick={() => navigate('/network/collaborations')}
              />
            </div>
          </section>
        )}

        {/* 3 · NECESITA ATENCIÓN */}
        <section style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8 }}>
            {t('home.needsAttention')}
          </div>
          {agenda.length === 0 ? (
            <div style={{ padding: '16px 14px', borderRadius: 12, background: 'rgba(52,211,153,0.06)', border: '1px dashed rgba(52,211,153,0.25)', textAlign: 'center' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#34D399', marginBottom: 4 }}>{t('home.allClear')}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t('home.allClearSubtitle')}</div>
              {stats && stats.influencers === 0 && (
                <button
                  onClick={onOpenCreate}
                  style={{ marginTop: 10, padding: '6px 14px', borderRadius: 8, background: 'rgba(139,92,246,0.15)', color: 'var(--primary-violet-light)', border: '1px solid var(--border-violet)', fontSize: 12, cursor: 'pointer' }}
                >
                  + {t('home.newScouter')}
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {visible.map((item, i) => (
                <AgendaItem
                  key={`${item.entityType}-${item.entityId}-${i}`}
                  item={item}
                  onComplete={handleComplete}
                  onReschedule={item.kind === 'next_action' ? handleReschedule : undefined}
                />
              ))}
              {agenda.length > AGENDA_PREVIEW && !showAll && (
                <button
                  onClick={() => setShowAll(true)}
                  style={{ padding: '8px 0', fontSize: 12, color: 'var(--primary-violet-light)', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  {t('home.seeAll', { n: agenda.length - AGENDA_PREVIEW })}
                </button>
              )}
            </div>
          )}
        </section>
      </div>

      {/* ── Columna derecha ── */}
      <div style={{ padding: '20px 20px 20px' }}>

        {/* 4 · MI NETWORK */}
        {stats && (
          <section style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8 }}>
              {t('home.myNetwork')}
            </div>
            <div className="nw-stat-row">
              <StatTile value={stats.influencers}  label={t('nav.influencers')}   onClick={() => navigate('/network/influencers')}   accent="#A78BFA"/>
              <StatTile value={stats.brands}        label={t('nav.brands')}        onClick={() => navigate('/network/brands')}        accent="#60A5FA"/>
              <StatTile value={stats.opportunities} label={t('nav.opportunities')} onClick={() => navigate('/network/opportunities')} accent="#FBBF24"/>
              <StatTile value={stats.collaborations}label={t('nav.collaborations')}onClick={() => navigate('/network/collaborations')}accent="#34D399"/>
            </div>
          </section>
        )}

        {/* 5 · MISIONES — solo si hay */}
        {missions.length > 0 && (
          <section>
            <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8 }}>
              {t('home.missions')}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {missions.map(m => <MissionProgress key={m.id} mission={m}/>)}
            </div>
          </section>
        )}
      </div>

    </div>
  )
}
