# PROMPT EXPERTO — Geografía, asignación en oportunidades/colaboraciones, y buscadores

## REGLAS GLOBALES
- La migración **038** ya está aplicada: arregla `assign_entity` (venía cortando siempre por un `IF NOT FOUND` después de un `EXECUTE`, que en PostgreSQL no actualiza `FOUND`) y le suma el tipo `collaboration`. Si no está aplicada, frenar y avisar: sin eso, la parte B no puede funcionar.
- Sin dependencias nuevas. Todo texto por `t('...')` con claves en **`es.json` y `en.json` a la vez**.
- Respetar el estilo de cada archivo (el Admin Panel usa estilos inline con `rgba(139,92,246,...)`; el módulo Network usa `var(--...)`). No mezclar.
- `npm run build` limpio antes de cada commit. Un commit por parte.

---

# PARTE A — Sección "Geografía" en el Admin Panel

## Contexto
No existe ninguna pantalla para crear ciudades ni países. Hoy la única forma es el mini formulario "+ Nueva ciudad" dentro del modal de aprobar usuario, o SQL a mano. Al importar marcas aparece "Ciudad no encontrada — se crea sin ciudad y solo la verá Dirección", y ese es un problema real: la visibilidad depende de `city_id`, así que una entidad sin ciudad es invisible para scouters y líderes de ciudad.

La policy `geo_write` de `cities`/`countries` es `app_is_direction()`, o sea que **solo `super_admin` y `network_direction`** pueden escribir. Un `admin` común va a recibir error de RLS: hay que avisárselo en la UI, no dejarlo fallar en silencio.

## A.1 — `database.js`: funciones nuevas
Junto a `dbCreateCity` (ya existe, ~línea 1098), agregar:
```js
export const dbCreateCountry = async ({ name, code = null, regionId = null, currency = null, timezone = null }) => {
  const { data, error } = await supabase.from('countries')
    .insert([{ name, code, region_id: regionId, currency, timezone, active: true }])
    .select().single()
  if (error) throw friendly(error)
  _geoCache = null
  return data
}

export const dbUpdateCity = async (id, patch) => {
  const row = {}
  if ('name'     in patch) row.name       = patch.name
  if ('countryId'in patch) row.country_id = patch.countryId
  if ('timezone' in patch) row.timezone   = patch.timezone
  if ('active'   in patch) row.active     = patch.active
  const { error } = await supabase.from('cities').update(row).eq('id', id)
  if (error) throw friendly(error)
  _geoCache = null
}

export const dbUpdateCountry = async (id, patch) => {
  const row = {}
  if ('name'     in patch) row.name      = patch.name
  if ('code'     in patch) row.code      = patch.code
  if ('regionId' in patch) row.region_id = patch.regionId
  if ('currency' in patch) row.currency  = patch.currency
  if ('active'   in patch) row.active    = patch.active
  const { error } = await supabase.from('countries').update(row).eq('id', id)
  if (error) throw friendly(error)
  _geoCache = null
}
```
Ojo: `dbGetGeography()` filtra por `.eq('active', true)`, así que una ciudad desactivada desaparece de los selectores — **eso es lo que hace de "borrar" sin romper las entidades que la referencian**. No agregar un delete real.

## A.2 — `AdminPanel.jsx`: sección nueva
Agregar `{ id:'geografia', icon:'🌍', label:'Geografía', badge:0 }` al array `sections` y su caso en `renderSection()`.

El componente `GeografiaSection`:
- Carga `dbGetGeography(true)` al montar. **Importante**: esa función solo trae las activas; para administrar hace falta ver también las inactivas, así que traer las tablas directo con `supabase.from('cities').select('*')` y `countries`/`regions` sin filtro de `active`, u ordenadas por nombre.
- Dos bloques: **Países** y **Ciudades**, cada uno con su lista y su formulario de alta.
- Países: nombre (obligatorio), código, región (select de `regions`), moneda. Lista con el conteo de ciudades de cada uno.
- Ciudades: nombre (obligatorio), país (select, obligatorio), zona horaria. Lista agrupada por país, mostrando **cuántas marcas, influencers y scouters tiene cada una** — ese dato es el que evita que alguien desactive una ciudad con datos adentro. Traerlo con tres `count` por ciudad en una sola consulta agrupada, no una consulta por fila.
- Cada fila con un toggle Activa/Inactiva y edición del nombre en línea.
- Antes de desactivar una ciudad que tenga entidades asociadas, pedir confirmación explicando que esas entidades van a dejar de aparecer en los selectores.
- Si cualquier escritura falla por RLS, mostrar el error con un texto claro: que crear o editar geografía requiere rol `super_admin` o `network_direction`.

Claves i18n bajo `geo`: `title`, `countries`, `cities`, `newCountry`, `newCity`, `name`, `code`, `region`, `currency`, `timezone`, `country`, `active`, `inactive`, `create`, `save`, `inUse`, `confirmDeactivate`, `rlsError`, `empty`.

Commit: `feat(admin): seccion de Geografia para crear y administrar paises y ciudades`

---

# PARTE B — Asignar oportunidades y colaboraciones

## Contexto
`AssignModal` y `BulkBar` existen y funcionan, pero **solo están montados en `InfluencersPage`, `BrandsPage`, `BrandDetailPage` y `CommandPage`**. Las cuatro pantallas de oportunidades y colaboraciones tienen cero referencias a asignación. No es un bug: nunca se construyó.

Con la 038 aplicada, `assign_entity` ya acepta `'opportunity'` y `'collaboration'`, y sabe que las colaboraciones guardan el dueño en `scouter_id` y no en `owner_scouter_id`.

## B.1 — Ficha de Oportunidad y de Colaboración
En `OpportunityDetailPage.jsx` y `CollaborationDetailPage.jsx`, replicar exactamente lo que hace `BrandDetailPage.jsx` (~línea 378): un botón de reasignar en el encabezado, visible con el mismo criterio de rol que usa esa página (`COMMAND_ROLES` de `../routes.js`), que abre `<AssignModal entity={entity} entityType="opportunity" />` (o `"collaboration"`), y al terminar recarga la entidad.

## B.2 — Listados con selección múltiple
En `OpportunitiesPage.jsx` y `CollaborationsPage.jsx`, replicar el patrón de `BrandsPage.jsx`: selección múltiple de filas y `<BulkBar entityType="opportunity" />` / `"collaboration"`. Copiar el manejo de estado de `BrandsPage` (`selected`, `clearSelect`, `onRefresh`), no inventar uno nuevo.

## B.3 — Verificar el mensaje de error
`friendly()` en `database.js` mapea errores de RLS a "No tenés permiso para esta operación". Los errores de `assign_entity` son mensajes propios ("Entidad inexistente", "Sin permiso para reasignar en esa ciudad"). Confirmar que esos lleguen a la pantalla tal cual, sin quedar tapados por el mensaje genérico — si `friendly()` los pisa, dejarlos pasar.

Commit: `feat(asignacion): transferir oportunidades y colaboraciones a otra scouter`

---

# PARTE C — Buscadores que funcionen

## C.1 — El bug silencioso: `dbGetBrands` ignora `search`
`dbGetBrands` (~línea 1438) recibe `search` en su firma, lo desestructura, y **nunca lo aplica**. Cualquier buscador de marcas que la use no filtra nada. Agregar, junto a los demás filtros y copiando la forma que ya usa `dbGetInfluencers`:
```js
  if (search) q = q.or(`name.ilike.%${search}%`)
```
**Importante sobre `.or()`**: PostgREST usa la coma como separador entre condiciones, así que un término con coma rompe el filtro entero. Sanitizar el texto antes de interpolarlo (sacar comas, paréntesis y comillas) en `dbGetBrands` **y también en `dbGetInfluencers`**, que hoy tiene el mismo problema:
```js
const safe = (s) => String(s).replace(/[,()"']/g, ' ').trim()
```

## C.2 — Reemplazar los `<select>` nativos por un buscador
`CreateSheet.jsx` elige influencer y marca con `<select>` nativos (líneas ~162 y ~168), cargados con `dbListAllInfluencers()` y `dbListAllBrands()`. Esas dos funciones tienen este comentario en `database.js`, escrito por quien las hizo:

> *Legacy — InfluencersView de Resilio Life. Cap duro: no escala con 20K registros. No usar en módulos nuevos; usar dbGetInfluencers con paginación.*

O sea que el formulario de creación usa justo lo que dice no usar: tope de 1000 registros, sin búsqueda, y con la importación masiva recién hecha esos desplegables ya son inusables.

**El buscador que hace falta ya existe**: `AddInfluencerSheet`, dentro de `OpportunityDetailPage.jsx` (~línea 219), busca con `dbGetInfluencers({ search, pageSize: 10 })` y muestra resultados en vivo. Extraer ese patrón a un componente nuevo `src/network/components/EntityPicker.jsx`:
- Props: `{ kind }` (`'influencer'` o `'brand'`), `value`, `onChange`, `placeholder`, y opcionalmente `excludeIds`.
- Se ve como un campo de texto: si hay algo elegido muestra el nombre con una X para limpiar; si no, es un input que busca.
- Busca a partir de 2 caracteres, con **debounce de ~250ms** (hoy `AddInfluencerSheet` dispara una consulta por tecla).
- Llama a `dbGetInfluencers({ search, pageSize: 10, status: 'active' })` o `dbGetBrands({ search, pageSize: 10 })`.
- Muestra nombre y `@username` (o la ciudad, para marcas) para poder distinguir homónimos.

Usarlo en `CreateSheet.jsx` en los tres lugares: el `brandId` del formulario de oportunidad (~116) y el `influencerId` + `brandId` del de colaboración (~162 y ~168). Sacar los `dbListAllInfluencers()`/`dbListAllBrands()` del `useEffect` (~263-264) si no quedan otros usos en el archivo.

**Bug a arreglar al extraer**: en `AddInfluencerSheet` el `useEffect` tiene `existing` en su array de dependencias, y `existing` llega como `candidates.map(...)` — un array nuevo en cada render del padre. Eso hace que el efecto se re-dispare y vuelva a consultar en cada render. En `EntityPicker`, depender de `excludeIds.join(',')` en vez del array.

Después de extraerlo, reemplazar el cuerpo de `AddInfluencerSheet` para que use `EntityPicker` en vez de duplicar la lógica.

Claves i18n bajo `picker`: `searchInfluencer`, `searchBrand`, `noResults`, `typeMore`, `clear`.

Commit: `feat(buscadores): EntityPicker con busqueda real + fix de dbGetBrands que ignoraba search`

---

## TESTS
1. **Geografía**: crear un país y una ciudad. Verificar que aparecen de inmediato en el selector de ciudad del modal de aprobar usuario y en los filtros de las listas. Desactivar una ciudad con datos: tiene que pedir confirmación y avisar qué se va a ocultar.
2. **Importación**: crear las ciudades que faltaban y reimportar el archivo del CAV. Ya no debe aparecer "Ciudad no encontrada" en ninguna fila.
3. **Asignar oportunidad**: transferir una a otra scouter y verificar en Supabase que cambió `owner_scouter_id` y que quedó la fila en `assignments`.
4. **Asignar colaboración**: idem, pero verificando **`scouter_id`** (esa tabla usa otra columna).
5. **Asignar marca**: tenía que estar roto antes de la 038 y funcionar ahora. Si sigue fallando, mirar el mensaje exacto: ya no debería decir "Entidad inexistente".
6. **Buscar**: en el formulario de nueva colaboración, escribir tres letras del nombre de un influencer recién importado. Tiene que aparecer. Antes había que scrollear un desplegable de mil opciones.
7. **Buscar con coma**: buscar un nombre que tenga una coma (por ejemplo "Martinez, S.A."). No debe romper ni devolver vacío — es lo que valida la sanitización.
8. Ninguna clave i18n renderizada cruda.

## ACCEPTANCE CRITERIA
- Se pueden crear y administrar países y ciudades desde el Admin Panel, sin SQL.
- Se puede transferir cualquiera de las cuatro entidades a otra scouter, desde la ficha y en lote.
- Elegir un influencer o una marca se hace escribiendo, no scrolleando.
- `npm run build` limpio, todo pusheado.

## DO NOT
- No tocar `assign_entities_bulk`: solo llama a `assign_entity` en un loop, ya quedó arreglada por la 038.
- No agregar borrado real de ciudades ni países: desactivar (`active=false`) es lo correcto, porque hay entidades que las referencian.
- No ampliar la policy `geo_write` para incluir `admin` sin que el usuario lo pida.
- No seguir usando `dbListAllInfluencers` / `dbListAllBrands` en ningún módulo nuevo.
- No interpolar texto del usuario en un `.or()` de PostgREST sin sanitizar.
