import React, { useState, useEffect, useCallback } from 'react'
import { Users, Search, SlidersHorizontal, ChevronDown } from 'lucide-react'
import NetworkCard from '../components/NetworkCard.jsx'
import EmptyState from '../components/EmptyState.jsx'
import FilterSheet from '../components/FilterSheet.jsx'
import AssignModal from '../components/AssignModal.jsx'
import { t } from '../../i18n/index.js'
import { dbGetInfluencers, dbGetGeography, dbLogContact } from '../../lib/database.js'
import { useNavigate } from 'react-router-dom'
import { COMMAND_ROLES } from '../routes.js'

const PAGE_SIZE = 30

const ORDER_OPTIONS = [
  { value: 'created_at',    dir: 'desc', label: 'Recientes' },
  { value: 'followers',     dir: 'desc', label: 'Seguidores' },
  { value: 'engagement',    dir: 'desc', label: 'Engagement' },
  { value: 'last_contact_at', dir: 'desc', label: 'Último contacto' },
]

const QUICK_CHIPS = [
  { id: 'all',     label: 'Todos',          filters: {} },
  { id: 'active',  label: 'Activos',        filters: { status: 'active' } },
  { id: 'today',   label: 'Seguimiento hoy',filters: { overdueToday: true } },
  { id: 'overdue', label: 'Vencidos',       filters: { overdueOnly: true } },
  { id: 'noowner', label: 'Sin dueño',      filters: { noOwner: true } },
]

export default function InfluencersPage({ onOpenCreate, currentUser }) {
  const navigate    = useNavigate()
  const canReassign = COMMAND_ROLES.includes(currentUser?.rol)

  const [rows,         setRows]         = useState([])
  const [total,        setTotal]        = useState(0)
  const [page,         setPage]         = useState(0)
  const [loading,      setLoading]      = useState(true)
  const [search,       setSearch]       = useState('')
  const [filters,      setFilters]      = useState({})
  const [filterOpen,   setFilterOpen]   = useState(false)
  const [cities,       setCities]       = useState([])
  const [cityMap,      setCityMap]      = useState({})
  const [orderBy,      setOrderBy]      = useState(ORDER_OPTIONS[0])
  const [chipId,       setChipId]       = useState('all')
  const [assignTarget, setAssignTarget] = useState(null)

  useEffect(() => {
    dbGetGeography().then(g => {
      setCities(g.cities || [])
      const m = {}; (g.cities||[]).forEach(c => { m[c.id] = c.name }); setCityMap(m)
    }).catch(() => {})
  }, [])

  const load = useCallback(async (pg = 0, s = search, f = filters, ord = orderBy) => {
    setLoading(true)
    try {
      const res = await dbGetInfluencers({
        page: pg, pageSize: PAGE_SIZE,
        search: s || undefined,
        orderBy: ord.value, orderDir: ord.dir,
        ...f,
      })
      if (pg === 0) setRows(res.rows); else setRows(p => [...p, ...res.rows])
      setTotal(res.total); setPage(pg)
    } catch(e) { console.error('InfluencersPage load:', e.message) }
    finally { setLoading(false) }
  }, [search, filters, orderBy])

  useEffect(() => { load(0) }, [])

  const handleSearch  = (val) => { setSearch(val); load(0, val, filters, orderBy) }
  const handleApply   = (f)   => { setFilters(f);  load(0, search, f, orderBy); setChipId('all') }
  const handleClear   = ()    => { setFilters({});  load(0, search, {}, orderBy); setChipId('all') }
  const handleOrder   = (opt) => { setOrderBy(opt); load(0, search, filters, opt) }
  const handleChip    = (chip) => {
    setChipId(chip.id)
    setFilters(chip.filters)
    load(0, search, chip.filters, orderBy)
  }

  const handleContact = async (entity, label) => {
    try {
      await dbLogContact('influencer', entity.id, label)
      // Update lastContactAt in local state without re-fetch
      const now = new Date().toISOString()
      setRows(prev => prev.map(r => r.id === entity.id ? { ...r, lastContactAt: now } : r))
    } catch(e) { console.error('logContact:', e.message) }
  }

  const handleAssigned = (entityId, scouter) => {
    setRows(prev => prev.map(r => r.id === entityId ? { ...r, ownerScouterId: scouter.userId } : r))
  }

  return (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>{t('pages.influencers.title')}</h1>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{total > 0 ? `${total} registros` : t('pages.influencers.subtitle')}</p>
        </div>
        <button onClick={() => setFilterOpen(true)} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:10, background:'rgba(139,92,246,0.08)', border:'1px solid var(--border-violet)', color:'var(--text-secondary)', cursor:'pointer', fontSize:12 }}>
          <SlidersHorizontal size={14}/>{t('filter.title')}
        </button>
      </div>

      {/* Search */}
      <div style={{ position: 'relative' }}>
        <Search size={14} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--text-secondary)' }}/>
        <input value={search} onChange={e => handleSearch(e.target.value)} placeholder={t('filter.search')} style={{ width:'100%', paddingLeft:34, paddingRight:12, paddingTop:10, paddingBottom:10, background:'rgba(139,92,246,0.07)', border:'1px solid rgba(139,92,246,0.2)', borderRadius:10, color:'var(--text-primary)', fontSize:16, outline:'none' }}/>
      </div>

      {/* Quick filter chips */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
        {QUICK_CHIPS.map(chip => (
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

      {/* Order select */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 11, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{t('filter.orderBy')}:</span>
        <div style={{ position: 'relative' }}>
          <select
            value={orderBy.value}
            onChange={e => {
              const opt = ORDER_OPTIONS.find(o => o.value === e.target.value) || ORDER_OPTIONS[0]
              handleOrder(opt)
            }}
            style={{ padding: '4px 26px 4px 10px', borderRadius: 8, background: 'rgba(139,92,246,0.07)', border: '1px solid var(--border-violet)', color: 'var(--text-primary)', fontSize: 12, cursor: 'pointer', appearance: 'none' }}
          >
            {ORDER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <ChevronDown size={12} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-secondary)' }}/>
        </div>
      </div>

      {/* List */}
      {loading && rows.length === 0 ? (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {[0,1,2,3].map(i=>(
            <div key={i} style={{ height:80, borderRadius:14, background:'rgba(139,92,246,0.06)', border:'1px solid var(--border-violet)', animation:'pulse 1.5s ease-in-out infinite' }}/>
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState icon={Users} title={search ? t('empty.noResults') : t('empty.noInfluencers')} actionLabel={`+ ${t('create.influencer.label')}`} onAction={onOpenCreate}/>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {rows.map(inf => (
            <NetworkCard
              key={inf.id}
              entity={inf}
              entityType="influencer"
              cityName={cityMap[inf.cityId]}
              onClick={() => navigate(`/network/influencers/${inf.id}`)}
              onContact={handleContact}
              canReassign={canReassign}
              onReassign={setAssignTarget}
            />
          ))}
          {rows.length < total && (
            <button onClick={() => load(page+1)} disabled={loading} style={{ padding:'12px', borderRadius:10, background:'rgba(139,92,246,0.08)', border:'1px solid var(--border-violet)', color:'var(--text-secondary)', cursor:'pointer', fontSize:13 }}>
              {loading ? t('loading.generic') : t('label.loadMore', { n: total - rows.length })}
            </button>
          )}
        </div>
      )}

      <FilterSheet
        isOpen={filterOpen} onClose={() => setFilterOpen(false)}
        filters={filters} onChange={setFilters}
        onApply={handleApply} onClear={handleClear}
        cities={cities} categories={t('categories')||[]}
        showTier
      />

      <AssignModal
        isOpen={!!assignTarget}
        onClose={() => setAssignTarget(null)}
        entity={assignTarget}
        entityType="influencer"
        onAssigned={handleAssigned}
      />
    </div>
  )
}
