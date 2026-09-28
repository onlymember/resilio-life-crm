-- ═══════════════════════════════════════════════════════════
-- 040 · El inventario del esquema
--
-- QUE PROBLEMA RESUELVE
--   La deriva que arreglamos hoy (system_health y la 025 vivas en la
--   base y en ningun archivo) no se detecto: se descubrio de casualidad
--   leyendo el 035 por otro motivo. Entre que aparecio y que la vimos
--   pasaron semanas.
--
--   Esta funcion es la mitad de base del detector. Devuelve el
--   inventario de todo lo que existe hoy en `public`: funciones,
--   vistas, tablas, policies y triggers. La otra mitad es
--   scripts/check_drift.mjs, que compara ese inventario contra los
--   archivos del repo y avisa que hay en la base sin respaldo.
--
--   Correrlo antes de cada push cuesta cinco segundos y hace imposible
--   que esto vuelva a pasar sin que alguien se entere.
--
-- POR QUE FILTRA LAS EXTENSIONES
--   pg_trgm sola instala decenas de funciones. Sin el filtro por
--   pg_depend, el inventario seria ruido y nadie lo miraria dos veces.
--
-- SEGURIDAD
--   No es DEFINER: los catalogos de PostgreSQL ya son legibles por
--   cualquier rol, asi que elevar permisos no haria falta y seria
--   gratis regalarlo. La guarda de app_is_direction() esta igual,
--   porque la forma del esquema no tiene por que viajar al cliente de
--   una Scouter.
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION system_inventory()
RETURNS JSONB LANGUAGE plpgsql STABLE AS $inv$
BEGIN
  IF NOT app_is_direction() THEN
    RAISE EXCEPTION 'Solo Dirección puede leer el inventario del esquema.';
  END IF;

  RETURN jsonb_build_object(
    'generated_at', now(),

    'functions', (
      SELECT coalesce(jsonb_agg(DISTINCT p.proname), '[]'::jsonb)
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND p.prokind = 'f'
        -- deptype 'e' = la creo una extension, no nosotros
        AND NOT EXISTS (SELECT 1 FROM pg_depend d
                         WHERE d.objid = p.oid AND d.deptype = 'e')),

    'views', (
      SELECT coalesce(jsonb_agg(DISTINCT c.relname), '[]'::jsonb)
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind IN ('v','m')),

    'tables', (
      SELECT coalesce(jsonb_agg(DISTINCT c.relname), '[]'::jsonb)
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind = 'r'
        AND NOT EXISTS (SELECT 1 FROM pg_depend d
                         WHERE d.objid = c.oid AND d.deptype = 'e')),

    'policies', (
      SELECT coalesce(jsonb_agg(DISTINCT tablename || '.' || policyname), '[]'::jsonb)
      FROM pg_policies WHERE schemaname = 'public'),

    'triggers', (
      SELECT coalesce(jsonb_agg(DISTINCT t.tgname), '[]'::jsonb)
      FROM pg_trigger t
      JOIN pg_class c ON c.oid = t.tgrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND NOT t.tgisinternal),

    'enums', (
      SELECT coalesce(jsonb_agg(DISTINCT t.typname), '[]'::jsonb)
      FROM pg_type t
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public' AND t.typtype = 'e')
  );
END $inv$;


-- ── Verificacion ────────────────────────────────────────────
-- Tiene que devolver una sola fila con seis listas. Si dice que solo
-- Direccion puede leerlo, estas entrando con otra cuenta.
SELECT jsonb_pretty(system_inventory());
