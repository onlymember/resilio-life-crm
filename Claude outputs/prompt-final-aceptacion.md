# PROMPT EXPERTO FINAL — Verificación de aceptación de punta a punta

## QUÉ ES ESTO
El sistema está construido. Esta tarea **no agrega funcionalidad**: recorre la cadena completa
Marca → Oportunidad → Colaboración → Métricas → Reporte con datos reales, confirma que cada
eslabón entrega al siguiente, y arregla únicamente lo que aparezca roto en el camino.

Si algo falla, arreglarlo con el cambio más chico posible y dejarlo anotado. Si no falla nada,
no tocar nada: el objetivo es evidencia, no cambios.

## REGLAS
- La migración **037** ya está aplicada (dos triggers que crean tareas automáticamente). Si no lo está, frenar y avisar.
- No agregar funcionalidad nueva, no refactorizar, no "mejorar de paso".
- Cualquier arreglo necesario: mínimo, con su commit propio y explicado.
- `npm run build` limpio antes de cualquier push.

## CONTEXTO — cómo cierra el ciclo ahora
Antes, el sistema dejaba de prestar atención en cuanto algo se ganaba o se completaba:
`network_alerts()` excluye explícitamente las oportunidades `won`/`lost`, `my_agenda()` también,
y ninguna de las dos mira colaboraciones. Por eso una oportunidad ganada podía quedar sin
convertir para siempre, y una colaboración terminada sin métricas cargadas — dejando
`monthly_snapshots.avg_engagement_rate` y `total_estimated_media_value` en null, o sea el
sistema midiendo plata pero no rendimiento.

La 037 lo resuelve sin tocar ninguna función existente: dos triggers que crean **tareas**.
Las tareas ya entran solas en `my_agenda()`, ya escalan como `task_overdue` en
`network_alerts()` si se vencen, y ya cuentan en `my_network_stats()`. Por eso **no hizo falta
ningún cambio de frontend**: el recordatorio aparece solo en la agenda del scouter que
corresponde.

## RECORRIDO DE ACEPTACIÓN (hacer en este orden, con datos reales)

### 1. Alta y relación básica
Crear una marca y dos influencers desde la UI (o importarlos con la plantilla). Verificar en
Supabase que quedaron con `city_id`, `owner_scouter_id` y `created_by` cargados. El `city_id` es
el que se rompía antes: si queda en null, revisar que la ciudad escrita exista en `cities`.

### 2. Oportunidad
Crear una oportunidad para esa marca. Agregarle los dos influencers como candidatos, confirmar
uno y dejar el otro en propuesto. Cargarle ítems de valor al confirmado.
**Esperado**: el total de la sección de influencers coincide con la suma de los subtotales.

### 3. El primer eslabón nuevo — ganar
Pasar la oportunidad a **ganada**.
**Esperado**: aparece automáticamente una tarea "Convertir a colaboración: …" asignada al dueño
de la oportunidad, con vencimiento en 2 días. Verificar que se ve en la agenda de esa persona
(pantalla de Inicio) y que al clickearla abre la oportunidad.
```sql
SELECT title, assigned_to, due_date, status FROM tasks
WHERE entity_type='opportunity' ORDER BY created_at DESC LIMIT 3;
```

### 4. Conversión
Apretar "Convertir a Colaboración".
**Esperado**: se crea una colaboración **solo** para el influencer confirmado (el propuesto no),
con `amount` igual a la suma de sus ítems, y con `city_id` heredado de la oportunidad. Aparece
en la sección VÍNCULOS. Apretar el botón una segunda vez no duplica nada y ahora dice
"Sincronizar colaboraciones".

### 5. El segundo eslabón nuevo — completar
Llevar la colaboración a **completada sin cargar métricas**.
**Esperado**: aparece una tarea "Cargar resultados: …" asignada al scouter, con vencimiento en
3 días, y se ve en su agenda. Al clickearla abre la ficha de la colaboración.

### 6. Cerrar el círculo
Cargar en esa ficha alcance, impresiones, engagement y valor de medios. Marcar la tarea como
completada.
**Esperado**: la tarea no vuelve a generarse aunque se toque de nuevo el estado.

### 7. Medición
Con un usuario de Dirección, ir al Command Center y apretar "Cerrar mes".
**Esperado**: aparecen filas por scouter y por ciudad, y **`avg_engagement_rate` y
`total_estimated_media_value` ya no son null** — ese es el resultado que prueba que el ciclo
cerró. Antes de la 037 esas dos columnas quedaban vacías para siempre.
```sql
SELECT scope, collaborations_closed, avg_engagement_rate, total_estimated_media_value
FROM monthly_snapshots WHERE period = date_trunc('month', now())::date;
```

### 8. Historial de relación
Abrir la ficha de la marca y la del influencer que participaron.
**Esperado**: el bloque de historial muestra que trabajaron juntos una vez, con el monto y el
engagement promedio cargados.

### 9. Permisos (el recorrido que más costó)
Con una scouter común (no Dirección): tiene que poder crear un influencer, ver solo lo de su
ciudad, y **no** ver el botón "Importar" ni el de "Cerrar mes". Con un `city_lead` asignado a dos
ciudades: tiene que ver las colaboraciones de ambas.

## SI ALGO FALLA
Los patrones que ya mordieron en este proyecto, para no perder tiempo rastreando:
- **Se guarda pero no pasa nada** → un mapper que descarta el campo en silencio (como
  `dbUpdateUser` con `permisos`), o una columna que no existe (como `active` en `user_roles`).
- **No se ve en la ficha** → el camino de creación y el de edición escriben columnas distintas
  (pasó con marcas: `category` vs `category_id`). Comparar los dos mappers.
- **Error al insertar** → una columna `status`/`relationship_status` es un **enum**: un valor
  fuera de la lista, o una cadena vacía, lo rompe. Celda vacía debe ser campo omitido, nunca `''`.
- **Filas que no aparecen para algunos roles** → una condición de RLS sobre una columna que puede
  venir en null (`city_id IN (...)`) no falla ruidosamente: esconde filas, y solo para algunos.

## ENTREGABLE
Un reporte corto con cada uno de los 9 pasos marcado como pasó / falló, y para cada falla: qué
se rompió, cuál fue la causa y qué se cambió. Si hubo cambios: `npm run build` limpio, commit por
arreglo, y push a `main`.
