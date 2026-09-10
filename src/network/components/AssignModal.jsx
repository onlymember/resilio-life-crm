import React, { useState, useEffect } from 'react'
import { X, Search, UserCheck } from 'lucide-react'
import { t } from '../../i18n/index.js'
import { dbGetActiveScouters, dbAssignEntity } from '../../lib/database.js'

const AVATAR_COLORS = ['#8B5CF6','#EC4899','#06B6D4','#10B981','#F59E0B','#EF4444','#6366F1']
const avatarColor = (name = '') => AVATAR_COLORS[(name.charCodeAt(0) || 0) % AVATAR_COLORS.length]
const initials = (name = '') => {
  const p = name.trim().split(' ')
  return p.length >= 2 ? (p[0][0] + p[p.length-1][0]).toUpperCase() : name.slice(0,2).toUpperCase() || '?'
}

export default function AssignModal({ isOpen, onClose, entity, entityType, onAssigned }) {
  const [scouters,    setScouters]    = useState([])
  const [search,      setSearch]      = useState('')
  const [showAll,     setShowAll]     = useState(false)
  const [selected,    setSelected]    = useState(null)
  const [assigning,   setAssigning]   = useState(false)
  const [error,       setError]       = useState(null)
  const [loading,     setLoading]     = useState(false)

  useEffect(() => {
    if (!isOpen || !entity) return
    setSearch(''); setSelected(null); setError(null); setShowAll(false)
    setLoading(true)
    dbGetActiveScouters(showAll ? null : entity.cityId)
      .then(setScouters)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [isOpen, entity])

  useEffect(() => {
    if (!isOpen || !entity) return
    setLoading(true)
    dbGetActiveScouters(showAll ? null : entity.cityId)
      .then(setScouters)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [showAll])

  if (!isOpen) return null

  const filtered = scouters.filter(s =>
    !search || s.nombre.toLowerCase().includes(search.toLowerCase())
  )

  const handleConfirm = async () => {
    if (!selected || assigning) return
    setAssigning(true)
    setError(null)
    try {
      await dbAssignEntity(entityType, entity.id, selected.userId)
      if (onAssigned) onAssigned(entity.id, selected)
      onClose()
    } catch (e) {
      setError(e.message)
    } finally {
      setAssigning(false)
    }
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)', zIndex: 400 }}/>
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 401,
        background: 'var(--bg-secondary)', borderRadius: '20px 20px 0 0',
        border: '1px solid var(--border-violet)', borderBottom: 'none',
        padding: '0 20px', maxHeight: '75vh', display: 'flex', flexDirection: 'column',
        animation: 'slideUp 0.22s ease',
      }}>
        {/* Handle */}
        <div style={{ width: 36, height: 4, background: 'rgba(255,255,255,0.15)', borderRadius: 2, margin: '12px auto 16px', flexShrink: 0 }}/>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{t('network.assign')}</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{entity?.name}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
            <X size={18}/>
          </button>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 12, flexShrink: 0 }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}/>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('network.searchScouter')}
            style={{
              width: '100%', paddingLeft: 30, paddingRight: 12, paddingTop: 8, paddingBottom: 8,
              background: 'rgba(139,92,246,0.07)', border: '1px solid var(--border-violet)',
              borderRadius: 10, color: 'var(--text-primary)', fontSize: 14, outline: 'none',
            }}
          />
        </div>

        {/* City filter toggle */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexShrink: 0 }}>
          <button
            onClick={() => setShowAll(false)}
            style={{
              padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer',
              background: !showAll ? 'rgba(139,92,246,0.25)' : 'transparent',
              color: !showAll ? 'var(--primary-violet-light)' : 'var(--text-secondary)',
              border: !showAll ? '1px solid rgba(139,92,246,0.5)' : '1px solid var(--border-violet)',
            }}
          >
            {t('network.scouterCity')}
          </button>
          <button
            onClick={() => setShowAll(true)}
            style={{
              padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer',
              background: showAll ? 'rgba(139,92,246,0.25)' : 'transparent',
              color: showAll ? 'var(--primary-violet-light)' : 'var(--text-secondary)',
              border: showAll ? '1px solid rgba(139,92,246,0.5)' : '1px solid var(--border-violet)',
            }}
          >
            {t('network.allScouterss')}
          </button>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto', marginBottom: 12 }}>
          {loading ? (
            <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 12 }}>{t('loading.generic')}</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 12 }}>
              {showAll ? 'Sin scouters activos' : 'Sin scouters en esta ciudad'}
            </div>
          ) : (
            filtered.map(s => {
              const isSelected = selected?.userId === s.userId
              return (
                <button
                  key={s.userId}
                  onClick={() => setSelected(isSelected ? null : s)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 12px', borderRadius: 10, marginBottom: 6,
                    background: isSelected ? 'rgba(139,92,246,0.15)' : 'transparent',
                    border: isSelected ? '1px solid rgba(139,92,246,0.4)' : '1px solid transparent',
                    cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  <div style={{
                    width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                    background: avatarColor(s.nombre), display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'white',
                  }}>
                    {initials(s.nombre)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {s.nombre}
                    </div>
                    {s.sobrenombre && (
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{s.sobrenombre}</div>
                    )}
                  </div>
                  {isSelected && <UserCheck size={16} color="var(--primary-violet-light)"/>}
                </button>
              )
            })
          )}
        </div>

        {/* Error */}
        {error && (
          <div style={{ fontSize: 11, color: '#F87171', marginBottom: 8, flexShrink: 0 }}>{error}</div>
        )}

        {/* Confirm */}
        <div style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom, 16px))', flexShrink: 0 }}>
          <button
            onClick={handleConfirm}
            disabled={!selected || assigning}
            style={{
              width: '100%', padding: '12px 0', borderRadius: 10, fontSize: 14, fontWeight: 700,
              background: selected && !assigning ? 'var(--primary-violet)' : 'rgba(139,92,246,0.2)',
              color: selected && !assigning ? 'white' : 'var(--text-secondary)',
              border: 'none', cursor: selected && !assigning ? 'pointer' : 'default',
            }}
          >
            {assigning ? t('network.assigning') : selected ? `${t('network.assignTo')} ${selected.nombre}` : t('network.confirmAssign')}
          </button>
        </div>
      </div>
    </>
  )
}
