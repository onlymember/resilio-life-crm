// Buscador global: Ctrl+K / ⌘K o la lupa de arriba. Encuentra
// influencers, marcas, oportunidades (global_search, migración 014),
// ofertas (quien las gestiona) y ciudades, desde cualquier pantalla.
import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Users, Building2, Briefcase, Gift, MapPin, Megaphone } from 'lucide-react'
import { t } from '../../i18n/index.js'
import { searchGlobal } from '../../lib/metrics.js'
import { dbGetGeography } from '../../lib/database.js'
import { supabase } from '../../lib/supabase.js'
import { OFFERS_ROLES } from '../routes.js'

export const openSearch = () => window.dispatchEvent(new CustomEvent('network:search'))

const ICON = { influencer: Users, brand: Building2, opportunity: Briefcase, offer: Gift, city: MapPin, campaign: Megaphone }
const PATH = {
  influencer:  (r) => `/network/influencers/${r.id}`,
  brand:       (r) => `/network/brands/${r.id}`,
  opportunity: (r) => `/network/opportunities/${r.id}`,
  offer:       () => '/network/offers',
  city:        (r) => `/network/influencers?city=${r.id}`,
  campaign:    () => null,
}

export default function GlobalSearch({ currentUser }) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [rows, setRows] = useState([])
  const [busy, setBusy] = useState(false)
  const [sel, setSel] = useState(0)
  const cities = useRef(null)
  const canOffers = OFFERS_ROLES.includes(currentUser?.rol)

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setOpen(o => !o) }
      else if (e.key === 'Escape') setOpen(false)
    }
    const onOpen = () => setOpen(true)
    window.addEventListener('keydown', onKey)
    window.addEventListener('network:search', onOpen)
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('network:search', onOpen) }
  }, [])

  useEffect(() => { if (!open) { setQ(''); setRows([]); setSel(0) } }, [open])

  useEffect(() => {
    const term = q.trim()
    if (term.length < 2) { setRows([]); return }
    const id = setTimeout(async () => {
      setBusy(true)
      try {
        if (!cities.current) cities.current = (await dbGetGeography().catch(() => ({ cities: [] }))).cities || []
        const safe = term.replace(/[%,()]/g, ' ')
        const [main, offers] = await Promise.all([
          searchGlobal(safe, 15).catch(() => []),
          canOffers
            ? supabase.from('offers').select('id, title, brands(name)').ilike('title', `%${safe}%`).limit(5).then(r => r.data || [])
            : Promise.resolve([]),
        ])
        const low = term.toLowerCase()
        const cityRows = cities.current.filter(c => c.name?.toLowerCase().includes(low)).slice(0, 4)
          .map(c => ({ type: 'city', id: c.id, title: c.name, sub: t('search.cityHint') }))
        setRows([
          ...main.map(r => ({ type: r.entity_type, id: r.id, title: r.titulo, sub: r.subtitulo })),
          ...offers.map(o => ({ type: 'offer', id: o.id, title: o.title, sub: o.brands?.name || '' })),
          ...cityRows,
        ].filter(r => PATH[r.type]?.(r)))
        setSel(0)
      } finally { setBusy(false) }
    }, 220)
    return () => clearTimeout(id)
  }, [q, canOffers])

  const go = (r) => { const p = PATH[r.type]?.(r); if (p) { setOpen(false); navigate(p) } }

  if (!open) return null
  return (
    <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: 'max(60px, 10vh)' }}>
      <div role="dialog" aria-label={t('search.title')} onClick={e => e.stopPropagation()} style={{ width: 'calc(100% - 24px)', maxWidth: 560, borderRadius: 16, overflow: 'hidden', background: 'var(--bg-secondary, #16131f)', border: '1px solid var(--border-violet)', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderBottom: '1px solid var(--border-violet)' }}>
          <Search size={16} color="var(--text-secondary)"/>
          <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder={t('search.placeholder')} aria-label={t('search.placeholder')}
            onKeyDown={e => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setSel(s => Math.min(rows.length - 1, s + 1)) }
              else if (e.key === 'ArrowUp') { e.preventDefault(); setSel(s => Math.max(0, s - 1)) }
              else if (e.key === 'Enter' && rows[sel]) go(rows[sel])
            }}
            style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: 'var(--text-primary)', fontSize: 16 }}/>
          <kbd style={{ fontSize: 10, color: 'var(--text-secondary)', border: '1px solid var(--border-violet)', borderRadius: 5, padding: '2px 5px' }}>Esc</kbd>
        </div>
        <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          {q.trim().length < 2 ? (
            <div style={{ padding: 16, fontSize: 12, color: 'var(--text-secondary)' }}>{t('search.hint')}</div>
          ) : rows.length === 0 ? (
            <div style={{ padding: 16, fontSize: 12, color: 'var(--text-secondary)' }}>{busy ? t('loading.generic') : t('search.none')}</div>
          ) : rows.map((r, i) => {
            const Icon = ICON[r.type] || Search
            return (
              <button key={`${r.type}-${r.id}`} onClick={() => go(r)} onMouseEnter={() => setSel(i)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', textAlign: 'left', cursor: 'pointer', border: 'none', background: i === sel ? 'rgba(139,92,246,0.14)' : 'transparent' }}>
                <Icon size={15} color="var(--primary-violet-light)" style={{ flexShrink: 0 }}/>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</span>
                  {r.sub && <span style={{ display: 'block', fontSize: 11, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.sub}</span>}
                </span>
                <span style={{ fontSize: 10, color: 'var(--text-secondary)', flexShrink: 0 }}>{t(`search.type.${r.type}`)}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
