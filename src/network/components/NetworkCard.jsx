import React from 'react'
import { MapPin, Clock } from 'lucide-react'
import RelationshipBadge from './RelationshipBadge.jsx'
import { t } from '../../i18n/index.js'

const timeAgo = (iso) => {
  if (!iso) return null
  const diff = Date.now() - new Date(iso).getTime()
  const d = Math.floor(diff / 86400000)
  if (d < 1)  return 'hoy'
  if (d < 7)  return `hace ${d}d`
  if (d < 30) return `hace ${Math.floor(d/7)}s`
  return `hace ${Math.floor(d/30)}m`
}

const initials = (name = '') => {
  const parts = name.trim().split(' ')
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase() || '?'
}

const AVATAR_COLORS = ['#8B5CF6','#EC4899','#06B6D4','#10B981','#F59E0B','#EF4444','#6366F1']
const avatarColor = (name = '') =>
  AVATAR_COLORS[(name.charCodeAt(0) || 0) % AVATAR_COLORS.length]

export default function NetworkCard({ entity, entityType = 'influencer', cityName, onClick }) {
  const name      = entity.name || entity.username || '—'
  const username  = entityType === 'influencer' ? entity.username : null
  const image     = entity.profileImage || entity.logo || null
  const relStatus = entity.relationshipStatus || 'cold'
  const lastCont  = timeAgo(entity.lastContactAt)
  const nextAct   = entity.nextAction
  const overdue   = entity.nextActionAt && new Date(entity.nextActionAt) < new Date()

  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', textAlign: 'left',
        background: 'var(--glass-bg)', backdropFilter: 'blur(20px)',
        border: '1px solid var(--border-violet)',
        borderRadius: 14, padding: '14px 16px',
        cursor: 'pointer', transition: 'all 0.2s',
        display: 'flex', alignItems: 'center', gap: 12,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.border = '1px solid rgba(139,92,246,0.5)'
        e.currentTarget.style.boxShadow = '0 4px 20px rgba(139,92,246,0.15)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.border = '1px solid var(--border-violet)'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      {/* Avatar */}
      <div style={{
        width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
        background: image ? 'transparent' : avatarColor(name),
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
        border: '2px solid rgba(255,255,255,0.1)',
        fontSize: 14, fontWeight: 700, color: 'white',
      }}>
        {image
          ? <img src={image} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
          : initials(name)
        }
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
          <span style={{
            fontSize: 14, fontWeight: 600, color: 'var(--text-primary)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {name}
          </span>
          <RelationshipBadge status={relStatus}/>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {username && (
            <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>@{username}</span>
          )}
          {entity.category && (
            <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{entity.category}</span>
          )}
          {cityName && (
            <span style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 3 }}>
              <MapPin size={10}/>{cityName}
            </span>
          )}
        </div>

        {/* Next action / last contact row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 5 }}>
          {nextAct && (
            <span style={{
              fontSize: 11, color: overdue ? '#F87171' : 'var(--text-secondary)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
            }}>
              {overdue ? `⚡ ${nextAct}` : `→ ${nextAct}`}
            </span>
          )}
          {lastCont && (
            <span style={{ fontSize: 10, color: 'var(--text-secondary)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 3 }}>
              <Clock size={9}/>{lastCont}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}
