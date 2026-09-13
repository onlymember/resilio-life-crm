# PROMPT 3A — Colaboraciones, Oportunidades, Contacto de Marcas, Calendario y Manual

**Antes de ejecutar:** correr en el SQL Editor de Supabase, EN ESTE ORDEN:

1. `000_diagnostico_fase3.sql` (solo lectura) — pegar el resultado de los 5 bloques
   en el chat de Claude Code ANTES de que arranque a escribir código.
2. `027_brand_contact_and_manual_schema.sql`
3. `028_manual_content_seed.sql`
4. `029_calendar.sql`

Los cuatro son idempotentes (`IF NOT EXISTS` / `ON CONFLICT ... DO UPDATE`) y
tienen su rollback comentado al final. Correrlos dos veces no rompe nada.

Pegar a Claude Code: primero las REGLAS GLOBALES de abajo, después todo el
bloque del prompt.

---

```
PROMPT 3A — COLABORACIONES, OPORTUNIDADES, CONTACTO DE MARCAS, CALENDARIO Y MANUAL

## REGLAS GLOBALES

1. No modifiques módulos fuera de FILES TO MODIFY / FILES TO CREATE. Si
   necesitás tocar otro archivo, PARÁ y reportá por qué.
2. Ninguna migración destructiva. Las 4 migraciones de este prompt ya están
   escritas (000, 027, 028, 029) — no las reescribas, y si te hace falta una
   migración nueva, escribila con su rollback antes de aplicarla.
3. No borres datos. Renombrar > borrar. Deprecar > eliminar.
4. Esconder un botón no es seguridad. La seguridad real vive en RLS.
5. Si la especificación contradice al código, no inventes: reportá la
   contradicción y proponé la opción más segura y reversible.
6. No agregues dependencias nuevas. Ninguno de los cinco workstreams de
   este prompt las necesita.
7. Preservá el sistema visual existente (las CSS vars de GlobalStyles en
   App.jsx). Nada de esto es un rediseño, incluido el Manual: se adapta al
   sistema, el sistema no se adapta al PDF.
8. Escribí el diff mínimo que cumple los ACCEPTANCE CRITERIA. No
   refactorices de paso.
9. Mobile-first: cada pantalla o componente nuevo se diseña en 390px
   PRIMERO. Nada de tablas horizontales, controles menores a 44px, ni
   interacciones que dependan de hover.
10. Todo el texto sale de t() (src/i18n/es.json + en.json). Cero strings
    hardcodeados.
11. No filtres por owner/scope en el cliente. Ya lo hace RLS a través de
    las funciones SECURITY INVOKER / políticas existentes — duplicarlo
    esconde bugs de RLS en vez de mostrarlos.
12. Los cinco workstreams son independientes entre sí. Si algo bloquea a
    uno, no dejes que bloquee a los otros cuatro: implementalos en el orden
    de este prompt (BUG-1, BUG-2, BUG-3, CALENDARIO, MANUAL) y reportá el
    bloqueo puntual.
13. No toques Notes, Missions, Roadmap ni Rewards. Siguen "soon:true" a
    propósito — no son parte de este prompt.

---

## CONTEXT

Fase 2 (2A→2G) está cerrada: Network tiene shell, routing, RBAC con scope,
RLS real post-migración a Supabase Auth, Command Center, Scouter Home, y
CRM completo (Influencers, Brands, Opportunities, Collaborations, Manual)
en `src/network/`.

Verificado en el código de esta sesión, con evidencia puntual:

1. **Colaboraciones "no lleva a ningún lado".** `CollaborationsPage.jsx`
   navega bien al hacer click en una tarjeta, y `CollaborationDetailPage.jsx`
   carga el registro correctamente. El problema real es que **no hay forma
   de crear una colaboración**: `CreateSheet.jsx` (el modal compartido del
   botón ＋) solo tiene tres `TypeButton`: Influencer, Brand, Opportunity.
   No existe un `CollaborationForm`. El usuario toca ＋, no ve la opción, y
   la sensación es "esto no lleva a ningún lado".

2. **Oportunidades creadas "no aparecen".** `OpportunitiesPage.jsx` carga
   la lista una sola vez: `useEffect(() => { load() }, [load])`, sin ningún
   listener de "se creó algo". `NetworkApp.jsx` tiene un `handleCreated`
   que es un no-op con un comentario que dice "las páginas de lista se
   refrescan solas" — eso es falso, ninguna lo hace. Resultado: creás una
   oportunidad desde el ＋ en cualquier pantalla, el modal cierra, y la
   lista de Opportunities sigue mostrando el estado viejo hasta que hacés
   un refresh manual del navegador.

3. **Faltan botones de WhatsApp/Instagram en las tarjetas.** Verificado
   que el mecanismo FUNCIONA: `NetworkCard.jsx` línea 57 calcula
   `hasQuickActions = entity.whatsapp || entity.instagram || entity.phone`
   y `QuickActions.jsx` arma los links (`wa.me`, `instagram://user?...`
   con fallback a `instagram.com/...`, `tel:`). Para **influencers**
   funciona cuando el dato está cargado (por eso 2 de 3 tarjetas en tu
   captura sí tienen botones). El gap real es doble:
   a) `brands` NO TIENE las columnas `whatsapp`/`instagram`/`phone`/`email`
      en la base — verificado en `rowToBrand`/`brandToRow` en
      `src/lib/database.js`, que no las mapean, y en el schema de
      `supabase/`. Por más que cargues el dato, no hay dónde guardarlo.
   b) `CreateSheet.jsx` (alta rápida) no pide estos campos ni para
      influencer ni para brand — hoy solo se pueden cargar después, a mano,
      desde el detalle. Para brands ni siquiera existe esa pantalla de
      detalle con esos campos (`BrandDetailPage.jsx` no tiene sección de
      Contacto; `InfluencerDetailPage.jsx` sí, líneas ~190-196).

4. **Calendario** sigue con `soon:true` en `routes.js`/`nav.js`. La única
   pieza de datos que existe hoy es `my_agenda(p_days_ahead)` (022), que
   es una ventana fija desde HOY hacia adelante — no sirve para navegar a
   cualquier mes. `029_calendar.sql` (ya corrida antes de este prompt)
   agregó `my_calendar_range(p_from date, p_to date)`, mismo shape de fila
   que `my_agenda` (kind/entity_type/entity_id/title/subtitle/due_at/
   priority/is_overdue/is_today), SECURITY INVOKER.

5. **Manual.** `ManualPage.jsx` + `ManualNav.jsx` + `ManualSection.jsx` +
   `SimpleMarkdown.jsx` ya existen y funcionan: cargan `manual_categories`
   + `manual_sections`, con scrollspy y una barra de categorías
   deslizable y sticky. `SimpleMarkdown.jsx` hoy sólo soporta `**bold**` y
   listas. El manual real (`Manual Scouting Resilio Life.docx.pdf`,
   adjunto) tiene 12 secciones con subtítulos, callouts destacados,
   tablas y cursiva que hoy no se pueden renderizar. El contenido real ya
   está cargado por `028_manual_content_seed.sql` (corrida antes de este
   prompt), con las 12 categorías = 12 secciones del índice del PDF, en
   una relación 1:1 a propósito.

## OBJECTIVE

Cerrar los tres bugs reportados, encender el Calendario, y reemplazar el
contenido del Manual por el real del PDF con el diseño adaptado al
sistema — todo sin tocar Notes/Missions/Roadmap/Rewards ni el resto de la
app fuera de Network.

## FILES TO INSPECT (antes de tocar nada)

src/network/components/CreateSheet.jsx
src/network/NetworkApp.jsx
src/network/pages/OpportunitiesPage.jsx
src/network/pages/CollaborationsPage.jsx
src/network/pages/CollaborationDetailPage.jsx
src/network/pages/InfluencersPage.jsx
src/network/pages/BrandsPage.jsx
src/network/pages/BrandDetailPage.jsx
src/network/pages/InfluencerDetailPage.jsx
src/network/components/NetworkCard.jsx
src/network/components/QuickActions.jsx
src/network/pages/ManualPage.jsx
src/network/components/ManualNav.jsx
src/network/components/ManualSection.jsx
src/network/components/SimpleMarkdown.jsx
src/network/routes.js
src/network/nav.js
src/lib/database.js   (dbSaveCollaboration, dbGetActivationTypes,
                        rowToBrand, brandToRow, dbPatchBrand, FIELD_MAP,
                        dbGetManual, dbGetManualCategories)
src/lib/metrics.js
supabase/022_scouter_home.sql
supabase/029_calendar.sql

## DATABASE

Las cuatro migraciones (000, 027, 028, 029) ya corrieron antes de este
prompt. No las reescribas. Lo que agregaron, para que el código las use:

- `brands.whatsapp / instagram / phone / email` (TEXT, nullable) — nuevas.
- `manual_categories` / `manual_sections` documentadas como tablas
  (existían de forma no versionada; ahora tienen migración). Nueva
  columna `manual_sections.direction_only BOOLEAN DEFAULT false`.
- `my_scouter_level()` — nivel del scouter actual con fallback a 1.
- RLS de manual: `ms_select` exige `min_level <= my_scouter_level() OR
  app_is_direction()` Y `direction_only = false OR app_is_direction()`.
  Las secciones 11 y 12 (Acuerdo Comercial, Anexo Interno) quedaron
  `direction_only = true` porque el PDF fuente las marca "uso de
  Dirección" — un Scouter no debe verlas aunque tenga nivel alto.
- `my_calendar_range(p_from date, p_to date)` — mismo shape de fila que
  `my_agenda`, acotado por rango en vez de ventana fija. Valida
  internamente que el rango no supere 366 días.

## FILES TO MODIFY

src/network/components/CreateSheet.jsx
  → agregar un cuarto TypeButton "Colaboración" (BUG-1).

src/network/NetworkApp.jsx
  → reemplazar el handleCreated no-op por un mecanismo de refresh real
    (BUG-2).

src/network/pages/OpportunitiesPage.jsx
src/network/pages/InfluencersPage.jsx
src/network/pages/BrandsPage.jsx
src/network/pages/CollaborationsPage.jsx
  → suscribirse al mecanismo de refresh de BUG-2 para recargar su lista
    cuando se crea una entidad de su tipo.

src/network/pages/BrandDetailPage.jsx
  → agregar sección "Contacto" (BUG-3), espejando el patrón ya usado en
    InfluencerDetailPage.jsx.

src/lib/database.js
  → dbSaveCollaboration: confirmar que ya soporta el payload del nuevo
    form (si falta algún campo, agregarlo al INSERT, nunca al revés).
  → rowToBrand / brandToRow / dbPatchBrand: agregar whatsapp, instagram,
    phone, email al mapeo y al FIELD_MAP de patch (BUG-3).
  → agregar dbGetCalendarRange(from, to) que llame a
    supabase.rpc('my_calendar_range', { p_from: from, p_to: to }).

src/network/routes.js
src/network/nav.js
  → flip soon:true → false SOLO para /network/calendar. Dejar
    Notes/Missions/Roadmap/Rewards como están (Regla 13).

src/network/components/SimpleMarkdown.jsx
  → extender la sintaxis (ver sección MANUAL).

src/i18n/es.json + en.json
  → claves nuevas: form de colaboración, sección Contacto de marca,
    Calendario (vista mes/agenda, navegación de mes), nada nuevo para
    Manual (ManualNav/ManualSection ya tienen sus claves).

## FILES TO CREATE

src/network/components/CalendarMonthGrid.jsx   vista mes, desktop
src/network/components/CalendarAgendaList.jsx  vista agenda por día, mobile
src/network/pages/CalendarPage.jsx             junta las dos + navegación de mes/rango

(El CollaborationForm de BUG-1 va DENTRO de CreateSheet.jsx, como
InfluencerForm/BrandForm/OpportunityForm ya existentes — no como archivo
aparte, para mantener el mismo patrón del archivo.)

---

## BUG-1 · Colaboraciones — agregar el form que falta

`CollaborationsPage.jsx` y `CollaborationDetailPage.jsx` funcionan bien.
Lo único que falta es poder crear una colaboración desde el ＋.

Agregar en `CreateSheet.jsx`:

- Cuarto `TypeButton`: "Colaboración".
- `CollaborationForm` con:
  - selector de influencer (buscar entre los influencers del scouter,
    igual que ya hace `OpportunityForm` si busca brand/influencer —
    reusar ese patrón de búsqueda, no inventar uno nuevo).
  - selector de marca.
  - tipo de activación: cargar opciones con `dbGetActivationTypes()`
    (ya existe en database.js, usado en otro lado del CRM).
  - status inicial fijo en `'proposed'` (no editable en el alta — el
    flujo de cambio de estado ya vive en `CollaborationDetailPage.jsx`).
  - fecha estimada (opcional).
- Al guardar: `dbSaveCollaboration(payload)` (ya existe, confirmar
  el shape exacto leyendo su implementación antes de armar el payload).
- Cerrar el sheet y disparar el evento de refresh de BUG-2 con
  `entity: 'collaboration'`.

## BUG-2 · Refresh tras crear — reemplazar el no-op

Antes de tocar código: correr `000_diagnostico_fase3.sql` en el SQL
Editor con usuario admin del dashboard y pegar acá los 5 resultados.

- Si el bloque 1 muestra oportunidades reales y el bloque 3/4 muestra
  políticas de SELECT normales para `opportunities` → el problema es
  100% este bug de refresh de cliente, seguir abajo sin tocar RLS.
- Si el bloque 3 muestra `politicas = 0` para `opportunities` o
  `collaborations` con `rls_on = true` → esa tabla devuelve CERO filas a
  cualquier usuario autenticado sin importar el dueño. Reportalo ANTES de
  seguir: hace falta una política de SELECT nueva (plantilla al final de
  `027_brand_contact_and_manual_schema.sql`, sección RLS del Manual, como
  referencia de forma) y eso es un cambio de alcance mayor que este
  prompt no cubre a ciegas — proponelo como migración aparte con su
  rollback, no lo apliques sin confirmación.

Asumiendo que el diagnóstico confirma que es sólo el refresh de cliente:

Implementar un mecanismo simple de "algo se creó" en `NetworkApp.jsx` —
puede ser un `EventTarget`/pub-sub mínimo en un módulo nuevo
(`src/network/lib/entityEvents.js` si hace falta, o un `useState` con un
contador que se pasa por context, lo que genere el diff más chico dado
cómo está armado `NetworkApp.jsx` hoy). Reglas:

- `handleCreated(type, entity)` en `NetworkApp.jsx` PUBLICA el evento en
  vez de ser un no-op.
- Cada página de lista (`OpportunitiesPage`, `InfluencersPage`,
  `BrandsPage`, `CollaborationsPage`) SE SUSCRIBE, y si el `type` creado
  coincide con el suyo, vuelve a llamar a su `load()` existente. No
  reimplementes `load()` — ya existe en las cuatro.
- No hace falta websockets ni Supabase Realtime para esto: es un evento
  local, el CreateSheet y las listas viven en el mismo árbol de React.

## BUG-3 · Contacto de marcas

Migración `027` ya corrida: `brands` tiene `whatsapp/instagram/phone/email`.

1. `database.js`: agregar los cuatro campos a `rowToBrand`, `brandToRow`,
   y al `FIELD_MAP` que usa `dbPatchBrand` (mismo patrón que
   `rowToInfluencer`/`influencerToRow`/`dbPatchInfluencer` ya tienen).
2. `BrandDetailPage.jsx`: agregar sección "Contacto" idéntica en patrón a
   la de `InfluencerDetailPage.jsx` (~línea 190-196) — campos editables
   whatsapp/instagram/phone/email, mismo componente de edición inline si
   existe uno compartido.
3. Confirmar que `NetworkCard.jsx` no necesita cambios: ya lee
   `entity.whatsapp/instagram/phone` genéricamente — en cuanto brand
   tenga esos campos poblados, los botones aparecen solos.
4. Opcional pero recomendado (no bloqueante): agregar estos mismos
   cuatro campos como inputs opcionales en `BrandForm` dentro de
   `CreateSheet.jsx`, para no obligar a un paso extra de "crear y después
   editar". Si el diff crece demasiado, dejalo para un prompt aparte y
   decilo explícitamente en tu resumen final.

## CALENDARIO

Migración `029` ya corrida: `my_calendar_range(p_from, p_to)` disponible.

1. `routes.js` / `nav.js`: `soon: true → false` en la entrada de
   `/network/calendar`. Solo esa entrada.
2. `database.js`: `dbGetCalendarRange(from, to)` → RPC a
   `my_calendar_range`. Mapear la fila igual que ya se mapea el resultado
   de `my_agenda` en `metrics.js`/donde corresponda — reusar ese mapper
   si es posible en vez de duplicarlo.
3. `CalendarPage.jsx`:
   - Estado: mes/rango visible actual (default: mes en curso).
   - Desktop (`CalendarMonthGrid.jsx`): grilla de mes con los días de la
     semana, cada celda muestra hasta 3 ítems + "+N más"; click en un
     ítem lleva al detalle de esa entidad (mismo patrón de navegación
     que ya usan las tarjetas de list pages).
   - Mobile (`CalendarAgendaList.jsx`): NADA de grilla de mes comprimida
     — lista agrupada por día dentro del rango visible (selector de
     semana o mes con flechas ‹ ›, NO un mes entero apretado en 390px).
     Reusar el patrón visual de `AgendaItem.jsx` de la Home si aplica.
   - Ambas vistas comparten los mismos datos de `dbGetCalendarRange`.
   - Al cambiar de mes/rango, volver a pedir datos — no traer "todo" de
     una.
4. Navegación: agregar el link/ítem correspondiente donde
   `NAV_SECTIONS` ya lista las otras páginas de Network.

## MANUAL

Migraciones `027` (schema) y `028` (contenido real) ya corridas. NO hace
falta tocar `ManualPage.jsx`, `ManualNav.jsx` ni `ManualSection.jsx`: la
relación 1:1 categoría↔sección que carga `028` hace que la barra de
categorías existente YA sea "la barra deslizable para elegir entre los
títulos del manual" que se pidió — son las 12 categorías del índice del
PDF, en orden. Si tocás esos tres archivos, primero explicá por qué el
mecanismo existente no alcanza.

Lo único que hace falta es que `SimpleMarkdown.jsx` entienda la sintaxis
extendida que ya está en los `body` de `028_manual_content_seed.sql`:

  `**texto**`     → negrita (ya soportado, no tocar)
  `*texto*`       → cursiva — cuidado de no confundir con `**bold**`,
                    resolver negrita primero y no volver a matchear esos
                    tramos al buscar cursiva simple.
  `## texto`      → subtítulo dentro de la sección (un nivel, no h1..h6)
  `> texto`       → cita/recuadro destacado — el equivalente a los boxes
                    violeta/rosa del PDF; usar una CSS var existente del
                    sistema para el fondo, no un color nuevo hardcodeado.
  `- texto`       → lista con viñetas (ya soportado)
  `1. texto`      → lista numerada (ya soportado)
  `| a | b |`     → fila de tabla; la primera fila de un bloque de líneas
                    `|...|` consecutivas es el header. Tabla con scroll
                    horizontal propio si no entra en 390px (la única
                    excepción mobile permitida — es contenido tabular
                    real del manual, no un layout de la app).
  líneas separadas por una línea en blanco = párrafos distintos (ya
                    soportado)

Las secciones 11 y 12 (`direction_only = true`) no deben aparecer para un
Scouter — eso ya lo filtra la política `ms_select` de la base, así que en
el cliente no hace falta ningún chequeo adicional de rol para esconderlas
(Regla 4: esconder un botón no es seguridad, pero acá la fila ni siquiera
llega — es RLS real, no un `if` en React).

## SECURITY

- Colaboraciones/Oportunidades/Marcas: todo pasa por RLS existente + las
  funciones SECURITY INVOKER ya auditadas en Fase 2. No agregues checks
  de owner en el cliente.
- Calendario: `my_calendar_range` es SECURITY INVOKER — un Scouter ve lo
  suyo, un lead ve su territorio, sin lógica de alcance en el front.
- Manual: la visibilidad de `direction_only` la resuelve la política
  `ms_select`, no un `if (role === ...)` en `ManualPage.jsx`.
- Ningún endpoint nuevo usa `service_role`. Todo sigue siendo anon key +
  JWT del usuario, como el resto de Network.

## UX — REGLAS DURAS

Permitido: bottom sheets, CTAs sticky, controles de 44px mínimo, listas
agrupadas, selectores de fecha simples, autosave en formularios cortos.

Prohibido: grillas de mes comprimidas en mobile, tablas horizontales
fuera del caso explícito del Manual, controles chicos, formularios
interminables, layouts de escritorio estirados/comprimidos sin rediseño.

Preservar las CSS vars de GlobalStyles en los cuatro workstreams. El
Manual usa el diseño EXISTENTE del sistema (dark-glass, las mismas CSS
vars) — el PDF es la fuente del CONTENIDO y de qué elementos visuales
necesita (subtítulos, callouts, tablas, cursiva), no de la paleta.

## EDGE CASES

- Crear una colaboración sin activation types cargados en la base: el
  selector debe mostrar un estado vacío claro, no un `<select>` vacío
  silencioso.
- Doble submit del CollaborationForm (doble tap): deshabilitar el botón
  de guardar mientras la request está en curso, igual que ya hacen
  (verificar) InfluencerForm/BrandForm.
- Refresh de BUG-2 con dos listas montadas a la vez (desktop con
  Context Rail abierto mostrando otra entidad): que el refresh de una no
  pise el estado de detalle abierto de otra.
- Marca sin ningún dato de contacto cargado (la mayoría, hoy): la
  sección Contacto se muestra con estado "sin cargar" y CTA para
  completarlo, no oculta — así se nota que el campo existe.
- Calendario: mes sin ningún ítem → estado vacío que propone acción
  ("agendá tu próximo seguimiento"), no una grilla muda.
- Calendario: un mismo día con más de 3 ítems en la vista mes → "+N más"
  que despliega el resto, sin overflow visual.
- Manual: una sección con `body` vacío (no debería pasar tras `028`, pero
  si `min_level`/RLS deja pasar una fila sin body) → no romper el render,
  mostrar la sección sin contenido en vez de crashear `SimpleMarkdown`.
- Un Scouter de nivel bajo abre `/network/manual`: ve las secciones que
  su `min_level` permite y ninguna `direction_only`. Eso es correcto y no
  hay que "arreglarlo".

## TESTS

 1. Tocar ＋ → Colaboración → completar influencer, marca y tipo de
    activación → guardar → aparece en `CollaborationsPage` sin recargar
    el navegador.
 2. Tocar ＋ → Oportunidad → guardar → aparece en `OpportunitiesPage` sin
    recargar el navegador. Repetir para Influencer y Brand.
 3. Crear dos oportunidades seguidas desde pantallas distintas del ＋: la
    lista de Opportunities muestra las dos, ninguna duplicada.
 4. Abrir una marca sin whatsapp cargado → sección Contacto visible con
    CTA → cargar un whatsapp → guardar → volver a la lista → la tarjeta
    de esa marca ahora muestra el botón de WhatsApp.
 5. Abrir un influencer con whatsapp cargado: el botón sigue funcionando
    igual que antes de este prompt (no regresionar BUG-3 sobre
    influencers).
 6. `/network/calendar` deja de mostrar "próximamente" y muestra datos
    reales del mes en curso.
 7. En Calendario, navegar a un mes sin datos → estado vacío con acción
    propuesta, no pantalla en blanco.
 8. En Calendario, navegar a un mes con más de 3 ítems en un día → "+N
    más" funciona.
 9. En 390px: Calendario usa agenda por día, cero scroll horizontal en la
    página (la tabla del Manual es la única excepción permitida y ya
    tiene su propio scroll acotado).
10. `/network/manual` muestra las 12 secciones del PDF en el mismo orden
    del índice, con la barra de categorías existente funcionando como
    selector de título.
11. Una sección con `## subtítulo`, `> callout`, `*cursiva*` y una tabla
    `| a | b |` en su `body` se renderiza con esos cuatro elementos
    visualmente distintos entre sí.
12. Con un usuario Scouter (no Dirección): las secciones "Acuerdo
    Comercial" y "Anexo Interno" NO aparecen en la barra de categorías
    ni son alcanzables por URL directa a su slug.
13. Con Dirección: esas dos secciones sí aparecen.
14. Ningún string visible hardcodeado: correr el mismo grep de strings
    que ya se usó en prompts anteriores de Network.

## ACCEPTANCE CRITERIA

1. Crear Influencer, Brand, Opportunity o Collaboration desde el ＋
   actualiza la lista correspondiente sin recargar el navegador.
2. Una marca con whatsapp/instagram/phone cargado muestra los mismos
   botones de contacto que ya funcionan para influencers.
3. `/network/calendar` es navegable, con datos reales, mes a mes, en
   desktop y mobile, sin tablas comprimidas en 390px.
4. `/network/manual` muestra el contenido real del PDF, con subtítulos,
   callouts, cursiva y tablas correctamente renderizados, usando la
   barra de categorías existente como selector de título.
5. Las secciones `direction_only` son invisibles para un Scouter a nivel
   de base de datos, no solo de UI.
6. Cero regresión en lo que ya funcionaba (WhatsApp/Instagram de
   influencers, navegación de Colaboraciones y su detalle, Command
   Center, Scouter Home).
7. Cero dependencias nuevas.
8. Todo el texto nuevo sale de t().

## DO NOT

- No toques Notes, Missions, Roadmap ni Rewards — siguen `soon:true`.
- No implementes Supabase Realtime/websockets para BUG-2: un evento
  local alcanza.
- No agregues checks de rol/owner en el cliente donde ya existe RLS o una
  función SECURITY INVOKER.
- No reescribas ManualNav.jsx, ManualSection.jsx ni ManualPage.jsx salvo
  que encuentres una razón concreta y la reportes primero.
- No inventes contenido para las secciones 10, 11 o 12 del Manual más
  allá de lo que ya cargó `028` — si Dirección quiere completarlas, lo
  hace desde el editor inline que ya existe.
- No apliques la plantilla de política RLS del diagnóstico (BUG-2) sin
  confirmar primero, con el resultado real de `000_diagnostico_fase3.sql`,
  que hace falta.

## ANTES DE ESCRIBIR CÓDIGO

Leé FILES TO INSPECT, corré `000_diagnostico_fase3.sql` y pegá el
resultado, verificá que el CONTEXT coincida con el repo tal como está hoy,
y presentame el plan con los archivos que vas a tocar por cada uno de los
cinco workstreams (BUG-1, BUG-2, BUG-3, Calendario, Manual). Si encontrás
una contradicción entre este prompt y el código, reportala en vez de
asumir.
```

---

## Por qué el Manual no necesita tocar ManualNav

La pieza que pediste explícitamente — "arriba del texto haya una barra
deslizable que nos permita elegir entre los titulos del manual" — ya
existe: `ManualNav.jsx` es una barra horizontal sticky de chips por
categoría, con scroll y auto-scroll al activo. Lo único que faltaba era
contenido real con una categoría por título del índice del PDF, y eso lo
resuelve `028_manual_content_seed.sql` con una relación 1:1. Por eso este
prompt no toca ese componente: pedirle a Claude Code que lo reescriba
sería el tipo de diff innecesario que la Regla 8 prohíbe.

## Los dos puntos donde este prompt puede frenar y eso es correcto

**BUG-2, si el diagnóstico muestra `politicas = 0`.** Si `000_diagnostico_fase3.sql`
revela que `opportunities` o `collaborations` tienen RLS habilitado sin
ninguna política, el problema no es el refresh de cliente — es que la
base le devuelve cero filas a todo el mundo. Arreglar eso a ciegas dentro
de este prompt sería tocar seguridad sin el diagnóstico confirmado
delante; por diseño, el prompt para ahí y pide confirmación en vez de
adivinar una política.

**BrandForm con los cuatro campos de contacto en el alta.** Está marcado
"opcional pero recomendado" a propósito: si el diff de CreateSheet.jsx ya
creció por el CollaborationForm de BUG-1, agregar cuatro inputs más al
BrandForm en el mismo prompt puede ensuciar la revisión. Mejor que
Claude Code lo señale como pendiente explícito que lo mezcle todo en un
commit gigante.
