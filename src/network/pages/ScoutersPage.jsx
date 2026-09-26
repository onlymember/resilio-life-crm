import React, { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Plus, ArrowLeft } from 'lucide-react'
import ScouterRow from '../components/ScouterRow.jsx'
import ScouterModal from '../components/ScouterModal.jsx'
import PeriodFilter from '../components/PeriodFilter.jsx'
import { t } from '../../i18n/index.js'
import { personName } from '../utils/people.js'
import { getNetworkScouters, getScouterPerformance } from '../../lib/metrics.js'
import { dbGetGeography } from '../../lib/database.js'

const SORT_COLS = ['nombre','ciudad','level','influencers','brands','opportunities','tasksOverdue','daysInactive']

const useIsMobile = () => {
  const [mobile, setMobile] = useState(window.innerWidth < 640)
  useEffect(() => {
    const h = () => setMobile(window.innerWidth < 640)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])
  return mobile
}

export default function ScoutersPage({ currentUser }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const isMobile = useIsMobile()

  const cityId    = searchParams.get('city')    || null
  const countryId = searchParams.get('country') || null
  const regionId  = searchParams.get('region')  || null
  const from      = searchParams.get('from')    || null
  const to        = searchParams.get('to')      || null

  const setParam = useCallback((key, val) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      if (val) next.set(key, val); else next.delete(key)
      return next
    }, { replace: true })
  }, [setSearchParams])

  const [scouters,    setScouters]    = useState([])
  const [geo,         setGeo]         = useState({ regions:[], countries:[], cities:[] })
  const [loading,     setLoading]     = useState(true)
  const [sortCol,     setSortCol]     = useState('daysInactive')
  const [sortDir,     setSortDir]     = useState('desc')
  const [expanded,    setExpanded]    = useState({})
  const [performance, setPerformance] = useState({})
  const [modal,       setModal]       = useState(false)
  const [period,      setPeriod]      = useState(null)

  useEffect(() => {
    dbGetGeography().then(setGeo).catch(() => {})
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const sc = await getNetworkScouters({ cityId, countryId, regionId })
      setScouters(sc)
    } catch (e) { console.error('ScoutersPage load:', e.message) }
    finally { setLoading(false) }
  }, [cityId, countryId, regionId])

  useEffect(() => { load() }, [load])

  const handlePeriod = (p) => {
    setPeriod(p)
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      if (p?.from) next.set('from', p.from); else next.delete('from')
      if (p?.to)   next.set('to',   p.to);   else next.delete('to')
      return next
    }, { replace: true })
  }

  const handleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('desc') }
  }

  const SORT_KEY = {
    nombre:       s => personName(s),
    ciudad:       s => s.ciudad,
    level:        s => s.level,
    influencers:  s => s.influencers,
    brands:       s => s.brands,
    opportunities:s => s.opportunities,
    tasksOverdue: s => s.tasksOverdue,
    daysInactive: s => s.daysInactive ?? 9999,
  }

  const sorted = [...scouters].sort((a, b) => {
    const fn = SORT_KEY[sortCol] || SORT_KEY.daysInactive
    const av = fn(a), bv = fn(b)
    if (av == null) return 1; if (bv == null) return -1
    return sortDir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1)
  })

  const toggleExpand = async (userId) => {
    const isOpen = expanded[userId]
    setExpanded(prev => ({ ...prev, [userId]: !isOpen }))
    if (!isOpen && !performance[userId]) {
      try {
        const perf = await getScouterPerformance(userId, from, to)
        setPerformance(prev => ({ ...prev, [userId]: perf }))
      } catch (e) { console.error('scouter_performance:', e.message) }
    }
  }

  const GeoSelect = ({ label, paramKey, options }) => (
    <select
      value={searchParams.get(paramKey) || ''}
      onChange={e => setParam(paramKey, e.target.value || null)}
      style={{ padding:'5px 10px', borderRadius:8, background:'rgba(139,92,246,0.07)', border:'1px solid var(--border-violet)', color:'var(--text-primary)', fontSize:12, cursor:'pointer' }}
    >
      <option value="">{label}</option>
      {options.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
    </select>
  )

  const ColHeader = ({ col }) => {
    const active = sortCol === col
    return (
      <button
        onClick={() => handleSort(col)}
        style={{ background:'none', border:'none', cursor:'pointer', padding:0, fontSize:9, fontWeight:active?800:700, color: active ? 'var(--primary-violet-light)' : 'var(--text-secondary)', textTransform:'uppercase', letterSpacing:0.8, textAlign: col==='nombre'||col==='ciudad' ? 'left' : 'center', display:'flex', alignItems:'center', gap:2 }}
      >
        {t(`scouter.cols.${col}`)}
        {active && <span style={{ fontSize:8 }}>{sortDir==='asc'?'↑':'↓'}</span>}
      </button>
    )
  }

  return (
    <div style={{ padding:'20px', display:'flex', flexDirection:'column', gap:16, maxWidth:1100 }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <button onClick={() => navigate('/network/command')} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-secondary)', padding:0 }}>
            <ArrowLeft size={16}/>
          </button>
          <div>
            <h1 style={{ fontSize:18, fontWeight:700, color:'var(--text-primary)', marginBottom:2 }}>{t('pages.scouters.title')}</h1>
            <p style={{ fontSize:12, color:'var(--text-secondary)' }}>
              {loading ? t('loading.generic') : `${scouters.length} ${t('pages.scouters.subtitle').toLowerCase()}`}
            </p>
          </div>
        </div>
        <button
          onClick={() => setModal(true)}
          style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:10, background:'var(--primary-violet)', color:'white', border:'none', cursor:'pointer', fontSize:12, fontWeight:700 }}
        >
          <Plus size={14}/>{t('command.newScouter')}
        </button>
      </div>

      {/* Filters */}
      <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
        <GeoSelect label="Región"  paramKey="region"  options={geo.regions}/>
        <GeoSelect label="País"    paramKey="country" options={geo.countries}/>
        <GeoSelect label="Ciudad"  paramKey="city"    options={geo.cities}/>
        <PeriodFilter value={period} onChange={handlePeriod}/>
      </div>

      {/* Table */}
      {loading && scouters.length === 0 ? (
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {[0,1,2,3].map(i => <div key={i} style={{ height:52, borderRadius:10, background:'rgba(139,92,246,0.06)', animation:'pulse 1.5s ease-in-out infinite' }}/>)}
        </div>
      ) : scouters.length === 0 ? (
        <div style={{ padding:'24px 0', textAlign:'center', color:'var(--text-secondary)', fontSize:13 }}>
          Sin Scouters para este filtro.
        </div>
      ) : (
        <>
          {/* Column headers — desktop only */}
          {!isMobile && (
            <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 50px 55px 55px 55px 55px 70px 28px', gap:8, padding:'4px 14px' }}>
              {SORT_COLS.map(col => <ColHeader key={col} col={col}/>)}
              <span/>
            </div>
          )}
          <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:40 }}>
            {sorted.map(s => (
              <ScouterRow
                key={s.userId}
                scouter={s}
                expanded={!!expanded[s.userId]}
                onToggle={() => toggleExpand(s.userId)}
                performance={performance[s.userId]}
                isMobile={isMobile}
              />
            ))}
          </div>
        </>
      )}

      <ScouterModal
        isOpen={modal}
        onClose={() => setModal(false)}
        cities={geo.cities}
        onSaved={load}
      />
    </div>
  )
}
