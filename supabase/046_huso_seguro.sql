-- ═══════════════════════════════════════════════════════════
-- 046 · Un huso mal escrito no puede tumbar el sistema
--
-- QUE PASO
--   Al correr la 045 saltó:
--     ERROR 22023: time zone "Europa/España/Barcelona" not recognized
--
--   Alguien cargó ese texto a mano en una ciudad. No es un nombre IANA
--   válido — el de Barcelona es 'Europe/Madrid'.
--
-- POR QUE IMPORTA MUCHO MAS QUE LA 045
--   Ese campo no lo lee solo la función nueva. Lo leen:
--     · my_timezone()             → la agenda de esa Scouter
--     · next_free_slot()          → repartirle fichas
--     · generate_recurring_tasks()→ sus tareas diarias
--     · advance_follow_up()       → cerrar un seguimiento
--     · my_agenda(), my_network_stats()
--
--   O sea que Barcelona está rota AHORA en todo el sistema, y el error
--   solo apareció hoy porque la 045 fue la primera consulta que recorre
--   todas las ciudades juntas. Las funciones de una sola persona fallan
--   en silencio para ella y nadie se entera.
--
-- LAS DOS MITADES
--   a) safe_tz()  — el código deja de confiar en ese campo. Un huso
--      inválido degrada a un default en vez de tumbar la consulta.
--   b) el dato    — igual hay que corregirlo: con el fallback, la
--      Scouter de Barcelona trabajaría en hora de otro lado.
--
-- SEGURIDAD: no toca permisos. safe_tz() no lee ninguna tabla de
-- negocio. La corrección de datos está al final y es explícita.
-- ═══════════════════════════════════════════════════════════


-- ── a · La red de contención ────────────────────────────────
-- Se prueba el huso contra una fecha fija y se atrapa el error. Es más
-- barato que consultar pg_timezone_names, que arma la lista entera de
-- zonas en cada llamada, y esto se llama una vez por fila.
--
-- IMMUTABLE es honesto acá: para un mismo texto la respuesta no cambia,
-- porque la fecha de prueba es constante.
CREATE OR REPLACE FUNCTION safe_tz(p_tz TEXT, p_fallback TEXT DEFAULT 'UTC')
RETURNS TEXT LANGUAGE plpgsql IMMUTABLE AS $safe_tz$
BEGIN
  IF p_tz IS NULL OR btrim(p_tz) = '' THEN
    RETURN p_fallback;
  END IF;
  PERFORM timestamptz '2000-01-01 00:00:00+00' AT TIME ZONE p_tz;
  RETURN p_tz;
EXCEPTION WHEN OTHERS THEN
  RETURN p_fallback;
END $safe_tz$;


-- ── b · Las funciones que leen el campo ─────────────────────

-- my_timezone() es la de más arriba en la cadena: todo lo que llama a
-- my_timezone() queda cubierto de una.
CREATE OR REPLACE FUNCTION my_timezone()
RETURNS TEXT LANGUAGE sql STABLE AS $my_timezone$
  SELECT safe_tz(
    (SELECT coalesce(c.timezone, co.timezone)
       FROM scouters s
       LEFT JOIN cities    c  ON c.id  = s.city_id
       LEFT JOIN countries co ON co.id = c.country_id
      WHERE s.user_id = auth.uid()
      LIMIT 1),
    'America/Argentina/Buenos_Aires');
$my_timezone$;


-- next_free_slot() lee la ciudad directo, no vía my_timezone().
CREATE OR REPLACE FUNCTION next_free_slot(p_owner UUID, p_cap INT DEFAULT 20)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $slot$
DECLARE
  v_tz  TEXT;
  v_day DATE;
  v_n   INT;
  i     INT;
BEGIN
  SELECT coalesce(c.timezone, co.timezone) INTO v_tz
  FROM scouters s
  JOIN cities    c  ON c.id  = s.city_id
  JOIN countries co ON co.id = c.country_id
  WHERE s.user_id = p_owner;

  v_tz := safe_tz(v_tz, coalesce(my_timezone(), 'UTC'));

  FOR i IN 1..180 LOOP
    v_day := (now() AT TIME ZONE v_tz)::date + i;

    SELECT count(*) INTO v_n FROM (
      SELECT next_action_at FROM influencers
        WHERE owner_scouter_id = p_owner AND next_action_at IS NOT NULL
      UNION ALL
      SELECT next_action_at FROM brands
        WHERE owner_scouter_id = p_owner AND next_action_at IS NOT NULL
    ) x
    WHERE (x.next_action_at AT TIME ZONE v_tz)::date = v_day;

    IF v_n < p_cap THEN
      RETURN (v_day + TIME '10:00') AT TIME ZONE v_tz;
    END IF;
  END LOOP;

  RETURN (((now() AT TIME ZONE v_tz)::date + 181) + TIME '10:00') AT TIME ZONE v_tz;
END $slot$;


-- El generador de tareas recorre TODAS las Scouters activas: una
-- ciudad con el huso mal escrito cortaba la generación de todas.
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
             safe_tz(coalesce(c.timezone, co.timezone), 'UTC') AS tz
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


-- Y la 045, que fue la que destapó todo.
CREATE OR REPLACE FUNCTION coverage_runway()
RETURNS TABLE (
  user_id        UUID,
  nombre         TEXT,
  ciudad         TEXT,
  coverage_7d    INT,
  runway_days    INT,
  overdue        INT,
  sin_agenda     INT,
  nivel          TEXT
) LANGUAGE sql STABLE AS $coverage_runway$
  WITH base AS (
    SELECT s.user_id,
           coalesce(nullif(btrim(p.sobrenombre), ''),
                    nullif(btrim(p.nombre), ''),
                    p.email)                                  AS nombre,
           c.name                                             AS ciudad,
           safe_tz(coalesce(c.timezone, co.timezone), 'UTC')  AS tz
    FROM scouters s
    JOIN profiles  p  ON p.id  = s.user_id
    LEFT JOIN cities    c  ON c.id  = s.city_id
    LEFT JOIN countries co ON co.id = c.country_id
    WHERE s.status = 'active'
  ),
  calc AS (
    SELECT b.*,
           (SELECT count(*)::INT FROM collaborations co2
             WHERE co2.scouter_id = b.user_id
               AND co2.status IN ('confirmed','in_progress')
               AND co2.start_date BETWEEN (now() AT TIME ZONE b.tz)::date
                                      AND (now() AT TIME ZONE b.tz)::date + 7) AS cov,
           coalesce((SELECT (max(co3.start_date) - (now() AT TIME ZONE b.tz)::date)::INT
                       FROM collaborations co3
                      WHERE co3.scouter_id = b.user_id
                        AND co3.status IN ('confirmed','in_progress')
                        AND co3.start_date >= (now() AT TIME ZONE b.tz)::date), 0) AS runway,
           (SELECT count(*)::INT FROM (
              SELECT 1 FROM influencers i
               WHERE i.owner_scouter_id = b.user_id AND i.next_action_at < now()
              UNION ALL
              SELECT 1 FROM brands br
               WHERE br.owner_scouter_id = b.user_id AND br.next_action_at < now()
            ) v) AS venc,
           (SELECT count(*)::INT FROM (
              SELECT 1 FROM influencers i
               WHERE i.owner_scouter_id = b.user_id AND i.next_action_at IS NULL
              UNION ALL
              SELECT 1 FROM brands br
               WHERE br.owner_scouter_id = b.user_id AND br.next_action_at IS NULL
            ) w) AS sin_ag
    FROM base b
  )
  -- El CTE además saca las tres subconsultas repetidas que tenía la
  -- versión anterior para calcular el nivel: el mismo número se
  -- calculaba cuatro veces por Scouter.
  SELECT user_id, nombre, coalesce(ciudad, '— sin ciudad —'),
         cov, runway, venc, sin_ag,
         CASE WHEN runway >= 7 THEN 'ok'
              WHEN runway >= 3 THEN 'bajo'
              ELSE 'critico' END
  FROM calc
  ORDER BY runway ASC, nombre;
$coverage_runway$;


-- ── c · El dato ─────────────────────────────────────────────
-- La red de contención evita que el sistema se caiga, pero con el
-- fallback la Scouter de Barcelona trabajaría en hora de otro lado.
-- Esto hay que corregirlo igual.

-- 1) Quién tiene un huso que PostgreSQL no reconoce. Cero filas es lo
--    correcto DESPUES de la corrección.
SELECT 'city' AS tipo, c.id, c.name, c.timezone
FROM cities c
WHERE c.timezone IS NOT NULL AND safe_tz(c.timezone, '@@') = '@@'
UNION ALL
SELECT 'country', co.id, co.name, co.timezone
FROM countries co
WHERE co.timezone IS NOT NULL AND safe_tz(co.timezone, '@@') = '@@';

-- 2) La corrección de Barcelona. Descomentar y correr.
-- UPDATE cities SET timezone = 'Europe/Madrid'
--  WHERE timezone = 'Europa/España/Barcelona';

-- 3) Para cualquier otra que aparezca, el nombre correcto sale de acá:
-- SELECT name FROM pg_timezone_names WHERE name ILIKE '%madrid%' ORDER BY name;
