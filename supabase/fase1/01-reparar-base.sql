-- ═══════════════════════════════════════════════════════════
-- NETWORK · FASE 1 · PASO 01 — Reparar el schema base
--
-- QUÉ HACE
--   a) Crea el registro de migraciones (para saber qué se corrió).
--   b) Crea las tablas crm_* que falten. Si ya existen, NO las toca.
--   c) Completa las columnas faltantes de `users`.
--   d) Habilita el rol 'scouter'.
--
-- POR QUÉ IMPORTA
--   `dbGetInfluencers()` en database.js descarta el error de Supabase, y
--   App.jsx lo envuelve en `.catch(() => {})`. Si la tabla no existe, la app
--   se queda con DEMO_INFLUENCERS sin avisar, y como `influencers` es
--   useState (no useLocalStorage), todo lo que cargue el equipo se pierde
--   al recargar. Este paso cierra esa pérdida silenciosa.
--
-- SEGURIDAD: idempotente. Solo crea. No borra ni modifica datos.
-- ═══════════════════════════════════════════════════════════

BEGIN;

-- ── a) Registro de migraciones ─────────────────────────────
CREATE TABLE IF NOT EXISTS schema_migrations (
  version     TEXT        PRIMARY KEY,
  descripcion TEXT,
  aplicada_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── b) Tablas CRM (JSONB flexible, igual que schema.sql) ───
CREATE TABLE IF NOT EXISTS crm_brands (
  id         TEXT        PRIMARY KEY,
  data       JSONB       NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crm_locations (
  id         TEXT        PRIMARY KEY,
  brand_id   TEXT        REFERENCES crm_brands(id) ON DELETE CASCADE,
  data       JSONB       NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crm_influencers (
  id         TEXT        PRIMARY KEY,
  data       JSONB       NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS activity_log (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID        REFERENCES users(id) ON DELETE SET NULL,
  user_name  TEXT,
  action     TEXT        NOT NULL,
  detail     TEXT,
  section    TEXT        DEFAULT 'sistema',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── c) Columnas faltantes de `users` ───────────────────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_color      TEXT    DEFAULT '#8B5CF6';
ALTER TABLE users ADD COLUMN IF NOT EXISTS permiso_analytics BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS permiso_equipo    BOOLEAN DEFAULT FALSE;
-- i18n desde el día uno (spec §32) — todavía sin uso en el frontend
ALTER TABLE users ADD COLUMN IF NOT EXISTS locale            TEXT    DEFAULT 'es';
ALTER TABLE users ADD COLUMN IF NOT EXISTS timezone          TEXT    DEFAULT 'America/Argentina/Buenos_Aires';
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at        TIMESTAMPTZ DEFAULT NOW();

-- ── d) Rol 'scouter' ───────────────────────────────────────
-- Sin esto el AdminPanel falla con: users_rol_check
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_rol_check;
ALTER TABLE users ADD CONSTRAINT users_rol_check
  CHECK (rol IN ('super_admin','admin','editor','viewer','custom','scouter'));

-- ── Índices ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_users_email         ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_rol           ON users(rol);
CREATE INDEX IF NOT EXISTS idx_activity_log_time   ON activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_brands_updated  ON crm_brands(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_locations_brand ON crm_locations(brand_id);
CREATE INDEX IF NOT EXISTS idx_crm_inf_updated     ON crm_influencers(updated_at DESC);

-- ── RLS temporal ───────────────────────────────────────────
-- ⚠️ ABIERTA A PROPÓSITO, y esto NO es un descuido nuevo:
-- el sistema todavía no emite JWT de usuario (auth.uid() es NULL), así que
-- una política restrictiva dejaría la app mostrando cero filas.
-- Se llaman TEMP_open_until_auth para que la Fase 2 (PROMPT 08) las encuentre
-- y las reemplace con una sola query. Ver 99-verificacion.sql, bloque 3.
DO $do$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['crm_brands','crm_locations','crm_influencers','activity_log','schema_migrations']
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "TEMP_open_until_auth" ON public.%I', t);
    EXECUTE format(
      'CREATE POLICY "TEMP_open_until_auth" ON public.%I FOR ALL USING (true) WITH CHECK (true)', t);
  END LOOP;
END
$do$;

INSERT INTO schema_migrations (version, descripcion)
VALUES ('001_reparar_base', 'Tablas crm_*, columnas de users, rol scouter, RLS temporal nombrada')
ON CONFLICT (version) DO NOTHING;

COMMIT;

-- ── Verificación ───────────────────────────────────────────
SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY 1;

-- ═══════════════════════════════════════════════════════════
-- ROLLBACK
--   No se provee DROP de las tablas: si ya tenían datos, borrarlas los
--   destruye. Para revertir solo el rol scouter:
--     UPDATE users SET rol='viewer' WHERE rol='scouter';
--     ALTER TABLE users DROP CONSTRAINT users_rol_check;
--     ALTER TABLE users ADD CONSTRAINT users_rol_check
--       CHECK (rol IN ('super_admin','admin','editor','viewer','custom'));
-- ═══════════════════════════════════════════════════════════
