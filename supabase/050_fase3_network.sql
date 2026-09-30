-- ═══════════════════════════════════════════════════════════
-- 050 · Network, fase 3
--
--   1. Confirmación por link: la influencer abre un link (sin cuenta),
--      ve marca, fecha y hora, y confirma o propone otra fecha.
--      · collaborations.start_time (hora de la visita, opcional)
--      · collab_confirmations (un link por colaboración, vence a 14 días)
--      · create_collab_confirmation()  → equipo (scouter a cargo / Dirección)
--      · get_collab_confirmation()     → público, datos mínimos
--      · respond_collab_confirmation() → público, una sola respuesta
--   2. Fusionar dos fichas duplicadas (solo Dirección):
--      merge_entities() pasa TODO lo vinculado a la ficha que queda
--      (colaboraciones, tareas, actividades, intereses, acceso al Club…)
--      y borra la otra. No se puede si las dos tienen cuenta en el Club.
--
-- Solo agrega. No cambia datos existentes. Rollback al final.
-- ═══════════════════════════════════════════════════════════
BEGIN;

-- ── 1 · Confirmación por link ───────────────────────────────
ALTER TABLE collaborations ADD COLUMN IF NOT EXISTS start_time TIME;

CREATE TABLE IF NOT EXISTS collab_confirmations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collaboration_id UUID NOT NULL REFERENCES collaborations(id) ON DELETE CASCADE,
  token            TEXT NOT NULL UNIQUE,
  created_by       UUID,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at       TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '14 days',
  responded_at     TIMESTAMPTZ,
  response         TEXT CHECK (response IN ('confirmed', 'proposed', 'declined')),
  proposed_date    DATE,
  proposed_time    TIME,
  note             TEXT
);
CREATE INDEX IF NOT EXISTS idx_collab_conf_collab ON collab_confirmations (collaboration_id, created_at DESC);

ALTER TABLE collab_confirmations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON collab_confirmations FROM anon;
REVOKE INSERT, UPDATE, DELETE ON collab_confirmations FROM authenticated;
-- El equipo ve los links de las colaboraciones que puede ver.
DROP POLICY IF EXISTS cc_select ON collab_confirmations;
CREATE POLICY cc_select ON collab_confirmations FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM collaborations c WHERE c.id = collaboration_id));

-- Crea (o reutiliza, si hay uno vigente sin responder) el link.
CREATE OR REPLACE FUNCTION create_collab_confirmation(p_collab UUID)
RETURNS JSONB LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $f$
DECLARE
  c  collaborations;
  r  collab_confirmations;
BEGIN
  SELECT * INTO c FROM collaborations WHERE id = p_collab;
  IF NOT FOUND THEN RAISE EXCEPTION 'Colaboración inexistente.'; END IF;
  IF NOT (app_is_direction() OR c.scouter_id = auth.uid() OR c.created_by = auth.uid()) THEN
    RAISE EXCEPTION 'No podés mandar el link de esta colaboración.' USING ERRCODE = '42501';
  END IF;
  IF c.start_date IS NULL THEN
    RAISE EXCEPTION 'Poné la fecha de la colaboración antes de mandar el link.' USING HINT = 'no_date';
  END IF;

  SELECT * INTO r FROM collab_confirmations
   WHERE collaboration_id = p_collab AND responded_at IS NULL AND expires_at > now()
   ORDER BY created_at DESC LIMIT 1;
  IF NOT FOUND THEN
    INSERT INTO collab_confirmations (collaboration_id, token, created_by)
    VALUES (p_collab, replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''), auth.uid())
    RETURNING * INTO r;
  END IF;
  RETURN jsonb_build_object('token', r.token, 'expires_at', r.expires_at);
END $f$;

-- Público: lo mínimo para que la influencer sepa de qué se trata.
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
  SELECT split_part(coalesce(name, username, ''), ' ', 1) INTO v_inf FROM influencers WHERE id = c.influencer_id;
  SELECT name INTO v_brand FROM brands WHERE id = c.brand_id;
  SELECT name INTO v_city FROM cities WHERE id = c.city_id;
  RETURN jsonb_build_object(
    'status', CASE WHEN r.responded_at IS NOT NULL THEN 'answered'
                   WHEN r.expires_at <= now() THEN 'expired' ELSE 'open' END,
    'response',   r.response,
    'influencer', v_inf,
    'brand',      v_brand,
    'city',       v_city,
    'date',       c.start_date,
    'time',       to_char(c.start_time, 'HH24:MI'));
END $f$;

-- Público: una sola respuesta por link.
--   confirmed → la colaboración queda confirmada (y tildado "Confirmada").
--   proposed  → se guarda la fecha propuesta y la scouter tiene que revisarla.
--   declined  → la scouter recibe el aviso.
CREATE OR REPLACE FUNCTION respond_collab_confirmation(
  p_token TEXT, p_response TEXT, p_date DATE DEFAULT NULL, p_time TIME DEFAULT NULL, p_note TEXT DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $f$
DECLARE
  r      collab_confirmations;
  c      collaborations;
  v_inf  TEXT;
  v_title TEXT;
BEGIN
  IF p_response NOT IN ('confirmed', 'proposed', 'declined') THEN
    RAISE EXCEPTION 'Respuesta inválida.' USING HINT = 'invalid';
  END IF;
  SELECT * INTO r FROM collab_confirmations WHERE token = p_token FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Link inválido.' USING HINT = 'link_invalid'; END IF;
  IF r.responded_at IS NOT NULL THEN RAISE EXCEPTION 'Ya respondiste.' USING HINT = 'already'; END IF;
  IF r.expires_at <= now() THEN RAISE EXCEPTION 'El link venció.' USING HINT = 'expired'; END IF;
  IF p_response = 'proposed' AND (p_date IS NULL OR p_date < current_date) THEN
    RAISE EXCEPTION 'Elegí una fecha desde hoy.' USING HINT = 'bad_date';
  END IF;

  SELECT * INTO c FROM collaborations WHERE id = r.collaboration_id FOR UPDATE;
  SELECT coalesce(name, username, 'La influencer') INTO v_inf FROM influencers WHERE id = c.influencer_id;

  UPDATE collab_confirmations
     SET responded_at = now(), response = p_response,
         proposed_date = CASE WHEN p_response = 'proposed' THEN p_date END,
         proposed_time = CASE WHEN p_response = 'proposed' THEN p_time END,
         note = left(nullif(btrim(coalesce(p_note, '')), ''), 500)
   WHERE id = r.id;

  IF p_response = 'confirmed' THEN
    UPDATE collaborations
       SET status    = CASE WHEN status::text = 'proposed' THEN 'confirmed'::collab_status ELSE status END,
           checklist = coalesce(checklist, '{}'::jsonb) || '{"confirmed": true}'::jsonb
     WHERE id = c.id;
    v_title := v_inf || ' confirmó la colaboración';
  ELSE
    v_title := CASE WHEN p_response = 'proposed'
                    THEN v_inf || ' propone otra fecha: ' || to_char(p_date, 'DD/MM') || coalesce(' ' || to_char(p_time, 'HH24:MI'), '')
                    ELSE v_inf || ' no puede ir' END;
    -- Queda en la agenda de la scouter para resolverlo hoy.
    UPDATE collaborations SET next_action = v_title, next_action_at = now() WHERE id = c.id;
  END IF;

  INSERT INTO activities (actor_id, entity_type, entity_id, type, title, description)
  VALUES (coalesce(c.scouter_id, c.created_by), 'collaboration', c.id::text, 'note', v_title, nullif(btrim(coalesce(p_note, '')), ''));

  IF c.scouter_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, body, entity_type, entity_id)
    VALUES (c.scouter_id, 'collab_confirmation', v_title, nullif(btrim(coalesce(p_note, '')), ''), 'collaboration', c.id);
  END IF;

  RETURN jsonb_build_object('ok', true, 'response', p_response);
END $f$;


-- ── 2 · Fusionar fichas duplicadas ─────────────────────────
-- p_type: 'influencer' | 'brand'. p_keep queda; p_remove se borra.
-- p_take: columnas cuyo valor se toma de la ficha que se borra
-- (por ejemplo '{whatsapp,email}'). El resto queda como está en p_keep.
-- Todo lo que apunta a p_remove (por clave foránea o por
-- entity_type/entity_id) pasa a p_keep. Si algo ya existía igual en
-- p_keep (por ejemplo el mismo "Me interesa"), se queda el de p_keep.
CREATE OR REPLACE FUNCTION merge_entities(p_type TEXT, p_keep UUID, p_remove UUID, p_take TEXT[] DEFAULT '{}')
RETURNS JSONB LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $f$
DECLARE
  v_tbl   TEXT;
  v_allow TEXT[];
  v_col   TEXT;
  v_moved INT := 0;
  n       INT;
  fk      RECORD;
  v_name  TEXT;
  v_other TEXT;
  v_ctid  TID;
  v_etype TEXT;
BEGIN
  IF NOT app_is_direction() THEN
    RAISE EXCEPTION 'Solo Dirección puede fusionar fichas.' USING ERRCODE = '42501';
  END IF;
  IF p_type NOT IN ('influencer', 'brand') THEN RAISE EXCEPTION 'Tipo inválido.'; END IF;
  IF p_keep = p_remove THEN RAISE EXCEPTION 'Elegí dos fichas distintas.'; END IF;
  v_tbl := CASE p_type WHEN 'influencer' THEN 'influencers' ELSE 'brands' END;

  EXECUTE format('SELECT name FROM %I WHERE id = $1', v_tbl) INTO v_name USING p_keep;
  EXECUTE format('SELECT name FROM %I WHERE id = $1', v_tbl) INTO v_other USING p_remove;
  IF v_name IS NULL OR v_other IS NULL THEN RAISE EXCEPTION 'No se encontró alguna de las dos fichas.'; END IF;

  IF p_type = 'influencer' AND to_regclass('public.influencer_accounts') IS NOT NULL
     AND EXISTS (SELECT 1 FROM influencer_accounts WHERE influencer_id = p_keep)
     AND EXISTS (SELECT 1 FROM influencer_accounts WHERE influencer_id = p_remove) THEN
    RAISE EXCEPTION 'Las dos fichas tienen cuenta en el Club: no se pueden fusionar solas.' USING HINT = 'both_accounts';
  END IF;

  -- 1) Datos que se toman de la ficha que se borra (lista cerrada).
  v_allow := CASE p_type
    WHEN 'influencer' THEN ARRAY['name','username','email','phone','instagram','tiktok','whatsapp','followers','category','tier',
                                'city_id','country_id','notes','engagement','average_views','relationship_status','owner_scouter_id']
    ELSE ARRAY['name','category','category_id','website','logo','city_id','country_id','notes','whatsapp','instagram','phone','email',
               'potential_value','relationship_status','owner_scouter_id'] END;
  -- El dueño se cambia sin disparar el candado de reasignación.
  PERFORM set_config('app.assigning', 'on', true);
  FOREACH v_col IN ARRAY coalesce(p_take, '{}') LOOP
    IF v_col = ANY (v_allow) AND EXISTS (SELECT 1 FROM information_schema.columns
                                          WHERE table_schema = 'public' AND table_name = v_tbl AND column_name = v_col) THEN
      EXECUTE format('UPDATE %I k SET %I = r.%I FROM %I r WHERE k.id = $1 AND r.id = $2', v_tbl, v_col, v_col, v_tbl)
        USING p_keep, p_remove;
    END IF;
  END LOOP;

  -- 2) Todo lo que apunta por clave foránea (se descubre solo).
  --    Más una lista conocida por si alguna columna no tiene la clave
  --    foránea declarada (si la tiene, ya no quedan filas y no hace nada).
  FOR fk IN
    SELECT DISTINCT tbl, col FROM (
      SELECT con.conrelid::regclass::text AS tbl, att.attname::text AS col
      FROM pg_constraint con
      JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = con.conkey[1]
      WHERE con.contype = 'f' AND con.confrelid = format('public.%I', v_tbl)::regclass
        AND array_length(con.conkey, 1) = 1
      UNION
      SELECT x.tbl, x.col FROM (VALUES
        ('influencer', 'collaborations', 'influencer_id'), ('influencer', 'campaign_influencers', 'influencer_id'),
        ('influencer', 'opportunity_influencers', 'influencer_id'), ('influencer', 'offer_interests', 'influencer_id'),
        ('brand', 'collaborations', 'brand_id'), ('brand', 'opportunities', 'brand_id'), ('brand', 'offers', 'brand_id')
      ) AS x(et, tbl, col)
      WHERE x.et = p_type
        AND EXISTS (SELECT 1 FROM information_schema.columns ic
                     WHERE ic.table_schema = 'public' AND ic.table_name = x.tbl AND ic.column_name = x.col)
    ) q
  LOOP
    BEGIN
      EXECUTE format('UPDATE %s SET %I = $1 WHERE %I = $2', fk.tbl, fk.col, fk.col) USING p_keep, p_remove;
      GET DIAGNOSTICS n = ROW_COUNT; v_moved := v_moved + n;
    EXCEPTION WHEN unique_violation THEN
      -- Algo ya existía igual para la que queda (por ejemplo el mismo
      -- "Me interesa"): se pasa fila por fila y el duplicado se descarta.
      FOR v_ctid IN EXECUTE format('SELECT ctid FROM %s WHERE %I = $1', fk.tbl, fk.col) USING p_remove LOOP
        BEGIN
          EXECUTE format('UPDATE %s SET %I = $1 WHERE ctid = $2', fk.tbl, fk.col) USING p_keep, v_ctid;
          v_moved := v_moved + 1;
        EXCEPTION WHEN unique_violation THEN
          EXECUTE format('DELETE FROM %s WHERE ctid = $1', fk.tbl) USING v_ctid;
        END;
      END LOOP;
    END;
  END LOOP;

  -- 3) Lo que apunta por entity_type / entity_id (tareas, actividad…).
  FOREACH v_col IN ARRAY ARRAY['activities', 'tasks', 'assignments', 'notifications'] LOOP
    SELECT format_type(atttypid, atttypmod) INTO v_etype FROM pg_attribute
     WHERE attrelid = to_regclass('public.' || v_col) AND attname = 'entity_id' AND NOT attisdropped;
    IF v_etype = 'uuid' THEN
      EXECUTE format('UPDATE %I SET entity_id = $1 WHERE entity_type = $3 AND entity_id = $2', v_col) USING p_keep, p_remove, p_type;
      GET DIAGNOSTICS n = ROW_COUNT; v_moved := v_moved + n;
    ELSIF v_etype IS NOT NULL THEN
      EXECUTE format('UPDATE %I SET entity_id = $1 WHERE entity_type = $3 AND entity_id = $2', v_col) USING p_keep::text, p_remove::text, p_type;
      GET DIAGNOSTICS n = ROW_COUNT; v_moved := v_moved + n;
    END IF;
  END LOOP;
  IF to_regclass('public.relationship_changes') IS NOT NULL THEN
    UPDATE relationship_changes SET entity_id = p_keep WHERE entity_type = p_type AND entity_id = p_remove;
  END IF;

  -- 4) Se borra la duplicada y queda el rastro en la que queda.
  EXECUTE format('DELETE FROM %I WHERE id = $1', v_tbl) USING p_remove;
  PERFORM set_config('app.assigning', 'off', true);

  INSERT INTO activities (actor_id, entity_type, entity_id, type, title, description)
  VALUES (auth.uid(), p_type, p_keep::text, 'note', 'Fusionada con "' || v_other || '"',
          v_moved || ' registros vinculados pasaron a esta ficha.');

  RETURN jsonb_build_object('ok', true, 'moved', v_moved, 'kept', p_keep);
END $f$;


-- ── Permisos ────────────────────────────────────────────────
REVOKE ALL ON FUNCTION create_collab_confirmation(uuid), get_collab_confirmation(text),
  respond_collab_confirmation(text, text, date, time, text), merge_entities(text, uuid, uuid, text[])
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION create_collab_confirmation(uuid), merge_entities(text, uuid, uuid, text[]) TO authenticated;
-- El link lo abre la influencer sin cuenta: estas dos son públicas.
GRANT EXECUTE ON FUNCTION get_collab_confirmation(text), respond_collab_confirmation(text, text, date, time, text) TO anon, authenticated;

COMMIT;

-- Verificación: tiene que dar 3 filas con ok = true.
SELECT 'start_time' AS k, EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'collaborations' AND column_name = 'start_time') AS ok
UNION ALL SELECT 'collab_confirmations', (SELECT relrowsecurity FROM pg_class WHERE relname = 'collab_confirmations')
UNION ALL SELECT 'funciones', (SELECT count(*) = 4 FROM pg_proc WHERE proname IN ('create_collab_confirmation', 'get_collab_confirmation', 'respond_collab_confirmation', 'merge_entities'));

-- ROLLBACK (solo si hace falta; las fusiones ya hechas no se deshacen):
-- BEGIN;
-- DROP FUNCTION IF EXISTS merge_entities(text, uuid, uuid, text[]), respond_collab_confirmation(text, text, date, time, text),
--   get_collab_confirmation(text), create_collab_confirmation(uuid);
-- DROP TABLE IF EXISTS collab_confirmations;
-- ALTER TABLE collaborations DROP COLUMN IF EXISTS start_time;
-- COMMIT;
