// Traspaso con contexto: cuando una ficha te llega reasignada, arriba de
// todo ves quién te la pasó, el motivo que dejó y lo último que pasó con
// esa persona o marca. Se puede cerrar y no vuelve a aparecer.
import React, { useEffect, useState } from 'react'
import { ArrowRightLeft, X } from 'lucide-react'
import { t } from '../../i18n/index.js'
import { dbGetLastHandoffToMe, dbGetPeopleNames } from '../../lib/database.js'

const MAX_DAYS = 21
const seenKey = (id) => `nw.handoff.${id}`

export default function HandoffCard({ entityType, entityId, activities = [] }) {
  const [h, setH] = useState(null)
  const [from, setFrom] = useState('')

  useEffect(() => {
    let off = false
    dbGetLastHandoffToMe(entityType, entityId).then(async r => {
      if (off || !r) return
      if (Date.now() - new Date(r.assignedAt).getTime() > MAX_DAYS * 86400000) return
      try { if (localStorage.getItem(seenKey(r.id))) return } catch { /* sin storage: se muestra */ }
      setH(r)
      if (r.fromOwnerId) {
        const m = await dbGetPeopleNames([r.fromOwnerId]).catch(() => ({}))
        if (!off) setFrom(m[r.fromOwnerId] || '')
      }
    }).catch(() => {})
    return () => { off = true }
  }, [entityType, entityId])

  if (!h) return null
  const dismiss = () => { try { localStorage.setItem(seenKey(h.id), '1') } catch { /* ok */ } setH(null) }
  const recent = activities.filter(a => a.type !== 'reassigned' && (a.title || a.description)).slice(0, 3)
  const date = new Date(h.assignedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })

  return (
    <div style={{ background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.3)', borderRadius: 14, padding: 14, marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <ArrowRightLeft size={15} color="#60A5FA" style={{ marginTop: 1, flexShrink: 0 }}/>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
            {from ? t('handoff.fromName', { name: from, date }) : t('handoff.from', { date })}
          </div>
          {h.reason && <div style={{ fontSize: 12, color: 'var(--text-primary)', marginTop: 4, whiteSpace: 'pre-wrap' }}>“{h.reason}”</div>}
          {recent.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>{t('handoff.latest')}</div>
              {recent.map(a => (
                <div key={a.id} style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  · {a.title || t(`activityTypes.${a.type}`)}{a.description ? ` — ${a.description}` : ''}
                  <span style={{ opacity: 0.7 }}> ({new Date(a.occurredAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })})</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <button onClick={dismiss} aria-label={t('handoff.dismiss')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 2 }}><X size={15}/></button>
      </div>
    </div>
  )
}
