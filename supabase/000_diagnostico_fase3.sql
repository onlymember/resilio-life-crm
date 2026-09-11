-- ═══════════════════════════════════════════════════════════
-- DIAGNÓSTICO · Fase 3 — correr ANTES de tocar nada
--
-- Esto es de solo lectura. Se corre en el SQL Editor de Supabase
-- (con tu usuario admin/dashboard, que ve todo sin RLS) para saber
-- si "las oportunidades no aparecen" es un problema de datos, de
-- RLS, o simplemente el bug de refresh del cliente que ya identificamos.
--
-- Pegá el resultado de cada bloque en el chat de Claude Code antes
-- de que arranque a escribir código — así no arregla algo que no
-- está roto, o al revés.
-- ═══════════════════════════════════════════════════════════

-- 1. ¿Hay oportunidades cargadas en la base?
SELECT count(*) AS total, status, owner_scouter_id
FROM opportunities
GROUP BY status, owner_scouter_id
ORDER BY 1 DESC;

-- 2. ¿Hay colaboraciones cargadas?
SELECT count(*) AS total, status
FROM collaborations
GROUP BY status;

-- 3. RLS habilitado y con políticas reales (no debería haber
--    ninguna fila con politicas = 0, y ninguna USING(true) sin
--    justificación en el comentario de la política).
SELECT
  c.relname AS tabla,
  c.relrowsecurity AS rls_on,
  count(p.polname) AS politicas
FROM pg_class c
LEFT JOIN pg_policy p ON p.polrelid = c.oid
WHERE c.relname IN ('opportunities','collaborations','campaigns','campaign_influencers','brands','influencers')
GROUP BY c.relname, c.relrowsecurity
ORDER BY 1;

-- 4. El detalle de las políticas de opportunities/collaborations
SELECT tablename, policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE tablename IN ('opportunities','collaborations')
ORDER BY tablename, cmd;

-- 5. anon no debería tener privilegios de escritura sobre estas tablas
SELECT table_name, grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name IN ('opportunities','collaborations')
  AND grantee IN ('anon','authenticated')
ORDER BY table_name, grantee, privilege_type;

-- ═══════════════════════════════════════════════════════════
-- CÓMO LEER EL RESULTADO
--
-- Si el bloque 1 muestra oportunidades reales y el bloque 3/4
-- muestra políticas de SELECT normales (no USING(true), no cero
-- políticas) → el problema es 100% el bug de refresh del cliente
-- (ver PROMPT 3A, sección BUG-2). No hace falta tocar RLS.
--
-- Si el bloque 3 muestra "politicas = 0" para opportunities o
-- collaborations con rls_on = true → esa tabla devuelve CERO filas
-- a cualquier usuario autenticado, sin importar el dueño. Ahí sí
-- hace falta agregar políticas (plantilla al final de 027).
-- ═══════════════════════════════════════════════════════════
