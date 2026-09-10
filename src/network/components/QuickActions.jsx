import React from 'react'
import { MessageCircle, Instagram, Phone, FileText } from 'lucide-react'
import { t } from '../../i18n/index.js'

const Btn = ({ href, onClick, icon: Icon, label, color }) => (
  <a
    href={href}
    onClick={onClick}
    target={href?.startsWith('http') ? '_blank' : undefined}
    rel="noopener noreferrer"
    style={{
      display: 'flex', alignItems: 'center', gap: 4,
      padding: '5px 9px', borderRadius: 8, fontSize: 11, fontWeight: 600,
      background: `${color}15`, color, border: `1px solid ${color}30`,
      textDecoration: 'none', whiteSpace: 'nowrap', cursor: 'pointer',
      transition: 'background 0.15s',
    }}
    onMouseEnter={e => e.currentTarget.style.background = `${color}28`}
    onMouseLeave={e => e.currentTarget.style.background = `${color}15`}
  >
    <Icon size={11}/>{label}
  </a>
)

export default function QuickActions({ whatsapp, instagram, phone, onNote, onContact }) {
  const wa = whatsapp?.replace(/[+\s\-()]/g, '')

  const handleInstagram = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (onContact) onContact('Instagram')
    window.location.href = `instagram://user?username=${instagram}`
    setTimeout(() => window.open(`https://instagram.com/${instagram}`, '_blank'), 900)
  }

  const handleWhatsApp = (e) => {
    e.stopPropagation()
    if (onContact) onContact('WhatsApp')
  }

  const handleCall = (e) => {
    e.stopPropagation()
    if (onContact) onContact('Llamar')
  }

  const handleNote = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (onNote) onNote()
  }

  const hasAny = wa || instagram || phone || onNote
  if (!hasAny) return null

  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {wa       && <Btn href={`https://wa.me/${wa}`}  onClick={handleWhatsApp} icon={MessageCircle} label={t('quickActions.whatsapp')} color="#25D366"/>}
      {instagram && <Btn href="#" onClick={handleInstagram} icon={Instagram} label={t('quickActions.instagram')} color="#E1306C"/>}
      {phone    && <Btn href={`tel:${phone}`}          onClick={handleCall}    icon={Phone}         label={t('quickActions.call')}      color="#60A5FA"/>}
      {onNote   && <Btn href="#" onClick={handleNote}                          icon={FileText}      label={t('quickActions.note')}      color="#A78BFA"/>}
    </div>
  )
}
