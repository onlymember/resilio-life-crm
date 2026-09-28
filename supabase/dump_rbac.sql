-- ═══════════════════════════════════════════════════════════
-- Volcado del modelo de permisos
--
-- SOLO LECTURA. No modifica nada.
--
-- POR QUE EXISTE
--   Varias piezas del RBAC se crearon a mano en el dashboard de
--   Supabase y nunca quedaron en un archivo del repo: el enum de
--   roles, la tabla user_roles y las funciones app_is_direction(),
--   app_visible_city_ids() y app_has_broad_read(). Hoy la unica
--   fuente de verdad es la base.
--
--   Esto las vuelca para poder completar docs/network/RBAC.md y el
--   archivo 026_command_center.sql con lo que REALMENTE esta
--   aplicado, en vez de con lo que suponemos.
--
-- COMO USARLO
--   Correr cada bloque por separado con "Run without RLS" y pegar
--   el resultado. Son cinco bloques.
-- ═══════════════════════════════════════════════════════════


-- ── 1 · Enums de roles y de alcance ─────────────────────────
SELECT t.typname AS enum, string_agg(e.enumlabel, ' | ' ORDER BY e.enumsortorder) AS valores
FROM pg_type t
JOIN pg_enum e ON e.enumtypid = t.oid
JOIN pg_namespace n ON n.oid = t.typnamespace
WHERE n.nspname = 'public'
GROUP BY t.typname
ORDER BY t.typname;


-- ── 2 · Quien tiene que rol, y sobre que alcance ────────────
-- Sin datos personales mas alla del email, que ya esta en profiles.
SELECT ur.role, ur.scope, ur.scope_id, p.email,
       coalesce(c.name, co.name, r.name, 'global') AS alcance
FROM user_roles ur
JOIN profiles p ON p.id = ur.user_id
LEFT JOIN cities    c  ON c.id  = ur.scope_id
LEFT JOIN countries co ON co.id = ur.scope_id
LEFT JOIN regions   r  ON r.id  = ur.scope_id
ORDER BY ur.role, alcance;


-- ── 3 · Cuerpo de las funciones de permisos ─────────────────
-- Son las que deciden todo. Sin esto no se puede auditar nada.
SELECT p.proname,
       CASE WHEN p.prosecdef THEN 'DEFINER' ELSE 'INVOKER' END AS seguridad,
       pg_get_functiondef(p.oid) AS definicion
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('app_is_direction', 'app_visible_city_ids', 'app_has_broad_read',
                    'app_my_scope_ids', 'app_can_see_entity', 'app_can_see_campaign',
                    'app_influencer_in_my_campaign', 'app_campaign_has_my_influencer',
                    'my_scouter_level')
ORDER BY p.proname;


-- ── 4 · Las dos funciones que faltan en 026 ─────────────────
SELECT p.proname, pg_get_functiondef(p.oid) AS definicion
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('assign_entities_bulk', 'unassigned_summary')
ORDER BY p.proname;


-- ── 5 · Todas las policies vigentes ─────────────────────────
-- `abierta` en true marca una policy que no filtra nada.
SELECT tablename, policyname, cmd,
       coalesce(qual, '(sin USING)')        AS usando,
       coalesce(with_check, '(sin CHECK)')  AS chequeando,
       (qual IN ('true', '(true)'))         AS abierta
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY (qual IN ('true', '(true)')) DESC, tablename, policyname;
