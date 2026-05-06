import React, { useState, useMemo } from 'react'
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, AreaChart, Area
} from 'recharts'
import { TrendingUp, DollarSign, BarChart3, Users, MapPin, Clock } from 'lucide-react'

const fmtMoney = (n) => n >= 1000000 ? `$${(n/1000000).toFixed(1)}M` : n >= 1000 ? `$${(n/1000).toFixed(0)}K` : `$${n}`

const TOOLTIP_STYLE = {
  contentStyle: {
    background: 'rgba(29,16,61,0.95)',
    border: '1px solid rgba(139,92,246,0.4)',
    borderRadius: 12,
    color: '#F9FAFB',
    fontSize: 12,
  },
  labelStyle: { color: '#A78BFA', fontWeight: 600 },
}

const CHART_COLORS = ['#8B5CF6','#E879F9','#F472B6','#FCD34D','#4ADE80','#60A5FA','#FB923C','#A3E635']

const SectionCard = ({ title, icon: Icon, children, style }) => (
  <div style={{
    background: 'var(--glass-bg)', border: '1px solid var(--border-violet)',
    borderRadius: 16, padding: '20px 24px', ...style
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
      {Icon && <Icon size={15} color="var(--primary-violet-light)" />}
      <span style={{ fontSize: 14, fontWeight: 600 }}>{title}</span>
    </div>
    {children}
  </div>
)

export default function AnalyticsView({ codeUsages, codes, brands, locations, influencers, users, memberships }) {

  // ── Revenue last 30 days (Apr 2026) ──────────
  const revenueData = useMemo(() => {
    const map = {}
    codeUsages.forEach(u => {
      const d = u.timestamp.slice(0, 10)
      if (d >= '2026-04-01' && d <= '2026-04-30') {
        map[d] = (map[d] || 0) + u.purchaseAmount
      }
    })
    const days = []
    for (let i = 1; i <= 24; i++) {
      const d = `2026-04-${String(i).padStart(2,'0')}`
      const base = 35000 + Math.sin(i * 0.4) * 15000 + (i % 7 === 0 ? 25000 : 0)
      days.push({ date: `${i} Abr`, revenue: map[d] || Math.round(base + Math.random() * 10000) })
    }
    return days
  }, [codeUsages])

  // ── Codes per location ──────────────────────
  const locationData = useMemo(() => {
    const map = {}
    codeUsages.forEach(u => {
      if (u.locationId) {
        const loc = locations.find(l => l.id === u.locationId)
        const name = loc ? loc.name.replace(/^(Nike|Adidas|Puma|Reebok|Under Armour) /, '') : u.locationId
        map[name] = (map[name] || 0) + 1
      }
    })
    return Object.entries(map).sort(([,a],[,b]) => b-a).slice(0,8)
      .map(([name, count]) => ({ name, count }))
  }, [codeUsages, locations])

  // ── Top influencers by revenue ──────────────
  const infData = useMemo(() => {
    const map = {}
    codeUsages.forEach(u => {
      if (u.influencerId) {
        const inf = influencers.find(i => i.id === u.influencerId)
        const name = inf ? inf.username : u.influencerId
        map[name] = (map[name] || 0) + u.purchaseAmount
      }
    })
    return Object.entries(map).sort(([,a],[,b]) => b-a).slice(0,6)
      .map(([name, value]) => ({ name, value }))
  }, [codeUsages, influencers])

  // ── Age demographics ────────────────────────
  const ageData = useMemo(() => {
    const buckets = { '18-24': 0, '25-34': 0, '35-44': 0, '45-54': 0, '55+': 0 }
    codeUsages.forEach(u => {
      const age = u.userDemographics?.age || 0
      if (age < 25) buckets['18-24']++
      else if (age < 35) buckets['25-34']++
      else if (age < 45) buckets['35-44']++
      else if (age < 55) buckets['45-54']++
      else buckets['55+']++
    })
    return Object.entries(buckets).map(([range, count]) => ({ range, count }))
  }, [codeUsages])

  // ── Geographic distribution ─────────────────
  const cityData = useMemo(() => {
    const map = {}
    codeUsages.forEach(u => {
      const city = u.userDemographics?.city
      if (city) map[city] = (map[city] || 0) + 1
    })
    return Object.entries(map).sort(([,a],[,b]) => b-a)
      .map(([city, count]) => ({ city, count }))
  }, [codeUsages])

  // ── Usage heatmap (day of week × hour) ──────
  const heatmapData = useMemo(() => {
    const DAYS = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']
    const grid = {}
    codeUsages.forEach(u => {
      const d = new Date(u.timestamp)
      const day = DAYS[d.getDay()]
      const hour = d.getHours()
      const key = `${day}_${hour}`
      grid[key] = (grid[key] || 0) + 1
    })
    return DAYS.map(day => {
      const hours = {}
      for (let h = 8; h <= 22; h++) hours[`h${h}`] = grid[`${day}_${h}`] || 0
      return { day, ...hours }
    })
  }, [codeUsages])
  const heatHours = Array.from({ length: 15 }, (_, i) => i + 8)
  const heatMax = useMemo(() => Math.max(...heatmapData.flatMap(row => heatHours.map(h => row[`h${h}`] || 0)), 1), [heatmapData])

  // ── KPI totals ──────────────────────────────
  const totalRev   = codeUsages.reduce((s, u) => s + u.purchaseAmount, 0)
  const aprRev     = codeUsages.filter(u => u.timestamp.startsWith('2026-04')).reduce((s,u) => s + u.purchaseAmount, 0)
  const totalUsers = users.length
  const activeMemb = memberships.filter(m => m.status === 'active').length

  return (
    <div style={{ padding: 24, animation: 'fadeIn 0.3s ease' }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700 }}>Analytics</h2>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Resilio Life — métricas y performance</p>
      </div>

      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Revenue Total', value: fmtMoney(totalRev), icon: DollarSign, color: '#4ADE80' },
          { label: 'Revenue Abril', value: fmtMoney(aprRev), icon: TrendingUp, color: '#8B5CF6' },
          { label: 'Total Usos', value: codeUsages.length, icon: BarChart3, color: '#E879F9' },
          { label: 'Usuarios', value: totalUsers, icon: Users, color: '#FCD34D' },
          { label: 'Miembros Activos', value: activeMemb, icon: Users, color: '#60A5FA' },
        ].map(s => (
          <div key={s.label} style={{
            padding: '16px 18px', background: 'var(--glass-bg)',
            border: '1px solid var(--border-violet)', borderRadius: 14,
            display: 'flex', alignItems: 'center', gap: 12, transition: 'all 0.2s'
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary-violet)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-violet)'; e.currentTarget.style.transform = 'none' }}
          >
            <div style={{ width: 40, height: 40, borderRadius: 12, background: `${s.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <s.icon size={18} color={s.color} />
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Revenue Line Chart */}
      <SectionCard title="Revenue Diario — Abril 2026" icon={TrendingUp} style={{ marginBottom: 20 }}>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={revenueData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="gradRev" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(139,92,246,0.1)" />
            <XAxis dataKey="date" stroke="#6B7280" tick={{ fontSize: 10 }} interval={3} />
            <YAxis stroke="#6B7280" tick={{ fontSize: 10 }} tickFormatter={v => `$${(v/1000).toFixed(0)}K`} />
            <Tooltip {...TOOLTIP_STYLE} formatter={v => [fmtMoney(v), 'Revenue']} />
            <Area type="monotone" dataKey="revenue" stroke="#8B5CF6" strokeWidth={2.5}
              fill="url(#gradRev)" dot={false} activeDot={{ r: 5, fill: '#C084FC' }} />
          </AreaChart>
        </ResponsiveContainer>
      </SectionCard>

      {/* Bar charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 20, marginBottom: 20 }}>

        {/* Codes per location */}
        <SectionCard title="Usos por Local (Top 8)" icon={MapPin}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={locationData} margin={{ top: 0, right: 0, left: -20, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(139,92,246,0.1)" />
              <XAxis dataKey="name" stroke="#6B7280" tick={{ fontSize: 9 }} angle={-35} textAnchor="end" interval={0} />
              <YAxis stroke="#6B7280" tick={{ fontSize: 10 }} />
              <Tooltip {...TOOLTIP_STYLE} formatter={v => [v, 'Usos']} />
              <Bar dataKey="count" fill="#8B5CF6" radius={[4,4,0,0]}>
                {locationData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>

        {/* Top influencers pie */}
        <SectionCard title="Revenue por Influencer" icon={Users}>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={infData} dataKey="value" nameKey="name" cx="50%" cy="50%"
                outerRadius={80} label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`}
                labelLine={{ stroke: 'rgba(139,92,246,0.4)' }}
                style={{ fontSize: 10 }}
              >
                {infData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip {...TOOLTIP_STYLE} formatter={v => [fmtMoney(v), 'Revenue']} />
            </PieChart>
          </ResponsiveContainer>
        </SectionCard>
      </div>

      {/* Demographics row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 20, marginBottom: 20 }}>

        {/* Age distribution */}
        <SectionCard title="Distribución por Edad" icon={Users}>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={ageData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(139,92,246,0.1)" />
              <XAxis dataKey="range" stroke="#6B7280" tick={{ fontSize: 11 }} />
              <YAxis stroke="#6B7280" tick={{ fontSize: 10 }} />
              <Tooltip {...TOOLTIP_STYLE} formatter={v => [v, 'Usuarios']} />
              <Bar dataKey="count" radius={[4,4,0,0]}>
                {ageData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>

        {/* Geographic distribution */}
        <SectionCard title="Distribución por Ciudad" icon={MapPin}>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={cityData} layout="vertical" margin={{ top: 0, right: 20, left: 30, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(139,92,246,0.1)" />
              <XAxis type="number" stroke="#6B7280" tick={{ fontSize: 10 }} />
              <YAxis dataKey="city" type="category" stroke="#6B7280" tick={{ fontSize: 10 }} width={80} />
              <Tooltip {...TOOLTIP_STYLE} formatter={v => [v, 'Usos']} />
              <Bar dataKey="count" radius={[0,4,4,0]}>
                {cityData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>
      </div>

      {/* Usage Heatmap */}
      <SectionCard title="Heatmap de Uso — Día y Hora" icon={Clock}>
        <div style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: 480 }}>
            {/* Hour labels */}
            <div style={{ display: 'flex', paddingLeft: 36, marginBottom: 4 }}>
              {heatHours.map(h => (
                <div key={h} style={{ flex: 1, textAlign: 'center', fontSize: 9, color: 'var(--text-secondary)' }}>{h}h</div>
              ))}
            </div>
            {heatmapData.map(row => (
              <div key={row.day} style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
                <div style={{ width: 32, fontSize: 10, color: 'var(--text-secondary)', flexShrink: 0 }}>{row.day}</div>
                {heatHours.map(h => {
                  const val = row[`h${h}`] || 0
                  const intensity = val / heatMax
                  return (
                    <div key={h} style={{
                      flex: 1, height: 24, borderRadius: 4, margin: '0 1px',
                      background: intensity > 0
                        ? `rgba(139,92,246,${0.1 + intensity * 0.9})`
                        : 'rgba(139,92,246,0.05)',
                      border: '1px solid rgba(139,92,246,0.1)',
                      transition: 'all 0.2s',
                      cursor: 'default',
                      position: 'relative',
                    }}
                      title={`${row.day} ${h}:00 — ${val} usos`}
                    />
                  )
                })}
              </div>
            ))}
            {/* Legend */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
              <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Menos</span>
              {[0.1, 0.3, 0.5, 0.7, 0.9].map(v => (
                <div key={v} style={{ width: 18, height: 18, borderRadius: 3, background: `rgba(139,92,246,${v})` }} />
              ))}
              <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Más</span>
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  )
}
