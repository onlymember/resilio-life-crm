import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Compass, BookOpen } from 'lucide-react'
import ManualNav from '../components/ManualNav.jsx'
import ManualSection from '../components/ManualSection.jsx'
import GuideTab from '../components/GuideTab.jsx'
import { t } from '../../i18n/index.js'
import { dbGetManual, dbGetManualCategories } from '../../lib/database.js'
import { DIRECTION_ROLES } from '../routes.js'

// Temas de la guía "Cómo usar Network" (migración 068): van en su pestaña.
const isGuide = (code) => String(code || '').startsWith('guia_')
const TAB_KEY = 'nw.manualTab'
const readTab = () => { try { return localStorage.getItem(TAB_KEY) } catch { return null } }
const saveTab = (v) => { try { localStorage.setItem(TAB_KEY, v) } catch { /* sin storage */ } }

const TABS_CSS = `
.mn-tabs { position: sticky; top: 0; z-index: 25; display: flex; justify-content: center; padding: 8px 12px;
  background: rgba(10,6,24,.86); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); border-bottom: 1px solid rgba(139,92,246,.15); }
.mn-seg { position: relative; display: grid; grid-template-columns: 1fr 1fr; width: min(440px, 100%); padding: 3px; border-radius: 12px; background: rgba(139,92,246,.1); border: 1px solid rgba(139,92,246,.2); }
.mn-pill { position: absolute; top: 3px; bottom: 3px; left: 3px; width: calc(50% - 3px); border-radius: 9px;
  background: linear-gradient(135deg, rgba(124,58,237,.75), rgba(192,38,211,.6)); box-shadow: 0 4px 14px rgba(124,58,237,.35);
  transition: transform .35s cubic-bezier(.2,.8,.2,1); }
.mn-seg[data-tab="manual"] .mn-pill { transform: translateX(100%); }
.mn-tab { position: relative; z-index: 1; display: flex; align-items: center; justify-content: center; gap: 6px; height: 34px; font-size: 13px; font-weight: 700; color: var(--text-secondary); transition: color .25s; }
.mn-tab[aria-selected="true"] { color: #fff; }
.mn-pane { animation: mnIn .3s ease backwards; }
@keyframes mnIn { from { opacity: 0; } to { opacity: 1; } }
@media (prefers-reduced-motion: reduce) { .mn-pill { transition: none; } .mn-pane { animation: none; } }
`

export default function ManualPage({ currentUser }) {
  const [sections,   setSections]   = useState([])
  const [categories, setCategories] = useState([])
  const [activeCode, setActiveCode] = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(null)
  const [progress,   setProgress]   = useState(0)

  const sectionRefs  = useRef({})
  const scrollingRef = useRef(false)
  const scrollRef    = useRef(null)
  // Igual que la regla de la base (ms_update): solo Dirección edita.
  const canEdit      = DIRECTION_ROLES.includes(currentUser?.rol)
  const [params, setParams] = useSearchParams()
  const linkedGuide  = params.get('guia')
  const [tab, setTab] = useState(() => (linkedGuide ? 'guia' : (readTab() === 'manual' ? 'manual' : 'guia')))

  useEffect(() => {
    Promise.all([dbGetManual(), dbGetManualCategories()])
      .then(([secs, cats]) => {
        setSections(secs)
        setCategories(cats)
        setActiveCode(cats.find(c => !isGuide(c.code))?.code ?? null)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const guideSecs   = useMemo(() => sections.filter(s => isGuide(s.category)), [sections])
  const guideCats   = useMemo(() => categories.filter(c => isGuide(c.code)), [categories])
  const manualSecs  = useMemo(() => sections.filter(s => !isGuide(s.category)), [sections])
  const manualCats  = useMemo(() => categories.filter(c => !isGuide(c.code)), [categories])
  const hasGuide    = guideSecs.length > 0
  const showGuide   = hasGuide && tab === 'guia'

  const pickTab = (v) => {
    setTab(v); saveTab(v)
    scrollRef.current?.scrollTo({ top: 0 })
    if (v !== 'guia' && linkedGuide) setParams({}, { replace: true })
  }
  const onSlugChange = useCallback((slug) => {
    setParams(slug ? { guia: slug } : {}, { replace: true })
  }, [setParams])

  // Progress bar tracking
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const onScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = el
      setProgress(scrollTop / Math.max(1, scrollHeight - clientHeight))
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [loading, showGuide])

  // Scrollspy — root is the manual's own scroll container
  useEffect(() => {
    if (showGuide || !manualSecs.length || !scrollRef.current) return
    const obs = new IntersectionObserver(
      (entries) => {
        if (scrollingRef.current) return
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible.length > 0) {
          const cat = visible[0].target.getAttribute('data-category')
          if (cat) setActiveCode(cat)
        }
      },
      { threshold: 0.1, rootMargin: '-56px 0px -30% 0px', root: scrollRef.current }
    )
    Object.values(sectionRefs.current).forEach(el => { if (el) obs.observe(el) })
    return () => obs.disconnect()
  }, [manualSecs, showGuide])

  const handleSelectCategory = useCallback((code) => {
    setActiveCode(code)
    const first = manualSecs.find(s => s.category === code)
    if (!first) return
    const el = sectionRefs.current[first.id]
    if (!el) return
    scrollingRef.current = true
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setTimeout(() => { scrollingRef.current = false }, 900)
  }, [manualSecs])

  const byCategory = manualCats.map(cat => ({
    ...cat,
    sections: manualSecs.filter(s => s.category === cat.code),
  })).filter(g => g.sections.length > 0)

  if (loading) {
    return (
      <div style={{ padding: '20px 24px' }}>
        <div style={{ height: 51, borderRadius: 0, background: 'rgba(139,92,246,0.07)', marginBottom: 0 }}/>
        {[0,1,2,3].map(i => (
          <div key={i} style={{ height: 120, borderRadius: 0, background: 'rgba(139,92,246,0.05)', marginBottom: 0, borderBottom: '1px solid rgba(139,92,246,0.06)', animation: 'pulse 1.5s ease-in-out infinite' }}/>
        ))}
      </div>
    )
  }

  if (error) {
    return <div style={{ padding: 20, color: '#F87171', fontSize: 13 }}>{error}</div>
  }

  if (sections.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>
        {t('manual.empty')}
      </div>
    )
  }

  return (
    <div
      ref={scrollRef}
      style={{
        height: 'calc(100dvh - 44px)',
        overflowY: 'auto',
        scrollSnapType: 'y proximity',
        background: 'var(--bg-primary)',
      }}
    >
      <style>{TABS_CSS}</style>
      {hasGuide && (
        <div className="mn-tabs">
          <div className="mn-seg" role="tablist" data-tab={showGuide ? 'guia' : 'manual'}>
            <span className="mn-pill" aria-hidden="true"/>
            <button role="tab" className="mn-tab" aria-selected={showGuide} onClick={() => pickTab('guia')}><Compass size={14}/>{t('guide.tab')}</button>
            <button role="tab" className="mn-tab" aria-selected={!showGuide} onClick={() => pickTab('manual')}><BookOpen size={14}/>{t('guide.manualTab')}</button>
          </div>
        </div>
      )}

      {showGuide ? (
        <div className="mn-pane" key="guia">
          <GuideTab guides={guideSecs} categories={guideCats} canEdit={canEdit}
            initialSlug={linkedGuide} onSlugChange={onSlugChange}/>
        </div>
      ) : (
      <div className="mn-pane" key="manual">
      {/* Progress bar */}
      <div style={{ position: 'sticky', top: hasGuide ? 59 : 0, height: 3, zIndex: 30, background: 'rgba(59,22,96,0.25)' }}>
        <div style={{
          height: '100%',
          background: 'linear-gradient(90deg, #E6337F, #B81F63)',
          width: `${Math.round(progress * 100)}%`,
          transition: 'width 0.08s linear',
        }}/>
      </div>

      <ManualNav
        categories={manualCats}
        activeCode={activeCode}
        onSelect={handleSelectCategory}
        topOffset={hasGuide ? 62 : 3}
      />

      {byCategory.map(group => (
        <div key={group.code} style={{ scrollSnapAlign: 'start' }}>

          {/* Category header */}
          <div style={{
            background: '#3B1660',
            padding: 'clamp(32px,5vw,56px) clamp(20px,4vw,48px) clamp(20px,4vw,36px)',
            borderBottom: '3px solid #6B2FB3',
          }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 2.5, textTransform: 'uppercase', color: '#E6337F', marginBottom: 10 }}>
              {t('manual.sectionBadge', { num: (group.code || '').replace(/\D/g, '').padStart(2, '0') })}
            </div>
            <h2 style={{ fontSize: 'clamp(22px,4vw,32px)', fontWeight: 800, color: 'white', margin: 0, letterSpacing: -0.5, lineHeight: 1.2 }}>
              {group.name}
            </h2>
            {group.sections[0]?.subtitle && (
              <p style={{ fontSize: 'clamp(13px,2vw,16px)', fontStyle: 'italic', color: 'rgba(242,235,251,0.72)', margin: 'clamp(8px,1.5vw,12px) 0 0' }}>
                {group.sections[0].subtitle}
              </p>
            )}
          </div>

          {/* Sections */}
          <div style={{ padding: '0 clamp(20px,4vw,48px) 56px', background: 'white' }}>
            {group.sections.map(sec => (
              <ManualSection
                key={sec.id}
                section={sec}
                canEdit={canEdit}
                sectionRef={el => { sectionRefs.current[sec.id] = el }}
              />
            ))}
          </div>
        </div>
      ))}

      <div style={{ padding: '28px clamp(20px,4vw,48px)', borderTop: '1px solid rgba(107,47,179,0.15)', fontSize: 10, color: 'rgba(242,235,251,0.3)', letterSpacing: 2, textTransform: 'uppercase' }}>
        Resilio Network
      </div>
      </div>
      )}
    </div>
  )
}
