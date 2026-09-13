import React, { useState, useEffect, useCallback } from 'react'
import { FileText, Pin, Trash2, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { t } from '../../i18n/index.js'
import { dbGetPersonalNotes, dbSavePersonalNote, dbDeletePersonalNote, dbGetNotesFeed } from '../../lib/database.js'

const ENTITY_PATHS = {
  influencer:    'influencers',
  brand:         'brands',
  opportunity:   'opportunities',
  collaboration: 'collaborations',
}

const pad2 = (n) => String(n).padStart(2, '0')
const fmtDate = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  const diffMs  = now - d
  const diffDays = Math.floor(diffMs / 86400000)
  if (diffDays === 0) return t('agenda.today')
  if (diffDays === 1) return t('agenda.tomorrow') || 'Ayer'
  if (diffDays < 7)  return `${diffDays}d`
  return `${d.getDate()}/${pad2(d.getMonth()+1)}`
}

const INPUT_STYLE = {
  width: '100%', background: 'rgba(139,92,246,0.07)',
  border: '1px solid rgba(139,92,246,0.25)', borderRadius: 10,
  padding: '10px 12px', color: 'var(--text-primary)', fontSize: 13, outline: 'none',
}

// ── Tab 1: Mi cuaderno ────────────────────────────────────────

function NoteCard({ note, onPin, onDelete }) {
  const [confirmDel, setConfirmDel] = useState(false)

  const title = note.title || (note.body ? note.body.slice(0, 48) + (note.body.length > 48 ? '…' : '') : '—')

  return (
    <div style={{ padding: '12px 14px', background: 'var(--glass-bg)', border: `1px solid ${note.pinned ? 'rgba(139,92,246,0.5)' : 'var(--border-violet)'}`, borderRadius: 12, position: 'relative' }}>
      {note.pinned && (
        <span style={{ position: 'absolute', top: 8, right: 8, fontSize: 9, fontWeight: 700, background: 'rgba(139,92,246,0.18)', color: 'var(--primary-violet-light)', padding: '2px 6px', borderRadius: 6, letterSpacing: 0.5 }}>
          {t('notes.pinned')}
        </span>
      )}
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: note.body && note.title ? 6 : 0, paddingRight: note.pinned ? 60 : 0 }}>
        {title}
      </div>
      {note.title && note.body && (
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {note.body.slice(0, 120)}{note.body.length > 120 ? '…' : ''}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
        <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{fmtDate(note.updatedAt)}</span>
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={() => onPin(note)}
            title={note.pinned ? t('notes.unpin') : t('notes.pin')}
            style={{ width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: '1px solid var(--border-violet)', borderRadius: 7, cursor: 'pointer', color: note.pinned ? 'var(--primary-violet-light)' : 'var(--text-secondary)' }}>
            <Pin size={13}/>
          </button>
          {confirmDel ? (
            <button onClick={() => onDelete(note.id)}
              style={{ padding: '0 10px', height: 30, background: '#EF4444', border: 'none', borderRadius: 7, color: 'white', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
              {t('notes.confirmDelete')}
            </button>
          ) : (
            <button onClick={() => setConfirmDel(true)}
              style={{ width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: '1px solid var(--border-violet)', borderRadius: 7, cursor: 'pointer', color: 'var(--text-secondary)' }}>
              <Trash2 size={13}/>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function NotebookTab({ currentUser }) {
  const [notes,     setNotes]     = useState([])
  const [loading,   setLoading]   = useState(true)
  const [formOpen,  setFormOpen]  = useState(false)
  const [form,      setForm]      = useState({ title: '', body: '' })
  const [saving,    setSaving]    = useState(false)
  const [saveError, setSaveError] = useState(null)

  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const canSave = form.title.trim().length > 0 || form.body.trim().length > 0

  useEffect(() => {
    dbGetPersonalNotes()
      .then(setNotes)
      .catch(e => console.error('NotebookTab:', e.message))
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    if (!canSave || saving) return
    setSaving(true); setSaveError(null)
    try {
      const saved = await dbSavePersonalNote({ title: form.title, body: form.body, pinned: false }, currentUser?.id)
      setNotes(prev => [saved, ...prev])
      setForm({ title: '', body: '' })
      setFormOpen(false)
    } catch (e) {
      setSaveError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handlePin = async (note) => {
    const updated = await dbSavePersonalNote({ ...note, pinned: !note.pinned }, currentUser?.id)
    setNotes(prev => {
      const list = prev.map(n => n.id === updated.id ? updated : n)
      return [...list.filter(n => n.pinned), ...list.filter(n => !n.pinned)]
    })
  }

  const handleDelete = async (id) => {
    await dbDeletePersonalNote(id)
    setNotes(prev => prev.filter(n => n.id !== id))
  }

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {[0,1].map(i => <div key={i} style={{ height: 80, borderRadius: 12, background: 'rgba(139,92,246,0.06)', animation: 'pulse 1.5s ease-in-out infinite' }}/>)}
    </div>
  )

  return (
    <div>
      <button
        onClick={() => { setFormOpen(true); setSaveError(null) }}
        style={{ marginBottom: 16, padding: '8px 16px', borderRadius: 10, background: 'var(--primary-violet)', border: 'none', color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer', minHeight: 36 }}
      >
        {t('notes.new')}
      </button>

      {notes.length === 0 ? (
        <div style={{ padding: '48px 0', textAlign: 'center' }}>
          <FileText size={40} style={{ color: 'var(--text-secondary)', opacity: 0.35, display: 'block', margin: '0 auto 16px' }}/>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
            {t('notes.emptyNotebook')}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 260, margin: '0 auto' }}>
            {t('notes.emptyNotebookSub')}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {notes.map(n => (
            <NoteCard key={n.id} note={n} onPin={handlePin} onDelete={handleDelete}/>
          ))}
        </div>
      )}

      {/* Bottom sheet nueva nota */}
      {formOpen && (
        <>
          <div onClick={() => setFormOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 300, backdropFilter: 'blur(2px)', WebkitBackdropFilter: 'blur(2px)' }}
          />
          <div style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 301,
            background: 'var(--bg-secondary)', borderRadius: '20px 20px 0 0',
            border: '1px solid var(--border-violet)', borderBottom: 'none',
            padding: '20px 20px 32px', animation: 'slideUp 0.2s ease',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{t('notes.new')}</span>
              <button onClick={() => setFormOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 4 }}>
                <X size={18}/>
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input value={form.title} onChange={e => setF('title', e.target.value)}
                placeholder={t('notes.titlePlaceholder')} style={INPUT_STYLE}
                onFocus={e => e.target.style.border = '1px solid rgba(139,92,246,0.6)'}
                onBlur={e => e.target.style.border = '1px solid rgba(139,92,246,0.25)'}
              />
              <textarea value={form.body} onChange={e => setF('body', e.target.value)}
                placeholder={t('notes.bodyPlaceholder')} rows={5}
                style={{ ...INPUT_STYLE, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6 }}
                onFocus={e => e.target.style.border = '1px solid rgba(139,92,246,0.6)'}
                onBlur={e => e.target.style.border = '1px solid rgba(139,92,246,0.25)'}
              />
              {saveError && <div style={{ fontSize: 12, color: '#F87171' }}>{saveError}</div>}
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={handleSave} disabled={!canSave || saving}
                  style={{ flex: 1, padding: '10px 0', borderRadius: 10, background: canSave ? 'var(--primary-violet)' : 'rgba(139,92,246,0.3)', border: 'none', color: 'white', fontSize: 13, fontWeight: 700, cursor: canSave ? 'pointer' : 'default' }}>
                  {saving ? t('notes.saving') : t('notes.save')}
                </button>
                <button onClick={() => setFormOpen(false)}
                  style={{ padding: '10px 16px', borderRadius: 10, background: 'transparent', border: '1px solid var(--border-violet)', color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer' }}>
                  {t('notes.cancel')}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ── Tab 2: Notas del CRM ──────────────────────────────────────

const CHIP_COLORS = {
  influencer:    { bg: 'rgba(167,139,250,0.15)', color: '#A78BFA' },
  brand:         { bg: 'rgba(96,165,250,0.15)',  color: '#60A5FA' },
  opportunity:   { bg: 'rgba(251,191,36,0.15)',  color: '#FBBF24' },
  collaboration: { bg: 'rgba(52,211,153,0.15)',  color: '#34D399' },
}

function CrmNotesTab() {
  const navigate   = useNavigate()
  const [feed,    setFeed]    = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    dbGetNotesFeed()
      .then(setFeed)
      .catch(e => console.error('CrmNotesTab:', e.message))
      .finally(() => setLoading(false))
  }, [])

  const handleClick = (item) => {
    const base = ENTITY_PATHS[item.entityType]
    if (base && item.entityId) navigate(`/network/${base}/${item.entityId}`)
  }

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {[0,1,2].map(i => <div key={i} style={{ height: 72, borderRadius: 12, background: 'rgba(139,92,246,0.06)', animation: 'pulse 1.5s ease-in-out infinite' }}/>)}
    </div>
  )

  if (feed.length === 0) return (
    <div style={{ padding: '48px 0', textAlign: 'center' }}>
      <FileText size={40} style={{ color: 'var(--text-secondary)', opacity: 0.35, display: 'block', margin: '0 auto 16px' }}/>
      <div style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 280, margin: '0 auto' }}>
        {t('notes.emptyCrm')}
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {feed.map((item, i) => {
        const chip = CHIP_COLORS[item.entityType] || { bg: 'rgba(139,92,246,0.1)', color: 'var(--primary-violet-light)' }
        return (
          <button key={i} onClick={() => handleClick(item)}
            style={{ width: '100%', textAlign: 'left', padding: '12px 14px', background: 'var(--glass-bg)', border: '1px solid var(--border-violet)', borderRadius: 12, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                {item.entityLabel}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 8, background: chip.bg, color: chip.color, letterSpacing: 0.5 }}>
                  {t(`notes.chips.${item.entityType}`) || item.entityType}
                </span>
                <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{fmtDate(item.notedAt)}</span>
              </div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
              {item.noteText}
            </div>
          </button>
        )
      })}
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────

export default function NotesPage({ currentUser }) {
  const [tab, setTab] = useState('notebook')

  return (
    <div style={{ padding: '20px', maxWidth: 720 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>
          {t('notes.title')}
        </h1>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t('notes.subtitle')}</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'rgba(139,92,246,0.06)', borderRadius: 12, padding: 4 }}>
        {[
          { key: 'notebook', label: t('notes.tabNotebook') },
          { key: 'crm',      label: t('notes.tabCrm') },
        ].map(tb => (
          <button key={tb.key} onClick={() => setTab(tb.key)}
            style={{
              flex: 1, padding: '8px 12px', borderRadius: 9, border: 'none', cursor: 'pointer',
              fontSize: 12, fontWeight: 700, transition: 'all 0.15s',
              background: tab === tb.key ? 'var(--bg-secondary)' : 'transparent',
              color: tab === tb.key ? 'var(--text-primary)' : 'var(--text-secondary)',
              boxShadow: tab === tb.key ? '0 1px 4px rgba(0,0,0,0.2)' : 'none',
            }}>
            {tb.label}
          </button>
        ))}
      </div>

      {tab === 'notebook'
        ? <NotebookTab currentUser={currentUser}/>
        : <CrmNotesTab/>
      }
    </div>
  )
}
