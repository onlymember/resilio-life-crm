// Inicio · Fichas para completar (solo Dirección y Admin).
// Influencers sin Instagram, ciudad o WhatsApp, y marcas sin ningún
// contacto. Cada número lleva a la lista ya filtrada.
import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ClipboardList, ChevronRight } from 'lucide-react'
import { t } from '../../i18n/index.js'
import { dbCountIncomplete } from '../../lib/database.js'

export default function IncompleteCard() {
  const navigate = useNavigate()
  const [n, setN] = useState(null)

  useEffect(() => { dbCountIncomplete().then(setN).catch(() => setN(null)) }, [])

  if (!n || (n.influencers + n.brands) === 0) return null
  const total = n.influencers + n.brands
  const row = { display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '9px 0', background: 'none', border: 'none', borderTop: '1px solid var(--border-violet)', cursor: 'pointer', textAlign: 'left', color: 'var(--text-primary)', fontSize: 13 }

  return (
    <section style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8 }}>{t('incomplete.title')}</div>
      <div style={{ padding: '12px 14px 4px', borderRadius: 14, background: 'var(--glass-bg)', border: '1px solid var(--border-violet)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 10 }}>
          <ClipboardList size={18} color="var(--primary-violet-light)"/>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{total === 1 ? t('incomplete.oneAll') : t('incomplete.manyAll', { n: total })}</div>
        </div>
        {n.influencers > 0 && (
          <button style={row} onClick={() => navigate('/network/influencers?incomplete=1')}>
            <span style={{ flex: 1 }}>{t('incomplete.influencers', { n: n.influencers })}</span><ChevronRight size={14} color="var(--text-secondary)"/>
          </button>
        )}
        {n.brands > 0 && (
          <button style={row} onClick={() => navigate('/network/brands?noContact=1')}>
            <span style={{ flex: 1 }}>{t('incomplete.brands', { n: n.brands })}</span><ChevronRight size={14} color="var(--text-secondary)"/>
          </button>
        )}
      </div>
    </section>
  )
}
