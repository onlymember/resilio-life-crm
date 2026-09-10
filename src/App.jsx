import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  LayoutDashboard, Building2, MapPin, Users, Gift, QrCode,
  BarChart3, ChevronDown, ChevronRight, Search,
  Bell, Sun, Moon, Menu, X, Plus, Edit3, Trash2,
  Phone, Mail, Globe, Calendar, Tag, CheckCircle,
  Clock, Star, TrendingUp,
  User, Shield, Layers,
  AlertCircle, ChevronLeft, Save, Award,
  Building, CreditCard, Activity, Palette, FileText, Ticket,
  Target, Radio, Crown, Megaphone, PhoneCall, Home, Map,
  Settings, LogOut,
  Briefcase, CheckSquare, BookOpen, ArrowRight,
} from 'lucide-react'

import LoginScreen from './components/Auth/LoginScreen.jsx'
import AdminPanel  from './components/Admin/AdminPanel.jsx'
import { supabase } from './lib/supabase.js'
import {
  signOut, isAdmin,
  canAccessView, defaultViewFor, hasAnyAccess,
  getAdminNotifs, markNotifRead, markAllNotifsRead,
} from './lib/auth.js'
import {
  dbListAllBrands, dbSaveBrand, dbDeleteBrand,
  dbGetLocations, dbSaveLocation, dbDeleteLocation,
  dbListAllInfluencers, dbSaveInfluencer, dbDeleteInfluencer,
  dbGetCurrentUser,
  fetchUserById,
  dbGetCampaigns, dbSaveCampaign, dbDeleteCampaign,
  dbGetCampaignInfluencers, dbAddInfluencerToCampaign,
  dbUpdateCampaignInfluencer, dbRemoveInfluencerFromCampaign,
  dbGetCollaborations, dbSaveCollaboration, dbDeleteCollaboration,
  dbGetActivationTypes,
  dbGetMissions,
} from './lib/database.js'

import {
  DEMO_BENEFITS,
  DEMO_CODES, DEMO_CODE_USAGES, DEMO_MEMBERSHIPS, DEMO_USERS,
  DEMO_CREATIVE_CLIENTS, DEMO_CREATIVE_PROJECTS,
  DEMO_EVENTS, DEMO_SPONSORS, DEMO_TICKETS,
  DEMO_ELEVARE_ASSETS, DEMO_ELEVARE_LEADS, DEMO_ELEVARE_CONTRACTS,
  DEMO_TEAM_MEMBERS,
  DEMO_NOTIFICATIONS
} from './data/demo.js'

import VideoPortal from './components/VideoPortal/VideoPortal.jsx'
import NetworkApp   from './network/NetworkApp.jsx'
import { COMMAND_ROLES } from './network/routes.js'

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

const ResilioIcon = ({ size = 17 }) => (
  <img
    src="/logoresilio.png"
    alt="Resilio"
    style={{ width: size, height: size, objectFit: 'contain', filter: 'brightness(0) invert(1)', flexShrink: 0 }}
  />
)

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
    @keyframes hubNodeIn { 0%{opacity:0;transform:scale(0.15);} 70%{opacity:1;transform:scale(1.08);} 100%{opacity:1;transform:scale(1);} }
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

const CommandPalette = ({ isOpen, onClose, onNavigate, currentUser }) => {
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
    { id: 'advanced',        label: 'Features Avanzadas',   icon: ResilioIcon,     action: () => onNavigate('advanced')        },
    { id: 'cap_pipeline',    label: '📞 Captación · Pipeline',icon:BarChart3,      action: () => onNavigate('cap_pipeline')    },
    { id: 'cap_speeches',    label: '📞 Captación · Speeches',icon:Megaphone,      action: () => onNavigate('cap_speeches')    },
    { id: 'cap_provincias',  label: '📞 Captación · Provincias',icon:Map,          action: () => onNavigate('cap_provincias')  },
    { id: 'cap_contactos',   label: '📞 Contactos CRM',    icon: Users,            action: () => onNavigate('cap_contactos')   },
  ]

  // Solo comandos que el rol puede abrir (ver auth.js — es UX, no seguridad).
  const filtered = commands
    .filter(c => canAccessView(currentUser, c.id))
    .filter(c => c.label.toLowerCase().includes(query.toLowerCase()))

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
      id: 'resilio', label: 'Resilio Life', icon: ResilioIcon, collapsible: true,
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
      id: 'infagency', label: 'RESILIO NETWORK', icon: Star, collapsible: true,
      open: agencyOpen, onToggle: () => setAgencyOpen(p => !p),
      items: [
        { id: 'nw_lbl_inicio',     subLabel: 'INICIO',       viewId: 'network' },
        { id: 'nw_home',           viewId: 'network', label: 'Inicio',         icon: Home,        networkPath: '/network/home' },
        { id: 'nw_lbl_network',    subLabel: 'NETWORK',      viewId: 'network' },
        { id: 'nw_influencers',    viewId: 'network', label: 'Influencers',    icon: Users,       networkPath: '/network/influencers' },
        { id: 'nw_brands',         viewId: 'network', label: 'Marcas',         icon: Building2,   networkPath: '/network/brands' },
        { id: 'nw_opportunities',  viewId: 'network', label: 'Oportunidades',  icon: Briefcase,   networkPath: '/network/opportunities' },
        { id: 'nw_collaborations', viewId: 'network', label: 'Colaboraciones', icon: CheckCircle, networkPath: '/network/collaborations' },
        { id: 'nw_lbl_operation',  subLabel: 'OPERACIÓN',    viewId: 'network' },
        { id: 'nw_tasks',          viewId: 'network', label: 'Tareas',         icon: CheckSquare, networkPath: '/network/tasks' },
        { id: 'nw_calendar',       viewId: 'network', label: 'Calendario',     icon: Calendar,    networkPath: '/network/calendar',    disabled: true },
        { id: 'nw_followups',      viewId: 'network', label: 'Seguimiento',    icon: ArrowRight,  networkPath: '/network/follow-ups',  disabled: true },
        { id: 'nw_notes',          viewId: 'network', label: 'Notas',          icon: FileText,    networkPath: '/network/notes',       disabled: true },
        { id: 'nw_lbl_growth',     subLabel: 'GROWTH',       viewId: 'network' },
        { id: 'nw_missions',       viewId: 'network', label: 'Misiones',       icon: Target,      networkPath: '/network/missions',    disabled: true },
        { id: 'nw_roadmap',        viewId: 'network', label: 'Hoja de Ruta',   icon: Map,         networkPath: '/network/roadmap',     disabled: true },
        { id: 'nw_rewards',        viewId: 'network', label: 'Premios',        icon: Award,       networkPath: '/network/rewards',     disabled: true },
        { id: 'nw_lbl_intel',      subLabel: 'INTELLIGENCE', viewId: 'network', commandOnly: true },
        { id: 'nw_command',        viewId: 'network', label: 'Estadísticas',   icon: BarChart3,   networkPath: '/network/command',     commandOnly: true },
        { id: 'nw_lbl_manual',     subLabel: 'MANUAL',       viewId: 'network' },
        { id: 'nw_manual',         viewId: 'network', label: 'Manual',         icon: BookOpen,    networkPath: '/network/manual',      disabled: true },
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
        { id: 'advanced', label: 'Advanced', icon: ResilioIcon },
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

  // Filtra ítems y secciones según el rol. Una sección sin ítems no se renderiza.
  const visibleSections = sections
    .map(s => ({ ...s, items: s.items.filter(i => canAccessView(currentUser, i.viewId || i.id)) }))
    .filter(s => s.items.length > 0)

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
        <div style={{ width:40,height:40,borderRadius:12,flexShrink:0,background:'linear-gradient(135deg,var(--primary-violet),var(--accent-magenta))',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'var(--glow-violet-sm)' }}><img src="/logoresilio.png" alt="Resilio" style={{ width:26,height:26,objectFit:'contain',filter:'brightness(0) invert(1)' }}/></div>
        {!collapsed&&(
          <div style={{ overflow:'hidden' }}>
            <div className="gradient-text" style={{ fontSize:14,fontWeight:700,letterSpacing:0.5,whiteSpace:'nowrap' }}>Resilio Life</div>
          </div>
        )}
        <button onClick={onToggle} style={{ marginLeft:'auto',color:'var(--text-secondary)',padding:4,borderRadius:6,transition:'all 0.2s',flexShrink:0 }} onMouseEnter={e=>{e.currentTarget.style.color='var(--primary-violet-light)';e.currentTarget.style.background='rgba(139,92,246,0.1)'}} onMouseLeave={e=>{e.currentTarget.style.color='var(--text-secondary)';e.currentTarget.style.background='transparent'}}>
          {collapsed?<ChevronRight size={16}/>:<ChevronLeft size={16}/>}
        </button>
      </div>

      {/* Nav — filtrado por rol (ver auth.js: es UX, no seguridad) */}
      <nav style={{ flex:1,overflowY:'auto',padding:'12px 8px' }}>
        {visibleSections.map(section=>(
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
              // Ítems solo para roles de dirección
              if (item.commandOnly && !COMMAND_ROLES.includes(currentUser?.rol)) return null
              // Sub-etiquetas de sección (no clickeables)
              if (item.subLabel) {
                return collapsed ? null : (
                  <div key={item.id} style={{ padding:'8px 8px 2px 10px',color:'rgba(139,92,246,0.55)',fontSize:9,fontWeight:700,letterSpacing:1.2,textTransform:'uppercase',marginTop:6 }}>
                    {item.subLabel}
                  </div>
                )
              }
              const isActive = item.networkPath
                ? (currentView==='network' && window.location.pathname===item.networkPath)
                : currentView===item.id
              const handleClick = () => {
                if (item.disabled) return
                if (item.networkPath) {
                  window.history.pushState({}, '', item.networkPath)
                  onNavigate('network')
                } else {
                  onNavigate(item.id)
                }
              }
              return (
                <button key={item.id} onClick={handleClick} title={collapsed?item.label:undefined} style={{
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

const Header = ({ currentView, onMobileMenu, currentUser, onLogout, onAdmin, adminNotifCount }) => {
  const [avatarOpen, setAvatarOpen] = useState(false)
  const labels = { dashboard:'Dashboard General',rl_dashboard:'Resilio Life · Dashboard',brands:'Marcas',locations:'Locales',influencers:'Influencers',benefits:'Beneficios',codes:'Códigos',memberships:'Membresías',users:'Usuarios',unregistered:'Usuarios No Registrados',tracking:'Tracking Real-Time',analytics:'Analytics',reports:'Reportes',creative:'Agencia Creativa',creative_projects:'Proyectos',creative_clients:'Clientes Creativos',creative_equipo:'Equipo Creativo',inf_dashboard:'RESILIO NETWORK · Dashboard',inf_campaigns:'Campañas',inf_crm:'Influencers CRM',inf_collabs:'Colaboraciones',prod_dashboard:'Productora · Dashboard',events:'Eventos',tickets:'Tickets',only_members:'⭐ Only Members',rrpp:'Relaciones Públicas',elevare:'💎 Elevare · Dashboard',elevare_bienes:'💎 Elevare · Bienes',elevare_leads:'💎 Elevare · Leads',elevare_contratos:'💎 Elevare · Contratos',elevare_contenido:'💎 Elevare · Contenido',elevare_hosp:'💎 Elevare · Hospitality',missions:'🎯 Misiones',team:'Team Management',advanced:'Features Avanzadas',cap_pipeline:'📞 Captación · Pipeline',cap_busqueda:'📞 Captación · Búsqueda',cap_speeches:'📞 Captación · Speeches',cap_provincias:'📞 Captación · Expansión',cap_seguimiento:'📞 Captación · Seguimiento',cap_contactos:'📞 Captación · Contactos',hub:'Hub Central' }
  const displayName = currentUser?.sobrenombre || currentUser?.nombre || 'Usuario'
  const roleLabel = { super_admin:'Super Admin', admin:'Admin', editor:'Editor', viewer:'Viewer', custom:'Custom' }

  return (
    <header style={{ height:56,background:'var(--glass-bg)',backdropFilter:'blur(40px)',borderBottom:'1px solid var(--border-violet)',display:'flex',alignItems:'center',padding:'0 16px',gap:10,position:'sticky',top:0,zIndex:100 }}>
      <button className="show-mobile-only" onClick={onMobileMenu} style={{ color:'var(--text-secondary)',padding:6,borderRadius:8 }}><Menu size={20}/></button>
      <h1 style={{ fontSize:15,fontWeight:700 }}>{labels[currentView]||currentView}</h1>
      <div style={{ flex:1 }}/>

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

      {currentUser && (
        <div style={{ position:'relative' }}>
          <button onClick={()=>setAvatarOpen(p=>!p)} style={{ width:38,height:38,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',background:currentUser.avatarColor||'var(--primary-violet)',border:'2px solid rgba(255,255,255,0.2)',color:'white',fontWeight:700,fontSize:13,cursor:'pointer',transition:'all 0.2s',boxShadow:avatarOpen?'0 0 0 3px rgba(139,92,246,0.5)':'none' }}>
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
// HUB NODES - NODOS EMPRESA (NUEVO)
// ═══════════════════════════════════════════════

const EMPRESA_NODOS = [
  { id:'creative', icon:'🎨', label:'Creative',    color:'#FF6B6B', view:'creative'      },
  { id:'elevare',  icon:'💎', label:'ELEVARE',     color:'#4ECDC4', view:'elevare'       },
  { id:'crm',      icon:'👥', label:'CRM',         color:'#95E1D3', view:'inf_crm'       },
  { id:'events',   icon:'📋', label:'Events',      color:'#F38181', view:'events'        },
  { id:'red',      icon:'📱', label:'RED',         color:'#AA96DA', view:'rl_dashboard'  },
  { id:'gestion',  icon:'🎯', label:'Gestión',     color:'#FCBAD3', view:'missions'      },
]

const HubNodes = ({ onNavigate, onClose, currentUser }) => {
  const R = 120
  const angles = [30, 54, 78, 102, 126, 150]
  const nodeSize = 54
  const nodos = EMPRESA_NODOS.filter(n => canAccessView(currentUser, n.view))

  return (
    <>
      <div onClick={onClose} style={{ position:'fixed',inset:0,zIndex:195,background:'rgba(0,0,0,0.6)',backdropFilter:'blur(8px)',WebkitBackdropFilter:'blur(8px)' }}/>
      <div style={{ position:'fixed',bottom:32,left:'50%',zIndex:196,pointerEvents:'none' }}>
        {nodos.map((nodo, i) => {
          const θ = angles[i] * Math.PI / 180
          const x = R * Math.cos(θ)
          const y = R * Math.sin(θ)
          return (
            <button key={nodo.id}
              onClick={() => { onNavigate(nodo.view); onClose() }}
              style={{
                position:'absolute',
                left: x - nodeSize/2,
                bottom: y - nodeSize/2,
                width: nodeSize, height: nodeSize,
                borderRadius: 16,
                background: `${nodo.color}20`,
                border: `2px solid ${nodo.color}`,
                display:'flex', flexDirection:'column',
                alignItems:'center', justifyContent:'center',
                gap: 3, cursor:'pointer',
                pointerEvents:'all',
                animation: `hubNodeIn 0.4s cubic-bezier(0.34,1.56,0.64,1) ${i*0.06}s both`,
                boxShadow: `0 4px 16px ${nodo.color}50`,
                transition:'transform 0.2s',
              }}
              onMouseEnter={e=>e.currentTarget.style.transform='scale(1.12)'}
              onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}
            >
              <span style={{ fontSize:22,lineHeight:1 }}>{nodo.icon}</span>
              <span style={{ fontSize:8,color:nodo.color,fontWeight:700,letterSpacing:0.4,lineHeight:1 }}>{nodo.label}</span>
            </button>
          )
        })}
      </div>
    </>
  )
}

// ═══════════════════════════════════════════════
// MOBILE NAV - 5 BOTONES (NUEVO)
// ═══════════════════════════════════════════════

const MobileNav = ({ onMobileMenu, onNavigate, onRocco, onToggleHub, hubActive, notifications, onMarkRead, onMarkAllRead }) => {
  const [notifOpen, setNotifOpen] = useState(false)
  const unread = (notifications||[]).filter(n=>!n.read).length
  const notifTypeIcon = { mission:'🎯', elevare:'💎', creative:'🎨', campaign:'⚡' }

  const navBtnBase = {
    flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
    gap:4, padding:'8px 2px', cursor:'pointer', background:'transparent', border:'none',
    color:'var(--text-secondary)', borderRadius:10, transition:'all 0.2s',
  }

  return (
    <>
      {/* Panel de notificaciones */}
      {notifOpen && (
        <>
          <div style={{ position:'fixed',inset:0,zIndex:195 }} onClick={()=>setNotifOpen(false)}/>
          <div className="glass" style={{ position:'fixed',bottom:68,right:4,width:300,maxHeight:'55vh',borderRadius:16,overflow:'hidden',zIndex:196,display:'flex',flexDirection:'column',boxShadow:'var(--glow-violet),0 20px 40px rgba(0,0,0,0.5)',animation:'notifSlide 0.2s ease' }}>
            <div style={{ padding:'12px 16px',borderBottom:'1px solid var(--border-violet)',display:'flex',alignItems:'center',justifyContent:'space-between' }}>
              <span style={{ fontWeight:700,fontSize:13 }}>Notificaciones {unread>0&&<span style={{ marginLeft:4,padding:'1px 7px',borderRadius:10,background:'rgba(232,121,249,0.2)',color:'var(--accent-magenta)',fontSize:10 }}>{unread}</span>}</span>
              {unread>0&&<button onClick={()=>{onMarkAllRead();}} style={{ fontSize:10,color:'var(--primary-violet-light)',background:'none',border:'none',cursor:'pointer' }}>Marcar todas</button>}
            </div>
            <div style={{ overflowY:'auto',flex:1 }}>
              {(notifications||[]).length===0 && <div style={{ padding:20,textAlign:'center',color:'var(--text-secondary)',fontSize:12 }}>Sin notificaciones</div>}
              {(notifications||[]).map(n=>(
                <div key={n.id} onClick={()=>onMarkRead(n.id)} style={{ padding:'10px 16px',borderBottom:'1px solid var(--border-violet)',cursor:'pointer',background:n.read?'transparent':'rgba(139,92,246,0.06)',display:'flex',gap:8,alignItems:'flex-start',transition:'background 0.2s' }}
                  onMouseEnter={e=>e.currentTarget.style.background='rgba(139,92,246,0.1)'}
                  onMouseLeave={e=>e.currentTarget.style.background=n.read?'transparent':'rgba(139,92,246,0.06)'}>
                  <span style={{ fontSize:16 }}>{notifTypeIcon[n.type]||'🔔'}</span>
                  <div style={{ flex:1,minWidth:0 }}>
                    <div style={{ fontSize:11,fontWeight:n.read?500:700,marginBottom:1 }}>{n.title}</div>
                    <div style={{ fontSize:10,color:'var(--text-secondary)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{n.body}</div>
                  </div>
                  {!n.read&&<div style={{ width:6,height:6,borderRadius:'50%',background:'var(--accent-magenta)',flexShrink:0,marginTop:3 }}/>}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <nav style={{
        position:'fixed', bottom:0, left:0, right:0,
        background:'rgba(10,6,24,0.96)',
        backdropFilter:'blur(40px)', WebkitBackdropFilter:'blur(40px)',
        borderTop:'1px solid rgba(139,92,246,0.25)',
        zIndex:200, display:'flex', alignItems:'flex-end',
        height:'max(64px, calc(64px + env(safe-area-inset-bottom)))',
        paddingBottom:'max(0px, env(safe-area-inset-bottom))',
      }} className="show-mobile-only">

        {/* 1. Sidebar / NODES */}
        <button style={navBtnBase} onClick={onMobileMenu}>
          <div style={{ display:'flex',flexDirection:'column',gap:3 }}>
            {[0,1,2].map(i=><div key={i} style={{ width:17,height:1.5,borderRadius:1,background:'var(--text-secondary)' }}/>)}
          </div>
          <span style={{ fontSize:8,fontWeight:600,letterSpacing:0.5 }}>NODES</span>
        </button>

        {/* 2. Config */}
        <button style={navBtnBase} onClick={()=>onNavigate('advanced')}>
          <Settings size={18}/>
          <span style={{ fontSize:8,fontWeight:500 }}>Config</span>
        </button>

        {/* 3. Hub Central (elevado) */}
        <div style={{ flex:1,display:'flex',justifyContent:'center',alignItems:'flex-end',paddingBottom:10 }}>
          <button onClick={onToggleHub} style={{
            width:60, height:60, borderRadius:20,
            background: hubActive
              ? 'linear-gradient(135deg,#7C3AED,#A855F7)'
              : 'linear-gradient(135deg,var(--primary-violet),var(--accent-magenta))',
            border:`2px solid ${hubActive?'rgba(255,255,255,0.35)':'rgba(139,92,246,0.5)'}`,
            boxShadow: hubActive
              ? '0 0 32px rgba(139,92,246,0.9),0 -6px 24px rgba(139,92,246,0.5)'
              : '0 0 20px rgba(139,92,246,0.5),0 -4px 16px rgba(139,92,246,0.3)',
            cursor:'pointer',
            display:'flex', alignItems:'center', justifyContent:'center',
            transform: hubActive ? 'translateY(-10px) scale(1.06)' : 'translateY(-6px)',
            transition:'all 0.3s cubic-bezier(0.34,1.56,0.64,1)',
          }}>
            <img src="/logoresilio.png" alt="Resilio" style={{ width:28,height:28,objectFit:'contain',filter:'brightness(0) invert(1)' }}/>
          </button>
        </div>

        {/* 4. Rocco IA */}
        <button style={navBtnBase} onClick={onRocco}>
          <span style={{ fontSize:20,lineHeight:1 }}>▷</span>
          <span style={{ fontSize:8,fontWeight:500 }}>Rocco</span>
        </button>

        {/* 5. Notificaciones */}
        <button onClick={()=>setNotifOpen(p=>!p)} style={{ ...navBtnBase,color:notifOpen?'var(--primary-violet-light)':'var(--text-secondary)',position:'relative' }}>
          <div style={{ position:'relative' }}>
            <Bell size={18}/>
            {unread>0&&<span style={{ position:'absolute',top:-4,right:-5,minWidth:14,height:14,background:'var(--accent-magenta)',borderRadius:7,fontSize:8,fontWeight:700,color:'white',display:'flex',alignItems:'center',justifyContent:'center',padding:'0 2px',boxShadow:'0 0 6px var(--accent-magenta)' }}>{unread}</span>}
          </div>
          <span style={{ fontSize:8,fontWeight:500 }}>Avisos</span>
        </button>
      </nav>
    </>
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
// SPLASH LOADING
// ═══════════════════════════════════════════════

const SplashLoading = () => (
  <div style={{ minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'var(--bg-primary)' }}>
    <div style={{ display:'flex',flexDirection:'column',alignItems:'center',gap:16 }}>
      <div style={{ width:52,height:52,borderRadius:16,background:'linear-gradient(135deg,var(--primary-violet),var(--accent-magenta))',display:'flex',alignItems:'center',justifyContent:'center',animation:'pulse-glow 1.5s ease-in-out infinite' }}>
        <img src="/logoresilio.png" alt="" style={{ width:32,height:32,filter:'brightness(0) invert(1)' }}/>
      </div>
      <div style={{ fontSize:13,color:'var(--text-secondary)' }}>Cargando...</div>
    </div>
  </div>
)

// ═══════════════════════════════════════════════
// APP ROOT
// ═══════════════════════════════════════════════

export default function App() {
  // ── Auth state ──────────────────────────────────
  const [currentUser,   setCurrentUser]   = useState(null)
  const [authReady,     setAuthReady]     = useState(false)
  const [passwordReset, setPasswordReset] = useState(false)
  const [showAdmin,     setShowAdmin]     = useState(false)
  const [adminNotifs,   setAdminNotifs]   = useState(() => getAdminNotifs())

  const handleLogin = (user) => {
    setCurrentUser(user)
    setShowPortal(true)
    setCurrentView(defaultViewFor(user))
  }

  const handleLogout = async () => {
    await signOut()
  }

  const refreshAdminNotifs = () => setAdminNotifs(getAdminNotifs())

  // ── Sesión ──────────────────────────────────────────────────
  // ⚠️ REGLA CRÍTICA: NUNCA llamar supabase.auth.* dentro del callback de
  // onAuthStateChange. supabase-js sostiene un lock de auth mientras
  // despacha el callback; llamar getUser()/getSession() ahí adentro
  // produce un deadlock: la promesa nunca resuelve, authReady nunca se
  // pone en true, y la app queda cargando para siempre al recargar.
  // La sesión inicial se lee FUERA, y el callback usa el `session` que
  // ya recibe por parámetro.
  useEffect(() => {
    let alive = true

    const loadProfile = async (userId, { isSignIn = false } = {}) => {
      try {
        const user = await fetchUserById(userId)
        if (!alive) return
        setCurrentUser(user)
        if (isSignIn && user) {
          setShowPortal(true)
          setCurrentView(defaultViewFor(user))
        }
      } catch (e) {
        console.error('Auth — no se pudo cargar el perfil:', e)
        if (alive) setCurrentUser(null)
      } finally {
        if (alive) setAuthReady(true)
      }
    }

    // 1) Sesión inicial, fuera de cualquier callback
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!alive) return
      if (!session?.user) { setCurrentUser(null); setAuthReady(true); return }
      loadProfile(session.user.id)
    })

    // 2) Cambios posteriores. El setTimeout(0) saca el trabajo del frame
    //    del callback y libera el lock de auth antes de tocar la base.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!alive) return
      if (event === 'PASSWORD_RECOVERY') {
        setPasswordReset(true); setCurrentUser(null); setAuthReady(true); return
      }
      if (event === 'TOKEN_REFRESHED') return   // misma sesión, no recargar
      if (!session?.user) {
        setCurrentUser(null); setShowPortal(false); setAuthReady(true); return
      }
      setTimeout(() => {
        if (alive) loadProfile(session.user.id, { isSignIn: event === 'SIGNED_IN' })
      }, 0)
    })

    return () => { alive = false; subscription.unsubscribe() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── CRM state ────────────────────────────────────
  const [theme,            setTheme]           = useLocalStorage('crm_theme', 'dark')
  const [currentView,      setCurrentView]      = useLocalStorage('crm_view', 'dashboard')

  // Deep link: si la URL apunta a /network/* al montar, activar el módulo Network
  useEffect(() => {
    if (window.location.pathname.startsWith('/network') && currentView !== 'network') {
      setCurrentView('network')
    } else if (!window.location.pathname.startsWith('/network') && currentView === 'network') {
      // Stale: salió de Network, volver al hub
      setCurrentView('hub')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const [sidebarCollapsed, setSidebarCollapsed] = useLocalStorage('crm_sidebar', false)
  const [brands,      setBrands]      = useState([])
  const [locations,   setLocations]   = useState([])
  const [influencers, setInfluencers] = useState([])
  const [benefits,    setBenefits]    = useLocalStorage('crm_benefits',    DEMO_BENEFITS)
  const [codes,       setCodes]       = useLocalStorage('crm_codes',       DEMO_CODES)
  const [codeUsages,  setCodeUsages]  = useLocalStorage('crm_usages',      DEMO_CODE_USAGES)
  const [memberships, setMemberships] = useLocalStorage('crm_memberships', DEMO_MEMBERSHIPS)
  const [users,       setUsers]       = useLocalStorage('crm_users',       DEMO_USERS)
  // Phase 3 state
  const [creativeProjects, setCreativeProjects] = useLocalStorage('crm_cr_projects', DEMO_CREATIVE_PROJECTS)
  const [creativeClients,  setCreativeClients]  = useLocalStorage('crm_cr_clients',  DEMO_CREATIVE_CLIENTS)
  const [infCampaigns,     setInfCampaigns]     = useState([])
  const [collaborations,   setCollaborations]   = useState([])
  const [activationTypes,  setActivationTypes]  = useState([])
  const [events,           setEvents]           = useLocalStorage('crm_events', DEMO_EVENTS)
  const [sponsors,         setSponsors]         = useLocalStorage('crm_sponsors',     DEMO_SPONSORS)
  const [tickets,          setTickets]          = useLocalStorage('crm_tickets',      DEMO_TICKETS)
  // Phase 4 state
  const [elevareAssets,    setElevareAssets]    = useLocalStorage('crm_elv_assets',   DEMO_ELEVARE_ASSETS)
  const [elevareLeads,     setElevareLeads]     = useLocalStorage('crm_elv_leads',    DEMO_ELEVARE_LEADS)
  const [elevareContracts, setElevareContracts] = useLocalStorage('crm_elv_contracts',DEMO_ELEVARE_CONTRACTS)
  const [teamMembers,      setTeamMembers]      = useLocalStorage('crm_team',         DEMO_TEAM_MEMBERS)

  // Phase 5 state
  const [missions,       setMissions]       = useState([])
  const [notifications,  setNotifications]  = useLocalStorage('crm_notifs_v1', DEMO_NOTIFICATIONS)
  const [portalSeen,     setPortalSeen]     = useLocalStorage('crm_portal_seen', false)
  const [showPortal,     setShowPortal]     = useState(false)

  const [cmdOpen,            setCmdOpen]            = useState(false)
  const [mobileMenu,         setMobileMenu]         = useState(false)
  const [windowWidth,        setWindowWidth]        = useState(window.innerWidth)
  const [showRocco,          setShowRocco]          = useState(false)
  const [hubNodesVisible,    setHubNodesVisible]    = useState(false)
  const [nodesBeforeSidebar, setNodesBeforeSidebar] = useState(false)

  useEffect(() => { const h=()=>setWindowWidth(window.innerWidth); window.addEventListener('resize',h); return()=>window.removeEventListener('resize',h) }, [])
  useEffect(() => { document.documentElement.setAttribute('data-theme',theme) }, [theme])
  useEffect(() => {
    const h=(e)=>{ if((e.metaKey||e.ctrlKey)&&e.key==='k'){e.preventDefault();setCmdOpen(p=>!p)} }
    window.addEventListener('keydown',h); return()=>window.removeEventListener('keydown',h)
  }, [])
  useEffect(() => {
    if (mobileMenu) { setNodesBeforeSidebar(hubNodesVisible); setHubNodesVisible(false) }
    else { setHubNodesVisible(nodesBeforeSidebar) }
  }, [mobileMenu])

  const [dataError, setDataError] = useState(null)

  // Load shared CRM data whenever the authenticated user is available
  useEffect(() => {
    if (!currentUser) return
    setDataError(null)
    Promise.all([
      dbListAllBrands(),
      dbGetLocations(),
      dbListAllInfluencers(),
      dbGetCampaigns(),
      dbGetCollaborations(),
      dbGetActivationTypes(),
      dbGetMissions(),
    ]).then(([b, l, i, camps, collabs, actTypes, miss]) => {
      setBrands(b)
      setLocations(l)
      setInfluencers(i)
      setInfCampaigns(camps)
      setCollaborations(collabs)
      setActivationTypes(actTypes)
      setMissions(miss)
    }).catch(e => setDataError(e?.message || 'Error al cargar datos. Revisá tu conexión.'))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id])

  const isMobile = windowWidth < 640
  const isTablet = windowWidth >= 640 && windowWidth < 1024
  const effectiveCollapsed = isTablet ? true : sidebarCollapsed

  // ── CRUD Handlers ─────────────────────────────
  const upsert = (setter) => (item) => setter(prev => prev.find(x=>x.id===item.id) ? prev.map(x=>x.id===item.id?item:x) : [...prev,item])

  // Brands — Supabase + local state
  // DB-first: el id lo genera Postgres. Si se actualiza el estado primero,
  // el registro queda con el id falso del frontend y el próximo guardado
  // crea un duplicado en vez de editar.
  const handleSaveBrand = useCallback(async (brand) => {
    try {
      const saved = await dbSaveBrand(brand)
      setBrands(prev => prev.find(x=>x.id===saved.id) ? prev.map(x=>x.id===saved.id?saved:x) : [...prev,saved])
      setDataError(null)
    } catch (e) {
      console.error('saveBrand:', e)
      setDataError(e.message || 'No se pudo guardar la marca')
    }
  }, [])
  const handleDeleteBrand = useCallback(async (id) => {
    try {
      await dbDeleteBrand(id)
      setBrands(p=>p.filter(x=>x.id!==id))
      setLocations(p=>p.filter(x=>x.brandId!==id))
      setDataError(null)
    } catch (e) {
      console.error('deleteBrand:', e)
      setDataError(e.message || 'No se pudo borrar la marca')
    }
  }, [])

  // Locations — Supabase + local state
  const handleSaveLocation = useCallback(async (loc) => {
    try {
      const saved = await dbSaveLocation(loc)
      setLocations(prev => prev.find(x=>x.id===saved.id) ? prev.map(x=>x.id===saved.id?saved:x) : [...prev,saved])
      setDataError(null)
    } catch (e) {
      console.error('saveLocation:', e)
      setDataError(e.message || 'No se pudo guardar el local')
    }
  }, [])
  const handleDeleteLocation = useCallback(async (id) => {
    try {
      await dbDeleteLocation(id)
      setLocations(p=>p.filter(x=>x.id!==id))
      setDataError(null)
    } catch (e) {
      console.error('deleteLocation:', e)
      setDataError(e.message || 'No se pudo borrar el local')
    }
  }, [])

  // Influencers — DB-first (Postgres generates UUID for new records)
  const handleSaveInfluencer = useCallback(async (inf) => {
    try {
      const saved = await dbSaveInfluencer(inf)
      setInfluencers(prev => prev.find(x=>x.id===saved.id) ? prev.map(x=>x.id===saved.id?saved:x) : [...prev,saved])
      setDataError(null)
    } catch (e) {
      console.error('saveInfluencer:', e)
      setDataError(e.message || 'No se pudo guardar el influencer')
    }
  }, [])
  const handleDeleteInfluencer = useCallback(async (id) => {
    try {
      await dbDeleteInfluencer(id)
      setInfluencers(p=>p.filter(x=>x.id!==id))
      setDataError(null)
    } catch (e) {
      console.error('deleteInfluencer:', e)
      setDataError(e.message || 'No se pudo borrar el influencer')
    }
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
  const handleSaveInfCampaign = useCallback(async (camp) => {
    try {
      const saved = await dbSaveCampaign(camp, currentUser?.id)
      setInfCampaigns(prev => prev.find(x=>x.id===saved.id) ? prev.map(x=>x.id===saved.id?saved:x) : [...prev,saved])
      setDataError(null)
    } catch (e) {
      setDataError(e.message || 'No se pudo guardar la campaña')
    }
  }, [currentUser?.id])
  const handleDeleteInfCampaign = useCallback(async (id) => {
    try {
      await dbDeleteCampaign(id)
      setInfCampaigns(p => p.filter(x => x.id !== id))
      setDataError(null)
    } catch (e) {
      setDataError(e.message || 'No se pudo archivar la campaña')
    }
  }, [])

  // Patch the influencerIds on an existing campaign in local state after CI ops
  const handlePatchCampaignInfluencers = useCallback((campaignId, influencerIds) => {
    setInfCampaigns(prev => prev.map(c => c.id === campaignId ? { ...c, influencerIds } : c))
  }, [])

  const handleGetCampaignInfluencers = useCallback((campaignId) => dbGetCampaignInfluencers(campaignId), [])
  const handleCIAdd    = useCallback((campId, infId, fields) => dbAddInfluencerToCampaign(campId, infId, fields), [])
  const handleCIUpdate = useCallback((campId, infId, fields) => dbUpdateCampaignInfluencer(campId, infId, fields), [])
  const handleCIRemove = useCallback((campId, infId) => dbRemoveInfluencerFromCampaign(campId, infId), [])

  const handleSaveCollaboration = useCallback(async (collab) => {
    try {
      const saved = await dbSaveCollaboration(collab, currentUser?.id)
      setCollaborations(prev => prev.find(x=>x.id===saved.id) ? prev.map(x=>x.id===saved.id?saved:x) : [...prev,saved])
      setDataError(null)
    } catch (e) {
      setDataError(e.message || 'No se pudo guardar la colaboración')
    }
  }, [currentUser?.id])
  const handleDeleteCollaboration = useCallback(async (id) => {
    try {
      await dbDeleteCollaboration(id)
      setCollaborations(p => p.filter(x => x.id !== id))
      setDataError(null)
    } catch (e) {
      setDataError(e.message || 'No se pudo cancelar la colaboración')
    }
  }, [])
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
  }, [setCurrentView])

  const handleToggleHub = useCallback(() => setHubNodesVisible(p => !p), [])

  // ── Guard de vista por rol ───────────────────────────────
  // Si `crm_view` (localStorage, manipulable) apunta a una vista que el rol no
  // puede abrir, se cae a la vista por defecto. La corrección se calcula fuera
  // del render y se persiste en un efecto, para no hacer setState durante el render.
  const allowedView = canAccessView(currentUser, currentView)
    ? currentView
    : defaultViewFor(currentUser)

  useEffect(() => {
    if (allowedView !== currentView) setCurrentView(allowedView)
  }, [allowedView, currentView, setCurrentView])

  const renderView = () => {
    if (!hasAnyAccess(currentUser)) {
      return (
        <div style={{ padding:'80px 24px', textAlign:'center', maxWidth:420, margin:'0 auto' }}>
          <div style={{ fontSize:40, marginBottom:16 }}>🔒</div>
          <h2 style={{ fontSize:18, fontWeight:600, marginBottom:8 }}>Tu cuenta todavía no tiene accesos asignados</h2>
          <p style={{ fontSize:14, color:'var(--text-secondary)' }}>
            Contactá al administrador para que te asigne un rol.
          </p>
        </div>
      )
    }
    switch (allowedView) {
      case 'network':
        // Renderizado con layout propio — ver el bypass en el return principal
        return null
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
        return <InfluencerAgencyView key="dashboard" campaigns={infCampaigns} collaborations={collaborations} activationTypes={activationTypes} influencers={influencers} brands={brands} onSaveCampaign={handleSaveInfCampaign} onDeleteCampaign={handleDeleteInfCampaign} onSaveCollaboration={handleSaveCollaboration} onDeleteCollaboration={handleDeleteCollaboration} onSaveInfluencer={handleSaveInfluencer} onDeleteInfluencer={handleDeleteInfluencer} onGetCampaignInfluencers={handleGetCampaignInfluencers} onCIAdd={handleCIAdd} onCIUpdate={handleCIUpdate} onCIRemove={handleCIRemove} onPatchCampaignInfluencers={handlePatchCampaignInfluencers} defaultTab="dashboard"/>
      case 'inf_campaigns':
        return <InfluencerAgencyView key="campaigns" campaigns={infCampaigns} collaborations={collaborations} activationTypes={activationTypes} influencers={influencers} brands={brands} onSaveCampaign={handleSaveInfCampaign} onDeleteCampaign={handleDeleteInfCampaign} onSaveCollaboration={handleSaveCollaboration} onDeleteCollaboration={handleDeleteCollaboration} onSaveInfluencer={handleSaveInfluencer} onDeleteInfluencer={handleDeleteInfluencer} onGetCampaignInfluencers={handleGetCampaignInfluencers} onCIAdd={handleCIAdd} onCIUpdate={handleCIUpdate} onCIRemove={handleCIRemove} onPatchCampaignInfluencers={handlePatchCampaignInfluencers} defaultTab="campaigns"/>
      case 'inf_crm':
        return <InfluencerAgencyView key="crm" campaigns={infCampaigns} collaborations={collaborations} activationTypes={activationTypes} influencers={influencers} brands={brands} onSaveCampaign={handleSaveInfCampaign} onDeleteCampaign={handleDeleteInfCampaign} onSaveCollaboration={handleSaveCollaboration} onDeleteCollaboration={handleDeleteCollaboration} onSaveInfluencer={handleSaveInfluencer} onDeleteInfluencer={handleDeleteInfluencer} onGetCampaignInfluencers={handleGetCampaignInfluencers} onCIAdd={handleCIAdd} onCIUpdate={handleCIUpdate} onCIRemove={handleCIRemove} onPatchCampaignInfluencers={handlePatchCampaignInfluencers} defaultTab="crm"/>
      case 'inf_collabs':
        return <InfluencerAgencyView key="collabs" campaigns={infCampaigns} collaborations={collaborations} activationTypes={activationTypes} influencers={influencers} brands={brands} onSaveCampaign={handleSaveInfCampaign} onDeleteCampaign={handleDeleteInfCampaign} onSaveCollaboration={handleSaveCollaboration} onDeleteCollaboration={handleDeleteCollaboration} onSaveInfluencer={handleSaveInfluencer} onDeleteInfluencer={handleDeleteInfluencer} onGetCampaignInfluencers={handleGetCampaignInfluencers} onCIAdd={handleCIAdd} onCIUpdate={handleCIUpdate} onCIRemove={handleCIRemove} onPatchCampaignInfluencers={handlePatchCampaignInfluencers} defaultTab="collabs"/>
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
  if (!authReady) {
    return <><GlobalStyles/><SplashLoading/></>
  }

  const isResetUrl = new URLSearchParams(window.location.search).get('reset') === '1'
  if (passwordReset || (isResetUrl && !currentUser)) {
    return (
      <>
        <GlobalStyles/>
        <LoginScreen onLogin={handleLogin} passwordResetMode/>
      </>
    )
  }

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
          onEnter={() => { setShowPortal(false); setCurrentView(defaultViewFor(currentUser)) }}
          userName={currentUser?.sobrenombre || currentUser?.nombre || 'Usuario'}
        />
      </>
    )
  }

  // RESILIO NETWORK — layout propio, sin sidebar/header del sistema principal
  if (allowedView === 'network' && window.location.pathname.startsWith('/network')) {
    return (
      <>
        <GlobalStyles/>
        <NetworkApp currentUser={currentUser}/>
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
        {!isMobile && allowedView !== 'hub' && (
          <Sidebar currentView={allowedView} onNavigate={navigate} collapsed={effectiveCollapsed} onToggle={()=>setSidebarCollapsed(p=>!p)} currentUser={currentUser}/>
        )}

        {/* Mobile sidebar overlay */}
        {isMobile && mobileMenu && allowedView !== 'hub' && (
          <>
            <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',backdropFilter:'blur(4px)',zIndex:199}} onClick={()=>setMobileMenu(false)}/>
            <div style={{position:'fixed',top:0,left:0,height:'100vh',zIndex:200}}>
              <Sidebar currentView={allowedView} onNavigate={navigate} collapsed={false} onToggle={()=>setMobileMenu(false)} currentUser={currentUser}/>
            </div>
          </>
        )}

        {/* Main */}
        <div style={{flex:1,display:'flex',flexDirection:'column',minWidth:0}}>
          <Header
            currentView={allowedView}
            onMobileMenu={()=>setMobileMenu(true)}
            currentUser={currentUser}
            onLogout={handleLogout}
            onAdmin={() => setShowAdmin(true)}
            adminNotifCount={adminNotifs.filter(n=>!n.read).length}
          />
          {dataError && (
            <div style={{ padding:'10px 20px',background:'rgba(239,68,68,0.1)',borderBottom:'1px solid rgba(239,68,68,0.3)',color:'#F87171',fontSize:13,display:'flex',alignItems:'center',gap:8 }}>
              <AlertCircle size={14}/>{dataError}
              <button onClick={()=>setDataError(null)} style={{ marginLeft:'auto',color:'#F87171',background:'none',border:'none',cursor:'pointer',fontSize:18,lineHeight:1 }}>×</button>
            </div>
          )}
          <main style={{flex:1,overflowY:'auto'}}>{renderView()}</main>
        </div>

        {isMobile && <MobileNav
          onMobileMenu={()=>setMobileMenu(true)}
          onNavigate={navigate}
          onRocco={()=>setShowRocco(p=>!p)}
          onToggleHub={handleToggleHub}
          hubActive={hubNodesVisible}
          notifications={notifications}
          onMarkRead={handleMarkRead}
          onMarkAllRead={handleMarkAllRead}
        />}
      </div>

      {/* Hub nodes radiales (solo móvil) */}
      {isMobile && hubNodesVisible && !mobileMenu && (
        <HubNodes onNavigate={navigate} onClose={()=>setHubNodesVisible(false)} currentUser={currentUser}/>
      )}

      <CommandPalette isOpen={cmdOpen} onClose={()=>setCmdOpen(false)} onNavigate={navigate} currentUser={currentUser}/>

      {/* ROCCO chat - botón solo en desktop */}
      {!isMobile && (
        <button
          onClick={()=>setShowRocco(p=>!p)}
          title="ROCCO IA Assistant"
          style={{
            position:'fixed', bottom:'2rem', right:'2rem',
            width:56, height:56, borderRadius:'50%',
            background: showRocco ? 'linear-gradient(135deg,#6D28D9,#7C3AED)' : 'linear-gradient(135deg,#8B5CF6,#C084FC)',
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
      )}

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
