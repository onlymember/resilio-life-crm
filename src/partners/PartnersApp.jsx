// partners.resilio.company — propuesta privada para marcas.
// La marca abre su link (/p/<token>), elige plan y responde 5 preguntas.
// Sin precios: los valores se mandan por privado. Textos en content.js.
import React, { useEffect, useRef, useState } from 'react'
import './partners.css'
import { COPY, CONTACT, LANGS, PLAN_KEYS, ADVISE_KEY, OPTION_KEYS, guessLang, toAnswers, fromAnswers } from './content.js'
import { readToken, getProposal, respondProposal } from './api.js'

const IMG = { mark: '/partners/mark.webp', wordmark: '/partners/wordmark.webp', watermark: '/partners/watermark.webp' }
const pad = (i) => String(i + 1).padStart(2, '0')
const fill = (s, v) => s.replace('{p}', v)

const Arrow = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
)
const Check = ({ color = '#9B6BFF', size = 18, w = 2.5 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0, marginTop: 1 }}><path d="M20 6L9 17l-5-5"/></svg>
)

// Página: fuente, fondo claro, título e idioma del documento.
function usePageSetup(lang, title) {
  useEffect(() => {
    if (!document.getElementById('pt-font')) {
      const l = document.createElement('link')
      l.id = 'pt-font'; l.rel = 'stylesheet'
      l.href = 'https://fonts.googleapis.com/css2?family=Archivo:ital,wdth,wght@0,62..125,400..900;1,62..125,400..900&display=swap'
      document.head.appendChild(l)
    }
    document.documentElement.classList.add('pt-root')
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', '#F4F2F7')
    let robots = document.querySelector('meta[name="robots"]')
    if (!robots) { robots = document.createElement('meta'); robots.name = 'robots'; document.head.appendChild(robots) }
    robots.content = 'noindex, nofollow'
  }, [])
  useEffect(() => { document.documentElement.lang = lang; document.title = title }, [lang, title])
}

// Aparición al hacer scroll: cada .pt-rv entra cuando se ve.
function useReveal(rootRef) {
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const els = [...root.querySelectorAll('.pt-rv:not(.pt-in)')]
    if (!('IntersectionObserver' in window)) { els.forEach(e => e.classList.add('pt-in')); return }
    const io = new IntersectionObserver((entries) => {
      entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('pt-in'); io.unobserve(en.target) } })
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 })
    els.forEach(e => io.observe(e))
    return () => io.disconnect()
  })
}

function LangSwitch({ lang, setLang, label }) {
  return (
    <div className="pt-langs" role="group" aria-label={label}>
      {LANGS.map(c => (
        <button key={c} className={`pt-lang${c === lang ? ' on' : ''}`} aria-pressed={c === lang} onClick={() => setLang(c)}>{c.toUpperCase()}</button>
      ))}
    </div>
  )
}

function Header({ lang, setLang, T }) {
  return (
    <header className="pt-wrap pt-head">
      <img src={IMG.mark} alt="Resilio Life" width="52" height="45"/>
      <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
        <LangSwitch lang={lang} setLang={setLang} label={T.langLabel}/>
        <img className="pt-hide-sm" src={IMG.wordmark} alt="" width="132" height="46"/>
      </div>
    </header>
  )
}

function Footer({ T }) {
  return (
    <footer className="pt-wrap pt-foot">
      <img src={IMG.mark} alt="Resilio Life" width="52" height="45"/>
      <div className="pt-foot-links">
        <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>
        {CONTACT.whatsapp && <a href={`https://wa.me/${CONTACT.whatsapp}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>}
        <span>{T.footer}</span>
      </div>
    </footer>
  )
}

// Link vencido, inválido o la raíz del dominio sin link.
function Notice({ lang, setLang, title, text }) {
  const T = COPY[lang]
  const ref = useRef(null)
  usePageSetup(lang, 'Resilio Life')
  return (
    <div className="pt" ref={ref}>
      <div className="pt-glow-tr"/><div className="pt-glow-bl"/>
      <Header lang={lang} setLang={setLang} T={T}/>
      <main className="pt-wrap pt-notice">
        <img className="pt-wm" src={IMG.watermark} alt="" style={{ right: -40, top: -20, width: 'min(520px,70vw)' }}/>
        <div className="pt-lbl pt-fi">Resilio Life</div>
        <h1 className="pt-fi pt-d1">{title}</h1>
        <p className="pt-fi pt-d2">{text}</p>
        <div className="pt-fi pt-d3" style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          <a className="pt-cta" href={`mailto:${CONTACT.email}`}>{T.contact}<Arrow/></a>
          <a className="pt-ghost" href={`https://www.instagram.com/${CONTACT.instagram}/`} target="_blank" rel="noopener noreferrer">@{CONTACT.instagram}</a>
        </div>
      </main>
      <Footer T={T}/>
    </div>
  )
}

export default function PartnersApp() {
  const token = readToken()
  const [load, setLoad] = useState({ state: token ? 'loading' : 'home' })
  const [lang, setLang] = useState(guessLang())

  useEffect(() => {
    if (!token) return
    let alive = true
    getProposal(token)
      .then(d => {
        if (!alive) return
        if (!d?.ok) { setLoad({ state: d?.reason === 'expired' ? 'expired' : 'missing' }); return }
        if (d.lang) setLang(d.lang)
        setLoad({ state: 'ok', p: d })
      })
      .catch(() => alive && setLoad({ state: 'missing' }))
    return () => { alive = false }
  }, [token])

  if (load.state === 'loading') return <div className="pt pt-loading" aria-busy="true"><img src={IMG.mark} alt="Resilio Life" width="56" height="49"/></div>
  if (load.state !== 'ok') {
    const T = COPY[lang]
    const home = load.state === 'home'
    return <Notice lang={lang} setLang={setLang} title={home ? T.homeTitle : T.expiredTitle} text={home ? T.homeText : T.expiredText}/>
  }
  return <Proposal token={token} p={load.p} lang={lang} setLang={setLang}/>
}

function Proposal({ token, p, lang, setLang }) {
  const T = COPY[lang]
  const brand = p.brand_name
  const rootRef = useRef(null)
  const formRef = useRef(null)

  const startPlan = p.chosen_plan === ADVISE_KEY ? 3 : PLAN_KEYS.indexOf(p.chosen_plan)
  const [plan, setPlan] = useState(startPlan >= 0 ? startPlan : null)
  const [ans, setAns] = useState(() => fromAnswers(p.answers))
  const [sent, setSent] = useState(!!p.answered)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [faq, setFaq] = useState(-1)

  usePageSetup(lang, `${T.docTitle} · ${brand}`)
  useReveal(rootRef)

  const ready = plan != null
  const advise = plan === 3
  const planName = plan == null ? '' : advise ? T.adviseTitle : T.plans[plan].name

  const pickOpt = (k, i) => setAns(a => ({ ...a, [k]: a[k] === i ? null : i }))

  const send = async () => {
    if (!ready || busy) return
    setBusy(true); setErr('')
    try {
      await respondProposal(token, advise ? ADVISE_KEY : PLAN_KEYS[plan], toAnswers(ans))
      setSent(true)
      requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
    } catch {
      setErr(T.sendError)
    } finally { setBusy(false) }
  }

  const endText = sent ? T.endDone : ready ? fill(T.endAnswer, planName) : T.endPick
  const endCta = sent ? T.endCtaDone : ready ? T.endCtaAnswer : T.endCtaPick

  return (
    <div className="pt" ref={rootRef}>
      <div className="pt-glow-tr"/><div className="pt-glow-bl"/>
      <Header lang={lang} setLang={setLang} T={T}/>

      {/* Portada */}
      <section className="pt-wrap pt-hero">
        <img className="pt-wm" src={IMG.watermark} alt="" style={{ right: -60, top: -40, width: 'min(620px,70vw)' }}/>
        <div className="pt-fi pt-hello">{T.hello}</div>
        <div className="pt-fi pt-brand">{brand}</div>
        <h1 className="pt-h1">
          <span className="pt-line pt-l1"><span>{T.h1}</span></span>
          <span className="pt-line pt-l2"><span>{T.h2}</span></span>
          <span className="pt-line pt-l3"><span style={{ color: '#6E6879' }}>{T.h3}</span></span>
        </h1>
        <div className="pt-rule"/>
        <p className="pt-fi pt-d1 pt-intro">{T.intro}</p>
      </section>

      {/* Franja */}
      <div className="pt-band" aria-hidden="true">
        <div className="pt-marq">
          {[...T.marquee, ...T.marquee].map((w, i) => (
            <span key={i}>{w}<svg width="16" height="16" viewBox="0 0 24 24" fill="#9B6BFF"><path d="M12 2l2.6 7.4L22 12l-7.4 2.6L12 22l-2.6-7.4L2 12l7.4-2.6z"/></svg></span>
          ))}
        </div>
      </div>

      {/* Qué podemos hacer */}
      <section className="pt-wrap pt-sec" style={{ paddingBottom: 40 }}>
        <div className="pt-rv" style={{ marginBottom: 48 }}>
          <div className="pt-lbl" style={{ marginBottom: 18 }}>{T.svcLbl}</div>
          <h2 className="pt-h2" style={{ maxWidth: '16ch' }}>{T.svcTitle}</h2>
        </div>
        {T.services.map((s, i) => (
          <div className="pt-svc pt-rv" key={i}>
            <div className="pt-num">{pad(i)}</div>
            <h3>{s[0]}</h3>
            <p>{s[1]}</p>
          </div>
        ))}
        <div className="pt-hair pt-rv pt-grow"/>
      </section>

      {/* Cómo trabajamos */}
      <section className="pt-wrap pt-sec">
        <div className="pt-rv pt-lbl" style={{ marginBottom: 18 }}>{T.howLbl}</div>
        <h2 className="pt-rv pt-h2" style={{ marginBottom: 56 }}>{T.howTitle}</h2>
        <div className="pt-rv pt-grow pt-gradline"/>
        <div className="pt-steps">
          {T.how.map((h, i) => (
            <div className="pt-rv pt-step" key={i} style={{ transitionDelay: `${i * 90}ms` }}>
              <div className="pt-dot">{i + 1}</div>
              <div className="pt-step-t">{h[0]}</div>
              <div className="pt-step-d">{h[1]}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Planes */}
      <section id="planes" className="pt-wrap pt-plans-sec">
        <div className="pt-rv pt-lbl" style={{ marginBottom: 18 }}>{T.planLbl}</div>
        <div className="pt-rv pt-plans-head">
          <h2 className="pt-h2" style={{ maxWidth: '14ch' }}>{T.planTitle}</h2>
          <p>{T.planNote}</p>
        </div>
        <div className="pt-plans">
          {T.plans.map((pl, i) => {
            const on = plan === i
            return (
              <button key={i} className={`pt-plan pt-rv${on ? ' on' : ''}${i === 2 ? ' dark' : ''}`} aria-pressed={on} onClick={() => setPlan(i)} style={{ transitionDelay: `${i * 90}ms` }}>
                <div className="pt-plan-top"><span className="pt-tier">{pad(i)} · {pl.tier}</span><span className="pt-radio"><i/></span></div>
                <div>
                  <div className="pt-plan-name">{pl.name}</div>
                  {i === 1 && <div className="pt-badge">{T.recommended}</div>}
                </div>
                <div className="pt-plan-desc">{pl.desc}</div>
                <div className="pt-ideal"><span className="pt-tier" style={{ fontSize: 10 }}>{T.idealFor}</span><span>{pl.ideal}</span></div>
                {pl.plus && <div className="pt-plusl"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>{pl.plus}</div>}
                <div className="pt-groups">
                  {pl.groups.map((g, gi) => (
                    <div key={gi} className="pt-group">
                      <div className="pt-gh">{g[0]}</div>
                      {g[1].map((f, fi) => <div className="pt-feat" key={fi}><Check/><span>{f}</span></div>)}
                    </div>
                  ))}
                </div>
                <div className="pt-pick">{on ? T.picked : T.pick}</div>
              </button>
            )
          })}
        </div>
        <button className={`pt-advise pt-rv${advise ? ' on' : ''}`} aria-pressed={advise} onClick={() => setPlan(3)}>
          <span className="pt-radio"><i/></span>
          <span style={{ display: 'flex', flexDirection: 'column', gap: 4, textAlign: 'left' }}>
            <span style={{ fontSize: 20, fontWeight: 800 }}>{T.adviseTitle}</span>
            <span style={{ fontSize: 15, color: '#3D3A45' }}>{T.adviseText}</span>
          </span>
        </button>
      </section>

      {/* Preguntas / confirmación */}
      <section id="preguntas" ref={formRef} className="pt-wrap pt-sec" style={{ paddingTop: 0, scrollMarginTop: 24 }}>
        {!sent ? (
          <div className="pt-form pt-rv">
            <div className="pt-lbl" style={{ marginBottom: 18 }}>{T.qLbl}</div>
            <h2 className="pt-h2" style={{ fontSize: 'clamp(30px,3.8vw,52px)', marginBottom: 12 }}>{T.qTitle}</h2>
            <p style={{ margin: '0 0 40px', fontSize: 17, color: '#3D3A45' }}>{T.qSub}</p>

            {Object.keys(OPTION_KEYS).map((k, qi) => (
              <div className="pt-q" key={k}>
                <div className="pt-num">{pad(qi)}</div>
                <div>
                  <h4 id={`q-${k}`}>{T.q[k]}</h4>
                  <div className="pt-chips" role="group" aria-labelledby={`q-${k}`}>
                    {T.opt[k].map((l, i) => (
                      <button key={i} className={`pt-chip${ans[k] === i ? ' on' : ''}`} aria-pressed={ans[k] === i} onClick={() => pickOpt(k, i)}>{l}</button>
                    ))}
                  </div>
                </div>
              </div>
            ))}

            <div className="pt-q">
              <div className="pt-num">05</div>
              <div>
                <label htmlFor="pt-notes"><h4>{T.q.notes}</h4></label>
                <textarea id="pt-notes" className="pt-inp" rows={3} maxLength={1500} placeholder={T.notesPh}
                  value={ans.notes} onChange={e => setAns(a => ({ ...a, notes: e.target.value }))}/>
              </div>
            </div>

            <div className="pt-send">
              <div style={{ fontSize: 15, color: '#3D3A45' }}>{ready ? `${T.chosen} ${planName}` : T.pickFirst}</div>
              <button className={`pt-cta${ready ? '' : ' off'}`} aria-disabled={!ready} onClick={ready ? send : () => document.getElementById('planes')?.scrollIntoView({ behavior: 'smooth' })}>
                {busy ? T.sending : advise ? T.ctaAdvise : ready ? `${T.cta} · ${planName}` : T.cta}<Arrow/>
              </button>
            </div>
            {err && <div role="alert" style={{ marginTop: 14, color: '#B42318', fontSize: 15, fontWeight: 600 }}>{err}</div>}
          </div>
        ) : (
          <div className="pt-done">
            <img src={IMG.watermark} alt="" className="pt-done-wm"/>
            <div className="pt-done-ic"><Check color="#0E0E10" size={30} w={2.8}/></div>
            <h2 className="pt-h2" style={{ fontSize: 'clamp(34px,4.6vw,64px)', marginBottom: 16, position: 'relative' }}>{T.doneTitle}</h2>
            <p>{fill(T.doneLine, planName)}</p>
            <p>{T.doneNext}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 28, position: 'relative' }}>
              {CONTACT.whatsapp && <a className="pt-cta pt-cta-light" href={`https://wa.me/${CONTACT.whatsapp}?text=${encodeURIComponent(brand)}`} target="_blank" rel="noopener noreferrer">{T.whatsapp}<Arrow/></a>}
              <button className="pt-link" onClick={() => setSent(false)}>{T.edit}</button>
            </div>
          </div>
        )}
      </section>

      {/* Primeros pasos */}
      <section className="pt-wrap pt-sec" style={{ paddingTop: 0 }}>
        <div className="pt-rv pt-lbl" style={{ marginBottom: 18 }}>{T.firstLbl}</div>
        <h2 className="pt-rv pt-h2" style={{ marginBottom: 40 }}>{T.firstTitle}</h2>
        {T.first.map((s, i) => (
          <div className="pt-svc pt-svc-2 pt-rv" key={i}>
            <div className="pt-num">{pad(i)}</div>
            <div className="pt-first">{s}</div>
          </div>
        ))}
        <div className="pt-hair pt-rv pt-grow"/>
      </section>

      {/* Preguntas frecuentes */}
      <section className="pt-wrap pt-sec" style={{ paddingTop: 0 }}>
        <div className="pt-faq-grid">
          <div className="pt-rv">
            <div className="pt-lbl" style={{ marginBottom: 18 }}>{T.faqLbl}</div>
            <h2 className="pt-h2" style={{ fontSize: 'clamp(32px,4vw,52px)' }}>{T.faqTitle}</h2>
          </div>
          <div>
            {T.faqs.map((f, i) => {
              const open = faq === i
              return (
                <div className={`pt-faq pt-rv${open ? ' on' : ''}`} key={i}>
                  <button onClick={() => setFaq(open ? -1 : i)} aria-expanded={open} aria-controls={`faq-${i}`}>
                    <span>{f[0]}</span>
                    <svg className="pt-pl" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#5B21C9" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
                  </button>
                  <div className="pt-a" id={`faq-${i}`}><div><p>{f[1]}</p></div></div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Instagram */}
      <section className="pt-wrap" style={{ paddingBottom: 'clamp(60px,8vw,100px)' }}>
        <a className="pt-ig pt-rv" href={`https://www.instagram.com/${CONTACT.instagram}/`} target="_blank" rel="noopener noreferrer">
          <img src={IMG.watermark} alt="" className="pt-ig-wm"/>
          <div style={{ position: 'relative' }}>
            <div className="pt-lbl" style={{ color: '#C9B4FF', marginBottom: 16 }}>{T.igLbl}</div>
            <div className="pt-ig-t">{T.igTitle}</div>
          </div>
          <span className="pt-ig-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg>
            @{CONTACT.instagram}
          </span>
        </a>
      </section>

      {/* Avanzar */}
      <section className="pt-wrap" style={{ paddingBottom: 'clamp(60px,8vw,100px)' }}>
        <div className="pt-end pt-rv">
          <div className="pt-lbl">{T.endLbl}</div>
          <h2 className="pt-h2" style={{ fontSize: 'clamp(34px,5vw,68px)', maxWidth: '16ch' }}>{T.endTitle}<br/><span style={{ color: '#5B21C9', fontStyle: 'italic' }}>{brand}?</span></h2>
          <p>{endText}</p>
          <a className="pt-cta" href={ready ? '#preguntas' : '#planes'} style={{ marginTop: 8 }}>{endCta}<Arrow/></a>
        </div>
      </section>

      <Footer T={T}/>
    </div>
  )
}
