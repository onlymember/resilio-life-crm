-- ═══════════════════════════════════════════════════════════
-- 033 · Una tarea para varias personas
--
-- DECISION DE MODELO
--   No se agrega una tabla de responsables multiples. Una tarea sigue
--   teniendo UN responsable, y asignarla a ocho personas crea ocho
--   filas que comparten un `batch_id`.
--
--   El motivo es que el estado es por persona, no por tarea: "leer el
--   manual" lo completa cada una por su lado. Un modelo de muchos a
--   muchos necesitaria igual una fila de estado por persona, o sea
--   exactamente esto, con una tabla de mas y RLS duplicada.
--
--   Con batch_id, la pantalla agrupa las ocho filas en una sola linea
--   con su progreso ("3 de 8 completadas") y cada Scouter ve solo la
--   suya en su Home. Nada de lo que ya funciona cambia.
--
-- SEGURIDAD: columna nueva, nullable. No toca datos ni policies.
--   Las tareas que ya existen quedan con batch_id en NULL y se
--   muestran de a una, como hasta ahora.
-- ═══════════════════════════════════════════════════════════

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS batch_id UUID;

CREATE INDEX IF NOT EXISTS idx_tasks_batch
  ON tasks (batch_id) WHERE batch_id IS NOT NULL;


-- La vista se recrea a proposito: un SELECT t.* se expande a la lista
-- de columnas del momento en que la vista se creo, asi que sin esto
-- batch_id no llegaria nunca al cliente.
CREATE OR REPLACE VIEW v_tasks_estado
WITH (security_invoker = true) AS
  SELECT t.*,
         CASE
           WHEN t.status = 'completed' THEN 'completed'
           WHEN t.status = 'cancelled' THEN 'cancelled'
           WHEN t.due_date IS NOT NULL AND t.due_date < NOW() THEN 'overdue'
           ELSE t.status
         END AS estado_efectivo,
         (t.status NOT IN ('completed','cancelled')
          AND t.due_date IS NOT NULL
          AND t.due_date < NOW())            AS is_overdue
  FROM tasks t;


-- ── Verificacion ────────────────────────────────────────────
-- batch_id tiene que aparecer en la lista.
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'v_tasks_estado'
ORDER BY ordinal_position;
