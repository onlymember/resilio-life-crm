import React, { useState, useEffect } from 'react'
import { ChevronRight, User } from 'lucide-react'
import NextAction from './NextAction.jsx'
import ActivityTimeline from './ActivityTimeline.jsx'
import { t } from '../../i18n/index.js'
import { dbGetActivities } from '../../lib/database.js'

export default function ContextRail({ entity, entityType, isOpen, onToggle }) {
  const [activities, setActivities] = useState([])
  const [loading, setLoading]       = useState(false)

  useEffect(() => {
    if (!entity?.id || !isOpen) return
    setLoading(true)
    dbGetActivities(entityType, entity.id, 10)
      .then(setActivities)
      .catch(() => setActivities([]))
      .finally(() => setLoading(false))
  }, [entity?.id, entityType, isOpen])

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        title={t('contextRail.toggle')}
        style={{
          width: 32, alignSelf: 'flex-start', marginTop: 16,
          background: 'rgba(139,92,246,0.08)', border: '1px solid var(--border-violet)',
          borderRadius: 8, padding: '8px 0', color: 'var(--text-secondary)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.2s',
        }}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--primary-violet-light)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
      >
        <ChevronRight size={14}/>
      </button>
    )
  }

  return (
    <aside style={{
      width: 300, flexShrink: 0,
      background: 'var(--bg-secondary)',
      borderLeft: '1px solid var(--border-violet)',
      overflowY: 'auto', padding: '20px 16px',
      display: 'flex', flexDirection: 'column', gap: 20,
    }}>
      {/* Header del rail */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: 1, textTransform: 'uppercase' }}>
          {t('contextRail.title')}
        </span>
        <button
          onClick={onToggle}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-secondary)', fontSize: 11, padding: 0,
          }}
        >
          {t('contextRail.toggle')}
        </button>
      </div>

      {entity ? (
        <>
          {/* Próxima acción */}
          <section>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.8 }}>
              {t('nextAction.label')}
            </div>
            <NextAction
              action={entity.nextAction}
              actionAt={entity.nextActionAt}
            />
          </section>

          {/* Dueño */}
          {entity.ownerScouterId && (
            <section>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                {t('contextRail.owner')}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-primary)' }}>
                <User size={14} color="var(--primary-violet-light)"/>
                <span style={{ fontFamily: 'monospace', fontSize: 10, color: 'var(--text-secondary)' }}>
                  {entity.ownerScouterId.slice(0, 8)}…
                </span>
              </div>
            </section>
          )}

          {/* Actividad reciente */}
          <section>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.8 }}>
              {t('contextRail.recentActivity')}
            </div>
            <ActivityTimeline activities={activities} loading={loading}/>
          </section>
        </>
      ) : (
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', textAlign: 'center', paddingTop: 40 }}>
          Seleccioná un elemento para ver el contexto.
        </div>
      )}
    </aside>
  )
}
