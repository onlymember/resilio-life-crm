-- Diagnóstico de seguridad (SOLO LECTURA). Correr en el SQL Editor y exportar el resultado a CSV.

WITH
pol AS (
  SELECT '1 policy' AS chk,
         tablename || '.' || policyname || ' [' || cmd || '] ' || array_to_string(roles, ',') AS obj,
         'using: ' || coalesce(qual, '-') || ' | check: ' || coalesce(with_check, '-') AS detail
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename IN ('user_roles','profiles','scouters','influencers','brands','opportunities',
                      'collaborations','tasks','notes','personal_notes','cities','countries','regions',
                      'offers','offer_interests','activities','notifications','goals','campaigns',
                      'missions','mission_progress','reward_points','teams','audit_log','users',
                      'crm_influencers','crm_brands','crm_locations','activity_log')
),
norls AS (
  SELECT '2 tabla sin RLS' AS chk, c.relname AS obj,
         'anon select=' || has_table_privilege('anon', c.oid, 'SELECT') ||
         ' authenticated insert=' || has_table_privilege('authenticated', c.oid, 'INSERT') AS detail
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind IN ('r','p') AND NOT c.relrowsecurity
),
fn AS (
  SELECT '3 definer publica' AS chk, p.oid::regprocedure::text AS obj,
         'anon=' || has_function_privilege('anon', p.oid, 'EXECUTE') ||
         ' authenticated=' || has_function_privilege('authenticated', p.oid, 'EXECUTE') AS detail
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.prosecdef AND p.prorettype <> 'trigger'::regtype
    AND has_function_privilege('anon', p.oid, 'EXECUTE')
),
vw AS (
  SELECT '4 vista sin invoker' AS chk, c.relname AS obj,
         'authenticated select=' || has_table_privilege('authenticated', c.oid, 'SELECT') ||
         ' anon select=' || has_table_privilege('anon', c.oid, 'SELECT') AS detail
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind IN ('v','m')
    AND coalesce(array_to_string(c.reloptions, ','), '') NOT LIKE '%security_invoker=true%'
),
priv AS (
  SELECT '5 permisos tabla' AS chk, t AS obj,
         'authenticated insert=' || has_table_privilege('authenticated', ('public.' || t)::regclass, 'INSERT') ||
         ' update=' || has_table_privilege('authenticated', ('public.' || t)::regclass, 'UPDATE') ||
         ' anon select=' || has_table_privilege('anon', ('public.' || t)::regclass, 'SELECT') AS detail
  FROM unnest(ARRAY['user_roles','profiles','scouters']) t
  WHERE to_regclass('public.' || t) IS NOT NULL
),
trg AS (
  SELECT '6 trigger' AS chk, tgrelid::regclass::text || '.' || tgname AS obj, pg_get_triggerdef(oid) AS detail
  FROM pg_trigger
  WHERE NOT tgisinternal AND tgrelid::regclass::text IN ('profiles','user_roles','scouters')
),
legacy AS (
  SELECT '7 legado' AS chk, x AS obj, 'existe=' || (to_regclass('public.' || x) IS NOT NULL) AS detail
  FROM unnest(ARRAY['users','crm_influencers','crm_brands','crm_locations','activity_log','v_sin_dueno']) x
),
acc AS (
  SELECT '8 acceso raro' AS chk, p.email AS obj,
         'estado=' || coalesce(p.estado, '?') || ' rol=' || r.role || ' scope=' || r.scope AS detail
  FROM profiles p JOIN user_roles r ON r.user_id = p.id AND r.revoked_at IS NULL
  WHERE coalesce(p.estado, '') <> 'aprobado'
     OR (r.scope = 'global' AND r.role NOT IN ('super_admin','network_direction'))
)
SELECT * FROM pol UNION ALL SELECT * FROM norls UNION ALL SELECT * FROM fn UNION ALL SELECT * FROM vw
UNION ALL SELECT * FROM priv UNION ALL SELECT * FROM trg UNION ALL SELECT * FROM legacy UNION ALL SELECT * FROM acc
ORDER BY 1, 2;
