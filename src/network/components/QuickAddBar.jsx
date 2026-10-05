// Accesos rápidos del Inicio: + Influencer, + Marca, + Tarea y Buscar,
// y debajo "Agregar por Instagram": se pega el link o el @usuario y se
// abre el alta de influencer con el usuario ya cargado.
import React, { useState } from 'react'
import { Users, Building2, CheckSquare, Search, Instagram, ArrowRight } from 'lucide-react'
import { t } from '../../i18n/index.js'
import { openSearch } from './GlobalSearch.jsx'
import { parseInstagram } from '../utils/instagram.js'

export default function QuickAddBar({ onOpenCreate }) {
  const [ig, setIg] = useState('')
  const [bad, setBad] = useState(false)
  const quick = [
    { key: 'influencer', icon: Users,       color: '#A78BFA', onClick: () => onOpenCreate('influencer') },
    { key: 'brand',      icon: Building2,   color: '#60A5FA', onClick: () => onOpenCreate('brand') },
    { key: 'task',       icon: CheckSquare, color: '#34D399', onClick: () => onOpenCreate('task') },
    { key: 'search',     icon: Search,      color: '#FBBF24', onClick: openSearch, plain: true },
  ]

  const addByInstagram = (e) => {
    e.preventDefault()
    const user = parseInstagram(ig)
    if (!user) { setBad(true); return }
    setBad(false); setIg('')
    onOpenCreate('influencer', { username: user })
  }

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

      <form onSubmit={addByInstagram} style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, padding: '6px 6px 6px 12px', borderRadius: 12, background: 'rgba(225,48,108,0.06)', border: `1px solid ${bad ? 'rgba(248,113,113,0.6)' : 'rgba(225,48,108,0.3)'}` }}>
        <Instagram size={16} color="#E1306C" style={{ flexShrink: 0 }}/>
        <label htmlFor="qa-ig" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>{t('homeX.igAdd.label')}</label>
        <input id="qa-ig" value={ig} onChange={e => { setIg(e.target.value); setBad(false) }} placeholder={t('homeX.igAdd.placeholder')}
          autoCapitalize="none" autoCorrect="off" spellCheck={false}
          style={{ flex: 1, minWidth: 0, padding: '8px 0', background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-primary)', fontSize: 16 }}/>
        <button type="submit" disabled={!ig.trim()} aria-label={t('homeX.igAdd.button')}
          style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '8px 12px', minHeight: 36, borderRadius: 9, border: 'none', fontSize: 12, fontWeight: 700, cursor: ig.trim() ? 'pointer' : 'default', background: ig.trim() ? '#E1306C' : 'rgba(225,48,108,0.25)', color: 'white', flexShrink: 0 }}>
          {t('homeX.igAdd.button')}<ArrowRight size={13}/>
        </button>
      </form>
      {bad && <div role="alert" style={{ fontSize: 11, color: '#F87171', marginTop: 4, paddingLeft: 4 }}>{t('homeX.igAdd.invalid')}</div>}
    </section>
  )
}
