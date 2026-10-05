import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import LogoLoader from '../components/LogoLoader.jsx'
import { useNavigate } from 'react-router-dom'
import { Sparkles, Play, Hourglass, ChevronRight, Plus } from 'lucide-react'
import AgendaItem from '../components/AgendaItem.jsx'
import MissionProgress from '../components/MissionProgress.jsx'
import FollowUpSheet from '../components/FollowUpSheet.jsx'
import TodayPanel from '../components/TodayPanel.jsx'
import SwipeRow from '../components/SwipeRow.jsx'
import FocusMode from '../components/FocusMode.jsx'
import QuickAddBar from '../components/QuickAddBar.jsx'
import ProposalsToMove from '../components/ProposalsToMove.jsx'
import IncompleteCard from '../components/IncompleteCard.jsx'
import { DailyGoal, WeekLine, readGoal } from '../components/DailyProgress.jsx'
import { toast } from '../components/Toaster.jsx'
import { DIRECTION_ROLES, DIRECTION_ADMIN_ROLES } from '../routes.js'
import { t } from '../../i18n/index.js'
import { useTz } from '../utils/tz.js'
import { tomorrowAtIso } from '../utils/date.js'
import { getMyAgenda, getMyNetworkStats, getMyMissions, getNetworkPulse } from '../../lib/metrics.js'
import {
  dbSetNextAction, dbCompleteTask, dbGetTaskById, dbRescheduleOverdue, dbEnrichAgendaContacts,
  dbLogContact, dbGetDailyProgress, dbGetStalledOpportunities,
} from '../../lib/database.js'
import { quiet } from '../../lib/quiet.js'

const AGENDA_PREVIEW = 5
const STALLED_DAYS   = 10
const MISSION_CREATE = { influencers_added: 'influencer', brands_added: 'brand', opportunities: 'opportunity', collaborations: 'collaboration' }

const label = { fontSize: 9, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: 1.2, textTransform: 'uppercase' }

function greeting(tz) {
  const h = tz
    ? Number(new Date().toLocaleString('en', { timeZone: tz, hour: 'numeric', hour12: false }))
    : new Date().getHours()
  if (h >= 5  && h < 12) return t('home.greeting.morning')
  if (h >= 12 && h < 20) return t('home.greeting.afternoon')
  return t('home.greeting.evening')
}

// Lo más importante primero: vencido (lo más viejo), hoy, lo próximo.
const bucketOf = (a) => a.isOverdue ? 'overdue' : a.isToday ? 'today' : 'upcoming'
const byDue = (a, b) => new Date(a.dueAt || 0) - new Date(b.dueAt || 0)

// "A 2 por día la terminás el viernes" / "Te faltan 6: 2 por día para llegar al 15/10"
function missionPace(m, tz) {
  const left = Math.max(0, (m.target || 0) - (m.progress || 0))
  if (left === 0) return { done: true }
  const fmt = (d) => d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', timeZone: tz })
  if (m.endsAt) {
    const daysLeft = Math.max(1, Math.ceil((new Date(m.endsAt) - Date.now()) / 86400000))
    const pace = Math.ceil(left / daysLeft)
    return { text: t('homeX.mission.paceDeadline', { left, pace, date: new Date(m.endsAt).toLocaleDateString(undefined, { day: 'numeric', month: 'long', timeZone: tz }) }) }
  }
  const pace = left >= 10 ? 2 : 1
  const finish = new Date(Date.now() + (Math.ceil(left / pace) - 1) * 86400000)
  return { text: t('homeX.mission.pace', { pace, date: fmt(finish) }) }
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
  const [daily,    setDaily]    = useState(null)
  const [stalled,  setStalled]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [tab,      setTab]      = useState(null)
  const [showAll,  setShowAll]  = useState(false)
  const [focus,    setFocus]    = useState(false)
  const [goal,     setGoal]     = useState(() => readGoal(currentUser?.id))
  // El modo foco espera a que se cierre el panel de seguimiento.
  const followWaiter = useRef(null)

  const loadDaily = useCallback(() => dbGetDailyProgress(60).then(setDaily).catch(quiet('HomePage')), [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [ag, st, ms, pu] = await Promise.all([
        getMyAgenda(7),
        getMyNetworkStats(),
        getMyMissions(),
        getNetworkPulse(1).catch(() => null),
      ])
      setAgenda(ag)
      // WhatsApp en las tareas vinculadas a una ficha (llega un instante después).
      dbEnrichAgendaContacts(ag).then(en => {
        const byKey = new Map(en.map(e => [`${e.kind}:${e.entityId}`, e]))
        setAgenda(prev => prev.map(p => {
          const e = byKey.get(`${p.kind}:${p.entityId}`)
          return e && p.kind === 'task' ? { ...p, whatsapp: e.whatsapp, instagram: e.instagram, phone: e.phone } : p
        }))
      }).catch(quiet('HomePage'))
      setStats(st)
      setMissions(ms)
      setPulse(pu)
    } catch(e) {
      console.error('HomePage load:', e.message)
    } finally {
      setLoading(false)
    }
    // Lo nuevo de la 053: si no está, estos bloques no aparecen.
    loadDaily()
    dbGetStalledOpportunities(STALLED_DAYS, 5).then(setStalled).catch(quiet('HomePage'))
  }, [loadDaily])

  useEffect(() => { load() }, [load])

  const dropFromAgenda = useCallback((item) => {
    setAgenda(prev => prev.filter(a => !(a.entityId === item.entityId && a.entityType === item.entityType && a.kind === item.kind)))
    setStats(prev => prev ? {
      ...prev,
      tasksToday:    item.kind === 'task' ? Math.max(0, prev.tasksToday - 1)    : prev.tasksToday,
      tasksOverdue:  (item.kind === 'task' && item.isOverdue) ? Math.max(0, prev.tasksOverdue - 1) : prev.tasksOverdue,
      followupsToday:  (item.kind === 'next_action' && item.isToday)   ? Math.max(0, prev.followupsToday - 1)   : prev.followupsToday,
      followupsOverdue:(item.kind === 'next_action' && item.isOverdue) ? Math.max(0, prev.followupsOverdue - 1) : prev.followupsOverdue,
    } : prev)
  }, [])

  // Una tarea se completa y se acabó. Un seguimiento NO: hay que decir
  // qué pasó para que el sistema sepa cuándo volver. Por eso se abre
  // el panel en vez de completar de una. Devuelve true si quedó resuelto.
  const handleComplete = useCallback(async (item) => {
    if (item.kind !== 'task') {
      setFollowUp(item)
      return new Promise(resolve => { followWaiter.current = resolve })
    }
    await dbCompleteTask(item.entityId)
    dropFromAgenda(item)
    return true
  }, [dropFromAgenda])

  const closeFollowUp = (done, item) => {
    setFollowUp(null)
    if (done) { dropFromAgenda(item); loadDaily() }
    followWaiter.current?.(!!done)
    followWaiter.current = null
  }

  const handleNavigate = useCallback(async (item) => {
    const task = await dbGetTaskById(item.entityId).catch(() => null)
    if (!task?.entityType || !task?.entityId) return
    const path = {
      opportunity:   `/network/opportunities/${task.entityId}`,
      collaboration: `/network/collaborations/${task.entityId}`,
    }[task.entityType]
    if (path) navigate(path)
  }, [navigate])

  const handleOpenEntity = useCallback((item) => {
    const path = {
      influencer:    `/network/influencers/${item.entityId}`,
      brand:         `/network/brands/${item.entityId}`,
      opportunity:   `/network/opportunities/${item.entityId}`,
      collaboration: `/network/collaborations/${item.entityId}`,
    }[item.entityType]
    if (path) navigate(path)
  }, [navigate])

  const openItem = useCallback((item) => (item.kind === 'task' ? handleNavigate(item) : handleOpenEntity(item)), [handleNavigate, handleOpenEntity])

  const handleReschedule = useCallback(async (item, isoAt) => {
    await dbSetNextAction(item.entityType, item.entityId, item.title, isoAt)
    setAgenda(prev => prev.map(a =>
      (a.entityId === item.entityId && a.entityType === item.entityType && a.kind === item.kind)
        ? { ...a, dueAt: isoAt, isOverdue: false, isToday: new Date(isoAt).toDateString() === new Date().toDateString() }
        : a
    ))
  }, [])

  const toTomorrow = useCallback(async (item) => {
    await handleReschedule(item, tomorrowAtIso(tz))
    toast(t('homeX.agenda.movedTomorrow'))
    return true
  }, [handleReschedule, tz])

  // Cada WhatsApp / DM / llamada desde el Inicio cuenta para la meta.
  const handleContact = useCallback((item, labelTxt) => {
    if (item.kind !== 'next_action') return
    dbLogContact(item.entityType, item.entityId, labelTxt).then(loadDaily).catch(quiet('HomePage'))
  }, [loadDaily])

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

  // ── Derivados ──────────────────────────────────────────────
  const buckets = useMemo(() => {
    const b = { overdue: [], today: [], upcoming: [] }
    for (const a of agenda) b[bucketOf(a)].push(a)
    Object.values(b).forEach(l => l.sort(byDue))
    return b
  }, [agenda])
  const hero = buckets.overdue[0] || buckets.today[0] || buckets.upcoming[0] || null
  const focusItems = [...buckets.overdue, ...buckets.today]

  const rest = (k) => buckets[k].filter(a => a !== hero)
  const activeTab = tab && buckets[tab] ? tab
    : (['overdue', 'today', 'upcoming'].find(k => rest(k).length) || ['overdue', 'today', 'upcoming'].find(k => buckets[k].length) || 'today')
  const tabItems = buckets[activeTab].filter(a => a !== hero)
  const visible = showAll ? tabItems : tabItems.slice(0, AGENDA_PREVIEW)

  const name  = currentUser?.nombre?.split(' ')[0] || currentUser?.username || ''
  const greet = greeting(tz)

  const summary = (() => {
    if (!agenda.length) return { text: t('homeX.summary.empty'), ok: true }
    const parts = []
    const n = (k, c) => (c === 1 ? t(`homeX.summary.${k}One`) : t(`homeX.summary.${k}`, { n: c }))
    if (buckets.overdue.length)  parts.push(n('overdue', buckets.overdue.length))
    if (buckets.today.length)    parts.push(n('today', buckets.today.length))
    if (buckets.upcoming.length) parts.push(n('week', buckets.upcoming.length))
    if (!buckets.overdue.length) parts.push(`${t('homeX.summary.noneOverdue')} ✓`)
    return { text: parts.join(' · '), ok: !buckets.overdue.length }
  })()

  // Network Pulse — solo cambios relevantes de las últimas 24hs, nunca ruido
  const pulseParts = pulse ? [
    pulse.newInfluencers         > 0 && t('home.pulse.influencers',    { n: pulse.newInfluencers }),
    pulse.newBrands              > 0 && t('home.pulse.brands',         { n: pulse.newBrands }),
    pulse.newOpportunities       > 0 && t('home.pulse.opportunities',  { n: pulse.newOpportunities }),
    pulse.collaborationsAdvanced > 0 && t('home.pulse.collaborations', { n: pulse.collaborationsAdvanced }),
  ].filter(Boolean) : []

  const sortedMissions  = [...missions].sort((a, b) => (b.pct ?? 0) - (a.pct ?? 0))
  const featuredMission = sortedMissions[0]
  const otherMissions   = sortedMissions.slice(1)
  const pace = featuredMission ? missionPace(featuredMission, tz) : null
  const missionCreate = featuredMission ? MISSION_CREATE[featuredMission.metric] : null

  if (loading) return <LogoLoader/>

  const tabBtn = (k) => {
    const on = k === activeTab
    const col = k === 'overdue' && buckets.overdue.length ? '#F87171' : k === 'today' && buckets.today.length ? '#FBBF24' : 'var(--primary-violet-light)'
    return (
      <button key={k} role="tab" aria-selected={on} onClick={() => { setTab(k); setShowAll(false) }}
        style={{ flex: 1, minWidth: 0, padding: '7px 6px', borderRadius: 9, fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
          background: on ? 'rgba(139,92,246,0.18)' : 'transparent', color: on ? 'var(--text-primary)' : 'var(--text-secondary)',
          border: on ? '1px solid var(--border-violet)' : '1px solid transparent' }}>
        {t(`homeX.agenda.${k}`)} <span style={{ color: col }}>({buckets[k].length})</span>
      </button>
    )
  }

  return (
    <div className="nw-home-grid">

      {/* ── Columna izquierda: lo que hay que hacer ── */}
      <div style={{ padding: '20px 20px 0' }}>

        {/* 1 · SALUDO + RESUMEN EN UNA LÍNEA */}
        <div style={{ marginBottom: 16 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>
            {greet}{name ? `, ${name}` : ''}
          </h1>
          <div style={{ fontSize: 12, marginTop: 3, color: summary.ok ? 'var(--text-secondary)' : '#F87171' }}>{summary.text}</div>
          {pulseParts.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', fontSize: 12, color: 'var(--text-secondary)', marginTop: 6 }}>
              <Sparkles size={13} color="var(--primary-violet-light)" style={{ flexShrink: 0 }}/>
              {pulseParts.map((p, i) => (
                <span key={i} style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                  {p}{i < pulseParts.length - 1 && <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}> · </span>}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* 2 · TU PRÓXIMO PASO + ARRANCAR EL DÍA */}
        {hero && (
          <section style={{ marginBottom: 12 }}>
            <SwipeRow
              onRight={() => handleComplete(hero)}
              onLeft={hero.kind === 'next_action' ? () => toTomorrow(hero) : undefined}
              rightLabel={t('homeX.agenda.done')} leftLabel={t('agenda.tomorrow')}
            >
              <AgendaItem hero heroLabel={t('homeX.nextStep')} item={hero}
                onComplete={handleComplete}
                onReschedule={hero.kind === 'next_action' ? handleReschedule : undefined}
                onNavigate={openItem} onContact={handleContact}/>
            </SwipeRow>
          </section>
        )}
        {focusItems.length > 0 && (
          <button onClick={() => setFocus(true)}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 14px', marginBottom: 20, borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: 'pointer', color: 'white', border: 'none',
              background: 'linear-gradient(135deg, var(--primary-violet-dark), var(--primary-violet))', boxShadow: '0 0 16px rgba(139,92,246,0.3)' }}>
            <Play size={15}/>{t('homeX.startDayN', { n: focusItems.length })}
          </button>
        )}
        {hero && !focusItems.length && <div style={{ height: 8 }}/>}

        {/* 3 · ACCESOS RÁPIDOS + ALTA POR INSTAGRAM */}
        <QuickAddBar onOpenCreate={onOpenCreate}/>

        {/* 4 · HOY: aprobaciones (Dirección), visitas de mañana y objetivos */}
        <TodayPanel isDirection={DIRECTION_ROLES.includes(currentUser?.rol)} me={name}/>

        {/* 4b · PROPUESTAS PARA MOVER HOY (solo si hay) */}
        <ProposalsToMove/>

        {/* 5 · AGENDA — separada de verdad: vencido / hoy / próximos */}
        <section style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
            <div style={label}>{t('homeX.agenda.title')}</div>
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
            <>
              <div role="tablist" style={{ display: 'flex', gap: 4, padding: 3, borderRadius: 12, background: 'var(--glass-bg)', border: '1px solid var(--border-violet)', marginBottom: 8 }}>
                {['overdue', 'today', 'upcoming'].map(tabBtn)}
              </div>
              {tabItems.length === 0 ? (
                <div style={{ padding: '12px 4px', fontSize: 12, color: 'var(--text-secondary)' }}>{buckets[activeTab].includes(hero) ? t('homeX.agenda.inHero') : t('homeX.agenda.empty')}</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {visible.map((item, i) => (
                    <SwipeRow key={`${item.kind}-${item.entityType}-${item.entityId}-${i}`}
                      onRight={() => handleComplete(item)}
                      onLeft={item.kind === 'next_action' ? () => toTomorrow(item) : undefined}
                      rightLabel={t('homeX.agenda.done')} leftLabel={t('agenda.tomorrow')}
                    >
                      <AgendaItem
                        item={item}
                        onComplete={handleComplete}
                        onReschedule={item.kind === 'next_action' ? handleReschedule : undefined}
                        onNavigate={openItem}
                        onContact={handleContact}
                      />
                    </SwipeRow>
                  ))}
                  {tabItems.length > AGENDA_PREVIEW && !showAll && (
                    <button
                      onClick={() => setShowAll(true)}
                      style={{ padding: '8px 0', fontSize: 12, color: 'var(--primary-violet-light)', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      {t('home.seeAll', { n: tabItems.length - AGENDA_PREVIEW })}
                    </button>
                  )}
                </div>
              )}
              <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 8, textAlign: 'center', opacity: 0.8 }}>{t('homeX.agenda.swipeHint')}</div>
            </>
          )}
        </section>
      </div>

      {/* ── Columna derecha: cómo vengo ── */}
      <div style={{ padding: '20px 20px 20px' }}>

        {/* 6 · TU NÚMERO DEL DÍA + RACHA */}
        {daily && <DailyGoal days={daily} uid={currentUser?.id} goal={goal} onGoal={setGoal}/>}

        {/* 6b · FICHAS PARA COMPLETAR (Dirección y Admin, solo si hay) */}
        {DIRECTION_ADMIN_ROLES.includes(currentUser?.rol) && <IncompleteCard/>}

        {/* 7 · MISIÓN con ritmo y botón directo */}
        {featuredMission && (
          <section style={{ marginBottom: 20 }}>
            <div style={{ ...label, marginBottom: 8 }}>{t('home.featuredMission')}</div>
            <MissionProgress mission={featuredMission}/>
            {pace && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
                <div style={{ flex: 1, minWidth: 0, fontSize: 12, color: pace.done ? '#34D399' : 'var(--text-secondary)' }}>
                  {pace.done ? t('homeX.mission.done') : pace.text}
                </div>
                {!pace.done && missionCreate && (
                  <button onClick={() => onOpenCreate(missionCreate)}
                    style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', background: 'rgba(139,92,246,0.15)', color: 'var(--primary-violet-light)', border: '1px solid var(--border-violet)', flexShrink: 0 }}>
                    <Plus size={12}/>{t('homeX.mission.addOne')}
                  </button>
                )}
              </div>
            )}
            {otherMissions.length > 0 && (
              <button
                onClick={() => navigate('/network/missions')}
                style={{ marginTop: 6, padding: '4px 0', fontSize: 12, color: 'var(--primary-violet-light)', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                {t('home.seeAll', { n: otherMissions.length })}
              </button>
            )}
          </section>
        )}

        {/* 8 · OPORTUNIDADES TRABADAS */}
        {stalled.length > 0 && (
          <section style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
              <div style={label}>{t('homeX.stalled.title')}</div>
              <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{t('homeX.stalled.hint', { n: STALLED_DAYS })}</div>
            </div>
            <div style={{ borderRadius: 12, background: 'var(--glass-bg)', border: '1px solid var(--border-violet)', overflow: 'hidden' }}>
              {stalled.map((o, i) => (
                <button key={o.id} onClick={() => navigate(`/network/opportunities/${o.id}`)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'none', border: 'none', borderTop: i ? '1px solid var(--border-violet)' : 'none', cursor: 'pointer', textAlign: 'left' }}>
                  <Hourglass size={14} color="#F87171" style={{ flexShrink: 0 }}/>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.title}</span>
                    <span style={{ display: 'block', fontSize: 11, color: 'var(--text-secondary)' }}>{t(`opportunities.status.${o.status}`)}</span>
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 800, color: '#F87171', flexShrink: 0 }}>{t('homeX.stalled.days', { n: o.days })}</span>
                  <ChevronRight size={14} color="var(--text-secondary)" style={{ flexShrink: 0 }}/>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* 9 · COBERTURA — el número que predice el mes */}
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

        {/* 10 · MI NETWORK — una sola fila compacta */}
        {stats && (
          <section style={{ marginBottom: 20 }}>
            <div style={{ ...label, marginBottom: 8 }}>{t('home.myNetwork')}</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {[
                ['influencers',    stats.influencers,    '/network/influencers',    '#A78BFA'],
                ['brands',         stats.brands,         '/network/brands',         '#60A5FA'],
                ['opportunities',  stats.opportunities,  '/network/opportunities',  '#FBBF24'],
                ['collaborations', stats.collaborations, '/network/collaborations', '#34D399'],
              ].map(([k, v, path, col]) => (
                <button key={k} onClick={() => navigate(path)}
                  style={{ display: 'inline-flex', alignItems: 'baseline', gap: 5, padding: '7px 11px', borderRadius: 10, background: 'var(--glass-bg)', border: '1px solid var(--border-violet)', cursor: 'pointer', opacity: v ? 1 : 0.55 }}>
                  <span style={{ fontSize: 15, fontWeight: 800, color: col }}>{v}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{t(`homeX.networkLine.${k}`)}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* 11 · ESTA SEMANA */}
        {daily && <WeekLine days={daily} goal={goal}/>}
      </div>

      {/* Paneles fijos: cierre de seguimiento (z 400) por encima del modo foco (z 390). */}
      <FollowUpSheet
        item={followUp}
        onClose={() => closeFollowUp(false, followUp)}
        onDone={(item) => closeFollowUp(true, item)}
      />
      {focus && (
        <FocusMode
          items={focusItems}
          onClose={() => setFocus(false)}
          onComplete={handleComplete}
          onTomorrow={toTomorrow}
          onOpen={(item) => { setFocus(false); openItem(item) }}
          onContact={handleContact}
        />
      )}
    </div>
  )
}
