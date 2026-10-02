// Marca · propuesta privada en partners.resilio.company (059).
// Crea el link, lo manda por WhatsApp o se copia, y muestra qué eligió
// la marca y qué respondió. Sin precios: eso va por privado.
import React, { useEffect, useState } from 'react'
import { MessageCircle, Copy, Check, Link2, Eye, ExternalLink, CheckCircle2, Clock, XCircle } from 'lucide-react'
import { t } from '../../i18n/index.js'
import { dbCreateBrandProposal, dbListBrandProposals, dbCloseBrandProposal, dbExtendBrandProposal } from '../../lib/database.js'
import { PARTNERS_URL, OPTION_KEYS, answerLabel, planLabel } from '../../partners/content.js'
import { toast } from './Toaster.jsx'

const LANGS = ['es', 'en', 'pt']
const btn = { display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, padding: '8px 12px', borderRadius: 9, cursor: 'pointer', whiteSpace: 'nowrap', minHeight: 36 }
const soft = { ...btn, background: 'rgba(139,92,246,0.08)', border: '1px solid var(--border-violet)', color: 'var(--text-secondary)' }
const fmt = (d) => d ? new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : ''

const linkOf = (p) => `${PARTNERS_URL}/p/${p.token}`
const isExpired = (p) => new Date(p.expiresAt) < new Date()

function stateOf(p) {
  if (p.status === 'closed') return { key: 'closed', color: '#9CA3AF', Icon: XCircle }
  if (p.answeredAt) return { key: 'answered', color: '#34D399', Icon: CheckCircle2 }
  if (isExpired(p)) return { key: 'expired', color: '#F87171', Icon: Clock }
  if (p.viewCount > 0) return { key: 'viewed', color: '#FBBF24', Icon: Eye }
  return { key: 'sent', color: '#A78BFA', Icon: Link2 }
}

export default function ProposalCard({ brand }) {
  const [list, setList] = useState(undefined)
  const [lang, setLang] = useState('es')
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(null)

  const reload = () => dbListBrandProposals(brand.id).then(setList).catch(() => setList([]))
  useEffect(() => { reload() }, [brand.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const wa = String(brand.whatsapp || '').replace(/[^0-9]/g, '')
  const message = (p) => t('proposal.message', { marca: brand.name || '', link: linkOf(p) })

  const create = async () => {
    setBusy(true)
    try { await dbCreateBrandProposal(brand.id, brand.name, lang); await reload(); toast(t('proposal.created')) }
    catch (e) { toast(e.message) }
    finally { setBusy(false) }
  }
  const copy = async (p) => {
    try { await navigator.clipboard.writeText(message(p)); setCopied(p.id); setTimeout(() => setCopied(null), 1500) } catch { toast(linkOf(p)) }
  }
  const close = async (p) => {
    if (!window.confirm(t('proposal.closeConfirm'))) return
    try { await dbCloseBrandProposal(p.id); await reload() } catch (e) { toast(e.message) }
  }
  const extend = async (p) => {
    try { await dbExtendBrandProposal(p.id); await reload(); toast(t('proposal.extended')) } catch (e) { toast(e.message) }
  }

  if (list === undefined) return <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t('loading.generic')}</div>

  const active = list.find(p => p.status !== 'closed' && !isExpired(p))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{t('proposal.hint')}</div>

      {/* Nuevo link */}
      {!active && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <div role="group" aria-label={t('proposal.lang')} style={{ display: 'flex', gap: 2, padding: 2, borderRadius: 9, border: '1px solid var(--border-violet)' }}>
            {LANGS.map(l => (
              <button key={l} onClick={() => setLang(l)} aria-pressed={lang === l}
                style={{ fontSize: 11, fontWeight: 700, padding: '6px 10px', borderRadius: 7, cursor: 'pointer', border: 'none', background: lang === l ? 'var(--primary-violet)' : 'transparent', color: lang === l ? 'white' : 'var(--text-secondary)' }}>
                {l.toUpperCase()}
              </button>
            ))}
          </div>
          <button onClick={create} disabled={busy} style={{ ...btn, border: 'none', background: 'var(--primary-violet)', color: 'white' }}>
            <Link2 size={14}/>{busy ? t('loading.generic') : list.length ? t('proposal.again') : t('proposal.create')}
          </button>
        </div>
      )}

      {/* Links enviados */}
      {list.map(p => {
        const st = stateOf(p)
        const open = p.status !== 'closed' && !isExpired(p)
        const a = p.answers || {}
        return (
          <div key={p.id} style={{ padding: '12px 14px', borderRadius: 12, background: `${st.color}12`, border: `1px solid ${st.color}45`, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <st.Icon size={15} color={st.color}/>
              <b style={{ fontSize: 13, color: 'var(--text-primary)' }}>
                {t(`proposal.status.${st.key}`, { n: p.viewCount, plan: planLabel(p.chosenPlan) })}
              </b>
              <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                · {p.lang.toUpperCase()} · {t('proposal.sentOn', { date: fmt(p.createdAt) })}
                {p.answeredAt ? ` · ${t('proposal.answeredOn', { date: fmt(p.answeredAt) })}` : open ? ` · ${t('proposal.expires', { date: fmt(p.expiresAt) })}` : ''}
              </span>
            </div>

            {p.answeredAt && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '6px 14px', fontSize: 12 }}>
                {Object.keys(OPTION_KEYS).filter(k => a[k]).map(k => (
                  <div key={k}><span style={{ color: 'var(--text-secondary)' }}>{t(`proposal.q.${k}`)}: </span><span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{answerLabel(k, a[k])}</span></div>
                ))}
                {a.notes && <div style={{ gridColumn: '1 / -1', color: 'var(--text-primary)' }}><span style={{ color: 'var(--text-secondary)' }}>{t('proposal.q.notes')}: </span>“{a.notes}”</div>}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {open && (
                <>
                  <a href={`https://wa.me/${wa}?text=${encodeURIComponent(message(p))}`} target="_blank" rel="noopener noreferrer"
                    style={{ ...btn, textDecoration: 'none', color: '#062b14', background: '#25D366' }}>
                    <MessageCircle size={14}/>{wa ? t('proposal.sendWa') : t('proposal.shareWa')}
                  </a>
                  <button onClick={() => copy(p)} style={soft}>{copied === p.id ? <Check size={14}/> : <Copy size={14}/>}{copied === p.id ? t('proposal.copied') : t('proposal.copy')}</button>
                  <a href={linkOf(p)} target="_blank" rel="noopener noreferrer" style={{ ...soft, textDecoration: 'none' }}><ExternalLink size={14}/>{t('proposal.open')}</a>
                  <button onClick={() => close(p)} style={soft}>{t('proposal.close')}</button>
                </>
              )}
              {!open && p.status !== 'closed' && <button onClick={() => extend(p)} style={soft}><Clock size={14}/>{t('proposal.extend')}</button>}
            </div>
          </div>
        )
      })}
    </div>
  )
}
