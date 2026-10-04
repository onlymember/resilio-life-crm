// Command Center · Embudo de propuestas a marcas (Dirección).
// Por mes: enviadas → abiertas → respondidas, y qué plan eligieron,
// en total y por scouter. Lee brand_proposals (059); la RLS deja a
// Dirección ver todas.
import React, { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { t } from '../../i18n/index.js'
import { dbGetProposalFunnel, dbGetPeopleNames } from '../../lib/database.js'
import { planLabel, PLAN_KEYS, ADVISE_KEY } from '../../partners/content.js'

const monthRange = (offset) => {
  const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); d.setMonth(d.getMonth() + offset)
  const end = new Date(d); end.setMonth(end.getMonth() + 1)
  return { from: d, to: end }
}
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0)

export default function ProposalFunnel({ SectionTitle }) {
  const [offset, setOffset] = useState(0)
  const [data, setData]     = useState(null)
  const [names, setNames]   = useState({})
  const [error, setError]   = useState(false)
  const { from } = monthRange(offset)

  useEffect(() => {
    setData(null); setError(false)
    const { from: f, to: tt } = monthRange(offset)
    dbGetProposalFunnel(f.toISOString(), tt.toISOString())
      .then(d => { setData(d); return dbGetPeopleNames(d.rows.map(r => r.userId)) })
      .then(n => n && setNames(n))
      .catch(() => { setError(true); setData({ total: { sent: 0, viewed: 0, answered: 0, plans: {} }, rows: [] }) })
  }, [offset])

  const navBtn = { display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8, background: 'rgba(139,92,246,0.07)', border: '1px solid var(--border-violet)', color: 'var(--text-secondary)', cursor: 'pointer' }
  const label = from.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
  const tot = data?.total
  const steps = tot ? [
    { k: 'sent',     n: tot.sent,     of: null },
    { k: 'viewed',   n: tot.viewed,   of: tot.sent },
    { k: 'answered', n: tot.answered, of: tot.viewed },
  ] : []

  return (
    <section>
      <SectionTitle action={
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button onClick={() => setOffset(o => o - 1)} style={navBtn} aria-label={t('proposalFunnel.prev')}><ChevronLeft size={14}/></button>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', minWidth: 110, textAlign: 'center', textTransform: 'capitalize' }}>{label}</span>
          <button onClick={() => setOffset(o => Math.min(0, o + 1))} disabled={offset === 0} style={{ ...navBtn, opacity: offset === 0 ? 0.4 : 1 }} aria-label={t('proposalFunnel.next')}><ChevronRight size={14}/></button>
        </div>
      }>{t('proposalFunnel.title')}</SectionTitle>

      {error && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>{t('proposalFunnel.error')}</div>}

      {data === null ? (
        <div style={{ height: 110, borderRadius: 10, background: 'rgba(139,92,246,0.06)', animation: 'pulse 1.5s ease-in-out infinite' }}/>
      ) : tot.sent === 0 ? (
        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t('proposalFunnel.empty')}</div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8 }}>
            {steps.map((s, i) => (
              <div key={s.k} style={{ padding: '10px 12px', borderRadius: 12, background: i === 2 ? 'rgba(52,211,153,0.06)' : 'var(--glass-bg)', border: `1px solid ${i === 2 ? 'rgba(52,211,153,0.3)' : 'var(--border-violet)'}` }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{t(`proposalFunnel.step.${s.k}`)}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
                  <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>{s.n}</span>
                  {s.of != null && <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{pct(s.n, s.of)}%</span>}
                </div>
              </div>
            ))}
          </div>

          {/* Planes elegidos */}
          {tot.answered > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
              {[...PLAN_KEYS, ADVISE_KEY].filter(p => tot.plans[p]).map(p => (
                <span key={p} style={{ padding: '5px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.3)', color: 'var(--text-primary)' }}>
                  {planLabel(p)}: {tot.plans[p]}
                </span>
              ))}
            </div>
          )}

          {/* Por scouter */}
          <div style={{ marginTop: 12, overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 360, fontSize: 12 }}>
              <thead>
                <tr style={{ color: 'var(--text-secondary)', textAlign: 'left' }}>
                  <th style={{ padding: '6px 4px', fontWeight: 600 }}>{t('proposalFunnel.who')}</th>
                  <th style={{ padding: '6px 4px', fontWeight: 600 }}>{t('proposalFunnel.step.sent')}</th>
                  <th style={{ padding: '6px 4px', fontWeight: 600 }}>{t('proposalFunnel.step.viewed')}</th>
                  <th style={{ padding: '6px 4px', fontWeight: 600 }}>{t('proposalFunnel.step.answered')}</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map(r => (
                  <tr key={r.userId || 'none'} style={{ borderTop: '1px solid var(--border-violet)', color: 'var(--text-primary)' }}>
                    <td style={{ padding: '7px 4px', fontWeight: 600 }}>{names[r.userId] || '—'}</td>
                    <td style={{ padding: '7px 4px' }}>{r.sent}</td>
                    <td style={{ padding: '7px 4px' }}>{r.viewed} <span style={{ color: 'var(--text-secondary)' }}>({pct(r.viewed, r.sent)}%)</span></td>
                    <td style={{ padding: '7px 4px' }}>{r.answered} <span style={{ color: 'var(--text-secondary)' }}>({pct(r.answered, r.viewed)}%)</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 8 }}>{t('proposalFunnel.hint')}</div>
    </section>
  )
}
