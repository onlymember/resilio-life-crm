import React, { Suspense, lazy } from 'react'
import ReactDOM from 'react-dom/client'

// Un solo deploy, dos apps. Según el dominio se monta una u otra, y cada
// una se carga por separado: quien entra a club.resilio.company no baja
// el código del CRM, y al revés.
//   · club.*            → app de influencers (Resilio Club)
//   · cualquier otro    → CRM
// En desarrollo: `npm run dev:club` (usa .env.club con VITE_CLUB_MODE=1).
const isClub =
  window.location.hostname.startsWith('club.') ||
  import.meta.env.VITE_CLUB_MODE === '1'

const Root = lazy(() => (isClub ? import('./club/ClubApp.jsx') : import('./App')))

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Suspense fallback={null}>
      <Root />
    </Suspense>
  </React.StrictMode>
)
