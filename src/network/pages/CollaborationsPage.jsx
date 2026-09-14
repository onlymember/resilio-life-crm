import React, { useState, useEffect, useCallback } from 'react'
import { CheckCircle } from 'lucide-react'
import CollaborationCard from '../components/CollaborationCard.jsx'
import EmptyState from '../components/EmptyState.jsx'
import { t } from '../../i18n/index.js'
import { dbGetCollaborations, dbGetActivationTypes } from '../../lib/database.js'
import { useNavigate } from 'react-router-dom'

const PAGE_SIZE = 30

const STATUS_CHIPS = [
  { id: 'all',             label: 'Todas',              filters: {} },
  { id: 'proposed',        label: t('collab.status.proposed'),        filters: { status: 'proposed' } },
  { id: 'confirmed',       label: t('collab.status.confirmed'),       filters: { status: 'confirmed' } },
  { id: 'in_progress',     label: t('collab.status.in_progress'),     filters: { status: 'in_progress' } },
  { id: 'content_pending', label: t('collab.status.content_pending'), filters: { status: 'content_pending' } },
  { id: 'completed',       label: t('collab.status.completed'),       filters: { status: 'completed' } },
]

export default function CollaborationsPage({ onOpenCreate }) {
  const navigate    = useNavigate()
  const [rows,      setRows]      = useState([])
  const [total,     setTotal]     = useState(0)
  const [page,      setPage]      = useState(0)
  const [loading,   setLoading]   = useState(true)
  const [chipId,    setChipId]    = useState('all')
  const [filters,   setFilters]   = useState({})
  const [actTypes,  setActTypes]  = useState([])
  const [actTypeMap,setActTypeMap]= useState({})

  useEffect(() => {
    dbGetActivationTypes().then(types => {
      setActTypes(types)
      const m = {}; types.forEach(t => { m[t.id] = t }); setActTypeMap(m)
    }).catch(() => {})
  }, [])

  const load = useCallback(async (pg = 0, f = filters) => {
    setLoading(true)
    try {
      const res = await dbGetCollaborations({ page: pg, pageSize: PAGE_SIZE, ...f })
      if (pg === 0) setRows(res.rows); else setRows(p => [...p, ...res.rows])
      setTotal(res.total); setPage(pg)
    } catch(e) { console.error('CollaborationsPage:', e.message) }
    finally { setLoading(false) }
  }, [filters])

  useEffect(() => { load(0) }, [])

  useEffect(() => {
    const h = (e) => { if (e.detail?.type === 'collaboration') load(0) }
    window.addEventListener('network:created', h)
    return () => window.removeEventListener('network:created', h)
  }, [load])

  const handleChip = (chip) => {
    setChipId(chip.id)
    setFilters(chip.filters)
    load(0, chip.filters)
  }

  return (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>{t('collab.title')}</h1>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{total > 0 ? `${total} registros` : t('collab.subtitle')}</p>
        </div>
        <button
          onClick={onOpenCreate}
          style={{ padding: '7px 14px', borderRadius: 10, background: 'var(--primary-violet)', color: 'white', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}
        >
          + {t('collab.new')}
        </button>
      </div>

      {/* Status chips */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
        {STATUS_CHIPS.map(chip => (
          <button
            key={chip.id}
            onClick={() => handleChip(chip)}
            style={{
              padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
              background: chipId === chip.id ? 'rgba(139,92,246,0.25)' : 'rgba(139,92,246,0.07)',
              color: chipId === chip.id ? 'var(--primary-violet-light)' : 'var(--text-secondary)',
              border: chipId === chip.id ? '1px solid rgba(139,92,246,0.5)' : '1px solid var(--border-violet)',
            }}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {loading && rows.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[0,1,2].map(i => <div key={i} style={{ height: 76, borderRadius: 12, background: 'rgba(139,92,246,0.06)', animation: 'pulse 1.5s ease-in-out infinite' }}/>)}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState icon={CheckCircle} title={t('collab.empty')} actionLabel={`+ ${t('collab.new')}`} onAction={onOpenCreate}/>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rows.map((collab, i) => (
            <div key={collab.id} style={{ animation: `cardIn var(--dur-base) var(--ease-emphasized) ${Math.min(i, 9) * 40}ms both` }}>
              <CollaborationCard
                collab={collab}
                activationType={actTypeMap[collab.activationTypeId]}
                onClick={() => navigate(`/network/collaborations/${collab.id}`)}
              />
            </div>
          ))}
          {rows.length < total && (
            <button onClick={() => load(page + 1)} disabled={loading} style={{ padding: '12px', borderRadius: 10, background: 'rgba(139,92,246,0.08)', border: '1px solid var(--border-violet)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13 }}>
              {loading ? t('loading.generic') : t('label.loadMore', { n: total - rows.length })}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
