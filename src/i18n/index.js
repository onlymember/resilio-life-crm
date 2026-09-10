import es from './es.json'
import en from './en.json'

const DICTS = { es, en }

const _locale = { current: 'es' }

export const setLocale = (l) => { _locale.current = l && DICTS[l] ? l : 'es' }

export const currentLocale = () => _locale.current

export const t = (key, vars = {}, locale) => {
  const loc = locale || _locale.current
  const dict = DICTS[loc] ?? es
  const raw = key.split('.').reduce((o, k) => (o != null && typeof o === 'object' ? o[k] : undefined), dict)
  if (raw === undefined || raw === null) {
    if (import.meta.env.DEV) console.warn('[i18n] clave faltante:', key)
    return key
  }
  if (typeof raw !== 'string') return raw
  return raw.replace(/\{(\w+)\}/g, (_, v) => (vars[v] !== undefined ? vars[v] : ''))
}

export const useLocale = () => _locale.current
