-- ═══════════════════════════════════════════════════════════
-- 019 · tasks_view saltea RLS — arreglo
-- En Postgres 15 las vistas corren con los permisos de su dueño.
-- tasks_view es de `postgres`, así que expone TODAS las tareas del
-- sistema a cualquiera que la consulte, salteando el RLS de `tasks`.
-- Idempotente: se puede correr más de una vez.
-- ═══════════════════════════════════════════════════════════

ALTER VIEW tasks_view SET (security_invoker = true);

-- Toda vista nueva de este proyecto lleva security_invoker.
-- Verificación: las dos deben decir {security_invoker=true}
SELECT c.relname, c.reloptions
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'v';
