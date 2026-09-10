-- ═══════════════════════════════════════════════════════════
-- 020 · Agregar 'archived' al CHECK de campaigns.status
--
-- El soft-delete de campañas usa status = 'archived'.
-- El CHECK original (fase1/04) no lo incluía porque el concepto
-- de soft-delete no estaba definido en ese momento.
-- Los otros valores permanecen intactos y en inglés (regla uniforme).
-- ═══════════════════════════════════════════════════════════

DO $$
DECLARE c TEXT;
BEGIN
  SELECT constraint_name INTO c
  FROM information_schema.table_constraints
  WHERE table_schema = 'public'
    AND table_name   = 'campaigns'
    AND constraint_type = 'CHECK'
    AND constraint_name ILIKE '%status%';
  IF c IS NOT NULL THEN
    EXECUTE format('ALTER TABLE campaigns DROP CONSTRAINT %I', c);
  END IF;
END $$;

ALTER TABLE campaigns
  ADD CONSTRAINT campaigns_status_check
  CHECK (status IN ('planning','active','completed','paused','cancelled','archived'));

INSERT INTO schema_migrations (version, descripcion)
VALUES ('020_campaigns_archived', 'agregar archived al CHECK de campaigns.status')
ON CONFLICT (version) DO NOTHING;
