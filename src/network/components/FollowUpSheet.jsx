import React, { useState } from 'react'
import { X, MessageCircle, EyeOff, Ban, Check } from 'lucide-react'
import { t } from '../../i18n/index.js'
import { dbAdvanceFollowUp } from '../../lib/database.js'

// Completar un seguimiento sin decir cuándo volver deja la ficha sin
// próxima acción, o sea invisible para siempre. Este panel convierte
// ese momento en una sola pregunta —¿qué pasó?— y deriva la fecha de
// la cadencia (ver supabase/042_cadencia.sql).
//
// Se pregunta por el RESULTADO y no por la fecha a propósito. "¿Volvés
// en 3 o en 5 días?" es una decisión que nadie quiere tomar cuarenta
// veces por día, y que el sistema puede tomar mejor: sabe en qué estado
// está la relación. "¿Te contestó?" sí lo sabe solo la persona.
const OPCIONES = [
  { outcome: 'answered',       icon: MessageCircle, color: '#34D399', key: 'answered'      },
  { outcome: 'no_answer',      icon: EyeOff,        color: '#FBBF24', key: 'noAnswer'      },
  { outcome: 'not_interested', icon: Ban,           color: '#F87171', key: 'notInterested' },
  { outcome: null, days: -1,   icon: Check,         color: '#A78BFA', key: 'doneNoFollow'  },
]

export default function FollowUpSheet({ item, onClose, onDone }) {
  const [saving, setSaving] = useState(null)   // la key que se está guardando
  const [error,  setError]  = useState(null)

  if (!item) return null

  const pick = async (op) => {
    setSaving(op.key)
    setError(null)
    try {
      const res = await dbAdvanceFollowUp(item.entityType, item.entityId, {
        days:    op.days ?? null,
        outcome: op.outcome,
      })
      onDone?.(item, res)
      onClose()
    } catch (e) {
      setError(e.message)
      setSaving(null)
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 400,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 420, margin: 12,
          borderRadius: 18, padding: 16,
          background: 'var(--bg-secondary, #16131f)',
          border: '1px solid var(--border-violet)',
          animation: 'slideUp var(--dur-base, 0.25s) ease both',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 4 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {item.subtitle || item.title}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
              {t('followUp.question')}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 2 }}>
            <X size={17}/>
          </button>
        </div>

        {error && (
          <div style={{ fontSize: 12, color: '#F87171', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: 8, padding: '7px 10px', margin: '10px 0 0' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 12 }}>
          {OPCIONES.map(op => {
            const Icon = op.icon
            const busy = saving === op.key
            return (
              <button
                key={op.key}
                onClick={() => pick(op)}
                disabled={!!saving}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left',
                  padding: '11px 13px', borderRadius: 11, cursor: saving ? 'default' : 'pointer',
                  background: busy ? `${op.color}22` : `${op.color}0D`,
                  border: `1px solid ${op.color}40`,
                  opacity: saving && !busy ? 0.4 : 1,
                }}
              >
                <Icon size={16} color={op.color} style={{ flexShrink: 0 }}/>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                    {t(`followUp.${op.key}`)}
                  </span>
                  <span style={{ display: 'block', fontSize: 11, color: 'var(--text-secondary)', marginTop: 1 }}>
                    {t(`followUp.${op.key}Hint`)}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
