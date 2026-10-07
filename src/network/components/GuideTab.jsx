// Pestaña "Cómo usar Network" dentro de Manual: guías cortas para
// scouters, con buscador (sin tildes y con sinónimos), "Primeros pasos"
// que se tildan solos y un botón "Llevame ahí" en cada guía.
// El contenido sale de manual_sections (temas 'guia_…', migración 068)
// y Dirección lo edita desde acá.
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X, ChevronDown, ArrowRight, Check, Edit3, Sparkles, Compass } from 'lucide-react'
import { t } from '../../i18n/index.js'
import { dbPatchManual, dbGetFirstSteps } from '../../lib/database.js'
import { tokenize, renderInline, parseTable } from './SimpleMarkdown.jsx'
import { indexGuide, searchGuides, highlightParts } from '../guide/guideSearch.js'
import { runGuideAction, isValidAction } from '../guide/guideActions.js'

const CSS = `
.gd { --gd-line: rgba(139,92,246,.18); padding: 0 clamp(16px,4vw,40px) 64px; max-width: 860px; margin: 0 auto; }
.gd-hero { padding: 28px 0 18px; animation: gdRise .45s cubic-bezier(.2,.8,.2,1) backwards; }
.gd-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: 10px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; color: #E879F9; }
.gd-h1 { font-size: clamp(24px,5vw,32px); font-weight: 800; letter-spacing: -.5px; margin: 8px 0 6px; line-height: 1.15;
  background: linear-gradient(120deg, #fff 30%, #C4B5FD 70%, #F0ABFC); -webkit-background-clip: text; background-clip: text; color: transparent; }
.gd-sub { font-size: 14px; color: var(--text-secondary); margin: 0; line-height: 1.55; max-width: 560px; }

.gd-search { position: sticky; top: 59px; z-index: 15; padding: 10px 0; background: var(--bg-primary); box-shadow: 0 10px 12px -8px var(--bg-primary); }
.gd-box { display: flex; align-items: center; gap: 10px; padding: 0 12px; height: 48px; border-radius: 14px;
  background: rgba(139,92,246,.08); border: 1px solid var(--gd-line); transition: border-color .2s, box-shadow .2s, background .2s; }
.gd-box:focus-within { border-color: rgba(167,139,250,.7); background: rgba(139,92,246,.12); box-shadow: 0 0 0 4px rgba(139,92,246,.12); }
.gd-box input { flex: 1; min-width: 0; background: transparent; border: none; outline: none; color: var(--text-primary); font-size: 16px; }
.gd-count { font-size: 11px; color: var(--text-secondary); white-space: nowrap; }
.gd-x { display: flex; padding: 6px; border-radius: 8px; color: var(--text-secondary); }

.gd-chips { display: flex; gap: 6px; overflow-x: auto; padding: 4px 0 14px; scrollbar-width: none; }
.gd-chips::-webkit-scrollbar { display: none; }
.gd-chip { flex-shrink: 0; padding: 7px 13px; border-radius: 999px; font-size: 12px; font-weight: 600; color: var(--text-secondary);
  border: 1px solid var(--gd-line) !important; background: transparent; transition: color .2s, background .2s, border-color .2s; }
.gd-chip[aria-pressed="true"] { color: #fff; background: rgba(139,92,246,.28); border-color: rgba(167,139,250,.6) !important; }

.gd-group { margin-top: 18px; }
.gd-gtitle { font-size: 10px; font-weight: 800; letter-spacing: 1.6px; text-transform: uppercase; color: var(--text-secondary); margin: 0 0 8px 2px; }

.gd-card { border-radius: 14px; border: 1px solid var(--gd-line); background: var(--glass-bg); margin-bottom: 8px; overflow: hidden;
  animation: gdRise .38s cubic-bezier(.2,.8,.2,1) backwards; transition: border-color .2s, background .2s, box-shadow .5s; scroll-margin-top: 120px; }
.gd-card[data-open="true"] { border-color: rgba(167,139,250,.5); background: rgba(139,92,246,.08); }
.gd-card { box-shadow: 0 0 0 0 rgba(232,121,249,0); }
.gd-card.gd-flash { box-shadow: 0 0 0 3px rgba(232,121,249,.45); }
.gd-head { width: 100%; display: flex; align-items: center; gap: 12px; padding: 14px 14px 14px 16px; text-align: left; color: var(--text-primary); }
.gd-q { flex: 1; min-width: 0; }
.gd-qt { font-size: 15px; font-weight: 700; line-height: 1.35; }
.gd-qs { font-size: 12px; color: var(--text-secondary); margin-top: 2px; }
.gd-mark { background: rgba(232,121,249,.22); color: #F5D0FE; border-radius: 4px; padding: 0 2px; }
.gd-chev { flex-shrink: 0; color: var(--text-secondary); transition: transform .3s cubic-bezier(.2,.8,.2,1); }
.gd-card[data-open="true"] .gd-chev { transform: rotate(180deg); color: #C4B5FD; }
.gd-fold { display: grid; grid-template-rows: 0fr; transition: grid-template-rows .32s cubic-bezier(.2,.8,.2,1); }
.gd-card[data-open="true"] .gd-fold { grid-template-rows: 1fr; }
.gd-fold > div { overflow: hidden; }
.gd-inner { padding: 0 16px 16px; opacity: 0; transform: translateY(-4px); transition: opacity .25s ease, transform .3s ease; }
.gd-card[data-open="true"] .gd-inner { opacity: 1; transform: none; transition-delay: .06s; }

.gd-body { display: flex; flex-direction: column; gap: 12px; font-size: 14px; line-height: 1.65; color: rgba(229,231,235,.92); }
.gd-body strong { color: #fff; }
.gd-steps { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; counter-reset: gd; }
.gd-steps li { display: flex; gap: 10px; counter-increment: gd; }
.gd-steps li::before { content: counter(gd); flex-shrink: 0; width: 22px; height: 22px; margin-top: 1px; border-radius: 50%; display: grid; place-items: center;
  font-size: 11px; font-weight: 800; color: #fff; background: linear-gradient(135deg, #7C3AED, #C026D3); }
.gd-dots { margin: 0; padding-left: 18px; display: flex; flex-direction: column; gap: 6px; }
.gd-dots li::marker { color: #C084FC; }
.gd-quote { border-left: 3px solid #E879F9; background: rgba(232,121,249,.08); padding: 10px 12px; border-radius: 0 10px 10px 0; font-size: 13px; }
.gd-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.gd-table th { text-align: left; font-size: 10px; letter-spacing: 1px; text-transform: uppercase; color: #C4B5FD; padding: 6px 8px; border-bottom: 1px solid var(--gd-line); }
.gd-table td { padding: 8px; border-bottom: 1px solid rgba(139,92,246,.1); vertical-align: top; }
.gd-table td:first-child { font-weight: 700; color: #fff; white-space: nowrap; }
.gd-h { font-size: 12px; font-weight: 800; letter-spacing: .5px; color: #C4B5FD; margin-top: 4px; }

.gd-foot { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; margin-top: 16px; }
.gd-go { display: inline-flex; align-items: center; gap: 8px; padding: 10px 16px; min-height: 42px; border-radius: 12px; font-size: 13px; font-weight: 700; color: #fff;
  background: linear-gradient(135deg, #7C3AED, #C026D3); box-shadow: 0 6px 18px rgba(192,38,211,.25); }
.gd-go svg { transition: transform .2s; }
.gd-go:hover svg { transform: translateX(3px); }
.gd-date { font-size: 11px; color: var(--text-secondary); margin-left: auto; }
.gd-edit { display: inline-flex; align-items: center; gap: 4px; padding: 6px 10px; border-radius: 8px; font-size: 11px; color: #C4B5FD; border: 1px solid var(--gd-line) !important; }
.gd-ta { width: 100%; padding: 10px 12px; border-radius: 10px; background: rgba(139,92,246,.08); border: 1px solid var(--gd-line); color: var(--text-primary); font-size: 14px; line-height: 1.6; font-family: inherit; resize: vertical; }

.gd-empty { text-align: center; padding: 40px 12px; color: var(--text-secondary); font-size: 14px; animation: gdRise .3s ease backwards; }

.gd-fs { position: relative; border-radius: 18px; padding: 16px; margin: 4px 0 8px; overflow: hidden;
  background: radial-gradient(120% 140% at 0% 0%, rgba(124,58,237,.28), rgba(124,58,237,.06) 60%), var(--glass-bg);
  border: 1px solid rgba(167,139,250,.35); animation: gdRise .45s .05s cubic-bezier(.2,.8,.2,1) backwards; }
.gd-fs-top { display: flex; align-items: center; gap: 12px; }
.gd-ring { flex-shrink: 0; }
.gd-ring circle:last-child { transition: stroke-dashoffset .8s cubic-bezier(.2,.8,.2,1); }
.gd-fs-t { font-size: 15px; font-weight: 800; }
.gd-fs-s { font-size: 12px; color: var(--text-secondary); margin-top: 2px; }
.gd-fs-tg { margin-left: auto; font-size: 11px; color: #C4B5FD; padding: 6px 8px; border-radius: 8px; }
.gd-steplist { list-style: none; margin: 12px 0 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.gd-step { display: flex; align-items: center; gap: 10px; padding: 8px 8px 8px 10px; border-radius: 12px; background: rgba(10,6,24,.35);
  animation: gdRise .35s cubic-bezier(.2,.8,.2,1) backwards; }
.gd-tick { flex-shrink: 0; width: 24px; height: 24px; border-radius: 50%; display: grid; place-items: center; border: 1.5px solid rgba(167,139,250,.45); color: transparent; transition: background .3s, border-color .3s, color .3s; }
.gd-step[data-done="true"] .gd-tick { background: #10B981; border-color: #10B981; color: #fff; animation: gdPop .45s cubic-bezier(.2,1.6,.4,1); }
.gd-step-l { flex: 1; min-width: 0; font-size: 13px; font-weight: 600; }
.gd-step[data-done="true"] .gd-step-l { color: var(--text-secondary); text-decoration: line-through; text-decoration-color: rgba(156,163,175,.5); }
.gd-step-how { font-size: 11px; color: #C4B5FD; padding: 6px 8px; border-radius: 8px; white-space: nowrap; }
.gd-step-go { display: inline-flex; align-items: center; justify-content: center; width: 34px; height: 34px; border-radius: 10px; color: #fff; background: rgba(139,92,246,.35); flex-shrink: 0; }
.gd-fs-done { font-size: 13px; color: #6EE7B7; display: flex; align-items: center; gap: 6px; }

@keyframes gdRise { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
@keyframes gdPop { 0% { transform: scale(.6); } 100% { transform: scale(1); } }
@media (prefers-reduced-motion: reduce) {
  .gd-fold, .gd-inner, .gd-chev, .gd-ring circle:last-child { transition: none !important; }
  .gd-card, .gd-step, .gd-hero, .gd-fs { animation: none !important; }
}
`

// Los 5 primeros pasos. "guide" abre la guía que lo explica.
const FIRST_STEPS = [
  { key: 'influencer', to: 'crear:influencer',      guide: 'guia-cargar-influencer' },
  { key: 'whatsapp',   to: '/network/influencers',  guide: 'guia-completar-faltantes' },
  { key: 'contact',    to: '/network/influencers',  guide: 'guia-contactar' },
  { key: 'task',       to: 'crear:task',            guide: 'guia-crear-tarea' },
  { key: 'invite',     to: '/network/influencers',  guide: 'guia-mandar-invitacion' },
]

const fmtDate = (iso) => {
  try { return new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' }) } catch { return '' }
}

// ── Texto de una guía, con el estilo oscuro de Network ──────────
function GuideBody({ text }) {
  const tokens = useMemo(() => tokenize(text || ''), [text])
  return (
    <div className="gd-body">
      {tokens.map((tk, i) => {
        if (tk.type === 'ol') return <ol key={i} className="gd-steps">{tk.items.map((it, j) => <li key={j}><span>{renderInline(it)}</span></li>)}</ol>
        if (tk.type === 'ul') return <ul key={i} className="gd-dots">{tk.items.map((it, j) => <li key={j}>{renderInline(it)}</li>)}</ul>
        if (tk.type === 'quote') return <div key={i} className="gd-quote">{tk.lines.map((l, j) => <div key={j}>{renderInline(l)}</div>)}</div>
        if (tk.type === 'h1' || tk.type === 'h2' || tk.type === 'h3') return <div key={i} className="gd-h">{renderInline(tk.text)}</div>
        if (tk.type === 'table') {
          const tb = parseTable(tk.lines)
          if (!tb) return null
          return (
            <div key={i} style={{ overflowX: 'auto' }}>
              <table className="gd-table">
                <thead><tr>{tb.headers.map((h, j) => <th key={j}>{renderInline(h)}</th>)}</tr></thead>
                <tbody>{tb.rows.map((r, j) => <tr key={j}>{r.map((c, k) => <td key={k}>{renderInline(c)}</td>)}</tr>)}</tbody>
              </table>
            </div>
          )
        }
        return <div key={i}>{tk.lines.map((l, j) => <div key={j}>{renderInline(l)}</div>)}</div>
      })}
    </div>
  )
}

// ── Una guía (pregunta que se abre) ─────────────────────────────
function GuideCard({ guide, open, onToggle, query, canEdit, onSaved, delay, flash, cardRef }) {
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)
  const [draftTitle, setDraftTitle] = useState('')
  const [draftBody, setDraftBody] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)
  const id = `gd-${guide.slug}`

  const startEdit = () => { setDraftTitle(guide.title); setDraftBody(guide.body); setErr(null); setEditing(true) }
  const save = async () => {
    if (saving || !draftTitle.trim()) return
    setSaving(true); setErr(null)
    try {
      await dbPatchManual(guide.id, { title: draftTitle.trim(), body: draftBody })
      onSaved(guide.id, { title: draftTitle.trim(), body: draftBody, updatedAt: new Date().toISOString() })
      setEditing(false)
    } catch (e) { setErr(e.message) } finally { setSaving(false) }
  }

  const action = guide.action && isValidAction(guide.action.to) ? guide.action : null

  return (
    <div ref={cardRef} className={`gd-card${flash ? ' gd-flash' : ''}`} data-open={open} style={{ animationDelay: `${delay}ms` }}>
      <button className="gd-head" onClick={onToggle} aria-expanded={open} aria-controls={id}>
        <div className="gd-q">
          <div className="gd-qt">
            {highlightParts(guide.title, query).map((p, i) => p.hit ? <mark key={i} className="gd-mark">{p.t}</mark> : <React.Fragment key={i}>{p.t}</React.Fragment>)}
          </div>
          {guide.subtitle && <div className="gd-qs">{guide.subtitle}</div>}
        </div>
        <ChevronDown size={18} className="gd-chev"/>
      </button>
      <div className="gd-fold" id={id} role="region" aria-label={guide.title}>
        <div>
          {open && (
            <div className="gd-inner">
              {editing ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <input className="gd-ta" value={draftTitle} onChange={e => setDraftTitle(e.target.value)} aria-label={t('guide.editTitle')}/>
                  <textarea className="gd-ta" rows={Math.max(8, draftBody.split('\n').length + 1)} value={draftBody} onChange={e => setDraftBody(e.target.value)} aria-label={t('guide.editBody')}/>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{t('guide.editHelp')}</div>
                  {err && <div role="alert" style={{ fontSize: 12, color: '#F87171' }}>{err}</div>}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="gd-go" onClick={save} disabled={saving}><Check size={14}/>{saving ? t('manual.saving') : t('manual.save')}</button>
                    <button className="gd-edit" onClick={() => setEditing(false)} disabled={saving}>{t('manual.cancel')}</button>
                  </div>
                </div>
              ) : (
                <>
                  <GuideBody text={guide.text}/>
                  <div className="gd-foot">
                    {action && (
                      <button className="gd-go" onClick={() => runGuideAction(action.to, navigate)}>
                        {action.label || t('guide.goThere')}<ArrowRight size={15}/>
                      </button>
                    )}
                    {canEdit && <button className="gd-edit" onClick={startEdit}><Edit3 size={11}/>{t('manual.edit')}</button>}
                    {guide.updatedAt && <span className="gd-date">{t('guide.updated', { date: fmtDate(guide.updatedAt) })}</span>}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Primeros pasos ──────────────────────────────────────────────
function FirstSteps({ onOpenGuide }) {
  const navigate = useNavigate()
  const [state, setState] = useState(null)
  const [expanded, setExpanded] = useState(null)   // null = automático

  useEffect(() => {
    let alive = true
    const load = () => dbGetFirstSteps().then(s => { if (alive) setState(s) }).catch(() => { if (alive) setState({}) })
    load()
    // Al volver a la pestaña (después de "Llevame ahí") se actualiza.
    const onVis = () => { if (document.visibilityState === 'visible') load() }
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('network:created', load)
    return () => { alive = false; document.removeEventListener('visibilitychange', onVis); window.removeEventListener('network:created', load) }
  }, [])

  if (!state) return <div className="gd-fs" style={{ height: 76, opacity: .6 }} aria-hidden="true"/>

  const done = FIRST_STEPS.filter(s => state[s.key]).length
  const total = FIRST_STEPS.length
  const all = done === total
  const show = expanded ?? !all
  const R = 18, C = 2 * Math.PI * R

  return (
    <section className="gd-fs" aria-label={t('guide.first.title')}>
      <div className="gd-fs-top">
        <svg className="gd-ring" width="46" height="46" viewBox="0 0 46 46" aria-hidden="true">
          <circle cx="23" cy="23" r={R} fill="none" stroke="rgba(167,139,250,.2)" strokeWidth="4"/>
          <circle cx="23" cy="23" r={R} fill="none" stroke={all ? '#10B981' : 'url(#gdg)'} strokeWidth="4" strokeLinecap="round"
            strokeDasharray={C} strokeDashoffset={C * (1 - done / total)} transform="rotate(-90 23 23)"/>
          <defs><linearGradient id="gdg" x1="0" x2="1"><stop offset="0" stopColor="#A78BFA"/><stop offset="1" stopColor="#E879F9"/></linearGradient></defs>
          <text x="23" y="27" textAnchor="middle" fontSize="12" fontWeight="800" fill="#fff">{done}/{total}</text>
        </svg>
        <div style={{ minWidth: 0 }}>
          <div className="gd-fs-t">{t('guide.first.title')}</div>
          {all
            ? <div className="gd-fs-done"><Sparkles size={13}/>{t('guide.first.allDone')}</div>
            : <div className="gd-fs-s">{t('guide.first.sub')}</div>}
        </div>
        <button className="gd-fs-tg" onClick={() => setExpanded(!show)} aria-expanded={show}>{show ? t('guide.first.hide') : t('guide.first.show')}</button>
      </div>
      {show && (
        <ol className="gd-steplist">
          {FIRST_STEPS.map((s, i) => (
            <li key={s.key} className="gd-step" data-done={!!state[s.key]} style={{ animationDelay: `${i * 45}ms` }}>
              <span className="gd-tick" aria-hidden="true"><Check size={14} strokeWidth={3}/></span>
              <span className="gd-step-l">
                {t(`guide.first.steps.${s.key}`)}
                <span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>{state[s.key] ? t('guide.first.doneSr') : ''}</span>
              </span>
              <button className="gd-step-how" onClick={() => onOpenGuide(s.guide)}>{t('guide.first.how')}</button>
              {!state[s.key] && (
                <button className="gd-step-go" onClick={() => runGuideAction(s.to, navigate)} aria-label={t('guide.goThere')}><ArrowRight size={15}/></button>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

// ── La pestaña ──────────────────────────────────────────────────
export default function GuideTab({ guides, categories, canEdit, initialSlug, onSlugChange }) {
  const [list, setList] = useState(guides)
  const [query, setQuery] = useState('')
  const [cat, setCat] = useState(null)
  const [openSlug, setOpenSlug] = useState(initialSlug || null)
  const [flash, setFlash] = useState(null)
  const refs = useRef({})
  const inputRef = useRef(null)

  useEffect(() => { setList(guides) }, [guides])

  const indexed = useMemo(() => list.map(indexGuide), [list])
  const searching = query.trim().length > 0
  const results = useMemo(() => {
    const r = searchGuides(indexed, query)
    return !searching && cat ? r.filter(g => g.category === cat) : r
  }, [indexed, query, cat, searching])

  // Agrupado por tema (sin agrupar cuando se busca: ahí manda la relevancia).
  const groups = useMemo(() => {
    if (searching) return [{ code: 'r', name: null, items: results }]
    return categories
      .map(c => ({ code: c.code, name: c.name, items: results.filter(g => g.category === c.code) }))
      .filter(g => g.items.length)
  }, [results, categories, searching])

  const openGuide = (slug, scroll = true) => {
    setQuery(''); setCat(null); setOpenSlug(slug); onSlugChange?.(slug)
    if (scroll) {
      setFlash(slug)
      setTimeout(() => refs.current[slug]?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60)
      setTimeout(() => setFlash(null), 1500)
    }
  }

  // Al entrar con ?guia=… se abre y se muestra esa guía (solo al entrar:
  // después el link se actualiza al abrir otras, sin mover la pantalla).
  useEffect(() => {
    const slug = initialSlug
    if (!slug) return
    const id = setTimeout(() => {
      refs.current[slug]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setFlash(slug); setTimeout(() => setFlash(null), 1500)
    }, 250)
    return () => clearTimeout(id)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (slug) => {
    const next = openSlug === slug ? null : slug
    setOpenSlug(next); onSlugChange?.(next)
  }
  const onSaved = (id, patch) => setList(prev => prev.map(g => g.id === id ? { ...g, ...patch } : g))

  let n = 0
  return (
    <div className="gd">
      <style>{CSS}</style>

      <header className="gd-hero">
        <span className="gd-eyebrow"><Compass size={12}/>{t('guide.eyebrow')}</span>
        <h2 className="gd-h1">{t('guide.title')}</h2>
        <p className="gd-sub">{t('guide.sub')}</p>
      </header>

      <div className="gd-search">
        <label className="gd-box">
          <Search size={17} color="#A78BFA" aria-hidden="true"/>
          <span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>{t('guide.searchLabel')}</span>
          <input ref={inputRef} type="text" inputMode="search" enterKeyHint="search" value={query} onChange={e => setQuery(e.target.value)}
            placeholder={t('guide.searchPlaceholder')} autoComplete="off" autoCorrect="off" spellCheck={false}
            onKeyDown={e => { if (e.key === 'Escape') setQuery('') }}/>
          {searching && <span className="gd-count" aria-live="polite">{t(results.length === 1 ? 'guide.oneResult' : 'guide.results', { n: results.length })}</span>}
          {searching && <button className="gd-x" onClick={() => { setQuery(''); inputRef.current?.focus() }} aria-label={t('guide.clear')}><X size={15}/></button>}
        </label>
      </div>

      {!searching && <FirstSteps onOpenGuide={openGuide}/>}

      {!searching && (
        <div className="gd-chips" role="toolbar" aria-label={t('guide.topics')}>
          <button className="gd-chip" aria-pressed={!cat} onClick={() => setCat(null)}>{t('guide.all')}</button>
          {categories.map(c => (
            <button key={c.code} className="gd-chip" aria-pressed={cat === c.code} onClick={() => setCat(cat === c.code ? null : c.code)}>{c.name}</button>
          ))}
        </div>
      )}

      {searching && results.length === 0 && (
        <div className="gd-empty">
          <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>{t('guide.noResults', { q: query.trim() })}</div>
          <div>{t('guide.noResultsHint')}</div>
        </div>
      )}

      {groups.map(g => (
        <section key={g.code} className="gd-group">
          {g.name && <h3 className="gd-gtitle">{g.name}</h3>}
          {g.items.map(guide => {
            const delay = Math.min(n++, 10) * 35
            return (
              <GuideCard key={guide.id} guide={guide} query={query} canEdit={canEdit} delay={delay}
                open={openSlug === guide.slug} onToggle={() => toggle(guide.slug)} onSaved={onSaved}
                flash={flash === guide.slug} cardRef={el => { refs.current[guide.slug] = el }}/>
            )
          })}
        </section>
      ))}
    </div>
  )
}
