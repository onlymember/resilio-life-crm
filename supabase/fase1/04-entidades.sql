-- ═══════════════════════════════════════════════════════════
-- NETWORK · FASE 1 · PASO 04 — Entidades de negocio
--
--   OPPORTUNITY → CAMPAIGN → CAMPAIGN_INFLUENCERS → COLLABORATION
--
-- Saca de localStorage lo que hoy se pierde:
--   · campañas          → crm_inf_camps_v2  (localStorage)
--   · colaboraciones    → useState dentro de CollabsPanel (ni eso persiste)
--
-- ⚠️ NO se migra automáticamente el contenido de localStorage. Según el
--    handoff son DEMO_INF_CAMPAIGNS: importarlas sería ensuciar producción
--    con datos ficticios. La importación, si hace falta, se revisa a mano.
--
-- SEGURIDAD: solo tablas nuevas. No toca nada existente.
-- ═══════════════════════════════════════════════════════════

BEGIN;

-- ── OPPORTUNITIES (spec §09) ───────────────────────────────
DO $do$ BEGIN
  CREATE TYPE opportunity_status AS ENUM
    ('new','qualifying','contacted','in_conversation','proposal','won','lost','on_hold');
EXCEPTION WHEN duplicate_object THEN NULL; END $do$;

CREATE TABLE IF NOT EXISTS opportunities (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id         TEXT REFERENCES crm_brands(id) ON DELETE SET NULL,
  city_id          UUID REFERENCES cities(id),
  country_id       UUID REFERENCES countries(id),
  title            TEXT NOT NULL,
  description      TEXT,
  status           opportunity_status NOT NULL DEFAULT 'new',
  estimated_value  NUMERIC(14,2),
  currency         TEXT,                        -- del país; nunca 'ARS' hardcodeada
  source           TEXT,
  owner_scouter_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_by       UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  next_follow_up   DATE,
  lost_reason      TEXT,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_opp_owner  ON opportunities(owner_scouter_id, status);
CREATE INDEX IF NOT EXISTS idx_opp_city   ON opportunities(city_id, status);
CREATE INDEX IF NOT EXISTS idx_opp_follow ON opportunities(next_follow_up)
  WHERE status NOT IN ('won','lost');

-- ── CAMPAIGNS (spec §10) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS campaigns (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id       TEXT REFERENCES crm_brands(id) ON DELETE SET NULL,
  opportunity_id UUID REFERENCES opportunities(id) ON DELETE SET NULL,
  city_id        UUID REFERENCES cities(id),
  country_id     UUID REFERENCES countries(id),
  name           TEXT NOT NULL,
  description    TEXT,
  status         TEXT NOT NULL DEFAULT 'planning'
                 CHECK (status IN ('planning','active','completed','paused','cancelled')),
  budget         NUMERIC(14,2),
  currency       TEXT,
  agency_pct     NUMERIC(5,2),
  influencer_pct NUMERIC(5,2),
  start_date     DATE,
  end_date       DATE,
  owner_id       UUID REFERENCES users(id) ON DELETE SET NULL,
  created_by     UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT campaigns_fechas_coherentes
    CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date)
);
CREATE INDEX IF NOT EXISTS idx_camp_owner ON campaigns(owner_id, status);
CREATE INDEX IF NOT EXISTS idx_camp_brand ON campaigns(brand_id);

-- ── CAMPAIGN_INFLUENCERS — relación N:M real (spec §11) ────
-- Reemplaza el array `influencersAssigned[]` de localStorage.
CREATE TABLE IF NOT EXISTS campaign_influencers (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id    UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  -- RESTRICT: un influencer que participó de una campaña no se borra, se archiva
  influencer_id  TEXT NOT NULL REFERENCES crm_influencers(id) ON DELETE RESTRICT,
  assigned_by    UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  status         TEXT NOT NULL DEFAULT 'proposed'
                 CHECK (status IN ('proposed','confirmed','active','completed','declined')),
  rate           NUMERIC(14,2),
  currency       TEXT,
  deliverables   JSONB NOT NULL DEFAULT '[]',
  content_status TEXT DEFAULT 'pending',
  payment_status TEXT DEFAULT 'pending',
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (campaign_id, influencer_id)
);
CREATE INDEX IF NOT EXISTS idx_ci_campaign   ON campaign_influencers(campaign_id);
CREATE INDEX IF NOT EXISTS idx_ci_influencer ON campaign_influencers(influencer_id);

-- ── COLLABORATIONS (spec §12) ──────────────────────────────
DO $do$ BEGIN
  CREATE TYPE collab_status AS ENUM
    ('proposed','confirmed','in_progress','content_pending','completed','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $do$;

CREATE TABLE IF NOT EXISTS collaborations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id     UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  brand_id        TEXT REFERENCES crm_brands(id) ON DELETE SET NULL,
  influencer_id   TEXT NOT NULL REFERENCES crm_influencers(id) ON DELETE RESTRICT,
  scouter_id      UUID REFERENCES users(id) ON DELETE SET NULL,
  city_id         UUID REFERENCES cities(id),
  country_id      UUID REFERENCES countries(id),
  status          collab_status NOT NULL DEFAULT 'proposed',
  -- Taxonomía del negocio (LIFE / ESTÁNDAR / ESPECIAL en CollabsPanel).
  -- Texto libre a propósito: falta confirmar si es real o era placeholder.
  activation_type TEXT,
  start_date      DATE,
  end_date        DATE,
  deliverables    JSONB NOT NULL DEFAULT '[]',
  content_status  TEXT DEFAULT 'pending',
  payment_status  TEXT DEFAULT 'pending',
  amount          NUMERIC(14,2),
  currency        TEXT,
  results         JSONB NOT NULL DEFAULT '{}',
  notes           TEXT,
  created_by      UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_collab_scouter    ON collaborations(scouter_id, status);
CREATE INDEX IF NOT EXISTS idx_collab_influencer ON collaborations(influencer_id);
CREATE INDEX IF NOT EXISTS idx_collab_campaign   ON collaborations(campaign_id);

-- ── updated_at automático ──────────────────────────────────
CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS TRIGGER
LANGUAGE plpgsql AS $fn$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END
$fn$;

DO $do$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['opportunities','campaigns','campaign_influencers','collaborations']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_touch ON public.%I', t);
    EXECUTE format(
      'CREATE TRIGGER trg_touch BEFORE UPDATE ON public.%I
         FOR EACH ROW EXECUTE FUNCTION touch_updated_at()', t);
  END LOOP;
END
$do$;

-- ── RLS temporal ───────────────────────────────────────────
DO $do$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['opportunities','campaigns','campaign_influencers','collaborations']
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "TEMP_open_until_auth" ON public.%I', t);
    EXECUTE format(
      'CREATE POLICY "TEMP_open_until_auth" ON public.%I FOR ALL USING (true) WITH CHECK (true)', t);
  END LOOP;
END
$do$;

INSERT INTO schema_migrations (version, descripcion)
VALUES ('004_entidades', 'opportunities, campaigns, campaign_influencers, collaborations')
ON CONFLICT (version) DO NOTHING;

COMMIT;

SELECT tablename FROM pg_tables
WHERE schemaname='public'
  AND tablename IN ('opportunities','campaigns','campaign_influencers','collaborations')
ORDER BY 1;

-- ═══════════════════════════════════════════════════════════
-- ROLLBACK
--   DROP TABLE IF EXISTS collaborations, campaign_influencers, campaigns, opportunities CASCADE;
--   DROP TYPE  IF EXISTS collab_status, opportunity_status;
--   DELETE FROM schema_migrations WHERE version='004_entidades';
-- ═══════════════════════════════════════════════════════════
