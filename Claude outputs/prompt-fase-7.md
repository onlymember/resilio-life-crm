# PROMPT EXPERTO — Fase 7: conectar la Fase 6.5 a las pantallas

## REGLAS GLOBALES
- El SQL de la Fase 6.5 (migración 036) YA está aplicado en producción. Este trabajo sólo consume lo que ese SQL creó: la tabla `monthly_snapshots`, la vista `v_brand_influencer_history` y las funciones `close_monthly_snapshot(p_period)` y `convert_opportunity_to_collaboration(p_opportunity_id)`. **No crear, alterar ni redefinir nada de SQL.**
- Todo texto visible al usuario va por `t('...')` con claves nuevas agregadas **en los dos archivos**: `src/i18n/es.json` y `src/i18n/en.json`. Una clave que exista en uno y no en el otro se renderiza cruda en pantalla.
- Respetar el estilo visual existente de cada página (variables CSS `var(--primary-violet)`, `var(--text-secondary)`, el objeto `SH` de sección, el componente `SectionHeader`). No introducir librerías nuevas ni un sistema de estilos distinto.
- `npm run build` limpio antes de cada commit. Un commit por bloque.

## PASO 0 — Commitear trabajo que ya está en el disco sin pushear
En `src/lib/database.js` hay un fix ya aplicado y sin commitear: `dbDeleteUser` pasó de escribir la columna inexistente `active` a usar `revoked_at`, más `scouters.status='inactive'` y chequeo de errores. Verificalo con `git diff`, y si está, commiteá y pusheá antes de empezar:
```bash
git add -A && git commit -m "fix: dbDeleteUser revocaba roles con columna 'active' inexistente" && git push origin main
```

---

## BLOQUE 1 — Capa de datos (`src/lib/database.js`)

### 1.1 Wrappers nuevos
Agregarlos cerca de las demás funciones de colaboraciones. Usar el wrapper `friendly()` para los errores, como hace el resto del archivo:
```js
// ── Fase 6.5: conversión, historial y snapshots ─────────────

export const dbConvertOpportunityToCollaboration = async (opportunityId) => {
  const { data, error } = await supabase.rpc('convert_opportunity_to_collaboration', {
    p_opportunity_id: opportunityId,
  })
  if (error) throw friendly(error)
  return (data || []).map(rowToCollaboration)
}

// Historial agregado marca↔influencer. Filtrable por uno, por el otro, o por el par.
export const dbGetBrandInfluencerHistory = async ({ brandId = null, influencerId = null } = {}) => {
  let q = supabase.from('v_brand_influencer_history').select('*')
  if (brandId)      q = q.eq('brand_id', brandId)
  if (influencerId) q = q.eq('influencer_id', influencerId)
  const { data, error } = await q
  if (error) throw friendly(error)
  return (data || []).map(r => ({
    brandId:                  r.brand_id,
    influencerId:             r.influencer_id,
    timesWorked:              Number(r.times_worked || 0),
    firstCollabAt:            r.first_collab_at,
    lastCollabAt:             r.last_collab_at,
    totalValue:               Number(r.total_value || 0),
    totalEstimatedMediaValue: Number(r.total_estimated_media_value || 0),
    avgEngagementRate:        r.avg_engagement_rate == null ? null : Number(r.avg_engagement_rate),
  }))
}

export const dbGetMonthlySnapshots = async ({ period = null, scope = null } = {}) => {
  let q = supabase.from('monthly_snapshots').select('*').order('period', { ascending: false })
  if (period) q = q.eq('period', period)
  if (scope)  q = q.eq('scope', scope)
  const { data, error } = await q
  if (error) throw friendly(error)
  return (data || []).map(r => ({
    id:                       r.id,
    period:                   r.period,
    scope:                    r.scope,
    scopeId:                  r.scope_id,
    newInfluencers:           Number(r.new_influencers || 0),
    newBrands:                Number(r.new_brands || 0),
    newOpportunities:         Number(r.new_opportunities || 0),
    opportunitiesWon:         Number(r.opportunities_won || 0),
    opportunitiesLost:        Number(r.opportunities_lost || 0),
    collaborationsClosed:     Number(r.collaborations_closed || 0),
    totalValue:               Number(r.total_value || 0),
    totalEstimatedMediaValue: Number(r.total_estimated_media_value || 0),
    avgEngagementRate:        r.avg_engagement_rate == null ? null : Number(r.avg_engagement_rate),
    closedAt:                 r.closed_at,
  }))
}

// Sólo Dirección: la función SQL levanta excepción para cualquier otro rol.
export const dbCloseMonthlySnapshot = async (period = null) => {
  const params = {}
  if (period) params.p_period = period
  const { error } = await supabase.rpc('close_monthly_snapshot', params)
  if (error) throw friendly(error)
}
```
Verificar que `rowToCollaboration` mapee `city_id` → `cityId`; si no lo hace, agregarlo.

### 1.2 Arreglar la ciudad que nunca se escribe
`dbSaveCollaboration` arma su objeto `row` sin `city_id`, así que **todas** las colaboraciones creadas desde la app nacen con la ciudad en null (verificado en producción: 2 de 2). Eso rompe cualquier corte por ciudad. Dentro de `dbSaveCollaboration`, antes del insert/update, derivar la ciudad con la misma cascada que usa la función SQL `collab_city_id()`:
```js
  // La ciudad no se escribía nunca. Si no viene explícita, derivarla de la
  // marca y, en su defecto, del influencer (misma cascada que collab_city_id() en SQL).
  let cityId = rest.cityId || null
  if (!cityId && row.brand_id) {
    const { data: b } = await supabase.from('brands').select('city_id').eq('id', row.brand_id).maybeSingle()
    cityId = b?.city_id || null
  }
  if (!cityId && row.influencer_id) {
    const { data: i } = await supabase.from('influencers').select('city_id').eq('id', row.influencer_id).maybeSingle()
    cityId = i?.city_id || null
  }
  row.city_id = cityId
```

Commit: `feat(data): wrappers de snapshots/historial/conversion + colaboraciones guardan ciudad`

---

## BLOQUE 2 — Botón "Convertir a Colaboración" (`src/network/pages/OpportunityDetailPage.jsx`)

Contexto del archivo: `STATUSES` en línea ~19; el estado `candidates` guarda los influencers de la oportunidad con `.status` (`proposed`/`confirmed`/`declined`) y `.totalValue`; la sección "INFLUENCERS CANDIDATOS" termina con una fila de total; más abajo hay una sección "VÍNCULOS" que renderiza `entity.linkedCollaborations`. Hay precedente de sección condicional por estado: `{get('status') === 'lost' && (...)}`.

Agregar, **inmediatamente después** de la fila de total de la sección de influencers candidatos, un bloque que sólo aparece cuando `get('status') === 'won'`:
- Si hay al menos un candidato con `status === 'confirmed'`: un botón primario "Convertir a Colaboración", con un subtítulo que diga cuántos influencers confirmados se van a convertir y por qué monto total (sumando el `totalValue` de los confirmados).
- Si no hay ninguno confirmado: en lugar del botón, un texto explicando que primero hay que confirmar al menos un influencer (con el check verde de cada fila).
- Al hacer click: `setConverting(true)`, llamar `dbConvertOpportunityToCollaboration(entity.id)`, y con el resultado refrescar la entidad para que la sección VÍNCULOS muestre las colaboraciones nuevas. Mostrar un mensaje de resultado dentro de la página (no `alert()`): cuántas colaboraciones existen ahora para esta oportunidad.
- La función SQL es **idempotente**: si ya existe una colaboración para ese par (oportunidad, influencer) no la duplica. Reflejarlo en el texto del botón cuando ya hay colaboraciones vinculadas: que diga "Sincronizar colaboraciones" en vez de "Convertir a Colaboración", así queda claro que volver a apretarlo es seguro.
- Errores: la función levanta excepción con texto claro ("Sin permiso para convertir esta oportunidad", "Oportunidad no encontrada"). Mostrarlo en el bloque, en rojo, sin romper la página.

Claves i18n nuevas bajo `opportunities.convert` (en `es.json` y `en.json`): `title`, `button`, `buttonSync`, `needConfirmed`, `willConvert`, `done`, `error`.

Commit: `feat(oportunidades): boton convertir oportunidad ganada en colaboraciones`

---

## BLOQUE 3 — Historial de relación (`BrandDetailPage.jsx` e `InfluencerDetailPage.jsx`)

Crear un componente compartido nuevo: `src/network/components/RelationshipHistory.jsx`.
- Props: `{ brandId }` o `{ influencerId }` (exactamente uno de los dos).
- Llama a `dbGetBrandInfluencerHistory({ brandId })` o `({ influencerId })`.
- Necesita resolver nombres de la contraparte: si se le pasa `brandId`, cada fila viene con `influencerId` y hay que mostrar el nombre del influencer (usar `dbGetInfluencers` o una consulta puntual por los ids que aparecen; no traer toda la tabla si se puede evitar). Simétrico para el otro caso.
- Renderiza una fila por contraparte con: nombre, veces que trabajaron juntos, monto total acumulado, engagement promedio (si no es null) y "última vez" en formato relativo.
- Ordenar por `timesWorked` descendente y, a igualdad, por `lastCollabAt` más reciente.
- Si no hay filas: usar `EmptyState` con un texto del tipo "Todavía no trabajaron juntos".
- Manejar el estado de carga sin romper el layout.

Insertarlo en las dos páginas de detalle como una sección más, usando el mismo patrón `SH` + `SectionHeader` que usan las secciones existentes, ubicada antes de la sección de actividad.

Claves i18n nuevas bajo `relationshipHistory`: `title`, `empty`, `timesWorked`, `totalValue`, `avgEngagement`, `lastCollab`.

Commit: `feat(fichas): bloque de historial de relacion marca-influencer`

---

## BLOQUE 4 — Reporte mensual (`src/network/pages/CommandPage.jsx`)

Leer primero el archivo entero y seguir sus patrones (ya tiene filtros por ciudad/país/región y tarjetas de métricas).

Agregar una sección "Reporte mensual" que:
- Cargue `dbGetMonthlySnapshots({ period: <primer día del mes actual en formato YYYY-MM-01> })`.
- Muestre dos grupos separados: filas de `scope='scouter'` y filas de `scope='city'`, resolviendo los nombres (los scouters ya están disponibles vía `getNetworkScouters` de `metrics.js`; las ciudades vía `dbGetGeography`).
- Por cada fila: altas de influencers y marcas, oportunidades nuevas / ganadas / perdidas, colaboraciones, valor total y engagement promedio.
- Un selector de período simple (los últimos 6 meses) que recargue.
- Un botón "Cerrar mes" que llame a `dbCloseMonthlySnapshot(period)` y recargue, **visible sólo para Dirección**. Usar el mismo criterio de rol que ya aplica `COMMAND_ROLES` / lo que use la página para distinguir Dirección; si el usuario no es Dirección la función SQL igual lo rechaza, pero no hay que mostrarle un botón que sabemos que va a fallar.
- Si no hay snapshots para el período: estado vacío explicando que ese mes todavía no fue cerrado, con el botón de cerrar si corresponde.

Nota importante para el texto de la UI: los snapshots son **fotos cerradas**, no métricas en vivo. Que el copy lo deje claro ("datos al momento del cierre"), porque si no la gente va a pensar que está viendo el mes en tiempo real y se va a confundir cuando no cambie.

Claves i18n nuevas bajo `monthlyReport`: `title`, `subtitle`, `byScouter`, `byCity`, `close`, `closing`, `empty`, `notClosedYet`, `closedAt`, y las de cada métrica.

Commit: `feat(command): reporte mensual leyendo monthly_snapshots`

---

## TESTS
1. **Conversión**: tomar una oportunidad, ponerla en "ganada", agregarle un influencer, confirmarlo y cargarle ítems de valor. El botón tiene que aparecer y decir cuántos confirmados hay. Apretarlo → debe crearse una colaboración con el monto igual a la suma de los subtotales, y aparecer en VÍNCULOS. Apretarlo **una segunda vez** → no debe duplicar nada y el botón debe decir "Sincronizar".
2. **Permisos de conversión**: con un scouter que no sea dueño de la oportunidad, el botón debe mostrar el error de permiso sin romper la página.
3. **Ciudad**: crear una colaboración nueva desde la app (no por conversión) y verificar en Supabase que `city_id` quedó cargado con la ciudad de la marca. Antes de este cambio quedaba en null.
4. **Historial**: en una marca que tenga 2+ colaboraciones con el mismo influencer, el bloque debe mostrar `timesWorked = 2` y la suma correcta.
5. **Reporte mensual**: con un usuario de Dirección, apretar "Cerrar mes" y verificar que aparecen filas por scouter y por ciudad. Con un scouter común, la pantalla debe mostrar sólo su propia fila (lo impone la policy `snap_select`) y no debe verse el botón de cerrar.
6. Confirmar que ninguna clave de i18n se renderiza cruda (buscar textos tipo `opportunities.convert.button` en pantalla).

## ACCEPTANCE CRITERIA
- Una oportunidad ganada se convierte en colaboraciones en un click, y volver a apretarlo es inofensivo.
- Las colaboraciones nuevas nacen con ciudad.
- Las fichas de marca e influencer muestran con quién vienen trabajando y cuánto.
- Dirección puede cerrar el mes y ver el reporte sin tocar SQL.
- `npm run build` limpio, todo pusheado a `main`.

## DO NOT
- No crear ni modificar nada de SQL: las 4 piezas de la 036 ya están en producción y verificadas.
- No cambiar `dbApproveUser`, `dbDeleteUser`, `upsert_scouter` ni nada de RBAC/RLS.
- No usar `alert()` para los resultados de la conversión: mostrarlos en la página.
- No tocar el Admin Panel en este trabajo (tiene su propio prompt aparte, en 3 bloques).
- No agregar dependencias nuevas al `package.json`.
