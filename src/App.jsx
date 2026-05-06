import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  LayoutDashboard, Building2, MapPin, Users, Gift, QrCode,
  BarChart3, ChevronDown, ChevronRight, Search,
  Bell, Sun, Moon, Menu, X, Plus, Edit3, Trash2,
  Phone, Mail, Globe, Calendar, Tag, CheckCircle,
  Clock, Star, TrendingUp,
  User, Shield, Zap, Layers,
  AlertCircle, ChevronLeft, Save, Award,
  Building, CreditCard, Activity, Palette, FileText, Ticket,
  Target, Radio, Crown, Megaphone, PhoneCall, Home, Map,
  Settings, LogOut
} from 'lucide-react'

import LoginScreen from './components/Auth/LoginScreen.jsx'
import AdminPanel  from './components/Admin/AdminPanel.jsx'
import {
  getSession, clearSession, logActivity, canDo, hasEcoAccess, isAdmin,
  getAdminNotifs, markNotifRead, markAllNotifsRead,
} from './lib/auth.js'
import {
  dbGetBrands, dbSaveBrand, dbDeleteBrand,
  dbGetLocations, dbSaveLocation, dbDeleteLocation,
  dbGetInfluencers, dbSaveInfluencer, dbDeleteInfluencer,
} from './lib/database.js'

import {
  DEMO_BRANDS, DEMO_LOCATIONS, DEMO_INFLUENCERS, DEMO_BENEFITS,
  DEMO_CODES, DEMO_CODE_USAGES, DEMO_MEMBERSHIPS, DEMO_USERS,
  DEMO_CREATIVE_CLIENTS, DEMO_CREATIVE_PROJECTS,
  DEMO_INF_CAMPAIGNS, DEMO_COLLABORATIONS,
  DEMO_EVENTS, DEMO_SPONSORS, DEMO_TICKETS,
  DEMO_ELEVARE_ASSETS, DEMO_ELEVARE_LEADS, DEMO_ELEVARE_CONTRACTS,
  DEMO_TEAM_MEMBERS,
  DEMO_MISSIONS, DEMO_NOTIFICATIONS
} from './data/demo.js'

import VideoPortal from './components/VideoPortal/VideoPortal.jsx'

import DashboardView         from './views/DashboardView.jsx'
import InfluencersView       from './views/InfluencersView.jsx'
import BenefitsView          from './views/BenefitsView.jsx'
import CodesView             from './views/CodesView.jsx'
import TrackingView          from './views/TrackingView.jsx'
import MembershipsView       from './views/MembershipsView.jsx'
import UsersView             from './views/UsersView.jsx'
import AnalyticsView         from './views/AnalyticsView.jsx'
import ReportsView           from './views/ReportsView.jsx'
import CreativeAgencyView    from './views/CreativeAgencyView.jsx'
import InfluencerAgencyView  from './views/InfluencerAgencyView.jsx'
import EventsView            from './views/EventsView.jsx'
import OnlyMembersView       from './views/OnlyMembersView.jsx'
import RRPPView              from './views/RRPPView.jsx'
import TicketsView           from './views/TicketsView.jsx'
import ElevareView           from './views/ElevareView.jsx'
import TeamView              from './views/TeamView.jsx'
import AdvancedView          from './views/AdvancedView.jsx'
import MissionsView          from './views/MissionsView.jsx'
import CaptacionView         from './views/CaptacionView.jsx'
import HubView               from './views/HubView.jsx'

// ═══════════════════════════════════════════════
// GLOBAL STYLES
// ═══════════════════════════════════════════════

const GlobalStyles = () => (
  <style>{`
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --primary-violet: #8B5CF6;
      --primary-violet-dark: #7C3AED;
      --primary-violet-light: #A78BFA;
      --secondary-purple: #C084FC;
      --accent-magenta: #E879F9;
      --accent-pink: #F472B6;
      --accent-cyan: #22D3EE;
      --accent-gold: #FCD34D;
      --bg-primary: #0A0618;
      --bg-secondary: #120D24;
      --bg-tertiary: #1E1535;
      --text-primary: #F9FAFB;
      --text-secondary: #C4B5FD;
      --border-violet: rgba(139, 92, 246, 0.25);
      --glass-bg: rgba(18, 10, 40, 0.75);
      --glow-violet: 0 0 24px rgba(139, 92, 246, 0.55);
      --glow-violet-sm: 0 0 12px rgba(139, 92, 246, 0.35);
      --glow-magenta: 0 0 20px rgba(232, 121, 249, 0.4);
      --glow-cyan: 0 0 20px rgba(34, 211, 238, 0.4);
      --transition: 0.3s ease;
      --radius: 12px;
      --radius-lg: 16px;
      --radius-xl: 20px;
      --nebula-1: radial-gradient(ellipse 60% 50% at 15% 25%, rgba(139,92,246,0.07) 0%, transparent 60%);
      --nebula-2: radial-gradient(ellipse 50% 60% at 85% 75%, rgba(232,121,249,0.05) 0%, transparent 60%);
      --nebula-3: radial-gradient(ellipse 40% 40% at 50% 50%, rgba(34,211,238,0.03) 0%, transparent 50%);
    }
    [data-theme="light"] {
      --bg-primary: #F3F0FF; --bg-secondary: #EDE9FE; --bg-tertiary: #DDD6FE;
      --text-primary: #1E1B4B; --text-secondary: #4C1D95;
      --glass-bg: rgba(237, 233, 254, 0.8); --border-violet: rgba(139, 92, 246, 0.4);
      --nebula-1: none; --nebula-2: none; --nebula-3: none;
    }
    html, body, #root { height: 100%; }
    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; background: var(--bg-primary); color: var(--text-primary); overflow-x: hidden; line-height: 1.5; }
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: var(--bg-secondary); }
    ::-webkit-scrollbar-thumb { background: var(--primary-violet-dark); border-radius: 3px; }
    ::-webkit-scrollbar-thumb:hover { background: var(--primary-violet); }
    input, textarea, select { font-family: inherit; outline: none; border: none; background: transparent; color: var(--text-primary); }
    button { cursor: pointer; font-family: inherit; border: none; background: none; }
    a { text-decoration: none; color: inherit; }
    @keyframes fadeIn     { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes slideIn    { from { opacity: 0; transform: translateX(-16px); } to { opacity: 1; transform: translateX(0); } }
    @keyframes pulse-glow { 0%, 100% { box-shadow: var(--glow-violet-sm); } 50% { box-shadow: var(--glow-violet); } }
    @keyframes spin       { to { transform: rotate(360deg); } }
    @keyframes float      { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
    @keyframes aurora     { 0%,100%{opacity:.5;transform:translateX(0) scaleY(1)} 50%{opacity:1;transform:translateX(2%) scaleY(1.05)} }
    @keyframes starTwinkle{ 0%,100%{opacity:.3} 50%{opacity:1} }
    @keyframes notifSlide { from{opacity:0;transform:translateX(20px)} to{opacity:1;transform:translateX(0)} }
    .animate-fade { animation: fadeIn 0.3s ease; }
    .glass { background: var(--glass-bg); backdrop-filter: blur(40px); -webkit-backdrop-filter: blur(40px); border: 1px solid var(--border-violet); }
    .glow { box-shadow: var(--glow-violet); }
    .gradient-text { background: linear-gradient(135deg, var(--primary-violet-light), var(--accent-magenta)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
    .btn { display: inline-flex; align-items: center; gap: 8px; padding: 9px 18px; border-radius: var(--radius); font-size: 14px; font-weight: 500; transition: all var(--transition); cursor: pointer; white-space: nowrap; }
    .btn-primary { background: linear-gradient(135deg, var(--primary-violet), var(--primary-violet-dark)); color: white; box-shadow: var(--glow-violet-sm); }
    .btn-primary:hover { transform: translateY(-2px); box-shadow: var(--glow-violet); }
    .btn-ghost { background: rgba(139, 92, 246, 0.1); color: var(--primary-violet-light); border: 1px solid var(--border-violet); }
    .btn-ghost:hover { background: rgba(139, 92, 246, 0.2); box-shadow: var(--glow-violet-sm); }
    .btn-danger { background: rgba(239, 68, 68, 0.15); color: #F87171; border: 1px solid rgba(239, 68, 68, 0.3); }
    .btn-danger:hover { background: rgba(239, 68, 68, 0.25); }
    .card { background: var(--glass-bg); backdrop-filter: blur(40px); -webkit-backdrop-filter: blur(40px); border: 1px solid var(--border-violet); border-radius: var(--radius-lg); transition: all var(--transition); }
    .card:hover { transform: translateY(-4px); box-shadow: var(--glow-violet); border-color: var(--primary-violet); }
    .badge { display: inline-flex; align-items: center; gap: 4px; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase; }
    .badge-active { background: rgba(34, 197, 94, 0.15); color: #4ADE80; border: 1px solid rgba(34,197,94,0.3); }
    .badge-inactive { background: rgba(239, 68, 68, 0.15); color: #F87171; border: 1px solid rgba(239,68,68,0.3); }
    .badge-premium { background: rgba(251, 191, 36, 0.15); color: #FCD34D; border: 1px solid rgba(251,191,36,0.3); }
    .badge-standard { background: rgba(139, 92, 246, 0.15); color: var(--primary-violet-light); border: 1px solid var(--border-violet); }
    .badge-basic { background: rgba(156, 163, 175, 0.15); color: #9CA3AF; border: 1px solid rgba(156,163,175,0.3); }
    .input-field { width: 100%; padding: 10px 14px; background: rgba(139, 92, 246, 0.08); border: 1px solid var(--border-violet); border-radius: var(--radius); color: var(--text-primary); font-size: 14px; transition: all var(--transition); }
    .input-field::placeholder { color: rgba(209, 213, 219, 0.4); }
    .input-field:focus { border-color: var(--primary-violet); background: rgba(139, 92, 246, 0.12); box-shadow: var(--glow-violet-sm); }
    .select-field { width: 100%; padding: 10px 14px; background: rgba(139, 92, 246, 0.08); border: 1px solid var(--border-violet); border-radius: var(--radius); color: var(--text-primary); font-size: 14px; transition: all var(--transition); appearance: none; cursor: pointer; }
    .select-field option { background: var(--bg-tertiary); color: var(--text-primary); }
    .select-field:focus { border-color: var(--primary-violet); box-shadow: var(--glow-violet-sm); }
    .stat-card { background: var(--glass-bg); border: 1px solid var(--border-violet); border-radius: var(--radius-lg); padding: 20px; display: flex; align-items: center; gap: 16px; transition: all var(--transition); }
    .stat-card:hover { transform: translateY(-3px); box-shadow: var(--glow-violet-sm); }
    .divider { height: 1px; background: var(--border-violet); margin: 16px 0; }
    .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; padding: 64px 32px; text-align: center; }
    @media (max-width: 640px) { .hide-mobile { display: none !important; } }
    @media (min-width: 641px) { .show-mobile-only { display: none !important; } }
  `}</style>
)

// ═══════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════

const generateId = () => `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
const formatDate = (iso) => { if (!iso) return '-'; return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' }) }

const useLocalStorage = (key, initial) => {
  const [value, setValue] = useState(() => {
    try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : initial } catch { return initial }
  })
  const set = useCallback((v) => { setValue(v); try { localStorage.setItem(key, JSON.stringify(v)) } catch {} }, [key])
  return [value, set]
}

// ═══════════════════════════════════════════════
// COMMAND PALETTE
// ═══════════════════════════════════════════════

const CommandPalette = ({ isOpen, onClose, onNavigate }) => {
  const [query, setQuery] = useState('')
  const inputRef = useRef(null)

  const commands = [
    { id: 'dashboard',      label: 'Dashboard General',    icon: LayoutDashboard, action: () => onNavigate('dashboard')      },
    { id: 'brands',         label: 'Marcas',               icon: Building2,       action: () => onNavigate('brands')         },
    { id: 'locations',      label: 'Locales',              icon: MapPin,          action: () => onNavigate('locations')      },
    { id: 'influencers',    label: 'Influencers Resilio',  icon: Users,           action: () => onNavigate('influencers')    },
    { id: 'benefits',       label: 'Beneficios',           icon: Gift,            action: () => onNavigate('benefits')       },
    { id: 'codes',          label: 'Códigos',              icon: QrCode,          action: () => onNavigate('codes')          },
    { id: 'memberships',    label: 'Membresías',           icon: CreditCard,      action: () => onNavigate('memberships')    },
    { id: 'users',          label: 'Usuarios',             icon: User,            action: () => onNavigate('users')          },
    { id: 'tracking',       label: 'Tracking Real-Time',   icon: Activity,        action: () => onNavigate('tracking')       },
    { id: 'analytics',      label: 'Analytics',            icon: BarChart3,       action: () => onNavigate('analytics')      },
    { id: 'reports',        label: 'Reportes',             icon: FileText,        action: () => onNavigate('reports')        },
    { id: 'creative',       label: 'Agencia Creativa',     icon: Palette,         action: () => onNavigate('creative')       },
    { id: 'inf_dashboard',  label: 'Influencers Dashboard',icon: Star,            action: () => onNavigate('inf_dashboard')  },
    { id: 'inf_campaigns',  label: 'Campañas Influencers', icon: Megaphone,       action: () => onNavigate('inf_campaigns')  },
    { id: 'inf_crm',        label: 'Influencers CRM',      icon: Users,           action: () => onNavigate('inf_crm')        },
    { id: 'events',         label: 'Eventos',              icon: Calendar,        action: () => onNavigate('events')         },
    { id: 'tickets',        label: 'Tickets',              icon: Ticket,          action: () => onNavigate('tickets')        },
    { id: 'only_members',   label: '⭐ Only Members',      icon: Crown,           action: () => onNavigate('only_members')   },
    { id: 'rrpp',           label: 'Relaciones Públicas',  icon: Users,           action: () => onNavigate('rrpp')           },
    { id: 'elevare',         label: '💎 Elevare',           icon: Star,            action: () => onNavigate('elevare')         },
    { id: 'elevare_bienes',  label: '💎 Elevare · Bienes',  icon: Building,        action: () => onNavigate('elevare_bienes')  },
    { id: 'elevare_contenido',label:'💎 Elevare · Contenido',icon: Layers,         action: () => onNavigate('elevare_contenido')},
    { id: 'elevare_hosp',    label: '💎 Elevare · Hospitality',icon:Home,          action: () => onNavigate('elevare_hosp')    },
    { id: 'missions',        label: '🎯 Misiones',          icon: Target,          action: () => onNavigate('missions')        },
    { id: 'team',            label: 'Team Management',      icon: Users,           action: () => onNavigate('team')            },
    { id: 'advanced',        label: 'Features Avanzadas',   icon: Zap,             action: () => onNavigate('advanced')        },
    { id: 'cap_pipeline',    label: '📞 Captación · Pipeline',icon:BarChart3,      action: () => onNavigate('cap_pipeline')    },
    { id: 'cap_speeches',    label: '📞 Captación · Speeches',icon:Megaphone,      action: () => onNavigate('cap_speeches')    },
    { id: 'cap_provincias',  label: '📞 Captación · Provincias',icon:Map,          action: () => onNavigate('cap_provincias')  },
    { id: 'cap_contactos',   label: '📞 Contactos CRM',    icon: Users,            action: () => onNavigate('cap_contactos')   },
  ]

  const filtered = commands.filter(c => c.label.toLowerCase().includes(query.toLowerCase()))

  useEffect(() => { if (isOpen) { setQuery(''); setTimeout(() => inputRef.current?.focus(), 50) } }, [isOpen])
  useEffect(() => { const h = (e) => { if (e.key === 'Escape') onClose() }; window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h) }, [onClose])

  if (!isOpen) return null

  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',backdropFilter:'blur(8px)',zIndex:2000,display:'flex',alignItems:'center',justifyContent:'center',padding:20,animation:'fadeIn 0.2s ease' }} onClick={onClose}>
      <div style={{ width:'100%',maxWidth:520,animation:'fadeIn 0.2s ease' }} onClick={e=>e.stopPropagation()}>
        <div className="glass" style={{ borderRadius:16,overflow:'hidden',boxShadow:'var(--glow-violet),0 40px 80px rgba(0,0,0,0.6)' }}>
          <div style={{ padding:'16px 20px',borderBottom:'1px solid var(--border-violet)',display:'flex',alignItems:'center',gap:12 }}>
            <Search size={18} color="var(--primary-violet-light)"/>
            <input ref={inputRef} value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar sección..." style={{ flex:1,background:'none',border:'none',outline:'none',color:'var(--text-primary)',fontSize:16 }}/>
            <kbd style={{ padding:'2px 8px',background:'rgba(139,92,246,0.2)',border:'1px solid var(--border-violet)',borderRadius:6,fontSize:11,color:'var(--text-secondary)' }}>ESC</kbd>
          </div>
          <div style={{ padding:8 }}>
            {filtered.map(cmd=>(
              <button key={cmd.id} onClick={()=>{cmd.action();onClose()}} style={{ width:'100%',display:'flex',alignItems:'center',gap:12,padding:'12px 16px',borderRadius:10,transition:'all 0.2s',color:'var(--text-primary)',fontSize:14 }} onMouseEnter={e=>e.currentTarget.style.background='rgba(139,92,246,0.15)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                <cmd.icon size={16} color="var(--primary-violet-light)"/>
                {cmd.label}
              </button>
            ))}
            {filtered.length===0&&<div style={{ padding:'24px 16px',textAlign:'center',color:'var(--text-secondary)',fontSize:14 }}>Sin resultados</div>}
          </div>
          <div style={{ padding:'8px 16px',borderTop:'1px solid var(--border-violet)',display:'flex',gap:16,fontSize:11,color:'var(--text-secondary)' }}>
            <span>↵ Seleccionar</span><span>ESC Cerrar</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════
// SIDEBAR
// ═══════════════════════════════════════════════

const Sidebar = ({ currentView, onNavigate, collapsed, onToggle, currentUser }) => {
  const [resilioOpen,    setResilioOpen]    = useState(true)
  const [creativeOpen,   setCreativeOpen]   = useState(true)
  const [agencyOpen,     setAgencyOpen]     = useState(true)
  const [productionOpen, setProductionOpen] = useState(true)
  const [elevareOpen,    setElevareOpen]    = useState(true)
  const [toolsOpen,      setToolsOpen]      = useState(true)
  const [captacionOpen,  setCaptacionOpen]  = useState(true)

  const sections = [
    {
      id: 'main', label: '', icon: null, collapsible: false,
      items: [
        { id: 'dashboard', label: 'Dashboard General', icon: LayoutDashboard },
      ]
    },
    {
      id: 'resilio', label: 'Resilio Life', icon: Zap, collapsible: true,
      open: resilioOpen, onToggle: () => setResilioOpen(p => !p),
      items: [
        { id: 'rl_dashboard', label: 'Dashboard',           icon: BarChart3    },
        { id: 'brands',       label: 'Marcas',              icon: Building2    },
        { id: 'locations',    label: 'Locales',             icon: MapPin       },
        { id: 'influencers',  label: 'Influencers',         icon: Users        },
        { id: 'benefits',     label: 'Beneficios',          icon: Gift         },
        { id: 'codes',        label: 'Códigos',             icon: QrCode       },
        { id: 'memberships',  label: 'Membresías',          icon: CreditCard   },
        { id: 'users',        label: 'Usuarios',            icon: User         },
        { id: 'unregistered', label: 'No Registrados',      icon: Radio        },
        { id: 'tracking',     label: 'Tracking Real-Time',  icon: Activity     },
        { id: 'analytics',    label: 'Analytics',           icon: BarChart3    },
        { id: 'reports',      label: 'Reportes',            icon: FileText     },
      ]
    },
    {
      id: 'creative', label: 'Agencia Creativa', icon: Palette, collapsible: true,
      open: creativeOpen, onToggle: () => setCreativeOpen(p => !p),
      items: [
        { id: 'creative',         label: 'Dashboard',  icon: BarChart3 },
        { id: 'creative_projects',label: 'Proyectos',  icon: Layers    },
        { id: 'creative_clients', label: 'Clientes',   icon: Building  },
        { id: 'creative_equipo',  label: 'Equipo',     icon: Users     },
      ]
    },
    {
      id: 'infagency', label: 'Agencia Influencers', icon: Star, collapsible: true,
      open: agencyOpen, onToggle: () => setAgencyOpen(p => !p),
      items: [
        { id: 'inf_dashboard',label: 'Dashboard',       icon: BarChart3  },
        { id: 'inf_campaigns',label: 'Campañas',         icon: Megaphone  },
        { id: 'inf_crm',      label: 'Influencers CRM', icon: Users      },
        { id: 'inf_collabs',  label: 'Colaboraciones',  icon: CheckCircle},
      ]
    },
    {
      id: 'production', label: 'Productora', icon: Calendar, collapsible: true,
      open: productionOpen, onToggle: () => setProductionOpen(p => !p),
      items: [
        { id: 'prod_dashboard', label: 'Dashboard',           icon: BarChart3  },
        { id: 'events',         label: 'Eventos',             icon: Calendar   },
        { id: 'tickets',        label: 'Tickets',             icon: Ticket     },
        { id: 'only_members',   label: 'Only Members',        icon: Crown      },
        { id: 'rrpp',           label: 'Relaciones Públicas', icon: Users      },
      ]
    },
    {
      id: 'elevare', label: 'Elevare', icon: Star, collapsible: true,
      open: elevareOpen, onToggle: () => setElevareOpen(p => !p),
      items: [
        { id: 'elevare',          label: 'Dashboard',           icon: BarChart3 },
        { id: 'elevare_bienes',   label: 'Bienes',              icon: Building  },
        { id: 'elevare_leads',    label: 'Leads',               icon: Users     },
        { id: 'elevare_contratos',label: 'Contratos',           icon: FileText  },
        { id: 'elevare_contenido',label: 'Contenido',           icon: Layers    },
        { id: 'elevare_hosp',     label: 'Hospitality',         icon: Home      },
      ]
    },
    {
      id: 'tools', label: 'Gestión', icon: Shield, collapsible: true,
      open: toolsOpen, onToggle: () => setToolsOpen(p => !p),
      items: [
        { id: 'missions', label: 'Misiones', icon: Target },
        { id: 'team',     label: 'Team',     icon: Users  },
        { id: 'advanced', label: 'Advanced', icon: Zap    },
      ]
    },
    {
      id: 'captacion', label: 'Captación', icon: PhoneCall, collapsible: true,
      open: captacionOpen, onToggle: () => setCaptacionOpen(p => !p),
      items: [
        { id: 'cap_pipeline',   label: 'Pipeline',    icon: BarChart3  },
        { id: 'cap_busqueda',   label: 'Búsqueda',    icon: Search     },
        { id: 'cap_speeches',   label: 'Speeches',    icon: Megaphone  },
        { id: 'cap_provincias', label: 'Expansión',   icon: Map        },
        { id: 'cap_seguimiento',label: 'Seguimiento', icon: Target     },
        { id: 'cap_contactos',  label: 'Contactos',   icon: Users      },
      ]
    },
  ]

  return (
    <aside style={{
      position:'sticky',top:0,height:'100vh',width:collapsed?72:260,
      background:'var(--glass-bg)',backdropFilter:'blur(40px)',
      borderRight:'1px solid var(--border-violet)',
      display:'flex',flexDirection:'column',transition:'width 0.3s ease',
      zIndex:10,overflow:'hidden',flexShrink:0
    }}>
      {/* Logo */}
      <div style={{ padding:'20px 16px',borderBottom:'1px solid var(--border-violet)',display:'flex',alignItems:'center',gap:12,minHeight:72 }}>
        <div style={{ width:40,height:40,borderRadius:12,flexShrink:0,background:'linear-gradient(135deg,var(--primary-violet),var(--accent-magenta))',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'var(--glow-violet-sm)',fontSize:18 }}>⚡</div>
        {!collapsed&&(
          <div style={{ overflow:'hidden' }}>
            <div className="gradient-text" style={{ fontSize:14,fontWeight:700,letterSpacing:0.5,whiteSpace:'nowrap' }}>Resilio Life</div>
            <div style={{ fontSize:11,color:'var(--text-secondary)',whiteSpace:'nowrap' }}>CRM v3.0</div>
          </div>
        )}
        <button onClick={onToggle} style={{ marginLeft:'auto',color:'var(--text-secondary)',padding:4,borderRadius:6,transition:'all 0.2s',flexShrink:0 }} onMouseEnter={e=>{e.currentTarget.style.color='var(--primary-violet-light)';e.currentTarget.style.background='rgba(139,92,246,0.1)'}} onMouseLeave={e=>{e.currentTarget.style.color='var(--text-secondary)';e.currentTarget.style.background='transparent'}}>
          {collapsed?<ChevronRight size={16}/>:<ChevronLeft size={16}/>}
        </button>
      </div>

      {/* Nav */}
      <nav style={{ flex:1,overflowY:'auto',padding:'12px 8px' }}>
        {sections.map(section=>(
          <div key={section.id} style={{ marginBottom:8 }}>
            {section.label&&!collapsed&&(
              section.collapsible ? (
                <button onClick={section.onToggle} style={{ width:'100%',display:'flex',alignItems:'center',gap:8,padding:'6px 8px',color:'var(--text-secondary)',fontSize:11,fontWeight:600,letterSpacing:1,textTransform:'uppercase',borderRadius:6,transition:'all 0.2s' }} onMouseEnter={e=>e.currentTarget.style.color='var(--primary-violet-light)'} onMouseLeave={e=>e.currentTarget.style.color='var(--text-secondary)'}>
                  {section.icon&&<section.icon size={12}/>}
                  <span style={{ flex:1 }}>{section.label}</span>
                  {section.open?<ChevronDown size={12}/>:<ChevronRight size={12}/>}
                </button>
              ) : (
                <div style={{ padding:'6px 8px',color:'var(--text-secondary)',fontSize:11,fontWeight:600,letterSpacing:1,textTransform:'uppercase' }}>{section.label}</div>
              )
            )}
            {(!section.collapsible||section.open)&&section.items.map(item=>{
              const isActive = currentView===item.id
              return (
                <button key={item.id} onClick={()=>!item.disabled&&onNavigate(item.id)} title={collapsed?item.label:undefined} style={{
                  width:'100%',display:'flex',alignItems:'center',gap:10,
                  padding:collapsed?'10px':'9px 10px',
                  justifyContent:collapsed?'center':'flex-start',
                  borderRadius:10,transition:'all 0.2s',marginBottom:2,
                  background:isActive?'rgba(139,92,246,0.2)':'transparent',
                  color:isActive?'var(--primary-violet-light)':item.disabled?'rgba(156,163,175,0.4)':'var(--text-secondary)',
                  boxShadow:isActive?'var(--glow-violet-sm)':'none',
                  border:isActive?'1px solid rgba(139,92,246,0.4)':'1px solid transparent',
                  cursor:item.disabled?'not-allowed':'pointer'
                }}
                  onMouseEnter={e=>{if(!item.disabled&&!isActive){e.currentTarget.style.background='rgba(139,92,246,0.1)';e.currentTarget.style.color='var(--text-primary)'}}}
                  onMouseLeave={e=>{if(!item.disabled&&!isActive){e.currentTarget.style.background='transparent';e.currentTarget.style.color='var(--text-secondary)'}}}
                >
                  <item.icon size={17} style={{ flexShrink:0 }}/>
                  {!collapsed&&(
                    <>
                      <span style={{ fontSize:13,fontWeight:isActive?600:400,flex:1,textAlign:'left' }}>{item.label}</span>
                      {item.disabled&&<span style={{ fontSize:10,background:'rgba(139,92,246,0.15)',color:'var(--primary-violet-light)',padding:'1px 6px',borderRadius:10,border:'1px solid var(--border-violet)' }}>Pronto</span>}
                      {isActive&&<div style={{ width:6,height:6,borderRadius:'50%',background:'var(--primary-violet)',boxShadow:'0 0 6px var(--primary-violet)',flexShrink:0 }}/>}
                    </>
                  )}
                </button>
              )
            })}
          </div>
        ))}
      </nav>

      {/* User */}
      {!collapsed&&currentUser&&(
        <div style={{ padding:'12px 16px',borderTop:'1px solid var(--border-violet)' }}>
          <div style={{ display:'flex',alignItems:'center',gap:10 }}>
            <div style={{ width:34,height:34,borderRadius:'50%',flexShrink:0,background:currentUser.avatarColor||'linear-gradient(135deg,var(--primary-violet),var(--accent-magenta))',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700,color:'white',border:'2px solid rgba(255,255,255,0.15)' }}>{currentUser.avatar||'?'}</div>
            <div style={{ flex:1,minWidth:0 }}>
              <div style={{ fontSize:13,fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{currentUser.sobrenombre||currentUser.nombre||'Usuario'}</div>
              <div style={{ fontSize:11,color:'var(--primary-violet-light)',textTransform:'capitalize' }}>{currentUser.rol?.replace('_',' ')||'viewer'}</div>
            </div>
            {isAdmin(currentUser)&&<Shield size={14} color="var(--primary-violet-light)"/>}
          </div>
        </div>
      )}
    </aside>
  )
}

// ═══════════════════════════════════════════════
// HEADER
// ═══════════════════════════════════════════════

const Header = ({ currentView, theme, onThemeToggle, onCommandPalette, onMobileMenu, notifications, onMarkRead, onMarkAllRead, onHub, currentUser, onLogout, onAdmin, adminNotifCount }) => {
  const [notifOpen,   setNotifOpen]   = useState(false)
  const [avatarOpen,  setAvatarOpen]  = useState(false)
  const labels = { dashboard:'Dashboard General',rl_dashboard:'Resilio Life · Dashboard',brands:'Marcas',locations:'Locales',influencers:'Influencers',benefits:'Beneficios',codes:'Códigos',memberships:'Membresías',users:'Usuarios',unregistered:'Usuarios No Registrados',tracking:'Tracking Real-Time',analytics:'Analytics',reports:'Reportes',creative:'Agencia Creativa',creative_projects:'Proyectos',creative_clients:'Clientes Creativos',creative_equipo:'Equipo Creativo',inf_dashboard:'Agencia Influencers · Dashboard',inf_campaigns:'Campañas',inf_crm:'Influencers CRM',inf_collabs:'Colaboraciones',prod_dashboard:'Productora · Dashboard',events:'Eventos',tickets:'Tickets',only_members:'⭐ Only Members',rrpp:'Relaciones Públicas',elevare:'💎 Elevare · Dashboard',elevare_bienes:'💎 Elevare · Bienes',elevare_leads:'💎 Elevare · Leads',elevare_contratos:'💎 Elevare · Contratos',elevare_contenido:'💎 Elevare · Contenido',elevare_hosp:'💎 Elevare · Hospitality',missions:'🎯 Misiones',team:'Team Management',advanced:'Features Avanzadas',cap_pipeline:'📞 Captación · Pipeline',cap_busqueda:'📞 Captación · Búsqueda',cap_speeches:'📞 Captación · Speeches',cap_provincias:'📞 Captación · Expansión',cap_seguimiento:'📞 Captación · Seguimiento',cap_contactos:'📞 Captación · Contactos',hub:'Hub Central' }
  const unread = (notifications||[]).filter(n=>!n.read).length
  const notifTypeColor = { mission:'var(--primary-violet)', elevare:'#FCD34D', creative:'#EC4899', campaign:'#06B6D4' }
  const notifTypeIcon  = { mission:'🎯', elevare:'💎', creative:'🎨', campaign:'⚡' }
  const displayName = currentUser?.sobrenombre || currentUser?.nombre || 'Usuario'
  const roleLabel = { super_admin:'Super Admin', admin:'Admin', editor:'Editor', viewer:'Viewer', custom:'Custom' }

  return (
    <header style={{ height:64,background:'var(--glass-bg)',backdropFilter:'blur(40px)',borderBottom:'1px solid var(--border-violet)',display:'flex',alignItems:'center',padding:'0 20px',gap:12,position:'sticky',top:0,zIndex:100 }}>
      <button className="show-mobile-only" onClick={onMobileMenu} style={{ color:'var(--text-secondary)',padding:6,borderRadius:8 }}><Menu size={20}/></button>
      <div>
        <h1 style={{ fontSize:16,fontWeight:700 }}>{labels[currentView]||currentView}</h1>
        <p style={{ fontSize:11,color:'var(--text-secondary)' }}>Resilio Life CRM · v5.0</p>
      </div>
      <div style={{ flex:1 }}/>

      {/* Hub button */}
      <button onClick={onHub} title="Volver al Hub" style={{ display:'flex',alignItems:'center',gap:6,padding:'7px 14px',borderRadius:10,fontSize:12,fontWeight:600,background:currentView==='hub'?'rgba(139,92,246,0.25)':'rgba(139,92,246,0.08)',border:`1px solid ${currentView==='hub'?'var(--primary-violet)':'var(--border-violet)'}`,color:currentView==='hub'?'var(--primary-violet-light)':'var(--text-secondary)',transition:'all 0.2s' }} onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--primary-violet)';e.currentTarget.style.background='rgba(139,92,246,0.2)'}} onMouseLeave={e=>{e.currentTarget.style.borderColor=currentView==='hub'?'var(--primary-violet)':'var(--border-violet)';e.currentTarget.style.background=currentView==='hub'?'rgba(139,92,246,0.25)':'rgba(139,92,246,0.08)'}}>
        ⚡ Hub
      </button>

      {/* Admin button — only for admin/super_admin */}
      {isAdmin(currentUser) && (
        <div style={{ position:'relative' }}>
          <button onClick={onAdmin} style={{ display:'flex',alignItems:'center',gap:6,padding:'7px 14px',borderRadius:10,fontSize:12,fontWeight:600,background:'rgba(245,158,11,0.1)',border:'1px solid rgba(245,158,11,0.3)',color:'#F59E0B',transition:'all 0.2s',position:'relative' }}
            onMouseEnter={e=>{e.currentTarget.style.background='rgba(245,158,11,0.2)'}}
            onMouseLeave={e=>{e.currentTarget.style.background='rgba(245,158,11,0.1)'}}>
            <Settings size={13}/><span className="hide-mobile">Admin</span>
            {adminNotifCount > 0 && <span style={{ position:'absolute',top:-4,right:-4,minWidth:16,height:16,background:'#E879F9',borderRadius:8,fontSize:9,fontWeight:700,color:'white',display:'flex',alignItems:'center',justifyContent:'center',padding:'0 3px' }}>{adminNotifCount}</span>}
          </button>
        </div>
      )}

      {/* Search */}
      <button onClick={onCommandPalette} className="hide-mobile" style={{ display:'flex',alignItems:'center',gap:10,background:'rgba(139,92,246,0.08)',border:'1px solid var(--border-violet)',borderRadius:10,padding:'8px 14px',color:'var(--text-secondary)',fontSize:13,transition:'all 0.2s',minWidth:180 }} onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--primary-violet)';e.currentTarget.style.background='rgba(139,92,246,0.15)'}} onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--border-violet)';e.currentTarget.style.background='rgba(139,92,246,0.08)'}}>
        <Search size={14}/><span>Buscar...</span>
        <kbd style={{ marginLeft:'auto',padding:'1px 6px',background:'rgba(139,92,246,0.2)',border:'1px solid var(--border-violet)',borderRadius:5,fontSize:10 }}>⌘K</kbd>
      </button>

      {/* Notification bell */}
      <div style={{ position:'relative' }}>
        <button onClick={()=>{setNotifOpen(p=>!p);setAvatarOpen(false)}} style={{ width:38,height:38,borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',background: notifOpen ? 'rgba(139,92,246,0.2)' : 'rgba(139,92,246,0.08)',border:`1px solid ${notifOpen?'var(--primary-violet)':'var(--border-violet)'}`,color: notifOpen ? 'var(--primary-violet-light)' : 'var(--text-secondary)',position:'relative',transition:'all 0.2s' }}>
          <Bell size={16}/>
          {unread > 0 && <span style={{ position:'absolute',top:6,right:6,minWidth:16,height:16,background:'var(--accent-magenta)',borderRadius:8,fontSize:9,fontWeight:700,color:'white',display:'flex',alignItems:'center',justifyContent:'center',padding:'0 3px',boxShadow:'0 0 8px var(--accent-magenta)' }}>{unread}</span>}
        </button>
        {notifOpen && (
          <>
            <div style={{ position:'fixed',inset:0,zIndex:200 }} onClick={()=>setNotifOpen(false)}/>
            <div className="glass" style={{ position:'absolute',top:'calc(100% + 8px)',right:0,width:340,borderRadius:16,overflow:'hidden',zIndex:201,boxShadow:'var(--glow-violet),0 20px 40px rgba(0,0,0,0.5)',animation:'notifSlide 0.2s ease' }}>
              <div style={{ padding:'14px 16px',borderBottom:'1px solid var(--border-violet)',display:'flex',alignItems:'center',justifyContent:'space-between' }}>
                <span style={{ fontWeight:700,fontSize:14 }}>Notificaciones {unread>0&&<span style={{ marginLeft:6,padding:'1px 8px',borderRadius:10,background:'rgba(232,121,249,0.2)',color:'var(--accent-magenta)',fontSize:11 }}>{unread}</span>}</span>
                {unread>0&&<button onClick={onMarkAllRead} style={{ fontSize:11,color:'var(--primary-violet-light)',background:'none',border:'none',cursor:'pointer' }}>Marcar todas leídas</button>}
              </div>
              <div style={{ maxHeight:360,overflowY:'auto' }}>
                {(notifications||[]).length===0 && <div style={{ padding:24,textAlign:'center',color:'var(--text-secondary)',fontSize:13 }}>Sin notificaciones</div>}
                {(notifications||[]).map(n=>(
                  <div key={n.id} onClick={()=>onMarkRead(n.id)} style={{ padding:'12px 16px',borderBottom:'1px solid var(--border-violet)',cursor:'pointer',background:n.read?'transparent':'rgba(139,92,246,0.06)',transition:'background 0.2s',display:'flex',gap:10,alignItems:'flex-start' }}
                    onMouseEnter={e=>e.currentTarget.style.background='rgba(139,92,246,0.1)'}
                    onMouseLeave={e=>e.currentTarget.style.background=n.read?'transparent':'rgba(139,92,246,0.06)'}>
                    <div style={{ width:32,height:32,borderRadius:10,background:`${notifTypeColor[n.type]||'var(--primary-violet)'}22`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,flexShrink:0 }}>{notifTypeIcon[n.type]||'🔔'}</div>
                    <div style={{ flex:1,minWidth:0 }}>
                      <div style={{ fontSize:12,fontWeight:n.read?500:700,marginBottom:2 }}>{n.title}</div>
                      <div style={{ fontSize:11,color:'var(--text-secondary)',lineHeight:1.4,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{n.body}</div>
                      <div style={{ fontSize:10,color:'var(--text-secondary)',opacity:0.6,marginTop:3 }}>{new Date(n.createdAt||n.timestamp).toLocaleString('es-AR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</div>
                    </div>
                    {!n.read&&<div style={{ width:7,height:7,borderRadius:'50%',background:'var(--accent-magenta)',flexShrink:0,marginTop:4 }}/>}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Theme toggle */}
      <button onClick={onThemeToggle} style={{ width:38,height:38,borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(139,92,246,0.08)',border:'1px solid var(--border-violet)',color:'var(--text-secondary)',transition:'all 0.2s' }} onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--primary-violet)';e.currentTarget.style.color='var(--primary-violet-light)'}} onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--border-violet)';e.currentTarget.style.color='var(--text-secondary)'}}>
        {theme==='dark'?<Sun size={16}/>:<Moon size={16}/>}
      </button>

      {/* User Avatar + dropdown */}
      {currentUser && (
        <div style={{ position:'relative' }}>
          <button onClick={()=>{setAvatarOpen(p=>!p);setNotifOpen(false)}} style={{ width:38,height:38,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',background:currentUser.avatarColor||'var(--primary-violet)',border:'2px solid rgba(255,255,255,0.2)',color:'white',fontWeight:700,fontSize:13,cursor:'pointer',transition:'all 0.2s',boxShadow:avatarOpen?'0 0 0 3px rgba(139,92,246,0.5)':'none' }}>
            {currentUser.avatar||'?'}
          </button>
          {avatarOpen && (
            <>
              <div style={{ position:'fixed',inset:0,zIndex:200 }} onClick={()=>setAvatarOpen(false)}/>
              <div className="glass" style={{ position:'absolute',top:'calc(100% + 8px)',right:0,width:220,borderRadius:14,overflow:'hidden',zIndex:201,boxShadow:'var(--glow-violet),0 20px 40px rgba(0,0,0,0.5)',animation:'notifSlide 0.2s ease' }}>
                <div style={{ padding:'14px 16px',borderBottom:'1px solid var(--border-violet)' }}>
                  <div style={{ fontSize:13,fontWeight:700,color:'var(--text-primary)' }}>Hola, {displayName} 👋</div>
                  <div style={{ fontSize:11,color:'var(--text-secondary)',marginTop:2 }}>{currentUser.email}</div>
                  <div style={{ marginTop:6,display:'inline-flex',padding:'2px 8px',borderRadius:10,fontSize:10,fontWeight:700,background:`${({super_admin:'#F59E0B',admin:'#8B5CF6',editor:'#3B82F6',viewer:'#6B7280',custom:'#EC4899'}[currentUser.rol])||'#6B7280'}22`,color:({super_admin:'#F59E0B',admin:'#8B5CF6',editor:'#3B82F6',viewer:'#6B7280',custom:'#EC4899'}[currentUser.rol])||'#6B7280',textTransform:'uppercase',letterSpacing:0.5 }}>{roleLabel[currentUser.rol]||currentUser.rol}</div>
                </div>
                <div style={{ padding:'6px 8px' }}>
                  <button onClick={()=>{setAvatarOpen(false); onLogout()}} style={{ width:'100%',display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:8,color:'#F87171',fontSize:13,background:'transparent',border:'none',cursor:'pointer',transition:'all 0.15s',textAlign:'left' }}
                    onMouseEnter={e=>e.currentTarget.style.background='rgba(239,68,68,0.1)'}
                    onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                    <LogOut size={14}/> Cerrar sesión
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </header>
  )
}

// ═══════════════════════════════════════════════
// PHASE 1 BRAND COMPONENTS
// ═══════════════════════════════════════════════

const F = ({label,children,err:e}) => (
  <div>
    <label style={{fontSize:12,fontWeight:500,color:'var(--text-secondary)',display:'block',marginBottom:6}}>{label}</label>
    {children}
    {e && <span style={{fontSize:11,color:'#F87171'}}>{e}</span>}
  </div>
)

const BRAND_EMPTY = { name:'',logo:'🏢',category:'Deportes',description:'',status:'active',contactPerson:'',email:'',phone:'',website:'',contractType:'standard',startDate:'',endDate:'',locationsCount:0,benefitsCount:0,codesCount:0,createdBy:'Admin' }

const BrandModal = ({ brand, onSave, onClose }) => {
  const [form, setForm] = useState(brand||BRAND_EMPTY)
  const [errors, setErrors] = useState({})
  const set=(f,v)=>{setForm(p=>({...p,[f]:v}));setErrors(p=>{const n={...p};delete n[f];return n})}
  const validate=()=>{const e={};if(!form.name.trim())e.name='Nombre requerido';if(!form.contactPerson.trim())e.contactPerson='Contacto requerido';if(form.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))e.email='Email inválido';setErrors(e);return!Object.keys(e).length}
  const handleSave=()=>{if(!validate())return;onSave({...form,id:brand?.id||generateId(),createdAt:brand?.createdAt||new Date().toISOString()})}
  const cats=['Deportes','Fitness','Tecnología','Moda','Nutrición','Bienestar','Entretenimiento','Otro']
  const emojis=['🏢','👟','⚽','🐆','🏋️','💪','🎽','🏊','🚴','🧘','🎯','⚡','🌟','💎','🏆','🔥']
  // F is defined at module level
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',backdropFilter:'blur(8px)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:20}} onClick={onClose}>
      <div style={{width:'100%',maxWidth:620,background:'var(--bg-secondary)',border:'1px solid var(--border-violet)',borderRadius:20,maxHeight:'90vh',overflowY:'auto',boxShadow:'var(--glow-violet),0 40px 80px rgba(0,0,0,0.5)',animation:'fadeIn 0.3s ease'}} onClick={e=>e.stopPropagation()}>
        <div style={{padding:'24px 28px',borderBottom:'1px solid var(--border-violet)',display:'flex',alignItems:'center',gap:12}}>
          <div style={{width:40,height:40,borderRadius:12,background:'linear-gradient(135deg,var(--primary-violet),var(--accent-magenta))',display:'flex',alignItems:'center',justifyContent:'center'}}><Building2 size={18} color="white"/></div>
          <div><h2 style={{fontSize:16,fontWeight:700}}>{brand?'Editar Marca':'Nueva Marca'}</h2><p style={{fontSize:12,color:'var(--text-secondary)'}}>{brand?`Editando ${brand.name}`:'Completa los datos'}</p></div>
          <button onClick={onClose} style={{marginLeft:'auto',color:'var(--text-secondary)',padding:6,borderRadius:8}} onMouseEnter={e=>e.currentTarget.style.color='#F87171'} onMouseLeave={e=>e.currentTarget.style.color='var(--text-secondary)'}><X size={20}/></button>
        </div>
        <div style={{padding:'24px 28px',display:'flex',flexDirection:'column',gap:20}}>
          <div><label style={{fontSize:12,fontWeight:500,color:'var(--text-secondary)',display:'block',marginBottom:8}}>Logo / Emoji</label><div style={{display:'flex',gap:6,flexWrap:'wrap'}}>{emojis.map(e=>(<button key={e} onClick={()=>set('logo',e)} style={{width:40,height:40,borderRadius:10,fontSize:20,border:`2px solid ${form.logo===e?'var(--primary-violet)':'var(--border-violet)'}`,background:form.logo===e?'rgba(139,92,246,0.2)':'rgba(139,92,246,0.05)',transition:'all 0.15s',display:'flex',alignItems:'center',justifyContent:'center'}}>{e}</button>))}</div></div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
            <F label="Nombre *" err={errors.name}><input className="input-field" value={form.name} onChange={e=>set('name',e.target.value)} placeholder="Nike" style={errors.name?{borderColor:'#F87171'}:{}}/></F>
            <F label="Categoría"><select className="select-field" value={form.category} onChange={e=>set('category',e.target.value)}>{cats.map(c=><option key={c} value={c}>{c}</option>)}</select></F>
          </div>
          <F label="Descripción"><textarea className="input-field" value={form.description} onChange={e=>set('description',e.target.value)} placeholder="Descripción..." rows={3} style={{resize:'vertical'}}/></F>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
            <F label="Contacto *" err={errors.contactPerson}><input className="input-field" value={form.contactPerson} onChange={e=>set('contactPerson',e.target.value)} placeholder="Nombre Apellido" style={errors.contactPerson?{borderColor:'#F87171'}:{}}/></F>
            <F label="Email" err={errors.email}><input className="input-field" type="email" value={form.email} onChange={e=>set('email',e.target.value)} placeholder="contacto@marca.com" style={errors.email?{borderColor:'#F87171'}:{}}/></F>
            <F label="Teléfono"><input className="input-field" value={form.phone} onChange={e=>set('phone',e.target.value)} placeholder="+54 11 1234-5678"/></F>
            <F label="Website"><input className="input-field" value={form.website} onChange={e=>set('website',e.target.value)} placeholder="https://marca.com"/></F>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:14}}>
            <F label="Contrato"><select className="select-field" value={form.contractType} onChange={e=>set('contractType',e.target.value)}>{['basic','standard','premium'].map(c=><option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>)}</select></F>
            <F label="Inicio"><input className="input-field" type="date" value={form.startDate} onChange={e=>set('startDate',e.target.value)}/></F>
            <F label="Vencimiento"><input className="input-field" type="date" value={form.endDate} onChange={e=>set('endDate',e.target.value)}/></F>
          </div>
          <div><label style={{fontSize:12,fontWeight:500,color:'var(--text-secondary)',display:'block',marginBottom:6}}>Estado</label><div style={{display:'flex',gap:10}}>{['active','inactive'].map(s=>(<button key={s} onClick={()=>set('status',s)} style={{padding:'8px 20px',borderRadius:10,fontSize:13,fontWeight:500,border:`1px solid ${form.status===s?'var(--primary-violet)':'var(--border-violet)'}`,background:form.status===s?'rgba(139,92,246,0.2)':'rgba(139,92,246,0.05)',color:form.status===s?'var(--primary-violet-light)':'var(--text-secondary)',transition:'all 0.2s'}}>{s==='active'?'Activa':'Inactiva'}</button>))}</div></div>
        </div>
        <div style={{padding:'16px 28px',borderTop:'1px solid var(--border-violet)',display:'flex',gap:10,justifyContent:'flex-end'}}>
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSave}><Save size={14}/>{brand?'Guardar Cambios':'Crear Marca'}</button>
        </div>
      </div>
    </div>
  )
}

const BrandCard = ({ brand, locationCount, onEdit, onDelete }) => (
  <div className="card" style={{padding:20}}>
    <div style={{display:'flex',alignItems:'flex-start',gap:14,marginBottom:16}}>
      <div style={{width:52,height:52,borderRadius:14,flexShrink:0,background:'linear-gradient(135deg,rgba(139,92,246,0.25),rgba(232,121,249,0.2))',border:'1px solid var(--border-violet)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24}}>{brand.logo}</div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4,flexWrap:'wrap'}}>
          <h3 style={{fontSize:15,fontWeight:700}}>{brand.name}</h3>
          <span className={`badge badge-${brand.status}`}>{brand.status==='active'?'Activa':'Inactiva'}</span>
        </div>
        <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
          <span className={`badge badge-${brand.contractType}`}>{brand.contractType}</span>
          <span style={{fontSize:11,color:'var(--text-secondary)'}}>{brand.category}</span>
        </div>
      </div>
      <div style={{display:'flex',gap:4,flexShrink:0}}>
        <button onClick={onEdit} style={{width:30,height:30,borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',color:'var(--primary-violet-light)',border:'1px solid var(--border-violet)',background:'rgba(139,92,246,0.08)',transition:'all 0.2s'}} onMouseEnter={e=>e.currentTarget.style.background='rgba(139,92,246,0.2)'} onMouseLeave={e=>e.currentTarget.style.background='rgba(139,92,246,0.08)'}><Edit3 size={13}/></button>
        <button onClick={onDelete} style={{width:30,height:30,borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',color:'#F87171',border:'1px solid rgba(239,68,68,0.3)',background:'rgba(239,68,68,0.08)',transition:'all 0.2s'}} onMouseEnter={e=>e.currentTarget.style.background='rgba(239,68,68,0.2)'} onMouseLeave={e=>e.currentTarget.style.background='rgba(239,68,68,0.08)'}><Trash2 size={13}/></button>
      </div>
    </div>
    {brand.description&&<p style={{fontSize:12,color:'var(--text-secondary)',lineHeight:1.6,marginBottom:14,overflow:'hidden',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical'}}>{brand.description}</p>}
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:14}}>
      {[{label:'Locales',value:locationCount},{label:'Beneficios',value:brand.benefitsCount},{label:'Códigos',value:brand.codesCount}].map(s=>(
        <div key={s.label} style={{textAlign:'center',padding:'8px 4px',borderRadius:10,background:'rgba(139,92,246,0.07)',border:'1px solid rgba(139,92,246,0.1)'}}>
          <div style={{fontSize:16,fontWeight:700,color:'var(--primary-violet-light)'}}>{s.value}</div>
          <div style={{fontSize:10,color:'var(--text-secondary)'}}>{s.label}</div>
        </div>
      ))}
    </div>
    <div style={{display:'flex',flexDirection:'column',gap:6}}>
      {brand.contactPerson&&<div style={{display:'flex',alignItems:'center',gap:8,fontSize:12,color:'var(--text-secondary)'}}><User size={12} color="var(--primary-violet-light)"/>{brand.contactPerson}</div>}
      {brand.email&&<div style={{display:'flex',alignItems:'center',gap:8,fontSize:12,color:'var(--text-secondary)'}}><Mail size={12} color="var(--primary-violet-light)"/>{brand.email}</div>}
      {brand.endDate&&<div style={{display:'flex',alignItems:'center',gap:8,fontSize:12,color:'var(--text-secondary)'}}><Calendar size={12} color="var(--primary-violet-light)"/>Vence: {formatDate(brand.endDate)}</div>}
    </div>
  </div>
)

const ConfirmModal = ({ title, message, onConfirm, onClose }) => (
  <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',backdropFilter:'blur(8px)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:20}} onClick={onClose}>
    <div style={{width:'100%',maxWidth:400,background:'var(--bg-secondary)',border:'1px solid rgba(239,68,68,0.3)',borderRadius:16,padding:28,animation:'fadeIn 0.2s ease',boxShadow:'0 0 30px rgba(239,68,68,0.2)'}} onClick={e=>e.stopPropagation()}>
      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:16}}><div style={{width:40,height:40,borderRadius:12,background:'rgba(239,68,68,0.15)',display:'flex',alignItems:'center',justifyContent:'center'}}><AlertCircle size={20} color="#F87171"/></div><h3 style={{fontSize:15,fontWeight:700}}>{title}</h3></div>
      <p style={{fontSize:13,color:'var(--text-secondary)',lineHeight:1.6,marginBottom:24}}>{message}</p>
      <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
        <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
        <button className="btn btn-danger" onClick={onConfirm}><Trash2 size={13}/>Eliminar</button>
      </div>
    </div>
  </div>
)

const BrandsView = ({ brands, onSave, onDelete, locations }) => {
  const [search,setSearch]=useState('')
  const [fStatus,setFStatus]=useState('all')
  const [fCat,setFCat]=useState('all')
  const [modal,setModal]=useState(null)
  const [confirmDelete,setConfirmDelete]=useState(null)
  const cats=[...new Set(brands.map(b=>b.category))]
  const filtered=brands.filter(b=>{
    const ms=b.name.toLowerCase().includes(search.toLowerCase())||b.contactPerson.toLowerCase().includes(search.toLowerCase())
    return ms&&(fStatus==='all'||b.status===fStatus)&&(fCat==='all'||b.category===fCat)
  })
  return (
    <div style={{padding:24,animation:'fadeIn 0.3s ease'}}>
      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:20,flexWrap:'wrap'}}>
        <div><h2 style={{fontSize:20,fontWeight:700}}>Marcas</h2><p style={{fontSize:12,color:'var(--text-secondary)'}}>{brands.length} marcas · {brands.filter(b=>b.status==='active').length} activas</p></div>
        <div style={{flex:1}}/>
        <button className="btn btn-primary" onClick={()=>setModal('create')}><Plus size={16}/>Nueva Marca</button>
      </div>
      <div style={{display:'flex',gap:10,marginBottom:20,flexWrap:'wrap'}}>
        <div style={{position:'relative',flex:1,minWidth:200}}><Search size={14} style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'var(--text-secondary)'}}/><input className="input-field" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar marcas..." style={{paddingLeft:36}}/></div>
        <select className="select-field" style={{width:'auto',minWidth:130}} value={fStatus} onChange={e=>setFStatus(e.target.value)}><option value="all">Todos los estados</option><option value="active">Activas</option><option value="inactive">Inactivas</option></select>
        <select className="select-field" style={{width:'auto',minWidth:140}} value={fCat} onChange={e=>setFCat(e.target.value)}><option value="all">Todas las categorías</option>{cats.map(c=><option key={c} value={c}>{c}</option>)}</select>
      </div>
      {filtered.length===0?(
        <div className="empty-state"><div style={{width:64,height:64,borderRadius:20,background:'rgba(139,92,246,0.1)',display:'flex',alignItems:'center',justifyContent:'center'}}><Building2 size={28} color="var(--primary-violet)"/></div><h3 style={{fontSize:16,fontWeight:600}}>No hay marcas</h3><p style={{color:'var(--text-secondary)',fontSize:14}}>{search||fStatus!=='all'?'Sin resultados.':'Crea tu primera marca.'}</p></div>
      ):(
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:16}}>
          {filtered.map(brand=>(<BrandCard key={brand.id} brand={brand} locationCount={locations.filter(l=>l.brandId===brand.id).length} onEdit={()=>setModal(brand)} onDelete={()=>setConfirmDelete(brand)}/>))}
        </div>
      )}
      {modal&&<BrandModal brand={modal==='create'?null:modal} onSave={data=>{onSave(data);setModal(null)}} onClose={()=>setModal(null)}/>}
      {confirmDelete&&<ConfirmModal title="Eliminar Marca" message={`¿Confirmas eliminar "${confirmDelete.name}"?`} onConfirm={()=>{onDelete(confirmDelete.id);setConfirmDelete(null)}} onClose={()=>setConfirmDelete(null)}/>}
    </div>
  )
}

// ── Locations (Phase 1) ────────────────────────────

const LOCATION_EMPTY = { brandId:'',name:'',address:'',city:'',state:'',country:'Argentina',zipCode:'',phone:'',manager:'',hours:'',status:'active',codesAssigned:0,coordinates:{lat:0,lng:0},stats:{visits:0,conversions:0,revenue:0} }

const LocationModal = ({ location, brands, onSave, onClose }) => {
  const [form,setForm]=useState(location||LOCATION_EMPTY)
  const [errors,setErrors]=useState({})
  const set=(f,v)=>{setForm(p=>({...p,[f]:v}));setErrors(p=>{const n={...p};delete n[f];return n})}
  const validate=()=>{const e={};if(!form.brandId)e.brandId='Selecciona una marca';if(!form.name.trim())e.name='Nombre requerido';if(!form.address.trim())e.address='Dirección requerida';if(!form.city.trim())e.city='Ciudad requerida';setErrors(e);return!Object.keys(e).length}
  const handleSave=()=>{if(!validate())return;onSave({...form,id:location?.id||generateId(),createdAt:location?.createdAt||new Date().toISOString()})}
  // F is defined at module level
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',backdropFilter:'blur(8px)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:20}} onClick={onClose}>
      <div style={{width:'100%',maxWidth:620,background:'var(--bg-secondary)',border:'1px solid var(--border-violet)',borderRadius:20,maxHeight:'90vh',overflowY:'auto',boxShadow:'var(--glow-violet),0 40px 80px rgba(0,0,0,0.5)',animation:'fadeIn 0.3s ease'}} onClick={e=>e.stopPropagation()}>
        <div style={{padding:'24px 28px',borderBottom:'1px solid var(--border-violet)',display:'flex',alignItems:'center',gap:12}}>
          <div style={{width:40,height:40,borderRadius:12,background:'linear-gradient(135deg,var(--accent-magenta),var(--primary-violet))',display:'flex',alignItems:'center',justifyContent:'center'}}><MapPin size={18} color="white"/></div>
          <div><h2 style={{fontSize:16,fontWeight:700}}>{location?'Editar Local':'Nuevo Local'}</h2><p style={{fontSize:12,color:'var(--text-secondary)'}}>{location?location.name:'Completa los datos'}</p></div>
          <button onClick={onClose} style={{marginLeft:'auto',color:'var(--text-secondary)',padding:6,borderRadius:8}}><X size={20}/></button>
        </div>
        <div style={{padding:'24px 28px',display:'flex',flexDirection:'column',gap:18}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
            <F label="Marca *" err={errors.brandId}><select className="select-field" value={form.brandId} onChange={e=>set('brandId',e.target.value)} style={errors.brandId?{borderColor:'#F87171'}:{}}><option value="">Seleccionar...</option>{brands.map(b=><option key={b.id} value={b.id}>{b.logo} {b.name}</option>)}</select></F>
            <F label="Nombre *" err={errors.name}><input className="input-field" value={form.name} onChange={e=>set('name',e.target.value)} placeholder="Nike Palermo" style={errors.name?{borderColor:'#F87171'}:{}}/></F>
          </div>
          <F label="Dirección *" err={errors.address}><input className="input-field" value={form.address} onChange={e=>set('address',e.target.value)} placeholder="Av. Santa Fe 1234" style={errors.address?{borderColor:'#F87171'}:{}}/></F>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:14}}>
            <F label="Ciudad *" err={errors.city}><input className="input-field" value={form.city} onChange={e=>set('city',e.target.value)} placeholder="Buenos Aires" style={errors.city?{borderColor:'#F87171'}:{}}/></F>
            <F label="Provincia"><input className="input-field" value={form.state} onChange={e=>set('state',e.target.value)} placeholder="CABA"/></F>
            <F label="País"><input className="input-field" value={form.country} onChange={e=>set('country',e.target.value)} placeholder="Argentina"/></F>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
            <F label="Teléfono"><input className="input-field" value={form.phone} onChange={e=>set('phone',e.target.value)} placeholder="+54 11 1234-5678"/></F>
            <F label="Encargado"><input className="input-field" value={form.manager} onChange={e=>set('manager',e.target.value)} placeholder="Nombre Apellido"/></F>
          </div>
          <F label="Horarios"><input className="input-field" value={form.hours} onChange={e=>set('hours',e.target.value)} placeholder="Lun-Sáb 10-21 / Dom 12-20"/></F>
          <div><label style={{fontSize:12,fontWeight:500,color:'var(--text-secondary)',display:'block',marginBottom:6}}>Estado</label><div style={{display:'flex',gap:10}}>{['active','inactive'].map(s=>(<button key={s} onClick={()=>set('status',s)} style={{padding:'8px 20px',borderRadius:10,fontSize:13,fontWeight:500,border:`1px solid ${form.status===s?'var(--primary-violet)':'var(--border-violet)'}`,background:form.status===s?'rgba(139,92,246,0.2)':'rgba(139,92,246,0.05)',color:form.status===s?'var(--primary-violet-light)':'var(--text-secondary)',transition:'all 0.2s'}}>{s==='active'?'Activo':'Inactivo'}</button>))}</div></div>
        </div>
        <div style={{padding:'16px 28px',borderTop:'1px solid var(--border-violet)',display:'flex',gap:10,justifyContent:'flex-end'}}>
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSave}><Save size={14}/>{location?'Guardar Cambios':'Crear Local'}</button>
        </div>
      </div>
    </div>
  )
}

const LocationCard = ({ location, brand, onEdit, onDelete }) => (
  <div style={{background:'var(--glass-bg)',border:'1px solid var(--border-violet)',borderRadius:14,padding:'18px 20px',transition:'all 0.2s',display:'flex',gap:16,flexWrap:'wrap',alignItems:'flex-start'}} onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--primary-violet)';e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow='var(--glow-violet-sm)'}} onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--border-violet)';e.currentTarget.style.transform='none';e.currentTarget.style.boxShadow='none'}}>
    <div style={{flexShrink:0,display:'flex',flexDirection:'column',alignItems:'center',gap:6,minWidth:60}}>
      <div style={{width:48,height:48,borderRadius:14,background:'linear-gradient(135deg,rgba(139,92,246,0.25),rgba(232,121,249,0.2))',border:'1px solid var(--border-violet)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22}}>{brand?.logo||'🏢'}</div>
      <span style={{fontSize:10,color:'var(--text-secondary)',textAlign:'center',lineHeight:1.3}}>{brand?.name}</span>
    </div>
    <div style={{flex:1,minWidth:200}}>
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
        <h3 style={{fontSize:14,fontWeight:700}}>{location.name}</h3>
        <span className={`badge badge-${location.status}`}>{location.status==='active'?'Activo':'Inactivo'}</span>
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:4}}>
        {[{icon:MapPin,text:`${location.address}, ${location.city}`},{icon:User,text:location.manager,cond:location.manager},{icon:Phone,text:location.phone,cond:location.phone},{icon:Clock,text:location.hours,cond:location.hours}].map((r,i)=>r.cond!==undefined&&!r.cond?null:(
          <div key={i} style={{display:'flex',alignItems:'center',gap:8,fontSize:12,color:'var(--text-secondary)'}}><r.icon size={12} color="var(--primary-violet-light)"/>{r.text}</div>
        ))}
      </div>
    </div>
    <div className="hide-mobile" style={{display:'flex',gap:10,fontSize:12,color:'var(--text-secondary)'}}>
      {[{l:'Visitas',v:location.stats.visits.toLocaleString()},{l:'Conv.',v:location.stats.conversions},{l:'Revenue',v:`$${(location.stats.revenue/1000).toFixed(0)}K`}].map(s=>(<div key={s.l} style={{textAlign:'center',padding:'8px 12px',borderRadius:10,background:'rgba(139,92,246,0.07)',border:'1px solid rgba(139,92,246,0.1)'}}><div style={{fontSize:14,fontWeight:700,color:'var(--primary-violet-light)'}}>{s.v}</div><div style={{fontSize:10}}>{s.l}</div></div>))}
    </div>
    <div style={{display:'flex',gap:6,flexShrink:0}}>
      <button onClick={onEdit} style={{padding:'7px 14px',borderRadius:8,fontSize:12,color:'var(--primary-violet-light)',border:'1px solid var(--border-violet)',background:'rgba(139,92,246,0.08)',transition:'all 0.2s',display:'flex',alignItems:'center',gap:4}} onMouseEnter={e=>e.currentTarget.style.background='rgba(139,92,246,0.2)'} onMouseLeave={e=>e.currentTarget.style.background='rgba(139,92,246,0.08)'}><Edit3 size={12}/>Editar</button>
      <button onClick={onDelete} style={{padding:'7px 10px',borderRadius:8,color:'#F87171',border:'1px solid rgba(239,68,68,0.3)',background:'rgba(239,68,68,0.08)',transition:'all 0.2s'}} onMouseEnter={e=>e.currentTarget.style.background='rgba(239,68,68,0.2)'} onMouseLeave={e=>e.currentTarget.style.background='rgba(239,68,68,0.08)'}><Trash2 size={12}/></button>
    </div>
  </div>
)

const LocationsView = ({ locations, brands, onSave, onDelete }) => {
  const [search,setSearch]=useState('')
  const [fBrand,setFBrand]=useState('all')
  const [fStatus,setFStatus]=useState('all')
  const [modal,setModal]=useState(null)
  const [confirmDelete,setConfirmDelete]=useState(null)
  const filtered=locations.filter(l=>{
    const brand=brands.find(b=>b.id===l.brandId)
    const ms=l.name.toLowerCase().includes(search.toLowerCase())||l.city.toLowerCase().includes(search.toLowerCase())||(brand?.name||'').toLowerCase().includes(search.toLowerCase())
    return ms&&(fBrand==='all'||l.brandId===fBrand)&&(fStatus==='all'||l.status===fStatus)
  })
  return (
    <div style={{padding:24,animation:'fadeIn 0.3s ease'}}>
      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:20,flexWrap:'wrap'}}>
        <div><h2 style={{fontSize:20,fontWeight:700}}>Locales</h2><p style={{fontSize:12,color:'var(--text-secondary)'}}>{locations.length} locales · {locations.filter(l=>l.status==='active').length} activos</p></div>
        <div style={{flex:1}}/>
        <button className="btn btn-primary" onClick={()=>setModal('create')}><Plus size={16}/>Nuevo Local</button>
      </div>
      <div style={{display:'flex',gap:10,marginBottom:20,flexWrap:'wrap'}}>
        <div style={{position:'relative',flex:1,minWidth:200}}><Search size={14} style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'var(--text-secondary)'}}/><input className="input-field" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar locales..." style={{paddingLeft:36}}/></div>
        <select className="select-field" style={{width:'auto',minWidth:140}} value={fBrand} onChange={e=>setFBrand(e.target.value)}><option value="all">Todas las marcas</option>{brands.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select>
        <select className="select-field" style={{width:'auto',minWidth:130}} value={fStatus} onChange={e=>setFStatus(e.target.value)}><option value="all">Todos</option><option value="active">Activos</option><option value="inactive">Inactivos</option></select>
      </div>
      {filtered.length===0?(
        <div className="empty-state"><div style={{width:64,height:64,borderRadius:20,background:'rgba(139,92,246,0.1)',display:'flex',alignItems:'center',justifyContent:'center'}}><MapPin size={28} color="var(--primary-violet)"/></div><h3 style={{fontSize:16,fontWeight:600}}>No hay locales</h3></div>
      ):(
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          {filtered.map(l=>(<LocationCard key={l.id} location={l} brand={brands.find(b=>b.id===l.brandId)} onEdit={()=>setModal(l)} onDelete={()=>setConfirmDelete(l)}/>))}
        </div>
      )}
      {modal&&<LocationModal location={modal==='create'?null:modal} brands={brands} onSave={data=>{onSave(data);setModal(null)}} onClose={()=>setModal(null)}/>}
      {confirmDelete&&<ConfirmModal title="Eliminar Local" message={`¿Confirmas eliminar "${confirmDelete.name}"?`} onConfirm={()=>{onDelete(confirmDelete.id);setConfirmDelete(null)}} onClose={()=>setConfirmDelete(null)}/>}
    </div>
  )
}

// ═══════════════════════════════════════════════
// PLACEHOLDER
// ═══════════════════════════════════════════════

const PlaceholderView = ({ title, icon: Icon, description, phase }) => (
  <div style={{padding:24,animation:'fadeIn 0.3s ease'}}>
    <div className="empty-state" style={{minHeight:400}}>
      <div style={{width:80,height:80,borderRadius:24,background:'linear-gradient(135deg,rgba(139,92,246,0.2),rgba(232,121,249,0.15))',border:'1px solid var(--border-violet)',display:'flex',alignItems:'center',justifyContent:'center',animation:'pulse-glow 2s ease-in-out infinite'}}>
        <Icon size={36} color="var(--primary-violet)"/>
      </div>
      <h2 style={{fontSize:22,fontWeight:700}}>{title}</h2>
      <p style={{color:'var(--text-secondary)',fontSize:14,maxWidth:320}}>{description}</p>
      <div style={{padding:'8px 20px',background:'rgba(139,92,246,0.1)',border:'1px solid var(--border-violet)',borderRadius:20,fontSize:12,color:'var(--primary-violet-light)',fontWeight:500}}>Disponible en {phase}</div>
    </div>
  </div>
)

// ═══════════════════════════════════════════════
// MOBILE NAV DINÁMICO
// ═══════════════════════════════════════════════

const ECOSYSTEM_MAP = {
  rl_dashboard:'resilio', brands:'resilio', locations:'resilio',
  influencers:'resilio', benefits:'resilio', codes:'resilio',
  memberships:'resilio', users:'resilio', unregistered:'resilio',
  tracking:'resilio', analytics:'resilio', reports:'resilio',
  creative:'creative', creative_projects:'creative',
  creative_clients:'creative', creative_equipo:'creative',
  inf_dashboard:'infagency', inf_campaigns:'infagency',
  inf_crm:'infagency', inf_collabs:'infagency',
  prod_dashboard:'production', events:'production',
  tickets:'production', only_members:'production', rrpp:'production',
  elevare:'elevare', elevare_bienes:'elevare', elevare_leads:'elevare',
  elevare_contratos:'elevare', elevare_contenido:'elevare', elevare_hosp:'elevare',
  missions:'tools', team:'tools', advanced:'tools',
  cap_pipeline:'captacion', cap_busqueda:'captacion', cap_speeches:'captacion',
  cap_provincias:'captacion', cap_seguimiento:'captacion', cap_contactos:'captacion',
  hub:'hub', dashboard:'hub',
}

const NAV_CONFIGS = {
  resilio: [
    { id:'rl_dashboard', icon:'📊', label:'Dashboard' },
    { id:'brands',       icon:'🏪', label:'Marcas' },
    { id:'locations',    icon:'📍', label:'Locales' },
    { id:'influencers',  icon:'⭐', label:'Influencers' },
    { id:'benefits',     icon:'🎁', label:'Beneficios' },
  ],
  creative: [
    { id:'creative',          icon:'📊', label:'Dashboard' },
    { id:'creative_projects', icon:'🎨', label:'Proyectos' },
    { id:'creative_clients',  icon:'👥', label:'Clientes' },
    { id:'creative_equipo',   icon:'🌍', label:'Equipo' },
  ],
  infagency: [
    { id:'inf_dashboard', icon:'📊', label:'Dashboard' },
    { id:'inf_campaigns', icon:'📱', label:'Campañas' },
    { id:'inf_crm',       icon:'⭐', label:'Influencers' },
    { id:'inf_collabs',   icon:'🤝', label:'Colabs' },
  ],
  production: [
    { id:'prod_dashboard', icon:'📊', label:'Dashboard' },
    { id:'events',         icon:'🎉', label:'Eventos' },
    { id:'tickets',        icon:'🎟️', label:'Tickets' },
    { id:'rrpp',           icon:'👔', label:'RRPP' },
    { id:'only_members',   icon:'💎', label:'Members' },
  ],
  elevare: [
    { id:'elevare',           icon:'📊', label:'Dashboard' },
    { id:'elevare_bienes',    icon:'🏠', label:'Bienes' },
    { id:'elevare_leads',     icon:'👤', label:'Leads' },
    { id:'elevare_contratos', icon:'📄', label:'Contratos' },
    { id:'elevare_contenido', icon:'📸', label:'Contenido' },
  ],
  tools: [
    { id:'missions', icon:'🎯', label:'Misiones' },
    { id:'team',     icon:'👥', label:'Team' },
    { id:'advanced', icon:'⚙️', label:'Advanced' },
  ],
  captacion: [
    { id:'cap_pipeline',    icon:'📊', label:'Pipeline' },
    { id:'cap_busqueda',    icon:'🔍', label:'Búsqueda' },
    { id:'cap_speeches',    icon:'💬', label:'Speeches' },
    { id:'cap_provincias',  icon:'🌎', label:'Expansión' },
    { id:'cap_seguimiento', icon:'📞', label:'Seguimiento' },
  ],
  hub: [
    { id:'hub',       icon:'🏠', label:'Hub' },
    { id:'dashboard', icon:'📊', label:'Dashboard' },
    { id:'team',      icon:'⚙️', label:'Gestión' },
    { id:'__rocco__', icon:'🤖', label:'ROCCO' },
  ],
}

const MobileNav = ({ currentView, onNavigate, onRocco }) => {
  const ecosystem = ECOSYSTEM_MAP[currentView] || 'hub'
  const items = NAV_CONFIGS[ecosystem] || NAV_CONFIGS.hub
  return (
    <nav style={{
      position:'fixed', bottom:0, left:0, right:0,
      background:'rgba(10,6,24,0.92)',
      backdropFilter:'blur(40px)', WebkitBackdropFilter:'blur(40px)',
      borderTop:'1px solid rgba(139,92,246,0.2)',
      zIndex:200, display:'flex',
      padding:'8px 4px max(8px, env(safe-area-inset-bottom))',
      transition:'all 0.3s ease',
    }} className="show-mobile-only">
      {items.map(item => {
        const isActive = currentView === item.id
        const isRocco  = item.id === '__rocco__'
        return (
          <button key={item.id}
            onClick={() => isRocco ? onRocco?.() : onNavigate(item.id)}
            style={{
              flex:1, display:'flex', flexDirection:'column',
              alignItems:'center', gap:3, padding:'6px 2px',
              color: isActive ? 'var(--primary-violet-light)' : 'var(--text-secondary)',
              background: isActive ? 'rgba(139,92,246,0.12)' : 'transparent',
              borderRadius:10, transition:'all 0.2s', cursor:'pointer',
            }}>
            <span style={{ fontSize:18, lineHeight:1 }}>{item.icon}</span>
            <span style={{ fontSize:9, fontWeight:isActive?700:400, lineHeight:1.1, textAlign:'center' }}>{item.label}</span>
            {isActive && <div style={{ width:4, height:4, borderRadius:'50%', background:'var(--primary-violet)', boxShadow:'0 0 6px var(--primary-violet)' }}/>}
          </button>
        )
      })}
    </nav>
  )
}

// ═══════════════════════════════════════════════
// ROCCO IA ASSISTANT
// ═══════════════════════════════════════════════

const getRoccoResponse = (input) => {
  const q = input.toLowerCase()
  if (q.includes('hola') || q.includes('buenas')) return '¡Hola! Soy ROCCO 🤖, tu asistente de Resilio Life. ¿En qué puedo ayudarte hoy?'
  if (q.includes('código') || q.includes('codigos')) return '📊 Hoy se usaron 47 códigos. Nike lidera con 23 usos. El código FLOR20NIKE tuvo el mayor engagement.'
  if (q.includes('campaña') || q.includes('campañas')) return '📣 Tienes 3 campañas activas: Nike Spring Run, Adidas Boost y UA Training Week. La más cercana a completarse es UA Training Week al 100%.'
  if (q.includes('evento') || q.includes('eventos')) return '🎉 Próximos eventos: Resilio Members Night el 25/04, UA Elite Camp el 03/05, Nike Air Max Day Rosario el 15/05. Capacidad combinada: 2,130 personas.'
  if (q.includes('lead') || q.includes('leads')) return '👤 Elevare tiene 20 leads activos. 8 en estado "Propuesta", 4 en "Calificado". Prioridad: Martín Álvarez (Penthouse Puerto Madero).'
  if (q.includes('revenue') || q.includes('ingreso') || q.includes('ventas')) return '💰 Revenue este mes: $2.1M estimado. Influencers generaron $890K. Membresías activas: 34 usuarios.'
  if (q.includes('influencer')) return '⭐ 8 influencers activos. Top performer: Florencia Torres con 1.2M reach. Conversión promedio: 68%.'
  if (q.includes('miembro') || q.includes('team')) return '👥 Team Resilio: 12 miembros, 11 activos. 2 directores, 3 managers, 7 members. Último ingreso: Renata Salazar (10/04).'
  if (q.includes('elevare')) return '💎 Elevare tiene 15 assets activos. Portfolio valuado en ~USD 12M. 20 leads en seguimiento. 3 contratos firmados este mes.'
  if (q.includes('gracias') || q.includes('ok') || q.includes('perfecto')) return '¡De nada! Estoy aquí para lo que necesites. Puedes preguntarme sobre campañas, códigos, eventos, leads o cualquier métrica del sistema. 🚀'
  return `Entendido. Procesando tu consulta sobre "${input.slice(0,30)}..."... Actualmente en modo demo — las respuestas en producción usarán datos en tiempo real. ¿Hay algo más en lo que pueda ayudarte?`
}

const RoccoChat = ({ show, onClose }) => {
  const [messages, setMessages] = useState([
    { role: 'assistant', text: '¡Hola! Soy ROCCO 🤖, tu asistente de Resilio Life. Puedo consultarte métricas, campañas, eventos, leads y más. ¿En qué te ayudo?' }
  ])
  const [input, setInput] = useState('')
  const messagesEndRef = useRef(null)

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const send = () => {
    if (!input.trim()) return
    const userMsg = { role: 'user', text: input }
    const botMsg  = { role: 'assistant', text: getRoccoResponse(input) }
    setMessages(p => [...p, userMsg, botMsg])
    setInput('')
  }

  if (!show) return null

  return (
    <div style={{ position:'fixed',bottom:'6rem',right:'2rem',width:360,height:520,background:'rgba(15,10,30,0.95)',backdropFilter:'blur(40px)',border:'1px solid rgba(139,92,246,0.4)',borderRadius:20,display:'flex',flexDirection:'column',zIndex:999,boxShadow:'0 0 40px rgba(139,92,246,0.3),0 20px 60px rgba(0,0,0,0.6)',animation:'fadeIn 0.25s ease' }}>
      {/* Header */}
      <div style={{ padding:'14px 18px',borderBottom:'1px solid rgba(139,92,246,0.25)',display:'flex',alignItems:'center',gap:10 }}>
        <div style={{ width:36,height:36,borderRadius:'50%',background:'linear-gradient(135deg,#8B5CF6,#C084FC)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,boxShadow:'0 0 12px rgba(139,92,246,0.5)' }}>🤖</div>
        <div>
          <div style={{ fontSize:14,fontWeight:700,color:'#F9FAFB' }}>ROCCO IA</div>
          <div style={{ fontSize:10,color:'#A78BFA' }}>Asistente Resilio · Demo</div>
        </div>
        <button onClick={onClose} style={{ marginLeft:'auto',width:28,height:28,borderRadius:8,background:'rgba(139,92,246,0.1)',border:'1px solid rgba(139,92,246,0.2)',color:'#9CA3AF',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',transition:'all 0.2s' }} onMouseEnter={e=>e.currentTarget.style.color='#F87171'} onMouseLeave={e=>e.currentTarget.style.color='#9CA3AF'}><X size={14}/></button>
      </div>
      {/* Messages */}
      <div style={{ flex:1,overflowY:'auto',padding:'12px 16px',display:'flex',flexDirection:'column',gap:10 }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display:'flex',justifyContent:msg.role==='user'?'flex-end':'flex-start' }}>
            <div style={{ maxWidth:'82%',padding:'9px 13px',borderRadius:msg.role==='user'?'14px 14px 4px 14px':'14px 14px 14px 4px',background:msg.role==='user'?'linear-gradient(135deg,#7C3AED,#8B5CF6)':'rgba(139,92,246,0.12)',border:msg.role==='user'?'none':'1px solid rgba(139,92,246,0.2)',fontSize:12,lineHeight:1.6,color:msg.role==='user'?'white':'#F9FAFB' }}>{msg.text}</div>
          </div>
        ))}
        <div ref={messagesEndRef}/>
      </div>
      {/* Input */}
      <div style={{ padding:'10px 14px',borderTop:'1px solid rgba(139,92,246,0.2)',display:'flex',gap:8 }}>
        <input
          value={input}
          onChange={e=>setInput(e.target.value)}
          onKeyDown={e=>e.key==='Enter'&&send()}
          placeholder="Pregunta algo..."
          style={{ flex:1,background:'rgba(139,92,246,0.08)',border:'1px solid rgba(139,92,246,0.25)',borderRadius:10,padding:'8px 12px',color:'#F9FAFB',fontSize:12,outline:'none' }}
        />
        <button onClick={send} style={{ width:36,height:36,borderRadius:10,background:'linear-gradient(135deg,#7C3AED,#8B5CF6)',border:'none',color:'white',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',flexShrink:0,boxShadow:'0 0 10px rgba(139,92,246,0.4)',transition:'all 0.2s' }} onMouseEnter={e=>e.currentTarget.style.transform='scale(1.05)'} onMouseLeave={e=>e.currentTarget.style.transform='none'}>→</button>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════
// APP ROOT
// ═══════════════════════════════════════════════

export default function App() {
  // ── Auth state ──────────────────────────────────
  const [currentUser,  setCurrentUser]  = useState(() => getSession())
  const [showAdmin,    setShowAdmin]    = useState(false)
  const [adminNotifs,  setAdminNotifs]  = useState(() => getAdminNotifs())

  const handleLogin = (user) => {
    setCurrentUser(user)
    setShowPortal(true)
    setCurrentView('hub')
  }

  const handleLogout = () => {
    if (currentUser) logActivity({ userId:currentUser.id, userName:currentUser.nombre, accion:'logout', detalle:'Cerró sesión', seccion:'sistema' })
    clearSession()
    setCurrentUser(null)
    setShowPortal(true)
  }

  const refreshAdminNotifs = () => setAdminNotifs(getAdminNotifs())

  // ── CRM state ────────────────────────────────────
  const [theme,            setTheme]           = useLocalStorage('crm_theme', 'dark')
  const [currentView,      setCurrentView]      = useLocalStorage('crm_view', 'dashboard')
  const [sidebarCollapsed, setSidebarCollapsed] = useLocalStorage('crm_sidebar', false)
  const [brands,      setBrands]      = useState(DEMO_BRANDS)
  const [locations,   setLocations]   = useState(DEMO_LOCATIONS)
  const [influencers, setInfluencers] = useState(DEMO_INFLUENCERS)
  const [benefits,    setBenefits]    = useLocalStorage('crm_benefits',    DEMO_BENEFITS)
  const [codes,       setCodes]       = useLocalStorage('crm_codes',       DEMO_CODES)
  const [codeUsages,  setCodeUsages]  = useLocalStorage('crm_usages',      DEMO_CODE_USAGES)
  const [memberships, setMemberships] = useLocalStorage('crm_memberships', DEMO_MEMBERSHIPS)
  const [users,       setUsers]       = useLocalStorage('crm_users',       DEMO_USERS)
  // Phase 3 state
  const [creativeProjects, setCreativeProjects] = useLocalStorage('crm_cr_projects',  DEMO_CREATIVE_PROJECTS)
  const [creativeClients,  setCreativeClients]  = useLocalStorage('crm_cr_clients',   DEMO_CREATIVE_CLIENTS)
  const [infCampaigns,     setInfCampaigns]     = useLocalStorage('crm_inf_camps_v2', DEMO_INF_CAMPAIGNS)
  const [collaborations,   setCollaborations]   = useLocalStorage('crm_collabs',      DEMO_COLLABORATIONS)
  const [events,           setEvents]           = useLocalStorage('crm_events',       DEMO_EVENTS)
  const [sponsors,         setSponsors]         = useLocalStorage('crm_sponsors',     DEMO_SPONSORS)
  const [tickets,          setTickets]          = useLocalStorage('crm_tickets',      DEMO_TICKETS)
  // Phase 4 state
  const [elevareAssets,    setElevareAssets]    = useLocalStorage('crm_elv_assets',   DEMO_ELEVARE_ASSETS)
  const [elevareLeads,     setElevareLeads]     = useLocalStorage('crm_elv_leads',    DEMO_ELEVARE_LEADS)
  const [elevareContracts, setElevareContracts] = useLocalStorage('crm_elv_contracts',DEMO_ELEVARE_CONTRACTS)
  const [teamMembers,      setTeamMembers]      = useLocalStorage('crm_team',         DEMO_TEAM_MEMBERS)

  // Phase 5 state
  const [missions,       setMissions]       = useLocalStorage('crm_missions_v1',     DEMO_MISSIONS)
  const [notifications,  setNotifications]  = useLocalStorage('crm_notifs_v1',       DEMO_NOTIFICATIONS)
  const [portalSeen,     setPortalSeen]     = useLocalStorage('crm_portal_seen', false)
  const [showPortal,     setShowPortal]     = useState(() => Boolean(getSession()))

  const [cmdOpen,      setCmdOpen]      = useState(false)
  const [mobileMenu,   setMobileMenu]   = useState(false)
  const [windowWidth,  setWindowWidth]  = useState(window.innerWidth)
  const [showRocco,    setShowRocco]    = useState(false)

  useEffect(() => { const h=()=>setWindowWidth(window.innerWidth); window.addEventListener('resize',h); return()=>window.removeEventListener('resize',h) }, [])
  useEffect(() => { document.documentElement.setAttribute('data-theme',theme) }, [theme])
  useEffect(() => {
    const h=(e)=>{ if((e.metaKey||e.ctrlKey)&&e.key==='k'){e.preventDefault();setCmdOpen(p=>!p)} }
    window.addEventListener('keydown',h); return()=>window.removeEventListener('keydown',h)
  }, [])

  // Load shared CRM data from Supabase (fallback to demo data if empty)
  useEffect(() => {
    dbGetBrands().then(data => { if (data.length > 0) setBrands(data) }).catch(() => {})
    dbGetLocations().then(data => { if (data.length > 0) setLocations(data) }).catch(() => {})
    dbGetInfluencers().then(data => { if (data.length > 0) setInfluencers(data) }).catch(() => {})
  }, [])

  const isMobile = windowWidth < 640
  const isTablet = windowWidth >= 640 && windowWidth < 1024
  const effectiveCollapsed = isTablet ? true : sidebarCollapsed

  // ── CRUD Handlers ─────────────────────────────
  const upsert = (setter) => (item) => setter(prev => prev.find(x=>x.id===item.id) ? prev.map(x=>x.id===item.id?item:x) : [...prev,item])

  // Brands — Supabase + local state
  const handleSaveBrand = useCallback((brand) => {
    setBrands(prev => prev.find(x=>x.id===brand.id) ? prev.map(x=>x.id===brand.id?brand:x) : [...prev,brand])
    dbSaveBrand(brand).catch(e => console.warn('saveBrand error:', e))
  }, [])
  const handleDeleteBrand = useCallback((id) => {
    setBrands(p=>p.filter(x=>x.id!==id))
    setLocations(p=>p.filter(x=>x.brandId!==id))
    dbDeleteBrand(id).catch(e => console.warn('deleteBrand error:', e))
  }, [])

  // Locations — Supabase + local state
  const handleSaveLocation = useCallback((loc) => {
    setLocations(prev => prev.find(x=>x.id===loc.id) ? prev.map(x=>x.id===loc.id?loc:x) : [...prev,loc])
    dbSaveLocation(loc).catch(e => console.warn('saveLocation error:', e))
  }, [])
  const handleDeleteLocation = useCallback((id) => {
    setLocations(p=>p.filter(x=>x.id!==id))
    dbDeleteLocation(id).catch(e => console.warn('deleteLocation error:', e))
  }, [])

  // Influencers — Supabase + local state
  const handleSaveInfluencer = useCallback((inf) => {
    setInfluencers(prev => prev.find(x=>x.id===inf.id) ? prev.map(x=>x.id===inf.id?inf:x) : [...prev,inf])
    dbSaveInfluencer(inf).catch(e => console.warn('saveInfluencer error:', e))
  }, [])
  const handleDeleteInfluencer = useCallback((id) => {
    setInfluencers(p=>p.filter(x=>x.id!==id))
    dbDeleteInfluencer(id).catch(e => console.warn('deleteInfluencer error:', e))
  }, [])

  const handleSaveBenefit  =useCallback(upsert(setBenefits),[setBenefits])
  const handleDeleteBenefit=useCallback((id)=>setBenefits(p=>p.filter(x=>x.id!==id)),[setBenefits])

  const handleSaveCode     =useCallback(upsert(setCodes),[setCodes])
  const handleDeleteCode   =useCallback((id)=>setCodes(p=>p.filter(x=>x.id!==id)),[setCodes])
  const handleBulkGenerate =useCallback((newCodes)=>setCodes(p=>[...p,...newCodes]),[setCodes])

  // Phase 3 CRUD
  const handleSaveCreativeProject  = useCallback(upsert(setCreativeProjects), [setCreativeProjects])
  const handleDeleteCreativeProject= useCallback((id)=>setCreativeProjects(p=>p.filter(x=>x.id!==id)),[setCreativeProjects])
  const handleSaveCreativeClient   = useCallback(upsert(setCreativeClients),  [setCreativeClients])
  const handleDeleteCreativeClient = useCallback((id)=>setCreativeClients(p=>p.filter(x=>x.id!==id)),[setCreativeClients])
  const handleSaveInfCampaign      = useCallback(upsert(setInfCampaigns),     [setInfCampaigns])
  const handleDeleteInfCampaign    = useCallback((id)=>setInfCampaigns(p=>p.filter(x=>x.id!==id)),[setInfCampaigns])
  const handleSaveEvent            = useCallback(upsert(setEvents),           [setEvents])
  const handleDeleteEvent          = useCallback((id)=>setEvents(p=>p.filter(x=>x.id!==id)),[setEvents])
  // Phase 4 CRUD
  const handleSaveElevareAsset     = useCallback(upsert(setElevareAssets),    [setElevareAssets])
  const handleDeleteElevareAsset   = useCallback((id)=>setElevareAssets(p=>p.filter(x=>x.id!==id)),[setElevareAssets])
  const handleSaveElevareLead      = useCallback(upsert(setElevareLeads),     [setElevareLeads])
  const handleDeleteElevareLead    = useCallback((id)=>setElevareLeads(p=>p.filter(x=>x.id!==id)),[setElevareLeads])
  const handleSaveTeamMember       = useCallback(upsert(setTeamMembers),      [setTeamMembers])
  const handleDeleteTeamMember     = useCallback((id)=>setTeamMembers(p=>p.filter(x=>x.id!==id)),[setTeamMembers])

  // Phase 5 CRUD
  const handleSaveMission   = useCallback(upsert(setMissions),  [setMissions])
  const handleDeleteMission = useCallback((id)=>setMissions(p=>p.filter(x=>x.id!==id)), [setMissions])
  const handleMarkRead      = useCallback((id)=>setNotifications(p=>p.map(n=>n.id===id?{...n,read:true}:n)), [setNotifications])
  const handleMarkAllRead   = useCallback(()=>setNotifications(p=>p.map(n=>({...n,read:true}))), [setNotifications])

  const navigate = useCallback((v) => {
    setCurrentView(v)
    setMobileMenu(false)
    if (currentUser) {
      logActivity({ userId:currentUser.id, userName:currentUser.nombre, accion:'cambiar_seccion', detalle:`Navegó a ${v}`, seccion:v })
    }
  }, [setCurrentView, currentUser])

  const renderView = () => {
    switch (currentView) {
      case 'hub':
        return <HubView onNavigate={navigate}/>
      case 'dashboard':
        return <DashboardView brands={brands} locations={locations} influencers={influencers} benefits={benefits} codes={codes} codeUsages={codeUsages} memberships={memberships} users={users} infCampaigns={infCampaigns} events={events}/>
      case 'rl_dashboard':
        return <DashboardView brands={brands} locations={locations} influencers={influencers} benefits={benefits} codes={codes} codeUsages={codeUsages} memberships={memberships} users={users} infCampaigns={infCampaigns} events={events}/>
      case 'brands':
        return <BrandsView brands={brands} locations={locations} onSave={handleSaveBrand} onDelete={handleDeleteBrand}/>
      case 'locations':
        return <LocationsView locations={locations} brands={brands} onSave={handleSaveLocation} onDelete={handleDeleteLocation}/>
      case 'influencers':
        return <InfluencersView influencers={influencers} onSave={handleSaveInfluencer} onDelete={handleDeleteInfluencer}/>
      case 'benefits':
        return <BenefitsView benefits={benefits} brands={brands} locations={locations} onSave={handleSaveBenefit} onDelete={handleDeleteBenefit}/>
      case 'codes':
        return <CodesView codes={codes} brands={brands} locations={locations} benefits={benefits} influencers={influencers} onSave={handleSaveCode} onDelete={handleDeleteCode} onBulkGenerate={handleBulkGenerate}/>
      case 'memberships':
        return <MembershipsView memberships={memberships} users={users} influencers={influencers}/>
      case 'users':
        return <UsersView users={users} influencers={influencers} memberships={memberships}/>
      case 'unregistered':
        return <UsersView users={users.filter(u=>!memberships.find(m=>m.userId===u.id))} influencers={influencers} memberships={memberships} unregisteredMode/>
      case 'tracking':
        return <TrackingView codeUsages={codeUsages} codes={codes} brands={brands} locations={locations} influencers={influencers} users={users}/>
      case 'analytics':
        return <AnalyticsView codeUsages={codeUsages} codes={codes} brands={brands} locations={locations} influencers={influencers} users={users} memberships={memberships}/>
      case 'reports':
        return <ReportsView codeUsages={codeUsages} codes={codes} brands={brands} locations={locations} influencers={influencers} users={users}/>
      case 'creative':
      case 'creative_projects':
        return <CreativeAgencyView key="kanban" projects={creativeProjects} clients={creativeClients} onSaveProject={handleSaveCreativeProject} onDeleteProject={handleDeleteCreativeProject} onSaveClient={handleSaveCreativeClient} onDeleteClient={handleDeleteCreativeClient}/>
      case 'creative_clients':
        return <CreativeAgencyView key="clients" projects={creativeProjects} clients={creativeClients} onSaveProject={handleSaveCreativeProject} onDeleteProject={handleDeleteCreativeProject} onSaveClient={handleSaveCreativeClient} onDeleteClient={handleDeleteCreativeClient} defaultTab="clients"/>
      case 'creative_equipo':
        return <CreativeAgencyView key="equipo" projects={creativeProjects} clients={creativeClients} onSaveProject={handleSaveCreativeProject} onDeleteProject={handleDeleteCreativeProject} onSaveClient={handleSaveCreativeClient} onDeleteClient={handleDeleteCreativeClient} defaultTab="equipo"/>
      case 'inf_dashboard':
        return <InfluencerAgencyView key="dashboard" campaigns={infCampaigns} collaborations={collaborations} influencers={influencers} brands={brands} onSaveCampaign={handleSaveInfCampaign} onDeleteCampaign={handleDeleteInfCampaign} onSaveInfluencer={handleSaveInfluencer} onDeleteInfluencer={handleDeleteInfluencer} defaultTab="dashboard"/>
      case 'inf_campaigns':
        return <InfluencerAgencyView key="campaigns" campaigns={infCampaigns} collaborations={collaborations} influencers={influencers} brands={brands} onSaveCampaign={handleSaveInfCampaign} onDeleteCampaign={handleDeleteInfCampaign} onSaveInfluencer={handleSaveInfluencer} onDeleteInfluencer={handleDeleteInfluencer} defaultTab="campaigns"/>
      case 'inf_crm':
        return <InfluencerAgencyView key="crm" campaigns={infCampaigns} collaborations={collaborations} influencers={influencers} brands={brands} onSaveCampaign={handleSaveInfCampaign} onDeleteCampaign={handleDeleteInfCampaign} onSaveInfluencer={handleSaveInfluencer} onDeleteInfluencer={handleDeleteInfluencer} defaultTab="crm"/>
      case 'inf_collabs':
        return <InfluencerAgencyView key="collabs" campaigns={infCampaigns} collaborations={collaborations} influencers={influencers} brands={brands} onSaveCampaign={handleSaveInfCampaign} onDeleteCampaign={handleDeleteInfCampaign} onSaveInfluencer={handleSaveInfluencer} onDeleteInfluencer={handleDeleteInfluencer} defaultTab="collabs"/>
      case 'prod_dashboard':
      case 'events':
        return <EventsView events={events} sponsors={sponsors} tickets={tickets} onSaveEvent={handleSaveEvent} onDeleteEvent={handleDeleteEvent}/>
      case 'tickets':
        return <TicketsView events={events} tickets={tickets} onSave={handleSaveEvent}/>
      case 'only_members':
        return <OnlyMembersView events={events}/>
      case 'rrpp':
        return <RRPPView/>
      case 'elevare':
        return <ElevareView assets={elevareAssets} leads={elevareLeads} contracts={elevareContracts} onSaveAsset={handleSaveElevareAsset} onDeleteAsset={handleDeleteElevareAsset} onSaveLead={handleSaveElevareLead} onDeleteLead={handleDeleteElevareLead}/>
      case 'elevare_bienes':
        return <ElevareView assets={elevareAssets} leads={elevareLeads} contracts={elevareContracts} onSaveAsset={handleSaveElevareAsset} onDeleteAsset={handleDeleteElevareAsset} onSaveLead={handleSaveElevareLead} onDeleteLead={handleDeleteElevareLead} defaultTab="bienes"/>
      case 'elevare_leads':
        return <ElevareView assets={elevareAssets} leads={elevareLeads} contracts={elevareContracts} onSaveAsset={handleSaveElevareAsset} onDeleteAsset={handleDeleteElevareAsset} onSaveLead={handleSaveElevareLead} onDeleteLead={handleDeleteElevareLead} defaultTab="leads"/>
      case 'elevare_contratos':
        return <ElevareView assets={elevareAssets} leads={elevareLeads} contracts={elevareContracts} onSaveAsset={handleSaveElevareAsset} onDeleteAsset={handleDeleteElevareAsset} onSaveLead={handleSaveElevareLead} onDeleteLead={handleDeleteElevareLead} defaultTab="contracts"/>
      case 'elevare_contenido':
        return <ElevareView assets={elevareAssets} leads={elevareLeads} contracts={elevareContracts} onSaveAsset={handleSaveElevareAsset} onDeleteAsset={handleDeleteElevareAsset} onSaveLead={handleSaveElevareLead} onDeleteLead={handleDeleteElevareLead} defaultTab="contenido"/>
      case 'elevare_hosp':
        return <ElevareView assets={elevareAssets} leads={elevareLeads} contracts={elevareContracts} onSaveAsset={handleSaveElevareAsset} onDeleteAsset={handleDeleteElevareAsset} onSaveLead={handleSaveElevareLead} onDeleteLead={handleDeleteElevareLead} defaultTab="hospitality"/>
      case 'cap_pipeline':
        return <CaptacionView defaultTab="pipeline"/>
      case 'cap_busqueda':
        return <CaptacionView defaultTab="busqueda"/>
      case 'cap_speeches':
        return <CaptacionView defaultTab="speeches"/>
      case 'cap_provincias':
        return <CaptacionView defaultTab="expansion"/>
      case 'cap_seguimiento':
        return <CaptacionView defaultTab="seguimiento"/>
      case 'cap_contactos':
        return <CaptacionView defaultTab="contactos"/>
      case 'missions':
        return <MissionsView missions={missions} influencers={influencers} onSave={handleSaveMission} onDelete={handleDeleteMission}/>
      case 'team':
        return <TeamView members={teamMembers} onSave={handleSaveTeamMember} onDelete={handleDeleteTeamMember}/>
      case 'advanced':
        return <AdvancedView/>
      default:
        return <DashboardView brands={brands} locations={locations} influencers={influencers} benefits={benefits} codes={codes} codeUsages={codeUsages} memberships={memberships} users={users} infCampaigns={infCampaigns} events={events}/>
    }
  }

  const portalVariant = (() => {
    try {
      const path = window.location.pathname
      const param = new URLSearchParams(window.location.search).get('portal')
      if (param) return param
      if (path.includes('/missions')) return 'influencers'
      if (path.includes('/creators')) return 'creators'
      return 'default'
    } catch { return 'default' }
  })()

  // ── Auth gate ──────────────────────────────────
  if (!currentUser) {
    return (
      <>
        <GlobalStyles/>
        <LoginScreen onLogin={handleLogin}/>
      </>
    )
  }

  if (showPortal) {
    return (
      <>
        <GlobalStyles/>
        <VideoPortal
          onEnter={() => { setShowPortal(false); setCurrentView('hub') }}
          userName={currentUser?.sobrenombre || currentUser?.nombre || 'Usuario'}
        />
      </>
    )
  }

  return (
    <>
      <GlobalStyles/>
      <div style={{
        display:'flex',minHeight:'100vh',
        background:`var(--nebula-1), var(--nebula-2), var(--nebula-3), var(--bg-primary)`
      }}>
        {/* Desktop sidebar — oculto en Hub */}
        {!isMobile && currentView !== 'hub' && (
          <Sidebar currentView={currentView} onNavigate={navigate} collapsed={effectiveCollapsed} onToggle={()=>setSidebarCollapsed(p=>!p)} currentUser={currentUser}/>
        )}

        {/* Mobile sidebar overlay */}
        {isMobile && mobileMenu && currentView !== 'hub' && (
          <>
            <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',backdropFilter:'blur(4px)',zIndex:199}} onClick={()=>setMobileMenu(false)}/>
            <div style={{position:'fixed',top:0,left:0,height:'100vh',zIndex:200}}>
              <Sidebar currentView={currentView} onNavigate={navigate} collapsed={false} onToggle={()=>setMobileMenu(false)} currentUser={currentUser}/>
            </div>
          </>
        )}

        {/* Main */}
        <div style={{flex:1,display:'flex',flexDirection:'column',minWidth:0}}>
          <Header
            currentView={currentView} theme={theme}
            onThemeToggle={()=>setTheme(t=>t==='dark'?'light':'dark')}
            onCommandPalette={()=>setCmdOpen(true)}
            onMobileMenu={()=>setMobileMenu(true)}
            onHub={()=>navigate('hub')}
            notifications={notifications}
            onMarkRead={handleMarkRead}
            onMarkAllRead={handleMarkAllRead}
            currentUser={currentUser}
            onLogout={handleLogout}
            onAdmin={() => setShowAdmin(true)}
            adminNotifCount={adminNotifs.filter(n=>!n.read).length}
          />
          <main style={{flex:1,overflowY:'auto'}}>{renderView()}</main>
        </div>

        {isMobile && <MobileNav currentView={currentView} onNavigate={navigate} onRocco={()=>setShowRocco(p=>!p)}/>}
      </div>

      <CommandPalette isOpen={cmdOpen} onClose={()=>setCmdOpen(false)} onNavigate={navigate}/>

      {/* ROCCO floating button */}
      <button
        onClick={()=>setShowRocco(p=>!p)}
        title="ROCCO IA Assistant"
        style={{
          position:'fixed', bottom: isMobile ? '88px' : '2rem', right:'2rem',
          width:56, height:56, borderRadius:'50%',
          background: showRocco
            ? 'linear-gradient(135deg,#6D28D9,#7C3AED)'
            : 'linear-gradient(135deg,#8B5CF6,#C084FC)',
          border:'2px solid rgba(139,92,246,0.4)',
          boxShadow: showRocco ? '0 0 30px rgba(139,92,246,0.7)' : '0 0 20px rgba(139,92,246,0.5)',
          cursor:'pointer', zIndex:998,
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:22, transition:'all 0.25s',
          transform: showRocco ? 'scale(0.95)' : 'scale(1)'
        }}
        onMouseEnter={e=>{ if(!showRocco){ e.currentTarget.style.transform='scale(1.1)'; e.currentTarget.style.boxShadow='0 0 30px rgba(139,92,246,0.7)' } }}
        onMouseLeave={e=>{ if(!showRocco){ e.currentTarget.style.transform='scale(1)'; e.currentTarget.style.boxShadow='0 0 20px rgba(139,92,246,0.5)' } }}
      >
        {showRocco ? <X size={22} color="white"/> : '🤖'}
      </button>

      {/* ROCCO chat panel */}
      <RoccoChat show={showRocco} onClose={()=>setShowRocco(false)}/>

      {/* Admin Panel overlay */}
      {showAdmin && (
        <AdminPanel
          currentUser={currentUser}
          onClose={() => { setShowAdmin(false); setAdminNotifs(getAdminNotifs()) }}
        />
      )}
    </>
  )
}
