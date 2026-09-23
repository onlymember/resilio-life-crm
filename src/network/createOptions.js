import { Users, Building2, Briefcase, Handshake } from 'lucide-react'

// Las cuatro entidades que se pueden crear desde el botón +.
// Mismo orden que los TypeButtons de CreateSheet.
//
// Vive en su propio archivo porque lo consumen los dos layouts: el FAB
// del bottom nav en mobile y el FAB flotante en escritorio. Duplicarlo
// garantizaba que uno de los dos quedara desactualizado.
export const SPEED_DIAL_ITEMS = [
  { step: 'influencer',    labelKey: 'create.influencer.label',    Icon: Users,     color: '#8B5CF6' },
  { step: 'brand',         labelKey: 'create.brand.label',         Icon: Building2, color: '#22D3EE' },
  { step: 'opportunity',   labelKey: 'create.opportunity.label',   Icon: Briefcase, color: '#FBBF24' },
  { step: 'collaboration', labelKey: 'create.collaboration.label', Icon: Handshake, color: '#34D399' },
]
