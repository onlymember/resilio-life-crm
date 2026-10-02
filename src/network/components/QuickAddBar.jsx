// Accesos rápidos del Inicio: + Influencer, + Marca, + Tarea y Buscar.
// (El alta por link de Instagram se sacó a pedido: el alta completa se
// hace desde "+ Influencer". parseInstagram queda en utils/instagram.js.)
import React from 'react'
import { Users, Building2, CheckSquare, Search } from 'lucide-react'
import { t } from '../../i18n/index.js'
import { openSearch } from './GlobalSearch.jsx'

export default function QuickAddBar({ onOpenCreate }) {
  const quick = [
    { key: 'influencer', icon: Users,       color: '#A78BFA', onClick: () => onOpenCreate('influencer') },
    { key: 'brand',      icon: Building2,   color: '#60A5FA', onClick: () => onOpenCreate('brand') },
    { key: 'task',       icon: CheckSquare, color: '#34D399', onClick: () => onOpenCreate('task') },
    { key: 'search',     icon: Search,      color: '#FBBF24', onClick: openSearch, plain: true },
  ]

  return (
    <section style={{ marginBottom: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
        {quick.map(q => (
          <button key={q.key} onClick={q.onClick}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '10px 4px', borderRadius: 12, background: `${q.color}10`, border: `1px solid ${q.color}35`, color: q.color, fontSize: 11, fontWeight: 700, cursor: 'pointer', minWidth: 0 }}>
            <q.icon size={16}/>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
              {q.plain ? '' : '+ '}{t(`homeX.quick.${q.key}`)}
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}
