// Botón "Llevame ahí" de cada guía y de "Primeros pasos".
//   crear:<paso>  → abre el alta (influencer, brand, task, collaboration, opportunity)
//   buscar        → abre la búsqueda
//   arrancar      → Inicio con "Arrancar el día" abierto
//   instalar      → pide instalar la app (si el navegador lo permite)
//   /network/...  → va a esa pantalla
import { openSearch } from '../components/GlobalSearch.jsx'
import { toast } from '../components/Toaster.jsx'
import { t } from '../../i18n/index.js'

import { isValidAction } from './guideSearch.js'
export { isValidAction }

// Abre el alta desde cualquier lado (NetworkApp escucha este evento).
export const openCreate = (step = 'select', prefill = null) =>
  window.dispatchEvent(new CustomEvent('network:create', { detail: { step, prefill } }))

// Chrome/Android avisa una sola vez, al cargar, que la app se puede
// instalar. Se guarda ese aviso para usarlo cuando la persona toque
// "Instalar ahora" en la guía.
let installEvt = null
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvt = e })
  window.addEventListener('appinstalled', () => { installEvt = null })
}
export const isStandalone = () => {
  try { return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true } catch { return false }
}

export const runGuideAction = async (to, navigate) => {
  if (!isValidAction(to)) return false
  if (to.startsWith('crear:')) { openCreate(to.slice(6)); return true }
  if (to === 'buscar') { openSearch(); return true }
  if (to === 'arrancar') { navigate('/network/home?focus=1'); return true }
  if (to === 'instalar') {
    if (isStandalone()) { toast(t('guide.install.already')); return true }
    if (installEvt) {
      const e = installEvt
      installEvt = null
      try { e.prompt(); await e.userChoice } catch { /* el navegador lo canceló */ }
      return true
    }
    toast(t('guide.install.manual'))
    return true
  }
  navigate(to)
  return true
}
