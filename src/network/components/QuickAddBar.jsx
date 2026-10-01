// Accesos rápidos del Inicio + alta por link de Instagram.
// Pegás el link (o @usuario): si ya existe te avisa y te lleva a la
// ficha; si no, la crea en tu nombre y abre la ficha para completarla.
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, Building2, CheckSquare, Search, Instagram, ArrowRight } from 'lucide-react'
import { t } from '../../i18n/index.js'
import { openSearch } from './GlobalSearch.jsx'
import { toast } from './Toaster.jsx'
import { dbCheckDuplicateLive, dbSaveInfluencer, dbGetMyScouterCity } from '../../lib/database.js'

const RESERVED = new Set(['p', 'reel', 'reels', 'stories', 'explore', 'tv', 'accounts', 'direct', 'share'])

// "https://www.instagram.com/valen.cabral/?hl=es" → "valen.cabral"
export function parseInstagram(raw) {
  let s = (raw || '').trim()
  if (!s) return null
  const m = s.match(/instagram\.com\/([^/?#\s]+)/i)
  if (m) s = m[1]
  s = s.replace(/^@/, '').replace(/\/+$/, '').toLowerCase()
  if (RESERVED.has(s)) return null
  return /^[a-z0-9._]{1,30}$/.test(s) ? s : null
}

export default function QuickAddBar({ onOpenCreate }) {
  const navigate = useNavigate()
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)   // { text, tone, path? }

  const submit = async (e) => {
    e.preventDefault()
    if (busy) return
    const user = parseInstagram(value)
    if (!user) { setMsg({ text: t('homeX.igPaste.invalid'), tone: 'warn' }); return }
    setBusy(true); setMsg(null)
    try {
      const hit = await dbCheckDuplicateLive('influencer', { instagram: user })
      if (hit?.exists) {
        const path = hit.id ? `/network/influencers/${hit.id}` : null
        setMsg(hit.id
          ? { text: t('homeX.igPaste.existsMine', { name: hit.name || `@${user}` }), tone: 'info', path }
          : { text: t('homeX.igPaste.existsOther', { city: hit.city || '—' }), tone: 'warn' })
        return
      }
      const cityId = await dbGetMyScouterCity().catch(() => null)
      const saved = await dbSaveInfluencer({ name: user, username: user, cityId })
      setValue('')
      toast?.(t('homeX.igPaste.created', { user }))
      if (saved?.id) navigate(`/network/influencers/${saved.id}`)
    } catch (err) {
      setMsg({ text: err.message || t('errors.saving'), tone: 'error' })
    } finally {
      setBusy(false)
    }
  }

  const quick = [
    { key: 'influencer', icon: Users,       color: '#A78BFA', onClick: () => onOpenCreate('influencer') },
    { key: 'brand',      icon: Building2,   color: '#60A5FA', onClick: () => onOpenCreate('brand') },
    { key: 'task',       icon: CheckSquare, color: '#34D399', onClick: () => onOpenCreate('task') },
    { key: 'search',     icon: Search,      color: '#FBBF24', onClick: openSearch, plain: true },
  ]
  const toneCol = { info: 'var(--primary-violet-light)', warn: '#FBBF24', error: '#F87171' }

  return (
    <section style={{ marginBottom: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
        {quick.map(q => (
          <button key={q.key} onClick={q.onClick}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '10px 4px', borderRadius: 12, background: `${q.color}10`, border: `1px solid ${q.color}35`, color: q.color, fontSize: 11, fontWeight: 700, cursor: 'pointer', minWidth: 0 }}>
            <q.icon size={16}/>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
              {q.plain ? '' : '+ '}{t(`homeX.quick.${q.key}`)}
            </span>
          </button>
        ))}
      </div>

      <form onSubmit={submit} style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', borderRadius: 12, background: 'var(--glass-bg)', border: '1px solid var(--border-violet)' }}>
          <Instagram size={14} color="#E1306C" style={{ flexShrink: 0 }}/>
          <input value={value} onChange={e => { setValue(e.target.value); setMsg(null) }}
            placeholder={t('homeX.igPaste.placeholder')} aria-label={t('homeX.igPaste.placeholder')}
            autoCapitalize="none" autoCorrect="off" spellCheck={false}
            style={{ flex: 1, minWidth: 0, padding: '10px 0', background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-primary)', fontSize: 13 }}/>
        </div>
        <button type="submit" disabled={busy || !value.trim()}
          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '0 14px', borderRadius: 12, background: 'linear-gradient(135deg, var(--primary-violet-dark), var(--primary-violet))', color: 'white', border: 'none', fontSize: 12, fontWeight: 700, cursor: busy ? 'wait' : 'pointer', opacity: !value.trim() ? 0.5 : 1, flexShrink: 0 }}>
          {busy ? t('homeX.igPaste.creating') : <>{t('homeX.igPaste.add')}<ArrowRight size={13}/></>}
        </button>
      </form>
      {msg && (
        <div role="status" style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, fontSize: 12, color: toneCol[msg.tone] }}>
          <span style={{ flex: 1 }}>{msg.text}</span>
          {msg.path && (
            <button onClick={() => navigate(msg.path)} style={{ background: 'none', border: 'none', padding: 0, color: 'inherit', fontWeight: 700, textDecoration: 'underline', cursor: 'pointer', fontSize: 12 }}>
              {t('homeX.igPaste.open')}
            </button>
          )}
        </div>
      )}
    </section>
  )
}
