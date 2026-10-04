// Prospectos de marcas (Dirección y Admin) · migración 063.
// Buscar comercios en Google Maps por rubro y ciudad, y decidir:
// contactar (se crea la ficha a tu cargo + link de propuesta),
// asignar a una scouter (ficha a su cargo + tarea) o descartar.
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, MessageCircle, X, Copy, ExternalLink, MapPin, RotateCcw, Star } from 'lucide-react'
import { t } from '../../i18n/index.js'
import {
  dbProspectSearch, dbListProspects, dbProspectCounts, dbProspectUsage, dbProspectAct,
  dbGetActiveScouters, dbGetGeography, dbGetMessageTemplates,
} from '../../lib/database.js'
import { PARTNERS_URL } from '../../partners/content.js'
import { renderTemplate } from '../components/MessageSheet.jsx'
import { toast } from '../components/Toaster.jsx'
import { quiet } from '../../lib/quiet.js'

const FREE_PER_MONTH = 1000
const TABS = ['new', 'assigned', 'contacted', 'discarded']
const FILTERS = [
  ['r4', (p) => (p.rating || 0) >= 4],
  ['r50', (p) => (p.reviews || 0) >= 50],
  ['web', (p) => !!p.website],
  ['ig', (p) => !!p.instagram],
  ['phone', (p) => !!p.phone],
]

const card  = { background: 'var(--glass-bg)', border: '1px solid var(--border-violet)', borderRadius: 14, padding: 16 }
const label = { fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: 1.2, textTransform: 'uppercase' }
const input = { width: '100%', padding: '11px 12px', borderRadius: 10, background: 'rgba(139,92,246,0.07)', border: '1px solid var(--border-violet)', color: 'var(--text-primary)', fontSize: 16 }
const btn   = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 40, padding: '9px 14px', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', border: 'none' }
const soft  = { ...btn, background: 'rgba(139,92,246,0.08)', border: '1px solid var(--border-violet)', color: 'var(--text-secondary)' }
const chip  = (on) => ({ padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', minHeight: 32, background: on ? 'rgba(139,92,246,0.25)' : 'rgba(139,92,246,0.07)', color: on ? 'var(--primary-violet-light)' : 'var(--text-secondary)', border: on ? '1px solid rgba(139,92,246,0.6)' : '1px solid var(--border-violet)' })
const has   = (ok) => ({ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6, textDecoration: 'none', background: ok ? 'rgba(52,211,153,0.08)' : 'transparent', color: ok ? '#6EE7B7' : 'var(--text-tertiary)', border: ok ? '1px solid rgba(52,211,153,0.25)' : '1px dashed rgba(148,143,168,0.35)' })

const waDigits = (phone) => String(phone || '').replace(/[^0-9]/g, '')
const fmtNum = (n) => Number(n || 0).toLocaleString()

// t() reemplaza {variables}: se le devuelven las mismas para que la
// plantilla conserve los marcadores y se completen al armar el mensaje.
const KEEP = { marca: '{marca}', ciudad: '{ciudad}', link: '{link}', yo: '{yo}', nombre: '{nombre}' }
const DEFAULT_TEMPLATES = () => [
  { id: 'd1', title: t('prospects.tpl.general'), body: t('prospects.tpl.generalBody', KEEP) },
  { id: 'd2', title: t('prospects.tpl.gastro'),  body: t('prospects.tpl.gastroBody', KEEP) },
  { id: 'd3', title: t('prospects.tpl.short'),   body: t('prospects.tpl.shortBody', KEEP) },
]

export default function ProspectsPage({ currentUser }) {
  const navigate = useNavigate()
  const [query, setQuery]       = useState('')
  const [city, setCity]         = useState('')
  const [searching, setSearching] = useState(false)
  const [usage, setUsage]       = useState({ today: 0, month: 0, recent: [] })
  const [searchId, setSearchId] = useState(null)       // null = todas
  const [tab, setTab]           = useState('new')
  const [rows, setRows]         = useState(null)
  const [counts, setCounts]     = useState({})
  const [sort, setSort]         = useState('reviews')
  const [flt, setFlt]           = useState({})
  const [scouters, setScouters] = useState([])
  const [templates, setTemplates] = useState([])
  const [sheet, setSheet]       = useState(null)        // prospecto a contactar
  const [tplId, setTplId]       = useState(null)
  const [busy, setBusy]         = useState(null)

  const me = currentUser?.nombre?.split(' ')[0] || ''

  const loadUsage = useCallback(() => dbProspectUsage().then(setUsage).catch(quiet('ProspectsPage')), [])
  const loadList = useCallback(async (sid = searchId, tb = tab) => {
    setRows(null)
    try {
      const [list, c] = await Promise.all([dbListProspects({ status: tb, searchId: sid }), dbProspectCounts(sid)])
      setRows(list); setCounts(c)
    } catch (e) { toast(e.message); setRows([]) }
  }, [searchId, tab])

  useEffect(() => {
    dbProspectUsage().then(u => { setUsage(u); const last = u.recent[0]; if (last) { setSearchId(last.id); setQuery(last.query); setCity(last.city) } loadList(last?.id || null, 'new') }).catch(() => loadList(null, 'new'))
    Promise.all([dbGetActiveScouters(null), dbGetGeography()]).then(([s, g]) => {
      const cityName = Object.fromEntries((g.cities || []).map(c => [c.id, c.name]))
      setScouters(s.map(x => ({ id: x.userId, name: (x.sobrenombre || '').trim() || x.nombre || x.email, city: cityName[x.cityId] || '' }))
        .sort((a, b) => a.name.localeCompare(b.name)))
    }).catch(quiet('ProspectsPage'))
    dbGetMessageTemplates({ target: 'brand' }).then(list => setTemplates(list.length ? list : DEFAULT_TEMPLATES())).catch(() => setTemplates(DEFAULT_TEMPLATES()))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const runSearch = async (q = query, c = city) => {
    if (!q.trim() || !c.trim() || searching) { if (!q.trim() || !c.trim()) toast(t('prospects.needBoth')); return }
    setSearching(true)
    try {
      const r = await dbProspectSearch(q.trim(), c.trim())
      setSearchId(r.search_id); setTab('new')
      await Promise.all([loadUsage(), loadList(r.search_id, 'new')])
      toast(t('prospects.found', { n: r.new }))
    } catch (e) {
      toast(t(`prospects.err.${e.code}`) !== `prospects.err.${e.code}` ? t(`prospects.err.${e.code}`) : t('prospects.err.search_failed'))
    } finally { setSearching(false) }
  }

  const pickSearch = (s) => {
    setSearchId(s?.id || null); setTab('new')
    if (s) { setQuery(s.query); setCity(s.city) }
    loadList(s?.id || null, 'new')
  }
  const pickTab = (k) => { setTab(k); loadList(searchId, k) }

  const shown = useMemo(() => {
    let list = (rows || []).filter(p => FILTERS.every(([k, fn]) => !flt[k] || fn(p)))
    list = [...list].sort((a, b) => sort === 'reviews' ? (b.reviews || 0) - (a.reviews || 0) : (b.rating || 0) - (a.rating || 0))
    return list
  }, [rows, flt, sort])

  const act = async (p, action, opts) => {
    setBusy(p.id)
    try {
      const r = await dbProspectAct(p.id, action, opts)
      await loadList(searchId, tab)
      if (action === 'assign') toast(t('prospects.assigned', { name: scouters.find(s => s.id === opts.scouterId)?.name || '' }))
      return r
    } catch (e) { toast(e.message); return null }
    finally { setBusy(null) }
  }

  // Contactar: el mensaje se arma con la plantilla y el link de propuesta
  // que se crea recién al confirmar (así no queda una ficha sin trabajar).
  const tpl = templates.find(x => x.id === tplId) || templates[0]
  const buildMessage = (p, token) => {
    const link = token ? `${PARTNERS_URL}/p/${token}` : `${PARTNERS_URL}/p/…`
    let body = renderTemplate(tpl?.body || '', { entity: { name: p.name }, cityName: p.city || '', me })
    body = /\{link\}|\{propuesta\}/.test(body) ? body.replace(/\{link\}|\{propuesta\}/g, link) : `${body}\n${link}`
    return body
  }
  const contactWhatsApp = async () => {
    const p = sheet
    const win = window.open('', '_blank')   // antes del await: si no, el celular lo bloquea
    const r = await act(p, 'contact', { lang: 'es' })
    if (!r) { win?.close(); return }
    const url = `https://wa.me/${waDigits(p.phone)}?text=${encodeURIComponent(buildMessage(p, r.token))}`
    if (win) win.location.href = url; else window.location.href = url
    setSheet(null)
  }
  const contactCopy = async () => {
    const p = sheet
    const r = await act(p, 'contact', { lang: 'es' })
    if (!r) return
    const msg = buildMessage(p, r.token)
    try { await navigator.clipboard.writeText(msg); toast(t('prospects.copied')) }
    catch { window.prompt(t('prospects.copyManual'), msg) }
    setSheet(null)
  }

  const freeLeft = Math.max(0, FREE_PER_MONTH - usage.month)
  const currentSearch = usage.recent.find(s => s.id === searchId)

  return (
    <div style={{ padding: '20px clamp(16px,3vw,28px) 40px', maxWidth: 1180 }}>
      {/* Encabezado + contador */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
        <div>
          <div style={{ ...label, color: 'var(--primary-violet-light)' }}>{t('prospects.kicker')}</div>
          <h1 style={{ margin: '6px 0 4px', fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>{t('prospects.title')}</h1>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>{t('prospects.subtitle')}</p>
        </div>
        <div style={{ ...card, padding: '10px 14px', minWidth: 240, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 12 }}><span style={{ color: 'var(--text-secondary)' }}>{t('prospects.usage.today')}</span><b style={{ color: 'var(--text-primary)' }}>{usage.today}</b></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 12 }}><span style={{ color: 'var(--text-secondary)' }}>{t('prospects.usage.month')}</span><b style={{ color: 'var(--text-primary)' }}>{fmtNum(usage.month)}</b></div>
          <div style={{ height: 6, borderRadius: 3, background: 'rgba(139,92,246,0.15)', overflow: 'hidden' }}><div style={{ height: '100%', width: `${Math.min(100, usage.month / FREE_PER_MONTH * 100)}%`, background: usage.month >= FREE_PER_MONTH ? '#FBBF24' : 'linear-gradient(90deg,var(--primary-violet),var(--primary-violet-light))' }}/></div>
          <div style={{ fontSize: 11, color: usage.month >= FREE_PER_MONTH ? '#FBBF24' : 'var(--text-tertiary)' }}>{freeLeft > 0 ? t('prospects.usage.free', { n: fmtNum(freeLeft) }) : t('prospects.usage.paid')}</div>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'flex-start' }}>
        {/* Buscar */}
        <div style={{ flex: '1 1 280px', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <form style={{ ...card, display: 'flex', flexDirection: 'column', gap: 12 }} onSubmit={(e) => { e.preventDefault(); runSearch() }}>
            <div style={label}>{t('prospects.newSearch')}</div>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
              {t('prospects.query')}
              <input style={input} value={query} onChange={e => setQuery(e.target.value)} placeholder={t('prospects.queryPh')}/>
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
              {t('prospects.city')}
              <input style={input} value={city} onChange={e => setCity(e.target.value)} placeholder={t('prospects.cityPh')}/>
            </label>
            <button type="submit" disabled={searching} style={{ ...btn, background: 'var(--primary-violet)', color: 'white', minHeight: 44, opacity: searching ? 0.7 : 1 }}>
              <Search size={16}/>{searching ? t('prospects.searching') : t('prospects.search')}
            </button>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{t('prospects.searchHint')}</div>
          </form>

          {usage.recent.length > 0 && (
            <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={label}>{t('prospects.recent')}</div>
              <button onClick={() => pickSearch(null)} style={{ ...soft, justifyContent: 'space-between', width: '100%', ...(searchId === null ? { borderColor: 'var(--primary-violet)', color: 'var(--text-primary)' } : {}) }}>
                <span>{t('prospects.all')}</span>
              </button>
              {usage.recent.map(s => (
                <button key={s.id} onClick={() => pickSearch(s)} style={{ ...soft, justifyContent: 'space-between', width: '100%', ...(searchId === s.id ? { borderColor: 'var(--primary-violet)', color: 'var(--text-primary)' } : {}) }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.query} · {s.city}</span>
                  <span style={{ color: 'var(--text-tertiary)', fontWeight: 600 }}>{s.results}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Resultados */}
        <div style={{ flex: '999 1 560px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ ...card, padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
                {currentSearch ? t('prospects.resultsFor', { q: currentSearch.query, c: currentSearch.city }) : t('prospects.allResults')}
              </div>
              {(counts.in_network || 0) > 0 && <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{t('prospects.inNetwork', { n: counts.in_network })}</div>}
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{t('prospects.sort')}</span>
              {['reviews', 'rating'].map(k => <button key={k} onClick={() => setSort(k)} aria-pressed={sort === k} style={chip(sort === k)}>{t(`prospects.sortBy.${k}`)}</button>)}
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{t('prospects.filter')}</span>
              {FILTERS.map(([k]) => <button key={k} onClick={() => setFlt(f => ({ ...f, [k]: !f[k] }))} aria-pressed={!!flt[k]} style={chip(!!flt[k])}>{t(`prospects.flt.${k}`)}</button>)}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 18, borderBottom: '1px solid var(--border-violet)', overflowX: 'auto' }}>
            {TABS.map(k => (
              <button key={k} onClick={() => pickTab(k)} style={{ padding: '10px 4px', fontSize: 13, fontWeight: 600, cursor: 'pointer', background: 'none', border: 'none', borderBottom: `2px solid ${tab === k ? 'var(--primary-violet)' : 'transparent'}`, color: tab === k ? 'var(--primary-violet-light)' : 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>
                {t(`prospects.tab.${k}`)} ({counts[k] || 0})
              </button>
            ))}
          </div>

          {rows === null ? (
            <div style={{ height: 120, borderRadius: 14, background: 'rgba(139,92,246,0.06)', animation: 'pulse 1.5s ease-in-out infinite' }}/>
          ) : shown.length === 0 ? (
            <div style={{ ...card, textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13, padding: 28 }}>
              {usage.recent.length === 0 ? t('prospects.emptyFirst') : tab === 'new' ? t('prospects.emptyNew') : t('prospects.emptyTab')}
            </div>
          ) : shown.map(p => (
            <div key={p.id} style={{ ...card, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10, opacity: busy === p.id ? 0.6 : 1 }}>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'space-between', flexWrap: 'wrap' }}>
                <div style={{ minWidth: 0, flex: '1 1 240px' }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 3 }}>{[p.category, p.address].filter(Boolean).join(' · ')}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 18, fontWeight: 800, color: '#FCD34D' }}>{p.rating != null ? p.rating.toFixed(1) : '—'} <Star size={13} fill="#FCD34D"/></div>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{t('prospects.reviews', { n: fmtNum(p.reviews) })}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <span style={has(!!p.phone)}>{p.phone ? p.phone : t('prospects.no.phone')}</span>
                {p.website ? <a href={p.website} target="_blank" rel="noopener noreferrer" style={has(true)}>{t('prospects.has.web')}<ExternalLink size={10}/></a> : <span style={has(false)}>{t('prospects.no.web')}</span>}
                {p.instagram ? <a href={`https://www.instagram.com/${p.instagram}/`} target="_blank" rel="noopener noreferrer" style={has(true)}>@{p.instagram}</a> : <span style={has(false)}>{t('prospects.no.ig')}</span>}
                {p.email ? <span style={has(true)}>{p.email}</span> : <span style={has(false)}>{t('prospects.no.email')}</span>}
                {p.mapsUrl && <a href={p.mapsUrl} target="_blank" rel="noopener noreferrer" style={{ ...has(true), background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border-violet)' }}><MapPin size={10}/>{t('prospects.maps')}</a>}
              </div>

              {p.status === 'new' && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <button onClick={() => { setTplId(templates[0]?.id || null); setSheet(p) }} disabled={busy === p.id} style={{ ...btn, background: '#25D366', color: '#062b14' }}><MessageCircle size={15}/>{t('prospects.contact')}</button>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
                    {t('prospects.assignTo')}
                    <select defaultValue="" disabled={busy === p.id} onChange={e => { const v = e.target.value; e.target.value = ''; if (v) act(p, 'assign', { scouterId: v }) }}
                      style={{ fontSize: 13, padding: '8px 10px', borderRadius: 10, background: 'var(--bg-tertiary)', border: '1px solid var(--border-violet)', color: 'var(--text-primary)', minHeight: 40 }}>
                      <option value="">{t('prospects.pickScouter')}</option>
                      {scouters.map(s => <option key={s.id} value={s.id}>{s.name}{s.city ? ` · ${s.city}` : ''}</option>)}
                    </select>
                  </label>
                  <button onClick={() => act(p, 'discard')} disabled={busy === p.id} style={soft}><X size={14}/>{t('prospects.discard')}</button>
                </div>
              )}
              {(p.status === 'assigned' || p.status === 'contacted') && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', fontSize: 12, color: 'var(--text-secondary)' }}>
                  <span>{p.status === 'assigned' ? t('prospects.assignedTo', { name: scouters.find(s => s.id === p.assignedTo)?.name || '…' }) : t('prospects.contactedNote')}</span>
                  {p.brandId && <button onClick={() => navigate(`/network/brands/${p.brandId}`)} style={{ ...soft, minHeight: 32, padding: '5px 10px' }}><ExternalLink size={13}/>{t('prospects.openBrand')}</button>}
                </div>
              )}
              {p.status === 'discarded' && (
                <div><button onClick={() => act(p, 'restore')} disabled={busy === p.id} style={{ ...soft, minHeight: 32, padding: '5px 10px' }}><RotateCcw size={13}/>{t('prospects.restore')}</button></div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Hoja: contactar */}
      {sheet && (
        <div onClick={() => setSheet(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(5,3,12,0.7)', zIndex: 300, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: 16 }}>
          <div onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={t('prospects.contact')}
            style={{ width: '100%', maxWidth: 520, background: 'var(--bg-secondary)', border: '1px solid rgba(139,92,246,0.4)', borderRadius: 18, padding: 20, display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 'env(safe-area-inset-bottom, 0px)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ ...label, color: 'var(--primary-violet-light)' }}>{t('prospects.contact')}</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>{sheet.name}</div>
              </div>
              <button onClick={() => setSheet(null)} aria-label={t('prospects.close')} style={{ ...soft, minHeight: 36, padding: '6px 10px' }}><X size={14}/></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={label}>{t('prospects.template')}</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {templates.map(x => <button key={x.id} onClick={() => setTplId(x.id)} aria-pressed={tpl?.id === x.id} style={chip(tpl?.id === x.id)}>{x.title}</button>)}
              </div>
            </div>
            <div style={{ fontSize: 14, lineHeight: 1.55, background: 'rgba(139,92,246,0.07)', border: '1px solid var(--border-violet)', borderRadius: 12, padding: '12px 14px', color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>{buildMessage(sheet, null)}</div>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{t('prospects.contactHint')}</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {sheet.phone && <button onClick={contactWhatsApp} disabled={!!busy} style={{ ...btn, flex: '1 1 200px', minHeight: 44, background: '#25D366', color: '#062b14' }}><MessageCircle size={15}/>{t('prospects.openWa')}</button>}
              <button onClick={contactCopy} disabled={!!busy} style={{ ...soft, flex: '1 1 140px', minHeight: 44 }}><Copy size={14}/>{t('prospects.copy')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
