import React from 'react'
import { Home } from 'lucide-react'
import EmptyState from '../components/EmptyState.jsx'
import { t } from '../../i18n/index.js'

export default function HomePage({ onOpenCreate }) {
  return (
    <div style={{ padding: '24px 20px' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{t('pages.home.title')}</h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{t('pages.home.subtitle')}</p>
      </div>
      <EmptyState
        icon={Home}
        title={t('empty.comingSoon2C')}
        subtitle={t('pages.home.comingSoonSubtitle')}
        actionLabel={`+ ${t('create.influencer.label')}`}
        onAction={onOpenCreate}
      />
    </div>
  )
}
