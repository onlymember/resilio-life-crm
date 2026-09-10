-- ═══════════════════════════════════════════════════════════
-- 018 · Catálogo de tipos de activación (Colaboraciones)
-- LIFE / ESTÁNDAR / ESPECIAL son reales del negocio, pero van en
-- una tabla: Dirección tiene que poder agregar una cuarta sin deploy.
--
-- ⚠️ CAMBIA collaborations respecto de fase1/04-entidades.sql:
--    se elimina `activation_type TEXT`
--    se agrega  `activation_type_id UUID REFERENCES activation_types(id)`
-- ═══════════════════════════════════════════════════════════

CREATE TABLE activation_types (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  description TEXT,
  color       TEXT,
  sort_order  INT NOT NULL DEFAULT 0,
  active      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO activation_types (code, name, description, color, sort_order) VALUES
  ('life',     'LIFE',     'Colaboración del ecosistema Resilio Life', '#8B5CF6', 1),
  ('estandar', 'ESTÁNDAR', 'Colaboración estándar de agencia',          '#06B6D4', 2),
  ('especial', 'ESPECIAL', 'Activación especial o a medida',            '#F59E0B', 3);

ALTER TABLE collaborations DROP COLUMN IF EXISTS activation_type;
ALTER TABLE collaborations
  ADD COLUMN activation_type_id UUID REFERENCES activation_types(id) ON DELETE SET NULL;
CREATE INDEX ON collaborations (activation_type_id);

ALTER TABLE activation_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY at_read  ON activation_types FOR SELECT TO authenticated USING (true);
CREATE POLICY at_write ON activation_types FOR ALL TO authenticated
  USING (app_is_direction()) WITH CHECK (app_is_direction());
