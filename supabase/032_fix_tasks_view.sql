-- ═══════════════════════════════════════════════════════════
-- 032 · La vista de tareas que el codigo consulta y no existia
--
-- SINTOMA
--   La pantalla de Tareas aparecia vacia aunque las tareas estuvieran
--   guardadas. Crear funcionaba; listar, no.
--
-- CAUSA
--   dbGetTasks consulta `v_tasks_estado`. Esa vista esta declarada en
--   fase1/05-transversales.sql pero no existe en esta base: un listado
--   de pg_class sobre public no la devuelve. PostgREST responde
--   "relation does not exist" y TasksPage atrapa el error, lo manda a
--   la consola y deja la lista vacia, sin cartel.
--
-- ADEMAS
--   La declaracion original era una vista comun. Una vista sin
--   security_invoker corre con los permisos de quien la creo y saltea
--   RLS: cualquiera podria leer las tareas de toda la empresa. Se crea
--   con security_invoker desde el arranque para que respete
--   task_select, que ya contempla lo propio, lo creado por uno y
--   Direccion.
--
-- SEGURIDAD: solo crea una vista de lectura. No toca datos.
-- ═══════════════════════════════════════════════════════════

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
-- Una fila por tarea abierta, con su responsable y quien la creo.
SELECT v.title, v.status, v.estado_efectivo, v.is_overdue,
       pa.email AS responsable, pc.email AS creada_por
FROM v_tasks_estado v
LEFT JOIN profiles pa ON pa.id = v.assigned_to
LEFT JOIN profiles pc ON pc.id = v.created_by
WHERE v.status IN ('todo','in_progress')
ORDER BY v.due_date NULLS LAST;
