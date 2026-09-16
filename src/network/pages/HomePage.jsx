import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, Building2, Briefcase, Handshake, Sparkles } from 'lucide-react'
import AgendaItem from '../components/AgendaItem.jsx'
import StatTile from '../components/StatTile.jsx'
import MissionProgress from '../components/MissionProgress.jsx'
import ActivityTimeline from '../components/ActivityTimeline.jsx'
import EmptyState from '../components/EmptyState.jsx'
import { t } from '../../i18n/index.js'
import { useTz } from '../utils/tz.js'
import { getMyAgenda, getMyNetworkStats, getMyMissions, getNetworkPulse, getMyRecentActivity } from '../../lib/metrics.js'
import { dbCompleteNextAction, dbSetNextAction, dbCompleteTask, dbGetTaskById } from '../../lib/database.js'

const AGENDA_PREVIEW = 5

function greeting(tz) {
  const h = tz
    ? Number(new Date().toLocaleString('en', { timeZone: tz, hour: 'numeric', hour12: false }))
    : new Date().getHours()
  if (h >= 5  && h < 12) return t('home.greeting.morning')
  if (h >= 12 && h < 20) return t('home.greeting.afternoon')
  return t('home.greeting.evening')
}

export default function HomePage({ currentUser, onOpenCreate }) {
  const navigate = useNavigate()
  const tz = useTz()

  const [agenda,   setAgenda]   = useState([])
  const [stats,    setStats]    = useState(null)
  const [missions, setMissions] = useState([])
  const [pulse,    setPulse]    = useState(null)
  const [activity, setActivity] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [showAll,  setShowAll]  = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [ag, st, ms, pu, ac] = await Promise.all([
        getMyAgenda(7),
        getMyNetworkStats(),
        getMyMissions(),
        getNetworkPulse(1).catch(() => null),
        getMyRecentActivity(6).catch(() => []),
      ])
      setAgenda(ag)
      setStats(st)
      setMissions(ms)
      setPulse(pu)
      setActivity(ac)
    } catch(e) {
      console.error('HomePage load:', e.message)
    } finally {
      setLoading(false)
    }
  }, [])

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

  const handleNavigate = useCallback(async (item) => {
    const task = await dbGetTaskById(item.entityId).catch(() => null)
    if (!task?.entityType || !task?.entityId) return
    const path = {
      opportunity:   `/network/opportunities/${task.entityId}`,
      collaboration: `/network/collaborations/${task.entityId}`,
    }[task.entityType]
    if (path) navigate(path)
  }, [navigate])

  const handleReschedule = useCallback(async (item, isoAt) => {
    await dbSetNextAction(item.entityType, item.entityId, item.title, isoAt)
    setAgenda(prev => prev.map(a =>
      (a.entityId === item.entityId && a.entityType === item.entityType)
        ? { ...a, dueAt: isoAt, isOverdue: false, isToday: new Date(isoAt).toDateString() === new Date().toDateString() }
        : a
    ))
  }, [])

  const name  = currentUser?.nombre?.split(' ')[0] || currentUser?.username || ''
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

  // Network Pulse — solo cambios relevantes de las últimas 24hs, nunca ruido
  const pulseParts = pulse ? [
    pulse.newInfluencers         > 0 && t('home.pulse.influencers',    { n: pulse.newInfluencers }),
    pulse.newBrands              > 0 && t('home.pulse.brands',         { n: pulse.newBrands }),
    pulse.newOpportunities       > 0 && t('home.pulse.opportunities',  { n: pulse.newOpportunities }),
    pulse.collaborationsAdvanced > 0 && t('home.pulse.collaborations', { n: pulse.collaborationsAdvanced }),
  ].filter(Boolean) : []
  const hasPulse = pulseParts.length > 0

  // Misión destacada — la de mayor avance, resto queda a un link
  const sortedMissions   = [...missions].sort((a, b) => (b.pct ?? 0) - (a.pct ?? 0))
  const featuredMission  = sortedMissions[0]
  const otherMissions    = sortedMissions.slice(1)

  return (
    <div className="nw-home-grid">

      {/* ── Columna izquierda ── */}
      <div style={{ padding: '20px 20px 0' }}>

        {/* 1 · SALUDO */}
        <div style={{ marginBottom: pulse && hasPulse ? 8 : 20 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>
            {greet}{name ? `, ${name}` : ''}
          </h1>
        </div>

        {/* 1b · NETWORK PULSE — solo si hay algo relevante que contar */}
        {pulse && hasPulse && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap',
            fontSize: 12, color: 'var(--text-secondary)', marginBottom: 20,
          }}>
            <Sparkles size={13} color="var(--primary-violet-light)" style={{ flexShrink: 0 }}/>
            {pulseParts.map((p, i) => (
              <span key={i} style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                {p}{i < pulseParts.length - 1 && <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}> · </span>}
              </span>
            ))}
          </div>
        )}

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
                  onClick={() => onOpenCreate('influencer')}
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
                  onNavigate={item.kind === 'task' ? handleNavigate : undefined}
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

        {/* 5 · MISIÓN DESTACADA — la de mayor avance; el resto queda a un link */}
        {featuredMission && (
          <section style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8 }}>
              {t('home.featuredMission')}
            </div>
            <MissionProgress mission={featuredMission}/>
            {otherMissions.length > 0 && (
              <button
                onClick={() => navigate('/network/missions')}
                style={{ padding: '8px 0 0', fontSize: 12, color: 'var(--primary-violet-light)', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                {t('home.seeAll', { n: otherMissions.length })}
              </button>
            )}
          </section>
        )}

        {/* 6 · ACTIVIDAD RECIENTE — compacta, solo lo esencial */}
        <section>
          <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 4 }}>
            {t('home.recentActivity')}
          </div>
          {activity.length === 0 ? (
            <div style={{ padding: '12px 0', fontSize: 12, color: 'var(--text-secondary)' }}>
              {t('home.recentActivityEmpty')}
            </div>
          ) : (
            <ActivityTimeline activities={activity.slice(0, 4)}/>
          )}
        </section>
      </div>

    </div>
  )
}
