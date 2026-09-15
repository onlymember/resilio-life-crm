-- ═══════════════════════════════════════════════════════════
-- 033 · Fix audit_sensitive() — record "new" has no field "budget"
--
-- HALLAZGO (leyendo 011_activities_auto.sql, la versión
-- actualmente commiteada de esta función):
--
--   CREATE OR REPLACE FUNCTION audit_sensitive() ... AS $fn$
--   BEGIN
--     IF TG_OP = 'DELETE'
--        OR NEW.budget IS DISTINCT FROM OLD.budget     <-- referencia directa
--        OR NEW.amount IS DISTINCT FROM OLD.amount THEN
--     ...
--   END $fn$;
--
--   CREATE TRIGGER trg_audit_campaigns AFTER UPDATE OR DELETE ON campaigns
--     FOR EACH ROW EXECUTE FUNCTION audit_sensitive();
--   CREATE TRIGGER trg_audit_collabs AFTER UPDATE OR DELETE ON collaborations
--     FOR EACH ROW EXECUTE FUNCTION audit_sensitive();
--
-- `collaborations` (según rowToCollaboration/dbSaveCollaboration en
-- database.js) tiene `amount` pero NO tiene columna `budget`. En
-- PL/pgSQL, referenciar NEW.budget sobre una fila que no tiene esa
-- columna revienta en tiempo de ejecución con exactamente el error
-- reportado: record "new" has no field "budget". Por eso el error
-- aparece al actualizar/borrar una Colaboración (no una Oportunidad
-- directamente) — probablemente disparado por algún flujo que
-- actualiza una Colaboración ligada a la Oportunidad que se está
-- guardando.
--
-- ⚠️ ANTES DE APLICAR: confirmar contra producción que la función
-- real coincide con esta (puede haber cambiado sin quedar
-- versionada, como pasó con otras 3 funciones esta semana). Correr:
--
--   SELECT pg_get_functiondef('audit_sensitive'::regproc);
--   SELECT column_name FROM information_schema.columns
--     WHERE table_name IN ('campaigns','collaborations')
--       AND column_name IN ('budget','amount');
--
-- Si la definición real difiere de la de 011, avisar antes de
-- aplicar este archivo — no asumir que este diagnóstico basado en
-- el archivo versionado sigue vigente.
--
-- FIX: reemplaza el acceso directo a NEW.budget/NEW.amount por
-- comparación vía to_jsonb(), que nunca falla si la columna no
-- existe en esa tabla (->> devuelve NULL en vez de explotar).
-- Mismo comportamiento para las tablas que SÍ tienen esas columnas
-- (campaigns.budget, collaborations.amount) — no cambia nada para
-- esos casos, solo deja de romper en los que no las tienen.
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY, applied_at TIMESTAMPTZ DEFAULT now()
);

CREATE OR REPLACE FUNCTION audit_sensitive()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_old JSONB := to_jsonb(OLD);
  v_new JSONB := to_jsonb(NEW);
BEGIN
  IF TG_OP = 'DELETE'
     OR (v_new->>'budget') IS DISTINCT FROM (v_old->>'budget')
     OR (v_new->>'amount') IS DISTINCT FROM (v_old->>'amount') THEN
    INSERT INTO audit_log (actor_id, actor_email, action, entity_type,
                           entity_id, old_value, new_value)
    VALUES (auth.uid(),
            (SELECT email FROM profiles WHERE id = auth.uid()),
            lower(TG_OP), TG_TABLE_NAME,
            COALESCE(NEW.id, OLD.id)::text,
            v_old,
            CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE v_new END);
  END IF;
  RETURN COALESCE(NEW, OLD);
END $fn$;

INSERT INTO schema_migrations (version) VALUES ('033_fix_audit_sensitive')
ON CONFLICT (version) DO NOTHING;

-- ── Verificación ────────────────────────────────────────────
SELECT prosrc LIKE '%to_jsonb%' AS fix_aplicado
FROM pg_proc WHERE proname = 'audit_sensitive';
-- Esperado: true.
