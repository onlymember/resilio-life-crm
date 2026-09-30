// Command Center · Resumen de la semana (solo Dirección y super_admin).
// Últimos 7 días contra los 7 anteriores, quién cargó más y qué
// ciudades con scouters no tuvieron movimiento.
import React, { useEffect, useState } from 'react'
import { TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react'
import { t } from '../../i18n/index.js'
import { dbGetWeeklySummary, dbGetActiveScouters, dbGetGeography } from '../../lib/database.js'
import { personName } from '../utils/people.js'

const METRICS = ['influencers', 'brands', 'contacts', 'answers', 'collabs', 'completed']

function Delta({ cur, prev }) {
  if (!prev && !cur) return null
  const d = cur - prev
  const Icon = d > 0 ? TrendingUp : d < 0 ? TrendingDown : Minus
  const col = d > 0 ? '#34D399' : d < 0 ? '#F87171' : 'var(--text-secondary)'
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 700, color: col }}>
      <Icon size={11}/>{d > 0 ? `+${d}` : d}
    </span>
  )
}

export default function WeeklySummary({ SectionTitle }) {
  const [data, setData] = useState(null)
  const [scouters, setScouters] = useState([])
  const [cities, setCities] = useState({})
  const [error, setError] = useState(null)

  useEffect(() => {
    Promise.all([dbGetWeeklySummary(), dbGetActiveScouters(null).catch(() => []), dbGetGeography().catch(() => ({ cities: [] }))])
      .then(([d, sc, g]) => {
        setData(d); setScouters(sc)
        const m = {}; (g.cities || []).forEach(c => { m[c.id] = c.name }); setCities(m)
      })
      .catch(e => setError(e.message))
  }, [])

  const names = Object.fromEntries(scouters.map(s => [s.userId, personName(s)]))
  const top = data ? Object.entries(data.byCreator).sort((a, b) => b[1] - a[1]).slice(0, 5) : []
  // Ciudades con scouters activos y cero altas y cero colaboraciones en la semana.
  const weak = data ? [...new Set(scouters.map(s => s.cityId).filter(Boolean))]
    .filter(id => !data.byCity[id]).map(id => cities[id]).filter(Boolean).sort() : []

  return (
    <section>
      <SectionTitle>{t('weekly.title')}</SectionTitle>
      {error && <div style={{ fontSize: 12, color: '#F87171' }}>{error}</div>}
      {!data && !error ? (
        <div style={{ height: 120, borderRadius: 10, background: 'rgba(139,92,246,0.06)', animation: 'pulse 1.5s ease-in-out infinite' }}/>
      ) : data && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 8, marginBottom: 12 }}>
            {METRICS.map(k => (
              <div key={k} style={{ padding: '10px 12px', borderRadius: 12, background: 'var(--glass-bg)', border: '1px solid var(--border-violet)' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1 }}>{data[k].cur}</span>
                  <Delta cur={data[k].cur} prev={data[k].prev}/>
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 2 }}>{t(`weekly.metric.${k}`)}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 8 }}>
            <div style={{ padding: '10px 12px', borderRadius: 12, background: 'var(--glass-bg)', border: '1px solid var(--border-violet)' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 }}>{t('weekly.topAdders')}</div>
              {top.length === 0 ? <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t('weekly.none')}</div> : top.map(([id, n]) => (
                <div key={id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '2px 0' }}>
                  <span style={{ color: 'var(--text-primary)' }}>{names[id] || '—'}</span><b style={{ color: 'var(--primary-violet-light)' }}>{n}</b>
                </div>
              ))}
            </div>
            <div style={{ padding: '10px 12px', borderRadius: 12, background: weak.length ? 'rgba(248,113,113,0.06)' : 'var(--glass-bg)', border: `1px solid ${weak.length ? 'rgba(248,113,113,0.3)' : 'var(--border-violet)'}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 }}>
                {weak.length > 0 && <AlertTriangle size={11} color="#F87171"/>}{t('weekly.weakCities')}
              </div>
              <div style={{ fontSize: 12, color: weak.length ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{weak.length ? weak.join(' · ') : t('weekly.noWeak')}</div>
            </div>
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 8 }}>{t('weekly.hint')}</div>
        </>
      )}
    </section>
  )
}
