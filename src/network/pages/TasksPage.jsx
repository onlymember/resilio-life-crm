import React, { useState, useEffect, useCallback } from 'react'
import { Plus, CheckSquare, X } from 'lucide-react'
import TaskRow from '../components/TaskRow.jsx'
import EmptyState from '../components/EmptyState.jsx'
import { t } from '../../i18n/index.js'
import { useTz } from '../utils/tz.js'
import { defaultDueLocal, datetimeLocalToIso, isoToDatetimeLocal } from '../utils/date.js'
import { useSearchParams } from 'react-router-dom'
import { dbGetTasks, dbCompleteTask, dbSaveTask, dbCreateTasks, dbDeleteTask, dbDeleteTaskBatch } from '../../lib/database.js'
import { COMMAND_ROLES } from '../routes.js'
import { getNetworkScouters } from '../../lib/metrics.js'
import { personLabel, personName, personShort } from '../utils/people.js'
import { quiet } from '../../lib/quiet.js'

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

// Abiertas = todo lo que no esta cerrado. Antes la pantalla pedia
// status='todo' y nada mas, asi que una tarea empezada desaparecia.
const OPEN_STATUSES = ['todo', 'in_progress']

const TABS = [
  { id: 'mine',     labelKey: 'task.tabs.mine' },
  { id: 'assigned', labelKey: 'task.tabs.assigned' },
  { id: 'overdue',  labelKey: 'task.tabs.overdue' },
  { id: 'done',     labelKey: 'task.tabs.done' },
]

export default function TasksPage({ currentUser }) {
  const tz = useTz()
  const isCommand = COMMAND_ROLES.includes(currentUser?.rol)
  const [rows,    setRows]    = useState([])
  const [total,   setTotal]   = useState(0)
  const [loading, setLoading] = useState(true)
  // El Command Center enlaza con ?overdue=1 y la ficha de una Scouter
  // con ?assignedTo=<id>. Sin leer esos parametros el tile prometia una
  // lista filtrada y dejaba en la lista entera, que es lo contrario.
  const [searchParams] = useSearchParams()
  const [tab,             setTab]             = useState(searchParams.get('overdue') ? 'overdue' : 'mine')
  const [filterPriority,  setFilterPriority]  = useState('')
  const [filterAssignedTo, setFilterAssignedTo] = useState(searchParams.get('assignedTo') || '')
  const [scouters, setScouters] = useState([])

  // Create form
  const [creating,      setCreating]      = useState(false)
  const [newTitle,      setNewTitle]      = useState('')
  const [newDue,        setNewDue]        = useState('')
  const [newPrio,       setNewPrio]       = useState('normal')
  const [newAssignees,  setNewAssignees]  = useState([])   // ids; vacio = yo
  const [editing,       setEditing]       = useState(null) // la tarea que se edita
  const [saving,        setSaving]        = useState(false)
  const [saveError,     setSaveError]     = useState(null)

  useEffect(() => {
    if (!isCommand) return
    getNetworkScouters().then(setScouters).catch(quiet('TasksPage'))
  }, [isCommand])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      // Antes esto filtraba por assigned_to = yo para todo el que no fuera
      // Direccion, asi que una tarea delegada desaparecia para quien la
      // habia creado. RLS ya decide que se puede ver; la solapa solo
      // elige que pedir de eso.
      const me    = currentUser?.id || undefined
      const query = { page: 0, pageSize: PAGE_SIZE }

      if (tab === 'mine') {
        query.assignedTo = filterAssignedTo || me
        query.statusIn   = OPEN_STATUSES
      } else if (tab === 'assigned') {
        query.createdBy  = me
        query.statusIn   = OPEN_STATUSES
        if (filterAssignedTo) query.assignedTo = filterAssignedTo
      } else if (tab === 'overdue') {
        // Vencidas: para Direccion son las de toda la red, porque eso es
        // lo que cuenta el tile del Command Center. Para una Scouter,
        // RLS ya acota, pero se filtra igual para no depender de eso.
        query.statusIn    = OPEN_STATUSES
        query.overdueOnly = true
        if (filterAssignedTo) query.assignedTo = filterAssignedTo
        else if (!isCommand)  query.assignedTo = me
      } else {
        query.statusIn = ['completed']
        query.orderBy  = 'completed_at'
        query.orderDir = 'desc'
        if (filterAssignedTo) query.assignedTo = filterAssignedTo
        else if (!isCommand)  query.assignedTo = me
      }
      if (filterPriority && tab !== 'done') query.orderBy = 'priority'

      const res = await dbGetTasks(query)
      const filtered = filterPriority
        ? res.rows.filter(r => r.priority === filterPriority)
        : res.rows
      setRows(filtered)
      setTotal(res.total)
    } catch(e) { console.error('TasksPage:', e.message) }
    finally { setLoading(false) }
  }, [tab, filterPriority, filterAssignedTo, isCommand, currentUser?.id])

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
      const payload = {
        title:    newTitle.trim(),
        dueDate:  newDue ? datetimeLocalToIso(newDue, tz) : null,
        priority: newPrio,
      }

      if (editing) {
        // Editar toca una fila sola. El responsable no se cambia acá:
        // reasignar es otra operación y mezclarlas esconde el cambio.
        await dbSaveTask({ ...editing, ...payload }, currentUser?.id)
      } else {
        const ids = newAssignees.length ? newAssignees : [currentUser?.id]
        await dbCreateTasks(payload, ids)
      }

      resetForm()
      await load()
    } catch(e) {
      setSaveError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const resetForm = () => {
    setNewTitle(''); setNewDue(defaultDueLocal(tz)); setNewPrio('normal')
    setNewAssignees([]); setEditing(null); setCreating(false); setSaveError(null)
  }

  const handleEdit = (task) => {
    setEditing(task)
    setNewTitle(task.title || '')
    setNewDue(task.dueDate ? isoToDatetimeLocal(task.dueDate, tz) : '')
    setNewPrio(task.priority || 'normal')
    setCreating(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (task) => {
    const many = task.batchId
      ? rows.filter(r => r.batchId === task.batchId).length
      : 1
    const msg = many > 1 ? t('task.confirmDeleteBatch', { n: many }) : t('task.confirmDelete')
    if (!window.confirm(msg)) return
    try {
      if (task.batchId && many > 1) await dbDeleteTaskBatch(task.batchId)
      else                          await dbDeleteTask(task.id)
      await load()
    } catch (e) { setSaveError(e.message) }
  }

  // Borrar y editar los permite la policy a quien creó la tarea y a
  // Dirección. Se pregunta acá para no mostrar un botón que va a fallar.
  const canManage = (task) => isCommand || task.createdBy === currentUser?.id

  const groups = tab === 'done'
    ? [{ key: 'done', label: t('task.groups.done'), items: rows, accent: '#34D399' }]
    : groupTasks(rows)

  // En Asignadas por mi el nombre del responsable es el dato principal,
  // no un adorno para Direccion: se muestra siempre.
  const assigneeNameOf = (task) => {
    if (!task.assignedTo) return null
    if (tab !== 'assigned' && (!isCommand || task.assignedTo === currentUser?.id)) return null
    if (task.assignedTo === currentUser?.id) return t('task.assignSelf')
    const sc = scouters.find(x => x.userId === task.assignedTo)
    return sc ? personName(sc) : null
  }

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
          onClick={() => (creating ? resetForm() : setCreating(true))}
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

      {/* Solapas */}
      <div style={{ display: 'flex', gap: 6, borderBottom: '1px solid var(--border-violet)', paddingBottom: 2 }}>
        {TABS.map(x => {
          const active = tab === x.id
          return (
            <button
              key={x.id}
              onClick={() => setTab(x.id)}
              style={{
                padding: '8px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                background: 'none', border: 'none',
                color: active ? 'var(--primary-violet-light)' : 'var(--text-secondary)',
                borderBottom: active ? '2px solid var(--primary-violet)' : '2px solid transparent',
                marginBottom: -3,
              }}
            >
              {t(x.labelKey)}
            </button>
          )
        })}
      </div>

      {/* Formulario: crear o editar */}
      {creating && (
        <form onSubmit={handleCreate} style={{ padding: '14px', background: 'var(--glass-bg)', border: '1px solid var(--border-violet)', borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input
            autoFocus
            placeholder={t('pages.tasks.title')}
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            style={{
              width: '100%', padding: '8px 12px', borderRadius: 8, fontSize: 16,
              background: 'rgba(139,92,246,0.08)', border: '1px solid var(--border-violet)',
              color: 'var(--text-primary)',
            }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="datetime-local"
              value={newDue || defaultDueLocal(tz)}
              onChange={e => setNewDue(e.target.value)}
              style={{
                flex: 1, padding: '7px 10px', borderRadius: 8, fontSize: 16,
                background: 'rgba(139,92,246,0.08)', border: '1px solid var(--border-violet)',
                color: 'var(--text-primary)', colorScheme: 'dark',
              }}
            />
            <select
              value={newPrio}
              onChange={e => setNewPrio(e.target.value)}
              style={{
                flex: 1, padding: '7px 10px', borderRadius: 8, fontSize: 16,
                background: 'rgba(139,92,246,0.08)', border: '1px solid var(--border-violet)',
                color: 'var(--text-primary)',
              }}
            >
              {PRIORITY_OPTS.map(p => <option key={p} value={p}>{t(`task.priorities.${p}`)}</option>)}
            </select>
          </div>
          {/* Responsables. Se eligen varios: el sistema crea una tarea por
              persona, porque cada una la completa por su lado. Al editar
              no se muestra — reasignar es otra operación. */}
          {isCommand && scouters.length > 0 && !editing && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
                {t('task.assignee')}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {[{ userId: currentUser?.id, nombre: t('task.assignSelf') }, ...scouters]
                  .filter(x => x.userId)
                  .map(sc => {
                    const on = newAssignees.includes(sc.userId)
                    return (
                      <button
                        key={sc.userId}
                        type="button"
                        onClick={() => setNewAssignees(prev =>
                          prev.includes(sc.userId) ? prev.filter(x => x !== sc.userId) : [...prev, sc.userId])}
                        style={{
                          padding: '5px 11px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                          background: on ? 'rgba(139,92,246,0.22)' : 'rgba(139,92,246,0.06)',
                          color: on ? 'var(--primary-violet-light)' : 'var(--text-secondary)',
                          border: `1px solid ${on ? 'rgba(139,92,246,0.45)' : 'transparent'}`,
                        }}
                      >
                        {sc.nombre === t('task.assignSelf') ? sc.nombre : personLabel(sc)}
                      </button>
                    )
                  })}
              </div>
              {newAssignees.length > 1 && (
                <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 6 }}>
                  {t('task.willCreateN', { n: newAssignees.length })}
                </div>
              )}
            </div>
          )}
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
            {saving ? t('task.saving') : editing ? t('form.save') : t('task.create')}
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
      {isCommand && scouters.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button
            onClick={() => setFilterAssignedTo('')}
            style={{
              padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer',
              background: filterAssignedTo === '' ? 'rgba(34,211,238,0.2)' : 'rgba(34,211,238,0.06)',
              color: filterAssignedTo === '' ? '#22D3EE' : 'var(--text-secondary)',
              border: filterAssignedTo === '' ? '1px solid rgba(34,211,238,0.3)' : '1px solid transparent',
            }}
          >
            {t('filter.all')}
          </button>
          {scouters.map(s => (
            <button
              key={s.userId}
              onClick={() => setFilterAssignedTo(s.userId)}
              style={{
                padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                background: filterAssignedTo === s.userId ? 'rgba(34,211,238,0.2)' : 'rgba(34,211,238,0.06)',
                color: filterAssignedTo === s.userId ? '#22D3EE' : 'var(--text-secondary)',
                border: filterAssignedTo === s.userId ? '1px solid rgba(34,211,238,0.3)' : '1px solid transparent',
              }}
            >
              {personShort(s)}
            </button>
          ))}
        </div>
      )}

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
          title={t(tab === 'assigned' ? 'task.emptyAssigned' : tab === 'overdue' ? 'task.emptyOverdue' : tab === 'done' ? 'task.emptyDone' : 'task.allDone')}
          subtitle={t(tab === 'assigned' ? 'task.emptyAssignedSubtitle' : tab === 'overdue' ? 'task.emptyOverdueSubtitle' : tab === 'done' ? 'task.emptyDoneSubtitle' : 'task.allDoneSubtitle')}
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
                  <TaskRow
                    key={task.id}
                    task={task}
                    onComplete={tab === 'done' ? undefined : handleComplete}
                    assigneeName={assigneeNameOf(task)}
                    onEdit={canManage(task) && tab !== 'done' ? handleEdit : undefined}
                    onDelete={canManage(task) ? handleDelete : undefined}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
