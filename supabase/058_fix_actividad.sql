-- ═══════════════════════════════════════════════════════════
-- 058 · URGENTE: altas y cambios de estado fallaban
--
-- EL ERROR
--   column "entity_id" is of type uuid but expression is of type text
--   La 054 reescribió el trigger del timeline (log_activity_auto) con
--   NEW.id::text, copiado de un archivo viejo del repo. En la base real
--   activities.entity_id es UUID, así que desde la 054 fallaba:
--     · crear influencers, marcas, oportunidades, campañas y
--       colaboraciones (a mano o por CSV),
--     · cambiar el estado de cualquiera de ellas.
--   El mismo detalle estaba en la nota de "Fusionar fichas" (050) y en
--   la nota de la confirmación por link (054, ahí no rompía porque
--   estaba protegida, pero la nota no se guardaba).
--
-- LO QUE HACE
--   Pasa el id sin convertir a texto. Funciona sea la columna UUID o
--   texto. No cambia datos.
-- ═══════════════════════════════════════════════════════════

BEGIN;

-- ── 1 · Trigger del timeline ────────────────────────────────
CREATE OR REPLACE FUNCTION log_activity_auto()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $fn$
DECLARE
  v_type  TEXT;
  v_title TEXT;
  v_ent   TEXT := TG_ARGV[0];
  v_row   JSONB := to_jsonb(NEW);
  v_actor UUID;
BEGIN
  -- assign_entity maneja su propio logging
  IF current_setting('app.assigning', true) = 'on' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    v_type  := 'created';
    v_title := format('%s creado', initcap(v_ent));
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    v_type  := 'status_change';
    v_title := format('Estado: %s → %s', OLD.status, NEW.status);
  ELSE
    RETURN NEW;
  END IF;

  v_actor := COALESCE(auth.uid(),
                      (v_row->>'created_by')::uuid,
                      (v_row->>'scouter_id')::uuid,
                      (v_row->>'owner_scouter_id')::uuid);
  IF v_actor IS NULL THEN RETURN NEW; END IF;

  INSERT INTO activities (actor_id, entity_type, entity_id, type, title, metadata)
  VALUES (
    v_actor,
    v_ent, NEW.id, v_type, v_title,
    CASE WHEN TG_OP = 'UPDATE'
         THEN jsonb_build_object('from', OLD.status, 'to', NEW.status)
         ELSE '{}'::jsonb END
  );
  RETURN NEW;
END $fn$;


-- ── 2 · Mismo detalle en confirmación por link y fusionar ────
DO $fix$
DECLARE def TEXT; newd TEXT;
BEGIN
  IF to_regprocedure('respond_collab_confirmation(text,text,date,time,text)') IS NOT NULL THEN
    def  := pg_get_functiondef('respond_collab_confirmation(text,text,date,time,text)'::regprocedure);
    newd := replace(def, $a$'collaboration', c.id::text, 'note'$a$, $b$'collaboration', c.id, 'note'$b$);
    IF newd <> def THEN EXECUTE newd; END IF;
  END IF;

  IF to_regprocedure('merge_entities(text,uuid,uuid,text[])') IS NOT NULL THEN
    def  := pg_get_functiondef('merge_entities(text,uuid,uuid,text[])'::regprocedure);
    newd := replace(def, $a$p_type, p_keep::text, 'note'$a$, $b$p_type, p_keep, 'note'$b$);
    IF newd <> def THEN EXECUTE newd; END IF;
  END IF;
END $fix$;

COMMIT;


-- ── Verificación: 3 filas con ok = true ─────────────────────
SELECT 'trigger del timeline' AS k,
       position('NEW.id::text' IN pg_get_functiondef('log_activity_auto()'::regprocedure)) = 0 AS ok
UNION ALL
SELECT 'confirmación por link',
       position('c.id::text' IN pg_get_functiondef('respond_collab_confirmation(text,text,date,time,text)'::regprocedure)) = 0
UNION ALL
SELECT 'fusionar fichas',
       position('p_keep::text, ''note''' IN pg_get_functiondef('merge_entities(text,uuid,uuid,text[])'::regprocedure)) = 0;
