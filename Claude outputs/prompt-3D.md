# PROMPT 3D — Misiones, Notas y Rewards (v1: balance de puntos)

**Antes de ejecutar:** correr en el SQL Editor de Supabase, en este orden:

1. `030_missions_notes_rewards.sql`

Es una sola migración, idempotente (`IF NOT EXISTS` / `CREATE OR REPLACE` /
`DROP POLICY IF EXISTS` + `CREATE POLICY`), con su rollback comentado al
final. Correrla dos veces no rompe nada. Al final del archivo corren 5
`SELECT` de verificación — pegá el resultado de los 5 en el chat de Claude
Code antes de que arranque a escribir código.

Pegar a Claude Code: primero las REGLAS GLOBALES de abajo, después todo el
bloque del prompt.

---

```
PROMPT 3D — MISIONES, NOTAS Y REWARDS (V1: BALANCE DE PUNTOS)

## REGLAS GLOBALES

1. No modifiques módulos fuera de FILES TO MODIFY / FILES TO CREATE. Si
   necesitás tocar otro archivo, PARÁ y reportá por qué.
2. La migración de este prompt (030) ya está escrita — no la reescribas.
   Si te hace falta una migración nueva, escribila con su rollback antes
   de aplicarla.
3. No borres datos. Renombrar > borrar. Deprecar > eliminar.
4. Esconder un botón no es seguridad. La seguridad real vive en RLS. En
   este prompt eso es literal: 030 cierra tres tablas que estaban
   abiertas (`missions`, `mission_progress`, `reward_points`) — no
   agregues en el cliente ningún chequeo que reemplace eso.
5. Si la especificación contradice al código, no inventes: reportá la
   contradicción y proponé la opción más segura y reversible.
6. No agregues dependencias nuevas.
7. Preservá el sistema visual existente (CSS vars de GlobalStyles en
   App.jsx).
8. Escribí el diff mínimo que cumple los ACCEPTANCE CRITERIA.
9. Mobile-first: cada pantalla nueva se diseña en 390px PRIMERO.
10. Todo el texto sale de t() (src/i18n/es.json + en.json). Cero strings
    hardcodeados.
11. No filtres por owner/scope/rol en el cliente para decidir qué datos
    llegan — eso ya lo hace RLS. El único chequeo de rol permitido en el
    cliente es de UX (mostrar u ocultar el botón "Nueva misión"), nunca
    de seguridad.
12. No toques Roadmap. Sigue "soon:true" a propósito — el propio Manual
    (sección 10, ya migrada en 028) describe la Hoja de Ruta como la
    pantalla de Inicio existente. Construir una pantalla separada
    duplicaría Home.
13. No toques goals, tasks, task_templates ni activities. 030 documenta
    que goals/tasks/task_templates quedaron con la misma política
    abierta de Fase 1, pero cerrarlas no es parte de este prompt (tasks
    ya tiene pantalla en producción — tocar su RLS a ciegas es un cambio
    de alcance mayor). Si querés proponerlo, hacelo como prompt aparte al
    final de tu resumen, no lo apliques acá.

---

## CONTEXT

Verificado en el código de esta sesión, con evidencia puntual:

1. **Missions ya tiene la mitad del camino hecho.** `missions` (tabla),
   `my_missions()` (RPC, 022_scouter_home.sql) y `getMyMissions()`
   (wrapper en `src/lib/metrics.js`) existen y funcionan — pero
   `getMyMissions()` no se llama desde ningún componente hoy (grep
   completo a `src/`: cero resultados fuera de su propia definición). No
   hay ningún widget de misiones en Home ni en ningún otro lado. La
   pantalla `/network/missions` es 100% `ComingSoonPage` (routes.js
   línea 36, `soon: true`).

2. **`mission_progress_of()` solo soportaba 2 métricas.** Antes de 030,
   cualquier misión con `metric` distinto de `influencers_added` o
   `brands_added` mostraba progreso 0 siempre, aunque `goal_progress()`
   (su función gemela para Goals) soporta 7 métricas. 030 iguala el set.

3. **`reward_points` no tiene un solo INSERT en todo el codebase** — se
   confirmó con grep sobre `supabase/` y `src/` completos. Nada acredita
   puntos hoy, aunque `missions.reward_points` existe desde la Fase 1
   pensado exactamente para esto.

4. **Hallazgo de seguridad, corregido tras correr 030 contra la base
   real:** según los archivos de migración disponibles, `missions`,
   `mission_progress` y `reward_points` habían quedado con la política
   `TEMP_open_until_auth` de la Fase 1 (`USING (true) WITH CHECK (true)`)
   — la migración 024 cerró `activities`/`assignments`, pero nunca tocó
   estas tres, al menos no en ningún archivo de este repo. Al correr 030
   se descubrió que **`missions` y `reward_points` ya tenían políticas
   reales** (`mis_read`/`mis_write`, `rp_read`/`rp_write`), con una
   función `app_my_scope_ids()` que no aparece en ningún archivo
   inspeccionado — es decir, alguna migración o cambio manual no
   rastreado ya las había cerrado antes. Solo `mission_progress` estaba
   genuinamente abierta. 030 terminó creando políticas duplicadas
   (inofensivas, pero redundantes) en las dos primeras, y se agregó un
   bloque de limpieza al final del archivo para borrarlas y dejar las
   preexistentes como única fuente de verdad. Además, `reward_points` ya
   tenía `rp_write` (Dirección puede escribir esa tabla directo, sin
   pasar por `claim_completed_missions()`) — eso no lo tocamos, así que
   la garantía de "único camino de escritura" es real para Scouters, no
   para Dirección. Ningún Scouter puede escribir `missions` ni
   `reward_points` directo, en ningún escenario, antes ni después de 030.

5. **Notas: no existe una "Nota" dedicada hoy.** Se verificó
   `dbLogActivityFor`/`dbLogContact` en `database.js` — el único lugar
   que loguea `type: 'note'` en `activities` es un fallback de
   `dbLogContact` cuando el tipo de contacto no matchea nada conocido, no
   una función de "agregar nota". Lo que SÍ existe y funciona: un campo
   `notes` TEXT plano en `influencers`, `brands`, `opportunities` y
   `collaborations`, ya mapeado en `rowToInfluencer`/`rowToBrand`/
   `rowToOpportunity`/`rowToCollaboration`, con `updated_at` confirmado
   en las cuatro tablas. Ese es el "agregador" que se pidió — no hace
   falta leer `activities`.

6. **Decisión de producto ya tomada (no la reabras):** Notes = cuaderno
   libre + agregador de los 4 `notes` existentes (las dos cosas).
   Rewards v1 = solo balance de puntos, sin catálogo ni canje. Missions +
   Notes + Rewards en este prompt, sin Roadmap.

## OBJECTIVE

Encender `/network/missions`, `/network/notes` y `/network/rewards`
(sacarlas de `ComingSoonPage`), con datos reales, RLS real, y sin tocar
Roadmap ni el resto de la app fuera de Network.

## FILES TO INSPECT (antes de tocar nada)

src/network/routes.js
src/network/nav.js
src/network/NetworkApp.jsx
src/network/pages/ComingSoonPage.jsx
src/network/components/CreateSheet.jsx      (para no duplicar su patrón)
src/network/components/NetworkCard.jsx
src/network/pages/HomePage.jsx              (para ver si conviene un
                                              resumen de Misiones/Rewards
                                              ahí — ver sección MISIONES)
src/lib/database.js   (dbGetMissions, dbGetGoals, rowToMission,
                        dbGetActivities, rowToInfluencer, rowToBrand,
                        rowToOpportunity, rowToCollaboration — los 4
                        tienen `notes` + `updatedAt`)
src/lib/metrics.js    (getMyMissions, getMyNetworkStats, getMyAgenda)
src/network/routes.js (COMMAND_ROLES, canSeeCommand — patrón de gating
                        de UI ya usado para Command Center/Scouters)
supabase/012_metrics.sql
supabase/022_scouter_home.sql
supabase/030_missions_notes_rewards.sql

## DATABASE

`030_missions_notes_rewards.sql` ya corrió antes de este prompt. No la
reescribas. Lo que agregó/cambió, para que el código lo use:

- `personal_notes` (nueva): `id, user_id, title, body, pinned,
  created_at, updated_at`. RLS: solo el dueño (`user_id = auth.uid()`),
  ni Dirección la ve.
- `my_notes_feed` (vista nueva, SECURITY INVOKER): columnas
  `entity_type, entity_id, entity_label, note_text, noted_at,
  owner_scouter_id`. Une los `notes` de influencers/brands/
  opportunities/collaborations, ya filtrados a "no vacío". Hereda RLS de
  cada tabla de origen — no filtres de nuevo en el cliente.
- `missions` / `mission_progress` / `reward_points`: RLS real (antes
  estaban abiertas). Lectura de `missions`: Dirección ve todas: un
  Scouter ve las globales (`city_id IS NULL`) + las de su ciudad
  visible. Escritura de `missions` (INSERT/UPDATE/DELETE): solo
  Dirección (`app_is_direction()`).
- `mission_progress_of(mission_id, user_id)`: ahora soporta las mismas 7
  métricas que `goal_progress()` (antes solo 2).
- `reward_points`: SELECT solo propio (o Dirección). Sin política de
  INSERT/UPDATE/DELETE para `authenticated` — el cliente NO puede
  escribir esta tabla directo, ni siquiera con el payload "correcto".
- `claim_completed_missions()` (RPC nueva, SECURITY DEFINER): recorre las
  misiones activas, y para cada una donde el progreso del usuario que
  llama ya alcanzó el target y todavía no se le acreditó, inserta en
  `reward_points` y la devuelve en el resultado. Es la ÚNICA vía para que
  alguien gane puntos. Llamarla no tiene efectos secundarios visibles si
  no hay nada nuevo para acreditar (devuelve 0 filas).
- `my_reward_balance()` (RPC nueva): `INT`, suma de puntos propios.
- `my_reward_history(p_limit)` (RPC nueva): lista de eventos de puntos
  propios, con el título de la misión si aplica.

## FILES TO MODIFY

src/network/routes.js
src/network/nav.js
  → `soon: true → false` en las entradas de `/network/notes`,
    `/network/missions` y `/network/rewards`. Roadmap queda como está
    (Regla 12).

src/network/NetworkApp.jsx
  → reemplazar los tres `<Route ... element={<ComingSoonPage/>}/>` de
    notes/missions/rewards por `<NotesPage/>`, `<MissionsPage/>`,
    `<RewardsPage/>` (ver FILES TO CREATE). Mismo patrón de props que ya
    reciben las otras rutas (`currentUser={currentUser}`, etc. — mirar
    cómo lo hace `CalendarPage` para no inventar una convención nueva).

src/lib/database.js
  → agregar, siguiendo el estilo ya usado (friendly(error), isUuid,
    myId(), mismo bloque de comentarios `// ══...══`):

    const rowToPersonalNote = (r) => ({
      id: r.id, title: r.title, body: r.body, pinned: r.pinned,
      createdAt: r.created_at, updatedAt: r.updated_at,
    })

    export const dbGetPersonalNotes = async () => {
      const { data, error } = await supabase.from('personal_notes')
        .select('*').order('pinned', { ascending: false })
        .order('updated_at', { ascending: false })
      if (error) throw friendly(error)
      return (data || []).map(rowToPersonalNote)
    }

    export const dbSavePersonalNote = async (note, userId) => {
      const uid = userId || await myId()
      if (!uid) throw new Error('Sesión expirada. Volvé a entrar.')
      const row = {
        title: note.title || null,
        body: note.body || '',
        pinned: !!note.pinned,
        updated_at: new Date().toISOString(),
      }
      if (isUuid(note.id)) {
        const { data, error } = await supabase.from('personal_notes')
          .update(row).eq('id', note.id).select('*').single()
        if (error) throw friendly(error)
        return rowToPersonalNote(data)
      }
      const { data, error } = await supabase.from('personal_notes')
        .insert([{ ...row, user_id: uid }]).select('*').single()
      if (error) throw friendly(error)
      return rowToPersonalNote(data)
    }

    export const dbDeletePersonalNote = async (id) => {
      const { error } = await supabase.from('personal_notes').delete().eq('id', id)
      if (error) throw friendly(error)
    }

    const rowToFeedNote = (r) => ({
      entityType: r.entity_type, entityId: r.entity_id,
      entityLabel: r.entity_label, noteText: r.note_text,
      notedAt: r.noted_at, ownerScouterId: r.owner_scouter_id,
    })

    export const dbGetNotesFeed = async () => {
      const { data, error } = await supabase.from('my_notes_feed')
        .select('*').order('noted_at', { ascending: false })
      if (error) throw friendly(error)
      return (data || []).map(rowToFeedNote)
    }

  → agregar `dbSaveMission` (alta/edición, solo la usa Dirección — RLS
    lo hace cumplir igual si alguien intenta esquivar la UI):

    export const dbSaveMission = async (mission, userId) => {
      const uid = userId || await myId()
      if (!uid) throw new Error('Sesión expirada. Volvé a entrar.')
      const row = {
        title: (mission.title || '').trim() || 'Misión sin título',
        description: mission.description || null,
        type: mission.type || 'individual',
        metric: mission.metric,
        target: Number(mission.target) || 0,
        city_id: mission.cityId || null,
        starts_at: mission.startsAt || null,
        ends_at: mission.endsAt || null,
        reward_points: Number(mission.rewardPoints) || 0,
        status: mission.status || 'active',
      }
      if (isUuid(mission.id)) {
        const { data, error } = await supabase.from('missions')
          .update(row).eq('id', mission.id).select('*').single()
        if (error) throw friendly(error)
        return rowToMission(data)
      }
      const { data, error } = await supabase.from('missions')
        .insert([{ ...row, created_by: uid }]).select('*').single()
      if (error) throw friendly(error)
      return rowToMission(data)
    }

    (`rowToMission` ya existe — reusala tal cual, no la reescribas.
    `type`/`metric` son TEXT libres en el schema: confirmá contra
    `dbGetActivationTypes`-style si hay que ofrecer un `<select>` con
    valores fijos — para v1, un `<select>` con las 7 métricas que ahora
    soporta `mission_progress_of` alcanza: influencers_added,
    brands_added, opportunities, collaborations, contacts, follow_ups,
    tasks_completed.)

src/lib/metrics.js
  → agregar, mismo estilo que `getMyMissions`/`getGoalProgress`:

    export const claimCompletedMissions = async () => {
      const { data, error } = await supabase.rpc('claim_completed_missions')
      if (error) throw error
      return (data || []).map(r => ({
        missionId: r.mission_id, title: r.title, pointsAwarded: r.points_awarded,
      }))
    }

    export const getMyRewardBalance = async () => {
      const { data, error } = await supabase.rpc('my_reward_balance')
      if (error) throw error
      return Number(data ?? 0)
    }

    export const getMyRewardHistory = async (limit = 50) => {
      const { data, error } = await supabase.rpc('my_reward_history', { p_limit: limit })
      if (error) throw error
      return (data || []).map(r => ({
        id: r.id, points: r.points, sourceType: r.source_type,
        sourceId: r.source_id, missionTitle: r.mission_title, createdAt: r.created_at,
      }))
    }

src/i18n/es.json + en.json
  → claves nuevas para las tres pantallas (título, estados vacíos,
    formulario de misión, tabs de Notas). Nada nuevo para Roadmap.

## FILES TO CREATE

src/network/pages/MissionsPage.jsx
src/network/pages/NotesPage.jsx
src/network/pages/RewardsPage.jsx

(Si algún form crece demasiado para vivir inline en su página, un
componente aparte en `src/network/components/` — mismo criterio de
tamaño que ya se usó para separar `CalendarMonthGrid`/`CalendarAgendaList`
de `CalendarPage` en el prompt anterior.)

---

## MISIONES (`MissionsPage.jsx`)

1. Al montar: `getMyMissions()` (ya existe, no la reescribas) para la
   lista con progreso propio, Y `claimCompletedMissions()` en el mismo
   efecto — si devuelve alguna fila, mostrar un toast/banner breve "🎉
   Ganaste N puntos por completar [misión]" antes de refrescar. Esta es
   la única vez que se llama `claimCompletedMissions()` desde el cliente
   en este prompt (no hace falta llamarla desde ningún otro lado; Rewards
   también puede llamarla al montar, por si el usuario entra ahí primero
   — ver sección REWARDS).
2. Lista: título, descripción, barra de progreso (`progress`/`target`,
   ya vienen calculados de `getMyMissions()`), `rewardPoints`, `endsAt` si
   existe. Misión sin `ends_at` = sin fecha límite, mostrar "sin fecha
   límite" en vez de omitir el dato.
3. Estado vacío: "No hay misiones activas por ahora" — no es un error,
   es un estado normal si Dirección no cargó ninguna.
4. Botón "Nueva misión", visible SOLO si `canSeeCommand(currentUser)`
   (mismo helper que ya gatea Command Center/Scouters — Regla 11: esto
   es UX, la seguridad real es `msn_insert`). Abre un form con: título,
   descripción, tipo (`type`: texto libre corto, ej. "individual" /
   "equipo" — no hay catálogo hoy, no inventes uno), métrica (`<select>`
   con las 7 de arriba), target (numérico > 0), ciudad (opcional — mismo
   selector de ciudad que ya usan otros forms del CRM, reusarlo, no
   inventar uno nuevo), fecha inicio/fin (opcionales), puntos de
   recompensa (numérico ≥ 0). Guardar con `dbSaveMission`.
5. Si `claim_completed_missions()` falla por lo que sea (red, etc.), no
   bloquear el render de la lista de misiones — loguear y seguir. Ganar
   puntos es un bonus de esta pantalla, no un requisito para verla.

## NOTAS (`NotesPage.jsx`)

Dos tabs (o dos secciones con switch simple, sin librería de tabs nueva):

**Tab 1 — Mi cuaderno** (`personal_notes`, privado):
- Lista de notas propias, fijadas (`pinned`) primero, después por
  `updatedAt` desc.
- CTA "+ Nota" → form simple: título (opcional) + cuerpo (textarea).
  Autosave o botón guardar explícito — igual criterio que el resto de
  forms cortos del CRM (mirar `InfluencerForm`/`BrandForm` de
  `CreateSheet.jsx` para el patrón de guardado, no inventar uno nuevo).
- Acción de fijar/desfijar (`pinned`) y eliminar
  (`dbDeletePersonalNote`).
- Estado vacío: invita a escribir la primera nota, no un mensaje de
  error.

**Tab 2 — Notas del CRM** (agregador, solo lectura en este prompt):
- `dbGetNotesFeed()` — lista de `entityLabel` (nombre/título de la
  entidad) + `noteText` + `entityType` (mostrado como chip: Influencer /
  Marca / Oportunidad / Colaboración) + `notedAt` (fecha relativa).
- Click en un ítem navega al detalle de esa entidad
  (`/network/influencers/:id`, `/network/brands/:id`,
  `/network/opportunities/:id`, `/network/collaborations/:id` — mismo
  patrón de navegación que ya usan las tarjetas de list pages). Ahí, si
  el usuario quiere editar la nota, ya existe el campo `notes` editable
  en esa pantalla — no dupliques edición acá.
- Esta pestaña es de solo lectura a propósito: editar el `notes` de una
  entidad desde un componente que no es su propia pantalla de detalle
  duplicaría lógica de guardado por 4 tipos de entidad distintos, para
  un beneficio marginal en v1. Si se pide edición inline acá, es un
  prompt aparte.
- Estado vacío: "Todavía no hay notas cargadas en influencers, marcas,
  oportunidades ni colaboraciones" — distinto del estado vacío del
  cuaderno (Regla 5, no inventar contenido que no aplica).

No agregues un cuarto tipo de "nota" al `CreateSheet.jsx` — ese menú es
alta rápida de entidades de negocio (Influencer/Brand/Opportunity/
Collaboration) para Scouters; una nota del cuaderno no es una entidad de
negocio y vive solo en `NotesPage.jsx`.

## REWARDS (`RewardsPage.jsx`)

Solo balance — sin catálogo, sin canje, sin lista de premios (decisión
de producto ya tomada, no la reabras).

1. Al montar: `claimCompletedMissions()` primero (por si el usuario entra
   acá sin pasar por Misiones — mismo motivo que en MissionsPage, ver
   nota ahí), después `getMyRewardBalance()` + `getMyRewardHistory()`.
2. Bloque principal: el número total de puntos, grande, con el mismo
   tratamiento visual que ya usan los contadores de `MyNetworkStats` en
   Home (reusar ese patrón de tarjeta/número, no inventar uno nuevo).
3. Debajo: lista corta (usar el límite default de `getMyRewardHistory`)
   de "+N puntos — [título de la misión] — [fecha]". Si `sourceType` no
   es `'mission'` (no debería pasar en v1, pero por las dudas) mostrar
   "+N puntos — Otro" en vez de romper.
4. Estado vacío (balance 0 y sin historial): mensaje que invite a
   revisar Misiones, con link a `/network/missions` — no un "0" pelado
   sin contexto.
5. Nada de UI para "canjear": ni un botón deshabilitado "Próximamente".
   Si no está en el alcance de v1, no aparece.

## SECURITY

- `missions`, `mission_progress` y `reward_points` tienen políticas
  reales para cuando este código corra (algunas ya estaban de antes —
  `mis_read`/`mis_write` en missions, `rp_read`/`rp_write` en
  reward_points —, `mp_own` la agregó 030). En ningún caso un Scouter
  puede escribir `missions` ni `reward_points` directo. No agregues
  ningún chequeo de owner/scope adicional en el cliente para estas tres
  — sería duplicar RLS y esconder un bug de RLS si algún día lo hay.
- `claim_completed_missions()` es SECURITY DEFINER y usa `auth.uid()`
  adentro — no le pases un `userId` desde el cliente, no lo acepta como
  parámetro (a propósito, para que nadie pueda pedir puntos por otra
  persona).
- El botón "Nueva misión" gateado por `canSeeCommand()` es SOLO UX. Si
  alguien golpea `dbSaveMission` directo sin ser Dirección, la política
  de escritura de `missions` (`mis_write` en tu base) lo rechaza —
  confirmalo en TESTS contra la política real de tu entorno, no
  asumas el nombre.
- `reward_points` ya tenía, antes de este prompt, una política que deja
  a Dirección escribirla directo (fuera de `claim_completed_missions()`).
  No es parte de este prompt tocarla — si en algún test ves que Dirección
  puede insertar puntos a mano, es ese comportamiento preexistente, no
  una regresión.
- `personal_notes` es privada incluso para Dirección — no agregues un
  admin view de cuadernos ajenos.

## UX — REGLAS DURAS

Permitido: bottom sheets, CTAs sticky, controles de 44px mínimo, listas
agrupadas, tabs simples (2 opciones, sin librería), barras de progreso.

Prohibido: tablas horizontales, controles chicos, formularios
interminables (el form de misión tiene 7 campos — todos caben en un
bottom sheet scrolleable, no hace falta wizard de pasos).

Preservar las CSS vars de GlobalStyles en las tres pantallas.

## EDGE CASES

- Un Scouter sin ninguna misión visible en su ciudad (todas son de otras
  ciudades o Dirección no cargó ninguna): estado vacío, no una lista con
  0 ítems muda.
- Una misión con `target = 0`: no debe explotar por división por cero en
  el cálculo de `pct` — ya lo maneja `my_missions()` (CASE WHEN
  m.target > 0), no toques esa función.
- `claim_completed_missions()` llamada dos veces seguidas (usuario entra
  y sale rápido de Misiones y Rewards): la segunda vez no debe volver a
  mostrar el toast de "ganaste puntos" para la misma misión — el índice
  único de 030 hace que la segunda llamada devuelva 0 filas para esa
  misión, así que alcanza con solo mostrar el toast si el array que
  devuelve la RPC no está vacío.
- Nota de cuaderno con body vacío: el botón guardar queda deshabilitado
  o el submit no hace nada — no guardar una nota completamente vacía sin
  título ni cuerpo.
- Agregador de notas con una colaboración sin influencer ni marca
  cargados (ambos `NULL`): `entity_label` cae al fallback `'Colaboración'`
  de la vista — no debe romper el render.
- Usuario sin sesión activa cuando corre `claim_completed_missions()`
  (JWT vencido a mitad de sesión): la función devuelve 0 filas
  (`auth.uid() IS NULL`), no explota — el cliente debe tratar el error de
  RPC (si lo hay por 401) igual que ya trata otros RPCs, sin romper el
  resto de la pantalla.

## TESTS

 1. `/network/missions` deja de mostrar "próximamente" y muestra
    misiones reales con progreso calculado.
 2. Un Scouter completa el target de una misión (ej. carga 5 influencers
    con `influencers_added` target=5) → entra a Misiones o Rewards →
    aparece el toast de puntos ganados → `my_reward_balance()` refleja el
    incremento.
 3. Entrar a Misiones o Rewards una segunda vez después de ya haber
    cobrado una misión: NO se acredita de nuevo (verificar en la tabla
    `reward_points` que hay una sola fila para ese `user_id` +
    `source_id`).
 4. Un usuario NO-Dirección no ve el botón "Nueva misión". Si de todas
    formas se llama `dbSaveMission` a mano (consola del navegador) con
    ese usuario, Supabase devuelve error de política (RLS), no un 200.
 5. Un usuario Dirección ve el botón, crea una misión nueva con los 7
    campos, y aparece en la lista de todos los Scouters a quienes
    corresponde (global o de su ciudad).
 6. `/network/notes`, tab Cuaderno: crear una nota, fijarla, ver que
    queda arriba de la lista, eliminarla.
 7. `/network/notes`, tab Notas del CRM: un influencer/marca/oportunidad/
    colaboración con `notes` cargado aparece en la lista; uno sin `notes`
    (la mayoría) no aparece. Click navega al detalle correcto.
 8. `/network/rewards` muestra el balance real y el historial con el
    título de la misión, no un ID crudo.
 9. Con balance en 0: la pantalla de Rewards muestra el estado vacío con
    link a Misiones, no un "0 puntos" sin contexto.
10. En 390px: las tres pantallas sin scroll horizontal, controles ≥44px.
11. Ningún string visible hardcodeado.
12. `/network/roadmap` sigue mostrando "próximamente" — no se tocó.

## ACCEPTANCE CRITERIA

1. `/network/missions`, `/network/notes` y `/network/rewards` navegables
   con datos reales, sin regresión en el resto de Network.
2. `missions`, `mission_progress` y `reward_points` tienen políticas RLS
   reales (no `TEMP_open_until_auth`) — verificado con los `SELECT` de
   verificación de 030.
3. Nadie puede escribir `reward_points` salvo a través de
   `claim_completed_missions()`.
4. Una misión completada acredita puntos una sola vez, sin importar
   cuántas veces se visite Misiones o Rewards.
5. El cuaderno personal es privado por usuario.
6. El agregador de notas muestra exactamente lo que ya hay cargado en
   `notes` de las 4 entidades, sin necesitar un campo nuevo en esos
   forms.
7. Cero dependencias nuevas.
8. Todo el texto nuevo sale de t().
9. `/network/roadmap` sin cambios.

## DO NOT

- No toques Roadmap.
- No toques goals, tasks, task_templates ni activities (deuda separada,
  documentada en el propio 030 — no la resuelvas de paso).
- No agregues catálogo ni canje a Rewards — es v1, solo balance.
- No agregues edición inline del `notes` de una entidad desde
  `NotesPage.jsx` — la edición vive en la pantalla de detalle de cada
  entidad, que ya existe.
- No le agregues un parámetro `userId`/`p_user` a
  `claim_completed_missions()` que el cliente pueda controlar.
- No agregues una cuarta opción "Misión" o "Nota" al `CreateSheet.jsx`.
- No reescribas `mission_progress_of()` ni `my_missions()` más allá de
  lo que ya hizo 030 — si te parece que falta algo, reportalo, no lo
  agregues por tu cuenta.

## ANTES DE ESCRIBIR CÓDIGO

Leé FILES TO INSPECT, corré `030_missions_notes_rewards.sql` y pegá el
resultado de sus 5 `SELECT` de verificación, verificá que el CONTEXT
coincida con el repo tal como está hoy, y presentame el plan con los
archivos que vas a tocar por cada uno de los tres workstreams (Misiones,
Notas, Rewards). Si encontrás una contradicción entre este prompt y el
código, reportala en vez de asumir.
```

---

## Por qué Rewards no tiene todavía un "canjear"

Vos elegiste explícitamente "solo balance de puntos" para esta versión.
Pero además, técnicamente, no había otra opción responsable hoy:
`reward_points` no tenía un solo INSERT en todo el codebase antes de
este prompt. Construir un catálogo de canje sin resolver primero
*cómo* se ganan los puntos hubiera sido una pantalla que muestra un
número que nunca cambia. Este prompt resuelve la parte que faltaba
(acreditación real, ligada a completar una misión) y deja el catálogo
para cuando decidan qué se puede canjear — eso es una decisión de
producto (¿premios físicos? ¿beneficios internos? ¿plata?) que no está
tomada todavía, y no correspondía inventarla acá.

## Por qué las Notas no tocan `activities`

La sesión anterior asumía que ya existía una "Nota" como quick-action
que loguea en `activities` (por el widget de Home). Se revisó el código
de nuevo para este prompt y esa asunción era incorrecta: lo único que
loguea `type: 'note'` es un fallback de `dbLogContact` para tipos de
contacto no reconocidos, no una función de notas real. Lo que sí existe,
andando, con datos reales cargados por scouters durante meses de uso, es
el campo `notes` de las 4 entidades. Armar el agregador sobre eso en vez
de sobre `activities` es más simple, no requiere tocar el constraint
`entity_id NOT NULL` de `activities`, y muestra contenido que ya existe
en vez de esperar a que alguien empiece a usar una función nueva.

## El único punto donde este prompt puede frenar y eso es correcto

**Si el `SELECT` de verificación #3 de 030 (política de INSERT en
`reward_points`) devuelve alguna fila.** Significaría que algo o alguien
agregó una política de escritura directa a esa tabla después de que este
prompt fue escrito. Si eso pasa, frenar antes de construir Rewards
encima: mostrar un balance que cualquiera puede falsificar por afuera es
peor que no mostrar nada.
