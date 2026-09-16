# PROMPT EXPERTO — Rediseño: escala de texto legible, liquid glass selectivo y movimiento

## REGLAS GLOBALES
- Sin dependencias nuevas, sin librerías de animación. Todo con CSS y las variables que ya existen.
- Sin cambios de estructura ni de lógica: esto es **solo** color, blur y movimiento. Ningún `useState`, ninguna consulta, ningún handler nuevo.
- Los dos temas tienen que quedar bien: hay un `[data-theme="light"]` en `App.jsx` que sobreescribe variables. Cada token que se agregue en `:root` necesita su equivalente ahí.
- `npm run build` limpio antes de cada commit. Un commit por parte.

## CONTEXTO — lo que ya existe (no reconstruirlo)
`App.jsx` tiene un sistema de diseño completo en `:root` (~línea 92): paleta violeta, `--glass-bg`, glows, radios, y además **infraestructura de movimiento ya montada y casi sin usar**:
```
--ease-standard:   cubic-bezier(0.4, 0, 0.2, 1)
--ease-emphasized: cubic-bezier(0.16, 1, 0.3, 1)
--ease-spring:     cubic-bezier(0.34, 1.56, 0.64, 1)
--dur-fast: 150ms   --dur-base: 250ms   --dur-slow: 400ms
```
Keyframes ya definidos: `fadeIn, slideIn, slideUp, slideInDrawer, cardIn, backdropIn, badgePulse, notifSlide, pulse, spin, float, aurora, hubNodeIn, starTwinkle`. Y ya hay un bloque `@media (prefers-reduced-motion: reduce)` (~línea 155) que neutraliza varios de esos keyframes.

Uso actual medido: `var(--dur-*)` 15 veces, `var(--ease-*)` 16, `cardIn` 6, `slideUp` 9. O sea: **el sistema está construido y subutilizado.** El trabajo es usarlo con criterio, no inventar otro.

---

# PARTE A — Escala de texto legible (alto impacto, bajo riesgo)

## Diagnóstico medido
El violeta `--text-secondary: #C4B5FD` a opacidad completa tiene contraste **10.81** sobre el fondo: está perfecto. El problema son los **49 usos de ese violeta con opacidad reducida**, que no pasan el mínimo AA de 4.5 para texto chico:

| uso | ocurrencias | contraste | estado |
|---|---|---|---|
| `rgba(196,181,253,0.7)` | 17 | 5.94 | pasa justo |
| `rgba(196,181,253,0.6)` | 5 | 4.55 | al límite |
| `rgba(196,181,253,0.5)` | 12 | 3.37 | **falla** |
| `rgba(196,181,253,0.45)` | 1 | 2.93 | **falla** |
| `rgba(196,181,253,0.4)` | 9 | 2.53 | **falla** |
| `rgba(196,181,253,0.35)` | 3 | 2.19 | **falla** |

Casi todos están en textos de 10-12px. **Y están concentrados en solo dos archivos**: `components/Admin/AdminPanel.jsx` (42) y `components/Auth/LoginScreen.jsx` (7). El módulo Network no tiene ninguno porque usa `var(--text-secondary)` correctamente — así que se arregla solo al cambiar la variable.

## A.1 — Nuevos tokens en `App.jsx`
En `:root` (~línea 104), reemplazar el secundario violeta y agregar dos niveles más:
```css
      --text-primary: #F9FAFB;    /* sin cambios — 19.10 */
      --text-secondary: #C9C4DA;  /* era #C4B5FD (violeta) — gris malva, 11.78 */
      --text-tertiary: #948FA8;   /* nuevo — para lo secundario de verdad, 6.42 */
      --text-muted: #948FA8;      /* alias de tertiary: cualquier cosa más tenue usa este */
```
Y en `[data-theme="light"]` (~línea 127), los equivalentes:
```css
      --text-primary: #1E1B4B; --text-secondary: #4A4458; --text-tertiary: #635C78; --text-muted: #635C78;
```
(verificados: 8.29 y 5.62 sobre el fondo claro, 6.70 y 4.54 sobre las tarjetas claras).

**Criterio**: el violeta deja de ser color de texto y queda para lo interactivo — botones, estados activos, bordes, glows, íconos de acento. `--primary-violet` como texto da 4.71, que pasa justo: usarlo solo en etiquetas de 13px o más, nunca en 10-11px.

## A.2 — Reemplazar los 49 hardcodeados (solo 2 archivos)
En `AdminPanel.jsx` y `LoginScreen.jsx`, mapear por banda de opacidad:
```
rgba(196,181,253,0.8)  → var(--text-secondary)
rgba(196,181,253,0.75) → var(--text-secondary)
rgba(196,181,253,0.7)  → var(--text-secondary)
rgba(196,181,253,0.6)  → var(--text-secondary)
rgba(196,181,253,0.5)  → var(--text-tertiary)
rgba(196,181,253,0.45) → var(--text-tertiary)
rgba(196,181,253,0.4)  → var(--text-tertiary)
rgba(196,181,253,0.35) → var(--text-tertiary)
```
**Importante**: esto aplica solo cuando ese color se usa como `color:` de texto. Si aparece como `background`, `border` o `boxShadow`, **dejarlo como está** — ahí la transparencia es correcta y deseada. Revisar cada ocurrencia, no hacer un reemplazo ciego.

Además, en esos dos archivos hay literales `#C4B5FD` y `#A78BFA` usados como color de texto: los de texto corrido pasan a `var(--text-secondary)`; los que marcan algo interactivo o un título de sección se quedan en violeta.

## A.3 — Verificación
Después del cambio, no debe quedar ningún `rgba(196,181,253,` usado como `color:` en `src/`. Los que queden tienen que ser fondos o bordes.

Commit: `feat(diseno): escala de texto legible, el violeta pasa a ser solo color de acento`

---

# PARTE B — Liquid glass selectivo

## El único problema real de rendimiento
`src/network/components/NetworkCard.jsx` línea 64 tiene `backdropFilter: 'blur(20px)'`. **Ese componente se renderiza una vez por fila** en las listas de influencers, marcas, oportunidades y colaboraciones. Con la importación masiva recién agregada, esas listas van a tener cientos de filas, y cada `backdrop-filter` obliga al navegador a recomponer lo que hay detrás. En celular eso es scroll trabado justo en las pantallas más usadas.

Todos los demás blur del proyecto están bien: son overlays, modales, barras de navegación y headers — pocos y fijos.

## B.1 — Sacar el blur de las filas de lista
En `NetworkCard.jsx`, quitar `backdropFilter` y `WebkitBackdropFilter`, y compensar visualmente subiendo la opacidad del fondo para que la tarjeta siga leyéndose como vidrio sin costar nada:
```js
      background: 'rgba(30, 21, 53, 0.72)',   // en vez de var(--glass-bg) + blur
      border: '1px solid var(--border-violet)',
```
Si el tema claro lo necesita distinto, agregar una variable nueva `--card-solid-bg` en `:root` y su equivalente en `[data-theme="light"]`, en vez de hardcodear.

## B.2 — Reforzar el glass donde sí corresponde
Subir la calidad del efecto en el "chrome", que son pocos elementos:
- `.nw-bottom-nav` (App.jsx ~196) y `.nw-manual-nav` (~200): ya tienen blur 28 y 20 y ya tienen su `@supports not (backdrop-filter)` de respaldo. Dejarlos, pero agregarles un borde superior de luz (`border-top: 1px solid rgba(255,255,255,0.08)`) y una sombra suave hacia arriba: eso es lo que da la sensación de vidrio real, más que subir el blur.
- Modales y hojas (`CreateSheet`, `ImportSheet`, `ScouterModal`, `AssignModal`, los modales del AdminPanel): unificar el blur del overlay en 8px y el del panel en 24px. Hoy hay valores dispersos entre 2, 3, 4, 8, 10 y 40 sin criterio.
- `.card` (App.jsx ~173) tiene blur(40px) pero `className="card"` se usa **una sola vez** en todo el proyecto: bajarlo a 24px y dejarlo.
- **Bajar todos los blur de 40px a 24px**: arriba de ~25px el efecto visual no mejora y el costo sigue subiendo.

## B.3 — Respaldo donde falta
Ya hay dos bloques `@supports not (backdrop-filter: blur(1px))` para las barras. Extender ese patrón a los paneles de modales y hojas: sin respaldo, en un navegador sin soporte el panel queda semitransparente y el texto ilegible sobre el contenido de atrás.

Commit: `feat(diseno): glass selectivo — fuera de las filas de lista, reforzado en la navegacion`

---

# PARTE C — Movimiento con criterio

## La trampa específica de esta app (leer antes de animar)
`AdminPanel` recarga la lista de usuarios **cada 5 segundos** (`setInterval(refreshUsers, 5000)`) y `MonitorSection` recarga el log **cada 10**. Si las animaciones de entrada se disparan con la llegada de datos, esas dos pantallas van a parpadear sin parar y son inusables.

**Regla**: toda animación de entrada se dispara al **montar** el componente, nunca al actualizarse los datos. En listas que se recargan solas, no animar las filas. Si una fila necesita animarse, que sea con `key` estable y `animation` aplicada una sola vez vía CSS al montar, no re-disparada por cambios de estado.

## C.1 — Lo que sí vale la pena
- **Hojas y modales**: entrada con `slideUp` en móvil (viene desde abajo, se entiende de dónde salió) y un `scale(0.97) → 1` con `fadeIn` en escritorio. Usar `var(--dur-base)` con `var(--ease-emphasized)`. El overlay con `backdropIn` en `var(--dur-fast)`.
- **Cambio de segmento** (Influencers / Marcas / Oportunidades): un `fadeIn` corto de `var(--dur-fast)` en el contenedor del contenido. Nada de deslizamientos laterales: con React Router terminan peleándose con el scroll.
- **Acciones largas**: el botón "Convertir a Colaboración" y la barra del importador. Ahí la animación informa (algo está pasando) en vez de decorar. Un `pulse` suave en el botón mientras `converting` es true, y una barra de progreso con transición de ancho en `var(--dur-base) var(--ease-standard)`.
- **Escalonado al cargar una lista**, pero **solo en el primer montaje**: `animation-delay: calc(var(--i, 0) * 30ms)` con tope en ~12 filas (más allá de eso el usuario ya está esperando de gusto). Mismo patrón que ya usa `SimpleMarkdown.jsx` en el Manual — copiar de ahí.
- **Estados interactivos**: `transition: background var(--dur-fast) var(--ease-standard), border-color var(--dur-fast) var(--ease-standard)` en botones e inputs. Barato y se nota.

## C.2 — Lo que NO hacer
- Nada de hover animado en filas de lista: en celular no existe el hover, y en escritorio con cientos de filas es ruido visual. El `.card:hover { transform: translateY(-4px) }` actual está bien porque `.card` casi no se usa; no replicarlo en `NetworkCard`.
- Nada de glow pulsante permanente: cansa a los diez minutos de uso real.
- Nada de animar `width`, `height`, `top` o `left`. Solo `transform` y `opacity`, que son las dos propiedades que el navegador puede animar sin recalcular el layout.
- Ninguna animación de entrada que se re-dispare al refrescar datos (ver la trampa de arriba).

## C.3 — Accesibilidad
Extender el bloque `@media (prefers-reduced-motion: reduce)` que ya existe (~línea 155) para cubrir cualquier keyframe nuevo, y agregarle una regla general:
```css
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
      }
    }
```
Esto no es opcional: hay gente para la que el movimiento genera mareo, y la app se usa varias horas por día.

Commit: `feat(diseno): movimiento con criterio en hojas, modales y acciones largas`

---

## TESTS
1. **Legibilidad**: abrir el Admin Panel y revisar los textos de 10-11px (fechas, "Último acceso", subtítulos). Tienen que leerse sin esfuerzo. Comparar contra una captura previa.
2. **Tema claro**: cambiar a tema claro y repetir. Ningún texto puede quedar lavado sobre el fondo claro.
3. **Rendimiento**: abrir Influencers con la lista más larga que haya y hacer scroll rápido en celular. Tiene que ir fluido. Es el test que valida sacar el blur de `NetworkCard`.
4. **Parpadeo**: dejar el Admin Panel abierto un minuto en la sección Usuarios y otro en Monitor Live. Nada puede animarse solo cada 5 o 10 segundos.
5. **Reduced motion**: activar "reducir movimiento" en el sistema operativo y confirmar que la app sigue siendo usable y que nada se mueve.
6. Verificar que no quedó ningún `rgba(196,181,253,` usado como `color:` en `src/`.

## ACCEPTANCE CRITERIA
- Ningún texto de la interfaz por debajo del mínimo de contraste AA (4.5) en ninguno de los dos temas.
- El violeta aparece como acento, no como color de lectura.
- Las listas largas hacen scroll fluido en celular.
- Las hojas y modales entran con una transición que explica de dónde vienen.
- Nada se anima solo por una recarga de datos.
- `npm run build` limpio, todo pusheado.

## DO NOT
- No tocar lógica, consultas, handlers ni estructura de componentes.
- No agregar dependencias ni librerías de animación.
- No inventar variables nuevas de easing o duración: ya existen seis, usarlas.
- No poner `backdrop-filter` en ningún componente que se renderice por fila.
- No animar `width`/`height`/`top`/`left`.
- No tocar el módulo de importación ni el Admin Panel más allá del color.
