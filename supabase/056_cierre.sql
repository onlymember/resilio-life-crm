-- ═══════════════════════════════════════════════════════════
-- 056 · Cierre de la auditoría
--
--   1. weekly_summary(): el resumen semanal de Dirección en una sola
--      consulta. Antes eran 12 conteos y dos lecturas de 5000 filas
--      sumadas en el navegador; Supabase corta en 1000, así que con
--      volumen los números salían mal. SECURITY INVOKER: cada uno ve
--      solo lo que su RLS le deja ver, igual que antes.
--   2. Link de confirmación: si ya venció, fue respondido o la
--      colaboración se canceló, no muestra nombre, marca ni fecha.
--      Y no se puede responder una colaboración cancelada.
--
-- No cambia datos. Rollback al final.
-- ═══════════════════════════════════════════════════════════

BEGIN;

-- ── 1 · Resumen semanal en la base ──────────────────────────
CREATE OR REPLACE FUNCTION weekly_summary()
RETURNS JSONB LANGUAGE sql STABLE SET search_path = public AS $f$
  WITH w AS (SELECT now() AS t_now, now() - interval '7 days' AS t7, now() - interval '14 days' AS t14),
  ent AS (
    SELECT 'influencers' AS k, created_at AS at FROM influencers
    UNION ALL SELECT 'brands', created_at FROM brands
    UNION ALL SELECT 'collabs', created_at FROM collaborations
    UNION ALL SELECT 'contacts', occurred_at FROM activities WHERE type IN ('dm','whatsapp','call','meeting','email')
    UNION ALL SELECT 'answers', occurred_at FROM activities WHERE type = 'answered'
    UNION ALL SELECT 'completed', updated_at FROM collaborations WHERE status::text = 'completed'
  ),
  agg AS (
    SELECT k,
           count(*) FILTER (WHERE at >= w.t7  AND at < w.t_now) AS cur,
           count(*) FILTER (WHERE at >= w.t14 AND at < w.t7)    AS prev
      FROM ent, w
     WHERE at >= w.t14
     GROUP BY k
  ),
  city AS (
    SELECT city_id, sum(adds)::int AS adds, sum(collabs)::int AS collabs
      FROM (SELECT i.city_id, 1 AS adds, 0 AS collabs FROM influencers i, w
             WHERE i.created_at >= w.t7 AND i.city_id IS NOT NULL
            UNION ALL
            SELECT c.city_id, 0, 1 FROM collaborations c, w
             WHERE c.created_at >= w.t7 AND c.city_id IS NOT NULL) x
     GROUP BY city_id
  ),
  creator AS (
    SELECT i.created_by, count(*)::int AS n FROM influencers i, w
     WHERE i.created_at >= w.t7 AND i.created_by IS NOT NULL
     GROUP BY i.created_by
  )
  SELECT jsonb_build_object(
    'influencers', jsonb_build_object('cur', coalesce((SELECT cur  FROM agg WHERE k = 'influencers'), 0),
                                      'prev', coalesce((SELECT prev FROM agg WHERE k = 'influencers'), 0)),
    'brands',      jsonb_build_object('cur', coalesce((SELECT cur  FROM agg WHERE k = 'brands'), 0),
                                      'prev', coalesce((SELECT prev FROM agg WHERE k = 'brands'), 0)),
    'contacts',    jsonb_build_object('cur', coalesce((SELECT cur  FROM agg WHERE k = 'contacts'), 0),
                                      'prev', coalesce((SELECT prev FROM agg WHERE k = 'contacts'), 0)),
    'answers',     jsonb_build_object('cur', coalesce((SELECT cur  FROM agg WHERE k = 'answers'), 0),
                                      'prev', coalesce((SELECT prev FROM agg WHERE k = 'answers'), 0)),
    'collabs',     jsonb_build_object('cur', coalesce((SELECT cur  FROM agg WHERE k = 'collabs'), 0),
                                      'prev', coalesce((SELECT prev FROM agg WHERE k = 'collabs'), 0)),
    'completed',   jsonb_build_object('cur', coalesce((SELECT cur  FROM agg WHERE k = 'completed'), 0),
                                      'prev', coalesce((SELECT prev FROM agg WHERE k = 'completed'), 0)),
    'byCity',    coalesce((SELECT jsonb_object_agg(city_id, jsonb_build_object('adds', adds, 'collabs', collabs)) FROM city), '{}'::jsonb),
    'byCreator', coalesce((SELECT jsonb_object_agg(created_by, n) FROM creator), '{}'::jsonb)
  );
$f$;

REVOKE ALL ON FUNCTION weekly_summary() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION weekly_summary() TO authenticated;


-- ── 2 · Link de confirmación: nada de datos si no está abierto ─
CREATE OR REPLACE FUNCTION get_collab_confirmation(p_token TEXT)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $f$
DECLARE
  r   collab_confirmations;
  c   collaborations;
  v_inf TEXT; v_brand TEXT; v_city TEXT;
BEGIN
  SELECT * INTO r FROM collab_confirmations WHERE token = p_token;
  IF NOT FOUND THEN RETURN jsonb_build_object('status', 'invalid'); END IF;
  SELECT * INTO c FROM collaborations WHERE id = r.collaboration_id;
  IF NOT FOUND OR c.status::text = 'cancelled' THEN RETURN jsonb_build_object('status', 'invalid'); END IF;
  IF r.responded_at IS NOT NULL THEN
    RETURN jsonb_build_object('status', 'answered', 'response', r.response);
  END IF;
  IF r.expires_at <= now() THEN RETURN jsonb_build_object('status', 'expired'); END IF;

  SELECT split_part(coalesce(name, username, ''), ' ', 1) INTO v_inf FROM influencers WHERE id = c.influencer_id;
  SELECT name INTO v_brand FROM brands WHERE id = c.brand_id;
  SELECT name INTO v_city FROM cities WHERE id = c.city_id;
  RETURN jsonb_build_object(
    'status',     'open',
    'influencer', v_inf,
    'brand',      v_brand,
    'city',       v_city,
    'date',       c.start_date,
    'time',       to_char(c.start_time, 'HH24:MI'));
END $f$;

REVOKE ALL ON FUNCTION get_collab_confirmation(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_collab_confirmation(text) TO anon, authenticated;

-- Responder: la 054 + no se responde una colaboración cancelada.
DO $resp$
DECLARE def TEXT; newd TEXT;
BEGIN
  def := pg_get_functiondef('respond_collab_confirmation(text,text,date,time,text)'::regprocedure);
  IF position('cancelada' IN def) > 0 THEN RETURN; END IF;
  newd := replace(def,
    $a$IF NOT FOUND THEN RAISE EXCEPTION 'Link inválido.' USING HINT = 'link_invalid'; END IF;
  SELECT coalesce(name, username, 'La influencer')$a$,
    $b$IF NOT FOUND OR c.status::text = 'cancelled' THEN
    RAISE EXCEPTION 'La colaboración fue cancelada.' USING HINT = 'link_invalid';
  END IF;
  SELECT coalesce(name, username, 'La influencer')$b$);
  IF newd = def THEN
    RAISE EXCEPTION '056: no se encontró el punto de la 054 en respond_collab_confirmation (¿se corrió la 054?)';
  END IF;
  EXECUTE newd;
END $resp$;

COMMIT;


-- ── Verificación: 3 filas con ok = true ─────────────────────
SELECT 'weekly_summary' AS k, (weekly_summary() ? 'byCity') AS ok
UNION ALL
SELECT 'confirmación sin datos viejos',
       position('''answered'', ''response''' IN pg_get_functiondef('get_collab_confirmation(text)'::regprocedure)) > 0
UNION ALL
SELECT 'no responde canceladas',
       position('cancelada' IN pg_get_functiondef('respond_collab_confirmation(text,text,date,time,text)'::regprocedure)) > 0;

-- ROLLBACK:
--   DROP FUNCTION IF EXISTS weekly_summary();
--   get_collab_confirmation: volver a la versión de 050.
--   respond_collab_confirmation: volver a la versión de 054.
