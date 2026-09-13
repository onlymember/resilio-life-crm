# PROMPT 4A — Colaboraciones en su forma máxima (frontend)

## REGLAS GLOBALES (leer antes de tocar nada)

- **No inventes — reportá la contradicción.** Si algo de lo que este prompt asume sobre un archivo no coincide con lo que encontrás en el repo, PARÁ y reportá la diferencia en vez de adivinar cómo resolverla.
- **Diff mínimo.** No refactorices código que no está relacionado con esta tarea, aunque lo veas mejorable. No cambies nombres de funciones/exports existentes salvo que este prompt lo pida explícitamente.
- **Sin dependencias nuevas.** Todo esto se resuelve con lo que ya está en `package.json`.
- **Mobile-first, 390px.** Toda pantalla/componente nuevo tiene que verse bien a 390px de ancho antes que en desktop.
- **Preservar `GlobalStyles` / CSS vars.** Usar `var(--glass-bg)`, `var(--border-violet)`, `var(--text-primary)`, `var(--text-secondary)`, `var(--primary-violet)`, `var(--primary-violet-light)`, etc. — los mismos que ya usan `CollaborationCard.jsx` y `FollowUpsPage.jsx`. No hardcodees colores nuevos salvo los que ya define este prompt para urgencia (ver UX).
- **No SQL.** La base ya está migrada (`031_collaborations_max.sql`, aplicada y verificada en un Postgres local antes de esta entrega — ver sección DATABASE). Esta tarea es 100% frontend/JS: mappers, UI, wrappers de RPC.
- **No Supabase Storage.** `contract_url` / `invoice_url` son links pegados (texto), igual que `brands.logo` / `influencers.profile_image` hoy. No agregues upload de archivos.

## CONTEXTO

Resilio Network es una CRM/SPA (React 18 + Vite + Supabase) para coordinar scouters que gestionan Influencers, Brands, Opportunities y Collaborations a nivel internacional.

Un análisis experto (sesión previa) identificó que `Collaboration` —la unidad de ejecución concreta entre un Influencer y una Brand— era la entidad estructuralmente más pobre del sistema comparada con Influencer/Brand/Opportunity:

1. **No aparecía en la agenda ni en el calendario.** `my_agenda()` y `my_calendar_range()` sólo unían `tasks` + `influencers` + `brands` + `opportunities`. Una colaboración confirmada con una entrega de contenido pendiente no generaba ningún recordatorio, aunque el usuario ya lo había notado en el Calendario ("no aparecen las colaboraciones, solo las acciones de seguimiento").
2. **No tenía `next_action` / `next_action_at`** — sí lo tienen Influencer/Brand/Opportunity desde `020_crm_fields.sql`, Collaboration no.
3. **No había enlace directo Oportunidad → Colaboración.** Existe un camino indirecto (`campaigns.opportunity_id` + `collaborations.campaign_id`), pero `campaign_id` es opcional y la mayoría de las colaboraciones del día a día de Network se crean sin pasar por `campaigns`. Sin un link directo no se puede medir conversión pipeline → ejecución.
4. **`deliverables` era un array plano de texto**, sin fecha ni estado por ítem — no se podía saber cuál entregable estaba vencido.
5. **No había columnas estructuradas de resultados** (reach, engagement, etc.), sólo un JSONB `results` de forma libre.
6. **No había dónde guardar el link al contrato o la factura.**

`031_collaborations_max.sql` ya resolvió todo esto del lado de base de datos, de forma 100% aditiva (nada se borró, nada existente se rompió), y quedó verificado end-to-end contra un Postgres local antes de esta entrega (columnas nuevas, `my_agenda`/`my_calendar_range`/`complete_next_action`/`set_next_action` extendidas preservando las ramas existentes carácter por carácter, tabla `collaboration_deliverables` con RLS heredada, vista `v_collaborations_urgency`, backfill best-effort del array viejo de `deliverables`). Este prompt es la otra mitad: exponer todo esto en la UI.

## OBJECTIVE

1. Extender los mappers y wrappers de `database.js` para leer/escribir los campos nuevos de `collaborations` y para operar `collaboration_deliverables`.
2. Que una Colaboración con `next_action_at` aparezca en Mi Agenda (Home) y en el Calendario, igual que hoy aparecen Influencer/Brand/Opportunity — reusando el mismo mapper/ítem de agenda que ya existe (no crear uno nuevo).
3. Que `FollowUpsPage` permita filtrar también por `collaboration` y pueda completar/reagendar su `next_action` (ya funciona genérico vía `dbCompleteNextAction`/`dbSetNextAction` — sólo falta el filtro y que el RPC ya migrado (`'collaboration'` es un `entity_type` válido) tenga a quién llamarlo desde la UI).
4. Que `CollaborationDetailPage` permita: agendar una próxima acción; ver/editar entregables como una lista real (con fecha y estado, no un array de texto plano) respaldada por `collaboration_deliverables`; cargar el link de contrato/factura; cargar los KPIs de resultado; y ver, si existe, el enlace a la Oportunidad de la que salió (`opportunity_id`).
5. Que `CollaborationsPage`/`CollaborationCard` muestren visualmente cuándo una colaboración necesita atención (fecha de `next_action_at` vencida/hoy), igual que ya hace `FollowUpsPage` con sus grupos overdue/today/week/later.

## FILES TO INSPECT (antes de escribir nada)

- `src/lib/database.js` — sección `COLLABORATIONS` (`rowToCollaboration`, `dbGetCollaborations`, `dbSaveCollaboration`, `dbPatchCollaboration`, `dbDeleteCollaboration`) y sección `NEXT ACTIONS` (`dbCompleteNextAction`, `dbSetNextAction`). Confirmar que siguen teniendo exactamente la forma descripta en este prompt (ver DATABASE) antes de tocarlas — si cambió algo, reportalo.
- `src/lib/metrics.js` — `getMyAgenda()`, y cualquier otro wrapper que llame a `my_agenda`/`my_calendar_range` (buscar todos los usos, puede haber uno para el Calendario además del de Home).
- `src/network/pages/CollaborationDetailPage.jsx` — estructura actual completa (fetch, estado, render de `deliverables` como array, `results` como JSON stringificado, `COLLAB_STATUSES`/`CONTENT_STATUSES`/`PAYMENT_STATUSES`).
- `src/network/pages/CollaborationsPage.jsx` y `src/network/components/CollaborationCard.jsx` — ya inspeccionados en el análisis previo, confirmá que siguen igual (orden por `created_at` únicamente, sin color de urgencia en fechas).
- `src/network/pages/FollowUpsPage.jsx` — `ENTITY_FILTERS`, `groupItems()`, cómo arma la key de cada `AgendaItem`.
- `src/network/components/AgendaItem.jsx` — **este prompt no tiene su contenido actual** (no estaba disponible al momento de escribirlo). Inspeccionalo antes de tocar nada: necesitamos saber cómo mapea `entity_type` a ícono/label/color para agregarle el caso `'collaboration'` de forma consistente con `'influencer'`/`'brand'`/`'opportunity'`, no para reinventar el componente.
- El componente/página de Calendario (nombre exacto a confirmar — no estaba en el snapshot inspeccionado). Buscalo por el uso de `my_calendar_range`/`getMyCalendarRange` o similar en `database.js`/`metrics.js` y por rutas bajo `/network/calendar` en el router de Network. Si no existe todavía como pantalla (posible, dado que el usuario reportó que el calendario "no muestra colaboraciones" — puede ser una vista que sólo consume `my_agenda`, no `my_calendar_range`), reportalo: puede ser que sólo haga falta tocar el mapper que ya usa, sin tocar una pantalla de calendario dedicada.
- `src/network/components/CreateSheet.jsx` — no tiene un `CollaborationForm` (confirmado por grep). Si hay algún otro punto de creación de Collaboration en el repo (por ejemplo, un botón "Confirmar colaboración" desde `OpportunityDetailPage` o similar), localizalo antes de decidir dónde exponer el picker de Oportunidad.
- `src/i18n/index.js` (o el archivo de traducciones que corresponda) — para agregar las claves nuevas con el mismo patrón que las existentes (`collab.status.*`, `followups.filters.*`, etc.).

## DATABASE (ya aplicado — referencia, no ejecutar SQL)

`031_collaborations_max.sql` ya está aplicado y verificado. Resumen de lo que la UI puede asumir que existe:

**`collaborations` — columnas nuevas** (todas nullable, todas opcionales):
```
opportunity_id UUID           -- FK a opportunities(id), ON DELETE SET NULL
next_action TEXT
next_action_at TIMESTAMPTZ
contract_url TEXT
invoice_url TEXT
reach INT
impressions INT
likes INT
comments INT
shares INT
saves INT
link_clicks INT
engagement_rate NUMERIC(5,2)
estimated_media_value NUMERIC(14,2)
results_notes TEXT
```
Nota: el set de KPIs es una propuesta razonable, no un requisito cerrado — si en la sesión de implementación el usuario pide otro set, es un cambio de columnas chico y aislado, no reabre nada de esto.

**`my_agenda(p_days_ahead)` y `my_calendar_range(p_from, p_to)`**: agregan una fila más por cada `entity_type = 'collaboration'` con `next_action_at` no nulo y `status NOT IN ('completed','cancelled')`. Mismo shape de columna que ya consume el front (`kind, entity_type, entity_id, title, subtitle, due_at, priority, is_overdue, is_today`) — `subtitle` viene armado como `"<influencer> × <brand>"`. **No hace falta ningún cambio de contrato en el consumidor** — si `getMyAgenda()`/el mapper del Calendario ya son genéricos por `entity_type`, sólo hace falta que sepan qué ícono/label mostrar para `'collaboration'`.

**`complete_next_action('collaboration', id, ...)` / `set_next_action('collaboration', id, ...)`**: ya aceptan `'collaboration'` como `entity_type` válido. `dbCompleteNextAction`/`dbSetNextAction` en `database.js` son genéricos (pasan `entityType` tal cual al RPC) — no necesitan cambios, sólo que la UI los llame con `'collaboration'` cuando corresponda.

**`collaboration_deliverables`** (tabla nueva, reemplaza en la UI al array `collaborations.deliverables` — el array viejo NO se borró, queda de respaldo/legacy):
```
id UUID
collaboration_id UUID  -- FK a collaborations(id) ON DELETE CASCADE
description TEXT NOT NULL
due_date DATE
status TEXT DEFAULT 'pending'  -- 'pending' | 'submitted' | 'approved' | 'rejected'
content_url TEXT
completed_at TIMESTAMPTZ
sort_order INT DEFAULT 0
created_by UUID
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```
RLS: una sola policy (`cd_all`, `FOR ALL`) que hereda la visibilidad de la colaboración padre vía `EXISTS (SELECT 1 FROM collaborations WHERE id = collaboration_deliverables.collaboration_id)`. Verificado localmente que si `collaborations` no es visible para el usuario, sus `collaboration_deliverables` tampoco lo son (no es una policy "abierta disfrazada"). **Consecuencia para la UI**: no hace falta ni es necesario mandar `scouter_id`/`city_id` a mano al leer/escribir esta tabla — la RLS ya filtra correctamente sólo con `collaboration_id`.

Ya se corrió un backfill best-effort: las colaboraciones que tenían `deliverables` como array JSONB de strings u objetos `{description, ...}` tienen sus filas correspondientes en `collaboration_deliverables` (verificado localmente con ambos shapes). Si al inspeccionar producción alguna colaboración vieja NO tiene filas en `collaboration_deliverables` a pesar de tener `deliverables` no vacío, es porque el shape real en producción no coincidió con lo esperado — reportalo, no se debe re-intentar backfill desde el frontend.

**`v_collaborations_urgency`** (vista, `security_invoker`):
```
collaboration_id, status, next_action_at, end_date, next_deliverable_due, urgency_at
```
`urgency_at` = la fecha más próxima entre `next_action_at`, el `due_date` más próximo de un `collaboration_deliverables` no aprobado, y `end_date` (NULLs se ignoran). Es de sólo lectura, pensada exactamente para ordenar `CollaborationsPage` por urgencia en vez de por `created_at`.

## FILES TO MODIFY

### `src/lib/database.js`

- `rowToCollaboration`: agregar el mapeo de las columnas nuevas (`opportunityId: r.opportunity_id`, `nextAction: r.next_action`, `nextActionAt: r.next_action_at`, `contractUrl: r.contract_url`, `invoiceUrl: r.invoice_url`, `reach`, `impressions`, `likes`, `comments`, `shares`, `saves`, `linkClicks: r.link_clicks`, `engagementRate: r.engagement_rate`, `estimatedMediaValue: r.estimated_media_value`, `resultsNotes: r.results_notes`) — mismo patrón camelCase que el resto del archivo.
- `dbPatchCollaboration`: agregar las mismas claves al `FIELD_MAP` (camel → snake_case), igual que ya están `influencerId`, `status`, etc.
- `dbSaveCollaboration`: agregar `opportunity_id: rest.opportunityId || null` al `row` de creación/edición (los KPIs y contract/invoice_url normalmente se completan después desde el detalle vía `dbPatchCollaboration`, no hace falta en el alta — usar criterio, pero no lo dejes inalcanzable: si hay un formulario de creación, que al menos permita opcionalmente linkear la Oportunidad).
- Nueva sub-sección `COLLABORATION DELIVERABLES` con wrappers sobre la tabla nueva, mismo estilo que el resto del archivo (`friendly(error)` en los catches, `select().single()` donde corresponda):
  - `dbGetCollaborationDeliverables(collaborationId)` → `SELECT * FROM collaboration_deliverables WHERE collaboration_id = ? ORDER BY sort_order`.
  - `dbAddCollaborationDeliverable(collaborationId, { description, dueDate, sortOrder })`.
  - `dbUpdateCollaborationDeliverable(id, patch)` — patch parcial (`description`, `dueDate`, `status`, `contentUrl`, `sortOrder`); si `status` pasa a `'approved'` o `'submitted'` y no viene `completedAt` explícito, setear `completed_at: new Date().toISOString()` sólo para `'approved'` (criterio: "aprobado" es el estado terminal positivo).
  - `dbDeleteCollaborationDeliverable(id)`.

### `src/lib/metrics.js` (o donde viva `getMyAgenda`)

- Confirmar que el mapeo de fila cruda → objeto de agenda (`entityType`, `isOverdue`, etc.) es genérico por `entity_type` y no tiene un `switch`/lista cerrada que excluya `'collaboration'`. Si la tiene, agregar el caso.

### `src/network/components/AgendaItem.jsx`

- Agregar el caso `entity_type === 'collaboration'` al mapeo de ícono/color/label, con un criterio visual coherente con los otros tres (no inventar una paleta nueva — mirar cómo están resueltos `'influencer'`/`'brand'`/`'opportunity'` y replicar el patrón).

### `src/network/pages/FollowUpsPage.jsx`

- `ENTITY_FILTERS`: agregar `'collaboration'` → `['all', 'influencer', 'brand', 'opportunity', 'collaboration']`.
- Agregar la clave de traducción `followups.filters.collaboration` (ver i18n abajo).
- El resto de la página es genérico por `entityType` — no debería necesitar más cambios, pero confirmalo al inspeccionar.

### `src/network/components/CollaborationCard.jsx`

- Agregar color-coding de urgencia sobre `next_action_at` (si existe), con el mismo criterio de umbral que usa `FollowUpsPage.groupItems()` (overdue = pasado, today = hoy, resto = normal) — no dupliques esa lógica de cero, extraela a un helper si hace falta o replicá el mismo cálculo. Sugerencia de colores (coherente con la paleta ya usada en el archivo): overdue `#F87171`, today `#FBBF24`, resto sin badge extra. Mostrar el label del `next_action` (texto corto, truncado) cuando exista, con su fecha.
- Si la colaboración tiene `opportunity_id`, un badge chico opcional (ej. "desde oportunidad") es un nice-to-have, no bloqueante.

### `src/network/pages/CollaborationsPage.jsx`

- Nice-to-have (no bloqueante para el acceptance de esta tarea, pero es el objetivo #5): agregar un toggle de orden "Recientes" (actual, `created_at desc`) / "Urgencia" que traiga `v_collaborations_urgency` para las filas visibles y ordene por `urgency_at ASC NULLS LAST`. Si lo implementás, hacelo con una query aparte (`supabase.from('v_collaborations_urgency').select('*').in('collaboration_id', ids)`) y merge client-side — no reescribas `dbGetCollaborations` para que dependa siempre de la vista.

### `src/network/pages/CollaborationDetailPage.jsx`

- Agregar sección "Próxima acción": mismo patrón de UI que ya exista en `InfluencerDetailPage`/`BrandDetailPage`/`OpportunityDetailPage` para `next_action`/`next_action_at` (inspeccionar cuál de esos tres tiene la UI más simple y replicar ese patrón, no inventar uno nuevo) — usa `dbSetNextAction('collaboration', id, action, at)` / `dbCompleteNextAction('collaboration', id)`.
- Reemplazar (o complementar, ver nota) el editor de `deliverables` (array de texto plano) por una lista respaldada por `collaboration_deliverables`: cada ítem con descripción, fecha de entrega, selector de estado (`pending`/`submitted`/`approved`/`rejected`), link de contenido opcional, y acciones agregar/editar/eliminar. **Nota**: no borres el array viejo `deliverables` de la UI de un tirón si eso te obliga a un rewrite grande del componente — podés dejarlo visible como "legacy" (colapsado, read-only) mientras la lista nueva convive, y confirmarlo con el resto del equipo antes de removerlo del todo. Lo que no puede pasar es que la lista nueva sea inalcanzable.
- Agregar campos para `contractUrl`/`invoiceUrl` (inputs de texto/URL simples, mismo patrón que un campo `logo`/`profileImage` en Brand/Influencer).
- Agregar sección de KPIs (`reach`, `impressions`, `likes`, `comments`, `shares`, `saves`, `linkClicks`, `engagementRate`, `estimatedMediaValue`, `resultsNotes`) como inputs numéricos simples agrupados, escritos vía `dbPatchCollaboration`. Dejar el `results` JSONB viejo como está (no lo muestres como si fuera lo mismo; son campos distintos).
- Si `opportunityId` existe, mostrar un link/chip a la Oportunidad de origen (navegar a `/network/opportunities/:id`, mismo patrón que ya usa el componente para navegar a Influencer/Brand).

### `src/i18n/index.js` (o equivalente)

Agregar, con el mismo idioma/tono que las claves existentes:
- `followups.filters.collaboration` (ej. "Colaboraciones")
- `collab.nextAction.*` si hace falta replicar textos de "agendar seguimiento" que ya existan para otras entidades (reusar las claves genéricas si `InfluencerDetailPage` etc. ya las tienen, no dupliques).
- `collab.deliverables.*` (título de sección, estados `pending/submitted/approved/rejected`, acciones agregar/eliminar).
- `collab.kpis.*` (labels de cada métrica).
- `collab.contractUrl` / `collab.invoiceUrl`.
- `collab.fromOpportunity` (texto del link a la oportunidad de origen).

## SECURITY

- Todo el acceso a `collaboration_deliverables` pasa por Supabase (RLS `cd_all`), nunca confíes en el cliente para decidir qué se puede ver — no filtres "a mano" por `scouter_id` en el frontend pensando que hace falta, la policy ya lo resuelve.
- `dbCompleteNextAction`/`dbSetNextAction` llaman RPCs `SECURITY INVOKER` (`complete_next_action`/`set_next_action`) — si el usuario no tiene permiso sobre esa colaboración, el RPC ya tira `RAISE EXCEPTION` con el mensaje "no se pudo completar/agendar" y `friendlyRpc()` en `database.js` ya lo traduce a un mensaje de usuario. No agregues chequeos de permiso adicionales en la UI, sólo mostrá el error que ya viene.
- `opportunity_id` es `ON DELETE SET NULL` — una colaboración nunca se rompe si se borra la oportunidad de origen (poco común, pero contemplalo: el link a la oportunidad debe desaparecer con gracia, no crashear, si `opportunityId` queda `null` después de creado).

## UX

- Mobile-first 390px en todo lo nuevo.
- Reusar los mismos criterios de color/urgencia que ya existen en `FollowUpsPage`/`CollaborationCard` — no introducir una paleta nueva.
- La sección de KPIs y deliverables en el detalle no tiene que ser "linda" al extremo, pero sí clara: son campos que un scouter va a llenar rápido después de que termina una colaboración, no un dashboard.
- Los inputs de `contractUrl`/`invoiceUrl` son texto plano (URL pegada) — no armes un dropzone ni un uploader.

## EDGE CASES

- Colaboración sin `influencer_id` o `brand_id` (no debería pasar por constraint de negocio, pero el subtitle armado en `my_agenda`/`my_calendar_range` usa `COALESCE(...,'—')` así que no rompe si falta uno).
- `deliverables` (array viejo) vacío o `NULL` — no debe haber generado filas en `collaboration_deliverables`, así que la lista nueva arranca vacía; la UI de deliverables tiene que soportar el estado "sin entregables todavía" con gracia (no un error).
- `opportunity_id` presente pero la Oportunidad fue borrada (quedó `NULL` por el `ON DELETE SET NULL`) — el link a "oportunidad de origen" simplemente no se muestra.
- Colaboración `cancelled`/`completed` con `next_action_at` viejo seteado desde antes de esta migración — no debería aparecer en agenda/calendario (los `WHERE` de `my_agenda`/`my_calendar_range` ya excluyen `status IN ('completed','cancelled')`), confirmá que la UI no la muestre igual desde otro camino.

## TESTS

Antes de dar por terminado, correr a mano (no hace falta un framework de test nuevo si el proyecto no lo tiene ya):

1. Crear/editar una colaboración con `next_action_at` en el pasado → aparece en Mi Agenda (Home) agrupada como "vencida" y en `FollowUpsPage` con el filtro `collaboration`.
2. Completar esa próxima acción desde `FollowUpsPage` → desaparece de la lista y queda una `activity` tipo `follow_up` (verificable si hay una vista de actividad reciente).
3. Agregar 2-3 entregables desde el detalle, marcarlos en distintos estados, refrescar la página → persisten correctamente (no se pierden al recargar).
4. Cargar KPIs y `contractUrl` en el detalle, guardar, refrescar → persisten.
5. Si el backfill trajo entregables de una colaboración vieja real (mirar en producción alguna colaboración con `deliverables` no vacío antes de esta migración), confirmar que aparecen en la lista nueva del detalle.
6. Build limpio (`npm run build` o el comando que use el proyecto) sin warnings nuevos.
7. Grep de strings hardcodeadas nuevas (todo lo agregado debe pasar por `i18n`, no texto suelto en JSX).

## ACCEPTANCE CRITERIA

- [ ] Una colaboración con `next_action_at` aparece en Mi Agenda y en el Calendario (o en el equivalente que exista — ver nota en FILES TO INSPECT sobre la pantalla de calendario).
- [ ] `FollowUpsPage` filtra por `collaboration` y puede completar/reagendar su próxima acción.
- [ ] `CollaborationCard` muestra visualmente cuándo la próxima acción está vencida/es hoy.
- [ ] `CollaborationDetailPage` permite agendar próxima acción, gestionar entregables (con fecha/estado), cargar contrato/factura y KPIs, y ver el link a la Oportunidad de origen si existe.
- [ ] Nada de lo existente (Home, Calendario, FollowUps, listado/detalle de Influencer/Brand/Opportunity) se rompió — regresión manual mínima sobre esas pantallas.
- [ ] Build limpio, sin dependencias nuevas, sin strings hardcodeadas nuevas.

## DO NOT

- No toques `supabase/031_collaborations_max.sql` ni ninguna migración — ya está aplicada y verificada.
- No agregues Supabase Storage ni ningún uploader de archivos.
- No borres el array `collaborations.deliverables` ni la columna `results` — quedan legacy a propósito.
- No reescribas `CollaborationCard.jsx`/`CollaborationsPage.jsx`/`FollowUpsPage.jsx` de cero — son diffs quirúrgicos sobre lo que ya existe.
- No inventes un shape de `AgendaItem`/pantalla de Calendario que no coincida con lo que encuentres al inspeccionar — si el componente no existe como tal, reportalo en vez de crear una pantalla nueva de calendario sin que te lo hayan pedido.

## ANTES DE ESCRIBIR CÓDIGO

1. Leer `AgendaItem.jsx` completo y la pantalla/mapper de Calendario real (este prompt no tuvo acceso a ninguno de los dos al momento de escribirse — es la pieza de contexto que más puede cambiar el plan de implementación).
2. Confirmar en producción (una query simple, sólo lectura) que `collaboration_deliverables` efectivamente tiene filas para al menos una colaboración vieja con `deliverables` no vacío — si el backfill no corrió como se esperaba en producción (shape de datos distinto al probado localmente), avisar antes de construir la UI sobre una tabla vacía.
3. Confirmar que `rowToCollaboration`/`dbPatchCollaboration`/`dbSaveCollaboration` siguen teniendo la forma descripta en este prompt.
4. Recién ahí, implementar en el orden: `database.js` → `AgendaItem`/agenda-calendario → `FollowUpsPage` → `CollaborationCard` → `CollaborationDetailPage` → (opcional) orden por urgencia en `CollaborationsPage`.
