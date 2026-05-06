import React, { useState, useEffect, useCallback } from 'react'
import {
  getUsers, saveUsers, getActivityLog, getAdminNotifs, markNotifRead, markAllNotifsRead,
  getSystemConfig, saveSystemConfig, approveUser, blockUser, unblockUser, updateUser,
  deleteUser, getRolePerms, logActivity, timeAgo, hashPwd, genId, SUPER_ADMIN_EMAIL
} from '../../lib/auth.js'

// ─── Constants ────────────────────────────────────────────────
const ALL_ECOS = [
  { id:'resilio',     label:'Resilio Life' },
  { id:'creative',    label:'Agencia Creativa' },
  { id:'influencers', label:'Agencia Influencers' },
  { id:'productora',  label:'Productora' },
  { id:'elevare',     label:'Elevare' },
  { id:'gestion',     label:'Gestión' },
  { id:'captacion',   label:'Captación' },
  { id:'dashboard',   label:'Dashboard General' },
]
const ALL_ACTIONS = [
  { id:'crear',     label:'Crear registros' },
  { id:'editar',    label:'Editar registros' },
  { id:'borrar',    label:'Borrar registros' },
  { id:'exportar',  label:'Exportar datos' },
  { id:'analytics', label:'Ver analytics' },
  { id:'equipo',    label:'Gestionar equipo' },
]
const ROLES = ['super_admin','admin','editor','viewer','custom']

const ROLE_LABEL = { super_admin:'Super Admin', admin:'Admin', editor:'Editor', viewer:'Viewer', custom:'Custom' }
const ROLE_COLOR = { super_admin:'#F59E0B', admin:'#8B5CF6', editor:'#3B82F6', viewer:'#6B7280', custom:'#EC4899' }
const ESTADO_COLOR = { aprobado:'#10B981', pendiente:'#F59E0B', bloqueado:'#EF4444', suspendido:'#6B7280' }
const ESTADO_LABEL = { aprobado:'Aprobado', pendiente:'Pendiente', bloqueado:'Bloqueado', suspendido:'Suspendido' }
const ACTION_ICON = { crear:'🟢', editar:'🔵', borrar:'🔴', login:'⚪', logout:'⚪', cambiar_seccion:'🟣', exportar:'🟠', aprobar_usuario:'🟡', login_fallido:'🔴' }

// ─── Micro components ─────────────────────────────────────────
const Badge = ({ type, label }) => (
  <span style={{
    display:'inline-flex', alignItems:'center', padding:'3px 10px', borderRadius:20,
    fontSize:11, fontWeight:700, letterSpacing:0.5, textTransform:'uppercase',
    background:`${type}22`, color:type, border:`1px solid ${type}44`,
  }}>{label}</span>
)

const Avatar = ({ user, size=34 }) => (
  <div style={{
    width:size, height:size, borderRadius:'50%', flexShrink:0, display:'flex',
    alignItems:'center', justifyContent:'center', fontSize:size*0.38, fontWeight:700,
    background:user.avatarColor||'#8B5CF6', color:'white', border:'2px solid rgba(255,255,255,0.15)',
  }}>{user.avatar||'?'}</div>
)

const Checkbox = ({ checked, onChange, label }) => (
  <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', fontSize:13, color:'#C4B5FD', userSelect:'none' }}>
    <div onClick={() => onChange(!checked)} style={{
      width:18, height:18, borderRadius:5, border:`2px solid ${checked?'#8B5CF6':'rgba(139,92,246,0.3)'}`,
      background:checked?'#8B5CF6':'transparent', display:'flex', alignItems:'center', justifyContent:'center',
      transition:'all 0.15s', flexShrink:0, cursor:'pointer',
    }}>
      {checked && <span style={{color:'white',fontSize:11,fontWeight:900}}>✓</span>}
    </div>
    {label}
  </label>
)

const SectionBtn = ({ id, label, icon, active, badge, onClick }) => (
  <button onClick={() => onClick(id)} style={{
    display:'flex', alignItems:'center', gap:10, padding:'10px 16px', borderRadius:10,
    width:'100%', marginBottom:4, transition:'all 0.2s', textAlign:'left',
    background: active ? 'rgba(139,92,246,0.22)' : 'transparent',
    color: active ? '#A78BFA' : 'rgba(196,181,253,0.6)',
    border: active ? '1px solid rgba(139,92,246,0.4)' : '1px solid transparent',
    fontSize:13, fontWeight: active ? 600 : 400,
  }}>
    <span style={{fontSize:16}}>{icon}</span>
    <span style={{flex:1}}>{label}</span>
    {badge > 0 && <span style={{ minWidth:18, height:18, background:'#E879F9', borderRadius:9, fontSize:10, fontWeight:700, color:'white', display:'flex', alignItems:'center', justifyContent:'center', padding:'0 4px' }}>{badge}</span>}
  </button>
)

// ─── Edit User Modal ───────────────────────────────────────────
const EditUserModal = ({ user, onSave, onClose, currentUser }) => {
  const [form, setForm] = useState({
    nombre:        user.nombre||'',
    sobrenombre:   user.sobrenombre||'',
    rol:           user.rol||'viewer',
    estado:        user.estado||'aprobado',
    notas_admin:   user.notas_admin||'',
    ecosistemas:   [...(user.permisos?.ecosistemas||[])],
    acciones:      { ...(user.permisos?.acciones||{}) },
  })
  const [tab, setTab] = useState('info')
  const [pwd, setPwd] = useState('')

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const toggleEco = (eco) => {
    setForm(p => ({
      ...p,
      ecosistemas: p.ecosistemas.includes(eco)
        ? p.ecosistemas.filter(e => e !== eco)
        : [...p.ecosistemas, eco]
    }))
  }

  const toggleAction = (a) => {
    setForm(p => ({ ...p, acciones: { ...p.acciones, [a]: !p.acciones[a] } }))
  }

  const applyRoleDefaults = (rol) => {
    const perms = getRolePerms(rol)
    setForm(p => ({ ...p, rol, ecosistemas: [...perms.ecosistemas], acciones: { ...perms.acciones } }))
  }

  const handleSave = () => {
    const changes = {
      nombre:      form.nombre,
      sobrenombre: form.sobrenombre,
      rol:         form.rol,
      estado:      form.estado,
      notas_admin: form.notas_admin,
      permisos: { ecosistemas: form.ecosistemas, acciones: form.acciones },
    }
    if (pwd.length >= 6) changes.password = hashPwd(pwd)
    onSave(user.id, changes)
  }

  const isSA = user.rol === 'super_admin' && user.email === SUPER_ADMIN_EMAIL
  const tabStyle = (t) => ({
    padding:'8px 14px', borderRadius:8, fontSize:12, fontWeight:600, border:'none', cursor:'pointer',
    background: tab===t ? 'rgba(139,92,246,0.25)' : 'transparent',
    color: tab===t ? '#A78BFA' : 'rgba(196,181,253,0.5)',
    transition:'all 0.15s',
  })

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', backdropFilter:'blur(8px)', zIndex:3000, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }} onClick={onClose}>
      <div style={{ width:'100%', maxWidth:580, maxHeight:'90vh', display:'flex', flexDirection:'column', background:'rgba(18,10,40,0.97)', border:'1px solid rgba(139,92,246,0.4)', borderRadius:18, boxShadow:'0 0 40px rgba(139,92,246,0.25)', overflow:'hidden' }} onClick={e=>e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding:'18px 24px', borderBottom:'1px solid rgba(139,92,246,0.2)', display:'flex', alignItems:'center', gap:14 }}>
          <Avatar user={user} size={42}/>
          <div>
            <div style={{ fontSize:16, fontWeight:700, color:'#F9FAFB' }}>{user.nombre}</div>
            <div style={{ fontSize:12, color:'rgba(196,181,253,0.6)' }}>{user.email}</div>
          </div>
          <button onClick={onClose} style={{ marginLeft:'auto', width:30, height:30, borderRadius:8, background:'rgba(239,68,68,0.12)', border:'1px solid rgba(239,68,68,0.25)', color:'#F87171', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>×</button>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', gap:4, padding:'12px 16px', borderBottom:'1px solid rgba(139,92,246,0.15)' }}>
          {[['info','👤 Info'],['permisos','🔒 Permisos'],['notas','📝 Notas']].map(([t,l])=>(
            <button key={t} style={tabStyle(t)} onClick={()=>setTab(t)}>{l}</button>
          ))}
        </div>

        {/* Body */}
        <div style={{ flex:1, overflowY:'auto', padding:'20px 24px' }}>

          {tab === 'info' && (
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div>
                <label style={{ fontSize:12, color:'rgba(196,181,253,0.7)', display:'block', marginBottom:6 }}>Nombre completo</label>
                <input className="input-field" value={form.nombre} onChange={e=>set('nombre',e.target.value)} style={{ width:'100%', padding:'9px 12px', background:'rgba(139,92,246,0.08)', border:'1px solid rgba(139,92,246,0.25)', borderRadius:8, color:'#F9FAFB', fontSize:13, outline:'none', boxSizing:'border-box' }}/>
              </div>
              <div>
                <label style={{ fontSize:12, color:'rgba(196,181,253,0.7)', display:'block', marginBottom:6 }}>Sobrenombre / Apodo</label>
                <input className="input-field" value={form.sobrenombre} onChange={e=>set('sobrenombre',e.target.value)} placeholder="Opcional" style={{ width:'100%', padding:'9px 12px', background:'rgba(139,92,246,0.08)', border:'1px solid rgba(139,92,246,0.25)', borderRadius:8, color:'#F9FAFB', fontSize:13, outline:'none', boxSizing:'border-box' }}/>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div>
                  <label style={{ fontSize:12, color:'rgba(196,181,253,0.7)', display:'block', marginBottom:6 }}>Rol</label>
                  <select value={form.rol} onChange={e=>applyRoleDefaults(e.target.value)} disabled={isSA} style={{ width:'100%', padding:'9px 12px', background:'rgba(18,10,40,0.95)', border:'1px solid rgba(139,92,246,0.25)', borderRadius:8, color:'#F9FAFB', fontSize:13, outline:'none', cursor:isSA?'not-allowed':'pointer' }}>
                    {ROLES.map(r=><option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize:12, color:'rgba(196,181,253,0.7)', display:'block', marginBottom:6 }}>Estado</label>
                  <select value={form.estado} onChange={e=>set('estado',e.target.value)} disabled={isSA} style={{ width:'100%', padding:'9px 12px', background:'rgba(18,10,40,0.95)', border:'1px solid rgba(139,92,246,0.25)', borderRadius:8, color:'#F9FAFB', fontSize:13, outline:'none', cursor:isSA?'not-allowed':'pointer' }}>
                    <option value="aprobado">Aprobado</option>
                    <option value="bloqueado">Bloqueado</option>
                    <option value="suspendido">Suspendido</option>
                  </select>
                </div>
              </div>
              {currentUser?.rol === 'super_admin' && (
                <div>
                  <label style={{ fontSize:12, color:'rgba(196,181,253,0.7)', display:'block', marginBottom:6 }}>Nueva contraseña (dejar vacío para no cambiar)</label>
                  <input type="password" value={pwd} onChange={e=>setPwd(e.target.value)} placeholder="Mínimo 6 caracteres" style={{ width:'100%', padding:'9px 12px', background:'rgba(139,92,246,0.08)', border:'1px solid rgba(139,92,246,0.25)', borderRadius:8, color:'#F9FAFB', fontSize:13, outline:'none', boxSizing:'border-box' }}/>
                </div>
              )}
            </div>
          )}

          {tab === 'permisos' && (
            <div>
              <div style={{ marginBottom:20 }}>
                <div style={{ fontSize:13, fontWeight:600, color:'#A78BFA', marginBottom:12 }}>Ecosistemas con acceso</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                  {ALL_ECOS.map(eco => (
                    <Checkbox key={eco.id} checked={form.ecosistemas.includes(eco.id) || form.rol==='super_admin' || form.rol==='admin'}
                      onChange={() => (form.rol!=='super_admin'&&form.rol!=='admin') && toggleEco(eco.id)}
                      label={eco.label}/>
                  ))}
                </div>
              </div>
              <div style={{ height:1, background:'rgba(139,92,246,0.15)', margin:'16px 0' }}/>
              <div>
                <div style={{ fontSize:13, fontWeight:600, color:'#A78BFA', marginBottom:12 }}>Acciones permitidas</div>
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {ALL_ACTIONS.map(a => (
                    <Checkbox key={a.id} checked={form.acciones[a.id] || form.rol==='super_admin' || form.rol==='admin'}
                      onChange={() => (form.rol!=='super_admin'&&form.rol!=='admin') && toggleAction(a.id)}
                      label={a.label}/>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === 'notas' && (
            <div>
              <label style={{ fontSize:12, color:'rgba(196,181,253,0.7)', display:'block', marginBottom:8 }}>Notas internas del administrador</label>
              <textarea value={form.notas_admin} onChange={e=>set('notas_admin',e.target.value)}
                placeholder="Notas privadas sobre este usuario..."
                rows={8}
                style={{ width:'100%', padding:'10px 12px', background:'rgba(139,92,246,0.08)', border:'1px solid rgba(139,92,246,0.25)', borderRadius:8, color:'#F9FAFB', fontSize:13, outline:'none', resize:'vertical', boxSizing:'border-box', fontFamily:'inherit' }}/>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding:'14px 24px', borderTop:'1px solid rgba(139,92,246,0.2)', display:'flex', gap:10, justifyContent:'flex-end' }}>
          <button onClick={onClose} style={{ padding:'9px 20px', borderRadius:8, background:'rgba(139,92,246,0.08)', border:'1px solid rgba(139,92,246,0.25)', color:'#A78BFA', fontSize:13, fontWeight:600, cursor:'pointer' }}>Cancelar</button>
          <button onClick={handleSave} style={{ padding:'9px 24px', borderRadius:8, background:'linear-gradient(135deg,#8B5CF6,#7C3AED)', border:'none', color:'white', fontSize:13, fontWeight:700, cursor:'pointer', boxShadow:'0 0 16px rgba(139,92,246,0.35)' }}>Guardar cambios</button>
        </div>
      </div>
    </div>
  )
}

// ─── Section: Dashboard ────────────────────────────────────────
const DashboardSection = ({ users, log }) => {
  const approved  = users.filter(u=>u.estado==='aprobado').length
  const pending   = users.filter(u=>u.estado==='pendiente').length
  const blocked   = users.filter(u=>u.estado==='bloqueado').length
  const recent24h = log.filter(e=>Date.now()-new Date(e.timestamp).getTime()<86400000).length
  const logins    = log.filter(e=>e.accion==='login').slice(0,15)

  const stats = [
    { label:'Total usuarios', value:users.length, color:'#8B5CF6', icon:'👥' },
    { label:'Aprobados',      value:approved,      color:'#10B981', icon:'✅' },
    { label:'Pendientes',     value:pending,       color:'#F59E0B', icon:'⏳' },
    { label:'Bloqueados',     value:blocked,       color:'#EF4444', icon:'🚫' },
    { label:'Acciones hoy',   value:recent24h,     color:'#06B6D4', icon:'⚡' },
  ]

  return (
    <div>
      <h3 style={{ fontSize:18, fontWeight:700, marginBottom:20, color:'#F9FAFB' }}>Dashboard Administración</h3>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:12, marginBottom:28 }}>
        {stats.map(st => (
          <div key={st.label} style={{ background:'rgba(139,92,246,0.07)', border:'1px solid rgba(139,92,246,0.2)', borderRadius:12, padding:'16px 18px', display:'flex', flexDirection:'column', gap:8 }}>
            <div style={{ fontSize:24 }}>{st.icon}</div>
            <div style={{ fontSize:28, fontWeight:800, color:st.color }}>{st.value}</div>
            <div style={{ fontSize:12, color:'rgba(196,181,253,0.7)' }}>{st.label}</div>
          </div>
        ))}
      </div>

      {pending > 0 && (
        <div style={{ background:'rgba(245,158,11,0.1)', border:'1px solid rgba(245,158,11,0.3)', borderRadius:12, padding:'14px 18px', marginBottom:20, display:'flex', alignItems:'center', gap:12 }}>
          <span style={{ fontSize:20 }}>⚠️</span>
          <div>
            <div style={{ fontSize:13, fontWeight:700, color:'#F59E0B' }}>{pending} usuario{pending>1?'s':''} pendiente{pending>1?'s':''} de aprobación</div>
            <div style={{ fontSize:12, color:'rgba(245,158,11,0.7)' }}>Ir a "Usuarios" para aprobar o rechazar</div>
          </div>
        </div>
      )}

      <div style={{ fontSize:14, fontWeight:600, color:'#A78BFA', marginBottom:12 }}>Últimos inicios de sesión</div>
      <div style={{ background:'rgba(139,92,246,0.05)', border:'1px solid rgba(139,92,246,0.15)', borderRadius:12, overflow:'hidden' }}>
        {logins.length === 0 && <div style={{ padding:'24px', textAlign:'center', color:'rgba(196,181,253,0.5)', fontSize:13 }}>Sin registros aún</div>}
        {logins.map((l,i) => (
          <div key={l.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 16px', borderBottom: i<logins.length-1?'1px solid rgba(139,92,246,0.1)':'none' }}>
            <span style={{ fontSize:14 }}>⚪</span>
            <div style={{ flex:1 }}>
              <span style={{ fontSize:13, color:'#F9FAFB', fontWeight:500 }}>{l.usuario_nombre}</span>
              <span style={{ fontSize:12, color:'rgba(196,181,253,0.5)', marginLeft:8 }}>{l.detalle}</span>
            </div>
            <span style={{ fontSize:11, color:'rgba(196,181,253,0.4)' }}>{timeAgo(l.timestamp)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Section: Usuarios ─────────────────────────────────────────
const UsersSection = ({ users: initialUsers, onRefresh, currentUser }) => {
  const [users,       setUsers]       = useState(initialUsers)
  const [search,      setSearch]      = useState('')
  const [filterEst,   setFilterEst]   = useState('all')
  const [filterRol,   setFilterRol]   = useState('all')
  const [editUser,    setEditUser]     = useState(null)
  const [blockModal,  setBlockModal]   = useState(null)
  const [blockMotivo, setBlockMotivo]  = useState('')
  const [delConfirm,  setDelConfirm]   = useState(null)
  const [delText,     setDelText]      = useState('')
  const [approveModal,setApproveModal] = useState(null)
  const [approveRol,  setApproveRol]   = useState('viewer')

  useEffect(() => { setUsers(initialUsers) }, [initialUsers])

  const refresh = () => { const u = getUsers(); setUsers(u); onRefresh(u) }

  const filtered = users.filter(u => {
    const q = search.toLowerCase()
    const mq = !q || u.nombre.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || (u.sobrenombre||'').toLowerCase().includes(q)
    const me = filterEst === 'all' || u.estado === filterEst
    const mr = filterRol === 'all' || u.rol === filterRol
    return mq && me && mr
  })

  const handleApprove = () => {
    approveUser(approveModal.id, approveRol)
    logActivity({ userId:currentUser?.id||'admin', userName:currentUser?.nombre||'Admin', accion:'aprobar_usuario', detalle:`Aprobó a ${approveModal.nombre} con rol ${approveRol}`, seccion:'admin' })
    setApproveModal(null); refresh()
  }

  const handleBlock = () => {
    blockUser(blockModal.id, blockMotivo)
    logActivity({ userId:currentUser?.id||'admin', userName:currentUser?.nombre||'Admin', accion:'bloquear_usuario', detalle:`Bloqueó a ${blockModal.nombre}`, seccion:'admin' })
    setBlockModal(null); setBlockMotivo(''); refresh()
  }

  const handleUnblock = (u) => {
    unblockUser(u.id)
    logActivity({ userId:currentUser?.id||'admin', userName:currentUser?.nombre||'Admin', accion:'desbloquear_usuario', detalle:`Desbloqueó a ${u.nombre}`, seccion:'admin' })
    refresh()
  }

  const handleEdit = (userId, changes) => {
    updateUser(userId, changes)
    logActivity({ userId:currentUser?.id||'admin', userName:currentUser?.nombre||'Admin', accion:'editar_usuario', detalle:`Editó perfil de ${editUser?.nombre}`, seccion:'admin' })
    setEditUser(null); refresh()
  }

  const handleDelete = () => {
    if (delText !== 'ELIMINAR') return
    const r = deleteUser(delConfirm.id)
    if (!r.success) return
    setDelConfirm(null); setDelText(''); refresh()
  }

  const inpStyle = { padding:'8px 12px', background:'rgba(139,92,246,0.08)', border:'1px solid rgba(139,92,246,0.25)', borderRadius:8, color:'#F9FAFB', fontSize:13, outline:'none' }

  return (
    <div>
      <h3 style={{ fontSize:18, fontWeight:700, marginBottom:16, color:'#F9FAFB' }}>Gestión de Usuarios</h3>

      {/* Filters */}
      <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap' }}>
        <div style={{ position:'relative', flex:1, minWidth:200 }}>
          <span style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', fontSize:14 }}>🔍</span>
          <input style={{...inpStyle, width:'100%', paddingLeft:32, boxSizing:'border-box'}} placeholder="Buscar usuario..." value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
        <select style={{...inpStyle, cursor:'pointer'}} value={filterEst} onChange={e=>setFilterEst(e.target.value)}>
          <option value="all">Todos los estados</option>
          <option value="aprobado">Aprobado</option>
          <option value="pendiente">Pendiente</option>
          <option value="bloqueado">Bloqueado</option>
        </select>
        <select style={{...inpStyle, cursor:'pointer'}} value={filterRol} onChange={e=>setFilterRol(e.target.value)}>
          <option value="all">Todos los roles</option>
          {ROLES.map(r=><option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
        </select>
      </div>

      {/* User list */}
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {filtered.length === 0 && (
          <div style={{ textAlign:'center', padding:40, color:'rgba(196,181,253,0.4)', fontSize:14 }}>Sin usuarios</div>
        )}
        {filtered.map(u => (
          <div key={u.id} style={{ background:'rgba(139,92,246,0.06)', border:'1px solid rgba(139,92,246,0.18)', borderRadius:12, padding:'14px 16px', display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
            <Avatar user={u} size={40}/>
            <div style={{ flex:1, minWidth:160 }}>
              <div style={{ fontSize:14, fontWeight:600, color:'#F9FAFB' }}>
                {u.nombre}
                {u.sobrenombre && <span style={{ fontSize:11, color:'rgba(196,181,253,0.5)', marginLeft:8 }}>"{u.sobrenombre}"</span>}
              </div>
              <div style={{ fontSize:11, color:'rgba(196,181,253,0.5)' }}>{u.email}</div>
              <div style={{ fontSize:10, color:'rgba(196,181,253,0.35)', marginTop:2 }}>Último acceso: {timeAgo(u.ultimo_acceso)}</div>
            </div>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap', alignItems:'center' }}>
              <Badge type={ROLE_COLOR[u.rol]} label={ROLE_LABEL[u.rol]}/>
              <Badge type={ESTADO_COLOR[u.estado]} label={ESTADO_LABEL[u.estado]}/>
            </div>
            <div style={{ display:'flex', gap:6 }}>
              {u.estado === 'pendiente' && (
                <button onClick={() => { setApproveModal(u); setApproveRol('viewer') }} style={{ padding:'6px 12px', borderRadius:7, background:'rgba(16,185,129,0.15)', border:'1px solid rgba(16,185,129,0.3)', color:'#10B981', fontSize:11, fontWeight:700, cursor:'pointer' }}>✅ Aprobar</button>
              )}
              {u.estado === 'aprobado' && u.rol !== 'super_admin' && (
                <button onClick={() => setBlockModal(u)} style={{ padding:'6px 12px', borderRadius:7, background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.25)', color:'#F87171', fontSize:11, fontWeight:700, cursor:'pointer' }}>🚫 Bloquear</button>
              )}
              {u.estado === 'bloqueado' && (
                <button onClick={() => handleUnblock(u)} style={{ padding:'6px 12px', borderRadius:7, background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.25)', color:'#10B981', fontSize:11, fontWeight:700, cursor:'pointer' }}>🔓 Desbloquear</button>
              )}
              <button onClick={() => setEditUser(u)} style={{ padding:'6px 12px', borderRadius:7, background:'rgba(139,92,246,0.12)', border:'1px solid rgba(139,92,246,0.3)', color:'#A78BFA', fontSize:11, fontWeight:700, cursor:'pointer' }}>✏️ Editar</button>
              {u.rol !== 'super_admin' && currentUser?.rol === 'super_admin' && (
                <button onClick={() => { setDelConfirm(u); setDelText('') }} style={{ padding:'6px 10px', borderRadius:7, background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', color:'#F87171', fontSize:11, cursor:'pointer' }}>🗑️</button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Approve Modal */}
      {approveModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', backdropFilter:'blur(8px)', zIndex:4000, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }} onClick={() => setApproveModal(null)}>
          <div style={{ background:'rgba(18,10,40,0.97)', border:'1px solid rgba(139,92,246,0.4)', borderRadius:16, padding:28, width:'100%', maxWidth:360 }} onClick={e=>e.stopPropagation()}>
            <h4 style={{ fontSize:16, fontWeight:700, marginBottom:8, color:'#F9FAFB' }}>Aprobar usuario</h4>
            <p style={{ fontSize:13, color:'rgba(196,181,253,0.7)', marginBottom:16 }}>Aprobando a <strong style={{color:'#A78BFA'}}>{approveModal.nombre}</strong></p>
            <label style={{ fontSize:12, color:'rgba(196,181,253,0.7)', display:'block', marginBottom:6 }}>Asignar rol inicial</label>
            <select style={{...inpStyle, width:'100%', marginBottom:18, cursor:'pointer'}} value={approveRol} onChange={e=>setApproveRol(e.target.value)}>
              {['admin','editor','viewer','custom'].map(r=><option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
            </select>
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
              <button onClick={() => setApproveModal(null)} style={{...inpStyle, cursor:'pointer'}}>Cancelar</button>
              <button onClick={handleApprove} style={{ padding:'9px 20px', borderRadius:8, background:'linear-gradient(135deg,#10B981,#059669)', border:'none', color:'white', fontWeight:700, cursor:'pointer' }}>Aprobar</button>
            </div>
          </div>
        </div>
      )}

      {/* Block Modal */}
      {blockModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', backdropFilter:'blur(8px)', zIndex:4000, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }} onClick={() => setBlockModal(null)}>
          <div style={{ background:'rgba(18,10,40,0.97)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:16, padding:28, width:'100%', maxWidth:380 }} onClick={e=>e.stopPropagation()}>
            <h4 style={{ fontSize:16, fontWeight:700, marginBottom:8, color:'#F9FAFB' }}>Bloquear usuario</h4>
            <p style={{ fontSize:13, color:'rgba(196,181,253,0.7)', marginBottom:16 }}>Bloqueando a <strong style={{color:'#F87171'}}>{blockModal.nombre}</strong></p>
            <textarea value={blockMotivo} onChange={e=>setBlockMotivo(e.target.value)} placeholder="Motivo (opcional)..." rows={3} style={{ width:'100%', padding:'9px 12px', background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:8, color:'#F9FAFB', fontSize:13, resize:'none', outline:'none', boxSizing:'border-box', fontFamily:'inherit', marginBottom:16 }}/>
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
              <button onClick={() => setBlockModal(null)} style={{...inpStyle, cursor:'pointer'}}>Cancelar</button>
              <button onClick={handleBlock} style={{ padding:'9px 20px', borderRadius:8, background:'linear-gradient(135deg,#EF4444,#DC2626)', border:'none', color:'white', fontWeight:700, cursor:'pointer' }}>Bloquear</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {delConfirm && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', backdropFilter:'blur(8px)', zIndex:4000, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }} onClick={() => setDelConfirm(null)}>
          <div style={{ background:'rgba(18,10,40,0.97)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:16, padding:28, width:'100%', maxWidth:380 }} onClick={e=>e.stopPropagation()}>
            <h4 style={{ fontSize:16, fontWeight:700, marginBottom:8, color:'#F87171' }}>⚠️ Eliminar usuario</h4>
            <p style={{ fontSize:13, color:'rgba(196,181,253,0.7)', marginBottom:16 }}>Escribí <strong style={{color:'#F87171'}}>ELIMINAR</strong> para confirmar la eliminación de <strong style={{color:'#F9FAFB'}}>{delConfirm.nombre}</strong></p>
            <input value={delText} onChange={e=>setDelText(e.target.value)} placeholder="ELIMINAR" style={{...inpStyle, width:'100%', marginBottom:16, boxSizing:'border-box'}}/>
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
              <button onClick={() => setDelConfirm(null)} style={{...inpStyle, cursor:'pointer'}}>Cancelar</button>
              <button onClick={handleDelete} disabled={delText!=='ELIMINAR'} style={{ padding:'9px 20px', borderRadius:8, background:'linear-gradient(135deg,#EF4444,#DC2626)', border:'none', color:'white', fontWeight:700, cursor:delText==='ELIMINAR'?'pointer':'not-allowed', opacity:delText==='ELIMINAR'?1:0.4 }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {editUser && <EditUserModal user={editUser} onSave={handleEdit} onClose={() => setEditUser(null)} currentUser={currentUser}/>}
    </div>
  )
}

// ─── Section: Matriz Permisos ──────────────────────────────────
const MatrizSection = ({ users: initialUsers, onRefresh }) => {
  const [users, setUsers] = useState(initialUsers)
  useEffect(() => setUsers(initialUsers), [initialUsers])

  const nonAdmin = users.filter(u => u.rol !== 'super_admin' && u.rol !== 'admin')

  const toggleEco = (userId, eco) => {
    const u = users.find(x => x.id === userId)
    if (!u || u.rol === 'super_admin' || u.rol === 'admin') return
    const ecos = u.permisos?.ecosistemas || []
    const newEcos = ecos.includes(eco) ? ecos.filter(e=>e!==eco) : [...ecos, eco]
    const updated = updateUser(userId, { permisos: { ...u.permisos, ecosistemas:newEcos } })
    setUsers(updated); onRefresh(updated)
  }

  const cellStyle = (has, isAdmin) => ({
    textAlign:'center', padding:'10px 4px', fontSize:13,
    color: isAdmin ? '#A78BFA' : has ? '#10B981' : '#EF4444',
    cursor: isAdmin ? 'not-allowed' : 'pointer',
    background:'transparent', border:'none',
    transition:'background 0.15s',
  })

  return (
    <div>
      <h3 style={{ fontSize:18, fontWeight:700, marginBottom:8, color:'#F9FAFB' }}>Matriz de Permisos</h3>
      <p style={{ fontSize:13, color:'rgba(196,181,253,0.6)', marginBottom:20 }}>Click en cada celda para activar/desactivar el acceso. Los admin tienen acceso total.</p>
      <div style={{ overflowX:'auto' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
          <thead>
            <tr style={{ borderBottom:'1px solid rgba(139,92,246,0.25)' }}>
              <th style={{ textAlign:'left', padding:'10px 12px', color:'rgba(196,181,253,0.7)', fontWeight:600, whiteSpace:'nowrap' }}>Usuario</th>
              {ALL_ECOS.map(e => (
                <th key={e.id} style={{ padding:'10px 8px', color:'rgba(196,181,253,0.7)', fontWeight:600, textAlign:'center', whiteSpace:'nowrap', fontSize:11 }}>{e.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {nonAdmin.length === 0 && (
              <tr><td colSpan={ALL_ECOS.length+1} style={{ textAlign:'center', padding:'32px', color:'rgba(196,181,253,0.4)', fontSize:13 }}>No hay usuarios editor/viewer/custom</td></tr>
            )}
            {nonAdmin.map((u,i) => (
              <tr key={u.id} style={{ borderBottom:'1px solid rgba(139,92,246,0.1)', background: i%2===0 ? 'rgba(139,92,246,0.03)' : 'transparent' }}>
                <td style={{ padding:'10px 12px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <Avatar user={u} size={28}/>
                    <div>
                      <div style={{ fontSize:12, fontWeight:600, color:'#F9FAFB', whiteSpace:'nowrap' }}>{u.nombre}</div>
                      <div style={{ fontSize:10, color:'rgba(196,181,253,0.4)' }}>{ROLE_LABEL[u.rol]}</div>
                    </div>
                  </div>
                </td>
                {ALL_ECOS.map(eco => {
                  const has = (u.permisos?.ecosistemas||[]).includes(eco.id)
                  return (
                    <td key={eco.id}>
                      <button style={cellStyle(has, false)} onClick={() => toggleEco(u.id, eco.id)}
                        title={has ? `Quitar acceso a ${eco.label}` : `Dar acceso a ${eco.label}`}>
                        {has ? '✅' : '❌'}
                      </button>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Section: Actividad ────────────────────────────────────────
const ActividadSection = ({ users }) => {
  const [log,        setLog]        = useState(() => getActivityLog())
  const [filterUser, setFilterUser] = useState('all')
  const [filterAcc,  setFilterAcc]  = useState('all')
  const [filterDate, setFilterDate] = useState('all')

  useEffect(() => { setLog(getActivityLog()) }, [])

  const now = Date.now()
  const filtered = log.filter(e => {
    const mu = filterUser === 'all' || e.usuario_id === filterUser
    const ma = filterAcc  === 'all' || e.accion === filterAcc
    const ts = new Date(e.timestamp).getTime()
    const md = filterDate === 'all'     ? true
             : filterDate === 'today'   ? now-ts < 86400000
             : filterDate === 'ayer'    ? now-ts >= 86400000 && now-ts < 172800000
             : filterDate === 'semana'  ? now-ts < 604800000
             : true
    return mu && ma && md
  })

  const accionLabel = { login:'Login', logout:'Logout', crear:'Crear', editar:'Editar', borrar:'Borrar', exportar:'Exportar', cambiar_seccion:'Navegación', aprobar_usuario:'Aprobación', bloquear_usuario:'Bloqueo' }
  const inpStyle = { padding:'8px 10px', background:'rgba(139,92,246,0.08)', border:'1px solid rgba(139,92,246,0.25)', borderRadius:8, color:'#F9FAFB', fontSize:12, outline:'none' }

  return (
    <div>
      <h3 style={{ fontSize:18, fontWeight:700, marginBottom:16, color:'#F9FAFB' }}>Historial de Actividad</h3>
      <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' }}>
        <select style={{...inpStyle, cursor:'pointer'}} value={filterUser} onChange={e=>setFilterUser(e.target.value)}>
          <option value="all">Todos los usuarios</option>
          {users.map(u=><option key={u.id} value={u.id}>{u.nombre}</option>)}
        </select>
        <select style={{...inpStyle, cursor:'pointer'}} value={filterAcc} onChange={e=>setFilterAcc(e.target.value)}>
          <option value="all">Todas las acciones</option>
          {Object.entries(accionLabel).map(([k,v])=><option key={k} value={k}>{v}</option>)}
        </select>
        <select style={{...inpStyle, cursor:'pointer'}} value={filterDate} onChange={e=>setFilterDate(e.target.value)}>
          <option value="all">Cualquier fecha</option>
          <option value="today">Hoy</option>
          <option value="ayer">Ayer</option>
          <option value="semana">Última semana</option>
        </select>
        <button onClick={() => setLog(getActivityLog())} style={{...inpStyle, cursor:'pointer'}}>🔄 Actualizar</button>
      </div>

      <div style={{ fontSize:12, color:'rgba(196,181,253,0.5)', marginBottom:12 }}>{filtered.length} registros</div>

      <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
        {filtered.length === 0 && (
          <div style={{ textAlign:'center', padding:'40px', color:'rgba(196,181,253,0.4)', fontSize:13 }}>Sin actividad registrada</div>
        )}
        {filtered.slice(0,100).map(e => (
          <div key={e.id} style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'10px 14px', background:'rgba(139,92,246,0.05)', border:'1px solid rgba(139,92,246,0.12)', borderRadius:10 }}>
            <span style={{ fontSize:14, flexShrink:0 }}>{ACTION_ICON[e.accion] || '⚡'}</span>
            <div style={{ flex:1, minWidth:0 }}>
              <span style={{ fontSize:13, color:'#F9FAFB', fontWeight:500 }}>{e.usuario_nombre}</span>
              <span style={{ fontSize:12, color:'rgba(196,181,253,0.6)', marginLeft:6 }}>{e.detalle}</span>
              {e.seccion && e.seccion !== 'sistema' && (
                <span style={{ fontSize:10, color:'rgba(196,181,253,0.35)', marginLeft:6 }}>— {e.seccion}</span>
              )}
            </div>
            <span style={{ fontSize:11, color:'rgba(196,181,253,0.35)', flexShrink:0 }}>{timeAgo(e.timestamp)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Section: Monitor ──────────────────────────────────────────
const MonitorSection = ({ users }) => {
  const [log, setLog] = useState(() => getActivityLog())
  useEffect(() => {
    const t = setInterval(() => setLog(getActivityLog()), 10000)
    return () => clearInterval(t)
  }, [])

  const recent = log.slice(0, 10)
  const activeLast1h = [...new Map(
    log.filter(e => Date.now()-new Date(e.timestamp).getTime() < 3600000)
       .map(e => [e.usuario_id, e])
  ).values()].slice(0,8)

  return (
    <div>
      <h3 style={{ fontSize:18, fontWeight:700, marginBottom:20, color:'#F9FAFB' }}>Monitor en Tiempo Real</h3>
      <div style={{ display:'inline-flex', alignItems:'center', gap:6, marginBottom:20, padding:'6px 14px', background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.25)', borderRadius:20, fontSize:12, color:'#10B981' }}>
        <span style={{ width:7, height:7, borderRadius:'50%', background:'#10B981', animation:'pulse 2s infinite', display:'inline-block' }}/>
        Actualización automática cada 10s
      </div>

      <div style={{ fontSize:14, fontWeight:600, color:'#A78BFA', marginBottom:12 }}>Activos última hora</div>
      <div style={{ display:'flex', flexWrap:'wrap', gap:10, marginBottom:24 }}>
        {activeLast1h.length === 0 && <div style={{ color:'rgba(196,181,253,0.4)', fontSize:13 }}>Sin actividad reciente</div>}
        {activeLast1h.map(e => {
          const u = users.find(x => x.id === e.usuario_id) || { avatar:e.usuario_nombre?.slice(0,2)||'?', avatarColor:'#8B5CF6', nombre:e.usuario_nombre }
          return (
            <div key={e.usuario_id} style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 14px', background:'rgba(16,185,129,0.08)', border:'1px solid rgba(16,185,129,0.2)', borderRadius:20 }}>
              <Avatar user={u} size={26}/>
              <div>
                <div style={{ fontSize:12, fontWeight:600, color:'#F9FAFB' }}>{u.nombre}</div>
                <div style={{ fontSize:10, color:'rgba(196,181,253,0.5)' }}>{timeAgo(e.timestamp)}</div>
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ fontSize:14, fontWeight:600, color:'#A78BFA', marginBottom:12 }}>Últimas 10 acciones</div>
      <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
        {recent.map(e => (
          <div key={e.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 14px', background:'rgba(139,92,246,0.05)', border:'1px solid rgba(139,92,246,0.12)', borderRadius:8 }}>
            <span style={{ fontSize:13 }}>{ACTION_ICON[e.accion]||'⚡'}</span>
            <span style={{ flex:1, fontSize:12, color:'#C4B5FD' }}><strong style={{color:'#F9FAFB'}}>{e.usuario_nombre}</strong> — {e.detalle}</span>
            <span style={{ fontSize:11, color:'rgba(196,181,253,0.4)' }}>{timeAgo(e.timestamp)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Section: Config ───────────────────────────────────────────
const ConfigSection = ({ currentUser }) => {
  const [cfg, setCfg] = useState(() => getSystemConfig())
  const [saved, setSaved] = useState(false)

  const set = (k, v) => setCfg(p => ({ ...p, [k]: v }))

  const handleSave = () => {
    saveSystemConfig(cfg)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleExport = () => {
    const keys = ['auth_users','crm_brands','crm_locations','crm_influencers','crm_benefits','crm_codes','crm_cr_projects','crm_events','crm_team','crm_missions','activity_log']
    const data = {}
    keys.forEach(k => { try { data[k] = JSON.parse(localStorage.getItem(k)||'null') } catch {} })
    const blob = new Blob([JSON.stringify(data, null, 2)], { type:'application/json' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
    a.download = `resilio-backup-${new Date().toISOString().slice(0,10)}.json`
    a.click()
  }

  const inpStyle = { width:'100%', padding:'10px 12px', background:'rgba(139,92,246,0.08)', border:'1px solid rgba(139,92,246,0.25)', borderRadius:8, color:'#F9FAFB', fontSize:13, outline:'none', boxSizing:'border-box', fontFamily:'inherit' }

  return (
    <div>
      <h3 style={{ fontSize:18, fontWeight:700, marginBottom:20, color:'#F9FAFB' }}>Configuración del Sistema</h3>
      <div style={{ display:'flex', flexDirection:'column', gap:16, maxWidth:500 }}>
        <div>
          <label style={{ fontSize:12, color:'rgba(196,181,253,0.7)', display:'block', marginBottom:6 }}>Nombre de la empresa</label>
          <input style={inpStyle} value={cfg.empresa} onChange={e=>set('empresa',e.target.value)}/>
        </div>
        <div>
          <label style={{ fontSize:12, color:'rgba(196,181,253,0.7)', display:'block', marginBottom:6 }}>Mensaje de bienvenida</label>
          <textarea style={{...inpStyle, resize:'vertical'}} rows={3} value={cfg.mensajeBienvenida} onChange={e=>set('mensajeBienvenida',e.target.value)}/>
        </div>
        <div>
          <label style={{ fontSize:12, color:'rgba(196,181,253,0.7)', display:'block', marginBottom:6 }}>Email del admin</label>
          <input style={inpStyle} value={cfg.adminEmail} readOnly/>
        </div>
        <div>
          <label style={{ fontSize:12, color:'rgba(196,181,253,0.7)', display:'block', marginBottom:6 }}>Versión del sistema</label>
          <input style={inpStyle} value={cfg.version} readOnly/>
        </div>
        <button onClick={handleSave} style={{ padding:'11px 24px', borderRadius:9, background:'linear-gradient(135deg,#8B5CF6,#7C3AED)', border:'none', color:'white', fontWeight:700, fontSize:13, cursor:'pointer', boxShadow:'0 0 16px rgba(139,92,246,0.3)' }}>
          {saved ? '✅ Guardado' : '💾 Guardar configuración'}
        </button>

        <div style={{ height:1, background:'rgba(139,92,246,0.15)', margin:'8px 0' }}/>

        <div>
          <div style={{ fontSize:14, fontWeight:600, color:'#A78BFA', marginBottom:12 }}>Datos del sistema</div>
          <div style={{ display:'flex', gap:10 }}>
            <button onClick={handleExport} style={{ flex:1, padding:'10px 16px', borderRadius:9, background:'rgba(6,182,212,0.12)', border:'1px solid rgba(6,182,212,0.3)', color:'#06B6D4', fontWeight:600, fontSize:13, cursor:'pointer' }}>
              📥 Exportar backup JSON
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Section: Notificaciones ───────────────────────────────────
const NotificacionesSection = ({ onUpdateBadge }) => {
  const [notifs, setNotifs] = useState(() => getAdminNotifs())

  const refresh = () => { const n = getAdminNotifs(); setNotifs(n); onUpdateBadge(n.filter(x=>!x.read).length) }

  const handleRead = (id) => { const n = markNotifRead(id); setNotifs(n); onUpdateBadge(n.filter(x=>!x.read).length) }
  const handleReadAll = () => { const n = markAllNotifsRead(); setNotifs(n); onUpdateBadge(0) }

  const TYPE_ICON = { new_user:'👤', failed_login:'⚠️', inactive:'😴', overdue:'⏰' }

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
        <h3 style={{ fontSize:18, fontWeight:700, color:'#F9FAFB' }}>Notificaciones Admin</h3>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={refresh} style={{ padding:'6px 12px', borderRadius:7, background:'rgba(139,92,246,0.1)', border:'1px solid rgba(139,92,246,0.25)', color:'#A78BFA', fontSize:12, cursor:'pointer' }}>🔄</button>
          {notifs.some(n=>!n.read) && (
            <button onClick={handleReadAll} style={{ padding:'6px 12px', borderRadius:7, background:'rgba(139,92,246,0.1)', border:'1px solid rgba(139,92,246,0.25)', color:'#A78BFA', fontSize:12, cursor:'pointer' }}>Marcar todas leídas</button>
          )}
        </div>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {notifs.length === 0 && <div style={{ textAlign:'center', padding:40, color:'rgba(196,181,253,0.4)', fontSize:14 }}>Sin notificaciones</div>}
        {notifs.map(n => (
          <div key={n.id} onClick={() => handleRead(n.id)} style={{ display:'flex', gap:12, padding:'12px 16px', background: n.read ? 'rgba(139,92,246,0.04)' : 'rgba(139,92,246,0.12)', border:`1px solid ${n.read?'rgba(139,92,246,0.12)':'rgba(139,92,246,0.3)'}`, borderRadius:10, cursor:'pointer', transition:'all 0.2s' }}>
            <div style={{ width:36, height:36, borderRadius:10, background:'rgba(139,92,246,0.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>{TYPE_ICON[n.type]||'🔔'}</div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:13, fontWeight: n.read?500:700, color:'#F9FAFB', marginBottom:2 }}>{n.title}</div>
              <div style={{ fontSize:12, color:'rgba(196,181,253,0.6)' }}>{n.body}</div>
              <div style={{ fontSize:10, color:'rgba(196,181,253,0.35)', marginTop:4 }}>{timeAgo(n.timestamp)}</div>
            </div>
            {!n.read && <div style={{ width:8, height:8, borderRadius:'50%', background:'#E879F9', flexShrink:0, marginTop:4 }}/>}
          </div>
        ))}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// ADMIN PANEL — Main Component
// ═══════════════════════════════════════════════════════════════

export default function AdminPanel({ onClose, currentUser }) {
  const [section,   setSection]   = useState('dashboard')
  const [users,     setUsers]     = useState(() => getUsers())
  const [badgeNotif,setBadgeNotif]= useState(() => getAdminNotifs().filter(n=>!n.read).length)
  const [badgePend, setBadgePend] = useState(() => getUsers().filter(u=>u.estado==='pendiente').length)

  const refreshUsers = useCallback((u) => {
    const list = u || getUsers()
    setUsers(list)
    setBadgePend(list.filter(x=>x.estado==='pendiente').length)
  }, [])

  const sections = [
    { id:'dashboard',     icon:'📊', label:'Dashboard',       badge:0 },
    { id:'usuarios',      icon:'👥', label:'Usuarios',        badge:badgePend },
    { id:'permisos',      icon:'🔒', label:'Matriz Permisos', badge:0 },
    { id:'actividad',     icon:'📋', label:'Actividad',       badge:0 },
    { id:'monitor',       icon:'📡', label:'Monitor Live',    badge:0 },
    { id:'config',        icon:'⚙️', label:'Configuración',   badge:0 },
    { id:'notificaciones',icon:'🔔', label:'Notificaciones',  badge:badgeNotif },
  ]

  const log = getActivityLog()

  const renderSection = () => {
    switch (section) {
      case 'dashboard':      return <DashboardSection users={users} log={log}/>
      case 'usuarios':       return <UsersSection users={users} onRefresh={refreshUsers} currentUser={currentUser}/>
      case 'permisos':       return <MatrizSection users={users} onRefresh={refreshUsers}/>
      case 'actividad':      return <ActividadSection users={users}/>
      case 'monitor':        return <MonitorSection users={users}/>
      case 'config':         return <ConfigSection currentUser={currentUser}/>
      case 'notificaciones': return <NotificacionesSection onUpdateBadge={setBadgeNotif}/>
      default:               return null
    }
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', backdropFilter:'blur(10px)', zIndex:2500, display:'flex', alignItems:'center', justifyContent:'center', padding:16, animation:'fadeIn 0.2s ease' }}>
      <div style={{ width:'100%', maxWidth:1100, height:'90vh', display:'flex', background:'rgba(10,6,24,0.98)', border:'1px solid rgba(139,92,246,0.35)', borderRadius:20, overflow:'hidden', boxShadow:'0 0 60px rgba(139,92,246,0.2),0 40px 80px rgba(0,0,0,0.7)' }}>

        {/* Sidebar */}
        <div style={{ width:220, flexShrink:0, background:'rgba(18,10,40,0.8)', borderRight:'1px solid rgba(139,92,246,0.2)', display:'flex', flexDirection:'column', padding:'20px 12px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:24, paddingLeft:4 }}>
            <div style={{ fontSize:20 }}>⚙️</div>
            <div>
              <div style={{ fontSize:14, fontWeight:800, color:'#F9FAFB' }}>Admin Panel</div>
              <div style={{ fontSize:10, color:'rgba(196,181,253,0.5)' }}>{currentUser?.nombre}</div>
            </div>
          </div>
          <nav style={{ flex:1 }}>
            {sections.map(s => (
              <SectionBtn key={s.id} {...s} active={section===s.id} onClick={setSection}/>
            ))}
          </nav>
          <button onClick={onClose} style={{ width:'100%', padding:'10px', borderRadius:10, background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', color:'#F87171', fontSize:13, fontWeight:600, cursor:'pointer', transition:'all 0.2s' }}>✕ Cerrar panel</button>
        </div>

        {/* Content */}
        <div style={{ flex:1, overflowY:'auto', padding:'28px 28px' }}>
          {renderSection()}
        </div>
      </div>
    </div>
  )
}
