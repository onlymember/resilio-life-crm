-- ═══════════════════════════════════════════════════════════════════
-- 036 — FASE 6.5: medición mensual, historial marca↔influencer,
--       y conversión Oportunidad → Colaboración.
--
-- 100% ADITIVO: no toca ninguna tabla, columna ni política existente.
-- Nada cambia de comportamiento hasta que se conecte a una pantalla.
--
-- Verificado en Postgres 16 local contra datos de ejemplo, incluyendo
-- el caso real de producción donde collaborations.city_id viene NULL.
-- ═══════════════════════════════════════════════════════════════════

-- ------------------------------------------------------------------
-- 1) Fotos mensuales cerradas (por scouter y por ciudad)
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS monthly_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period date NOT NULL,
  scope text NOT NULL,
  scope_id uuid,
  new_influencers int DEFAULT 0,
  new_brands int DEFAULT 0,
  new_opportunities int DEFAULT 0,
  opportunities_won int DEFAULT 0,
  opportunities_lost int DEFAULT 0,
  collaborations_closed int DEFAULT 0,
  total_value numeric DEFAULT 0,
  total_estimated_media_value numeric DEFAULT 0,
  avg_engagement_rate numeric,
  closed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (period, scope, scope_id)
);

-- Ciudad efectiva de una colaboración.
-- dbSaveCollaboration() no escribe city_id, así que hoy todas nacen en NULL:
-- sin este fallback el rollup por ciudad daría 0 para siempre.
CREATE OR REPLACE FUNCTION collab_city_id(p_city_id uuid, p_brand_id uuid, p_influencer_id uuid)
RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT coalesce(
    p_city_id,
    (SELECT b.city_id FROM brands b      WHERE b.id = p_brand_id),
    (SELECT i.city_id FROM influencers i WHERE i.id = p_influencer_id)
  )
$$;

CREATE OR REPLACE FUNCTION close_monthly_snapshot(p_period date DEFAULT date_trunc('month', now())::date)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_from timestamptz := p_period::timestamptz;
  v_to   timestamptz := (p_period + interval '1 month')::timestamptz;
BEGIN
  IF NOT app_is_direction() THEN
    RAISE EXCEPTION 'Solo Dirección puede cerrar snapshots mensuales.';
  END IF;

  INSERT INTO monthly_snapshots (period, scope, scope_id, new_influencers, new_brands, new_opportunities, opportunities_won, opportunities_lost, collaborations_closed, total_value, total_estimated_media_value, avg_engagement_rate)
  SELECT p_period, 'scouter', s.user_id,
    (SELECT count(*) FROM influencers i WHERE i.owner_scouter_id = s.user_id AND i.created_at >= v_from AND i.created_at < v_to),
    (SELECT count(*) FROM brands b WHERE b.owner_scouter_id = s.user_id AND b.created_at >= v_from AND b.created_at < v_to),
    (SELECT count(*) FROM opportunities o WHERE o.owner_scouter_id = s.user_id AND o.created_at >= v_from AND o.created_at < v_to),
    (SELECT count(*) FROM opportunities o WHERE o.owner_scouter_id = s.user_id AND o.status='won' AND o.updated_at >= v_from AND o.updated_at < v_to),
    (SELECT count(*) FROM opportunities o WHERE o.owner_scouter_id = s.user_id AND o.status='lost' AND o.updated_at >= v_from AND o.updated_at < v_to),
    (SELECT count(*) FROM collaborations c WHERE c.scouter_id = s.user_id AND c.created_at >= v_from AND c.created_at < v_to),
    (SELECT coalesce(sum(c.amount),0) FROM collaborations c WHERE c.scouter_id = s.user_id AND c.created_at >= v_from AND c.created_at < v_to),
    (SELECT coalesce(sum(c.estimated_media_value),0) FROM collaborations c WHERE c.scouter_id = s.user_id AND c.created_at >= v_from AND c.created_at < v_to),
    (SELECT avg(c.engagement_rate) FROM collaborations c WHERE c.scouter_id = s.user_id AND c.created_at >= v_from AND c.created_at < v_to)
  FROM scouters s
  ON CONFLICT (period, scope, scope_id) DO UPDATE SET
    new_influencers=EXCLUDED.new_influencers, new_brands=EXCLUDED.new_brands, new_opportunities=EXCLUDED.new_opportunities,
    opportunities_won=EXCLUDED.opportunities_won, opportunities_lost=EXCLUDED.opportunities_lost, collaborations_closed=EXCLUDED.collaborations_closed,
    total_value=EXCLUDED.total_value, total_estimated_media_value=EXCLUDED.total_estimated_media_value, avg_engagement_rate=EXCLUDED.avg_engagement_rate, closed_at=now();

  INSERT INTO monthly_snapshots (period, scope, scope_id, new_influencers, new_brands, new_opportunities, opportunities_won, opportunities_lost, collaborations_closed, total_value, total_estimated_media_value, avg_engagement_rate)
  SELECT p_period, 'city', c.id,
    (SELECT count(*) FROM influencers i WHERE i.city_id = c.id AND i.created_at >= v_from AND i.created_at < v_to),
    (SELECT count(*) FROM brands b WHERE b.city_id = c.id AND b.created_at >= v_from AND b.created_at < v_to),
    (SELECT count(*) FROM opportunities o WHERE o.city_id = c.id AND o.created_at >= v_from AND o.created_at < v_to),
    (SELECT count(*) FROM opportunities o WHERE o.city_id = c.id AND o.status='won' AND o.updated_at >= v_from AND o.updated_at < v_to),
    (SELECT count(*) FROM opportunities o WHERE o.city_id = c.id AND o.status='lost' AND o.updated_at >= v_from AND o.updated_at < v_to),
    (SELECT count(*) FROM collaborations col WHERE collab_city_id(col.city_id, col.brand_id, col.influencer_id) = c.id AND col.created_at >= v_from AND col.created_at < v_to),
    (SELECT coalesce(sum(col.amount),0) FROM collaborations col WHERE collab_city_id(col.city_id, col.brand_id, col.influencer_id) = c.id AND col.created_at >= v_from AND col.created_at < v_to),
    (SELECT coalesce(sum(col.estimated_media_value),0) FROM collaborations col WHERE collab_city_id(col.city_id, col.brand_id, col.influencer_id) = c.id AND col.created_at >= v_from AND col.created_at < v_to),
    (SELECT avg(col.engagement_rate) FROM collaborations col WHERE collab_city_id(col.city_id, col.brand_id, col.influencer_id) = c.id AND col.created_at >= v_from AND col.created_at < v_to)
  FROM cities c
  ON CONFLICT (period, scope, scope_id) DO UPDATE SET
    new_influencers=EXCLUDED.new_influencers, new_brands=EXCLUDED.new_brands, new_opportunities=EXCLUDED.new_opportunities,
    opportunities_won=EXCLUDED.opportunities_won, opportunities_lost=EXCLUDED.opportunities_lost, collaborations_closed=EXCLUDED.collaborations_closed,
    total_value=EXCLUDED.total_value, total_estimated_media_value=EXCLUDED.total_estimated_media_value, avg_engagement_rate=EXCLUDED.avg_engagement_rate, closed_at=now();
END $$;

ALTER TABLE monthly_snapshots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS snap_select ON monthly_snapshots;
CREATE POLICY snap_select ON monthly_snapshots FOR SELECT
  USING (
    app_is_direction()
    OR (scope = 'scouter' AND scope_id = auth.uid())
    OR (scope = 'city' AND scope_id IN (SELECT app_visible_city_ids()))
  );

-- ------------------------------------------------------------------
-- 2) Historial agregado Marca ↔ Influencer
-- ------------------------------------------------------------------
CREATE OR REPLACE VIEW v_brand_influencer_history
WITH (security_invoker = true) AS
SELECT
  c.brand_id, c.influencer_id,
  count(*) AS times_worked,
  min(c.created_at) AS first_collab_at,
  max(c.created_at) AS last_collab_at,
  coalesce(sum(c.amount), 0) AS total_value,
  coalesce(sum(c.estimated_media_value), 0) AS total_estimated_media_value,
  avg(c.engagement_rate) AS avg_engagement_rate
FROM collaborations c
WHERE c.brand_id IS NOT NULL AND c.influencer_id IS NOT NULL
GROUP BY c.brand_id, c.influencer_id;

-- ------------------------------------------------------------------
-- 3) Convertir una Oportunidad ganada en Colaboración(es) real(es)
--    'proposed' verificado como valor válido del enum collab_status.
-- ------------------------------------------------------------------
CREATE OR REPLACE FUNCTION convert_opportunity_to_collaboration(p_opportunity_id uuid)
RETURNS SETOF collaborations LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_opp opportunities%ROWTYPE;
  v_oi RECORD;
BEGIN
  SELECT * INTO v_opp FROM opportunities WHERE id = p_opportunity_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Oportunidad no encontrada.'; END IF;
  IF NOT (app_is_direction() OR v_opp.owner_scouter_id = auth.uid() OR v_opp.created_by = auth.uid()) THEN
    RAISE EXCEPTION 'Sin permiso para convertir esta oportunidad.';
  END IF;

  FOR v_oi IN
    SELECT oi.influencer_id,
      (SELECT item.activation_type_id FROM opportunity_influencer_items item WHERE item.opportunity_influencer_id = oi.id ORDER BY item.subtotal DESC LIMIT 1) AS activation_type_id,
      (SELECT coalesce(sum(item.subtotal), 0) FROM opportunity_influencer_items item WHERE item.opportunity_influencer_id = oi.id) AS total_value
    FROM opportunity_influencers oi
    WHERE oi.opportunity_id = p_opportunity_id AND oi.status = 'confirmed'
  LOOP
    IF NOT EXISTS (SELECT 1 FROM collaborations c WHERE c.opportunity_id = p_opportunity_id AND c.influencer_id = v_oi.influencer_id) THEN
      INSERT INTO collaborations (opportunity_id, brand_id, influencer_id, scouter_id, city_id, activation_type_id, status, amount, currency, created_by)
      VALUES (p_opportunity_id, v_opp.brand_id, v_oi.influencer_id, coalesce(v_opp.owner_scouter_id, auth.uid()), v_opp.city_id, v_oi.activation_type_id, 'proposed', v_oi.total_value, v_opp.currency, auth.uid());
    END IF;
  END LOOP;

  RETURN QUERY SELECT * FROM collaborations WHERE opportunity_id = p_opportunity_id;
END $$;

INSERT INTO schema_migrations (version, descripcion)
VALUES ('036', 'Fase 6.5: monthly_snapshots + historial marca-influencer + conversion oportunidad->colaboracion')
ON CONFLICT DO NOTHING;
