-- ═══════════════════════════════════════════════════════════
-- 038 · Plantillas editables y el motor sin pg_cron
--
-- QUE RESUELVE
--   1. `pg_cron` NO esta disponible en esta instancia (se verifico:
--      SELECT extname FROM pg_extension WHERE extname='pg_cron' -> 0 filas).
--      Sin scheduler, generate_recurring_tasks() nunca corre sola.
--      Este archivo la vuelve disparable desde la app, con un candado
--      para que veinte pestanas abiertas no generen veinte veces.
--
--   2. Las plantillas solo aceptaban weekly/monthly/quarterly. Todo el
--      plan de las Scouters es DIARIO. Sin 'daily' las plantillas no
--      pueden expresar el habito que se les pide.
--
--   3. Las plantillas se sembraban por SQL. Ahora se editan dentro del
--      sistema, asi que lo que hace falta de la base es la policy que
--      lo permita.
--
-- SEGURIDAD
--   · Las cuatro policies de task_templates quedan en Direccion.
--   · run_daily_maintenance() es DEFINER porque genera tareas para
--     otros; no recibe parametros y no expone ninguna fila.
--   · generate_recurring_tasks() ya era DEFINER; se reemplaza el cuerpo.
-- ═══════════════════════════════════════════════════════════


-- ── 1 · La plantilla acepta 'daily' y una hora de vencimiento ─
-- due_hour es la hora LOCAL de la ciudad de la Scouter, no UTC. Una
-- tarea que vence "a las 18" tiene que vencer a las 18 de Bogota para
-- la de Bogota y a las 18 de Madrid para la de Madrid.
ALTER TABLE task_templates
  DROP CONSTRAINT IF EXISTS task_templates_recurrence_check;

ALTER TABLE task_templates
  ADD CONSTRAINT task_templates_recurrence_check
  CHECK (recurrence IN ('one_time','daily','weekly','monthly','quarterly'));

ALTER TABLE task_templates
  ADD COLUMN IF NOT EXISTS due_hour   INT NOT NULL DEFAULT 18,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE task_templates
  DROP CONSTRAINT IF EXISTS task_templates_due_hour_check;
ALTER TABLE task_templates
  ADD CONSTRAINT task_templates_due_hour_check
  CHECK (due_hour BETWEEN 0 AND 23);


-- ── 2 · Quien puede tocar las plantillas ────────────────────
-- Se borran TODAS las policies vigentes antes de crear las nuevas.
-- El motivo: la 025 cerro esta tabla pero ese archivo nunca quedo en
-- el repo, asi que no se sabe con que nombre quedaron. Borrar por
-- nombre a ciegas dejaria viva una policy permisiva.
DO $tpl_policies$
DECLARE p RECORD;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies
            WHERE schemaname = 'public' AND tablename = 'task_templates' LOOP
    EXECUTE format('DROP POLICY %I ON task_templates', p.policyname);
  END LOOP;
END $tpl_policies$;

ALTER TABLE task_templates ENABLE ROW LEVEL SECURITY;

-- Las Scouters no leen plantillas: leen las tareas ya generadas.
-- generate_recurring_tasks() es DEFINER, asi que no necesita esta
-- policy para verlas.
CREATE POLICY tpl_select ON task_templates
  FOR SELECT TO authenticated USING (app_is_direction());
CREATE POLICY tpl_insert ON task_templates
  FOR INSERT TO authenticated WITH CHECK (app_is_direction());
CREATE POLICY tpl_update ON task_templates
  FOR UPDATE TO authenticated USING (app_is_direction()) WITH CHECK (app_is_direction());
CREATE POLICY tpl_delete ON task_templates
  FOR DELETE TO authenticated USING (app_is_direction());


-- ── 3 · El generador, ahora diario y con huso local ─────────
-- Cambios respecto de la version de la 014:
--   · entiende 'daily'
--   · la fecha de vencimiento se calcula en el huso de la ciudad de
--     cada Scouter, no en UTC
--   · el vencimiento semanal cae el viernes, no el domingo
--
-- La guarda de duplicados sigue siendo la misma (template_id +
-- assigned_to + due_date), que es lo que la vuelve segura de correr
-- muchas veces por dia.
CREATE OR REPLACE FUNCTION generate_recurring_tasks()
RETURNS INT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $gen$
DECLARE
  t   task_templates;
  r   RECORD;
  due TIMESTAMPTZ;
  n   INT := 0;
BEGIN
  FOR t IN SELECT * FROM task_templates
            WHERE active AND recurrence <> 'one_time' LOOP

    FOR r IN
      SELECT s.user_id,
             coalesce(c.timezone, co.timezone, 'UTC') AS tz
      FROM scouters s
      JOIN cities    c  ON c.id  = s.city_id
      JOIN countries co ON co.id = c.country_id
      WHERE s.status = 'active' AND (
            t.target_type = 'network'
        OR (t.target_type = 'user'    AND s.user_id    = t.target_id)
        OR (t.target_type = 'team'    AND s.team_id    = t.target_id)
        OR (t.target_type = 'city'    AND s.city_id    = t.target_id)
        OR (t.target_type = 'country' AND co.id        = t.target_id)
        OR (t.target_type = 'region'  AND co.region_id = t.target_id))
    LOOP
      due := CASE t.recurrence
        WHEN 'daily' THEN
          (date_trunc('day', now() AT TIME ZONE r.tz)
             + make_interval(hours => t.due_hour)) AT TIME ZONE r.tz
        WHEN 'weekly' THEN
          (date_trunc('week', now() AT TIME ZONE r.tz) + INTERVAL '4 days'
             + make_interval(hours => t.due_hour)) AT TIME ZONE r.tz
        WHEN 'monthly' THEN
          (date_trunc('month', now() AT TIME ZONE r.tz) + INTERVAL '1 month' - INTERVAL '1 day'
             + make_interval(hours => t.due_hour)) AT TIME ZONE r.tz
        WHEN 'quarterly' THEN
          (date_trunc('quarter', now() AT TIME ZONE r.tz) + INTERVAL '3 months' - INTERVAL '1 day'
             + make_interval(hours => t.due_hour)) AT TIME ZONE r.tz
      END;

      IF due IS NULL THEN CONTINUE; END IF;

      IF NOT EXISTS (SELECT 1 FROM tasks
                      WHERE template_id = t.id
                        AND assigned_to = r.user_id
                        AND due_date    = due) THEN
        INSERT INTO tasks (template_id, title, description, assigned_to,
                           created_by, type, priority, due_date)
        VALUES (t.id, t.title, t.description, r.user_id, t.created_by,
                t.type, t.priority, due);
        n := n + 1;
      END IF;
    END LOOP;
  END LOOP;

  RETURN n;
END $gen$;


-- ── 4 · El candado: una corrida por dia, la dispare quien la dispare ─
-- Sin pg_cron el disparador es la app: la primera persona de Direccion
-- que abre el Command Center cada manana hace correr el generador.
-- Eso solo funciona si correrlo veinte veces no genera veinte veces.
-- Esta tabla es ese candado.
CREATE TABLE IF NOT EXISTS system_runs (
  job         TEXT PRIMARY KEY,
  last_run_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_result JSONB
);

ALTER TABLE system_runs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sr_read ON system_runs;
CREATE POLICY sr_read ON system_runs
  FOR SELECT TO authenticated USING (app_is_direction());

CREATE OR REPLACE FUNCTION run_daily_maintenance()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $run$
DECLARE
  v_last TIMESTAMPTZ;
  v_n    INT;
  v_res  JSONB;
BEGIN
  SELECT last_run_at INTO v_last FROM system_runs WHERE job = 'daily';

  IF v_last IS NOT NULL AND v_last > now() - INTERVAL '6 hours' THEN
    RETURN jsonb_build_object('ran', false, 'last_run_at', v_last);
  END IF;

  -- Toma del candado. Si dos pestanas entran en el mismo segundo, el
  -- WHERE del DO UPDATE hace que solo una afecte una fila.
  INSERT INTO system_runs (job, last_run_at) VALUES ('daily', now())
  ON CONFLICT (job) DO UPDATE SET last_run_at = now()
  WHERE system_runs.last_run_at < now() - INTERVAL '6 hours';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ran', false, 'reason', 'otra sesión lo tomó');
  END IF;

  v_n   := generate_recurring_tasks();
  v_res := jsonb_build_object('ran', true, 'generated', v_n, 'at', now());

  UPDATE system_runs SET last_result = v_res WHERE job = 'daily';
  RETURN v_res;
END $run$;

GRANT EXECUTE ON FUNCTION run_daily_maintenance() TO authenticated;


-- ── Verificacion ────────────────────────────────────────────
-- 1) Que la plantilla ya acepte 'daily'
SELECT conname, pg_get_constraintdef(oid) AS definicion
FROM pg_constraint
WHERE conrelid = 'task_templates'::regclass AND conname LIKE '%recurrence%';

-- 2) Las cuatro policies, y ninguna abierta
SELECT policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'task_templates'
ORDER BY policyname;

-- 3) Correr el motor a mano una vez. Devuelve cuantas tareas genero.
--    Con cero plantillas cargadas devuelve 0, que es lo correcto.
SELECT run_daily_maintenance();
