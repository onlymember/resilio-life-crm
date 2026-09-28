-- ═══════════════════════════════════════════════════════════
-- 000 · El baseline del RBAC: enums y user_roles (RECUPERADO)
--
-- POR QUE VA NUMERADO 000
--   Todas las funciones de permiso leen esta tabla, y casi todas las
--   policies llaman a esas funciones. Si la tabla no existe primero,
--   no aplica nada mas. Nunca tuvo archivo: se creo a mano en el
--   dashboard de Supabase cuando arranco el proyecto.
--
-- DE DONDE SALIO
--   Volcado desde la base el 2026-09-28 con supabase/dump_deriva.sql.
--   Las columnas y el enum app_role son lectura literal del catalogo.
--
-- LO QUE NO ES LECTURA LITERAL — leer antes de confiar
--   1. El enum `scope_type` NO se pudo volcar (la consulta solo saco el
--      de la columna `role`). Los cuatro primeros valores estan
--      demostrados por app_visible_city_ids(), que ramifica sobre
--      'global' / 'region' / 'country' / 'city'; el quinto, 'own', por
--      upsert_scouter(), que lo inserta. Puede haber mas valores que
--      ningun codigo usa. Confirmarlo con la consulta del final.
--   2. La PRIMARY KEY sobre `id` esta reconstruida, no volcada: la
--      consulta traia columnas, no constraints. Es lo unico que puede
--      ser, pero no esta probado.
--   3. Las foreign keys (user_id -> profiles, granted_by -> profiles) y
--      los indices NO estan. La consulta del final los lista.
--
-- ESTO NO ES UN BOOTSTRAP COMPLETO. Es lo minimo para que el resto del
-- repo tenga sentido. Recrear la base entera desde supabase/ sigue sin
-- funcionar, y la unica salida real para eso es `supabase db dump`.
--
-- SEGURIDAD: IF NOT EXISTS en todo. Sobre una base viva no hace nada.
-- ═══════════════════════════════════════════════════════════

DO $enums$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE app_role AS ENUM (
      'super_admin', 'network_direction', 'regional_lead', 'country_lead',
      'city_lead', 'scouter', 'admin', 'editor', 'viewer', 'custom');
  END IF;

  -- Reconstruido, no volcado. Ver nota 1 del encabezado.
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'scope_type') THEN
    CREATE TYPE scope_type AS ENUM ('global', 'region', 'country', 'city', 'own');
  END IF;
END $enums$;


CREATE TABLE IF NOT EXISTS user_roles (
  id          uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL,
  role        app_role NOT NULL,
  scope       scope_type NOT NULL,
  scope_id    uuid,
  ecosistemas text[] NOT NULL DEFAULT '{}'::text[],
  granted_by  uuid,
  granted_at  timestamp with time zone NOT NULL DEFAULT now(),
  revoked_at  timestamp with time zone,
  CONSTRAINT user_roles_pkey PRIMARY KEY (id)   -- reconstruida, ver nota 2
);


-- ── Verificacion ────────────────────────────────────────────
-- 1) Los valores reales de scope_type. Si no coinciden con los cinco
--    de arriba, corregir este archivo con lo que devuelva esto.
SELECT t.typname AS enum,
       string_agg(e.enumlabel, ' | ' ORDER BY e.enumsortorder) AS valores
FROM pg_type t
JOIN pg_enum e ON e.enumtypid = t.oid
JOIN pg_namespace n ON n.oid = t.typnamespace
WHERE n.nspname = 'public' AND t.typname IN ('app_role','scope_type')
GROUP BY t.typname;

-- 2) Las constraints e indices que este archivo NO tiene. Cada fila que
--    aparezca y no este arriba es deuda que sigue sin archivo.
SELECT conname, pg_get_constraintdef(oid) AS definicion
FROM pg_constraint WHERE conrelid = 'user_roles'::regclass
UNION ALL
SELECT indexname, indexdef FROM pg_indexes
WHERE schemaname = 'public' AND tablename = 'user_roles';
