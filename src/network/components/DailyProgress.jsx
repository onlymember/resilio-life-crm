// Meta del día, racha y resumen de la semana del Inicio.
// Los datos salen de my_daily_progress (053): contactos registrados
// (WhatsApp, DM, llamada, reunión, mail) y fichas cargadas por día.
// La meta la elige cada uno y queda en este navegador.
import React, { useState } from 'react'
import { Flame, Target, Pencil } from 'lucide-react'
import { t } from '../../i18n/index.js'

const GOALS = [3, 5, 8, 10, 15]
const DEFAULT_GOAL = 5
const key = (uid) => `resilio.dailyGoal.${uid || 'me'}`

export const readGoal = (uid) => {
  try { const n = Number(localStorage.getItem(key(uid))); return GOALS.includes(n) ? n : DEFAULT_GOAL } catch { return DEFAULT_GOAL }
}
const saveGoal = (uid, n) => { try { localStorage.setItem(key(uid), String(n)) } catch { /* sin storage: queda en memoria */ } }

// days: [{ day, contacts, added }] ordenado de más viejo a hoy.
export function computeProgress(days, goal) {
  if (!days || !days.length) return null
  const today = days[days.length - 1]
  const met = (d) => d.contacts >= goal
  let streak = 0
  let i = met(today) ? days.length - 1 : days.length - 2
  for (; i >= 0 && met(days[i]); i--) streak++
  const week = days.slice(-7)
  return {
    today: today.contacts,
    reached: met(today),
    streak,
    week: {
      contacts: week.reduce((s, d) => s + d.contacts, 0),
      added:    week.reduce((s, d) => s + d.added, 0),
    },
  }
}

const label = { fontSize: 9, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: 1.2, textTransform: 'uppercase' }

export function DailyGoal({ days, uid, goal, onGoal }) {
  const [editing, setEditing] = useState(false)
  const p = computeProgress(days, goal)
  if (!p) return null
  const pct = Math.min(100, Math.round((p.today / goal) * 100))
  const left = Math.max(0, goal - p.today)
  const col = p.reached ? '#34D399' : 'var(--primary-violet-light)'

  return (
    <section style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={label}>{t('homeX.daily.title')}</div>
        <button onClick={() => setEditing(v => !v)} aria-label={t('homeX.daily.edit')} title={t('homeX.daily.edit')}
          style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', padding: 0, color: 'var(--text-secondary)', fontSize: 11, cursor: 'pointer' }}>
          <Pencil size={11}/>{t('homeX.daily.edit')}
        </button>
      </div>
      <div style={{ padding: '14px 16px', borderRadius: 14, background: p.reached ? 'rgba(52,211,153,0.06)' : 'var(--glass-bg)', border: `1px solid ${p.reached ? 'rgba(52,211,153,0.3)' : 'var(--border-violet)'}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Target size={20} color={col} style={{ flexShrink: 0 }}/>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{t('homeX.daily.goal', { n: goal })}</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 1 }}>
              {p.reached ? t('homeX.daily.reached') : left === 1 ? t('homeX.daily.leftOne') : t('homeX.daily.left', { n: left })}
            </div>
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: col, flexShrink: 0 }}>{t('homeX.daily.progress', { c: p.today, n: goal })}</div>
        </div>
        <div role="progressbar" aria-valuemin={0} aria-valuemax={goal} aria-valuenow={p.today}
          style={{ height: 6, borderRadius: 3, background: 'rgba(139,92,246,0.15)', overflow: 'hidden', marginTop: 10 }}>
          <div style={{ height: '100%', width: `${pct}%`, borderRadius: 3, transition: 'width 0.4s ease', background: p.reached ? 'linear-gradient(90deg,#34D399,#10B981)' : 'linear-gradient(90deg,var(--primary-violet),var(--primary-violet-light))' }}/>
        </div>

        {/* Racha */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, fontSize: 12 }}>
          <Flame size={14} color={p.streak > 0 ? '#FB923C' : 'var(--text-secondary)'}/>
          <span style={{ fontWeight: 700, color: p.streak > 0 ? '#FB923C' : 'var(--text-secondary)' }}>
            {p.streak === 0 ? t('homeX.daily.streakZero') : p.streak === 1 ? t('homeX.daily.streakOne') : t('homeX.daily.streak', { n: p.streak })}
          </span>
          {p.streak > 0 && !p.reached && <span style={{ color: 'var(--text-secondary)' }}>· {t('homeX.daily.streakKeep')}</span>}
        </div>

        {editing && (
          <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border-violet)' }}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {GOALS.map(n => (
                <button key={n} onClick={() => { saveGoal(uid, n); onGoal(n); setEditing(false) }}
                  style={{ padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', background: n === goal ? 'var(--primary-violet)' : 'rgba(139,92,246,0.1)', color: n === goal ? 'white' : 'var(--primary-violet-light)', border: '1px solid var(--border-violet)' }}>
                  {n}
                </button>
              ))}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 8 }}>{t('homeX.daily.hint')}</div>
          </div>
        )}
      </div>
    </section>
  )
}

export function WeekLine({ days, goal }) {
  const p = computeProgress(days, goal)
  if (!p) return null
  const empty = p.week.contacts === 0 && p.week.added === 0
  const chip = { padding: '8px 12px', borderRadius: 10, background: 'var(--glass-bg)', border: '1px solid var(--border-violet)', fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap' }
  return (
    <section style={{ marginBottom: 20 }}>
      <div style={{ ...label, marginBottom: 8 }}>{t('homeX.week.title')}</div>
      {empty ? (
        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t('homeX.week.empty')}</div>
      ) : (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span style={chip}>{t('homeX.week.added', { n: p.week.added })}</span>
          <span style={chip}>{t('homeX.week.contacts', { n: p.week.contacts })}</span>
          {p.streak > 0 && (
            <span style={{ ...chip, display: 'inline-flex', alignItems: 'center', gap: 5, color: '#FB923C', borderColor: 'rgba(251,146,60,0.35)' }}>
              <Flame size={12}/>{p.streak === 1 ? t('homeX.daily.streakOne') : t('homeX.daily.streak', { n: p.streak })}
            </span>
          )}
        </div>
      )}
    </section>
  )
}
