// Vista Kanban por etapa de relación (cold / warm / strong / inactive).
// Escritorio: columnas lado a lado, se arrastra la tarjeta de una a otra.
// Celular: una columna por pantalla (se desliza de costado entre
// columnas) y la tarjeta se desliza con el dedo para pasarla de etapa.
import React, { useCallback, useEffect, useState } from 'react'
import { MapPin } from 'lucide-react'
import { t } from '../../i18n/index.js'
import { BOARD_STAGES, STAGE_COLOR } from '../utils/stages.js'
import SwipeStage from './SwipeStage.jsx'

const PAGE = 30

function BoardCard({ e, cityName, onOpen, draggable, onDragStart }) {
  const overdue = e.nextActionAt && new Date(e.nextActionAt) < new Date()
  return (
    <button draggable={draggable} onDragStart={onDragStart} onClick={() => onOpen(e)} style={{
      width: '100%', textAlign: 'left', cursor: 'pointer', padding: '10px 12px', borderRadius: 12,
      background: 'var(--card-solid-bg)', border: '1px solid var(--border-violet)', display: 'block',
    }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.name || e.username || '—'}</div>
      <div style={{ display: 'flex', gap: 8, fontSize: 11, color: 'var(--text-secondary)', marginTop: 2, flexWrap: 'wrap' }}>
        {e.username && <span>@{e.username}</span>}
        {cityName && <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><MapPin size={10}/>{cityName}</span>}
      </div>
      {e.nextAction && (
        <div style={{ fontSize: 11, marginTop: 4, color: overdue ? '#F87171' : 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {overdue ? '⚡' : '→'} {e.nextAction}
        </div>
      )}
    </button>
  )
}

export default function StageBoard({ fetchPage, onMove, onOpen, cityMap = {}, reloadKey, isDesktop }) {
  const [cols, setCols] = useState(() => Object.fromEntries(BOARD_STAGES.map(s => [s, { rows: [], total: 0, page: 0, loading: true }])))
  const [over, setOver] = useState(null)

  const loadCol = useCallback(async (stage, page = 0) => {
    setCols(c => ({ ...c, [stage]: { ...c[stage], loading: true } }))
    try {
      const res = await fetchPage(stage, page, PAGE)
      setCols(c => ({ ...c, [stage]: {
        rows: page === 0 ? res.rows : [...c[stage].rows, ...res.rows], total: res.total, page, loading: false,
      } }))
    } catch {
      setCols(c => ({ ...c, [stage]: { ...c[stage], loading: false } }))
    }
  }, [fetchPage])

  useEffect(() => { BOARD_STAGES.forEach(s => loadCol(s, 0)) }, [loadCol, reloadKey])

  // Mover: se saca de una columna y se pone arriba de la otra al instante;
  // si la base rechaza, vuelve a su lugar.
  const move = async (e, from, to) => {
    if (!to || from === to) return
    setCols(c => ({
      ...c,
      [from]: { ...c[from], rows: c[from].rows.filter(r => r.id !== e.id), total: c[from].total - 1 },
      [to]:   { ...c[to],   rows: [{ ...e, relationshipStatus: to }, ...c[to].rows], total: c[to].total + 1 },
    }))
    const ok = await onMove(e, to)
    if (!ok) { loadCol(from, 0); loadCol(to, 0) }
  }

  const drop = (to) => (ev) => {
    ev.preventDefault(); setOver(null)
    try {
      const { id, from } = JSON.parse(ev.dataTransfer.getData('text/plain'))
      const e = cols[from]?.rows.find(r => r.id === id)
      if (e) move(e, from, to)
    } catch { /* arrastre que no vino de una tarjeta */ }
  }

  return (
    <div style={{
      display: 'grid', gap: 10, alignItems: 'start',
      gridAutoFlow: 'column', gridAutoColumns: isDesktop ? 'minmax(220px, 1fr)' : '86%',
      overflowX: 'auto', scrollSnapType: isDesktop ? undefined : 'x mandatory', paddingBottom: 6,
    }}>
      {BOARD_STAGES.map(stage => {
        const col = cols[stage]
        return (
          <section key={stage}
            onDragOver={isDesktop ? (ev) => { ev.preventDefault(); setOver(stage) } : undefined}
            onDragLeave={isDesktop ? () => setOver(o => (o === stage ? null : o)) : undefined}
            onDrop={isDesktop ? drop(stage) : undefined}
            style={{
              scrollSnapAlign: 'start', borderRadius: 14, padding: 10, minHeight: 160,
              background: over === stage ? `${STAGE_COLOR[stage]}14` : 'rgba(139,92,246,0.04)',
              border: `1px solid ${over === stage ? STAGE_COLOR[stage] : 'var(--border-violet)'}`,
            }}>
            <header style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: STAGE_COLOR[stage] }}/>
              <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.6, color: 'var(--text-primary)' }}>{t(`relationship.${stage}`)}</span>
              <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{col.total}</span>
            </header>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {col.rows.map(e => (
                isDesktop ? (
                  <BoardCard key={e.id} e={e} cityName={cityMap[e.cityId]} onOpen={onOpen} draggable
                    onDragStart={(ev) => ev.dataTransfer.setData('text/plain', JSON.stringify({ id: e.id, from: stage }))}/>
                ) : (
                  <SwipeStage key={e.id} stage={stage} onChange={(to) => move(e, stage, to)}>
                    <BoardCard e={e} cityName={cityMap[e.cityId]} onOpen={onOpen}/>
                  </SwipeStage>
                )
              ))}
              {col.loading && col.rows.length === 0 && [0, 1].map(i => (
                <div key={i} style={{ height: 58, borderRadius: 12, background: 'rgba(139,92,246,0.06)', animation: 'pulse 1.5s ease-in-out infinite' }}/>
              ))}
              {!col.loading && col.rows.length === 0 && (
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', textAlign: 'center', padding: '14px 0' }}>{t('board.empty')}</div>
              )}
              {col.rows.length < col.total && (
                <button onClick={() => loadCol(stage, col.page + 1)} disabled={col.loading} style={{ padding: 8, borderRadius: 10, fontSize: 11, cursor: 'pointer', background: 'none', border: '1px dashed var(--border-violet)', color: 'var(--text-secondary)' }}>
                  {col.loading ? t('loading.generic') : t('label.loadMore', { n: col.total - col.rows.length })}
                </button>
              )}
            </div>
          </section>
        )
      })}
    </div>
  )
}
