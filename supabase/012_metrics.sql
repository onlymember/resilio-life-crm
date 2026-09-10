-- ═══════════════════════════════════════════════════════════
-- 012 · Métricas
-- TODAS SECURITY INVOKER (el default). Deliberado: la misma función
-- devuelve números distintos según quién la llame, porque RLS se
-- aplica adentro. Un regional_lead ve su región con la misma pantalla
-- que Dirección. Si fueran DEFINER, filtrarían toda la red.
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION goal_progress(p_goal_id UUID)
RETURNS NUMERIC LANGUAGE plpgsql STABLE AS $fn$
DECLARE g goals; u UUID[]; n NUMERIC := 0;
BEGIN
  SELECT * INTO g FROM goals WHERE id = p_goal_id;
  IF NOT FOUND THEN RETURN 0; END IF;

  IF g.assigned_to IS NOT NULL THEN
    u := ARRAY[g.assigned_to];
  ELSE
    SELECT array_agg(s.user_id) INTO u
    FROM scouters s
    JOIN cities    c  ON c.id  = s.city_id
    JOIN countries co ON co.id = c.country_id
    WHERE (g.city_id    IS NULL OR s.city_id    = g.city_id)
      AND (g.country_id IS NULL OR co.id        = g.country_id)
      AND (g.region_id  IS NULL OR co.region_id = g.region_id);
  END IF;
  IF u IS NULL THEN RETURN 0; END IF;

  CASE g.metric
    WHEN 'influencers_added' THEN
      SELECT count(*) INTO n FROM influencers
       WHERE created_by = ANY(u)
         AND created_at::date BETWEEN g.period_start AND g.period_end;
    WHEN 'brands_added' THEN
      SELECT count(*) INTO n FROM brands
       WHERE created_by = ANY(u)
         AND created_at::date BETWEEN g.period_start AND g.period_end;
    WHEN 'opportunities' THEN
      SELECT count(*) INTO n FROM opportunities
       WHERE created_by = ANY(u)
         AND created_at::date BETWEEN g.period_start AND g.period_end;
    WHEN 'collaborations' THEN
      SELECT count(*) INTO n FROM collaborations
       WHERE created_by = ANY(u)
         AND created_at::date BETWEEN g.period_start AND g.period_end;
    WHEN 'contacts' THEN
      SELECT count(*) INTO n FROM activities
       WHERE actor_id = ANY(u)
         AND type IN ('dm','whatsapp','call','meeting','email')
         AND occurred_at::date BETWEEN g.period_start AND g.period_end;
    WHEN 'follow_ups' THEN
      SELECT count(*) INTO n FROM activities
       WHERE actor_id = ANY(u) AND type = 'follow_up'
         AND occurred_at::date BETWEEN g.period_start AND g.period_end;
    WHEN 'tasks_completed' THEN
      SELECT count(*) INTO n FROM tasks
       WHERE assigned_to = ANY(u) AND status = 'completed'
         AND completed_at::date BETWEEN g.period_start AND g.period_end;
    ELSE n := 0;
  END CASE;

  RETURN COALESCE(n, 0);
END $fn$;

-- El progreso se CALCULA, nunca se guarda: un contador persistido
-- se desincroniza el primer día.
CREATE OR REPLACE VIEW goals_view AS
SELECT g.*,
       goal_progress(g.id) AS current_progress,
       CASE WHEN g.target > 0
            THEN round(goal_progress(g.id) / g.target * 100, 1)
            ELSE 0 END AS pct
FROM goals g;
ALTER VIEW goals_view SET (security_invoker = true);

CREATE OR REPLACE FUNCTION mission_progress_of(p_mission UUID, p_user UUID)
RETURNS NUMERIC LANGUAGE plpgsql STABLE AS $fn$
DECLARE m missions; n NUMERIC := 0;
BEGIN
  SELECT * INTO m FROM missions WHERE id = p_mission;
  IF NOT FOUND THEN RETURN 0; END IF;
  CASE m.metric
    WHEN 'influencers_added' THEN
      SELECT count(*) INTO n FROM influencers
       WHERE created_by = p_user
         AND (m.starts_at IS NULL OR created_at::date >= m.starts_at)
         AND (m.ends_at   IS NULL OR created_at::date <= m.ends_at);
    WHEN 'brands_added' THEN
      SELECT count(*) INTO n FROM brands
       WHERE created_by = p_user
         AND (m.starts_at IS NULL OR created_at::date >= m.starts_at)
         AND (m.ends_at   IS NULL OR created_at::date <= m.ends_at);
    ELSE n := 0;
  END CASE;
  RETURN COALESCE(n, 0);
END $fn$;

-- Performance del Scouter (spec §20): actividad + calidad + resultados.
-- NO es "cantidad de registros". El Scouter Score automático es Fase 3.
CREATE OR REPLACE FUNCTION scouter_performance(
  p_user UUID,
  p_from DATE DEFAULT (CURRENT_DATE - 30),
  p_to   DATE DEFAULT CURRENT_DATE
) RETURNS JSONB LANGUAGE sql STABLE AS $fn$
  SELECT jsonb_build_object(
    'activity', jsonb_build_object(
      'influencers_added', (SELECT count(*) FROM influencers
        WHERE created_by = p_user AND created_at::date BETWEEN p_from AND p_to),
      'brands_added', (SELECT count(*) FROM brands
        WHERE created_by = p_user AND created_at::date BETWEEN p_from AND p_to),
      'contacts', (SELECT count(*) FROM activities
        WHERE actor_id = p_user AND type IN ('dm','whatsapp','call','meeting','email')
          AND occurred_at::date BETWEEN p_from AND p_to),
      'tasks_completed', (SELECT count(*) FROM tasks
        WHERE assigned_to = p_user AND status = 'completed'
          AND completed_at::date BETWEEN p_from AND p_to)
    ),
    'quality', jsonb_build_object(
      'complete_profiles', (SELECT count(*) FROM influencers
        WHERE owner_scouter_id = p_user AND city_id IS NOT NULL
          AND category IS NOT NULL
          AND (whatsapp IS NOT NULL OR instagram IS NOT NULL)),
      'total_owned', (SELECT count(*) FROM influencers
        WHERE owner_scouter_id = p_user)
    ),
    'results', jsonb_build_object(
      'opportunities', (SELECT count(*) FROM opportunities
        WHERE owner_scouter_id = p_user AND created_at::date BETWEEN p_from AND p_to),
      'won', (SELECT count(*) FROM opportunities
        WHERE owner_scouter_id = p_user AND status = 'won'),
      'collaborations', (SELECT count(*) FROM collaborations
        WHERE scouter_id = p_user AND created_at::date BETWEEN p_from AND p_to),
      'value', (SELECT COALESCE(sum(amount), 0) FROM collaborations
        WHERE scouter_id = p_user AND status = 'completed'
          AND created_at::date BETWEEN p_from AND p_to)
    )
  );
$fn$;
