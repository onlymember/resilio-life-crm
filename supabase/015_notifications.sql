-- ═══════════════════════════════════════════════════════════
-- 015 · Notificaciones (spec §40) — arquitectura, no push
-- ═══════════════════════════════════════════════════════════

CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,
  title       TEXT NOT NULL,
  body        TEXT,
  entity_type TEXT,
  entity_id   UUID,
  read        BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON notifications (user_id, read, created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY notif_own ON notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY notif_mark ON notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY notif_write ON notifications FOR INSERT TO authenticated
  WITH CHECK (app_is_direction());

CREATE OR REPLACE FUNCTION notify_task_assigned()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  IF NEW.assigned_to IS NOT NULL
     AND NEW.assigned_to <> COALESCE(NEW.created_by, NEW.assigned_to) THEN
    INSERT INTO notifications (user_id, type, title, body, entity_type, entity_id)
    VALUES (NEW.assigned_to, 'task_assigned', 'Nueva tarea', NEW.title, 'task', NEW.id);
  END IF;
  RETURN NEW;
END $fn$;

CREATE TRIGGER trg_notify_task AFTER INSERT ON tasks
FOR EACH ROW EXECUTE FUNCTION notify_task_assigned();

CREATE OR REPLACE FUNCTION notify_reassignment()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  IF NEW.to_owner_id IS NOT NULL AND NEW.to_owner_id <> NEW.assigned_by THEN
    INSERT INTO notifications (user_id, type, title, body, entity_type, entity_id)
    VALUES (NEW.to_owner_id, 'assigned',
            format('Te asignaron %s', NEW.entity_type), NEW.reason,
            NEW.entity_type, NEW.entity_id);
  END IF;
  RETURN NEW;
END $fn$;

CREATE TRIGGER trg_notify_assign AFTER INSERT ON assignments
FOR EACH ROW EXECUTE FUNCTION notify_reassignment();
