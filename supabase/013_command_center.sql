-- ═══════════════════════════════════════════════════════════
-- 013 · Command Center — stats y alertas
-- SECURITY INVOKER: cada rol ve su alcance con la misma pantalla.
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION network_stats(
  p_city UUID DEFAULT NULL, p_country UUID DEFAULT NULL,
  p_region UUID DEFAULT NULL, p_from DATE DEFAULT NULL, p_to DATE DEFAULT NULL
) RETURNS JSONB LANGUAGE sql STABLE AS $fn$
  WITH sc AS (
    SELECT s.* FROM scouters s
    JOIN cities c ON c.id = s.city_id
    JOIN countries co ON co.id = c.country_id
    WHERE (p_city    IS NULL OR s.city_id    = p_city)
      AND (p_country IS NULL OR co.id        = p_country)
      AND (p_region  IS NULL OR co.region_id = p_region)
  )
  SELECT jsonb_build_object(
    'scouters_total',  (SELECT count(*) FROM sc),
    'scouters_active', (SELECT count(*) FROM sc WHERE status = 'active'),
    'countries', (SELECT count(DISTINCT co.id) FROM sc
                  JOIN cities c ON c.id = sc.city_id
                  JOIN countries co ON co.id = c.country_id),
    'cities',    (SELECT count(DISTINCT city_id) FROM sc),
    'influencers',    (SELECT count(*) FROM influencers
                       WHERE (p_city IS NULL OR city_id = p_city)),
    'brands',         (SELECT count(*) FROM brands
                       WHERE (p_city IS NULL OR city_id = p_city)),
    'opportunities',  (SELECT count(*) FROM opportunities
                       WHERE status NOT IN ('won','lost')),
    'campaigns',      (SELECT count(*) FROM campaigns WHERE status = 'active'),
    'collaborations', (SELECT count(*) FROM collaborations
                       WHERE status IN ('confirmed','in_progress','content_pending')),
    'unassigned_influencers', (SELECT count(*) FROM influencers
                               WHERE owner_scouter_id IS NULL),
    'unassigned_brands',      (SELECT count(*) FROM brands
                               WHERE owner_scouter_id IS NULL),
    'tasks_open',    (SELECT count(*) FROM tasks WHERE status <> 'completed'),
    'tasks_overdue', (SELECT count(*) FROM tasks
                      WHERE status <> 'completed' AND due_date < now())
  );
$fn$;

-- Alertas: la parte más útil del Command Center (spec §22)
CREATE OR REPLACE FUNCTION network_alerts()
RETURNS TABLE (
  severidad TEXT, tipo TEXT, titulo TEXT,
  entity_type TEXT, entity_id UUID, dato NUMERIC
) LANGUAGE sql STABLE AS $fn$
  SELECT 'alta', 'task_overdue',
         format('Tarea vencida hace %s días: %s',
                (CURRENT_DATE - due_date::date), title),
         'task', id, (CURRENT_DATE - due_date::date)::numeric
  FROM tasks WHERE status <> 'completed' AND due_date < now()

  UNION ALL
  SELECT 'media', 'brand_stale',
         format('%s sin seguimiento hace %s días', name,
                (CURRENT_DATE - COALESCE(next_follow_up, updated_at::date))),
         'brand', id,
         (CURRENT_DATE - COALESCE(next_follow_up, updated_at::date))::numeric
  FROM brands
  WHERE status = 'active'
    AND COALESCE(next_follow_up, updated_at::date) < CURRENT_DATE - 14

  UNION ALL
  SELECT 'media', 'opportunity_stalled',
         format('Oportunidad sin movimiento: %s', title),
         'opportunity', id, (CURRENT_DATE - updated_at::date)::numeric
  FROM opportunities
  WHERE status NOT IN ('won','lost') AND updated_at < now() - INTERVAL '21 days'

  UNION ALL
  SELECT 'alta', 'unassigned',
         format('Influencer sin dueño: %s', name),
         'influencer', id, 0
  FROM influencers WHERE owner_scouter_id IS NULL

  UNION ALL
  SELECT 'alta', 'scouter_inactive',
         format('Scouter sin actividad hace %s días',
                (CURRENT_DATE - COALESCE(max(a.occurred_at)::date, s.joined_at))),
         'scouter', s.user_id,
         (CURRENT_DATE - COALESCE(max(a.occurred_at)::date, s.joined_at))::numeric
  FROM scouters s
  LEFT JOIN activities a ON a.actor_id = s.user_id
  WHERE s.status = 'active'
  GROUP BY s.user_id, s.joined_at
  HAVING COALESCE(max(a.occurred_at)::date, s.joined_at) < CURRENT_DATE - 14

  UNION ALL
  SELECT 'media', 'goal_behind',
         format('%s: %s%% del objetivo, con %s%% del período transcurrido',
                title, round(pct),
                round((CURRENT_DATE - period_start)::numeric
                      / GREATEST(period_end - period_start, 1) * 100)),
         'goal', id, pct
  FROM goals_view
  WHERE status = 'active' AND CURRENT_DATE BETWEEN period_start AND period_end
    AND pct < ((CURRENT_DATE - period_start)::numeric
               / GREATEST(period_end - period_start, 1) * 100) - 20

  ORDER BY 1, 6 DESC;
$fn$;

CREATE INDEX IF NOT EXISTS idx_brands_stale
  ON brands (next_follow_up, updated_at) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_opp_stalled
  ON opportunities (updated_at) WHERE status NOT IN ('won','lost');
CREATE INDEX IF NOT EXISTS idx_inf_unassigned
  ON influencers (created_at) WHERE owner_scouter_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_act_actor_date
  ON activities (actor_id, occurred_at DESC);
