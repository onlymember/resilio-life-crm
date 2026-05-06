import React, { useState, useMemo } from 'react'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, FunnelChart, Funnel, LabelList, Cell
} from 'recharts'
import {
  DollarSign, Users, TrendingUp, CheckSquare, Calendar, Building2,
  ArrowUp, ArrowDown, Filter, BarChart3, Activity, Star, Globe
} from 'lucide-react'

const fmt = (n) => n >= 1000000 ? `$${(n/1000000).toFixed(1)}M` : n >= 1000 ? `$${(n/1000).toFixed(0)}K` : `$${n}`
const fmtN = (n) => n >= 1000 ? `${(n/1000).toFixed(1)}K` : String(n)

const KPI = ({ title, value, sub, trend, icon: Icon, color, bg }) => {
  const pos = parseFloat(trend) >= 0
  return (
    <div className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={20} color={color} />
        </div>
        {trend !== undefined && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 20, color: pos ? '#4ADE80' : '#F87171', background: pos ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)', border: `1px solid ${pos ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.3)'}` }}>
            {pos ? <ArrowUp size={10} /> : <ArrowDown size={10} />}{Math.abs(parseFloat(trend))}%
          </span>
        )}
      </div>
      <div>
        <div style={{ fontSize: 28, fontWeight: 800, color, lineHeight: 1, letterSpacing: -1 }}>{value}</div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>{title}</div>
        {sub && <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2, opacity: 0.7 }}>{sub}</div>}
      </div>
    </div>
  )
}

const Card = ({ title, children, style = {} }) => (
  <div className="card" style={{ padding: 20, ...style }}>
    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16, color: 'var(--text-primary)' }}>{title}</div>
    {children}
  </div>
)

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-violet)', borderRadius: 10, padding: '10px 14px', fontSize: 12 }}>
      <div style={{ fontWeight: 600, marginBottom: 6, color: 'var(--text-primary)' }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, display: 'flex', gap: 8 }}>
          <span>{p.name}:</span><span style={{ fontWeight: 600 }}>{p.name?.includes('$') || p.dataKey?.includes('rev') ? fmt(p.value) : fmtN(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

export default function DashboardView({ brands, locations, influencers, benefits, codes, codeUsages, memberships, users, infCampaigns, events }) {
  const [period, setPeriod] = useState('mes')
  const [bizUnit, setBizUnit] = useState('all')
  const [ciudad, setCiudad] = useState('all')

  const now = new Date('2026-05-04')

  const usages = useMemo(() => {
    if (!codeUsages) return []
    return codeUsages.filter(u => {
      const d = new Date(u.timestamp)
      if (period === 'semana') return (now - d) / 86400000 <= 7
      if (period === 'mes') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      if (period === 'trimestre') return (now - d) / 86400000 <= 90
      return true
    }).filter(u => ciudad === 'all' || u.userDemographics?.city === ciudad)
  }, [codeUsages, period, ciudad])

  const totalRevenue = usages.reduce((a, u) => a + (u.purchaseAmount || 0), 0)
  const totalContacts = (users || []).length
  const newContacts = usages.length
  const conversions = usages.filter(u => u.influencerId).length
  const activeBrands = (brands || []).filter(b => b.status === 'active').length
  const upcomingEvents = (events || []).filter(e => e.status === 'upcoming' || e.status === 'planning').length
  const pendingTasks = 14

  const revenueByUnit = [
    { name: 'Resilio Life', rev: totalRevenue * 0.35 },
    { name: 'Ag. Influencers', rev: totalRevenue * 0.25 },
    { name: 'Productora', rev: totalRevenue * 0.22 },
    { name: 'Ag. Creativa', rev: totalRevenue * 0.18 },
  ]

  const contactGrowth = (() => {
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May']
    const base = [28, 42, 38, 55, 61]
    return months.map((m, i) => ({ month: m, contactos: base[i], conversiones: Math.round(base[i] * 0.62) }))
  })()

  const funnelData = [
    { name: 'Contactos totales', value: totalContacts, fill: '#8B5CF6' },
    { name: 'Con interacción', value: Math.round(totalContacts * 0.72), fill: '#A78BFA' },
    { name: 'Calificados', value: Math.round(totalContacts * 0.45), fill: '#C084FC' },
    { name: 'Clientes activos', value: (memberships || []).filter(m => m.status === 'active').length || 34, fill: '#E879F9' },
  ]

  const nextEvents = (events || [])
    .filter(e => e.status !== 'completed' && e.status !== 'cancelled')
    .slice(0, 4)

  const cities = [...new Set((codeUsages || []).map(u => u.userDemographics?.city).filter(Boolean))]

  const PERIOD_OPTS = [{ v: 'semana', l: 'Semana' }, { v: 'mes', l: 'Mes' }, { v: 'trimestre', l: 'Trimestre' }]
  const Pill = ({ v, l }) => (
    <button onClick={() => setPeriod(v)} style={{ padding: '6px 16px', borderRadius: 20, fontSize: 12, fontWeight: 500, border: `1px solid ${period === v ? 'var(--primary-violet)' : 'var(--border-violet)'}`, background: period === v ? 'rgba(139,92,246,0.2)' : 'rgba(139,92,246,0.05)', color: period === v ? 'var(--primary-violet-light)' : 'var(--text-secondary)', transition: 'all 0.2s', cursor: 'pointer' }}>{l}</button>
  )

  return (
    <div style={{ padding: 24, animation: 'fadeIn 0.3s ease' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <div>
          <h2 className="gradient-text" style={{ fontSize: 22, fontWeight: 800 }}>Centro de Control</h2>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Resumen ejecutivo · {new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 6, background: 'rgba(139,92,246,0.06)', border: '1px solid var(--border-violet)', borderRadius: 12, padding: 4 }}>
            {PERIOD_OPTS.map(p => <Pill key={p.v} {...p} />)}
          </div>
          <select className="select-field" style={{ width: 'auto', fontSize: 12 }} value={bizUnit} onChange={e => setBizUnit(e.target.value)}>
            <option value="all">Todas las unidades</option>
            <option value="resilio">Resilio Life</option>
            <option value="influencers">Ag. Influencers</option>
            <option value="productora">Productora</option>
            <option value="creativa">Ag. Creativa</option>
          </select>
          <select className="select-field" style={{ width: 'auto', fontSize: 12 }} value={ciudad} onChange={e => setCiudad(e.target.value)}>
            <option value="all">Todas las ciudades</option>
            {cities.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14, marginBottom: 24 }}>
        <KPI title="Revenue Total" value={fmt(totalRevenue)} sub={`${period === 'semana' ? 'Esta semana' : period === 'mes' ? 'Este mes' : 'Este trimestre'}`} trend="+12.4" icon={DollarSign} color="#4ADE80" bg="rgba(74,222,128,0.12)" />
        <KPI title="Contactos Nuevos" value={fmtN(newContacts)} sub="Interacciones con código" trend="+8.2" icon={Users} color="#8B5CF6" bg="rgba(139,92,246,0.12)" />
        <KPI title="Conversiones" value={conversions} sub="Contacto → cliente" trend="+5.7" icon={TrendingUp} color="#E879F9" bg="rgba(232,121,249,0.12)" />
        <KPI title="Tareas Pendientes" value={pendingTasks} sub="Del equipo" trend="-3" icon={CheckSquare} color="#FCD34D" bg="rgba(252,211,77,0.12)" />
        <KPI title="Próximos Eventos" value={upcomingEvents} sub="Planificados o próximos" icon={Calendar} color="#22D3EE" bg="rgba(34,211,238,0.12)" />
        <KPI title="Marcas Activas" value={activeBrands} sub="En la red" trend="+1" icon={Building2} color="#FB923C" bg="rgba(251,146,60,0.12)" />
      </div>

      {/* Charts row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <Card title="Revenue por Unidad de Negocio">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={revenueByUnit} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(139,92,246,0.1)" />
              <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => fmt(v)} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="rev" name="Revenue" fill="#8B5CF6" radius={[6, 6, 0, 0]}>
                {revenueByUnit.map((_, i) => (
                  <Cell key={i} fill={['#8B5CF6', '#A78BFA', '#C084FC', '#E879F9'][i]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Crecimiento de Contactos">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={contactGrowth} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(139,92,246,0.1)" />
              <XAxis dataKey="month" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="contactos" name="Contactos" stroke="#8B5CF6" strokeWidth={2} dot={{ fill: '#8B5CF6', r: 3 }} />
              <Line type="monotone" dataKey="conversiones" name="Conversiones" stroke="#E879F9" strokeWidth={2} dot={{ fill: '#E879F9', r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
            {[{ c: '#8B5CF6', l: 'Contactos' }, { c: '#E879F9', l: 'Conversiones' }].map(x => (
              <div key={x.l} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-secondary)' }}>
                <div style={{ width: 10, height: 3, borderRadius: 2, background: x.c }} />{x.l}
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Charts row 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* Funnel */}
        <Card title="Pipeline de Ventas">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {funnelData.map((f, i) => {
              const pct = Math.round(f.value / funnelData[0].value * 100)
              return (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{f.name}</span>
                    <span style={{ color: f.fill, fontWeight: 700 }}>{fmtN(f.value)}</span>
                  </div>
                  <div style={{ height: 28, borderRadius: 8, background: 'rgba(139,92,246,0.08)', overflow: 'hidden', position: 'relative' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg, ${f.fill}, ${f.fill}88)`, borderRadius: 8, transition: 'width 0.6s ease', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 8 }}>
                      <span style={{ fontSize: 10, color: 'white', fontWeight: 700 }}>{pct}%</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(139,92,246,0.06)', borderRadius: 10, border: '1px solid var(--border-violet)', fontSize: 12, color: 'var(--text-secondary)' }}>
            Tasa de conversión global: <span style={{ color: '#4ADE80', fontWeight: 700 }}>
              {funnelData[0].value > 0 ? Math.round(funnelData[3].value / funnelData[0].value * 100) : 0}%
            </span>
          </div>
        </Card>

        {/* Upcoming events calendar */}
        <Card title="Próximos Eventos y Deadlines">
          {nextEvents.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-secondary)', fontSize: 13 }}>Sin eventos próximos</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {nextEvents.map(ev => {
                const daysLeft = ev.date ? Math.ceil((new Date(ev.date) - now) / 86400000) : null
                const cfg = { planning: { c: '#A78BFA', l: 'Planificando' }, upcoming: { c: '#FCD34D', l: 'Próximo' }, ongoing: { c: '#4ADE80', l: 'En curso' } }
                const s = cfg[ev.status] || { c: '#9CA3AF', l: ev.status }
                return (
                  <div key={ev.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: 'rgba(139,92,246,0.06)', borderRadius: 10, border: '1px solid var(--border-violet)' }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: `${s.c}22`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: s.c, lineHeight: 1 }}>{ev.date ? new Date(ev.date).getDate() : '?'}</span>
                      <span style={{ fontSize: 8, color: s.c }}>
                        {ev.date ? new Date(ev.date).toLocaleString('es-AR', { month: 'short' }).toUpperCase() : ''}
                      </span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{ev.city || ev.venue}</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 11, color: s.c, fontWeight: 600 }}>{daysLeft !== null ? `${daysLeft}d` : s.l}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{daysLeft !== null ? 'restantes' : ''}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          {nextEvents.length === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { name: 'Resilio Members Night', city: 'Buenos Aires', days: 21, color: '#8B5CF6' },
                { name: 'UA Elite Camp', city: 'CABA', days: 29, color: '#22D3EE' },
                { name: 'Nike Air Max Day', city: 'Rosario', days: 41, color: '#E879F9' },
              ].map((ev, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: 'rgba(139,92,246,0.06)', borderRadius: 10, border: '1px solid var(--border-violet)' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: `${ev.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🎉</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{ev.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{ev.city}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 11, color: ev.color, fontWeight: 700 }}>{ev.days}d</div>
                    <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>restantes</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Bottom row: Top brands + Quick stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Card title="Top Marcas por Revenue">
          {(brands || []).slice(0, 5).map((b, i) => {
            const brandUsages = (codeUsages || []).filter(u => u.brandId === b.id)
            const rev = brandUsages.reduce((a, u) => a + (u.purchaseAmount || 0), 0)
            const maxRev = (codeUsages || []).reduce((a, u) => a + (u.purchaseAmount || 0), 0) || 1
            const pct = Math.round(rev / maxRev * 100)
            return (
              <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                <span style={{ fontSize: 11, color: 'var(--text-secondary)', width: 14, textAlign: 'right' }}>#{i + 1}</span>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(139,92,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>{b.logo}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                    <span style={{ fontWeight: 600 }}>{b.name}</span>
                    <span style={{ color: '#4ADE80' }}>{fmt(rev)}</span>
                  </div>
                  <div style={{ height: 4, borderRadius: 2, background: 'rgba(139,92,246,0.1)' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg,#8B5CF6,#E879F9)', borderRadius: 2, transition: 'width 0.5s' }} />
                  </div>
                </div>
              </div>
            )
          })}
        </Card>

        <Card title="Resumen del Sistema">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              { l: 'Usuarios registrados', v: (users || []).length, icon: '👥', c: '#8B5CF6' },
              { l: 'Membresías activas', v: (memberships || []).filter(m => m.status === 'active').length, icon: '💎', c: '#FCD34D' },
              { l: 'Beneficios activos', v: (benefits || []).filter(b => b.status === 'active').length, icon: '🎁', c: '#4ADE80' },
              { l: 'Códigos activos', v: (codes || []).filter(c => c.status === 'active').length, icon: '🔑', c: '#22D3EE' },
              { l: 'Influencers activos', v: (influencers || []).filter(i => i.status === 'active').length, icon: '⭐', c: '#E879F9' },
              { l: 'Usos esta semana', v: (codeUsages || []).filter(u => (now - new Date(u.timestamp)) / 86400000 <= 7).length, icon: '⚡', c: '#FB923C' },
            ].map((s, i) => (
              <div key={i} style={{ padding: '12px 14px', background: 'rgba(139,92,246,0.06)', borderRadius: 10, border: '1px solid var(--border-violet)' }}>
                <div style={{ fontSize: 18, marginBottom: 4 }}>{s.icon}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: s.c }}>{s.v}</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.3 }}>{s.l}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
