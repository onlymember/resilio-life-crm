import React from 'react'
import { MapPin, Clock, MoreVertical } from 'lucide-react'
import RelationshipBadge from './RelationshipBadge.jsx'
import QuickActions from './QuickActions.jsx'
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

const CAN_HOVER = window.matchMedia('(hover: hover)').matches

// Per-session debounce: 2s cooldown per entity+contactType
const _lastContact = new Map()

export default function NetworkCard({
  entity, entityType = 'influencer', cityName, onClick,
  onContact, canReassign = false, onReassign,
}) {
  const name      = entity.name || entity.username || '—'
  const username  = entityType === 'influencer' ? entity.username : null
  const image     = entity.profileImage || entity.logo || null
  const relStatus = entity.relationshipStatus || 'cold'
  const lastCont  = timeAgo(entity.lastContactAt)
  const nextAct   = entity.nextAction
  const overdue   = entity.nextActionAt && new Date(entity.nextActionAt) < new Date()

  const handleContact = (contactLabel) => {
    const key = `${entity.id}:${contactLabel}`
    const now = Date.now()
    if (now - (_lastContact.get(key) || 0) < 2000) return
    _lastContact.set(key, now)
    if (onContact) onContact(entity, contactLabel)
  }

  const handleReassign = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (onReassign) onReassign(entity)
  }

  const hasQuickActions = entity.whatsapp || entity.instagram || entity.phone

  return (
    <div style={{
      position: 'relative',
      background: 'var(--glass-bg)', backdropFilter: 'blur(20px)',
      border: '1px solid var(--border-violet)',
      borderRadius: 14, overflow: 'hidden',
      transition: 'border-color 0.2s, box-shadow 0.2s, transform 0.2s',
    }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'rgba(139,92,246,0.5)'
        e.currentTarget.style.boxShadow   = '0 4px 20px rgba(139,92,246,0.15)'
        if (CAN_HOVER) e.currentTarget.style.transform = 'translateY(-2px)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--border-violet)'
        e.currentTarget.style.boxShadow   = 'none'
        if (CAN_HOVER) e.currentTarget.style.transform = ''
      }}
    >
      {/* Navigation zone — single <button>, no <a> children */}
      <button
        onClick={onClick}
        style={{
          width: '100%', textAlign: 'left', background: 'none', border: 'none',
          cursor: 'pointer', padding: '14px 16px',
          display: 'flex', alignItems: 'flex-start', gap: 12,
        }}
      >
        {/* Avatar */}
        <div style={{
          width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
          background: image ? 'transparent' : avatarColor(name),
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden', border: '2px solid rgba(255,255,255,0.1)',
          fontSize: 14, fontWeight: 700, color: 'white', marginTop: 1,
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

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {username && (
              <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>@{username}</span>
            )}
            {entity.category && (
              <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{entity.category}</span>
            )}
            {entityType === 'influencer' && entity.tier && (
              <span style={{ fontSize: 10, color: 'var(--primary-violet-light)', background: 'rgba(139,92,246,0.1)', padding: '1px 6px', borderRadius: 8, fontWeight: 600 }}>
                {entity.tier}
              </span>
            )}
            {entityType === 'influencer' && entity.followers > 0 && (
              <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                {entity.followers >= 1000000
                  ? `${(entity.followers / 1000000).toFixed(1)}M`
                  : entity.followers >= 1000
                    ? `${Math.round(entity.followers / 1000)}K`
                    : entity.followers}
              </span>
            )}
            {cityName && (
              <span style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 3 }}>
                <MapPin size={10}/>{cityName}
              </span>
            )}
          </div>

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

        {/* 3-dot menu for reassignment — stopPropagation handled inside */}
        {canReassign && (
          <div
            onClick={handleReassign}
            role="button"
            tabIndex={0}
            onKeyDown={e => e.key === 'Enter' && handleReassign(e)}
            style={{
              flexShrink: 0, width: 28, height: 28, borderRadius: 8, marginTop: 6,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-secondary)', cursor: 'pointer',
              background: 'rgba(255,255,255,0.04)',
            }}
          >
            <MoreVertical size={14}/>
          </div>
        )}
      </button>

      {/* QuickActions — outside <button>, so <a> tags are valid HTML */}
      {hasQuickActions && (
        <div style={{ paddingLeft: 72, paddingRight: 16, paddingBottom: 12 }}>
          <QuickActions
            whatsapp={entity.whatsapp}
            instagram={entity.instagram}
            phone={entity.phone}
            onContact={onContact ? handleContact : undefined}
          />
        </div>
      )}
    </div>
  )
}
