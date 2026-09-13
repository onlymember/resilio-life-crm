# PROMPT 3C — Entrada a Network, Manual animado y botones + rotos en mobile

Sin SQL, sin dependencias nuevas. Pegar a Claude Code: las REGLAS
GLOBALES de abajo + todo el bloque del prompt.

---

```
PROMPT 3C — ENTRADA A NETWORK, MANUAL ANIMADO, BOTONES + ROTOS

## REGLAS GLOBALES

1. No modifiques archivos fuera de FILES TO MODIFY.
2. `src/App.jsx` es el shell de TODA la app (los 8 ecosistemas, no solo
   Network) — 119KB. Tocá ÚNICAMENTE los 3 bloques exactos señalados en
   BUG-A. No refactorices nada más ahí, aunque lo veas mejorable.
3. Preservá el sistema visual existente: reusá las CSS vars ya
   definidas en GlobalStyles (App.jsx) — --glass-bg, --border-violet,
   --primary-violet. No agregues colores nuevos hardcodeados.
4. No agregues dependencias nuevas — nada de librerías de animación
   (framer-motion, react-spring, etc.). Las animaciones del Manual se
   hacen con transiciones CSS + los @keyframes que ya existen en
   GlobalStyles (fadeIn, slideIn).
5. Escribí el diff mínimo que cumple los ACCEPTANCE CRITERIA.
6. Si alguno de los tres bugs no reproduce tal como lo describe el
   CONTEXT (la línea exacta cambió, el comportamiento es distinto), PARÁ
   y reportalo — no apliques el fix a ciegas sobre código distinto al
   que se documentó acá.
7. Mobile-first, 390px primero, en los tres bugs.

## CONTEXT — verificado en el código, no es una suposición

**BUG-A · Al loguearse, no se ve Network Home ni su sidebar correcta.**

En `src/App.jsx`, cada vez que hay un login/sign-in real, se llama
`setShowPortal(true)` (en `handleLogin`, línea ~1101, y en `loadProfile`
dentro del `useEffect` de auth, línea ~1124, cuando `isSignIn===true`).
Eso muestra `<VideoPortal onEnter={...}/>` — una pantalla de video
introductoria pensada para el hub multi-ecosistema — para CUALQUIER rol,
incluidos los roles de Network (scouter, network_direction,
regional_lead, country_lead, city_lead).

Además, y esto es independiente del video: ni `handleLogin` ni
`loadProfile` ni el `onEnter` del portal (línea ~1570) hacen
`window.history.pushState` hacia `/network`. Solo hacen
`setCurrentView(defaultViewFor(user))`, que para esos roles vale
`'network'`. El problema es que el render de nivel superior (línea
~1578) decide si montar `NetworkApp` con ESTA condición:

    if (allowedView === 'network' && window.location.pathname.startsWith('/network'))

Si heredaste el login desde "/" (lo normal: la pantalla de login no
vive en `/network`), esa condición es falsa aunque `currentView` ya sea
`'network'`. Cae entonces al layout legacy (Sidebar + Header del sistema
viejo, con `renderView()`), y el `case 'network'` de `renderView()`
(línea ~1440) literalmente hace `return null` — con el comentario "Renderizado
con layout propio — ver el bypass en el return principal". Resultado:
Sidebar equivocada (la del sistema de 8 ecosistemas, no la de Network) +
`<main>` vacío. Eso es "la imagen vacía" que describís.

Comparación: cuando SÍ funciona (click en "Network" desde el Sidebar
viejo), el código hace las dos cosas juntas —
`window.history.pushState({}, '', item.networkPath); onNavigate('network')`
(línea ~453). Login nunca hizo esa segunda parte.

**BUG-B · El Manual se siente "pegado" y la barra de arriba no es
realmente permanente.**

`ManualNav.jsx` ya es `position: sticky, top: 0` — PERO `MobileLayout.jsx`
tiene su propio header (`MobileHeader`, 52px de alto) que también es
`position: sticky, top: 0, zIndex: 100`. Como los dos comparten
`top: 0`, al scrollear la barra de categorías del Manual (zIndex: 20)
queda tapada detrás del header en vez de quedar pegada justo debajo —
por eso no se percibe como "siempre visible". Además su fondo es sólido
(`var(--bg-primary)`), no glass.

El contenido de `ManualSection.jsx` se renderiza todo de una, sin
ninguna transición — de ahí la sensación de "PDF pegado" en vez de algo
diseñado.

**BUG-C · "+ Agregar marca / oportunidad / colaboración" no hacen nada
en mobile — solo el + de la botonera funciona.**

Confirmado en el código: hay DOS estados `createOpen` completamente
desconectados entre sí.

1. `NetworkApp.jsx` tiene su propio `createOpen`/`setCreateOpen` (línea
   ~64) y pasa `onOpenCreate={() => setCreateOpen(true)}` a CADA página
   (Home, Influencers, Brands, Opportunities, Collaborations — líneas
   108-116). Los botones "+ Nueva marca" (dentro del EmptyState de
   `BrandsPage.jsx`), "+ Nueva oportunidad" (`OpportunitiesPage.jsx`,
   botón de header) y "+ Nueva colaboración" (`CollaborationsPage.jsx`,
   botón de header) llaman TODOS a ese `onOpenCreate`.
2. Pero el `<CreateSheet>` de `NetworkApp.jsx` que reacciona a ese
   estado solo se renderiza `{!isMobile && (...)}` (línea ~141) —
   ¡nunca en mobile!
3. En mobile, el ÚNICO `<CreateSheet>` que existe es el de
   `MobileLayout.jsx`, controlado por SU PROPIO `createOpen` local
   (línea 168), que solo el FAB central de la botonera puede abrir
   (línea 201: `onClick={() => setCreateOpen(true)}`).

Por eso: en mobile, tocar "+ Nueva marca/oportunidad/colaboración"
cambia el `createOpen` de `NetworkApp` — que no dibuja nada — y el
`createOpen` de `MobileLayout` (el que sí tiene un CreateSheet visible)
nunca se entera. Solo el FAB, que vive en el mismo componente que su
propio CreateSheet, funciona.

## OBJECTIVE

1. Un usuario de Network que se loguea llega directo a Network Home con
   la sidebar/bottom-nav correcta — sin pantalla intermedia rota.
2. El Manual se siente diseñado: la barra de categorías queda SIEMPRE
   visible con efecto glass, y cada sección aparece con una animación
   de entrada al hacer scroll, no todo de golpe.
3. "+ Nueva marca/oportunidad/colaboración" abren el mismo panel rápido
   que ya funciona desde el FAB de la botonera, en mobile y desktop por
   igual — como corresponde a un alta rápida que se completa del todo
   ya dentro del detalle de cada registro.

## FILES TO MODIFY

src/App.jsx                              → BUG-A (3 bloques puntuales) + BUG-B (una clase nueva en GlobalStyles)
src/network/components/ManualNav.jsx     → BUG-B (sticky top responsivo + clase glass)
src/network/components/ManualSection.jsx → BUG-B (animación de aparición)
src/network/NetworkApp.jsx               → BUG-C (levantar createOpen a props hacia MobileLayout)
src/network/MobileLayout.jsx             → BUG-C (recibir createOpen por props en vez de estado local)

## BUG-A · CAMBIOS EXACTOS

### 1. `handleLogin` (línea ~1101)

Cambiar:

```jsx
const handleLogin = (user) => {
  setCurrentUser(user)
  setShowPortal(true)
  setCurrentView(defaultViewFor(user))
}
```

por:

```jsx
const handleLogin = (user) => {
  setCurrentUser(user)
  const view = defaultViewFor(user)
  if (view === 'network') {
    // Los roles de Network entran directo — el portal de video es
    // del hub multi-ecosistema, no tiene sentido para este módulo.
    if (!window.location.pathname.startsWith('/network')) {
      window.history.pushState({}, '', '/network')
    }
    setCurrentView(view)
  } else {
    setShowPortal(true)
    setCurrentView(view)
  }
}
```

### 2. Dentro de `loadProfile`, la rama `if (isSignIn && user)` (línea ~1129)

Cambiar:

```jsx
if (isSignIn && user) {
  setShowPortal(true)
  setCurrentView(defaultViewFor(user))
}
```

por:

```jsx
if (isSignIn && user) {
  const view = defaultViewFor(user)
  if (view === 'network') {
    if (!window.location.pathname.startsWith('/network')) {
      window.history.pushState({}, '', '/network')
    }
    setCurrentView(view)
  } else {
    setShowPortal(true)
    setCurrentView(view)
  }
}
```

### 3. `VideoPortal` (línea ~1565-1574): NO TOCAR

Con los dos cambios de arriba, ningún rol de Network vuelve a pasar por
`showPortal`, así que `onEnter` sigue funcionando exactamente igual para
el resto de los roles (hub/dashboard). Tocarlo no aporta nada y suma
riesgo sobre un archivo de 119KB compartido — no lo hagas.

## BUG-B · CAMBIOS EXACTOS

### 1. `src/App.jsx` — dentro de `GlobalStyles`, agregar (cerca de `.nw-bottom-nav`):

```css
.nw-manual-nav { background: var(--glass-bg); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); }
@supports not (backdrop-filter: blur(1px)) { .nw-manual-nav { background: var(--bg-primary); } }
```

### 2. `src/network/components/ManualNav.jsx`

Agregar un hook local de mobile (mismo patrón que ya usan
`BrandsPage.jsx`/`OpportunitiesPage.jsx` con su `useIsDesktop` — acá
usalo en la forma `useIsMobile`, punto de corte 640px como el resto de
Network) y usarlo para el `top` sticky, y cambiar `background`/agregar
`className`:

```jsx
const useIsMobile = () => {
  const [mobile, setMobile] = useState(window.innerWidth < 640)
  useEffect(() => {
    const h = () => setMobile(window.innerWidth < 640)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])
  return mobile
}
```

Y en el `<div ref={barRef} ...>`, cambiar:

```jsx
style={{
  display: 'flex', gap: 6, overflowX: 'auto', padding: '10px 20px',
  background: 'var(--bg-primary)', borderBottom: '1px solid var(--border-violet)',
  position: 'sticky', top: 0, zIndex: 20,
  scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch',
}}
```

por:

```jsx
className="nw-manual-nav"
style={{
  display: 'flex', gap: 6, overflowX: 'auto', padding: '10px 20px',
  borderBottom: '1px solid var(--border-violet)',
  position: 'sticky', top: isMobile ? 52 : 0, zIndex: 20,
  scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch',
}}
```

(52 = el alto exacto de `MobileHeader` en `MobileLayout.jsx`, línea 18.
En desktop no hay header propio arriba del Outlet, por eso `top: 0` ahí.
El `background` sale del inline style porque ahora lo pone la clase.)

### 3. `src/network/components/ManualSection.jsx` — animación de aparición

Agregar un IntersectionObserver local (una sola vez, no se vuelve a
disparar al scrollear hacia arriba) que revela la sección con una
transición suave, SIN interferir con el `sectionRef` que ya usa
`ManualPage.jsx` para el scrollspy — se combinan los dos refs en un solo
callback:

```jsx
import React, { useState, useRef, useEffect } from 'react'
```

Dentro del componente, antes del `return`:

```jsx
const [revealed, setRevealed] = useState(false)
const localRef = useRef(null)

useEffect(() => {
  const el = localRef.current
  if (!el) return
  const obs = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) {
        setRevealed(true)
        obs.disconnect() // one-shot: no vuelve a ocultarse al scrollear hacia arriba
      }
    },
    { threshold: 0.1, rootMargin: '0px 0px -60px 0px' }
  )
  obs.observe(el)
  return () => obs.disconnect()
}, [])
```

Y en el `<div>` raíz de la sección, combinar el ref del scrollspy con el
local, y agregar la transición:

```jsx
<div
  ref={el => { sectionRef(el); localRef.current = el }}
  data-category={section.category}
  style={{
    paddingTop: 32, paddingBottom: 8,
    borderBottom: '1px solid rgba(139,92,246,0.1)',
    opacity: revealed ? 1 : 0,
    transform: revealed ? 'translateY(0)' : 'translateY(16px)',
    transition: 'opacity 0.5s ease, transform 0.5s ease',
  }}
>
```

(reusa el mismo lenguaje visual que `@keyframes fadeIn` de GlobalStyles
— translateY + opacity — pero como transición ligada al reveal real del
IntersectionObserver, no como keyframe que se dispara solo al montar.)

## BUG-C · CAMBIOS EXACTOS

### 1. `src/network/NetworkApp.jsx` (línea ~104)

Cambiar:

```jsx
isMobile
  ? <MobileLayout currentUser={currentUser} onCreated={handleCreated}/>
  : <NetworkLayout currentUser={currentUser}/>
```

por:

```jsx
isMobile
  ? <MobileLayout
      currentUser={currentUser}
      onCreated={handleCreated}
      createOpen={createOpen}
      onOpenCreate={() => setCreateOpen(true)}
      onCloseCreate={() => setCreateOpen(false)}
    />
  : <NetworkLayout currentUser={currentUser}/>
```

(el `<CreateSheet>` que ya renderiza `NetworkApp` para desktop, línea
~141, no se toca — sigue usando el mismo `createOpen`/`setCreateOpen`
de siempre. El cambio es que ahora ESE MISMO estado también gobierna el
CreateSheet de mobile, en vez de que mobile tenga el suyo aparte.)

### 2. `src/network/MobileLayout.jsx`

Cambiar la firma (línea 167):

```jsx
export default function MobileLayout({ currentUser, onCreated }) {
  const [createOpen, setCreateOpen] = useState(false)
```

por:

```jsx
export default function MobileLayout({ currentUser, onCreated, createOpen, onOpenCreate, onCloseCreate }) {
```

(se elimina el `useState` local — `createOpen` ahora llega por props.)

El FAB central (línea 201), cambiar:

```jsx
onClick={() => setCreateOpen(true)}
```

por:

```jsx
onClick={onOpenCreate}
```

Y el `<CreateSheet>` del final (líneas 214-219), cambiar:

```jsx
<CreateSheet
  isOpen={createOpen}
  onClose={() => setCreateOpen(false)}
  currentUser={currentUser}
  onCreated={onCreated}
/>
```

por:

```jsx
<CreateSheet
  isOpen={createOpen}
  onClose={onCloseCreate}
  currentUser={currentUser}
  onCreated={onCreated}
/>
```

## EDGE CASES

- BUG-A: un scouter con un link directo a `/network/opportunities/123`
  que expira sesión y vuelve a loguearse — el `pathname.startsWith('/network')`
  ya es true antes del push, así que NO se pisa esa URL con `/network` a
  secas; el deep link se preserva.
- BUG-A: un usuario de Dirección/hub (no-Network) sigue viendo el
  VideoPortal exactamente igual que antes — cero regresión ahí.
- BUG-B: en desktop (`NetworkLayout.jsx`, sin `MobileHeader`), la barra
  de categorías del Manual sigue pegada arriba del todo (`top: 0`), no
  se le agrega un hueco de 52px que no tiene sentido ahí.
- BUG-B: si una sección ya está visible en el viewport apenas se monta
  la página (sin necesidad de scrollear), el IntersectionObserver la
  marca `revealed` casi inmediatamente — no debe quedar nunca invisible
  esperando un scroll que no va a llegar.
- BUG-B: reabrir el Manual una segunda vez en la misma sesión (navegar
  afuera y volver) — el componente se vuelve a montar de cero, así que
  las secciones vuelven a animar su entrada; es el comportamiento
  esperado, no hay estado que "recordar" entre visitas.
- BUG-C: abrir el CreateSheet desde "+ Nueva marca" en mobile, cerrarlo,
  y después abrirlo desde el FAB de la botonera — tiene que ser
  exactamente el mismo panel/estado, sin duplicar instancias.
- BUG-C: en desktop, cero cambio de comportamiento — ya funcionaba.

## TESTS

1. Loguearse con un usuario scouter: aparece directo Network Home con
   la bottom-nav flotante (o el sidebar de Network en desktop) — sin
   pantalla de video ni sidebar del sistema viejo de por medio.
2. Loguearse con un usuario de Dirección/hub sin rol de Network: el
   VideoPortal sigue apareciendo igual que siempre.
3. Loguearse con un link guardado a `/network/brands/<id>`: tras
   loguearse, se llega a esa marca puntual, no a Home.
4. En mobile: tocar "+ Nueva marca" desde el estado vacío de
   `BrandsPage` abre el panel de alta rápida.
5. En mobile: tocar "+ Nueva oportunidad" en `OpportunitiesPage` abre el
   mismo panel.
6. En mobile: tocar "+ Nueva colaboración" en `CollaborationsPage` abre
   el mismo panel.
7. En mobile: el FAB de la botonera sigue abriendo el panel
   correctamente (no regresionar el único camino que ya andaba).
8. Desktop: los tres botones + el FAB (si aplica) siguen funcionando
   como antes.
9. Abrir `/network/manual` y scrollear: la barra de categorías queda
   siempre visible, con blur, nunca tapada por el header ni por el
   contenido.
10. Scrollear el Manual de a poco: cada sección aparece con una
    transición de opacidad + desplazamiento al entrar en pantalla, no
    todas de golpe al cargar.
11. Scrollear hacia arriba y de nuevo hacia abajo en el Manual: una
    sección ya revelada NO vuelve a desaparecer.

## ACCEPTANCE CRITERIA

1. Ningún rol de Network ve el VideoPortal ni una pantalla/sidebar
   equivocada al loguearse.
2. Deep links a `/network/*` sobreviven un logout/login.
3. La barra de categorías del Manual es glass y está siempre visible al
   scrollear, sin quedar tapada por ningún header.
4. Las secciones del Manual aparecen con una animación de entrada al
   hacer scroll, una sola vez cada una.
5. Los tres botones de alta rápida por página (marca, oportunidad,
   colaboración) funcionan en mobile igual que en desktop.
6. Cero dependencias nuevas.
7. Cero regresión en el VideoPortal para roles no-Network, ni en el FAB
   de la botonera, ni en el Manual de desktop.

## DO NOT

- No reescribas `App.jsx` más allá de los 3 bloques de BUG-A + la clase
  CSS de BUG-B.
- No agregues una librería de animación.
- No elimines el `VideoPortal` del todo — solo se lo salta para roles
  de Network.
- No toques `ManualPage.jsx` — el scrollspy y el agrupado por categoría
  ya funcionan, esto es solo nav + reveal de secciones.
- No conviertas el IntersectionObserver de reveal en algo que se
  reactive en cada scroll (debe ser one-shot por sección).

## ANTES DE ESCRIBIR CÓDIGO

Confirmá los números de línea de CONTEXT contra el repo actual (pueden
haber corrido unas pocas líneas). Si alguno de los tres bugs no
reproduce tal como se describe, PARÁ y reportalo en vez de aplicar el
fix sobre un código distinto al documentado.
```
