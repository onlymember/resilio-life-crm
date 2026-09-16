import React, { useState, useEffect, useRef } from 'react'
import { X, Upload, AlertTriangle } from 'lucide-react'
import { t } from '../../i18n/index.js'
import { supabase } from '../../lib/supabase.js'
import { dbGetGeography, dbSaveInfluencer, dbSaveBrand } from '../../lib/database.js'

// ── Normalization ─────────────────────────────────────────
const norm = (s) => (s||'').toString().trim().toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '')

const normHeader = (s) => norm(s).replace(/\s+/g, '_')

const VALID_TIERS = new Set(['nano','micro','mid','macro','mega'])
const VALID_RELS  = new Set(['cold','warm','strong','inactive'])

// ── Header maps ────────────────────────────────────────────
const INFLUENCER_MAP = {
  nombre:'name', instagram:'instagram', username:'username', tiktok:'tiktok',
  email:'email', telefono:'phone', whatsapp:'whatsapp', seguidores:'followers',
  engagement:'engagement', vistas_promedio:'averageViews', categoria:'category',
  tier:'tier', ciudad:'ciudad', pais:'pais', relacion:'relationshipStatus',
  proxima_accion:'nextAction', proxima_accion_fecha:'nextActionAt', notas:'notes',
}
const BRAND_MAP = {
  nombre:'name', categoria:'category', sitio_web:'website', instagram:'instagram',
  email:'email', telefono:'phone', whatsapp:'whatsapp', ciudad:'ciudad', pais:'pais',
  relacion:'relationshipStatus', potencial:'potential',
  proximo_seguimiento:'nextFollowUp', notas:'notes',
}

// ── CSV/TSV parser ─────────────────────────────────────────
function parseLine(line, sep) {
  const result = []
  let i = 0
  while (i < line.length) {
    if (line[i] === '"') {
      i++
      let val = ''
      while (i < line.length) {
        if (line[i] === '"' && i+1 < line.length && line[i+1] === '"') { val += '"'; i += 2 }
        else if (line[i] === '"') { i++; break }
        else val += line[i++]
      }
      if (i < line.length && line[i] === sep) i++
      result.push(val)
    } else {
      const start = i
      while (i < line.length && line[i] !== sep) i++
      result.push(line.slice(start, i))
      if (i < line.length) i++
    }
  }
  if (line.length > 0 && line[line.length-1] === sep) result.push('')
  return result
}

function parseRawText(text) {
  if (!text || !text.trim()) return null
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1)
  const lines = text.replace(/\r\n/g,'\n').replace(/\r/g,'\n').split('\n').filter(l => l.trim())
  if (lines.length < 2) return null
  const sep = lines[0].includes('\t') ? '\t' : ','
  const headers = parseLine(lines[0], sep)
  const rows = []
  for (let j = 1; j < lines.length; j++) {
    const fields = parseLine(lines[j], sep)
    const obj = {}
    headers.forEach((h, idx) => { obj[h] = fields[idx] ?? '' })
    rows.push(obj)
  }
  return { headers, rows }
}

// ── Field normalizers ──────────────────────────────────────
function normalizeHandle(val) {
  if (!val) return null
  val = val.trim()
  const m = val.match(/(?:instagram\.com\/|tiktok\.com\/@?)([A-Za-z0-9._]+)/)
  if (m) return m[1]
  return val.replace(/^@/, '') || null
}

function parseDate(val) {
  const v = (val||'').trim()
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null
}

// ── Build one preview row ──────────────────────────────────
function buildRow(kind, rawRow, headerMap, geo, existingSet) {
  const obj = {}
  const warnings = []

  for (const [header, rawVal] of Object.entries(rawRow)) {
    const field = headerMap[normHeader(header)]
    if (!field) continue
    const val = (rawVal||'').trim()
    if (!val) continue  // empty cell → omit key entirely

    if (field === 'instagram' || field === 'tiktok') {
      const h = normalizeHandle(val)
      if (h) obj[field] = h
    } else if (field === 'followers' || field === 'averageViews') {
      const clean = val.replace(/[^\d]/g, '')
      const n = parseInt(clean, 10)
      if (!clean || isNaN(n)) warnings.push(`"${header}": valor no numérico ("${val}"), se omite`)
      else obj[field] = n
    } else if (field === 'engagement') {
      const n = parseFloat(val.replace(',','.').replace('%',''))
      if (isNaN(n)) warnings.push(`"${header}": valor no numérico ("${val}"), se omite`)
      else obj[field] = n
    } else if (field === 'tier') {
      const low = val.toLowerCase().trim()
      if (VALID_TIERS.has(low)) obj[field] = low
      else warnings.push(t('import.badTier') + ` (${val})`)
    } else if (field === 'relationshipStatus') {
      const low = val.toLowerCase().trim()
      if (VALID_RELS.has(low)) obj[field] = low
      else warnings.push(t('import.badRelation') + ` (${val})`)
    } else if (field === 'nextActionAt' || field === 'nextFollowUp') {
      const d = parseDate(val)
      if (!d) warnings.push(`"${header}": fecha inválida ("${val}"), se omite`)
      else obj[field] = d
    } else if (field === 'pais') {
      obj[field] = val.toLowerCase().trim()
    } else {
      obj[field] = val
    }
  }

  const errors = []
  if (!obj.name) errors.push(t('import.noName'))

  if (obj.ciudad && geo?.cities?.length) {
    const cn = norm(obj.ciudad)
    if (!geo.cities.some(c => norm(c.name) === cn)) {
      warnings.push(t('import.cityNotFound'))
    }
  }

  let isDuplicate = false
  if (kind === 'influencers') {
    const eN = obj.email ? norm(obj.email) : null
    const iN = obj.instagram ? norm(obj.instagram) : null
    if ((eN && existingSet.emails.has(eN)) || (iN && existingSet.instagrams.has(iN))) {
      isDuplicate = true
    }
  } else {
    const nN = obj.name ? norm(obj.name) : null
    const eN = obj.email ? norm(obj.email) : null
    if ((nN && existingSet.names.has(nN)) || (eN && existingSet.emails.has(eN))) {
      isDuplicate = true
    }
  }

  return { obj, errors, warnings, isDuplicate, checked: errors.length === 0 && !isDuplicate }
}

// ── Component ──────────────────────────────────────────────
export default function ImportSheet({ kind, onClose, onDone }) {
  const isInfluencers = kind === 'influencers'
  const headerMap     = isInfluencers ? INFLUENCER_MAP : BRAND_MAP

  const [step,        setStep]        = useState('input')
  const [rawText,     setRawText]     = useState('')
  const [parseError,  setParseError]  = useState(null)
  const [rows,        setRows]        = useState([])
  const [unknownCols, setUnknownCols] = useState([])
  const [progress,    setProgress]    = useState({ done:0, total:0 })
  const [results,     setResults]     = useState(null)
  const [geo,         setGeo]         = useState(null)
  const [existingSet, setExistingSet] = useState({ emails:new Set(), instagrams:new Set(), names:new Set() })
  const fileRef = useRef(null)

  useEffect(() => {
    dbGetGeography().then(setGeo).catch(() => setGeo({ cities:[], countries:[] }))
    const table = isInfluencers ? 'influencers' : 'brands'
    const cols  = isInfluencers ? 'email,instagram' : 'name,email'
    supabase.from(table).select(cols).then(({ data }) => {
      if (isInfluencers) {
        setExistingSet({
          emails:     new Set((data||[]).map(r => r.email     ? norm(r.email)     : null).filter(Boolean)),
          instagrams: new Set((data||[]).map(r => r.instagram ? norm(r.instagram) : null).filter(Boolean)),
          names:      new Set(),
        })
      } else {
        setExistingSet({
          emails:     new Set((data||[]).map(r => r.email ? norm(r.email) : null).filter(Boolean)),
          names:      new Set((data||[]).map(r => r.name  ? norm(r.name)  : null).filter(Boolean)),
          instagrams: new Set(),
        })
      }
    }).catch(() => {})
  }, [kind, isInfluencers])

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    setRawText(text)
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleParse = () => {
    setParseError(null)
    const parsed = parseRawText(rawText)
    if (!parsed) { setParseError('No se encontraron datos válidos. Verificá el formato.'); return }
    const { headers, rows: rawRows } = parsed
    const unknown = headers.filter(h => h.trim() && !headerMap[normHeader(h)])
    setUnknownCols(unknown)
    const built = rawRows.map(rr => buildRow(kind, rr, headerMap, geo, existingSet))
    setRows(built)
    setStep('preview')
  }

  const toggleRow = (idx) =>
    setRows(prev => prev.map((r, i) =>
      i !== idx || r.errors.length > 0 ? r : { ...r, checked: !r.checked }
    ))

  const toggleAll = (checked) =>
    setRows(prev => prev.map(r => r.errors.length > 0 ? r : { ...r, checked }))

  const handleImport = async () => {
    const toImport = rows.filter(r => r.checked)
    if (!toImport.length) return
    setStep('importing')
    setProgress({ done:0, total: toImport.length })
    const created = []
    const failed  = []
    for (let i = 0; i < toImport.length; i++) {
      try {
        if (isInfluencers) await dbSaveInfluencer(toImport[i].obj)
        else               await dbSaveBrand(toImport[i].obj)
        created.push(toImport[i].obj.name || '?')
      } catch(e) {
        failed.push({ name: toImport[i].obj.name || '?', error: e.message })
      }
      setProgress({ done: i+1, total: toImport.length })
    }
    setResults({ created: created.length, failed })
    setStep('done')
    if (created.length > 0) onDone()
  }

  const downloadFailed = () => {
    if (!results?.failed?.length) return
    const csv = ['nombre,error', ...results.failed.map(f =>
      `"${(f.name||'').replace(/"/g,'""')}","${(f.error||'').replace(/"/g,'""')}"`
    )].join('\n')
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv' })),
      download: `fallidas_${kind}.csv`,
    })
    a.click(); URL.revokeObjectURL(a.href)
  }

  const validRows  = rows.filter(r => r.errors.length === 0)
  const willImport = rows.filter(r => r.checked).length
  const dupCount   = rows.filter(r => r.isDuplicate).length
  const invCount   = rows.filter(r => r.errors.length > 0).length
  const allChecked = validRows.length > 0 && validRows.every(r => r.checked)

  const sheetStyle = {
    position:'fixed', bottom:0, left:0, right:0, zIndex:401,
    background:'var(--bg-secondary)', borderRadius:'20px 20px 0 0',
    border:'1px solid var(--border-violet)', borderBottom:'none',
    maxHeight:'92vh', display:'flex', flexDirection:'column',
    animation:'slideUp var(--dur-base) var(--ease-emphasized)',
  }

  return (
    <>
      <div
        onClick={step === 'importing' ? undefined : onClose}
        style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:400, backdropFilter:'blur(8px)', animation:'backdropIn var(--dur-fast) var(--ease-standard)' }}
      />
      <div style={sheetStyle}>
        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px 12px', borderBottom:'1px solid rgba(139,92,246,0.12)', flexShrink:0 }}>
          <span style={{ fontSize:15, fontWeight:700, color:'var(--text-primary)' }}>{t('import.title')}</span>
          {step !== 'importing' && (
            <button onClick={onClose} style={{ background:'none', border:'none', color:'var(--text-secondary)', cursor:'pointer' }}>
              <X size={18}/>
            </button>
          )}
        </div>

        <div style={{ flex:1, overflowY:'auto', padding:'16px 20px 28px' }}>

          {/* ── INPUT ── */}
          {step === 'input' && (
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <textarea
                value={rawText}
                onChange={e => setRawText(e.target.value)}
                placeholder={t('import.paste')}
                rows={8}
                style={{ width:'100%', padding:12, borderRadius:10, background:'rgba(139,92,246,0.05)', border:'1px solid var(--border-violet)', color:'var(--text-primary)', fontSize:12, fontFamily:'monospace', resize:'vertical', outline:'none', lineHeight:1.5, boxSizing:'border-box' }}
              />

              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ flex:1, height:1, background:'rgba(139,92,246,0.15)' }}/>
                <span style={{ fontSize:11, color:'var(--text-secondary)', whiteSpace:'nowrap' }}>{t('import.orUpload')}</span>
                <div style={{ flex:1, height:1, background:'rgba(139,92,246,0.15)' }}/>
              </div>

              <label style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'10px 16px', borderRadius:10, border:'1px dashed rgba(139,92,246,0.4)', cursor:'pointer', color:'var(--text-secondary)', fontSize:12, background:'rgba(139,92,246,0.03)' }}>
                <Upload size={13}/>Subir CSV
                <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={handleFile} style={{ display:'none' }}/>
              </label>

              {parseError && (
                <div style={{ fontSize:12, color:'#F87171', background:'rgba(248,113,113,0.08)', border:'1px solid rgba(248,113,113,0.25)', borderRadius:8, padding:'8px 12px' }}>
                  {parseError}
                </div>
              )}

              <button
                onClick={handleParse}
                disabled={!rawText.trim() || !geo}
                style={{ padding:'10px 0', borderRadius:10, background: rawText.trim() && geo ? 'var(--primary-violet)' : 'rgba(139,92,246,0.3)', color:'white', border:'none', cursor: rawText.trim() && geo ? 'pointer' : 'default', fontSize:13, fontWeight:700 }}
              >
                {!geo ? '…' : t('import.preview')}
              </button>
            </div>
          )}

          {/* ── PREVIEW ── */}
          {step === 'preview' && (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {/* Summary badges */}
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                <span style={{ padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:700, background:'rgba(52,211,153,0.12)', border:'1px solid rgba(52,211,153,0.3)', color:'#34D399' }}>
                  {t('import.willImport', { n: willImport })}
                </span>
                {dupCount > 0 && (
                  <span style={{ padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:700, background:'rgba(251,191,36,0.12)', border:'1px solid rgba(251,191,36,0.3)', color:'#FBBF24' }}>
                    {t('import.duplicates', { n: dupCount })}
                  </span>
                )}
                {invCount > 0 && (
                  <span style={{ padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:700, background:'rgba(248,113,113,0.12)', border:'1px solid rgba(248,113,113,0.3)', color:'#F87171' }}>
                    {t('import.invalid', { n: invCount })}
                  </span>
                )}
              </div>

              {/* Unknown columns */}
              {unknownCols.length > 0 && (
                <div style={{ display:'flex', alignItems:'flex-start', gap:6, padding:'8px 12px', borderRadius:8, background:'rgba(251,191,36,0.08)', border:'1px solid rgba(251,191,36,0.2)', fontSize:11, color:'#FBBF24' }}>
                  <AlertTriangle size={13} style={{ flexShrink:0, marginTop:1 }}/>
                  {t('import.unknownColumn', { cols: unknownCols.join(', ') })}
                </div>
              )}

              {/* Owner notice */}
              <div style={{ fontSize:11, color:'var(--text-secondary)', padding:'8px 12px', borderRadius:8, background:'rgba(139,92,246,0.05)', border:'1px solid rgba(139,92,246,0.12)', lineHeight:1.5 }}>
                {t('import.ownerNotice')}
              </div>

              {/* Preview table */}
              <div style={{ overflowX:'auto', borderRadius:8, border:'1px solid var(--border-violet)' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
                  <thead>
                    <tr style={{ background:'rgba(139,92,246,0.07)' }}>
                      <th style={{ padding:'6px 8px', textAlign:'center', width:32, borderBottom:'1px solid var(--border-violet)' }}>
                        <input
                          type="checkbox"
                          checked={allChecked}
                          onChange={e => toggleAll(e.target.checked)}
                          style={{ accentColor:'var(--primary-violet)', cursor:'pointer' }}
                        />
                      </th>
                      {['Nombre', isInfluencers ? 'Instagram' : 'Email', 'Ciudad', 'Estado'].map(col => (
                        <th key={col} style={{ padding:'6px 8px', textAlign:'left', borderBottom:'1px solid var(--border-violet)', color:'var(--text-secondary)', fontWeight:700, textTransform:'uppercase', letterSpacing:0.5, whiteSpace:'nowrap' }}>
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, idx) => {
                      const isInvalid = row.errors.length > 0
                      const bg = isInvalid ? 'rgba(248,113,113,0.04)' : row.isDuplicate ? 'rgba(251,191,36,0.04)' : 'transparent'
                      return (
                        <tr key={idx} style={{ background:bg, borderBottom:'1px solid rgba(139,92,246,0.06)' }}>
                          <td style={{ padding:'5px 8px', textAlign:'center' }}>
                            <input
                              type="checkbox"
                              checked={row.checked}
                              disabled={isInvalid}
                              onChange={() => toggleRow(idx)}
                              style={{ accentColor:'var(--primary-violet)', cursor: isInvalid ? 'default' : 'pointer' }}
                            />
                          </td>
                          <td style={{ padding:'5px 8px', color: isInvalid ? '#F87171' : 'var(--text-primary)', maxWidth:140, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                            {row.obj.name || <em style={{ color:'#F87171' }}>sin nombre</em>}
                          </td>
                          <td style={{ padding:'5px 8px', color:'var(--text-secondary)', whiteSpace:'nowrap' }}>
                            {isInfluencers
                              ? (row.obj.instagram ? `@${row.obj.instagram}` : '—')
                              : (row.obj.email || '—')}
                          </td>
                          <td style={{ padding:'5px 8px', color:'var(--text-secondary)', whiteSpace:'nowrap' }}>
                            {row.obj.ciudad || '—'}
                          </td>
                          <td style={{ padding:'5px 8px', minWidth:160 }}>
                            {isInvalid && row.errors.map((e,i) => (
                              <div key={i} style={{ fontSize:10, color:'#F87171' }}>✗ {e}</div>
                            ))}
                            {!isInvalid && row.isDuplicate && (
                              <div style={{ fontSize:10, color:'#FBBF24' }}>⚠ Posible duplicado</div>
                            )}
                            {row.warnings.map((w,i) => (
                              <div key={i} style={{ fontSize:10, color:'#FBBF24' }}>⚠ {w}</div>
                            ))}
                            {!isInvalid && !row.isDuplicate && row.warnings.length === 0 && (
                              <span style={{ fontSize:10, color:'#34D399' }}>✓ OK</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div style={{ display:'flex', gap:8 }}>
                <button onClick={() => setStep('input')} style={{ flex:1, padding:'10px 0', borderRadius:10, background:'rgba(139,92,246,0.08)', border:'1px solid var(--border-violet)', color:'var(--text-secondary)', cursor:'pointer', fontSize:13, fontWeight:600 }}>
                  ← Volver
                </button>
                <button
                  onClick={handleImport}
                  disabled={willImport === 0}
                  style={{ flex:2, padding:'10px 0', borderRadius:10, background: willImport > 0 ? 'var(--primary-violet)' : 'rgba(139,92,246,0.3)', color:'white', border:'none', cursor: willImport > 0 ? 'pointer' : 'default', fontSize:13, fontWeight:700 }}
                >
                  {t('import.confirm', { n: willImport })}
                </button>
              </div>
            </div>
          )}

          {/* ── IMPORTING ── */}
          {step === 'importing' && (
            <div style={{ display:'flex', flexDirection:'column', gap:16, alignItems:'center', padding:'32px 0' }}>
              <div style={{ fontSize:14, color:'var(--text-primary)', fontWeight:600 }}>
                {t('import.importing', { done: progress.done, total: progress.total })}
              </div>
              <div style={{ width:'100%', height:6, borderRadius:3, background:'rgba(139,92,246,0.15)', overflow:'hidden' }}>
                <div style={{
                  height:'100%', borderRadius:3, background:'var(--primary-violet)', transition:'width var(--dur-base) var(--ease-standard)',
                  width: `${progress.total ? Math.round(progress.done/progress.total*100) : 0}%`,
                }}/>
              </div>
              <div style={{ fontSize:12, color:'var(--text-secondary)' }}>{progress.done} / {progress.total}</div>
            </div>
          )}

          {/* ── DONE ── */}
          {step === 'done' && results && (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <div style={{ fontSize:14, color:'var(--text-primary)', fontWeight:600 }}>
                {t('import.done', { created: results.created, failed: results.failed.length })}
              </div>
              {results.failed.length > 0 && (
                <>
                  <div style={{ display:'flex', flexDirection:'column', gap:4, maxHeight:180, overflowY:'auto', borderRadius:8, border:'1px solid rgba(248,113,113,0.25)', padding:10 }}>
                    {results.failed.map((f, i) => (
                      <div key={i} style={{ fontSize:11, color:'#F87171' }}>
                        <span style={{ fontWeight:600 }}>{f.name}</span>: {t('import.failed', { error: f.error })}
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={downloadFailed}
                    style={{ padding:'8px 0', borderRadius:9, background:'rgba(248,113,113,0.08)', border:'1px solid rgba(248,113,113,0.3)', color:'#F87171', cursor:'pointer', fontSize:12, fontWeight:600 }}
                  >
                    {t('import.downloadFailed')}
                  </button>
                </>
              )}
              <button
                onClick={onClose}
                style={{ padding:'10px 0', borderRadius:10, background:'var(--primary-violet)', color:'white', border:'none', cursor:'pointer', fontSize:13, fontWeight:700 }}
              >
                {t('import.close')}
              </button>
            </div>
          )}

        </div>
      </div>
    </>
  )
}
