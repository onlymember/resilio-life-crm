-- ============================================================
-- 032_opportunities_value.sql
-- Fase 5 — Valor de Oportunidad por influencer y por tipo de acción
--          + función combinada de notificaciones
--
-- Contexto (diagnosticado contra producción antes de escribir esto):
--   - opportunities NO tiene influencer_id: una Oportunidad puede
--     tener varios influencers candidatos antes de convertirse en
--     Colaboración. Por eso se agregan 2 tablas nuevas en vez de
--     columnas sueltas.
--   - collaborations.activation_type_id ya referencia una tabla
--     activation_types(id, code, name, description, color,
--     sort_order, active, created_at) — la reusamos tal cual,
--     no se crea ninguna tabla de tipos nueva.
--   - opportunities SÍ tiene next_action/next_action_at y ya está
--     cubierta por el my_agenda() real (rama 'opportunity'). No se
--     toca my_agenda() en esta migración.
--   - tasks/goals/task_templates quedan FUERA de esta migración a
--     pedido explícito (se revisan en otra ronda).
--   - El error "Could not find the 'value' column of 'opportunities'"
--     es del frontend (manda 'value' y la columna real es
--     'estimated_value'); no requiere cambios de SQL, se corrige en
--     el prompt de frontend.
--   - El error "record 'new' has no field 'budget'" viene de la
--     función audit_sensitive() (confirmado por búsqueda en
--     pg_proc.prosrc), NO de ningún trigger sobre opportunities.
--     Se deja fuera de este archivo hasta confirmar sobre qué
--     tabla(s) dispara — ver 033_fix_audit_sensitive.sql aparte.
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- 1. Candidatos: influencers propuestos para una Oportunidad
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS opportunity_influencers (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  influencer_id  UUID NOT NULL REFERENCES influencers(id) ON DELETE RESTRICT,
  status         TEXT NOT NULL DEFAULT 'proposed'
                   CHECK (status IN ('proposed','confirmed','declined')),
  notes          TEXT,
  created_by     UUID REFERENCES profiles(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (opportunity_id, influencer_id)
);

CREATE INDEX IF NOT EXISTS idx_opp_influencers_opportunity
  ON opportunity_influencers(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_opp_influencers_influencer
  ON opportunity_influencers(influencer_id);

-- ------------------------------------------------------------
-- 2. Desglose por tipo de acción (post / story / reel / etc.)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS opportunity_influencer_items (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_influencer_id UUID NOT NULL REFERENCES opportunity_influencers(id) ON DELETE CASCADE,
  activation_type_id        UUID REFERENCES activation_types(id) ON DELETE SET NULL,
  quantity                  INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_value                NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (unit_value >= 0),
  subtotal                  NUMERIC(14,2) GENERATED ALWAYS AS (quantity * unit_value) STORED,
  notes                     TEXT,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_opp_influencer_items_oi
  ON opportunity_influencer_items(opportunity_influencer_id);
CREATE INDEX IF NOT EXISTS idx_opp_influencer_items_activation
  ON opportunity_influencer_items(activation_type_id);

-- ------------------------------------------------------------
-- 3. updated_at automático — reusa la función genérica que YA
--    existe en producción (la usa trg_opportunities_touch), no
--    se crea una función nueva por tabla.
-- ------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_touch_opportunity_influencers ON opportunity_influencers;
CREATE TRIGGER trg_touch_opportunity_influencers
  BEFORE UPDATE ON opportunity_influencers
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_touch_opportunity_influencer_items ON opportunity_influencer_items;
CREATE TRIGGER trg_touch_opportunity_influencer_items
  BEFORE UPDATE ON opportunity_influencer_items
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ------------------------------------------------------------
-- 4. RLS — hereda el mismo criterio que ya protege a la
--    Oportunidad padre (opp_select / opp_update reales).
-- ------------------------------------------------------------
ALTER TABLE opportunity_influencers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS oi_all ON opportunity_influencers;
CREATE POLICY oi_all ON opportunity_influencers
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM opportunities o
    WHERE o.id = opportunity_influencers.opportunity_id
      AND (app_is_direction()
           OR o.owner_scouter_id = auth.uid()
           OR o.created_by = auth.uid()
           OR o.city_id IN (SELECT app_visible_city_ids()))
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM opportunities o
    WHERE o.id = opportunity_influencers.opportunity_id
      AND (app_is_direction()
           OR o.owner_scouter_id = auth.uid()
           OR o.created_by = auth.uid())
  ));

ALTER TABLE opportunity_influencer_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS oii_all ON opportunity_influencer_items;
CREATE POLICY oii_all ON opportunity_influencer_items
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM opportunity_influencers oi
    JOIN opportunities o ON o.id = oi.opportunity_id
    WHERE oi.id = opportunity_influencer_items.opportunity_influencer_id
      AND (app_is_direction()
           OR o.owner_scouter_id = auth.uid()
           OR o.created_by = auth.uid()
           OR o.city_id IN (SELECT app_visible_city_ids()))
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM opportunity_influencers oi
    JOIN opportunities o ON o.id = oi.opportunity_id
    WHERE oi.id = opportunity_influencer_items.opportunity_influencer_id
      AND (app_is_direction()
           OR o.owner_scouter_id = auth.uid()
           OR o.created_by = auth.uid())
  ));

-- ------------------------------------------------------------
-- 5. Vistas de totales — por influencer y por tipo de acción
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW v_opportunity_influencer_totals
WITH (security_invoker = true) AS
SELECT
  oi.id             AS opportunity_influencer_id,
  oi.opportunity_id,
  oi.influencer_id,
  oi.status,
  COALESCE(SUM(item.subtotal), 0) AS total_value
FROM opportunity_influencers oi
LEFT JOIN opportunity_influencer_items item
  ON item.opportunity_influencer_id = oi.id
GROUP BY oi.id, oi.opportunity_id, oi.influencer_id, oi.status;

CREATE OR REPLACE VIEW v_opportunity_action_totals
WITH (security_invoker = true) AS
SELECT
  oi.opportunity_id,
  item.activation_type_id,
  at.name AS activation_type_name,
  COALESCE(SUM(item.subtotal), 0) AS total_value
FROM opportunity_influencer_items item
JOIN opportunity_influencers oi ON oi.id = item.opportunity_influencer_id
LEFT JOIN activation_types at ON at.id = item.activation_type_id
GROUP BY oi.opportunity_id, item.activation_type_id, at.name;

-- ------------------------------------------------------------
-- 6. Notificaciones combinadas: vencimientos (agenda) + nuevas
--    asignaciones. No modifica tasks/goals; solo LEE de
--    my_agenda() (que ya incluye tasks tal cual funciona hoy).
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION my_notifications(p_days_lookback INT DEFAULT 3)
RETURNS TABLE(
  kind        TEXT,   -- 'due' | 'assigned'
  entity_type TEXT,
  entity_id   UUID,
  title       TEXT,
  subtitle    TEXT,
  at          TIMESTAMPTZ,
  is_overdue  BOOLEAN
)
LANGUAGE sql STABLE
AS $$
  SELECT 'due'::text, a.entity_type, a.entity_id, a.title, a.subtitle,
         a.due_at AS at, a.is_overdue
  FROM my_agenda(0) a
  WHERE a.is_overdue OR a.is_today

  UNION ALL

  SELECT 'assigned', 'opportunity', o.id, o.title, COALESCE(b.name, '—'),
         o.assigned_at AS at, false
  FROM opportunities o
  LEFT JOIN brands b ON b.id = o.brand_id
  WHERE o.owner_scouter_id = auth.uid()
    AND o.assigned_at IS NOT NULL
    AND o.assigned_at >= now() - (p_days_lookback::text || ' days')::interval
    AND (o.assigned_by IS NULL OR o.assigned_by <> auth.uid())

  UNION ALL

  SELECT 'assigned', 'collaboration', c.id,
         COALESCE(i.name, i.username, 'Colaboración'),
         COALESCE(br.name, '—'),
         c.created_at AS at, false
  FROM collaborations c
  LEFT JOIN influencers i ON i.id = c.influencer_id
  LEFT JOIN brands br ON br.id = c.brand_id
  WHERE c.scouter_id = auth.uid()
    AND c.created_at >= now() - (p_days_lookback::text || ' days')::interval
    AND (c.created_by IS NULL OR c.created_by <> c.scouter_id)

  ORDER BY at DESC;
$$;

INSERT INTO schema_migrations (version) VALUES ('032_opportunities_value')
ON CONFLICT (version) DO NOTHING;

COMMIT;

-- ============================================================
-- VERIFICACIÓN (correr después de aplicar, todas deben andar sin error)
-- ============================================================
-- SELECT count(*) FROM opportunity_influencers;
-- SELECT count(*) FROM opportunity_influencer_items;
-- SELECT * FROM v_opportunity_influencer_totals LIMIT 5;
-- SELECT * FROM v_opportunity_action_totals LIMIT 5;
-- SELECT * FROM my_notifications(3) LIMIT 20;
-- SELECT policyname, cmd FROM pg_policies WHERE tablename IN
--   ('opportunity_influencers','opportunity_influencer_items');

-- ============================================================
-- ROLLBACK (si algo sale mal, ejecutar esto completo)
-- ============================================================
-- BEGIN;
-- DROP FUNCTION IF EXISTS my_notifications(INT);
-- DROP VIEW IF EXISTS v_opportunity_action_totals;
-- DROP VIEW IF EXISTS v_opportunity_influencer_totals;
-- DROP TABLE IF EXISTS opportunity_influencer_items;
-- DROP TABLE IF EXISTS opportunity_influencers;
-- DELETE FROM schema_migrations WHERE version = '032_opportunities_value';
-- COMMIT;
