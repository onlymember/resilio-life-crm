// Etiqueta chica del estado de la propuesta, para la lista de Marcas.
import React from 'react'
import { t } from '../../i18n/index.js'
import { planLabel } from '../../partners/content.js'

const COLORS = { sent: '#A78BFA', viewed: '#FBBF24', answered: '#34D399', expired: '#F87171' }

export default function ProposalTag({ state, plan }) {
  const c = COLORS[state]
  if (!c) return null
  return (
    <div style={{ padding: '0 14px 12px' }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 20, fontSize: 10, fontWeight: 700, letterSpacing: 0.3, color: c, background: `${c}18`, border: `1px solid ${c}55` }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: c }}/>
        {t(`proposalTag.${state}`, { plan: planLabel(plan) })}
      </span>
    </div>
  )
}
