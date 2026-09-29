// Command Center · Influencers agregadas por día y por semana, y quién
// las cargó. Cada número lleva a la lista de Influencers ya filtrada.
import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { t, currentLocale } from '../../i18n/index.js'
import { dbGetInfluencerIntake, dbGetPeopleNames } from '../../lib/database.js'
import { buildBuckets, bucketIndex } from '../utils/addedRanges.js'

const MODES = { day: 14, week: 8 }

export default function IntakeReport({ SectionTitle }) {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const cityId = params.get('city') || null
  const countryId = params.get('country') || null

  const [mode,    setMode]    = useState('day')
  const [rows,    setRows]    = useState(null)
  const [names,   setNames]   = useState({})
  const [error,   setError]   = useState(null)

  const buckets = useMemo(() => buildBuckets(mode, MODES[mode], currentLocale()), [mode])

  useEffect(() => {
    setRows(null); setError(null)
    dbGetInfluencerIntake({ from: buckets[0].from.toISOString(), cityId, countryId })
      .then(async list => {
        setRows(list)
        setNames(await dbGetPeopleNames(list.map(r => r.createdBy)))
      })
      .catch(e => setError(e.message))
  }, [buckets, cityId, countryId])

  // Matriz: una fila por quien cargó + totales por columna.
  const { people, totals, grand } = useMemo(() => {
    const byPerson = {}
    const totals = buckets.map(() => 0)
    for (const r of rows || []) {
      const i = bucketIndex(buckets, r.createdAt)
      if (i < 0) continue
      const k = r.createdBy || 'none'
      byPerson[k] ||= { id: r.createdBy, counts: buckets.map(() => 0), total: 0 }
      byPerson[k].counts[i]++; byPerson[k].total++; totals[i]++
    }
    const people = Object.values(byPerson).sort((a, b) => b.total - a.total)
    return { people, totals, grand: totals.reduce((a, b) => a + b, 0) }
  }, [rows, buckets])

  const max = Math.max(1, ...totals)
  const today = totals[totals.length - 1] || 0
  const prev  = totals[totals.length - 2] || 0

  const go = ({ createdBy, from, to }) => {
    const q = new URLSearchParams()
    if (createdBy) q.set('createdBy', createdBy)
    q.set('from', from.toISOString())
    q.set('to', to.toISOString())
    navigate(`/network/influencers?${q.toString()}`)
  }
  const whole = { from: buckets[0].from, to: buckets[buckets.length - 1].to }

  const toggle = (
    <div style={{ display: 'flex', gap: 4 }}>
      {Object.keys(MODES).map(m => (
        <button key={m} onClick={() => setMode(m)} style={{
          padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer',
          background: mode === m ? 'rgba(139,92,246,0.25)' : 'rgba(139,92,246,0.07)',
          color: mode === m ? 'var(--primary-violet-light)' : 'var(--text-secondary)',
          border: mode === m ? '1px solid rgba(139,92,246,0.5)' : '1px solid var(--border-violet)',
        }}>{t(`intake.mode.${m}`)}</button>
      ))}
    </div>
  )

  const cell = { padding: '6px 8px', textAlign: 'center', borderBottom: '1px solid var(--border-violet)', whiteSpace: 'nowrap' }

  return (
    <section>
      <SectionTitle action={toggle}>{t('intake.title')}</SectionTitle>

      {error && <div style={{ fontSize: 12, color: '#F87171' }}>{error}</div>}

      {!rows && !error ? (
        <div style={{ height: 160, borderRadius: 10, background: 'rgba(139,92,246,0.06)', animation: 'pulse 1.5s ease-in-out infinite' }}/>
      ) : rows && (
        <>
          {/* Resumen */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
            {[
              [t(`intake.current.${mode}`), today],
              [t(`intake.previous.${mode}`), prev],
              [t(`intake.total.${mode}`, { n: MODES[mode] }), grand],
            ].map(([label, n]) => (
              <div key={label} style={{ padding: '10px 12px', borderRadius: 12, background: 'var(--glass-bg)', border: '1px solid var(--border-violet)' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1 }}>{n}</div>
                <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Barras */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 96, padding: '0 2px', marginBottom: 4 }}>
            {totals.map((n, i) => (
              <button key={buckets[i].key} title={`${buckets[i].label}: ${n}`} onClick={() => n && go(buckets[i])}
                style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', height: '100%', gap: 3, cursor: n ? 'pointer' : 'default', padding: 0 }}>
                <span style={{ fontSize: 9, color: 'var(--text-secondary)' }}>{n || ''}</span>
                <span style={{ width: '100%', maxWidth: 28, height: `${Math.max(n ? 6 : 2, (n / max) * 70)}px`, borderRadius: 4,
                  background: n ? 'linear-gradient(180deg, var(--primary-violet-light), var(--primary-violet-dark))' : 'rgba(139,92,246,0.15)' }}/>
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 4, padding: '0 2px', marginBottom: 14 }}>
            {buckets.map(b => (
              <span key={b.key} style={{ flex: 1, fontSize: 9, color: 'var(--text-secondary)', textAlign: 'center', overflow: 'hidden', whiteSpace: 'nowrap' }}>{b.label}</span>
            ))}
          </div>

          {/* Por quién las cargó */}
          {people.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t('intake.empty')}</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 12, minWidth: 420 }}>
                <thead>
                  <tr>
                    <th style={{ ...cell, textAlign: 'left', fontSize: 9, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.8 }}>{t('intake.addedBy')}</th>
                    {buckets.map(b => <th key={b.key} style={{ ...cell, fontSize: 9, color: 'var(--text-secondary)', fontWeight: 600 }}>{b.label}</th>)}
                    <th style={{ ...cell, fontSize: 9, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>{t('intake.totalCol')}</th>
                  </tr>
                </thead>
                <tbody>
                  {people.map(p => (
                    <tr key={p.id || 'none'}>
                      <td style={{ ...cell, textAlign: 'left' }}>
                        <button onClick={() => p.id && go({ createdBy: p.id, ...whole })}
                          style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: 12, padding: 0, cursor: p.id ? 'pointer' : 'default', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                          {p.id ? (names[p.id] || '—') : t('intake.unknown')}
                        </button>
                      </td>
                      {p.counts.map((n, i) => (
                        <td key={buckets[i].key} style={cell}>
                          {n ? (
                            <button onClick={() => go({ createdBy: p.id, from: buckets[i].from, to: buckets[i].to })}
                              style={{ minWidth: 26, padding: '2px 6px', borderRadius: 6, fontWeight: 700, fontSize: 12, color: 'var(--primary-violet-light)', background: `rgba(139,92,246,${0.08 + 0.3 * n / max})` }}>
                              {n}
                            </button>
                          ) : <span style={{ color: 'var(--text-tertiary)' }}>·</span>}
                        </td>
                      ))}
                      <td style={{ ...cell, fontWeight: 800, color: 'var(--text-primary)' }}>{p.total}</td>
                    </tr>
                  ))}
                  <tr>
                    <td style={{ ...cell, textAlign: 'left', fontWeight: 700, color: 'var(--text-secondary)', borderBottom: 'none' }}>{t('intake.totalRow')}</td>
                    {totals.map((n, i) => <td key={buckets[i].key} style={{ ...cell, fontWeight: 700, color: 'var(--text-secondary)', borderBottom: 'none' }}>{n || '·'}</td>)}
                    <td style={{ ...cell, fontWeight: 800, color: 'var(--primary-violet-light)', borderBottom: 'none' }}>{grand}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
          <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 8 }}>{t('intake.hint')}</div>
        </>
      )}
    </section>
  )
}
