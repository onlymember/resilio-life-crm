import React, { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { RefreshCw, Plus } from 'lucide-react'
import AlertRow from '../components/AlertRow.jsx'
import StatTile from '../components/StatTile.jsx'
import ScouterRow from '../components/ScouterRow.jsx'
import ScouterModal from '../components/ScouterModal.jsx'
import AssignModal from '../components/AssignModal.jsx'
import PeriodFilter from '../components/PeriodFilter.jsx'
import { t } from '../../i18n/index.js'
import { personName } from '../utils/people.js'
import {
  getNetworkStats, getNetworkAlerts,
  getNetworkScouters, getUnassignedSummary,
  getScouterPerformance,
} from '../../lib/metrics.js'
import { dbGetGoals, dbGetGeography, dbGetMonthlySnapshots, dbCloseMonthlySnapshot } from '../../lib/database.js'

const SectionTitle = ({ children, action }) => (
  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
    <h2 style={{ fontSize:11, fontWeight:700, color:'var(--text-secondary)', letterSpacing:1.2, textTransform:'uppercase', margin:0 }}>{children}</h2>
    {action}
  </div>
)

const DIRECTION_ROLES = ['super_admin', 'network_direction']

const fmtMoney = (n) => {
  if (!n) return '—'
  return n >= 1000000 ? `${(n/1000000).toFixed(1)}M` : n >= 1000 ? `${(n/1000).toFixed(0)}K` : String(n)
}

const getPeriods = () => {
  const now = new Date()
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const value = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`
    const label = d.toLocaleDateString('es', { month: 'long', year: 'numeric' })
    return { value, label }
  })
}

const goalBehind = (goal) => {
  if (!goal.periodStart || !goal.periodEnd) return false
  const elapsed = (Date.now() - new Date(goal.periodStart)) / (new Date(goal.periodEnd) - new Date(goal.periodStart)) * 100
  return goal.pct < elapsed - 20
}

export default function CommandPage({ currentUser }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640)
  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 640)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])

  // Filters from URL
  const cityId    = searchParams.get('city')    || null
  const countryId = searchParams.get('country') || null
  const regionId  = searchParams.get('region')  || null
  const from      = searchParams.get('from')    || null
  const to        = searchParams.get('to')      || null

  const setParam = useCallback((key, val) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      if (val) next.set(key, val); else next.delete(key)
      return next
    }, { replace: true })
  }, [setSearchParams])

  // Data
  const [alerts,      setAlerts]      = useState([])
  const [stats,       setStats]       = useState(null)
  const [unassigned,  setUnassigned]  = useState(null)
  const [scouters,    setScouters]    = useState([])
  const [goals,       setGoals]       = useState([])
  const [geo,         setGeo]         = useState({ regions:[], countries:[], cities:[] })
  const [loading,     setLoading]     = useState(true)
  const [expanded,    setExpanded]    = useState({})          // { userId: true }
  const [performance, setPerformance] = useState({})          // { userId: data }
  const [scouterModal, setScouterModal] = useState(false)
  const [assignAlert,  setAssignAlert]  = useState(null)      // alert entity for AssignModal
  const [period, setPeriod] = useState(null)

  const PERIODS = getPeriods()
  const [snapPeriod,    setSnapPeriod]    = useState(PERIODS[0].value)
  const [snapshots,     setSnapshots]     = useState([])
  const [snapLoading,   setSnapLoading]   = useState(false)
  const [snapError,     setSnapError]     = useState(null)
  const [closingSnap,   setClosingSnap]   = useState(false)
  const [allScouters,   setAllScouters]   = useState([])

  useEffect(() => {
    dbGetGeography().then(setGeo).catch(() => {})
    getNetworkScouters({}).then(setAllScouters).catch(() => {})
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [al, st, sc, un, gl] = await Promise.all([
        getNetworkAlerts(),
        getNetworkStats({ cityId, countryId, regionId, from, to }),
        getNetworkScouters({ cityId, countryId, regionId }),
        getUnassignedSummary(),
        dbGetGoals({ status: 'active' }),
      ])
      setAlerts(al)
      setStats(st)
      setScouters(sc)
      setUnassigned(un)
      setGoals(gl)
    } catch (e) {
      console.error('CommandPage load:', e.message)
    } finally {
      setLoading(false)
    }
  }, [cityId, countryId, regionId, from, to])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    setSnapLoading(true)
    setSnapError(null)
    dbGetMonthlySnapshots({ period: snapPeriod })
      .then(setSnapshots)
      .catch(e => setSnapError(e.message))
      .finally(() => setSnapLoading(false))
  }, [snapPeriod])

  const handleCloseMonth = async () => {
    setClosingSnap(true)
    setSnapError(null)
    try {
      await dbCloseMonthlySnapshot(snapPeriod)
      const data = await dbGetMonthlySnapshots({ period: snapPeriod })
      setSnapshots(data)
    } catch(e) {
      setSnapError(e.message)
    } finally {
      setClosingSnap(false)
    }
  }

  const handlePeriod = (p) => {
    setPeriod(p)
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      if (p?.from) next.set('from', p.from); else next.delete('from')
      if (p?.to)   next.set('to',   p.to);   else next.delete('to')
      return next
    }, { replace: true })
  }

  const toggleExpand = async (userId) => {
    const isOpen = expanded[userId]
    setExpanded(prev => ({ ...prev, [userId]: !isOpen }))
    if (!isOpen && !performance[userId]) {
      try {
        const perf = await getScouterPerformance(userId, from, to)
        setPerformance(prev => ({ ...prev, [userId]: perf }))
      } catch (e) { console.error('scouter_performance:', e.message) }
    }
  }

  // Problem scouters: only those needing attention, max 5 sorted by severity
  const problemScouters = [...scouters]
    .filter(s => s.daysInactive > 14 || s.tasksOverdue > 0)
    .sort((a, b) => (b.tasksOverdue - a.tasksOverdue) || (b.daysInactive - a.daysInactive))
    .slice(0, 5)

  const totalProblem = scouters.filter(s => s.daysInactive > 14 || s.tasksOverdue > 0).length

  const GeoSelect = ({ label, paramKey, options, nameKey = 'name' }) => (
    <select
      value={searchParams.get(paramKey) || ''}
      onChange={e => setParam(paramKey, e.target.value || null)}
      style={{ padding:'5px 10px', borderRadius:8, background:'rgba(139,92,246,0.07)', border:'1px solid var(--border-violet)', color:'var(--text-primary)', fontSize:12, cursor:'pointer' }}
    >
      <option value="">{label}</option>
      {options.map(o => <option key={o.id} value={o.id}>{o[nameKey]}</option>)}
    </select>
  )

  return (
    <div style={{ padding:'20px', display:'flex', flexDirection:'column', gap:20, maxWidth:1100 }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ fontSize:18, fontWeight:700, color:'var(--text-primary)', marginBottom:2 }}>{t('pages.command.title')}</h1>
          <p style={{ fontSize:12, color:'var(--text-secondary)' }}>{t('pages.command.subtitle')}</p>
        </div>
        <button onClick={load} style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:10, background:'rgba(139,92,246,0.08)', border:'1px solid var(--border-violet)', color:'var(--text-secondary)', cursor:'pointer', fontSize:12 }}>
          <RefreshCw size={13} style={loading ? { animation:'spin 1s linear infinite' } : {}}/>{t('command.refresh')}
        </button>
      </div>

      {/* Filters */}
      <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
        <GeoSelect label="Región"  paramKey="region"  options={geo.regions}/>
        <GeoSelect label="País"    paramKey="country" options={geo.countries}/>
        <GeoSelect label="Ciudad"  paramKey="city"    options={geo.cities}/>
        <PeriodFilter value={period} onChange={handlePeriod}/>
      </div>

      {/* ── 1. ALERTAS ───────────────────────────────────────── */}
      <section>
        <SectionTitle>{t('pages.command.sections.alerts')}</SectionTitle>
        {loading && alerts.length === 0 ? (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {[0,1,2].map(i => <div key={i} style={{ height:44, borderRadius:10, background:'rgba(139,92,246,0.06)', animation:'pulse 1.5s ease-in-out infinite' }}/>)}
          </div>
        ) : alerts.length === 0 ? (
          <div style={{ padding:'16px', borderRadius:10, background:'rgba(16,185,129,0.07)', border:'1px solid rgba(16,185,129,0.25)', textAlign:'center' }}>
            <div style={{ fontSize:14, fontWeight:700, color:'#10B981' }}>{t('command.allAlertsClear')}</div>
            <div style={{ fontSize:11, color:'var(--text-secondary)', marginTop:4 }}>{t('command.allAlertsClearSub')}</div>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {alerts.map((a, i) => (
              <AlertRow
                key={i}
                alert={a}
                onAssign={(entity) => setAssignAlert(entity)}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── 2. LA RED ────────────────────────────────────────── */}
      <section>
        <SectionTitle>{t('pages.command.sections.network')}</SectionTitle>
        {stats ? (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {/* Network stats grid */}
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              {[
                { key:'scouters_total',  label: t('command.net.scouters'),       path: '/network/scouters' },
                { key:'countries',       label: t('command.net.countries'),       path: null },
                { key:'cities',          label: t('command.net.cities'),          path: null },
                { key:'influencers',     label: t('command.net.influencers'),     path: '/network/influencers' },
                { key:'brands',          label: t('command.net.brands'),          path: '/network/brands' },
                { key:'opportunities',   label: t('command.net.opportunities'),   path: '/network/opportunities' },
                { key:'collaborations',  label: t('command.net.collaborations'),  path: '/network/collaborations' },
                { key:'tasks_overdue',   label: t('command.net.tasksOverdue'),    path: '/network/tasks', accent: '#F87171' },
              ].map(({ key, label, path, accent }) => (
                <StatTile
                  key={key}
                  value={stats[key] ?? 0}
                  label={label}
                  accent={accent}
                  onClick={path ? () => navigate(path) : undefined}
                />
              ))}
            </div>

            {/* Sin asignar / sin ciudad / sin rol */}
            {unassigned && (
              <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                {[
                  { val: unassigned.influencers,  label: t('command.unassigned.influencers'),  path: '/network/influencers?noOwner=1', warn: unassigned.influencers > 0 },
                  { val: unassigned.brands,        label: t('command.unassigned.brands'),        path: '/network/brands?noOwner=1',      warn: unassigned.brands > 0 },
                  { val: unassigned.noCityInf,     label: t('command.unassigned.noCityInf'),    path: '/network/influencers?noCity=1',   warn: unassigned.noCityInf > 0 },
                  { val: unassigned.noCityBrands,  label: t('command.unassigned.noCityBrands'), path: '/network/brands?noCity=1',        warn: unassigned.noCityBrands > 0 },
                  { val: unassigned.usersNoRole,   label: t('command.unassigned.usersNoRole'),  path: null,                              warn: unassigned.usersNoRole > 0 },
                ].filter(({ val }) => val > 0).map(({ val, label, path, warn }) => (
                  <button
                    key={label}
                    onClick={path ? () => navigate(path) : undefined}
                    style={{
                      padding:'5px 12px', borderRadius:8, fontSize:11, fontWeight:600, cursor: path ? 'pointer' : 'default',
                      background: warn ? 'rgba(251,191,36,0.08)' : 'rgba(139,92,246,0.07)',
                      color: warn ? '#FBBF24' : 'var(--text-secondary)',
                      border: warn ? '1px solid rgba(251,191,36,0.3)' : '1px solid var(--border-violet)',
                    }}
                  >
                    {val} {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div style={{ height:80, borderRadius:10, background:'rgba(139,92,246,0.06)', animation:'pulse 1.5s ease-in-out infinite' }}/>
        )}
      </section>

      {/* ── 3. SCOUTERS CON ATENCIÓN ─────────────────────────── */}
      <section>
        <SectionTitle
          action={
            <div style={{ display:'flex', gap:8 }}>
              {totalProblem > 0 && (
                <button onClick={() => navigate('/network/scouters')} style={{ fontSize:11, color:'var(--primary-violet-light)', background:'none', border:'none', cursor:'pointer', padding:0 }}>
                  {t('command.viewAll', { n: scouters.length })}
                </button>
              )}
              <button onClick={() => setScouterModal(true)} style={{ display:'flex', alignItems:'center', gap:4, padding:'4px 10px', borderRadius:8, background:'rgba(139,92,246,0.1)', border:'1px solid var(--border-violet)', color:'var(--text-secondary)', cursor:'pointer', fontSize:11 }}>
                <Plus size={12}/>{t('command.newScouter')}
              </button>
            </div>
          }
        >
          {t('pages.command.sections.scouters')}
        </SectionTitle>

        {loading && problemScouters.length === 0 ? (
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {[0,1].map(i => <div key={i} style={{ height:50, borderRadius:10, background:'rgba(139,92,246,0.06)', animation:'pulse 1.5s ease-in-out infinite' }}/>)}
          </div>
        ) : problemScouters.length === 0 ? (
          <div style={{ padding:'14px 16px', borderRadius:10, background:'rgba(16,185,129,0.07)', border:'1px solid rgba(16,185,129,0.25)', fontSize:13, color:'#10B981', fontWeight:600 }}>
            {t('command.allScoutersClear')}
          </div>
        ) : (
          <>
            {!isMobile && (
              <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 50px 55px 55px 55px 55px 70px 28px', gap:8, padding:'4px 14px', marginBottom:4 }}>
                {['nombre','ciudad','level','influencers','brands','opportunities','tasksOverdue','daysInactive'].map(col => (
                  <span key={col} style={{ fontSize:9, fontWeight:700, color:'var(--text-secondary)', textTransform:'uppercase', letterSpacing:0.8, textAlign: col==='nombre'||col==='ciudad' ? 'left' : 'center', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {t(`scouter.cols.${col}`)}
                  </span>
                ))}
                <span/>
              </div>
            )}
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {problemScouters.map(s => (
                <ScouterRow
                  key={s.userId}
                  scouter={s}
                  expanded={!!expanded[s.userId]}
                  onToggle={() => toggleExpand(s.userId)}
                  performance={performance[s.userId]}
                  isMobile={isMobile}
                />
              ))}
            </div>
          </>
        )}
      </section>

      {/* ── 4. OBJETIVOS ─────────────────────────────────────── */}
      <section style={{ marginBottom: 40 }}>
        <SectionTitle>{t('pages.command.sections.goals')}</SectionTitle>
        {goals.length === 0 ? (
          <div style={{ fontSize:12, color:'var(--text-secondary)', padding:'12px 0' }}>{t('command.goals.noGoals')}</div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {goals.map(g => {
              const behind = goalBehind(g)
              const pct    = Math.round(g.pct ?? 0)
              return (
                <div key={g.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', borderRadius:10, background:'var(--glass-bg)', border:`1px solid ${behind ? 'rgba(248,113,113,0.35)' : 'var(--border-violet)'}` }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:'var(--text-primary)', marginBottom:4, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{g.title}</div>
                    <div style={{ height:4, borderRadius:2, background:'rgba(139,92,246,0.12)', overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${Math.min(pct,100)}%`, borderRadius:2, background: behind ? '#F87171' : 'var(--primary-violet)', transition:'width 0.4s' }}/>
                    </div>
                  </div>
                  <div style={{ flexShrink:0, textAlign:'right' }}>
                    <div style={{ fontSize:13, fontWeight:700, color: behind ? '#F87171' : 'var(--primary-violet-light)' }}>{pct}%</div>
                    <div style={{ fontSize:10, color:'var(--text-secondary)' }}>{t('command.goals.progress', { current: g.currentProgress ?? 0, target: g.target ?? 0 })}</div>
                  </div>
                  {behind && (
                    <span style={{ fontSize:9, fontWeight:700, color:'#F87171', background:'rgba(248,113,113,0.1)', border:'1px solid rgba(248,113,113,0.3)', borderRadius:6, padding:'2px 6px', flexShrink:0 }}>
                      {t('command.goals.behind')}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* ── 5. REPORTE MENSUAL ───────────────────────────────── */}
      <section style={{ marginBottom: 40 }}>
        <SectionTitle
          action={
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <select
                value={snapPeriod}
                onChange={e => setSnapPeriod(e.target.value)}
                style={{ padding:'4px 8px', borderRadius:7, background:'rgba(139,92,246,0.07)', border:'1px solid var(--border-violet)', color:'var(--text-primary)', fontSize:11, cursor:'pointer' }}
              >
                {PERIODS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
              {DIRECTION_ROLES.includes(currentUser?.rol) && (
                <button
                  onClick={handleCloseMonth}
                  disabled={closingSnap}
                  style={{ padding:'4px 12px', borderRadius:7, background: closingSnap ? 'rgba(139,92,246,0.3)' : 'var(--primary-violet)', color:'white', border:'none', cursor: closingSnap ? 'default' : 'pointer', fontSize:11, fontWeight:700 }}
                >
                  {closingSnap ? t('monthlyReport.closing') : t('monthlyReport.close')}
                </button>
              )}
            </div>
          }
        >
          {t('monthlyReport.title')}
        </SectionTitle>

        <div style={{ fontSize:11, color:'var(--text-secondary)', marginBottom:10, fontStyle:'italic' }}>
          {t('monthlyReport.subtitle')}
        </div>

        {snapError && (
          <div style={{ fontSize:12, color:'#F87171', background:'rgba(248,113,113,0.08)', border:'1px solid rgba(248,113,113,0.25)', borderRadius:8, padding:'8px 12px', marginBottom:10 }}>
            {snapError}
          </div>
        )}

        {snapLoading ? (
          <div style={{ height:60, borderRadius:10, background:'rgba(139,92,246,0.06)', animation:'pulse 1.5s ease-in-out infinite' }}/>
        ) : snapshots.length === 0 ? (
          <div style={{ padding:'14px 16px', borderRadius:10, background:'rgba(139,92,246,0.05)', border:'1px solid var(--border-violet)', fontSize:12, color:'var(--text-secondary)', textAlign:'center' }}>
            <div>{t('monthlyReport.notClosedYet')}</div>
            {!DIRECTION_ROLES.includes(currentUser?.rol) && (
              <div style={{ marginTop:4, fontSize:11 }}>{t('monthlyReport.empty')}</div>
            )}
          </div>
        ) : (() => {
          const scouterSnaps = snapshots.filter(s => s.scope === 'scouter')
          const citySnaps    = snapshots.filter(s => s.scope === 'city')
          const closedAt     = snapshots.find(s => s.closedAt)?.closedAt

          const MetricCell = ({ label, value }) => (
            <div style={{ textAlign:'center', minWidth:52 }}>
              <div style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)' }}>{value}</div>
              <div style={{ fontSize:9, color:'var(--text-secondary)', textTransform:'uppercase', letterSpacing:0.5 }}>{label}</div>
            </div>
          )

          const SnapRow = ({ snap, name }) => (
            <div style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px', borderRadius:8, background:'rgba(139,92,246,0.04)', border:'1px solid rgba(139,92,246,0.1)', flexWrap:'wrap' }}>
              <div style={{ minWidth:100, flex:'1 1 100px', fontSize:12, fontWeight:600, color:'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{name || snap.scopeId}</div>
              <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
                <MetricCell label={t('monthlyReport.metrics.newInfluencers')} value={snap.newInfluencers}/>
                <MetricCell label={t('monthlyReport.metrics.newBrands')} value={snap.newBrands}/>
                <MetricCell label={t('monthlyReport.metrics.opportunitiesWon')} value={snap.opportunitiesWon}/>
                <MetricCell label={t('monthlyReport.metrics.collaborationsClosed')} value={snap.collaborationsClosed}/>
                <MetricCell label={t('monthlyReport.metrics.totalValue')} value={fmtMoney(snap.totalValue)}/>
                {snap.avgEngagementRate != null && (
                  <MetricCell label={t('monthlyReport.metrics.avgEngagement')} value={`${(snap.avgEngagementRate * 100).toFixed(1)}%`}/>
                )}
              </div>
            </div>
          )

          return (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {closedAt && (
                <div style={{ fontSize:11, color:'var(--text-secondary)' }}>
                  {t('monthlyReport.closedAt', { date: new Date(closedAt).toLocaleDateString() })}
                </div>
              )}

              {scouterSnaps.length > 0 && (
                <div>
                  <div style={{ fontSize:10, fontWeight:700, color:'var(--text-secondary)', textTransform:'uppercase', letterSpacing:1, marginBottom:6 }}>
                    {t('monthlyReport.byScouter')}
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                    {scouterSnaps.map(snap => {
                      const sc = allScouters.find(s => s.userId === snap.scopeId)
                      return <SnapRow key={snap.id} snap={snap} name={sc ? personName(sc) : snap.scopeId}/>
                    })}
                  </div>
                </div>
              )}

              {citySnaps.length > 0 && (
                <div>
                  <div style={{ fontSize:10, fontWeight:700, color:'var(--text-secondary)', textTransform:'uppercase', letterSpacing:1, marginBottom:6 }}>
                    {t('monthlyReport.byCity')}
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                    {citySnaps.map(snap => {
                      const city = geo.cities.find(c => c.id === snap.scopeId)
                      return <SnapRow key={snap.id} snap={snap} name={city?.name || snap.scopeId}/>
                    })}
                  </div>
                </div>
              )}
            </div>
          )
        })()}
      </section>

      {/* Modals */}
      <ScouterModal
        isOpen={scouterModal}
        onClose={() => setScouterModal(false)}
        cities={geo.cities}
        onSaved={load}
      />

      <AssignModal
        isOpen={!!assignAlert}
        onClose={() => setAssignAlert(null)}
        entity={assignAlert}
        entityType={assignAlert?.entityType}
        onAssigned={() => { setAssignAlert(null); load() }}
      />

      <style>{`
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>
    </div>
  )
}
