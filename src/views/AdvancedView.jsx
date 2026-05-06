import React, { useState } from 'react'
import { CheckSquare, Square, AlertTriangle, Calendar, DollarSign, FileText, Trash2, Check } from 'lucide-react'

const FEATURES = [
  { id:'bulk',      label:'Bulk Operations',    icon:'☑️' },
  { id:'risk',      label:'Risk Scoring',        icon:'🎯' },
  { id:'calendar',  label:'Content Calendar',    icon:'📅' },
  { id:'expenses',  label:'Expense Tracking',    icon:'💸' },
  { id:'templates', label:'Templates',           icon:'📄' },
]

// ── Bulk Operations ───────────────────────────
const demoItems = [
  {id:'i1',name:'Nike Spring Campaign',type:'Campaña',status:'active'},
  {id:'i2',name:'Adidas Boost Exp.',   type:'Campaña',status:'active'},
  {id:'i3',name:'Penthouse PM',        type:'Asset',  status:'available'},
  {id:'i4',name:'UA Training Week',    type:'Campaña',status:'completed'},
  {id:'i5',name:'Mateo Santos',        type:'Lead',   status:'new'},
  {id:'i6',name:'Evento Nike Rosario', type:'Evento', status:'upcoming'},
]

function BulkOps() {
  const [sel, setSel] = useState([])
  const toggle = (id) => setSel(p=>p.includes(id)?p.filter(x=>x!==id):[...p,id])
  const all = sel.length===demoItems.length
  return (
    <div>
      <p style={{fontSize:13,color:'var(--text-secondary)',marginBottom:16}}>Selecciona múltiples items para ejecutar acciones en lote.</p>
      <div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap'}}>
        <button onClick={()=>setSel(all?[]:[...demoItems.map(i=>i.id)])} style={{padding:'7px 14px',borderRadius:10,fontSize:12,border:'1px solid var(--border-violet)',background:'rgba(139,92,246,0.1)',color:'var(--primary-violet-light)',cursor:'pointer'}}>
          {all?'Deseleccionar todo':'Seleccionar todo'}
        </button>
        {sel.length>0&&(
          <>
            <button style={{padding:'7px 14px',borderRadius:10,fontSize:12,border:'1px solid rgba(239,68,68,0.4)',background:'rgba(239,68,68,0.1)',color:'#F87171',cursor:'pointer'}} onClick={()=>setSel([])}><Trash2 size={12} style={{display:'inline',marginRight:4}}/>Eliminar ({sel.length})</button>
            <button style={{padding:'7px 14px',borderRadius:10,fontSize:12,border:'1px solid rgba(74,222,128,0.4)',background:'rgba(74,222,128,0.1)',color:'#4ADE80',cursor:'pointer'}}>📤 Exportar ({sel.length})</button>
            <button style={{padding:'7px 14px',borderRadius:10,fontSize:12,border:'1px solid rgba(252,211,77,0.4)',background:'rgba(252,211,77,0.1)',color:'#FCD34D',cursor:'pointer'}}>🔄 Mover ({sel.length})</button>
          </>
        )}
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:6}}>
        {demoItems.map(item=>{
          const isS = sel.includes(item.id)
          return (
            <div key={item.id} onClick={()=>toggle(item.id)} style={{display:'flex',alignItems:'center',gap:12,padding:'11px 14px',background:isS?'rgba(139,92,246,0.12)':'var(--glass-bg)',border:`1px solid ${isS?'var(--primary-violet)':'var(--border-violet)'}`,borderRadius:10,cursor:'pointer',transition:'all 0.2s'}}>
              <div style={{width:18,height:18,borderRadius:4,border:`2px solid ${isS?'var(--primary-violet)':'rgba(139,92,246,0.3)'}`,background:isS?'var(--primary-violet)':'transparent',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,transition:'all 0.2s'}}>
                {isS&&<Check size={11} color="white"/>}
              </div>
              <span style={{flex:1,fontSize:13}}>{item.name}</span>
              <span style={{fontSize:10,padding:'2px 8px',borderRadius:20,background:'rgba(139,92,246,0.1)',color:'var(--primary-violet-light)'}}>{item.type}</span>
              <span style={{fontSize:10,color:'var(--text-secondary)'}}>{item.status}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Risk Scoring ──────────────────────────────
const demoRisk = [
  {name:'Nike Argentina',   score:82, factors:['Alto engagement','Pago puntual','Larga relación']},
  {name:'Adidas Latam',     score:67, factors:['Pagos demorados','Buen volumen']},
  {name:'Carlos Méndez',    score:45, factors:['Lead nuevo','Sin historial']},
  {name:'Flor Torres',      score:91, factors:['Top performer','Revenue alto']},
  {name:'Evento Nike May',  score:58, factors:['Budget ajustado','Sin sponsor principal']},
]

function RiskScoring() {
  return (
    <div>
      <p style={{fontSize:13,color:'var(--text-secondary)',marginBottom:16}}>Score de riesgo calculado automáticamente en base a historial y comportamiento.</p>
      <div style={{display:'flex',flexDirection:'column',gap:10}}>
        {demoRisk.map(item=>{
          const color = item.score>=75?'#4ADE80':item.score>=50?'#FCD34D':'#F87171'
          const label = item.score>=75?'Bajo riesgo':item.score>=50?'Riesgo medio':'Alto riesgo'
          return (
            <div key={item.name} style={{display:'flex',alignItems:'center',gap:14,padding:'14px 16px',background:'var(--glass-bg)',border:`1px solid ${color}33`,borderRadius:12}}>
              <div style={{width:52,height:52,borderRadius:'50%',background:`${color}22`,border:`2px solid ${color}`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                <span style={{fontSize:16,fontWeight:800,color}}>{item.score}</span>
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:600,marginBottom:4}}>{item.name}</div>
                <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
                  {item.factors.map(f=><span key={f} style={{fontSize:9,padding:'1px 6px',borderRadius:20,background:'rgba(139,92,246,0.1)',color:'var(--primary-violet-light)'}}>{f}</span>)}
                </div>
              </div>
              <div style={{width:80,textAlign:'right'}}>
                <div style={{height:6,borderRadius:3,background:'rgba(139,92,246,0.1)',marginBottom:4}}>
                  <div style={{height:'100%',width:`${item.score}%`,borderRadius:3,background:color,transition:'width 0.5s'}}/>
                </div>
                <span style={{fontSize:10,color,fontWeight:600}}>{label}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Content Calendar ──────────────────────────
const demoCalendar = [
  {day:1,  posts:[{text:'Nike Story',status:'published',color:'#4ADE80'}]},
  {day:3,  posts:[{text:'Adidas Post',status:'published',color:'#4ADE80'}]},
  {day:5,  posts:[{text:'UA Reel',status:'published',color:'#4ADE80'}]},
  {day:8,  posts:[{text:'Nike Post',status:'scheduled',color:'#8B5CF6'},{text:'Story Pack',status:'scheduled',color:'#8B5CF6'}]},
  {day:12, posts:[{text:'Puma Story',status:'scheduled',color:'#8B5CF6'}]},
  {day:15, posts:[{text:'UA Collab',status:'draft',color:'#FCD34D'}]},
  {day:18, posts:[{text:'Nike Reel',status:'scheduled',color:'#8B5CF6'}]},
  {day:22, posts:[{text:'Campaign X',status:'draft',color:'#FCD34D'}]},
  {day:25, posts:[{text:'Adidas IG',status:'draft',color:'#FCD34D'}]},
  {day:28, posts:[{text:'Monthly',status:'draft',color:'#FCD34D'}]},
]

function ContentCalendar() {
  const days = Array.from({length:30},(_,i)=>i+1)
  const postMap = {}
  demoCalendar.forEach(d=>{ postMap[d.day]=d.posts })
  return (
    <div>
      <p style={{fontSize:13,color:'var(--text-secondary)',marginBottom:16}}>Vista mensual de contenidos programados — Abril 2026</p>
      <div style={{display:'flex',gap:12,marginBottom:14,flexWrap:'wrap'}}>
        {[{color:'#4ADE80',label:'Publicado'},{color:'#8B5CF6',label:'Programado'},{color:'#FCD34D',label:'Borrador'}].map(l=>(
          <div key={l.label} style={{display:'flex',alignItems:'center',gap:6,fontSize:11,color:'var(--text-secondary)'}}>
            <div style={{width:10,height:10,borderRadius:2,background:l.color}}/>{l.label}
          </div>
        ))}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:4}}>
        {['L','M','M','J','V','S','D'].map(d=><div key={d} style={{textAlign:'center',fontSize:10,fontWeight:600,color:'var(--text-secondary)',padding:'4px 0'}}>{d}</div>)}
        {days.map(d=>{
          const posts = postMap[d]||[]
          return (
            <div key={d} style={{minHeight:60,padding:'4px',background:posts.length?'rgba(139,92,246,0.08)':'rgba(139,92,246,0.03)',border:'1px solid var(--border-violet)',borderRadius:8,transition:'all 0.2s'}}
              onMouseEnter={e=>e.currentTarget.style.borderColor='var(--primary-violet)'}
              onMouseLeave={e=>e.currentTarget.style.borderColor='var(--border-violet)'}
            >
              <div style={{fontSize:10,color:'var(--text-secondary)',marginBottom:3}}>{d}</div>
              {posts.map((p,i)=><div key={i} style={{fontSize:8,padding:'1px 4px',borderRadius:4,background:`${p.color}22`,color:p.color,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',marginBottom:2}}>{p.text}</div>)}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Expense Tracking ──────────────────────────
const demoExpenses = [
  {id:'e1',desc:'Sesión fotográfica Nike',amount:45000,cat:'Producción',status:'approved',date:'2026-04-05'},
  {id:'e2',desc:'Viáticos evento Rosario', amount:12000,cat:'Viáticos',  status:'pending',  date:'2026-04-10'},
  {id:'e3',desc:'Suscripción Canva Pro',   amount:3500, cat:'Software',   status:'approved',date:'2026-04-01'},
  {id:'e4',desc:'Alquiler equipo sonido',  amount:28000,cat:'Eventos',    status:'review',   date:'2026-04-15'},
  {id:'e5',desc:'Licencia música stock',   amount:8000, cat:'Contenido',  status:'approved',date:'2026-04-08'},
]
const STATUS_E = {approved:{label:'Aprobado',color:'#4ADE80'},pending:{label:'Pendiente',color:'#FCD34D'},review:{label:'En revisión',color:'#A78BFA'},rejected:{label:'Rechazado',color:'#F87171'}}

function ExpenseTracking() {
  const total = demoExpenses.reduce((s,e)=>s+e.amount,0)
  const approved = demoExpenses.filter(e=>e.status==='approved').reduce((s,e)=>s+e.amount,0)
  return (
    <div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))',gap:10,marginBottom:16}}>
        {[{l:'Total mes',v:`$${(total/1000).toFixed(0)}K`,c:'#F87171'},{l:'Aprobado',v:`$${(approved/1000).toFixed(0)}K`,c:'#4ADE80'},{l:'Ítems',v:demoExpenses.length,c:'#8B5CF6'}].map(s=>(
          <div key={s.l} style={{padding:'12px 14px',background:'var(--glass-bg)',border:'1px solid var(--border-violet)',borderRadius:10}}>
            <div style={{fontSize:18,fontWeight:800,color:s.c}}>{s.v}</div>
            <div style={{fontSize:10,color:'var(--text-secondary)'}}>{s.l}</div>
          </div>
        ))}
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:6}}>
        {demoExpenses.map(e=>{
          const st = STATUS_E[e.status]||STATUS_E.pending
          return (
            <div key={e.id} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 14px',background:'var(--glass-bg)',border:'1px solid var(--border-violet)',borderRadius:10,flexWrap:'wrap'}}>
              <div style={{flex:1,minWidth:150}}>
                <div style={{fontSize:13,fontWeight:500}}>{e.desc}</div>
                <div style={{fontSize:10,color:'var(--text-secondary)'}}>{e.cat} · {e.date}</div>
              </div>
              <div style={{fontSize:14,fontWeight:700,color:'#F87171'}}>-${e.amount.toLocaleString()}</div>
              <span style={{fontSize:10,padding:'2px 8px',borderRadius:20,background:`${st.color}22`,color:st.color,fontWeight:600}}>{st.label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Document Templates ────────────────────────
const demoTemplates = [
  {id:'t1',name:'Contrato Campaña Influencer', cat:'Legal',    uses:23, icon:'📋'},
  {id:'t2',name:'Brief Creativo',              cat:'Creativo', uses:18, icon:'✏️'},
  {id:'t3',name:'Propuesta Cliente Retainer',  cat:'Ventas',   uses:12, icon:'💼'},
  {id:'t4',name:'Reporte Mensual KPIs',        cat:'Reportes', uses:31, icon:'📊'},
  {id:'t5',name:'Contrato Asset Elevare',      cat:'Legal',    uses:8,  icon:'🏙'},
  {id:'t6',name:'Orden de Compra Evento',      cat:'Eventos',  uses:15, icon:'🎉'},
]

function DocumentTemplates() {
  return (
    <div>
      <p style={{fontSize:13,color:'var(--text-secondary)',marginBottom:16}}>Biblioteca de templates reutilizables con variables auto-completadas.</p>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))',gap:12}}>
        {demoTemplates.map(t=>(
          <div key={t.id} style={{background:'var(--glass-bg)',border:'1px solid var(--border-violet)',borderRadius:12,padding:'16px 18px',transition:'all 0.2s'}}
            onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--primary-violet)';e.currentTarget.style.transform='translateY(-2px)'}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--border-violet)';e.currentTarget.style.transform='none'}}
          >
            <div style={{fontSize:28,marginBottom:10}}>{t.icon}</div>
            <div style={{fontSize:13,fontWeight:600,marginBottom:4}}>{t.name}</div>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
              <span style={{fontSize:10,padding:'2px 8px',borderRadius:20,background:'rgba(139,92,246,0.1)',color:'var(--primary-violet-light)'}}>{t.cat}</span>
              <span style={{fontSize:10,color:'var(--text-secondary)'}}>{t.uses} usos</span>
            </div>
            <div style={{display:'flex',gap:6}}>
              <button style={{flex:1,padding:'6px 0',borderRadius:8,fontSize:11,background:'rgba(139,92,246,0.15)',border:'1px solid var(--border-violet)',color:'var(--primary-violet-light)',cursor:'pointer'}}>📤 Exportar</button>
              <button style={{flex:1,padding:'6px 0',borderRadius:8,fontSize:11,background:'rgba(74,222,128,0.1)',border:'1px solid rgba(74,222,128,0.3)',color:'#4ADE80',cursor:'pointer'}}>✏️ Usar</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── MAIN ─────────────────────────────────────
export default function AdvancedView() {
  const [active, setActive] = useState('bulk')
  const panels = { bulk:<BulkOps/>, risk:<RiskScoring/>, calendar:<ContentCalendar/>, expenses:<ExpenseTracking/>, templates:<DocumentTemplates/> }

  return (
    <div style={{padding:24,animation:'fadeIn 0.3s ease'}}>
      <div style={{marginBottom:24}}>
        <h2 style={{fontSize:20,fontWeight:700}}>Features Avanzadas</h2>
        <p style={{fontSize:12,color:'var(--text-secondary)'}}>Herramientas adicionales para operaciones avanzadas</p>
      </div>

      <div style={{display:'flex',gap:8,marginBottom:24,flexWrap:'wrap'}}>
        {FEATURES.map(f=>(
          <button key={f.id} onClick={()=>setActive(f.id)} style={{display:'flex',alignItems:'center',gap:8,padding:'9px 16px',borderRadius:12,fontSize:13,fontWeight:active===f.id?700:400,border:`1px solid ${active===f.id?'var(--primary-violet)':'var(--border-violet)'}`,background:active===f.id?'rgba(139,92,246,0.2)':'rgba(139,92,246,0.05)',color:active===f.id?'var(--primary-violet-light)':'var(--text-secondary)',transition:'all 0.2s',cursor:'pointer'}}>
            <span>{f.icon}</span>{f.label}
          </button>
        ))}
      </div>

      <div style={{background:'var(--glass-bg)',border:'1px solid var(--border-violet)',borderRadius:16,padding:'24px 28px'}}>
        {panels[active]}
      </div>
    </div>
  )
}
