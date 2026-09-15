-- ═══════════════════════════════════════════════════════════
-- 035 · Network Pulse + Actividad Reciente (Home, Fase 6)
--
-- SECURITY INVOKER (default) + auth.uid() explícito en cada rama,
-- igual patrón que 022 (my_agenda / my_network_stats): no depende
-- de asumir qué RLS tiene hoy `activities` (no se diagnosticó
-- todavía) — cada función filtra por ownership ella misma.
--
-- Idempotente: CREATE OR REPLACE + guarda en schema_migrations.
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY, applied_at TIMESTAMPTZ DEFAULT now()
);

-- ── NETWORK PULSE ───────────────────────────────────────────
-- Resumen de cambios relevantes de los últimos p_days días,
-- scopeado a lo que el usuario posee. A propósito NO cuenta
-- ediciones menores (solo altas + colaboraciones que avanzaron
-- de estado) — el ruido que el usuario pidió evitar.
CREATE OR REPLACE FUNCTION network_pulse(p_days INT DEFAULT 1)
RETURNS JSONB LANGUAGE sql STABLE AS $fn$
  SELECT jsonb_build_object(
    'new_influencers', (
      SELECT count(*) FROM influencers
      WHERE owner_scouter_id = auth.uid()
        AND created_at >= now() - (p_days || ' days')::interval
    ),
    'new_brands', (
      SELECT count(*) FROM brands
      WHERE owner_scouter_id = auth.uid()
        AND created_at >= now() - (p_days || ' days')::interval
    ),
    'new_opportunities', (
      SELECT count(*) FROM opportunities
      WHERE owner_scouter_id = auth.uid()
        AND created_at >= now() - (p_days || ' days')::interval
    ),
    'collaborations_advanced', (
      SELECT count(*) FROM collaborations
      WHERE scouter_id = auth.uid()
        AND updated_at >= now() - (p_days || ' days')::interval
        AND updated_at > created_at + interval '1 minute'
    )
  );
$fn$;

-- ── ACTIVIDAD RECIENTE (Home) ───────────────────────────────
-- A diferencia de dbGetActivities (que trae la actividad de UNA
-- entidad puntual), esto trae la actividad reciente de TODA la
-- red del usuario: se apoya en las mismas 4 tablas que ya usa
-- my_agenda para saber "qué es mío", sin asumir ninguna política
-- RLS particular sobre `activities`.
CREATE OR REPLACE FUNCTION my_recent_activity(p_limit INT DEFAULT 8)
RETURNS TABLE (
  id           UUID,
  entity_type  TEXT,
  entity_id    UUID,
  type         TEXT,
  title        TEXT,
  description  TEXT,
  occurred_at  TIMESTAMPTZ
) LANGUAGE sql STABLE AS $fn$
  SELECT a.id, a.entity_type, a.entity_id, a.type, a.title, a.description, a.occurred_at
  FROM activities a
  WHERE
    (a.entity_type = 'influencer'  AND a.entity_id IN (SELECT id FROM influencers  WHERE owner_scouter_id = auth.uid()))
    OR (a.entity_type = 'brand'         AND a.entity_id IN (SELECT id FROM brands        WHERE owner_scouter_id = auth.uid()))
    OR (a.entity_type = 'opportunity'   AND a.entity_id IN (SELECT id FROM opportunities WHERE owner_scouter_id = auth.uid()))
    OR (a.entity_type = 'collaboration' AND a.entity_id IN (SELECT id FROM collaborations WHERE scouter_id = auth.uid()))
  ORDER BY a.occurred_at DESC
  LIMIT p_limit;
$fn$;

INSERT INTO schema_migrations (version) VALUES ('035_network_pulse_and_activity')
ON CONFLICT (version) DO NOTHING;

-- ── Verificación ────────────────────────────────────────────
SELECT proname FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND proname IN ('network_pulse','my_recent_activity')
ORDER BY proname;
-- Esperado: las 2.
