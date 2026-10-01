import React, { useState, useEffect } from 'react'
import { X, Copy, Check, MessageCircle } from 'lucide-react'
import { t } from '../../i18n/index.js'
import { dbGetMessageTemplates } from '../../lib/database.js'

// Reemplaza los marcadores. Es del lado del cliente a propósito: así la
// misma función sirve para la vista previa mientras se escribe la
// plantilla, sin ir a la base por cada tecla.
export const renderTemplate = (body, { entity = {}, cityName = '', me = '' } = {}) => {
  const full  = entity.name || ''
  const first = full.split(' ')[0] || ''
  return (body || '')
    .replace(/\{nombre_completo\}/g, full)
    .replace(/\{nombre\}/g,          first)
    .replace(/\{marca\}/g,           full)
    .replace(/\{ciudad\}/g,          cityName || '')
    .replace(/\{usuario\}/g,         entity.username || entity.instagram || '')
    .replace(/\{yo\}/g,              me || '')
}

// navigator.clipboard existe solo en contextos seguros. En producción
// (https) anda siempre; en una prueba local por http, no. El fallback
// evita que el botón parezca roto justo cuando alguien lo está probando.
const copyText = async (text) => {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    try {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      const ok = document.execCommand('copy')
      document.body.removeChild(ta)
      return ok
    } catch { return false }
  }
}

export default function MessageSheet({ open, onClose, entity, entityType, cityName, me }) {
  const [templates, setTemplates] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [copied,    setCopied]    = useState(null)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    dbGetMessageTemplates({ target: entityType, stage: entity?.relationshipStatus, cityId: entity?.cityId })
      .then(setTemplates)
      .catch(() => setTemplates([]))
      .finally(() => setLoading(false))
  }, [open, entityType, entity?.relationshipStatus, entity?.cityId])

  if (!open) return null

  const wa = (entity?.whatsapp || entity?.phone || '').replace(/[^0-9]/g, '')

  const handleCopy = async (tpl) => {
    const ok = await copyText(renderTemplate(tpl.body, { entity, cityName, me }))
    if (ok) {
      setCopied(tpl.id)
      setTimeout(() => setCopied(null), 1600)
    }
  }

  return (
    <div
      onClick={onClose}
      style={{ position:'fixed', inset:0, zIndex:400, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'flex-end', justifyContent:'center' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width:'100%', maxWidth:480, margin:12, maxHeight:'80vh', overflowY:'auto',
          borderRadius:18, padding:16,
          background:'var(--bg-secondary, #16131f)', border:'1px solid var(--border-violet)',
          animation:'slideUp var(--dur-base, 0.25s) ease both',
        }}
      >
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10, marginBottom:12 }}>
          <div style={{ fontSize:14, fontWeight:700, color:'var(--text-primary)' }}>{t('messages.title')}</div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-secondary)', padding:2 }}>
            <X size={17}/>
          </button>
        </div>

        {loading ? (
          <div style={{ padding:'24px 0', textAlign:'center', fontSize:12, color:'var(--text-secondary)' }}>
            {t('loading.generic')}
          </div>
        ) : templates.length === 0 ? (
          <div style={{ padding:'20px 4px', fontSize:12, color:'var(--text-secondary)', lineHeight:1.5 }}>
            {t('messages.emptyForEntity')}
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {templates.map(tpl => {
              const text = renderTemplate(tpl.body, { entity, cityName, me })
              return (
                <div key={tpl.id} style={{ borderRadius:12, border:'1px solid var(--border-violet)', background:'rgba(139,92,246,0.05)', padding:'11px 13px' }}>
                  <div style={{ fontSize:11, fontWeight:700, color:'var(--primary-violet-light)', textTransform:'uppercase', letterSpacing:0.6, marginBottom:6 }}>
                    {tpl.title}
                  </div>
                  <div style={{ fontSize:13, color:'var(--text-primary)', lineHeight:1.5, whiteSpace:'pre-wrap', marginBottom:10 }}>
                    {text}
                  </div>
                  <div style={{ display:'flex', gap:7, flexWrap:'wrap' }}>
                    <button
                      onClick={() => handleCopy(tpl)}
                      style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, fontWeight:600, padding:'5px 11px', borderRadius:8, cursor:'pointer',
                               color: copied === tpl.id ? '#34D399' : 'var(--text-secondary)',
                               background: copied === tpl.id ? 'rgba(52,211,153,0.12)' : 'rgba(139,92,246,0.08)',
                               border: `1px solid ${copied === tpl.id ? 'rgba(52,211,153,0.3)' : 'var(--border-violet)'}` }}
                    >
                      {copied === tpl.id ? <Check size={12}/> : <Copy size={12}/>}
                      {t(copied === tpl.id ? 'messages.copied' : 'messages.copy')}
                    </button>

                    {/* wa.me acepta el texto en la URL, así que WhatsApp se
                        abre con el mensaje ya escrito. Es un toque en vez
                        de copiar, cambiar de app y pegar. */}
                    {wa && (
                      <a
                        href={`https://wa.me/${wa}?text=${encodeURIComponent(text)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, fontWeight:600, padding:'5px 11px', borderRadius:8, textDecoration:'none',
                                 color:'#25D366', background:'rgba(37,211,102,0.1)', border:'1px solid rgba(37,211,102,0.3)' }}
                      >
                        <MessageCircle size={12}/>{t('messages.sendWhatsApp')}
                      </a>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
