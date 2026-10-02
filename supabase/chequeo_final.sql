-- Chequeo final (SOLO LECTURA): confirma que todo lo de 051–057 está aplicado.
-- Tiene que dar todas las filas con ok = true.
SELECT '051 interruptor del Club' AS k, to_regclass('public.app_settings') IS NOT NULL AS ok
UNION ALL SELECT '052 scouters solo lo suyo',
  NOT EXISTS (SELECT 1 FROM user_roles WHERE role = 'scouter' AND revoked_at IS NULL AND scope <> 'own')
UNION ALL SELECT '053 inicio nuevo',
  EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'my_daily_progress')
  AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'opportunities' AND column_name = 'status_changed_at')
UNION ALL SELECT '054 confirmación sin tipo supuesto',
  position('collab_status' IN pg_get_functiondef('respond_collab_confirmation(text,text,date,time,text)'::regprocedure)) = 0
UNION ALL SELECT '055 perfiles protegidos',
  EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_protect_profile')
UNION ALL SELECT '055 funciones internas cerradas',
  NOT has_function_privilege('anon', 'run_daily_maintenance()'::regprocedure, 'EXECUTE')
UNION ALL SELECT '056 resumen semanal en la base',
  EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'weekly_summary')
UNION ALL SELECT '057 políticas optimizadas',
  NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public'
               AND (coalesce(qual, '') ~ '(?<!SELECT )auth\.uid\(\)' OR coalesce(with_check, '') ~ '(?<!SELECT )auth\.uid\(\)'))
UNION ALL SELECT 'ninguna tabla sin RLS',
  NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
               WHERE n.nspname = 'public' AND c.relkind = 'r' AND NOT c.relrowsecurity);
