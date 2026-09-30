-- ═══════════════════════════════════════════════════════════
-- 051 · Ajustes generales + interruptor "Club para los scouters"
--
-- app_settings: pares clave/valor que la app lee al entrar.
--   · Leer: cualquier usuario del equipo.
--   · Escribir: super_admin, admin, network_direction
--     (app_can_manage_offers(), de la 047).
-- club_for_scouters arranca en false: el Club queda escondido para los
-- scouters hasta que alguien lo prenda desde Leads del Club u Ofertas.
-- Solo agrega. Rollback al final.
-- ═══════════════════════════════════════════════════════════
BEGIN;

CREATE TABLE IF NOT EXISTS app_settings (
  key         TEXT PRIMARY KEY,
  value       JSONB NOT NULL,
  updated_by  UUID,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON app_settings FROM anon;
REVOKE DELETE ON app_settings FROM authenticated;

DROP POLICY IF EXISTS settings_read ON app_settings;
CREATE POLICY settings_read ON app_settings FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS settings_insert ON app_settings;
CREATE POLICY settings_insert ON app_settings FOR INSERT TO authenticated
  WITH CHECK (app_can_manage_offers());

DROP POLICY IF EXISTS settings_update ON app_settings;
CREATE POLICY settings_update ON app_settings FOR UPDATE TO authenticated
  USING (app_can_manage_offers()) WITH CHECK (app_can_manage_offers());

INSERT INTO app_settings (key, value) VALUES ('club_for_scouters', 'false'::jsonb)
ON CONFLICT (key) DO NOTHING;

COMMIT;

-- Verificación: 1 fila, club_for_scouters = false, rls = true.
SELECT s.key, s.value, (SELECT relrowsecurity FROM pg_class WHERE relname = 'app_settings') AS rls
FROM app_settings s WHERE s.key = 'club_for_scouters';

-- ROLLBACK (solo si hace falta):
-- DROP TABLE IF EXISTS app_settings;
