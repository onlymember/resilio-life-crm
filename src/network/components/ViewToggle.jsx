import React from 'react'
import { List, Columns3 } from 'lucide-react'
import { t } from '../../i18n/index.js'

// Lista / Kanban (Influencers y Marcas).
export default function ViewToggle({ view, onChange }) {
  const b = (on) => ({ display:'flex', alignItems:'center', justifyContent:'center', width:34, height:32, cursor:'pointer', border:'none',
    background: on ? 'rgba(139,92,246,0.25)' : 'transparent', color: on ? 'var(--primary-violet-light)' : 'var(--text-secondary)' })
  return (
    <div role="group" aria-label={t('board.toggle')} style={{ display:'flex', borderRadius:10, overflow:'hidden', border:'1px solid var(--border-violet)', background:'rgba(139,92,246,0.05)' }}>
      <button onClick={() => onChange('list')}  aria-pressed={view === 'list'}  title={t('board.list')}  style={b(view === 'list')}><List size={15}/></button>
      <button onClick={() => onChange('board')} aria-pressed={view === 'board'} title={t('board.board')} style={b(view === 'board')}><Columns3 size={15}/></button>
    </div>
  )
}
