import React from 'react'
import { MapPin, ChevronLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import RelationshipBadge from './RelationshipBadge.jsx'

const AVATAR_COLORS = ['#8B5CF6','#EC4899','#06B6D4','#10B981','#F59E0B','#EF4444','#6366F1']
const avatarColor = (name = '') =>
  AVATAR_COLORS[(name.charCodeAt(0) || 0) % AVATAR_COLORS.length]
const initials = (name = '') => {
  const p = name.trim().split(' ')
  return p.length >= 2 ? (p[0][0] + p[p.length-1][0]).toUpperCase() : name.slice(0,2).toUpperCase() || '?'
}

export default function EntityHeader({ entity, entityType, cityName, backPath, actions }) {
  const navigate = useNavigate()
  if (!entity) return null

  const name  = entity.name || entity.username || '—'
  const image = entity.profileImage || entity.logo || null
  const sub   = entityType === 'influencer'
    ? (entity.username ? `@${entity.username}` : null)
    : entity.category

  return (
    <div style={{
      background: 'var(--glass-bg)', backdropFilter: 'blur(40px)',
      borderBottom: '1px solid var(--border-violet)',
      padding: '16px 20px',
    }}>
      {backPath && (
        <button
          onClick={() => navigate(backPath)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            color: 'var(--text-secondary)', fontSize: 12, marginBottom: 14,
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
          }}
        >
          <ChevronLeft size={14}/> Volver
        </button>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{
          width: 56, height: 56, borderRadius: 18, flexShrink: 0,
          background: image ? 'transparent' : avatarColor(name),
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden', border: '2px solid rgba(255,255,255,0.1)',
          fontSize: 18, fontWeight: 700, color: 'white',
        }}>
          {image
            ? <img src={image} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
            : initials(name)
          }
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{name}</span>
            <RelationshipBadge status={entity.relationshipStatus || 'cold'} size="lg"/>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            {sub && <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{sub}</span>}
            {cityName && (
              <span style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <MapPin size={12}/>{cityName}
              </span>
            )}
            {entity.category && entityType !== 'influencer' && (
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{entity.category}</span>
            )}
          </div>
        </div>

        {actions && <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>{actions}</div>}
      </div>
    </div>
  )
}
