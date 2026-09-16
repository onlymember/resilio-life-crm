import React, { useState, useEffect } from 'react'
import { X, Search } from 'lucide-react'
import { t } from '../../i18n/index.js'
import { supabase } from '../../lib/supabase.js'
import { dbUpsertScouter } from '../../lib/database.js'

const AVATAR_COLORS = ['#8B5CF6','#EC4899','#06B6D4','#10B981','#F59E0B','#EF4444','#6366F1']
const avatarColor = (name = '') => AVATAR_COLORS[(name.charCodeAt(0)||0) % AVATAR_COLORS.length]
const initials = (name = '') => {
  const p = (name||'').trim().split(' ')
  return p.length >= 2 ? (p[0][0]+p[p.length-1][0]).toUpperCase() : (name||'').slice(0,2).toUpperCase() || '?'
}

// Fetch approved profiles + active roles + existing scouters, filter client-side.
// Simplificación documentada en DATA-LAYER.md: si hubiera miles de usuarios
// se reemplaza por una RPC. Por ahora las tres tablas tienen decenas de filas.
const loadCandidates = async () => {
  const [{ data: profiles }, { data: roles }, { data: scouters }] = await Promise.all([
    supabase.from('profiles').select('id, nombre, sobrenombre, email').eq('estado', 'aprobado'),
    supabase.from('user_roles').select('user_id').is('revoked_at', null),
    supabase.from('scouters').select('user_id, city_id, status, level'),
  ])
  const activeRoleIds = new Set((roles || []).map(r => r.user_id))
  const scouterMap   = Object.fromEntries((scouters || []).map(s => [s.user_id, s]))

  const newCandidates     = (profiles || []).filter(p => !activeRoleIds.has(p.id) && !scouterMap[p.id])
  const existingScouters  = (profiles || []).filter(p => scouterMap[p.id])

  return { newCandidates, existingScouters, scouterMap }
}

export default function ScouterModal({ isOpen, onClose, cities = [], onSaved }) {
  const [candidates,  setCandidates]  = useState({ newCandidates: [], existingScouters: [], scouterMap: {} })
  const [search,      setSearch]      = useState('')
  const [selected,    setSelected]    = useState(null)
  const [cityId,      setCityId]      = useState('')
  const [level,       setLevel]       = useState(1)
  const [status,      setStatus]      = useState('active')
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState(null)
  const [loading,     setLoading]     = useState(false)

  useEffect(() => {
    if (!isOpen) return
    setSearch(''); setSelected(null); setCityId(''); setLevel(1); setStatus('active'); setError(null)
    setLoading(true)
    loadCandidates().then(setCandidates).catch(e => setError(e.message)).finally(() => setLoading(false))
  }, [isOpen])

  // When existing scouter selected, pre-fill their current city+level+status
  useEffect(() => {
    if (!selected) return
    const sc = candidates.scouterMap[selected.id]
    if (sc) {
      if (sc.city_id) setCityId(sc.city_id)
      if (sc.level)   setLevel(sc.level)
      if (sc.status)  setStatus(sc.status)
    }
  }, [selected])

  if (!isOpen) return null

  const isExisting = selected && !!candidates.scouterMap[selected.id]
  const isCityChange = isExisting && candidates.scouterMap[selected.id]?.city_id !== cityId && !!cityId

  const allUsers = [
    ...candidates.newCandidates.map(u => ({ ...u, _group: 'new' })),
    ...candidates.existingScouters.map(u => ({ ...u, _group: 'existing' })),
  ]
  const filtered = allUsers.filter(u => {
    if (!search) return true
    const q = search.toLowerCase()
    return (u.nombre||'').toLowerCase().includes(q) || (u.email||'').toLowerCase().includes(q)
  })

  const newGroup      = filtered.filter(u => u._group === 'new')
  const existingGroup = filtered.filter(u => u._group === 'existing')

  const canSubmit = selected && cityId && !saving

  const handleSave = async () => {
    if (!canSubmit) return
    setSaving(true); setError(null)
    try {
      await dbUpsertScouter({ userId: selected.id, cityId, level, status })
      if (onSaved) onSaved()
      onClose()
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const userRow = (u) => {
    const sel = selected?.id === u.id
    return (
      <button
        key={u.id}
        onClick={() => setSelected(sel ? null : u)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 10,
          padding: '8px 12px', borderRadius: 8, marginBottom: 4,
          background: sel ? 'rgba(139,92,246,0.15)' : 'transparent',
          border: sel ? '1px solid rgba(139,92,246,0.4)' : '1px solid transparent',
          cursor: 'pointer', textAlign: 'left',
        }}
      >
        <div style={{ width:28, height:28, borderRadius:'50%', flexShrink:0, background:avatarColor(u.nombre), display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, color:'white' }}>
          {initials(u.nombre)}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:12, fontWeight:600, color:'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{u.nombre || u.email}</div>
          <div style={{ fontSize:10, color:'var(--text-secondary)' }}>{u.email}</div>
        </div>
      </button>
    )
  }

  const groupLabel = (label) => (
    <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: 1, textTransform: 'uppercase', padding: '8px 12px 4px', opacity: 0.7 }}>
      {label}
    </div>
  )

  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', backdropFilter:'blur(8px)', zIndex:400 }}/>
      <div style={{
        position:'fixed', bottom:0, left:0, right:0, zIndex:401,
        background:'var(--bg-secondary)', borderRadius:'20px 20px 0 0',
        border:'1px solid var(--border-violet)', borderBottom:'none',
        padding:'0 20px', maxHeight:'85vh', display:'flex', flexDirection:'column',
        animation:'slideUp 0.22s ease',
      }}>
        <div style={{ width:36, height:4, background:'rgba(255,255,255,0.15)', borderRadius:2, margin:'12px auto 16px', flexShrink:0 }}/>

        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16, flexShrink:0 }}>
          <div style={{ fontSize:15, fontWeight:700, color:'var(--text-primary)' }}>
            {isExisting ? t('scouter.editCity') : t('scouter.create')}
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-secondary)' }}><X size={18}/></button>
        </div>

        {/* Search users */}
        <div style={{ position:'relative', marginBottom:10, flexShrink:0 }}>
          <Search size={13} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--text-secondary)' }}/>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder={t('scouter.userSearch')}
            style={{ width:'100%', paddingLeft:30, paddingRight:12, paddingTop:7, paddingBottom:7, background:'rgba(139,92,246,0.07)', border:'1px solid var(--border-violet)', borderRadius:10, color:'var(--text-primary)', fontSize:13, outline:'none' }}
          />
        </div>

        {/* User list */}
        <div style={{ flex:1, overflowY:'auto', marginBottom:10 }}>
          {loading ? (
            <div style={{ padding:'20px 0', textAlign:'center', color:'var(--text-secondary)', fontSize:12 }}>{t('loading.generic')}</div>
          ) : (
            <>
              {newGroup.length > 0 && (
                <>
                  {groupLabel(t('scouter.groups.new'))}
                  {newGroup.map(userRow)}
                </>
              )}
              {existingGroup.length > 0 && (
                <>
                  {groupLabel(t('scouter.groups.existing'))}
                  {existingGroup.map(userRow)}
                </>
              )}
              {filtered.length === 0 && (
                <div style={{ padding:'20px 0', textAlign:'center', color:'var(--text-secondary)', fontSize:12 }}>{t('scouter.noUsers')}</div>
              )}
            </>
          )}
        </div>

        {/* City + config */}
        {selected && (
          <div style={{ flexShrink:0, borderTop:'1px solid var(--border-violet)', paddingTop:12, marginBottom:10 }}>
            {isCityChange && (
              <div style={{ fontSize:11, color:'#FBBF24', background:'rgba(251,191,36,0.08)', border:'1px solid rgba(251,191,36,0.3)', borderRadius:8, padding:'8px 12px', marginBottom:10 }}>
                ⚠ {t('scouter.cityChangeWarning')}
              </div>
            )}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 70px 1fr', gap:8 }}>
              <div>
                <label style={{ fontSize:10, color:'var(--text-secondary)', display:'block', marginBottom:4 }}>{t('form.selectCity')} *</label>
                <select
                  value={cityId} onChange={e => setCityId(e.target.value)}
                  style={{ width:'100%', padding:'7px 10px', borderRadius:8, background:'rgba(139,92,246,0.07)', border:'1px solid var(--border-violet)', color:'var(--text-primary)', fontSize:12, outline:'none' }}
                >
                  <option value="">—</option>
                  {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize:10, color:'var(--text-secondary)', display:'block', marginBottom:4 }}>{t('scouter.level')}</label>
                <input
                  type="number" min={1} max={5} value={level}
                  onChange={e => setLevel(Number(e.target.value))}
                  style={{ width:'100%', padding:'7px 10px', borderRadius:8, background:'rgba(139,92,246,0.07)', border:'1px solid var(--border-violet)', color:'var(--text-primary)', fontSize:12, outline:'none' }}
                />
              </div>
              <div>
                <label style={{ fontSize:10, color:'var(--text-secondary)', display:'block', marginBottom:4 }}>{t('scouter.status')}</label>
                <select
                  value={status} onChange={e => setStatus(e.target.value)}
                  style={{ width:'100%', padding:'7px 10px', borderRadius:8, background:'rgba(139,92,246,0.07)', border:'1px solid var(--border-violet)', color:'var(--text-primary)', fontSize:12, outline:'none' }}
                >
                  {['active','inactive','suspended'].map(s => (
                    <option key={s} value={s}>{t(`scouter.statuses.${s}`)}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {error && <div style={{ fontSize:11, color:'#F87171', marginBottom:8, flexShrink:0 }}>{error}</div>}

        <div style={{ paddingBottom:'max(16px,env(safe-area-inset-bottom,16px))', flexShrink:0 }}>
          <button
            onClick={handleSave} disabled={!canSubmit}
            style={{
              width:'100%', padding:'12px 0', borderRadius:10, fontSize:14, fontWeight:700,
              background: canSubmit ? 'var(--primary-violet)' : 'rgba(139,92,246,0.2)',
              color: canSubmit ? 'white' : 'var(--text-secondary)',
              border:'none', cursor: canSubmit ? 'pointer' : 'default',
            }}
          >
            {saving ? t('scouter.saving') : t('form.save')}
          </button>
        </div>
      </div>
    </>
  )
}
