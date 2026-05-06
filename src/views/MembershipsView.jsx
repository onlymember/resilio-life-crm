import React, { useState } from 'react'
import { CreditCard, Search, Users, DollarSign, TrendingUp, Calendar } from 'lucide-react'

const fmtMoney = (n) => n>=1000?`$${(n/1000).toFixed(0)}K`:`$${n}`
const fmtDate  = (d) => { if(!d) return '—'; const dt=new Date(d); return `${dt.getDate()}/${dt.getMonth()+1}/${dt.getFullYear()}` }

const PLAN_CFG = {
  monthly: { label:'Mensual', color:'#8B5CF6', bg:'rgba(139,92,246,0.15)', border:'rgba(139,92,246,0.4)' },
  annual:  { label:'Anual',   color:'#FCD34D', bg:'rgba(252,211,77,0.15)',  border:'rgba(252,211,77,0.4)'  },
}
const STATUS_CFG = {
  active:    { label:'Activa',    color:'#4ADE80', bg:'rgba(34,197,94,0.12)',   border:'rgba(34,197,94,0.3)'    },
  cancelled: { label:'Cancelada', color:'#F87171', bg:'rgba(239,68,68,0.12)',   border:'rgba(239,68,68,0.3)'    },
  expired:   { label:'Expirada',  color:'#9CA3AF', bg:'rgba(156,163,175,0.12)', border:'rgba(156,163,175,0.3)'  },
}
const PAYMENT_LABELS = {
  credit_card: '💳 Crédito', debit_card:'💳 Débito',
  mercadopago: '💙 MercadoPago', transfer:'🏦 Transferencia'
}

export default function MembershipsView({ memberships, users, influencers }) {
  const [search,  setSearch]  = useState('')
  const [fPlan,   setFPlan]   = useState('all')
  const [fStatus, setFStatus] = useState('all')

  const active   = memberships.filter(m=>m.status==='active')
  const monthly  = active.filter(m=>m.plan==='monthly')
  const annual   = active.filter(m=>m.plan==='annual')
  const mrr      = monthly.length * 2000 + annual.length * Math.round(20000/12)
  const arr      = mrr * 12
  const cancelled= memberships.filter(m=>m.status==='cancelled').length
  const churnRate= memberships.length>0 ? ((cancelled/memberships.length)*100).toFixed(1) : 0

  const filtered = memberships.filter(m => {
    const user = users.find(u=>u.id===m.userId)
    const ms   = (user?.name||'').toLowerCase().includes(search.toLowerCase()) ||
                 (user?.email||'').toLowerCase().includes(search.toLowerCase())
    return ms && (fPlan==='all'||m.plan===fPlan) && (fStatus==='all'||m.status===fStatus)
  })

  return (
    <div style={{ padding:24,animation:'fadeIn 0.3s ease' }}>
      <div style={{ marginBottom:20 }}>
        <h2 style={{ fontSize:20,fontWeight:700 }}>Membresías</h2>
        <p style={{ fontSize:12,color:'var(--text-secondary)' }}>{memberships.length} registradas · {active.length} activas</p>
      </div>

      {/* KPI cards */}
      <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))',gap:14,marginBottom:24 }}>
        {[
          { label:'Activas',   value:active.length,       icon:Users,     color:'var(--primary-violet)',  bg:'rgba(139,92,246,0.15)' },
          { label:'MRR',       value:fmtMoney(mrr),       icon:DollarSign,color:'#4ADE80',                bg:'rgba(74,222,128,0.15)'  },
          { label:'ARR',       value:fmtMoney(arr),       icon:TrendingUp,color:'#FCD34D',                bg:'rgba(252,211,77,0.15)'  },
          { label:'Mensuales', value:monthly.length,      icon:Calendar,  color:'var(--primary-violet-light)', bg:'rgba(167,139,250,0.15)' },
          { label:'Anuales',   value:annual.length,       icon:CreditCard,color:'#FCD34D',                bg:'rgba(252,211,77,0.12)'  },
          { label:'Churn',     value:`${churnRate}%`,     icon:TrendingUp,color:'#F87171',                bg:'rgba(239,68,68,0.12)'   },
        ].map(s=>(
          <div key={s.label} style={{
            padding:'16px 18px',background:'var(--glass-bg)',
            border:'1px solid var(--border-violet)',borderRadius:14,
            display:'flex',alignItems:'center',gap:12,
            transition:'all 0.2s'
          }}
            onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-3px)';e.currentTarget.style.boxShadow='var(--glow-violet-sm)';e.currentTarget.style.borderColor='var(--primary-violet)'}}
            onMouseLeave={e=>{e.currentTarget.style.transform='none';e.currentTarget.style.boxShadow='none';e.currentTarget.style.borderColor='var(--border-violet)'}}
          >
            <div style={{ width:42,height:42,borderRadius:12,background:s.bg,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
              <s.icon size={20} color={s.color}/>
            </div>
            <div>
              <div style={{ fontSize:20,fontWeight:800,color:s.color }}>{s.value}</div>
              <div style={{ fontSize:11,color:'var(--text-secondary)' }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display:'flex',gap:10,marginBottom:20,flexWrap:'wrap' }}>
        <div style={{ position:'relative',flex:1,minWidth:200 }}>
          <Search size={13} style={{ position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'var(--text-secondary)' }}/>
          <input className="input-field" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar por usuario o email..." style={{ paddingLeft:34 }}/>
        </div>
        <select className="select-field" style={{ width:'auto',minWidth:130 }} value={fPlan} onChange={e=>setFPlan(e.target.value)}>
          <option value="all">Todos los planes</option>
          <option value="monthly">Mensual</option>
          <option value="annual">Anual</option>
        </select>
        <select className="select-field" style={{ width:'auto',minWidth:130 }} value={fStatus} onChange={e=>setFStatus(e.target.value)}>
          <option value="all">Todos los estados</option>
          <option value="active">Activas</option>
          <option value="cancelled">Canceladas</option>
          <option value="expired">Expiradas</option>
        </select>
      </div>

      {/* List */}
      <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
        {filtered.length===0 ? (
          <div style={{ display:'flex',flexDirection:'column',alignItems:'center',gap:16,padding:'64px 32px',textAlign:'center' }}>
            <div style={{ width:64,height:64,borderRadius:20,background:'rgba(139,92,246,0.1)',display:'flex',alignItems:'center',justifyContent:'center' }}><CreditCard size={28} color="var(--primary-violet)"/></div>
            <h3 style={{ fontSize:16,fontWeight:600 }}>Sin resultados</h3>
          </div>
        ) : filtered.map(mem=>{
          const user    = users.find(u=>u.id===mem.userId)
          const refInf  = influencers.find(i=>i.id===mem.referredBy)
          const planCfg = PLAN_CFG[mem.plan]||PLAN_CFG.monthly
          const stCfg   = STATUS_CFG[mem.status]||STATUS_CFG.active

          return (
            <div key={mem.id} style={{
              display:'flex',alignItems:'center',gap:12,padding:'12px 16px',
              background:'var(--glass-bg)',border:'1px solid var(--border-violet)',borderRadius:12,
              transition:'all 0.2s',flexWrap:'wrap'
            }}
              onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--primary-violet)'}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--border-violet)'}}
            >
              {/* Avatar */}
              <div style={{ width:38,height:38,borderRadius:'50%',background:'linear-gradient(135deg,var(--primary-violet),var(--accent-magenta))',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,color:'white',fontSize:14,flexShrink:0 }}>
                {(user?.name||'?').charAt(0)}
              </div>

              {/* User info */}
              <div style={{ flex:1,minWidth:150 }}>
                <div style={{ fontSize:13,fontWeight:600 }}>{user?.name||mem.userId}</div>
                <div style={{ fontSize:11,color:'var(--text-secondary)' }}>{user?.email}</div>
              </div>

              {/* Plan */}
              <span style={{ fontSize:11,fontWeight:700,padding:'3px 10px',borderRadius:10,background:planCfg.bg,border:`1px solid ${planCfg.border}`,color:planCfg.color }}>
                {planCfg.label} · ${mem.price.toLocaleString()}
              </span>

              {/* Status */}
              <span style={{ fontSize:11,fontWeight:600,padding:'3px 10px',borderRadius:10,background:stCfg.bg,border:`1px solid ${stCfg.border}`,color:stCfg.color }}>
                {stCfg.label}
              </span>

              {/* Dates */}
              <div style={{ fontSize:11,color:'var(--text-secondary)',minWidth:130 }}>
                {fmtDate(mem.startDate)} → {fmtDate(mem.endDate)}
              </div>

              {/* Payment */}
              <div style={{ fontSize:11,color:'var(--text-secondary)',minWidth:120 }}>
                {PAYMENT_LABELS[mem.paymentMethod]||mem.paymentMethod}
              </div>

              {/* Referral */}
              {refInf && (
                <div style={{ fontSize:11,color:'#E879F9' }}>
                  via {refInf.username}
                </div>
              )}

              {/* Auto-renew */}
              <span style={{ fontSize:10,padding:'2px 7px',borderRadius:8,background:mem.autoRenew?'rgba(74,222,128,0.1)':'rgba(239,68,68,0.1)',border:`1px solid ${mem.autoRenew?'rgba(74,222,128,0.3)':'rgba(239,68,68,0.3)'}`,color:mem.autoRenew?'#4ADE80':'#F87171' }}>
                {mem.autoRenew?'🔄 Auto':'Manual'}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
