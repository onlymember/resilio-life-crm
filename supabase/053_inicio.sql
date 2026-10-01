-- ═══════════════════════════════════════════════════════════
-- 053 · Inicio nuevo: oportunidades trabadas, meta del día y racha
--
--   1. opportunities.status_changed_at: cuándo entró a la etapa actual.
--      Hasta hoy solo existía updated_at, que cambia con cualquier
--      edición (una nota, un teléfono) y esconde a las trabadas.
--      Arranca con updated_at como mejor aproximación.
--   2. my_daily_progress(p_days): por día, en el huso de la Scouter,
--      cuántos contactos hizo (WhatsApp, DM, llamada, reunión, mail) y
--      cuántas fichas cargó. Con eso el Inicio arma la meta del día,
--      la racha y el resumen de la semana. Solo devuelve lo propio.
--
-- Solo agrega. No borra ni cambia datos existentes. Rollback al final.
-- ═══════════════════════════════════════════════════════════

BEGIN;

-- ── 1 · Desde cuándo está en la etapa ───────────────────────
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS status_changed_at TIMESTAMPTZ;
UPDATE opportunities SET status_changed_at = coalesce(updated_at, created_at, now())
 WHERE status_changed_at IS NULL;
ALTER TABLE opportunities ALTER COLUMN status_changed_at SET DEFAULT now();

CREATE OR REPLACE FUNCTION trg_opp_status_changed()
RETURNS TRIGGER LANGUAGE plpgsql AS $f$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.status_changed_at := coalesce(NEW.status_changed_at, now());
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.status_changed_at := now();
  END IF;
  RETURN NEW;
END $f$;

DROP TRIGGER IF EXISTS opp_status_changed ON opportunities;
CREATE TRIGGER opp_status_changed BEFORE INSERT OR UPDATE OF status ON opportunities
FOR EACH ROW EXECUTE FUNCTION trg_opp_status_changed();

CREATE INDEX IF NOT EXISTS idx_opp_status_changed ON opportunities (status_changed_at)
  WHERE status NOT IN ('won', 'lost');


-- ── 2 · Progreso diario propio ──────────────────────────────
CREATE OR REPLACE FUNCTION my_daily_progress(p_days INT DEFAULT 60)
RETURNS TABLE (day DATE, contacts INT, added INT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $f$
  WITH tz AS (SELECT my_timezone() AS z),
  days AS (
    SELECT generate_series(
             (now() AT TIME ZONE (SELECT z FROM tz))::date - (least(greatest(p_days, 1), 120) - 1),
             (now() AT TIME ZONE (SELECT z FROM tz))::date,
             interval '1 day')::date AS d
  ),
  c AS (
    SELECT (a.occurred_at AT TIME ZONE (SELECT z FROM tz))::date AS d, count(*)::int AS n
      FROM activities a
     WHERE a.actor_id = auth.uid()
       AND a.type IN ('dm', 'whatsapp', 'call', 'meeting', 'email')
       AND a.occurred_at >= now() - make_interval(days => least(greatest(p_days, 1), 120) + 1)
     GROUP BY 1
  ),
  n AS (
    SELECT (x.created_at AT TIME ZONE (SELECT z FROM tz))::date AS d, count(*)::int AS n
      FROM (SELECT created_at FROM influencers WHERE created_by = auth.uid()
            UNION ALL
            SELECT created_at FROM brands      WHERE created_by = auth.uid()) x
     WHERE x.created_at >= now() - make_interval(days => least(greatest(p_days, 1), 120) + 1)
     GROUP BY 1
  )
  SELECT days.d, coalesce(c.n, 0), coalesce(n.n, 0)
    FROM days
    LEFT JOIN c ON c.d = days.d
    LEFT JOIN n ON n.d = days.d
   WHERE auth.uid() IS NOT NULL
   ORDER BY days.d;
$f$;

REVOKE ALL ON FUNCTION my_daily_progress(int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION my_daily_progress(int) TO authenticated;

COMMIT;


-- ── Verificación: 3 filas con ok = true ─────────────────────
SELECT 'status_changed_at' AS k, EXISTS (SELECT 1 FROM information_schema.columns
        WHERE table_name = 'opportunities' AND column_name = 'status_changed_at') AS ok
UNION ALL
SELECT 'trigger', EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'opp_status_changed')
UNION ALL
SELECT 'my_daily_progress', EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'my_daily_progress');

-- ROLLBACK:
--   DROP FUNCTION IF EXISTS my_daily_progress(int);
--   DROP TRIGGER IF EXISTS opp_status_changed ON opportunities;
--   DROP FUNCTION IF EXISTS trg_opp_status_changed();
--   ALTER TABLE opportunities DROP COLUMN IF EXISTS status_changed_at;
