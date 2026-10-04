// Ficha de influencer · invitación a la red (064).
// Crea el link (o reusa el vigente), lo manda por WhatsApp con el mensaje
// A o B, muestra el estado y "Lo que contó" la influencer. Lo que declara
// distinto a la ficha se puede pasar con un toque; nunca se pisa solo.
import React, { useEffect, useState } from 'react'
import { MessageCircle, Copy, Check, Link2, Eye, CheckCircle2, Clock, XCircle, AlertTriangle, MinusCircle } from 'lucide-react'
import { t } from '../../i18n/index.js'
import { dbListInfluencerInvites, dbEnsureInfluencerInvite, dbCloseInfluencerInvite, dbExtendInfluencerInvite, dbGetInviteTexts, inviteStateOf, inviteIsOpen } from '../../lib/database.js'
import { PARTNERS_URL } from '../../partners/content.js'
import { COPY, inviteMessage } from '../../invite/content.js'
import { toast } from './Toaster.jsx'

const LANGS = ['es', 'en', 'pt']
const btn = { display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, padding: '8px 12px', borderRadius: 9, cursor: 'pointer', whiteSpace: 'nowrap', minHeight: 36 }
const soft = { ...btn, background: 'rgba(139,92,246,0.08)', border: '1px solid var(--border-violet)', color: 'var(--text-secondary)' }
const fmt = (d) => d ? new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : ''
export const inviteLink = (i) => `${PARTNERS_URL}/i/${i.token}`
const digits = (s) => String(s || '').replace(/[^0-9]/g, '')

const LOOK = {
  sent:     { color: '#A78BFA', Icon: Link2 },
  viewed:   { color: '#FBBF24', Icon: Eye },
  joined:   { color: '#34D399', Icon: CheckCircle2 },
  declined: { color: '#9CA3AF', Icon: MinusCircle },
  underage: { color: '#F87171', Icon: AlertTriangle },
  expired:  { color: '#F87171', Icon: Clock },
  closed:   { color: '#9CA3AF', Icon: XCircle },
}

export default function InviteCard({ influencer, cityName = '', cities = [], onApply }) {
  const [list, setList] = useState(undefined)
  const [texts, setTexts] = useState(null)
  const [lang, setLang] = useState('es')
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(null)

  const reload = () => dbListInfluencerInvites(influencer.id).then(setList).catch(() => setList([]))
  useEffect(() => { reload(); dbGetInviteTexts().then(setTexts).catch(() => setTexts({})) }, [influencer.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const wa = digits(influencer.whatsapp || influencer.phone)
  const message = (i) => inviteMessage({ lang: i.lang, variant: i.variant, name: influencer.name, city: cityName, link: inviteLink(i), overrides: texts })

  const create = async () => {
    setBusy(true)
    try { await dbEnsureInfluencerInvite(influencer.id, lang); await reload() }
    catch (e) { toast(e.message) }
    finally { setBusy(false) }
  }
  const copy = async (i) => {
    try { await navigator.clipboard.writeText(message(i)); setCopied(i.id); setTimeout(() => setCopied(null), 1500) } catch { window.prompt('', message(i)) }
  }
  const close = async (i) => {
    if (!window.confirm(t('invite.closeConfirm'))) return
    try { await dbCloseInfluencerInvite(i.id); await reload() } catch (e) { toast(e.message) }
  }
  const extend = async (i) => {
    try { await dbExtendInfluencerInvite(i.id); await reload(); toast(t('invite.extended')) } catch (e) { toast(e.message) }
  }
  const apply = (field, value) => { onApply?.(field, value); toast(t('invite.applied')) }

  if (list === undefined) return <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t('loading.generic')}</div>

  const active = list.find(i => inviteIsOpen(i) && i.status !== 'joined' && i.status !== 'underage')
  const catLabel = (k) => COPY.es.categories[k] || k
  const cityIdByName = (n) => cities.find(c => (c.name || '').trim().toLowerCase() === String(n || '').split(',')[0].trim().toLowerCase())?.id

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{t('invite.hint')}</div>

      {!active && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <div role="group" aria-label="Idioma" style={{ display: 'flex', gap: 2, padding: 2, borderRadius: 9, border: '1px solid var(--border-violet)' }}>
            {LANGS.map(l => (
              <button key={l} onClick={() => setLang(l)} aria-pressed={lang === l}
                style={{ fontSize: 11, fontWeight: 700, padding: '6px 10px', borderRadius: 7, cursor: 'pointer', border: 'none', background: lang === l ? 'var(--primary-violet)' : 'transparent', color: lang === l ? 'white' : 'var(--text-secondary)' }}>
                {l.toUpperCase()}
              </button>
            ))}
          </div>
          <button onClick={create} disabled={busy} style={{ ...btn, border: 'none', background: 'var(--primary-violet)', color: 'white' }}>
            <Link2 size={14}/>{busy ? t('loading.generic') : list.length ? t('invite.again') : t('invite.create')}
          </button>
        </div>
      )}

      {list.map(i => {
        const st = inviteStateOf(i)
        const look = LOOK[st] || LOOK.sent
        const open = inviteIsOpen(i)
        const a = i.answers || {}
        const fl = i.flags || {}
        const answered = ['joined', 'underage'].includes(i.status)
        const waClaim = fl.whatsapp_claim && digits(fl.whatsapp_claim).slice(-8) !== digits(influencer.whatsapp).slice(-8) ? fl.whatsapp_claim : null
        const claimCityId = fl.city_claim ? cityIdByName(fl.city_claim) : null
        const cityClaim = claimCityId && claimCityId !== influencer.cityId ? fl.city_claim : null
        return (
          <div key={i.id} style={{ padding: '12px 14px', borderRadius: 12, background: `${look.color}12`, border: `1px solid ${look.color}45`, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <look.Icon size={15} color={look.color}/>
              <b style={{ fontSize: 13, color: 'var(--text-primary)' }}>{t(`invite.status.${st}`, { n: i.viewCount })}</b>
              <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                · {i.lang.toUpperCase()} · {t('invite.variant', { v: i.variant.toUpperCase() })} · {t('invite.sentOn', { date: fmt(i.createdAt) })}
                {i.answeredAt ? ` · ${t('invite.answeredOn', { date: fmt(i.answeredAt) })}` : open ? ` · ${t('invite.expires', { date: fmt(i.expiresAt) })}` : ''}
              </span>
            </div>

            {answered && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.8 }}>{t('invite.told')}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '6px 14px', fontSize: 12 }}>
                  {a.categories?.length > 0 && <div style={{ gridColumn: '1 / -1' }}><span style={{ color: 'var(--text-secondary)' }}>{t('invite.f.categories')}: </span><span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{a.categories.map(catLabel).join(', ')}</span></div>}
                  {a.city && <div><span style={{ color: 'var(--text-secondary)' }}>{t('invite.f.city')}: </span><span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{a.city}</span></div>}
                  {a.age != null && <div><span style={{ color: 'var(--text-secondary)' }}>{t('invite.f.age')}: </span><span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{t('invite.ageValue', { n: a.age })}</span></div>}
                  {a.whatsapp && <div><span style={{ color: 'var(--text-secondary)' }}>{t('invite.f.whatsapp')}: </span><span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{a.whatsapp}</span></div>}
                  {a.instagram_ok && influencer.instagram && <div><span style={{ color: 'var(--text-secondary)' }}>{t('invite.f.instagram')}: </span><span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{t('invite.igOk', { ig: String(influencer.instagram).replace(/^@/, '') })}</span></div>}
                </div>
                {fl.filled?.length > 0 && <div style={{ fontSize: 11, color: '#6EE7B7' }}>{t('invite.filled', { f: fl.filled.map(k => t(`invite.f.${k}`)).join(', ') })}</div>}

                {[
                  waClaim && { text: t('invite.claimWa', { v: waClaim }), act: () => apply('whatsapp', waClaim) },
                  cityClaim && { text: t('invite.claimCity', { v: cityClaim }), act: () => apply('cityId', claimCityId) },
                  fl.instagram_mismatch && { text: t('invite.claimIg', { v: fl.instagram_mismatch }) },
                  fl.city_unmatched && !influencer.cityId && { text: t('invite.cityUnmatched', { v: fl.city_unmatched }) },
                ].filter(Boolean).map((c, k) => (
                  <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '8px 10px', borderRadius: 10, background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.3)' }}>
                    <AlertTriangle size={14} color="#FCD34D"/>
                    <span style={{ flex: 1, minWidth: 180, fontSize: 12, color: 'var(--text-primary)' }}>{c.text}</span>
                    {c.act && <button onClick={c.act} style={{ ...btn, minHeight: 30, padding: '5px 10px', border: 'none', background: 'var(--primary-violet)', color: 'white' }}>{t('invite.useIt')}</button>}
                  </div>
                ))}
                {i.status === 'joined' && <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{t('invite.clubHint')}</div>}
                {i.status === 'underage' && <div style={{ fontSize: 11, color: '#FCA5A5' }}>{t('invite.underageHint')}</div>}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {open && i.status !== 'underage' && (
                <>
                  {i.status !== 'joined' && (
                    <a href={`https://wa.me/${wa}?text=${encodeURIComponent(message(i))}`} target="_blank" rel="noopener noreferrer"
                      style={{ ...btn, textDecoration: 'none', color: '#062b14', background: '#25D366' }}>
                      <MessageCircle size={14}/>{wa ? t('invite.sendWa') : t('invite.shareWa')}
                    </a>
                  )}
                  <button onClick={() => copy(i)} style={soft}>{copied === i.id ? <Check size={14}/> : <Copy size={14}/>}{copied === i.id ? t('invite.copied') : t('invite.copy')}</button>
                  {i.status !== 'joined' && <button onClick={() => close(i)} style={soft}>{t('invite.close')}</button>}
                </>
              )}
              {!open && i.status !== 'closed' && !answered && <button onClick={() => extend(i)} style={soft}><Clock size={14}/>{t('invite.extend')}</button>}
            </div>
          </div>
        )
      })}
    </div>
  )
}
