import React, { useState, useEffect, useCallback } from 'react'
import { Building2, Search, SlidersHorizontal, Upload, ChevronDown, X } from 'lucide-react'
import NetworkCard from '../components/NetworkCard.jsx'
import EmptyState from '../components/EmptyState.jsx'
import FilterSheet from '../components/FilterSheet.jsx'
import AssignModal from '../components/AssignModal.jsx'
import BulkBar from '../components/BulkBar.jsx'
import ImportSheet from '../components/ImportSheet.jsx'
import { t } from '../../i18n/index.js'
import { dbGetBrands, dbGetGeography, dbGetBrandCategories, dbLogContact, dbGetActiveScouters, dbGetPeopleNames } from '../../lib/database.js'
import { personName } from '../utils/people.js'
import { ADDED_PRESETS, addedRange, rangeToFilters, toDateInput } from '../utils/addedRanges.js'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { COMMAND_ROLES, DIRECTION_ROLES } from '../routes.js'

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
  { id: 'all',     labelKey: 'chips.allF',     filters: {} },
  { id: 'active',  labelKey: 'chips.activeF',  filters: { status: 'active' } },
  { id: 'noowner', labelKey: 'chips.noOwner',  filters: { noOwner: true } },
  { id: 'nocity',  labelKey: 'chips.noCity',   filters: { noCity: true } },
  { id: 'overdue', labelKey: 'chips.overdue',  filters: { overdueFollowup: true } },
  { id: 'nonext',  labelKey: 'chips.noNextAction', filters: { noNextAction: true } },
]

// El Command Center enlaza con ?noOwner=1 / ?noCity=1. Sin leerlos,
// el tile te dejaba en la lista completa.
const chipFromParams = (sp) => {
  if (sp.get('noCity'))       return QUICK_CHIPS.find(c => c.id === 'nocity')
  if (sp.get('noOwner'))      return QUICK_CHIPS.find(c => c.id === 'noowner')
  if (sp.get('overdue'))      return QUICK_CHIPS.find(c => c.id === 'overdue')
  if (sp.get('noNextAction')) return QUICK_CHIPS.find(c => c.id === 'nonext')
  return null
}

// Igual que en Influencers: fecha de alta, scouter a cargo y quién la
// cargó. Vienen también del reporte del Command Center (?createdBy=&from=&to=).
const extraFromParams = (sp) => {
  const ex = {}
  if (sp.get('owner'))     ex.ownerId     = sp.get('owner')
  if (sp.get('createdBy')) ex.createdBy   = sp.get('createdBy')
  if (sp.get('from'))      ex.createdFrom = sp.get('from')
  if (sp.get('to'))        ex.createdTo   = sp.get('to')
  return ex
}

const selStyle = { padding: '5px 26px 5px 10px', borderRadius: 8, background: 'rgba(139,92,246,0.07)', border: '1px solid var(--border-violet)', color: 'var(--text-primary)', fontSize: 12, cursor: 'pointer', appearance: 'none' }
const Select = ({ value, onChange, children, label }) => (
  <div style={{ position: 'relative' }}>
    <select aria-label={label} value={value} onChange={e => onChange(e.target.value)} style={selStyle}>{children}</select>
    <ChevronDown size={12} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-secondary)' }}/>
  </div>
)

export default function BrandsPage({ onOpenCreate, currentUser }) {
  const navigate    = useNavigate()
  const isDesktop   = useIsDesktop()
  const canReassign = COMMAND_ROLES.includes(currentUser?.rol)
  const isDirection = DIRECTION_ROLES.includes(currentUser?.rol)

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
  const [searchParams] = useSearchParams()
  const [chipId,         setChipId]         = useState(chipFromParams(searchParams)?.id ?? 'all')
  const [assignTarget,   setAssignTarget]   = useState(null)
  const [selected,       setSelected]       = useState(new Set())
  const [selectingAll,   setSelectingAll]   = useState(false)
  const [importOpen,     setImportOpen]     = useState(false)
  const initialExtra = extraFromParams(searchParams)
  const [extra,          setExtra]          = useState(initialExtra)
  const [addedPreset,    setAddedPreset]    = useState(initialExtra.createdFrom || initialExtra.createdTo ? 'custom' : 'any')
  const [customRange,    setCustomRange]    = useState({
    from: initialExtra.createdFrom ? toDateInput(initialExtra.createdFrom) : '',
    to:   initialExtra.createdTo ? toDateInput(new Date(new Date(initialExtra.createdTo).getTime() - 1)) : '',
  })
  const [scouters,       setScouters]       = useState([])
  const [names,          setNames]          = useState({})   // userId → nombre (a cargo / cargó)

  const toggleSelect = (id) => setSelected(prev => {
    const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next
  })
  const clearSelect = () => setSelected(new Set())

  // Pide solo los ids que matchean el filtro actual. Es una consulta
  // aparte a proposito: la lista visible esta paginada de a 30 y lo que
  // se quiere repartir es el total, no la pagina.
  const handleSelectAll = async () => {
    setSelectingAll(true)
    try {
      const res = await dbGetBrands({ search: search || undefined, ...filters, ...extra, idsOnly: true })
      setSelected(new Set(res.ids))
    } catch (e) { console.error('selectAll:', e.message) }
    finally { setSelectingAll(false) }
  }

  useEffect(() => {
    Promise.all([dbGetGeography(), dbGetBrandCategories()])
      .then(([g, cats]) => {
        setCities(g.cities || [])
        const m = {}; (g.cities||[]).forEach(c => { m[c.id] = c.name }); setCityMap(m)
        setBrandCats(cats)
      }).catch(() => {})
  }, [])

  const load = useCallback(async (pg = 0, s = search, f = filters, ex = extra) => {
    setLoading(true)
    try {
      const res = await dbGetBrands({ page: pg, pageSize: PAGE_SIZE, search: s || undefined, ...f, ...ex })
      if (pg === 0) setRows(res.rows); else setRows(p => [...p, ...res.rows])
      setTotal(res.total); setPage(pg)
    } catch(e) { console.error('BrandsPage load:', e.message) }
    finally { setLoading(false) }
  }, [search, filters, extra])

  useEffect(() => {
    const chip = chipFromParams(searchParams)
    if (chip) { setFilters(chip.filters); load(0, '', chip.filters) }
    else      { load(0) }
  }, [])

  // Scouters para el filtro de Dirección y nombres de quién tiene cada marca.
  useEffect(() => {
    if (isDirection) dbGetActiveScouters(null).then(setScouters).catch(() => {})
  }, [])
  useEffect(() => {
    if (!isDirection) return
    const ids = [...rows.map(r => r.ownerScouterId), extra.createdBy].filter(id => id && !(id in names))
    if (ids.length) dbGetPeopleNames(ids).then(m => setNames(p => ({ ...p, ...m }))).catch(() => {})
  }, [rows, extra.createdBy])

  const applyExtra = (ex) => { setExtra(ex); load(0, search, filters, ex) }
  const handleAdded = (preset, custom = customRange) => {
    setAddedPreset(preset)
    const { createdFrom, createdTo, ...rest } = extra
    const r = preset === 'custom' ? addedRange('custom', custom) : addedRange(preset)
    applyExtra({ ...rest, ...rangeToFilters(r) })
  }
  const handleCustom = (k, v) => {
    const next = { ...customRange, [k]: v }
    setCustomRange(next)
    handleAdded('custom', next)
  }
  const handleOwner = (id) => {
    const { ownerId, ...rest } = extra
    applyExtra(id ? { ...rest, ownerId: id } : rest)
  }
  const clearCreatedBy = () => {
    const { createdBy, ...rest } = extra
    applyExtra(rest)
  }

  useEffect(() => {
    const h = (e) => { if (e.detail?.type === 'brand') load(0) }
    window.addEventListener('network:created', h)
    return () => window.removeEventListener('network:created', h)
  }, [load])

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
        <div style={{ display:'flex', gap:8 }}>
          {currentUser?.rol === 'super_admin' && (
            <button onClick={() => setImportOpen(true)} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:10, background:'rgba(139,92,246,0.08)', border:'1px solid var(--border-violet)', color:'var(--text-secondary)', cursor:'pointer', fontSize:12 }}>
              <Upload size={14}/>{t('import.button')}
            </button>
          )}
          <button onClick={() => setFilterOpen(true)} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:10, background:'rgba(139,92,246,0.08)', border:'1px solid var(--border-violet)', color:'var(--text-secondary)', cursor:'pointer', fontSize:12 }}>
            <SlidersHorizontal size={14}/>{t('filter.title')}
          </button>
        </div>
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
            {t(chip.labelKey)}
          </button>
        ))}
      </div>

      {/* Fecha de alta (todos) y scouter a cargo (solo Dirección). */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{t('intake.brands.added')}:</span>
        <Select label={t('intake.brands.added')} value={addedPreset} onChange={p => handleAdded(p)}>
          {ADDED_PRESETS.map(p => <option key={p} value={p}>{t(`intake.presets.${p}`)}</option>)}
        </Select>
        {addedPreset === 'custom' && (
          <>
            <input type="date" aria-label={t('intake.filter.from')} value={customRange.from} onChange={e => handleCustom('from', e.target.value)} style={{ ...selStyle, padding: '4px 8px' }}/>
            <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>–</span>
            <input type="date" aria-label={t('intake.filter.to')} value={customRange.to} onChange={e => handleCustom('to', e.target.value)} style={{ ...selStyle, padding: '4px 8px' }}/>
          </>
        )}
        {isDirection && (
          <>
            <span style={{ fontSize: 11, color: 'var(--text-secondary)', whiteSpace: 'nowrap', marginLeft: 4 }}>{t('intake.filter.scouter')}:</span>
            <Select label={t('intake.filter.scouter')} value={extra.ownerId || ''} onChange={handleOwner}>
              <option value="">{t('intake.filter.allScouters')}</option>
              {[...scouters].sort((a, b) => personName(a).localeCompare(personName(b))).map(sc => (
                <option key={sc.userId} value={sc.userId}>{personName(sc)}</option>
              ))}
            </Select>
          </>
        )}
        {extra.createdBy && (
          <button onClick={clearCreatedBy} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: 'rgba(139,92,246,0.25)', color: 'var(--primary-violet-light)', border: '1px solid rgba(139,92,246,0.5)', cursor: 'pointer' }}>
            {t('intake.filter.addedBy', { name: names[extra.createdBy] || '…' })}<X size={11}/>
          </button>
        )}
      </div>

      {/* Seleccionar todo lo que matchea el filtro, no solo lo cargado.
          Sin esto, repartir cientos de fichas eran muchos "cargar mas"
          y un clic por ficha; con esto es uno. */}
      {isDesktop && canReassign && total > rows.length && (
        <button
          onClick={handleSelectAll}
          disabled={selectingAll}
          style={{ alignSelf:'flex-start', fontSize:11, fontWeight:600, color:'var(--primary-violet-light)', background:'rgba(139,92,246,0.08)', border:'1px solid var(--border-violet)', borderRadius:8, padding:'5px 12px', cursor: selectingAll ? 'default' : 'pointer' }}
        >
          {selectingAll ? t('loading.generic') : t('bulk.selectAll', { n: total })}
        </button>
      )}

      {loading && rows.length === 0 ? (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {[0,1,2].map(i=><div key={i} style={{ height:80, borderRadius:14, background:'rgba(139,92,246,0.06)', border:'1px solid var(--border-violet)' }}/>)}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState icon={Building2} title={search ? t('empty.noResults') : t('empty.noBrands')} actionLabel={`+ ${t('create.brand.label')}`} onAction={() => onOpenCreate('brand')}/>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {rows.map((b, i) => (
            <div key={b.id} style={{ position:'relative', animation: `cardIn var(--dur-base) var(--ease-emphasized) ${Math.min(i, 9) * 40}ms both` }}>
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
                  ownerName={isDirection ? (b.ownerScouterId ? names[b.ownerScouterId] : t('brand.owner.none')) : undefined}
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

      {importOpen && (
        <ImportSheet
          kind="brands"
          onClose={() => setImportOpen(false)}
          onDone={() => { setImportOpen(false); load(0) }}
        />
      )}
    </div>
  )
}
