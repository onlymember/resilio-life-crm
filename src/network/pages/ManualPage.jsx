import React, { useState, useEffect, useRef, useCallback } from 'react'
import ManualNav from '../components/ManualNav.jsx'
import ManualSection from '../components/ManualSection.jsx'
import { t } from '../../i18n/index.js'
import { dbGetManual, dbGetManualCategories } from '../../lib/database.js'
import { COMMAND_ROLES } from '../routes.js'

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
  const canEdit      = COMMAND_ROLES.includes(currentUser?.rol)

  useEffect(() => {
    Promise.all([dbGetManual(), dbGetManualCategories()])
      .then(([secs, cats]) => {
        setSections(secs)
        setCategories(cats)
        setActiveCode(cats[0]?.code ?? null)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

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
  }, [loading])

  // Scrollspy — root is the manual's own scroll container
  useEffect(() => {
    if (!sections.length || !scrollRef.current) return
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
  }, [sections])

  const handleSelectCategory = useCallback((code) => {
    setActiveCode(code)
    const first = sections.find(s => s.category === code)
    if (!first) return
    const el = sectionRefs.current[first.id]
    if (!el) return
    scrollingRef.current = true
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setTimeout(() => { scrollingRef.current = false }, 900)
  }, [sections])

  const byCategory = categories.map(cat => ({
    ...cat,
    sections: sections.filter(s => s.category === cat.code),
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
      {/* Progress bar */}
      <div style={{ position: 'sticky', top: 0, height: 3, zIndex: 30, background: 'rgba(59,22,96,0.25)' }}>
        <div style={{
          height: '100%',
          background: 'linear-gradient(90deg, #E6337F, #B81F63)',
          width: `${Math.round(progress * 100)}%`,
          transition: 'width 0.08s linear',
        }}/>
      </div>

      <ManualNav
        categories={categories}
        activeCode={activeCode}
        onSelect={handleSelectCategory}
        topOffset={3}
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
              {t('manual.title')} /
            </div>
            <h2 style={{ fontSize: 'clamp(22px,4vw,32px)', fontWeight: 800, color: '#F2EBFB', margin: 0, letterSpacing: -0.5, lineHeight: 1.2 }}>
              {group.name}
            </h2>
          </div>

          {/* Sections */}
          <div style={{ padding: '0 clamp(20px,4vw,48px) 56px' }}>
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
  )
}
