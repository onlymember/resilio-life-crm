# PROMPT EXPERTO DE CIERRE — Barrido de consistencia

## QUÉ ES ESTO
El sistema está construido y funcionando. Esta tarea **no agrega funcionalidad**: busca, en todo
`src/`, las cuatro clases de bug que se repitieron a lo largo de este proyecto y que comparten
una característica — **no rompen el build, no tiran error, y se manifiestan como "no pasa nada"**.
Cada una ya apareció entre dos y cuatro veces. El objetivo es encontrar las que queden.

## REGLA CRÍTICA DE TRABAJO — leer antes de tocar nada
**Nunca reescribir un archivo entero.** Usar ediciones puntuales sobre el contenido actual del
archivo, releyéndolo justo antes de modificarlo. En este proyecto ya se perdió trabajo dos veces
porque una sesión escribió un archivo completo desde una copia vieja que tenía en memoria: la
segunda vez se borró la sección de Geografía dentro de un commit cuyo mensaje decía que agregaba
un import (−281 líneas netas). `AdminPanel.jsx` es el más expuesto, pero aplica a todos.

Antes de empezar: `git status` tiene que estar limpio. Si hay cambios sin commitear, frenar y
avisar — pueden ser de otra sesión.

Commitear cada hallazgo por separado, con un mensaje que diga qué se rompía de verdad.

---

## LAS CUATRO CLASES DE BUG

### 1. Identificador usado sin importar
Rompe recién en runtime, así que el build pasa limpio. Ya pasó con `supabase` en
`AdminPanel.jsx` (la sección Geografía lo usaba sin importarlo → "supabase is not defined").

**Cómo buscarlo**: para cada archivo de `src/`, listar los identificadores que usa con forma de
módulo (`supabase.`, `db*(`, `get*(` de las librerías, componentes en JSX con mayúscula inicial) y
confirmar que cada uno aparece en algún `import` del archivo. Prestar atención a archivos que
crecieron con secciones nuevas.

### 2. Parámetro o campo que se acepta y se descarta en silencio
El llamador cree que está filtrando o guardando, y no pasa nada. Ya pasó dos veces:
`dbUpdateUser` recibía `permisos` y nunca lo escribía (toda la pestaña de Permisos era decorativa),
y `dbGetBrands` recibía `search` y nunca lo aplicaba (el buscador de marcas no filtraba).

**Cómo buscarlo**: en `src/lib/database.js` y `src/lib/metrics.js`, para cada función que
desestructura parámetros, verificar que **cada uno** se use en el cuerpo. Lo mismo para los
objetos `FIELD_MAP` y los `*ToRow`: comparar las claves que aceptan contra las columnas que
realmente escriben.

### 3. Prop que se pasa con un nombre y se recibe con otro
React lo ignora sin avisar. Ya pasó dos veces: `ImportSheet` recibía `kind` pero las páginas le
pasaban `isOpen` y `entityType` (la hoja se abría sola al entrar y el mapeo de columnas era el
equivocado), y `CalendarAgendaList` le pasaba `onClick` a `AgendaItem`, que solo acepta
`onNavigate` (las filas del calendario no navegaban).

**Cómo buscarlo**: para cada componente de `src/network/components/`, comparar su firma de props
contra los props que le pasan todos sus llamadores. Reportar cualquier prop pasado que el
componente no declare, y cualquier prop declarado que nadie pase.

### 4. Escritura que no respeta el tipo real de la columna
Rompe el insert o se descarta. Ya pasó tres veces: `active` escrita sobre `user_roles` y
`scouters` donde no existe (la columna real es `revoked_at` / `status`), cadenas vacías mandadas
a columnas numéricas o enum, y `brandToRow` escribiendo `category` mientras la ficha leía
`category_id`.

**Columnas que son enum y no texto** (un valor fuera de la lista, o `''`, rompe el insert):
`collaborations.status` → `collab_status` (`proposed, confirmed, in_progress, content_pending,
completed, cancelled`); `brands.relationship_status` → (`cold, warm, strong, inactive`).

**Cómo buscarlo**: revisar cada `.insert(` / `.update(` de `database.js` y confirmar que los
campos opcionales se **omiten** cuando están vacíos en vez de mandar `''`. Y para cada entidad,
comparar el camino de creación (`*ToRow`) contra el de edición (`dbPatch*`): si escriben columnas
distintas, algo que se carga al crear no se va a ver en la ficha.

---

## CÓMO REPORTAR
Para cada hallazgo: archivo y línea, qué se rompe **desde el punto de vista del usuario** (no la
descripción técnica), y el arreglo mínimo. Si no hay hallazgos en alguna de las cuatro clases,
decirlo explícitamente — "no encontré ninguno" es un resultado válido y útil.

**No arreglar nada que no entre en estas cuatro clases.** Si aparece otra cosa, anotarla y
seguir; no es el momento de refactorizar.

## VERIFICACIÓN FINAL
Al terminar, y sin importar si hubo hallazgos:
1. `npm run build` limpio.
2. Confirmar que la paridad de i18n sigue intacta: toda clave de `es.json` existe en `en.json` y
   viceversa.
3. Confirmar que no quedó ningún `rgba(196,181,253,` usado como `color:` en `src/`.
4. `git status` limpio y todo pusheado a `main`.
