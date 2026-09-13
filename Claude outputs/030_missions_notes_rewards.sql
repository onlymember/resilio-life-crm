-- ═══════════════════════════════════════════════════════════
-- 030 · Misiones (RLS real + progreso completo), Notas (cuaderno
--       libre + agregador de notas existentes) y Rewards v1
--       (balance de puntos, sin catálogo ni canje)
--
-- QUÉ ENCONTRÓ EL DIAGNÓSTICO (verificado línea por línea contra
-- el repo Y contra la base real — ver nota de corrección abajo):
--
--   1. Según los archivos de migración disponibles, `missions`,
--      `mission_progress`, `reward_points`, `goals`, `tasks` y
--      `task_templates` habían quedado con la política de la Fase 1
--      (fase1/05-transversales.sql):
--        CREATE POLICY "TEMP_open_until_auth" ... USING (true) WITH CHECK (true)
--      La migración 024_crm_entities.sql cerró esa política SOLO
--      para `activities` y `assignments` (asn_select/act_select).
--
--      CORRECCIÓN (post-ejecución, contra la base real): `missions`
--      y `reward_points` YA tenían políticas reales antes de correr
--      este archivo — `mis_read`/`mis_write` y `rp_read`/`rp_write`,
--      con una función `app_my_scope_ids()` que no aparece en
--      ningún archivo de este repo. Es decir, alguna migración o
--      cambio manual (no rastreado en `supabase/`) ya había cerrado
--      esas dos tablas. `mission_progress` sí estaba abierta (no
--      tenía ninguna política real). Este archivo terminó creando
--      políticas DUPLICADAS y funcionalmente equivalentes en
--      `missions`/`reward_points` (inofensivas — Postgres combina
--      políticas permisivas con OR, así que no relajan nada — pero
--      sí redundantes). Se recomienda borrarlas después de correr
--      este archivo, dejando las que ya eran reales en producción;
--      ver el bloque "LIMPIEZA DE DUPLICADOS" más abajo.
--
--      `goals`, `tasks` y `task_templates` NO se tocan acá: no son
--      parte de este prompt y `tasks` ya tiene una pantalla en
--      producción — cerrar su RLS a ciegas sería alcance no pedido.
--      Queda anotado como deuda separada al final de este archivo.
--
--      IMPORTANTE — `reward_points` ya tenía `rp_write` (FOR ALL,
--      `app_is_direction()` en USING y WITH CHECK). Esto significa
--      que Dirección YA puede escribir `reward_points` directo,
--      sin pasar por `claim_completed_missions()`. La garantía de
--      "único camino de escritura" de este archivo aplica a
--      Scouters (siguen sin ninguna política de INSERT), NO a
--      Dirección — esa capacidad ya existía antes de este prompt y
--      no se tocó, porque removerla no estaba pedido.
--
--   2. `mission_progress_of()` (012_metrics.sql) sólo calculaba
--      progreso para metric IN ('influencers_added','brands_added').
--      Cualquier otra métrica (opportunities/collaborations/
--      contacts/follow_ups/tasks_completed) devolvía siempre 0,
--      aunque goal_progress() —su gemela para Goals— sí las
--      soporta. Se extiende para igualar el mismo set de métricas,
--      reusando exactamente la misma lógica por métrica.
--
--   3. `reward_points` no tiene un solo INSERT en todo el
--      codebase: nada acredita puntos hoy. `missions.reward_points`
--      existe desde la Fase 1 pensado para esto. Se agrega el
--      único camino de escritura válido —claim_completed_missions(),
--      SECURITY DEFINER, mismo patrón que assign_entity()— y se
--      cierra reward_points para que ningún cliente pueda
--      insertarse puntos directo (no hay política de INSERT para
--      `authenticated`: con RLS habilitada y sin esa política, el
--      INSERT queda denegado por default).
--
--   4. Notas: NO existe una "Nota" dedicada hoy. Lo que sí existe
--      y funciona es un campo `notes` TEXT plano en influencers,
--      brands, opportunities y collaborations (confirmado en
--      rowToInfluencer/rowToBrand/rowToOpportunity/rowToCollaboration
--      de database.js — los 4 tienen notes + updated_at). El
--      "cuaderno libre" no tiene dónde vivir: `activities.entity_id`
--      es NOT NULL, así que una nota sin entidad no entra ahí. Se
--      crea `personal_notes`, privada por usuario, y una vista
--      `my_notes_feed` que junta los 4 campos `notes` existentes
--      (agregador, sin inventar una tabla de notas paralela para
--      lo que ya existe).
--
-- SEGURIDAD: 100% aditivo en tablas nuevas (personal_notes) +
-- cierre de políticas abiertas en missions/mission_progress/
-- reward_points (estaban con USING(true), ahora con reglas reales)
-- + una función CREATE OR REPLACE (mission_progress_of). No borra
-- datos, no borra columnas, no toca goals/tasks/activities.
-- ═══════════════════════════════════════════════════════════

BEGIN;

-- ── 0) Registro de migraciones (guarda defensiva) ────────────
-- Esta base no traía la tabla creada (ver 027/028/029) — se repite
-- la guarda en cada archivo nuevo desde entonces.
CREATE TABLE IF NOT EXISTS schema_migrations (
  version     TEXT        PRIMARY KEY,
  descripcion TEXT,
  aplicada_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════
-- 1) NOTAS — cuaderno libre (personal_notes, nueva tabla)
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS personal_notes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title      TEXT,
  body       TEXT NOT NULL DEFAULT '',
  pinned     BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_personal_notes_user
  ON personal_notes(user_id, pinned DESC, updated_at DESC);

ALTER TABLE personal_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pn_all" ON personal_notes;
CREATE POLICY "pn_all" ON personal_notes FOR ALL TO authenticated
USING      (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Nadie más lee el cuaderno de nadie — ni Dirección. Es personal,
-- no un timeline de negocio. Si más adelante hace falta que
-- Dirección audite, se agrega OR app_is_direction() en una
-- migración aparte, explícita, no de arranque.

-- ═══════════════════════════════════════════════════════════
-- 2) NOTAS — agregador de lo que ya existe (vista, sin tabla nueva)
-- ═══════════════════════════════════════════════════════════
-- SECURITY INVOKER: cada fila pasa por la RLS real de su tabla de
-- origen (inf_select/brand.../camp_select/etc). No se duplica acá
-- ninguna lógica de alcance — si mañana cambia una política de
-- esas tablas, este agregador la hereda solo.

CREATE OR REPLACE VIEW my_notes_feed AS
  SELECT 'influencer'::TEXT AS entity_type, i.id AS entity_id,
         i.name AS entity_label, i.notes AS note_text,
         i.updated_at AS noted_at, i.owner_scouter_id
    FROM influencers i
   WHERE i.notes IS NOT NULL AND btrim(i.notes) <> ''
  UNION ALL
  SELECT 'brand', b.id, b.name, b.notes, b.updated_at, b.owner_scouter_id
    FROM brands b
   WHERE b.notes IS NOT NULL AND btrim(b.notes) <> ''
  UNION ALL
  SELECT 'opportunity', o.id, o.title, o.notes, o.updated_at, o.owner_scouter_id
    FROM opportunities o
   WHERE o.notes IS NOT NULL AND btrim(o.notes) <> ''
  UNION ALL
  SELECT 'collaboration', c.id,
         COALESCE(inf.name, br.name, 'Colaboración'),
         c.notes, c.updated_at, c.scouter_id
    FROM collaborations c
    LEFT JOIN influencers inf ON inf.id = c.influencer_id
    LEFT JOIN brands      br  ON br.id  = c.brand_id
   WHERE c.notes IS NOT NULL AND btrim(c.notes) <> '';

ALTER VIEW my_notes_feed SET (security_invoker = true);

-- ═══════════════════════════════════════════════════════════
-- 3) MISSIONS — cierre de RLS (estaba TEMP_open_until_auth)
-- ═══════════════════════════════════════════════════════════

ALTER TABLE missions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "TEMP_open_until_auth" ON missions;

DROP POLICY IF EXISTS "msn_select" ON missions;
CREATE POLICY "msn_select" ON missions FOR SELECT TO authenticated
USING (
  app_is_direction()
  OR city_id IS NULL                         -- misión global, visible a todos
  OR city_id IN (SELECT app_visible_city_ids())
);

-- Escritura: solo Dirección. Mismo criterio que Command
-- Center/Scouters (COMMAND_ROLES) en el front — acá es lo mismo
-- pero real, a nivel de fila.
DROP POLICY IF EXISTS "msn_insert" ON missions;
CREATE POLICY "msn_insert" ON missions FOR INSERT TO authenticated
WITH CHECK (app_is_direction());

DROP POLICY IF EXISTS "msn_update" ON missions;
CREATE POLICY "msn_update" ON missions FOR UPDATE TO authenticated
USING (app_is_direction()) WITH CHECK (app_is_direction());

DROP POLICY IF EXISTS "msn_delete" ON missions;
CREATE POLICY "msn_delete" ON missions FOR DELETE TO authenticated
USING (app_is_direction());

-- ── mission_progress — vestigial (ninguna función la lee hoy),
-- se cierra igual por higiene: hoy es TEMP_open_until_auth.
ALTER TABLE mission_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "TEMP_open_until_auth" ON mission_progress;
DROP POLICY IF EXISTS "mp_own" ON mission_progress;
CREATE POLICY "mp_own" ON mission_progress FOR ALL TO authenticated
USING      (user_id = auth.uid() OR app_is_direction())
WITH CHECK (user_id = auth.uid());

-- ═══════════════════════════════════════════════════════════
-- 4) mission_progress_of() — mismo set de métricas que goal_progress()
-- ═══════════════════════════════════════════════════════════
-- Antes: solo influencers_added/brands_added, todo lo demás
-- devolvía 0 siempre. Se agregan opportunities/collaborations/
-- contacts/follow_ups/tasks_completed, idéntico criterio que
-- goal_progress() (012), acotado por starts_at/ends_at en vez de
-- period_start/period_end.

CREATE OR REPLACE FUNCTION mission_progress_of(p_mission UUID, p_user UUID)
RETURNS NUMERIC LANGUAGE plpgsql STABLE AS $fn$
DECLARE m missions; n NUMERIC := 0;
BEGIN
  SELECT * INTO m FROM missions WHERE id = p_mission;
  IF NOT FOUND THEN RETURN 0; END IF;

  CASE m.metric
    WHEN 'influencers_added' THEN
      SELECT count(*) INTO n FROM influencers
       WHERE created_by = p_user
         AND (m.starts_at IS NULL OR created_at::date >= m.starts_at)
         AND (m.ends_at   IS NULL OR created_at::date <= m.ends_at);
    WHEN 'brands_added' THEN
      SELECT count(*) INTO n FROM brands
       WHERE created_by = p_user
         AND (m.starts_at IS NULL OR created_at::date >= m.starts_at)
         AND (m.ends_at   IS NULL OR created_at::date <= m.ends_at);
    WHEN 'opportunities' THEN
      SELECT count(*) INTO n FROM opportunities
       WHERE created_by = p_user
         AND (m.starts_at IS NULL OR created_at::date >= m.starts_at)
         AND (m.ends_at   IS NULL OR created_at::date <= m.ends_at);
    WHEN 'collaborations' THEN
      SELECT count(*) INTO n FROM collaborations
       WHERE created_by = p_user
         AND (m.starts_at IS NULL OR created_at::date >= m.starts_at)
         AND (m.ends_at   IS NULL OR created_at::date <= m.ends_at);
    WHEN 'contacts' THEN
      SELECT count(*) INTO n FROM activities
       WHERE actor_id = p_user AND type IN ('dm','whatsapp','call','meeting','email')
         AND (m.starts_at IS NULL OR occurred_at::date >= m.starts_at)
         AND (m.ends_at   IS NULL OR occurred_at::date <= m.ends_at);
    WHEN 'follow_ups' THEN
      SELECT count(*) INTO n FROM activities
       WHERE actor_id = p_user AND type = 'follow_up'
         AND (m.starts_at IS NULL OR occurred_at::date >= m.starts_at)
         AND (m.ends_at   IS NULL OR occurred_at::date <= m.ends_at);
    WHEN 'tasks_completed' THEN
      SELECT count(*) INTO n FROM tasks
       WHERE assigned_to = p_user AND status = 'completed'
         AND (m.starts_at IS NULL OR completed_at::date >= m.starts_at)
         AND (m.ends_at   IS NULL OR completed_at::date <= m.ends_at);
    ELSE n := 0;
  END CASE;

  RETURN COALESCE(n, 0);
END $fn$;

-- ═══════════════════════════════════════════════════════════
-- 5) REWARDS v1 — reward_points cerrado + único camino de escritura
-- ═══════════════════════════════════════════════════════════

ALTER TABLE reward_points ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "TEMP_open_until_auth" ON reward_points;

DROP POLICY IF EXISTS "rp_select" ON reward_points;
CREATE POLICY "rp_select" ON reward_points FOR SELECT TO authenticated
USING (user_id = auth.uid() OR app_is_direction());

-- A propósito NO hay política de INSERT/UPDATE/DELETE para
-- `authenticated`. Con RLS habilitada, sin esas políticas el
-- cliente no puede escribir una sola fila por más que arme el
-- payload a mano — la única vía es la función SECURITY DEFINER de
-- abajo, que decide ella misma cuánto y por qué, sin confiar en
-- ningún parámetro del cliente.

-- Protección contra doble acreditación (carrera de dos taps, dos
-- pestañas, etc.): un usuario no puede tener dos filas de puntos
-- por la misma misión.
CREATE UNIQUE INDEX IF NOT EXISTS uq_reward_points_source
  ON reward_points(user_id, source_type, source_id)
  WHERE source_type IS NOT NULL AND source_id IS NOT NULL;

CREATE OR REPLACE FUNCTION claim_completed_missions()
RETURNS TABLE (mission_id UUID, title TEXT, points_awarded INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  r missions;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  FOR r IN
    SELECT m.* FROM missions m
    WHERE m.status = 'active' AND m.target > 0
  LOOP
    IF mission_progress_of(r.id, auth.uid()) >= r.target THEN
      INSERT INTO reward_points (user_id, points, source_type, source_id)
      VALUES (auth.uid(), r.reward_points, 'mission', r.id)
      ON CONFLICT (user_id, source_type, source_id)
        WHERE source_type IS NOT NULL AND source_id IS NOT NULL
      DO NOTHING;

      IF FOUND THEN
        mission_id := r.id;
        title := r.title;
        points_awarded := r.reward_points;
        RETURN NEXT;
      END IF;
    END IF;
  END LOOP;
END
$fn$;

COMMENT ON FUNCTION claim_completed_missions IS
  'Único camino válido para acreditar reward_points. SECURITY '
  'DEFINER a propósito, mismo patrón que assign_entity() (003): '
  'usa auth.uid() adentro, nunca un parámetro del cliente, y '
  'vuelve a chequear el progreso real antes de insertar. El '
  'cliente la llama al entrar a Misiones o a Rewards; no hace '
  'falta cron ni trigger.';

-- Balance + historial, ambos SECURITY INVOKER (default): filtran
-- por auth.uid() explícito y además pasan por rp_select.

CREATE OR REPLACE FUNCTION my_reward_balance()
RETURNS INT LANGUAGE sql STABLE AS $fn$
  SELECT COALESCE(SUM(points), 0)::INT
  FROM reward_points WHERE user_id = auth.uid();
$fn$;

CREATE OR REPLACE FUNCTION my_reward_history(p_limit INT DEFAULT 50)
RETURNS TABLE (
  id UUID, points INT, source_type TEXT, source_id UUID,
  mission_title TEXT, created_at TIMESTAMPTZ
) LANGUAGE sql STABLE AS $fn$
  SELECT rp.id, rp.points, rp.source_type, rp.source_id,
         m.title, rp.created_at
  FROM reward_points rp
  LEFT JOIN missions m ON rp.source_type = 'mission' AND m.id = rp.source_id
  WHERE rp.user_id = auth.uid()
  ORDER BY rp.created_at DESC
  LIMIT LEAST(GREATEST(p_limit, 1), 200);
$fn$;

-- ═══════════════════════════════════════════════════════════
-- LIMPIEZA DE DUPLICADOS — correr DESPUÉS de confirmar que arriba
-- no dio ningún error. `missions` y `reward_points` ya tenían
-- políticas reales (mis_read/mis_write, rp_read/rp_write) de un
-- origen no rastreado en este repo. Las de acá (msn_*, rp_select)
-- quedan funcionalmente duplicadas — se borran para no dejar dos
-- fuentes de verdad sobre la misma regla.
-- ═══════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "msn_select" ON missions;
DROP POLICY IF EXISTS "msn_insert" ON missions;
DROP POLICY IF EXISTS "msn_update" ON missions;
DROP POLICY IF EXISTS "msn_delete" ON missions;
DROP POLICY IF EXISTS "rp_select" ON reward_points;

INSERT INTO schema_migrations (version, descripcion)
VALUES ('030_missions_notes_rewards',
        'RLS real en missions/mission_progress/reward_points, '
        'mission_progress_of() con el set completo de métricas, '
        'claim_completed_missions()/my_reward_balance()/my_reward_history(), '
        'personal_notes + my_notes_feed')
ON CONFLICT (version) DO NOTHING;

COMMIT;

-- ── Verificación ────────────────────────────────────────────
-- 1. Ninguna de las 3 tablas cerradas debe seguir con la política
--    abierta (debe dar 0 filas):
SELECT tablename, policyname FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('missions','mission_progress','reward_points')
  AND policyname = 'TEMP_open_until_auth';

-- 2. Cada una de las 3 debe tener al menos una política real
--    (debe dar 3 filas, una por tabla). Corrida DESPUÉS del bloque
--    "LIMPIEZA DE DUPLICADOS": esperado missions=2 (mis_read,
--    mis_write — preexistentes), mission_progress=1 (mp_own, la
--    única que agrega este archivo), reward_points=2 (rp_read,
--    rp_write — preexistentes). Si ves 4/1/1 en missions/rp, corriste
--    la verificación ANTES de la limpieza — no es un error, corré
--    la limpieza y volvé a verificar.
SELECT tablename, count(*) AS politicas FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('missions','mission_progress','reward_points')
GROUP BY tablename;

-- 3. reward_points no debe tener ninguna política de INSERT para
--    authenticated (debe dar 0 filas — la única vía es la función
--    SECURITY DEFINER):
SELECT * FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'reward_points'
  AND cmd = 'INSERT';

-- 4. Funciones nuevas/actualizadas presentes:
SELECT proname FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND proname IN ('mission_progress_of','claim_completed_missions',
                   'my_reward_balance','my_reward_history')
ORDER BY proname;
-- Esperado: las 4.

-- 5. La vista de notas no debe fallar (aunque devuelva 0 filas si
--    todavía no hay ningún `notes` cargado):
SELECT count(*) FROM my_notes_feed;

-- ═══════════════════════════════════════════════════════════
-- DEUDA DE SEGURIDAD SEPARADA (NO forma parte de este prompt)
--   `goals`, `tasks` y `task_templates` siguen con
--   "TEMP_open_until_auth" (USING true). `tasks` en particular ya
--   tiene una pantalla en producción (/network/tasks, soon:false)
--   — cualquier usuario autenticado puede hoy leer/escribir tareas
--   ajenas directo contra la tabla. Es un hallazgo real de esta
--   auditoría, pero cerrarlo no estaba pedido en este prompt y
--   toca una pantalla que ya está en uso: se recomienda un prompt
--   aparte, dedicado solo a esto, con su propio diagnóstico de
--   qué políticas necesita `v_tasks_estado` para no romper
--   `dbGetTasks`/`dbGetTasksForEntity`.
--
-- ROLLBACK
--   Nota: `mis_read`/`mis_write` (missions) y `rp_read`/`rp_write`
--   (reward_points) NO los creó este archivo (ya estaban) — el
--   rollback no los toca. Si corriste el bloque LIMPIEZA DE
--   DUPLICADOS, msn_*/rp_select ya no existen (el DROP POLICY IF
--   EXISTS de abajo es un no-op inofensivo en ese caso).
--   DROP FUNCTION IF EXISTS my_reward_history(INT);
--   DROP FUNCTION IF EXISTS my_reward_balance();
--   DROP FUNCTION IF EXISTS claim_completed_missions();
--   DROP INDEX    IF EXISTS uq_reward_points_source;
--   DROP POLICY   IF EXISTS "rp_select" ON reward_points;
--   DROP POLICY IF EXISTS "mp_own" ON mission_progress;
--   CREATE POLICY "TEMP_open_until_auth" ON mission_progress FOR ALL USING (true) WITH CHECK (true);
--   DROP POLICY IF EXISTS "msn_select" ON missions;
--   DROP POLICY IF EXISTS "msn_insert" ON missions;
--   DROP POLICY IF EXISTS "msn_update" ON missions;
--   DROP POLICY IF EXISTS "msn_delete" ON missions;
--   -- mission_progress_of() vuelve a su versión anterior: recrearla
--   -- con el CASE de solo influencers_added/brands_added (012_metrics.sql).
--   DROP VIEW IF EXISTS my_notes_feed;
--   DROP TABLE IF EXISTS personal_notes;
--   DELETE FROM schema_migrations WHERE version='030_missions_notes_rewards';
-- ═══════════════════════════════════════════════════════════
