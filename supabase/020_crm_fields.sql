-- ═══════════════════════════════════════════════════════════
-- 020 · Campos de CRM que faltaban
--
-- Vienen del documento de diseño de Network (§8, §9, §10, §21, §22, §23).
-- Sostienen las cards de influencer y marca, y el bloque NEEDS ATTENTION
-- del Home. Sin estos campos esas pantallas no se pueden construir.
--
-- Decisión de diseño: `status` (operativo) y `relationship_status`
-- (temperatura de la relación) son EJES DISTINTOS. Un influencer puede
-- estar `active` y `cold` a la vez. Mezclarlos en una sola columna
-- obliga a inventar estados imposibles.
-- ═══════════════════════════════════════════════════════════

CREATE TYPE relationship_status AS ENUM ('cold','warm','strong','inactive');

-- ── Influencers ─────────────────────────────────────────────
ALTER TABLE influencers
  ADD COLUMN relationship_status relationship_status NOT NULL DEFAULT 'cold',
  ADD COLUMN profile_image   TEXT,
  ADD COLUMN engagement      NUMERIC(5,2),   -- % · para ordenar y filtrar
  ADD COLUMN average_views   INT,
  ADD COLUMN next_action     TEXT,           -- "Follow-up por Instagram"
  ADD COLUMN next_action_at  TIMESTAMPTZ,    -- cuándo
  ADD COLUMN last_contact_at TIMESTAMPTZ;    -- "Last contact · 2d"

-- ── Marcas ──────────────────────────────────────────────────
ALTER TABLE brands
  ADD COLUMN relationship_status relationship_status NOT NULL DEFAULT 'cold',
  ADD COLUMN logo            TEXT,
  ADD COLUMN potential_value NUMERIC(14,2),
  ADD COLUMN next_action     TEXT,
  ADD COLUMN next_action_at  TIMESTAMPTZ,
  ADD COLUMN last_contact_at TIMESTAMPTZ;

-- ── Oportunidades ───────────────────────────────────────────
ALTER TABLE opportunities
  ADD COLUMN next_action    TEXT,
  ADD COLUMN next_action_at TIMESTAMPTZ;

-- ── Índices para NEEDS ATTENTION y los listados ─────────────
CREATE INDEX ON influencers   (next_action_at) WHERE status = 'active';
CREATE INDEX ON brands        (next_action_at) WHERE status = 'active';
CREATE INDEX ON opportunities (next_action_at) WHERE status NOT IN ('won','lost');
CREATE INDEX ON influencers   (relationship_status, city_id);
CREATE INDEX ON brands        (relationship_status, city_id);
CREATE INDEX ON influencers   (engagement DESC NULLS LAST);
CREATE INDEX ON influencers   (owner_scouter_id, next_action_at);

-- ── last_contact_at se mantiene solo ────────────────────────
-- Derivarlo de activities en cada listado es un cálculo por fila.
-- Con 20.000 influencers eso no escala. Se denormaliza por trigger.
CREATE OR REPLACE FUNCTION touch_last_contact()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  IF NEW.type IN ('dm','whatsapp','call','meeting','email','follow_up') THEN
    IF NEW.entity_type = 'influencer' THEN
      UPDATE influencers SET last_contact_at = NEW.occurred_at
       WHERE id = NEW.entity_id
         AND (last_contact_at IS NULL OR last_contact_at < NEW.occurred_at);
    ELSIF NEW.entity_type = 'brand' THEN
      UPDATE brands SET last_contact_at = NEW.occurred_at
       WHERE id = NEW.entity_id
         AND (last_contact_at IS NULL OR last_contact_at < NEW.occurred_at);
    END IF;
  END IF;
  RETURN NEW;
END $fn$;

CREATE TRIGGER trg_touch_last_contact AFTER INSERT ON activities
FOR EACH ROW EXECUTE FUNCTION touch_last_contact();

-- ── network_alerts pasa a usar next_action_at ───────────────
-- Antes miraba next_follow_up, que queda como campo legacy.
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
  SELECT 'alta', 'action_overdue',
         format('%s · acción vencida: %s', name, coalesce(next_action,'seguimiento')),
         'brand', id, (CURRENT_DATE - next_action_at::date)::numeric
  FROM brands
  WHERE status = 'active' AND next_action_at IS NOT NULL AND next_action_at < now()

  UNION ALL
  SELECT 'alta', 'action_overdue',
         format('%s · acción vencida: %s', name, coalesce(next_action,'seguimiento')),
         'influencer', id, (CURRENT_DATE - next_action_at::date)::numeric
  FROM influencers
  WHERE status = 'active' AND next_action_at IS NOT NULL AND next_action_at < now()

  UNION ALL
  SELECT 'media', 'brand_stale',
         format('%s sin contacto hace %s días', name,
                (CURRENT_DATE - coalesce(last_contact_at::date, created_at::date))),
         'brand', id,
         (CURRENT_DATE - coalesce(last_contact_at::date, created_at::date))::numeric
  FROM brands
  WHERE status = 'active' AND next_action_at IS NULL
    AND coalesce(last_contact_at::date, created_at::date) < CURRENT_DATE - 14

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
  SELECT 'alta', 'unassigned',
         format('Marca sin dueño: %s', name),
         'brand', id, 0
  FROM brands WHERE owner_scouter_id IS NULL

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

-- ── Brasil, para probar la arquitectura internacional (§36) ──
INSERT INTO countries (region_id, code, name, currency, timezone, locale)
SELECT r.id, 'BR', 'Brasil', 'BRL', 'America/Sao_Paulo', 'pt'
FROM regions r WHERE r.code = 'LATAM'
ON CONFLICT (code) DO NOTHING;

INSERT INTO cities (country_id, name, slug)
SELECT c.id, 'São Paulo', 'sao-paulo'
FROM countries c WHERE c.code = 'BR'
ON CONFLICT (country_id, slug) DO NOTHING;

-- ── Verificación ────────────────────────────────────────────
SELECT r.name AS region, co.name AS pais, co.currency, co.locale, ci.name AS ciudad
FROM cities ci
JOIN countries co ON co.id = ci.country_id
JOIN regions   r  ON r.id  = co.region_id
ORDER BY r.name, co.name, ci.name;
