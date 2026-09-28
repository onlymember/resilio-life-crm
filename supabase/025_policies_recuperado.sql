-- ═══════════════════════════════════════════════════════════
-- 025 · Policies de missions (RECUPERADO)
--
-- ESTE ARCHIVO SE ESCRIBIO AL REVES QUE LOS DEMAS.
--   La 025 se corrio pegandola en el editor de Supabase y nunca quedo
--   en el repo: entre 024_crm_entities.sql y 026_command_center.sql no
--   habia nada. Lo que sigue se volco DESDE LA BASE el 2026-09-28 con
--   supabase/dump_deriva.sql, o sea que describe lo que realmente esta
--   aplicado, no lo que creemos que se aplico.
--
-- QUE FALTA RESPECTO DE LA 025 ORIGINAL
--   La 025 tambien cerro task_templates, que hasta entonces estaba con
--   una policy TEMP_open_until_auth USING(true) heredada de la fase 1.
--   Esa foto ya no existe: la 038 borro todas las policies de esa tabla
--   y creo las suyas antes de que se corriera el volcado. No es una
--   perdida real — las de task_templates viven hoy en 038 — pero hay
--   que saberlo para no buscarlas aca.
--
-- SEGURIDAD: no toca datos. Es idempotente (DROP IF EXISTS + CREATE).
-- ═══════════════════════════════════════════════════════════

ALTER TABLE missions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE mission_progress ENABLE ROW LEVEL SECURITY;


-- ── Progreso de una mision: es de cada persona ──────────────
-- El USING deja a Direccion leer el de todos, pero el WITH CHECK no:
-- nadie escribe el progreso de otro, ni Direccion. Esa asimetria es
-- deliberada — mirar no es lo mismo que firmar.
DROP POLICY IF EXISTS mp_own ON mission_progress;
CREATE POLICY mp_own ON mission_progress
  FOR ALL TO authenticated
  USING (((user_id = auth.uid()) OR app_is_direction()))
  WITH CHECK ((user_id = auth.uid()));


-- ── Misiones: se leen por alcance, se escriben desde Direccion ─
-- city_id IS NULL significa mision global: la ve toda la red. Por eso
-- esa rama va antes del chequeo de alcance.
DROP POLICY IF EXISTS mis_read ON missions;
CREATE POLICY mis_read ON missions
  FOR SELECT TO authenticated
  USING ((app_is_direction() OR (city_id IS NULL) OR (city_id IN ( SELECT app_my_scope_ids() AS app_my_scope_ids))));

DROP POLICY IF EXISTS mis_write ON missions;
CREATE POLICY mis_write ON missions
  FOR ALL TO authenticated
  USING (app_is_direction())
  WITH CHECK (app_is_direction());


-- ── Verificacion ────────────────────────────────────────────
-- Ninguna de las dos tablas puede quedar con una policy abierta.
SELECT tablename, policyname, cmd, (qual IN ('true','(true)')) AS abierta
FROM pg_policies
WHERE schemaname = 'public' AND tablename IN ('missions','mission_progress')
ORDER BY tablename, policyname;
