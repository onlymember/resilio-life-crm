-- ═══════════════════════════════════════════════════════════
-- 022 · Scouter Home
--
-- Todo SECURITY INVOKER (el default): cada función devuelve lo del
-- usuario que la llama, porque RLS se aplica adentro. Un lead que abra
-- la misma pantalla ve su alcance sin una línea de código distinta.
-- ═══════════════════════════════════════════════════════════

-- ── MI AGENDA ───────────────────────────────────────────────
-- Unifica en una sola consulta lo que el Home tiene que mostrar:
-- tareas, y las próximas acciones de influencers, marcas y
-- oportunidades. Sin esto habría que traer las 4 tablas enteras y
-- cruzarlas en el navegador.
CREATE OR REPLACE FUNCTION my_agenda(
  p_days_ahead INT DEFAULT 7
) RETURNS TABLE (
  kind        TEXT,      -- 'task' | 'next_action'
  entity_type TEXT,
  entity_id   UUID,
  title       TEXT,
  subtitle    TEXT,
  due_at      TIMESTAMPTZ,
  priority    TEXT,
  is_overdue  BOOLEAN,
  is_today    BOOLEAN
) LANGUAGE sql STABLE AS $fn$
  SELECT 'task', 'task', t.id, t.title,
         coalesce(t.description, ''), t.due_date,
         t.priority,
         (t.due_date IS NOT NULL AND t.due_date < now()),
         (t.due_date::date = CURRENT_DATE)
  FROM tasks t
  WHERE t.assigned_to = auth.uid()
    AND t.status NOT IN ('completed','cancelled')
    AND (t.due_date IS NULL OR t.due_date::date <= CURRENT_DATE + p_days_ahead)

  UNION ALL
  SELECT 'next_action', 'influencer', i.id,
         coalesce(i.next_action, 'Seguimiento'),
         i.name, i.next_action_at, 'normal',
         (i.next_action_at < now()),
         (i.next_action_at::date = CURRENT_DATE)
  FROM influencers i
  WHERE i.next_action_at IS NOT NULL
    AND i.status = 'active'
    AND i.next_action_at::date <= CURRENT_DATE + p_days_ahead

  UNION ALL
  SELECT 'next_action', 'brand', b.id,
         coalesce(b.next_action, 'Seguimiento'),
         b.name, b.next_action_at, 'normal',
         (b.next_action_at < now()),
         (b.next_action_at::date = CURRENT_DATE)
  FROM brands b
  WHERE b.next_action_at IS NOT NULL
    AND b.status = 'active'
    AND b.next_action_at::date <= CURRENT_DATE + p_days_ahead

  UNION ALL
  SELECT 'next_action', 'opportunity', o.id,
         coalesce(o.next_action, 'Seguimiento'),
         o.title, o.next_action_at, 'normal',
         (o.next_action_at < now()),
         (o.next_action_at::date = CURRENT_DATE)
  FROM opportunities o
  WHERE o.next_action_at IS NOT NULL
    AND o.status NOT IN ('won','lost')
    AND o.next_action_at::date <= CURRENT_DATE + p_days_ahead

  ORDER BY 8 DESC, 6 ASC NULLS LAST;
$fn$;


-- ── MI NETWORK ──────────────────────────────────────────────
-- Los contadores del bloque MY NETWORK. Un solo round-trip.
CREATE OR REPLACE FUNCTION my_network_stats()
RETURNS JSONB LANGUAGE sql STABLE AS $fn$
  SELECT jsonb_build_object(
    'influencers',      (SELECT count(*) FROM influencers
                          WHERE owner_scouter_id = auth.uid()),
    'brands',           (SELECT count(*) FROM brands
                          WHERE owner_scouter_id = auth.uid()),
    'opportunities',    (SELECT count(*) FROM opportunities
                          WHERE owner_scouter_id = auth.uid()
                            AND status NOT IN ('won','lost')),
    'collaborations',   (SELECT count(*) FROM collaborations
                          WHERE scouter_id = auth.uid()
                            AND status IN ('confirmed','in_progress','content_pending')),
    'tasks_today',      (SELECT count(*) FROM tasks
                          WHERE assigned_to = auth.uid()
                            AND status NOT IN ('completed','cancelled')
                            AND due_date::date = CURRENT_DATE),
    'tasks_overdue',    (SELECT count(*) FROM tasks
                          WHERE assigned_to = auth.uid()
                            AND status NOT IN ('completed','cancelled')
                            AND due_date < now()),
    'followups_today',  (SELECT count(*) FROM (
                          SELECT next_action_at FROM influencers
                            WHERE next_action_at::date = CURRENT_DATE AND status='active'
                          UNION ALL
                          SELECT next_action_at FROM brands
                            WHERE next_action_at::date = CURRENT_DATE AND status='active'
                        ) x),
    'followups_overdue',(SELECT count(*) FROM (
                          SELECT next_action_at FROM influencers
                            WHERE next_action_at < now() AND status='active'
                          UNION ALL
                          SELECT next_action_at FROM brands
                            WHERE next_action_at < now() AND status='active'
                        ) y)
  );
$fn$;


-- ── MIS MISIONES ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION my_missions()
RETURNS TABLE (
  id UUID, title TEXT, description TEXT, metric TEXT,
  target NUMERIC, progress NUMERIC, pct NUMERIC,
  reward_points INT, ends_at DATE
) LANGUAGE sql STABLE AS $fn$
  SELECT m.id, m.title, m.description, m.metric, m.target,
         mission_progress_of(m.id, auth.uid()),
         CASE WHEN m.target > 0
              THEN round(mission_progress_of(m.id, auth.uid()) / m.target * 100, 1)
              ELSE 0 END,
         m.reward_points, m.ends_at
  FROM missions m
  WHERE m.status = 'active'
    AND (m.starts_at IS NULL OR m.starts_at <= CURRENT_DATE)
    AND (m.ends_at   IS NULL OR m.ends_at   >= CURRENT_DATE)
    AND (m.city_id IS NULL OR m.city_id IN (
          SELECT city_id FROM scouters WHERE user_id = auth.uid()))
  ORDER BY m.ends_at NULLS LAST;
$fn$;


-- ── COMPLETAR UNA PRÓXIMA ACCIÓN ────────────────────────────
-- Dos escrituras que tienen que pasar juntas: limpiar la acción y
-- registrar la actividad. Si el cliente hace las dos por separado y
-- falla la segunda, el seguimiento desaparece sin dejar rastro.
--
-- SECURITY INVOKER a propósito: si el usuario no puede hacer UPDATE
-- de esa fila, RLS lo frena acá adentro igual.
CREATE OR REPLACE FUNCTION complete_next_action(
  p_entity_type TEXT,
  p_entity_id   UUID,
  p_activity_type TEXT DEFAULT 'follow_up',
  p_note        TEXT DEFAULT NULL
) RETURNS VOID LANGUAGE plpgsql AS $fn$
DECLARE v_action TEXT; v_name TEXT; v_tbl TEXT; v_n INT;
BEGIN
  IF p_entity_type NOT IN ('influencer','brand','opportunity') THEN
    RAISE EXCEPTION 'entity_type inválido: %', p_entity_type;
  END IF;
  v_tbl := CASE p_entity_type
             WHEN 'influencer' THEN 'influencers'
             WHEN 'brand'      THEN 'brands'
             ELSE 'opportunities' END;

  EXECUTE format(
    'UPDATE %I SET next_action = NULL, next_action_at = NULL
      WHERE id = $1
      RETURNING coalesce(next_action, %L), %s',
      v_tbl, 'Seguimiento',
      CASE WHEN p_entity_type = 'opportunity' THEN 'title' ELSE 'name' END)
  INTO v_action, v_name USING p_entity_id;

  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n = 0 THEN
    RAISE EXCEPTION 'No se pudo completar: el registro no existe o no tenés permiso.';
  END IF;

  INSERT INTO activities (actor_id, entity_type, entity_id, type, title, description)
  VALUES (auth.uid(), p_entity_type, p_entity_id, p_activity_type,
          coalesce(v_action, 'Seguimiento completado'), p_note);
END $fn$;


-- ── AGENDAR UNA PRÓXIMA ACCIÓN ──────────────────────────────
CREATE OR REPLACE FUNCTION set_next_action(
  p_entity_type TEXT,
  p_entity_id   UUID,
  p_action      TEXT,
  p_at          TIMESTAMPTZ
) RETURNS VOID LANGUAGE plpgsql AS $fn$
DECLARE v_tbl TEXT; v_n INT;
BEGIN
  IF p_entity_type NOT IN ('influencer','brand','opportunity') THEN
    RAISE EXCEPTION 'entity_type inválido: %', p_entity_type;
  END IF;
  v_tbl := CASE p_entity_type
             WHEN 'influencer' THEN 'influencers'
             WHEN 'brand'      THEN 'brands'
             ELSE 'opportunities' END;

  EXECUTE format('UPDATE %I SET next_action = $1, next_action_at = $2 WHERE id = $3', v_tbl)
    USING p_action, p_at, p_entity_id;

  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n = 0 THEN
    RAISE EXCEPTION 'No se pudo agendar: el registro no existe o no tenés permiso.';
  END IF;
END $fn$;


-- ── Índices para la agenda ──────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_tasks_agenda
  ON tasks (assigned_to, due_date) WHERE status NOT IN ('completed','cancelled');


-- ── Verificación ────────────────────────────────────────────
SELECT proname FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND proname IN ('my_agenda','my_network_stats','my_missions',
                  'complete_next_action','set_next_action')
ORDER BY proname;
-- Esperado: las 5.
