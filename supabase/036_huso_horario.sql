-- ═══════════════════════════════════════════════════════════
-- 036 · El dia se calcula en la ciudad de cada uno
--
-- QUE PASABA
--   Las funciones de agenda y metricas usaban CURRENT_DATE. La sesion
--   de Supabase corre en UTC, asi que "hoy" era el dia UTC y no el de
--   la Scouter.
--
--     Barcelona  +2   el sistema cambiaba de dia a las 22:00 locales
--     Rosario    -3   a las 21:00
--     Miami      -4   a las 20:00
--
--   Todos los dias, en cada ciudad, habia una ventana de dos a cuatro
--   horas en que el bloque HOY mostraba lo de manana. Sobre esa fecha
--   se calculan la cobertura, is_today y la ventana de siete dias.
--
-- COMO SE ARREGLA
--   Cada funcion resuelve el huso de quien la llama, desde la ciudad
--   de su fila en scouters, con fallback al pais. El cliente ya hacia
--   esto para formatear; ahora el servidor coincide.
--
--   is_overdue NO cambia: compara instantes con now(), que no depende
--   del huso y ya estaba bien.
--
-- El ultimo fallback es Buenos Aires y no UTC a proposito: es el mismo
-- DEFAULT_TZ que usa el cliente. Que las dos capas coincidan importa
-- mas que elegir un default neutro.
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION my_timezone()
RETURNS TEXT LANGUAGE sql STABLE AS $my_timezone$
  SELECT coalesce(
    (SELECT coalesce(c.timezone, co.timezone)
       FROM scouters s
       LEFT JOIN cities    c  ON c.id  = s.city_id
       LEFT JOIN countries co ON co.id = c.country_id
      WHERE s.user_id = auth.uid()
      LIMIT 1),
    'America/Argentina/Buenos_Aires');
$my_timezone$;


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
  WITH hoy AS (
    SELECT my_timezone() AS tz,
           (now() AT TIME ZONE my_timezone())::date AS d
  )
  SELECT 'task', 'task', t.id, t.title,
         coalesce(t.description, ''), t.due_date,
         t.priority,
         (t.due_date IS NOT NULL AND t.due_date < now()),
         ((t.due_date AT TIME ZONE h.tz)::date = h.d),
         NULL::TEXT, NULL::TEXT, NULL::TEXT
  FROM tasks t CROSS JOIN hoy h
  WHERE t.assigned_to = auth.uid()
    AND t.status NOT IN ('completed','cancelled')
    AND (t.due_date IS NULL OR (t.due_date AT TIME ZONE h.tz)::date <= h.d + p_days_ahead)

  UNION ALL
  SELECT 'next_action', 'influencer', i.id,
         coalesce(i.next_action, 'Seguimiento'),
         i.name, i.next_action_at, 'normal',
         (i.next_action_at < now()),
         ((i.next_action_at AT TIME ZONE h.tz)::date = h.d),
         i.whatsapp, i.instagram, i.phone
  FROM influencers i CROSS JOIN hoy h
  WHERE i.next_action_at IS NOT NULL
    AND i.status = 'active'
    AND (i.next_action_at AT TIME ZONE h.tz)::date <= h.d + p_days_ahead

  UNION ALL
  SELECT 'next_action', 'brand', b.id,
         coalesce(b.next_action, 'Seguimiento'),
         b.name, b.next_action_at, 'normal',
         (b.next_action_at < now()),
         ((b.next_action_at AT TIME ZONE h.tz)::date = h.d),
         coalesce(b.whatsapp,  b.data->>'whatsapp'),
         coalesce(b.instagram, b.data->>'instagram'),
         coalesce(b.phone,     b.data->>'phone')
  FROM brands b CROSS JOIN hoy h
  WHERE b.next_action_at IS NOT NULL
    AND b.status = 'active'
    AND (b.next_action_at AT TIME ZONE h.tz)::date <= h.d + p_days_ahead

  UNION ALL
  SELECT 'next_action', 'opportunity', o.id,
         coalesce(o.next_action, 'Seguimiento'),
         o.title, o.next_action_at, 'normal',
         (o.next_action_at < now()),
         ((o.next_action_at AT TIME ZONE h.tz)::date = h.d),
         NULL::TEXT, NULL::TEXT, NULL::TEXT
  FROM opportunities o CROSS JOIN hoy h
  WHERE o.next_action_at IS NOT NULL
    AND o.status NOT IN ('won','lost')
    AND (o.next_action_at AT TIME ZONE h.tz)::date <= h.d + p_days_ahead

  UNION ALL
  SELECT 'next_action', 'collaboration', c.id,
         coalesce(c.next_action, 'Colaboración'),
         concat_ws(' · ', b2.name, i2.name),
         c.next_action_at, 'normal',
         (c.next_action_at < now()),
         ((c.next_action_at AT TIME ZONE h.tz)::date = h.d),
         coalesce(i2.whatsapp,  b2.whatsapp),
         coalesce(i2.instagram, b2.instagram),
         coalesce(i2.phone,     b2.phone)
  FROM collaborations c
  CROSS JOIN hoy h
  LEFT JOIN brands      b2 ON b2.id = c.brand_id
  LEFT JOIN influencers i2 ON i2.id = c.influencer_id
  WHERE c.next_action_at IS NOT NULL
    AND c.status NOT IN ('completed','cancelled')
    AND (c.next_action_at AT TIME ZONE h.tz)::date <= h.d + p_days_ahead

  ORDER BY 8 DESC, 6 ASC NULLS LAST;
$my_agenda$;


CREATE OR REPLACE FUNCTION my_network_stats()
RETURNS JSONB LANGUAGE sql STABLE AS $my_network_stats$
  WITH hoy AS (
    SELECT my_timezone() AS tz,
           (now() AT TIME ZONE my_timezone())::date AS d
  )
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
                            AND start_date::date BETWEEN h.d AND h.d + 7),
    'collabs_week',     (SELECT count(*) FROM collaborations
                          WHERE scouter_id = auth.uid()
                            AND status IN ('content_pending','completed')
                            AND start_date::date >= date_trunc('week', h.d)::date),
    'content_pending',  (SELECT count(*) FROM collaborations
                          WHERE scouter_id = auth.uid()
                            AND status = 'content_pending'),
    'tasks_today',      (SELECT count(*) FROM tasks
                          WHERE assigned_to = auth.uid()
                            AND status NOT IN ('completed','cancelled')
                            AND (due_date AT TIME ZONE h.tz)::date = h.d),
    'tasks_overdue',    (SELECT count(*) FROM tasks
                          WHERE assigned_to = auth.uid()
                            AND status NOT IN ('completed','cancelled')
                            AND due_date < now()),
    'followups_today',  (SELECT count(*) FROM (
                          SELECT next_action_at FROM influencers
                            WHERE (next_action_at AT TIME ZONE h.tz)::date = h.d AND status='active'
                          UNION ALL
                          SELECT next_action_at FROM brands
                            WHERE (next_action_at AT TIME ZONE h.tz)::date = h.d AND status='active'
                          UNION ALL
                          SELECT next_action_at FROM collaborations
                            WHERE (next_action_at AT TIME ZONE h.tz)::date = h.d
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
  )
  FROM hoy h;
$my_network_stats$;


-- ── Verificacion ────────────────────────────────────────────
-- El huso que resuelve el sistema para vos, y el dia que calcula.
SELECT my_timezone()                              AS mi_huso,
       (now() AT TIME ZONE my_timezone())::date   AS hoy_local,
       CURRENT_DATE                               AS hoy_utc;
