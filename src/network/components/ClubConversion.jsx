// Command Center · Métrica del Club (Dirección): de los "Me interesa" que
// marcaron las influencers, cuántos terminaron en una colaboración.
// Usa red_conversion() (migración 047).
import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Heart, Handshake } from 'lucide-react'
import { t } from '../../i18n/index.js'
import { redGetConversion } from '../../lib/red.js'

const PERIODS = [30, 90, 365]

export default function ClubConversion({ SectionTitle }) {
  const navigate = useNavigate()
  const [days, setDays] = useState(90)
  const [cur, setCur] = useState(null)
  const [prev, setPrev] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    setCur(null); setError(null)
    const now = Date.now(), d = days * 86400000
    const iso = (ms) => new Date(ms).toISOString()
    Promise.all([
      redGetConversion({ from: iso(now - d), to: iso(now) }),
      redGetConversion({ from: iso(now - 2 * d), to: iso(now - d) }).catch(() => null),
    ]).then(([a, b]) => { setCur(a); setPrev(b) }).catch(e => setError(e.message))
  }, [days])

  const chip = (on) => ({
    padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer',
    background: on ? 'rgba(139,92,246,0.25)' : 'rgba(139,92,246,0.07)', color: on ? 'var(--primary-violet-light)' : 'var(--text-secondary)',
    border: on ? '1px solid rgba(139,92,246,0.5)' : '1px solid var(--border-violet)',
  })
  const tile = { padding: '12px 14px', borderRadius: 12, background: 'var(--glass-bg)', border: '1px solid var(--border-violet)' }
  const delta = cur && prev && cur.pct != null && prev.pct != null ? Math.round((cur.pct - prev.pct) * 10) / 10 : null

  return (
    <section>
      <SectionTitle action={
        <div style={{ display: 'flex', gap: 4 }}>
          {PERIODS.map(p => <button key={p} onClick={() => setDays(p)} style={chip(days === p)}>{t('clubConv.days', { n: p })}</button>)}
        </div>
      }>{t('clubConv.title')}</SectionTitle>

      {error ? (
        <div style={{ fontSize: 12, color: '#F87171' }}>{error}</div>
      ) : !cur ? (
        <div style={{ height: 90, borderRadius: 10, background: 'rgba(139,92,246,0.06)', animation: 'pulse 1.5s ease-in-out infinite' }}/>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8 }}>
          <div style={{ ...tile, background: 'rgba(52,211,153,0.06)', borderColor: 'rgba(52,211,153,0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)' }}>{cur.pct == null ? '—' : `${cur.pct}%`}</span>
              {delta != null && delta !== 0 && (
                <span style={{ fontSize: 11, fontWeight: 700, color: delta > 0 ? '#34D399' : '#F87171' }}>{delta > 0 ? `+${delta}` : delta} pts</span>
              )}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{t('clubConv.rate')}</div>
          </div>
          <button onClick={() => navigate('/network/approvals?tab=interests')} style={{ ...tile, textAlign: 'left', cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}><Heart size={16} color="#EC4899"/>{cur.interested}</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{t('clubConv.interested')}</div>
          </button>
          <div style={tile}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}><Handshake size={16} color="#34D399"/>{cur.withCollaboration}</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{t('clubConv.withCollab')}</div>
          </div>
        </div>
      )}
      <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 8 }}>{t('clubConv.hint', { n: days })}</div>
    </section>
  )
}
