import React, { useState, useEffect } from 'react'
import { login, register } from '../../lib/auth.js'

// ── Inline styles (runs before GlobalStyles) ──
const s = {
  wrap: {
    minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
    background:'linear-gradient(135deg,#0A0618 0%,#120D24 50%,#1E1535 100%)',
    padding:'20px', fontFamily:"'Inter',-apple-system,sans-serif",
    position:'relative', overflow:'hidden',
  },
  nebula1: {
    position:'absolute', inset:0, pointerEvents:'none',
    background:'radial-gradient(ellipse 70% 60% at 20% 30%,rgba(139,92,246,0.12) 0%,transparent 70%)',
  },
  nebula2: {
    position:'absolute', inset:0, pointerEvents:'none',
    background:'radial-gradient(ellipse 50% 70% at 80% 70%,rgba(232,121,249,0.08) 0%,transparent 70%)',
  },
  card: {
    position:'relative', zIndex:1, width:'100%', maxWidth:440,
    background:'rgba(18,10,40,0.8)', backdropFilter:'blur(40px)', WebkitBackdropFilter:'blur(40px)',
    border:'1px solid rgba(139,92,246,0.3)', borderRadius:20,
    boxShadow:'0 0 40px rgba(139,92,246,0.2),0 40px 80px rgba(0,0,0,0.6)',
    animation:'fadeSlide 0.4s ease',
  },
  logo: { display:'flex', flexDirection:'column', alignItems:'center', padding:'32px 32px 20px' },
  logoImg: { width:80, height:80, objectFit:'contain', marginBottom:12, filter:'drop-shadow(0 0 16px rgba(139,92,246,0.6))' },
  logoTitle: {
    fontSize:22, fontWeight:800, letterSpacing:2,
    background:'linear-gradient(135deg,#A78BFA,#E879F9)', WebkitBackgroundClip:'text',
    WebkitTextFillColor:'transparent', backgroundClip:'text',
  },
  logoSub: { fontSize:11, color:'rgba(196,181,253,0.6)', letterSpacing:3, marginTop:4 },
  tabs: { display:'flex', borderBottom:'1px solid rgba(139,92,246,0.2)', margin:'0 24px' },
  tab: (active) => ({
    flex:1, padding:'12px 0', fontSize:13, fontWeight:600, letterSpacing:0.5,
    color:active?'#A78BFA':'rgba(196,181,253,0.45)',
    background:'none', border:'none', cursor:'pointer',
    borderBottom:active?'2px solid #8B5CF6':'2px solid transparent',
    transition:'all 0.25s', marginBottom:-1,
  }),
  form: { padding:'24px 32px 32px' },
  field: { marginBottom:18 },
  label: { display:'block', fontSize:12, fontWeight:500, color:'rgba(196,181,253,0.8)', marginBottom:7 },
  inputWrap: { position:'relative' },
  input: {
    width:'100%', padding:'11px 14px', boxSizing:'border-box',
    background:'rgba(139,92,246,0.08)', border:'1px solid rgba(139,92,246,0.25)',
    borderRadius:10, color:'#F9FAFB', fontSize:14, outline:'none', transition:'all 0.2s',
    fontFamily:'inherit',
  },
  btn: {
    width:'100%', padding:'12px', borderRadius:10, border:'none', cursor:'pointer',
    background:'linear-gradient(135deg,#8B5CF6,#7C3AED)', color:'white',
    fontSize:14, fontWeight:700, letterSpacing:0.5,
    boxShadow:'0 0 20px rgba(139,92,246,0.4)',
    transition:'all 0.2s', marginTop:4,
  },
  err: { background:'rgba(239,68,68,0.12)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:8, padding:'10px 14px', fontSize:13, color:'#F87171', marginBottom:16, lineHeight:1.5 },
  link: { textAlign:'center', marginTop:16, fontSize:12, color:'rgba(196,181,253,0.5)', cursor:'pointer' },
  eyeBtn: { position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'rgba(196,181,253,0.5)', fontSize:16, padding:0 },
}

const kf = `
  @keyframes fadeSlide { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
  input:focus { border-color: rgba(139,92,246,0.7) !important; background: rgba(139,92,246,0.13) !important; box-shadow: 0 0 0 3px rgba(139,92,246,0.12) !important; }
  .auth-btn:hover { transform:translateY(-2px); box-shadow:0 0 28px rgba(139,92,246,0.6) !important; }
  .auth-btn:active { transform:translateY(0); }
`

// ── Pending Screen ─────────────────────────────
const PendingScreen = ({ onBack }) => (
  <div style={s.wrap}>
    <style>{kf}</style>
    <div style={s.nebula1}/><div style={s.nebula2}/>
    <div style={{...s.card, textAlign:'center'}}>
      <div style={{padding:'48px 40px'}}>
        <div style={{fontSize:56,marginBottom:20}}>⏳</div>
        <h2 style={{fontSize:20,fontWeight:800,color:'#F9FAFB',marginBottom:12}}>Cuenta creada exitosamente</h2>
        <p style={{color:'rgba(196,181,253,0.75)',fontSize:13,lineHeight:1.8,marginBottom:28}}>
          Un administrador debe aprobar tu acceso.<br/>
          Te notificaremos cuando esté listo.
        </p>
        <button className="auth-btn" style={s.btn} onClick={onBack}>
          Volver al login
        </button>
      </div>
    </div>
  </div>
)

// ── Main Login Screen ──────────────────────────
export default function LoginScreen({ onLogin }) {
  const [tab,         setTab]         = useState('login')
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState('')
  const [showPending, setShowPending] = useState(false)
  const [showPass,    setShowPass]    = useState(false)
  const [showPass2,   setShowPass2]   = useState(false)

  const [lEmail, setLEmail] = useState('')
  const [lPass,  setLPass]  = useState('')

  const [rNombre,  setRNombre]  = useState('')
  const [rEmail,   setREmail]   = useState('')
  const [rPass,    setRPass]    = useState('')
  const [rPass2,   setRPass2]   = useState('')

  useEffect(() => { setError('') }, [tab])

  const switchTab = (t) => { setTab(t); setError('') }

  const handleLogin = (e) => {
    e.preventDefault()
    setError('')
    if (!lEmail.trim()) return setError('Ingresá tu email')
    if (!lPass)          return setError('Ingresá tu contraseña')
    setLoading(true)
    setTimeout(() => {
      const r = login(lEmail, lPass)
      setLoading(false)
      if (r.success)              return onLogin(r.user)
      if (r.error === 'pending')  return setShowPending(true)
      if (r.error === 'blocked')  return setError('Tu cuenta fue bloqueada. Contactá al administrador.')
      setError(r.error)
    }, 500)
  }

  const handleRegister = (e) => {
    e.preventDefault()
    setError('')
    if (!rNombre.trim())                    return setError('Ingresá tu nombre completo')
    if (!rEmail.trim()||!/\S+@\S+\.\S+/.test(rEmail)) return setError('Ingresá un email válido')
    if (rPass.length < 6)                   return setError('La contraseña debe tener mínimo 6 caracteres')
    if (rPass !== rPass2)                   return setError('Las contraseñas no coinciden')
    setLoading(true)
    setTimeout(() => {
      const r = register(rNombre, rEmail, rPass)
      setLoading(false)
      if (!r.success) return setError(r.error)
      if (r.directAccess) return onLogin(r.user)
      setShowPending(true)
    }, 500)
  }

  if (showPending) return <PendingScreen onBack={() => { setShowPending(false); switchTab('login') }}/>

  return (
    <div style={s.wrap}>
      <style>{kf}</style>
      <div style={s.nebula1}/><div style={s.nebula2}/>

      <div style={s.card}>
        {/* Logo */}
        <div style={s.logo}>
          <img src="/logoresilio.png" alt="Resilio Life" style={s.logoImg}
            onError={e => { e.target.style.display='none' }}/>
          <div style={s.logoTitle}>RESILIO LIFE</div>
          <div style={s.logoSub}>SISTEMA DE GESTIÓN</div>
        </div>

        {/* Tabs */}
        <div style={s.tabs}>
          <button style={s.tab(tab==='login')} onClick={() => switchTab('login')}>Iniciar Sesión</button>
          <button style={s.tab(tab==='register')} onClick={() => switchTab('register')}>Registrarse</button>
        </div>

        {/* Forms */}
        {tab === 'login' ? (
          <form style={s.form} onSubmit={handleLogin} autoComplete="off">
            {error && <div style={s.err}>{error}</div>}

            <div style={s.field}>
              <label style={s.label}>📧 Email</label>
              <input style={s.input} type="email" placeholder="email@ejemplo.com"
                value={lEmail} onChange={e=>setLEmail(e.target.value)} autoComplete="email"/>
            </div>

            <div style={s.field}>
              <label style={s.label}>🔒 Contraseña</label>
              <div style={s.inputWrap}>
                <input style={{...s.input, paddingRight:42}} type={showPass?'text':'password'}
                  placeholder="••••••••" value={lPass} onChange={e=>setLPass(e.target.value)} autoComplete="current-password"/>
                <button type="button" style={s.eyeBtn} onClick={()=>setShowPass(p=>!p)}>
                  {showPass ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <button type="submit" className="auth-btn" style={{...s.btn, opacity:loading?0.7:1}} disabled={loading}>
              {loading ? 'Verificando...' : 'Iniciar Sesión'}
            </button>

            <div style={s.link} onClick={() => setError('Contactá al administrador para recuperar tu contraseña.')}>
              ¿Olvidaste tu contraseña?
            </div>
          </form>
        ) : (
          <form style={s.form} onSubmit={handleRegister} autoComplete="off">
            {error && <div style={s.err}>{error}</div>}

            <div style={s.field}>
              <label style={s.label}>👤 Nombre completo</label>
              <input style={s.input} type="text" placeholder="Juan Pérez"
                value={rNombre} onChange={e=>setRNombre(e.target.value)}/>
            </div>

            <div style={s.field}>
              <label style={s.label}>📧 Email</label>
              <input style={s.input} type="email" placeholder="email@ejemplo.com"
                value={rEmail} onChange={e=>setREmail(e.target.value)} autoComplete="email"/>
            </div>

            <div style={s.field}>
              <label style={s.label}>🔒 Contraseña</label>
              <div style={s.inputWrap}>
                <input style={{...s.input, paddingRight:42}} type={showPass?'text':'password'}
                  placeholder="Mínimo 6 caracteres" value={rPass} onChange={e=>setRPass(e.target.value)}/>
                <button type="button" style={s.eyeBtn} onClick={()=>setShowPass(p=>!p)}>
                  {showPass ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <div style={s.field}>
              <label style={s.label}>🔒 Confirmar contraseña</label>
              <div style={s.inputWrap}>
                <input style={{...s.input, paddingRight:42}} type={showPass2?'text':'password'}
                  placeholder="Repetí tu contraseña" value={rPass2} onChange={e=>setRPass2(e.target.value)}/>
                <button type="button" style={s.eyeBtn} onClick={()=>setShowPass2(p=>!p)}>
                  {showPass2 ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <button type="submit" className="auth-btn" style={{...s.btn, opacity:loading?0.7:1}} disabled={loading}>
              {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
