import React from 'react'
import { CheckCircle } from 'lucide-react'
import EmptyState from '../components/EmptyState.jsx'
import { t } from '../../i18n/index.js'

export default function CollaborationsPage({ onOpenCreate }) {
  return (
    <div style={{ padding:'20px' }}>
      <div style={{ marginBottom:20 }}>
        <h1 style={{ fontSize:18, fontWeight:700, color:'var(--text-primary)', marginBottom:2 }}>{t('pages.collaborations.title')}</h1>
        <p style={{ fontSize:12, color:'var(--text-secondary)' }}>{t('pages.collaborations.subtitle')}</p>
      </div>
      <EmptyState
        icon={CheckCircle}
        title={t('empty.noCollaborations')}
        subtitle="El listado de colaboraciones llega en la Fase 2E"
        actionLabel={`+ ${t('create.collaboration')}`}
        onAction={onOpenCreate}
      />
    </div>
  )
}
