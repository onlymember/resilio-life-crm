-- ═══════════════════════════════════════════════════════════
-- Volcado de la deriva base ↔ repo
--
-- SOLO LECTURA. No modifica nada.
--
-- POR QUE EXISTE
--   Varias piezas se crearon a mano en el dashboard de Supabase o se
--   corrieron pegandolas en el chat, y nunca quedaron en un archivo.
--   Si hoy se recreara la base desde supabase/, faltaria el modelo de
--   permisos entero.
--
--   Esto NO es el inventario de esa deriva: es el generador. Cada
--   bloque devuelve UNA celda de texto que ya es el contenido del
--   archivo que falta. Se copia y se pega, no se transcribe.
--
-- COMO USARLO
--   Correr un bloque por vez. Si la celda se ve cortada en pantalla,
--   usar "Download CSV" del editor: el texto completo esta ahi.
-- ═══════════════════════════════════════════════════════════


-- ── 1 · Lo que falta del 035 ────────────────────────────────
-- Devuelve system_health() tal como esta viva hoy.
SELECT pg_get_functiondef(p.oid) || E';\n' AS para_pegar_en_035
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = 'system_health';


-- ── 2 · La 025, reconstruida desde las policies vigentes ────
-- Genera el DROP + CREATE de cada policy de las dos tablas que la 025
-- cerro. task_templates queda cubierta por la 038, asi que lo que
-- importa de verdad aca es missions.
SELECT string_agg(
         format(E'DROP POLICY IF EXISTS %I ON %I;\nCREATE POLICY %I ON %I\n  FOR %s TO %s%s%s;',
                policyname, tablename,
                policyname, tablename,
                cmd,
                array_to_string(roles, ', '),
                coalesce(E'\n  USING (' || qual       || ')', ''),
                coalesce(E'\n  WITH CHECK (' || with_check || ')', '')),
         E'\n\n' ORDER BY tablename, policyname)
       AS para_pegar_en_025
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('missions', 'mission_progress', 'task_templates');


-- ── 3 · El baseline: el RBAC que nunca tuvo archivo ─────────
-- Las tres funciones de permiso mas las dos que faltan en el 026.
-- Es lo que decide todo lo que ve cada persona; no tener esto en el
-- repo es el agujero mas grande de los tres.
SELECT string_agg(pg_get_functiondef(p.oid) || ';', E'\n\n' ORDER BY p.proname)
       AS para_pegar_en_baseline
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('app_is_direction', 'app_visible_city_ids', 'app_has_broad_read',
                    'app_my_scope_ids', 'app_can_see_entity', 'app_can_see_campaign',
                    'app_influencer_in_my_campaign', 'app_campaign_has_my_influencer',
                    'my_scouter_level', 'upsert_scouter',
                    'assign_entity', 'assign_entities_bulk', 'unassigned_summary');


-- ── 4 · La tabla user_roles y el enum de roles ──────────────
-- pg_get_functiondef no tiene equivalente para tablas, asi que esto
-- arma el CREATE TABLE a mano desde el catalogo.
SELECT format(
  E'CREATE TYPE %I AS ENUM (%s);\n\nCREATE TABLE IF NOT EXISTS user_roles (\n%s\n);',
  (SELECT t.typname FROM pg_type t
     JOIN pg_attribute a ON a.atttypid = t.oid
    WHERE a.attrelid = 'user_roles'::regclass AND a.attname = 'role'),
  (SELECT string_agg(quote_literal(e.enumlabel), ', ' ORDER BY e.enumsortorder)
     FROM pg_enum e
     JOIN pg_attribute a ON a.atttypid = e.enumtypid
    WHERE a.attrelid = 'user_roles'::regclass AND a.attname = 'role'),
  (SELECT string_agg(
            format('  %I %s%s%s',
                   a.attname,
                   format_type(a.atttypid, a.atttypmod),
                   CASE WHEN a.attnotnull THEN ' NOT NULL' ELSE '' END,
                   coalesce(' DEFAULT ' || pg_get_expr(d.adbin, d.adrelid), '')),
            E',\n' ORDER BY a.attnum)
     FROM pg_attribute a
     LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
    WHERE a.attrelid = 'user_roles'::regclass AND a.attnum > 0 AND NOT a.attisdropped)
) AS para_pegar_en_baseline;


-- ── 5 · Control: que quede registrado que se volco ──────────
-- Cero filas quiere decir que nunca se anoto ninguna de estas.
SELECT version, description, applied_at
FROM schema_migrations
ORDER BY version;
