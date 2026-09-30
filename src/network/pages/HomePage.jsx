import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, Building2, Briefcase, Handshake, Sparkles } from 'lucide-react'
import AgendaItem from '../components/AgendaItem.jsx'
import StatTile from '../components/StatTile.jsx'
import MissionProgress from '../components/MissionProgress.jsx'
import ActivityTimeline from '../components/ActivityTimeline.jsx'
import EmptyState from '../components/EmptyState.jsx'
import FollowUpSheet from '../components/FollowUpSheet.jsx'
import TodayPanel from '../components/TodayPanel.jsx'
import { DIRECTION_ROLES } from '../routes.js'
import { t } from '../../i18n/index.js'
import { useTz } from '../utils/tz.js'
import { getMyAgenda, getMyNetworkStats, getMyMissions, getNetworkPulse, getMyRecentActivity } from '../../lib/metrics.js'
import { dbSetNextAction, dbCompleteTask, dbGetTaskById, dbRescheduleOverdue, dbEnrichAgendaContacts } from '../../lib/database.js'

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
  const [followUp, setFollowUp] = useState(null)   // item cuyo seguimiento se está cerrando
  const [rearranging, setRearranging] = useState(false)
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
      // WhatsApp en las tareas vinculadas a una ficha (llega un instante después).
      dbEnrichAgendaContacts(ag).then(en => {
        const byKey = new Map(en.map(e => [`${e.kind}:${e.entityId}`, e]))
        setAgenda(prev => prev.map(p => {
          const e = byKey.get(`${p.kind}:${p.entityId}`)
          return e && p.kind === 'task' ? { ...p, whatsapp: e.whatsapp, instagram: e.instagram, phone: e.phone } : p
        }))
      }).catch(() => {})
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

  // Una tarea se completa y se acabo. Un seguimiento NO: antes habia
  // que decir cuando se vuelve, o la ficha quedaba invisible. Por eso
  // aca se abre el panel en vez de completar de una.
  const handleComplete = useCallback(async (item) => {
    if (item.kind !== 'task') { setFollowUp(item); return }
    await dbCompleteTask(item.entityId)
    dropFromAgenda(item)
  }, [])

  const dropFromAgenda = useCallback((item) => {
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

  // Una proxima accion tambien tiene que poder abrirse. Con
  // colaboraciones en la agenda esto deja de ser comodidad: el bloque
  // de registrar lo de ayer arranca abriendo la ficha.
  const handleOpenEntity = useCallback((item) => {
    const path = {
      influencer:    `/network/influencers/${item.entityId}`,
      brand:         `/network/brands/${item.entityId}`,
      opportunity:   `/network/opportunities/${item.entityId}`,
      collaboration: `/network/collaborations/${item.entityId}`,
    }[item.entityType]
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

  // Solo seguimientos: una tarea vencida no se reagenda, se cancela
  // (ver cancel_stale_tasks en la 042).
  const overdueCount = agenda.filter(a => a.kind === 'next_action' && a.isOverdue).length

  const handleRescheduleOverdue = useCallback(async () => {
    setRearranging(true)
    try {
      await dbRescheduleOverdue()
      await load()
    } catch (e) {
      console.error('rescheduleOverdue:', e.message)
    } finally {
      setRearranging(false)
    }
  }, [load])

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

  // StatTile ya muestra el numero grande arriba: la etiqueta no lo repite.
  // Solo cuando hay vencidos la etiqueta aporta un dato nuevo — cuantos
  // de ese total estan vencidos.
  const overdueLabel = (n, oneKey, manyKey, plainKey) =>
    n > 0 ? (n === 1 ? t(oneKey) : t(manyKey, { n })) : t(plainKey)

  const tasksLabel = stats
    ? overdueLabel(stats.tasksOverdue, 'home.tasksOverdueOne', 'home.tasksOverdue', 'home.tasks')
    : '—'
  const followLabel = stats
    ? overdueLabel(stats.followupsOverdue, 'home.followupsOverdueOne', 'home.followupsOverdue', 'home.followups')
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

        {/* 1.2 · HOY: aprobaciones (Dirección), visitas de mañana y objetivos */}
        <TodayPanel isDirection={DIRECTION_ROLES.includes(currentUser?.rol)} me={name}/>

        {/* 1.5 · COBERTURA — el numero que predice el mes */}
        {stats && (stats.coverage7d > 0 || stats.collaborations > 0) && (() => {
          const c = stats.coverage7d
          const tone = c >= 9 ? '#34D399' : c >= 6 ? '#FBBF24' : '#F87171'
          return (
            <button
              onClick={() => navigate('/network/collaborations')}
              style={{
                width: '100%', marginBottom: 20, padding: '14px 16px', borderRadius: 14,
                display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left',
                background: `${tone}0F`, border: `1px solid ${tone}45`, cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: 30, fontWeight: 800, color: tone, lineHeight: 1, flexShrink: 0 }}>{c}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>
                  {t('home.coverage')}
                </span>
                <span style={{ display: 'block', fontSize: 11, color: 'var(--text-secondary)', marginTop: 1 }}>
                  {t(c >= 9 ? 'home.coverageOk' : c >= 6 ? 'home.coverageLow' : 'home.coverageCritical')}
                </span>
              </span>
            </button>
          )
        })()}

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
                onClick={() => navigate('/network/follow-ups')}
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

        {/* El panel de cierre de seguimiento. Es un overlay fijo, así
            que da igual dónde esté en el DOM. */}
        <FollowUpSheet
          item={followUp}
          onClose={() => setFollowUp(null)}
          onDone={(item) => dropFromAgenda(item)}
        />

        {/* 3 · NECESITA ATENCIÓN */}
        <section style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: 1.2, textTransform: 'uppercase' }}>
              {t('home.needsAttention')}
            </div>
            {/* Volver de tres días y encontrar cuarenta vencidas es la
                forma más rápida de que alguien deje de abrir el sistema.
                Un toque las reparte, lo más viejo primero. */}
            {overdueCount > 1 && (
              <button
                onClick={handleRescheduleOverdue}
                disabled={rearranging}
                style={{ fontSize: 11, fontWeight: 600, color: '#FB923C', background: 'rgba(251,146,60,0.1)', border: '1px solid rgba(251,146,60,0.3)', borderRadius: 8, padding: '4px 10px', cursor: rearranging ? 'default' : 'pointer', whiteSpace: 'nowrap' }}
              >
                {rearranging ? t('loading.generic') : t('home.rescheduleOverdue', { n: overdueCount })}
              </button>
            )}
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
                  onNavigate={item.kind === 'task' ? handleNavigate : handleOpenEntity}
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
