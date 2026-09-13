# PROMPT 3B — Bottom nav flotante (glassmorphism)

Solo CSS/JSX, sin SQL, sin dependencias nuevas. Pegar a Claude Code: las
REGLAS GLOBALES de abajo + todo el bloque del prompt.

---

```
PROMPT 3B — BOTTOM NAV FLOTANTE

## REGLAS GLOBALES

1. No modifiques archivos fuera de FILES TO MODIFY.
2. Preservá el sistema visual existente: reusá las CSS vars ya definidas
   en GlobalStyles (App.jsx) — --glass-bg, --border-violet,
   --glow-violet-sm. No agregues colores nuevos hardcodeados.
3. Escribí el diff mínimo. Esto es un cambio puramente visual: no
   refactorices MobileLayout.jsx ni NetworkLayout.jsx de paso.
4. No toques NetworkLayout.jsx (sidebar de desktop) — no tiene bottom
   nav, este cambio es exclusivo de mobile.
5. No agregues dependencias nuevas.
6. Mobile-first, 390px primero: la barra tiene que verse flotante y
   completa sin scroll horizontal en el ancho más chico soportado.
7. Si encontrás una tercera referencia a la altura de la bottom nav que
   no esté listada en FILES TO MODIFY, PARÁ y reportala en vez de
   dejarla desincronizada.

## CONTEXT

`src/network/MobileLayout.jsx` ya tiene una bottom nav con blur
(`.nw-bottom-nav`, definida en `src/App.jsx` dentro de `GlobalStyles`),
pero está pegada a los tres bordes de la pantalla: `left:0, right:0,
bottom:0`, sin border-radius, con un simple `border-top`. Es un glass
bar, pero no un glass bar FLOTANTE.

Hay dos lugares más que asumen la geometría exacta de esa barra y hay
que actualizar en conjunto para no romperlos:

1. El `<div>` raíz de `MobileLayout.jsx` tiene
   `paddingBottom: 'calc(64px + env(safe-area-inset-bottom, 0px))'` —
   el espacio que le deja al contenido para que no quede tapado detrás
   de la barra fija.
2. `.nw-save-bar` en `App.jsx` (la barra de Guardar/Cancelar que usan
   `InfluencerDetailPage.jsx` y `BrandDetailPage.jsx` al editar) tiene
   `@media (max-width: 767px) { .nw-save-bar { bottom: calc(60px + ...) } }`
   — asume que la bottom nav mide 60-64px y está pegada al borde. Si la
   bottom nav pasa a flotar con un margen, esta barra tiene que
   levantarse la misma distancia o va a quedar tapada por la nav.

## OBJECTIVE

Que la bottom nav de mobile se vea como una isla flotante con
glassmorphism: separada de los tres bordes de la pantalla, esquinas
redondeadas, blur más marcado, con sombra de elevación — sin romper el
FAB central que ya sobresale por arriba, ni la barra de guardar que
depende de su altura.

## FILES TO MODIFY

src/App.jsx                              → CSS de .nw-bottom-nav y .nw-save-bar (GlobalStyles)
src/network/MobileLayout.jsx             → posición/tamaño inline de <nav className="nw-bottom-nav"> y el paddingBottom del contenedor raíz

## CAMBIOS EXACTOS

### 1. `src/App.jsx` — dentro de `GlobalStyles`, reemplazar:

```css
.nw-bottom-nav { background: var(--glass-bg); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border-top: 1px solid var(--border-violet); }
@supports not (backdrop-filter: blur(1px)) { .nw-bottom-nav { background: var(--bg-secondary); } }
```

por:

```css
.nw-bottom-nav { background: var(--glass-bg); backdrop-filter: blur(28px); -webkit-backdrop-filter: blur(28px); border: 1px solid var(--border-violet); border-radius: 24px; box-shadow: var(--glow-violet-sm), 0 12px 32px rgba(0,0,0,0.45); }
@supports not (backdrop-filter: blur(1px)) { .nw-bottom-nav { background: var(--bg-secondary); } }
```

(pasa de `border-top` a `border` completo + `border-radius` + sombra de
elevación — el `@supports not` de fallback no necesita tocarse, ya
sigue aplicando sobre la base con radius/sombra incluidos).

### 2. `src/App.jsx` — la media query de `.nw-save-bar`, reemplazar:

```css
@media (max-width: 767px) { .nw-save-bar { bottom: calc(60px + env(safe-area-inset-bottom, 0px)); } }
```

por:

```css
@media (max-width: 767px) { .nw-save-bar { bottom: calc(88px + env(safe-area-inset-bottom, 0px)); } }
```

(88px = 16px de margen inferior de la nav flotante + 64px de alto de la
nav + 8px de aire entre las dos barras — ver el cálculo completo abajo).

### 3. `src/network/MobileLayout.jsx` — el `<nav className="nw-bottom-nav" ...>`:

Cambiar:

```jsx
<nav className="nw-bottom-nav" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: 'calc(60px + env(safe-area-inset-bottom, 0px))', display: 'flex', alignItems: 'center', zIndex: 100, paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
```

por:

```jsx
<nav className="nw-bottom-nav" style={{ position: 'fixed', bottom: 'calc(16px + env(safe-area-inset-bottom, 0px))', left: 16, right: 16, height: 64, display: 'flex', alignItems: 'center', zIndex: 100 }}>
```

(la altura deja de crecer con el safe-area porque ahora el safe-area se
suma al offset inferior — la barra entera se levanta, no se estira; por
eso también se saca el `paddingBottom` interno, que ya no hace falta).

### 4. `src/network/MobileLayout.jsx` — el `<div>` raíz del layout:

Cambiar:

```jsx
paddingBottom: 'calc(64px + env(safe-area-inset-bottom, 0px))'
```

por:

```jsx
paddingBottom: 'calc(96px + env(safe-area-inset-bottom, 0px))'
```

(96px = 16px margen inferior + 64px alto de la nav + 16px de aire entre
el contenido y la barra flotante, para que el último elemento de
cualquier lista no quede pegado al vidrio).

## POR QUÉ ESOS NÚMEROS (no inventarlos de nuevo)

  margen inferior de la nav flotante ......... 16px
  alto de la nav .............................. 64px
  aire entre contenido y nav (padding raíz) ... 16px  → total 96px
  aire entre nw-save-bar y la nav ............. 8px   → total 88px

Si en algún momento cambia el alto de la nav (64px), estos tres números
dependen de él y hay que recalcular los tres juntos — no ajustar uno
solo por prueba y error.

## EDGE CASES

- FAB central (el botón ＋ que ya sobresale con `translateY(-8px)`): NO
  debe quedar recortado por el nuevo `border-radius`. La nav no tiene
  `overflow: hidden` hoy — no agregarlo, o el FAB se corta contra el
  borde redondeado.
- Dispositivo con `safe-area-inset-bottom` grande (notch / home
  indicator): la barra no debe tocar el borde físico ni superponerse
  con los gestos del sistema — por eso el safe-area se suma al margen
  de 16px, no lo reemplaza.
- Navegador sin soporte de `backdrop-filter`: el fallback ya existente
  (`@supports not`) sigue aplicando — verificar que ahí también se vea
  flotante (el radius y la sombra son parte de la regla base, no del
  fallback, así que se heredan igual).
- `InfluencerDetailPage.jsx` / `BrandDetailPage.jsx` en modo edición
  mobile: la `nw-save-bar` tiene que quedar visualmente separada de la
  bottom nav (8px de aire), ni pegada ni con un hueco grande.
- Desktop (`NetworkLayout.jsx`): cero cambios, no tiene bottom nav.

## TESTS

1. En 390px: la bottom nav se ve separada de los tres bordes de la
   pantalla, con esquinas redondeadas y sombra — no pegada a ningún
   borde.
2. Scrollear cualquier lista de Network (Home, Influencers, Manual)
   hasta el final: el último elemento no queda tapado detrás del
   vidrio de la nav.
3. El FAB central sigue sobresaliendo por arriba de la nav, sin
   recortarse contra el borde redondeado.
4. Simular `safe-area-inset-bottom` (DevTools, dispositivo con notch):
   la barra no toca el borde físico de la pantalla.
5. Abrir un Influencer o una Marca, entrar en modo edición en mobile:
   la barra de Guardar/Cancelar aparece apenas arriba de la bottom nav,
   sin superponerse.
6. Desktop (≥768px, `NetworkLayout.jsx`): sin cambios visuales.
7. Sin scroll horizontal en ningún ancho de pantalla ≥ 360px.

## ACCEPTANCE CRITERIA

1. La bottom nav de mobile se ve como una isla flotante: separada de
   los tres bordes, con blur, borde y sombra de elevación.
2. Ningún contenido queda oculto detrás de la barra en ninguna página
   de Network.
3. La barra de Guardar/Cancelar de detalle sigue funcionando y
   posicionada correctamente relativa a la nueva altura de la nav.
4. Cero regresión en desktop.
5. Cero dependencias nuevas, cero colores hardcodeados fuera de las CSS
   vars existentes.

## DO NOT

- No toques NetworkLayout.jsx.
- No agregues overflow:hidden a la nav (recorta el FAB).
- No cambies el alto del header superior (`MobileHeader`) ni del
  drawer (`NavDrawer`).
- No introduzcas una librería de animación para el efecto flotante — es
  CSS puro (backdrop-filter + border-radius + box-shadow).

## ANTES DE ESCRIBIR CÓDIGO

Confirmá que los tres archivos/bloques de CAMBIOS EXACTOS coinciden con
lo que ves en el repo (los valores de referencia son 60-64px de alto y
`bottom:0/left:0/right:0` sin radius). Si alguno ya cambió por otro
motivo, reportalo antes de aplicar el diff.
```
