// "Cargar más" que se dispara solo al llegar abajo. El botón queda por
// si el navegador no soporta el observador o el usuario prefiere tocar.
import React, { useEffect, useRef } from 'react'
import { t } from '../../i18n/index.js'

export default function LoadMore({ remaining, loading, onMore }) {
  const ref = useRef(null)
  const busy = useRef(loading)
  busy.current = loading

  useEffect(() => {
    const el = ref.current
    if (!el || !('IntersectionObserver' in window)) return
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !busy.current) onMore()
    }, { rootMargin: '600px 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [onMore])

  if (remaining <= 0) return null
  return (
    <button ref={ref} onClick={onMore} disabled={loading} style={{ padding: '12px', borderRadius: 10, background: 'rgba(139,92,246,0.08)', border: '1px solid var(--border-violet)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13 }}>
      {loading ? t('loading.generic') : t('label.loadMore', { n: remaining })}
    </button>
  )
}
