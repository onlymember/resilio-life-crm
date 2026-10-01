-- ═══════════════════════════════════════════════════════════
-- 054 · Arreglo: la influencer no podía confirmar su visita
--
-- EL ERROR
--   En /confirmar, "Confirmo, voy" mostraba "Algo salió mal". La 050
--   pasaba la colaboración a confirmada con 'confirmed'::collab_status,
--   un nombre de tipo supuesto: el enum real de collaborations.status
--   se llama distinto, así que la función fallaba al ejecutarse y no
--   guardaba nada (ni la respuesta).
--
-- LO QUE HACE
--   1. respond_collab_confirmation: compara y asigna el estado sin
--      nombrar el tipo (un literal se convierte solo al enum que sea).
--      Lo secundario (actividad y aviso a la Scouter) ya no puede
--      tumbar la respuesta: si falla, la respuesta queda guardada igual.
--   2. log_activity_auto (trigger del timeline): cuando no hay sesión
--      (la influencer responde sin cuenta) usa a la Scouter de la ficha
--      como autora en vez de dejar el autor vacío.
--
-- No cambia datos. Misma firma y mismos permisos que la 050.
-- ═══════════════════════════════════════════════════════════

BEGIN;

CREATE OR REPLACE FUNCTION respond_collab_confirmation(
  p_token TEXT, p_response TEXT, p_date DATE DEFAULT NULL, p_time TIME DEFAULT NULL, p_note TEXT DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $f$
DECLARE
  r       collab_confirmations;
  c       collaborations;
  v_inf   TEXT;
  v_title TEXT;
  v_note  TEXT := nullif(btrim(coalesce(p_note, '')), '');
  v_actor UUID;
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
  IF NOT FOUND THEN RAISE EXCEPTION 'Link inválido.' USING HINT = 'link_invalid'; END IF;
  SELECT coalesce(name, username, 'La influencer') INTO v_inf FROM influencers WHERE id = c.influencer_id;
  v_inf   := coalesce(v_inf, 'La influencer');
  v_actor := coalesce(c.scouter_id, c.created_by);

  -- 1 · La respuesta. Es lo único que no puede fallar.
  UPDATE collab_confirmations
     SET responded_at = now(), response = p_response,
         proposed_date = CASE WHEN p_response = 'proposed' THEN p_date END,
         proposed_time = CASE WHEN p_response = 'proposed' THEN p_time END,
         note = left(v_note, 500)
   WHERE id = r.id;

  -- 2 · La colaboración.
  IF p_response = 'confirmed' THEN
    -- 'confirmed' sin tipo: Postgres lo convierte al enum de la columna.
    UPDATE collaborations SET status = 'confirmed'
     WHERE id = c.id AND status::text = 'proposed';
    UPDATE collaborations
       SET checklist = coalesce(checklist, '{}'::jsonb) || '{"confirmed": true}'::jsonb
     WHERE id = c.id;
    v_title := v_inf || ' confirmó la colaboración';
  ELSE
    v_title := CASE WHEN p_response = 'proposed'
                    THEN v_inf || ' propone otra fecha: ' || to_char(p_date, 'DD/MM') || coalesce(' ' || to_char(p_time, 'HH24:MI'), '')
                    ELSE v_inf || ' no puede ir' END;
    -- Queda en la agenda de la Scouter para resolverlo hoy.
    UPDATE collaborations SET next_action = v_title, next_action_at = now() WHERE id = c.id;
  END IF;

  -- 3 · Lo secundario: si algo falla acá, la respuesta ya quedó.
  BEGIN
    IF v_actor IS NOT NULL THEN
      INSERT INTO activities (actor_id, entity_type, entity_id, type, title, description)
      VALUES (v_actor, 'collaboration', c.id::text, 'note', v_title, v_note);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'respond_collab_confirmation activity: %', SQLERRM;
  END;

  BEGIN
    IF c.scouter_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, type, title, body, entity_type, entity_id)
      VALUES (c.scouter_id, 'collab_confirmation', v_title, v_note, 'collaboration', c.id);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'respond_collab_confirmation notification: %', SQLERRM;
  END;

  RETURN jsonb_build_object('ok', true, 'response', p_response);
END $f$;

REVOKE ALL ON FUNCTION respond_collab_confirmation(text, text, date, time, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION respond_collab_confirmation(text, text, date, time, text) TO anon, authenticated;


-- Timeline automático: sin sesión, el autor es la Scouter de la ficha.
CREATE OR REPLACE FUNCTION log_activity_auto()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_type  TEXT;
  v_title TEXT;
  v_ent   TEXT := TG_ARGV[0];
  v_row   JSONB := to_jsonb(NEW);
  v_actor UUID;
BEGIN
  -- assign_entity maneja su propio logging
  IF current_setting('app.assigning', true) = 'on' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    v_type  := 'created';
    v_title := format('%s creado', initcap(v_ent));
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    v_type  := 'status_change';
    v_title := format('Estado: %s → %s', OLD.status, NEW.status);
  ELSE
    RETURN NEW;
  END IF;

  v_actor := COALESCE(auth.uid(),
                      (v_row->>'created_by')::uuid,
                      (v_row->>'scouter_id')::uuid,
                      (v_row->>'owner_scouter_id')::uuid);
  IF v_actor IS NULL THEN RETURN NEW; END IF;

  INSERT INTO activities (actor_id, entity_type, entity_id, type, title, metadata)
  VALUES (
    v_actor,
    v_ent, NEW.id::text, v_type, v_title,
    CASE WHEN TG_OP = 'UPDATE'
         THEN jsonb_build_object('from', OLD.status, 'to', NEW.status)
         ELSE '{}'::jsonb END
  );
  RETURN NEW;
END $fn$;

COMMIT;


-- ── Verificación: tiene que dar ok = true ───────────────────
SELECT 'sin_tipo_supuesto' AS k,
       position('collab_status' IN pg_get_functiondef('respond_collab_confirmation(text,text,date,time,text)'::regprocedure)) = 0 AS ok;
