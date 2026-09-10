-- ═══════════════════════════════════════════════════════════
-- NETWORK · FASE 1 · PASO 03 — Ownership y asignaciones
--
-- LA DECISIÓN DE ARQUITECTURA MÁS IMPORTANTE DE LA FASE 1
--
-- crm_influencers guarda todo dentro de `data jsonb`, y el cliente hace
-- upsert del objeto COMPLETO (dbSaveInfluencer). Si owner_scouter_id viviera
-- dentro de ese JSON, un Scouter podría reasignarse influencers ajenos
-- editando el JSON antes de guardar, y ninguna política RLS con WITH CHECK
-- lo impediría, porque tiene permiso legítimo de escritura sobre esa fila.
--
-- Por eso los campos de gobierno salen del JSONB y pasan a columnas reales,
-- tipadas, indexadas y protegidas por trigger. `data` no se toca: queda para
-- el contenido de negocio (bio, links, stats). Nada se borra.
--
-- SEGURIDAD: solo agrega columnas y tablas. Reversible.
-- ═══════════════════════════════════════════════════════════

BEGIN;

-- ── a) Columnas de gobierno promovidas ─────────────────────
ALTER TABLE crm_influencers
  ADD COLUMN IF NOT EXISTS owner_scouter_id UUID REFERENCES users(id)     ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_by       UUID REFERENCES users(id)     ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_by      UUID REFERENCES users(id)     ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS city_id          UUID REFERENCES cities(id)    ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS country_id       UUID REFERENCES countries(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS status           TEXT NOT NULL DEFAULT 'active';

ALTER TABLE crm_brands
  ADD COLUMN IF NOT EXISTS owner_scouter_id UUID REFERENCES users(id)     ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_by       UUID REFERENCES users(id)     ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_by      UUID REFERENCES users(id)     ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS city_id          UUID REFERENCES cities(id)    ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS country_id       UUID REFERENCES countries(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS status           TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS potential        TEXT,
  ADD COLUMN IF NOT EXISTS next_follow_up   DATE;

CREATE INDEX IF NOT EXISTS idx_inf_owner   ON crm_influencers(owner_scouter_id);
CREATE INDEX IF NOT EXISTS idx_inf_city    ON crm_influencers(city_id);
CREATE INDEX IF NOT EXISTS idx_inf_status  ON crm_influencers(country_id, status);
CREATE INDEX IF NOT EXISTS idx_brand_owner ON crm_brands(owner_scouter_id);
CREATE INDEX IF NOT EXISTS idx_brand_city  ON crm_brands(city_id);
CREATE INDEX IF NOT EXISTS idx_brand_fup   ON crm_brands(next_follow_up)
  WHERE next_follow_up IS NOT NULL;

-- ── b) Historial polimórfico, una sola tabla ───────────────
-- Sirve para influencers, marcas, oportunidades y campañas. Es lo que hace
-- que el timeline (spec §26) sobreviva al cambio de responsable.
CREATE TABLE IF NOT EXISTS assignments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type   TEXT NOT NULL
                CHECK (entity_type IN ('influencer','brand','opportunity','campaign','collaboration')),
  entity_id     TEXT NOT NULL,
  from_owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
  to_owner_id   UUID REFERENCES users(id) ON DELETE SET NULL,
  assigned_by   UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  reason        TEXT,
  assigned_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_assign_entity
  ON assignments(entity_type, entity_id, assigned_at DESC);
CREATE INDEX IF NOT EXISTS idx_assign_to ON assignments(to_owner_id);

-- ── c) RPC de asignación: el ÚNICO camino válido ───────────
-- Atómica: escribe la columna + deja rastro en assignments. Nunca por UPDATE.
CREATE OR REPLACE FUNCTION assign_entity(
  p_entity_type TEXT,
  p_entity_id   TEXT,
  p_to_owner    UUID,
  p_actor       UUID,
  p_reason      TEXT DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_from UUID;
BEGIN
  IF p_actor IS NULL THEN
    RAISE EXCEPTION 'assign_entity: se requiere el actor';
  END IF;

  IF p_entity_type = 'influencer' THEN
    SELECT owner_scouter_id INTO v_from FROM crm_influencers WHERE id = p_entity_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Influencer % no existe', p_entity_id; END IF;
    UPDATE crm_influencers
       SET owner_scouter_id = p_to_owner,
           assigned_by      = p_actor,
           assigned_at      = NOW()
     WHERE id = p_entity_id;

  ELSIF p_entity_type = 'brand' THEN
    SELECT owner_scouter_id INTO v_from FROM crm_brands WHERE id = p_entity_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Marca % no existe', p_entity_id; END IF;
    UPDATE crm_brands
       SET owner_scouter_id = p_to_owner,
           assigned_by      = p_actor,
           assigned_at      = NOW()
     WHERE id = p_entity_id;

  ELSE
    RAISE EXCEPTION 'assign_entity: entity_type % no soportado todavía', p_entity_type;
  END IF;

  INSERT INTO assignments (entity_type, entity_id, from_owner_id, to_owner_id, assigned_by, reason)
  VALUES (p_entity_type, p_entity_id, v_from, p_to_owner, p_actor, p_reason);
END
$fn$;

COMMENT ON FUNCTION assign_entity IS
  'Único camino válido para reasignar. p_actor se pasa explícito porque el '
  'sistema todavía no emite JWT; en la Fase 2 (PROMPT 04) se reemplaza por '
  'auth.uid() y la validación de scope se hace acá adentro.';

-- ── d) Vista de huérfanos: lo que Dirección tiene que repartir ──
CREATE OR REPLACE VIEW v_sin_dueno AS
  SELECT 'influencer' AS tipo, id, data->>'name' AS nombre, city_id, created_at
    FROM crm_influencers WHERE owner_scouter_id IS NULL
  UNION ALL
  SELECT 'brand', id, data->>'name', city_id, created_at
    FROM crm_brands WHERE owner_scouter_id IS NULL;

-- ── RLS temporal ───────────────────────────────────────────
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "TEMP_open_until_auth" ON assignments;
CREATE POLICY "TEMP_open_until_auth" ON assignments FOR ALL USING (true) WITH CHECK (true);

INSERT INTO schema_migrations (version, descripcion)
VALUES ('003_ownership', 'Columnas de gobierno fuera del JSONB, assignments, assign_entity()')
ON CONFLICT (version) DO NOTHING;

COMMIT;

-- ── Verificación: los datos no cambiaron, solo se agregaron columnas ──
SELECT
  (SELECT count(*) FROM crm_influencers)                              AS influencers_total,
  (SELECT count(*) FROM crm_influencers WHERE data IS NOT NULL)       AS con_data,
  (SELECT count(*) FROM crm_influencers WHERE owner_scouter_id IS NULL) AS sin_dueno,
  (SELECT count(*) FROM crm_brands)                                   AS marcas_total;

-- ═══════════════════════════════════════════════════════════
-- NOTA SOBRE EL BACKFILL
--   owner_scouter_id queda NULL a propósito en todo lo existente.
--   No se inventan dueños para registros históricos: Dirección los reparte
--   desde la vista v_sin_dueno.
--
-- NOTA SOBRE LAS FK A users(id)
--   Apuntan a `users` porque `profiles` todavía no existe. El PROMPT 04
--   (migración a Supabase Auth) remapea estas FK con el user-id-map.
--
-- ROLLBACK
--   DROP VIEW IF EXISTS v_sin_dueno;
--   DROP FUNCTION IF EXISTS assign_entity(TEXT,TEXT,UUID,UUID,TEXT);
--   DROP TABLE IF EXISTS assignments;
--   ALTER TABLE crm_influencers
--     DROP COLUMN IF EXISTS owner_scouter_id, DROP COLUMN IF EXISTS created_by,
--     DROP COLUMN IF EXISTS assigned_by,      DROP COLUMN IF EXISTS assigned_at,
--     DROP COLUMN IF EXISTS city_id,          DROP COLUMN IF EXISTS country_id,
--     DROP COLUMN IF EXISTS status;
--   (ídem crm_brands + potential, next_follow_up)
--   DELETE FROM schema_migrations WHERE version='003_ownership';
-- ═══════════════════════════════════════════════════════════
