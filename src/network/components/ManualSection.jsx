import React, { useState } from 'react'
import { Edit3, Check, X } from 'lucide-react'
import SimpleMarkdown from './SimpleMarkdown.jsx'
import { t } from '../../i18n/index.js'
import { dbPatchManual } from '../../lib/database.js'

export default function ManualSection({ section, canEdit, sectionRef }) {
  const [editing, setEditing]   = useState(false)
  const [draft,   setDraft]     = useState('')
  const [saving,  setSaving]    = useState(false)
  const [error,   setError]     = useState(null)
  const [body,    setBody]      = useState(section.body)

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

  return (
    <div
      ref={sectionRef}
      data-category={section.category}
      style={{
        paddingTop: 32, paddingBottom: 8,
        borderBottom: '1px solid rgba(139,92,246,0.1)',
      }}
    >
      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: section.subtitle ? 6 : 12 }}>
        <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', margin: 0, lineHeight: 1.3 }}>
          {section.title}
        </h3>
        {canEdit && !editing && (
          <button onClick={startEdit} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 6, background: 'rgba(139,92,246,0.08)', border: '1px solid var(--border-violet)', color: 'var(--text-secondary)', fontSize: 11, cursor: 'pointer', flexShrink: 0, marginTop: 2 }}>
            <Edit3 size={11}/>{t('manual.edit')}
          </button>
        )}
      </div>

      {section.subtitle && (
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 12px', lineHeight: 1.5 }}>
          {section.subtitle}
        </p>
      )}

      {/* Body */}
      {editing ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <textarea
            value={draft}
            onChange={e => setDraft(e.target.value)}
            rows={Math.max(6, body.split('\n').length + 2)}
            style={{
              width: '100%', padding: '10px 12px', borderRadius: 8,
              background: 'rgba(139,92,246,0.07)', border: '1px solid rgba(139,92,246,0.35)',
              color: 'var(--text-primary)', fontSize: 14, lineHeight: 1.7,
              resize: 'vertical', outline: 'none', fontFamily: 'inherit',
            }}
          />
          {error && <div style={{ fontSize: 11, color: '#F87171' }}>{error}</div>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={save} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 14px', borderRadius: 8, background: 'var(--primary-violet)', color: 'white', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
              <Check size={12}/>{saving ? t('manual.saving') : t('manual.save')}
            </button>
            <button onClick={cancel} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 8, background: 'transparent', border: '1px solid var(--border-violet)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 12 }}>
              <X size={12}/>{t('manual.cancel')}
            </button>
          </div>
        </div>
      ) : (
        <SimpleMarkdown
          body={body}
          style={{ fontSize: 15, color: 'var(--text-primary)' }}
        />
      )}
    </div>
  )
}
