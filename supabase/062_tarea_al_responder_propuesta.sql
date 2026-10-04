-- ═══════════════════════════════════════════════════════════
-- 062 · Cuando una marca responde la propuesta, se crea la tarea
--
--   "Enviar valores a {marca} — eligió {plan}", vence en 24 h, a cargo
--   de quien mandó el link. Aparece en su Inicio y en su agenda como
--   cualquier tarea.
--
--   · Se crea en la primera respuesta, y otra vez solo si la marca
--     cambia de plan.
--   · Si por algo no se pudiera crear, la respuesta de la marca se
--     guarda igual (nunca le falla la página a la marca).
--
-- Parte de la función real de la base (regla 3 de MIGRATIONS.md): solo
-- agrega un bloque antes del RETURN final. No cambia nada más.
-- Se puede correr dos veces sin efecto.
-- ═══════════════════════════════════════════════════════════

BEGIN;

DO $fix$
DECLARE def TEXT; newd TEXT;
  anchor CONSTANT TEXT := $a$  RETURN jsonb_build_object('ok', true, 'chosen_plan', p_plan);$a$;
  block  CONSTANT TEXT := $b$  -- 062: tarea para quien mandó el link (primera respuesta o cambio de plan).
  IF r.created_by IS NOT NULL AND (r.answered_at IS NULL OR r.chosen_plan IS DISTINCT FROM p_plan) THEN
    BEGIN
      INSERT INTO tasks (title, description, entity_type, entity_id, type, priority, status, due_date, created_by, assigned_to)
      VALUES (
        format('Enviar valores a %s — eligió %s', r.brand_name,
               CASE p_plan WHEN 'esencial' THEN 'Esencial' WHEN 'crecimiento' THEN 'Crecimiento'
                           WHEN 'ecosistema' THEN 'Ecosistema' ELSE 'Asesórenme' END),
        'Respondió la propuesta en partners. Sus respuestas están en la ficha de la marca.',
        CASE WHEN r.brand_id IS NULL THEN NULL ELSE 'brand' END,
        r.brand_id, 'general', 'high', 'todo', now() + INTERVAL '24 hours',
        r.created_by, r.created_by);
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '062: no se pudo crear la tarea (%)', SQLERRM;
    END;
  END IF;

$b$;
BEGIN
  def := pg_get_functiondef('respond_brand_proposal(text,text,jsonb)'::regprocedure);
  IF position('-- 062:' IN def) > 0 THEN RETURN; END IF;          -- ya aplicada
  IF position(anchor IN def) = 0 THEN
    RAISE EXCEPTION '062: respond_brand_proposal no es la de la 059; no se toca.';
  END IF;
  newd := replace(def, anchor, block || anchor);
  EXECUTE newd;
END $fix$;

COMMIT;


-- ── Verificación: 1 fila con ok = true ──────────────────────
SELECT 'tarea al responder la propuesta' AS k,
       position('-- 062:' IN pg_get_functiondef('respond_brand_proposal(text,text,jsonb)'::regprocedure)) > 0 AS ok;
