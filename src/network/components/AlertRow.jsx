import React from 'react'
import { AlertTriangle, AlertCircle, UserX, Clock, TrendingDown, Users } from 'lucide-react'
import { t } from '../../i18n/index.js'
import { useNavigate } from 'react-router-dom'

const SEVERITY_COLOR = {
  alta:  '#F87171',
  media: '#FBBF24',
}

const TYPE_ICON = {
  unassigned:          UserX,
  scouter_inactive:    Users,
  task_overdue:        Clock,
  action_overdue:      Clock,
  brand_stale:         AlertCircle,
  opportunity_stalled: TrendingDown,
  goal_behind:         TrendingDown,
}

const ACTION_LABEL = {
  unassigned:          'command.alerts.assign',
  scouter_inactive:    'command.alerts.goTo',
  task_overdue:        'command.alerts.goTo',
  action_overdue:      'command.alerts.reschedule',
  brand_stale:         'command.alerts.goTo',
  opportunity_stalled: 'command.alerts.goTo',
  goal_behind:         'command.alerts.goTo',
}

// entity_type → navigate path
const navPath = (entityType, entityId) => {
  const map = {
    influencer:  `/network/influencers/${entityId}`,
    brand:       `/network/brands/${entityId}`,
    opportunity: `/network/opportunities/${entityId}`,
    scouter:     `/network/scouters`,
    task:        `/network/tasks`,
    goal:        `/network/command`,
  }
  return map[entityType] || '/network/command'
}

export default function AlertRow({ alert, onAssign }) {
  const navigate = useNavigate()
  const { severidad, tipo, titulo, entity_type, entity_id } = alert
  const color = SEVERITY_COLOR[severidad] || SEVERITY_COLOR.media
  const Icon  = TYPE_ICON[tipo] || AlertTriangle
  const actionLabel = t(ACTION_LABEL[tipo] || 'command.alerts.goTo')

  const handleAction = () => {
    if (tipo === 'unassigned' && onAssign) {
      onAssign({ id: entity_id, name: titulo, cityId: null, entityType: entity_type })
    } else {
      navigate(navPath(entity_type, entity_id))
    }
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 14px',
      background: `${color}08`,
      border: `1px solid ${color}30`,
      borderRadius: 10,
    }}>
      <Icon size={15} style={{ color, flexShrink: 0 }}/>

      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: 12, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', whiteSpace: 'nowrap' }}>
          {titulo}
        </span>
        <span style={{ fontSize: 10, color, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {t(`command.alerts.types.${tipo}`) || tipo}
        </span>
      </div>

      <button
        onClick={handleAction}
        style={{
          flexShrink: 0, padding: '4px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700,
          background: `${color}18`, color, border: `1px solid ${color}40`, cursor: 'pointer',
        }}
      >
        {actionLabel}
      </button>
    </div>
  )
}
