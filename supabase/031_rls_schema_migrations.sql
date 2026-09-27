-- ═══════════════════════════════════════════════════════════
-- 031 · RLS en schema_migrations
--
-- QUE PASABA
--   La tabla se creo en el 027 con CREATE TABLE IF NOT EXISTS y nunca
--   se le habilito RLS. Con RLS apagado, PostgREST la expone a
--   cualquiera con la clave anonima, y Supabase otorga permisos de
--   escritura por defecto a `authenticated` sobre las tablas de public:
--   la tabla se podia leer Y vaciar desde afuera.
--
--   No guarda nada sensible (versiones, descripciones, fechas), pero
--   revela como evoluciono el esquema y se podia borrar.
--
-- POR QUE ESTO NO ROMPE LAS MIGRACIONES
--   El SQL Editor de Supabase ejecuta como `postgres`, que ignora RLS.
--   Los INSERT de registro al final de cada migracion siguen andando.
--   Lo unico que cambia es que la tabla deja de estar expuesta por la
--   API publica.
--
-- SEGURIDAD: no toca datos ni columnas.
-- ═══════════════════════════════════════════════════════════

ALTER TABLE schema_migrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sm_read ON schema_migrations;
CREATE POLICY sm_read ON schema_migrations
FOR SELECT TO authenticated
USING (app_is_direction());


-- ── Verificacion ────────────────────────────────────────────
-- Ninguna tabla de public puede quedar con RLS apagado.
-- Cero filas es lo correcto.
SELECT c.relname AS tabla_sin_rls
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND NOT c.relrowsecurity
ORDER BY 1;
