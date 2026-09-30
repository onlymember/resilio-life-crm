// Completar en tanda: debajo de cada tarjeta de "Sin WhatsApp" / "Sin
// categoría" aparece el campo que falta. Enter o "Guardar" y la ficha
// sale de la lista, así se avanza de una a la siguiente sin abrir nada.
import React, { useState } from 'react'
import { Check } from 'lucide-react'
import { t } from '../../i18n/index.js'
import { dbPatchInfluencer, dbPatchBrand } from '../../lib/database.js'

const input = { flex: 1, minWidth: 0, padding: '7px 10px', borderRadius: 8, background: 'rgba(139,92,246,0.07)', border: '1px solid var(--border-violet)', color: 'var(--text-primary)', fontSize: 14, outline: 'none' }

export default function QuickFill({ entityType, entity, field, categories = [], onDone }) {
  const [v, setV] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  const save = async () => {
    const val = v.trim()
    if (!val || busy) return
    setBusy(true); setErr(null)
    const patch = field === 'whatsapp' ? { whatsapp: val }
      : entityType === 'brand' ? { categoryId: val } : { category: val }
    try {
      await (entityType === 'brand' ? dbPatchBrand : dbPatchInfluencer)(entity.id, patch)
      onDone(patch)
    } catch (e) { setErr(e.message) }
    finally { setBusy(false) }
  }

  return (
    <div style={{ padding: '0 16px 12px', display: 'flex', flexDirection: 'column', gap: 4 }} onClick={e => e.stopPropagation()}>
      <div style={{ display: 'flex', gap: 6 }}>
        {field === 'whatsapp' ? (
          <input type="tel" inputMode="tel" value={v} onChange={e => setV(e.target.value)} placeholder={t('quickFill.whatsapp')}
            onKeyDown={e => e.key === 'Enter' && save()} style={input} aria-label={t('quickFill.whatsapp')}/>
        ) : (
          <select value={v} onChange={e => setV(e.target.value)} style={input} aria-label={t('quickFill.category')}>
            <option value="">{t('quickFill.category')}</option>
            {categories.map(c => typeof c === 'string'
              ? <option key={c} value={c}>{c}</option>
              : <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}
        <button onClick={save} disabled={!v.trim() || busy} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '0 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: 'none', background: v.trim() ? 'var(--primary-violet)' : 'rgba(139,92,246,0.2)', color: 'white' }}>
          <Check size={13}/>{t('quickFill.save')}
        </button>
      </div>
      {err && <div style={{ fontSize: 11, color: '#F87171' }}>{err}</div>}
    </div>
  )
}
