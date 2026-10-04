-- ═══════════════════════════════════════════════════════════
-- 064 · Invitación a la red de creadores (influencers)
--
--   Un link privado por influencer: partners.resilio.company/i/<token>
--   Se presenta Resilio, la influencer confirma 4 datos y toca
--   "Me sumo" (o "Ahora no"). Sin cuenta ni contraseña: el Club sigue
--   cerrado.
--
--   · influencer_invites: una fila por link. Vence a los 30 días.
--     Cada link sale con el mensaje de WhatsApp A o B, al azar, para
--     medir cuál funciona mejor.
--   · El equipo crea el link desde Network (INSERT directo, la RLS
--     exige que la persona vea esa ficha).
--   · get_influencer_invite / respond_influencer_invite: las usa la
--     página pública, siempre con el token.
--   · influencer_invite_preview: solo el nombre, para la tarjeta que
--     arma WhatsApp al pegar el link. No cuenta como apertura.
--   · Al sumarse:
--       - completa SOLO lo vacío de la ficha (WhatsApp, ciudad);
--       - si el dato ya existía y es distinto, queda para revisar
--         ("Ella dice…"), nunca se pisa;
--       - suma rubros y ciudad a influencer_preferences (047);
--       - nota en la actividad y tarea para la dueña de la ficha.
--   · Menores de 18: no se suman; queda marcado y se avisa con tarea.
--   · Textos editables: app_settings 'influencer_invite_texts'.
--
-- No toca datos existentes. Se puede correr dos veces sin efecto.
-- ═══════════════════════════════════════════════════════════

BEGIN;

-- ── 1 · Tabla ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS influencer_invites (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token           TEXT NOT NULL UNIQUE
                  DEFAULT replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  influencer_id   UUID NOT NULL REFERENCES influencers(id) ON DELETE CASCADE,
  lang            TEXT NOT NULL DEFAULT 'es' CHECK (lang IN ('es', 'en', 'pt')),
  variant         TEXT NOT NULL DEFAULT (CASE WHEN random() < 0.5 THEN 'a' ELSE 'b' END)
                  CHECK (variant IN ('a', 'b')),
  status          TEXT NOT NULL DEFAULT 'sent'
                  CHECK (status IN ('sent', 'viewed', 'joined', 'declined', 'underage', 'closed')),
  answers         JSONB NOT NULL DEFAULT '{}'::jsonb,
  flags           JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by      UUID DEFAULT auth.uid(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '30 days',
  first_viewed_at TIMESTAMPTZ,
  last_viewed_at  TIMESTAMPTZ,
  view_count      INT NOT NULL DEFAULT 0,
  answered_at     TIMESTAMPTZ,
  answer_count    INT NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_inf_invites_influencer ON influencer_invites (influencer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inf_invites_created_by ON influencer_invites (created_by, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inf_invites_status     ON influencer_invites (status, created_at DESC);


-- ── 2 · Permisos (RLS) ──────────────────────────────────────
-- Ve y maneja los links quien lo mandó, Dirección, o quien ve la ficha
-- (la subconsulta a influencers respeta la RLS de quien consulta, 060).
ALTER TABLE influencer_invites ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON influencer_invites FROM PUBLIC, anon;
REVOKE INSERT, UPDATE, DELETE ON influencer_invites FROM authenticated;
GRANT SELECT, DELETE ON influencer_invites TO authenticated;
GRANT INSERT (influencer_id, lang) ON influencer_invites TO authenticated;
GRANT UPDATE (status, expires_at)  ON influencer_invites TO authenticated;   -- cerrar o extender

DROP POLICY IF EXISTS ii_select ON influencer_invites;
CREATE POLICY ii_select ON influencer_invites FOR SELECT TO authenticated
  USING ((SELECT app_is_team_member())
         AND (created_by = (SELECT auth.uid()) OR (SELECT app_is_direction())
              OR EXISTS (SELECT 1 FROM influencers i WHERE i.id = influencer_invites.influencer_id)));

DROP POLICY IF EXISTS ii_insert ON influencer_invites;
CREATE POLICY ii_insert ON influencer_invites FOR INSERT TO authenticated
  WITH CHECK ((SELECT app_is_team_member())
              AND created_by = (SELECT auth.uid())
              AND EXISTS (SELECT 1 FROM influencers i WHERE i.id = influencer_invites.influencer_id));

DROP POLICY IF EXISTS ii_update ON influencer_invites;
CREATE POLICY ii_update ON influencer_invites FOR UPDATE TO authenticated
  USING ((SELECT app_is_team_member())
         AND (created_by = (SELECT auth.uid()) OR (SELECT app_is_direction())
              OR EXISTS (SELECT 1 FROM influencers i WHERE i.id = influencer_invites.influencer_id)));

DROP POLICY IF EXISTS ii_delete ON influencer_invites;
CREATE POLICY ii_delete ON influencer_invites FOR DELETE TO authenticated
  USING ((SELECT app_is_team_member())
         AND (created_by = (SELECT auth.uid()) OR (SELECT app_is_direction())));


-- ── 3 · Vista previa para WhatsApp (sin contar apertura) ────
CREATE OR REPLACE FUNCTION influencer_invite_preview(p_token TEXT)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, extensions AS $f$
DECLARE v JSONB;
BEGIN
  IF p_token IS NULL OR length(p_token) <> 64 THEN RETURN NULL; END IF;
  SELECT jsonb_build_object(
           'first_name', nullif(split_part(btrim(coalesce(i.name, '')), ' ', 1), ''),
           'city', c.name, 'lang', v.lang)
    INTO v
    FROM influencer_invites v
    JOIN influencers i ON i.id = v.influencer_id
    LEFT JOIN cities c ON c.id = i.city_id
   WHERE v.token = p_token AND v.status <> 'closed' AND v.expires_at > now();
  RETURN v;
END $f$;


-- ── 4 · Ver (página pública) ────────────────────────────────
CREATE OR REPLACE FUNCTION get_influencer_invite(p_token TEXT)
RETURNS JSONB LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, extensions AS $f$
DECLARE
  r     influencer_invites;
  inf   RECORD;
  cats  TEXT[];
  wa    TEXT;
  texts JSONB;
BEGIN
  IF p_token IS NULL OR length(p_token) <> 64 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found');
  END IF;
  SELECT * INTO r FROM influencer_invites WHERE token = p_token;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_found'); END IF;
  IF r.status = 'closed' OR r.expires_at < now() THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'expired');
  END IF;

  SELECT i.name, coalesce(nullif(btrim(i.instagram), ''), nullif(btrim(i.username), '')) AS ig,
         i.whatsapp, c.name AS city
    INTO inf
    FROM influencers i LEFT JOIN cities c ON c.id = i.city_id
   WHERE i.id = r.influencer_id;

  SELECT p.categories INTO cats FROM influencer_preferences p WHERE p.influencer_id = r.influencer_id;
  wa := regexp_replace(coalesce(inf.whatsapp, ''), '[^0-9]', '', 'g');
  SELECT s.value INTO texts FROM app_settings s WHERE s.key = 'influencer_invite_texts';

  UPDATE influencer_invites
     SET view_count      = view_count + 1,
         first_viewed_at = coalesce(first_viewed_at, now()),
         last_viewed_at  = now(),
         status          = CASE WHEN status = 'sent' THEN 'viewed' ELSE status END
   WHERE id = r.id;

  -- Solo lo que la página necesita. El WhatsApp no viaja completo.
  RETURN jsonb_build_object(
    'ok', true,
    'name', btrim(coalesce(inf.name, '')),
    'first_name', nullif(split_part(btrim(coalesce(inf.name, '')), ' ', 1), ''),
    'instagram', lower(regexp_replace(coalesce(inf.ig, ''), '^@+', '')),
    'city', inf.city,
    'categories', to_jsonb(coalesce(cats, '{}'::text[])),
    'whatsapp_end', CASE WHEN length(wa) >= 6 THEN right(wa, 4) END,
    'lang', r.lang,
    'status', r.status,
    'answered', r.answered_at IS NOT NULL,
    'expires_at', r.expires_at,
    'texts', texts);
END $f$;


-- ── 5 · Responder (página pública) ──────────────────────────
-- p_action: 'join' | 'decline'. Se puede volver a responder mientras
-- el link esté vigente (por ejemplo, "Ahora no" y después "Me sumo").
CREATE OR REPLACE FUNCTION respond_influencer_invite(p_token TEXT, p_action TEXT, p_data JSONB DEFAULT '{}'::jsonb)
RETURNS JSONB LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, extensions AS $f$
DECLARE
  r        influencer_invites;
  inf      RECORD;
  d        JSONB := coalesce(p_data, '{}'::jsonb);
  ok_cats  CONSTANT TEXT[] := ARRAY['moda','belleza','gastronomia','viajes','fitness','lifestyle',
                                    'musica','arte','tecnologia','deportes','maternidad','mascotas'];
  cats     TEXT[];
  v_city   TEXT;
  v_cityid UUID;
  v_wa     TEXT;
  v_birth  DATE;
  v_age    INT;
  v_ig     TEXT;
  ans      JSONB;
  fl       JSONB := '{}'::jsonb;
  filled   TEXT[] := '{}';
  v_owner  UUID;
  first_join BOOLEAN;
BEGIN
  IF p_token IS NULL OR length(p_token) <> 64 THEN
    RAISE EXCEPTION 'Link inválido.' USING HINT = 'not_found';
  END IF;
  SELECT * INTO r FROM influencer_invites WHERE token = p_token FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Link inválido.' USING HINT = 'not_found'; END IF;
  IF r.status = 'closed' OR r.expires_at < now() THEN
    RAISE EXCEPTION 'Este link venció.' USING HINT = 'expired';
  END IF;
  IF p_action IS NULL OR p_action NOT IN ('join', 'decline') THEN
    RAISE EXCEPTION 'Acción inválida.' USING HINT = 'bad_action';
  END IF;
  IF jsonb_typeof(d) <> 'object' OR length(d::text) > 2000 THEN
    RAISE EXCEPTION 'Datos inválidos.' USING HINT = 'bad_data';
  END IF;

  SELECT i.id, i.name, i.whatsapp, i.city_id, i.owner_scouter_id,
         lower(regexp_replace(coalesce(nullif(btrim(i.instagram), ''), nullif(btrim(i.username), ''), ''), '^@+', '')) AS ig
    INTO inf FROM influencers i WHERE i.id = r.influencer_id;
  v_owner := coalesce(inf.owner_scouter_id, r.created_by);

  -- ── Ahora no ──
  IF p_action = 'decline' THEN
    UPDATE influencer_invites
       SET status = 'declined', answered_at = now(), answer_count = answer_count + 1
     WHERE id = r.id;
    BEGIN
      INSERT INTO activities (actor_id, entity_type, entity_id, type, title, metadata)
      VALUES (r.created_by, 'influencer', r.influencer_id, 'note',
              'Invitación a la red: respondió "Ahora no"', jsonb_build_object('invite_id', r.id));
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    RETURN jsonb_build_object('ok', true, 'status', 'declined');
  END IF;

  -- ── Me sumo: validar ──
  IF coalesce((d->>'consent')::boolean, false) IS NOT TRUE THEN
    RAISE EXCEPTION 'Falta aceptar el uso de datos.' USING HINT = 'no_consent';
  END IF;
  BEGIN
    v_birth := (d->>'birthdate')::date;
  EXCEPTION WHEN OTHERS THEN v_birth := NULL;
  END;
  IF v_birth IS NULL OR v_birth > current_date OR v_birth < current_date - INTERVAL '100 years' THEN
    RAISE EXCEPTION 'Fecha de nacimiento inválida.' USING HINT = 'bad_birthdate';
  END IF;
  v_age := date_part('year', age(current_date, v_birth))::int;

  SELECT coalesce(array_agg(DISTINCT x), '{}') INTO cats
    FROM jsonb_array_elements_text(CASE WHEN jsonb_typeof(d->'categories') = 'array' THEN d->'categories' ELSE '[]'::jsonb END) x
   WHERE x = ANY (ok_cats);
  IF cardinality(cats) = 0 THEN
    RAISE EXCEPTION 'Elegí al menos un rubro.' USING HINT = 'no_categories';
  END IF;

  v_city := left(btrim(coalesce(d->>'city', '')), 80);
  v_wa   := left(regexp_replace(coalesce(d->>'whatsapp', ''), '[^0-9+ ()-]', '', 'g'), 30);
  IF length(regexp_replace(v_wa, '[^0-9]', '', 'g')) < 6 THEN v_wa := ''; END IF;
  v_ig   := CASE WHEN coalesce((d->>'instagram_ok')::boolean, true) THEN NULL
               ELSE lower(regexp_replace(left(btrim(coalesce(d->>'instagram', '')), 60), '^@+', '')) END;

  ans := jsonb_strip_nulls(jsonb_build_object(
    'city', nullif(v_city, ''),
    'categories', to_jsonb(cats),
    'whatsapp', nullif(v_wa, ''),
    'birthdate', v_birth,
    'age', v_age,
    'instagram_ok', v_ig IS NULL,
    'instagram', nullif(v_ig, ''),
    'consent_at', now()));

  -- Instagram que no coincide: se marca para revisar, no se crea otra ficha.
  IF v_ig IS NOT NULL THEN
    fl := fl || jsonb_build_object('instagram_mismatch', coalesce(nullif(v_ig, ''), '?'));
  END IF;

  -- ── Menor de 18: no se suma ──
  IF v_age < 18 THEN
    UPDATE influencer_invites
       SET status = 'underage', answers = ans - 'whatsapp', flags = fl || '{"underage": true}'::jsonb,
           answered_at = now(), answer_count = answer_count + 1
     WHERE id = r.id;
    BEGIN
      INSERT INTO activities (actor_id, entity_type, entity_id, type, title, metadata)
      VALUES (r.created_by, 'influencer', r.influencer_id, 'note',
              'Invitación a la red: indicó ser menor de 18', jsonb_build_object('invite_id', r.id, 'age', v_age));
      IF v_owner IS NOT NULL AND r.answered_at IS NULL THEN
        INSERT INTO tasks (title, description, entity_type, entity_id, type, priority, status, due_date, created_by, assigned_to)
        VALUES (format('Revisar: %s indicó ser menor de 18', coalesce(inf.name, 'una influencer')),
                'Respondió la invitación a la red con una edad menor a 18. No se sumó. Revisá la ficha antes de proponerle colaboraciones.',
                'influencer', r.influencer_id, 'general', 'high', 'todo', now() + INTERVAL '24 hours', v_owner, v_owner);
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '064: aviso de menor (%)', SQLERRM;
    END;
    RETURN jsonb_build_object('ok', true, 'status', 'underage');
  END IF;

  -- ── Ciudad: se busca por nombre ──
  IF v_city <> '' THEN
    SELECT c.id INTO v_cityid FROM cities c
     WHERE lower(btrim(c.name)) = lower(split_part(v_city, ',', 1)) LIMIT 1;
  END IF;

  -- WhatsApp distinto al de la ficha: queda para revisar.
  IF v_wa <> '' AND coalesce(inf.whatsapp, '') <> ''
     AND right(regexp_replace(inf.whatsapp, '[^0-9]', '', 'g'), 8) <> right(regexp_replace(v_wa, '[^0-9]', '', 'g'), 8) THEN
    fl := fl || jsonb_build_object('whatsapp_claim', v_wa);
  END IF;
  -- Ciudad distinta a la de la ficha: queda para revisar.
  IF v_cityid IS NOT NULL AND inf.city_id IS NOT NULL AND v_cityid <> inf.city_id THEN
    fl := fl || jsonb_build_object('city_claim', v_city);
  END IF;
  IF v_cityid IS NULL AND v_city <> '' AND inf.city_id IS NULL THEN
    fl := fl || jsonb_build_object('city_unmatched', v_city);
  END IF;

  -- Completar SOLO lo vacío de la ficha. Si falla, la respuesta se guarda igual.
  BEGIN
    IF v_wa <> '' AND coalesce(btrim(inf.whatsapp), '') = '' THEN
      UPDATE influencers SET whatsapp = v_wa WHERE id = r.influencer_id;
      filled := array_append(filled, 'whatsapp');
    END IF;
    IF v_cityid IS NOT NULL AND inf.city_id IS NULL THEN
      UPDATE influencers SET city_id = v_cityid WHERE id = r.influencer_id;
      filled := array_append(filled, 'city');
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '064: no se pudo completar la ficha (%)', SQLERRM;
    filled := '{}';
  END;

  -- Rubros y ciudad a las preferencias (las mismas que usa el Club).
  BEGIN
    INSERT INTO influencer_preferences (influencer_id, city_ids, categories, updated_at)
    VALUES (r.influencer_id, CASE WHEN v_cityid IS NULL THEN '{}'::uuid[] ELSE ARRAY[v_cityid] END, cats, now())
    ON CONFLICT (influencer_id) DO UPDATE
      SET categories = (SELECT coalesce(array_agg(DISTINCT x), '{}') FROM unnest(influencer_preferences.categories || EXCLUDED.categories) x),
          city_ids   = (SELECT coalesce(array_agg(DISTINCT x), '{}') FROM unnest(influencer_preferences.city_ids || EXCLUDED.city_ids) x),
          updated_at = now();
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '064: no se pudieron guardar las preferencias (%)', SQLERRM;
  END;

  first_join := r.status <> 'joined';

  UPDATE influencer_invites
     SET status = 'joined', answers = ans, flags = fl || jsonb_build_object('filled', to_jsonb(filled)),
         answered_at = now(), answer_count = answer_count + 1
   WHERE id = r.id;

  -- Nota en la actividad y tarea para la dueña de la ficha (la primera vez).
  BEGIN
    INSERT INTO activities (actor_id, entity_type, entity_id, type, title, metadata)
    VALUES (r.created_by, 'influencer', r.influencer_id, 'note',
            'Se sumó a la red de creadores', jsonb_build_object('invite_id', r.id, 'answers', ans, 'flags', fl));
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  IF first_join AND v_owner IS NOT NULL THEN
    BEGIN
      INSERT INTO tasks (title, description, entity_type, entity_id, type, priority, status, due_date, created_by, assigned_to)
      VALUES (format('%s se sumó a la red', coalesce(inf.name, 'Una influencer')),
              CASE WHEN fl ?| ARRAY['whatsapp_claim', 'city_claim', 'instagram_mismatch', 'city_unmatched']
                   THEN 'Respondió la invitación. Hay datos para revisar en su ficha ("Lo que contó la influencer").'
                   ELSE 'Respondió la invitación. Sus datos están en la ficha ("Lo que contó la influencer").' END,
              'influencer', r.influencer_id, 'general', 'normal', 'todo', now() + INTERVAL '72 hours', v_owner, v_owner);
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '064: no se pudo crear la tarea (%)', SQLERRM;
    END;
  END IF;

  RETURN jsonb_build_object('ok', true, 'status', 'joined');
END $f$;


REVOKE ALL ON FUNCTION influencer_invite_preview(TEXT)                FROM PUBLIC;
REVOKE ALL ON FUNCTION get_influencer_invite(TEXT)                    FROM PUBLIC;
REVOKE ALL ON FUNCTION respond_influencer_invite(TEXT, TEXT, JSONB)   FROM PUBLIC;
GRANT EXECUTE ON FUNCTION influencer_invite_preview(TEXT)              TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_influencer_invite(TEXT)                  TO anon, authenticated;
GRANT EXECUTE ON FUNCTION respond_influencer_invite(TEXT, TEXT, JSONB) TO anon, authenticated;

COMMIT;


-- ── Verificación: 4 filas con ok = true ─────────────────────
SELECT 'tabla con RLS' AS k,
       (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.influencer_invites'::regclass) AS ok
UNION ALL
SELECT 'anon no lee la tabla',
       NOT has_table_privilege('anon', 'public.influencer_invites', 'SELECT')
UNION ALL
SELECT 'anon puede ver y responder con token',
       has_function_privilege('anon', 'get_influencer_invite(text)', 'EXECUTE')
       AND has_function_privilege('anon', 'respond_influencer_invite(text,text,jsonb)', 'EXECUTE')
UNION ALL
SELECT 'el equipo puede crear links',
       has_column_privilege('authenticated', 'public.influencer_invites', 'influencer_id', 'INSERT');
