import React, { useState, useEffect, useRef } from 'react'
import { X, Search } from 'lucide-react'
import { t } from '../../i18n/index.js'
import { dbGetInfluencers, dbGetBrands } from '../../lib/database.js'

const INPUT_STYLE = {
  width: '100%', background: 'rgba(139,92,246,0.07)',
  border: '1px solid rgba(139,92,246,0.25)', borderRadius: 10,
  padding: '10px 12px', color: 'var(--text-primary)', fontSize: 13, outline: 'none',
}

export default function EntityPicker({ kind, value, onChange, placeholder, excludeIds = [] }) {
  const [query,   setQuery]   = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [open,    setOpen]    = useState(false)
  const timer   = useRef(null)
  const wrapRef = useRef(null)
  const excludeKey = excludeIds.join(',')

  useEffect(() => {
    if (!open || query.length < 2) { setResults([]); return }
    clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      setLoading(true)
      try {
        if (kind === 'influencer') {
          const r = await dbGetInfluencers({ search: query, pageSize: 10, status: 'active' })
          setResults(r.rows.filter(x => !excludeIds.includes(x.id)))
        } else {
          const r = await dbGetBrands({ search: query, pageSize: 10 })
          setResults(r.rows.filter(x => !excludeIds.includes(x.id)))
        }
      } catch { setResults([]) }
      finally { setLoading(false) }
    }, 250)
    return () => clearTimeout(timer.current)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, open, kind, excludeKey])

  useEffect(() => {
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  const handleSelect = (item) => {
    onChange(item)
    setQuery('')
    setOpen(false)
    setResults([])
  }

  const handleClear = () => { onChange(null); setQuery(''); setResults([]) }

  const ph = placeholder || (kind === 'influencer' ? t('picker.searchInfluencer') : t('picker.searchBrand'))

  if (value) {
    const label = kind === 'influencer'
      ? (value.name || value.username || '')
      : (value.name || '')
    const sub = kind === 'influencer' && value.username ? `@${value.username}` : value.cityName || null
    return (
      <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 12px', background:'rgba(139,92,246,0.07)', border:'1px solid rgba(139,92,246,0.35)', borderRadius:10 }}>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:13, fontWeight:600, color:'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{label}</div>
          {sub && <div style={{ fontSize:11, color:'var(--text-secondary)' }}>{sub}</div>}
        </div>
        <button onClick={handleClear} type="button" style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-secondary)', padding:2, flexShrink:0 }}>
          <X size={14}/>
        </button>
      </div>
    )
  }

  return (
    <div ref={wrapRef} style={{ position:'relative' }}>
      <div style={{ position:'relative' }}>
        <Search size={13} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--text-secondary)', pointerEvents:'none' }}/>
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          placeholder={ph}
          style={{ ...INPUT_STYLE, paddingLeft:30 }}
          onFocus={e => { e.target.style.border = '1px solid rgba(139,92,246,0.6)'; setOpen(true) }}
          onBlur={e => { e.target.style.border = '1px solid rgba(139,92,246,0.25)' }}
        />
      </div>
      {open && (query.length >= 2 || results.length > 0) && (
        <div style={{ position:'absolute', left:0, right:0, top:'calc(100% + 4px)', zIndex:50, background:'var(--bg-secondary)', border:'1px solid rgba(139,92,246,0.3)', borderRadius:10, overflow:'hidden', boxShadow:'0 8px 24px rgba(0,0,0,0.3)' }}>
          {loading && (
            <div style={{ padding:'10px 14px', fontSize:12, color:'var(--text-secondary)' }}>…</div>
          )}
          {!loading && query.length < 2 && (
            <div style={{ padding:'10px 14px', fontSize:12, color:'var(--text-secondary)' }}>{t('picker.typeMore')}</div>
          )}
          {!loading && query.length >= 2 && results.length === 0 && (
            <div style={{ padding:'10px 14px', fontSize:12, color:'var(--text-secondary)' }}>{t('picker.noResults')}</div>
          )}
          {results.map(item => {
            const name = item.name || item.username || ''
            const sub  = kind === 'influencer' && item.username ? `@${item.username}` : item.cityName || null
            return (
              <button
                key={item.id}
                type="button"
                onMouseDown={() => handleSelect(item)}
                style={{ width:'100%', textAlign:'left', padding:'10px 14px', background:'none', border:'none', borderBottom:'1px solid rgba(139,92,246,0.08)', cursor:'pointer', display:'flex', flexDirection:'column', gap:1 }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(139,92,246,0.08)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
              >
                <span style={{ fontSize:13, fontWeight:600, color:'var(--text-primary)' }}>{name}</span>
                {sub && <span style={{ fontSize:11, color:'var(--text-secondary)' }}>{sub}</span>}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
