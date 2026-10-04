-- ═══════════════════════════════════════════════════════════
-- 063 · Prospectos de marcas (Dirección y Admin)
--
--   Bandeja de comercios encontrados en Google Maps para contactar,
--   asignar a una scouter o descartar. Solo la ven quienes gestionan
--   (app_can_manage_offers: super_admin, admin, network_direction).
--
--   · prospect_searches: cada búsqueda (para el contador del día y del mes).
--   · prospects: un comercio por lugar de Google (place_id único).
--   · prospect_ingest(): guarda los resultados de una búsqueda y marca
--     los que ya están en Network (mismo nombre, teléfono o web).
--   · prospect_act(): contactar / asignar / descartar / restaurar.
--       contactar → crea la ficha de la marca a cargo de quien contacta
--                   y su link de propuesta (059).
--       asignar   → crea la ficha a cargo de la scouter elegida y le
--                   deja la tarea "Contactar a {marca}".
--
-- No toca datos existentes. Se puede correr dos veces sin efecto.
-- ═══════════════════════════════════════════════════════════

BEGIN;

-- ── 1 · Tablas ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS prospect_searches (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query        TEXT NOT NULL,
  city         TEXT NOT NULL,
  result_count INT  NOT NULL DEFAULT 0,
  new_count    INT  NOT NULL DEFAULT 0,
  created_by   UUID DEFAULT auth.uid(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_prospect_searches_created ON prospect_searches (created_at DESC);

CREATE TABLE IF NOT EXISTS prospects (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id    TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  category    TEXT,
  address     TEXT,
  city        TEXT,
  rating      NUMERIC(2,1),
  reviews     INT,
  phone       TEXT,
  website     TEXT,
  instagram   TEXT,
  email       TEXT,
  maps_url    TEXT,
  status      TEXT NOT NULL DEFAULT 'new'
              CHECK (status IN ('new', 'assigned', 'contacted', 'discarded', 'in_network')),
  assigned_to UUID,
  brand_id    UUID REFERENCES brands(id) ON DELETE SET NULL,
  search_id   UUID REFERENCES prospect_searches(id) ON DELETE SET NULL,
  acted_by    UUID,
  acted_at    TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_prospects_status ON prospects (status, reviews DESC);
CREATE INDEX IF NOT EXISTS idx_prospects_search ON prospects (search_id);


-- ── 2 · Permisos: solo Dirección y Admin, y solo lectura directa ──
ALTER TABLE prospect_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE prospects         ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON prospect_searches, prospects FROM PUBLIC, anon;
REVOKE INSERT, UPDATE, DELETE ON prospect_searches, prospects FROM authenticated;
GRANT SELECT ON prospect_searches, prospects TO authenticated;

DROP POLICY IF EXISTS ps_select ON prospect_searches;
CREATE POLICY ps_select ON prospect_searches FOR SELECT TO authenticated
  USING ((SELECT app_can_manage_offers()));
DROP POLICY IF EXISTS pr_select ON prospects;
CREATE POLICY pr_select ON prospects FOR SELECT TO authenticated
  USING ((SELECT app_can_manage_offers()));


-- ── 3 · Guardar una búsqueda ────────────────────────────────
-- p_places: [{ id, name, category, address, rating, reviews, phone,
--              website, instagram, email, maps_url }]
CREATE OR REPLACE FUNCTION prospect_ingest(p_query TEXT, p_city TEXT, p_places JSONB)
RETURNS JSONB LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, extensions AS $f$
DECLARE
  v_search UUID;
  pl       JSONB;
  v_pid    TEXT;
  v_phone  TEXT;
  v_dom    TEXT;
  v_total  INT := 0;
  v_new    INT := 0;
  v_innet  INT := 0;
  v_again  INT := 0;
BEGIN
  IF auth.uid() IS NULL OR NOT app_can_manage_offers() THEN
    RAISE EXCEPTION 'Sin permiso.' USING ERRCODE = '42501';
  END IF;
  IF jsonb_typeof(coalesce(p_places, '[]'::jsonb)) <> 'array' THEN
    RAISE EXCEPTION 'Resultados inválidos.';
  END IF;

  INSERT INTO prospect_searches (query, city, created_by)
  VALUES (left(btrim(coalesce(p_query, '')), 120), left(btrim(coalesce(p_city, '')), 120), auth.uid())
  RETURNING id INTO v_search;

  FOR pl IN SELECT * FROM jsonb_array_elements(coalesce(p_places, '[]'::jsonb)) LOOP
    v_pid := left(pl->>'id', 300);
    CONTINUE WHEN v_pid IS NULL OR coalesce(btrim(pl->>'name'), '') = '';
    v_total := v_total + 1;

    -- Ya estaba en la bandeja: se actualizan datos vacíos y, si sigue
    -- nuevo, pasa a esta búsqueda (así aparece en la lista de hoy).
    IF EXISTS (SELECT 1 FROM prospects WHERE place_id = v_pid) THEN
      UPDATE prospects SET
        rating    = coalesce(nullif(pl->>'rating', '')::numeric, rating),
        reviews   = coalesce(nullif(pl->>'reviews', '')::int, reviews),
        phone     = coalesce(phone, nullif(pl->>'phone', '')),
        website   = coalesce(website, nullif(pl->>'website', '')),
        instagram = coalesce(instagram, nullif(pl->>'instagram', '')),
        email     = coalesce(email, nullif(pl->>'email', '')),
        search_id = CASE WHEN status = 'new' THEN v_search ELSE search_id END,
        updated_at = now()
      WHERE place_id = v_pid;
      v_again := v_again + 1;
      CONTINUE;
    END IF;

    -- ¿Ya está en Network? Mismo nombre, mismo teléfono (últimos 8
    -- dígitos) o misma web.
    v_phone := right(regexp_replace(coalesce(pl->>'phone', ''), '\D', '', 'g'), 8);
    v_dom   := lower(regexp_replace(coalesce(pl->>'website', ''), '^https?://(www\.)?([^/?#]+).*$', '\2'));

    IF EXISTS (
      SELECT 1 FROM brands b
       WHERE lower(btrim(b.name)) = lower(btrim(pl->>'name'))
          OR (length(v_phone) = 8 AND (right(regexp_replace(coalesce(b.phone, ''), '\D', '', 'g'), 8) = v_phone
                                    OR right(regexp_replace(coalesce(b.whatsapp, ''), '\D', '', 'g'), 8) = v_phone))
          OR (v_dom <> '' AND lower(regexp_replace(coalesce(b.website, ''), '^https?://(www\.)?([^/?#]+).*$', '\2')) = v_dom)
    ) THEN
      INSERT INTO prospects (place_id, name, category, address, city, rating, reviews, phone, website, instagram, email, maps_url, status, search_id)
      VALUES (v_pid, left(pl->>'name', 200), left(pl->>'category', 120), left(pl->>'address', 300), left(btrim(p_city), 120),
              nullif(pl->>'rating', '')::numeric, nullif(pl->>'reviews', '')::int,
              nullif(pl->>'phone', ''), nullif(pl->>'website', ''), nullif(pl->>'instagram', ''), nullif(pl->>'email', ''),
              nullif(pl->>'maps_url', ''), 'in_network', v_search);
      v_innet := v_innet + 1;
    ELSE
      INSERT INTO prospects (place_id, name, category, address, city, rating, reviews, phone, website, instagram, email, maps_url, status, search_id)
      VALUES (v_pid, left(pl->>'name', 200), left(pl->>'category', 120), left(pl->>'address', 300), left(btrim(p_city), 120),
              nullif(pl->>'rating', '')::numeric, nullif(pl->>'reviews', '')::int,
              nullif(pl->>'phone', ''), nullif(pl->>'website', ''), nullif(pl->>'instagram', ''), nullif(pl->>'email', ''),
              nullif(pl->>'maps_url', ''), 'new', v_search);
      v_new := v_new + 1;
    END IF;
  END LOOP;

  UPDATE prospect_searches SET result_count = v_total, new_count = v_new WHERE id = v_search;

  RETURN jsonb_build_object('search_id', v_search, 'total', v_total, 'new', v_new,
                            'in_network', v_innet, 'again', v_again);
END $f$;


-- ── 4 · Contactar / asignar / descartar / restaurar ─────────
CREATE OR REPLACE FUNCTION prospect_act(p_id UUID, p_action TEXT, p_scouter UUID DEFAULT NULL, p_lang TEXT DEFAULT 'es')
RETURNS JSONB LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, extensions AS $f$
DECLARE
  v_uid   UUID := auth.uid();
  p       prospects;
  v_owner UUID;
  v_city  UUID;
  v_ctry  UUID;
  v_brand UUID;
  v_token TEXT;
BEGIN
  IF v_uid IS NULL OR NOT app_can_manage_offers() THEN
    RAISE EXCEPTION 'Sin permiso.' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO p FROM prospects WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Prospecto inexistente.'; END IF;

  IF p_action = 'discard' THEN
    IF p.status <> 'new' THEN RAISE EXCEPTION 'Solo se descartan los nuevos.'; END IF;
    UPDATE prospects SET status = 'discarded', acted_by = v_uid, acted_at = now(), updated_at = now() WHERE id = p_id;
    RETURN jsonb_build_object('ok', true, 'status', 'discarded');
  END IF;

  IF p_action = 'restore' THEN
    IF p.status <> 'discarded' THEN RAISE EXCEPTION 'Solo se restauran los descartados.'; END IF;
    UPDATE prospects SET status = 'new', acted_by = v_uid, acted_at = now(), updated_at = now() WHERE id = p_id;
    RETURN jsonb_build_object('ok', true, 'status', 'new');
  END IF;

  IF p_action NOT IN ('contact', 'assign') THEN RAISE EXCEPTION 'Acción inválida.'; END IF;

  -- Ya tiene ficha: se devuelve la misma (tocar dos veces no duplica).
  IF p.brand_id IS NOT NULL THEN
    IF p_action = 'contact' THEN
      SELECT token INTO v_token FROM brand_proposals
       WHERE brand_id = p.brand_id AND status <> 'closed' AND expires_at > now()
       ORDER BY created_at DESC LIMIT 1;
    END IF;
    RETURN jsonb_build_object('ok', true, 'status', p.status, 'brand_id', p.brand_id, 'token', v_token);
  END IF;
  IF p.status NOT IN ('new') THEN RAISE EXCEPTION 'Este prospecto ya fue trabajado.'; END IF;

  IF p_action = 'assign' THEN
    IF p_scouter IS NULL OR NOT EXISTS (SELECT 1 FROM scouters WHERE user_id = p_scouter) THEN
      RAISE EXCEPTION 'Elegí una scouter.';
    END IF;
    v_owner := p_scouter;
  ELSE
    v_owner := v_uid;
  END IF;

  SELECT c.id, c.country_id INTO v_city, v_ctry
    FROM cities c WHERE lower(btrim(c.name)) = lower(btrim(coalesce(p.city, ''))) LIMIT 1;

  INSERT INTO brands (name, category, city_id, country_id, status, website, phone, instagram, email,
                      notes, owner_scouter_id, created_by, data)
  VALUES (p.name, p.category, v_city, v_ctry, 'active', p.website, p.phone, p.instagram, p.email,
          concat_ws(E'\n', 'Cargada desde Prospectos (Google Maps).', p.address, p.maps_url),
          v_owner, v_uid,
          jsonb_build_object('source', 'prospects', 'place_id', p.place_id, 'rating', p.rating, 'reviews', p.reviews))
  RETURNING id INTO v_brand;

  IF p_action = 'contact' THEN
    INSERT INTO brand_proposals (brand_id, brand_name, lang, created_by)
    VALUES (v_brand, left(p.name, 120), CASE WHEN p_lang IN ('es', 'en', 'pt') THEN p_lang ELSE 'es' END, v_uid)
    RETURNING token INTO v_token;
  ELSE
    -- Tarea para la scouter: aparece en su Inicio y su agenda.
    BEGIN
      INSERT INTO tasks (title, description, entity_type, entity_id, type, priority, status, due_date, created_by, assigned_to)
      VALUES (format('Contactar a %s', p.name),
              'Marca asignada desde Prospectos. Mandale la propuesta desde su ficha.',
              'brand', v_brand, 'general', 'normal', 'todo', now() + INTERVAL '24 hours', v_uid, v_owner);
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '063: no se pudo crear la tarea (%)', SQLERRM;
    END;
  END IF;

  UPDATE prospects SET
    status = CASE WHEN p_action = 'contact' THEN 'contacted' ELSE 'assigned' END,
    brand_id = v_brand, assigned_to = v_owner, acted_by = v_uid, acted_at = now(), updated_at = now()
  WHERE id = p_id;

  RETURN jsonb_build_object('ok', true, 'status', CASE WHEN p_action = 'contact' THEN 'contacted' ELSE 'assigned' END,
                            'brand_id', v_brand, 'token', v_token);
END $f$;

REVOKE ALL ON FUNCTION prospect_ingest(TEXT, TEXT, JSONB)          FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION prospect_act(UUID, TEXT, UUID, TEXT)        FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION prospect_ingest(TEXT, TEXT, JSONB)       TO authenticated;
GRANT EXECUTE ON FUNCTION prospect_act(UUID, TEXT, UUID, TEXT)     TO authenticated;

COMMIT;


-- ── Verificación: 3 filas con ok = true ─────────────────────
SELECT 'tablas con RLS' AS k,
       (SELECT bool_and(relrowsecurity) FROM pg_class
         WHERE oid IN ('public.prospects'::regclass, 'public.prospect_searches'::regclass)) AS ok
UNION ALL
SELECT 'anon no ve prospectos',
       NOT has_table_privilege('anon', 'public.prospects', 'SELECT')
UNION ALL
SELECT 'funciones solo para el equipo',
       NOT has_function_privilege('anon', 'prospect_act(uuid,text,uuid,text)', 'EXECUTE')
       AND has_function_privilege('authenticated', 'prospect_ingest(text,text,jsonb)', 'EXECUTE');
