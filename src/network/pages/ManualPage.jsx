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

  const sectionRefs  = useRef({})   // { sectionId: el }
  const scrollingRef = useRef(false) // debounce flag: true while programmatic scroll
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

  // Scrollspy — IntersectionObserver on each section element
  useEffect(() => {
    if (!sections.length) return
    const obs = new IntersectionObserver(
      (entries) => {
        if (scrollingRef.current) return
        // Find the topmost visible entry
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible.length > 0) {
          const cat = visible[0].target.getAttribute('data-category')
          if (cat) setActiveCode(cat)
        }
      },
      { threshold: 0.15, rootMargin: '-60px 0px -40% 0px' }
    )
    Object.values(sectionRefs.current).forEach(el => { if (el) obs.observe(el) })
    return () => obs.disconnect()
  }, [sections])

  const handleSelectCategory = useCallback((code) => {
    setActiveCode(code)
    // Find first section of this category
    const first = sections.find(s => s.category === code)
    if (!first) return
    const el = sectionRefs.current[first.id]
    if (!el) return
    scrollingRef.current = true
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setTimeout(() => { scrollingRef.current = false }, 800)
  }, [sections])

  // Group sections by category for rendering
  const byCategory = categories.map(cat => ({
    ...cat,
    sections: sections.filter(s => s.category === cat.code),
  })).filter(g => g.sections.length > 0)

  if (loading) {
    return (
      <div style={{ padding: 20 }}>
        <div style={{ height: 44, borderRadius: 8, background: 'rgba(139,92,246,0.07)', marginBottom: 20 }}/>
        {[0,1,2,3].map(i => (
          <div key={i} style={{ height: 120, borderRadius: 10, background: 'rgba(139,92,246,0.05)', marginBottom: 16, animation: 'pulse 1.5s ease-in-out infinite' }}/>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: 20, color: '#F87171', fontSize: 13 }}>{error}</div>
    )
  }

  if (sections.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>
        {t('manual.empty')}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      {/* Sticky category nav */}
      <ManualNav
        categories={categories}
        activeCode={activeCode}
        onSelect={handleSelectCategory}
      />

      {/* Content */}
      <div style={{ padding: '0 20px 60px', maxWidth: '65ch', width: '100%' }}>

        {/* Page header */}
        <div style={{ padding: '24px 0 4px' }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>
            {t('manual.title')}
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
            {t('manual.subtitle')}
          </p>
        </div>

        {/* Category groups */}
        {byCategory.map(group => (
          <div key={group.code}>
            {/* Category heading */}
            <div style={{
              marginTop: 32, marginBottom: 4,
              fontSize: 10, fontWeight: 800, letterSpacing: 1.5,
              textTransform: 'uppercase', color: 'var(--primary-violet-light)',
            }}>
              {group.name}
            </div>

            {/* Sections */}
            {group.sections.map(sec => (
              <ManualSection
                key={sec.id}
                section={sec}
                canEdit={canEdit}
                sectionRef={el => { sectionRefs.current[sec.id] = el }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
