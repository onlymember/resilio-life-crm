// Ficha de influencer o marca: botones para contactar en un toque
// (WhatsApp, Instagram y llamada si hay teléfono). Cada toque queda
// registrado como contacto en la actividad de la ficha.
import React from 'react'
import { MessageCircle, Instagram, Phone } from 'lucide-react'
import { t } from '../../i18n/index.js'
import { dbLogContact } from '../../lib/database.js'
import { quiet } from '../../lib/quiet.js'

const digits = (s) => String(s || '').replace(/[^0-9]/g, '')
const igUser = (s) => String(s || '').trim().replace(/^@+/, '').replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/[/?#].*$/, '')

const btn = (color) => ({
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, flex: '1 1 0', minWidth: 0, minHeight: 44,
  padding: '10px 12px', borderRadius: 12, fontSize: 13, fontWeight: 700, textDecoration: 'none', cursor: 'pointer',
  color, background: `${color}14`, border: `1px solid ${color}40`, whiteSpace: 'nowrap',
})

export default function ContactBar({ entityType, entityId, whatsapp, instagram, phone }) {
  const wa = digits(whatsapp)
  const ig = igUser(instagram)
  const tel = digits(phone)
  if (!wa && !ig && !tel) return null
  const log = (label) => dbLogContact(entityType, entityId, label).catch(quiet('ContactBar'))

  const openInstagram = (e) => {
    e.preventDefault()
    log('Instagram')
    // En el celular intenta abrir la app; si no está, la web.
    window.location.href = `instagram://user?username=${ig}`
    setTimeout(() => window.open(`https://instagram.com/${ig}`, '_blank', 'noopener'), 900)
  }

  return (
    <div style={{ display: 'flex', gap: 8, padding: '12px 20px 0' }}>
      {wa && (
        <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" onClick={() => log('WhatsApp')} style={btn('#25D366')}>
          <MessageCircle size={16}/>{t('quickActions.whatsapp')}
        </a>
      )}
      {ig && (
        <a href={`https://instagram.com/${ig}`} onClick={openInstagram} style={btn('#E1306C')}>
          <Instagram size={16}/>{t('quickActions.instagram')}
        </a>
      )}
      {tel && (
        <a href={`tel:+${tel}`} onClick={() => log('Llamar')} style={btn('#60A5FA')}>
          <Phone size={16}/>{t('quickActions.call')}
        </a>
      )}
    </div>
  )
}
