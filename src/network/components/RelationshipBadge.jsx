import React from 'react'
import { t } from '../../i18n/index.js'

const STATUS_STYLES = {
  cold:     { bg: 'rgba(96,165,250,0.15)',  text: '#60A5FA', border: 'rgba(96,165,250,0.3)',  dot: '#60A5FA' },
  warm:     { bg: 'rgba(251,191,36,0.15)',  text: '#FBBF24', border: 'rgba(251,191,36,0.3)',  dot: '#FBBF24' },
  strong:   { bg: 'rgba(52,211,153,0.15)',  text: '#34D399', border: 'rgba(52,211,153,0.3)',  dot: '#34D399' },
  inactive: { bg: 'rgba(156,163,175,0.12)', text: '#9CA3AF', border: 'rgba(156,163,175,0.25)', dot: '#9CA3AF' },
}

export default function RelationshipBadge({ status, size = 'sm' }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.cold
  const isLg = size === 'lg'
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: isLg ? 6 : 4,
      padding: isLg ? '4px 10px' : '2px 7px',
      borderRadius: 20,
      background: s.bg,
      border: `1px solid ${s.border}`,
      fontSize: isLg ? 11 : 9,
      fontWeight: 700,
      color: s.text,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      flexShrink: 0,
    }}>
      <span style={{
        width: isLg ? 7 : 5, height: isLg ? 7 : 5,
        borderRadius: '50%', background: s.dot, flexShrink: 0,
        boxShadow: `0 0 4px ${s.dot}`,
      }}/>
      {t(`relationship.${status || 'cold'}`)}
    </span>
  )
}
