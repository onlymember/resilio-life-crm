import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase.js'
import EmptyState from './EmptyState.jsx'
import { t } from '../../i18n/index.js'
import { dbGetBrandInfluencerHistory } from '../../lib/database.js'
import { Users } from 'lucide-react'

const fmtMoney = (n) => {
  if (!n) return '—'
  return n >= 1000000 ? `${(n/1000000).toFixed(1)}M` : n >= 1000 ? `${(n/1000).toFixed(0)}K` : String(n)
}

const fmtDate = (iso) => {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(undefined, { day:'numeric', month:'short', year:'numeric' })
}

export default function RelationshipHistory({ brandId, influencerId }) {
  const [rows,    setRows]    = useState([])
  const [names,   setNames]   = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    setLoading(true)
    const param = brandId ? { brandId } : { influencerId }
    dbGetBrandInfluencerHistory(param)
      .then(async (data) => {
        if (!active) return
        const sorted = [...data].sort((a, b) =>
          b.timesWorked !== a.timesWorked
            ? b.timesWorked - a.timesWorked
            : new Date(b.lastCollabAt || 0) - new Date(a.lastCollabAt || 0)
        )
        setRows(sorted)

        if (sorted.length === 0) return

        if (brandId) {
          const ids = [...new Set(sorted.map(r => r.influencerId).filter(Boolean))]
          const { data: infs } = await supabase.from('influencers').select('id, name, username').in('id', ids)
          if (!active) return
          const map = {}
          for (const inf of infs || []) map[inf.id] = inf.name || inf.username || '—'
          setNames(map)
        } else {
          const ids = [...new Set(sorted.map(r => r.brandId).filter(Boolean))]
          const { data: brands } = await supabase.from('brands').select('id, name').in('id', ids)
          if (!active) return
          const map = {}
          for (const b of brands || []) map[b.id] = b.name || '—'
          setNames(map)
        }
      })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [brandId, influencerId])

  if (loading) {
    return <div style={{ fontSize:12, color:'var(--text-secondary)', padding:'8px 0' }}>…</div>
  }

  if (rows.length === 0) {
    return (
      <div style={{ fontSize:12, color:'var(--text-secondary)', padding:'8px 0', fontStyle:'italic' }}>
        {t('relationshipHistory.empty')}
      </div>
    )
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
      {rows.map((row, i) => {
        const counterId = brandId ? row.influencerId : row.brandId
        const name = names[counterId] || '—'
        return (
          <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 10px', borderRadius:8, background:'rgba(139,92,246,0.04)', border:'1px solid rgba(139,92,246,0.12)' }}>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:13, fontWeight:600, color:'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{name}</div>
              <div style={{ fontSize:11, color:'var(--text-secondary)', marginTop:2 }}>
                {t('relationshipHistory.timesWorked', { n: row.timesWorked })}
                {row.avgEngagementRate != null && (
                  <span style={{ marginLeft:8 }}>{t('relationshipHistory.avgEngagement')}: {(row.avgEngagementRate * 100).toFixed(1)}%</span>
                )}
              </div>
            </div>
            <div style={{ flexShrink:0, textAlign:'right' }}>
              <div style={{ fontSize:12, fontWeight:700, color:'var(--primary-violet-light)' }}>{fmtMoney(row.totalValue)}</div>
              <div style={{ fontSize:10, color:'var(--text-secondary)', marginTop:2 }}>
                {t('relationshipHistory.lastCollab')}: {fmtDate(row.lastCollabAt)}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
