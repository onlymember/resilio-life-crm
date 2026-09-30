// Interruptor "Club para los scouters" (super_admin, admin, network_direction).
// Apagado: el Club solo lo ven esos roles. Prendido: los scouters ven el
// menú Club, Leads y la sección del Club en la ficha de la influencer.
import React, { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { t } from '../../i18n/index.js'
import { dbSetSetting } from '../../lib/database.js'
import { OFFERS_ROLES, isClubForScouters, setClubForScouters, useClubForScouters } from '../routes.js'
import { toast } from './Toaster.jsx'

export default function ClubAccessToggle({ currentUser }) {
  const on = useClubForScouters()
  const [busy, setBusy] = useState(false)
  if (!OFFERS_ROLES.includes(currentUser?.rol)) return null

  const flip = async () => {
    const next = !isClubForScouters()
    if (next && !window.confirm(t('clubAccess.confirmOn'))) return
    setBusy(true)
    try {
      await dbSetSetting('club_for_scouters', next)
      setClubForScouters(next)
      toast(t(next ? 'clubAccess.nowOn' : 'clubAccess.nowOff'))
    } catch (e) { toast(e.message) }
    finally { setBusy(false) }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12,
      background: on ? 'rgba(52,211,153,0.07)' : 'rgba(139,92,246,0.05)', border: `1px solid ${on ? 'rgba(52,211,153,0.35)' : 'var(--border-violet)'}` }}>
      {on ? <Eye size={18} color="#34D399"/> : <EyeOff size={18} color="var(--text-secondary)"/>}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{t('clubAccess.title')}</div>
        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{t(on ? 'clubAccess.on' : 'clubAccess.off')}</div>
      </div>
      <button role="switch" aria-checked={on} aria-label={t('clubAccess.title')} onClick={flip} disabled={busy} style={{
        width: 46, height: 26, borderRadius: 13, border: 'none', cursor: busy ? 'default' : 'pointer', position: 'relative', flexShrink: 0,
        background: on ? '#34D399' : 'rgba(139,92,246,0.25)', transition: 'background 0.2s', opacity: busy ? 0.6 : 1,
      }}>
        <span style={{ position: 'absolute', top: 3, left: on ? 23 : 3, width: 20, height: 20, borderRadius: '50%', background: 'white', transition: 'left 0.2s' }}/>
      </button>
    </div>
  )
}
