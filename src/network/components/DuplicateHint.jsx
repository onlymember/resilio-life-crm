// Aviso de duplicado mientras se escribe (check_duplicate_v2, 049).
// Si la ficha es tuya o sos Dirección, se puede abrir; si no, solo se
// avisa en qué ciudad está, para no cargarla dos veces.
import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import { t } from '../../i18n/index.js'
import { dbCheckDuplicateLive } from '../../lib/database.js'

export default function DuplicateHint({ type, instagram, email, whatsapp, name, excludeId, onOpen }) {
  const navigate = useNavigate()
  const [hit, setHit] = useState(null)

  const key = [instagram, email, whatsapp, name].map(v => (v || '').trim()).join('|')
  useEffect(() => {
    const ig = (instagram || '').replace('@', '').trim()
    const long = ig.length >= 3 || (email || '').includes('@') || (whatsapp || '').replace(/\D/g, '').length >= 8 || (name || '').trim().length >= 3
    if (!long) { setHit(null); return }
    const id = setTimeout(() => {
      dbCheckDuplicateLive(type, { instagram: ig, email, whatsapp, name, excludeId })
        .then(r => setHit(r?.exists ? r : null)).catch(() => setHit(null))
    }, 450)
    return () => clearTimeout(id)
  }, [key, type, excludeId])

  if (!hit) return null
  const path = hit.id ? `/network/${type === 'brand' ? 'brands' : 'influencers'}/${hit.id}` : null
  return (
    <div role="alert" style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '9px 12px', borderRadius: 10, background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.35)', fontSize: 12, color: '#FBBF24' }}>
      <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }}/>
      <span style={{ flex: 1 }}>
        {hit.name
          ? t('dup.named', { name: hit.name, city: hit.city, field: t(`dup.field.${hit.field}`) })
          : t('dup.hidden', { city: hit.city, field: t(`dup.field.${hit.field}`) })}
        {hit.mine && <> {t('dup.mine')}</>}
      </span>
      {path && (
        <button type="button" onClick={() => { onOpen?.(); navigate(path) }} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#FBBF24', fontWeight: 700, fontSize: 12, textDecoration: 'underline', whiteSpace: 'nowrap' }}>
          {t('dup.open')}
        </button>
      )}
    </div>
  )
}
