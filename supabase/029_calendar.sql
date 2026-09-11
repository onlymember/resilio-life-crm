-- ═══════════════════════════════════════════════════════════
-- 029 · Calendario — my_calendar_range()
--
-- QUÉ HACE
--   my_agenda() (022) sólo mira "de hoy a N días para adelante"
--   (CURRENT_DATE + p_days_ahead). Un calendario necesita moverse
--   a cualquier mes, pasado o futuro, así que hace falta la misma
--   unión de tasks/influencers/brands/opportunities pero acotada
--   por un rango [p_from, p_to] explícito en vez de una ventana
--   fija desde hoy.
--
--   Mismo shape de fila que my_agenda (kind/entity_type/entity_id/
--   title/subtitle/due_at/priority/is_overdue/is_today) a propósito:
--   el front puede reusar el mismo mapper que ya tiene para la
--   Agenda del Home en vez de escribir uno nuevo para el Calendario.
--
--   SECURITY INVOKER (default): RLS de tasks/influencers/brands/
--   opportunities se aplica adentro, así que un Scouter ve lo suyo
--   y un lead/Dirección ve su alcance, sin lógica extra acá.
--
-- SEGURIDAD: 100% aditivo, solo crea función + índices. No toca
-- políticas RLS existentes (my_agenda/my_network_stats etc. de 022
-- quedan intactas).
-- ═══════════════════════════════════════════════════════════

BEGIN;

-- ── 0) Registro de migraciones (guarda defensiva) ────────────
-- Ver el mismo comentario en 027: esta base no traía la tabla creada.
CREATE TABLE IF NOT EXISTS schema_migrations (
  version     TEXT        PRIMARY KEY,
  descripcion TEXT,
  aplicada_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION my_calendar_range(
  p_from DATE,
  p_to   DATE
) RETURNS TABLE (
  kind        TEXT,      -- 'task' | 'next_action'
  entity_type TEXT,
  entity_id   UUID,
  title       TEXT,
  subtitle    TEXT,
  due_at      TIMESTAMPTZ,
  priority    TEXT,
  is_overdue  BOOLEAN,
  is_today    BOOLEAN
) LANGUAGE plpgsql STABLE AS $fn$
BEGIN
  IF p_from IS NULL OR p_to IS NULL OR p_to < p_from THEN
    RAISE EXCEPTION 'Rango inválido: p_from=% p_to=%', p_from, p_to;
  END IF;
  IF p_to - p_from > 366 THEN
    RAISE EXCEPTION 'Rango demasiado grande (máx. 366 días): % días', (p_to - p_from);
  END IF;

  RETURN QUERY
  SELECT 'task', 'task', t.id, t.title,
         coalesce(t.description, ''), t.due_date,
         t.priority,
         (t.due_date IS NOT NULL AND t.due_date < now()),
         (t.due_date::date = CURRENT_DATE)
  FROM tasks t
  WHERE t.assigned_to = auth.uid()
    AND t.status NOT IN ('completed','cancelled')
    AND t.due_date IS NOT NULL
    AND t.due_date::date BETWEEN p_from AND p_to

  UNION ALL
  SELECT 'next_action', 'influencer', i.id,
         coalesce(i.next_action, 'Seguimiento'),
         i.name, i.next_action_at, 'normal',
         (i.next_action_at < now()),
         (i.next_action_at::date = CURRENT_DATE)
  FROM influencers i
  WHERE i.next_action_at IS NOT NULL
    AND i.status = 'active'
    AND i.next_action_at::date BETWEEN p_from AND p_to

  UNION ALL
  SELECT 'next_action', 'brand', b.id,
         coalesce(b.next_action, 'Seguimiento'),
         b.name, b.next_action_at, 'normal',
         (b.next_action_at < now()),
         (b.next_action_at::date = CURRENT_DATE)
  FROM brands b
  WHERE b.next_action_at IS NOT NULL
    AND b.status = 'active'
    AND b.next_action_at::date BETWEEN p_from AND p_to

  UNION ALL
  SELECT 'next_action', 'opportunity', o.id,
         coalesce(o.next_action, 'Seguimiento'),
         o.title, o.next_action_at, 'normal',
         (o.next_action_at < now()),
         (o.next_action_at::date = CURRENT_DATE)
  FROM opportunities o
  WHERE o.next_action_at IS NOT NULL
    AND o.status NOT IN ('won','lost')
    AND o.next_action_at::date BETWEEN p_from AND p_to

  ORDER BY 6 ASC NULLS LAST;
END;
$fn$;

-- ── Índices — sin esto cada vista de mes hace 4 seq scans ─────
CREATE INDEX IF NOT EXISTS idx_influencers_next_action_at
  ON influencers (next_action_at) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_brands_next_action_at
  ON brands (next_action_at) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_opportunities_next_action_at
  ON opportunities (next_action_at) WHERE status NOT IN ('won','lost');

INSERT INTO schema_migrations (version, descripcion)
VALUES ('029_calendar', 'my_calendar_range(p_from, p_to) + índices next_action_at para la vista Calendario')
ON CONFLICT (version) DO NOTHING;

COMMIT;

-- ── Verificación ────────────────────────────────────────────
SELECT proname FROM pg_proc WHERE proname = 'my_calendar_range';
-- Prueba rápida (mes actual):
SELECT * FROM my_calendar_range(date_trunc('month', CURRENT_DATE)::date,
                                 (date_trunc('month', CURRENT_DATE) + interval '1 month - 1 day')::date);

-- ═══════════════════════════════════════════════════════════
-- ROLLBACK
--   DROP FUNCTION IF EXISTS my_calendar_range(DATE, DATE);
--   DROP INDEX IF EXISTS idx_influencers_next_action_at;
--   DROP INDEX IF EXISTS idx_brands_next_action_at;
--   DROP INDEX IF EXISTS idx_opportunities_next_action_at;
--   DELETE FROM schema_migrations WHERE version='029_calendar';
-- ═══════════════════════════════════════════════════════════
