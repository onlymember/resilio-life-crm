-- ═══════════════════════════════════════════════════════════
-- NETWORK · FASE 1 · PASO 05 — Transversales
--
--   ACTIVITIES · AUDIT_LOG · TASKS · GOALS · MISSIONS
--
-- Activity y Audit son cosas distintas, y conviene que lo sigan siendo:
--   ACTIVITY = hecho de negocio  → "le mandé un DM a la marca"
--              alimenta el timeline (§26) y las métricas (§20)
--   AUDIT    = hecho de sistema  → "el owner cambió de A a B"
--              es forense, append-only, para Dirección
-- Un audit log editable no es un audit log.
--
-- SEGURIDAD: solo tablas nuevas. `activity_log` existente no se toca.
-- ═══════════════════════════════════════════════════════════

BEGIN;

-- ── ACTIVITIES — timeline de negocio (spec §13) ────────────
CREATE TABLE IF NOT EXISTS activities (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  entity_type TEXT NOT NULL,
  entity_id   TEXT NOT NULL,
  type        TEXT NOT NULL,     -- dm | whatsapp | call | meeting | email | note
                                 -- follow_up | status_change | created | assigned
  title       TEXT NOT NULL,
  description TEXT,
  metadata    JSONB NOT NULL DEFAULT '{}',
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Las actividades cuelgan de la ENTIDAD, no del scouter: por eso el timeline
-- sobrevive al cambio de responsable (spec §26).
CREATE INDEX IF NOT EXISTS idx_act_entity ON activities(entity_type, entity_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_act_actor  ON activities(actor_id, occurred_at DESC);

-- ── AUDIT_LOG — forense (spec §14) ─────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  actor_email TEXT,              -- desnormalizado: si el usuario se borra, el rastro queda
  action      TEXT NOT NULL,
  entity_type TEXT,
  entity_id   TEXT,
  old_value   JSONB,
  new_value   JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_time   ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(entity_type, entity_id);

-- Trigger: todo cambio de ownership queda auditado, venga de donde venga
CREATE OR REPLACE FUNCTION audit_ownership() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  IF NEW.owner_scouter_id IS DISTINCT FROM OLD.owner_scouter_id THEN
    INSERT INTO audit_log (actor_id, actor_email, action, entity_type, entity_id, old_value, new_value)
    VALUES (
      NEW.assigned_by,
      (SELECT email FROM users WHERE id = NEW.assigned_by),
      'ownership_changed',
      TG_ARGV[0],
      NEW.id::TEXT,
      jsonb_build_object('owner', OLD.owner_scouter_id),
      jsonb_build_object('owner', NEW.owner_scouter_id)
    );
  END IF;
  RETURN NEW;
END
$fn$;

DROP TRIGGER IF EXISTS trg_audit_owner ON crm_influencers;
CREATE TRIGGER trg_audit_owner AFTER UPDATE ON crm_influencers
  FOR EACH ROW EXECUTE FUNCTION audit_ownership('influencer');

DROP TRIGGER IF EXISTS trg_audit_owner ON crm_brands;
CREATE TRIGGER trg_audit_owner AFTER UPDATE ON crm_brands
  FOR EACH ROW EXECUTE FUNCTION audit_ownership('brand');

-- Trigger: cambios de rol y de estado de usuario
CREATE OR REPLACE FUNCTION audit_user_change() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  IF NEW.rol IS DISTINCT FROM OLD.rol OR NEW.estado IS DISTINCT FROM OLD.estado THEN
    INSERT INTO audit_log (actor_id, actor_email, action, entity_type, entity_id, old_value, new_value)
    VALUES (NULL, NEW.email, 'user_changed', 'user', NEW.id::TEXT,
            jsonb_build_object('rol', OLD.rol, 'estado', OLD.estado),
            jsonb_build_object('rol', NEW.rol, 'estado', NEW.estado));
  END IF;
  RETURN NEW;
END
$fn$;

DROP TRIGGER IF EXISTS trg_audit_user ON users;
CREATE TRIGGER trg_audit_user AFTER UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION audit_user_change();

-- ── TASKS (spec §15 y §16) ─────────────────────────────────
-- Una recurrente es una PLANTILLA que genera INSTANCIAS. Sin eso,
-- "cada lunes contactar 20 influencers" no se puede medir por semana.
CREATE TABLE IF NOT EXISTS task_templates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  description TEXT,
  type        TEXT NOT NULL,
  priority    TEXT NOT NULL DEFAULT 'normal'
              CHECK (priority IN ('low','normal','high','urgent')),
  recurrence  TEXT NOT NULL
              CHECK (recurrence IN ('one_time','weekly','monthly','quarterly')),
  target_type TEXT NOT NULL
              CHECK (target_type IN ('user','team','city','country','region','network')),
  target_id   UUID,
  created_by  UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tasks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id  UUID REFERENCES task_templates(id) ON DELETE SET NULL,
  title        TEXT NOT NULL,
  description  TEXT,
  assigned_to  UUID REFERENCES users(id) ON DELETE SET NULL,
  created_by   UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  entity_type  TEXT,
  entity_id    TEXT,
  type         TEXT NOT NULL DEFAULT 'general',
  priority     TEXT NOT NULL DEFAULT 'normal'
               CHECK (priority IN ('low','normal','high','urgent')),
  -- OVERDUE no está en la lista a propósito: se deriva de due_date.
  -- Un estado "vencido" persistido se desincroniza el primer día.
  status       TEXT NOT NULL DEFAULT 'todo'
               CHECK (status IN ('todo','in_progress','completed','cancelled')),
  due_date     TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON tasks(assigned_to, status, due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_due      ON tasks(due_date) WHERE status <> 'completed';

CREATE OR REPLACE VIEW v_tasks_estado AS
  SELECT t.*,
         CASE
           WHEN t.status = 'completed' THEN 'completed'
           WHEN t.status = 'cancelled' THEN 'cancelled'
           WHEN t.due_date IS NOT NULL AND t.due_date < NOW() THEN 'overdue'
           ELSE t.status
         END AS estado_efectivo
  FROM tasks t;

-- ── GOALS / MISSIONS / REWARDS (spec §17-19) ───────────────
-- Schema-first: sin UI todavía. Nada del camino crítico depende de esto.
CREATE TABLE IF NOT EXISTS goals (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT NOT NULL,
  description  TEXT,
  metric       TEXT NOT NULL,     -- influencers_added | brands_added | opportunities | contacts
  target       NUMERIC NOT NULL,
  period       TEXT NOT NULL CHECK (period IN ('weekly','monthly','quarterly')),
  period_start DATE NOT NULL,
  period_end   DATE NOT NULL,
  assigned_to  UUID REFERENCES users(id) ON DELETE CASCADE,
  city_id      UUID REFERENCES cities(id),
  country_id   UUID REFERENCES countries(id),
  region_id    UUID REFERENCES regions(id),
  status       TEXT NOT NULL DEFAULT 'active',
  created_by   UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
  -- current_progress NO se guarda: se calcula. Un contador a mano se desfasa.
);

CREATE TABLE IF NOT EXISTS missions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT NOT NULL,
  description   TEXT,
  type          TEXT NOT NULL,
  metric        TEXT NOT NULL,
  target        NUMERIC NOT NULL,
  city_id       UUID REFERENCES cities(id),
  starts_at     DATE,
  ends_at       DATE,
  reward_points INT NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'active',
  created_by    UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mission_progress (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id   UUID NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  progress     NUMERIC NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  UNIQUE (mission_id, user_id)
);

CREATE TABLE IF NOT EXISTS reward_points (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  points      INT NOT NULL,
  source_type TEXT,
  source_id   UUID,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── RLS temporal ───────────────────────────────────────────
DO $do$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['activities','audit_log','tasks','task_templates',
                           'goals','missions','mission_progress','reward_points']
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "TEMP_open_until_auth" ON public.%I', t);
    EXECUTE format(
      'CREATE POLICY "TEMP_open_until_auth" ON public.%I FOR ALL USING (true) WITH CHECK (true)', t);
  END LOOP;
END
$do$;

-- Append-only desde ya: ni siquiera Dirección edita el audit.
-- (Con RLS abierta esto todavía no es efectivo; queda declarado para el P08.)
REVOKE UPDATE, DELETE ON audit_log   FROM anon, authenticated;
REVOKE UPDATE, DELETE ON activities  FROM anon, authenticated;

INSERT INTO schema_migrations (version, descripcion)
VALUES ('005_transversales', 'activities, audit_log + triggers, tasks, goals, missions, rewards')
ON CONFLICT (version) DO NOTHING;

COMMIT;

SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY 1;

-- ═══════════════════════════════════════════════════════════
-- ROLLBACK
--   DROP TRIGGER IF EXISTS trg_audit_owner ON crm_influencers;
--   DROP TRIGGER IF EXISTS trg_audit_owner ON crm_brands;
--   DROP TRIGGER IF EXISTS trg_audit_user  ON users;
--   DROP FUNCTION IF EXISTS audit_ownership(), audit_user_change();
--   DROP VIEW IF EXISTS v_tasks_estado;
--   DROP TABLE IF EXISTS reward_points, mission_progress, missions, goals,
--                        tasks, task_templates, audit_log, activities CASCADE;
--   DELETE FROM schema_migrations WHERE version='005_transversales';
-- ═══════════════════════════════════════════════════════════
