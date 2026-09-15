# PROMPT EXPERTO — Fase 5: correcciones y mejoras UX

## REGLAS GLOBALES (no negociables)

1. No romper nada que ya funciona. Antes de tocar un archivo, leerlo entero.
2. `t('...')` para TODO texto visible al usuario, en `es.json` y `en.json` (ambos, siempre).
3. Cero `console.log` de debug en el commit final.
4. Cero strings hardcodeados de color/tamaño que no sigan el sistema de diseño ya usado en el resto de la app — mirar cómo están hechas las pantallas existentes (Missions, Notes, Rewards, Collaborations) antes de escribir CSS nuevo.
5. **NO tocar `tasks`, `goals` ni `task_templates`** en esta ronda (ni RLS, ni UI, ni database.js). Se revisan aparte. Si algo de esta fase parece requerir tocarlas, parar y preguntar.
6. Al final: `npm run build` limpio, y reportar qué se probó realmente (build/lint) vs qué requiere entorno vivo — no asumir que algo "debería funcionar" sin poder probarlo.
7. Si un archivo de "FILES TO INSPECT" resulta no necesitar cambios, decirlo explícitamente con el motivo (no asumir que la lista de archivos es correcta solo porque está en este prompt — inspeccionar primero, como ya pasó con `AgendaItem.jsx` en la Fase 4).

## CONTEXTO

Se diagnosticó contra la base real de producción (no contra los archivos versionados, que en más de un caso ya divergieron) lo siguiente:

- `opportunities` **no tiene** columna `value` ni `budget`. Tiene `estimated_value NUMERIC`. El error `Could not find the 'value' column of 'opportunities' in the schema cache` es 100% de PostgREST rechazando un payload que manda `value` en vez de `estimated_value`.
- El error `record "new" has no field "budget"` **no** viene de ningún trigger sobre `opportunities` (se revisaron los 3 triggers reales de esa tabla y ninguno menciona `budget`). Viene de una función llamada `audit_sensitive()`, que está aplicada sobre otra(s) tabla(s) todavía sin confirmar. **Este bug se resuelve aparte, en un archivo `033_fix_audit_sensitive.sql` que todavía no está listo** — no es parte de esta fase de frontend. Si al probar algo de esta fase aparece ese mismo error, anotarlo y no intentar arreglarlo acá.
- Ya se aplicó `032_opportunities_value.sql` en producción (verificado localmente antes de entregarlo: build de tablas, RLS, vistas y función, todo probado). Agrega la estructura para que una Oportunidad tenga varios influencers candidatos, cada uno con su propio valor y desglose por tipo de acción. Ver sección BASE DE DATOS abajo.
- `tasks`/`goals`/`task_templates` **ya tienen RLS bien acotada** (no es la política abierta que se temía de la Fase 1) — confirmado por diagnóstico. Por qué no aparecen en la UI es harina de otro costal, deliberadamente fuera de esta fase.

## OBJETIVO

Resolver, en este orden de prioridad:

1. Bug bloqueante: guardar una Oportunidad falla.
2. Nueva funcionalidad: ver y cargar valor de la Oportunidad por influencer y por tipo de acción.
3. Pantalla de "sin permisos" limpia (sin navbar/sidebar).
4. Pantalla de carga (splash) solo en el arranque de la sesión, no en cada navegación interna.
5. Botones de contacto (WhatsApp/Instagram/teléfono) en la carta de Influencer y de Marca.
6. Botón de notificaciones (vencimientos + asignaciones nuevas).
7. Rediseño visual del Manual existente (mismo contenido, look de documento/PDF vertical).
8. Deshabilitar el zoom del navegador dentro de la web.

## FILES TO INSPECT (punto de partida, no verdad absoluta — confirmar antes de tocar)

- `src/network/database.js` — funciones de Oportunidad (`dbSaveOpportunity`, `dbPatchOpportunity`, `rowToOpportunity`, cualquier `FIELD_MAP` relacionado). Mismo patrón que ya se usó para Collaborations en la Fase 4A.
- Componente de formulario/detalle de Oportunidad (buscar por `Opportunity` en `src/network/pages` o similar).
- Guard/wrapper de permisos (buscar `canSeeCommand`, `RequireCommand`, o el componente que redirige cuando falta un permiso — ya se usó ese patrón en Fase 3D para bloquear "Nueva misión").
- Layout/AppShell principal (el que renderiza navbar + sidebar) — para saber cómo excluir la pantalla de "sin permisos" de ese wrapper.
- Componente/hook de carga inicial (bootstrap de la app / spinner global) — para diferenciar "primera carga de sesión" de "cambio de ruta interno".
- Cartas de Influencer y de Marca en las vistas de lista (buscar el componente `*Card` de cada uno).
- El componente actual del botón/pantalla "Manual".
- El header/topbar principal, para agregar el ícono de notificaciones.
- `index.html` (meta viewport) y el CSS global, para el tema del zoom.

## 1. Fix: guardar Oportunidad

**Causa confirmada:** el frontend envía `value` en el payload; la columna real es `estimated_value`.

**Qué hacer:**
- En `database.js`, localizar dónde se arma el payload de guardado/edición de Oportunidad y cambiar la clave `value` por `estimated_value` (tanto al escribir — `dbSaveOpportunity`/`dbPatchOpportunity` — como al leer — `rowToOpportunity`, si mapea `estimated_value` a un nombre interno distinto, mantenerlo consistente en todo el módulo).
- Revisar el formulario de Oportunidad: si el campo del formulario se llama `value` internamente (estado de React), no hace falta renombrarlo en la UI, solo el mapeo hacia/desde la base al guardar/leer.
- Probar: crear una Oportunidad nueva y editar una existente cambiando el monto — debe guardar sin el error de schema cache.

## 2. Valor por influencer y por tipo de acción

Ya existe en base de datos (`032_opportunities_value.sql`, aplicado): las tablas `opportunity_influencers` y `opportunity_influencer_items`, más las vistas `v_opportunity_influencer_totals` y `v_opportunity_action_totals`. Ver sección BASE DE DATOS.

**UX esperada** (en la pantalla de detalle de Oportunidad):
- Una sección "Influencers candidatos" listando los influencers agregados a la oportunidad, cada uno con su estado (`proposed`/`confirmed`/`declined`) y su valor total (suma de sus items).
- Al expandir/editar un influencer candidato: tabla de líneas con tipo de acción (`activation_types`, el mismo catálogo que ya usa Colaboraciones — reusar el mismo selector/combo si ya existe uno para eso en Collaborations), cantidad, valor unitario, y subtotal (de solo lectura, lo calcula la base).
- Totales visibles: total por influencer (ya viene de la vista) y un resumen por tipo de acción para toda la oportunidad (de la otra vista) — por ejemplo un desglose tipo "Posts: $350 · Stories: $60".
- Agregar/quitar un influencer candidato de la oportunidad; agregar/editar/quitar líneas de acción dentro de cada uno.

**Nuevas funciones necesarias en `database.js`** (mismo patrón que `dbGetCollaborationDeliverables` y compañía de la Fase 4A):
- `dbGetOpportunityInfluencers(opportunityId)`
- `dbAddOpportunityInfluencer(opportunityId, influencerId, notes?)`
- `dbUpdateOpportunityInfluencerStatus(id, status)`
- `dbDeleteOpportunityInfluencer(id)`
- `dbGetOpportunityInfluencerItems(opportunityInfluencerId)`
- `dbAddOpportunityInfluencerItem(opportunityInfluencerId, activationTypeId, quantity, unitValue, notes?)`
- `dbUpdateOpportunityInfluencerItem(id, fields)`
- `dbDeleteOpportunityInfluencerItem(id)`
- `dbGetOpportunityInfluencerTotals(opportunityId)` → lee `v_opportunity_influencer_totals`
- `dbGetOpportunityActionTotals(opportunityId)` → lee `v_opportunity_action_totals`

## 3. Pantalla "sin permisos"

**Problema actual:** cuando alguien sin permisos entra, termina viendo la app general (con navbar/sidebar) en vez de un bloqueo real.

**Qué hacer:**
- Encontrar dónde se decide "este usuario no tiene permiso para ver esto" (el mismo mecanismo que ya bloquea "Nueva misión" para Scouter, `canSeeCommand` o equivalente).
- Cuando el chequeo falla a nivel de **pantalla completa** (no un botón puntual dentro de una pantalla permitida), renderizar un componente aparte que **no** esté envuelto por el Layout/AppShell (sin navbar, sin sidebar) — solo un mensaje centrado tipo "No tenés permisos para acceder a esta sección" con, como mucho, un botón para volver al inicio.
- Importante: esto se decide ANTES de montar el layout general, no como una página más dentro de él — si hoy el flujo es "renderizar todo el layout y adentro mostrar un mensaje", hay que sacarlo un nivel más arriba en el árbol de rutas.

## 4. Pantalla de carga solo en el arranque

**Problema actual:** la pantalla de carga (splash) se muestra en cada cambio de ruta dentro de la SPA, no solo al entrar.

**Qué hacer:**
- Localizar qué dispara el splash hoy (probablemente algo ligado a un `loading` de datos por página, o un `Suspense` a nivel de ruta).
- Agregar un flag de "la app ya arrancó en esta sesión" (una variable a nivel de módulo, o contexto de React, seteada en `true` la primera vez que termina de cargar — **no hace falta persistirlo** en `localStorage`, alcanza con que dure mientras la pestaña/SPA sigue viva, ya que es "por sesión de navegación").
- Mientras ese flag sea `false`: mostrar el splash completo.
- Una vez en `true`: los cambios de ruta usan, como mucho, un loader liviano local a la página (o nada, si la carga es rápida) — nunca el splash completo de nuevo.

## 5. Botones de contacto en la carta de Influencer/Marca

Ya existe el patrón: `AgendaItem.jsx` ya arma botones de WhatsApp/Instagram/teléfono a partir de columnas `whatsapp`/`instagram`/`phone` que le llegan de `my_agenda()`. Reusar la misma lógica de armado de links (`wa.me/...`, `instagram.com/...`, `tel:...`).

**Ojo, esto necesita un chequeo en vivo antes de escribir código, porque hay una posible inconsistencia:** cuando se diagnosticó `my_agenda()` en producción (Fase 4, hace pocos días), esa función leía el contacto de marca desde `b.data->>'whatsapp'` (JSONB). Pero también existe un archivo `027_brand_contact_and_manual_schema.sql` de una fase anterior que agrega columnas **directas** `whatsapp`/`instagram`/`phone`/`email` a `brands` — no está confirmado si ese archivo llegó a aplicarse en producción, ni si esas columnas (si existen) tienen datos reales o están vacías mientras el dato real sigue viviendo en `data`.

**Antes de tocar la carta de Marca, correr esto contra producción:**
```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'brands' AND column_name IN ('whatsapp','instagram','phone','email');

SELECT count(*) FILTER (WHERE whatsapp IS NOT NULL OR instagram IS NOT NULL OR phone IS NOT NULL) AS con_columna_directa,
       count(*) FILTER (WHERE data->>'whatsapp' IS NOT NULL OR data->>'instagram' IS NOT NULL) AS con_dato_en_jsonb
FROM brands;
```
(la segunda consulta falla si las columnas directas no existen — en ese caso, correr solo la parte de `data->>`). Con eso se sabe con certeza cuál es la fuente real a usar. `influencers`, en cambio, sí tiene confirmado columnas directas (`whatsapp`, `instagram`, `phone`) — ahí no hace falta este chequeo.

Sea cual sea la fuente real, si `rowToBrand` en `database.js` no está mapeando esos campos a algo plano y consistente, agregarlo ahí — no leer `data` (ni las columnas directas) directamente desde el componente de la carta.

**Qué hacer:**
- En la carta de Influencer (lista/grid), agregar los 3 botones de contacto (mostrar solo los que tengan valor — si no hay whatsapp, no mostrar el botón de whatsapp).
- Ídem en la carta de Marca.
- Los botones no deben navegar dentro de la SPA (son links externos `wa.me`, `instagram.com`, `tel:`) — usar `target="_blank" rel="noopener noreferrer"` para wa.me/instagram, y evitar que el click dispare la navegación a la pantalla de detalle si la carta entera es clickeable (`stopPropagation`).

## 6. Botón de notificaciones

Ya existe en base de datos la función `my_notifications(p_days_lookback INT DEFAULT 3)` (ver BASE DE DATOS), que devuelve, combinados: ítems vencidos/para hoy (de la misma lógica que ya usa "Mi Agenda") + asignaciones nuevas de Oportunidades y Colaboraciones de los últimos N días. **No incluye tasks** (a propósito, ver CONTEXTO).

**Ubicación exacta, pedida explícitamente por el usuario: en la misma botonera donde está el botón "+" (el que abre el panel de "Nueva marca/oportunidad/colaboración/..."), no en otro lado del header.** Ese botón "+" ya tiene un mecanismo unificado (`createOpen` en `NetworkApp.jsx`, pasado por props — ver Fase 3C: se unificó ahí después de que hubiera dos estados `createOpen` desconectados entre desktop y mobile). El ícono de notificaciones va al lado de ese mismo "+", en la misma barra, en ambos layouts:
- **Mobile**: la botonera flotante/isla (bottom nav, la que se le dio estilo de isla en la Fase 3B) donde vive el FAB del "+". Agregar el ícono de campana ahí, no en el header de arriba.
- **Desktop**: la barra de acciones donde hoy está el botón "+" (probablemente en el sidebar o en un topbar propio de Network — confirmar cuál al inspeccionar `NetworkApp.jsx`/el layout de desktop). Mismo criterio: al lado del "+", misma barra.

**FILES TO INSPECT para este punto en particular** (además de los ya listados arriba): `NetworkApp.jsx` (dueño de `createOpen` y probablemente del componente de botonera que lo renderiza en cada layout), el componente de bottom nav / isla flotante de mobile (Fase 3B), y el componente de sidebar/topbar de desktop. Confirmar el componente real de la botonera antes de agregar nada — puede que el "+" y su contenedor sean un solo componente reusado entre mobile/desktop, o dos componentes separados que solo comparten el estado.

**Qué hacer:**
- Ícono de campana en esa botonera (junto al "+"), con un badge de cantidad (count de filas de `my_notifications(3)`). Si el "+" es un botón circular/FAB, el de notificaciones debe mantener el mismo lenguaje visual (tamaño, elevación, radios) para que se vea como parte del mismo grupo, no como un agregado suelto.
- Al hacer click, un panel/dropdown (en desktop) o una hoja/modal (en mobile, consistente con cómo se abre hoy el panel de "Nuevo...") listando cada notificación: `kind` (vencimiento o asignación), título, subtítulo, fecha. Click en una notificación navega a la entidad correspondiente (`entity_type` + `entity_id`) igual que ya hace "Mi Agenda" con sus items.
- `dbGetNotifications(daysLookback = 3)` nuevo en `database.js`, que llama al RPC `my_notifications`.
- No hace falta persistir "leído/no leído" en esta versión — es una vista en vivo. Si el usuario pide eso después, es una fase aparte (necesitaría una tabla nueva).

## 7. Rediseño del Manual (mismo contenido)

**Aclaración explícita del usuario: NO crear un PDF descargable. El contenido actual del Manual se queda igual — solo cambia el diseño visual, para que se vea como un documento/PDF vertical dentro de la web.**

**Qué hacer:**
- Encontrar el componente/página actual del Manual y no tocar su contenido (texto, orden, secciones).
- Darle una envoltura visual tipo "hoja de documento": fondo de página (gris claro o neutro) con una "hoja" central de ancho fijo (~800px máx), fondo blanco, sombra sutil, padding generoso, tipografía de lectura (serif o sans de alta legibilidad, tamaño cómodo, interlineado ~1.6).
- Organizar el contenido existente en "páginas" o secciones separadas visualmente (un salto de página simulado entre secciones grandes, con numeración tipo "Página X" si el contenido lo amerita) — sin inventar contenido nuevo, solo maquetarlo.
- Agregar un botón "Imprimir / Guardar como PDF" que dispare `window.print()`, con una media query `@media print` que oculte navbar/sidebar/botones y deje solo la hoja del manual — así, si alguien igual quiere un PDF real, lo saca imprimiendo desde el navegador, sin que el sistema tenga que generar el archivo.
- Responsive: en pantallas angostas la "hoja" ocupa el ancho disponible con el mismo padding proporcional, no se rompe el layout.

## 8. Deshabilitar el zoom

**Contexto: ya se intentó antes y sigue sin funcionar del todo** — probablemente porque solo se tocó una de las tres vías por las que un usuario puede hacer zoom. Cubrir las tres:

1. **Viewport meta** (`index.html`): confirmar que exista `<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">`. Si ya está y el zoom sigue andando, es porque el pinch-zoom se está haciendo por otra vía (ver punto 2).
2. **Pinch-zoom táctil**: agregar `touch-action: pan-x pan-y;` en el CSS global (`html, body` o el contenedor raíz de la app) — esto bloquea el gesto de pellizco a nivel de CSS, más confiable que solo el meta viewport en navegadores modernos.
3. **Ctrl + rueda del mouse / Ctrl + / Ctrl -** (desktop): agregar un listener global de `wheel` que haga `preventDefault()` cuando `event.ctrlKey` es `true`, y un listener de `keydown` que haga `preventDefault()` en `Ctrl/Cmd` + `+`/`-`/`0`. **Aclarar honestamente en el PR:** esto no bloquea el zoom nativo del navegador en el 100% de los casos (algunos navegadores no permiten interceptar su propio atajo de teclado de zoom) — es un best-effort, no una garantía absoluta. Si el usuario necesita bloqueo total, eso ya no depende de la web sino de configuración del navegador/dispositivo, y hay que decirlo así en vez de prometer que "queda arreglado".

## BASE DE DATOS (referencia — ya aplicado, no ejecutar de nuevo)

```
opportunity_influencers
  id, opportunity_id (FK opportunities), influencer_id (FK influencers),
  status ('proposed'|'confirmed'|'declined'), notes, created_by, created_at, updated_at
  UNIQUE (opportunity_id, influencer_id)

opportunity_influencer_items
  id, opportunity_influencer_id (FK opportunity_influencers),
  activation_type_id (FK activation_types, nullable),
  quantity, unit_value, subtotal (calculado, solo lectura),
  notes, created_at, updated_at

v_opportunity_influencer_totals(opportunity_influencer_id, opportunity_id, influencer_id, status, total_value)
v_opportunity_action_totals(opportunity_id, activation_type_id, activation_type_name, total_value)

my_notifications(p_days_lookback INT DEFAULT 3)
  → kind ('due'|'assigned'), entity_type, entity_id, title, subtitle, at, is_overdue
```

RLS de las 2 tablas nuevas ya replica el mismo criterio que protege a `opportunities` (dirección, dueño, creador, o ciudad visible) — no hace falta ningún chequeo extra en el frontend más allá de lo que ya se hace para Oportunidades.

## EDGE CASES

- Oportunidad sin ningún influencer candidato todavía: la sección debe mostrar un estado vacío con acción para "agregar influencer", no un error.
- Influencer candidato sin ninguna línea de acción cargada: total = $0, no debe romper la vista.
- Marca sin `data->>'whatsapp'` ni las otras: no mostrar ningún botón de contacto (no un botón roto o vacío).
- `my_notifications()` sin resultados: el panel de notificaciones muestra "Sin novedades", no queda vacío/roto.
- El manual rediseñado tiene que verse bien tanto en pantalla como al imprimir — probar ambos.

## TESTS (marcar cuáles se probaron de verdad vs cuáles no se pudieron correr)

1. Crear una Oportunidad nueva → guarda sin el error de `value`.
2. Editar el monto de una Oportunidad existente → guarda sin error.
3. Agregar un influencer candidato a una Oportunidad, cargarle 2 líneas de acción, ver que el total por influencer y por acción sea correcto.
4. Borrar un influencer candidato → sus líneas de acción desaparecen (cascada, ya validado en la base).
5. Entrar sin permisos a una pantalla protegida → se ve el mensaje limpio, sin navbar/sidebar.
6. Recargar la app (primera carga) → se ve el splash. Navegar entre pantallas después → NO se ve el splash de nuevo.
7. Carta de Influencer con whatsapp cargado → aparece el botón; sin whatsapp → no aparece.
8. Carta de Marca con `data->>'instagram'` cargado → aparece el botón de Instagram.
9. Botón de notificaciones está en la misma botonera que el "+" (mobile y desktop), muestra el count correcto y el panel lista lo esperado.
10. Manual: se ve como documento en pantalla, y al imprimir (`Ctrl+P` / botón nuevo) sale sin navbar/sidebar.
11. Zoom: probar pinch en mobile/táctil, `Ctrl+rueda` y `Ctrl +/-` en desktop — documentar qué se logró bloquear y qué no.
12. `npm run build` sin errores ni warnings nuevos.

## ACCEPTANCE CRITERIA

- Los 2 errores reportados (`value` column, guardado de Oportunidad) no vuelven a aparecer.
- Nadie sin permisos ve el layout general de la app.
- El splash no se repite en navegación interna.
- Contactos de Influencer/Marca son un click, no copiar/pegar a mano.
- El botón de notificaciones refleja datos reales de `my_notifications()`.
- El Manual tiene el mismo contenido de siempre, con diseño de documento.
- `tasks`/`goals`/`task_templates` no fueron tocadas.
- `npm run build` limpio.

## DO NOT

- No tocar `tasks`, `goals`, `task_templates` (RLS, UI ni database.js).
- No intentar arreglar el bug de `audit_sensitive()`/`budget` — no es de esta fase y todavía no está diagnosticado del todo.
- No generar un archivo PDF real para el Manual — es una vista web con diseño de PDF.
- No prometer que el zoom queda 100% bloqueado si no se pudo verificar en los tres navegadores/dispositivos típicos.
- No commitear sin antes correr `npm run build`.

## ANTES DE ESCRIBIR CÓDIGO

1. Leer cada archivo de "FILES TO INSPECT" completo, no solo grep.
2. Confirmar el mecanismo real de permisos/splash existente (puede no llamarse como se supone acá).
3. Si algo de este prompt asume una estructura que no coincide con el código real, avisar antes de improvisar una alternativa.
