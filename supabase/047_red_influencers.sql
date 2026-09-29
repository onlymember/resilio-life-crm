-- ═══════════════════════════════════════════════════════════
-- 047 · Red de influencers: invitaciones, cuentas, ofertas y votos
--
-- QUE AGREGA
--   La parte de la red que ve la influencer: entra solo por invitación,
--   ve ofertas, marca "Me interesa" y edita unos pocos datos suyos.
--   Del lado del CRM: la cola de leads de Dirección, la sección Ofertas
--   (super_admin, admin, network_direction: se crean desde una marca y se
--   activan o desactivan) y los intereses que llegan a cada ficha.
--
-- LA REGLA QUE SOSTIENE TODO
--   Una persona = una ficha en `influencers`. La app no tiene una base
--   de influencers propia: cada cuenta apunta a una ficha del CRM
--   (influencer_accounts.influencer_id).
--
-- POR QUE NO ROMPE NADA
--   · Solo agrega. No modifica ninguna tabla ni policy existente.
--   · La única función existente que cambia es handle_new_user(): se le
--     agrega UNA salida temprana para las cuentas de influencer, para
--     que no aparezcan en el Admin como usuarias pendientes. El resto
--     queda idéntico (el original está en 047_red_influencers_rollback.sql).
--   · Las influencers NO tienen fila en profiles ni en user_roles. Para
--     las policies actuales son un usuario sin rol: todas les devuelven
--     cero filas (ver docs/network/RBAC.md). No hace falta tocar ninguna.
--   · La influencer nunca lee tablas: todo pasa por funciones de esta
--     migración que devuelven solo campos públicos.
--   · Las claves hacia `influencers` son CASCADE o SET NULL. Con
--     RESTRICT, borrar una ficha desde el CRM empezaría a fallar.
--
-- QUIEN PUEDE LLAMAR QUE
--   anon (sin sesión) ....... check_invitation, submit_lead
--   influencer (con cuenta) . accept_invitation, my_profile,
--                             update_my_profile, feed_cities, my_feed,
--                             mark_feed_seen, vote_offer, my_interests,
--                             create_invitation, my_invitations
--   CRM (scouter) ........... create_invitation (alta y activación de
--                             sus fichas), tablas por RLS
--   CRM (Dirección) ......... approve_lead, reject_lead, todo lo anterior
--   CRM (super_admin, admin,
--        network_direction) . crear / activar / desactivar ofertas (RLS)
--                             y subir sus fotos (Storage, bucket 'offers')
--   CRM (todo el equipo) .... red_conversion(): % de "Me interesa" que
--                             terminaron en colaboración (métrica principal)
--
-- DECISIONES DE NEGOCIO (Luca, 2026-09-28) · todas en red_limits()
--   · Tope de "Me interesa": 10 cada 7 días
--   · Cupo de invitaciones de influencer: 5 cada 30 días
--   · Vencimiento de un link: 30 días
--   Cambiarlas es editar un número en red_limits(). Las ventanas son
--   móviles (now() - interval) a propósito: no dependen del huso horario
--   (ver docs/network/ESCALA.md).
--
-- PARA LA APP (club.resilio.company, es/en)
--   · Login con email y contraseña. Al registrarse manda
--     options.data = { kind: 'influencer' } (ver handle_new_user).
--   · Los errores para la influencer traen HINT con una clave estable
--     (link_invalid, interest_quota, ...): la app traduce por esa clave,
--     no por el texto.
--   · La influencer no tiene foto de perfil. Las ofertas sí: se suben
--     al bucket 'offers' de Storage (sección 7).
-- ═══════════════════════════════════════════════════════════

BEGIN;

-- ── 1 · Alta en auth: las influencers no crean perfil del CRM ───────
-- Idéntica a la que está en producción (volcada el 2026-09-28) más el IF.
-- La app de influencers manda options.data = { kind: 'influencer' } en
-- el signUp; eso llega acá como raw_user_meta_data.
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF coalesce(NEW.raw_user_meta_data->>'kind', '') = 'influencer' THEN
    RETURN NEW;
  END IF;

  INSERT INTO profiles (id, email, nombre, username, estado)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nombre', ''),
    split_part(NEW.email, '@', 1),
    'pendiente'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END $function$;


-- ── 2 · Tablas ──────────────────────────────────────────────

-- Cuenta de la app ↔ ficha del CRM. Una ficha tiene a lo sumo una cuenta.
CREATE TABLE IF NOT EXISTS influencer_accounts (
  user_id        UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  influencer_id  UUID NOT NULL UNIQUE REFERENCES influencers(id) ON DELETE CASCADE,
  status         TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended')),
  invitation_id  UUID,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at   TIMESTAMPTZ
);

-- Preferencias que edita la influencer. Van aparte a propósito:
-- `influencers.category` es la clasificación del scouter y no se pisa.
CREATE TABLE IF NOT EXISTS influencer_preferences (
  influencer_id  UUID PRIMARY KEY REFERENCES influencers(id) ON DELETE CASCADE,
  city_ids       UUID[] NOT NULL DEFAULT '{}',
  categories     TEXT[] NOT NULL DEFAULT '{}',
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Historial de lo que la influencer cambió de su ficha desde la app.
CREATE TABLE IF NOT EXISTS influencer_profile_changes (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  influencer_id  UUID NOT NULL REFERENCES influencers(id) ON DELETE CASCADE,
  changes        JSONB NOT NULL,          -- { campo: { from, to } }
  changed_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ipc_inf ON influencer_profile_changes(influencer_id, changed_at DESC);

-- Invitaciones. Dos tipos:
--   join       → alguien nuevo; el link abre el formulario /sumate
--   activation → una ficha que ya existe; el link crea su cuenta
CREATE TABLE IF NOT EXISTS invitations (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token                  TEXT NOT NULL UNIQUE,
  kind                   TEXT NOT NULL CHECK (kind IN ('join','activation')),
  inviter_kind           TEXT NOT NULL CHECK (inviter_kind IN ('scouter','influencer','agency')),
  inviter_user_id        UUID NOT NULL,
  inviter_influencer_id  UUID REFERENCES influencers(id) ON DELETE SET NULL,
  target_influencer_id   UUID REFERENCES influencers(id) ON DELETE CASCADE,
  invitee_hint           TEXT,
  expires_at             TIMESTAMPTZ NOT NULL,
  used_at                TIMESTAMPTZ,
  used_by                UUID,
  revoked_at             TIMESTAMPTZ,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (kind <> 'activation' OR target_influencer_id IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_inv_inviter ON invitations(inviter_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inv_target  ON invitations(target_influencer_id);

-- Leads: lo que llega por el formulario. Los aprueba Dirección.
CREATE TABLE IF NOT EXISTS influencer_leads (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_id          UUID REFERENCES invitations(id) ON DELETE SET NULL,
  inviter_kind           TEXT NOT NULL,
  inviter_user_id        UUID,
  inviter_influencer_id  UUID REFERENCES influencers(id) ON DELETE SET NULL,
  suggested_owner_id     UUID,             -- a quién se asignaría la ficha
  matched_influencer_id  UUID REFERENCES influencers(id) ON DELETE SET NULL,
  name                   TEXT NOT NULL,
  instagram              TEXT NOT NULL,
  email                  TEXT NOT NULL,
  whatsapp               TEXT,
  city_id                UUID REFERENCES cities(id),
  city_text              TEXT,
  categories             TEXT[] NOT NULL DEFAULT '{}',
  message                TEXT,
  consent_at             TIMESTAMPTZ NOT NULL,
  consent_version        TEXT NOT NULL,
  status                 TEXT NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending','approved','rejected')),
  decided_by             UUID,
  decided_at             TIMESTAMPTZ,
  decision_note          TEXT,
  influencer_id          UUID REFERENCES influencers(id) ON DELETE SET NULL,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_leads_status ON influencer_leads(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_owner  ON influencer_leads(suggested_owner_id);

-- Ofertas: la card que ve la influencer. Sección nueva del CRM para
-- super_admin, admin y network_direction: se elige una marca del
-- sistema, se crea la oferta (foto, título, ciudad…) y se activa o
-- desactiva. NO es `opportunities` (el pipeline comercial, con montos
-- y notas) y no depende de ella.
-- Campos decididos: marca, ciudad, título, foto y tipo. Nada más.

-- Tipos de oferta: catálogo editable (como activation_types), con
-- etiqueta en español e inglés para la app.
CREATE TABLE IF NOT EXISTS offer_types (
  slug        TEXT PRIMARY KEY CHECK (slug ~ '^[a-z_]{2,30}$'),
  label_es    TEXT NOT NULL,
  label_en    TEXT NOT NULL,
  sort_order  INT  NOT NULL DEFAULT 100,
  active      BOOLEAN NOT NULL DEFAULT true
);
INSERT INTO offer_types (slug, label_es, label_en, sort_order) VALUES
  ('evento',       'Evento',       'Event',       10),
  ('experiencia',  'Experiencia',  'Experience',  20),
  ('gastronomia',  'Gastronomía',  'Food & drink',30),
  ('producto',     'Producto',     'Product',     40),
  ('viaje',        'Viaje',        'Travel',      50),
  ('bienestar',    'Bienestar',    'Wellness',    60),
  ('otro',         'Otro',         'Other',       99)
ON CONFLICT (slug) DO NOTHING;

CREATE TABLE IF NOT EXISTS offers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id        UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  city_id         UUID NOT NULL REFERENCES cities(id),
  title           TEXT NOT NULL CHECK (length(btrim(title)) BETWEEN 3 AND 120),
  type_slug       TEXT NOT NULL REFERENCES offer_types(slug),
  -- Ruta dentro del bucket 'offers' de Storage (ver sección 7).
  image_path      TEXT CHECK (image_path IS NULL OR image_path ~ '^[A-Za-z0-9/_.-]{1,200}$'),
  status          TEXT NOT NULL DEFAULT 'inactive'
                  CHECK (status IN ('active','inactive')),
  activated_at    TIMESTAMPTZ,             -- lo pone el trigger; alimenta el "Nueva"
  created_by      UUID NOT NULL DEFAULT auth.uid(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- No se puede activar una oferta sin foto.
  CHECK (status = 'inactive' OR image_path IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_offers_feed  ON offers(city_id, status);
CREATE INDEX IF NOT EXISTS idx_offers_brand ON offers(brand_id);

DROP TRIGGER IF EXISTS trg_touch ON offers;
CREATE TRIGGER trg_touch BEFORE UPDATE ON offers
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- Cada vez que pasa a activa, se marca el momento: la app muestra
-- "Nueva" a quien no entró desde entonces.
CREATE OR REPLACE FUNCTION offers_mark_activated()
RETURNS TRIGGER LANGUAGE plpgsql AS $f$
BEGIN
  IF NEW.status = 'active'
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'active') THEN
    NEW.activated_at := now();
  END IF;
  RETURN NEW;
END $f$;
DROP TRIGGER IF EXISTS trg_offers_activated ON offers;
CREATE TRIGGER trg_offers_activated BEFORE INSERT OR UPDATE OF status ON offers
  FOR EACH ROW EXECUTE FUNCTION offers_mark_activated();

-- Votos. El estado interno (internal_*) lo ve y lo toca solo el CRM:
-- la app nunca lo devuelve (decisión: sin estados de resultado).
CREATE TABLE IF NOT EXISTS offer_interests (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id          UUID NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  influencer_id     UUID NOT NULL REFERENCES influencers(id) ON DELETE CASCADE,
  vote              TEXT NOT NULL CHECK (vote IN ('interested','not_interested')),
  voted_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  internal_status   TEXT NOT NULL DEFAULT 'new'
                    CHECK (internal_status IN ('new','reviewed','contacted','discarded','matched')),
  internal_note     TEXT,
  collaboration_id  UUID REFERENCES collaborations(id) ON DELETE SET NULL,
  reviewed_by       UUID,
  reviewed_at       TIMESTAMPTZ,
  UNIQUE (offer_id, influencer_id)
);
CREATE INDEX IF NOT EXISTS idx_oi_inf   ON offer_interests(influencer_id, voted_at DESC);
CREATE INDEX IF NOT EXISTS idx_oi_offer ON offer_interests(offer_id, vote);


-- ── 3 · RLS ─────────────────────────────────────────────────
-- Todas con RLS y sin nada para anon. Las policies son para el CRM;
-- la influencer no matchea ninguna rama (no tiene rol, no es dueña,
-- no tiene ciudades visibles) y usa las funciones de la sección 5.

-- ¿Quien llama es del equipo? (tiene algún rol vigente del CRM)
CREATE OR REPLACE FUNCTION app_is_team_member()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $f$
  SELECT EXISTS (SELECT 1 FROM user_roles
                 WHERE user_id = auth.uid() AND revoked_at IS NULL);
$f$;

-- Quién gestiona Ofertas: super_admin, admin y network_direction.
-- Más amplia que app_is_direction() a propósito: incluye 'admin'.
CREATE OR REPLACE FUNCTION app_can_manage_offers()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $f$
  SELECT EXISTS (SELECT 1 FROM user_roles
                 WHERE user_id = auth.uid() AND revoked_at IS NULL
                   AND role IN ('super_admin','admin','network_direction'));
$f$;

ALTER TABLE influencer_accounts        ENABLE ROW LEVEL SECURITY;
ALTER TABLE influencer_preferences     ENABLE ROW LEVEL SECURITY;
ALTER TABLE influencer_profile_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations                ENABLE ROW LEVEL SECURITY;
ALTER TABLE influencer_leads           ENABLE ROW LEVEL SECURITY;
ALTER TABLE offers                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE offer_interests            ENABLE ROW LEVEL SECURITY;
ALTER TABLE offer_types                ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON influencer_accounts, influencer_preferences, influencer_profile_changes,
              invitations, influencer_leads, offers, offer_interests, offer_types FROM anon;

-- Catálogo de tipos: lo lee el equipo (para el selector); lo edita
-- quien gestiona ofertas. La app lo recibe dentro de my_feed().
DROP POLICY IF EXISTS ot_select ON offer_types;
CREATE POLICY ot_select ON offer_types FOR SELECT TO authenticated
  USING (app_is_team_member());
DROP POLICY IF EXISTS ot_write ON offer_types;
CREATE POLICY ot_write ON offer_types FOR ALL TO authenticated
  USING (app_can_manage_offers()) WITH CHECK (app_can_manage_offers());

-- Lo que cuelga de una ficha se ve con el mismo permiso que la ficha.
DROP POLICY IF EXISTS ia_select ON influencer_accounts;
CREATE POLICY ia_select ON influencer_accounts FOR SELECT TO authenticated
  USING (app_can_see_entity('influencer', influencer_id));
-- Suspender una cuenta: solo Dirección, y solo la columna status.
DROP POLICY IF EXISTS ia_update ON influencer_accounts;
CREATE POLICY ia_update ON influencer_accounts FOR UPDATE TO authenticated
  USING (app_is_direction()) WITH CHECK (app_is_direction());
REVOKE INSERT, UPDATE, DELETE ON influencer_accounts FROM authenticated;
GRANT UPDATE (status) ON influencer_accounts TO authenticated;

DROP POLICY IF EXISTS ip_select ON influencer_preferences;
CREATE POLICY ip_select ON influencer_preferences FOR SELECT TO authenticated
  USING (app_can_see_entity('influencer', influencer_id));
REVOKE INSERT, UPDATE, DELETE ON influencer_preferences FROM authenticated;

DROP POLICY IF EXISTS ipc_select ON influencer_profile_changes;
CREATE POLICY ipc_select ON influencer_profile_changes FOR SELECT TO authenticated
  USING (app_can_see_entity('influencer', influencer_id));
REVOKE INSERT, UPDATE, DELETE ON influencer_profile_changes FROM authenticated;

-- Invitaciones: Dirección ve todas; un scouter, las suyas. Las de
-- influencers las lee cada una con my_invitations().
DROP POLICY IF EXISTS inv_select ON invitations;
CREATE POLICY inv_select ON invitations FOR SELECT TO authenticated
  USING (app_is_direction()
         OR (inviter_kind = 'scouter' AND inviter_user_id = auth.uid()));
-- Revocar un link: quien lo creó (scouter) o Dirección, solo revoked_at.
DROP POLICY IF EXISTS inv_revoke ON invitations;
CREATE POLICY inv_revoke ON invitations FOR UPDATE TO authenticated
  USING (app_is_direction()
         OR (inviter_kind = 'scouter' AND inviter_user_id = auth.uid()))
  WITH CHECK (app_is_direction()
         OR (inviter_kind = 'scouter' AND inviter_user_id = auth.uid()));
REVOKE INSERT, UPDATE, DELETE ON invitations FROM authenticated;
GRANT UPDATE (revoked_at) ON invitations TO authenticated;

-- Leads: Dirección ve todos; el scouter ve (solo lectura) los que le
-- tocarían, para seguir a sus invitados sin preguntar.
DROP POLICY IF EXISTS leads_select ON influencer_leads;
CREATE POLICY leads_select ON influencer_leads FOR SELECT TO authenticated
  USING (app_is_direction() OR suggested_owner_id = auth.uid());
REVOKE INSERT, UPDATE, DELETE ON influencer_leads FROM authenticated;

-- Ofertas. Las gestionan super_admin, admin y network_direction.
-- Todo el equipo las puede leer (es el mismo contenido que ven las
-- influencers), para entender los intereses de sus fichas.
DROP POLICY IF EXISTS offers_select ON offers;
CREATE POLICY offers_select ON offers FOR SELECT TO authenticated
  USING (app_is_team_member());
DROP POLICY IF EXISTS offers_insert ON offers;
CREATE POLICY offers_insert ON offers FOR INSERT TO authenticated
  WITH CHECK (app_can_manage_offers() AND created_by = auth.uid());
DROP POLICY IF EXISTS offers_update ON offers;
CREATE POLICY offers_update ON offers FOR UPDATE TO authenticated
  USING (app_can_manage_offers()) WITH CHECK (app_can_manage_offers());
DROP POLICY IF EXISTS offers_delete ON offers;
CREATE POLICY offers_delete ON offers FOR DELETE TO authenticated
  USING (app_can_manage_offers());

-- Votos: se ven con el permiso de la ficha. El CRM solo puede tocar
-- las columnas internas; el voto en sí lo escribe vote_offer().
DROP POLICY IF EXISTS oi_select ON offer_interests;
CREATE POLICY oi_select ON offer_interests FOR SELECT TO authenticated
  USING (app_can_see_entity('influencer', influencer_id));
DROP POLICY IF EXISTS oi_update ON offer_interests;
CREATE POLICY oi_update ON offer_interests FOR UPDATE TO authenticated
  USING (app_can_see_entity('influencer', influencer_id))
  WITH CHECK (app_can_see_entity('influencer', influencer_id));
REVOKE INSERT, UPDATE, DELETE ON offer_interests FROM authenticated;
GRANT UPDATE (internal_status, internal_note, collaboration_id, reviewed_by, reviewed_at)
  ON offer_interests TO authenticated;


-- ── 4 · Ayudantes ───────────────────────────────────────────

-- Los números de negocio, en un solo lugar.
CREATE OR REPLACE FUNCTION red_limits()
RETURNS TABLE (interest_cap INT, interest_window INTERVAL,
               invite_quota INT, invite_window INTERVAL, invite_ttl INTERVAL)
LANGUAGE sql IMMUTABLE AS $f$
  SELECT 10, interval '7 days', 5, interval '30 days', interval '30 days';
$f$;

-- La ficha de quien llama, solo si su cuenta y su ficha están activas.
-- Si la ficha pasa a inactiva en el CRM, la app deja de funcionarle.
CREATE OR REPLACE FUNCTION app_my_influencer_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $f$
  SELECT a.influencer_id
  FROM influencer_accounts a
  JOIN influencers i ON i.id = a.influencer_id
  WHERE a.user_id = auth.uid()
    AND a.status = 'active'
    AND i.status = 'active';
$f$;

CREATE OR REPLACE FUNCTION app_require_influencer()
RETURNS UUID LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $f$
DECLARE v UUID := app_my_influencer_id();
BEGIN
  IF v IS NULL THEN
    RAISE EXCEPTION 'Tu acceso no está activo.' USING ERRCODE = '42501', HINT = 'access_inactive';
  END IF;
  RETURN v;
END $f$;

-- Normalizadores: los mismos criterios que check_duplicates_bulk (043).
CREATE OR REPLACE FUNCTION norm_instagram(p TEXT)
RETURNS TEXT LANGUAGE sql IMMUTABLE AS $f$
  SELECT nullif(lower(btrim(replace(
           regexp_replace(coalesce(p,''), '^\s*(https?://)?(www\.)?instagram\.com/', '', 'i'),
           '@',''), ' /')), '');
$f$;

CREATE OR REPLACE FUNCTION norm_email(p TEXT)
RETURNS TEXT LANGUAGE sql IMMUTABLE AS $f$
  SELECT nullif(lower(btrim(coalesce(p,''))), '');
$f$;

-- Una ficha que ya usa ese instagram o ese email (excluyendo una).
CREATE OR REPLACE FUNCTION find_influencer_by_keys(p_ig TEXT, p_email TEXT, p_exclude UUID DEFAULT NULL)
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $f$
  SELECT i.id FROM influencers i
  WHERE (p_exclude IS NULL OR i.id <> p_exclude)
    AND ((norm_instagram(p_ig) IS NOT NULL AND norm_instagram(i.instagram) = norm_instagram(p_ig))
      OR (norm_email(p_email)  IS NOT NULL AND norm_email(i.email)         = norm_email(p_email)))
  LIMIT 1;
$f$;

-- Token: 64 hex de dos UUID v4 (~244 bits). Adivinarlo no es viable,
-- así que no hace falta limitar intentos contra fuerza bruta.
CREATE OR REPLACE FUNCTION new_invitation_token()
RETURNS TEXT LANGUAGE sql VOLATILE AS $f$
  SELECT replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
$f$;

-- Aviso interno (tabla notifications de la 015). Nunca a una influencer.
CREATE OR REPLACE FUNCTION notify_team(p_user UUID, p_type TEXT, p_title TEXT,
                                       p_body TEXT, p_entity_type TEXT, p_entity_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $f$
BEGIN
  IF p_user IS NULL OR NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_user) THEN
    RETURN;
  END IF;
  INSERT INTO notifications (user_id, type, title, body, entity_type, entity_id)
  VALUES (p_user, p_type, p_title, p_body, p_entity_type, p_entity_id);
END $f$;

CREATE OR REPLACE FUNCTION notify_direction(p_type TEXT, p_title TEXT, p_body TEXT,
                                            p_entity_type TEXT, p_entity_id UUID)
RETURNS VOID LANGUAGE sql SECURITY DEFINER SET search_path = public AS $f$
  INSERT INTO notifications (user_id, type, title, body, entity_type, entity_id)
  SELECT DISTINCT r.user_id, p_type, p_title, p_body, p_entity_type, p_entity_id
  FROM user_roles r JOIN profiles p ON p.id = r.user_id
  WHERE r.revoked_at IS NULL AND r.role IN ('super_admin','network_direction');
$f$;


-- ── 5 · Funciones de la app y del flujo ─────────────────────

-- 5.1 · Invitar ----------------------------------------------------
-- Scouter / lead de territorio → 'scouter'. Dirección → 'agency'.
-- Influencer con cuenta → 'influencer', con cupo.
-- activation: solo el equipo, sobre una ficha que puede ver y que
-- todavía no tiene cuenta.
CREATE OR REPLACE FUNCTION create_invitation(
  p_kind TEXT DEFAULT 'join',
  p_target_influencer UUID DEFAULT NULL,
  p_hint TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $f$
DECLARE
  c_quota      INT      := (SELECT invite_quota  FROM red_limits());
  c_quota_win  INTERVAL := (SELECT invite_window FROM red_limits());
  c_ttl        INTERVAL := (SELECT invite_ttl    FROM red_limits());
  v_inviter_kind TEXT;
  v_my_inf     UUID;
  v_used       INT;
  v_row        invitations;
BEGIN
  IF p_kind NOT IN ('join','activation') THEN
    RAISE EXCEPTION 'Tipo de invitación inválido.';
  END IF;

  IF app_is_direction() THEN
    v_inviter_kind := 'agency';
  ELSIF EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND revoked_at IS NULL
                  AND role IN ('scouter','city_lead','country_lead','regional_lead')) THEN
    v_inviter_kind := 'scouter';
  ELSE
    v_my_inf := app_my_influencer_id();
    IF v_my_inf IS NULL THEN
      RAISE EXCEPTION 'No podés crear invitaciones.' USING ERRCODE = '42501', HINT = 'invite_forbidden';
    END IF;
    v_inviter_kind := 'influencer';
  END IF;

  IF p_kind = 'activation' THEN
    IF v_inviter_kind = 'influencer' THEN
      RAISE EXCEPTION 'No podés crear este tipo de invitación.' USING ERRCODE = '42501', HINT = 'invite_forbidden';
    END IF;
    IF p_target_influencer IS NULL
       OR NOT app_can_see_entity('influencer', p_target_influencer) THEN
      RAISE EXCEPTION 'Ficha inexistente o sin permiso.' USING ERRCODE = '42501';
    END IF;
    IF EXISTS (SELECT 1 FROM influencer_accounts WHERE influencer_id = p_target_influencer) THEN
      RAISE EXCEPTION 'Esta influencer ya tiene acceso a la app.';
    END IF;
  ELSIF p_target_influencer IS NOT NULL THEN
    RAISE EXCEPTION 'Una invitación de alta no apunta a una ficha.';
  END IF;

  IF v_inviter_kind = 'influencer' THEN
    SELECT count(*) INTO v_used FROM invitations
    WHERE inviter_user_id = auth.uid() AND created_at > now() - c_quota_win;
    IF v_used >= c_quota THEN
      RAISE EXCEPTION 'Ya usaste tus % invitaciones de este mes.', c_quota USING HINT = 'invite_quota';
    END IF;
  END IF;

  INSERT INTO invitations (token, kind, inviter_kind, inviter_user_id, inviter_influencer_id,
                           target_influencer_id, invitee_hint, expires_at)
  VALUES (new_invitation_token(), p_kind, v_inviter_kind, auth.uid(), v_my_inf,
          p_target_influencer, left(btrim(p_hint), 120), now() + c_ttl)
  RETURNING * INTO v_row;

  RETURN jsonb_build_object('id', v_row.id, 'token', v_row.token,
                            'kind', v_row.kind, 'expires_at', v_row.expires_at);
END $f$;

-- Las invitaciones de la influencer que llama, y su cupo.
CREATE OR REPLACE FUNCTION my_invitations()
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $f$
DECLARE v_inf UUID := app_require_influencer();
BEGIN
  RETURN jsonb_build_object(
    'quota_left', greatest(0, (SELECT invite_quota FROM red_limits())
                              - (SELECT count(*) FROM invitations
                                 WHERE inviter_user_id = auth.uid()
                                   AND created_at > now() - (SELECT invite_window FROM red_limits()))),
    'items', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
               'token', token, 'hint', invitee_hint, 'created_at', created_at,
               'expires_at', expires_at,
               'state', CASE WHEN used_at    IS NOT NULL THEN 'used'
                             WHEN revoked_at IS NOT NULL THEN 'revoked'
                             WHEN expires_at < now()     THEN 'expired'
                             ELSE 'pending' END)
             ORDER BY created_at DESC)
      FROM invitations WHERE inviter_user_id = auth.uid()), '[]'::jsonb));
END $f$;

-- 5.2 · Link público ------------------------------------------------
-- Sin sesión. Dice solo si el link sirve y quién invita.
CREATE OR REPLACE FUNCTION check_invitation(p_token TEXT)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $f$
DECLARE
  v invitations;
  v_by TEXT;
BEGIN
  SELECT * INTO v FROM invitations WHERE token = btrim(p_token);
  IF NOT FOUND OR v.used_at IS NOT NULL OR v.revoked_at IS NOT NULL OR v.expires_at < now() THEN
    RETURN jsonb_build_object('valid', false);
  END IF;

  v_by := CASE v.inviter_kind
    WHEN 'agency' THEN 'Resilio'
    WHEN 'influencer' THEN (SELECT coalesce('@' || norm_instagram(instagram), name)
                            FROM influencers WHERE id = v.inviter_influencer_id)
    ELSE (SELECT coalesce(nullif(btrim(sobrenombre),''), nullif(btrim(nombre),''), 'Resilio')
          FROM profiles WHERE id = v.inviter_user_id)
  END;

  RETURN jsonb_build_object('valid', true, 'kind', v.kind,
                            'invited_by', coalesce(v_by, 'Resilio'),
                            'expires_at', v.expires_at);
END $f$;

-- Formulario /sumate. Valida y consume el link en la misma transacción.
-- Responde lo mismo haya o no coincidencia con una ficha: a alguien sin
-- sesión no se le confirma quién está en la base.
CREATE OR REPLACE FUNCTION submit_lead(p_token TEXT, p_data JSONB)
RETURNS JSONB LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $f$
DECLARE
  v        invitations;
  v_name   TEXT := left(btrim(coalesce(p_data->>'name','')), 120);
  v_ig     TEXT := norm_instagram(p_data->>'instagram');
  v_email  TEXT := norm_email(p_data->>'email');
  v_wa     TEXT := nullif(regexp_replace(coalesce(p_data->>'whatsapp',''), '[^0-9+]', '', 'g'), '');
  v_city   UUID;
  v_match  UUID;
  v_owner  UUID;
  v_lead   UUID;
BEGIN
  SELECT * INTO v FROM invitations WHERE token = btrim(p_token) FOR UPDATE;
  IF NOT FOUND OR v.kind <> 'join' OR v.used_at IS NOT NULL
     OR v.revoked_at IS NOT NULL OR v.expires_at < now() THEN
    RAISE EXCEPTION 'Este link ya no es válido.' USING ERRCODE = '22023', HINT = 'link_invalid';
  END IF;

  IF length(v_name) < 2 THEN RAISE EXCEPTION 'Falta el nombre.' USING ERRCODE = '22023', HINT = 'name_required'; END IF;
  IF v_ig IS NULL OR v_ig !~ '^[a-z0-9._]{1,30}$' THEN
    RAISE EXCEPTION 'Revisá el usuario de Instagram.' USING ERRCODE = '22023', HINT = 'instagram_invalid';
  END IF;
  IF v_email IS NULL OR v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'Revisá el email.' USING ERRCODE = '22023', HINT = 'email_invalid';
  END IF;
  IF v_wa IS NOT NULL AND v_wa !~ '^\+[0-9]{8,15}$' THEN
    RAISE EXCEPTION 'El WhatsApp va con código de país, por ejemplo +5491122334455.' USING ERRCODE = '22023', HINT = 'whatsapp_invalid';
  END IF;
  IF coalesce((p_data->>'consent')::boolean, false) IS NOT TRUE THEN
    RAISE EXCEPTION 'Hace falta aceptar el uso de tus datos.' USING ERRCODE = '22023', HINT = 'consent_required';
  END IF;

  BEGIN
    v_city := nullif(p_data->>'city_id','')::uuid;
  EXCEPTION WHEN OTHERS THEN v_city := NULL;
  END;
  IF v_city IS NOT NULL AND NOT EXISTS (SELECT 1 FROM cities WHERE id = v_city) THEN
    v_city := NULL;
  END IF;

  v_match := find_influencer_by_keys(v_ig, v_email);

  -- A quién se asignaría la ficha al aprobar.
  v_owner := CASE v.inviter_kind
    WHEN 'scouter'    THEN v.inviter_user_id
    WHEN 'influencer' THEN (SELECT owner_scouter_id FROM influencers WHERE id = v.inviter_influencer_id)
    ELSE NULL                                   -- agencia: elige Dirección
  END;

  INSERT INTO influencer_leads (invitation_id, inviter_kind, inviter_user_id, inviter_influencer_id,
                                suggested_owner_id, matched_influencer_id, name, instagram, email,
                                whatsapp, city_id, city_text, categories, message,
                                consent_at, consent_version)
  VALUES (v.id, v.inviter_kind, v.inviter_user_id, v.inviter_influencer_id,
          v_owner, v_match, v_name, v_ig, v_email, v_wa, v_city,
          left(btrim(p_data->>'city_text'), 120),
          coalesce((SELECT array_agg(DISTINCT left(btrim(x), 40))
                    FROM jsonb_array_elements_text(coalesce(p_data->'categories','[]'::jsonb)) x
                    WHERE btrim(x) <> ''), '{}'),
          left(p_data->>'message', 1000),
          now(), coalesce(left(p_data->>'consent_version', 20), 'v1'))
  RETURNING id INTO v_lead;

  UPDATE invitations SET used_at = now() WHERE id = v.id;

  PERFORM notify_direction('lead_new', 'Nuevo lead de la red', v_name || ' · @' || v_ig,
                           'influencer_lead', v_lead);
  IF v_owner IS NOT NULL THEN
    PERFORM notify_team(v_owner, 'lead_new', 'Llegó un invitado tuyo',
                        v_name || ' · @' || v_ig || ' · lo revisa Dirección',
                        'influencer_lead', v_lead);
  END IF;

  RETURN jsonb_build_object('ok', true);
END $f$;

-- 5.3 · Aprobación (solo Dirección) ---------------------------------
-- Si el lead coincide con una ficha, no se crea otra: se usa esa.
-- Si no, se crea la ficha acá, en la misma transacción, y se asigna con
-- assign_entity() (queda en assignments y audit_log, como siempre).
-- Devuelve un link de activación para mandarle a la influencer.
CREATE OR REPLACE FUNCTION approve_lead(p_lead_id UUID, p_owner UUID DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $f$
DECLARE
  l      influencer_leads;
  v_inf  UUID;
  v_owner UUID;
  v_country UUID;
  v_inv  JSONB;
BEGIN
  IF NOT app_is_direction() THEN
    RAISE EXCEPTION 'Solo Dirección aprueba leads.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO l FROM influencer_leads WHERE id = p_lead_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Lead inexistente.'; END IF;
  IF l.status <> 'pending' THEN RAISE EXCEPTION 'Este lead ya fue resuelto.'; END IF;

  -- Se vuelve a buscar: pudo cargarse la ficha después del formulario.
  v_inf := coalesce(l.matched_influencer_id, find_influencer_by_keys(l.instagram, l.email));

  IF v_inf IS NULL THEN
    v_owner := coalesce(p_owner, l.suggested_owner_id);
    IF v_owner IS NULL THEN
      RAISE EXCEPTION 'Elegí a qué scouter se asigna (lo invitó la agencia).';
    END IF;

    SELECT country_id INTO v_country FROM cities WHERE id = l.city_id;

    -- Mismas columnas que influencerToRow() en database.js. El dueño
    -- inicial es quien aprueba, igual que al crear desde el CRM.
    INSERT INTO influencers (name, email, instagram, whatsapp, city_id, country_id,
                             status, followers, created_by, owner_scouter_id, data)
    VALUES (l.name, l.email, l.instagram, l.whatsapp, l.city_id, v_country,
            'active', 0, auth.uid(), auth.uid(),
            jsonb_build_object('ciudad', l.city_text, 'origen', 'invitacion',
                               'lead_id', l.id, 'inviter_kind', l.inviter_kind))
    RETURNING id INTO v_inf;

    IF v_owner <> auth.uid() THEN
      PERFORM assign_entity('influencer', v_inf, v_owner, 'Alta por invitación');
    END IF;
  END IF;

  INSERT INTO influencer_preferences (influencer_id, city_ids, categories)
  VALUES (v_inf, CASE WHEN l.city_id IS NULL THEN '{}'::uuid[] ELSE ARRAY[l.city_id] END, l.categories)
  ON CONFLICT (influencer_id) DO NOTHING;

  UPDATE influencer_leads
     SET status = 'approved', decided_by = auth.uid(), decided_at = now(), influencer_id = v_inf
   WHERE id = l.id;

  IF NOT EXISTS (SELECT 1 FROM influencer_accounts WHERE influencer_id = v_inf) THEN
    v_inv := create_invitation('activation', v_inf, l.email);
  END IF;

  RETURN jsonb_build_object('influencer_id', v_inf,
                            'activation', v_inv,
                            'already_had_account', v_inv IS NULL);
END $f$;

CREATE OR REPLACE FUNCTION reject_lead(p_lead_id UUID, p_note TEXT)
RETURNS VOID LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $f$
BEGIN
  IF NOT app_is_direction() THEN
    RAISE EXCEPTION 'Solo Dirección resuelve leads.' USING ERRCODE = '42501';
  END IF;
  IF length(btrim(coalesce(p_note,''))) < 3 THEN
    RAISE EXCEPTION 'El motivo es obligatorio.';
  END IF;
  UPDATE influencer_leads
     SET status = 'rejected', decided_by = auth.uid(), decided_at = now(),
         decision_note = btrim(p_note)
   WHERE id = p_lead_id AND status = 'pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'Lead inexistente o ya resuelto.'; END IF;
END $f$;

-- 5.4 · Activar la cuenta ------------------------------------------
-- La influencer entra con magic link y llama a esto con el token.
CREATE OR REPLACE FUNCTION accept_invitation(p_token TEXT)
RETURNS JSONB LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $f$
DECLARE v invitations;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Iniciá sesión primero.' USING ERRCODE = '42501', HINT = 'login_required'; END IF;

  -- Una cuenta del equipo no se convierte en cuenta de influencer.
  IF app_is_team_member() THEN
    RAISE EXCEPTION 'Este email ya es una cuenta del equipo. Usá otro email.' USING ERRCODE = '42501', HINT = 'team_account';
  END IF;
  IF EXISTS (SELECT 1 FROM influencer_accounts WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Tu cuenta ya está activa.' USING HINT = 'already_active';
  END IF;

  SELECT * INTO v FROM invitations WHERE token = btrim(p_token) FOR UPDATE;
  IF NOT FOUND OR v.kind <> 'activation' OR v.used_at IS NOT NULL
     OR v.revoked_at IS NOT NULL OR v.expires_at < now() THEN
    RAISE EXCEPTION 'Este link ya no es válido.' USING ERRCODE = '22023', HINT = 'link_invalid';
  END IF;
  IF EXISTS (SELECT 1 FROM influencer_accounts WHERE influencer_id = v.target_influencer_id) THEN
    RAISE EXCEPTION 'Este acceso ya fue activado.' USING HINT = 'already_activated';
  END IF;

  INSERT INTO influencer_accounts (user_id, influencer_id, invitation_id)
  VALUES (auth.uid(), v.target_influencer_id, v.id);

  INSERT INTO influencer_preferences (influencer_id) VALUES (v.target_influencer_id)
  ON CONFLICT (influencer_id) DO NOTHING;

  UPDATE invitations SET used_at = now(), used_by = auth.uid() WHERE id = v.id;

  PERFORM notify_team((SELECT owner_scouter_id FROM influencers WHERE id = v.target_influencer_id),
                      'influencer_activated', 'Activó su acceso a la app',
                      (SELECT name FROM influencers WHERE id = v.target_influencer_id),
                      'influencer', v.target_influencer_id);

  RETURN jsonb_build_object('ok', true);
END $f$;

-- 5.5 · Perfil -----------------------------------------------------
CREATE OR REPLACE FUNCTION my_profile()
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $f$
DECLARE v_inf UUID := app_require_influencer();
BEGIN
  RETURN (
    SELECT jsonb_build_object(
      'name', i.name, 'instagram', i.instagram, 'email', i.email,
      'whatsapp', i.whatsapp,
      'city_ids', coalesce(p.city_ids, '{}'),
      'categories', coalesce(p.categories, '{}'))
    FROM influencers i
    LEFT JOIN influencer_preferences p ON p.influencer_id = i.id
    WHERE i.id = v_inf);
END $f$;

-- Edita SOLO: nombre, instagram, email, whatsapp, ciudades de interés
-- y categorías. Sin foto de perfil (decisión 2026-09-28). Un parámetro
-- en NULL = no cambiar ese campo. No toca owner_scouter_id, así que el
-- trigger de protección no actúa.
CREATE OR REPLACE FUNCTION update_my_profile(
  p_name TEXT DEFAULT NULL, p_instagram TEXT DEFAULT NULL, p_email TEXT DEFAULT NULL,
  p_whatsapp TEXT DEFAULT NULL, p_city_ids UUID[] DEFAULT NULL, p_categories TEXT[] DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $f$
DECLARE
  v_inf  UUID := app_require_influencer();
  o      influencers;
  n_name TEXT; n_ig TEXT; n_email TEXT; n_wa TEXT;
  v_chg  JSONB := '{}'::jsonb;
  v_contact_changed BOOLEAN := false;
BEGIN
  SELECT * INTO o FROM influencers WHERE id = v_inf FOR UPDATE;

  n_name  := CASE WHEN p_name      IS NULL THEN o.name      ELSE left(btrim(p_name), 120) END;
  n_ig    := CASE WHEN p_instagram IS NULL THEN o.instagram ELSE norm_instagram(p_instagram) END;
  n_email := CASE WHEN p_email     IS NULL THEN o.email     ELSE norm_email(p_email) END;
  n_wa    := CASE WHEN p_whatsapp  IS NULL THEN o.whatsapp
                  ELSE nullif(regexp_replace(p_whatsapp, '[^0-9+]', '', 'g'), '') END;

  IF length(coalesce(n_name,'')) < 2 THEN
    RAISE EXCEPTION 'Falta el nombre.' USING ERRCODE = '22023', HINT = 'name_required';
  END IF;
  IF p_instagram IS NOT NULL AND (n_ig IS NULL OR n_ig !~ '^[a-z0-9._]{1,30}$') THEN
    RAISE EXCEPTION 'Revisá el usuario de Instagram.' USING ERRCODE = '22023', HINT = 'instagram_invalid';
  END IF;
  IF p_email IS NOT NULL AND (n_email IS NULL OR n_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$') THEN
    RAISE EXCEPTION 'Revisá el email.' USING ERRCODE = '22023', HINT = 'email_invalid';
  END IF;
  IF p_whatsapp IS NOT NULL AND n_wa IS NOT NULL AND n_wa !~ '^\+[0-9]{8,15}$' THEN
    RAISE EXCEPTION 'El WhatsApp va con código de país, por ejemplo +5491122334455.'
      USING ERRCODE = '22023', HINT = 'whatsapp_invalid';
  END IF;

  -- Instagram y email identifican a una persona: no pueden ser de otra ficha.
  IF (p_instagram IS NOT NULL OR p_email IS NOT NULL)
     AND find_influencer_by_keys(CASE WHEN p_instagram IS NOT NULL THEN n_ig END,
                                 CASE WHEN p_email     IS NOT NULL THEN n_email END,
                                 v_inf) IS NOT NULL THEN
    RAISE EXCEPTION 'Ese dato ya está registrado. Si es tuyo, escribinos.'
      USING ERRCODE = '23505', HINT = 'contact_taken';
  END IF;

  IF n_name  IS DISTINCT FROM o.name      THEN v_chg := v_chg || jsonb_build_object('name',      jsonb_build_object('from', o.name,      'to', n_name));  END IF;
  IF n_ig    IS DISTINCT FROM o.instagram THEN v_chg := v_chg || jsonb_build_object('instagram', jsonb_build_object('from', o.instagram, 'to', n_ig));    v_contact_changed := true; END IF;
  IF n_email IS DISTINCT FROM o.email     THEN v_chg := v_chg || jsonb_build_object('email',     jsonb_build_object('from', o.email,     'to', n_email)); v_contact_changed := true; END IF;
  IF n_wa    IS DISTINCT FROM o.whatsapp  THEN v_chg := v_chg || jsonb_build_object('whatsapp',  jsonb_build_object('from', o.whatsapp,  'to', n_wa));    v_contact_changed := true; END IF;

  IF v_chg <> '{}'::jsonb THEN
    UPDATE influencers
       SET name = n_name, instagram = n_ig, email = n_email, whatsapp = n_wa
     WHERE id = v_inf;
  END IF;

  IF p_city_ids IS NOT NULL OR p_categories IS NOT NULL THEN
    INSERT INTO influencer_preferences (influencer_id) VALUES (v_inf)
    ON CONFLICT (influencer_id) DO NOTHING;
    UPDATE influencer_preferences
       SET city_ids = CASE WHEN p_city_ids IS NULL THEN city_ids
                           ELSE coalesce((SELECT array_agg(DISTINCT c.id) FROM cities c
                                          WHERE c.id = ANY (p_city_ids)), '{}') END,
           categories = CASE WHEN p_categories IS NULL THEN categories
                             ELSE coalesce((SELECT array_agg(DISTINCT left(btrim(x), 40))
                                            FROM unnest(p_categories) x
                                            WHERE btrim(x) <> ''), '{}') END,
           updated_at = now()
     WHERE influencer_id = v_inf;
  END IF;

  IF v_chg <> '{}'::jsonb THEN
    INSERT INTO influencer_profile_changes (influencer_id, changes) VALUES (v_inf, v_chg);
    IF v_contact_changed THEN
      PERFORM notify_team(o.owner_scouter_id, 'influencer_profile_updated',
                          'Actualizó sus datos de contacto',
                          n_name || ': ' || (SELECT string_agg(k, ', ') FROM jsonb_object_keys(v_chg) k),
                          'influencer', v_inf);
    END IF;
  END IF;

  RETURN my_profile();
END $f$;

-- 5.6 · Feed y votos -------------------------------------------------
-- Vigente = activa. Desactivarla la saca del feed al instante.
CREATE OR REPLACE FUNCTION offer_is_live(o offers)
RETURNS BOOLEAN LANGUAGE sql STABLE AS $f$
  SELECT o.status = 'active';
$f$;

-- Marca "visto" para el badge de Nuevas. La app la llama al salir del feed.
CREATE OR REPLACE FUNCTION mark_feed_seen()
RETURNS VOID LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $f$
DECLARE v_inf UUID := app_require_influencer();
BEGIN
  UPDATE influencer_accounts SET last_seen_at = now() WHERE user_id = auth.uid();
END $f$;

-- Ciudades con ofertas activas, cuántas le faltan votar y cuántas son
-- nuevas desde la última visita. Primero las suyas.
CREATE OR REPLACE FUNCTION feed_cities()
RETURNS TABLE (city_id UUID, city_name TEXT, live_offers BIGINT, unvoted BIGINT,
               new_offers BIGINT, is_mine BOOLEAN)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $f$
DECLARE
  v_inf  UUID := app_require_influencer();
  v_seen TIMESTAMPTZ := (SELECT last_seen_at FROM influencer_accounts WHERE user_id = auth.uid());
BEGIN
  RETURN QUERY
  SELECT c.id, c.name::text, count(o.id),
         count(o.id) FILTER (WHERE NOT EXISTS (
           SELECT 1 FROM offer_interests oi WHERE oi.offer_id = o.id AND oi.influencer_id = v_inf)),
         count(o.id) FILTER (WHERE v_seen IS NULL OR o.activated_at > v_seen),
         c.id = ANY (coalesce((SELECT p.city_ids FROM influencer_preferences p
                               WHERE p.influencer_id = v_inf), '{}'))
  FROM offers o JOIN cities c ON c.id = o.city_id
  WHERE offer_is_live(o)
  GROUP BY c.id, c.name
  ORDER BY 6 DESC, 5 DESC, 4 DESC, 2;
END $f$;

-- Ofertas activas que todavía no votó. Por defecto, las de sus
-- ciudades de interés (si no marcó ninguna, todas). p_all = true
-- muestra todas; p_city_id filtra una.
-- Solo campos públicos: marca (nombre y logo), título, tipo, foto y
-- ciudad. Nada de montos, notas ni contactos.
CREATE OR REPLACE FUNCTION my_feed(p_city_id UUID DEFAULT NULL, p_all BOOLEAN DEFAULT false,
                                   p_limit INT DEFAULT 30)
RETURNS TABLE (id UUID, title TEXT, type_slug TEXT, type_label_es TEXT, type_label_en TEXT,
               image_path TEXT, city_name TEXT, brand_name TEXT, brand_logo TEXT, is_new BOOLEAN)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $f$
DECLARE
  v_inf    UUID := app_require_influencer();
  v_seen   TIMESTAMPTZ := (SELECT last_seen_at FROM influencer_accounts WHERE user_id = auth.uid());
  v_cities UUID[] := (SELECT p.city_ids FROM influencer_preferences p WHERE p.influencer_id = v_inf);
BEGIN
  RETURN QUERY
  SELECT o.id, o.title, o.type_slug, t.label_es, t.label_en, o.image_path,
         c.name::text, b.name::text, b.logo::text,
         (v_seen IS NULL OR o.activated_at > v_seen)
  FROM offers o
  JOIN cities c      ON c.id = o.city_id
  JOIN offer_types t ON t.slug = o.type_slug
  LEFT JOIN brands b ON b.id = o.brand_id
  WHERE offer_is_live(o)
    AND (CASE WHEN p_city_id IS NOT NULL THEN o.city_id = p_city_id
              WHEN p_all THEN true
              WHEN coalesce(cardinality(v_cities), 0) > 0 THEN o.city_id = ANY (v_cities)
              ELSE true END)
    AND NOT EXISTS (SELECT 1 FROM offer_interests oi
                    WHERE oi.offer_id = o.id AND oi.influencer_id = v_inf)
  ORDER BY o.activated_at DESC NULLS LAST
  LIMIT least(greatest(coalesce(p_limit, 30), 1), 100);
END $f$;

CREATE OR REPLACE FUNCTION vote_offer(p_offer_id UUID, p_vote TEXT)
RETURNS JSONB LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $f$
DECLARE
  c_cap     INT      := (SELECT interest_cap    FROM red_limits());
  c_cap_win INTERVAL := (SELECT interest_window FROM red_limits());
  v_inf  UUID := app_require_influencer();
  o      offers;
  prev   offer_interests;
  v_used INT;
BEGIN
  IF p_vote NOT IN ('interested','not_interested') THEN
    RAISE EXCEPTION 'Voto inválido.' USING HINT = 'vote_invalid';
  END IF;

  SELECT * INTO o FROM offers WHERE id = p_offer_id;
  IF NOT FOUND OR NOT offer_is_live(o) THEN
    RAISE EXCEPTION 'Esta oferta ya no está disponible.' USING HINT = 'offer_unavailable';
  END IF;

  SELECT * INTO prev FROM offer_interests WHERE offer_id = p_offer_id AND influencer_id = v_inf FOR UPDATE;

  -- Cambiar de opinión se puede mientras el equipo no lo haya tocado.
  IF FOUND AND prev.internal_status <> 'new' THEN
    RAISE EXCEPTION 'Ya registramos tu respuesta para esta oferta.' USING HINT = 'vote_locked';
  END IF;

  IF p_vote = 'interested' AND (NOT FOUND OR prev.vote <> 'interested') THEN
    SELECT count(*) INTO v_used FROM offer_interests
    WHERE influencer_id = v_inf AND vote = 'interested' AND voted_at > now() - c_cap_win;
    IF v_used >= c_cap THEN
      RAISE EXCEPTION 'Ya marcaste % ofertas esta semana. Elegí las que más te interesan.', c_cap
        USING HINT = 'interest_quota';
    END IF;
  END IF;

  INSERT INTO offer_interests (offer_id, influencer_id, vote)
  VALUES (p_offer_id, v_inf, p_vote)
  ON CONFLICT (offer_id, influencer_id)
  DO UPDATE SET vote = EXCLUDED.vote, voted_at = now();

  IF p_vote = 'interested' THEN
    PERFORM notify_team((SELECT owner_scouter_id FROM influencers WHERE id = v_inf),
                        'offer_interest', 'Nuevo "Me interesa"',
                        (SELECT name FROM influencers WHERE id = v_inf) || ' → ' || o.title,
                        'influencer', v_inf);
  END IF;

  RETURN jsonb_build_object('ok', true);
END $f$;

-- "Mis intereses". Único estado visible, y no es una decisión del
-- equipo: 'registered' mientras la oferta está activa, 'ended' cuando
-- se desactiva. Nunca internal_status. (Claves: la app las traduce.)
CREATE OR REPLACE FUNCTION my_interests()
RETURNS TABLE (offer_id UUID, title TEXT, image_path TEXT, city_name TEXT,
               brand_name TEXT, voted_at TIMESTAMPTZ, display_status TEXT)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $f$
DECLARE v_inf UUID := app_require_influencer();
BEGIN
  RETURN QUERY
  SELECT o.id, o.title, o.image_path, c.name::text, b.name::text, oi.voted_at,
         CASE WHEN offer_is_live(o) THEN 'registered' ELSE 'ended' END
  FROM offer_interests oi
  JOIN offers o ON o.id = oi.offer_id
  JOIN cities c ON c.id = o.city_id
  LEFT JOIN brands b ON b.id = o.brand_id
  WHERE oi.influencer_id = v_inf AND oi.vote = 'interested'
  ORDER BY offer_is_live(o) DESC, oi.voted_at DESC;
END $f$;

-- 5.7 · Métrica principal (para el CRM) -------------------------------
-- % de "Me interesa" que terminaron en una colaboración. INVOKER a
-- propósito: Dirección ve toda la red; un scouter, solo sus fichas.
CREATE OR REPLACE FUNCTION red_conversion(p_from TIMESTAMPTZ DEFAULT now() - interval '90 days',
                                          p_to   TIMESTAMPTZ DEFAULT now())
RETURNS TABLE (interested BIGINT, with_collaboration BIGINT, conversion_pct NUMERIC)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $f$
  SELECT count(*),
         count(*) FILTER (WHERE collaboration_id IS NOT NULL),
         round(100.0 * count(*) FILTER (WHERE collaboration_id IS NOT NULL)
               / nullif(count(*), 0), 1)
  FROM offer_interests
  WHERE vote = 'interested' AND voted_at >= p_from AND voted_at < p_to;
$f$;

-- ── 6 · Permisos de ejecución ───────────────────────────────
-- En Supabase toda función nueva es ejecutable por PUBLIC (incluye anon).
-- Se cierra todo y se abre lo justo.
DO $grants$
DECLARE f TEXT;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'red_limits()',
    'app_my_influencer_id()', 'app_require_influencer()', 'app_is_team_member()',
    'app_can_manage_offers()',
    'find_influencer_by_keys(text,text,uuid)', 'new_invitation_token()',
    'notify_team(uuid,text,text,text,text,uuid)', 'notify_direction(text,text,text,text,uuid)',
    'create_invitation(text,uuid,text)', 'my_invitations()',
    'check_invitation(text)', 'submit_lead(text,jsonb)',
    'approve_lead(uuid,uuid)', 'reject_lead(uuid,text)', 'accept_invitation(text)',
    'my_profile()', 'update_my_profile(text,text,text,text,uuid[],text[])',
    'offer_is_live(offers)', 'mark_feed_seen()', 'feed_cities()',
    'my_feed(uuid,boolean,integer)', 'vote_offer(uuid,text)', 'my_interests()',
    'red_conversion(timestamptz,timestamptz)', 'offers_mark_activated()'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', f);
  END LOOP;
END $grants$;

-- Sin sesión: solo el link público.
GRANT EXECUTE ON FUNCTION check_invitation(text), submit_lead(text,jsonb) TO anon, authenticated;

-- Con sesión (cada función valida adentro quién puede).
GRANT EXECUTE ON FUNCTION
  red_limits(),
  create_invitation(text,uuid,text), my_invitations(),
  approve_lead(uuid,uuid), reject_lead(uuid,text), accept_invitation(text),
  my_profile(), update_my_profile(text,text,text,text,uuid[],text[]),
  mark_feed_seen(), feed_cities(), my_feed(uuid,boolean,integer),
  vote_offer(uuid,text), my_interests(), red_conversion(timestamptz,timestamptz),
  app_my_influencer_id(), offer_is_live(offers),
  app_is_team_member(), app_can_manage_offers()
TO authenticated;

-- Normalizadores: inofensivos, los puede usar el cliente para validar.
GRANT EXECUTE ON FUNCTION norm_instagram(text), norm_email(text) TO anon, authenticated;


-- ── 7 · Storage: fotos de ofertas ───────────────────────────
-- Bucket público de solo lectura: la app muestra la foto con la URL
-- pública (…/storage/v1/object/public/offers/<image_path>). Subir,
-- reemplazar y borrar: solo quien gestiona ofertas. Máx. 5 MB, solo
-- imágenes.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('offers', 'offers', true, 5242880, ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO UPDATE
  SET public = true, file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS offers_img_insert ON storage.objects;
CREATE POLICY offers_img_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'offers' AND public.app_can_manage_offers());
DROP POLICY IF EXISTS offers_img_update ON storage.objects;
CREATE POLICY offers_img_update ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'offers' AND public.app_can_manage_offers())
  WITH CHECK (bucket_id = 'offers' AND public.app_can_manage_offers());
DROP POLICY IF EXISTS offers_img_delete ON storage.objects;
CREATE POLICY offers_img_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'offers' AND public.app_can_manage_offers());

COMMIT;


-- ═══════════════════════════════════════════════════════════
-- VERIFICACION (solo lectura) · correr después del COMMIT
-- ═══════════════════════════════════════════════════════════

-- a) Las ocho tablas existen y tienen RLS. Ocho filas, todas con rls = true.
SELECT c.relname AS tabla, c.relrowsecurity AS rls
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('influencer_accounts','influencer_preferences','influencer_profile_changes',
                    'invitations','influencer_leads','offers','offer_interests','offer_types')
ORDER BY 1;

-- b) Ninguna policy nueva abierta. Cero filas.
SELECT tablename, policyname FROM pg_policies
WHERE ((schemaname = 'public'
        AND tablename IN ('influencer_accounts','influencer_preferences','influencer_profile_changes',
                          'invitations','influencer_leads','offers','offer_interests','offer_types'))
    OR (schemaname = 'storage' AND policyname LIKE 'offers_img_%'))
  AND (qual = 'true' OR with_check = 'true');

-- c) anon puede ejecutar SOLO check_invitation, submit_lead y los
--    normalizadores. Cuatro filas.
SELECT p.proname
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND has_function_privilege('anon', p.oid, 'EXECUTE')
  AND p.proname IN ('red_limits','app_my_influencer_id','app_require_influencer','app_is_team_member',
                    'app_can_manage_offers',
                    'find_influencer_by_keys','new_invitation_token','notify_team','notify_direction',
                    'create_invitation','my_invitations','check_invitation','submit_lead',
                    'approve_lead','reject_lead','accept_invitation','my_profile','update_my_profile',
                    'offer_is_live','mark_feed_seen','feed_cities','my_feed','vote_offer',
                    'my_interests','red_conversion','offers_mark_activated',
                    'norm_instagram','norm_email')
ORDER BY 1;

-- d) El alta en auth ya salta a las influencers. Tiene que dar true.
SELECT pg_get_functiondef('public.handle_new_user'::regproc) LIKE '%''influencer''%' AS salida_ok;

-- e) El bucket de fotos existe y es público.
SELECT id, public, file_size_limit FROM storage.buckets WHERE id = 'offers';

-- f) Estados de ficha en uso. La app solo deja entrar a status = 'active':
--    si aparece otro estado que también deba tener acceso, se ajusta
--    app_my_influencer_id().
SELECT status, count(*) FROM influencers GROUP BY status ORDER BY 2 DESC;
