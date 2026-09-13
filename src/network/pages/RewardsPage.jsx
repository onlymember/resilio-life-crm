import React, { useState, useEffect } from 'react'
import { Award, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { t } from '../../i18n/index.js'
import { claimCompletedMissions, getMyRewardBalance, getMyRewardHistory } from '../../lib/metrics.js'

const pad2 = (n) => String(n).padStart(2, '0')
const fmtDate = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getDate()}/${pad2(d.getMonth()+1)}/${d.getFullYear()}`
}

export default function RewardsPage() {
  const navigate  = useNavigate()
  const [balance,  setBalance]  = useState(null)
  const [history,  setHistory]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [claimed,  setClaimed]  = useState([])

  useEffect(() => {
    let alive = true
    const run = async () => {
      // 1) claim primero — por si el usuario entra acá sin pasar por Misiones
      try {
        const cl = await claimCompletedMissions()
        if (alive && cl.length > 0) setClaimed(cl)
      } catch (e) {
        console.warn('claim_completed_missions (Rewards):', e.message)
      }

      // 2) balance + historial — no se bloquean mutuamente
      try {
        const [bal, hist] = await Promise.all([
          getMyRewardBalance(),
          getMyRewardHistory(),
        ])
        if (alive) { setBalance(bal); setHistory(hist) }
      } catch (e) {
        console.error('RewardsPage load:', e.message)
        if (alive) { setBalance(0); setHistory([]) }
      } finally {
        if (alive) setLoading(false)
      }
    }
    run()
    return () => { alive = false }
  }, [])

  if (loading) return (
    <div style={{ padding: 20 }}>
      <div style={{ height: 120, borderRadius: 16, background: 'rgba(139,92,246,0.06)', marginBottom: 20, animation: 'pulse 1.5s ease-in-out infinite' }}/>
      {[0,1,2].map(i => <div key={i} style={{ height: 52, borderRadius: 10, background: 'rgba(139,92,246,0.06)', marginBottom: 8, animation: 'pulse 1.5s ease-in-out infinite' }}/>)}
    </div>
  )

  const isEmpty = balance === 0 && history.length === 0

  return (
    <div style={{ padding: '20px', maxWidth: 720 }}>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>
          {t('rewards.title')}
        </h1>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t('rewards.subtitle')}</p>
      </div>

      {/* Banners de puntos recién ganados */}
      {claimed.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          {claimed.map((c, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', marginBottom: 8, background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.3)', borderRadius: 12, fontSize: 13, fontWeight: 600, color: '#34D399' }}>
              <span>{t('rewards.claimed', { n: c.pointsAwarded, title: c.title })}</span>
              <button onClick={() => setClaimed(prev => prev.filter((_, j) => j !== i))}
                style={{ background: 'none', border: 'none', color: '#34D399', cursor: 'pointer', padding: 4 }}>
                <X size={14}/>
              </button>
            </div>
          ))}
        </div>
      )}

      {isEmpty ? (
        /* Estado vacío */
        <div style={{ padding: '48px 0', textAlign: 'center' }}>
          <Award size={48} style={{ color: 'var(--text-secondary)', opacity: 0.3, display: 'block', margin: '0 auto 20px' }}/>
          <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
            {t('rewards.emptyTitle')}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 260, margin: '0 auto 24px' }}>
            {t('rewards.emptySub')}
          </div>
          <button
            onClick={() => navigate('/network/missions')}
            style={{ padding: '10px 24px', borderRadius: 12, background: 'var(--primary-violet)', border: 'none', color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
          >
            {t('rewards.goToMissions')}
          </button>
        </div>
      ) : (
        <>
          {/* Balance principal */}
          <div style={{ padding: '28px 20px', background: 'var(--glass-bg)', border: '1px solid var(--border-violet)', borderRadius: 16, textAlign: 'center', marginBottom: 24, boxShadow: 'var(--glow-violet-sm)' }}>
            <div style={{ fontSize: 52, fontWeight: 800, color: 'var(--primary-violet-light)', lineHeight: 1, marginBottom: 6 }}>
              {balance ?? 0}
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 1 }}>
              {t('rewards.balanceLabel')}
            </div>
          </div>

          {/* Historial */}
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 10 }}>
              {t('rewards.history')}
            </div>
            {history.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', padding: '12px 0' }}>
                {t('rewards.historyEmpty')}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {history.map(h => (
                  <div key={h.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(139,92,246,0.04)', border: '1px solid var(--border-violet)', borderRadius: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {h.sourceType === 'mission' ? (h.missionTitle || '—') : t('rewards.sourceOther')}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 2 }}>
                        {fmtDate(h.createdAt)}
                      </div>
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 800, color: '#34D399', flexShrink: 0, marginLeft: 12 }}>
                      {t('rewards.pointsAwarded', { n: h.points })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
