import React, { Suspense, lazy } from 'react'
import ReactDOM from 'react-dom/client'

// Un solo deploy, tres apps. Según el dominio se monta una u otra, y cada
// una se carga por separado: quien entra a club.resilio.company no baja
// el código del CRM, y al revés.
//   · club.*            → app de influencers (Resilio Club)
//   · partners.*        → propuesta privada para marcas (059)
//   · partners.*/i/...  → invitación a la red para influencers (064)
//   · cualquier otro    → CRM
// En desarrollo: `npm run dev:club` / `npm run dev:partners`.
const isClub =
  window.location.hostname.startsWith('club.') ||
  import.meta.env.MODE === 'club'
const isPartners =
  window.location.hostname.startsWith('partners.') ||
  import.meta.env.MODE === 'partners'

// Cada import() va en su propia función, a propósito. Con los dos en un
// mismo ternario, Vite le arma a los dos la misma lista de archivos a
// precargar (la del CRM) y el Club se quedaba sin su CSS en producción.
const loadClub    = () => import('./club/ClubApp.jsx')
const loadCrm     = () => import('./App')
// Entrar directo a /network (app instalada, links, recargas) no baja el
// CRM clásico: solo el shell de Network.
const loadNetwork = () => import('./network/NetworkRoot.jsx')
const loadPartners = () => import('./partners/PartnersApp.jsx')
const loadInvite   = () => import('./invite/InviteApp.jsx')
const isInvite = isPartners && window.location.pathname.startsWith('/i/')
const isNetwork = !isClub && !isPartners && window.location.pathname.startsWith('/network')
const Root = lazy(isInvite ? loadInvite : isPartners ? loadPartners : isClub ? loadClub : isNetwork ? loadNetwork : loadCrm)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Suspense fallback={null}>
      <Root />
    </Suspense>
  </React.StrictMode>
)

// App instalable (fase 3): el service worker no guarda caché, solo
// permite "Agregar a inicio". Solo en producción, para no molestar al
// desarrollar.
if (import.meta.env.PROD && !isPartners && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('/sw.js').catch(() => {}) })
}
