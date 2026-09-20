import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import PeriodFilter from '../components/PeriodFilter.jsx'
import ActivityTimeline from '../components/ActivityTimeline.jsx'
import { t } from '../../i18n/index.js'
import { getNetworkScouters, getScouterPerformance } from '../../lib/metrics.js'
import { dbGetInfluencers, dbGetBrands, dbGetOpportunities, dbGetCollaborations, dbGetTasks, dbGetActivitiesByActor } from '../../lib/database.js'

const AVATAR_COLORS = ['#8B5CF6','#EC4899','#06B6D4','#10B981','#F59E0B','#EF4444','#6366F1']
const avatarColor = (name = '') => AVATAR_COLORS[(name.charCodeAt(0)||0) % AVATAR_COLORS.length]
const initials = (name = '') => {
  const p = (name||'').trim().split(' ')
  return p.length >= 2 ? (p[0][0]+p[p.length-1][0]).toUpperCase() : (name||'').slice(0,2).toUpperCase() || '?'
}

const PERF_METRICS = (perf) => [
  ['Inf. agregados',     perf?.activity?.influencers_added],
  ['Marcas agregadas',   perf?.activity?.brands_added],
  ['Contactos',          perf?.activity?.contacts],
  ['Tareas completadas', perf?.activity?.tasks_completed],
  ['Perfiles completos', perf?.quality?.complete_profiles],
  ['Oportunidades',      perf?.results?.opportunities],
  ['Ganadas',            perf?.results?.won],
  ['Colaboraciones',     perf?.results?.collaborations],
]

function EntityList({ items, emptyKey, renderItem, subLine }) {
  if (items === null) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {[0,1,2].map(i => <div key={i} style={{ height: 52, borderRadius: 10, background: 'rgba(139,92,246,0.06)', animation: 'pulse 1.5s ease-in-out infinite' }}/>)}
      </div>
    )
  }
  if (items.length === 0) {
    return <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>{t(emptyKey)}</div>
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {items.map((item, i) => (
        <div key={item.id || i} style={{ padding: '10px 14px', background: 'var(--glass-bg)', border: '1px solid var(--border-violet)', borderRadius: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{renderItem(item)}</div>
          {subLine && subLine(item) && (
            <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 2 }}>{subLine(item)}</div>
          )}
        </div>
      ))}
    </div>
  )
}

export default function ScouterDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [scouter, setScouter] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab,     setTab]     = useState('performance')
  const [period,  setPeriod]  = useState(null)
  const [perf,    setPerf]    = useState(null)
  const [entities, setEntities] = useState({ influencers: null, brands: null, opportunities: null, collaborations: null, tasks: null, activity: null })

  useEffect(() => {
    setLoading(true)
    getNetworkScouters()
      .then(list => setScouter(list.find(s => s.userId === id) || null))
      .catch(() => setScouter(null))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (!scouter) return
    setPerf(null)
    getScouterPerformance(id, period?.from, period?.to)
      .then(setPerf)
      .catch(() => setPerf({}))
  }, [id, scouter, period])

  useEffect(() => {
    if (!scouter) return
    if (tab === 'influencers' && entities.influencers === null) {
      dbGetInfluencers({ ownerId: id, pageSize: 50 })
        .then(res => setEntities(e => ({ ...e, influencers: res.rows })))
        .catch(() => setEntities(e => ({ ...e, influencers: [] })))
    }
    if (tab === 'brands' && entities.brands === null) {
      dbGetBrands({ ownerId: id, pageSize: 50 })
        .then(res => setEntities(e => ({ ...e, brands: res.rows })))
        .catch(() => setEntities(e => ({ ...e, brands: [] })))
    }
    if (tab === 'opportunities' && entities.opportunities === null) {
      dbGetOpportunities({ ownerId: id, pageSize: 50 })
        .then(res => setEntities(e => ({ ...e, opportunities: res.rows })))
        .catch(() => setEntities(e => ({ ...e, opportunities: [] })))
    }
    if (tab === 'collaborations' && entities.collaborations === null) {
      dbGetCollaborations({ scouterId: id, pageSize: 50 })
        .then(res => setEntities(e => ({ ...e, collaborations: res.rows })))
        .catch(() => setEntities(e => ({ ...e, collaborations: [] })))
    }
    if (tab === 'tasks' && entities.tasks === null) {
      dbGetTasks({ assignedTo: id, status: 'todo', pageSize: 50 })
        .then(res => setEntities(e => ({ ...e, tasks: res.rows })))
        .catch(() => setEntities(e => ({ ...e, tasks: [] })))
    }
    if (tab === 'activity' && entities.activity === null) {
      dbGetActivitiesByActor(id, 80)
        .then(rows => setEntities(e => ({ ...e, activity: rows })))
        .catch(() => setEntities(e => ({ ...e, activity: [] })))
    }
  }, [tab, entities, scouter, id])

  if (loading) {
    return (
      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {[80,40,200].map((h,i) => (
          <div key={i} style={{ height: h, borderRadius: 12, background: 'rgba(139,92,246,0.06)', animation: 'pulse 1.5s ease-in-out infinite' }}/>
        ))}
      </div>
    )
  }

  if (!scouter) {
    return (
      <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', marginBottom: 12, display: 'block', margin: '0 auto 12px' }}>
          <ArrowLeft size={16}/>
        </button>
        {t('scouter.notFound')}
      </div>
    )
  }

  const inactive = scouter.daysInactive > 14

  const TABS_DEF = [
    ['performance', t('scouter.tabs.performance')],
    ['influencers', t('scouter.tabs.influencers')],
    ['brands',      t('scouter.tabs.brands')],
    ['opportunities',  t('scouter.tabs.opportunities')],
    ['collaborations', t('scouter.tabs.collaborations')],
    ['tasks',       t('scouter.tabs.tasks')],
    ['activity',    t('scouter.tabs.activity')],
  ]

  return (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 900 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <button
          onClick={() => navigate(-1)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '4px 0', marginTop: 4, flexShrink: 0 }}
        >
          <ArrowLeft size={16}/>
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 0, flexWrap: 'wrap' }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
            background: avatarColor(scouter.nombre),
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, fontWeight: 700, color: 'white',
          }}>
            {initials(scouter.nombre)}
          </div>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
              {scouter.nombre}
            </h1>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              {scouter.email}{scouter.ciudad ? ` · ${scouter.ciudad}` : ''}{` · ${t('scouter.level')} ${scouter.level}`}
            </div>
          </div>
          {inactive && (
            <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 8, background: 'rgba(248,113,113,0.15)', color: '#F87171', flexShrink: 0 }}>
              {t('scouter.daysInactive', { n: scouter.daysInactive })}
            </span>
          )}
        </div>
      </div>

      {/* Stats strip */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {[
          [scouter.influencers,   t('scouter.tabs.influencers'), null],
          [scouter.brands,        t('scouter.tabs.brands'),       null],
          [scouter.opportunities, 'Opps',                          null],
          [scouter.tasksOverdue,  t('scouter.cols.tasksOverdue'), scouter.tasksOverdue > 0 ? '#F87171' : null],
        ].map(([val, label, color]) => (
          <div key={label} style={{
            background: 'rgba(139,92,246,0.07)', border: '1px solid var(--border-violet)',
            borderRadius: 10, padding: '8px 14px', textAlign: 'center', minWidth: 64,
          }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: color || 'var(--primary-violet-light)' }}>{val ?? 0}</div>
            <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border-violet)' }}>
        {TABS_DEF.map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              padding: '8px 16px', background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 12, fontWeight: tab === key ? 700 : 500,
              color: tab === key ? 'var(--primary-violet-light)' : 'var(--text-secondary)',
              borderBottom: tab === key ? '2px solid var(--primary-violet-light)' : '2px solid transparent',
              marginBottom: -1,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'performance' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <PeriodFilter value={period} onChange={setPeriod}/>
          {!perf ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: 8 }}>
              {[0,1,2,3,4,5,6,7].map(i => (
                <div key={i} style={{ height: 64, borderRadius: 8, background: 'rgba(139,92,246,0.06)', animation: 'pulse 1.5s ease-in-out infinite' }}/>
              ))}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: 8 }}>
              {PERF_METRICS(perf).map(([label, val]) => (
                <div key={label} style={{ background: 'rgba(139,92,246,0.06)', border: '1px solid var(--border-violet)', borderRadius: 8, padding: '10px 12px' }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--primary-violet-light)' }}>{val ?? 0}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 2 }}>{label}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'influencers' && (
        <EntityList
          items={entities.influencers}
          emptyKey="scouter.empty.influencers"
          renderItem={inf => inf.name || inf.username || String(inf.id)}
          subLine={inf => inf.ciudad || null}
        />
      )}

      {tab === 'brands' && (
        <EntityList
          items={entities.brands}
          emptyKey="scouter.empty.brands"
          renderItem={b => b.name || String(b.id)}
          subLine={b => b.ciudad || null}
        />
      )}

      {tab === 'opportunities' && (
        <EntityList
          items={entities.opportunities}
          emptyKey="scouter.empty.opportunities"
          renderItem={o => o.title || String(o.id)}
          subLine={o => o.status || null}
        />
      )}

      {tab === 'collaborations' && (
        <EntityList
          items={entities.collaborations}
          emptyKey="scouter.empty.collaborations"
          renderItem={c => c.influencerName || c.brandName || String(c.id)}
          subLine={c => c.status || null}
        />
      )}

      {tab === 'tasks' && (
        <EntityList
          items={entities.tasks}
          emptyKey="scouter.empty.tasks"
          renderItem={task => task.title}
          subLine={task => task.dueDate ? new Date(task.dueDate).toLocaleDateString('es') : null}
        />
      )}

      {tab === 'activity' && (
        entities.activity === null ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[0,1,2,3].map(i => <div key={i} style={{ height: 52, borderRadius: 10, background: 'rgba(139,92,246,0.06)', animation: 'pulse 1.5s ease-in-out infinite' }}/>)}
          </div>
        ) : entities.activity.length === 0 ? (
          <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>
            {t('home.recentActivityEmpty')}
          </div>
        ) : (
          <ActivityTimeline activities={entities.activity}/>
        )
      )}
    </div>
  )
}
