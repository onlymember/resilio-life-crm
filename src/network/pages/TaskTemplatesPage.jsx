import React, { useState, useEffect, useCallback } from 'react'
import { Repeat, Plus, X, Pencil, Trash2, Play, Power } from 'lucide-react'
import EmptyState from '../components/EmptyState.jsx'
import { t } from '../../i18n/index.js'
import { personName } from '../utils/people.js'
import { getNetworkScouters } from '../../lib/metrics.js'
import {
  dbGetTaskTemplates, dbSaveTaskTemplate, dbDeleteTaskTemplate,
  dbRunDailyMaintenance, dbGetGeography,
} from '../../lib/database.js'
import { quiet } from '../../lib/quiet.js'

// Lo que una plantilla puede repetir. 'one_time' queda fuera de la
// lista a propósito: una plantilla que no se repite es una tarea, y
// para eso ya está la pantalla de Tareas.
const RECURRENCES = ['daily', 'weekly', 'monthly', 'quarterly']
const PRIORITIES  = ['low', 'normal', 'high', 'urgent']
const TARGETS     = ['network', 'city', 'user']

// Los seis hábitos del plan de activación, listos para cargar de una
// vez. No se siembran por SQL: se cargan desde acá y después se editan
// como cualquier otra, que es lo que hace que el plan sea de quien lo
// dirige y no del que escribió la migración.
const SUGGESTED = [
  { title: 'Contactar 10 influencers nuevos',        recurrence: 'daily',   dueHour: 18, priority: 'high',   type: 'outreach' },
  { title: 'Contactar 3 marcas nuevas',              recurrence: 'daily',   dueHour: 18, priority: 'high',   type: 'outreach' },
  { title: 'Agendar 2 colaboraciones a 7 días',      recurrence: 'daily',   dueHour: 18, priority: 'urgent', type: 'collaboration' },
  { title: 'Dejar la agenda de mañana sin vencidos', recurrence: 'daily',   dueHour: 19, priority: 'normal', type: 'general' },
  { title: 'Revisar la cobertura de la semana',      recurrence: 'weekly',  dueHour: 17, priority: 'normal', type: 'review' },
  { title: 'Cerrar el mes: reporte y pendientes',    recurrence: 'monthly', dueHour: 17, priority: 'high',   type: 'review' },
]

const selectStyle = {
  padding: '8px 10px', borderRadius: 9, fontSize: 13,
  background: 'var(--bg-tertiary)', color: 'var(--text-primary)',
  border: '1px solid var(--border-violet)', cursor: 'pointer',
}

const inputStyle = {
  padding: '9px 11px', borderRadius: 9, fontSize: 14,
  background: 'rgba(139,92,246,0.07)', color: 'var(--text-primary)',
  border: '1px solid var(--border-violet)', outline: 'none', width: '100%',
}

const EMPTY = {
  title: '', description: '', type: 'general', priority: 'normal',
  recurrence: 'daily', targetType: 'network', targetId: null, dueHour: 18, active: true,
}

export default function TaskTemplatesPage() {
  const [rows,     setRows]     = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)
  const [form,     setForm]     = useState(null)   // null = formulario cerrado
  const [saving,   setSaving]   = useState(false)
  const [running,  setRunning]  = useState(false)
  const [runMsg,   setRunMsg]   = useState(null)
  const [cities,   setCities]   = useState([])
  const [scouters, setScouters] = useState([])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setRows(await dbGetTaskTemplates())
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    dbGetGeography().then(g => setCities(g.cities || [])).catch(quiet('TaskTemplatesPage'))
    getNetworkScouters({}).then(setScouters).catch(quiet('TaskTemplatesPage'))
  }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) return
    setSaving(true)
    setError(null)
    try {
      await dbSaveTaskTemplate(form)
      setForm(null)
      await load()
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (tpl) => {
    setError(null)
    try {
      await dbSaveTaskTemplate({ ...tpl, active: !tpl.active })
      await load()
    } catch (e) { setError(e.message) }
  }

  const handleDelete = async (tpl) => {
    if (!window.confirm(t('templates.confirmDelete', { title: tpl.title }))) return
    setError(null)
    try {
      await dbDeleteTaskTemplate(tpl.id)
      await load()
    } catch (e) { setError(e.message) }
  }

  // Genera las tareas de hoy sin esperar a que alguien abra el sistema.
  // Es la misma función que corre sola: el candado de 6 horas vive en la
  // base, así que tocar el botón dos veces no duplica nada.
  const handleRun = async () => {
    setRunning(true)
    setRunMsg(null)
    setError(null)
    try {
      const res = await dbRunDailyMaintenance()
      setRunMsg(res?.ran
        ? t('templates.ranOk', { n: res.generated ?? 0 })
        : t('templates.ranSkipped'))
    } catch (e) {
      setError(e.message)
    } finally {
      setRunning(false)
    }
  }

  const handleSeed = async () => {
    setSaving(true)
    setError(null)
    try {
      for (const s of SUGGESTED) {
        await dbSaveTaskTemplate({ ...EMPTY, ...s })
      }
      await load()
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const targetLabel = (tpl) => {
    if (tpl.targetType === 'city') {
      return cities.find(c => c.id === tpl.targetId)?.name || t('templates.target.city')
    }
    if (tpl.targetType === 'user') {
      const sc = scouters.find(s => s.userId === tpl.targetId)
      return sc ? personName(sc) : t('templates.target.user')
    }
    return t('templates.target.network')
  }

  return (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 760 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>{t('pages.templates.title')}</h1>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t('pages.templates.subtitle')}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleRun}
            disabled={running}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 10, fontSize: 12, fontWeight: 600, background: 'rgba(139,92,246,0.08)', color: 'var(--text-secondary)', border: '1px solid var(--border-violet)', cursor: running ? 'default' : 'pointer' }}
          >
            <Play size={13}/>{running ? t('templates.running') : t('templates.runNow')}
          </button>
          <button
            onClick={() => setForm(form ? null : { ...EMPTY })}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 10, fontSize: 12, fontWeight: 600, background: form ? 'rgba(139,92,246,0.2)' : 'rgba(139,92,246,0.1)', color: 'var(--primary-violet-light)', border: '1px solid var(--border-violet)', cursor: 'pointer' }}
          >
            {form ? <X size={14}/> : <Plus size={14}/>}{t('templates.new')}
          </button>
        </div>
      </div>

      {/* Explicación corta: sin esto la pantalla no dice qué hace */}
      <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, background: 'rgba(139,92,246,0.05)', border: '1px solid var(--border-violet)', borderRadius: 10, padding: '10px 13px' }}>
        {t('templates.explainer')}
      </div>

      {runMsg && (
        <div style={{ fontSize: 12, color: '#10B981', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 9, padding: '8px 12px' }}>
          {runMsg}
        </div>
      )}

      {error && (
        <div style={{ fontSize: 12, color: '#F87171', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: 9, padding: '8px 12px' }}>
          {error}
        </div>
      )}

      {/* Formulario */}
      {form && (
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 14, borderRadius: 12, background: 'var(--glass-bg)', border: '1px solid var(--border-violet)' }}>
          <input
            autoFocus
            value={form.title}
            onChange={e => set('title', e.target.value)}
            placeholder={t('templates.field.title')}
            style={inputStyle}
          />
          <textarea
            value={form.description || ''}
            onChange={e => set('description', e.target.value)}
            placeholder={t('templates.field.description')}
            rows={2}
            style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
          />

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <select value={form.recurrence} onChange={e => set('recurrence', e.target.value)} style={selectStyle}>
              {RECURRENCES.map(r => <option key={r} value={r}>{t(`templates.recurrence.${r}`)}</option>)}
            </select>

            <select value={form.priority} onChange={e => set('priority', e.target.value)} style={selectStyle}>
              {PRIORITIES.map(pr => <option key={pr} value={pr}>{t(`task.priorities.${pr}`)}</option>)}
            </select>

            <select
              value={form.dueHour}
              onChange={e => set('dueHour', parseInt(e.target.value, 10))}
              style={selectStyle}
            >
              {Array.from({ length: 24 }, (_, h) => (
                <option key={h} value={h}>{t('templates.dueAt', { h: String(h).padStart(2, '0') })}</option>
              ))}
            </select>

            <select
              value={form.targetType}
              onChange={e => setForm(f => ({ ...f, targetType: e.target.value, targetId: null }))}
              style={selectStyle}
            >
              {TARGETS.map(tt => <option key={tt} value={tt}>{t(`templates.target.${tt}`)}</option>)}
            </select>

            {form.targetType === 'city' && (
              <select value={form.targetId || ''} onChange={e => set('targetId', e.target.value || null)} style={selectStyle}>
                <option value="">{t('templates.pickCity')}</option>
                {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}

            {form.targetType === 'user' && (
              <select value={form.targetId || ''} onChange={e => set('targetId', e.target.value || null)} style={selectStyle}>
                <option value="">{t('templates.pickUser')}</option>
                {scouters.map(sc => <option key={sc.userId} value={sc.userId}>{personName(sc)}</option>)}
              </select>
            )}
          </div>

          {/* La hora es local a la ciudad de cada Scouter, no UTC. Vale la
              pena decirlo en la pantalla: es la diferencia entre una tarea
              que vence a las 18 y una que vence a las 15. */}
          <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{t('templates.tzNote')}</div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="submit"
              disabled={saving || !form.title.trim()}
              style={{ padding: '8px 16px', borderRadius: 9, fontSize: 13, fontWeight: 700, background: 'var(--primary-violet)', color: 'white', border: 'none', cursor: saving ? 'default' : 'pointer', opacity: form.title.trim() ? 1 : 0.5 }}
            >
              {saving ? t('task.saving') : t('templates.save')}
            </button>
            <button
              type="button"
              onClick={() => setForm(null)}
              style={{ padding: '8px 16px', borderRadius: 9, fontSize: 13, background: 'none', color: 'var(--text-secondary)', border: '1px solid var(--border-violet)', cursor: 'pointer' }}
            >
              {t('templates.cancel')}
            </button>
          </div>
        </form>
      )}

      {/* Lista */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[0, 1, 2].map(i => <div key={i} style={{ height: 56, borderRadius: 11, background: 'rgba(139,92,246,0.06)', animation: 'pulse 1.5s ease-in-out infinite' }}/>)}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Repeat}
          title={t('templates.empty')}
          subtitle={t('templates.emptySubtitle')}
          actionLabel={t('templates.seed')}
          onAction={handleSeed}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {rows.map(tpl => (
            <div
              key={tpl.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderRadius: 11,
                background: 'var(--glass-bg)',
                border: `1px solid ${tpl.active ? 'var(--border-violet)' : 'rgba(139,92,246,0.12)'}`,
                opacity: tpl.active ? 1 : 0.55,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {tpl.title}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                  {t(`templates.recurrence.${tpl.recurrence}`)}
                  {' · '}{t('templates.dueAt', { h: String(tpl.dueHour).padStart(2, '0') })}
                  {' · '}{targetLabel(tpl)}
                </div>
              </div>

              <button onClick={() => handleToggle(tpl)} title={t(tpl.active ? 'templates.pause' : 'templates.resume')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: tpl.active ? '#10B981' : 'var(--text-secondary)', padding: 4, display: 'flex' }}>
                <Power size={15}/>
              </button>
              <button onClick={() => setForm(tpl)} title={t('task.edit')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 4, display: 'flex' }}>
                <Pencil size={15}/>
              </button>
              <button onClick={() => handleDelete(tpl)} title={t('task.delete')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#F87171', padding: 4, display: 'flex' }}>
                <Trash2 size={15}/>
              </button>
            </div>
          ))}

          <button
            onClick={handleSeed}
            disabled={saving}
            style={{ alignSelf: 'flex-start', marginTop: 4, fontSize: 11, color: 'var(--primary-violet-light)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            {t('templates.seed')}
          </button>
        </div>
      )}
    </div>
  )
}
