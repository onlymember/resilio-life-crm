import React, { useState, useEffect, useCallback } from 'react'
import { Building2, Search, SlidersHorizontal } from 'lucide-react'
import NetworkCard from '../components/NetworkCard.jsx'
import EmptyState from '../components/EmptyState.jsx'
import FilterSheet from '../components/FilterSheet.jsx'
import AssignModal from '../components/AssignModal.jsx'
import BulkBar from '../components/BulkBar.jsx'
import { t } from '../../i18n/index.js'
import { dbGetBrands, dbGetGeography, dbGetBrandCategories, dbLogContact } from '../../lib/database.js'
import { useNavigate } from 'react-router-dom'
import { COMMAND_ROLES } from '../routes.js'

const useIsDesktop = () => {
  const [desktop, setDesktop] = useState(window.innerWidth >= 640)
  useEffect(() => {
    const h = () => setDesktop(window.innerWidth >= 640)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])
  return desktop
}

const PAGE_SIZE = 30

const QUICK_CHIPS = [
  { id: 'all',     label: 'Todas',              filters: {} },
  { id: 'active',  label: 'Activas',            filters: { status: 'active' } },
  { id: 'noowner', label: 'Sin dueño',          filters: { noOwner: true } },
  { id: 'overdue', label: 'Seguimiento vencido', filters: { overdueFollowup: true } },
]

export default function BrandsPage({ onOpenCreate, currentUser }) {
  const navigate    = useNavigate()
  const isDesktop   = useIsDesktop()
  const canReassign = COMMAND_ROLES.includes(currentUser?.rol)

  const [rows,           setRows]           = useState([])
  const [total,          setTotal]          = useState(0)
  const [page,           setPage]           = useState(0)
  const [loading,        setLoading]        = useState(true)
  const [search,         setSearch]         = useState('')
  const [filters,        setFilters]        = useState({})
  const [filterOpen,     setFilterOpen]     = useState(false)
  const [cities,         setCities]         = useState([])
  const [cityMap,        setCityMap]        = useState({})
  const [brandCats,      setBrandCats]      = useState([])
  const [chipId,         setChipId]         = useState('all')
  const [assignTarget,   setAssignTarget]   = useState(null)
  const [selected,       setSelected]       = useState(new Set())

  const toggleSelect = (id) => setSelected(prev => {
    const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next
  })
  const clearSelect = () => setSelected(new Set())

  useEffect(() => {
    Promise.all([dbGetGeography(), dbGetBrandCategories()])
      .then(([g, cats]) => {
        setCities(g.cities || [])
        const m = {}; (g.cities||[]).forEach(c => { m[c.id] = c.name }); setCityMap(m)
        setBrandCats(cats)
      }).catch(() => {})
  }, [])

  const load = useCallback(async (pg = 0, s = search, f = filters) => {
    setLoading(true)
    try {
      const res = await dbGetBrands({ page: pg, pageSize: PAGE_SIZE, search: s || undefined, ...f })
      if (pg === 0) setRows(res.rows); else setRows(p => [...p, ...res.rows])
      setTotal(res.total); setPage(pg)
    } catch(e) { console.error('BrandsPage load:', e.message) }
    finally { setLoading(false) }
  }, [search, filters])

  useEffect(() => { load(0) }, [])

  const handleSearch = (val) => { setSearch(val); load(0, val, filters) }
  const handleApply  = (f)   => { setFilters(f);  load(0, search, f); setChipId('all') }
  const handleClear  = ()    => { setFilters({});  load(0, search, {}); setChipId('all') }
  const handleChip   = (chip) => { setChipId(chip.id); setFilters(chip.filters); load(0, search, chip.filters) }

  const handleContact = async (entity, label) => {
    try {
      await dbLogContact('brand', entity.id, label)
      const now = new Date().toISOString()
      setRows(prev => prev.map(r => r.id === entity.id ? { ...r, lastContactAt: now } : r))
    } catch(e) { console.error('logContact:', e.message) }
  }

  const handleAssigned = (entityId, scouter) => {
    setRows(prev => prev.map(r => r.id === entityId ? { ...r, ownerScouterId: scouter.userId } : r))
  }

  return (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>{t('pages.brands.title')}</h1>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{total > 0 ? `${total} registros` : t('pages.brands.subtitle')}</p>
        </div>
        <button onClick={() => setFilterOpen(true)} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:10, background:'rgba(139,92,246,0.08)', border:'1px solid var(--border-violet)', color:'var(--text-secondary)', cursor:'pointer', fontSize:12 }}>
          <SlidersHorizontal size={14}/>{t('filter.title')}
        </button>
      </div>

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

      {loading && rows.length === 0 ? (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {[0,1,2].map(i=><div key={i} style={{ height:80, borderRadius:14, background:'rgba(139,92,246,0.06)', border:'1px solid var(--border-violet)' }}/>)}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState icon={Building2} title={search ? t('empty.noResults') : t('empty.noBrands')} actionLabel={`+ ${t('create.brand.label')}`} onAction={onOpenCreate}/>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {rows.map(b => (
            <div key={b.id} style={{ position:'relative' }}>
              {isDesktop && canReassign && (
                <input
                  type="checkbox"
                  checked={selected.has(b.id)}
                  onChange={() => toggleSelect(b.id)}
                  onClick={e => e.stopPropagation()}
                  style={{ position:'absolute', left:14, top:18, zIndex:2, cursor:'pointer', accentColor:'var(--primary-violet)', width:14, height:14 }}
                />
              )}
              <div style={isDesktop && canReassign ? { paddingLeft:34 } : {}}>
                <NetworkCard
                  entity={b}
                  entityType="brand"
                  cityName={cityMap[b.cityId]}
                  onClick={() => navigate(`/network/brands/${b.id}`)}
                  onContact={handleContact}
                  canReassign={canReassign}
                  onReassign={setAssignTarget}
                />
              </div>
            </div>
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
        cities={cities}
        brandCategories={brandCats}
        showOverdueFollowup
      />

      <AssignModal
        isOpen={!!assignTarget}
        onClose={() => setAssignTarget(null)}
        entity={assignTarget}
        entityType="brand"
        onAssigned={handleAssigned}
      />

      {isDesktop && canReassign && (
        <BulkBar
          selected={selected}
          rows={rows}
          entityType="brand"
          onClear={clearSelect}
          onRefresh={() => load(0)}
        />
      )}
    </div>
  )
}
