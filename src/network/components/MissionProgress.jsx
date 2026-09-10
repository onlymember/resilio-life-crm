import React from 'react'
import { Star } from 'lucide-react'
import { t } from '../../i18n/index.js'

export default function MissionProgress({ mission }) {
  const pct     = Math.min(100, Math.max(0, mission.pct ?? 0))
  const endsAt  = mission.endsAt
    ? new Date(mission.endsAt).toLocaleDateString('es', { day: 'numeric', month: 'short' })
    : null

  return (
    <div style={{ padding: '12px 14px', background: 'var(--glass-bg)', border: '1px solid var(--border-violet)', borderRadius: 12 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3 }}>{mission.title}</div>
          {endsAt && (
            <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 2 }}>
              {t('missions.endsAt', { date: endsAt })}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0, marginLeft: 10 }}>
          <Star size={11} color="#FCD34D"/>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#FCD34D' }}>
            {t('missions.points', { n: mission.rewardPoints ?? 0 })}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 6, borderRadius: 3, background: 'rgba(139,92,246,0.15)', overflow: 'hidden', marginBottom: 4 }}>
        <div style={{
          height: '100%', borderRadius: 3, transition: 'width 0.4s ease',
          width: `${pct}%`,
          background: pct >= 100
            ? 'linear-gradient(90deg,#34D399,#10B981)'
            : 'linear-gradient(90deg,var(--primary-violet),var(--primary-violet-light))',
        }}/>
      </div>
      <div style={{ fontSize: 10, color: 'var(--text-secondary)', textAlign: 'right' }}>
        {t('missions.progress', { current: mission.progress, target: mission.target })} · {pct}%
      </div>
    </div>
  )
}
