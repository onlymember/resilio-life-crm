-- ═══════════════════════════════════════════════════════════
-- 034 · La operacion de agenda
--
-- Habilita el modelo de mas de una colaboracion por Scouter por dia.
-- Cuatro cambios, todos sobre funciones que ya existen.
--
--   a) my_agenda() incluye colaboraciones. Hoy une tareas, influencers,
--      marcas y oportunidades: una Scouter con nueve colaboraciones en
--      vuelo abre el Home y no ve ninguna, aunque todas tengan su
--      proxima accion cargada. Todo el modelo descansa en que el
--      trabajo del dia aparezca solo en la pantalla.
--
--   b) De paso, la rama de marcas leia whatsapp y phone del JSONB
--      `data`. La migracion 027 les dio columnas propias, asi que
--      desde entonces el boton de WhatsApp no aparecia para ninguna
--      marca cargada con el formulario nuevo. Se lee de las dos.
--
--   c) my_network_stats() suma la COBERTURA: colaboraciones
--      confirmadas con fecha en los proximos 7 dias. Es el unico
--      numero que predice si el mes va a salir, porque las ejecutadas
--      miden un pasado que ya no se puede corregir.
--
--   d) network_scouters() suma la misma cobertura por Scouter, para
--      que la directora lea las ocho de un vistazo.
--
--   e) complete_next_action() y set_next_action() aceptan
--      'collaboration'. Sin esto, completar una colaboracion desde la
--      agenda falla con "entity_type invalido".
--
-- SEGURIDAD: todas siguen siendo SECURITY INVOKER. Cada usuario ve lo
-- suyo por RLS, sin una linea de codigo distinta segun el rol.
-- ═══════════════════════════════════════════════════════════


-- ── a + b · La agenda ───────────────────────────────────────
CREATE OR REPLACE FUNCTION my_agenda(
  p_days_ahead INT DEFAULT 7
) RETURNS TABLE (
  kind        TEXT,
  entity_type TEXT,
  entity_id   UUID,
  title       TEXT,
  subtitle    TEXT,
  due_at      TIMESTAMPTZ,
  priority    TEXT,
  is_overdue  BOOLEAN,
  is_today    BOOLEAN,
  whatsapp    TEXT,
  instagram   TEXT,
  phone       TEXT
) LANGUAGE sql STABLE AS $my_agenda$
  SELECT 'task', 'task', t.id, t.title,
         coalesce(t.description, ''), t.due_date,
         t.priority,
         (t.due_date IS NOT NULL AND t.due_date < now()),
         (t.due_date::date = CURRENT_DATE),
         NULL::TEXT, NULL::TEXT, NULL::TEXT
  FROM tasks t
  WHERE t.assigned_to = auth.uid()
    AND t.status NOT IN ('completed','cancelled')
    AND (t.due_date IS NULL OR t.due_date::date <= CURRENT_DATE + p_days_ahead)

  UNION ALL
  SELECT 'next_action', 'influencer', i.id,
         coalesce(i.next_action, 'Seguimiento'),
         i.name, i.next_action_at, 'normal',
         (i.next_action_at < now()),
         (i.next_action_at::date = CURRENT_DATE),
         i.whatsapp, i.instagram, i.phone
  FROM influencers i
  WHERE i.next_action_at IS NOT NULL
    AND i.status = 'active'
    AND i.next_action_at::date <= CURRENT_DATE + p_days_ahead

  UNION ALL
  SELECT 'next_action', 'brand', b.id,
         coalesce(b.next_action, 'Seguimiento'),
         b.name, b.next_action_at, 'normal',
         (b.next_action_at < now()),
         (b.next_action_at::date = CURRENT_DATE),
         coalesce(b.whatsapp,  b.data->>'whatsapp'),
         coalesce(b.instagram, b.data->>'instagram'),
         coalesce(b.phone,     b.data->>'phone')
  FROM brands b
  WHERE b.next_action_at IS NOT NULL
    AND b.status = 'active'
    AND b.next_action_at::date <= CURRENT_DATE + p_days_ahead

  UNION ALL
  SELECT 'next_action', 'opportunity', o.id,
         coalesce(o.next_action, 'Seguimiento'),
         o.title, o.next_action_at, 'normal',
         (o.next_action_at < now()),
         (o.next_action_at::date = CURRENT_DATE),
         NULL::TEXT, NULL::TEXT, NULL::TEXT
  FROM opportunities o
  WHERE o.next_action_at IS NOT NULL
    AND o.status NOT IN ('won','lost')
    AND o.next_action_at::date <= CURRENT_DATE + p_days_ahead

  UNION ALL
  SELECT 'next_action', 'collaboration', c.id,
         coalesce(c.next_action, 'Colaboración'),
         concat_ws(' · ', b2.name, i2.name),
         c.next_action_at, 'normal',
         (c.next_action_at < now()),
         (c.next_action_at::date = CURRENT_DATE),
         coalesce(i2.whatsapp,  b2.whatsapp),
         coalesce(i2.instagram, b2.instagram),
         coalesce(i2.phone,     b2.phone)
  FROM collaborations c
  LEFT JOIN brands      b2 ON b2.id = c.brand_id
  LEFT JOIN influencers i2 ON i2.id = c.influencer_id
  WHERE c.next_action_at IS NOT NULL
    AND c.status NOT IN ('completed','cancelled')
    AND c.next_action_at::date <= CURRENT_DATE + p_days_ahead

  ORDER BY 8 DESC, 6 ASC NULLS LAST;
$my_agenda$;


-- ── c · La cobertura en el Home ─────────────────────────────
CREATE OR REPLACE FUNCTION my_network_stats()
RETURNS JSONB LANGUAGE sql STABLE AS $my_network_stats$
  SELECT jsonb_build_object(
    'influencers',      (SELECT count(*) FROM influencers
                          WHERE owner_scouter_id = auth.uid()),
    'brands',           (SELECT count(*) FROM brands
                          WHERE owner_scouter_id = auth.uid()),
    'opportunities',    (SELECT count(*) FROM opportunities
                          WHERE owner_scouter_id = auth.uid()
                            AND status NOT IN ('won','lost')),
    'collaborations',   (SELECT count(*) FROM collaborations
                          WHERE scouter_id = auth.uid()
                            AND status IN ('confirmed','in_progress','content_pending')),
    'coverage_7d',      (SELECT count(*) FROM collaborations
                          WHERE scouter_id = auth.uid()
                            AND status IN ('confirmed','in_progress')
                            AND start_date IS NOT NULL
                            AND start_date::date BETWEEN CURRENT_DATE AND CURRENT_DATE + 7),
    'collabs_week',     (SELECT count(*) FROM collaborations
                          WHERE scouter_id = auth.uid()
                            AND status IN ('content_pending','completed')
                            AND start_date::date >= date_trunc('week', CURRENT_DATE)::date),
    'content_pending',  (SELECT count(*) FROM collaborations
                          WHERE scouter_id = auth.uid()
                            AND status = 'content_pending'),
    'tasks_today',      (SELECT count(*) FROM tasks
                          WHERE assigned_to = auth.uid()
                            AND status NOT IN ('completed','cancelled')
                            AND due_date::date = CURRENT_DATE),
    'tasks_overdue',    (SELECT count(*) FROM tasks
                          WHERE assigned_to = auth.uid()
                            AND status NOT IN ('completed','cancelled')
                            AND due_date < now()),
    'followups_today',  (SELECT count(*) FROM (
                          SELECT next_action_at FROM influencers
                            WHERE next_action_at::date = CURRENT_DATE AND status='active'
                          UNION ALL
                          SELECT next_action_at FROM brands
                            WHERE next_action_at::date = CURRENT_DATE AND status='active'
                          UNION ALL
                          SELECT next_action_at FROM collaborations
                            WHERE next_action_at::date = CURRENT_DATE
                              AND status NOT IN ('completed','cancelled')
                        ) x),
    'followups_overdue',(SELECT count(*) FROM (
                          SELECT next_action_at FROM influencers
                            WHERE next_action_at < now() AND status='active'
                          UNION ALL
                          SELECT next_action_at FROM brands
                            WHERE next_action_at < now() AND status='active'
                          UNION ALL
                          SELECT next_action_at FROM collaborations
                            WHERE next_action_at < now()
                              AND status NOT IN ('completed','cancelled')
                        ) y)
  );
$my_network_stats$;


-- ── d · La cobertura por Scouter ────────────────────────────
-- Va DROP + CREATE y no CREATE OR REPLACE: agregar una columna cambia
-- el tipo de retorno, y reemplazar no puede hacerlo.
DROP FUNCTION IF EXISTS public.network_scouters(uuid, uuid, uuid);

CREATE FUNCTION public.network_scouters(
  p_city    uuid DEFAULT NULL::uuid,
  p_country uuid DEFAULT NULL::uuid,
  p_region  uuid DEFAULT NULL::uuid
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
  WHERE (p_city    IS NULL OR s.city_id     = p_city)
    AND (p_country IS NULL OR c.country_id  = p_country)
    AND (p_region  IS NULL OR co.region_id  = p_region)
  ORDER BY 2;
$network_scouters$;


-- ── e · Completar y agendar una colaboracion ────────────────
CREATE OR REPLACE FUNCTION complete_next_action(
  p_entity_type TEXT,
  p_entity_id   UUID,
  p_activity_type TEXT DEFAULT 'follow_up',
  p_note        TEXT DEFAULT NULL
) RETURNS VOID LANGUAGE plpgsql AS $complete_next_action$
DECLARE v_action TEXT; v_name TEXT; v_tbl TEXT; v_name_expr TEXT; v_n INT;
BEGIN
  IF p_entity_type NOT IN ('influencer','brand','opportunity','collaboration') THEN
    RAISE EXCEPTION 'entity_type inválido: %', p_entity_type;
  END IF;

  v_tbl := CASE p_entity_type
             WHEN 'influencer'    THEN 'influencers'
             WHEN 'brand'         THEN 'brands'
             WHEN 'opportunity'   THEN 'opportunities'
             ELSE 'collaborations' END;

  v_name_expr := CASE p_entity_type
             WHEN 'opportunity'   THEN 'title'
             WHEN 'collaboration' THEN '(SELECT b.name FROM brands b WHERE b.id = brand_id)'
             ELSE 'name' END;

  EXECUTE format(
    'UPDATE %I SET next_action = NULL, next_action_at = NULL
      WHERE id = $1
      RETURNING coalesce(next_action, %L), %s',
      v_tbl, 'Seguimiento', v_name_expr)
  INTO v_action, v_name USING p_entity_id;

  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n = 0 THEN
    RAISE EXCEPTION 'No se pudo completar: el registro no existe o no tenés permiso.';
  END IF;

  INSERT INTO activities (actor_id, entity_type, entity_id, type, title, description)
  VALUES (auth.uid(), p_entity_type, p_entity_id, p_activity_type,
          coalesce(v_action, 'Seguimiento completado'), p_note);
END $complete_next_action$;


CREATE OR REPLACE FUNCTION set_next_action(
  p_entity_type TEXT,
  p_entity_id   UUID,
  p_action      TEXT,
  p_at          TIMESTAMPTZ
) RETURNS VOID LANGUAGE plpgsql AS $set_next_action$
DECLARE v_tbl TEXT; v_n INT;
BEGIN
  IF p_entity_type NOT IN ('influencer','brand','opportunity','collaboration') THEN
    RAISE EXCEPTION 'entity_type inválido: %', p_entity_type;
  END IF;

  v_tbl := CASE p_entity_type
             WHEN 'influencer'    THEN 'influencers'
             WHEN 'brand'         THEN 'brands'
             WHEN 'opportunity'   THEN 'opportunities'
             ELSE 'collaborations' END;

  EXECUTE format('UPDATE %I SET next_action = $1, next_action_at = $2 WHERE id = $3', v_tbl)
    USING p_action, p_at, p_entity_id;

  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n = 0 THEN
    RAISE EXCEPTION 'No se pudo agendar: el registro no existe o no tenés permiso.';
  END IF;
END $set_next_action$;


-- ── Indice para la cobertura ────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_collab_coverage
  ON collaborations (scouter_id, start_date)
  WHERE status IN ('confirmed','in_progress');


-- ── Verificacion ────────────────────────────────────────────
-- Cobertura de cada Scouter, que es el numero que la directora mira
-- todos los dias. Meta: 9 o mas.
SELECT nombre, ciudad, coverage AS cobertura_7d, collabs_month AS colaboraciones_mes
FROM network_scouters()
ORDER BY coverage;
