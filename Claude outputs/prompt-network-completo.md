# PROMPT EXPERTO — Cerrar Resilio Network: tareas asignables, ficha de scouter, stats, móvil y barrido

## NO HACE FALTA SQL
Las migraciones **036** (medición), **037** (triggers del ciclo) y **038** (`assign_entity`) están
aplicadas y verificadas en producción. Y toda la capa de datos que necesita este trabajo **ya
existe** (ver más abajo). No crear, modificar ni ejecutar SQL de ningún tipo.

## REGLA CRÍTICA — leer antes de tocar nada
**Nunca reescribir un archivo entero.** Ediciones puntuales sobre el contenido actual, releyendo
el archivo justo antes de modificarlo.

En este proyecto se perdió trabajo **tres veces** por escribir un archivo completo desde una copia
vieja en memoria. La peor borró la sección de Geografía entera dentro de un commit cuyo mensaje
decía que agregaba un import (−281 líneas netas).

Y hay una trampa relacionada, que ya causó un bug: **puede haber dos componentes con el mismo
nombre en archivos distintos.** `CalendarAgendaList.jsx` define su propio `AgendaItem` local que no
tiene nada que ver con `components/AgendaItem.jsx` y no lo importa. Antes de asumir que un
componente es el compartido, verificar que el archivo lo importe.

`git status` limpio antes de empezar. Un commit por parte.

## LO QUE YA EXISTE Y HAY QUE REUSAR (no reimplementar)
```
dbGetInfluencers({ ownerId })      dbGetBrands({ ownerId })
dbGetOpportunities({ ownerId })    dbGetCollaborations({ scouterId })
dbGetTasks({ assignedTo, status }) dbSaveTask({ ..., assignedTo })
dbGetActivities(entityType, entityId)
dbGetMonthlySnapshots({ period, scope })
getNetworkScouters({ cityId, countryId, regionId })   // lista con métricas por scouter
getScouterPerformance(userId, from, to)               // ya usada en CommandPage y ScoutersPage
```
Todos los filtros que hace falta ya están soportados. Esto es UI, no capa de datos.

---

# PARTE A — Asignar tareas a otra scouter

## El problema
`TasksPage.jsx` (~línea 88) crea toda tarea con `assignedTo: currentUser?.id || null` **fijo**. No
hay selector. Hoy cada persona solo puede crearse tareas a sí misma, y Dirección no puede
repartir trabajo. La capa de datos ya lo soporta: `dbSaveTask` acepta `assignedTo` y `dbGetTasks`
acepta filtrar por `assignedTo`.

## Qué hacer
En el formulario de nueva tarea de `TasksPage.jsx`:
- Agregar un selector de responsable, **visible solo para los roles de `COMMAND_ROLES`** (importar
  de `../routes.js`, mismo criterio que usa `CommandPage`). Para una scouter común el campo no
  aparece y la tarea sigue siendo para sí misma.
- Poblarlo con `getNetworkScouters()`, que ya devuelve nombre y ciudad de cada una. Valor por
  defecto: el usuario actual.
- Usar el `EntityPicker` como referencia de estilo si la lista es larga; si son pocas scouters, un
  `<select>` alcanza.

En el listado:
- Un filtro "Responsable" (Todas / cada scouter / Solo mías), también solo para `COMMAND_ROLES`,
  que pase `assignedTo` a `dbGetTasks`.
- En cada fila, cuando la tarea **no** es del usuario actual, mostrar a quién está asignada. Si no
  se muestra, Dirección no puede distinguir su propia agenda de la del equipo.

**Ojo con los triggers de la 037**: ya crean tareas automáticas ("Convertir a colaboración",
"Cargar resultados") asignadas al dueño de la entidad. El filtro tiene que convivir con eso sin
esconderlas.

Commit: `feat(tareas): asignar y filtrar tareas por responsable`

---

# PARTE B — Ficha de scouter

## El problema
La ruta `/network/scouters/:id` **no existe**. En `ScoutersPage` el único `onClick` de `ScouterRow`
es `onToggle` (expandir/colapsar). O sea que no se puede entrar a una scouter y ver su trabajo:
solo se ve la fila con contadores.

## Qué hacer
Nueva ruta en `src/network/routes.js`, respetando el formato de las existentes:
```js
  { path: '/network/scouters/:id', pageKey: 'scouter-detail', soon: false, roles: COMMAND_ROLES },
```
y su entrada en el mapa de páginas de `NetworkApp.jsx` (seguir el patrón de las otras rutas de
detalle).

Nueva página `src/network/pages/ScouterDetailPage.jsx`, con el encabezado y el patrón visual de las
otras fichas de detalle (`BrandDetailPage` es la referencia más cercana):

- **Encabezado**: nombre, email, ciudad, nivel, estado, antigüedad y días sin actividad. Todo eso
  ya viene de `getNetworkScouters()`; filtrar por el `userId` de la URL en vez de hacer una consulta
  nueva.
- **Bloque de rendimiento**: `getScouterPerformance(userId, from, to)` con un selector de período.
  Esa función ya existe y ya se usa; acá es el lugar natural para mostrarla completa.
- **Sus snapshots mensuales**: `dbGetMonthlySnapshots({ scope:'scouter' })` filtrando por
  `scopeId === userId`. Muestra su historia mes a mes, que es lo que hoy no se ve en ninguna parte.
- **Pestañas** con lo que tiene a su nombre, cada una con su contador:
  - Influencers → `dbGetInfluencers({ ownerId: userId })`
  - Marcas → `dbGetBrands({ ownerId: userId })`
  - Oportunidades → `dbGetOpportunities({ ownerId: userId })`
  - Colaboraciones → `dbGetCollaborations({ scouterId: userId, pageSize: 30 })`
  - Tareas → `dbGetTasks({ assignedTo: userId })`
  Reutilizar los componentes de fila que ya existen (`NetworkCard`, `TaskRow`), no inventar filas
  nuevas. Cada ítem navega a su ficha.
- **Botón de reasignar** en las pestañas de entidades, reusando `AssignModal` con el `entityType`
  correspondiente, para poder mover trabajo de una scouter a otra desde acá.

En `ScouterRow.jsx`: hacer el **nombre** clickeable y que navegue a `/network/scouters/:id`. Dejar
el `onToggle` actual funcionando en el resto de la fila, para no perder el comportamiento de
expandir.

Commit: `feat(scouters): ficha individual con su trabajo, rendimiento e historial mensual`

---

# PARTE C — Que los stats reflejen lo que pasa

## Lo que ya está
`CommandPage` tiene stats generales, alertas, lista de scouters, resumen de sin asignar y el
reporte mensual con "Cerrar mes". `HomePage` tiene el pulso de la red y la actividad reciente
propia. Eso funciona: **no rehacerlo**.

## Los dos huecos reales
**1. No hay feed de actividad por scouter.** La tabla `activities` es el único registro real de
"quién hizo qué y cuándo", y se consulta con `dbGetActivities(entityType, entityId)` — o sea por
entidad, nunca por persona. Agregar en la ficha de scouter (Parte B) una pestaña **Actividad** que
muestre lo que hizo esa persona, leyendo `activities` filtrado por `actor_id = userId`, ordenado
por `occurred_at` descendente. Si hace falta una función nueva en `database.js`, agregarla siguiendo
el estilo de `dbGetActivities` (`dbGetActivitiesByActor(actorId, limit)`), sin tocar la existente.

**2. Las alertas tienen un punto ciego conocido.** `network_alerts()` excluye explícitamente las
oportunidades `won` y `lost` (`status NOT IN ('won','lost')`), así que una oportunidad ganada y
nunca convertida no aparece en ninguna alerta. Eso hoy lo cubren los triggers de la 037, que crean
una tarea al ganar. **Verificar en la UI** que esas tareas automáticas aparezcan en el listado de
tareas y en la agenda de Inicio de la persona correspondiente. Si aparecen, no hay nada que
arreglar: dejarlo documentado en el reporte y no tocar la función SQL.

Commit (si hubo cambios): `feat(stats): actividad por scouter en su ficha`

---

# PARTE D — Móvil

## El peor caso, concreto
`ScoutersPage.jsx` línea 168 y `ScouterRow.jsx` línea 29 usan la misma grilla fija de 9 columnas:
```
gridTemplateColumns: '2fr 1fr 50px 55px 55px 55px 55px 70px 28px'
```
Sin `overflowX` y sin variante móvil. Las columnas fijas ya suman ~500px antes de las dos `fr`, así
que en un teléfono de 390px la fila se desborda y el layout se rompe. En móvil eso tiene que ser
una tarjeta por scouter (nombre y ciudad arriba, los contadores en una grilla que envuelve), no una
fila de tabla.

## Auditoría del resto
Estas páginas **no tienen ninguna referencia a `isMobile` ni a `innerWidth`**, así que hay que
revisarlas a 390px una por una:
```
CommandPage · ScoutersPage · TasksPage · HomePage · ManualPage
BrandDetailPage · InfluencerDetailPage · OpportunityDetailPage · CollaborationDetailPage
CollaborationsPage
```
Que no tengan la referencia **no significa que estén rotas** — muchas pueden estar bien con
`flexWrap`. Revisar y arreglar solo las que realmente se desbordan o quedan ilegibles.

Criterios: nada de scroll horizontal en el cuerpo de la página (tablas y código sí pueden, cada uno
en su contenedor con `overflow-x:auto`); ningún `minWidth` mayor al ancho de pantalla; los targets
de toque de al menos 40px; y las grillas de muchas columnas se vuelven tarjetas, no se encogen.

Commit: `fix(movil): ScoutersPage en tarjetas y auditoria de las paginas restantes`

---

# PARTE E — Barrido de errores

Repetir el barrido de las cuatro clases que se repitieron en este proyecto, **incluyendo los
archivos nuevos y modificados por las partes A a D**:

1. **Identificador usado sin importar** — rompe recién en runtime, el build pasa. Ya pasó con
   `supabase` en `AdminPanel.jsx`.
2. **Parámetro aceptado y descartado en silencio** — ya pasó con `permisos` en `dbUpdateUser` y
   `search` en `dbGetBrands`.
3. **Prop pasado con un nombre y recibido con otro** — React lo ignora sin avisar. Ya pasó con
   `ImportSheet` (`kind` vs `isOpen`/`entityType`) y con el `AgendaItem` **local** de
   `CalendarAgendaList`.
4. **Escritura que no respeta el tipo de la columna** — enums confirmados:
   `collaborations.status` → `proposed, confirmed, in_progress, content_pending, completed,
   cancelled`; `brands.relationship_status` → `cold, warm, strong, inactive`. Un valor fuera de la
   lista, o `''`, rompe el insert.

Y una quinta, nueva: **componentes con el mismo nombre en archivos distintos**. Buscar nombres de
componente definidos más de una vez en `src/` y confirmar que cada uso apunte al que el archivo
importa.

---

## TESTS
1. Dirección crea una tarea y la asigna a otra scouter → aparece en la agenda de Inicio de **esa**
   persona, no en la de quien la creó.
2. Una scouter común no ve el selector de responsable ni el filtro por responsable.
3. Click en el nombre de una scouter en la lista → abre su ficha. Los contadores de cada pestaña
   coinciden con los de su fila en `ScoutersPage`.
4. Reasignar una marca desde la ficha de una scouter → desaparece de su pestaña y aparece en la de
   la otra.
5. La pestaña Actividad muestra acciones reales con fecha, no vacía.
6. Ganar una oportunidad → la tarea automática de la 037 aparece en el listado de tareas de su
   dueña y en su agenda.
7. A 390px: recorrer las 17 páginas. Ninguna con scroll horizontal en el cuerpo, ningún texto
   cortado, ningún botón inalcanzable. `ScoutersPage` en tarjetas.
8. `npm run build` limpio; paridad de i18n intacta (toda clave de `es.json` en `en.json` y
   viceversa).
9. Al final, confirmar que nada se pisó: `GeografiaSection` sigue 2 veces en `AdminPanel.jsx`, el
   import de `supabase` sigue ahí, y `git status` limpio.

## ACCEPTANCE CRITERIA
- Dirección puede repartir tareas y ver quién tiene qué.
- Se puede entrar a una scouter y ver todo su trabajo, su rendimiento y su historial mensual.
- Cada acción del equipo queda visible en algún lado (su actividad, sus tareas, los stats).
- La app se usa cómoda desde un teléfono en las 17 páginas.
- Ninguno de los cinco tipos de bug del barrido queda suelto.

## DO NOT
- Nada de SQL.
- No rehacer `CommandPage` ni `HomePage`: ya tienen sus stats y funcionan.
- No reimplementar filtros de datos que ya existen (ver la lista del principio).
- No tocar `network_alerts()` por el punto ciego de `won`/`lost`: lo cubren los triggers de la 037.
- No reescribir archivos enteros, y verificar si un componente es el compartido antes de asumirlo.
- No agregar dependencias.
