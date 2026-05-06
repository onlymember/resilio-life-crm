-- ═══════════════════════════════════════════════════════════
-- RESILIO LIFE CRM — Schema Supabase
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════════

-- ── USUARIOS Y AUTENTICACIÓN ──────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  email         TEXT        UNIQUE NOT NULL,
  password      TEXT        NOT NULL,
  nombre        TEXT        NOT NULL,
  username      TEXT,
  sobrenombre   TEXT        DEFAULT '',
  avatar        TEXT        DEFAULT '',
  avatar_color  TEXT        DEFAULT '#8B5CF6',
  rol           TEXT        DEFAULT 'viewer'
                            CHECK (rol IN ('super_admin','admin','editor','viewer','custom')),
  estado        TEXT        DEFAULT 'pendiente'
                            CHECK (estado IN ('pendiente','aprobado','bloqueado','suspendido')),
  permisos_ecosistemas  TEXT[]   DEFAULT '{}',
  permiso_crear         BOOLEAN  DEFAULT FALSE,
  permiso_editar        BOOLEAN  DEFAULT FALSE,
  permiso_borrar        BOOLEAN  DEFAULT FALSE,
  permiso_exportar      BOOLEAN  DEFAULT FALSE,
  permiso_analytics     BOOLEAN  DEFAULT FALSE,
  permiso_equipo        BOOLEAN  DEFAULT FALSE,
  notas_admin   TEXT        DEFAULT '',
  ultimo_acceso TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── HISTORIAL DE ACTIVIDAD ────────────────────────────────
CREATE TABLE IF NOT EXISTS activity_log (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID        REFERENCES users(id) ON DELETE SET NULL,
  user_name  TEXT,
  action     TEXT        NOT NULL,
  detail     TEXT,
  section    TEXT        DEFAULT 'sistema',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── DATOS CRM (JSONB flexible) ────────────────────────────
-- Marcas
CREATE TABLE IF NOT EXISTS crm_brands (
  id         TEXT        PRIMARY KEY,
  data       JSONB       NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Locales / sucursales
CREATE TABLE IF NOT EXISTS crm_locations (
  id         TEXT        PRIMARY KEY,
  brand_id   TEXT        REFERENCES crm_brands(id) ON DELETE CASCADE,
  data       JSONB       NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Influencers
CREATE TABLE IF NOT EXISTS crm_influencers (
  id         TEXT        PRIMARY KEY,
  data       JSONB       NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── ROW LEVEL SECURITY ────────────────────────────────────
ALTER TABLE users            ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log     ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_brands       ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_locations    ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_influencers  ENABLE ROW LEVEL SECURITY;

-- Políticas abiertas (autenticación propia del CRM, no Supabase Auth)
CREATE POLICY "allow_all" ON users           FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON activity_log    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON crm_brands      FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON crm_locations   FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON crm_influencers FOR ALL USING (true) WITH CHECK (true);

-- ── ÍNDICES ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_users_email         ON users(email);
CREATE INDEX IF NOT EXISTS idx_activity_log_time   ON activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_brands_updated  ON crm_brands(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_locations_brand ON crm_locations(brand_id);
