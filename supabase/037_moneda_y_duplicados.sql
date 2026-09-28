-- ═══════════════════════════════════════════════════════════
-- 037 · Moneda, Scouters inactivas y duplicados entre ciudades
--
--   a) scouter_performance() devuelve el valor AGRUPADO POR MONEDA.
--      Hoy hace sum(amount) sin agrupar: con Miami en dolares,
--      Barcelona en euros y Argentina en pesos, ese numero es la suma
--      de tres unidades distintas. Se agrega value_by_currency y se
--      deja value para no romper lo que ya lo lee.
--
--   b) network_scouters() deja de mezclar a las dadas de baja. Toma un
--      parametro para incluirlas cuando haga falta, y ademas devuelve
--      la cobertura, que se agrego en el 034.
--
--   c) check_duplicate() avisa si un influencer o una marca ya existe
--      en la red, SIN devolver la ficha. Hoy el aviso de duplicado
--      compara contra lo que cada Scouter puede ver, y RLS le oculta
--      lo de las demas: dos Scouters cargan a la misma persona y a
--      ninguna se le avisa. Con ciudades que comparten area
--      metropolitana eso pasa todo el tiempo.
--
--      Es SECURITY DEFINER a proposito y devuelve lo minimo: si existe
--      y en que ciudad. Mismo patron que las funciones app_can_see_*.
-- ═══════════════════════════════════════════════════════════


-- ── a · El valor, por moneda ────────────────────────────────
CREATE OR REPLACE FUNCTION scouter_performance(
  p_user UUID,
  p_from DATE DEFAULT (CURRENT_DATE - 30),
  p_to   DATE DEFAULT CURRENT_DATE
) RETURNS JSONB LANGUAGE sql STABLE AS $scouter_performance$
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
          AND created_at::date BETWEEN p_from AND p_to),
      'value_by_currency', (
        SELECT coalesce(jsonb_object_agg(moneda, total), '{}'::jsonb)
        FROM (
          SELECT upper(coalesce(nullif(btrim(currency), ''), '?')) AS moneda,
                 sum(amount) AS total
          FROM collaborations
          WHERE scouter_id = p_user AND status = 'completed'
            AND amount IS NOT NULL
            AND created_at::date BETWEEN p_from AND p_to
          GROUP BY 1
        ) z)
    )
  );
$scouter_performance$;


-- ── b · Scouters, sin las dadas de baja ─────────────────────
DROP FUNCTION IF EXISTS public.network_scouters(uuid, uuid, uuid);

CREATE FUNCTION public.network_scouters(
  p_city    uuid DEFAULT NULL::uuid,
  p_country uuid DEFAULT NULL::uuid,
  p_region  uuid DEFAULT NULL::uuid,
  p_include_inactive boolean DEFAULT false
)
RETURNS TABLE(
  user_id        uuid,
  nombre         text,
  email          text,
  ciudad         text,
  pais           text,
  city_id        uuid,
  level          integer,
  status         text,
  joined_at      date,
  influencers    bigint,
  brands         bigint,
  opportunities  bigint,
  tasks_open     bigint,
  tasks_overdue  bigint,
  last_activity  timestamp with time zone,
  days_inactive  integer,
  coverage       bigint,
  collabs_month  bigint
)
LANGUAGE sql
STABLE
AS $network_scouters$
  SELECT s.user_id,
         coalesce(
           nullif(btrim(p.sobrenombre), ''),
           nullif(btrim(p.nombre),      ''),
           nullif(btrim(p.email),       ''),
           'Sin nombre'
         ),
         p.email, c.name, co.name, s.city_id,
         s.level, s.status, s.joined_at,
         (SELECT count(*) FROM influencers   i WHERE i.owner_scouter_id = s.user_id),
         (SELECT count(*) FROM brands        b WHERE b.owner_scouter_id = s.user_id),
         (SELECT count(*) FROM opportunities o WHERE o.owner_scouter_id = s.user_id
                                            AND o.status NOT IN ('won','lost')),
         (SELECT count(*) FROM tasks t WHERE t.assigned_to = s.user_id
                                    AND t.status NOT IN ('completed','cancelled')),
         (SELECT count(*) FROM tasks t WHERE t.assigned_to = s.user_id
                                    AND t.status NOT IN ('completed','cancelled')
                                    AND t.due_date < now()),
         (SELECT max(a.occurred_at) FROM activities a WHERE a.actor_id = s.user_id),
         (CURRENT_DATE - coalesce(
            (SELECT max(a.occurred_at)::date FROM activities a WHERE a.actor_id = s.user_id),
            s.joined_at))::int,
         (SELECT count(*) FROM collaborations cl
           WHERE cl.scouter_id = s.user_id
             AND cl.status IN ('confirmed','in_progress')
             AND cl.start_date IS NOT NULL
             AND cl.start_date::date BETWEEN CURRENT_DATE AND CURRENT_DATE + 7),
         (SELECT count(*) FROM collaborations cl
           WHERE cl.scouter_id = s.user_id
             AND cl.status IN ('content_pending','completed')
             AND cl.start_date::date >= date_trunc('month', CURRENT_DATE)::date)
  FROM scouters s
  JOIN profiles p  ON p.id  = s.user_id
  JOIN cities   c  ON c.id  = s.city_id
  JOIN countries co ON co.id = c.country_id
  WHERE (p_include_inactive OR s.status = 'active')
    AND (p_city    IS NULL OR s.city_id     = p_city)
    AND (p_country IS NULL OR c.country_id  = p_country)
    AND (p_region  IS NULL OR co.region_id  = p_region)
  ORDER BY 2;
$network_scouters$;


-- ── c · Duplicados en toda la red ───────────────────────────
CREATE OR REPLACE FUNCTION check_duplicate(
  p_type      TEXT,
  p_instagram TEXT DEFAULT NULL,
  p_email     TEXT DEFAULT NULL,
  p_name      TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $check_duplicate$
DECLARE
  v_ig    TEXT := nullif(lower(btrim(replace(coalesce(p_instagram,''), '@', ''))), '');
  v_mail  TEXT := nullif(lower(btrim(coalesce(p_email,''))), '');
  v_name  TEXT := nullif(lower(btrim(coalesce(p_name,''))), '');
  v_city  TEXT;
  v_mine  BOOLEAN := FALSE;
BEGIN
  IF p_type = 'influencer' THEN
    SELECT c.name, (i.owner_scouter_id = auth.uid())
      INTO v_city, v_mine
    FROM influencers i LEFT JOIN cities c ON c.id = i.city_id
    WHERE (v_ig   IS NOT NULL AND lower(replace(coalesce(i.instagram,''), '@','')) = v_ig)
       OR (v_mail IS NOT NULL AND lower(coalesce(i.email,'')) = v_mail)
    LIMIT 1;
  ELSE
    SELECT c.name, (b.owner_scouter_id = auth.uid())
      INTO v_city, v_mine
    FROM brands b LEFT JOIN cities c ON c.id = b.city_id
    WHERE (v_mail IS NOT NULL AND lower(coalesce(b.email,'')) = v_mail)
       OR (v_name IS NOT NULL AND lower(btrim(b.name)) = v_name)
    LIMIT 1;
  END IF;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('exists', false);
  END IF;

  RETURN jsonb_build_object(
    'exists', true,
    'city',   coalesce(v_city, 'sin ciudad'),
    'mine',   coalesce(v_mine, false));
END $check_duplicate$;


-- ── Verificacion ────────────────────────────────────────────
SELECT nombre, ciudad, status, coverage
FROM network_scouters()
ORDER BY nombre;
