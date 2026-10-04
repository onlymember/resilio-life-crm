// partners.resilio.company/i/<token> — invitación a la red de creadores (064).
// La influencer ve qué es Resilio, confirma 4 datos y toca "Me sumo".
// Sin cuenta ni contraseña. Textos en content.js (editables desde Network).
import React, { useEffect, useMemo, useRef, useState } from 'react'
import './invite.css'
import { COPY, LANGS, CATEGORY_KEYS, textsFor, fill, guessLang } from './content.js'
import { readInviteToken, getInvite, respondInvite } from './api.js'

const PRIVACY_URL = 'https://club.resilio.company/privacidad'
const IG_DM = 'https://ig.me/m/resilio.life'

const Arrow = ({ down }) => (
  <svg className="arr" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {down ? <path d="M12 5v14M6 13l6 6 6-6"/> : <path d="M5 12h14M13 6l6 6-6 6"/>}
  </svg>
)
const Tick = ({ size = 16, w = 1.5 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>
)
const ICONS = [
  <path key="1" d="M8 12l2.5 2.5L16 9M12 21a9 9 0 100-18 9 9 0 000 18z"/>,
  <path key="2" d="M12 3l2.4 5.6L20 9.3l-4.3 3.9 1.2 5.8L12 16l-4.9 3 1.2-5.8L4 9.3l5.6-.7z"/>,
  <path key="3" d="M9 18V5l12-2v13M9 18a3 3 0 11-6 0 3 3 0 016 0zM21 16a3 3 0 11-6 0 3 3 0 016 0z"/>,
  <path key="4" d="M9 11.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM2.5 20a6.5 6.5 0 0113 0M17 11.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM15 20a5 5 0 016.5-4.7"/>,
  <path key="5" d="M9 2h6a3 3 0 013 3v14a3 3 0 01-3 3H9a3 3 0 01-3-3V5a3 3 0 013-3zM11 18h2"/>,
]
const GLOWS = ['#7C5CF6', '#C978F0', '#5B8CFF', '#9D86FF', '#E7B6F5']
const DUST = [[8, 14, 0], [22, 18, -4], [35, 12, -8], [51, 20, -2], [64, 15, -11], [77, 17, -6], [90, 13, -9], [15, 16, -3], [44, 19, -7], [70, 14, -5]]
const SPARKS = [[-90, -60, 0], [85, -75, .3], [-75, 75, .6], [95, 55, .9], [0, -105, .45], [-105, 5, 1.1], [105, -5, 1.3]]

// Fuente, fondo oscuro, título e idioma del documento.
function usePage(lang, title) {
  useEffect(() => {
    if (!document.getElementById('iv-font')) {
      const l = document.createElement('link')
      l.id = 'iv-font'; l.rel = 'stylesheet'
      l.href = 'https://fonts.googleapis.com/css2?family=Sora:wght@200;300;400;600&family=Manrope:wght@300;400;500;600&display=swap'
      document.head.appendChild(l)
    }
    document.documentElement.classList.add('iv-root')
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', '#06040C')
    let robots = document.querySelector('meta[name="robots"]')
    if (!robots) { robots = document.createElement('meta'); robots.name = 'robots'; document.head.appendChild(robots) }
    robots.content = 'noindex, nofollow'
  }, [])
  useEffect(() => { document.documentElement.lang = lang; document.title = title }, [lang, title])
}

// Animaciones con el scroll: aparición de bloques, barra de lectura,
// el saludo que se aleja y el botón flotante que se esconde en el formulario.
function useMotion(rootRef, ready) {
  useEffect(() => {
    if (!ready) return
    const root = rootRef.current
    if (!root) return
    const els = [...root.querySelectorAll('.iv-rv, .iv-mask, .iv-rail, .iv-form')]
    let io
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver((entries) => {
        entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('on'); io.unobserve(en.target) } })
      }, { rootMargin: '0px 0px -10% 0px', threshold: 0.12 })
      els.forEach(e => io.observe(e))
    } else els.forEach(e => e.classList.add('on'))

    let raf = 0
    const tick = () => {
      raf = 0
      const h = document.documentElement
      const max = Math.max(1, h.scrollHeight - window.innerHeight)
      const y = window.scrollY
      root.style.setProperty('--sp', String(Math.min(1, y / max)))
      root.style.setProperty('--hy', String(Math.min(1, y / (window.innerHeight * 0.75))))
    }
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(tick) }
    tick()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => { io?.disconnect(); window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); if (raf) cancelAnimationFrame(raf) }
  }, [ready, rootRef])
}

// Guardar el avance: si cierra y vuelve a abrir el link, sigue donde quedó.
const saveKey = (token) => `resilio.invite.${token}`
const loadDraft = (token) => { try { return JSON.parse(localStorage.getItem(saveKey(token)) || 'null') } catch { return null } }
const saveDraft = (token, v) => { try { localStorage.setItem(saveKey(token), JSON.stringify(v)) } catch { /* sin almacenamiento */ } }

export default function InviteApp() {
  const token = useMemo(() => readInviteToken(), [])
  const [data, setData] = useState(null)              // null = cargando
  const [lang, setLang] = useState(() => guessLang() || 'es')
  const [phase, setPhase] = useState('form')          // form | joined | declined | underage
  const [f, setF] = useState(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [fabHidden, setFabHidden] = useState(false)
  const [card, setCard] = useState(0)
  const rootRef = useRef(null)
  const cardsRef = useRef(null)
  const formRef = useRef(null)

  const T = textsFor(lang, data?.texts)
  const name = data?.first_name || ''
  usePage(lang, name ? `${name} · Resilio` : 'Resilio')
  useMotion(rootRef, !!data?.ok)

  useEffect(() => {
    if (!token) { setData({ ok: false, reason: 'not_found' }); return }
    getInvite(token).then(d => {
      setData(d)
      if (!d?.ok) return
      if (!guessLang() && d.lang) setLang(d.lang)
      const draft = loadDraft(token)
      setF({
        city: d.city || '', cats: d.categories?.length ? d.categories : [], waMode: d.whatsapp_end ? 'keep' : 'edit',
        wa: '', consent: false, igOk: true, ig: '', ...(draft || {}),
      })
      if (['joined', 'declined', 'underage'].includes(d.status)) setPhase(d.status)
    }).catch(() => setData({ ok: false, reason: 'error' }))
  }, [token])

  useEffect(() => { if (f && token) saveDraft(token, { ...f, consent: false }) }, [f, token])

  // El botón flotante se va cuando el formulario está a la vista.
  useEffect(() => {
    const el = formRef.current
    if (!el || !('IntersectionObserver' in window)) return
    const io = new IntersectionObserver(([en]) => setFabHidden(en.isIntersecting), { threshold: 0.05 })
    io.observe(el)
    return () => io.disconnect()
  }, [data?.ok, phase])

  // Tarjetas: giro 3D según la posición y punto activo.
  const onCards = () => {
    const box = cardsRef.current
    if (!box) return
    const mid = box.scrollLeft + box.clientWidth / 2
    let best = 0, bestD = Infinity
    ;[...box.children].forEach((c, i) => {
      const center = c.offsetLeft + c.offsetWidth / 2
      const d = (center - mid) / box.clientWidth
      if (Math.abs(d) < bestD) { bestD = Math.abs(d); best = i }
      c.style.setProperty('--ry', `${Math.max(-1, Math.min(1, d)) * -16}deg`)
      c.style.setProperty('--sc', String(1 - Math.min(0.08, Math.abs(d) * 0.08)))
    })
    setCard(best)
  }
  useEffect(() => { onCards() }, [data?.ok])

  const contactWa = String(data?.texts?.contact?.whatsapp || '').replace(/[^0-9]/g, '')
  const doubtsHref = contactWa ? `https://wa.me/${contactWa}?text=${encodeURIComponent(T.doubtsMsg)}` : IG_DM

  const set = (k, v) => setF(p => ({ ...p, [k]: v }))
  const toggleCat = (k) => setF(p => ({ ...p, cats: p.cats.includes(k) ? p.cats.filter(x => x !== k) : [...p.cats, k] }))
  const ready = f && f.consent && f.cats.length > 0 && (f.igOk || f.ig.trim())

  const errText = (e) => {
    const h = String(e?.hint || '')
    return T.errors[h] || T.errors.generic
  }

  const join = async () => {
    if (!ready || busy) return
    setBusy(true); setErr('')
    try {
      const r = await respondInvite(token, 'join', {
        city: f.city.trim(), categories: f.cats, consent: true, adult: true,
        whatsapp: f.waMode === 'edit' ? f.wa.trim() : '', instagram_ok: f.igOk, instagram: f.igOk ? '' : f.ig.trim(),
      })
      setPhase(r?.status || 'joined')
      window.scrollTo(0, 0)
    } catch (e) { setErr(errText(e)) }
    finally { setBusy(false) }
  }
  const decline = async () => {
    if (busy) return
    setBusy(true); setErr('')
    try { await respondInvite(token, 'decline', {}); setPhase('declined') }
    catch (e) { setErr(errText(e)) }
    finally { setBusy(false) }
  }

  // ── Cargando / link inválido ──
  if (!data) return <div className="iv"><div className="iv-center"><div className="iv-loader" aria-label={T.loading}/></div></div>
  if (!data.ok) {
    const expired = data.reason === 'expired'
    return (
      <div className="iv">
        <div className="iv-bg"><div className="iv-aurora"/><div className="iv-veil"/></div>
        <div className="iv-center">
          <div className="iv-brand" style={{ marginBottom: 28 }}>RESILIO</div>
          <h1 className="iv-h2 iv-in">{expired ? T.expiredTitle : T.notFoundTitle}</h1>
          <p className="iv-lead iv-in" style={{ animationDelay: '.2s', marginLeft: 'auto', marginRight: 'auto' }}>{expired ? T.expiredText : T.notFoundText}</p>
        </div>
      </div>
    )
  }

  const hello = name
    ? [...T.hello].map((c, i) => <span className="iv-ch" key={`h${i}`} style={{ animationDelay: `${0.35 + i * 0.06}s` }}>{c === ' ' ? ' ' : c}</span>)
    : null
  const nameChars = [...(name || T.hello.replace(/,$/, ''))].map((c, i) => (
    <span className="iv-ch" key={`n${i}`} style={{ animationDelay: `${0.8 + i * 0.08}s` }}>{c === ' ' ? ' ' : c}</span>
  ))
  const lead = data.city ? T.lead : T.leadNoCity
  const leadParts = lead.split('{city}')

  return (
    <div className="iv" ref={rootRef}>
      <div className="iv-prog" aria-hidden="true"/>
      <header className="iv-hdr">
        <div className="iv-col">
          <span className="iv-brand">RESILIO</span>
          <div className="iv-pills iv-in" style={{ animationDelay: '.3s' }}>
            <button className="iv-pill" aria-label={T.langLabel} onClick={() => setLang(LANGS[(LANGS.indexOf(lang) + 1) % LANGS.length])}>{lang.toUpperCase()}</button>
            <a className="iv-pill" href={doubtsHref} target="_blank" rel="noopener noreferrer">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 11.5a8.4 8.4 0 01-12.4 7.4L3 21l2.1-5.4A8.4 8.4 0 1121 11.5z"/></svg>
              {T.doubts}
            </a>
          </div>
        </div>
      </header>

      <div className="iv-bg" aria-hidden="true">
        <div className="iv-aurora"/><div className="iv-veil"/><div className="iv-grain"/>
        <div className="iv-dust">{DUST.map(([l, d, dl], i) => <i key={i} style={{ left: `${l}%`, animationDuration: `${d}s`, animationDelay: `${dl}s` }}/>)}</div>
      </div>

      {/* ── Hola ── */}
      <section className="iv-hero">
        <div className="iv-rings" aria-hidden="true">
          <div className="iv-ring r1"/><div className="iv-ring r2"/><div className="iv-ring r3"/>
          <div className="iv-sat"><i/></div><div className="iv-sat s2"><i/></div>
        </div>
        <div className="iv-col">
          <div className="iv-heroin">
            <div className="iv-logo" aria-hidden="true">
              <span className="iv-logo-wave"/><span className="iv-logo-wave w2"/>
              <span className="iv-logo-disc"><img src="/hub-mark.png" alt="" width="30" height="26"/></span>
            </div>
            <div className="iv-kick iv-in" style={{ animationDelay: '.45s' }}>{T.kicker}</div>
            <h1 className="iv-h1" aria-label={name ? `${T.hello} ${name}.` : T.hello}>
              {hello}{hello && <br/>}<span className="iv-name iv-lum">{nameChars}<span className="iv-ch" style={{ animationDelay: `${0.8 + (name || '').length * 0.08}s` }}>.</span></span>
            </h1>
            <p className="iv-lead iv-in" style={{ animationDelay: '1.25s' }}>
              {leadParts[0]}{data.city && <b>{data.city}</b>}{leadParts[1] || ''}
            </p>
            <div className="iv-hair"/>
            <div className="iv-marq iv-in" style={{ animationDelay: '1.6s' }} aria-hidden="true">
              <div className="iv-track">
                {[...T.ticker, ...T.ticker].map((w, i) => <React.Fragment key={i}><span>{w}</span><span className="sep"/></React.Fragment>)}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Qué ganás ── */}
      <section className="iv-sec" style={{ paddingTop: 0 }}>
        <div className="iv-col">
          <div className="iv-kick iv-rv">{T.gainLbl}</div>
          <h2 className="iv-h2">
            <span className="iv-mask"><span>{T.gainTitleA}</span></span>
            <span className="iv-mask"><span className="iv-lum">{T.gainTitleB}</span></span>
          </h2>
          <div className="iv-cards" ref={cardsRef} onScroll={onCards}>
            {[1, 2, 3, 4, 5].map((n, i) => (
              <div className="iv-card" key={n}>
                <div className="glow" style={{ background: GLOWS[i] }}/><div className="lines"/><div className="shim" style={{ animationDelay: `${i * 1.2}s` }}/>
                <div className="gi" style={{ animationDelay: `${-i}s` }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICONS[i]}</svg>
                </div>
                <span className="idx">{String(n).padStart(2, '0')}</span>
                <div className="t">{T[`card${n}t`]}</div>
                <div className="s">{T[`card${n}s`]}</div>
              </div>
            ))}
          </div>
          <div className="iv-dots" aria-hidden="true">{[0, 1, 2, 3, 4].map(i => <i key={i} className={i === card ? 'on' : ''}/>)}</div>
        </div>
      </section>

      {/* ── Cómo funciona ── */}
      <section className="iv-sec">
        <div className="iv-col">
          <div className="iv-kick iv-rv">{T.howLbl}</div>
          <h2 className="iv-h2">
            <span className="iv-mask"><span>{T.howTitleA}</span></span>
            <span className="iv-mask"><span className="iv-lum">{T.howTitleB}</span></span>
          </h2>
          <div className="iv-steps">
            <div className="iv-rail" aria-hidden="true"><i/><b/></div>
            {[1, 2, 3, 4].map(n => (
              <div className="iv-st iv-rv iv-l" key={n} style={{ transitionDelay: `${(n - 1) * 0.12}s` }}>
                <span className="n">{n}</span><b>{T[`step${n}t`]}</b><div>{T[`step${n}s`]}</div>
              </div>
            ))}
          </div>
          <div className="iv-note iv-glass iv-rv iv-s"><div className="q iv-lum">{T.chooseT}</div><div style={{ fontSize: 14, color: '#A79EC2', marginTop: 8, fontWeight: 300 }}>{T.chooseS}</div></div>
        </div>
      </section>

      {/* ── Qué te pedimos ── */}
      <section className="iv-sec">
        <div className="iv-col">
          {(T.askTitleA || T.askTitleB) ? (
            <>
              <div className="iv-kick iv-rv">{T.askLbl}</div>
              <h2 className="iv-h2">
                <span className="iv-mask"><span>{T.askTitleA} <span className="iv-lum">{T.askTitleB}</span></span></span>
              </h2>
            </>
          ) : (
            <h2 className="iv-h2"><span className="iv-mask"><span className="iv-lum">{T.askLbl}</span></span></h2>
          )}
          <div className="iv-asks">
            {[1, 2, 3, 4].map(n => (
              <div className="iv-ask iv-rv iv-l" key={n} style={{ transitionDelay: `${(n - 1) * 0.1}s` }}>
                <span className="k">{String(n).padStart(2, '0')}</span>{T[`ask${n}`]}<Tick/>
              </div>
            ))}
          </div>
          {T.askNote && <p className="iv-asknote iv-rv">{T.askNote}</p>}
        </div>
      </section>

      {/* ── ¿Te sumás? ── */}
      <section className="iv-sec" id="sumate" style={{ paddingBottom: 140 }}>
        <div className="iv-col">
          <div className="iv-kick iv-rv">{T.joinLbl}</div>
          <h2 className="iv-h2">
            <span className="iv-mask"><span>{T.joinTitleA}</span></span>
            <span className="iv-mask"><span className="iv-lum">{T.joinTitleB}</span></span>
          </h2>

          {f && (
            <div className="iv-form iv-glass iv-rv iv-s" ref={formRef}>
              <div className="iv-who">
                <div className="iv-av">{(name || '·').slice(0, 1)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 17, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{data.name || name}</div>
                  {data.instagram && f.igOk && <div style={{ fontSize: 13.5, color: '#B9AEDA', fontWeight: 300 }}>@{data.instagram}</div>}
                </div>
                {data.instagram && f.igOk && <span className="iv-ok"><Tick size={11} w={2.5}/>{T.isYou}</span>}
              </div>
              {data.instagram && (f.igOk
                ? <button className="iv-link" style={{ marginTop: -10 }} onClick={() => set('igOk', false)}>{T.notYou}</button>
                : (
                  <div className="iv-field">
                    <label className="iv-lbl" htmlFor="iv-ig">{T.igLabel}</label>
                    <input className="iv-inp" id="iv-ig" autoComplete="off" placeholder="@" value={f.ig} maxLength={60} onChange={e => set('ig', e.target.value)}/>
                  </div>
                ))}

              <div className="iv-field">
                <label className="iv-lbl" htmlFor="iv-city">{T.city}</label>
                <input className="iv-inp" id="iv-city" autoComplete="address-level2" placeholder={T.cityPh} value={f.city} maxLength={80} onChange={e => set('city', e.target.value)}/>
              </div>

              <div>
                <span className="iv-lbl" id="iv-cats">{T.cats}</span>
                <div className="iv-chips" role="group" aria-labelledby="iv-cats">
                  {CATEGORY_KEYS.map((k, i) => {
                    const on = f.cats.includes(k)
                    return (
                      <button key={k} className={`iv-chip${on ? ' on' : ''}`} style={{ animationDelay: `${0.2 + i * 0.05}s` }} aria-pressed={on} onClick={() => toggleCat(k)}>
                        <span className="tick"><Tick size={12} w={3}/></span>{(T.categories || COPY.es.categories)[k]}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                {f.waMode === 'keep' ? (
                  <div>
                    <span className="iv-lbl">{T.wa}</span>
                    <div className="iv-keep"><span style={{ color: '#C9C1DE' }}>{fill(T.waEnd, { end: data.whatsapp_end })}</span>
                      <button className="iv-link" onClick={() => set('waMode', 'edit')}>{T.waChange}</button></div>
                  </div>
                ) : (
                  <div className="iv-field">
                    <label className="iv-lbl" htmlFor="iv-wa">{T.wa}</label>
                    <input className="iv-inp" id="iv-wa" type="tel" inputMode="tel" autoComplete="tel" placeholder={T.waPh} value={f.wa} maxLength={30} onChange={e => set('wa', e.target.value)}/>
                  </div>
                )}
              </div>

              <label className="iv-check">
                <input type="checkbox" checked={f.consent} onChange={e => set('consent', e.target.checked)}/>
                <span>{T.consent}</span>
              </label>
              <div className="iv-priv">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flex: 'none', marginTop: 2 }} aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/></svg>
                <span>{T.privacy} <a href={PRIVACY_URL} target="_blank" rel="noopener noreferrer">{T.privacyLink}</a></span>
              </div>

              {err && <div className="iv-err" role="alert">{err}</div>}
              <button className="iv-btn iv-pri" aria-disabled={!ready || busy} onClick={join}>
                {busy ? T.sending : T.joinBtn}{!busy && <Arrow/>}
              </button>
            </div>
          )}
          <button className="iv-btn iv-ghost iv-rv" style={{ marginTop: 10 }} onClick={decline} disabled={busy}>{T.notNow}</button>
        </div>
      </section>

      {phase === 'form' && (
        <>
          <div className={`iv-fab-shade${fabHidden ? ' hide' : ''}`} aria-hidden="true"/>
          <a className={`iv-btn iv-pri iv-fab${fabHidden ? ' hide' : ''}`} href="#sumate" tabIndex={fabHidden ? -1 : 0}>{T.fab}<Arrow down/></a>
        </>
      )}

      {phase === 'joined' && (
        <div className="iv-done" role="dialog" aria-modal="true" aria-label={T.doneKick}>
          <div className="iv-burst" aria-hidden="true">
            <span className="r"/><span className="r r2"/><span className="r r3"/>
            {SPARKS.map(([x, y, d], i) => <span key={i} className="iv-spark" style={{ '--x': `${x}px`, '--y': `${y}px`, animationDelay: `${d}s` }}/>)}
            <div className="c"><svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#0B0716" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg></div>
          </div>
          <div className="iv-kick iv-in" style={{ marginTop: 26, animationDelay: '.4s' }}>{T.doneKick}</div>
          <h1 className="iv-h1" style={{ marginTop: 12 }}>
            <span className="iv-in" style={{ display: 'inline-block', animationDelay: '.55s' }}>{T.doneTitle}</span>{' '}
            <span className="iv-name iv-in" style={{ display: 'inline-block', animationDelay: '.75s' }}>{name ? `${name}.` : ''}</span>
          </h1>
          <p className="iv-lead iv-in" style={{ animationDelay: '.95s' }}>{T.doneText}</p>
        </div>
      )}

      {phase === 'declined' && (
        <div className="iv-done" role="dialog" aria-modal="true" aria-label={T.declineTitle}>
          <h1 className="iv-h1 iv-in">{T.declineTitle}<br/><span className="iv-name iv-in" style={{ display: 'inline-block', animationDelay: '.15s' }}>{name ? `${name}.` : ''}</span></h1>
          <p className="iv-lead iv-in" style={{ animationDelay: '.25s' }}>{T.declineText}</p>
          <div className="iv-in" style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', maxWidth: 420, marginTop: 26, animationDelay: '.5s' }}>
            <a className="iv-btn iv-pri" href={doubtsHref} target="_blank" rel="noopener noreferrer">{T.write}<Arrow/></a>
            <button className="iv-btn iv-ghost" onClick={() => setPhase('form')}>{T.changeMind}</button>
          </div>
        </div>
      )}

      {phase === 'underage' && (
        <div className="iv-done" role="dialog" aria-modal="true" aria-label={T.underTitle}>
          <h1 className="iv-h1 iv-in" style={{ fontSize: 'clamp(32px, 9vw, 46px)' }}>{T.underTitle}</h1>
          <p className="iv-lead iv-in" style={{ animationDelay: '.25s' }}>{T.underText}</p>
        </div>
      )}
    </div>
  )
}
