import React from 'react'
import {
  MessageSquare, Phone, Mail, Users, ArrowRight,
  FileText, CreditCard, Star, Edit3,
} from 'lucide-react'
import { t } from '../../i18n/index.js'

const TYPE_ICON = {
  dm:          { icon: MessageSquare, color: '#8B5CF6' },
  whatsapp:    { icon: MessageSquare, color: '#34D399' },
  call:        { icon: Phone,         color: '#60A5FA' },
  meeting:     { icon: Users,         color: '#FBBF24' },
  email:       { icon: Mail,          color: '#A78BFA' },
  follow_up:   { icon: ArrowRight,    color: '#FB923C' },
  proposal:    { icon: FileText,      color: '#22D3EE' },
  contract:    { icon: FileText,      color: '#4ADE80' },
  payment:     { icon: CreditCard,    color: '#FCD34D' },
  note:        { icon: Edit3,         color: '#9CA3AF' },
  created:     { icon: Star,          color: '#8B5CF6' },
  updated:     { icon: Edit3,         color: '#9CA3AF' },
}

const timeAgo = (iso) => {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'ahora'
  if (m < 60) return `hace ${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `hace ${h}h`
  const d = Math.floor(h / 24)
  return `hace ${d}d`
}

export default function ActivityTimeline({ activities = [], loading = false }) {
  if (loading) {
    return (
      <div style={{ padding: '12px 0' }}>
        {[0,1,2].map(i => (
          <div key={i} style={{
            display: 'flex', gap: 10, padding: '8px 0',
            borderBottom: '1px solid rgba(139,92,246,0.08)',
          }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(139,92,246,0.1)', flexShrink: 0 }}/>
            <div style={{ flex: 1 }}>
              <div style={{ height: 11, background: 'rgba(139,92,246,0.08)', borderRadius: 4, marginBottom: 5, width: '70%' }}/>
              <div style={{ height: 9, background: 'rgba(139,92,246,0.06)', borderRadius: 4, width: '40%' }}/>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (!activities.length) {
    return (
      <div style={{ padding: '16px 0', fontSize: 12, color: 'var(--text-secondary)', textAlign: 'center' }}>
        {t('contextRail.noActivity')}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {activities.map((a, i) => {
        const cfg = TYPE_ICON[a.type] || TYPE_ICON.note
        const Icon = cfg.icon
        return (
          <div key={a.id || i} style={{
            display: 'flex', gap: 10, padding: '8px 0',
            borderBottom: i < activities.length - 1 ? '1px solid rgba(139,92,246,0.08)' : 'none',
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
              background: `${cfg.color}1A`, border: `1px solid ${cfg.color}33`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon size={12} color={cfg.color}/>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.4,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {a.title || t(`activityTypes.${a.type}`) || a.type}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 2 }}>
                {timeAgo(a.occurredAt || a.createdAt)}
                {a.description && (
                  <span style={{ marginLeft: 6 }}>· {a.description}</span>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
