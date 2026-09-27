# RBAC — quién ve qué en Resilio Network

Este documento describe el modelo de permisos. Está escrito leyendo el
código y las migraciones del repo, y marca de forma explícita lo que
**no** pudo verificarse ahí.

> **Origen.** Las funciones de permiso se crearon a mano en el dashboard
> de Supabase y no están en ningún archivo de migración. Las que este
> documento cita fueron volcadas de la base el 2026-09-27 y son lectura
> real de su código, no inferencia. Para volver a volcarlas:
> `supabase/dump_rbac.sql`. La tabla `user_roles` y el enum de roles
> siguen sin archivo de creación.

---

## Los dos ejes

El permiso no es una sola dimensión. Hay dos, y son independientes:

**Ecosistema** — a qué módulo entrás. Lo resuelve el cliente, en
`src/lib/auth.js`, con el mapa `VIEW_ECOSYSTEM` y la función
`canAccessView(user, viewId)`. Es *deny by default*: una vista que no
esté en el mapa se niega, aunque el usuario sea de un rol alto. Hay 42
vistas mapeadas y ninguna sin mapear.

**Alcance (scope)** — qué porción de los datos ves dentro de ese módulo.
Lo resuelve exclusivamente la base, con RLS. Vive en
`user_roles(user_id, role, scope, scope_id)`, donde `scope` dice si el
rol aplica a una ciudad, un país, una región o a todo, y `scope_id`
apunta a la fila correspondiente.

Esta separación importa: el chequeo del cliente decide qué pantalla
se abre, **no** qué filas trae. Un usuario que se saltee el gate del
cliente igual recibe únicamente lo que RLS le permita. El gate del
cliente es comodidad, no seguridad.

## Los roles de comando

`src/network/routes.js` define los cinco roles que ven el Command Center:

```js
export const COMMAND_ROLES = [
  'super_admin', 'network_direction',
  'regional_lead', 'country_lead', 'city_lead',
]
```

Un rol que no está en esa lista es, a efectos de Network, un Scouter:
entra a `/network/home` en vez de `/network/command` (lo decide
`getDefaultRoute`), y no ve Command Center ni Scouters.

En la base, `app_is_direction()` es **más estrecha** que esa lista:

```sql
role IN ('super_admin', 'network_direction')
```

Los tres roles de territorio — `regional_lead`, `country_lead`,
`city_lead` — **no** pasan por ahí. Ven el Command Center porque el
cliente los deja entrar, pero los datos que reciben salen acotados por
`app_visible_city_ids()`, o sea por su `scope`. Un City Lead ve la
pantalla completa con los números de su ciudad. Es el comportamiento que
se buscaba.

## Propiedad de una ficha

Cada influencer, marca y oportunidad tiene un dueño en la columna
`owner_scouter_id`. Es una columna real, no un campo dentro de un JSONB,
justamente para que RLS pueda filtrar por ella con un índice.

Tres reglas la protegen:

1. Un trigger (`protect_owner_column`) **rechaza** cualquier `UPDATE` que
   intente cambiar esa columna directamente.
2. El único camino para cambiar el dueño es la función `assign_entity()`,
   que valida el permiso **del actor** — no el de destino — y deja el
   cambio registrado en la tabla `assignments`.
3. La capa de datos coopera: `influencerToRow()` en `src/lib/database.js`
   nunca incluye `owner_scouter_id` ni `created_by` en un update. Si lo
   incluyera, el trigger cortaría el guardado entero.

Al crear, el dueño es quien crea. El importador de CSV no es excepción:
todo lo que importás queda a tu nombre y se reparte después.

## Cómo se lee una ficha

La policy `inf_select`, de `016_fix_policy_recursion.sql`:

```sql
USING (
  app_is_direction()
  OR app_has_broad_read('influencers')
  OR app_has_broad_read('resilio')
  OR owner_scouter_id = auth.uid()
  OR city_id IN (SELECT app_visible_city_ids())
  ...
)
```

Se lee de arriba hacia abajo como una lista de motivos por los que
alguien puede ver la fila. Para un Scouter común, el único que debería
aplicar es `owner_scouter_id = auth.uid()`.

**Verificado el 2026-09-27: para un Scouter, el único motivo que aplica
es ser el dueño.** El razonamiento, porque no es evidente:

`app_visible_city_ids()` devuelve ciudades solo si el usuario tiene una
fila en `user_roles` cuyo `scope` sea `'global'`, `'region'`, `'country'`
o `'city'`. Ignora por completo la columna `role`: lo que habilita es el
scope, no el rol.

Y `upsert_scouter()` — la única vía por la que se da de alta un Scouter —
inserta su fila así:

```sql
INSERT INTO user_roles (user_id, role, scope, scope_id, ecosistemas, ...)
VALUES (p_user_id, 'scouter', 'own', p_city_id, ARRAY['influencers'], ...)
```

`scope = 'own'`. Ese valor **no coincide con ninguna de las cuatro ramas**
de `app_visible_city_ids()`, así que la función devuelve vacío y esa línea
de la policy nunca se cumple. El `scope_id` guarda la ciudad para saber a
cuál pertenece, pero no le da visibilidad sobre ella.

La otra puerta, `app_has_broad_read(eco)`, exige
`role IN ('admin','editor','viewer')` **y** que `eco` esté en el array
`ecosistemas`. Un Scouter tiene `role = 'scouter'`, que no está en esa
lista, así que tampoco entra por ahí.

**Queda un riesgo, y es de datos, no de código.** Nada impide que un mismo
usuario tenga la fila de `scouter` *y además* una fila vieja de
`admin`/`editor`/`viewer` del CRM anterior con `'influencers'` o
`'resilio'` en `ecosistemas`. Esa segunda fila le daría lectura amplia
salteándose todo lo anterior. Se detecta con la consulta del final.

## INVOKER y DEFINER

La regla, y el motivo de cada lado:

**SECURITY INVOKER** (el default) para todo lo que devuelve datos de
negocio: `my_agenda()`, `my_network_stats()`, `network_stats()`,
`network_scouters()`, `goals_view`, `tasks_view`. La función corre con
los permisos de quien la llama, así que RLS se aplica adentro. Esto es lo
que permite que la misma pantalla muestre un alcance distinto según el
rol, sin una sola línea de código condicional en el cliente.

**SECURITY DEFINER** solo para chequeos de permiso que consultan otra
tabla: `app_can_see_entity()`, `app_can_see_campaign()`,
`app_influencer_in_my_campaign()`. Estas existen porque sin ellas las
policies se llaman entre sí y Postgres aborta con *infinite recursion
detected in policy*. Son deliberadamente diminutas: reciben un id,
devuelven un booleano, y no exponen ninguna fila.

Una vista también necesita declararlo: `ALTER VIEW x SET (security_invoker = true)`.
Sin eso la vista corre con los permisos de quien la creó —
o sea, el super admin. Ya pasó con `tasks_view` y `goals_view`.

## Estado de verificación

Lo que está probado con evidencia:

- La suite de negación de la Fase 1 pasó 9 de 9. El caso decisivo fue
  `T10 · solo ve los suyos: 1 visibles · 0 ajenos` — un Scouter con la
  consola abierta, pidiendo la tabla `influencers` entera sin filtro,
  recibió solo la suya.
- `025` cerró las policies de `missions` y `task_templates`, que estaban
  con `USING(true)`.

Lo que **no** está probado:

- Los tests T13b y T16 corrieron contra tablas vacías. Pasaron sin probar
  nada.
- Que un Scouter no vea los registros de otro de su misma ciudad está
  demostrado **leyendo el código** (arriba), pero no ejecutado contra
  datos reales con dos Scouters cargados en la misma ciudad.
- Nunca se verificó que un City Lead vea solo su ciudad.
- `027_verificacion.sql` no se corrió.

Eso es lo que cubre la Fase 2F, que quedó pendiente.

## Para auditar el estado real

```
supabase/dump_rbac.sql
```

Cinco bloques de solo lectura: los enums, quién tiene qué rol y sobre
qué alcance, el cuerpo de las funciones de permiso, las dos funciones que
faltan en `026_command_center.sql`, y todas las policies vigentes con una
columna `abierta` que marca las que no filtran nada.

Ninguna fila con `abierta = true` debería quedar en pie.


## Las policies abiertas que SON correctas

Un chequeo de `pg_policies` buscando `USING (true)` devuelve seis filas, y
las seis están bien así:

`activation_types` · `brand_categories` · `cities` · `countries` ·
`regions` · `manual_categories`

Son catálogos: lo que llena los desplegables al cargar una ficha. Todo
Scouter necesita leerlos, no contienen datos de nadie, y las seis son
`SELECT` solamente — ninguna permite escribir.

Lo que importa de ese chequeo no es que dé cero filas, sino **cuáles**
aparecen. Si alguna vez sale `influencers`, `brands`, `profiles`,
`user_roles`, `opportunities`, `collaborations` o `tasks`, eso sí anula
el modelo de propiedad y hay que cerrarlo el mismo día.

Verificado el 2026-09-27: ninguna de esas siete aparece, y ninguna tabla
de `public` quedó con RLS apagado (`031` cerró `schema_migrations`, que
era la última).

## La consulta que falta correr

Busca usuarios con doble rol: la fila de Scouter y además una fila vieja
del CRM anterior que les daría lectura amplia. Es el único agujero que
queda abierto, y es de datos.

```sql
SELECT p.email,
       string_agg(r.role || ' / ' || r.scope, ', ' ORDER BY r.role) AS roles,
       array_agg(DISTINCT e) FILTER (WHERE e IS NOT NULL)           AS ecosistemas
FROM user_roles r
JOIN profiles p ON p.id = r.user_id
LEFT JOIN LATERAL unnest(r.ecosistemas) AS e ON true
WHERE r.revoked_at IS NULL
GROUP BY p.email
HAVING count(*) FILTER (WHERE r.role = 'scouter') > 0
   AND count(*) FILTER (WHERE r.role IN ('admin','editor','viewer')) > 0;
```

Cero filas es lo correcto. Cada fila que aparezca es un Scouter que puede
leer más de lo suyo, y se corrige revocando la fila vieja:

```sql
UPDATE user_roles SET revoked_at = now()
WHERE user_id = '<uuid>' AND role IN ('admin','editor','viewer')
  AND revoked_at IS NULL;
```
