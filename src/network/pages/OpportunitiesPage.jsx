import React, { useState, useEffect, useCallback } from 'react'
import { Briefcase } from 'lucide-react'
import EmptyState from '../components/EmptyState.jsx'
import { t } from '../../i18n/index.js'
import { dbGetOpportunities } from '../../lib/database.js'
import { useNavigate } from 'react-router-dom'
import RelationshipBadge from '../components/RelationshipBadge.jsx'

const PAGE_SIZE = 30

const statusLabel = (status) => t(`opportunities.status.${status}`) || status
const STATUS_COLOR = { new:'#9CA3AF', qualified:'#60A5FA', proposal:'#FBBF24', negotiation:'#FB923C', won:'#34D399', lost:'#F87171' }

export default function OpportunitiesPage({ onOpenCreate }) {
  const navigate = useNavigate()
  const [rows,    setRows]    = useState([])
  const [total,   setTotal]   = useState(0)
  const [page,    setPage]    = useState(0)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async (pg = 0) => {
    setLoading(true)
    try {
      const res = await dbGetOpportunities({ page: pg, pageSize: PAGE_SIZE })
      if (pg === 0) setRows(res.rows); else setRows(p => [...p, ...res.rows])
      setTotal(res.total); setPage(pg)
    } catch(e) { console.error('OpportunitiesPage:', e.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load(0) }, [])

  const fmtMoney = (n) => n >= 1000000 ? `$${(n/1000000).toFixed(1)}M` : n >= 1000 ? `$${(n/1000).toFixed(0)}K` : n ? `$${n}` : '—'

  return (
    <div style={{ padding:'20px', display:'flex', flexDirection:'column', gap:16 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <h1 style={{ fontSize:18, fontWeight:700, color:'var(--text-primary)', marginBottom:2 }}>{t('pages.opportunities.title')}</h1>
          <p style={{ fontSize:12, color:'var(--text-secondary)' }}>{total > 0 ? `${total} registros` : t('pages.opportunities.subtitle')}</p>
        </div>
      </div>

      {loading && rows.length === 0 ? (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {[0,1,2].map(i=><div key={i} style={{ height:72, borderRadius:12, background:'rgba(139,92,246,0.06)', border:'1px solid var(--border-violet)' }}/>)}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState icon={Briefcase} title={t('empty.noOpportunities')} actionLabel={`+ ${t('create.opportunity.label')}`} onAction={onOpenCreate}/>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {rows.map(opp => {
            const color  = STATUS_COLOR[opp.status] || '#9CA3AF'
            const label  = statusLabel(opp.status)
            const overdue = opp.nextActionAt && new Date(opp.nextActionAt) < new Date()
            return (
              <button key={opp.id} onClick={() => navigate(`/network/opportunities/${opp.id}`)} style={{ width:'100%', textAlign:'left', background:'var(--glass-bg)', border:'1px solid var(--border-violet)', borderRadius:12, padding:'14px 16px', cursor:'pointer', transition:'all 0.2s', display:'flex', alignItems:'center', gap:14 }}
                onMouseEnter={e=>{e.currentTarget.style.border='1px solid rgba(139,92,246,0.4)'}}
                onMouseLeave={e=>{e.currentTarget.style.border='1px solid var(--border-violet)'}}>
                <div style={{ width:36, height:36, borderRadius:10, background:`${color}20`, border:`1px solid ${color}40`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <Briefcase size={16} color={color}/>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:14, fontWeight:600, color:'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', marginBottom:3 }}>{opp.title}</div>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <span style={{ fontSize:11, padding:'2px 7px', borderRadius:10, background:`${color}15`, border:`1px solid ${color}30`, color, fontWeight:600 }}>{label}</span>
                    {opp.value && <span style={{ fontSize:11, color:'var(--text-secondary)' }}>{fmtMoney(opp.value)}</span>}
                    {opp.nextAction && <span style={{ fontSize:11, color: overdue ? '#F87171' : 'var(--text-secondary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{overdue ? '⚡ ' : '→ '}{opp.nextAction}</span>}
                  </div>
                </div>
              </button>
            )
          })}
          {rows.length < total && (
            <button onClick={() => load(page+1)} disabled={loading} style={{ padding:'12px', borderRadius:10, background:'rgba(139,92,246,0.08)', border:'1px solid var(--border-violet)', color:'var(--text-secondary)', cursor:'pointer', fontSize:13 }}>
              {loading ? t('loading.generic') : t('label.loadMore', { n: total - rows.length })}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
