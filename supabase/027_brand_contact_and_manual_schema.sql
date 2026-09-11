-- ═══════════════════════════════════════════════════════════
-- 027 · Contacto de marcas + endurecer schema del Manual
--
-- QUÉ HACE
--   a) Agrega whatsapp/instagram/phone/email a `brands`. Hoy esa
--      tabla no tiene ninguna de las cuatro columnas — por eso
--      QuickActions nunca puede mostrar un botón en una tarjeta de
--      marca, sin importar qué cargue el Scouter.
--   b) Asegura que `manual_categories` y `manual_sections` existan
--      con el shape que database.js ya espera (fueron creadas a
--      mano en el dashboard en algún momento del 2G y esa migración
--      nunca quedó como archivo — esto la deja documentada y
--      reproducible sin tocar los datos si ya existen).
--   c) Agrega `direction_only` a manual_sections: hay contenido del
--      manual (Anexo Interno) que el propio documento fuente marca
--      "uso de Dirección" — antes no había forma de esconderlo de
--      un Scouter aparte de min_level, que se compara contra
--      scouters.level y no sirve para "solo Dirección".
--   d) Función my_scouter_level(): nivel del scouter actual, con
--      fallback a 1 si no tiene fila en `scouters` (Dirección y
--      leads no son necesariamente "scouters" con nivel).
--
-- SEGURIDAD: 100% aditivo. IF NOT EXISTS / ADD COLUMN IF NOT EXISTS
-- en todo. No borra ni modifica columnas existentes.
-- ═══════════════════════════════════════════════════════════

BEGIN;

-- ── 0) Registro de migraciones ───────────────────────────────
-- El diagnóstico mostró que esta tabla no existe en esta base (el
-- 01-reparar-base.sql de Fase 1 la crea, pero esta base arrancó desde
-- un schema.sql posterior que no la incluyó). Se crea acá, con la
-- misma definición que Fase 1, para que el INSERT del final de este
-- archivo (y el de 028/029) no vuelva a abortar la transacción entera.
CREATE TABLE IF NOT EXISTS schema_migrations (
  version     TEXT        PRIMARY KEY,
  descripcion TEXT,
  aplicada_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── a) Contacto de marcas ───────────────────────────────────
ALTER TABLE brands
  ADD COLUMN IF NOT EXISTS whatsapp  TEXT,
  ADD COLUMN IF NOT EXISTS instagram TEXT,
  ADD COLUMN IF NOT EXISTS phone     TEXT,
  ADD COLUMN IF NOT EXISTS email     TEXT;

-- ── b) Manual — crear solo si no existe ──────────────────────
CREATE TABLE IF NOT EXISTS manual_categories (
  code       TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  sort_order INT  NOT NULL DEFAULT 0,
  active     BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS manual_sections (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category   TEXT NOT NULL REFERENCES manual_categories(code),
  slug       TEXT NOT NULL UNIQUE,
  title      TEXT NOT NULL,
  subtitle   TEXT,
  body       TEXT NOT NULL DEFAULT '',
  sort_order INT  NOT NULL DEFAULT 0,
  min_level  INT  NOT NULL DEFAULT 1,
  active     BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Si las tablas ya existían (creadas a mano en 2G), esto solo agrega
-- lo que falte sin tocar lo que ya está cargado.
ALTER TABLE manual_sections
  ADD COLUMN IF NOT EXISTS direction_only BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_manual_sections_category ON manual_sections(category, sort_order);

-- ── c) Nivel del scouter actual, con fallback ────────────────
-- Dirección / leads no siempre tienen fila en `scouters`. Sin este
-- fallback, my_scouter_level() les devolvería NULL y la comparación
-- `min_level <= my_scouter_level()` los dejaría afuera de TODO el
-- manual (NULL en una comparación numérica no es TRUE).
CREATE OR REPLACE FUNCTION my_scouter_level()
RETURNS INT LANGUAGE sql STABLE AS $fn$
  SELECT coalesce(
    (SELECT level FROM scouters WHERE user_id = auth.uid()),
    1
  );
$fn$;

-- ── d) RLS del Manual ─────────────────────────────────────────
ALTER TABLE manual_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE manual_sections   ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mc_select" ON manual_categories;
CREATE POLICY "mc_select" ON manual_categories FOR SELECT TO authenticated
USING (active = true);

DROP POLICY IF EXISTS "ms_select" ON manual_sections;
CREATE POLICY "ms_select" ON manual_sections FOR SELECT TO authenticated
USING (
  active = true
  AND (min_level <= my_scouter_level() OR app_is_direction())
  AND (direction_only = false OR app_is_direction())
);

-- Escritura: solo Dirección (AdminPanel / ManualSection ya lo
-- filtra en el cliente con COMMAND_ROLES, esto es la barrera real).
DROP POLICY IF EXISTS "ms_update" ON manual_sections;
CREATE POLICY "ms_update" ON manual_sections FOR UPDATE TO authenticated
USING (app_is_direction()) WITH CHECK (app_is_direction());

INSERT INTO schema_migrations (version, descripcion)
VALUES ('027_brand_contact_and_manual_schema',
        'whatsapp/instagram/phone/email en brands; manual_categories/manual_sections documentadas; direction_only; my_scouter_level()')
ON CONFLICT (version) DO NOTHING;

COMMIT;

-- ── Verificación ──────────────────────────────────────────────
SELECT column_name FROM information_schema.columns
WHERE table_name = 'brands' AND column_name IN ('whatsapp','instagram','phone','email');

SELECT proname FROM pg_proc WHERE proname = 'my_scouter_level';

-- ═══════════════════════════════════════════════════════════
-- ROLLBACK
--   ALTER TABLE brands DROP COLUMN IF EXISTS whatsapp, DROP COLUMN IF EXISTS instagram,
--     DROP COLUMN IF EXISTS phone, DROP COLUMN IF EXISTS email;
--   ALTER TABLE manual_sections DROP COLUMN IF EXISTS direction_only;
--   DROP FUNCTION IF EXISTS my_scouter_level();
--   DROP POLICY IF EXISTS "mc_select" ON manual_categories;
--   DROP POLICY IF EXISTS "ms_select" ON manual_sections;
--   DROP POLICY IF EXISTS "ms_update" ON manual_sections;
--   (No se provee DROP TABLE de manual_categories/manual_sections:
--    si ya tenían contenido cargado a mano, borrarlas lo destruye.)
--   DELETE FROM schema_migrations WHERE version='027_brand_contact_and_manual_schema';
-- ═══════════════════════════════════════════════════════════
