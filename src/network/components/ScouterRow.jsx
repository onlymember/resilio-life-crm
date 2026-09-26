import React from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { t } from '../../i18n/index.js'
import { personName } from '../utils/people.js'

const AVATAR_COLORS = ['#8B5CF6','#EC4899','#06B6D4','#10B981','#F59E0B','#EF4444','#6366F1']
const avatarColor = (name = '') => AVATAR_COLORS[(name.charCodeAt(0)||0) % AVATAR_COLORS.length]
const initials = (name = '') => {
  const p = (name||'').trim().split(' ')
  return p.length >= 2 ? (p[0][0]+p[p.length-1][0]).toUpperCase() : (name||'').slice(0,2).toUpperCase() || '?'
}

const num = (v) => <span style={{ fontVariantNumeric: 'tabular-nums' }}>{v ?? '—'}</span>

const Chip = ({ label, value, color }) => (
  <span style={{
    fontSize: 10, padding: '2px 7px', borderRadius: 8,
    background: 'rgba(139,92,246,0.08)', border: '1px solid var(--border-violet)',
    color: color || 'var(--text-secondary)',
    fontWeight: color ? 700 : 400,
  }}>
    {label && <span style={{ opacity: 0.7 }}>{label} </span>}{value ?? '—'}
  </span>
)

export default function ScouterRow({ scouter, expanded, onToggle, performance, isMobile }) {
  const navigate = useNavigate()
  const inactive = scouter.daysInactive > 14

  const cardBorder = inactive ? '1px solid rgba(248,113,113,0.35)' : '1px solid var(--border-violet)'
  const cardBg     = inactive ? 'rgba(248,113,113,0.04)' : 'var(--glass-bg)'

  const expandedPanel = expanded && (
    <div style={{ padding: '0 14px 14px', borderTop: '1px solid var(--border-violet)' }}>
      {!performance ? (
        <div style={{ fontSize: 11, color: 'var(--text-secondary)', paddingTop: 10 }}>{t('loading.generic')}</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: 8, paddingTop: 10 }}>
          {[
            ['Inf. agregados',    performance.activity?.influencers_added],
            ['Marcas agregadas',  performance.activity?.brands_added],
            ['Contactos',         performance.activity?.contacts],
            ['Tareas completadas',performance.activity?.tasks_completed],
            ['Perfiles completos',performance.quality?.complete_profiles],
            ['Oportunidades',     performance.results?.opportunities],
            ['Ganadas',           performance.results?.won],
            ['Colaboraciones',    performance.results?.collaborations],
          ].map(([label, val]) => (
            <div key={label} style={{ background: 'rgba(139,92,246,0.06)', borderRadius: 8, padding: '8px 10px' }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--primary-violet-light)' }}>{val ?? 0}</div>
              <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  if (isMobile) {
    return (
      <div style={{ borderRadius: 10, border: cardBorder, background: cardBg, overflow: 'hidden' }}>
        <button
          onClick={onToggle}
          style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: '12px 14px' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
              background: avatarColor(personName(scouter)),
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700, color: 'white',
            }}>
              {initials(personName(scouter))}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                onClick={e => { e.stopPropagation(); navigate(`/network/scouters/${scouter.userId}`) }}
                style={{ fontSize: 13, fontWeight: 600, color: 'var(--primary-violet-light)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer', textDecoration: 'underline', textDecorationColor: 'rgba(139,92,246,0.3)' }}
              >
                {personName(scouter)}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{scouter.email}</div>
            </div>
            <span style={{ color: 'var(--text-secondary)', flexShrink: 0 }}>
              {expanded ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
            </span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 8 }}>
            {scouter.ciudad && <Chip value={scouter.ciudad}/>}
            <Chip label={t('scouter.level')} value={scouter.level}/>
            <Chip label="Inf" value={scouter.influencers}/>
            <Chip label="Marcas" value={scouter.brands}/>
            <Chip label="Opps" value={scouter.opportunities}/>
            {scouter.tasksOverdue > 0 && <Chip label="Venc" value={scouter.tasksOverdue} color="#F87171"/>}
            {inactive && <Chip value={t('scouter.daysInactive', { n: scouter.daysInactive })} color="#F87171"/>}
          </div>
        </button>
        {expandedPanel}
      </div>
    )
  }

  return (
    <div style={{ borderRadius: 10, border: cardBorder, background: cardBg, overflow: 'hidden' }}>
      {/* Main row — desktop grid */}
      <button
        onClick={onToggle}
        style={{
          width: '100%', display: 'grid', textAlign: 'left',
          gridTemplateColumns: '2fr 1fr 50px 55px 55px 55px 55px 70px 28px',
          alignItems: 'center', gap: 8,
          padding: '10px 14px',
          background: 'none', border: 'none', cursor: 'pointer',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
            background: avatarColor(personName(scouter)), display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            fontSize: 10, fontWeight: 700, color: 'white',
          }}>
            {initials(personName(scouter))}
          </div>
          <div style={{ minWidth: 0 }}>
            <div
              onClick={e => { e.stopPropagation(); navigate(`/network/scouters/${scouter.userId}`) }}
              style={{ fontSize: 13, fontWeight: 600, color: 'var(--primary-violet-light)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer', textDecoration: 'underline', textDecorationColor: 'rgba(139,92,246,0.3)' }}
            >
              {personName(scouter)}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{scouter.email}</div>
          </div>
        </div>

        <span style={{ fontSize: 11, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {scouter.ciudad}
        </span>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)', textAlign: 'center' }}>
          {t('scouter.level')} {scouter.level}
        </span>
        <span style={{ fontSize: 12, color: 'var(--text-primary)', textAlign: 'center' }}>{num(scouter.influencers)}</span>
        <span style={{ fontSize: 12, color: 'var(--text-primary)', textAlign: 'center' }}>{num(scouter.brands)}</span>
        <span style={{ fontSize: 12, color: 'var(--text-primary)', textAlign: 'center' }}>{num(scouter.opportunities)}</span>
        <span style={{ fontSize: 12, color: scouter.tasksOverdue > 0 ? '#F87171' : 'var(--text-primary)', textAlign: 'center', fontWeight: scouter.tasksOverdue > 0 ? 700 : 400 }}>
          {num(scouter.tasksOverdue)}
        </span>
        <span style={{ fontSize: 11, textAlign: 'center', color: inactive ? '#F87171' : 'var(--text-secondary)', fontWeight: inactive ? 700 : 400 }}>
          {scouter.daysInactive != null ? t('scouter.daysInactive', { n: scouter.daysInactive }) : '—'}
        </span>
        <span style={{ color: 'var(--text-secondary)', display: 'flex', justifyContent: 'center' }}>
          {expanded ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
        </span>
      </button>

      {expandedPanel}
    </div>
  )
}
