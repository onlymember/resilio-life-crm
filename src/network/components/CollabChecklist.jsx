// Checklist de la colaboración: cinco pasos que se marcan con un toque
// y se guardan al instante (columna collaborations.checklist, 049).
import React, { useState } from 'react'
import { Check } from 'lucide-react'
import { t } from '../../i18n/index.js'
import { dbSetCollabChecklist } from '../../lib/database.js'
import { toast } from './Toaster.jsx'

export const CHECK_STEPS = ['confirmed', 'visited', 'content', 'link', 'brand_notified']
export const checklistDone = (c = {}) => CHECK_STEPS.filter(k => c?.[k]).length

export default function CollabChecklist({ collabId, value = {}, onChange }) {
  const [busy, setBusy] = useState(null)
  const done = checklistDone(value)

  const toggle = async (k) => {
    if (busy) return
    const next = { ...value, [k]: !value[k] }
    setBusy(k); onChange?.(next)
    try { await dbSetCollabChecklist(collabId, next) }
    catch (e) { onChange?.(value); toast(e.message) }
    finally { setBusy(null) }
  }

  return (
    <div>
      <div style={{ height: 6, borderRadius: 3, background: 'rgba(139,92,246,0.12)', marginBottom: 10 }}>
        <div style={{ height: '100%', width: `${(done / CHECK_STEPS.length) * 100}%`, borderRadius: 3, background: done === CHECK_STEPS.length ? '#34D399' : 'var(--primary-violet)', transition: 'width 0.3s' }}/>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {CHECK_STEPS.map(k => {
          const on = !!value[k]
          return (
            <button key={k} onClick={() => toggle(k)} disabled={busy === k} aria-pressed={on} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 10, cursor: 'pointer', textAlign: 'left',
              background: on ? 'rgba(52,211,153,0.08)' : 'rgba(139,92,246,0.04)', border: `1px solid ${on ? 'rgba(52,211,153,0.35)' : 'var(--border-violet)'}`,
            }}>
              <span style={{ width: 20, height: 20, borderRadius: 6, flexShrink: 0, display: 'grid', placeItems: 'center',
                background: on ? '#34D399' : 'transparent', border: on ? 'none' : '1.5px solid var(--text-secondary)' }}>
                {on && <Check size={13} color="#062b14" strokeWidth={3}/>}
              </span>
              <span style={{ fontSize: 13, fontWeight: 600, color: on ? 'var(--text-primary)' : 'var(--text-secondary)', textDecoration: on ? 'none' : 'none' }}>{t(`checklist.${k}`)}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
