-- ════════════════════════════════════════════════════════════════════════
-- 039 — Permitir 'collaboration' en los CHECK de entity_type
-- ════════════════════════════════════════════════════════════════════════
--
-- Problema: la migración 038 enseñó a assign_entity() a transferir
-- colaboraciones, pero la tabla `assignments` (donde queda el registro de la
-- transferencia) tiene un CHECK sobre entity_type que solo aceptaba
-- brand / influencer / opportunity. Resultado:
--
--   new row for relation "assignments" violates check constraint
--   "assignments_entity_type_check"
--
-- La función hacía bien su trabajo; el insert de auditoría la frenaba al final.
--
-- Estrategia: en lugar de reescribir la lista de valores permitidos (que
-- implicaría adivinarla y podría perder valores que ya se usan en filas
-- existentes), se toma la definición actual del CHECK y se le agrega una rama:
--
--   CHECK (<lo que ya permitía> OR entity_type = 'collaboration')
--
-- Así no se pierde nada, no falla la validación de las filas viejas, y el
-- bloque es idempotente: si el CHECK ya menciona 'collaboration', lo saltea.
--
-- Alcance: cualquier CHECK de public que mencione entity_type (assignments,
-- audit_log, activities, y lo que aparezca). Verificado en Postgres 16 local:
-- reproduce el error, lo arregla, conserva los valores viejos, sigue
-- rechazando valores inválidos, y correrlo dos veces no cambia nada.
--
-- Aditivo. No borra datos. Se puede correr en producción tal cual.
-- ════════════════════════════════════════════════════════════════════════

-- ── 1. Diagnóstico: cómo están los CHECK antes de tocarlos ──
SELECT t.relname AS tabla, c.conname AS constraint, pg_get_constraintdef(c.oid) AS definicion
FROM pg_constraint c
JOIN pg_class     t ON t.oid = c.conrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
WHERE c.contype = 'c' AND n.nspname = 'public'
  AND pg_get_constraintdef(c.oid) ILIKE '%entity_type%'
ORDER BY t.relname;

-- ── 2. El arreglo ──
DO $$
DECLARE
  r      record;
  v_def  text;
  v_expr text;
  v_n    int := 0;
BEGIN
  FOR r IN
    SELECT c.conname, c.oid, t.relname
    FROM pg_constraint c
    JOIN pg_class     t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE c.contype = 'c' AND n.nspname = 'public'
      AND pg_get_constraintdef(c.oid) ILIKE '%entity_type%'
  LOOP
    v_def := pg_get_constraintdef(r.oid);

    IF v_def ILIKE '%collaboration%' THEN
      RAISE NOTICE 'public.% ya permitía collaboration, se saltea', r.relname;
      CONTINUE;
    END IF;

    -- "CHECK ((expr))" -> "(expr)"
    v_expr := regexp_replace(v_def, '^CHECK\s*', '');

    EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', r.relname, r.conname);
    EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I CHECK (%s OR entity_type = %L)',
                   r.relname, r.conname, v_expr, 'collaboration');

    v_n := v_n + 1;
    RAISE NOTICE 'Actualizado public.%  (%)', r.relname, r.conname;
  END LOOP;

  RAISE NOTICE 'CHECK actualizados: %', v_n;
END $$;

-- ── 3. Verificación: los CHECK nuevos deben mencionar collaboration ──
SELECT t.relname AS tabla,
       (pg_get_constraintdef(c.oid) ILIKE '%collaboration%') AS permite_collaboration,
       pg_get_constraintdef(c.oid) AS definicion
FROM pg_constraint c
JOIN pg_class     t ON t.oid = c.conrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
WHERE c.contype = 'c' AND n.nspname = 'public'
  AND pg_get_constraintdef(c.oid) ILIKE '%entity_type%'
ORDER BY t.relname;
