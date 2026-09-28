-- ═══════════════════════════════════════════════════════════
-- 044 · Plantillas de mensaje
--
-- POR QUE
--   Una Scouter escribe el mismo primer mensaje diez veces por día. Eso
--   es tiempo, pero el costo mayor no es el tiempo: hoy ocho ciudades
--   están escribiendo ocho discursos distintos en nombre de Resilio, y
--   nadie los vio nunca juntos. Una marca que recibe dos mensajes de
--   dos Scouters distintas los compara.
--
--   Esto es la misma idea que las plantillas de tarea (038): lo que se
--   repite se define una vez, se edita adentro del sistema, y deja de
--   depender de que cada persona se acuerde.
--
-- COMO SE USA
--   El cuerpo admite marcadores que el cliente reemplaza al mostrarlo:
--     {nombre}   primer nombre  ·  {nombre_completo}
--     {marca}    nombre de la marca
--     {ciudad}   ciudad de la ficha
--     {usuario}  @instagram
--     {yo}       quien está escribiendo
--
--   El reemplazo es del lado del cliente a propósito: así la plantilla
--   se puede previsualizar mientras se escribe, sin ir a la base.
--
-- SEGURIDAD
--   Todos leen las activas — son el guion de la empresa, no un dato de
--   nadie. Escribir es solo de Dirección, que es lo que hace que sea un
--   estándar y no una carpeta compartida.
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS message_templates (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title      TEXT NOT NULL,
  body       TEXT NOT NULL,
  -- A quién le sirve. 'any' aparece en fichas de los dos tipos.
  target     TEXT NOT NULL DEFAULT 'any'
             CHECK (target IN ('influencer','brand','any')),
  -- En qué momento de la relación. NULL = en cualquiera. Esto es lo que
  -- evita ofrecerle el mensaje de primer contacto a alguien con quien ya
  -- se viene hablando hace un mes.
  stage      relationship_status,
  -- NULL = toda la red. Con ciudad, solo esa: permite que Punta del
  -- Este tenga su tono sin romper el estándar general.
  city_id    UUID REFERENCES cities(id) ON DELETE SET NULL,
  active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_msg_tpl_lookup
  ON message_templates (target, active);

ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;

DO $msg_policies$
DECLARE p RECORD;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies
            WHERE schemaname = 'public' AND tablename = 'message_templates' LOOP
    EXECUTE format('DROP POLICY %I ON message_templates', p.policyname);
  END LOOP;
END $msg_policies$;

-- Las inactivas solo las ve Dirección: una plantilla que se dio de baja
-- no tiene que seguir apareciendo en la ficha de nadie.
CREATE POLICY msg_select ON message_templates
  FOR SELECT TO authenticated USING (active OR app_is_direction());
CREATE POLICY msg_insert ON message_templates
  FOR INSERT TO authenticated WITH CHECK (app_is_direction());
CREATE POLICY msg_update ON message_templates
  FOR UPDATE TO authenticated USING (app_is_direction()) WITH CHECK (app_is_direction());
CREATE POLICY msg_delete ON message_templates
  FOR DELETE TO authenticated USING (app_is_direction());


-- ── Verificacion ────────────────────────────────────────────
-- La tabla, y que ninguna policy quedo abierta.
SELECT policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'message_templates'
ORDER BY policyname;
