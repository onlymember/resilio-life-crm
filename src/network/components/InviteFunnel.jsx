// Command Center · Embudo de invitaciones a la red (064, Dirección).
// Por mes: enviadas → abiertas → se sumaron, por ciudad, por scouter
// o por mensaje (A/B: se alternan solos al crear cada link).
import React, { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { t } from '../../i18n/index.js'
import { dbGetInviteFunnelRows, dbGetPeopleNames, dbGetGeography } from '../../lib/database.js'
import { groupInvites, pct } from '../utils/inviteFunnel.js'

const monthRange = (offset) => {
  const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); d.setMonth(d.getMonth() + offset)
  const end = new Date(d); end.setMonth(end.getMonth() + 1)
  return { from: d, to: end }
}
const TABS = ['byCity', 'byScouter', 'byMessage']
const BY = { byCity: 'city', byScouter: 'scouter', byMessage: 'message' }

export default function InviteFunnel({ SectionTitle }) {
  const [offset, setOffset] = useState(0)
  const [rows, setRows] = useState(null)
  const [tab, setTab] = useState('byCity')
  const [names, setNames] = useState({})
  const [cities, setCities] = useState({})
  const { from } = monthRange(offset)

  useEffect(() => {
    setRows(null)
    const { from: f, to: tt } = monthRange(offset)
    dbGetInviteFunnelRows(f.toISOString(), tt.toISOString())
      .then(r => { setRows(r); return dbGetPeopleNames(r.map(x => x.createdBy)) })
      .then(n => n && setNames(n))
      .catch(() => setRows([]))
  }, [offset])
  useEffect(() => {
    dbGetGeography().then(g => setCities(Object.fromEntries((g?.cities || []).map(c => [c.id, c.name])))).catch(() => {})
  }, [])

  const navBtn = { display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8, background: 'rgba(139,92,246,0.07)', border: '1px solid var(--border-violet)', color: 'var(--text-secondary)', cursor: 'pointer' }
  const label = from.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
  const { total, groups } = groupInvites(rows || [], BY[tab])
  const nameOf = (k) => tab === 'byCity' ? (cities[k] || t('invite.funnel.noCity'))
    : tab === 'byScouter' ? (names[k] || '—')
    : t('invite.funnel.message', { v: String(k).toUpperCase() })
  const steps = [
    { k: 'sent', n: total.sent, of: null },
    { k: 'viewed', n: total.viewed, of: total.sent },
    { k: 'joined', n: total.joined, of: total.viewed },
  ]

  return (
    <section>
      <SectionTitle action={
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button onClick={() => setOffset(o => o - 1)} style={navBtn} aria-label={t('proposalFunnel.prev')}><ChevronLeft size={14}/></button>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', minWidth: 110, textAlign: 'center', textTransform: 'capitalize' }}>{label}</span>
          <button onClick={() => setOffset(o => Math.min(0, o + 1))} disabled={offset === 0} style={{ ...navBtn, opacity: offset === 0 ? 0.4 : 1 }} aria-label={t('proposalFunnel.next')}><ChevronRight size={14}/></button>
        </div>
      }>{t('invite.funnel.title')}</SectionTitle>

      {rows === null ? (
        <div style={{ height: 110, borderRadius: 10, background: 'rgba(139,92,246,0.06)', animation: 'pulse 1.5s ease-in-out infinite' }}/>
      ) : total.sent === 0 ? (
        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t('invite.funnel.empty')}</div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8 }}>
            {steps.map((s, i) => (
              <div key={s.k} style={{ padding: '10px 12px', borderRadius: 12, background: i === 2 ? 'rgba(52,211,153,0.06)' : 'var(--glass-bg)', border: `1px solid ${i === 2 ? 'rgba(52,211,153,0.3)' : 'var(--border-violet)'}` }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{t(`invite.funnel.${s.k}`)}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
                  <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>{s.n}</span>
                  {s.of != null && <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{pct(s.n, s.of)}%</span>}
                </div>
              </div>
            ))}
          </div>
          {total.declined > 0 && <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 8 }}>{t('invite.funnel.declined')}: {total.declined}</div>}

          <div role="tablist" style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
            {TABS.map(k => (
              <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} style={{ fontSize: 11, fontWeight: 700, padding: '6px 10px', borderRadius: 8, cursor: 'pointer', border: '1px solid var(--border-violet)', background: tab === k ? 'var(--primary-violet)' : 'rgba(139,92,246,0.06)', color: tab === k ? 'white' : 'var(--text-secondary)' }}>{t(`invite.funnel.${k}`)}</button>
            ))}
          </div>
          <div style={{ marginTop: 8, overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 380, fontSize: 12 }}>
              <thead>
                <tr style={{ color: 'var(--text-secondary)', textAlign: 'left' }}>
                  <th style={{ padding: '6px 4px', fontWeight: 600 }}></th>
                  <th style={{ padding: '6px 4px', fontWeight: 600 }}>{t('invite.funnel.sent')}</th>
                  <th style={{ padding: '6px 4px', fontWeight: 600 }}>{t('invite.funnel.viewed')}</th>
                  <th style={{ padding: '6px 4px', fontWeight: 600 }}>{t('invite.funnel.joined')}</th>
                </tr>
              </thead>
              <tbody>
                {groups.map(g => (
                  <tr key={String(g.key)} style={{ borderTop: '1px solid var(--border-violet)', color: 'var(--text-primary)' }}>
                    <td style={{ padding: '7px 4px', fontWeight: 600 }}>{nameOf(g.key)}</td>
                    <td style={{ padding: '7px 4px' }}>{g.sent}</td>
                    <td style={{ padding: '7px 4px' }}>{g.viewed} <span style={{ color: 'var(--text-secondary)' }}>({pct(g.viewed, g.sent)}%)</span></td>
                    <td style={{ padding: '7px 4px' }}>{g.joined} <span style={{ color: 'var(--text-secondary)' }}>({pct(g.joined, g.sent)}%)</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  )
}
