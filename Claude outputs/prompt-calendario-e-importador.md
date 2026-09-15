# PROMPT EXPERTO — Calendario completo + importación masiva de Marcas e Influencers

## REGLAS GLOBALES
- Sin SQL nuevo, sin migraciones, sin dependencias nuevas en `package.json`.
- Todo texto visible va por `t('...')` con claves agregadas **en `src/i18n/es.json` y `src/i18n/en.json` a la vez**. Una clave presente en uno solo se renderiza cruda.
- Respetar el estilo existente (`var(--primary-violet)`, `var(--text-secondary)`, `var(--border-violet)`, el objeto `SH`, `SectionHeader`, `EmptyState`).
- `npm run build` limpio antes de cada commit. Un commit por parte.

---

# PARTE A — Calendario completo (rápida, bajo riesgo)

## Diagnóstico
`src/network/pages/CalendarPage.jsx`, líneas ~117-133. Hoy el render es:
```jsx
) : isMobile ? (
  <CalendarAgendaList items={items} month={month} onItemClick={handleItemClick}/>
) : (
  items.length === 0 ? ( <estado vacío grande> ) : ( <CalendarMonthGrid .../> )
)
```
Dos problemas:
1. **En escritorio, un mes sin eventos reemplaza la grilla entera por un estado vacío.** Por eso el calendario "no aparece completo": si el mes está vacío, no hay calendario, hay un cartel.
2. **La grilla y la lista son mutuamente excluyentes.** En móvil solo lista, en escritorio solo grilla. Nunca las dos.

Lo que ya funciona y **no hay que tocar**: la navegación de meses (botones anterior/siguiente/hoy, líneas ~54-60 y ~83-107) y la carga por rango (`dbGetCalendarRange`). `CalendarAgendaList` ya agrupa por día (`byDay`) y `CalendarMonthGrid` ya dibuja el mes completo.

## Qué hacer
Reemplazar ese bloque de render por uno que, con o sin eventos y en cualquier tamaño de pantalla, muestre **siempre la grilla del mes y debajo la lista por días**:

```jsx
      ) : (
        <>
          <CalendarMonthGrid items={items} month={month} onItemClick={handleItemClick}/>

          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
              {t('calendar.listTitle')}
            </div>
            {items.length === 0 ? (
              <div style={{ padding: '28px 0', textAlign: 'center' }}>
                <Calendar size={32} style={{ color: 'var(--text-secondary)', opacity: 0.3, display: 'block', margin: '0 auto 12px' }}/>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{t('calendar.emptyMonth')}</div>
              </div>
            ) : (
              <CalendarAgendaList items={items} month={month} onItemClick={handleItemClick}/>
            )}
          </div>
        </>
      )}
```
Notas:
- El estado vacío ahora vive **debajo** de la grilla, no en lugar de ella.
- `isMobile` sigue sirviendo para el alto de los skeletons de carga; si no queda ningún otro uso, dejá el hook igual (no rompe nada) o sacalo junto con su import.
- Verificar que `CalendarAgendaList` se vea bien a ancho de escritorio: si su contenido queda estirado, limitalo con `maxWidth: 640` en su contenedor, sin tocar el componente.
- En `CalendarMonthGrid`, confirmar que con `items = []` igual dibuja las celdas del mes (debería: arma la grilla desde `firstDow`/`daysInMonth`, no desde los items). Si no lo hiciera, corregirlo ahí.

Claves i18n nuevas bajo `calendar`: `listTitle` (ej. "Detalle del mes"), `emptyMonth` (ej. "No hay nada agendado este mes").

Commit: `fix(calendario): mostrar siempre la grilla del mes y la lista por dias debajo`

---

# PARTE B — Importación masiva desde planilla

## Alcance
Un botón "Importar" en la página de Influencers y otro en la de Marcas, visible **solo para `super_admin`**. Abre una hoja donde se sube un CSV o se pegan celdas copiadas de Excel/Google Sheets, se ve una vista previa validada, y recién ahí se confirma la carga.

Sin dependencias nuevas: se acepta **CSV** (parseado a mano, contemplando comillas) y **pegado directo** (que llega como TSV desde cualquier planilla). Si en el futuro hace falta leer `.xlsx` nativo, se evalúa agregar SheetJS, pero no en este trabajo.

## B.0 — Arreglar el desfasaje de columnas en Marcas (hacer PRIMERO)
`brandToRow` (camino de creación, usado por `dbSaveBrand`) y `dbPatchBrand` (camino de edición, usado por la ficha) escriben columnas distintas:

| Concepto | Crea en | Edita/lee en |
|---|---|---|
| categoría | `category` (texto) | `category_id` (FK) |
| potencial | `potential` | `potential_value` |
| relación | — (no se escribe) | `relationship_status` |
| próxima acción | — | `next_action`, `next_action_at` |

Consecuencia: una marca creada por `dbSaveBrand` guarda la categoría en una columna que la ficha no lee, así que la tarjeta se ve vacía. Esto ya afecta al alta normal de marcas, no solo a la importación.

**Esquema ya verificado en producción** — las 8 columnas existen, con estos tipos:
```
category             text
category_id          uuid
potential            text
potential_value      numeric
relationship_status  USER-DEFINED (enum)
next_action          text
next_action_at       timestamp with time zone
next_follow_up       date
```
Completar `brandToRow` para que escriba **las mismas columnas que lee la ficha**, conservando todas las que ya escribe (no romper el alta actual):
- `relationship_status: b.relationshipStatus ?? 'cold'` — es un **enum**; escribir únicamente `cold`, `warm`, `strong` o `inactive` (los cuatro valores de `REL_STATUSES` en `BrandDetailPage.jsx`, que la ficha ya guarda hoy sin error). Cualquier otro valor, o una cadena vacía, hace fallar el insert: en ese caso omitir el campo.
- `potential_value: b.potentialValue ?? null` (numérico) — **además** del `potential` actual, que es texto y se conserva. Son dos campos distintos: `potential` recibe "alto/medio/bajo" y `potential_value` un número.
- `next_action: b.nextAction ?? null` y `next_action_at: b.nextActionAt ?? null` (este último es timestamptz).
- `next_follow_up` ya se escribe y es de tipo `date`, sin hora: mandar `AAAA-MM-DD` pelado, no un ISO con hora.
- Para la categoría: resolver el texto contra la tabla que lee `dbGetBrandCategories`, comparando por nombre normalizado (minúsculas y sin acentos, igual que `norm()` en `database.js`), y escribir `category_id`. Si no matchea ninguna, dejar `category_id` en null y **conservar igual el texto en la columna `category`**, sin fallar: así no se pierde lo que cargó el usuario y se corrige después desde la ficha.

## B.1 — Componente `src/network/components/ImportSheet.jsx`
Props: `{ kind }` con valor `'influencers'` o `'brands'`, `onClose`, `onDone`.

**Entrada.** Dos formas, ambas en la misma hoja:
- Un `<input type="file" accept=".csv,text/csv">`.
- Un `<textarea>` con el texto "pegá acá las celdas copiadas de tu planilla", que parsea TSV.

**Parseo.** Un parser propio que contemple: separador `,` para CSV y `\t` para lo pegado (detectar cuál aparece en la primera línea); campos entre comillas dobles con comas adentro; comillas escapadas como `""`; saltos de línea `\r\n` y `\n`; BOM al inicio del archivo. Primera fila = encabezados, normalizados a minúscula y sin espacios ni acentos antes de mapear.

**Mapeo de encabezados.** Exacto, y estos son los únicos reconocidos:

Influencers:
```
nombre→name · instagram→instagram · username→username · tiktok→tiktok · email→email
telefono→phone · whatsapp→whatsapp · seguidores→followers · engagement→engagement
vistas_promedio→averageViews · categoria→category · tier→tier · ciudad→ciudad · pais→pais
relacion→relationshipStatus · proxima_accion→nextAction · proxima_accion_fecha→nextActionAt
notas→notes
```
Marcas:
```
nombre→name · categoria→category · sitio_web→website · instagram→instagram · email→email
telefono→phone · whatsapp→whatsapp · ciudad→ciudad · pais→pais · relacion→relationshipStatus
potencial→potential · proximo_seguimiento→nextFollowUp · notas→notes
```
`ciudad` y `pais` se pasan con **esos** nombres, sin traducir: `influencerToRow`/`brandToRow` ya llaman a `resolveGeo(i.ciudad ?? i.city, i.pais ?? i.country)` y resuelven solos.

Un encabezado no reconocido no aborta la importación, pero se muestra un aviso arriba de la vista previa nombrándolo, para que el usuario sepa que esa columna no se va a cargar.

**Regla crítica — celdas vacías.** Una celda vacía tiene que traducirse a **campo omitido** (no incluir la clave en el objeto), nunca a `''`. Mandar cadena vacía a una columna numérica, de fecha, uuid o enum hace fallar el insert. Construir el objeto agregando solo las claves con valor real después de hacer `.trim()`.

**Normalizaciones:**
- `instagram`/`tiktok`: sacar `@` inicial y, si pegaron una URL completa, quedarse con el usuario.
- `seguidores`, `vistas_promedio`: sacar puntos y comas de miles, convertir a entero; si no es un número, tratar la celda como vacía y avisar en esa fila.
- `engagement`: aceptar coma o punto decimal, convertir a número.
- `tier`, `relacion`, `pais`: minúsculas y `trim`.
- Fechas: aceptar `AAAA-MM-DD`; si viene otro formato, marcar la fila con advertencia y omitir el campo en vez de mandar basura.

**Validación por fila, antes de confirmar:**
- `nombre` vacío → fila **inválida**, no se importa (se muestra en rojo con el motivo).
- `tier` fuera de `nano/micro/mid/macro/mega` → advertencia, se omite el campo.
- `relacion` fuera de `cold/warm/strong/inactive` → advertencia, se omite el campo.
- `ciudad` que no matchea ninguna ciudad cargada → advertencia visible ("se va a crear sin ciudad y solo la verá Dirección"), pero la fila se importa igual. Para chequearlo, traer las ciudades una sola vez con `dbGetGeography()` y comparar normalizando (minúsculas, sin acentos), igual que hace `norm()` en `database.js`.
- **Duplicados**: antes de mostrar la vista previa, traer los `instagram` y `email` ya existentes (`dbGetInfluencers` / `dbListAllBrands`, o un `select` puntual de esas dos columnas) y marcar las filas que coincidan. Esas filas vienen **destildadas por defecto**, con el motivo visible; el usuario puede tildarlas a mano si igual las quiere cargar.

**Vista previa.** Tabla con scroll horizontal mostrando todas las filas parseadas, un checkbox por fila (las inválidas deshabilitadas), y un resumen arriba: cuántas se van a importar, cuántas están duplicadas, cuántas son inválidas.

**Confirmación.** Recorrer las filas tildadas **de a una, en secuencia** (nada de `Promise.all`: satura la conexión y esconde fallos parciales), llamando a `dbSaveInfluencer(obj)` o `dbSaveBrand(obj)` — **las mismas funciones que usa el alta normal**, para que la RLS, el `owner_scouter_id`, el `created_by` y la resolución de ciudad funcionen exactamente igual. Mostrar una barra de progreso con "N de M". Atrapar el error de cada fila por separado y seguir con las siguientes.

**Resultado.** Al terminar: cuántas se crearon, cuántas se saltearon y cuántas fallaron, con el motivo de cada fallo y la posibilidad de descargar las filas fallidas como CSV para corregirlas y reintentar. Llamar a `onDone()` para que la página de atrás recargue su listado.

**Aviso de propiedad.** En la hoja, antes de confirmar, un texto fijo: todas las fichas importadas quedan a nombre del usuario que importa (así lo fija `dbSaveInfluencer`/`dbSaveBrand`, y el owner está protegido por un trigger que solo cambia vía `assign_entity()`), y después se reasignan en lote desde el Command Center con la función de asignación que ya existe.

## B.2 — Botones en las páginas
En `src/network/pages/InfluencersPage.jsx` y `src/network/pages/BrandsPage.jsx`, agregar un botón "Importar" al lado del de crear, **visible solo si el usuario es `super_admin`**. Usar el mismo mecanismo de rol que ya usan esas páginas o `COMMAND_ROLES` de `../routes.js`; si la página no recibe hoy el usuario actual, pasárselo como ya se hace en otras pantallas. Al cerrarse el importador con altas hechas, recargar el listado.

Claves i18n nuevas bajo `import`: `button`, `title`, `paste`, `orUpload`, `preview`, `willImport`, `duplicates`, `invalid`, `unknownColumn`, `noName`, `badTier`, `badRelation`, `cityNotFound`, `ownerNotice`, `confirm`, `importing`, `done`, `failed`, `downloadFailed`, `close`.

Commit: `feat(importacion): carga masiva de influencers y marcas desde planilla`

---

## TESTS
1. **Calendario**: abrir un mes sin eventos → la grilla completa tiene que verse igual, con el aviso de "nada agendado" debajo. Cambiar de mes con las flechas → la grilla y la lista se actualizan juntas. Probar en móvil y escritorio: en ambos se ven las dos cosas.
2. **Importar 3 influencers de prueba** con la plantilla: una completa, una solo con nombre, una con la ciudad mal escrita. Resultado esperado: las tres se crean, la tercera con la advertencia de ciudad y sin ciudad asignada.
3. **Celdas vacías**: una fila con solo el nombre no debe tirar ningún error de tipo en consola. Es el caso que rompe si se mandan cadenas vacías.
4. **Duplicados**: importar dos veces el mismo archivo. La segunda vez todas las filas tienen que venir marcadas como duplicadas y destildadas.
5. **Marcas**: importar una marca con categoría y abrir su ficha. La categoría tiene que verse en la tarjeta (esto es lo que valida el arreglo de B.0).
6. **Permisos**: con un usuario scouter, el botón "Importar" no debe aparecer en ninguna de las dos páginas.
7. Ninguna clave i18n renderizada cruda en pantalla.

## ACCEPTANCE CRITERIA
- El calendario muestra siempre el mes completo, con la lista por días debajo, en cualquier tamaño de pantalla y aunque el mes esté vacío.
- Se pueden cargar cientos de influencers y marcas desde una planilla, viendo antes qué se va a crear y qué está repetido.
- Lo importado se ve correctamente al abrir la tarjeta.
- Ninguna fila inválida llega a la base, y ningún fallo individual corta la importación entera.
- `npm run build` limpio, todo pusheado a `main`.

## DO NOT
- No tocar la navegación de meses del calendario ni `dbGetCalendarRange`: ya funcionan.
- No reescribir `CalendarMonthGrid` ni `CalendarAgendaList` salvo que el test 1 muestre que hace falta.
- No insertar en `influencers`/`brands` con `supabase.from(...).insert()` directo desde el importador: siempre vía `dbSaveInfluencer`/`dbSaveBrand`.
- No mandar `''` a ningún campo: celda vacía = clave omitida.
- No usar `Promise.all` para las altas.
- No agregar dependencias.
- No tocar el Admin Panel ni nada de RBAC/RLS en este trabajo.
