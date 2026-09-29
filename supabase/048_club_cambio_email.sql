-- ═══════════════════════════════════════════════════════════
-- 048 · Club: el cambio de email de una influencer lo autoriza Dirección
--
-- · La influencer ya no puede cambiar su email desde el perfil: lo pide.
-- · super_admin / network_direction aprueban o rechazan desde el CRM
--   (Leads del Club). Al aprobar cambia el email de la ficha Y el de su
--   cuenta de acceso (con el que entra al Club).
-- · Solo agrega. Rollback al final (comentado).
-- ═══════════════════════════════════════════════════════════
BEGIN;

CREATE TABLE IF NOT EXISTS influencer_email_requests (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  influencer_id  UUID NOT NULL REFERENCES influencers(id) ON DELETE CASCADE,
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  old_email      TEXT,
  new_email      TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  decided_by     UUID,
  decided_at     TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ier_status ON influencer_email_requests(status, created_at DESC);

ALTER TABLE influencer_email_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON influencer_email_requests FROM anon;
REVOKE INSERT, UPDATE, DELETE ON influencer_email_requests FROM authenticated;
DROP POLICY IF EXISTS ier_select ON influencer_email_requests;
CREATE POLICY ier_select ON influencer_email_requests FOR SELECT TO authenticated
  USING (app_is_direction());

-- Candado: una sesión de influencer no puede cambiar el email de la
-- ficha (ni por update_my_profile ni por ningún otro camino), salvo
-- dentro de decide_email_change(). El CRM no se ve afectado: el equipo
-- no tiene fila en influencer_accounts.
CREATE OR REPLACE FUNCTION influencers_lock_email()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $f$
BEGIN
  IF NEW.email IS DISTINCT FROM OLD.email
     AND coalesce(current_setting('app.email_approved', true), 'off') <> 'on'
     AND EXISTS (SELECT 1 FROM influencer_accounts WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'El cambio de email lo autoriza Resilio.' USING ERRCODE = '42501', HINT = 'email_requires_approval';
  END IF;
  RETURN NEW;
END $f$;
DROP TRIGGER IF EXISTS trg_influencers_lock_email ON influencers;
CREATE TRIGGER trg_influencers_lock_email BEFORE UPDATE OF email ON influencers
  FOR EACH ROW EXECUTE FUNCTION influencers_lock_email();

-- La influencer pide el cambio.
CREATE OR REPLACE FUNCTION request_email_change(p_new_email TEXT)
RETURNS JSONB LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $f$
DECLARE
  v_inf UUID := app_require_influencer();
  v_new TEXT := norm_email(p_new_email);
  v_old TEXT;
BEGIN
  IF v_new IS NULL OR v_new !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'Revisá el email.' USING ERRCODE = '22023', HINT = 'email_invalid';
  END IF;
  SELECT email INTO v_old FROM influencers WHERE id = v_inf;
  IF v_new = norm_email(v_old) THEN
    RAISE EXCEPTION 'Es el mismo email.' USING ERRCODE = '22023', HINT = 'email_same';
  END IF;
  IF find_influencer_by_keys(NULL, v_new, v_inf) IS NOT NULL
     OR EXISTS (SELECT 1 FROM auth.users WHERE lower(email) = v_new AND id <> auth.uid()) THEN
    RAISE EXCEPTION 'Ese email ya está registrado.' USING ERRCODE = '23505', HINT = 'contact_taken';
  END IF;
  UPDATE influencer_email_requests SET status = 'rejected', decided_at = now()
   WHERE influencer_id = v_inf AND status = 'pending';
  INSERT INTO influencer_email_requests (influencer_id, user_id, old_email, new_email)
  VALUES (v_inf, auth.uid(), v_old, v_new);
  PERFORM notify_direction('email_change', 'Pedido de cambio de email',
    (SELECT name FROM influencers WHERE id = v_inf) || ': ' || coalesce(v_old, '—') || ' → ' || v_new,
    'influencer', v_inf);
  RETURN jsonb_build_object('ok', true);
END $f$;

-- ¿Tiene un pedido pendiente? (para mostrarlo en su perfil)
CREATE OR REPLACE FUNCTION my_email_request()
RETURNS JSONB LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $f$
  SELECT jsonb_build_object('new_email', new_email, 'created_at', created_at)
  FROM influencer_email_requests
  WHERE user_id = auth.uid() AND status = 'pending'
  ORDER BY created_at DESC LIMIT 1;
$f$;

-- Dirección decide. Aprobar cambia ficha + cuenta de acceso.
CREATE OR REPLACE FUNCTION decide_email_change(p_id UUID, p_approve BOOLEAN)
RETURNS VOID LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $f$
DECLARE r influencer_email_requests;
BEGIN
  IF NOT app_is_direction() THEN
    RAISE EXCEPTION 'Solo Dirección autoriza cambios de email.' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO r FROM influencer_email_requests WHERE id = p_id AND status = 'pending' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pedido inexistente o ya resuelto.'; END IF;
  IF p_approve THEN
    IF EXISTS (SELECT 1 FROM auth.users WHERE lower(email) = r.new_email AND id <> r.user_id) THEN
      RAISE EXCEPTION 'Ese email ya tiene otra cuenta.';
    END IF;
    PERFORM set_config('app.email_approved', 'on', true);
    UPDATE influencers SET email = r.new_email WHERE id = r.influencer_id;
    UPDATE auth.users SET email = r.new_email, updated_at = now() WHERE id = r.user_id;
    UPDATE auth.identities
       SET identity_data = jsonb_set(identity_data, '{email}', to_jsonb(r.new_email)), updated_at = now()
     WHERE user_id = r.user_id AND provider = 'email';
    PERFORM set_config('app.email_approved', 'off', true);
  END IF;
  UPDATE influencer_email_requests
     SET status = CASE WHEN p_approve THEN 'approved' ELSE 'rejected' END,
         decided_by = auth.uid(), decided_at = now()
   WHERE id = p_id;
END $f$;

REVOKE ALL ON FUNCTION influencers_lock_email(), request_email_change(text), my_email_request(),
  decide_email_change(uuid, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION request_email_change(text), my_email_request(),
  decide_email_change(uuid, boolean) TO authenticated;

COMMIT;

-- Verificación: tiene que dar 1 fila con rls = true.
SELECT relname, relrowsecurity AS rls FROM pg_class WHERE relname = 'influencer_email_requests';

-- ROLLBACK (solo si hace falta):
-- BEGIN;
-- DROP TRIGGER IF EXISTS trg_influencers_lock_email ON influencers;
-- DROP FUNCTION IF EXISTS decide_email_change(uuid, boolean), my_email_request(), request_email_change(text), influencers_lock_email();
-- DROP TABLE IF EXISTS influencer_email_requests;
-- COMMIT;
