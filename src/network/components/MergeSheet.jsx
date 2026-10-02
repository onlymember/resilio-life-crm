// Fusionar dos fichas duplicadas (solo Dirección). Se elige la otra
// ficha, se ve lado a lado qué dato queda de cada una y se confirma.
// La ficha abierta es la que queda; la otra se borra y todo lo suyo
// (colaboraciones, tareas, actividad, intereses, acceso al Club) pasa acá.
import React, { useEffect, useMemo, useState } from 'react'
import { X, GitMerge, AlertTriangle } from 'lucide-react'
import { t } from '../../i18n/index.js'
import { dbGetEntityRaw, dbMergeEntities, dbGetPeopleNames } from '../../lib/database.js'
import EntityPicker from './EntityPicker.jsx'
import { quiet } from '../../lib/quiet.js'

const FIELDS = {
  influencer: ['name', 'username', 'instagram', 'whatsapp', 'email', 'phone', 'tiktok', 'followers', 'category', 'tier', 'city_id', 'relationship_status', 'owner_scouter_id', 'notes'],
  brand:      ['name', 'category_id', 'website', 'whatsapp', 'instagram', 'phone', 'email', 'city_id', 'relationship_status', 'owner_scouter_id', 'potential_value', 'notes'],
}

export default function MergeSheet({ type, keepId, cityMap = {}, onClose, onMerged }) {
  const [names, setNames] = useState({})
  const [other, setOther] = useState(null)
  const [a, setA] = useState(null)
  const [b, setB] = useState(null)
  const [take, setTake] = useState({})
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const [sure, setSure] = useState(false)

  useEffect(() => { dbGetEntityRaw(type, keepId).then(setA).catch(e => setErr(e.message)) }, [type, keepId])
  useEffect(() => {
    if (a && b) dbGetPeopleNames([a.owner_scouter_id, b.owner_scouter_id]).then(setNames).catch(quiet('MergeSheet'))
  }, [a, b])
  useEffect(() => {
    setB(null); setTake({}); setSure(false)
    if (other) dbGetEntityRaw(type, other.id).then(setB).catch(e => setErr(e.message))
  }, [other, type])

  // Solo se muestran los datos que difieren. Si la que queda no tiene un
  // dato y la otra sí, por defecto se toma el de la otra.
  const diff = useMemo(() => {
    if (!a || !b) return []
    return FIELDS[type].filter(f => (a[f] ?? '') !== (b[f] ?? '') && (b[f] ?? '') !== '')
  }, [a, b, type])
  useEffect(() => {
    if (!a || !b) return
    const init = {}
    diff.forEach(f => { init[f] = (a[f] ?? '') === '' })
    setTake(init)
  }, [diff])

  const show = (f, v) => {
    if (v == null || v === '') return <span style={{ opacity: 0.5 }}>—</span>
    if (f === 'city_id') return cityMap[v] || '…'
    if (f === 'owner_scouter_id') return names[v] || '…'
    if (f === 'relationship_status') return t(`relationship.${v}`)
    return String(v)
  }

  const merge = async () => {
    setBusy(true); setErr(null)
    try {
      await dbMergeEntities(type, keepId, other.id, Object.keys(take).filter(k => take[k]))
      onMerged?.()
    } catch (e) { setErr(e.message) }
    finally { setBusy(false) }
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 450, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 620, margin: 12, maxHeight: '88vh', overflowY: 'auto', borderRadius: 18, padding: 16, background: 'var(--bg-secondary, #16131f)', border: '1px solid var(--border-violet)', animation: 'slideUp var(--dur-base, 0.25s) ease both', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}><GitMerge size={16}/>{t('merge.title')}</div>
          <button onClick={onClose} aria-label={t('batch.close')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><X size={17}/></button>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t('merge.hint', { name: a?.name || '…' })}</div>
        <EntityPicker kind={type} value={other} onChange={setOther} excludeIds={[keepId]} placeholder={t('merge.pick')}/>

        {b && (
          diff.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t('merge.same')}</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr 1fr', gap: 8, fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                <span/><span>{t('merge.keeps')}</span><span>{t('merge.goes')}</span>
              </div>
              {diff.map(f => (
                <div key={f} style={{ display: 'grid', gridTemplateColumns: '110px 1fr 1fr', gap: 8, alignItems: 'center', fontSize: 12 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{t(`merge.field.${f}`)}</span>
                  {[false, true].map(fromOther => {
                    const on = !!take[f] === fromOther
                    return (
                      <button key={String(fromOther)} onClick={() => setTake(p => ({ ...p, [f]: fromOther }))} style={{
                        textAlign: 'left', padding: '7px 9px', borderRadius: 8, cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        background: on ? 'rgba(139,92,246,0.18)' : 'rgba(139,92,246,0.04)', border: `1px solid ${on ? 'rgba(139,92,246,0.6)' : 'var(--border-violet)'}`,
                        color: on ? 'var(--text-primary)' : 'var(--text-secondary)', fontSize: 12,
                      }}>{show(f, (fromOther ? b : a)[f])}</button>
                    )
                  })}
                </div>
              ))}
            </div>
          )
        )}

        {b && (
          <>
            <div style={{ display: 'flex', gap: 8, padding: '9px 12px', borderRadius: 10, background: 'rgba(248,113,113,0.07)', border: '1px solid rgba(248,113,113,0.3)', fontSize: 12, color: '#F87171' }}>
              <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }}/>
              <span>{t('merge.warning', { other: b.name || '—', keep: a?.name || '—' })}</span>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-primary)', cursor: 'pointer' }}>
              <input type="checkbox" checked={sure} onChange={e => setSure(e.target.checked)} style={{ accentColor: 'var(--primary-violet)', width: 16, height: 16 }}/>
              {t('merge.sure')}
            </label>
          </>
        )}
        {err && <div style={{ fontSize: 12, color: '#F87171' }}>{err}</div>}
        <button onClick={merge} disabled={!b || !sure || busy} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '11px 0', borderRadius: 10, border: 'none', fontWeight: 700, fontSize: 14, cursor: b && sure ? 'pointer' : 'default', background: b && sure ? 'var(--primary-violet)' : 'rgba(139,92,246,0.25)', color: 'white' }}>
          <GitMerge size={15}/>{busy ? t('loading.generic') : t('merge.confirm')}
        </button>
      </div>
    </div>
  )
}
