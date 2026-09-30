// Command Center · Tiempo por etapa (Dirección). Fichas creadas en el
// período: cuántas pasan de cold → warm → strong → colaboración y
// cuántos días tardan en promedio. Datos desde que se instaló la 049.
import React, { useEffect, useState } from 'react'
import { t } from '../../i18n/index.js'
import { dbGetStageFunnel } from '../../lib/database.js'

const STEPS = ['cold_warm', 'warm_strong', 'strong_collab', 'cold_collab']
const PERIODS = [30, 90, 180]

export default function StageFunnel({ SectionTitle }) {
  const [days, setDays] = useState(90)
  const [kind, setKind] = useState('influencer')
  const [rows, setRows] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    setRows(null); setError(null)
    dbGetStageFunnel(days).then(setRows).catch(e => { setError(e.message); setRows([]) })
  }, [days])

  const chip = (on) => ({
    padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer',
    background: on ? 'rgba(139,92,246,0.25)' : 'rgba(139,92,246,0.07)', color: on ? 'var(--primary-violet-light)' : 'var(--text-secondary)',
    border: on ? '1px solid rgba(139,92,246,0.5)' : '1px solid var(--border-violet)',
  })
  const data = (rows || []).filter(r => r.entityType === kind)
  const byStep = Object.fromEntries(data.map(r => [r.step, r]))

  return (
    <section>
      <SectionTitle action={
        <div style={{ display: 'flex', gap: 4 }}>
          {PERIODS.map(p => <button key={p} onClick={() => setDays(p)} style={chip(days === p)}>{t('funnel.days', { n: p })}</button>)}
        </div>
      }>{t('funnel.title')}</SectionTitle>

      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        {['influencer', 'brand'].map(k => <button key={k} onClick={() => setKind(k)} style={chip(kind === k)}>{t(`funnel.kind.${k}`)}</button>)}
      </div>

      {error ? (
        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t('funnel.needsSql')}</div>
      ) : rows === null ? (
        <div style={{ height: 110, borderRadius: 10, background: 'rgba(139,92,246,0.06)', animation: 'pulse 1.5s ease-in-out infinite' }}/>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8 }}>
          {STEPS.map((s, i) => {
            const r = byStep[s] || { entered: 0, advanced: 0, pct: null, avgDays: null }
            const pct = r.pct ?? 0
            return (
              <div key={s} style={{ padding: '10px 12px', borderRadius: 12, background: i === 3 ? 'rgba(52,211,153,0.06)' : 'var(--glass-bg)', border: `1px solid ${i === 3 ? 'rgba(52,211,153,0.3)' : 'var(--border-violet)'}` }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{t(`funnel.step.${s}`)}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
                  <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>{r.pct == null ? '—' : `${pct}%`}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{r.advanced}/{r.entered}</span>
                </div>
                <div style={{ height: 5, borderRadius: 3, background: 'rgba(139,92,246,0.12)', margin: '6px 0' }}>
                  <div style={{ height: '100%', width: `${Math.min(100, pct)}%`, borderRadius: 3, background: i === 3 ? '#34D399' : 'var(--primary-violet)' }}/>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                  {r.avgDays == null ? t('funnel.noTime') : t('funnel.avg', { n: r.avgDays })}
                </div>
              </div>
            )
          })}
        </div>
      )}
      <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 8 }}>{t('funnel.hint')}</div>
    </section>
  )
}
