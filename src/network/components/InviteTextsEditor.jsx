// Plantillas › Textos de la invitación a la red (064, Dirección).
// Cambia lo que dice la página de invitación y los mensajes A/B de
// WhatsApp, por idioma. Lo vacío usa el texto original de content.js.
// Se guarda en app_settings 'influencer_invite_texts'.
import React, { useEffect, useState } from 'react'
import { ChevronDown, ChevronUp, RotateCcw } from 'lucide-react'
import { t } from '../../i18n/index.js'
import { dbGetInviteTexts, dbSaveInviteTexts } from '../../lib/database.js'
import { COPY, EDITABLE, LANGS } from '../../invite/content.js'
import { toast } from './Toaster.jsx'

// Nombre de cada campo, para que se entienda qué se está cambiando.
const LABEL = {
  kicker: 'Etiqueta de arriba', hello: 'Saludo', lead: 'Frase de bienvenida (con ciudad)', leadNoCity: 'Frase de bienvenida (sin ciudad)',
  gainLbl: 'Etiqueta', gainTitleA: 'Título, línea 1', gainTitleB: 'Título, línea 2 (brilla)',
  card1t: 'Tarjeta 1 · título', card1s: 'Tarjeta 1 · texto', card2t: 'Tarjeta 2 · título', card2s: 'Tarjeta 2 · texto',
  card3t: 'Tarjeta 3 · título', card3s: 'Tarjeta 3 · texto', card4t: 'Tarjeta 4 · título', card4s: 'Tarjeta 4 · texto',
  card5t: 'Tarjeta 5 · título', card5s: 'Tarjeta 5 · texto',
  howLbl: 'Etiqueta', howTitleA: 'Título, línea 1', howTitleB: 'Título, línea 2 (brilla)',
  step1t: 'Paso 1', step1s: 'Paso 1 · detalle', step2t: 'Paso 2', step2s: 'Paso 2 · detalle',
  step3t: 'Paso 3', step3s: 'Paso 3 · detalle', step4t: 'Paso 4', step4s: 'Paso 4 · detalle',
  chooseT: 'Frase destacada', chooseS: 'Frase destacada · debajo',
  askLbl: 'Etiqueta', askTitleA: 'Título', askTitleB: 'Título (brilla)', ask1: 'Pedido 1', ask2: 'Pedido 2', ask3: 'Pedido 3', ask4: 'Pedido 4',
  joinLbl: 'Etiqueta', joinTitleA: 'Título, línea 1', joinTitleB: 'Título, línea 2 (brilla)', consent: 'Casilla de consentimiento',
  privacy: 'Aviso de privacidad', joinBtn: 'Botón para sumarse', fab: 'Botón flotante',
  doneKick: 'Final · etiqueta', doneTitle: 'Final · título (sigue el nombre)', doneText: 'Final · texto',
  declineTitle: '"Ahora no" · título', declineText: '"Ahora no" · texto', underTitle: 'Menor de 18 · título', underText: 'Menor de 18 · texto',
  waA: 'Mensaje A', waB: 'Mensaje B', doubtsMsg: 'Mensaje de "Tengo dudas"',
}
const KEEP = { nombre: '{nombre}', ciudad: '{ciudad}', link: '{link}', city: '{city}' }

const box = { padding: '9px 11px', borderRadius: 9, fontSize: 13, width: '100%', lineHeight: 1.45, fontFamily: 'inherit',
  background: 'rgba(139,92,246,0.07)', color: 'var(--text-primary)', border: '1px solid var(--border-violet)', outline: 'none', resize: 'vertical' }

export default function InviteTextsEditor() {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState(null)
  const [lang, setLang] = useState('es')
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (open && value === null) dbGetInviteTexts().then(v => setValue(v || {})).catch(() => setValue({})) }, [open, value])

  const cur = (k) => value?.[lang]?.[k] ?? ''
  const setKey = (k, v) => setValue(p => ({ ...p, [lang]: { ...(p?.[lang] || {}), [k]: v } }))
  const setContact = (v) => setValue(p => ({ ...p, contact: { ...(p?.contact || {}), whatsapp: v.replace(/[^0-9]/g, '') } }))

  const save = async () => {
    setSaving(true)
    try {
      // Se guardan solo los campos con texto.
      const clean = { contact: { whatsapp: value?.contact?.whatsapp || '' } }
      for (const l of LANGS) {
        const o = Object.fromEntries(Object.entries(value?.[l] || {}).filter(([, v]) => typeof v === 'string' && v.trim()))
        if (Object.keys(o).length) clean[l] = o
      }
      await dbSaveInviteTexts(clean)
      setValue(clean)
      toast(t('invite.texts.saved'))
    } catch (e) { toast(e.message) }
    finally { setSaving(false) }
  }

  return (
    <div style={{ borderRadius: 14, background: 'var(--glass-bg)', border: '1px solid var(--border-violet)' }}>
      <button onClick={() => setOpen(o => !o)} aria-expanded={open} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '12px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', color: 'var(--text-primary)' }}>
        <span style={{ flex: 1 }}>
          <span style={{ display: 'block', fontSize: 14, fontWeight: 700 }}>{t('invite.texts.title')}</span>
          <span style={{ display: 'block', fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{t('invite.texts.hint')}</span>
        </span>
        {open ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
      </button>

      {open && (value === null ? (
        <div style={{ padding: '0 14px 14px', fontSize: 12, color: 'var(--text-secondary)' }}>{t('loading.generic')}</div>
      ) : (
        <div style={{ padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label htmlFor="iv-contact" style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)' }}>{t('invite.texts.contact')}</label>
            <input id="iv-contact" inputMode="numeric" value={value?.contact?.whatsapp || ''} onChange={e => setContact(e.target.value)} placeholder="5493415550000" style={{ ...box, marginTop: 4, resize: 'none' }}/>
            <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 4 }}>{t('invite.texts.contactHint')}</div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div role="group" aria-label="Idioma" style={{ display: 'flex', gap: 2, padding: 2, borderRadius: 9, border: '1px solid var(--border-violet)' }}>
              {LANGS.map(l => (
                <button key={l} onClick={() => setLang(l)} aria-pressed={lang === l}
                  style={{ fontSize: 11, fontWeight: 700, padding: '6px 10px', borderRadius: 7, cursor: 'pointer', border: 'none', background: lang === l ? 'var(--primary-violet)' : 'transparent', color: lang === l ? 'white' : 'var(--text-secondary)' }}>{l.toUpperCase()}</button>
              ))}
            </div>
            <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{t('invite.texts.vars', KEEP)}</span>
          </div>

          {EDITABLE.map(([group, keys]) => (
            <details key={group} style={{ borderTop: '1px solid var(--border-violet)', paddingTop: 10 }}>
              <summary style={{ cursor: 'pointer', fontSize: 12, fontWeight: 700, color: 'var(--primary-violet-light)' }}>{t(`invite.texts.groups.${group}`)}</summary>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
                {keys.map(k => {
                  const long = String(COPY[lang][k] || '').length > 60
                  return (
                    <div key={k}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <label htmlFor={`iv-${lang}-${k}`} style={{ flex: 1, fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>{LABEL[k] || k}</label>
                        {cur(k) && <button onClick={() => setKey(k, '')} title={t('invite.texts.restore')} aria-label={t('invite.texts.restore')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 2 }}><RotateCcw size={12}/></button>}
                      </div>
                      <textarea id={`iv-${lang}-${k}`} rows={long ? 3 : 1} value={cur(k)} placeholder={COPY[lang][k]} onChange={e => setKey(k, e.target.value)} style={box}/>
                    </div>
                  )
                })}
              </div>
            </details>
          ))}

          <button onClick={save} disabled={saving} style={{ alignSelf: 'flex-start', padding: '9px 16px', borderRadius: 10, border: 'none', background: 'var(--primary-violet)', color: 'white', fontWeight: 700, fontSize: 13, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? t('loading.generic') : t('invite.texts.save')}
          </button>
        </div>
      ))}
    </div>
  )
}
