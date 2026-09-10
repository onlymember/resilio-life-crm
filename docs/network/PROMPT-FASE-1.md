# PROMPT EXPERTO — RESILIO NETWORK · FASE 1 (FOUNDATION)

> Pegar completo en Claude Code, en una sesión limpia, dentro de `E:\resilio-life-crm`.
> Un solo prompt = un solo PR. No abrir el siguiente hasta que pase el checklist final.

---

## REGLAS GLOBALES

1. No modifiques módulos fuera de `FILES TO MODIFY`. Si necesitás tocar otro archivo, **PARÁ y reportá por qué**.
2. Ninguna migración destructiva. Toda migración tiene su rollback escrito.
3. No borres datos. Renombrar > borrar. Deprecar > eliminar.
4. Esconder un botón **no** es seguridad. La seguridad real vive en RLS, y en esta fase todavía no existe.
5. Si la especificación contradice al código, **no inventes**: reportá la contradicción y proponé la opción más segura y reversible.
6. No agregues dependencias nuevas. Esta fase no necesita ninguna.
7. Preservá el sistema visual existente (las CSS vars de `GlobalStyles` en `App.jsx`). Network no es un rediseño.
8. Escribí el diff mínimo que cumple los ACCEPTANCE CRITERIA. No refactorices de paso.

---

## CONTEXT

`resilio-life-crm` es una SPA React 18 + Vite, sin router: la navegación es un `switch` sobre `currentView` (useState + localStorage) en `App.jsx`. El backend es Supabase, consumido directo desde el cliente con la anon key.

**Lo que ya está hecho y no hay que rehacer:**

- Auditoría del código (PROMPT 01). Las 42 vistas de `renderView()` están mapeadas a su ecosistema.
- Gate de rol en cliente (PROMPT 02): existe el rol `scouter`, existe `canAccessView` en `src/lib/auth.js`, y el Sidebar, el Command Palette y los nodos del Hub filtran por rol. **Eso es UX, no seguridad**, y el código lo dice.

**Los cuatro hechos del sistema que condicionan toda esta fase:**

1. **No hay identidad server-side.** `dbLogin` hace `supabase.from('users').select()` con la anon key y compara `btoa(password + '_rl26')`. No se emite JWT. Para Postgres, **`auth.uid()` es NULL siempre**. Cualquier política RLS restrictiva dejaría la app mostrando cero filas.
2. **RLS está habilitado con políticas abiertas.** `supabase/schema.sql` crea `CREATE POLICY "allow_all" ... USING (true) WITH CHECK (true)` en las cinco tablas. Aparece como protegido en el dashboard y no protege nada. Como la anon key va en el bundle del cliente, cualquiera que abra devtools en la app desplegada lee y escribe toda la base **sin loguearse**, incluida `users` con emails y contraseñas base64 reversibles.
3. **El schema puede estar incompleto.** Correr `SELECT ... FROM crm_influencers` en el SQL Editor devuelve `42P01: relation does not exist`. Hay que confirmar con `supabase/00-diagnostico.sql` qué tablas existen realmente. Si `crm_influencers` falta, la app viene perdiendo datos en silencio (ver punto 4).
4. **Los errores de Supabase se tragan.** `dbGetInfluencers()` hace `const { data } = await ...` y descarta el `error`; `App.jsx` envuelve la llamada en `.catch(() => {})`. Si la tabla no existe, la app cae a `DEMO_INFLUENCERS` sin avisar. Y como `influencers`, `brands` y `locations` son `useState` y no `useLocalStorage`, todo lo que cargue el equipo desaparece al recargar.

---

## OBJECTIVE

Dejar el esqueleto de datos de Network completo, versionado y reversible, **sin romper nada de lo que hoy funciona y sin fingir seguridad que todavía no existe**.

Al terminar esta fase el sistema tiene:

- Las tablas del CRM reparadas, y la pérdida silenciosa de datos cerrada.
- Jerarquía internacional `region → country → city → team → scouter`, con seed de los mercados reales.
- Ownership en **columnas tipadas**, fuera del JSONB, con historial de asignaciones.
- Las entidades de negocio persistentes: oportunidades, campañas, relación N:M campaña↔influencer, colaboraciones.
- Transversales: activities, audit log con triggers, tasks con recurrencia, goals y misiones.
- Un registro de migraciones y una lista explícita de la deuda de seguridad que la Fase 2 debe saldar.

**Lo que esta fase NO hace, a propósito:** no migra a Supabase Auth y no aplica RLS restrictiva. Las dos cosas dependen de tener JWT y son la Fase 2. Aplicar RLS ahora rompería la aplicación entera.

---

## FILES TO INSPECT

```
src/lib/database.js                    (dbGetInfluencers, dbSaveInfluencer, dbLogin)
src/lib/auth.js                        (canAccessView, VIEW_ECOSYSTEM — ya existen)
src/lib/supabase.js
src/App.jsx                            (líneas ~1084-1090: la carga que traga errores)
src/data/demo.js                       (estructura real de influencers y campañas)
supabase/schema.sql
supabase/00-diagnostico.sql
```

## FILES TO MODIFY

```
src/lib/database.js     → dejar de tragar errores; nuevas funciones de Network
src/App.jsx             → mostrar el error de carga en vez de caer a demo en silencio
.env.example            → crear si no existe (solo NOMBRES de variables, nunca valores)
```

## FILES TO CREATE

```
supabase/fase1/01-reparar-base.sql
supabase/fase1/02-geografia.sql
supabase/fase1/03-ownership.sql
supabase/fase1/04-entidades.sql
supabase/fase1/05-transversales.sql
supabase/fase1/99-verificacion.sql
src/lib/geography.js                   (fetch + cache de la jerarquía)
docs/network/FASE-1.md                 (qué se corrió, en qué orden, cómo revertir)
docs/network/DEUDA-SEGURIDAD.md        (lo que queda abierto y por qué)
```

---

## DATABASE

Los seis archivos SQL ya están escritos y son **idempotentes**: se pueden correr sobre una base que ya tenga las tablas o sobre una que no las tenga, sin romper ni duplicar nada.

**Orden estricto. Un archivo por vez, verificando entre uno y otro:**

| # | Archivo | Qué hace | Riesgo |
|---|---|---|---|
| 0 | `00-diagnostico.sql` | Solo lectura. Dice qué existe realmente. | nulo |
| 1 | `01-reparar-base.sql` | Tablas `crm_*` faltantes, columnas de `users`, rol `scouter`, `schema_migrations` | bajo |
| 2 | `02-geografia.sql` | `regions/countries/cities/teams/scouters` + seed AR, UY, US | bajo |
| 3 | `03-ownership.sql` | Columnas de gobierno, `assignments`, `assign_entity()`, vista `v_sin_dueno` | **medio** |
| 4 | `04-entidades.sql` | `opportunities`, `campaigns`, `campaign_influencers`, `collaborations` | bajo |
| 5 | `05-transversales.sql` | `activities`, `audit_log` + triggers, `tasks`, `goals`, `missions` | bajo |
| 6 | `99-verificacion.sql` | Solo lectura. Los 5 bloques que cierran la fase. | nulo |

**La decisión de arquitectura del paso 3, que hay que entender antes de correrlo:**

`crm_influencers` guarda todo en `data jsonb`, y `dbSaveInfluencer` hace **upsert del objeto completo**. Si `owner_scouter_id` viviera dentro de ese JSON, un Scouter podría reasignarse influencers ajenos editando el JSON antes de guardar, y ninguna política con `WITH CHECK` lo impediría, porque tiene permiso legítimo de escritura sobre esa fila. Por eso los campos de gobierno salen a columnas reales. `data` no se toca: nada se borra, todo es reversible.

**Backfill:** `owner_scouter_id` queda `NULL` en todo lo existente. **No se inventan dueños para registros históricos.** Dirección los reparte desde `v_sin_dueno`.

**Sobre las FK:** apuntan a `users(id)` porque `profiles` todavía no existe. La migración a Supabase Auth (Fase 2) las remapea con el user-id-map.

---

## SECURITY

**Lo que esta fase mejora:**

- Cada tabla nueva nace con RLS habilitado y una política llamada `TEMP_open_until_auth`. Es abierta, igual que las actuales, pero **tiene nombre**, así que el bloque 3 de `99-verificacion.sql` la lista y la Fase 2 la reemplaza con una sola query. La deuda pasa de invisible a inventariada.
- `assign_entity()` es `SECURITY DEFINER` y deja rastro en `assignments`: la reasignación deja de ser un UPDATE suelto.
- Triggers de auditoría sobre ownership, rol y estado de usuario: quedan registrados venga el cambio de donde venga.
- `REVOKE UPDATE, DELETE` sobre `audit_log` y `activities`: append-only declarado.

**Lo que sigue abierto, y hay que escribirlo en `DEUDA-SEGURIDAD.md` sin suavizarlo:**

- La base entera es legible y escribible desde internet con la anon key. Se cierra en la Fase 2 (Supabase Auth + RLS).
- Las contraseñas son base64, no hash. Se revierten con `atob()`.
- Toda operación de AdminPanel (aprobar, bloquear, borrar usuarios) corre con anon key desde el navegador.

**Reglas duras de esta fase:**

- **No pongas RLS restrictiva.** Sin JWT, la app queda en cero filas.
- Nunca commitees `.env.local` ni una service_role key. `.env.example` lleva solo nombres.
- Correr cada archivo primero contra una copia, si hay forma de tenerla. Si no la hay, hacer backup del proyecto desde el dashboard de Supabase antes del paso 1 y anotar la hora en `FASE-1.md`.

---

## UX

Un solo cambio visible, y es una corrección de bug, no una feature:

Hoy, si Supabase falla, la app muestra demo data como si fueran datos reales. Eso es peor que un error: el equipo trabaja sobre datos ficticios sin saberlo, y el trabajo se pierde al recargar.

En `App.jsx`, la carga inicial debe distinguir tres casos:

- **Datos reales** → mostrarlos.
- **Tabla vacía** → estado vacío normal.
- **Error de Supabase** → un aviso visible arriba: «No se pudo conectar con la base. Lo que ves es data de ejemplo y no se va a guardar.» Y loguear el error real en consola, no tragarlo.

En `database.js`, dejar de descartar el `error` de cada query. Las funciones de lectura devuelven `{ data, error }` o lanzan, pero nunca `null` silencioso.

Nada más. Esta fase no toca layouts, ni el Sidebar, ni el sistema visual.

---

## DATA MIGRATION

**Campañas.** Viven en `localStorage` bajo `crm_inf_camps_v2`. Según el handoff son `DEMO_INF_CAMPAIGNS`. **No las migres automáticamente**: importar demo data a producción es ensuciarla. Escribí un script que las **exporte a JSON** a `docs/network/export-campanas.json` para revisión humana, y dejá la key intacta. La decisión de importar o no la toma una persona.

**Colaboraciones.** `App.jsx` persiste un array en `crm_collabs`, pero `CollabsPanel` ignora esa prop y usa su propio `useState`. Nada que migrar. Exportá igual el contenido de la key por las dudas, y no la borres.

**Influencers, marcas, locales.** Si el diagnóstico dice que las tablas no existían, no hay nada que migrar: la Fase 1 las crea vacías y a partir de ahí la app empieza a guardar de verdad. Si existían con datos, los pasos 1 y 3 los conservan intactos — el bloque 5 de la verificación lo prueba con conteos.

**Nada se borra en esta fase.** Ninguna key de localStorage, ninguna tabla, ninguna columna.

---

## EDGE CASES

- **El diagnóstico revela que faltan tablas.** Es el escenario esperado. El paso 1 las crea. Anotá en `FASE-1.md` cuáles faltaban.
- **`.env.local` apunta a otro proyecto Supabase** que el que se está mirando en el dashboard. Verificá que `VITE_SUPABASE_URL` coincida antes de correr nada.
- **Ya existe un usuario con rol `scouter`** y el rollback del CHECK falla. Documentado en el propio archivo: reasignarlos antes.
- **`crm_locations` referencia `crm_brands`** con FK. Si `crm_brands` no existe, hay que crearla primero — el orden del paso 1 ya lo contempla.
- **Ciudad escrita de cuatro formas distintas** en el JSONB («Bs As», «Buenos Aires», «CABA», «capital»). El `city_id` queda NULL y se reporta. **No crees ciudades automáticamente desde strings sucios.**
- **Influencer sin dueño tras el backfill.** Es lo normal y correcto. Aparece en `v_sin_dueno`.
- **Marca internacional en varios mercados.** Por ahora una fila con `city_id` nullable. Anotá la limitación: la spec §07 prevé `BRAND_MARKET`, es Fase 3.
- **El SQL Editor de Supabase parsea todo el script antes de ejecutar.** Una referencia a una tabla inexistente tumba el archivo entero. Por eso el diagnóstico descubre las tablas desde el catálogo en vez de nombrarlas.

---

## TESTS

**A · Base de datos** (correr `99-verificacion.sql`)

1. `schema_migrations` tiene 5 filas, de `001` a `005`.
2. El inventario lista 24 tablas (23 creadas o reparadas + `users`), todas con `rls_on = true` y `politicas = 1`.
3. El bloque 3 lista las políticas abiertas. Ahora **debe** listarlas todas; al cerrar la Fase 2 debe dar cero filas.
4. La geografía devuelve 6 ciudades con su moneda y timezone.
5. `influencers_total = con_data` y `sin_dueno = influencers_total`.

**B · Función de asignación**

6. `assign_entity('influencer', '<id>', '<uuid_user>', '<uuid_actor>', 'prueba')` funciona y deja fila en `assignments`.
7. La misma llamada con un id inexistente lanza excepción con mensaje claro.
8. El cambio queda registrado en `audit_log` con `action = 'ownership_changed'`.

**C · Aplicación**

9. `npm run build` sin errores. *(No hay script de lint en este repo.)*
10. Login con un usuario de cada rol: `super_admin`, `admin`, `viewer`, `scouter`.
11. Crear un influencer, recargar la página, y que **siga estando**. Este es el test que prueba que se cerró la pérdida silenciosa.
12. Apuntar `VITE_SUPABASE_URL` a una URL inválida: debe aparecer el aviso de conexión caída, no demo data disfrazada de real.

**D · No regresión** — con un usuario `admin`, recorrer las 8 secciones del sidebar y confirmar que cada módulo levanta sus datos:

13. Resilio Life (12 ítems) · Agencia Creativa (4) · Agencia Influencers (4) · Productora (5) · Elevare (6) · Gestión (3) · Captación (6).
14. El gate del Scouter del PROMPT 02 sigue funcionando: `localStorage.setItem('crm_view','brands')` + F5 vuelve a `inf_dashboard`.

---

## ACCEPTANCE CRITERIA

La Fase 1 **no** está cerrada hasta que:

1. Las 5 migraciones figuran en `schema_migrations`.
2. Existen las 24 tablas, todas con RLS habilitado y política nombrada.
3. La geografía tiene los 6 mercados reales, y **cero países, ciudades o monedas hardcodeados** en `src/` (verificar con `grep -rn "'Rosario'\|'Argentina'\|'ARS'" src/`).
4. El ownership está en columnas tipadas e indexadas, no en JSONB, y `data` quedó intacto.
5. `assign_entity()` es el único camino de reasignación, y deja rastro en `assignments` y en `audit_log`.
6. Las cuatro entidades de negocio existen y persisten.
7. Ningún dato existente se perdió — probado con los conteos del bloque 5.
8. Ninguna key de localStorage fue borrada.
9. **La app ya no muestra demo data disfrazada de datos reales.**
10. `npm run build` pasa y los 8 módulos ajenos a Network funcionan igual que antes.
11. `docs/network/DEUDA-SEGURIDAD.md` dice, sin suavizarlo, que la base sigue abierta y que se cierra en la Fase 2.
12. Cada archivo SQL tiene su rollback escrito y probado al menos una vez.

---

## DO NOT

- **No apliques RLS restrictiva.** Sin JWT rompés la aplicación entera. Es la Fase 2.
- No migres a Supabase Auth en este prompt. Es el PROMPT 04, y necesita ventana de mantenimiento.
- No borres la tabla `users`, ni ninguna key de localStorage, ni ninguna columna del JSONB.
- No importes automáticamente el localStorage de campañas a Supabase.
- No inventes owners para registros históricos.
- No crees ciudades a partir de strings sucios del JSONB.
- No agregues React Router. Es el PROMPT 16.
- No toques los módulos Elevare, Productora, Captación, Creative ni el CRM de Resilio Life.
- No agregues dependencias.
- No vendas esta fase como «ya es seguro» en ningún commit, mensaje o documento. Todavía no lo es.
