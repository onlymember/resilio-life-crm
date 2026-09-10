-- ═══════════════════════════════════════════════════════════
-- NETWORK · DIAGNÓSTICO — solo lectura, no modifica nada
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- Correr los 4 bloques y pasarme los resultados.
-- ═══════════════════════════════════════════════════════════

-- 1 ── ¿Qué tablas existen realmente?
SELECT
  t.tablename,
  t.rowsecurity  AS rls_habilitado,
  (SELECT count(*) FROM pg_policies p
     WHERE p.schemaname='public' AND p.tablename=t.tablename) AS politicas
FROM pg_tables t
WHERE t.schemaname = 'public'
ORDER BY t.tablename;


-- 2 ── ¿Qué políticas hay, y son abiertas?
SELECT tablename, policyname, cmd, qual AS using_expr, with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;


-- 3 ── ¿Cuántos usuarios reales hay, y con qué roles?
SELECT rol, estado, count(*) AS cantidad
FROM users
GROUP BY rol, estado
ORDER BY rol, estado;


-- 4 ── ¿La app está guardando datos en Supabase, o son todos demo?
--     Devuelve 0 filas si la tabla no existe (eso también es una respuesta).
SELECT 'crm_influencers' AS tabla, count(*) AS filas FROM crm_influencers
UNION ALL SELECT 'crm_brands',     count(*) FROM crm_brands
UNION ALL SELECT 'crm_locations',  count(*) FROM crm_locations
UNION ALL SELECT 'activity_log',   count(*) FROM activity_log;
-- Si el bloque 4 falla con «relation does not exist», la tabla que nombra
-- el error NO está creada, y todo lo que la app muestra de esa entidad
-- es demo data del frontend. Anotá cuál falló y seguí sin ese bloque.
