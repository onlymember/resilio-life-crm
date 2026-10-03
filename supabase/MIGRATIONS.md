# Migraciones de la base (Supabase)

Las migraciones se corren **a mano en el SQL Editor**, en orden, una sola vez.
Cada archivo trae al final una consulta de verificación que tiene que dar `ok = true`.

## Estado (al 02/10/2026)

| Archivo | Qué hace | Estado |
|---|---|---|
| 000 – 046 | Base histórica (CRM, Network, RBAC, agenda, cadencia, dirección) | Aplicadas |
| 047 | Resilio Club (red de influencers) | Aplicada |
| 048 | Club: cambio de email | Aplicada |
| 049 | Fase 2 Network (checklist, WhatsApp internacional, duplicados v2, embudo) | Aplicada |
| 050 | Fase 3 Network (confirmación por link, fusionar fichas) | Aplicada |
| 051 | Interruptor del Club para scouters (`app_settings`) | Aplicada |
| 052 | Scouters ven solo lo suyo (marcas de su ciudad en lectura) | Aplicada |
| 053 | Inicio nuevo (etapa desde cuándo, progreso diario) | Aplicada |
| 054 | Arreglo de la confirmación por link | Aplicada |
| 055 | Seguridad (perfiles, alcance, funciones internas, altas solo del equipo) | Aplicada |
| 056 | Cierre: resumen semanal en la base, link de confirmación sin datos viejos | Aplicada |
| 057 | Rendimiento: RLS evaluada una vez por consulta, índices de uso diario, search_path fijo | Aplicada |
| 058 | Arregla altas y cambios de estado (trigger del timeline con tipo de id incorrecto desde la 054) | Aplicada |
| 059 | Propuestas para marcas (partners.resilio.company): link privado, plan elegido y respuestas | Aplicada |
| 060 | Scouters ven solo sus marcas e influencers (cargadas, asignadas o en sus colaboraciones) | Aplicada |
| 061 | Instagram unificado: completa el campo Instagram con el usuario de la carga | **Pendiente** |

Archivos de solo lectura (no cambian nada): `chequeo_final.sql`, `diag_seguridad.sql`, `diag_esquema.sql`,
`dump_rbac.sql`, `dump_deriva.sql`, `00-diagnostico.sql`, `000_diagnostico_fase3.sql`.

## Reglas para lo que venga

1. Número siguiente, sin repetir (`062_...`). Nada fuera de esta carpeta.
2. Todo dentro de `BEGIN; ... COMMIT;` y con verificación al final.
3. Nunca suponer nombres de tipos o columnas que no estén en un archivo: si no está,
   se consulta primero en la base (así nacieron los errores de la 050 y la 054:
   un tipo de enum supuesto y un `::text` sobre una columna que es UUID).
   Antes de reescribir una función existente, partir de `pg_get_functiondef`
   de la base, no de un archivo viejo del repo.
4. Funciones `SECURITY DEFINER`: siempre `SET search_path` y siempre
   `REVOKE ALL ... FROM PUBLIC, anon` + `GRANT` explícito a quien la usa.
5. Políticas nuevas para tablas del CRM: incluir `app_is_team_member()` en
   lecturas y altas, porque los usuarios del Club también son `authenticated`.

## Foto completa de la base

Varias tablas, tipos y políticas se crearon a mano en el panel de Supabase y no
tienen archivo. `diag_esquema.sql` saca una foto completa (tipos, tablas,
restricciones, índices, funciones, vistas, triggers, RLS, políticas y permisos).
Correrla, exportar a CSV y guardar el resultado como `schema/baseline_AAAA-MM-DD.sql`.
A partir de esa foto, la base se puede reconstruir y comparar contra el repo.
