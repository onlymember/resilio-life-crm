# PROMPT EXPERTO — Admin Panel definitivo (verdad visible, reasignación de accesos, y basta de secciones falsas)

## REGLAS GLOBALES
- No tocar RLS ni funciones SQL. Todo lo que sigue es cliente (JS + UI). Ya está verificado que la base soporta todo esto: `app_visible_city_ids()` une todas las filas activas de `user_roles` por usuario, y `app_can_create()` acepta `network_direction/regional_lead/country_lead/city_lead/scouter/admin/editor`.
- `user_roles` NO tiene columna `active` (la real es `revoked_at`). `scouters` NO tiene `active` (la real es `status`). `cities/countries/regions` SÍ tienen `active`. Nunca escribir `active` sobre `user_roles` ni `scouters`.
- **Orden obligatorio: BLOQUE 1 primero, buildear, verificar que compila, y sólo entonces seguir.** No mezclar bloques en un mismo commit.
- Un commit por bloque, con `npm run build` limpio antes de cada uno. Push a `main` al final de cada bloque (Vercel deploya solo).
- No romper nada de lo que ya funciona: el flujo de aprobación con multi-ciudad recién arreglado (commit c62885b), el polling de 5s, el filtrado/búsqueda de usuarios.

## CONTEXTO
`src/components/Admin/AdminPanel.jsx` es el panel del super admin (modal full-screen, 7 secciones: Dashboard, Usuarios, Matriz Permisos, Actividad, Monitor Live, Configuración, Notificaciones). Se alimenta de `src/lib/auth.js`, que re-exporta casi todo desde `src/lib/database.js`.

Historia reciente relevante: se encontró y arregló una familia de bugs donde el código escribía una columna `active` inexistente sobre `user_roles`/`scouters`. Consecuencia en producción: usuarios que el panel mostraba como "Aprobado" con su rol, pero que en la base tenían CERO filas activas en `user_roles` — o sea, cero permisos reales, y RLS los bloqueaba en todo. Se detectaron 4 usuarias así y se repararon a mano. **El panel no mostraba ninguna señal de que algo estuviera mal.** Ese es el problema de fondo que este trabajo tiene que cerrar: el panel muestra `profiles.rol` como si fuera la verdad, cuando la verdad vive en `user_roles`.

### Hallazgos verificados leyendo el código (todos reales, todos confirmados)

1. **El dato de los accesos reales YA viene y nadie lo usa.** `rowToUser()` en `database.js` (línea ~86) devuelve en cada usuario `roles: [{ role, scope, scopeId, ecosistemas }]`, ya filtrado a filas activas (`!r.revoked_at`). `dbGetUsers()` lo devuelve para todos. El panel jamás lee `u.roles`: muestra sólo `u.rol`.
2. **`u.rol` no es `profiles.rol`.** Es `primaryRole`, calculado desde las filas activas de `user_roles`, y **cae a `profile.rol` cuando no hay ninguna fila activa**. Por eso las 4 usuarias roas parecían normales en el panel: mostraban su `profiles.rol` como si tuvieran permisos. Para poder detectar desincronización hace falta exponer también el `profiles.rol` crudo.
3. **No hay forma de cambiar rol ni ciudades después de aprobar.** El botón "✅ Aprobar" sólo se renderiza si `u.estado === 'pendiente'` (línea ~458). Para un usuario ya aprobado la única acción es "✏️ Editar", y `dbUpdateUser()` escribe **únicamente** columnas de `profiles` (nombre, sobrenombre, rol, estado, notas_admin, ultimo_acceso) — nunca toca `user_roles`. Cambiar el rol ahí desincroniza `profiles.rol` de `user_roles.role` en silencio.
4. **La pestaña "🔒 Permisos" del modal Editar no hace nada.** Arma `changes.permisos = { ecosistemas, acciones }` y lo manda a `updateUser()` → `dbUpdateUser()`, que **descarta `permisos` por completo** (no está en la lista de columnas que mapea). Los ecosistemas reales viven en `user_roles.ecosistemas`. El admin tilda checkboxes, guarda, ve "Guardado", y no pasó nada.
5. **"Matriz Permisos" está roto, no sólo falso.** `toggleEco()` hace `const updated = updateUser(...)` **sin `await`** y después `setUsers(updated)`. `updateUser` es async, así que mete una Promise en el state: el render siguiente hace `users.filter(...)` sobre una Promise y tira TypeError. Clickear cualquier celda rompe la sección. Y encima `dbUpdateUser` descarta `permisos` igual.
6. **Actividad, Monitor y el contador del Dashboard están muertos por un mismatch de nombres de campo.** `dbGetActivityLog()` (database.js ~1612) devuelve `{ id, userId, userName, accion, detalle, seccion, created_at }`. El panel consume `e.timestamp`, `e.usuario_id`, `e.usuario_nombre`. Resultado concreto: `new Date(undefined).getTime()` es `NaN`, así que toda comparación de fecha da false → "Acciones hoy" del Dashboard **siempre 0**; los filtros Hoy/Ayer/Última semana de Actividad **siempre vacíos**; el filtro por usuario **nunca matchea**; "Activos última hora" del Monitor **siempre "Sin actividad reciente"**; y los nombres se renderizan en blanco con `timeAgo()` devolviendo '-'. Hay un comentario obsoleto en database.js (~1596) que dice "No modificar AdminPanel.jsx" — quedó al revés, el adapter usó otros nombres que los que el panel lee.
7. **"Exportar backup JSON" exporta aire.** Lee claves de localStorage (`auth_users`, `crm_brands`, `crm_influencers`, ...) de la era de datos demo. Los datos reales están en Supabase. Descarga un JSON de nulls y da falsa sensación de backup.
8. **"Notificaciones" es localStorage por navegador.** `getAdminNotifs()`/`notifyNewUser()` escriben en `localStorage`, así que la notificación de "nuevo usuario registrado" se guarda en el navegador del que se registró, no en el del admin. El admin nunca ve nada real ahí.
9. `ROLE_PERMS` en database.js (~24) ya conoce los 4 roles de liderazgo con `ecosistemas:['influencers']`, así que aprobar un `city_lead` ya escribe ecosistemas correctos. No hay trampa acá — no tocar.

## FILES TO INSPECT
- `src/components/Admin/AdminPanel.jsx` — todo el archivo (~58KB). Especialmente `rowToUser`-consumers: `UsersSection` (~línea 298-530), `EditUserModal` (~88-238), `MatrizSection` (~499-569), `ActividadSection` (~572-639), `MonitorSection` (~642-693), `ConfigSection` (~696-757), `NotificacionesSection` (~760-797), `DashboardSection` (~241-295).
- `src/lib/database.js` — `ROLE_PERMS` (~24), `rowToUser` (~45-98), `dbGetUsers` (~178), `dbUpdateUser` (~190), `dbApproveUser` (~204, ya arreglada — usarla, no duplicarla), `dbGetGeography`/`dbCreateCity` (~1084-1105), `dbLogActivity`/`dbGetActivityLog` (~1599-1628).
- `src/lib/auth.js` — bloque de re-exports (~7-21).

---

# BLOQUE 1 — La verdad visible + reasignación de accesos (CRÍTICO, va primero)

### 1.1 `database.js` — exponer el `profiles.rol` crudo
En `rowToUser()`, agregar al objeto que retorna (junto a `rol: primaryRole`):
```js
    rolProfile:    profile.rol || null,   // rol crudo de profiles, para detectar desincronización con user_roles
```
No cambiar nada más de esa función. `rol` sigue siendo `primaryRole` (hay código que depende de eso).

### 1.2 `database.js` — función nueva para reasignar ecosistemas
Agregar después de `dbUpdateUser`:
```js
// Los ecosistemas REALES viven en user_roles.ecosistemas, no en profiles.
// Esto los reescribe en todas las filas activas del usuario.
export const dbSetUserEcosistemas = async (userId, ecosistemas) => {
  const { data: activas, error: qErr } = await supabase.from('user_roles')
    .select('id').eq('user_id', userId).is('revoked_at', null)
  if (qErr) throw qErr
  if (!activas || activas.length === 0) {
    throw new Error('Este usuario no tiene ningún rol activo. Asignale rol y ciudades primero con "Roles y ciudades".')
  }
  const { error } = await supabase.from('user_roles')
    .update({ ecosistemas })
    .eq('user_id', userId)
    .is('revoked_at', null)
  if (error) throw error
  return fetchUserById(userId)
}
```

### 1.3 `auth.js` — re-export
Agregar al bloque de re-exports: `dbSetUserEcosistemas as setUserEcosistemas,`

### 1.4 `AdminPanel.jsx` — mostrar los accesos reales en la fila de cada usuario
En `UsersSection`, dentro del `map` de usuarios, debajo del email y del "Último acceso", agregar una línea que describa los accesos reales leyendo `u.roles`. Necesita resolver nombres de ciudad/país/región desde el `geography` que la sección ya carga:
```js
  const geoName = (kind, id) => {
    if (!id) return null
    const list = kind === 'city' ? geography.cities : kind === 'country' ? geography.countries : geography.regions
    return list.find(x => x.id === id)?.name || null
  }

  // Devuelve un texto legible de los accesos REALES (user_roles), no de profiles.rol
  const accessLabel = (u) => {
    if (!u.roles || u.roles.length === 0) return null
    const byRole = {}
    for (const r of u.roles) {
      if (!byRole[r.role]) byRole[r.role] = []
      if (r.scope === 'global') byRole[r.role].push('todas')
      else {
        const n = geoName(r.scope, r.scopeId)
        byRole[r.role].push(n || `(${r.scope} sin asignar)`)
      }
    }
    return Object.entries(byRole)
      .map(([role, scopes]) => `${ROLE_LABEL[role] || role}: ${scopes.join(', ')}`)
      .join('  ·  ')
  }

  // Estados anómalos detectables desde los datos que ya tenemos
  const sinPermisosReales = (u) => u.estado === 'aprobado' && (!u.roles || u.roles.length === 0)
  const rolDesincronizado = (u) =>
    u.roles && u.roles.length > 0 && u.rolProfile && !u.roles.some(r => r.role === u.rolProfile)
```
Y en el JSX de la fila, debajo de "Último acceso":
```jsx
              {accessLabel(u) && (
                <div style={{ fontSize:10, color:'rgba(34,211,238,0.85)', marginTop:3 }}>🔑 {accessLabel(u)}</div>
              )}
              {sinPermisosReales(u) && (
                <div style={{ fontSize:10, color:'#F87171', fontWeight:700, marginTop:3 }}>
                  ⚠️ Aprobado pero sin permisos reales en la base — reasignale rol y ciudades
                </div>
              )}
              {rolDesincronizado(u) && (
                <div style={{ fontSize:10, color:'#FBBF24', fontWeight:700, marginTop:3 }}>
                  ⚠️ Rol desincronizado: profiles dice "{ROLE_LABEL[u.rolProfile] || u.rolProfile}", user_roles dice "{ROLE_LABEL[u.roles[0].role] || u.roles[0].role}"
                </div>
              )}
```

### 1.5 `AdminPanel.jsx` — botón "🔑 Roles y ciudades" para usuarios ya aprobados
El modal de scope que ya existe (el de aprobación, arreglado en c62885b) tiene que servir también para reasignar. Cambios:

a) Agregar un estado que distinga los dos usos:
```js
  const [approveMode, setApproveMode] = useState('approve') // 'approve' | 'reassign'
```

b) Botón nuevo en la fila, para todo usuario aprobado que no sea super_admin (al lado de "🚫 Bloquear"):
```jsx
              {u.estado === 'aprobado' && u.rol !== 'super_admin' && (
                <button onClick={() => {
                  setApproveMode('reassign')
                  setApproveModal(u)
                  setApproveRol(u.roles?.[0]?.role || u.rolProfile || 'scouter')
                  setApproveGeoIds((u.roles || []).filter(r => r.scope !== 'global' && r.scopeId).map(r => r.scopeId))
                  setApproveAllScope((u.roles || []).some(r => r.scope === 'global'))
                }} style={{ padding:'6px 12px', borderRadius:7, background:'rgba(34,211,238,0.12)', border:'1px solid rgba(34,211,238,0.3)', color:'#22D3EE', fontSize:11, fontWeight:700, cursor:'pointer' }}>🔑 Roles y ciudades</button>
              )}
```
Fijate que **precarga la selección actual** desde `u.roles` — el admin abre el modal y ve lo que la persona tiene hoy, no un formulario en blanco.

c) En el botón "✅ Aprobar" existente, agregar `setApproveMode('approve')` al onClick.

d) En `resetApproveForm()`, agregar `setApproveMode('approve')`.

e) En el modal, el título y el botón de confirmar según el modo:
```jsx
            <h4 style={{ fontSize:16, fontWeight:700, marginBottom:8, color:'#F9FAFB' }}>
              {approveMode === 'reassign' ? 'Roles y ciudades' : 'Aprobar usuario'}
            </h4>
            <p style={{ fontSize:13, color:'rgba(196,181,253,0.7)', marginBottom:16 }}>
              {approveMode === 'reassign' ? 'Reasignando accesos de ' : 'Aprobando a '}
              <strong style={{color:'#A78BFA'}}>{approveModal.nombre}</strong>
            </p>
```
y el botón de confirmar con label `{approveMode === 'reassign' ? 'Guardar accesos' : 'Aprobar'}`.

f) En modo `reassign`, avisar que se reemplazan los accesos (porque `dbApproveUser` revoca todo lo activo antes de insertar lo nuevo):
```jsx
            {approveMode === 'reassign' && (
              <div style={{ fontSize:11, color:'rgba(251,191,36,0.9)', background:'rgba(251,191,36,0.08)', border:'1px solid rgba(251,191,36,0.25)', borderRadius:8, padding:'8px 10px', marginBottom:14 }}>
                Esto reemplaza todos los accesos actuales de la persona por los que elijas acá. Los anteriores quedan revocados (no se borran, quedan con fecha de revocación).
              </div>
            )}
```

g) `handleApprove` sirve igual para los dos modos (`dbApproveUser` ya revoca + reinserta correctamente, y es idempotente para este uso). Sólo cambiar el texto del `logActivity`: `accion: approveMode === 'reassign' ? 'editar_usuario' : 'aprobar_usuario'`, y el detalle acorde.

### 1.6 `AdminPanel.jsx` — agregar "Pendiente" al estado en el modal Editar
En `EditUserModal`, el `<select>` de Estado sólo ofrece aprobado/bloqueado/suspendido. Agregar como primera opción:
```jsx
                    <option value="pendiente">Pendiente</option>
```
(Sin esto, devolver a alguien a pendiente requiere SQL a mano — ya pasó.)

### Tests del bloque 1
1. Abrir el panel: cada usuario aprobado tiene que mostrar su línea "🔑 ..." con rol y ciudades reales resueltas por nombre (no UUIDs).
2. Un usuario con `estado='aprobado'` y cero filas activas en `user_roles` tiene que mostrar el cartel rojo "sin permisos reales". Verificable creando el caso a mano en Supabase: `UPDATE user_roles SET revoked_at = now() WHERE user_id = '<un usuario de prueba>'`, refrescar, confirmar el cartel, y después revertir con "🔑 Roles y ciudades".
3. "🔑 Roles y ciudades" sobre un scouter con 1 ciudad tiene que abrir el modal **con esa ciudad ya tildada**.
4. Cambiarle las ciudades a 2, guardar, y verificar en Supabase: 1 fila vieja con `revoked_at` seteado + 2 filas nuevas `scope='city'` con `revoked_at IS NULL`. Y que la línea "🔑 ..." del panel ahora muestre las 2 ciudades.
5. Promover un scouter a `city_lead` con "todas las ciudades" → 1 sola fila `scope='global'`, y `ecosistemas=['influencers']`.

### Acceptance criteria del bloque 1
- Ningún usuario "aprobado" sin permisos reales puede pasar desapercibido en el panel.
- Se puede cambiar rol y ciudades de cualquier usuario aprobado sin tocar SQL.
- El modal de reasignación precarga el estado actual de la persona.
- `npm run build` limpio, commit y push.

---

# BLOQUE 2 — Que las secciones dejen de mentir

### 2.1 Arreglar el mismatch del log de actividad
`dbGetActivityLog()` devuelve `{ id, userId, userName, accion, detalle, seccion, created_at }`. Reemplazar en `AdminPanel.jsx` todos los consumos viejos por los nombres reales:
- `e.timestamp` → `e.created_at` (en `DashboardSection`, `ActividadSection`, `MonitorSection`)
- `e.usuario_id` → `e.userId`
- `e.usuario_nombre` → `e.userName`
- `l.timestamp`/`l.usuario_nombre`/`l.detalle` en el listado de logins del Dashboard → idem.
Y en `database.js`, borrar el comentario obsoleto de ~línea 1596 que dice "No modificar AdminPanel.jsx" (quedó al revés y confunde).
Verificar después: el contador "Acciones hoy" del Dashboard deja de ser 0, los filtros Hoy/Ayer/Última semana devuelven filas, el filtro por usuario matchea, y "Activos última hora" del Monitor muestra gente.

### 2.2 Hacer real la pestaña "Permisos" del modal Editar
- Los **ecosistemas** sí se pueden editar: al guardar, además de `updateUser(...)`, llamar a `setUserEcosistemas(user.id, form.ecosistemas)` cuando cambiaron respecto de `user.permisos.ecosistemas`. Atrapar el error y mostrarlo con `alert()` (el caso "no tiene rol activo" tiene que llegarle al admin, no morir en consola).
- Las **acciones** (crear/editar/borrar/exportar/analytics/equipo) NO se guardan en ningún lado: se derivan de `ROLE_PERMS[rol]` en `database.js`. Dejarlas visibles pero **read-only** (deshabilitadas, sin onChange), con una nota debajo: "Las acciones se derivan del rol. Para cambiarlas, cambiá el rol." No seguir mostrando checkboxes que no guardan nada.
- Los checkboxes de ecosistemas para super_admin/admin siguen forzados a tildado (ya es así) y no editables.

### 2.3 Arreglar "Matriz Permisos"
- El bug de la Promise: `toggleEco` tiene que ser `async` y hacer `await setUserEcosistemas(userId, newEcos)`, y después refrescar con `await getUsers()` → `setUsers(list); onRefresh(list)`. Nunca meter una Promise en el state.
- Que escriba los ecosistemas reales (misma función que 2.2).
- Manejar el error de "usuario sin rol activo" con un `alert()` claro en vez de romper.
- Agregar una columna al principio de la tabla que muestre los accesos reales (reusar `accessLabel`), así la matriz también dice la verdad.

### Tests del bloque 2
1. Tildar un ecosistema en el modal Editar de un usuario con rol activo → guardar → verificar en Supabase que `user_roles.ecosistemas` cambió en todas sus filas activas.
2. Intentar lo mismo sobre un usuario sin roles activos → tiene que salir el alert explicativo, sin romper el panel.
3. Clickear celdas en Matriz Permisos → no debe haber ningún TypeError en consola, y el cambio debe persistir tras refrescar.
4. Confirmar que las acciones quedaron read-only y con la nota.

---

# BLOQUE 3 — Un panel que trabaja para vos

### 3.1 Reemplazar "Notificaciones" (localStorage) por "Pendientes de acción" (datos reales)
Renombrar la sección a "⚠️ Pendientes" y derivarla enteramente de la lista de usuarios que el panel ya tiene (cero queries nuevas). Cuatro grupos, cada uno con su lista y un botón que lleva a la acción correspondiente:
- **Pendientes de aprobación** — `estado === 'pendiente'`. Acción: abre el modal de aprobar.
- **Aprobados sin permisos reales** — `sinPermisosReales(u)`. Acción: abre "Roles y ciudades". (Este grupo es el que hoy sólo se detecta corriendo SQL a mano.)
- **Rol desincronizado** — `rolDesincronizado(u)`. Acción: abre "Roles y ciudades".
- **Scouters sin ciudad asignada** — usuarios cuyo único rol activo es `scouter` con `scope !== 'global'` y `scopeId === null`. Acción: abre "Roles y ciudades".
El badge de la sección pasa a ser la suma de los 4 grupos. Borrar de `auth.js` el uso de `getAdminNotifs`/`markNotifRead`/`markAllNotifsRead`/`notifyNewUser` desde el panel (dejar las funciones en `auth.js` si algo más las importa, pero el panel no las usa más).

### 3.2 Export real en vez de backup falso
En `ConfigSection`, reemplazar `handleExport` (que lee localStorage muerto) por un export real y honesto de usuarios y accesos:
```js
  const handleExport = async () => {
    try {
      const users = await getUsers()
      const geo = await dbGetGeography(true)
      const payload = {
        exportado_en: new Date().toISOString(),
        exportado_por: currentUser?.email || null,
        nota: 'Export de usuarios y accesos. NO es un backup completo del sistema — los datos de negocio viven en Supabase.',
        usuarios: users.map(u => ({
          id:u.id, email:u.email, nombre:u.nombre, estado:u.estado,
          rol_efectivo:u.rol, rol_profiles:u.rolProfile,
          accesos:u.roles, ecosistemas:u.permisos?.ecosistemas || [],
          ultimo_acceso:u.ultimo_acceso,
        })),
        geografia: { regiones:geo.regions, paises:geo.countries, ciudades:geo.cities },
      }
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type:'application/json' })
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
      a.download = `resilio-usuarios-accesos-${new Date().toISOString().slice(0,10)}.json`
      a.click()
    } catch (e) { alert('No se pudo exportar: ' + (e?.message || 'error')) }
  }
```
Cambiar el label del botón a "📥 Exportar usuarios y accesos (JSON)" y agregar debajo, en texto chico, que el backup de los datos de negocio se hace del lado de Supabase, no desde acá.

### Tests del bloque 3
1. La sección Pendientes tiene que listar exactamente los mismos usuarios que devuelve esta consulta para el grupo "sin permisos reales":
```sql
SELECT p.email FROM profiles p
WHERE p.estado='aprobado'
  AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id=p.id AND ur.revoked_at IS NULL);
```
2. Cada botón de acción de cada grupo abre el modal correcto y con la precarga correcta.
3. El JSON exportado trae usuarios reales con sus `accesos` (no nulls).

---

## EDGE CASES (todos los bloques)
- Usuario con varias filas activas del mismo rol y distintas ciudades: es el caso NORMAL ahora (multi-ciudad). `accessLabel` tiene que agruparlas en una línea, no repetir el rol N veces.
- Usuario con `scope='global'` y además filas de ciudad: mostrar "todas" y no romper. `approveAllScope` precargado en true gana.
- `geography` todavía cargando cuando se renderiza la lista: `geoName` devuelve null → mostrar el `scope` crudo en vez de reventar.
- Un `scopeId` que apunta a una ciudad desactivada (`active=false`) no va a estar en `geography.cities`: mostrar `(ciudad no encontrada)` en vez de string vacío, así se ve que hay algo raro.
- super_admin: no ofrecer "🔑 Roles y ciudades" (ya está excluido por `u.rol !== 'super_admin'`), igual que no se lo puede bloquear.
- Si `dbApproveUser` falla en modo reassign, el usuario puede quedar con los roles viejos revocados y ninguno nuevo (la revocación va antes del insert). Envolver `handleApprove` en try/catch y si falla, mostrar un alert bien explícito: "Los accesos quedaron revocados y la reasignación falló. Volvé a intentar ahora mismo." Es la única forma de que el admin sepa que tiene que reintentar.

## ACCEPTANCE CRITERIA FINAL
- El panel nunca más muestra a alguien como aprobado y con rol si en la base no tiene permisos reales.
- Se pueden cambiar roles y ciudades (una, varias o todas) de cualquier usuario aprobado, desde la UI, sin SQL.
- Ninguna sección del panel muestra controles que no guardan nada, ni contadores que siempre dan cero.
- Ningún `setState` recibe una Promise.
- Ningún `active` escrito sobre `user_roles` ni `scouters`.
- `npm run build` limpio en cada bloque.

## DO NOT
- No tocar `upsert_scouter`, `app_visible_city_ids()`, `app_can_create()`, `ROLE_PERMS`, ni ninguna policy de RLS.
- No cambiar la semántica de `u.rol` en `rowToUser` (hay código fuera del panel que depende de que sea `primaryRole`).
- No cambiar `dbApproveUser`: ya está arreglada y sirve igual para aprobar y para reasignar.
- No ampliar la policy `geo_write` de `cities`/`countries` (hoy sólo `app_is_direction()`, o sea super_admin/network_direction — es deliberado).
- No agregar paginación ni cambiar el polling de 5s en este trabajo (queda para otra iteración si hace falta).
- No borrar las funciones de localStorage de `auth.js`, sólo dejar de usarlas desde el panel.

## CIERRE
Un commit por bloque:
```bash
npm run build && git add -A && git commit -m "feat(admin): accesos reales visibles + reasignacion de rol y ciudades" && git push origin main
npm run build && git add -A && git commit -m "fix(admin): log de actividad, pestana de permisos y matriz dejan de ser falsos" && git push origin main
npm run build && git add -A && git commit -m "feat(admin): seccion Pendientes con datos reales + export honesto de usuarios y accesos" && git push origin main
```
