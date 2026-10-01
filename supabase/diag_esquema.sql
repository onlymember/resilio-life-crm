WITH
enums AS (
  SELECT 1 AS ord, t.typname AS name,
         format('CREATE TYPE public.%I AS ENUM (%s);', t.typname,
                string_agg(quote_literal(e.enumlabel), ', ' ORDER BY e.enumsortorder)) AS sql
  FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid
  JOIN pg_namespace n ON n.oid = t.typnamespace
  WHERE n.nspname = 'public'
  GROUP BY t.typname
),
seqs AS (
  SELECT 1 AS ord, c.relname AS name, format('CREATE SEQUENCE IF NOT EXISTS public.%I;', c.relname) AS sql
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind = 'S'
),
tabs AS (
  SELECT 2 AS ord, c.relname AS name,
         format(E'CREATE TABLE public.%I (\n%s\n);', c.relname,
           string_agg(format('  %I %s%s%s', a.attname, format_type(a.atttypid, a.atttypmod),
                             CASE WHEN d.adbin IS NOT NULL THEN ' DEFAULT ' || pg_get_expr(d.adbin, d.adrelid) ELSE '' END,
                             CASE WHEN a.attnotnull THEN ' NOT NULL' ELSE '' END), E',\n' ORDER BY a.attnum)) AS sql
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped
  LEFT JOIN pg_attrdef d ON d.adrelid = c.oid AND d.adnum = a.attnum
  WHERE n.nspname = 'public' AND c.relkind IN ('r','p')
  GROUP BY c.relname
),
cons AS (
  SELECT CASE WHEN con.contype = 'f' THEN 4 ELSE 3 END AS ord, c.relname || '.' || con.conname AS name,
         format('ALTER TABLE public.%I ADD CONSTRAINT %I %s;', c.relname, con.conname, pg_get_constraintdef(con.oid)) AS sql
  FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND con.contype IN ('p','u','f','c','x')
),
idx AS (
  SELECT 5 AS ord, i.indexname AS name, i.indexdef || ';' AS sql
  FROM pg_indexes i
  WHERE i.schemaname = 'public'
    AND NOT EXISTS (SELECT 1 FROM pg_constraint con WHERE con.conname = i.indexname)
),
fns AS (
  SELECT 6 AS ord, p.oid::regprocedure::text AS name, pg_get_functiondef(p.oid) || ';' AS sql
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.prokind IN ('f','p')
    AND NOT EXISTS (SELECT 1 FROM pg_depend dp WHERE dp.objid = p.oid AND dp.deptype = 'e')
),
vws AS (
  SELECT 7 AS ord, c.relname AS name,
         format(E'CREATE OR REPLACE VIEW public.%I%s AS\n%s', c.relname,
                CASE WHEN c.reloptions IS NOT NULL THEN ' WITH (' || array_to_string(c.reloptions, ', ') || ')' ELSE '' END,
                pg_get_viewdef(c.oid, true)) AS sql
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind = 'v'
),
trg AS (
  SELECT 8 AS ord, c.relname || '.' || t.tgname AS name, pg_get_triggerdef(t.oid) || ';' AS sql
  FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND NOT t.tgisinternal
),
rls AS (
  SELECT 9 AS ord, c.relname AS name, format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', c.relname) AS sql
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind IN ('r','p') AND c.relrowsecurity
),
pol AS (
  SELECT 10 AS ord, tablename || '.' || policyname AS name,
         format('CREATE POLICY %I ON public.%I AS %s FOR %s TO %s%s%s;', policyname, tablename, permissive, cmd,
                array_to_string(roles, ', '),
                CASE WHEN qual IS NOT NULL THEN ' USING (' || qual || ')' ELSE '' END,
                CASE WHEN with_check IS NOT NULL THEN ' WITH CHECK (' || with_check || ')' ELSE '' END) AS sql
  FROM pg_policies WHERE schemaname = 'public'
),
grt AS (
  SELECT 11 AS ord, p.oid::regprocedure::text AS name,
         format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC;%s%s', p.oid::regprocedure,
                CASE WHEN has_function_privilege('anon', p.oid, 'EXECUTE') THEN format(' GRANT EXECUTE ON FUNCTION public.%s TO anon;', p.oid::regprocedure) ELSE '' END,
                CASE WHEN has_function_privilege('authenticated', p.oid, 'EXECUTE') THEN format(' GRANT EXECUTE ON FUNCTION public.%s TO authenticated;', p.oid::regprocedure) ELSE '' END) AS sql
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.prokind IN ('f','p')
    AND NOT EXISTS (SELECT 1 FROM pg_depend dp WHERE dp.objid = p.oid AND dp.deptype = 'e')
)
SELECT ord, name, sql FROM (
  SELECT * FROM enums UNION ALL SELECT * FROM seqs UNION ALL SELECT * FROM tabs UNION ALL SELECT * FROM cons UNION ALL SELECT * FROM idx
  UNION ALL SELECT * FROM fns UNION ALL SELECT * FROM vws UNION ALL SELECT * FROM trg UNION ALL SELECT * FROM rls
  UNION ALL SELECT * FROM pol UNION ALL SELECT * FROM grt
) x ORDER BY ord, name;
