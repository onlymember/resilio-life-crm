import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Printer } from 'lucide-react'
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
      {/* Sticky category nav — hidden on print */}
      <div className="no-print">
        <ManualNav
          categories={categories}
          activeCode={activeCode}
          onSelect={handleSelectCategory}
        />
      </div>

      {/* Document sheet */}
      <div style={{ padding: '24px 20px 80px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{
          width: '100%', maxWidth: 800,
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-violet)',
          borderRadius: 12,
          padding: '40px 48px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
        }}>

          {/* Document header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32, paddingBottom: 20, borderBottom: '2px solid var(--border-violet)' }}>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6, letterSpacing: -0.5 }}>
                {t('manual.title')}
              </h1>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
                {t('manual.subtitle')}
              </p>
            </div>
            <button
              onClick={() => window.print()}
              className="no-print"
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 9, background: 'transparent', border: '1px solid var(--border-violet)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 12, fontWeight: 600, flexShrink: 0, transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(139,92,246,0.08)'; e.currentTarget.style.color = 'var(--text-primary)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)' }}
            >
              <Printer size={13}/>{t('manual.print')}
            </button>
          </div>

          {/* Category groups */}
          {byCategory.map(group => (
            <div key={group.code} style={{ marginBottom: 40 }}>
              {/* Category heading */}
              <div style={{
                marginBottom: 16,
                fontSize: 10, fontWeight: 800, letterSpacing: 2,
                textTransform: 'uppercase', color: 'var(--primary-violet-light)',
                paddingBottom: 8, borderBottom: '1px solid rgba(139,92,246,0.15)',
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

          {/* Document footer */}
          <div style={{ marginTop: 40, paddingTop: 16, borderTop: '1px solid var(--border-violet)', fontSize: 10, color: 'var(--text-secondary)', textAlign: 'right', letterSpacing: 0.5 }}>
            RESILIO NETWORK
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          [style*="--bg-secondary"] { background: white !important; }
          [style*="--text-primary"] { color: #111 !important; }
          [style*="--text-secondary"] { color: #555 !important; }
          [style*="--primary-violet-light"] { color: #6d28d9 !important; }
          [style*="--border-violet"] { border-color: #e5e7eb !important; }
        }
      `}</style>
    </div>
  )
}
