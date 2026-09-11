import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Briefcase } from 'lucide-react'
import EmptyState from '../components/EmptyState.jsx'
import { t } from '../../i18n/index.js'
import { dbGetOpportunities, dbPatchOpportunity } from '../../lib/database.js'
import { useNavigate } from 'react-router-dom'

const STATUSES = ['new','qualifying','contacted','in_conversation','proposal','won','lost','on_hold']

const STATUS_COLOR = {
  new:             '#9CA3AF',
  qualifying:      '#60A5FA',
  contacted:       '#A78BFA',
  in_conversation: '#FBBF24',
  proposal:        '#22D3EE',
  won:             '#4ADE80',
  lost:            '#F87171',
  on_hold:         '#6B7280',
}

const fmtMoney = (n) => {
  if (!n) return null
  return n >= 1000000 ? `$${(n/1000000).toFixed(1)}M` : n >= 1000 ? `$${(n/1000).toFixed(0)}K` : `$${n}`
}

const useIsDesktop = () => {
  const [d, setD] = useState(window.innerWidth >= 640)
  useEffect(() => {
    const h = () => setD(window.innerWidth >= 640)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])
  return d
}

// ── Kanban card (desktop) ──────────────────────────────────
function KanbanCard({ opp, onDragStart, onClick }) {
  const overdue = opp.nextActionAt && new Date(opp.nextActionAt) < new Date()
  return (
    <div
      draggable
      onDragStart={() => onDragStart(opp.id, opp.status)}
      onClick={onClick}
      style={{
        background: 'var(--glass-bg)', border: '1px solid var(--border-violet)',
        borderRadius: 10, padding: '10px 12px', cursor: 'grab', marginBottom: 6,
        transition: 'border-color 0.15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(139,92,246,0.4)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-violet)' }}
    >
      <div style={{ fontSize:12, fontWeight:700, color:'var(--text-primary)', lineHeight:1.3, marginBottom:4, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
        {opp.title}
      </div>
      {opp.value && (
        <div style={{ fontSize:11, color:'var(--primary-violet-light)', fontWeight:600, marginBottom:2 }}>
          {fmtMoney(opp.value)}
        </div>
      )}
      {opp.nextAction && (
        <div style={{ fontSize:10, color: overdue ? '#F87171' : 'var(--text-secondary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          {overdue ? '⚡ ' : '→ '}{opp.nextAction}
        </div>
      )}
    </div>
  )
}

// ── Kanban column (desktop) ────────────────────────────────
function KanbanColumn({ status, cards, onDragStart, onDrop, onCardClick }) {
  const color    = STATUS_COLOR[status]
  const [over, setOver] = useState(false)

  return (
    <div
      style={{ width: 200, flexShrink: 0, display:'flex', flexDirection:'column', gap:0 }}
      onDragOver={e => { e.preventDefault(); setOver(true) }}
      onDragLeave={() => setOver(false)}
      onDrop={() => { setOver(false); onDrop(status) }}
    >
      {/* Column header */}
      <div style={{
        padding:'8px 10px', borderRadius:'10px 10px 0 0', marginBottom:0,
        background: over ? `${color}20` : `${color}10`,
        border: `1px solid ${color}30`, borderBottom:'none',
        transition:'background 0.15s',
      }}>
        <div style={{ fontSize:10, fontWeight:800, color, textTransform:'uppercase', letterSpacing:0.8 }}>
          {t(`opportunities.status.${status}`)}
        </div>
        <div style={{ fontSize:10, color:'var(--text-secondary)', marginTop:2 }}>
          {t('opportunities.kanban.total', { n: cards.length })}
        </div>
      </div>

      {/* Cards */}
      <div style={{
        flex:1, minHeight:60, padding:'8px 8px 8px',
        background: over ? 'rgba(139,92,246,0.05)' : 'rgba(139,92,246,0.02)',
        border: `1px solid ${color}20`, borderTop:'none', borderRadius:'0 0 10px 10px',
        overflowY:'auto', maxHeight:'calc(100vh - 220px)',
        transition:'background 0.15s',
      }}>
        {cards.length === 0 ? (
          <div style={{ padding:'12px 0', textAlign:'center', fontSize:11, color:'var(--text-secondary)' }}>
            {t('opportunities.kanban.empty')}
          </div>
        ) : cards.map(opp => (
          <KanbanCard
            key={opp.id}
            opp={opp}
            onDragStart={onDragStart}
            onClick={() => onCardClick(opp.id)}
          />
        ))}
      </div>
    </div>
  )
}

// ── Mobile list card ───────────────────────────────────────
function MobileCard({ opp, onStatusChange, onClick }) {
  const color   = STATUS_COLOR[opp.status] || '#9CA3AF'
  const overdue = opp.nextActionAt && new Date(opp.nextActionAt) < new Date()
  return (
    <div style={{ background:'var(--glass-bg)', border:'1px solid var(--border-violet)', borderRadius:12, padding:'12px 14px' }}>
      <div style={{ display:'flex', alignItems:'flex-start', gap:10, marginBottom:8 }}>
        <button onClick={onClick} style={{ flex:1, textAlign:'left', background:'none', border:'none', cursor:'pointer', padding:0 }}>
          <div style={{ fontSize:14, fontWeight:600, color:'var(--text-primary)', lineHeight:1.3, marginBottom:3 }}>{opp.title}</div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {opp.value && <span style={{ fontSize:11, color:'var(--primary-violet-light)', fontWeight:600 }}>{fmtMoney(opp.value)}</span>}
            {opp.nextAction && <span style={{ fontSize:11, color: overdue ? '#F87171' : 'var(--text-secondary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:180 }}>{overdue ? '⚡ ' : '→ '}{opp.nextAction}</span>}
          </div>
        </button>
      </div>
      {/* Inline status change */}
      <select
        value={opp.status}
        onChange={e => onStatusChange(opp.id, e.target.value)}
        onClick={e => e.stopPropagation()}
        style={{ padding:'4px 8px', borderRadius:8, background:`${color}12`, border:`1px solid ${color}30`, color, fontSize:11, fontWeight:700, cursor:'pointer', appearance:'none' }}
      >
        {STATUSES.map(s => <option key={s} value={s}>{t(`opportunities.status.${s}`)}</option>)}
      </select>
    </div>
  )
}

export default function OpportunitiesPage({ onOpenCreate, currentUser }) {
  const navigate   = useNavigate()
  const isDesktop  = useIsDesktop()
  const dragRef    = useRef({ id: null, fromStatus: null })

  const [rows,    setRows]    = useState([])
  const [total,   setTotal]   = useState(0)
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await dbGetOpportunities({ page: 0, pageSize: 200 })
      setRows(res.rows)
      setTotal(res.total)
      setHasMore(res.hasMore)
    } catch(e) { console.error('OpportunitiesPage:', e.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const h = (e) => { if (e.detail?.type === 'opportunity') load() }
    window.addEventListener('network:created', h)
    return () => window.removeEventListener('network:created', h)
  }, [load])

  // Group rows by status for kanban
  const byStatus = {}
  STATUSES.forEach(s => { byStatus[s] = [] })
  rows.forEach(r => { if (byStatus[r.status]) byStatus[r.status].push(r) })

  const handleDragStart = (id, fromStatus) => {
    dragRef.current = { id, fromStatus }
  }

  const handleDrop = async (toStatus) => {
    const { id, fromStatus } = dragRef.current
    if (!id || fromStatus === toStatus) return
    // Optimistic update
    setRows(prev => prev.map(r => r.id === id ? { ...r, status: toStatus } : r))
    try {
      await dbPatchOpportunity(id, { status: toStatus })
    } catch(e) {
      // Revert on error
      setRows(prev => prev.map(r => r.id === id ? { ...r, status: fromStatus } : r))
      console.error('status change failed:', e.message)
    }
  }

  const handleMobileStatusChange = async (id, toStatus) => {
    const opp = rows.find(r => r.id === id)
    if (!opp || opp.status === toStatus) return
    setRows(prev => prev.map(r => r.id === id ? { ...r, status: toStatus } : r))
    try {
      await dbPatchOpportunity(id, { status: toStatus })
    } catch(e) {
      setRows(prev => prev.map(r => r.id === id ? { ...r, status: opp.status } : r))
    }
  }

  return (
    <div style={{ padding:'20px', display:'flex', flexDirection:'column', gap:12 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
        <div>
          <h1 style={{ fontSize:18, fontWeight:700, color:'var(--text-primary)', marginBottom:2 }}>{t('opportunities.title')}</h1>
          <p style={{ fontSize:12, color:'var(--text-secondary)' }}>
            {loading ? t('loading.generic') : `${total} ${t('opportunities.subtitle').toLowerCase()}`}
          </p>
        </div>
        <button onClick={onOpenCreate} style={{ padding:'7px 14px', borderRadius:10, background:'var(--primary-violet)', color:'white', border:'none', cursor:'pointer', fontSize:12, fontWeight:700 }}>
          + {t('create.opportunity.label')}
        </button>
      </div>

      {hasMore && (
        <div style={{ fontSize:11, color:'#FBBF24', padding:'6px 10px', background:'rgba(251,191,36,0.07)', borderRadius:8, border:'1px solid rgba(251,191,36,0.2)' }}>
          {t('opportunities.kanban.tooMany')}
        </div>
      )}

      {loading ? (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {[0,1,2].map(i=><div key={i} style={{ height:72, borderRadius:12, background:'rgba(139,92,246,0.06)', animation:'pulse 1.5s ease-in-out infinite' }}/>)}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState icon={Briefcase} title={t('opportunities.empty')} actionLabel={`+ ${t('create.opportunity.label')}`} onAction={onOpenCreate}/>
      ) : isDesktop ? (
        /* ── KANBAN (desktop) ── */
        <div style={{ overflowX:'auto', paddingBottom:20 }}>
          <div style={{ display:'flex', gap:10, minWidth: STATUSES.length * 212 + 'px', alignItems:'flex-start' }}>
            {STATUSES.map(status => (
              <KanbanColumn
                key={status}
                status={status}
                cards={byStatus[status]}
                onDragStart={handleDragStart}
                onDrop={handleDrop}
                onCardClick={(id) => navigate(`/network/opportunities/${id}`)}
              />
            ))}
          </div>
        </div>
      ) : (
        /* ── GROUPED LIST (mobile) ── */
        <div style={{ display:'flex', flexDirection:'column', gap:0, paddingBottom:40 }}>
          {STATUSES.filter(s => byStatus[s].length > 0).map(status => (
            <div key={status}>
              <div style={{ fontSize:10, fontWeight:800, letterSpacing:1.2, textTransform:'uppercase', color: STATUS_COLOR[status], padding:'16px 0 6px' }}>
                {t(`opportunities.status.${status}`)} ({byStatus[status].length})
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {byStatus[status].map(opp => (
                  <MobileCard
                    key={opp.id}
                    opp={opp}
                    onStatusChange={handleMobileStatusChange}
                    onClick={() => navigate(`/network/opportunities/${opp.id}`)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
