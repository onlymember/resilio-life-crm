import React from 'react'
import { Clock } from 'lucide-react'
import { t } from '../../i18n/index.js'

export default function ComingSoon({ labelKey }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: 320, gap: 16, padding: 32,
      textAlign: 'center',
    }}>
      <div style={{
        width: 64, height: 64, borderRadius: 20,
        background: 'rgba(139,92,246,0.12)',
        border: '1px solid rgba(139,92,246,0.25)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Clock size={28} color="var(--primary-violet-light)"/>
      </div>
      <div>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
          {t('comingSoon.title')}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 280 }}>
          {labelKey ? t(labelKey) : t('comingSoon.subtitle')}
        </div>
      </div>
    </div>
  )
}
