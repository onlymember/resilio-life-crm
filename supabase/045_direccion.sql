-- ═══════════════════════════════════════════════════════════
-- 045 · Lo que la directora todavía no podía ver
--
-- DOS PREGUNTAS QUE EL SISTEMA NO CONTESTABA
--
--   1. "¿A quién se le está por acabar el trabajo?"
--      Hoy se ve la cobertura: cuántas colaboraciones hay en los
--      próximos 7 días. Pero la cobertura avisa cuando YA cayó. Lo que
--      hace falta es la PISTA: hasta qué día tiene algo agendado. Una
--      Scouter con 9 colaboraciones todas en los próximos dos días
--      tiene cobertura perfecta y se queda sin nada el miércoles.
--
--   2. "¿Cómo viene cada ciudad comparada con las otras?"
--      El Command Center filtra de a una ciudad. Ver ocho de a una y
--      acordarse de los números no es comparar: es recordar mal.
--
-- POR QUE FUNCIONES NUEVAS Y NO TOCAR network_scouters()
--   network_scouters() anda y la mira la directora todos los días.
--   Agregarle columnas obliga a DROP + CREATE (no se puede cambiar el
--   tipo de retorno con CREATE OR REPLACE) y a que el cliente siga el
--   cambio en el mismo deploy. Dos funciones nuevas no rompen nada y se
--   pueden borrar si no sirven.
--
-- SEGURIDAD
--   Las dos son SECURITY INVOKER. Una City Lead ve su ciudad y
--   Dirección las ve todas, sin una línea de código distinta: lo
--   resuelve RLS, como el resto del sistema.
-- ═══════════════════════════════════════════════════════════


-- ── a · La pista de cada Scouter ────────────────────────────
-- runway_days = cuántos días faltan para la colaboración confirmada más
-- lejana. Es la pregunta que importa: no "cuántas tenés" sino "hasta
-- cuándo llegás".
--
-- Las fechas se calculan en el huso de cada ciudad. Para la de Madrid
-- "hoy" no es el mismo día que para la de Rosario, y una pista de 1 día
-- contra una de 2 es exactamente la diferencia entre llamar hoy o no.
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
                    p.email)                        AS nombre,
           c.name                                   AS ciudad,
           coalesce(c.timezone, co.timezone, 'UTC') AS tz
    FROM scouters s
    JOIN profiles  p  ON p.id  = s.user_id
    LEFT JOIN cities    c  ON c.id  = s.city_id
    LEFT JOIN countries co ON co.id = c.country_id
    WHERE s.status = 'active'
  )
  SELECT b.user_id,
         b.nombre,
         coalesce(b.ciudad, '— sin ciudad —'),

         (SELECT count(*)::INT FROM collaborations co2
           WHERE co2.scouter_id = b.user_id
             AND co2.status IN ('confirmed','in_progress')
             AND co2.start_date BETWEEN (now() AT TIME ZONE b.tz)::date
                                    AND (now() AT TIME ZONE b.tz)::date + 7),

         coalesce((SELECT (max(co3.start_date) - (now() AT TIME ZONE b.tz)::date)::INT
                     FROM collaborations co3
                    WHERE co3.scouter_id = b.user_id
                      AND co3.status IN ('confirmed','in_progress')
                      AND co3.start_date >= (now() AT TIME ZONE b.tz)::date), 0),

         (SELECT count(*)::INT FROM (
            SELECT 1 FROM influencers i
             WHERE i.owner_scouter_id = b.user_id AND i.next_action_at < now()
            UNION ALL
            SELECT 1 FROM brands br
             WHERE br.owner_scouter_id = b.user_id AND br.next_action_at < now()
          ) v),

         (SELECT count(*)::INT FROM (
            SELECT 1 FROM influencers i
             WHERE i.owner_scouter_id = b.user_id AND i.next_action_at IS NULL
            UNION ALL
            SELECT 1 FROM brands br
             WHERE br.owner_scouter_id = b.user_id AND br.next_action_at IS NULL
          ) w),

         -- El umbral sale del plan: la meta era trabajar con una semana
         -- de anticipación, y tres días el mínimo aceptable.
         CASE
           WHEN coalesce((SELECT (max(co4.start_date) - (now() AT TIME ZONE b.tz)::date)::INT
                            FROM collaborations co4
                           WHERE co4.scouter_id = b.user_id
                             AND co4.status IN ('confirmed','in_progress')
                             AND co4.start_date >= (now() AT TIME ZONE b.tz)::date), 0) >= 7
             THEN 'ok'
           WHEN coalesce((SELECT (max(co5.start_date) - (now() AT TIME ZONE b.tz)::date)::INT
                            FROM collaborations co5
                           WHERE co5.scouter_id = b.user_id
                             AND co5.status IN ('confirmed','in_progress')
                             AND co5.start_date >= (now() AT TIME ZONE b.tz)::date), 0) >= 3
             THEN 'bajo'
           ELSE 'critico'
         END
  FROM base b
  ORDER BY 5 ASC, 2;
$coverage_runway$;


-- ── b · Las ciudades, lado a lado ───────────────────────────
-- Un renglón por ciudad, con lo mismo medido igual. Sirve para decidir
-- dónde poner energía, que es la única decisión que la directora toma
-- todas las semanas.
--
-- El período aplica solo a lo que PASÓ (colaboraciones cerradas y
-- fichas nuevas). Lo que está abierto —oportunidades, cobertura, fichas
-- sin agenda— es una foto de ahora: filtrarlo por fecha daría un número
-- que no significa nada.
CREATE OR REPLACE FUNCTION city_comparison(
  p_from DATE DEFAULT (CURRENT_DATE - 30),
  p_to   DATE DEFAULT CURRENT_DATE
) RETURNS TABLE (
  city_id        UUID,
  ciudad         TEXT,
  pais           TEXT,
  scouters       INT,
  influencers    INT,
  marcas         INT,
  oportunidades  INT,
  colaboraciones INT,
  coverage_7d    INT,
  sin_agenda     INT,
  nuevas_fichas  INT
) LANGUAGE sql STABLE AS $city_comparison$
  SELECT c.id,
         c.name,
         co.name,
         (SELECT count(*)::INT FROM scouters s
           WHERE s.city_id = c.id AND s.status = 'active'),
         (SELECT count(*)::INT FROM influencers i
           WHERE i.city_id = c.id AND i.status = 'active'),
         (SELECT count(*)::INT FROM brands b
           WHERE b.city_id = c.id AND b.status = 'active'),
         (SELECT count(*)::INT FROM opportunities o
           WHERE o.city_id = c.id AND o.status NOT IN ('won','lost')),
         (SELECT count(*)::INT FROM collaborations cl
           WHERE cl.city_id = c.id
             AND cl.start_date BETWEEN p_from AND p_to),
         (SELECT count(*)::INT FROM collaborations cl2
           WHERE cl2.city_id = c.id
             AND cl2.status IN ('confirmed','in_progress')
             AND cl2.start_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 7),
         (SELECT count(*)::INT FROM (
            SELECT 1 FROM influencers i2 WHERE i2.city_id = c.id AND i2.next_action_at IS NULL
            UNION ALL
            SELECT 1 FROM brands b2      WHERE b2.city_id = c.id AND b2.next_action_at IS NULL
          ) z),
         (SELECT count(*)::INT FROM (
            SELECT 1 FROM influencers i3
             WHERE i3.city_id = c.id AND i3.created_at::date BETWEEN p_from AND p_to
            UNION ALL
            SELECT 1 FROM brands b3
             WHERE b3.city_id = c.id AND b3.created_at::date BETWEEN p_from AND p_to
          ) y)
  FROM cities c
  LEFT JOIN countries co ON co.id = c.country_id
  WHERE c.active
    -- Una ciudad sin nadie no es una ciudad abierta: es una fila del
    -- catálogo. Mostrarla llenaría el cuadro de ceros.
    AND EXISTS (SELECT 1 FROM scouters s2 WHERE s2.city_id = c.id AND s2.status = 'active')
  ORDER BY 8 DESC, 2;
$city_comparison$;


-- ── Verificacion ────────────────────────────────────────────
-- 1) Quien se esta quedando sin pista. Las 'critico' arriba.
SELECT nombre, ciudad, coverage_7d, runway_days, overdue, sin_agenda, nivel
FROM coverage_runway();

-- 2) Las ciudades, lado a lado, ultimos 30 dias.
SELECT * FROM city_comparison();
