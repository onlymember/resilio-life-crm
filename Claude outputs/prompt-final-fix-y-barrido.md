# PROMPT EXPERTO FINAL — Fix del Admin Panel en móvil + barrido de consistencia

## NO HACE FALTA NADA DE SQL
Las tres migraciones del sistema (**036** medición, **037** triggers del ciclo, **038**
`assign_entity`) están aplicadas y verificadas en producción. Este trabajo es 100% frontend.
No crear, modificar ni ejecutar SQL de ningún tipo.

## REGLA CRÍTICA — leer antes de tocar nada
**Nunca reescribir un archivo entero.** Hacer ediciones puntuales sobre el contenido actual,
releyendo el archivo justo antes de modificarlo.

En este proyecto ya se perdió trabajo **tres veces** por escribir un archivo completo desde una
copia vieja en memoria. La peor: se borró la sección de Geografía entera dentro de un commit cuyo
mensaje decía que agregaba un import (−281 líneas netas). `AdminPanel.jsx` es el archivo más
expuesto y es justamente el que toca la Parte A.

Antes de empezar, `git status` tiene que estar limpio. Si hay algo sin commitear, frenar y avisar.

---

# PARTE A — Las pestañas del Admin Panel en móvil (hacer primero, commit propio)

## El problema
El Admin Panel tiene 8 secciones. En pantallas angostas se renderizan en una fila horizontal con
`overflowX: auto`, así que las últimas —entre ellas **Geografía**— quedan fuera de pantalla, y no
hay ninguna señal visual de que la fila se puede deslizar. Desde el celular, la sección
directamente no existe para el usuario.

La solución es que las pestañas se envuelvan en varias líneas en vez de scrollear. Así el problema
no vuelve a aparecer cada vez que se agregue una sección nueva.

## Los dos cambios (son dos líneas)

**1.** En `src/components/Admin/AdminPanel.jsx`, alrededor de la línea 1356, dentro del contenedor
de la barra de secciones. Reemplazar:
```js
          overflowX: isMobile ? 'auto' : 'visible',
          gap: isMobile ? 4 : 0,
          alignItems: isMobile ? 'center' : 'stretch',
```
por:
```js
          // Las pestañas se envuelven en varias líneas en móvil en vez de scrollear:
          // con 8 secciones las últimas quedaban fuera de pantalla y nada indicaba
          // que la fila se podía deslizar.
          overflowX: 'visible',
          gap: isMobile ? 4 : 0,
          alignItems: isMobile ? 'flex-start' : 'stretch',
```

**2.** Alrededor de la línea 1369, el `<nav>` que mapea las secciones. Reemplazar:
```jsx
          <nav style={{ flex:1, display: isMobile ? 'flex' : 'block', gap: isMobile ? 4 : 0 }}>
```
por:
```jsx
          <nav style={{ flex:1, display: isMobile ? 'flex' : 'block', flexWrap: isMobile ? 'wrap' : 'nowrap', gap: isMobile ? 4 : 0 }}>
```

## Verificación
- No debe quedar ningún `overflowX: isMobile ? 'auto'` en el archivo.
- La sección Geografía tiene que seguir presente: `GeografiaSection` aparece 2 veces.
- El import `from '../../lib/supabase.js'` tiene que seguir ahí (la sección Geografía lo usa).
- Probar en viewport de ~390px: las 8 pestañas visibles en dos líneas, sin scroll horizontal.

Commit: `fix(admin): las pestanas se envuelven en movil para que Geografia sea alcanzable`

---

# PARTE B — Barrido de consistencia

No agrega funcionalidad. Busca en todo `src/` las cuatro clases de bug que se repitieron en este
proyecto. Todas comparten lo mismo: **no rompen el build, no tiran error, y se manifiestan como
"no pasa nada"**. Entre las cuatro suman más de una docena de bugs acá, y ninguno apareció en un
`npm run build`.

### Clase 1 — Identificador usado sin importar
Rompe recién en runtime. Ya pasó con `supabase` en `AdminPanel.jsx`: la sección Geografía lo usaba
sin importarlo y la pantalla moría con "supabase is not defined".

**Búsqueda**: por cada archivo de `src/`, listar los identificadores con forma de módulo que usa
(`supabase.`, funciones `db*`/`get*` de las librerías, componentes en JSX con mayúscula inicial) y
confirmar que cada uno esté en algún `import` del archivo. Mirar con especial atención los
archivos que crecieron con secciones nuevas.

### Clase 2 — Parámetro o campo aceptado y descartado en silencio
El llamador cree que filtra o guarda, y no pasa nada. Ya pasó dos veces: `dbUpdateUser` recibía
`permisos` y nunca lo escribía (la pestaña de Permisos entera era decorativa), y `dbGetBrands`
recibía `search` y nunca lo aplicaba (el buscador de marcas no filtraba nada).

**Búsqueda**: en `src/lib/database.js` y `src/lib/metrics.js`, por cada función que desestructura
parámetros, verificar que **cada uno** se use en el cuerpo. Lo mismo con los objetos `FIELD_MAP` y
las funciones `*ToRow`: comparar las claves que aceptan contra las columnas que escriben.

### Clase 3 — Prop pasado con un nombre y recibido con otro
React lo ignora sin avisar. Ya pasó dos veces: `ImportSheet` declaraba `kind` pero las páginas le
pasaban `isOpen` y `entityType` (la hoja se abría sola al entrar en Influencers y el mapeo de
columnas era el equivocado), y `CalendarAgendaList` le pasaba `onClick` a `AgendaItem`, que solo
acepta `onNavigate` (las filas del calendario no navegaban a ningún lado).

**Búsqueda**: por cada componente de `src/network/components/`, comparar su firma de props contra
los props que le pasan todos sus llamadores. Reportar todo prop pasado que el componente no
declare, y todo prop declarado que nadie pase.

### Clase 4 — Escritura que no respeta el tipo real de la columna
Rompe el insert o se descarta. Ya pasó tres veces: `active` escrita sobre `user_roles` y `scouters`
donde esa columna no existe (las reales son `revoked_at` y `status`), cadenas vacías mandadas a
columnas numéricas o enum, y `brandToRow` escribiendo `category` mientras la ficha leía
`category_id` (la categoría se cargaba y la tarjeta se veía vacía).

**Enums confirmados** — un valor fuera de la lista, o `''`, rompe el insert:
- `collaborations.status` → `collab_status`: `proposed, confirmed, in_progress, content_pending, completed, cancelled`
- `brands.relationship_status` → `cold, warm, strong, inactive`

**Búsqueda**: revisar cada `.insert(` y `.update(` de `database.js` y confirmar que los campos
opcionales se **omiten** cuando vienen vacíos, en vez de mandar `''`. Y por cada entidad, comparar
el camino de creación (`*ToRow`) contra el de edición (`dbPatch*`): si escriben columnas distintas,
algo que se carga al crear no se va a ver después en la ficha.

---

## CÓMO REPORTAR
Por cada hallazgo: archivo y línea, qué se rompe **desde el punto de vista del usuario** (no la
descripción técnica), y el arreglo mínimo. Un commit por hallazgo, con un mensaje que diga qué se
rompía de verdad.

Si alguna de las cuatro clases no tiene hallazgos, decirlo explícitamente: "no encontré ninguno"
es un resultado válido y útil.

**No arreglar nada que no entre en estas cuatro clases.** Si aparece otra cosa, anotarla y seguir.
No es el momento de refactorizar.

## VERIFICACIÓN FINAL
1. `npm run build` limpio.
2. Paridad de i18n: toda clave de `es.json` existe en `en.json` y viceversa.
3. No queda ningún `rgba(196,181,253,` usado como `color:` en `src/`.
4. `GeografiaSection` sigue apareciendo 2 veces en `AdminPanel.jsx` y el import de `supabase` sigue
   presente (verificar esto **al final**, para confirmar que nada se pisó durante el trabajo).
5. `git status` limpio y todo pusheado a `main`.
