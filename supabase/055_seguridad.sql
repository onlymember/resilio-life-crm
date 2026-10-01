-- ═══════════════════════════════════════════════════════════
-- 055 · Seguridad: cierres que salieron del diagnóstico
--
-- Modelo de amenaza: cualquiera puede registrarse en el Club y tener
-- una sesión 'authenticated'. Con la clave pública puede llamar a la
-- base directo, sin la app. Todo lo de abajo cierra algo que esa
-- persona (o una Scouter) podía hacer y no debía.
--
--   1. profiles: cada uno podía cambiarse su propio rol, estado y notas
--      de Admin (la policy prof_self_update no limita columnas).
--   2. Alcance territorial: aprobar a alguien como viewer/editor/custom
--      sin ciudades le daba la red entera. Ahora solo Dirección, admin
--      y Líderes tienen alcance territorial.
--   3. Duplicados: check_duplicate y check_duplicates_bulk se podían
--      llamar SIN sesión y decían si un mail/IG/WhatsApp está en el CRM
--      y en qué ciudad. Ahora exigen ser del equipo (también la v2).
--   4. Funciones internas (mantenimiento, reparto, misiones…) ya no se
--      pueden llamar sin sesión. Las del Club que son públicas a
--      propósito (invitación, alta, confirmación) no se tocan.
--   5. Actividad y tareas: solo el equipo puede crearlas (antes un
--      usuario del Club podía crear tareas asignadas a cualquiera).
--   6. Configuración, plantillas y manual: solo el equipo los lee.
--
-- No cambia datos. Rollback al final.
-- ═══════════════════════════════════════════════════════════

BEGIN;

-- ── 1 · profiles: rol / estado / notas solo los cambia Dirección ─
-- SECURITY INVOKER a propósito: current_user es quien escribe. Dentro
-- de funciones DEFINER (alta de Scouter, activación del Club, el sync
-- de roles) current_user es el dueño, y pasan.
CREATE OR REPLACE FUNCTION protect_profile_admin_fields()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $f$
BEGIN
  IF current_user IN ('authenticated', 'anon')
     AND NOT app_is_direction()
     AND (NEW.rol         IS DISTINCT FROM OLD.rol
       OR NEW.estado      IS DISTINCT FROM OLD.estado
       OR NEW.notas_admin IS DISTINCT FROM OLD.notas_admin) THEN
    RAISE EXCEPTION 'Solo Dirección puede cambiar el rol o el estado de una cuenta.'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $f$;

DROP TRIGGER IF EXISTS trg_protect_profile ON profiles;
CREATE TRIGGER trg_protect_profile BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION protect_profile_admin_fields();


-- ── 2 · Alcance territorial solo para roles territoriales ────
CREATE OR REPLACE FUNCTION public.app_visible_city_ids()
 RETURNS SETOF uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT DISTINCT c.id
  FROM cities c
  JOIN countries co ON co.id = c.country_id
  WHERE EXISTS (
    SELECT 1 FROM user_roles r
    WHERE r.user_id = auth.uid() AND r.revoked_at IS NULL
      AND r.role IN ('super_admin', 'network_direction', 'admin',
                     'regional_lead', 'country_lead', 'city_lead')
      AND ( r.scope = 'global'
         OR (r.scope = 'region'  AND r.scope_id = co.region_id)
         OR (r.scope = 'country' AND r.scope_id = co.id)
         OR (r.scope = 'city'    AND r.scope_id = c.id) )
  );
$function$;


-- ── 3 · Duplicados: solo el equipo ──────────────────────────
-- Se agrega un control al principio de la función tal como está hoy
-- en la base (sin reescribirla de memoria). Si no se puede insertar
-- con seguridad, la migración entera se cancela.
DO $guard$
DECLARE
  sig  TEXT;
  f    REGPROCEDURE;
  def  TEXT;
  newd TEXT;
BEGIN
  FOREACH sig IN ARRAY ARRAY[
    'check_duplicate(text,text,text,text)',
    'check_duplicates_bulk(text,jsonb)',
    'check_duplicate_v2(text,text,text,text,text,uuid)'
  ] LOOP
    f := to_regprocedure(sig);
    CONTINUE WHEN f IS NULL;
    def := pg_get_functiondef(f);
    CONTINUE WHEN position('app_is_team_member()' IN def) > 0;   -- ya protegida
    IF def !~* 'LANGUAGE plpgsql' THEN
      RAISE EXCEPTION '055: % no es plpgsql, revisar a mano', sig;
    END IF;
    newd := regexp_replace(def, '\mBEGIN\M',
      E'BEGIN\n  IF NOT app_is_team_member() THEN RAISE EXCEPTION ''Sin permiso.'' USING ERRCODE = ''42501''; END IF;', 'i');
    IF newd = def THEN
      RAISE EXCEPTION '055: no se encontró BEGIN en %', sig;
    END IF;
    EXECUTE newd;
  END LOOP;
END $guard$;


-- ── 4 · Funciones internas: fuera del alcance de anon ────────
-- En Postgres toda función nace ejecutable por PUBLIC (y anon está en
-- PUBLIC). Revocar solo de anon no alcanza.
DO $revoke$
DECLARE
  sig TEXT;
  f   REGPROCEDURE;
BEGIN
  -- Las usa la app con sesión: siguen para 'authenticated'.
  FOREACH sig IN ARRAY ARRAY[
    'assign_entity(text,uuid,uuid,text)',
    'check_duplicates_bulk(text,jsonb)',
    'claim_completed_missions()',
    'close_monthly_snapshot(date)',
    'convert_opportunity_to_collaboration(uuid)',
    'open_city(text,text,text,text,integer)',
    'reschedule_overdue(uuid,integer)',
    'run_daily_maintenance()',
    'upsert_scouter(uuid,uuid,uuid,integer,text)'
  ] LOOP
    f := to_regprocedure(sig);
    CONTINUE WHEN f IS NULL;
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', f);
  END LOOP;

  -- Solo las usan otras funciones de la base (que corren como dueño):
  -- nadie de afuera las necesita.
  FOREACH sig IN ARRAY ARRAY[
    'check_duplicate(text,text,text,text)',
    'generate_recurring_tasks()',
    'next_free_slot(uuid,integer)'
  ] LOOP
    f := to_regprocedure(sig);
    CONTINUE WHEN f IS NULL;
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', f);
  END LOOP;
END $revoke$;


-- ── 5 · Actividad y tareas: solo el equipo las crea ──────────
-- Lo que el Club escribe en estas tablas pasa por funciones DEFINER,
-- que no dependen de estas policies.
DROP POLICY IF EXISTS act_insert ON activities;
CREATE POLICY act_insert ON activities FOR INSERT TO authenticated
  WITH CHECK (actor_id = auth.uid() AND app_is_team_member());

DROP POLICY IF EXISTS task_insert ON tasks;
CREATE POLICY task_insert ON tasks FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND app_is_team_member());


-- ── 6 · Material interno: solo el equipo lo lee ──────────────
DROP POLICY IF EXISTS settings_read ON app_settings;
CREATE POLICY settings_read ON app_settings FOR SELECT TO authenticated
  USING (app_is_team_member());

DROP POLICY IF EXISTS msg_select ON message_templates;
CREATE POLICY msg_select ON message_templates FOR SELECT TO authenticated
  USING (app_is_team_member() AND (active OR app_is_direction()));

DROP POLICY IF EXISTS ms_select ON manual_sections;
CREATE POLICY ms_select ON manual_sections FOR SELECT TO authenticated
USING (
  app_is_team_member()
  AND active = true
  AND (min_level <= my_scouter_level() OR app_is_direction())
  AND (direction_only = false OR app_is_direction())
);

COMMIT;


-- ── Verificación: 6 filas con ok = true ─────────────────────
SELECT 'profiles protegido' AS k,
       EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_protect_profile') AS ok
UNION ALL
SELECT 'duplicados con control',
       (SELECT bool_and(position('app_is_team_member()' IN pg_get_functiondef(p.oid)) > 0)
          FROM pg_proc p WHERE p.proname IN ('check_duplicate', 'check_duplicates_bulk', 'check_duplicate_v2'))
UNION ALL
SELECT 'anon sin funciones internas',
       NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
                    WHERE n.nspname = 'public' AND p.prosecdef
                      AND p.proname IN ('assign_entity','check_duplicate','check_duplicates_bulk',
                        'claim_completed_missions','close_monthly_snapshot','convert_opportunity_to_collaboration',
                        'generate_recurring_tasks','next_free_slot','open_city','reschedule_overdue',
                        'run_daily_maintenance','upsert_scouter')
                      AND has_function_privilege('anon', p.oid, 'EXECUTE'))
UNION ALL
SELECT 'Club sigue público',
       has_function_privilege('anon', 'check_invitation(text)'::regprocedure, 'EXECUTE')
   AND has_function_privilege('anon', 'get_collab_confirmation(text)'::regprocedure, 'EXECUTE')
UNION ALL
SELECT 'alcance solo territorial',
       position('city_lead' IN pg_get_functiondef('app_visible_city_ids()'::regprocedure)) > 0
UNION ALL
SELECT 'insert solo equipo',
       (SELECT count(*) = 2 FROM pg_policies
         WHERE policyname IN ('act_insert', 'task_insert') AND with_check LIKE '%app_is_team_member%');

-- ROLLBACK (no recomendado):
--   DROP TRIGGER IF EXISTS trg_protect_profile ON profiles;
--   app_visible_city_ids: volver a la versión de 052.
--   GRANT EXECUTE ON FUNCTION <cada una> TO PUBLIC;
--   act_insert / task_insert: WITH CHECK (actor_id = auth.uid()) / (created_by = auth.uid()).
--   settings_read USING (true); msg_select USING (active OR app_is_direction()); ms_select sin app_is_team_member().
