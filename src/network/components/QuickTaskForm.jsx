// "+" → Tarea, escribiendo en lenguaje natural. Se ve en vivo qué
// entendió (fecha, hora, a quién) y se puede corregir antes de guardar.
import React, { useEffect, useMemo, useState } from 'react'
import { CalendarDays, Clock, Link2, Check } from 'lucide-react'
import { t } from '../../i18n/index.js'
import { dbSaveTask, dbGetInfluencers, dbGetBrands } from '../../lib/database.js'
import { parseQuickTask } from '../utils/quickTask.js'
import { useTz } from '../utils/tz.js'
import { datetimeLocalToIso } from '../utils/date.js'

const input = { width: '100%', background: 'rgba(139,92,246,0.07)', border: '1px solid rgba(139,92,246,0.25)', borderRadius: 10, padding: '12px 14px', color: 'var(--text-primary)', fontSize: 16, outline: 'none' }
const small = { background: 'rgba(139,92,246,0.07)', border: '1px solid rgba(139,92,246,0.25)', borderRadius: 8, padding: '6px 8px', color: 'var(--text-primary)', fontSize: 14 }

export default function QuickTaskForm({ currentUser, onDone }) {
  const tz = useTz()
  const [text, setText] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [touched, setTouched] = useState({})   // fecha/hora editadas a mano no se pisan
  const [matches, setMatches] = useState([])
  const [link, setLink] = useState(null)       // { type, id, name }
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  const parsed = useMemo(() => parseQuickTask(text), [text])
  useEffect(() => {
    if (!touched.date) setDate(parsed.date || '')
    if (!touched.time) setTime(parsed.time || '')
  }, [parsed.date, parsed.time])

  // Busca a quién va: influencers y marcas con ese nombre.
  useEffect(() => {
    setMatches([])
    if (!parsed.who || parsed.who.length < 2) return
    const id = setTimeout(async () => {
      const [i, b] = await Promise.all([
        dbGetInfluencers({ search: parsed.who, pageSize: 3 }).catch(() => ({ rows: [] })),
        dbGetBrands({ search: parsed.who, pageSize: 3 }).catch(() => ({ rows: [] })),
      ])
      const list = [
        ...i.rows.map(r => ({ type: 'influencer', id: r.id, name: r.name || r.username })),
        ...b.rows.map(r => ({ type: 'brand', id: r.id, name: r.name })),
      ]
      setMatches(list)
      setLink(prev => prev && list.some(x => x.id === prev.id) ? prev : (list.length === 1 ? list[0] : null))
    }, 300)
    return () => clearTimeout(id)
  }, [parsed.who])

  const save = async () => {
    if (!parsed.title || busy) return
    setBusy(true); setErr(null)
    try {
      await dbSaveTask({
        title: parsed.title,
        dueDate: date ? datetimeLocalToIso(`${date}T${time || '10:00'}`, tz) : null,
        entityType: link?.type || null,
        entityId: link?.id || null,
        assignedTo: currentUser?.id || null,
      }, currentUser?.id)
      onDone?.()
    } catch (e) { setErr(e.message) }
    finally { setBusy(false) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <input autoFocus value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && save()}
        placeholder={t('quickTask.placeholder')} aria-label={t('quickTask.placeholder')} style={input}/>
      <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{t('quickTask.hint')}</div>

      {text.trim() && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 12, borderRadius: 12, background: 'rgba(139,92,246,0.05)', border: '1px solid var(--border-violet)' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{parsed.title || '—'}</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <CalendarDays size={14} color="var(--text-secondary)"/>
            <input type="date" value={date} onChange={e => { setDate(e.target.value); setTouched(p => ({ ...p, date: true })) }} style={small} aria-label={t('quickTask.date')}/>
            <Clock size={14} color="var(--text-secondary)"/>
            <input type="time" value={time} onChange={e => { setTime(e.target.value); setTouched(p => ({ ...p, time: true })) }} style={small} aria-label={t('quickTask.time')}/>
          </div>
          {matches.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              <Link2 size={14} color="var(--text-secondary)"/>
              {matches.map(m => {
                const on = link?.id === m.id
                return (
                  <button key={m.id} onClick={() => setLink(on ? null : m)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
                    background: on ? 'rgba(139,92,246,0.25)' : 'rgba(139,92,246,0.07)', color: on ? 'var(--primary-violet-light)' : 'var(--text-secondary)',
                    border: on ? '1px solid rgba(139,92,246,0.5)' : '1px solid var(--border-violet)' }}>
                    {on && <Check size={11}/>}{m.name} · {t(`quickTask.type.${m.type}`)}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {err && <div style={{ fontSize: 12, color: '#F87171' }}>{err}</div>}
      <button onClick={save} disabled={!parsed.title || busy} style={{ padding: '12px 0', borderRadius: 10, border: 'none', fontSize: 14, fontWeight: 700, cursor: parsed.title ? 'pointer' : 'default', background: parsed.title ? 'var(--primary-violet)' : 'rgba(139,92,246,0.25)', color: 'white' }}>
        {busy ? t('loading.generic') : t('quickTask.save')}
      </button>
    </div>
  )
}
