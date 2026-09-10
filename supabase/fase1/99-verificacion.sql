-- ═══════════════════════════════════════════════════════════
-- NETWORK · FASE 1 · VERIFICACIÓN
-- Solo lectura. Correr después de los 5 pasos.
-- La Fase 1 no está cerrada hasta que los 5 bloques den lo esperado.
-- ═══════════════════════════════════════════════════════════


-- 1 ── ¿Se aplicaron las 5 migraciones?
--      ESPERADO: 5 filas, de 001 a 005.
SELECT version, descripcion, aplicada_at
FROM schema_migrations ORDER BY version;


-- 2 ── Inventario completo: tablas, RLS, políticas y filas.
--      ESPERADO: 24 tablas (23 de Network + users).
--      Todas con rls_on = true y politicas = 1.
SELECT
  t.table_name AS tabla,
  c.relrowsecurity AS rls_on,
  (SELECT count(*) FROM pg_policies p
    WHERE p.schemaname='public' AND p.tablename=t.table_name) AS politicas,
  (xpath('/row/cnt/text()',
     query_to_xml(format('SELECT count(*) AS cnt FROM public.%I', t.table_name),
                  false, true, '')))[1]::text::bigint AS filas
FROM information_schema.tables t
JOIN pg_class c ON c.relname = t.table_name
JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname='public'
WHERE t.table_schema='public' AND t.table_type='BASE TABLE'
ORDER BY t.table_name;


-- 3 ── DEUDA DE SEGURIDAD PENDIENTE — la lista que el PROMPT 08 debe vaciar.
--      ESPERADO ahora: todas las tablas listadas (RLS abierta a propósito,
--      porque todavía no hay JWT de usuario).
--      ESPERADO al cerrar la Fase 2: cero filas.
SELECT tablename AS tabla, policyname AS politica_abierta, cmd
FROM pg_policies
WHERE schemaname='public'
  AND (qual = 'true' OR qual IS NULL)
ORDER BY tablename;


-- 4 ── Geografía: ¿quedó el seed completo?
--      ESPERADO: 6 filas (Rosario, Santa Fe, Buenos Aires, Córdoba,
--                Punta del Este, Miami) con su moneda.
SELECT r.code AS region, co.code AS pais, co.currency, co.timezone, ci.name AS ciudad
FROM cities ci
JOIN countries co ON co.id = ci.country_id
JOIN regions   r  ON r.id  = co.region_id
ORDER BY r.code, co.code, ci.name;


-- 5 ── Integridad de los datos existentes.
--      ESPERADO: influencers_total y con_data IGUALES entre sí
--      (nada se perdió al agregar columnas), y sin_dueno = influencers_total
--      (no se inventaron dueños para los registros históricos).
SELECT
  (SELECT count(*) FROM crm_influencers)                                AS influencers_total,
  (SELECT count(*) FROM crm_influencers WHERE data IS NOT NULL)         AS con_data,
  (SELECT count(*) FROM crm_influencers WHERE owner_scouter_id IS NULL) AS sin_dueno,
  (SELECT count(*) FROM crm_brands)                                     AS marcas_total,
  (SELECT count(*) FROM users)                                          AS usuarios,
  (SELECT count(*) FROM users WHERE rol='scouter')                      AS scouters;
