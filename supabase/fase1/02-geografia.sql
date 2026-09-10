-- ═══════════════════════════════════════════════════════════
-- NETWORK · FASE 1 · PASO 02 — Estructura internacional
--
--   REGION → COUNTRY → CITY → TEAM → SCOUTER   (spec §04)
--
-- REGLA: ningún país, ciudad ni moneda se hardcodea en el frontend.
-- Agregar Brasil o Chile se hace con un INSERT, no con un deploy.
--
-- SEGURIDAD: solo crea tablas nuevas. No toca nada existente.
-- ═══════════════════════════════════════════════════════════

BEGIN;

CREATE TABLE IF NOT EXISTS regions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code       TEXT UNIQUE NOT NULL,              -- 'LATAM','NA','EU'
  name       TEXT NOT NULL,
  active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS countries (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region_id  UUID NOT NULL REFERENCES regions(id) ON DELETE RESTRICT,
  code       TEXT UNIQUE NOT NULL,              -- ISO 3166-1 alpha-2
  name       TEXT NOT NULL,
  currency   TEXT NOT NULL,                     -- ISO 4217
  timezone   TEXT NOT NULL,                     -- IANA, nunca offsets (DST)
  locale     TEXT NOT NULL DEFAULT 'es',
  active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cities (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id  UUID NOT NULL REFERENCES countries(id) ON DELETE RESTRICT,
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL,
  timezone    TEXT,                             -- override si difiere del país
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  launched_at DATE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  -- Córdoba AR y Córdoba ES pueden coexistir:
  UNIQUE (country_id, slug)
);

CREATE TABLE IF NOT EXISTS teams (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id      UUID NOT NULL REFERENCES cities(id) ON DELETE RESTRICT,
  name         TEXT NOT NULL,
  lead_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS scouters (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id   UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  team_id   UUID REFERENCES teams(id) ON DELETE SET NULL,
  city_id   UUID NOT NULL REFERENCES cities(id) ON DELETE RESTRICT,
  level     INT  NOT NULL DEFAULT 1 CHECK (level BETWEEN 1 AND 3),  -- Manual · LEVELS
  status    TEXT NOT NULL DEFAULT 'active'
            CHECK (status IN ('active','paused','inactive')),
  joined_at DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_countries_region ON countries(region_id);
CREATE INDEX IF NOT EXISTS idx_cities_country   ON cities(country_id);
CREATE INDEX IF NOT EXISTS idx_teams_city       ON teams(city_id);
CREATE INDEX IF NOT EXISTS idx_scouters_city    ON scouters(city_id);
CREATE INDEX IF NOT EXISTS idx_scouters_user    ON scouters(user_id);

-- ── Seed: los mercados que existen hoy (Manual · The Network Model) ──
INSERT INTO regions (code, name) VALUES
  ('LATAM', 'Latinoamérica'),
  ('NA',    'Norteamérica')
ON CONFLICT (code) DO NOTHING;

INSERT INTO countries (region_id, code, name, currency, timezone, locale)
SELECT r.id, v.code, v.name, v.currency, v.tz, v.locale
FROM (VALUES
  ('LATAM','AR','Argentina',     'ARS','America/Argentina/Buenos_Aires','es'),
  ('LATAM','UY','Uruguay',       'UYU','America/Montevideo',            'es'),
  ('NA',   'US','Estados Unidos','USD','America/New_York',              'en')
) AS v(region, code, name, currency, tz, locale)
JOIN regions r ON r.code = v.region
ON CONFLICT (code) DO NOTHING;

INSERT INTO cities (country_id, name, slug)
SELECT c.id, v.name, v.slug
FROM (VALUES
  ('AR','Rosario',       'rosario'),
  ('AR','Santa Fe',      'santa-fe'),
  ('AR','Buenos Aires',  'buenos-aires'),
  ('AR','Córdoba',       'cordoba'),
  ('UY','Punta del Este','punta-del-este'),
  ('US','Miami',         'miami')
) AS v(pais, name, slug)
JOIN countries c ON c.code = v.pais
ON CONFLICT (country_id, slug) DO NOTHING;

-- RLS temporal (ver nota en el paso 01)
DO $do$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['regions','countries','cities','teams','scouters']
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "TEMP_open_until_auth" ON public.%I', t);
    EXECUTE format(
      'CREATE POLICY "TEMP_open_until_auth" ON public.%I FOR ALL USING (true) WITH CHECK (true)', t);
  END LOOP;
END
$do$;

INSERT INTO schema_migrations (version, descripcion)
VALUES ('002_geografia', 'regions/countries/cities/teams/scouters + seed AR, UY, US')
ON CONFLICT (version) DO NOTHING;

COMMIT;

-- ── Verificación: debe devolver 6 ciudades ─────────────────
SELECT r.code AS region, co.code AS pais, co.currency, ci.name AS ciudad
FROM cities ci
JOIN countries co ON co.id = ci.country_id
JOIN regions   r  ON r.id  = co.region_id
ORDER BY r.code, co.code, ci.name;

-- ═══════════════════════════════════════════════════════════
-- ROLLBACK (destruye la geografía; solo si nadie la referencia todavía)
--   DROP TABLE IF EXISTS scouters, teams, cities, countries, regions CASCADE;
--   DELETE FROM schema_migrations WHERE version='002_geografia';
-- ═══════════════════════════════════════════════════════════
