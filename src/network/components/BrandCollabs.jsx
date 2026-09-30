// Ficha de marca · todas sus colaboraciones: con quién, cuándo, en qué
// estado y cuánto rindió cada una (alcance, engagement, valor estimado).
import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ExternalLink } from 'lucide-react'
import { t } from '../../i18n/index.js'
import { dbGetCollaborations } from '../../lib/database.js'

const STATUS_COLOR = { proposed: '#9CA3AF', confirmed: '#60A5FA', in_progress: '#A78BFA', content_pending: '#FBBF24', completed: '#34D399', cancelled: '#F87171' }
const fmtN = (n) => n == null ? null : n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${Math.round(n / 1e3)}K` : String(n)

export default function BrandCollabs({ brandId }) {
  const navigate = useNavigate()
  const [rows, setRows] = useState(null)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)

  const load = (pg) => dbGetCollaborations({ brandId, includeCancelled: true, page: pg, pageSize: 20 })
    .then(res => { setRows(prev => pg === 0 ? res.rows : [...(prev || []), ...res.rows]); setTotal(res.total); setPage(pg) })
    .catch(() => setRows(prev => prev || []))
  useEffect(() => { load(0) }, [brandId])

  if (rows === null) return <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t('loading.generic')}</div>
  if (rows.length === 0) return <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t('brandCollabs.none')}</div>

  const done = rows.filter(r => r.status === 'completed')
  const sum = (k) => done.reduce((a, r) => a + (Number(r[k]) || 0), 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 11, color: 'var(--text-secondary)', marginBottom: 2 }}>
        <span><b style={{ color: 'var(--text-primary)' }}>{total}</b> {t('brandCollabs.total')}</span>
        <span><b style={{ color: 'var(--text-primary)' }}>{done.length}</b> {t('brandCollabs.completed')}</span>
        {sum('reach') > 0 && <span><b style={{ color: 'var(--text-primary)' }}>{fmtN(sum('reach'))}</b> {t('brandCollabs.reach')}</span>}
        {sum('estimatedMediaValue') > 0 && <span><b style={{ color: 'var(--text-primary)' }}>{fmtN(Math.round(sum('estimatedMediaValue')))}</b> {t('brandCollabs.emv')}</span>}
      </div>
      {rows.map(r => {
        const kpis = [
          r.reach != null && `${fmtN(r.reach)} ${t('brandCollabs.reachShort')}`,
          r.engagementRate != null && `${Number(r.engagementRate).toFixed(1)}% ER`,
          r.estimatedMediaValue != null && `${fmtN(Math.round(r.estimatedMediaValue))} ${t('brandCollabs.emvShort')}`,
        ].filter(Boolean)
        return (
          <button key={r.id} onClick={() => navigate(`/network/collaborations/${r.id}`)} style={{ display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', cursor: 'pointer', padding: '8px 10px', borderRadius: 8, background: 'rgba(139,92,246,0.05)', border: '1px solid var(--border-violet)' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, background: STATUS_COLOR[r.status] || '#9CA3AF' }}/>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.influencerName || '—'}</span>
              <span style={{ display: 'block', fontSize: 10, color: 'var(--text-secondary)' }}>
                {[t(`collab.status.${r.status}`), r.startDate && new Date(`${r.startDate}T12:00:00`).toLocaleDateString(), ...kpis].filter(Boolean).join(' · ')}
              </span>
            </span>
            <ExternalLink size={10} color="var(--text-secondary)"/>
          </button>
        )
      })}
      {rows.length < total && (
        <button onClick={() => load(page + 1)} style={{ padding: 8, borderRadius: 8, fontSize: 11, cursor: 'pointer', background: 'none', border: '1px dashed var(--border-violet)', color: 'var(--text-secondary)' }}>
          {t('label.loadMore', { n: total - rows.length })}
        </button>
      )}
    </div>
  )
}
