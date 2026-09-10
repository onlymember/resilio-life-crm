import React, { useState, useEffect, useCallback } from 'react'
import { Building2, Search, SlidersHorizontal } from 'lucide-react'
import NetworkCard from '../components/NetworkCard.jsx'
import EmptyState from '../components/EmptyState.jsx'
import FilterSheet from '../components/FilterSheet.jsx'
import { t } from '../../i18n/index.js'
import { dbGetBrands, dbGetGeography } from '../../lib/database.js'
import { useNavigate } from 'react-router-dom'

const PAGE_SIZE = 30

export default function BrandsPage({ onOpenCreate }) {
  const navigate = useNavigate()
  const [rows,       setRows]       = useState([])
  const [total,      setTotal]      = useState(0)
  const [page,       setPage]       = useState(0)
  const [loading,    setLoading]    = useState(true)
  const [search,     setSearch]     = useState('')
  const [filters,    setFilters]    = useState({})
  const [filterOpen, setFilterOpen] = useState(false)
  const [cities,     setCities]     = useState([])
  const [cityMap,    setCityMap]    = useState({})

  useEffect(() => {
    dbGetGeography().then(g => {
      setCities(g.cities || [])
      const m = {}; (g.cities||[]).forEach(c => { m[c.id] = c.name }); setCityMap(m)
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
  const handleApply  = (f)   => { setFilters(f);  load(0, search, f) }
  const handleClear  = ()    => { setFilters({});  load(0, search, {}) }

  return (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
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
        <input value={search} onChange={e => handleSearch(e.target.value)} placeholder={t('filter.search')} style={{ width:'100%', paddingLeft:34, paddingRight:12, paddingTop:10, paddingBottom:10, background:'rgba(139,92,246,0.07)', border:'1px solid rgba(139,92,246,0.2)', borderRadius:10, color:'var(--text-primary)', fontSize:13, outline:'none' }}/>
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
            <NetworkCard key={b.id} entity={b} entityType="brand" cityName={cityMap[b.cityId]} onClick={() => navigate(`/network/brands/${b.id}`)}/>
          ))}
          {rows.length < total && (
            <button onClick={() => load(page+1)} disabled={loading} style={{ padding:'12px', borderRadius:10, background:'rgba(139,92,246,0.08)', border:'1px solid var(--border-violet)', color:'var(--text-secondary)', cursor:'pointer', fontSize:13 }}>
              {loading ? t('loading.generic') : t('label.loadMore', { n: total - rows.length })}
            </button>
          )}
        </div>
      )}

      <FilterSheet isOpen={filterOpen} onClose={() => setFilterOpen(false)} filters={filters} onChange={setFilters} onApply={handleApply} onClear={handleClear} cities={cities} categories={t('categories')||[]}/>
    </div>
  )
}
