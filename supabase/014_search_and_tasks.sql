-- ═══════════════════════════════════════════════════════════
-- 014 · Búsqueda global (spec §42) + recurrencia de tareas (§16)
-- ═══════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_inf_search ON influencers
  USING gin ((coalesce(name,'') || ' ' || coalesce(username,'') || ' ' ||
              coalesce(instagram,'')) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_brands_search ON brands
  USING gin ((coalesce(name,'') || ' ' || coalesce(category,'')) gin_trgm_ops);

CREATE OR REPLACE FUNCTION global_search(q TEXT, lim INT DEFAULT 20)
RETURNS TABLE (entity_type TEXT, id UUID, titulo TEXT, subtitulo TEXT)
LANGUAGE sql STABLE AS $fn$
  SELECT 'influencer', i.id, i.name,
         coalesce('@' || i.instagram, '') || ' · ' || coalesce(c.name, 'sin ciudad')
  FROM influencers i LEFT JOIN cities c ON c.id = i.city_id
  WHERE i.name ILIKE '%' || q || '%' OR i.username ILIKE '%' || q || '%'
     OR i.instagram ILIKE '%' || q || '%'
  UNION ALL
  SELECT 'brand', b.id, b.name,
         coalesce(b.category, '') || ' · ' || coalesce(c.name, 'sin ciudad')
  FROM brands b LEFT JOIN cities c ON c.id = b.city_id
  WHERE b.name ILIKE '%' || q || '%'
  UNION ALL
  SELECT 'opportunity', o.id, o.title, o.status::text
  FROM opportunities o WHERE o.title ILIKE '%' || q || '%'
  UNION ALL
  SELECT 'campaign', ca.id, ca.name, ca.status
  FROM campaigns ca WHERE ca.name ILIKE '%' || q || '%'
  LIMIT lim;
$fn$;

-- Una recurrente es una PLANTILLA que genera INSTANCIAS. Sin esto,
-- "cada lunes contactar 20 influencers" no se puede medir: no se sabe
-- qué semana se cumplió.
CREATE OR REPLACE FUNCTION generate_recurring_tasks()
RETURNS INT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE t task_templates; u UUID; due TIMESTAMPTZ; n INT := 0;
BEGIN
  FOR t IN SELECT * FROM task_templates
           WHERE active AND recurrence <> 'one_time' LOOP

    due := CASE t.recurrence
      WHEN 'weekly'    THEN date_trunc('week',    now()) + INTERVAL '6 days'
      WHEN 'monthly'   THEN date_trunc('month',   now()) + INTERVAL '1 month - 1 day'
      WHEN 'quarterly' THEN date_trunc('quarter', now()) + INTERVAL '3 months - 1 day'
    END;

    FOR u IN
      SELECT s.user_id FROM scouters s
      JOIN cities c ON c.id = s.city_id
      JOIN countries co ON co.id = c.country_id
      WHERE s.status = 'active' AND (
            t.target_type = 'network'
        OR (t.target_type = 'user'    AND s.user_id = t.target_id)
        OR (t.target_type = 'team'    AND s.team_id = t.target_id)
        OR (t.target_type = 'city'    AND s.city_id = t.target_id)
        OR (t.target_type = 'country' AND co.id     = t.target_id)
        OR (t.target_type = 'region'  AND co.region_id = t.target_id))
    LOOP
      IF NOT EXISTS (SELECT 1 FROM tasks
                     WHERE template_id = t.id AND assigned_to = u
                       AND due_date = due) THEN
        INSERT INTO tasks (template_id, title, description, assigned_to,
                           created_by, type, priority, due_date)
        VALUES (t.id, t.title, t.description, u, t.created_by,
                t.type, t.priority, due);
        n := n + 1;
      END IF;
    END LOOP;
  END LOOP;
  RETURN n;
END $fn$;

-- Programar a diario. Si pg_cron no está en el plan, llamarla desde una
-- Edge Function agendada y anotarlo en el RUNBOOK.
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- SELECT cron.schedule('gen-tasks','0 6 * * *','SELECT generate_recurring_tasks()');
