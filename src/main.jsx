import React, { Suspense, lazy } from 'react'
import ReactDOM from 'react-dom/client'

// Un solo deploy, dos apps. Según el dominio se monta una u otra, y cada
// una se carga por separado: quien entra a club.resilio.company no baja
// el código del CRM, y al revés.
//   · club.*            → app de influencers (Resilio Club)
//   · cualquier otro    → CRM
// En desarrollo: `npm run dev:club` (vite --mode club).
const isClub =
  window.location.hostname.startsWith('club.') ||
  import.meta.env.MODE === 'club'

// Cada import() va en su propia función, a propósito. Con los dos en un
// mismo ternario, Vite le arma a los dos la misma lista de archivos a
// precargar (la del CRM) y el Club se quedaba sin su CSS en producción.
const loadClub = () => import('./club/ClubApp.jsx')
const loadCrm  = () => import('./App')
const Root = lazy(isClub ? loadClub : loadCrm)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Suspense fallback={null}>
      <Root />
    </Suspense>
  </React.StrictMode>
)
