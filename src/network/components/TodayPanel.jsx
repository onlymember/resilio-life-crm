// Bloque "Hoy" del Inicio: lo que hay que resolver hoy además de la
// agenda. Pendientes de aprobar (solo Dirección y super_admin), visitas
// de mañana con el aviso a la marca listo, y el avance de los objetivos
// de la semana.
import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Inbox, Heart, CalendarClock, MessageCircle, Target, ChevronRight } from 'lucide-react'
import { t } from '../../i18n/index.js'
import { dbGetTomorrowVisits, dbGetMyWeekGoals } from '../../lib/database.js'
import { redGetPendingCounts } from '../../lib/red.js'
import { quiet } from '../../lib/quiet.js'

const label = { fontSize: 9, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8 }
const box = { borderRadius: 12, background: 'var(--glass-bg)', border: '1px solid var(--border-violet)' }
const wa = (n) => (n || '').replace(/[^0-9]/g, '')

export default function TodayPanel({ isDirection, me }) {
  const navigate = useNavigate()
  const [pending, setPending] = useState(null)
  const [visits, setVisits] = useState([])
  const [goals, setGoals] = useState([])

  useEffect(() => {
    if (isDirection) redGetPendingCounts().then(setPending).catch(quiet('TodayPanel'))
    dbGetTomorrowVisits().then(setVisits).catch(quiet('TodayPanel'))
    dbGetMyWeekGoals().then(setGoals).catch(quiet('TodayPanel'))
  }, [isDirection])

  const approvals = pending ? pending.leads + pending.emails : 0
  const hasAny = approvals > 0 || (pending?.interests > 0) || visits.length > 0 || goals.length > 0
  if (!hasAny) return null

  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1)
  const dayName = tomorrow.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <section style={{ marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Pendientes de aprobar */}
      {isDirection && (approvals > 0 || pending?.interests > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: pending.interests > 0 && approvals > 0 ? '1fr 1fr' : '1fr', gap: 8 }}>
          {approvals > 0 && (
            <button onClick={() => navigate('/network/approvals')} style={{ ...box, display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', cursor: 'pointer', textAlign: 'left', borderColor: 'rgba(251,146,60,0.4)', background: 'rgba(251,146,60,0.07)' }}>
              <Inbox size={18} color="#FB923C"/>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{t('today.approvals', { n: approvals })}</span>
                <span style={{ display: 'block', fontSize: 11, color: 'var(--text-secondary)' }}>{t('today.approvalsDetail', { leads: pending.leads, emails: pending.emails })}</span>
              </span>
              <ChevronRight size={15} color="var(--text-secondary)"/>
            </button>
          )}
          {pending.interests > 0 && (
            <button onClick={() => navigate('/network/approvals?tab=interests')} style={{ ...box, display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', cursor: 'pointer', textAlign: 'left' }}>
              <Heart size={18} color="#EC4899"/>
              <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{t('today.interests', { n: pending.interests })}</span>
              <ChevronRight size={15} color="var(--text-secondary)"/>
            </button>
          )}
        </div>
      )}

      {/* Visitas de mañana: avisar a la marca con un toque */}
      {visits.length > 0 && (
        <div>
          <div style={label}>{t('today.tomorrow')}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {visits.map(v => {
              const text = t('today.brandReminder', { marca: v.brandName, influencer: v.influencerName, fecha: dayName, yo: me })
              return (
                <div key={v.id} style={{ ...box, display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px' }}>
                  <CalendarClock size={16} color="var(--primary-violet-light)" style={{ flexShrink: 0 }}/>
                  <button onClick={() => navigate(`/network/collaborations/${v.id}`)} style={{ flex: 1, minWidth: 0, textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                    <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.brandName} · {v.influencerName}</span>
                    <span style={{ display: 'block', fontSize: 11, color: 'var(--text-secondary)' }}>{t(`collab.status.${v.status}`)}</span>
                  </button>
                  {wa(v.brandWa) ? (
                    <a href={`https://wa.me/${wa(v.brandWa)}?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer"
                      style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, padding: '6px 10px', borderRadius: 8, textDecoration: 'none', color: '#25D366', background: 'rgba(37,211,102,0.1)', border: '1px solid rgba(37,211,102,0.3)', whiteSpace: 'nowrap' }}>
                      <MessageCircle size={12}/>{t('today.notifyBrand')}
                    </a>
                  ) : (
                    <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{t('today.noBrandWa')}</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Objetivos de la semana */}
      {goals.length > 0 && (
        <div>
          <div style={label}>{t('goals.weekTitle')}</div>
          <div style={{ ...box, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {goals.map(g => {
              const pct = Math.min(100, g.target > 0 ? Math.round((g.currentProgress / g.target) * 100) : 0)
              const col = pct >= 100 ? '#34D399' : pct >= 50 ? '#FBBF24' : 'var(--primary-violet-light)'
              return (
                <div key={g.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text-primary)', fontWeight: 600 }}><Target size={12} color={col}/>{t(`goals.metric.${g.metric}`)}</span>
                    <span style={{ color: 'var(--text-secondary)' }}>{Number(g.currentProgress) || 0} / {Number(g.target)}</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 3, background: 'rgba(139,92,246,0.12)' }}>
                    <div style={{ height: '100%', width: `${pct}%`, borderRadius: 3, background: col, transition: 'width 0.4s' }}/>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </section>
  )
}
