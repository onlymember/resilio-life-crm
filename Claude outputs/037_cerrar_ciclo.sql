-- ══════════════════════════════════════════════════════════════════
-- 037 — Cerrar el ciclo: que ganar y completar generen trabajo real.
-- 100% ADITIVO: dos triggers nuevos sobre tablas existentes.
-- No modifica ninguna función, vista ni policy que ya exista.
-- ══════════════════════════════════════════════════════════════════

-- 1) Oportunidad ganada → tarea para convertirla en colaboración
CREATE OR REPLACE FUNCTION trg_task_on_opportunity_won()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_owner uuid; v_title text;
BEGIN
  IF NEW.status = 'won' AND OLD.status IS DISTINCT FROM 'won' THEN
    v_owner := coalesce(NEW.owner_scouter_id, NEW.created_by);
    IF v_owner IS NULL THEN RETURN NEW; END IF;
    v_title := 'Convertir a colaboración: ' || coalesce(NEW.title, 'oportunidad');

    IF NOT EXISTS (
      SELECT 1 FROM tasks
      WHERE entity_type = 'opportunity' AND entity_id = NEW.id::text
        AND title = v_title AND status <> 'completed'
    ) THEN
      INSERT INTO tasks (title, description, assigned_to, entity_type, entity_id,
                         type, priority, status, due_date, created_by)
      VALUES (v_title,
              'La oportunidad se marcó como ganada. Confirmá los influencers y usá el botón Convertir a Colaboración.',
              v_owner, 'opportunity', NEW.id::text,
              'general', 'normal', 'todo', CURRENT_DATE + 2, v_owner);
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS task_on_opportunity_won ON opportunities;
CREATE TRIGGER task_on_opportunity_won
  AFTER UPDATE OF status ON opportunities
  FOR EACH ROW EXECUTE FUNCTION trg_task_on_opportunity_won();

-- 2) Colaboración completada sin resultados → tarea para cargarlos
CREATE OR REPLACE FUNCTION trg_task_on_collab_completed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_owner uuid; v_title text; v_inf text;
BEGIN
  IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed'
     AND NEW.engagement_rate IS NULL
     AND NEW.reach IS NULL
     AND NEW.estimated_media_value IS NULL THEN
    v_owner := coalesce(NEW.scouter_id, NEW.created_by);
    IF v_owner IS NULL THEN RETURN NEW; END IF;
    SELECT i.name INTO v_inf FROM influencers i WHERE i.id = NEW.influencer_id;
    v_title := 'Cargar resultados: ' || coalesce(v_inf, 'colaboración');

    IF NOT EXISTS (
      SELECT 1 FROM tasks
      WHERE entity_type = 'collaboration' AND entity_id = NEW.id::text
        AND title = v_title AND status <> 'completed'
    ) THEN
      INSERT INTO tasks (title, description, assigned_to, entity_type, entity_id,
                         type, priority, status, due_date, created_by)
      VALUES (v_title,
              'La colaboración se completó sin métricas. Cargá alcance, impresiones, engagement y valor de medios en su ficha.',
              v_owner, 'collaboration', NEW.id::text,
              'general', 'normal', 'todo', CURRENT_DATE + 3, v_owner);
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS task_on_collab_completed ON collaborations;
CREATE TRIGGER task_on_collab_completed
  AFTER UPDATE OF status ON collaborations
  FOR EACH ROW EXECUTE FUNCTION trg_task_on_collab_completed();

INSERT INTO schema_migrations (version, descripcion)
VALUES ('037', 'Cerrar el ciclo: tarea automatica al ganar una oportunidad y al completar una colaboracion sin metricas')
ON CONFLICT DO NOTHING;
