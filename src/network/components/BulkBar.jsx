import React, { useState, useEffect } from 'react'
import { X, Search, UserCheck } from 'lucide-react'
import { t } from '../../i18n/index.js'
import { personName } from '../utils/people.js'
import { dbGetActiveScouters, dbAssignBulk } from '../../lib/database.js'

const AVATAR_COLORS = ['#8B5CF6','#EC4899','#06B6D4','#10B981','#F59E0B','#EF4444','#6366F1']
const avatarColor = (name = '') => AVATAR_COLORS[(name.charCodeAt(0)||0) % AVATAR_COLORS.length]
const initials = (name = '') => {
  const p = (name||'').trim().split(' ')
  return p.length >= 2 ? (p[0][0]+p[p.length-1][0]).toUpperCase() : (name||'').slice(0,2).toUpperCase() || '?'
}

// State machine: idle → picking → warning → assigning → done
export default function BulkBar({ selected, rows, entityType, onClear, onRefresh }) {
  const [phase,       setPhase]       = useState('idle')
  const [scouters,    setScouters]    = useState([])
  const [scouterSearch, setScouterSearch] = useState('')
  const [pickedScouter, setPickedScouter] = useState(null)
  const [mismatchCount, setMismatchCount] = useState(0)
  const [progress,    setProgress]    = useState({ done: 0, total: 0 })
  const [results,     setResults]     = useState([])
  const [scouterLoading, setScouterLoading] = useState(false)

  const count = selected.size

  useEffect(() => {
    if (count === 0) { setPhase('idle'); setPickedScouter(null); setResults([]) }
  }, [count])

  const openPicker = () => {
    setScouterSearch(''); setPickedScouter(null); setScouterLoading(true)
    setPhase('picking')
    dbGetActiveScouters(null)
      .then(setScouters)
      .catch(() => {})
      .finally(() => setScouterLoading(false))
  }

  const handlePickScouter = (sc) => {
    const selectedRows = rows.filter(r => selected.has(r.id))
    const mismatches = selectedRows.filter(r => r.cityId && r.cityId !== sc.cityId).length
    setPickedScouter(sc)
    setMismatchCount(mismatches)
    if (mismatches > 0) {
      setPhase('warning')
    } else {
      runBulk(sc)
    }
  }

  const runBulk = async (sc) => {
    const target = sc || pickedScouter
    const ids = [...selected]
    setPhase('assigning')
    setProgress({ done: 0, total: ids.length })
    try {
      const res = await dbAssignBulk(
        entityType, ids, target.userId, null,
        (done, total) => setProgress({ done, total }),
      )
      setResults(res)
      setPhase('done')
      if (onRefresh) onRefresh()
    } catch (e) {
      setResults([{ entityId: null, ok: false, error: e.message }])
      setPhase('done')
    }
  }

  const handleClose = () => {
    setPhase('idle'); setResults([])
    onClear()
  }

  const filteredScouters = scouters.filter(s =>
    !scouterSearch || personName(s).toLowerCase().includes(scouterSearch.toLowerCase())
  )

  const failed  = results.filter(r => !r.ok)
  const okCount = results.filter(r => r.ok).length

  if (count === 0 && phase === 'idle') return null

  // ── Picking sheet ───────────────────────────────────────────
  if (phase === 'picking') {
    return (
      <>
        <div onClick={() => setPhase('idle')} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', backdropFilter:'blur(8px)', zIndex:500 }}/>
        <div style={{ position:'fixed', bottom:0, left:0, right:0, zIndex:501, background:'var(--bg-secondary)', borderRadius:'20px 20px 0 0', border:'1px solid var(--border-violet)', borderBottom:'none', padding:'0 20px', maxHeight:'70vh', display:'flex', flexDirection:'column', animation:'slideUp 0.22s ease' }}>
          <div style={{ width:36, height:4, background:'rgba(255,255,255,0.15)', borderRadius:2, margin:'12px auto 14px', flexShrink:0 }}/>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12, flexShrink:0 }}>
            <div style={{ fontSize:14, fontWeight:700, color:'var(--text-primary)' }}>
              {t('bulk.pickScouter')} <span style={{ fontSize:12, color:'var(--text-secondary)', fontWeight:400 }}>({t('bulk.selected', { n: count })})</span>
            </div>
            <button onClick={() => setPhase('idle')} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-secondary)' }}><X size={16}/></button>
          </div>
          <div style={{ position:'relative', marginBottom:10, flexShrink:0 }}>
            <Search size={13} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--text-secondary)' }}/>
            <input value={scouterSearch} onChange={e => setScouterSearch(e.target.value)}
              placeholder={t('network.searchScouter')}
              style={{ width:'100%', paddingLeft:30, paddingRight:12, paddingTop:7, paddingBottom:7, background:'rgba(139,92,246,0.07)', border:'1px solid var(--border-violet)', borderRadius:10, color:'var(--text-primary)', fontSize:13, outline:'none' }}
            />
          </div>
          <div style={{ flex:1, overflowY:'auto', marginBottom:12 }}>
            {scouterLoading
              ? <div style={{ padding:'20px 0', textAlign:'center', color:'var(--text-secondary)', fontSize:12 }}>{t('loading.generic')}</div>
              : filteredScouters.map(s => (
                <button key={s.userId} onClick={() => handlePickScouter(s)}
                  style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'9px 12px', borderRadius:9, marginBottom:4, background:'transparent', border:'1px solid transparent', cursor:'pointer', textAlign:'left' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(139,92,246,0.08)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                >
                  <div style={{ width:30, height:30, borderRadius:'50%', flexShrink:0, background:avatarColor(personName(s)), display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:'white' }}>
                    {initials(personName(s))}
                  </div>
                  <div>
                    <div style={{ fontSize:13, fontWeight:600, color:'var(--text-primary)' }}>{personName(s)}</div>
                    <div style={{ fontSize:10, color:'var(--text-secondary)' }}>{s.sobrenombre || s.email}</div>
                  </div>
                </button>
              ))
            }
          </div>
        </div>
      </>
    )
  }

  // ── Warning sheet ────────────────────────────────────────────
  if (phase === 'warning') {
    return (
      <>
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', backdropFilter:'blur(8px)', zIndex:500 }}/>
        <div style={{ position:'fixed', bottom:0, left:0, right:0, zIndex:501, background:'var(--bg-secondary)', borderRadius:'20px 20px 0 0', border:'1px solid var(--border-violet)', borderBottom:'none', padding:'20px 20px', display:'flex', flexDirection:'column', gap:14, animation:'slideUp 0.22s ease' }}>
          <div style={{ fontSize:14, fontWeight:700, color:'#FBBF24' }}>⚠ {t('bulk.cityMismatch', { n: mismatchCount, scouter: pickedScouter ? personName(pickedScouter) : '' })}</div>
          <div style={{ display:'flex', gap:10 }}>
            <button onClick={() => setPhase('picking')} style={{ flex:1, padding:'11px', borderRadius:10, border:'1px solid var(--border-violet)', background:'transparent', color:'var(--text-secondary)', fontSize:13, cursor:'pointer' }}>
              {t('bulk.cancel')}
            </button>
            <button onClick={() => runBulk(pickedScouter)} style={{ flex:1, padding:'11px', borderRadius:10, border:'none', background:'var(--primary-violet)', color:'white', fontSize:13, fontWeight:700, cursor:'pointer' }}>
              {t('bulk.confirm')}
            </button>
          </div>
        </div>
      </>
    )
  }

  // ── Assigning progress ───────────────────────────────────────
  if (phase === 'assigning') {
    return (
      <div style={{ position:'fixed', bottom:0, left:0, right:0, zIndex:500, background:'var(--bg-secondary)', borderTop:'1px solid var(--border-violet)', padding:'14px 20px', display:'flex', alignItems:'center', gap:12 }}>
        <div style={{ flex:1, height:6, borderRadius:3, background:'rgba(139,92,246,0.15)', overflow:'hidden' }}>
          <div style={{ height:'100%', borderRadius:3, background:'var(--primary-violet)', width: progress.total ? `${(progress.done/progress.total)*100}%` : '0%', transition:'width 0.3s' }}/>
        </div>
        <span style={{ fontSize:12, color:'var(--text-secondary)', flexShrink:0 }}>
          {t('bulk.assigning', { done: progress.done, total: progress.total })}
        </span>
      </div>
    )
  }

  // ── Result panel ─────────────────────────────────────────────
  if (phase === 'done') {
    return (
      <>
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', backdropFilter:'blur(8px)', zIndex:500 }}/>
        <div style={{ position:'fixed', bottom:0, left:0, right:0, zIndex:501, background:'var(--bg-secondary)', borderRadius:'20px 20px 0 0', border:'1px solid var(--border-violet)', borderBottom:'none', padding:'20px 20px', maxHeight:'60vh', display:'flex', flexDirection:'column', gap:12, animation:'slideUp 0.22s ease' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div style={{ fontSize:14, fontWeight:700, color:'var(--text-primary)' }}>{t('bulk.resultTitle')}</div>
            <button onClick={handleClose} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-secondary)' }}><X size={16}/></button>
          </div>

          <div style={{ display:'flex', gap:12 }}>
            <div style={{ flex:1, padding:'10px', borderRadius:8, background:'rgba(16,185,129,0.08)', border:'1px solid rgba(16,185,129,0.25)', textAlign:'center' }}>
              <div style={{ fontSize:20, fontWeight:800, color:'#10B981' }}>{okCount}</div>
              <div style={{ fontSize:11, color:'var(--text-secondary)' }}>{t('bulk.resultOk', { n: '' }).replace('{n}','').trim()}</div>
            </div>
            {failed.length > 0 && (
              <div style={{ flex:1, padding:'10px', borderRadius:8, background:'rgba(248,113,113,0.08)', border:'1px solid rgba(248,113,113,0.25)', textAlign:'center' }}>
                <div style={{ fontSize:20, fontWeight:800, color:'#F87171' }}>{failed.length}</div>
                <div style={{ fontSize:11, color:'var(--text-secondary)' }}>{t('bulk.resultFailed', { n: '' }).replace('{n}','').trim()}</div>
              </div>
            )}
          </div>

          {failed.length > 0 && (
            <div style={{ flex:1, overflowY:'auto' }}>
              {failed.map((r, i) => (
                <div key={i} style={{ fontSize:11, color:'#F87171', padding:'6px 0', borderBottom:'1px solid rgba(248,113,113,0.15)' }}>
                  {r.entityId || '—'}: {r.error || 'Error desconocido'}
                </div>
              ))}
            </div>
          )}

          <button
            onClick={handleClose}
            style={{ padding:'11px', borderRadius:10, border:'none', background:'var(--primary-violet)', color:'white', fontSize:13, fontWeight:700, cursor:'pointer' }}
          >
            {t('bulk.close')}
          </button>
        </div>
      </>
    )
  }

  // ── Idle bar ─────────────────────────────────────────────────
  return (
    <div style={{ position:'fixed', bottom:0, left:0, right:0, zIndex:400, background:'var(--bg-secondary)', borderTop:'1px solid var(--border-violet)', padding:'12px 20px', display:'flex', alignItems:'center', gap:12, boxShadow:'0 -4px 24px rgba(139,92,246,0.12)' }}>
      <UserCheck size={16} style={{ color:'var(--primary-violet-light)', flexShrink:0 }}/>
      <span style={{ flex:1, fontSize:13, color:'var(--text-primary)', fontWeight:600 }}>
        {t('bulk.selected', { n: count })}
      </span>
      <button onClick={onClear} style={{ padding:'6px 12px', borderRadius:8, border:'1px solid var(--border-violet)', background:'transparent', color:'var(--text-secondary)', fontSize:12, cursor:'pointer' }}>
        {t('bulk.clear')}
      </button>
      <button onClick={openPicker} style={{ padding:'7px 16px', borderRadius:8, border:'none', background:'var(--primary-violet)', color:'white', fontSize:12, fontWeight:700, cursor:'pointer' }}>
        {t('bulk.assign')}
      </button>
    </div>
  )
}
