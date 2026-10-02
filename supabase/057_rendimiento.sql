-- ═══════════════════════════════════════════════════════════
-- 057 · Rendimiento de la base
--
--   1. Políticas (RLS) que no se recalculan fila por fila.
--      Postgres evalúa auth.uid(), app_is_direction(), etc. UNA VEZ POR
--      FILA si están sueltas en la policy. Envueltas en (SELECT ...) se
--      calculan una sola vez por consulta (recomendación oficial de
--      Supabase). Con miles de fichas es la diferencia entre 50 ms y
--      varios segundos. No cambia QUÉ ve cada uno: es la misma regla.
--      Solo se tocan funciones sin argumentos por fila (auth.uid() y las
--      app_* sin parámetros o con un texto fijo).
--   2. Índices para las búsquedas de todos los días (fichas por dueño,
--      por ciudad, agenda, actividad, tareas, notificaciones…). Se crea
--      cada uno SOLO si la tabla y las columnas existen y no hay ya un
--      índice que empiece por esas mismas columnas.
--
--   3. Todas las funciones con search_path fijo (advertencia del asesor
--      de seguridad de Supabase).
--
-- No cambia datos. Se puede correr dos veces sin efecto.
-- ═══════════════════════════════════════════════════════════

BEGIN;

-- ── 1 · RLS: una evaluación por consulta, no por fila ───────
DO $rls$
DECLARE
  p        RECORD;
  q        TEXT;
  c        TEXT;
  fns      TEXT[] := ARRAY['auth\.uid\(\)', 'app_is_direction\(\)', 'app_is_team_member\(\)',
                           'app_can_manage_offers\(\)', 'app_is_super_admin\(\)', 'my_scouter_level\(\)',
                           'app_has_broad_read\(''[a-z_]+''::text\)', 'app_can_create\(''[a-z_]+''::text\)'];
  f        TEXT;
  n        INT := 0;
BEGIN
  FOR p IN SELECT schemaname, tablename, policyname, qual, with_check
             FROM pg_policies WHERE schemaname = 'public' LOOP
    q := p.qual; c := p.with_check;
    FOREACH f IN ARRAY fns LOOP
      -- (?<!SELECT ) evita envolver dos veces si ya estaba envuelta.
      IF q IS NOT NULL THEN q := regexp_replace(q, '(?<!SELECT )(' || f || ')', '(SELECT \1)', 'g'); END IF;
      IF c IS NOT NULL THEN c := regexp_replace(c, '(?<!SELECT )(' || f || ')', '(SELECT \1)', 'g'); END IF;
    END LOOP;
    IF q IS DISTINCT FROM p.qual OR c IS DISTINCT FROM p.with_check THEN
      EXECUTE format('ALTER POLICY %I ON %I.%I%s%s', p.policyname, p.schemaname, p.tablename,
                     CASE WHEN q IS NOT NULL THEN ' USING (' || q || ')' ELSE '' END,
                     CASE WHEN c IS NOT NULL THEN ' WITH CHECK (' || c || ')' ELSE '' END);
      n := n + 1;
    END IF;
  END LOOP;
  RAISE NOTICE '057: % políticas optimizadas', n;
END $rls$;


-- ── 2 · Índices de uso diario ───────────────────────────────
DO $idx$
DECLARE
  spec  TEXT[];
  tbl   TEXT;
  cols  TEXT[];
  cond  TEXT;
  ok    BOOLEAN;
  iname TEXT;
  n     INT := 0;
  specs TEXT[][] := ARRAY[
    -- tabla,            columnas (coma),                     condición parcial (opcional)
    ARRAY['influencers',    'owner_scouter_id',                 ''],
    ARRAY['influencers',    'city_id',                          ''],
    ARRAY['influencers',    'created_by,created_at',            ''],
    ARRAY['influencers',    'created_at',                       ''],
    ARRAY['brands',         'owner_scouter_id',                 ''],
    ARRAY['brands',         'city_id',                          ''],
    ARRAY['brands',         'created_by,created_at',            ''],
    ARRAY['brands',         'created_at',                       ''],
    ARRAY['opportunities',  'owner_scouter_id',                 ''],
    ARRAY['opportunities',  'created_by',                       ''],
    ARRAY['opportunities',  'city_id',                          ''],
    ARRAY['opportunities',  'brand_id',                         ''],
    ARRAY['collaborations', 'scouter_id',                       ''],
    ARRAY['collaborations', 'created_by',                       ''],
    ARRAY['collaborations', 'city_id',                          ''],
    ARRAY['collaborations', 'influencer_id',                    ''],
    ARRAY['collaborations', 'brand_id',                         ''],
    ARRAY['collaborations', 'start_date',                       ''],
    ARRAY['collaborations', 'next_action_at',                   ''],
    ARRAY['activities',     'entity_type,entity_id',            ''],
    ARRAY['activities',     'actor_id,occurred_at',             ''],
    ARRAY['activities',     'occurred_at',                      ''],
    ARRAY['tasks',          'assigned_to',                      ''],
    ARRAY['tasks',          'created_by',                       ''],
    ARRAY['tasks',          'entity_type,entity_id',            ''],
    ARRAY['notifications',  'user_id,read,created_at',          ''],
    ARRAY['user_roles',     'user_id',                          ''],
    ARRAY['scouters',       'city_id',                          ''],
    ARRAY['offer_interests','influencer_id',                    ''],
    ARRAY['offer_interests','offer_id',                         ''],
    ARRAY['collab_confirmations','collaboration_id',            ''],
    ARRAY['assignments',    'entity_type,entity_id',            ''],
    ARRAY['personal_notes', 'user_id',                          '']
  ];
BEGIN
  FOREACH spec SLICE 1 IN ARRAY specs LOOP
    tbl  := spec[1];
    cols := string_to_array(spec[2], ',');
    cond := spec[3];
    CONTINUE WHEN to_regclass('public.' || tbl) IS NULL;
    -- ¿existen todas las columnas?
    SELECT bool_and(EXISTS (SELECT 1 FROM information_schema.columns
                             WHERE table_schema = 'public' AND table_name = tbl AND column_name = col))
      INTO ok FROM unnest(cols) col;
    CONTINUE WHEN NOT ok;
    -- ¿ya hay un índice que empieza por esas columnas?
    SELECT EXISTS (
      SELECT 1 FROM pg_index i
       WHERE i.indrelid = ('public.' || tbl)::regclass
         AND (SELECT array_agg(a.attname::text ORDER BY k.ord)
                FROM unnest(i.indkey::int2[]) WITH ORDINALITY k(attnum, ord)
                JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k.attnum
               WHERE k.ord <= array_length(cols, 1)) = cols)
      INTO ok;
    CONTINUE WHEN ok;
    iname := left('idx_' || tbl || '_' || array_to_string(cols, '_'), 63);
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (%s)%s', iname, tbl,
                   (SELECT string_agg(quote_ident(x), ', ') FROM unnest(cols) x),
                   CASE WHEN cond <> '' THEN ' WHERE ' || cond ELSE '' END);
    n := n + 1;
  END LOOP;
  RAISE NOTICE '057: % índices nuevos', n;
END $idx$;


-- ── 3 · Funciones con search_path fijo ──────────────────────
-- Una función sin search_path fijo resuelve nombres según quién la
-- llame: es la advertencia "Function Search Path Mutable" del asesor de
-- seguridad de Supabase. Se fija al mismo valor que ya usan hoy
-- (public, extensions), así que no cambia lo que hacen.
DO $sp$
DECLARE f RECORD; n INT := 0;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure AS sig
      FROM pg_proc p JOIN pg_namespace ns ON ns.oid = p.pronamespace
     WHERE ns.nspname = 'public' AND p.prokind = 'f'
       AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid = p.oid AND d.deptype = 'e')
       AND NOT EXISTS (SELECT 1 FROM unnest(coalesce(p.proconfig, '{}')) c WHERE c LIKE 'search_path=%')
  LOOP
    BEGIN
      EXECUTE format('ALTER FUNCTION %s SET search_path = public, extensions', f.sig);
      n := n + 1;
    EXCEPTION WHEN insufficient_privilege THEN
      RAISE NOTICE '057: % no es de este usuario, se deja como está', f.sig;
    END;
  END LOOP;
  RAISE NOTICE '057: % funciones con search_path fijo', n;
END $sp$;

COMMIT;

-- Estadísticas al día para que el planificador use los índices nuevos.
ANALYZE influencers, brands, opportunities, collaborations, activities, tasks, notifications;


-- ── Verificación: 3 filas con ok = true ─────────────────────
SELECT 'políticas optimizadas' AS k,
       NOT EXISTS (SELECT 1 FROM pg_policies
                    WHERE schemaname = 'public'
                      AND (coalesce(qual, '') ~ '(?<!SELECT )auth\.uid\(\)'
                        OR coalesce(with_check, '') ~ '(?<!SELECT )auth\.uid\(\)')) AS ok
UNION ALL
SELECT 'search_path fijo en todas',
       NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace ns ON ns.oid = p.pronamespace
                    WHERE ns.nspname = 'public' AND p.prokind = 'f' AND pg_get_userbyid(p.proowner) = current_user
                      AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid = p.oid AND d.deptype = 'e')
                      AND NOT EXISTS (SELECT 1 FROM unnest(coalesce(p.proconfig, '{}')) c WHERE c LIKE 'search_path=%'))
UNION ALL
SELECT 'índices de uso diario',
       EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'activities'
                 AND indexdef ILIKE '%(entity_type, entity_id%');
