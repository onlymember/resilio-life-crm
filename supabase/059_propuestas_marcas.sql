-- ═══════════════════════════════════════════════════════════
-- 059 · Propuestas para marcas (partners.resilio.company)
--
--   Un link privado por marca: partners.resilio.company/p/<token>
--   La marca elige plan (esencial, crecimiento, ecosistema o
--   "asesórenme") y responde 5 preguntas. Sin precios: los valores
--   se mandan por privado.
--
--   · brand_proposals: una fila por link. Vence a los 30 días.
--   · create_brand_proposal(): la usa el equipo desde Network.
--   · get_brand_proposal() / respond_brand_proposal(): las usa la
--     página pública (sin sesión), siempre con el token.
--   · Cada scouter ve solo sus propuestas; Dirección ve todas.
--   · Al responder, queda una nota en el timeline de la marca.
--
-- No toca datos existentes. Se puede correr dos veces sin efecto.
-- ═══════════════════════════════════════════════════════════

BEGIN;

-- ── 1 · Tabla ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS brand_proposals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token           TEXT NOT NULL UNIQUE
                  DEFAULT replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  brand_id        UUID REFERENCES brands(id) ON DELETE SET NULL,
  brand_name      TEXT NOT NULL CHECK (length(btrim(brand_name)) BETWEEN 1 AND 120),
  lang            TEXT NOT NULL DEFAULT 'es' CHECK (lang IN ('es', 'en', 'pt')),
  status          TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'viewed', 'answered', 'closed')),
  chosen_plan     TEXT CHECK (chosen_plan IN ('esencial', 'crecimiento', 'ecosistema', 'asesoria')),
  answers         JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by      UUID DEFAULT auth.uid(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '30 days',
  first_viewed_at TIMESTAMPTZ,
  last_viewed_at  TIMESTAMPTZ,
  view_count      INT NOT NULL DEFAULT 0,
  answered_at     TIMESTAMPTZ,
  answer_count    INT NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_brand_proposals_created_by ON brand_proposals (created_by, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_brand_proposals_brand      ON brand_proposals (brand_id);
CREATE INDEX IF NOT EXISTS idx_brand_proposals_status     ON brand_proposals (status, answered_at DESC);


-- ── 2 · Permisos (RLS) ──────────────────────────────────────
ALTER TABLE brand_proposals ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON brand_proposals FROM PUBLIC, anon;
REVOKE INSERT, UPDATE, DELETE ON brand_proposals FROM authenticated;
GRANT SELECT, DELETE ON brand_proposals TO authenticated;
GRANT UPDATE (status, expires_at) ON brand_proposals TO authenticated;   -- cerrar o extender

DROP POLICY IF EXISTS bp_select ON brand_proposals;
CREATE POLICY bp_select ON brand_proposals FOR SELECT TO authenticated
  USING ((SELECT app_is_team_member())
         AND (created_by = (SELECT auth.uid()) OR (SELECT app_is_direction())));

DROP POLICY IF EXISTS bp_update ON brand_proposals;
CREATE POLICY bp_update ON brand_proposals FOR UPDATE TO authenticated
  USING ((SELECT app_is_team_member())
         AND (created_by = (SELECT auth.uid()) OR (SELECT app_is_direction())));

DROP POLICY IF EXISTS bp_delete ON brand_proposals;
CREATE POLICY bp_delete ON brand_proposals FOR DELETE TO authenticated
  USING ((SELECT app_is_team_member())
         AND (created_by = (SELECT auth.uid()) OR (SELECT app_is_direction())));


-- ── 3 · Crear (equipo) ──────────────────────────────────────
-- Si se pasa una marca del CRM, tiene que ser una que la persona ve.
CREATE OR REPLACE FUNCTION create_brand_proposal(p_brand UUID, p_brand_name TEXT, p_lang TEXT DEFAULT 'es')
RETURNS JSONB LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, extensions AS $f$
DECLARE
  v_uid  UUID := auth.uid();
  v_name TEXT := btrim(coalesce(p_brand_name, ''));
  r      brand_proposals;
BEGIN
  IF v_uid IS NULL OR NOT app_is_team_member() THEN
    RAISE EXCEPTION 'Sin permiso.' USING ERRCODE = '42501';
  END IF;
  IF p_brand IS NOT NULL THEN
    -- Misma regla de lectura de marcas que la 052: propias, de su zona o Dirección.
    IF NOT EXISTS (SELECT 1 FROM brands b WHERE b.id = p_brand
                    AND (app_is_direction() OR b.owner_scouter_id = v_uid
                         OR b.city_id IN (SELECT app_visible_city_ids()))) THEN
      RAISE EXCEPTION 'No podés mandar una propuesta a esta marca.' USING ERRCODE = '42501';
    END IF;
    IF v_name = '' THEN SELECT name INTO v_name FROM brands WHERE id = p_brand; END IF;
  END IF;
  IF coalesce(v_name, '') = '' THEN
    RAISE EXCEPTION 'Falta el nombre de la marca.' USING HINT = 'no_name';
  END IF;

  INSERT INTO brand_proposals (brand_id, brand_name, lang, created_by)
  VALUES (p_brand, left(v_name, 120),
          CASE WHEN p_lang IN ('es', 'en', 'pt') THEN p_lang ELSE 'es' END, v_uid)
  RETURNING * INTO r;

  RETURN jsonb_build_object('id', r.id, 'token', r.token, 'expires_at', r.expires_at);
END $f$;


-- ── 4 · Ver (página pública) ────────────────────────────────
CREATE OR REPLACE FUNCTION get_brand_proposal(p_token TEXT)
RETURNS JSONB LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, extensions AS $f$
DECLARE r brand_proposals;
BEGIN
  IF p_token IS NULL OR length(p_token) <> 64 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found');
  END IF;
  SELECT * INTO r FROM brand_proposals WHERE token = p_token;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_found'); END IF;
  IF r.status = 'closed' OR r.expires_at < now() THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'expired');
  END IF;

  UPDATE brand_proposals
     SET view_count      = view_count + 1,
         first_viewed_at = coalesce(first_viewed_at, now()),
         last_viewed_at  = now(),
         status          = CASE WHEN status = 'sent' THEN 'viewed' ELSE status END
   WHERE id = r.id;

  RETURN jsonb_build_object(
    'ok', true, 'brand_name', r.brand_name, 'lang', r.lang,
    'answered', r.answered_at IS NOT NULL, 'chosen_plan', r.chosen_plan,
    'answers', r.answers, 'expires_at', r.expires_at);
END $f$;


-- ── 5 · Responder (página pública) ──────────────────────────
-- Se puede cambiar la respuesta mientras el link esté vigente.
CREATE OR REPLACE FUNCTION respond_brand_proposal(p_token TEXT, p_plan TEXT, p_answers JSONB)
RETURNS JSONB LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, extensions AS $f$
DECLARE
  r   brand_proposals;
  a   JSONB := coalesce(p_answers, '{}'::jsonb);
  ans JSONB;
BEGIN
  IF p_token IS NULL OR length(p_token) <> 64 THEN
    RAISE EXCEPTION 'Link inválido.' USING HINT = 'not_found';
  END IF;
  SELECT * INTO r FROM brand_proposals WHERE token = p_token FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Link inválido.' USING HINT = 'not_found'; END IF;
  IF r.status = 'closed' OR r.expires_at < now() THEN
    RAISE EXCEPTION 'Este link venció.' USING HINT = 'expired';
  END IF;
  IF p_plan IS NULL OR p_plan NOT IN ('esencial', 'crecimiento', 'ecosistema', 'asesoria') THEN
    RAISE EXCEPTION 'Elegí un plan.' USING HINT = 'no_plan';
  END IF;
  IF jsonb_typeof(a) <> 'object' OR length(a::text) > 4000 THEN
    RAISE EXCEPTION 'Respuestas inválidas.' USING HINT = 'bad_answers';
  END IF;

  -- Solo se guardan estas claves, como texto corto.
  ans := jsonb_strip_nulls(jsonb_build_object(
    'goal',              left(a->>'goal', 60),
    'start',             left(a->>'start', 60),
    'networks',          left(a->>'networks', 60),
    'creators_per_week', left(a->>'creators_per_week', 20),
    'notes',             left(a->>'notes', 1500)));

  UPDATE brand_proposals
     SET chosen_plan  = p_plan,
         answers      = ans,
         status       = 'answered',
         answered_at  = now(),
         answer_count = answer_count + 1
   WHERE id = r.id;

  -- Nota en el timeline de la marca (si falla, la respuesta se guarda igual).
  IF r.brand_id IS NOT NULL AND r.created_by IS NOT NULL THEN
    BEGIN
      INSERT INTO activities (actor_id, entity_type, entity_id, type, title, metadata)
      VALUES (r.created_by, 'brand', r.brand_id, 'note',
              format('Propuesta respondida: plan %s', p_plan),
              jsonb_build_object('proposal_id', r.id, 'plan', p_plan, 'answers', ans));
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;

  RETURN jsonb_build_object('ok', true, 'chosen_plan', p_plan);
END $f$;


REVOKE ALL ON FUNCTION create_brand_proposal(UUID, TEXT, TEXT)   FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION get_brand_proposal(TEXT)                  FROM PUBLIC;
REVOKE ALL ON FUNCTION respond_brand_proposal(TEXT, TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION create_brand_proposal(UUID, TEXT, TEXT)   TO authenticated;
GRANT EXECUTE ON FUNCTION get_brand_proposal(TEXT)                  TO anon, authenticated;
GRANT EXECUTE ON FUNCTION respond_brand_proposal(TEXT, TEXT, JSONB) TO anon, authenticated;

COMMIT;


-- ── Verificación: 4 filas con ok = true ─────────────────────
SELECT 'tabla con RLS' AS k,
       (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.brand_proposals'::regclass) AS ok
UNION ALL
SELECT 'anon no lee la tabla',
       NOT has_table_privilege('anon', 'public.brand_proposals', 'SELECT')
UNION ALL
SELECT 'anon puede ver y responder con token',
       has_function_privilege('anon', 'get_brand_proposal(text)', 'EXECUTE')
       AND has_function_privilege('anon', 'respond_brand_proposal(text,text,jsonb)', 'EXECUTE')
UNION ALL
SELECT 'anon no puede crear',
       NOT has_function_privilege('anon', 'create_brand_proposal(uuid,text,text)', 'EXECUTE');
