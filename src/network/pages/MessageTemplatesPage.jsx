import React, { useState, useEffect, useCallback } from 'react'
import { MessageSquare, Plus, X, Pencil, Trash2, Power } from 'lucide-react'
import EmptyState from '../components/EmptyState.jsx'
import InviteTextsEditor from '../components/InviteTextsEditor.jsx'
import { renderTemplate } from '../components/MessageSheet.jsx'
import { t } from '../../i18n/index.js'
import {
  dbGetMessageTemplates, dbSaveMessageTemplate, dbDeleteMessageTemplate, dbGetGeography,
} from '../../lib/database.js'
import { quiet } from '../../lib/quiet.js'

const TARGETS = ['any', 'influencer', 'brand']
const STAGES  = ['', 'cold', 'warm', 'strong']

// Ficha de mentira para la vista previa. Sin esto hay que guardar,
// abrir una ficha real y volver para saber si el mensaje se lee bien.
const EJEMPLO = { name: 'Sofía Martínez', username: 'sofimartinez', instagram: 'sofimartinez' }

const SUGERIDAS = [
  { title: 'Primer contacto · influencer', target: 'influencer', stage: 'cold',
    body: 'Hola {nombre}! Te escribo de Resilio, trabajamos con marcas en {ciudad} y nos encantó tu contenido.\n\n¿Te interesa que te contemos qué colaboraciones tenemos abiertas este mes?' },
  { title: 'Primer contacto · marca', target: 'brand', stage: 'cold',
    body: 'Hola! Les escribo de Resilio. Trabajamos con creadores de {ciudad} y armamos colaboraciones que se pagan con producto o servicio, no con presupuesto de medios.\n\n¿Les sirve que les pase dos ejemplos de lo que hicimos acá?' },
  { title: 'Segundo toque, sin respuesta', target: 'any', stage: 'cold',
    body: 'Hola {nombre}, te escribí hace unos días y capaz se te pasó — sé cómo es.\n\nTe dejo la puerta abierta por si en algún momento te interesa.' },
  { title: 'Retomar conversación', target: 'any', stage: 'warm',
    body: 'Hola {nombre}! Volviendo a lo que hablamos, tengo algo que creo que te encaja.\n\n¿Te paso los detalles?' },
]

const inputStyle = {
  padding: '9px 11px', borderRadius: 9, fontSize: 14, width: '100%',
  background: 'rgba(139,92,246,0.07)', color: 'var(--text-primary)',
  border: '1px solid var(--border-violet)', outline: 'none',
}
const selectStyle = {
  padding: '8px 10px', borderRadius: 9, fontSize: 13, cursor: 'pointer',
  background: 'var(--bg-tertiary)', color: 'var(--text-primary)',
  border: '1px solid var(--border-violet)',
}

const EMPTY = { title: '', body: '', target: 'any', stage: '', cityId: '', active: true }

export default function MessageTemplatesPage() {
  const [rows,    setRows]    = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [form,    setForm]    = useState(null)
  const [saving,  setSaving]  = useState(false)
  const [cities,  setCities]  = useState([])

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try { setRows(await dbGetMessageTemplates({ all: true })) }
    catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => { dbGetGeography().then(g => setCities(g.cities || [])).catch(quiet('MessageTemplatesPage')) }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.title.trim() || !form.body.trim()) return
    setSaving(true); setError(null)
    try {
      await dbSaveMessageTemplate({ ...form, stage: form.stage || null, cityId: form.cityId || null })
      setForm(null); await load()
    } catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }

  const handleToggle = async (tpl) => {
    try { await dbSaveMessageTemplate({ ...tpl, active: !tpl.active }); await load() }
    catch (e) { setError(e.message) }
  }

  const handleDelete = async (tpl) => {
    if (!window.confirm(t('messages.confirmDelete', { title: tpl.title }))) return
    try { await dbDeleteMessageTemplate(tpl.id); await load() }
    catch (e) { setError(e.message) }
  }

  const handleSeed = async () => {
    setSaving(true); setError(null)
    try {
      for (const s of SUGERIDAS) await dbSaveMessageTemplate({ ...EMPTY, ...s })
      await load()
    } catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }

  return (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 760 }}>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>{t('pages.messages.title')}</h1>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t('pages.messages.subtitle')}</p>
        </div>
        <button
          onClick={() => setForm(form ? null : { ...EMPTY })}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 10, fontSize: 12, fontWeight: 600, background: form ? 'rgba(139,92,246,0.2)' : 'rgba(139,92,246,0.1)', color: 'var(--primary-violet-light)', border: '1px solid var(--border-violet)', cursor: 'pointer' }}
        >
          {form ? <X size={14}/> : <Plus size={14}/>}{t('messages.new')}
        </button>
      </div>

      <InviteTextsEditor/>

      <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, background: 'rgba(139,92,246,0.05)', border: '1px solid var(--border-violet)', borderRadius: 10, padding: '10px 13px' }}>
        {t('messages.explainer')}
      </div>

      {error && (
        <div style={{ fontSize: 12, color: '#F87171', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: 9, padding: '8px 12px' }}>{error}</div>
      )}

      {form && (
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 14, borderRadius: 12, background: 'var(--glass-bg)', border: '1px solid var(--border-violet)' }}>
          <input autoFocus value={form.title} onChange={e => set('title', e.target.value)} placeholder={t('messages.field.title')} style={inputStyle}/>
          <textarea value={form.body} onChange={e => set('body', e.target.value)} placeholder={t('messages.field.body')} rows={5} style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }}/>

          <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{t('messages.placeholders')}</div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <select value={form.target} onChange={e => set('target', e.target.value)} style={selectStyle}>
              {TARGETS.map(x => <option key={x} value={x}>{t(`messages.target.${x}`)}</option>)}
            </select>
            <select value={form.stage} onChange={e => set('stage', e.target.value)} style={selectStyle}>
              {STAGES.map(x => <option key={x || 'any'} value={x}>{x ? t(`relationship.${x}`) : t('messages.anyStage')}</option>)}
            </select>
            <select value={form.cityId} onChange={e => set('cityId', e.target.value)} style={selectStyle}>
              <option value="">{t('messages.allCities')}</option>
              {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {/* Vista previa con una ficha de ejemplo: si un marcador está
              mal escrito, se ve acá y no en la cara de una marca. */}
          {form.body.trim() && (
            <div style={{ borderRadius: 10, border: '1px dashed var(--border-violet)', padding: '10px 12px', background: 'rgba(139,92,246,0.04)' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 5 }}>
                {t('messages.preview')}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-primary)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                {renderTemplate(form.body, { entity: EJEMPLO, cityName: 'Rosario', me: 'Camila' })}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" disabled={saving || !form.title.trim() || !form.body.trim()}
              style={{ padding: '8px 16px', borderRadius: 9, fontSize: 13, fontWeight: 700, background: 'var(--primary-violet)', color: 'white', border: 'none', cursor: saving ? 'default' : 'pointer', opacity: (form.title.trim() && form.body.trim()) ? 1 : 0.5 }}>
              {saving ? t('task.saving') : t('templates.save')}
            </button>
            <button type="button" onClick={() => setForm(null)}
              style={{ padding: '8px 16px', borderRadius: 9, fontSize: 13, background: 'none', color: 'var(--text-secondary)', border: '1px solid var(--border-violet)', cursor: 'pointer' }}>
              {t('templates.cancel')}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[0,1].map(i => <div key={i} style={{ height: 70, borderRadius: 11, background: 'rgba(139,92,246,0.06)', animation: 'pulse 1.5s ease-in-out infinite' }}/>)}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title={t('messages.empty')}
          subtitle={t('messages.emptySubtitle')}
          actionLabel={t('messages.seed')}
          onAction={handleSeed}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rows.map(tpl => (
            <div key={tpl.id} style={{ borderRadius: 11, background: 'var(--glass-bg)', border: `1px solid ${tpl.active ? 'var(--border-violet)' : 'rgba(139,92,246,0.12)'}`, padding: '11px 13px', opacity: tpl.active ? 1 : 0.55 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{tpl.title}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 2 }}>
                    {t(`messages.target.${tpl.target}`)}
                    {tpl.stage  && <> · {t(`relationship.${tpl.stage}`)}</>}
                    {tpl.cityId && <> · {cities.find(c => c.id === tpl.cityId)?.name || ''}</>}
                  </div>
                </div>
                <button onClick={() => handleToggle(tpl)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: tpl.active ? '#10B981' : 'var(--text-secondary)', padding: 4, display: 'flex' }}><Power size={15}/></button>
                <button onClick={() => setForm({ ...tpl, stage: tpl.stage || '', cityId: tpl.cityId || '' })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 4, display: 'flex' }}><Pencil size={15}/></button>
                <button onClick={() => handleDelete(tpl)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#F87171', padding: 4, display: 'flex' }}><Trash2 size={15}/></button>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 7, whiteSpace: 'pre-wrap', lineHeight: 1.45 }}>{tpl.body}</div>
            </div>
          ))}
          <button onClick={handleSeed} disabled={saving}
            style={{ alignSelf: 'flex-start', marginTop: 4, fontSize: 11, color: 'var(--primary-violet-light)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            {t('messages.seed')}
          </button>
        </div>
      )}
    </div>
  )
}
