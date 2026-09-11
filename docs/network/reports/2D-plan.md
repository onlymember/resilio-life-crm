# Plan 2D — Direction Command Center

## Verificación del CONTEXT

Todo coincide. Hallazgos relevantes para el plan:

- `metrics.js` ya tiene los 4 wrappers que agregué antes — pero `getUnassignedSummary` devuelve el JSONB crudo. **Corrijo**: mapeo explícito de las 6 claves conocidas.
- `database.js` no tiene `dbUpsertScouter` ni `dbAssignBulk` todavía.
- `NetworkApp.jsx` no importa `ScoutersPage` — hay que agregar ruta y import.
- `NetworkCard` no tiene checkbox. No lo toco — envuelvo cada card con un div que pone el checkbox encima.
- `AssignModal` filtra scouters por `entity.cityId`. En BulkBar el destino se elige diferente (los ítems pueden ser de distintas ciudades) — necesito una variante o usar `showAll` desde el principio.

---

## Plan de ejecución

### 0 · metrics.js (corrección)
Actualizo `getUnassignedSummary` para mapear las 6 claves:
`influencers`, `brands`, `opportunities`, `no_city_inf`, `no_city_brands`, `users_no_role`.

### 1 · database.js — dos funciones
- `dbUpsertScouter({ userId, cityId, teamId, level, status })` → `supabase.rpc('upsert_scouter', ...)` con `friendly()`. El mensaje "Sin permiso para gestionar Scouters en esa ciudad." lo deja pasar `friendly()` literalmente (ya es legible).
- `dbAssignBulk(entityType, entityIds, toOwner, reason)` → llama `supabase.rpc('assign_entities_bulk', ...)` en tandas de 100. Devuelve el array completo `[{ entityId, ok, error }]` (columna `error`, no `error_msg`). Nunca lanza excepción por fallos parciales — los errores van en el resultado.

### 2 · routes.js + nav.js + NetworkApp.jsx
- `routes.js`: nueva ruta `/network/scouters` con `roles: COMMAND_ROLES`
- `nav.js`: ítem Scouters (icono `Shield` o `Users2`) en la sección INTELLIGENCE, con `roles: COMMAND_ROLES`
- `NetworkApp.jsx`: import `ScoutersPage`, nueva `<Route path="scouters">` con `RoleGuard`

### 3 · Componentes nuevos

| Componente | Descripción |
|---|---|
| `PeriodFilter.jsx` | 4 chips (esta semana / este mes / este trimestre / rango) + inputs fecha si rango. Emite `{ from, to }` |
| `AlertRow.jsx` | Fila: icono severidad · tipo · título · botón acción. Acción varía por `tipo`. |
| `BulkBar.jsx` | Sticky bottom bar. Recibe `count`, `onAssign`, `onClear`. Aparece con `count > 0`. Acción en lote solo en desktop (oculta en ≤640px). |
| `ScouterRow.jsx` | Fila de tabla: nombre · ciudad · level · inf · brands · opps · tasks_overdue · days_inactive. Highlight si `daysInactive > 14`. Click expande performance. |
| `ScouterModal.jsx` | Crea o cambia ciudad de un Scouter. Lista usuarios aprobados sin rol (de `unassigned_summary.users_no_role` → query a `profiles`). Llama `dbUpsertScouter`. Si el scouter ya existe, avisa que sus registros no se mueven. |

### 4 · CommandPage.jsx
Estado en URL (`useSearchParams`): `region`, `country`, `city`, `scouter`, `from`, `to`.

Carga en paralelo al montar (y al cambiar filtros):
- `getNetworkStats({ cityId, countryId, regionId, from, to })`
- `getNetworkAlerts()`
- `getNetworkScouters({ cityId, countryId, regionId })`
- `getUnassignedSummary()`
- `dbGetGoals()` (ya existe en database.js)

Layout vertical (desktop):
1. **Alertas** — `AlertRow` por ítem. Si `tipo === 'unassigned'`, botón abre `AssignModal` con `showAll` activo. Si vacío: "Todo al día".
2. **La Red** — grid de `StatTile` con links de navegación. Fila aparte para sin-dueño, sin-ciudad, sin-rol.
3. **Scouters** — tabla `ScouterRow` ordenable. Botón "Nuevo Scouter" abre `ScouterModal`.
4. **Objetivos** — tabla simple de `goals_view` con semáforo de ritmo.

Mobile: cada sección colapsa en tarjetas apiladas. Tabla de Scouters → cards verticales. BulkBar oculta.

### 5 · InfluencersPage + BrandsPage
- Estado `selected` (Set de IDs) y `toggleSelect(id)` / `clearSelect()`
- Cada card se envuelve en un div con checkbox absoluto (top-left). El checkbox tiene `onClick stopPropagation` para no disparar navegación.
- `<BulkBar>` sticky abajo, solo cuando `selected.size > 0`
- Al confirmar asignación en lote: `dbAssignBulk(...)` → mostrar resultado por entidad (los que fallaron, con su `error`)
- `clearSelect()` después del lote (exitosos o no)

### 6 · i18n
Claves nuevas en `es.json` y `en.json`:
- `pages.scouters.*`, `pages.command.sections.*`
- `command.alerts.*`, `command.network.*`, `command.scouters.*`, `command.goals.*`, `command.unassigned.*`
- `bulk.*` (selección, asignar, progreso, resultado)
- `scouter.*` (modal, campos, advertencia ciudad)
- `period.*` (chips de período)

---

## Orden de escritura

1. `metrics.js` (corrección `getUnassignedSummary`)
2. `database.js` (2 funciones)
3. `routes.js` + `nav.js`
4. `es.json` + `en.json`
5. `PeriodFilter.jsx`, `AlertRow.jsx`, `BulkBar.jsx`, `ScouterRow.jsx`, `ScouterModal.jsx`
6. `CommandPage.jsx`
7. `NetworkApp.jsx` (import + ruta ScoutersPage)
8. `ScoutersPage.jsx`
9. `InfluencersPage.jsx` + `BrandsPage.jsx` (checkboxes + BulkBar)

---

## Pregunta pendiente antes de arrancar

El prompt lista `ScoutersPage.jsx` (ruta `/network/scouters`) como archivo a crear,
Y también lista "Scouters" como la sección 3 de `CommandPage`.

¿Cuál es la relación entre los dos?

**Opción A:** `CommandPage` muestra un resumen de Scouters (top 5, o solo los inactivos) con un link "Ver todos" que navega a `/network/scouters`. `ScoutersPage` es la tabla completa con filtros propios.

**Opción B:** La sección 3 de `CommandPage` ES la tabla completa. `/network/scouters` no existe como página separada — el archivo del prompt es un error de scope.

**Opción C:** Otra estructura que el usuario defina.
