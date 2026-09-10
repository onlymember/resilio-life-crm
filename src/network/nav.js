import {
  Home, Users, Building2, Briefcase, CheckCircle,
  CheckSquare, Calendar, ArrowRight, FileText,
  Target, Map, Award, BarChart3, BookOpen,
} from 'lucide-react'
import { COMMAND_ROLES } from './routes.js'

// Estructura del menú. soon:true → muestra badge "Pronto" y redirige a ComingSoon.
// roles → si está definido, la sección/ítem solo aparece si el rol está en la lista.
export const NAV_SECTIONS = [
  {
    sectionKey: 'nav.sections.inicio',
    roles: null,
    items: [
      { path: '/network/home', labelKey: 'nav.home', icon: Home, soon: false, roles: null },
    ],
  },
  {
    sectionKey: 'nav.sections.network',
    roles: null,
    items: [
      { path: '/network/influencers',   labelKey: 'nav.influencers',    icon: Users,       soon: false, roles: null },
      { path: '/network/brands',        labelKey: 'nav.brands',         icon: Building2,   soon: false, roles: null },
      { path: '/network/opportunities', labelKey: 'nav.opportunities',  icon: Briefcase,   soon: false, roles: null },
      { path: '/network/collaborations',labelKey: 'nav.collaborations', icon: CheckCircle, soon: false, roles: null },
    ],
  },
  {
    sectionKey: 'nav.sections.operation',
    roles: null,
    items: [
      { path: '/network/tasks',       labelKey: 'nav.tasks',      icon: CheckSquare, soon: false, roles: null },
      { path: '/network/calendar',    labelKey: 'nav.calendar',   icon: Calendar,    soon: true,  roles: null },
      { path: '/network/follow-ups',  labelKey: 'nav.followUps',  icon: ArrowRight,  soon: true,  roles: null },
      { path: '/network/notes',       labelKey: 'nav.notes',      icon: FileText,    soon: true,  roles: null },
    ],
  },
  {
    sectionKey: 'nav.sections.growth',
    roles: null,
    items: [
      { path: '/network/missions', labelKey: 'nav.missions', icon: Target, soon: true, roles: null },
      { path: '/network/roadmap',  labelKey: 'nav.roadmap',  icon: Map,    soon: true, roles: null },
      { path: '/network/rewards',  labelKey: 'nav.rewards',  icon: Award,  soon: true, roles: null },
    ],
  },
  {
    sectionKey: 'nav.sections.intelligence',
    roles: COMMAND_ROLES,
    items: [
      { path: '/network/command', labelKey: 'nav.command', icon: BarChart3, soon: false, roles: COMMAND_ROLES },
    ],
  },
  {
    sectionKey: 'nav.sections.manual',
    roles: null,
    items: [
      { path: '/network/manual', labelKey: 'nav.manual', icon: BookOpen, soon: true, roles: null },
    ],
  },
]
