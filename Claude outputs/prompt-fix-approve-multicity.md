# PROMPT EXPERTO — Fix bug de autorización + multi-ciudad/todas-las-ciudades + alta de ciudades

## REGLAS GLOBALES
- No tocar RLS ni funciones SQL: ya están verificadas y son correctas (`app_visible_city_ids()` ya une varias filas activas de `user_roles` por usuario; `app_can_create()` ya incluye los roles de liderazgo). Este fix es 100% cliente (JS + UI), no requiere migraciones.
- No romper el flujo actual de scouters ya aprobados ni el fix ya aplicado en `upsert_scouter`.
- Idempotente: si algo ya está parcialmente aplicado, no duplicar código.
- Al final: `npm run build`, y si compila sin errores, `git add -A && git commit -m "fix: dbApproveUser (columna active inexistente) + soporte multi-ciudad/todas/alta de ciudades" && git push origin main`.

## CONTEXTO
El super admin autoriza usuarios desde `AdminPanel.jsx` → sección "Usuarios" → botón "✅ Aprobar" → modal "Aprobar usuario" → `handleApprove()` → llama a `approveUser` (alias de `dbApproveUser` en `database.js`).

Bug confirmado en `dbApproveUser` (database.js, función completa actual, ~línea 204):
```js
export const dbApproveUser = async (userId, rol = 'viewer', opts = {}) => {
  const { scope = 'global', scopeId = null, ecosistemas } = opts
  const ecos = ecosistemas || getRolePermsDb(rol).ecosistemas

  const { error: pErr } = await supabase.from('profiles')
    .update({ estado: 'aprobado', rol })
    .eq('id', userId)
  if (pErr) throw pErr

  await supabase.from('user_roles').update({ active: false }).eq('user_id', userId)
  const { error: rErr } = await supabase.from('user_roles').insert([{
    user_id: userId, role: rol, scope: scope, scope_id: scopeId, ecosistemas: ecos, active: true,
  }])
  if (rErr) throw rErr

  if (rol === 'scouter' && scopeId) {
    await supabase.from('scouters').upsert([{ user_id: userId, city_id: scopeId, active: true }], { onConflict: 'user_id' })
  }

  return fetchUserById(userId)
}
```
`user_roles` NO tiene columna `active` (la columna real es `revoked_at`, ya usada en RLS: `revoked_at IS NULL` = fila activa). `scouters` tampoco tiene `active` (la columna real es `status`). Confirmado en producción vía `pg_get_functiondef`.

Consecuencia real: el `UPDATE ... SET active=false` no hace nada (0 filas afectadas, no explota). El `INSERT ... active:true` en `user_roles` SÍ explota (PostgREST rechaza columna inexistente) y tira `rErr`, que se relanza — pero como `handleApprove()` no tiene try/catch, el error queda sin manejar en la consola del navegador. El `profiles.update({estado:'aprobado', rol})` anterior ya se confirmó. Resultado: el usuario queda con `estado='aprobado'` pero CERO filas activas en `user_roles` → sin ecosistemas → RLS bloquea todo. Mismo síntoma que el bug de scouters ya resuelto, pero originado en el paso de autorización.

Segundo problema (gap funcional, no bug): el modal solo permite elegir UNA ciudad (un `<select>`) y solo ofrece rol scouter para asignar ciudad. Los roles `network_direction`, `regional_lead`, `country_lead`, `city_lead` (ya soportados por la RLS) ni figuran en el dropdown de roles. No hay forma de asignar varias ciudades, un país/región completo, "todas las ciudades", ni de crear ciudades nuevas — no existe ninguna UI para eso.

## FILES TO INSPECT
- `src/lib/database.js` — función `dbApproveUser` (~línea 204-236), y la sección `GEOGRAPHY` (~línea 1064-1100, incluye `dbGetGeography` y `_geoCache`).
- `src/lib/auth.js` — bloque de re-exports desde `database.js` (~línea 7-21).
- `src/components/Admin/AdminPanel.jsx` — constantes `ROLES`/`ROLE_LABEL`/`ROLE_COLOR` (~línea 27-32), componente `UsersSection` completo (~línea 298-496), especialmente el bloque "Approve Modal" (~línea 434-461) y el estado que lo alimenta (~línea 298-311).

## QUÉ HACER

### 1) `src/lib/database.js` — reemplazar `dbApproveUser` completa por:
```js
export const dbApproveUser = async (userId, rol = 'viewer', opts = {}) => {
  const { scope = 'global', scopeId = null, scopeIds = null, ecosistemas } = opts
  const ecos = ecosistemas || getRolePermsDb(rol).ecosistemas

  // 1. Perfil: estado + rol
  const { error: pErr } = await supabase.from('profiles')
    .update({ estado: 'aprobado', rol })
    .eq('id', userId)
  if (pErr) throw pErr

  // 2. Revocar roles activos previos (columna real: revoked_at, no "active")
  const { error: revErr } = await supabase.from('user_roles')
    .update({ revoked_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('revoked_at', null)
  if (revErr) throw revErr

  // 3. Insertar la(s) fila(s) de rol nueva(s).
  //    scope='city'/'country'/'region' con varios ids => una fila por id
  //    (app_visible_city_ids() ya las une todas). scope='global' => una sola fila.
  const idsList = scope === 'global'
    ? [null]
    : (scopeIds && scopeIds.length ? scopeIds : [scopeId])
  const rows = idsList.map(id => ({
    user_id:     userId,
    role:        rol,
    scope:       scope,
    scope_id:    id,
    ecosistemas: ecos,
  }))
  const { error: rErr } = await supabase.from('user_roles').insert(rows)
  if (rErr) throw rErr

  // 4. Fila en scouters solo si el rol es scouter (columna real: status, no "active")
  if (rol === 'scouter') {
    const homeCityId = scopeId || (scopeIds && scopeIds[0]) || null
    if (homeCityId) {
      await supabase.from('scouters').upsert([{
        user_id: userId,
        city_id: homeCityId,
        status:  'active',
      }], { onConflict: 'user_id' })
    }
  }

  return fetchUserById(userId)
}
```

### 2) `src/lib/database.js` — agregar función nueva (después de `dbGetGeography`, cerca de línea 1082):
```js
export const dbCreateCity = async ({ name, countryId, slug = null, timezone = null }) => {
  const { data, error } = await supabase.from('cities')
    .insert([{ name, country_id: countryId, slug, timezone, active: true }])
    .select()
    .single()
  if (error) throw error
  _geoCache = null // fuerza a que el próximo dbGetGeography() la traiga de nuevo
  return data
}
```
Nota: el INSERT en `cities` está protegido por la policy `geo_write` (`USING/CHECK: app_is_direction()`), o sea que solo usuarios con rol `super_admin` o `network_direction` van a poder crear ciudades. Si el usuario que abre el Admin Panel tiene rol `admin` (no `super_admin`), el insert le va a fallar con error de RLS — avisar al usuario de este límite en vez de intentar resolverlo, porque ampliar esa policy es una decisión de seguridad que le corresponde a él.

### 3) `src/lib/auth.js` — agregar al bloque de re-exports (línea ~7-21):
```js
  dbCreateCity   as createCity,
```

### 4) `src/components/Admin/AdminPanel.jsx` — actualizar constantes (línea ~27-32):
```js
const ROLES = ['super_admin','admin','network_direction','regional_lead','country_lead','city_lead','scouter','editor','viewer','custom']
const ROLE_LABEL = {
  super_admin:'Super Admin', admin:'Admin',
  network_direction:'Dirección Network', regional_lead:'Líder Regional',
  country_lead:'Líder de País', city_lead:'Líder de Ciudad', scouter:'Scouter',
  editor:'Editor', viewer:'Viewer', custom:'Custom',
}
const ROLE_COLOR = {
  super_admin:'#F59E0B', admin:'#8B5CF6',
  network_direction:'#E879F9', regional_lead:'#F472B6', country_lead:'#FB923C', city_lead:'#22D3EE',
  scouter:'#06B6D4', editor:'#3B82F6', viewer:'#6B7280', custom:'#EC4899',
}
// Qué tipo de geografía necesita cada rol para su scope
const ROLE_GEO_KIND = { scouter:'city', city_lead:'city', country_lead:'country', regional_lead:'region' }
const GEO_KIND_LABEL = { city:'ciudades', country:'países', region:'regiones' }
```

### 5) `src/components/Admin/AdminPanel.jsx` — en `UsersSection`, reemplazar el estado de aprobación (línea ~308-311):
```js
  const [approveModal,     setApproveModal]     = useState(null)
  const [approveRol,       setApproveRol]       = useState('viewer')
  const [approveGeoIds,    setApproveGeoIds]    = useState([])   // ids seleccionados (ciudad/país/región según el rol)
  const [approveAllScope,  setApproveAllScope]  = useState(false) // "todas las X"
  const [newCityName,      setNewCityName]      = useState('')
  const [newCityCountry,   setNewCityCountry]   = useState('')
  const [creatingCity,     setCreatingCity]     = useState(false)
  const [geography,        setGeography]        = useState({ regions:[], countries:[], cities:[] })
```
(mantener el resto de los `useState` existentes de `UsersSection` tal cual están; esto solo reemplaza `approveScopeId` por `approveGeoIds`/`approveAllScope`/los 3 de alta de ciudad).

Reemplazar el `useEffect` de geografía (línea ~321-323) por uno que la recargue también tras crear una ciudad:
```js
  const loadGeography = () => dbGetGeography(true).then(setGeography).catch(() => {})
  useEffect(() => { loadGeography() }, [])
```
(importar `dbGetGeography` y `dbCreateCity` desde `../../lib/database.js` al inicio del archivo, junto a los demás imports de `auth.js` — o agregar el import combinado: `import { dbGetGeography, dbCreateCity } from '../../lib/database.js'`).

Reemplazar `handleApprove` (línea ~333-341) por:
```js
  const resetApproveForm = () => {
    setApproveModal(null); setApproveRol('viewer')
    setApproveGeoIds([]); setApproveAllScope(false)
    setNewCityName(''); setNewCityCountry('')
  }

  const handleApprove = async () => {
    const geoKind = ROLE_GEO_KIND[approveRol]
    let scope = 'global', scopeIds = null
    if (geoKind && !approveAllScope) {
      scope = geoKind
      scopeIds = approveGeoIds.length ? approveGeoIds : null
    }
    await approveUser(approveModal.id, approveRol, { scope, scopeIds })
    logActivity({ userId:currentUser?.id||'admin', userName:currentUser?.nombre||'Admin', accion:'aprobar_usuario', detalle:`Aprobó a ${approveModal.nombre} con rol ${approveRol}${scope!=='global'?` (${scope}: ${scopeIds?.length||0})`:' (todas)'}`, seccion:'admin' })
    resetApproveForm()
    refresh()
  }

  const toggleGeoId = (id) => {
    setApproveGeoIds(p => p.includes(id) ? p.filter(x=>x!==id) : [...p, id])
  }

  const handleCreateCity = async () => {
    if (!newCityName.trim() || !newCityCountry) return
    setCreatingCity(true)
    try {
      const city = await dbCreateCity({ name: newCityName.trim(), countryId: newCityCountry })
      await loadGeography()
      toggleGeoId(city.id) // la deja pre-seleccionada
      setNewCityName(''); setNewCityCountry('')
    } catch (e) {
      alert('No se pudo crear la ciudad: ' + (e?.message || 'error desconocido'))
    } finally {
      setCreatingCity(false)
    }
  }
```

Reemplazar el bloque "Approve Modal" completo (línea ~435-461) por:
```jsx
      {approveModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', backdropFilter:'blur(8px)', zIndex:4000, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }} onClick={resetApproveForm}>
          <div style={{ background:'rgba(18,10,40,0.97)', border:'1px solid rgba(139,92,246,0.4)', borderRadius:16, padding:28, width:'100%', maxWidth:440, maxHeight:'85vh', overflowY:'auto' }} onClick={e=>e.stopPropagation()}>
            <h4 style={{ fontSize:16, fontWeight:700, marginBottom:8, color:'#F9FAFB' }}>Aprobar usuario</h4>
            <p style={{ fontSize:13, color:'rgba(196,181,253,0.7)', marginBottom:16 }}>Aprobando a <strong style={{color:'#A78BFA'}}>{approveModal.nombre}</strong></p>

            <label style={{ fontSize:12, color:'rgba(196,181,253,0.7)', display:'block', marginBottom:6 }}>Asignar rol inicial</label>
            <select style={{...inpStyle, width:'100%', marginBottom:14, cursor:'pointer'}}
              value={approveRol} onChange={e=>{ setApproveRol(e.target.value); setApproveGeoIds([]); setApproveAllScope(false) }}>
              {ROLES.filter(r=>r!=='super_admin').map(r=><option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
            </select>

            {ROLE_GEO_KIND[approveRol] && (
              <div style={{ marginBottom:14 }}>
                <Checkbox checked={approveAllScope} onChange={setApproveAllScope}
                  label={`Todas las ${GEO_KIND_LABEL[ROLE_GEO_KIND[approveRol]]}`}/>

                {!approveAllScope && (
                  <>
                    <div style={{ maxHeight:170, overflowY:'auto', marginTop:10, padding:'8px 10px', background:'rgba(139,92,246,0.06)', border:'1px solid rgba(139,92,246,0.2)', borderRadius:8, display:'flex', flexDirection:'column', gap:6 }}>
                      {ROLE_GEO_KIND[approveRol]==='city' && geography.cities.map(c => (
                        <Checkbox key={c.id} checked={approveGeoIds.includes(c.id)} onChange={() => toggleGeoId(c.id)} label={c.name}/>
                      ))}
                      {ROLE_GEO_KIND[approveRol]==='country' && geography.countries.map(c => (
                        <Checkbox key={c.id} checked={approveGeoIds.includes(c.id)} onChange={() => toggleGeoId(c.id)} label={c.name}/>
                      ))}
                      {ROLE_GEO_KIND[approveRol]==='region' && geography.regions.map(r => (
                        <Checkbox key={r.id} checked={approveGeoIds.includes(r.id)} onChange={() => toggleGeoId(r.id)} label={r.name}/>
                      ))}
                    </div>

                    {ROLE_GEO_KIND[approveRol]==='city' && (
                      <div style={{ marginTop:10, padding:'10px', background:'rgba(6,182,212,0.06)', border:'1px dashed rgba(6,182,212,0.3)', borderRadius:8 }}>
                        <div style={{ fontSize:11, color:'#67E8F9', fontWeight:600, marginBottom:8 }}>+ Nueva ciudad</div>
                        <input value={newCityName} onChange={e=>setNewCityName(e.target.value)} placeholder="Nombre de la ciudad"
                          style={{...inpStyle, width:'100%', marginBottom:6, boxSizing:'border-box'}}/>
                        <select value={newCityCountry} onChange={e=>setNewCityCountry(e.target.value)}
                          style={{...inpStyle, width:'100%', marginBottom:8, cursor:'pointer'}}>
                          <option value="">Elegir país...</option>
                          {geography.countries.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <button onClick={handleCreateCity} disabled={creatingCity || !newCityName.trim() || !newCityCountry}
                          style={{ padding:'7px 14px', borderRadius:7, background:'rgba(6,182,212,0.15)', border:'1px solid rgba(6,182,212,0.35)', color:'#22D3EE', fontSize:12, fontWeight:700, cursor: creatingCity?'wait':'pointer', opacity: (!newCityName.trim()||!newCityCountry)?0.5:1 }}>
                          {creatingCity ? 'Creando...' : '➕ Crear y seleccionar'}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:8 }}>
              <button onClick={resetApproveForm} style={{...inpStyle, cursor:'pointer'}}>Cancelar</button>
              <button onClick={handleApprove} style={{ padding:'9px 20px', borderRadius:8, background:'linear-gradient(135deg,#10B981,#059669)', border:'none', color:'white', fontWeight:700, cursor:'pointer' }}>Aprobar</button>
            </div>
          </div>
        </div>
      )}
```

Al abrir el modal desde la lista (línea ~417, botón "✅ Aprobar"), cambiar:
```js
onClick={() => { setApproveModal(u); setApproveRol('viewer') }}
```
por:
```js
onClick={() => { setApproveModal(u); setApproveRol('viewer'); setApproveGeoIds([]); setApproveAllScope(false) }}
```

## EDGE CASES
- Rol sin `ROLE_GEO_KIND` (admin, editor, viewer, custom, network_direction) → no muestra picker, `scope` queda `'global'` automáticamente (mismo comportamiento legacy de hoy para esos roles).
- Ningún checkbox tildado y "Todas" sin marcar → `scopeIds=null` → se comporta igual que hoy cuando no se elegía ciudad ("Sin ciudad específica"), no rompe el caso actual.
- Crear ciudad sin ser `super_admin`/`network_direction` → `dbCreateCity` va a tirar error de RLS; ya está atrapado con `alert()` en `handleCreateCity`, no rompe el modal.
- Usuario ya aprobado antes con el bug (perfil en `aprobado` sin fila en `user_roles`) → re-abrir "Aprobar usuario" y volver a aprobarlo con este flujo ya corregido soluciona su caso individual (la función ahora sí revoca lo viejo e inserta bien lo nuevo).

## TESTS
1. Aprobar un usuario nuevo como `city_lead` marcando 2 ciudades → verificar en Supabase que quedaron 2 filas en `user_roles` (`scope='city'`, `revoked_at IS NULL`) con `scope_id` distinto cada una, y que ese usuario ve ambas ciudades en el Command Center / Scouters.
2. Aprobar un usuario como `regional_lead` marcando "Todas las regiones" → verificar 1 sola fila con `scope='global'`.
3. Crear una ciudad nueva desde el modal, confirmar que aparece inmediatamente en la lista de checkboxes y en `dbGetGeography()` sin recargar la página.
4. Re-aprobar a un usuario que ya tenía rol asignado → confirmar que la fila vieja quedó con `revoked_at` seteado (no simplemente duplicada sin revocar).
5. Confirmar que el flujo de scouter con una sola ciudad (caso más común) sigue funcionando igual que antes.

## ACCEPTANCE CRITERIA
- Ningún `active` remanente en updates/inserts a `user_roles` o `scouters` en `dbApproveUser`.
- El modal permite elegir varias ciudades, un país/región completo, o "todas", según el rol.
- Se puede crear una ciudad nueva sin salir del modal y queda disponible al instante.
- `npm run build` sin errores, push a `main` hecho.

## DO NOT
- No tocar `upsert_scouter`, `app_visible_city_ids()`, `app_can_create()` ni ninguna policy de RLS: ya están verificadas y correctas.
- No ampliar la policy `geo_write` para incluir `admin` sin que el usuario lo pida explícitamente — es una decisión de seguridad suya.
- No eliminar el `useEffect` de polling de `refreshUsers` cada 5s en `AdminPanel`.

Al terminar: `npm run build && git add -A && git commit -m "fix: dbApproveUser (columna active inexistente) + soporte multi-ciudad/todas/alta de ciudades" && git push origin main`
