// Respuesta rápida: "Respondió", "Pidió info", "No le interesa".
// Usa el motor de seguimientos (advance_follow_up, migración 042): mueve
// la etapa un escalón, deja la actividad y agenda el próximo paso solo.
import React, { useState } from 'react'
import { CheckCircle2, Info, XCircle } from 'lucide-react'
import { t } from '../../i18n/index.js'
import { dbAdvanceFollowUp } from '../../lib/database.js'
import { toast } from './Toaster.jsx'

const OPTIONS = [
  { id: 'answered',       icon: CheckCircle2, color: '#34D399', outcome: 'answered' },
  { id: 'info',           icon: Info,         color: '#60A5FA', outcome: 'answered' },
  { id: 'not_interested', icon: XCircle,      color: '#F87171', outcome: 'not_interested' },
]

export default function QuickReply({ entityType, entityId, onDone, compact = false }) {
  const [busy, setBusy] = useState(null)

  const run = async (e, o) => {
    e.preventDefault(); e.stopPropagation()
    if (busy) return
    setBusy(o.id)
    try {
      const res = await dbAdvanceFollowUp(entityType, entityId, {
        outcome: o.outcome,
        note: o.id === 'info' ? t('quickReply.infoNote') : null,
      })
      onDone?.({
        relationshipStatus: res.relationship_status,
        nextAction: res.closed ? null : res.next_action,
        nextActionAt: res.closed ? null : res.next_action_at,
        lastContactAt: new Date().toISOString(),
      })
      toast(t(`quickReply.done.${o.id}`))
    } catch (err) { toast(err.message) }
    finally { setBusy(null) }
  }

  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: compact ? 'nowrap' : 'wrap', overflowX: compact ? 'auto' : undefined, scrollbarWidth: 'none' }} onClick={e => e.stopPropagation()}>
      {OPTIONS.map(o => (
        <button key={o.id} onClick={(e) => run(e, o)} disabled={!!busy} title={t(`quickReply.${o.id}`)} style={{
          display: 'flex', alignItems: 'center', gap: 4, padding: compact ? '4px 8px' : '5px 10px', borderRadius: 8, flexShrink: 0,
          fontSize: 11, fontWeight: 600, cursor: busy ? 'default' : 'pointer', whiteSpace: 'nowrap',
          background: `${o.color}12`, color: o.color, border: `1px solid ${o.color}30`, opacity: busy && busy !== o.id ? 0.5 : 1,
        }}>
          <o.icon size={11}/>{t(`quickReply.${o.id}`)}
        </button>
      ))}
    </div>
  )
}
