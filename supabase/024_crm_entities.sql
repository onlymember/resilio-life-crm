-- ═══════════════════════════════════════════════════════════
-- 024 · CRM de entidades: brand_categories, assign_entity v2,
--       app_can_see_entity, entity_timeline
--
-- OBJETIVO: activar el CRM completo de marcas e influencers:
--   • brand_categories: 6 categorías comerciales (no hardcodeadas en JS)
--   • assign_entity actualizado: usa auth.uid() internamente,
--     p_entity_id pasa a UUID, valida rol COMMAND dentro de la función
--   • app_can_see_entity: función SECURITY DEFINER que corta cualquier
--     ciclo RLS (Regla 2 — nunca una política consulta otra tabla con RLS)
--   • entity_timeline: UNION de activities + assignments, SECURITY INVOKER
--   • RLS de assignments: reemplaza la política temporal de Fase 1
--   • RLS de activities: add policy segura usando app_can_see_entity
-- ═══════════════════════════════════════════════════════════

-- ── 1. Categorías de marca ──────────────────────────────────
CREATE TABLE IF NOT EXISTS brand_categories (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code       TEXT NOT NULL,
  name       TEXT NOT NULL,
  sort_order INT  NOT NULL DEFAULT 0,
  active     BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT brand_categories_code_key UNIQUE (code)
);

INSERT INTO brand_categories (code, name, sort_order) VALUES
  ('everyday',   'Everyday',    1),
  ('weekly',     'Weekly',      2),
  ('monthly',    'Monthly',     3),
  ('premium',    'Premium',     4),
  ('experience', 'Experience',  5),
  ('culture',    'Culture',     6)
ON CONFLICT (code) DO NOTHING;

ALTER TABLE brands ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES brand_categories(id);

CREATE INDEX IF NOT EXISTS idx_brands_category_id ON brands(category_id);

-- RLS para brand_categories (lectura pública para usuarios autenticados)
ALTER TABLE brand_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bc_select" ON brand_categories;
CREATE POLICY "bc_select" ON brand_categories FOR SELECT TO authenticated USING (active = true);

-- ── 2. Bypass de trigger para assign_entity ─────────────────
-- log_activity_auto genera un evento genérico en cada UPDATE.
-- assign_entity necesita insertar su propio evento 'reassigned'
-- sin que el trigger interfiera. Con set_config('app.assigning','on',true)
-- la función avisa al trigger que ya se encarga del logging.
CREATE OR REPLACE FUNCTION log_activity_auto()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_type  TEXT;
  v_title TEXT;
  v_ent   TEXT := TG_ARGV[0];
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

  INSERT INTO activities (actor_id, entity_type, entity_id, type, title, metadata)
  VALUES (
    COALESCE(auth.uid(), NEW.created_by),
    v_ent, NEW.id::text, v_type, v_title,
    CASE WHEN TG_OP = 'UPDATE'
         THEN jsonb_build_object('from', OLD.status, 'to', NEW.status)
         ELSE '{}'::jsonb END
  );
  RETURN NEW;
END $fn$;

-- ── 3. app_can_see_entity — SECURITY DEFINER ────────────────
-- Corta el ciclo RLS: las políticas de activities/assignments
-- llaman a esta función en vez de hacer JOIN sobre tablas con RLS.
-- Como es SECURITY DEFINER, corre como el dueño de la función y
-- no vuelve a evaluar RLS de influencers/brands.
CREATE OR REPLACE FUNCTION app_can_see_entity(p_type TEXT, p_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_owner UUID;
BEGIN
  -- Direction y roles de comando ven todo
  IF app_is_direction() THEN RETURN TRUE; END IF;

  IF p_type = 'influencer' THEN
    SELECT owner_scouter_id INTO v_owner FROM influencers WHERE id = p_id;
  ELSIF p_type = 'brand' THEN
    SELECT owner_scouter_id INTO v_owner FROM brands WHERE id = p_id;
  ELSE
    -- Para otros entity_types (task, opportunity, etc.) no aplica
    RETURN FALSE;
  END IF;

  RETURN v_owner IS NOT NULL AND v_owner = auth.uid();
END $fn$;

-- ── 4. assign_entity v2 ─────────────────────────────────────
-- Firma anterior: (TEXT, TEXT, UUID, UUID, TEXT)  ← crm_* tables, p_actor explícito
-- Firma nueva:    (TEXT, UUID, UUID, TEXT)         ← tables actuales, auth.uid()
--
-- CREATE OR REPLACE no puede cambiar la firma: necesita DROP explícito.
-- El COMMIT intermedio evita que el DROP y el CREATE sean dependientes.
DROP FUNCTION IF EXISTS assign_entity(TEXT, TEXT, UUID, UUID, TEXT);

CREATE OR REPLACE FUNCTION assign_entity(
  p_entity_type TEXT,
  p_entity_id   UUID,
  p_to_owner    UUID,
  p_reason      TEXT DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_actor     UUID := auth.uid();
  v_from      UUID;
  v_from_name TEXT;
  v_to_name   TEXT;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'assign_entity: se requiere sesión activa';
  END IF;

  -- Solo COMMAND_ROLES pueden reasignar
  IF NOT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id  = v_actor
      AND role IN ('super_admin','network_direction','regional_lead','country_lead','city_lead')
      AND revoked_at IS NULL
  ) THEN
    RAISE EXCEPTION 'assign_entity: sin permiso para reasignar (se requiere rol de dirección)';
  END IF;

  -- Señalizar al trigger que assign_entity maneja el logging
  PERFORM set_config('app.assigning', 'on', true);

  IF p_entity_type = 'influencer' THEN
    SELECT owner_scouter_id INTO v_from FROM influencers WHERE id = p_entity_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Influencer % no existe', p_entity_id; END IF;
    UPDATE influencers SET owner_scouter_id = p_to_owner WHERE id = p_entity_id;

  ELSIF p_entity_type = 'brand' THEN
    SELECT owner_scouter_id INTO v_from FROM brands WHERE id = p_entity_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Marca % no existe', p_entity_id; END IF;
    UPDATE brands SET owner_scouter_id = p_to_owner WHERE id = p_entity_id;

  ELSE
    RAISE EXCEPTION 'assign_entity: entity_type % no soportado', p_entity_type;
  END IF;

  PERFORM set_config('app.assigning', 'off', true);

  -- Nombres para la descripción del evento
  SELECT nombre INTO v_from_name FROM profiles WHERE id = v_from;
  SELECT nombre INTO v_to_name   FROM profiles WHERE id = p_to_owner;

  -- Historial de asignación (entity_id se guarda como TEXT por compatibilidad)
  INSERT INTO assignments (entity_type, entity_id, from_owner_id, to_owner_id, assigned_by, reason)
  VALUES (p_entity_type, p_entity_id::text, v_from, p_to_owner, v_actor, p_reason);

  -- Actividad 'reassigned' visible en el timeline
  INSERT INTO activities (actor_id, entity_type, entity_id, type, title, description)
  VALUES (
    v_actor,
    p_entity_type,
    p_entity_id::text,
    'reassigned',
    COALESCE('Reasignado a ' || v_to_name, 'Reasignado'),
    CASE
      WHEN v_from_name IS NOT NULL
        THEN 'De ' || v_from_name || ' → ' || COALESCE(v_to_name, '—')
      ELSE 'Asignado a ' || COALESCE(v_to_name, '—')
    END
  );
END $fn$;

-- ── 5. entity_timeline ──────────────────────────────────────
-- SECURITY INVOKER: corre con permisos del llamador. RLS de activities
-- y assignments se aplica automáticamente. El cliente no puede ver más
-- de lo que ya ve en las tablas base.
CREATE OR REPLACE FUNCTION entity_timeline(p_type TEXT, p_id UUID)
RETURNS TABLE (
  id          UUID,
  type        TEXT,
  title       TEXT,
  description TEXT,
  occurred_at TIMESTAMPTZ
)
LANGUAGE sql STABLE
SET search_path = public
AS $$
  SELECT a.id, a.type, a.title, a.description, a.occurred_at
  FROM activities a
  WHERE a.entity_type = p_type
    AND a.entity_id   = p_id::text

  UNION ALL

  SELECT
    asn.id,
    'reassigned'::TEXT AS type,
    COALESCE('Reasignado a ' || p_to.nombre, 'Reasignado')                           AS title,
    CASE
      WHEN p_from.nombre IS NOT NULL
        THEN 'De ' || p_from.nombre || ' → ' || COALESCE(p_to.nombre, '—')
      ELSE 'Asignado a ' || COALESCE(p_to.nombre, '—')
    END                                                                               AS description,
    asn.assigned_at AS occurred_at
  FROM assignments asn
  LEFT JOIN profiles p_to   ON p_to.id   = asn.to_owner_id
  LEFT JOIN profiles p_from ON p_from.id = asn.from_owner_id
  WHERE asn.entity_type = p_type
    AND asn.entity_id   = p_id::text

  ORDER BY occurred_at DESC NULLS LAST
  LIMIT 100;
$$;

-- ── 6. RLS — assignments ────────────────────────────────────
-- La política temporal "TEMP_open_until_auth" de la Fase 1 se cierra.
-- Ahora assignments tiene políticas reales.
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "TEMP_open_until_auth" ON assignments;

-- Lectura: si podés ver la entidad, podés ver su historial de asignaciones
DROP POLICY IF EXISTS "asn_select" ON assignments;
CREATE POLICY "asn_select" ON assignments FOR SELECT TO authenticated
USING (
  app_is_direction()
  OR assigned_by   = auth.uid()
  OR to_owner_id   = auth.uid()
  OR from_owner_id = auth.uid()
  OR (entity_type IN ('influencer','brand')
      AND app_can_see_entity(entity_type, entity_id::UUID))
);

-- Escritura: solo desde assign_entity() (SECURITY DEFINER)
-- Ningún cliente puede insertar directamente en assignments.
DROP POLICY IF EXISTS "asn_insert" ON assignments;
CREATE POLICY "asn_insert" ON assignments FOR INSERT TO authenticated
WITH CHECK (false);

-- ── 7. RLS — activities ─────────────────────────────────────
-- Agregamos una política de lectura sin tocar las existentes.
-- Si ya hay una política que cubre SELECT, esta coexiste (OR lógico).
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "act_select" ON activities;
CREATE POLICY "act_select" ON activities FOR SELECT TO authenticated
USING (
  actor_id = auth.uid()
  OR app_is_direction()
  OR entity_type NOT IN ('influencer','brand')
  OR (entity_type IN ('influencer','brand')
      AND app_can_see_entity(entity_type, entity_id::UUID))
);

DROP POLICY IF EXISTS "act_insert" ON activities;
CREATE POLICY "act_insert" ON activities FOR INSERT TO authenticated
WITH CHECK (
  actor_id = auth.uid()
  OR actor_id IS NULL
);

-- ── 8. Índices de soporte ───────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_activities_entity ON activities(entity_type, entity_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_activities_actor  ON activities(actor_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_assign_entity2    ON assignments(entity_type, entity_id::uuid);

-- ── Verificación ────────────────────────────────────────────
SELECT 'brand_categories' AS tabla, count(*) AS filas FROM brand_categories
UNION ALL
SELECT 'brands con category_id', count(*) FROM brands WHERE category_id IS NOT NULL;
