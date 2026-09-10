import React from 'react'
import { BarChart3 } from 'lucide-react'
import EmptyState from '../components/EmptyState.jsx'
import { t } from '../../i18n/index.js'

export default function CommandPage() {
  return (
    <div style={{ padding:'20px' }}>
      <div style={{ marginBottom:20 }}>
        <h1 style={{ fontSize:18, fontWeight:700, color:'var(--text-primary)', marginBottom:2 }}>{t('pages.command.title')}</h1>
        <p style={{ fontSize:12, color:'var(--text-secondary)' }}>{t('pages.command.subtitle')}</p>
      </div>
      <EmptyState
        icon={BarChart3}
        title={t('empty.comingSoon2C')}
        subtitle={t('pages.command.comingSoonSubtitle')}
      />
    </div>
  )
}
