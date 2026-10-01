// Si una pantalla falla, que falle sola: el menú sigue andando y se puede
// ir a otra parte o reintentar. Sin esto, un error en una página dejaba
// toda la app en blanco hasta recargar.
import React from 'react'
import { useLocation } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import { t } from '../../i18n/index.js'

class Boundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(error) { return { error } }
  componentDidCatch(error, info) { console.error('Pantalla con error:', error, info?.componentStack) }
  componentDidUpdate(prev) { if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null }) }
  render() {
    if (!this.state.error) return this.props.children
    return (
      <div role="alert" style={{ padding: '48px 24px', textAlign: 'center' }}>
        <AlertTriangle size={32} color="#FBBF24" style={{ marginBottom: 10 }}/>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{t('errors.pageCrashed')}</div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>{t('errors.pageCrashedHint')}</div>
        <button onClick={() => this.setState({ error: null })}
          style={{ marginTop: 14, padding: '8px 16px', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer', background: 'rgba(139,92,246,0.15)', color: 'var(--primary-violet-light)', border: '1px solid var(--border-violet)' }}>
          {t('errors.retry')}
        </button>
      </div>
    )
  }
}

export default function PageBoundary({ children }) {
  const loc = useLocation()
  return <Boundary resetKey={loc.pathname}>{children}</Boundary>
}
