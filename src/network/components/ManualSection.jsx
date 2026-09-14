import React, { useState, useRef, useEffect } from 'react'
import { Edit3, Check, X } from 'lucide-react'
import SimpleMarkdown from './SimpleMarkdown.jsx'
import { t } from '../../i18n/index.js'
import { dbPatchManual } from '../../lib/database.js'

const ENTER_TRANSITION = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ? 'opacity 0.3s ease, transform 0.3s ease'
  : 'opacity 0.85s cubic-bezier(0.16,1,0.3,1), transform 0.85s cubic-bezier(0.16,1,0.3,1)'

// Nivel card themes — Nivel 1 (lightest) → Nivel 3 (darkest)
const NIVEL_THEMES = [
  { bg: '#F2EBFB', color: '#3B1660' },
  { bg: '#6B2FB3', color: 'white'   },
  { bg: '#3B1660', color: 'white'   },
]

function extractNiveles(body) {
  const blocks = body.split(/\n\n+/).map(b => b.trim()).filter(Boolean)
  const nivelIdxs = []
  blocks.forEach((b, i) => { if (/^## Nivel \d/.test(b)) nivelIdxs.push(i) })
  if (nivelIdxs.length < 3) return null

  const preBlocks  = blocks.slice(0, nivelIdxs[0])
  const postBlocks = blocks.slice(nivelIdxs[2] + 2)

  const cards = nivelIdxs.slice(0, 3).map(idx => {
    const hdr      = blocks[idx]
    const bulletRaw = blocks[idx + 1] || ''
    const parts    = hdr.slice(3).trim().split(/\s*[—–\-]\s*/, 2)
    return {
      title:    parts[0].trim(),
      subtitle: parts[1]?.trim() || '',
      bullets:  bulletRaw.split('\n').filter(l => l.startsWith('- ')).map(l => l.slice(2)),
    }
  })

  return { preBlocks, cards, postBlocks }
}

export default function ManualSection({ section, canEdit, sectionRef }) {
  const [editing, setEditing]   = useState(false)
  const [draft,   setDraft]     = useState('')
  const [saving,  setSaving]    = useState(false)
  const [error,   setError]     = useState(null)
  const [body,    setBody]      = useState(section.body)

  const cardRef = useRef(null)

  useEffect(() => {
    const el = cardRef.current
    if (!el) return
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        el.style.opacity = '1'
        el.style.transform = 'translateY(0) scale(1)'
        obs.disconnect()
      }
    }, { threshold: 0.05 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const startEdit = () => { setDraft(body); setEditing(true); setError(null) }
  const cancel    = () => { setEditing(false); setError(null) }

  const save = async () => {
    if (saving) return
    setSaving(true); setError(null)
    try {
      await dbPatchManual(section.id, { body: draft })
      setBody(draft)
      setEditing(false)
    } catch(e) { setError(e.message) }
    finally { setSaving(false) }
  }

  const nivelData = section.category === 'sec03' ? extractNiveles(body) : null

  return (
    <div
      ref={(el) => { cardRef.current = el; sectionRef(el) }}
      data-category={section.category}
      style={{
        paddingBottom: 8,
        borderBottom: '1px solid rgba(59,22,96,0.15)',
        opacity: 0,
        transform: 'translateY(30px) scale(0.98)',
        transition: ENTER_TRANSITION,
        scrollMarginTop: 56,
      }}
    >
      {/* Section header */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12,
        paddingTop: 28, paddingBottom: 14,
        borderBottom: '1px solid rgba(59,22,96,0.12)',
        marginBottom: 18,
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: section.subtitle ? 6 : 0 }}>
            <div style={{ width: 3, height: 20, background: '#E6337F', borderRadius: 2, flexShrink: 0 }}/>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: '#3B1660', margin: 0, lineHeight: 1.3 }}>
              {section.title}
            </h3>
          </div>
          {section.subtitle && (
            <p style={{ fontSize: 13, color: 'rgba(59,22,96,0.6)', margin: '0 0 0 13px', lineHeight: 1.5, fontStyle: 'italic' }}>
              {section.subtitle}
            </p>
          )}
        </div>
        {canEdit && !editing && (
          <button
            onClick={startEdit}
            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 6, background: 'rgba(107,47,179,0.06)', border: '1px solid rgba(107,47,179,0.25)', color: '#6B2FB3', fontSize: 11, cursor: 'pointer', flexShrink: 0, marginTop: 2 }}
          >
            <Edit3 size={11}/>{t('manual.edit')}
          </button>
        )}
      </div>

      {editing ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
          <textarea
            value={draft}
            onChange={e => setDraft(e.target.value)}
            rows={Math.max(6, body.split('\n').length + 2)}
            style={{
              width: '100%', padding: '10px 12px', borderRadius: 8,
              background: 'rgba(107,47,179,0.06)', border: '1px solid rgba(107,47,179,0.3)',
              color: '#3B1660', fontSize: 14, lineHeight: 1.7,
              resize: 'vertical', outline: 'none', fontFamily: 'inherit',
            }}
          />
          {error && <div style={{ fontSize: 11, color: '#DC2626' }}>{error}</div>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={save} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 14px', borderRadius: 8, background: '#6B2FB3', color: 'white', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
              <Check size={12}/>{saving ? t('manual.saving') : t('manual.save')}
            </button>
            <button onClick={cancel} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 8, background: 'transparent', border: '1px solid rgba(107,47,179,0.25)', color: 'rgba(59,22,96,0.7)', cursor: 'pointer', fontSize: 12 }}>
              <X size={12}/>{t('manual.cancel')}
            </button>
          </div>
        </div>
      ) : nivelData ? (
        /* ── sec03: 3-column Nivel cards ── */
        <div style={{ paddingBottom: 24 }}>
          {nivelData.preBlocks.length > 0 && (
            <SimpleMarkdown
              body={nivelData.preBlocks.join('\n\n')}
              style={{ fontSize: 15, color: '#3B1660', marginBottom: 20 }}
              category={section.category}
            />
          )}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', margin: '4px 0 20px' }}>
            {nivelData.cards.map((card, ci) => {
              const theme = NIVEL_THEMES[ci] || NIVEL_THEMES[0]
              return (
                <div key={ci} style={{
                  flex: '1 1 200px', background: theme.bg, color: theme.color,
                  borderRadius: 12, padding: '20px 18px',
                }}>
                  <div style={{ fontSize: 16, fontWeight: 800, marginBottom: card.subtitle ? 4 : 12 }}>
                    {card.title}
                  </div>
                  {card.subtitle && (
                    <div style={{ fontSize: 12, fontStyle: 'italic', marginBottom: 10, opacity: 0.75 }}>
                      {card.subtitle}
                    </div>
                  )}
                  <ul style={{ margin: 0, paddingLeft: 16 }}>
                    {card.bullets.map((b, bi) => (
                      <li key={bi} style={{ fontSize: 12, lineHeight: 1.7, marginBottom: 3 }}>{b}</li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
          {nivelData.postBlocks.length > 0 && (
            <SimpleMarkdown
              body={nivelData.postBlocks.join('\n\n')}
              style={{ fontSize: 15, color: '#3B1660' }}
              category={section.category}
            />
          )}
        </div>
      ) : (
        <div style={{ paddingBottom: 24 }}>
          <SimpleMarkdown body={body} style={{ fontSize: 15, color: '#3B1660' }} category={section.category}/>
        </div>
      )}
    </div>
  )
}
