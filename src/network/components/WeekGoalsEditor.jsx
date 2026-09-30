// Command Center · Objetivos de la semana por scouter (Dirección).
// Una grilla scouter × métrica para la semana actual. Si la semana está
// vacía se sugieren los números de la anterior (hay que guardar igual).
import React, { useEffect, useState } from 'react'
import { Target, Copy } from 'lucide-react'
import { t } from '../../i18n/index.js'
import { dbGetActiveScouters, dbGetWeekGoals, dbSaveWeekGoals, WEEKLY_METRICS, weekStart } from '../../lib/database.js'
import { personName } from '../utils/people.js'
import { toast } from './Toaster.jsx'

const cellInput = { width: 56, padding: '5px 6px', borderRadius: 7, textAlign: 'center', background: 'rgba(139,92,246,0.07)', border: '1px solid var(--border-violet)', color: 'var(--text-primary)', fontSize: 14 }

export default function WeekGoalsEditor({ SectionTitle }) {
  const [scouters, setScouters] = useState([])
  const [goals, setGoals] = useState([])          // semana actual (con progreso)
  const [vals, setVals] = useState({})            // `${user}|${metric}` → número
  const [lastWeek, setLastWeek] = useState({})
  const [busy, setBusy] = useState(false)
  const [open, setOpen] = useState(false)

  const load = async () => {
    const prevStart = weekStart(); prevStart.setDate(prevStart.getDate() - 7)
    const [sc, cur, prev] = await Promise.all([dbGetActiveScouters(null), dbGetWeekGoals(), dbGetWeekGoals(prevStart)])
    setScouters(sc.sort((a, b) => personName(a).localeCompare(personName(b))))
    setGoals(cur)
    const m = {}; cur.forEach(g => { m[`${g.assignedTo}|${g.metric}`] = Number(g.target) })
    const p = {}; prev.forEach(g => { p[`${g.assignedTo}|${g.metric}`] = Number(g.target) })
    setVals(m); setLastWeek(p)
  }
  useEffect(() => { load().catch(e => toast(e.message)) }, [])

  const progress = Object.fromEntries(goals.map(g => [`${g.assignedTo}|${g.metric}`, Number(g.currentProgress) || 0]))

  const save = async () => {
    setBusy(true)
    try {
      const rows = scouters.flatMap(s => WEEKLY_METRICS.map(m => ({ assignedTo: s.userId, metric: m, target: vals[`${s.userId}|${m}`] || 0 })))
      await dbSaveWeekGoals(rows)
      await load()
      toast(t('goals.saved'))
    } catch (e) { toast(e.message) }
    finally { setBusy(false) }
  }

  const ws = weekStart()
  const we = new Date(ws); we.setDate(we.getDate() + 6)
  const fmt = (d) => d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })

  return (
    <section>
      <SectionTitle action={
        <button onClick={() => setOpen(o => !o)} style={{ fontSize: 11, fontWeight: 600, color: 'var(--primary-violet-light)', background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 8, padding: '4px 10px', cursor: 'pointer' }}>
          {open ? t('goals.close') : t('goals.edit')}
        </button>
      }>{t('goals.weekTitle')} · {fmt(ws)}–{fmt(we)}</SectionTitle>

      {!open ? (
        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
          {goals.length ? t('goals.summary', { n: new Set(goals.map(g => g.assignedTo)).size }) : t('goals.empty')}
        </div>
      ) : (
        <>
          {goals.length === 0 && Object.keys(lastWeek).length > 0 && (
            <button onClick={() => setVals(lastWeek)} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, marginBottom: 10, padding: '5px 10px', borderRadius: 8, cursor: 'pointer', background: 'rgba(139,92,246,0.08)', border: '1px solid var(--border-violet)', color: 'var(--text-secondary)' }}>
              <Copy size={12}/>{t('goals.copyLast')}
            </button>
          )}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 12, minWidth: 460 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', fontSize: 9, color: 'var(--text-secondary)', textTransform: 'uppercase', padding: 6 }}>{t('intake.filter.scouter')}</th>
                  {WEEKLY_METRICS.map(m => <th key={m} style={{ fontSize: 9, color: 'var(--text-secondary)', fontWeight: 600, padding: 6 }}>{t(`goals.metric.${m}`)}</th>)}
                </tr>
              </thead>
              <tbody>
                {scouters.map(s => (
                  <tr key={s.userId} style={{ borderTop: '1px solid var(--border-violet)' }}>
                    <td style={{ padding: 6, color: 'var(--text-primary)', fontWeight: 600, whiteSpace: 'nowrap' }}>{personName(s)}</td>
                    {WEEKLY_METRICS.map(m => {
                      const k = `${s.userId}|${m}`
                      return (
                        <td key={m} style={{ padding: 6, textAlign: 'center' }}>
                          <input type="number" min="0" inputMode="numeric" aria-label={`${personName(s)} ${t(`goals.metric.${m}`)}`}
                            value={vals[k] ?? ''} onChange={e => setVals(v => ({ ...v, [k]: e.target.value === '' ? '' : Math.max(0, Number(e.target.value)) }))} style={cellInput}/>
                          {k in progress && <div style={{ fontSize: 9, color: 'var(--text-secondary)', marginTop: 2 }}>{t('goals.done', { n: progress[k] })}</div>}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button onClick={save} disabled={busy} style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, padding: '9px 16px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'var(--primary-violet)', color: 'white', fontWeight: 700, fontSize: 13 }}>
            <Target size={14}/>{busy ? t('loading.generic') : t('goals.save')}
          </button>
        </>
      )}
    </section>
  )
}
