# Reporte de Migración a Supabase

## Diagnóstico

El `schema.sql` ya contiene las columnas correctas. El problema es que la tabla
`users` fue creada en Supabase con una versión **anterior** del schema (sin las
3 columnas nuevas). `CREATE TABLE IF NOT EXISTS` no agrega columnas a una tabla
existente, por lo que se necesita `ALTER TABLE`.

## Columnas faltantes en el DB

### Tabla: users

| Columna | Tipo | Default | Estado |
|---|---|---|---|
| `avatar_color` | TEXT | `'#8B5CF6'` | ❌ Falta en DB |
| `permiso_analytics` | BOOLEAN | `FALSE` | ❌ Falta en DB |
| `permiso_equipo` | BOOLEAN | `FALSE` | ❌ Falta en DB |

### Otras tablas

| Tabla | Estado |
|---|---|
| `activity_log` | ✅ Sin cambios necesarios |
| `crm_brands` | ✅ JSONB flexible, sin cambios |
| `crm_locations` | ✅ JSONB flexible, sin cambios |
| `crm_influencers` | ✅ JSONB flexible, sin cambios |

## SQL generado

Ver archivo: `supabase/add-missing-columns.sql`

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_color       TEXT     DEFAULT '#8B5CF6';
ALTER TABLE users ADD COLUMN IF NOT EXISTS permiso_analytics  BOOLEAN  DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS permiso_equipo     BOOLEAN  DEFAULT FALSE;
```

## Funciones de database.js

`database.js` **no requiere cambios**. El código ya estaba correcto y alineado
con el `schema.sql`. Solo era necesario migrar el DB existente.

| Función | Estado |
|---|---|
| `dbRegister()` | ✅ Correcto — usa las 3 columnas que ahora se agregan |
| `dbLogin()` | ✅ Sin cambios |
| `dbGetUsers()` | ✅ Sin cambios |
| `dbUpdateUser()` | ✅ Correcto — `permissionsToDbCols()` ya maneja `permiso_analytics` y `permiso_equipo` |
| `dbApproveUser()` | ✅ Sin cambios |
| `dbBlockUser()` | ✅ Sin cambios |
| `dbDeleteUser()` | ✅ Sin cambios |

## Próximos pasos

1. Ir a **Supabase Dashboard → SQL Editor**
2. Pegar y ejecutar el contenido de `supabase/add-missing-columns.sql`
3. Verificar que el SELECT final muestre las 3 columnas nuevas
4. Probar el registro de usuario — los errores deben desaparecer
