import React, { useState, useEffect, useCallback } from 'react'
import { Plus, CheckSquare, X } from 'lucide-react'
import TaskRow from '../components/TaskRow.jsx'
import EmptyState from '../components/EmptyState.jsx'
import { t } from '../../i18n/index.js'
import { dbGetTasks, dbCompleteTask, dbSaveTask } from '../../lib/database.js'

const PAGE_SIZE = 100

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
const addDays    = (d, n) => new Date(d.getTime() + n * 86400000)

function groupTasks(rows) {
  const today   = startOfDay(new Date())
  const weekEnd = startOfDay(addDays(today, 7))
  const overdue = [], todayG = [], week = [], later = []
  for (const t of rows) {
    if (t.isOverdue) { overdue.push(t); continue }
    if (!t.dueDate)  { later.push(t);   continue }
    const d = startOfDay(new Date(t.dueDate))
    if (d <= today)   todayG.push(t)
    else if (d < weekEnd) week.push(t)
    else later.push(t)
  }
  return [
    { key: 'overdue', label: t('task.groups.overdue'), items: overdue, accent: '#F87171' },
    { key: 'today',   label: t('task.groups.today'),   items: todayG,  accent: '#FBBF24' },
    { key: 'week',    label: t('task.groups.week'),     items: week,    accent: 'var(--primary-violet-light)' },
    { key: 'later',   label: t('task.groups.later'),    items: later,   accent: 'var(--text-secondary)' },
  ].filter(g => g.items.length > 0)
}

const PRIORITY_OPTS = ['urgent', 'high', 'normal', 'low']

export default function TasksPage({ currentUser }) {
  const [rows,    setRows]    = useState([])
  const [total,   setTotal]   = useState(0)
  const [loading, setLoading] = useState(true)
  const [filterPriority, setFilterPriority] = useState('')

  // Create form
  const [creating,  setCreating]  = useState(false)
  const [newTitle,  setNewTitle]  = useState('')
  const [newDue,    setNewDue]    = useState('')
  const [newPrio,   setNewPrio]   = useState('normal')
  const [saving,    setSaving]    = useState(false)
  const [saveError, setSaveError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await dbGetTasks({
        page: 0, pageSize: PAGE_SIZE,
        status: 'todo',
        ...(filterPriority ? { orderBy: 'priority' } : {}),
      })
      const filtered = filterPriority
        ? res.rows.filter(r => r.priority === filterPriority)
        : res.rows
      setRows(filtered)
      setTotal(res.total)
    } catch(e) { console.error('TasksPage:', e.message) }
    finally { setLoading(false) }
  }, [filterPriority])

  useEffect(() => { load() }, [load])

  const handleComplete = useCallback(async (id) => {
    await dbCompleteTask(id)
    setRows(prev => prev.filter(r => r.id !== id))
    setTotal(prev => Math.max(0, prev - 1))
  }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!newTitle.trim()) return
    setSaving(true)
    setSaveError(null)
    try {
      const saved = await dbSaveTask({
        title:    newTitle.trim(),
        dueDate:  newDue || null,
        priority: newPrio,
        status:   'todo',
        assignedTo: currentUser?.id || null,
      }, currentUser?.id)
      setRows(prev => [saved, ...prev])
      setTotal(prev => prev + 1)
      setNewTitle(''); setNewDue(''); setNewPrio('normal')
      setCreating(false)
    } catch(e) {
      setSaveError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const groups = groupTasks(rows)

  return (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 680 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>{t('pages.tasks.title')}</h1>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            {total > 0 ? t('task.pending', { n: total }) : t('pages.tasks.subtitle')}
          </p>
        </div>
        <button
          onClick={() => setCreating(p => !p)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px',
            borderRadius: 10, fontSize: 12, fontWeight: 600,
            background: creating ? 'rgba(139,92,246,0.2)' : 'rgba(139,92,246,0.1)',
            color: 'var(--primary-violet-light)', border: '1px solid var(--border-violet)', cursor: 'pointer',
          }}
        >
          {creating ? <X size={14}/> : <Plus size={14}/>}{t('task.create')}
        </button>
      </div>

      {/* Inline create form */}
      {creating && (
        <form onSubmit={handleCreate} style={{ padding: '14px', background: 'var(--glass-bg)', border: '1px solid var(--border-violet)', borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input
            autoFocus
            placeholder={t('pages.tasks.title')}
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            style={{
              width: '100%', padding: '8px 12px', borderRadius: 8, fontSize: 13,
              background: 'rgba(139,92,246,0.08)', border: '1px solid var(--border-violet)',
              color: 'var(--text-primary)',
            }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="date"
              value={newDue}
              onChange={e => setNewDue(e.target.value)}
              style={{
                flex: 1, padding: '7px 10px', borderRadius: 8, fontSize: 12,
                background: 'rgba(139,92,246,0.08)', border: '1px solid var(--border-violet)',
                color: 'var(--text-primary)', colorScheme: 'dark',
              }}
            />
            <select
              value={newPrio}
              onChange={e => setNewPrio(e.target.value)}
              style={{
                flex: 1, padding: '7px 10px', borderRadius: 8, fontSize: 12,
                background: 'rgba(139,92,246,0.08)', border: '1px solid var(--border-violet)',
                color: 'var(--text-primary)',
              }}
            >
              {PRIORITY_OPTS.map(p => <option key={p} value={p}>{t(`task.priorities.${p}`)}</option>)}
            </select>
          </div>
          {saveError && <div style={{ fontSize: 11, color: '#F87171' }}>{saveError}</div>}
          <button
            type="submit"
            disabled={saving || !newTitle.trim()}
            style={{
              padding: '8px 0', borderRadius: 8, fontSize: 13, fontWeight: 600,
              background: saving ? 'rgba(139,92,246,0.3)' : 'var(--primary-violet)',
              color: 'white', border: 'none', cursor: saving ? 'default' : 'pointer',
            }}
          >
            {saving ? t('task.saving') : t('form.save')}
          </button>
        </form>
      )}

      {/* Filter chips */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {(['', ...PRIORITY_OPTS]).map(p => (
          <button
            key={p}
            onClick={() => setFilterPriority(p)}
            style={{
              padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer',
              background: filterPriority === p ? 'rgba(139,92,246,0.25)' : 'rgba(139,92,246,0.06)',
              color: filterPriority === p ? 'var(--primary-violet-light)' : 'var(--text-secondary)',
              border: filterPriority === p ? '1px solid var(--border-violet)' : '1px solid transparent',
            }}
          >
            {p ? t(`task.priorities.${p}`) : t('filter.all')}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[0,1,2].map(i => (
            <div key={i} style={{ height: 62, borderRadius: 12, background: 'rgba(139,92,246,0.06)', border: '1px solid var(--border-violet)' }}/>
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title={t('task.allDone')}
          subtitle={t('task.allDoneSubtitle')}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {groups.map(group => (
            <div key={group.key}>
              <div style={{ fontSize: 10, fontWeight: 700, color: group.accent, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                {group.label} · {group.items.length}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {group.items.map(task => (
                  <TaskRow key={task.id} task={task} onComplete={handleComplete}/>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
