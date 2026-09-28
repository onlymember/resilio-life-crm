# Qué falta para escalar a varias ciudades del mundo

Análisis del 2026-09-28, sobre el código tal como está en `main`.

El sistema está bien construido en lo que más cuesta arreglar después: el
modelo de propiedad, RLS, la disciplina de INVOKER/DEFINER y la paginación
en la base. Lo que falta no es arquitectura — son **supuestos de país
único** metidos en lugares puntuales, y una capa de operación que todavía
no existe.

Los agrupo por cuándo duelen, no por cuánto cuestan.

---

## Nivel 1 · Rompen la corrección apenas salís de un huso horario

### El día se calcula en UTC

`my_agenda()`, `my_network_stats()` y `network_scouters()` usan
`CURRENT_DATE` y `::date`. En Supabase la sesión corre en UTC, así que
**"hoy" es el día UTC, no el día de la Scouter**.

Qué significa en las ciudades que ya tenés:

| Ciudad | Offset | El sistema cambia de día a las |
| --- | --- | --- |
| Barcelona | +2 | 22:00 local del día anterior |
| Rosario / Buenos Aires | −3 | 21:00 local |
| Miami | −4 | 20:00 local |

En Miami, desde las 20:00 hasta medianoche, el bloque HOY del Home ya
muestra las cosas de mañana. En Barcelona pasa lo mismo desde las 22:00.
Todos los días, en cada ciudad, hay una ventana de dos a cuatro horas en
que la pantalla miente.

No es cosmético: la cobertura, el `is_today`, el filtro "seguimiento hoy" y
la ventana de siete días se calculan todos sobre esa fecha.

**Lo que sí está bien:** `is_overdue` compara `next_action_at < now()`, que
es una comparación de instantes y no depende del huso. Y el cliente ya
formatea las fechas en el huso de la ciudad de la Scouter (`useTz` lee
`cities.timezone`). El problema es solo del lado del servidor.

**El arreglo.** Las funciones pueden resolver el huso del que llama, sin
tocar el cliente:

```sql
WITH me AS (
  SELECT coalesce(c.timezone, co.timezone, 'UTC') AS tz
  FROM scouters s
  JOIN cities    c  ON c.id  = s.city_id
  JOIN countries co ON co.id = c.country_id
  WHERE s.user_id = auth.uid()
)
```

y después usar `(now() AT TIME ZONE (SELECT tz FROM me))::date` en todos
los lugares donde hoy dice `CURRENT_DATE`.

### Se suman monedas distintas

`scouter_performance()` hace `sum(amount)` sobre `collaborations` sin
agrupar por moneda. Con Miami en dólares, Barcelona en euros y Argentina en
pesos, ese número es la suma de tres unidades diferentes: no significa
nada, y va a aparecer en un reporte de dirección como si significara algo.

Peor: **`currency` es un campo de texto libre** en el formulario. Alguien
escribe `USD`, otro `usd`, otro `dólares`. Aunque después quisieras
agrupar, no podés.

**El arreglo son dos pasos.** Primero, que `currency` sea un selector que
tome por defecto la moneda del país de la ciudad — `countries.currency` ya
está cargado y no se usa. Segundo, que las funciones de métricas devuelvan
el valor **agrupado por moneda** (un objeto, no un número), y que la
pantalla muestre una línea por moneda. Convertir a una moneda única exige
tipos de cambio y es una decisión de negocio, no de software: mostrar
separado es honesto y alcanza.

### Los duplicados se detectan solo contra lo que cada uno ve

El importador y los formularios avisan de duplicados comparando contra las
fichas que la Scouter puede leer. Como RLS le oculta las de las demás, dos
Scouters pueden cargar al mismo influencer sin que a ninguna se le avise.

Con ocho ciudades separadas el riesgo es bajo. Con treinta ciudades, varias
en el mismo país y algunas en la misma área metropolitana, es constante — y
cada duplicado es una ficha que recibe dos veces el mismo mensaje de dos
personas distintas.

**El arreglo** es una función `SECURITY DEFINER` que responda solo
*"¿existe ya?"* sin devolver la ficha: recibe un instagram o un email y
devuelve un booleano más el nombre de la ciudad donde ya está cargado.
Preserva el aislamiento — no filtra datos de nadie — y evita la carga
repetida. Es exactamente el mismo patrón de las funciones
`app_can_see_*` que ya resolvieron la recursión de policies.

---

## Nivel 2 · Frenan la operación entre 20 y 30 Scouters

### No hay capa intermedia, y el sistema ya la soporta

Este es el hallazgo estratégico, y no es de código: es de cómo se está
usando lo que ya existe.

`COMMAND_ROLES` define cinco roles —`super_admin`, `network_direction`,
`regional_lead`, `country_lead`, `city_lead`— y `app_visible_city_ids()`
acota los datos correctamente según el `scope` de cada uno. Está construido
y funciona.

Pero hoy todos son o Dirección o Scouter. Los tres roles de territorio no
los tiene nadie.

Una directora sostiene ocho Scouters con una llamada por día. A los
veinticinco no puede, y el cuello deja de ser el sistema para pasar a ser
una persona. **La unidad de escala no son más Scouters: es una capa de
leads de país o de región**, cada una mirando su propio Command Center con
sus propios números.

Lo notable es que no hay nada que construir. Hay que **asignar los roles**,
y quizá pulir una cosa: `app_visible_city_ids()` ignora por completo la
columna `role` y decide solo por `scope`. Hoy eso es correcto porque el
único que tiene scope amplio es Dirección, pero conviene revisarlo antes de
repartir scopes de país.

Para ver el estado actual:

```sql
SELECT r.role, r.scope, count(*) AS personas
FROM user_roles r
WHERE r.revoked_at IS NULL
GROUP BY r.role, r.scope
ORDER BY r.role;
```

### El idioma está clavado en español

`setLocale()` existe, está exportado, y **no se llama desde ningún lado**.
`countries.locale` está cargado en el seed —incluido `pt` para Brasil— y no
se usa nunca.

O sea: `en.json` es código muerto. Una Scouter de Miami ve la interfaz en
español, y una de São Paulo también.

**El arreglo es chico**: resolver el locale igual que ya se resuelve el
huso —de la ciudad de la Scouter, con fallback al país— y llamar a
`setLocale()` al arrancar la sesión. Para Brasil hace falta además un
`pt.json`.

### Las tareas recurrentes no corren

`generate_recurring_tasks()` está escrita, es idempotente y resuelve
exactamente el problema de repetir el mismo mes sin cargar nada a mano.
**Nadie la llama**: en la migración quedó comentada la línea que la
programaba.

Es el mecanismo que hace que una novena ciudad empiece a recibir el mismo
plan sola. Sin él, cada ciudad nueva es trabajo manual de la directora.

### `network_scouters()` no filtra por estado

Una Scouter dada de baja sigue apareciendo en la tabla de Dirección. Con
ocho es ruido; con cuarenta y rotación normal, la pantalla del chequeo
diario deja de servir.

---

## Nivel 3 · Deuda que hoy no duele

**El importador inserta fila por fila**, en un `for` con `await`. Con 50
filas está bien; con 2.000 son minutos con la pantalla trabada. Se resuelve
con un insert en lotes.

**`dbListAllBrands()` tiene un tope duro de 1.000** y se usa en el selector
de marca de la ficha de oportunidad. Un país con más de mil marcas empieza
a truncar el listado en silencio.

**`dbGetCollaborations` sigue siendo polimórfica** — devuelve un array o un
objeto según los argumentos. No está roto; es una trampa esperando.

**El filtro de Tier no filtra.** `FilterSheet` lo muestra y
`dbGetInfluencers` no acepta ese parámetro.

---

## Lo que NO hay que tocar

Vale decirlo, porque en una revisión de escala la tentación es reescribir.

**El modelo de propiedad** —`owner_scouter_id` como columna real, protegida
por trigger, cambiada solo vía `assign_entity()`— es correcto y es lo que
permite que RLS filtre con un índice.

**La disciplina de INVOKER/DEFINER.** Las funciones de negocio en INVOKER
hacen que la misma pantalla sirva a un Scouter y a un lead sin una línea de
código condicional. Es lo que hace barato agregar la capa intermedia.

**La búsqueda.** `global_search()` usa `ILIKE` con comodín inicial, que
normalmente sería un problema — pero los índices GIN de trigrama están
creados sobre las columnas correctas. Escala bien.

**La paginación en la base.** `dbGetInfluencers` y `dbGetBrands` paginan y
filtran en Postgres, no en el navegador.

---

## El orden en que lo haría

1. **El huso horario.** Es el único que produce datos incorrectos todos los
   días en todas las ciudades. Una migración.
2. **Programar las tareas recurrentes.** Habilita repetir el mes sin
   trabajo manual, que es la premisa de todo el plan operativo.
3. **La moneda**, antes de que se acumulen importes que después haya que
   limpiar a mano.
4. **Asignar los roles de territorio**, antes de pasar de diez ciudades.
   Cero código.
5. **El locale**, cuando entre la primera ciudad que no hable español —
   Miami ya está.
6. **La detección global de duplicados**, cuando dos Scouters compartan
   área metropolitana.

Los del nivel 3 se hacen cuando molesten. Ninguno bloquea nada hoy.
