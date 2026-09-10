-- ═══════════════════════════════════════════════════════════
-- 017 · Reset de datos de prueba de la Fase 1
-- Borra datos de negocio. NO toca usuarios, roles ni geografía.
-- Ejecutado en el dashboard el 2026-09-09.
-- ═══════════════════════════════════════════════════════════

TRUNCATE
  campaign_influencers, collaborations, campaigns, opportunities,
  locations, brands, influencers,
  activities, assignments, audit_log, notifications,
  tasks, task_templates, goals, missions, mission_progress, reward_points
RESTART IDENTITY CASCADE;

SELECT t.table_name,
       (xpath('/row/cnt/text()',
          query_to_xml(format('SELECT count(*) AS cnt FROM public.%I', t.table_name),
                       false, true, '')))[1]::text::bigint AS filas
FROM information_schema.tables t
WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
ORDER BY 2 DESC, 1;
