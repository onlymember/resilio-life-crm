import React, { useState, useEffect, useCallback } from 'react'
import { CheckSquare, CheckCircle } from 'lucide-react'
import EmptyState from '../components/EmptyState.jsx'
import { t } from '../../i18n/index.js'
import { dbGetTasks, dbCompleteTask } from '../../lib/database.js'

const PAGE_SIZE = 30

const PRIORITY_COLOR = { urgent:'#F87171', high:'#FB923C', normal:'#60A5FA', low:'#9CA3AF' }

export default function TasksPage() {
  const [rows,    setRows]    = useState([])
  const [total,   setTotal]   = useState(0)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await dbGetTasks({ page:0, pageSize:PAGE_SIZE, status:'todo' })
      setRows(res.rows); setTotal(res.total)
    } catch(e) { console.error('TasksPage:', e.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [])

  const handleComplete = async (id) => {
    try {
      await dbCompleteTask(id)
      setRows(p => p.filter(t => t.id !== id))
      setTotal(p => p - 1)
    } catch(e) { console.error('complete task:', e.message) }
  }

  const fmtDate = (iso) => {
    if (!iso) return null
    const d = new Date(iso)
    const diff = Math.ceil((d.getTime() - Date.now()) / 86400000)
    if (diff < 0) return { label: `Hace ${Math.abs(diff)}d`, overdue: true }
    if (diff === 0) return { label: 'Hoy', overdue: false }
    return { label: `En ${diff}d`, overdue: false }
  }

  return (
    <div style={{ padding:'20px', display:'flex', flexDirection:'column', gap:16 }}>
      <div>
        <h1 style={{ fontSize:18, fontWeight:700, color:'var(--text-primary)', marginBottom:2 }}>{t('pages.tasks.title')}</h1>
        <p style={{ fontSize:12, color:'var(--text-secondary)' }}>{total > 0 ? `${total} pendientes` : t('pages.tasks.subtitle')}</p>
      </div>

      {loading ? (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {[0,1,2].map(i=><div key={i} style={{ height:60, borderRadius:10, background:'rgba(139,92,246,0.06)', border:'1px solid var(--border-violet)' }}/>)}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState icon={CheckSquare} title={t('empty.noTasks')} subtitle="¡Todo al día!"/>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {rows.map(task => {
            const date = fmtDate(task.dueDate)
            const pColor = PRIORITY_COLOR[task.priority] || '#9CA3AF'
            return (
              <div key={task.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', background:'var(--glass-bg)', border:'1px solid var(--border-violet)', borderRadius:12, transition:'all 0.2s' }}>
                <button
                  onClick={() => handleComplete(task.id)}
                  style={{ width:22, height:22, borderRadius:'50%', flexShrink:0, border:`2px solid ${pColor}60`, background:'transparent', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.15s' }}
                  onMouseEnter={e=>{e.currentTarget.style.background=`${pColor}20`; e.currentTarget.style.borderColor=pColor}}
                  onMouseLeave={e=>{e.currentTarget.style.background='transparent'; e.currentTarget.style.borderColor=`${pColor}60`}}
                >
                  <CheckCircle size={12} color={pColor} opacity={0.5}/>
                </button>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, color:'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{task.title}</div>
                  {date && <div style={{ fontSize:10, color: date.overdue ? '#F87171' : 'var(--text-secondary)', marginTop:2 }}>{date.label}</div>}
                </div>
                <span style={{ fontSize:9, fontWeight:700, padding:'2px 6px', borderRadius:8, background:`${pColor}15`, color:pColor, flexShrink:0, textTransform:'uppercase', letterSpacing:0.5 }}>{task.priority}</span>
              </div>
            )
          })}
          {rows.length < total && (
            <div style={{ fontSize:12, color:'var(--text-secondary)', textAlign:'center', padding:'8px 0' }}>+{total-rows.length} más</div>
          )}
        </div>
      )}
    </div>
  )
}
